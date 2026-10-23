import { test, expect, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const manifestPath='.qa/task225/manifest.json';
const fixtures=()=>JSON.parse(readFileSync(manifestPath,'utf8')) as {ids:string[];ownerId:string;newIds:string[]};
async function signIn(context:BrowserContext,baseURL:string,name='sl01-lister') {
 const user=JSON.parse(readFileSync(`.env.qa-${name}.local`,'utf8'))[0], cookies:{name:string;value:string}[]=[];
 const api=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:values=>{cookies.splice(0,cookies.length,...values);}}});
 const auth=await api.auth.signInWithPassword({email:user.email,password:user.password});if(auth.error)throw Error('Synthetic QA sign-in failed');
 await context.addCookies(cookies.map(({name,value})=>({name,value,url:baseURL,sameSite:'Lax' as const})));return api;
}
type Api=Awaited<ReturnType<typeof signIn>>;
async function row(api:Api,id:string){const r=await api.from('listing_drafts').select('id,fields,photos,revision').eq('id',id).single();if(r.error)throw Error('Exact QA draft unavailable');return r.data;}
test.use({trace:'off',screenshot:'off',video:'off'});
test.describe.configure({mode:'serial'});
test.setTimeout(90_000);
for(const locale of ['he','en'])for(const width of [390,1280])test(`${locale} ${width}: selected A/B, private saved image, no implicit hydration writes`,async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),[a,b]=fixtures().ids;const prefix=locale==='en'?'/en':'',en=locale==='en';
 await page.setViewportSize({width,height:844});
 try{
  const initial=await row(api,a);const fields=initial.fields as {title:string;description:string};
  await page.goto(prefix+'/my-listings');
  await page.goto(prefix+'/compose?draft='+a);
  await expect(page).toHaveURL(new RegExp('/compose\\?draft='+a+'$'));
  await expect(page.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true})).toHaveValue(fields.title);
  await expect(page.getByRole('textbox',{name:en?'Apartment description':'תיאור הדירה',exact:true})).toHaveValue(fields.description);
  const image=page.getByRole('img',{name:en?'Saved photo 1':'תמונה שמורה 1',exact:true});await expect(image).toBeVisible();await image.scrollIntoViewIfNeeded();
  await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:en?'Publish listing':'פרסום המודעה',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  // Reading an incomplete draft must not fill defaults into its stored fields.
  expect((await row(api,a)).revision).toBe(initial.revision);
  expect((await row(api,a)).photos).toEqual(initial.photos);
  if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`editor-${locale}-${width}.png`)});}
  const second=await row(api,b);await page.goto(prefix+'/compose?draft='+b);
  await expect(page.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true})).toHaveValue((second.fields as {title:string}).title);
  await expect(page.getByText(en?'No saved photos.':'אין תמונות שמורות.',{exact:true})).toBeVisible();
  expect((await row(api,b)).revision).toBe(second.revision);
 }finally{await api.auth.signOut({scope:'local'});}
});
for(const locale of ['he','en'])test(locale+': new intent creates a distinct empty draft, never latest or legacy',async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),prefix=locale==='en'?'/en':'',en=locale==='en';
 try{
  const before=await api.from('listing_drafts').select('id',{count:'exact',head:true});
  await page.request.get(baseURL+prefix+'/compose');
  const after=await api.from('listing_drafts').select('id',{count:'exact',head:true});expect(after.count).toBe(before.count);
  let hiddenCreate=false;
  if(en)await page.route('**/*',async route=>{
   if(!hiddenCreate&&route.request().method()==='POST'&&route.request().headers()['next-action']){hiddenCreate=true;await route.fetch();return route.abort('failed');}
   return route.continue();
  });
  await page.goto(prefix+'/compose');
  if(en){
   await expect(page.getByText('Could not start a new draft. Please retry.',{exact:true})).toBeVisible();
   const receipt=await page.evaluate(owner=>sessionStorage.getItem('shutaf-new-listing:'+owner),fixtures().ownerId);
   const created=await api.from('listing_drafts').select('id').eq('import_receipt_id',receipt!);
   if(created.error)throw Error('Creation receipt unavailable');expect(created.data).toHaveLength(1);
   await page.getByRole('button',{name:'Try again',exact:true}).click();
   await expect(page).toHaveURL(new RegExp('draft='+created.data![0].id+'$'));
   await page.unrouteAll({behavior:'wait'});
  }
  await expect(page).toHaveURL(/\/compose\?draft=[0-9a-f-]+$/);
  const id=new URL(page.url()).searchParams.get('draft')!;expect(fixtures().ids).not.toContain(id);
  const stored=await row(api,id);expect(stored.fields).toEqual({});expect(stored.photos).toEqual([]);
  const manifest=fixtures();if(!manifest.newIds.includes(id)){manifest.newIds.push(id);writeFileSync(manifestPath,JSON.stringify(manifest,null,2));}
  await expect(page.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true})).toHaveValue('');
  await page.reload();await expect(page).toHaveURL(new RegExp('draft='+id+'$'));expect((await row(api,id)).revision).toBe(0);
 }finally{await api.auth.signOut({scope:'local'});}
});
test('foreign and malformed draft URLs disclose no fields or media; guest return keeps exact selection',async({page,context,baseURL})=>{
 const [id]=fixtures().ids;const api=await signIn(context,baseURL!,'sl01-card');
 try{const response=await page.goto('/en/compose?draft='+id);await expect(page.locator('section > [role=alert]')).toHaveText('This draft is unavailable.');expect(await response!.text()).not.toContain('Synthetic editor address');await expect(page.getByRole('textbox',{name:'Listing title',exact:true})).toHaveCount(0);
 await page.goto('/en/compose?draft=bad&draft='+id);await expect(page.locator('section > [role=alert]')).toHaveText('This draft is unavailable.');
 await context.clearCookies();await page.goto('/en/compose?draft='+id);await expect(page).toHaveURL('/en/login?returnTo='+encodeURIComponent('/en/compose?draft='+id));
 }finally{await api.auth.signOut({scope:'local'});}
});
test('ordered HTTP autosave, failed close retry, device reload, focus preservation and conflict comparison',async({page,context,browser,baseURL})=>{
 const api=await signIn(context,baseURL!),id=fixtures().ids[1];const original=await row(api,id),title=page.getByRole('textbox',{name:'Listing title',exact:true});
 const secondContext=await browser.newContext();const secondApi=await signIn(secondContext,baseURL!);const second=await secondContext.newPage();
 const token='QA '+Date.now();
 second.on('response',async response=>{if(process.env.DRAFT_QA_DIAGNOSTICS&&response.request().method()==='POST'&&response.request().headers()['next-action']){const body=await response.text().catch(()=>'');console.log('QA action response',response.status(),(body.match(/AUTH_REQUIRED|INTERNAL|NOT_FOUND|VERSION_CONFLICT|STATE_UNAVAILABLE/g)||[]).join(','));}});
 second.on('pageerror',error=>{if(process.env.DRAFT_QA_DIAGNOSTICS)console.log('QA page error class',error.name);});
 try{
  await page.goto('/en/compose?draft='+id);await expect(title).toBeVisible();
  let release:(()=>void)|undefined;const held=new Promise<void>(resolve=>release=resolve);let seen=0;
  await page.route('**/*',async route=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']&&++seen===1){await held;}await route.continue();});
  await title.fill(token+' first');await expect.poll(()=>seen).toBe(1);await title.fill(token+' latest');
  await expect(page.getByRole('status').filter({hasText:'Saved to your account'})).toHaveCount(0);
  release!();await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  await expect.poll(async()=>((await row(api,id)).fields as {title:string}).title).toBe(token+' latest');
  expect(seen).toBe(2);
  await page.unrouteAll({behavior:'wait'});
  await second.goto(baseURL+'/en/compose?draft='+id);await expect(second.getByRole('textbox',{name:'Listing title',exact:true})).toHaveValue(token+' latest');
  // An auth recheck temporarily hides the same form without losing unsaved text.
  await page.route('**/*',route=>route.request().method()==='POST'&&route.request().headers()['next-action']?route.abort('failed'):route.continue());
  await title.fill(token+' retained');await expect(page.getByText('Could not save. Your edits are still here.',{exact:true})).toBeVisible();
  await page.route('**/auth/v1/user',route=>route.abort('failed'));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Could not verify access. Your edits are kept here.',{exact:true})).toBeVisible();
  await expect(page.locator('input[name=title]')).toHaveValue(token+' retained');await expect(title).not.toBeVisible();
  await page.unroute('**/auth/v1/user');await page.getByRole('button',{name:'Retry verification',exact:true}).click();
  await expect(title).toBeVisible();await expect(title).toHaveValue(token+' retained');
  await page.getByRole('button',{name:'Save draft and close',exact:true}).click();await expect(page).toHaveURL(new RegExp('draft='+id+'$'));await expect(title).toHaveValue(token+' retained');
  await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  await title.fill(token+' close flush');
  await page.getByRole('button',{name:'Save draft and close',exact:true}).click();await expect(page).toHaveURL('/en/my-listings');
  expect(((await row(api,id)).fields as {title:string}).title).toBe(token+' close flush');
  // Second device retains an old revision and must keep its input on conflict.
  const staleTitle=second.getByRole('textbox',{name:'Listing title',exact:true});await staleTitle.fill(token+' stale device');
  await expect(second.getByText('This draft changed elsewhere. Your edits are still here.',{exact:true})).toBeVisible();await expect(staleTitle).toHaveValue(token+' stale device');
  await expect(second.getByRole('textbox',{name:'Your edits',exact:true})).toHaveValue(new RegExp(token+' stale device'));
  await expect(second.getByRole('textbox',{name:'Saved version',exact:true})).toHaveValue(new RegExp(token+' close flush'));
  await staleTitle.fill(token+' still stale');
  await expect(second.getByRole('textbox',{name:'Your edits',exact:true})).toHaveValue(new RegExp(token+' still stale'));
  await expect(second.getByText('This draft changed elsewhere. Your edits are still here.',{exact:true})).toBeVisible();
  expect(((await row(api,id)).fields as {title:string}).title).toBe(token+' close flush');
  second.once('dialog',dialog=>dialog.accept());await second.getByRole('button',{name:'Load saved version',exact:true}).click();
  await expect(staleTitle).toHaveValue(token+' close flush');expect((await row(api,id)).photos).toEqual(original.photos);
 }finally{await secondContext.close();await api.auth.signOut({scope:'local'});await secondApi.auth.signOut({scope:'local'});}
});

test('partial numeric and date strings survive rendering and unrelated field saves',async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),id=fixtures().ids[1];
 try{
  const before=await row(api,id);const fields={...(before.fields as object),bedrooms:'2.',availableFrom:'2026-1',roomPrices:['19.']};
  const seeded=await api.rpc('save_listing_draft',{p_draft_id:id,p_expected_revision:before.revision,p_fields:fields});if(seeded.error)throw Error('Partial fixture save failed');
  await page.goto('/en/compose?draft='+id);
  await expect(page.getByRole('textbox',{name:'Bedrooms in the apartment',exact:true})).toHaveValue('2.');
  await expect(page.getByRole('textbox',{name:'Available from',exact:true})).toHaveValue('2026-1');
  await expect(page.getByRole('textbox',{name:'Monthly price for available room 1 (₪)',exact:true})).toHaveValue('19.');
  await page.getByRole('textbox',{name:'Listing title',exact:true}).fill('Partial preserved '+Date.now());
  await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  const stored=await row(api,id);expect(stored.fields).toMatchObject({bedrooms:'2.',availableFrom:'2026-1',roomPrices:['19.']});
  expect(stored.photos).toEqual(before.photos);
 }finally{await api.auth.signOut({scope:'local'});}
});

test('account switch clears an editor with failed unsaved input and private preview',async({page,context,baseURL})=>{
 const owner=await signIn(context,baseURL!),id=fixtures().ids[0],initial=await row(owner,id);
 let other:Api|undefined;
 try{
  await page.goto('/en/compose?draft='+id);const title=page.getByRole('textbox',{name:'Listing title',exact:true});await expect(title).toBeVisible();
  await expect(page.getByRole('img',{name:'Saved photo 1',exact:true})).toBeVisible();
  await page.route('**/*',route=>route.request().method()==='POST'&&route.request().headers()['next-action']?route.abort('failed'):route.continue());
  await title.fill('Unsaved account A input');await expect(page.getByText('Could not save. Your edits are still here.',{exact:true})).toBeVisible();
  await context.clearCookies();other=await signIn(context,baseURL!,'sl01-card');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.locator('input[name=title]')).toHaveCount(0);await expect(page.getByRole('img',{name:'Saved photo 1',exact:true})).toHaveCount(0);
  expect((await row(owner,id)).revision).toBe(initial.revision);
 }finally{await owner.auth.signOut({scope:'local'});if(other)await other.auth.signOut({scope:'local'});}
});
