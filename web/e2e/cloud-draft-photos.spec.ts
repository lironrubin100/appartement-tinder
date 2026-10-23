import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const manifestPath='.qa/task227/manifest.json';
const manifest=()=>JSON.parse(readFileSync(manifestPath,'utf8')) as {ids:string[];ownerId:string;source:{id:string;path:string;photos:string[];title:string;digest:string};objects?:string[]};
async function signIn(context:BrowserContext,baseURL:string,name='sl01-lister'){
 const u=JSON.parse(readFileSync(`.env.qa-${name}.local`,'utf8'))[0],cookies:{name:string;value:string}[]=[];
 const api=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:v=>{cookies.splice(0,cookies.length,...v);}}});
 if((await api.auth.signInWithPassword({email:u.email,password:u.password})).error)throw Error('Synthetic sign-in failed');
 await context.addCookies(cookies.map(({name,value})=>({name,value,url:baseURL,sameSite:'Lax' as const})));return api;
}
type Api=Awaited<ReturnType<typeof signIn>>;
async function row(api:Api,id:string){const r=await api.from('listing_drafts').select('id,fields,photos,revision').eq('id',id).single();if(r.error)throw Error('Exact private fixture unavailable');return r.data as {id:string;fields:{title?:string;description?:string};photos:{kind:string;objectPath:string}[];revision:number};}
async function files(page:Page){const urls=await page.evaluate(()=>['#ce3c39','#2553b9'].map(color=>{const c=document.createElement('canvas');c.width=1800;c.height=1200;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png');}));return urls.map((url,i)=>({name:`synthetic-${i}.png`,mimeType:'image/png',buffer:Buffer.from(url.split(',')[1],'base64')}));}
async function recordObjects(api:Api,id:string){const m=manifest(),r=await api.storage.from('listing-draft-media').list(m.ownerId+'/'+id,{limit:100});if(r.error)throw Error('Exact private upload audit failed');m.objects=[...new Set([...(m.objects??[]),...r.data.map(x=>m.ownerId+'/'+id+'/'+x.name)])];writeFileSync(manifestPath,JSON.stringify(m,null,2));}
test.use({trace:'off',screenshot:'off',video:'off'});test.describe.configure({mode:'serial'});test.setTimeout(120_000);
for(const [index,{locale,width}] of [{locale:'he',width:390},{locale:'he',width:1280},{locale:'en',width:390},{locale:'en',width:1280}].entries())test(`${locale} ${width}: compressed photos, order, removal and second-device persistence`,async({page,context,browser,baseURL})=>{
 const api=await signIn(context,baseURL!),id=manifest().ids[index],en=locale==='en',prefix=en?'/en':'';let other:Api|undefined;const device=await browser.newContext({viewport:{width,height:844}});
 try{
  await page.setViewportSize({width,height:844});await page.goto(prefix+'/compose?draft='+id);const gallery=page.getByRole('group',{name:en?'Draft photos':'תמונות הטיוטה',exact:true});await expect(gallery).toBeVisible();
  while(await gallery.getByTestId('draft-photo').count())await gallery.getByRole('button',{name:en?'Remove photo 1':'הסרת תמונה 1',exact:true}).click();
  await expect.poll(async()=>(await row(api,id)).photos.length).toBe(0);
  await gallery.getByLabel(en?'Choose apartment photos':'בחירת תמונות לדירה',{exact:true}).setInputFiles(await files(page));
  const title='Synthetic photos '+locale+' '+width+' '+Date.now();await page.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true}).fill(title);
  await expect(gallery.getByTestId('draft-photo')).toHaveCount(2);await expect.poll(async()=>(await row(api,id)).photos.length).toBe(2);
  await expect(page.getByText(en?'Saved to your account':'נשמר בחשבון',{exact:true})).toBeVisible();const original=(await row(api,id)).photos;
  await gallery.getByRole('button',{name:en?'Move photo earlier 2':'הקדמת תמונה 2',exact:true}).click();
  await expect.poll(async()=>JSON.stringify((await row(api,id)).photos)).toBe(JSON.stringify([...original].reverse()));
  other=await signIn(device,baseURL!);const fresh=await device.newPage();await fresh.goto(baseURL+prefix+'/compose?draft='+id);
  const savedGallery=fresh.getByRole('group',{name:en?'Draft photos':'תמונות הטיוטה',exact:true});await expect(savedGallery.getByTestId('draft-photo')).toHaveCount(2);
  for(let i=0;i<2;i++){const img=savedGallery.getByRole('img').nth(i);await expect(img).toBeVisible();await expect.poll(()=>img.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBe(1080);expect(decodeURIComponent((await img.getAttribute('src'))!)).toContain(original[1-i].objectPath);}
  await expect(fresh.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true})).toHaveValue(title);
  if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await gallery.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`photos-${locale}-${width}.png`)});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await gallery.getByRole('button',{name:en?'Remove photo 1':'הסרת תמונה 1',exact:true}).click();
  await page.getByRole('button',{name:en?'Save draft and close':'שמירת טיוטה וסגירה',exact:true}).click();await expect(page).toHaveURL(prefix+'/my-listings');
  expect((await row(api,id)).photos).toEqual([original[0]]);await fresh.reload();await expect(savedGallery.getByTestId('draft-photo')).toHaveCount(1);
  expect((await row(api,id)).fields.title).toBe(title);await recordObjects(api,id);
 }finally{await device.close();await api.auth.signOut({scope:'local'});if(other)await other.auth.signOut({scope:'local'});}
});
test('invalid preparation/cap, interrupted upload, stable retry and ambiguous association preserve content',async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),id=manifest().ids[4];
 try{
  await page.goto('/en/compose?draft='+id);const gallery=page.getByRole('group',{name:'Draft photos',exact:true});await expect(gallery).toBeVisible();
  while(await gallery.getByTestId('draft-photo').count())await gallery.getByRole('button',{name:'Remove photo 1',exact:true}).click();await expect.poll(async()=>(await row(api,id)).photos.length).toBe(0);
  const invalid=Array.from({length:9},(_,i)=>({name:'corrupt-'+i+'.png',mimeType:'image/png',buffer:Buffer.from('synthetic invalid image')}));
  await gallery.getByLabel('Choose apartment photos',{exact:true}).setInputFiles(invalid);await expect(gallery.getByTestId('draft-photo')).toHaveCount(8);await expect(gallery.getByLabel('Choose apartment photos',{exact:true})).toBeDisabled();
  await expect(gallery.getByText('Could not prepare photo.',{exact:true})).toHaveCount(8);
  await page.getByRole('button',{name:'Save draft and close',exact:true}).click();await expect(page.getByText('Wait for photos to finish preparing or remove a failed photo before closing.',{exact:true})).toBeVisible();
  expect((await row(api,id)).photos).toEqual([]);expect((await row(api,id)).fields.description).toBe('Retained private photo QA fields');
  while(await gallery.getByTestId('draft-photo').count())await gallery.getByRole('button',{name:'Remove photo 1',exact:true}).click();
  const attempts:string[]=[];await page.route('**/storage/v1/object/listing-draft-media/**',route=>{
   if(route.request().method()==='POST'){const url=new URL(route.request().url());attempts.push(decodeURIComponent(url.pathname.split('/listing-draft-media/')[1]));if(new Set(attempts).size===2)return route.abort('failed');}return route.continue();
  });
  await gallery.getByLabel('Choose apartment photos',{exact:true}).setInputFiles(await files(page));
  await page.getByRole('textbox',{name:'Listing title',exact:true}).fill('Fields survive partial upload '+Date.now());
  await expect(page.getByText('Could not save. Your edits are still here.',{exact:true})).toBeVisible();await expect(gallery.getByTestId('draft-photo')).toHaveCount(2);
  expect((await row(api,id)).photos).toEqual([]);const storedTitle=(await row(api,id)).fields.title;expect(storedTitle).toContain('Fields survive partial upload');expect(new Set(attempts).size).toBe(2);
  await page.unrouteAll({behavior:'wait'});const beforeRetry=[...new Set(attempts)];const retried:string[]=[];
  await page.route('**/storage/v1/object/listing-draft-media/**',route=>{if(route.request().method()==='POST')retried.push(decodeURIComponent(new URL(route.request().url()).pathname.split('/listing-draft-media/')[1]));return route.continue();});
  await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect.poll(async()=>(await row(api,id)).photos.length).toBe(2);await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  expect([...new Set(retried)].sort()).toEqual(beforeRetry.sort());await page.unrouteAll({behavior:'wait'});const original=(await row(api,id)).photos;let hidden=false;
  await page.route('**/*',async route=>{if(!hidden&&route.request().method()==='POST'&&route.request().headers()['next-action']&&route.request().postData()?.includes('objectPath')){hidden=true;await route.fetch();return route.abort('failed');}return route.continue();});
  await gallery.getByRole('button',{name:'Move photo earlier 2',exact:true}).click();await expect(page.getByText('Could not save. Your edits are still here.',{exact:true})).toBeVisible();expect(hidden).toBe(true);
  expect((await row(api,id)).photos).toEqual([...original].reverse());await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Retry save',exact:true}).click();
  await expect(page.getByText('This draft changed elsewhere. Your edits are still here.',{exact:true})).toBeVisible();await expect(gallery.getByTestId('draft-photo')).toHaveCount(2);
  const comparison=page.locator('div[role=alert]').filter({hasText:'Compare changes'});await expect(comparison.getByRole('img')).toHaveCount(2);
  expect((await row(api,id)).fields.title).toBe(storedTitle);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Load saved version',exact:true}).click();await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  await recordObjects(api,id);
 }finally{await api.auth.signOut({scope:'local'});}
});
test('removing a published reference changes only the private edit draft',async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),m=manifest(),id=m.ids[5];try{
  const draft=await row(api,id);if(!draft.photos.length){const arrange=await api.rpc('set_listing_draft_photos',{p_draft_id:id,p_expected_revision:draft.revision,p_photos:[{kind:'published',objectPath:m.source.path}]});if(arrange.error)throw Error('Private source-reference arrangement failed');}
  await page.goto('/en/compose?draft='+id);const gallery=page.getByRole('group',{name:'Draft photos',exact:true});await expect(gallery).toBeVisible();await expect(gallery.getByRole('img',{name:'Saved photo 1',exact:true})).toBeVisible();
  await gallery.getByRole('button',{name:'Remove photo 1',exact:true}).click();await expect.poll(async()=>(await row(api,id)).photos.length).toBe(0);await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  const listing=await api.from('apartments').select('photos,title,status').eq('id',m.source.id).single();if(listing.error)throw Error('Source unavailable');expect(listing.data.photos).toEqual(m.source.photos);expect(listing.data.title).toBe(m.source.title);expect(listing.data.status).toBe('active');
  const bytes=await api.storage.from('apartment-photos').download(m.source.path);if(bytes.error)throw Error('Published source bytes unavailable');expect(createHash('sha256').update(Buffer.from(await bytes.data.arrayBuffer())).digest('hex')).toBe(m.source.digest);
 }finally{await api.auth.signOut({scope:'local'});}
});

test('field edits queue behind an upload and account switch prevents late photo association',async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),id=manifest().ids[4];let other:Api|undefined,release:(()=>void)|undefined;
 try{
  await page.goto('/en/compose?draft='+id);const gallery=page.getByRole('group',{name:'Draft photos',exact:true});await expect(gallery).toBeVisible();
  while(await gallery.getByTestId('draft-photo').count())await gallery.getByRole('button',{name:'Remove photo 1',exact:true}).click();
  await expect.poll(async()=>(await row(api,id)).photos.length).toBe(0);await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();
  let intercepted=0;const held=new Promise<void>(resolve=>release=resolve);
  await page.route('**/storage/v1/object/listing-draft-media/**',async route=>{if(route.request().method()==='POST'&&++intercepted===1)await held;await route.continue();});
  await gallery.getByLabel('Choose apartment photos',{exact:true}).setInputFiles(await files(page));await expect.poll(()=>intercepted).toBe(1);
  const title='Changed during actual upload '+Date.now();await page.getByRole('textbox',{name:'Listing title',exact:true}).fill(title);
  await expect(page.getByText('Saved to your account',{exact:true})).toHaveCount(0);release!();
  await expect(page.getByText('Saved to your account',{exact:true})).toBeVisible();expect((await row(api,id)).fields.title).toBe(title);expect((await row(api,id)).photos).toHaveLength(2);
  await page.unrouteAll({behavior:'wait'});const before=await row(api,id);let seen=false;const secondHold=new Promise<void>(resolve=>release=resolve);
  await page.route('**/storage/v1/object/listing-draft-media/**',async route=>{if(route.request().method()==='POST'){seen=true;await secondHold;}await route.continue();});
  await gallery.getByLabel('Choose apartment photos',{exact:true}).setInputFiles((await files(page)).slice(0,1));await expect.poll(()=>seen).toBe(true);
  await context.clearCookies();other=await signIn(context,baseURL!,'sl01-card');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(gallery).toHaveCount(0);await expect(page.locator('input[name=title]')).toHaveCount(0);release!();await page.unrouteAll({behavior:'wait'});
  // Wait for the old-token upload to finish: its bytes may exist but no association may follow.
  await expect.poll(async()=>{const r=await api.storage.from('listing-draft-media').list(manifest().ownerId+'/'+id,{limit:100});return r.data?.length??0;}).toBeGreaterThan((manifest().objects??[]).filter(p=>p.includes('/'+id+'/')).length+2);
  expect(await row(api,id)).toEqual(before);const denied=await other.from('listing_drafts').select('id').eq('id',id);expect(denied.data).toEqual([]);await recordObjects(api,id);
 }finally{release?.();await page.unrouteAll({behavior:'wait'});await api.auth.signOut({scope:'local'});if(other)await other.auth.signOut({scope:'local'});}
});
