import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import type { ListingDraftFields, DraftPhotoReference } from '../src/lib/listings/draft-types';

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const manifestPath='.qa/task232/manifest.json';
type Entry={receipt:string;id?:string;owner?:string;key?:string;paths?:string[];purpose:string};
type Manifest={target:string;retained:boolean;entries:Entry[]};
function manifest():Manifest{return existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):{target:env.NEXT_PUBLIC_SUPABASE_URL,retained:true,entries:[]};}
function remember(entry:Entry){mkdirSync('.qa/task232',{recursive:true});const m=manifest(),i=m.entries.findIndex(e=>e.receipt===entry.receipt);if(i<0)m.entries.push(entry);else m.entries[i]=entry;writeFileSync(manifestPath,JSON.stringify(m,null,2));}
async function signIn(context:BrowserContext,baseURL:string,name='sl01-lister'){
 const u=JSON.parse(readFileSync(`.env.qa-${name}.local`,'utf8'))[0],cookies:{name:string;value:string}[]=[];
 const api=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:values=>{cookies.splice(0,cookies.length,...values);}}});
 const result=await api.auth.signInWithPassword({email:u.email,password:u.password});if(result.error)throw Error('Synthetic sign-in failed');
 await context.addCookies(cookies.map(({name,value})=>({name,value,url:baseURL,sameSite:'Lax' as const})));return {api,owner:result.data.user.id};
}
type Api=Awaited<ReturnType<typeof signIn>>['api'];
type Row={id:string;owner_id:string;revision:number;fields:ListingDraftFields;photos:DraftPhotoReference[];state:string;publication_request_id:string;publication_started_at:string|null};
const fields=(title:string):ListingDraftFields=>({title,bedrooms:'2',availableFrom:'2026-12-01',billsIncluded:false,description:'Synthetic task232 retained publication QA',roomPrices:['2100','2600'],address:{address:'Synthetic task232 private exact address',latitude:'31.25',longitude:'34.79',city:'Synthetic QA city',manual:true,confirmed:true}});
async function row(api:Api,id:string):Promise<Row>{const r=await api.from('listing_drafts').select('*').eq('id',id).single();if(r.error)throw Error('Exact draft unavailable');return r.data as Row;}
async function makeDraft(api:Api,purpose:string,photos=3){
 const entry:Entry={receipt:randomUUID(),purpose};remember(entry);
 const r=await api.rpc('create_listing_draft',{p_import_receipt_id:entry.receipt,p_source_listing_id:null,p_source_revision:null,p_fields:fields('Synthetic '+purpose+' '+entry.receipt.slice(0,6))});if(r.error)throw Error('Exact fixture create failed');
 const d=r.data as Row;entry.id=d.id;entry.owner=d.owner_id;entry.key=d.publication_request_id;entry.paths=Array.from({length:photos},()=>`${d.owner_id}/${d.id}/${randomUUID()}.jpg`);remember(entry);
 const bytes=readFileSync('.qa/task221/prepared.jpg');
 for(const objectPath of entry.paths){const upload=await api.storage.from('listing-draft-media').upload(objectPath,bytes,{contentType:'image/jpeg',cacheControl:'0'});if(upload.error)throw Error('Exact fixture photo failed');}
 if(photos){const saved=await api.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision,p_photos:entry.paths.map(objectPath=>({kind:'draft',objectPath}))});if(saved.error)throw Error('Exact fixture media association failed');}
 return row(api,d.id);
}
async function freeze(api:Api,d:Row,commit=false){
 const f=d.fields,a=f.address!,bytes=readFileSync('.qa/task221/prepared.jpg'),digest=createHash('sha256').update(bytes).digest('hex');
 const payload={title:f.title!.trim(),address:a.address!.trim(),latitude:Number(a.latitude),longitude:Number(a.longitude),bedrooms:Number(f.bedrooms),billsIncluded:f.billsIncluded,availableFrom:f.availableFrom,description:f.description!.trim(),roomPrices:f.roomPrices!.map(Number),photos:d.photos.map((_,i)=>`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/apartment-photos/${d.publication_request_id}/${i+1}.jpg`),photoDigests:d.photos.map(()=>digest)};
 const begun=await api.rpc('begin_listing_draft_publication',{p_draft_id:d.id,p_expected_revision:d.revision,p_payload:payload});if(begun.error)throw Error('Exact snapshot freeze failed');
 for(let i=0;i<(commit?3:1);i++){const u=await api.storage.from('apartment-photos').upload(`${d.publication_request_id}/${i+1}.jpg`,bytes,{contentType:'image/jpeg',cacheControl:'0'});if(u.error)throw Error('Exact public staging failed');}
 if(commit){const pub=await api.rpc('publish_apartment_once',{p_request_key:d.publication_request_id,p_draft:payload});if(pub.error)throw Error('Exact committed receipt setup failed');}
 return row(api,d.id);
}
async function expectPublished(page:Page,api:Api,d:Row,prefix:string){
 await expect(page).toHaveURL(prefix+'/compose/published/'+d.publication_request_id,{timeout:45_000});
 await expect.poll(async()=>(await row(api,d.id)).state).toBe('completed');
 const r=await api.from('apartments').select('id,title,photos').eq('id',d.publication_request_id).single();if(r.error||!r.data)throw Error('Exact public listing unavailable');expect(r.data.photos).toHaveLength(3);return r.data;
}
const isPublication=(request:{method:()=>string;headers:()=>Record<string,string>;postData:()=>string|null},id:string)=>request.method()==='POST'&&Boolean(request.headers()['next-action'])&&(request.postData()??'').includes(id)&&(request.postData()??'').includes('expectedAccountId');
test.use({trace:'off',screenshot:'off',video:'off'});test.describe.configure({mode:'serial'});test.setTimeout(120_000);
for(const locale of ['he','en'])for(const width of [390,1280])test(`${locale} ${width}: real selected cloud Publish flushes immediate input and media; B stays private`,async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!),en=locale==='en',prefix=en?'/en':'';await page.setViewportSize({width,height:844});
 try{
  const a=await makeDraft(api,`normal ${locale} ${width}`,2),b=await makeDraft(api,'untouched B',0),beforeB=await row(api,b.id);
  await page.goto(prefix+'/compose?draft='+a.id);const title=page.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true});await expect(title).toBeVisible();
  expect((await row(api,a.id)).revision).toBe(a.revision);
  await page.getByLabel(en?'Choose apartment photos':'בחירת תמונות לדירה',{exact:true}).setInputFiles('.qa/task221/prepared.jpg');
  await expect(page.getByText(en?'Preparing photos…':'מכינים תמונות…',{exact:true})).toHaveCount(0);
  await expect.poll(async()=>(await row(api,a.id)).photos.length).toBe(3);
  const finalTitle='Synthetic latest '+locale+' '+width+' '+randomUUID().slice(0,6);await title.fill(finalTitle);
  await page.getByRole('button',{name:en?'Publish listing':'פרסום המודעה',exact:true}).click();
  const published=await expectPublished(page,api,a,prefix);expect(published.title).toBe(finalTitle);expect(await row(api,b.id)).toEqual(beforeB);
  await page.getByRole('link',{name:en?'View listing':'צפייה במודעה',exact:true}).click();await expect(page.getByRole('heading',{name:finalTitle,exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('main img').evaluateAll(nodes=>nodes.filter(n=>(n as HTMLImageElement).naturalWidth>0).length)).toBeGreaterThanOrEqual(3);
  expect(await page.locator('main').innerText()).not.toContain('Synthetic task232 private exact address');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`publish-${locale}-${width}.png`)});}
 }finally{await api.auth.signOut({scope:'local'});}
});

test('lost successful Publish HTTP reply and completed-draft reopening resolve the same listing',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);try{const d=await makeDraft(api,'lost HTTP reply');await page.goto('/en/compose?draft='+d.id);await expect(page.getByRole('button',{name:'Publish listing',exact:true})).toBeVisible();let hidden=false;
 await page.route('**/*',async route=>{if(!hidden&&isPublication(route.request(),d.id)){hidden=true;await route.fetch();return route.abort('failed');}return route.continue();});
 await page.getByRole('button',{name:'Publish listing',exact:true}).click();await expectPublished(page,api,d,'/en');expect(hidden).toBe(true);await page.unrouteAll({behavior:'wait'});
 await page.goto('/en/compose?draft='+d.id);await expectPublished(page,api,d,'/en');expect((await api.from('apartments').select('id').eq('id',d.publication_request_id)).data).toHaveLength(1);
 }finally{await api.auth.signOut({scope:'local'});}
});

test('frozen Plus recovery never publishes on open; Escape waits; lost cancellation reply safely reloads new key',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!,'sl01-card');let release:(()=>void)|undefined;
 try{const d=await freeze(api,await makeDraft(api,'pending cancellation'));await page.goto('/en/profile');await page.getByRole('link',{name:'Add',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Publish an apartment',exact:true});
 await expect(dialog.getByRole('button',{name:'Check publication: '+d.fields.title,exact:true})).toBeVisible();let held=false;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/*',async route=>{if(!held&&isPublication(route.request(),d.id)){held=true;const response=await route.fetch();await gate;return route.fulfill({response});}return route.continue();});
 await dialog.getByRole('button',{name:'Check publication: '+d.fields.title,exact:true}).click();await expect.poll(()=>held).toBe(true);await page.keyboard.press('Escape');await expect(dialog).toBeVisible();release!();await expect(dialog.getByRole('button',{name:'Return to editing',exact:true})).toBeEnabled();await page.unrouteAll({behavior:'wait'});
 expect((await row(api,d.id)).revision).toBe(d.revision);expect((await api.from('apartments').select('id').eq('id',d.publication_request_id)).data).toHaveLength(0);
 let hidden=false;await page.route('**/*',async route=>{if(!hidden&&isPublication(route.request(),d.id)){hidden=true;await route.fetch();return route.abort('failed');}return route.continue();});page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Return to editing',exact:true}).click();await expect.poll(async()=>(await row(api,d.id)).revision).toBe(d.revision+1);await expect(dialog.getByRole('button',{name:'Check publication',exact:true})).toBeEnabled();await page.unrouteAll({behavior:'wait'});
 await dialog.getByRole('button',{name:'Check publication',exact:true}).click();await expect(dialog.getByRole('button',{name:'Load saved draft to edit',exact:true})).toBeVisible();page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Load saved draft to edit',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'Listing title',exact:true})).toHaveValue(d.fields.title!);
 const latest=await row(api,d.id);expect(latest.publication_started_at).toBeNull();expect(latest.publication_request_id).not.toBe(d.publication_request_id);expect(latest.photos).toEqual(d.photos);await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 }finally{release?.();await api.auth.signOut({scope:'local'});}
});

test('pending exact snapshot retries existing staged bytes, while committed receipt completes on reopening',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);try{
  const d=await freeze(api,await makeDraft(api,'pending retry'));await page.goto('/en/compose?draft='+d.id);await expect(page.getByRole('button',{name:'Retry publication',exact:true})).toBeEnabled();expect((await api.from('apartments').select('id').eq('id',d.publication_request_id)).data).toHaveLength(0);
  await page.getByRole('button',{name:'Retry publication',exact:true}).click();await expectPublished(page,api,d,'/en');
  const committed=await freeze(api,await makeDraft(api,'committed completion'),true);expect(committed.state).toBe('open');await page.goto('/en/compose?draft='+committed.id);await expectPublished(page,api,committed,'/en');
 }finally{await api.auth.signOut({scope:'local'});}
});

test('provider token missing after refresh preserves frozen input until confirmed cancellation',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);try{let d=await makeDraft(api,'provider recovery');const saved=await api.rpc('save_listing_draft',{p_draft_id:d.id,p_expected_revision:d.revision,p_fields:{...d.fields,address:{...d.fields.address,manual:false}}});expect(saved.error).toBeNull();d=await freeze(api,await row(api,d.id));
 await page.goto('/en/compose?draft='+d.id);await expect(page.getByRole('button',{name:'Retry publication',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Retry publication',exact:true}).click();await expect(page.locator('section[aria-busy] [role=alert]')).toContainText('location');expect((await row(api,d.id)).publication_request_id).toBe(d.publication_request_id);expect((await row(api,d.id)).photos).toEqual(d.photos);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Return to editing',exact:true}).click();await expect(page.getByRole('button',{name:'Load saved draft to edit',exact:true})).toBeVisible();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Load saved draft to edit',exact:true}).click();await expect(page.getByRole('textbox',{name:'Listing title',exact:true})).toHaveValue(d.fields.title!);expect((await api.from('apartments').select('id').eq('id',d.publication_request_id)).data).toHaveLength(0);
 }finally{await api.auth.signOut({scope:'local'});}
});

test('failed save blocks publication and stale revision keeps local edits',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);try{const d=await makeDraft(api,'save conflict');await page.goto('/en/compose?draft='+d.id);const title=page.getByRole('textbox',{name:'Listing title',exact:true});await expect(title).toBeVisible();
 await page.route('**/*',route=>route.request().method()==='POST'&&route.request().headers()['next-action']?route.abort('failed'):route.continue());await title.fill('Synthetic retained failed save');await page.getByRole('button',{name:'Publish listing',exact:true}).click();await expect(page.getByText('Could not save. Your edits are still here.',{exact:true})).toBeVisible();expect((await row(api,d.id)).publication_started_at).toBeNull();await expect(title).toHaveValue('Synthetic retained failed save');await page.unrouteAll({behavior:'wait'});
 const other=await api.rpc('save_listing_draft',{p_draft_id:d.id,p_expected_revision:d.revision,p_fields:{...d.fields,title:'Synthetic other device'}});expect(other.error).toBeNull();await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByText('This draft changed elsewhere. Your edits are still here.',{exact:true})).toBeVisible();await expect(title).toHaveValue('Synthetic retained failed save');await page.getByRole('button',{name:'Publish listing',exact:true}).click();expect((await row(api,d.id)).publication_started_at).toBeNull();
 }finally{await api.auth.signOut({scope:'local'});}
});

test('late publication response after account switch cannot navigate to or display previous owner result',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);let release:(()=>void)|undefined;let switched:Awaited<ReturnType<typeof signIn>>|undefined;
 try{const d=await makeDraft(api,'late actor switch');await page.goto('/en/compose?draft='+d.id);await expect(page.getByRole('button',{name:'Publish listing',exact:true})).toBeVisible();let held=false;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/*',async route=>{if(!held&&isPublication(route.request(),d.id)){held=true;const response=await route.fetch();await gate;return route.fulfill({response});}return route.continue();});await page.getByRole('button',{name:'Publish listing',exact:true}).click();await expect.poll(()=>held).toBe(true);await context.clearCookies();switched=await signIn(context,baseURL!,'sl01-card');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));release!();await expect(page.getByRole('textbox',{name:'Listing title',exact:true})).toHaveCount(0);await expect(page).not.toHaveURL(/\/published\//);await expect(page.locator('body')).not.toContainText('Listing published!');expect((await switched.api.from('listing_drafts').select('id').eq('id',d.id)).data).toEqual([]);
 }finally{release?.();await page.unrouteAll({behavior:'wait'});await switched?.api.auth.signOut({scope:'local'});await api.auth.signOut({scope:'local'});}
});
for(const locale of ['he','en'])test(locale+': real address provider selection forwards fresh transient token to cloud publication',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!),en=locale==='en',prefix=en?'/en':'';try{const d=await makeDraft(api,'real provider '+locale);const saved=await api.rpc('save_listing_draft',{p_draft_id:d.id,p_expected_revision:d.revision,p_fields:{...d.fields,address:{manual:false,confirmed:false}}});expect(saved.error).toBeNull();
 await page.goto(prefix+'/compose?draft='+d.id);await page.getByRole('combobox',{name:en?'Exact address':'כתובת מדויקת',exact:true}).fill(en?'Rager 12 Beer Sheva':'רגר 12 באר שבע');await expect(page.getByRole('option').first()).toBeVisible();await page.getByRole('option').first().getByRole('button').click();await page.getByRole('checkbox',{name:en?'I checked that the address and map location are correct':'בדקתי שהכתובת והמיקום במפה נכונים',exact:true}).check();
 await page.getByRole('button',{name:en?'Publish listing':'פרסום המודעה',exact:true}).click();await expectPublished(page,api,d,prefix);const persisted=await row(api,d.id);expect(persisted.fields.address?.manual).toBe(false);expect(JSON.stringify(persisted.fields)).not.toContain('token');
 }finally{await api.auth.signOut({scope:'local'});}
});

for(const locale of ['he','en'])for(const width of [390,1280])test(`${locale} ${width}: frozen recovery snapshot and actions fit and hydration never publishes`,async({page,context,baseURL})=>{
 const {api,owner}=await signIn(context,baseURL!),en=locale==='en',prefix=en?'/en':'';await page.setViewportSize({width,height:844});try{
 let d:Row|undefined;for(const entry of manifest().entries.filter(e=>e.owner===owner&&e.purpose==='recovery view')){const candidate=await row(api,entry.id!);if(candidate.state==='open'&&candidate.publication_started_at){d=candidate;break;}}d ??= await freeze(api,await makeDraft(api,'recovery view'));const before=d;
 await page.goto(prefix+'/compose?draft='+d.id);await expect(page.getByRole('button',{name:en?'Retry publication':'ניסיון פרסום נוסף',exact:true})).toBeEnabled();await expect(page.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:d.fields.title!,exact:true})).toBeVisible();await expect(page.getByRole('img',{name:en?'Saved photo 1':'תמונה שמורה 1',exact:true})).toBeVisible();expect(await row(api,d.id)).toEqual(before);expect((await api.from('apartments').select('id').eq('id',d.publication_request_id)).data).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`recovery-${locale}-${width}.png`),fullPage:true});}
 }finally{await api.auth.signOut({scope:'local'});}
});
