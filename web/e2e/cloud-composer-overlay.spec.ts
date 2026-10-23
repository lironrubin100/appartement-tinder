import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const file='.qa/task229/manifest.json';
type Manifest={ids:string[];newIds:string[];ownerId?:string;emptyVerified?:boolean;importIds?:string[];emptyFixtures?:{ownerId:string;index:number;ids:string[];zeroVerified:boolean}[]};
const manifest=():Manifest=>existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{ids:[],newIds:[]};
const persist=(m:Manifest)=>{mkdirSync('.qa/task229',{recursive:true});writeFileSync(file,JSON.stringify(m,null,2));};
async function signIn(context:BrowserContext,baseURL:string,name='sl01-card',fixtureIndex=0){
 const u=JSON.parse(readFileSync(`.env.qa-${name}.local`,'utf8'))[fixtureIndex],cookies:{name:string;value:string}[]=[];
 const api=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:v=>{cookies.splice(0,cookies.length,...v);}}});
 const auth=await api.auth.signInWithPassword({email:u.email,password:u.password});if(auth.error)throw Error('Synthetic sign-in failed');
 await context.addCookies(cookies.map(({name,value})=>({name,value,url:baseURL,sameSite:'Lax' as const})));return{api,ownerId:auth.data.user.id};
}
type Api=Awaited<ReturnType<typeof signIn>>['api'];
async function rows(api:Api){const r=await api.from('listing_drafts').select('id,fields,photos,revision,import_receipt_id');if(r.error)throw Error('Exact owner rows unavailable');return r.data as {id:string;fields:{title?:string};photos:unknown[];revision:number;import_receipt_id:string|null}[];}
async function row(api:Api,id:string){return (await rows(api)).find(r=>r.id===id)!;}
async function recordNew(api:Api,before:string[]){const added=(await rows(api)).filter(r=>!before.includes(r.id));const m=manifest();m.newIds=[...new Set([...m.newIds,...added.map(r=>r.id)])];persist(m);return added;}
function ui(page:Page,en=true){const dialog=page.getByRole('dialog',{name:en?'Publish an apartment':'פרסום דירה',exact:true});return{dialog,add:page.getByRole('link',{name:en?'Add':'הוסף',exact:true}),title:dialog.getByRole('textbox',{name:en?'Listing title':'כותרת המודעה',exact:true}),save:dialog.getByRole('button',{name:en?'Save draft and close':'שמירת טיוטה וסגירה',exact:true})};}
async function open(page:Page,en=true){const u=ui(page,en);await u.add.click();await expect(u.dialog).toBeVisible();return u;}
async function choose(page:Page,title:string,en=true){await ui(page,en).dialog.getByRole('button',{name:(en?'Continue: ':'המשך: ')+title,exact:true}).click();await expect(ui(page,en).title).toBeVisible();}
async function png(page:Page){const url=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;c.getContext('2d')!.fillRect(0,0,1200,800);return c.toDataURL('image/png');});return{name:'synthetic-plus.png',mimeType:'image/png',buffer:Buffer.from(url.split(',')[1],'base64')};}
test.use({trace:'off',screenshot:'off',video:'off'});test.describe.configure({mode:'serial'});test.setTimeout(120_000);

test('Plus starts a new intent from empty or explicit choice without navigating, and retains exact private fixtures',async({page,context,baseURL})=>{
 const {api,ownerId}=await signIn(context,baseURL!);try{
  const before=await rows(api);await page.goto('/en/profile');const origin=page.url(),u=await open(page);
  if(before.length)await u.dialog.getByRole('button',{name:'New listing',exact:true}).click();
  await expect(u.title).toHaveValue('');expect(page.url()).toBe(origin);const added=await recordNew(api,before.map(r=>r.id));expect(added).toHaveLength(1);
  const m=manifest();m.ownerId=ownerId;m.emptyVerified=m.emptyVerified||!before.length;if(!m.ids[0])m.ids[0]=added[0].id;persist(m);
  await u.title.fill('Synthetic Plus first intent');await u.save.click();await expect(u.dialog).toBeHidden();expect(page.url()).toBe(origin);
  if(!m.ids[1]){const seed=await api.rpc('create_listing_draft',{p_import_receipt_id:randomUUID(),p_source_listing_id:null,p_source_revision:null,p_fields:{title:'Synthetic Plus B',description:'Second explicit private fixture'}});if(seed.error)throw Error('Private B seed failed');m.ids[1]=(seed.data as {id:string}).id;persist(m);}
 }finally{await api.auth.signOut({scope:'local'});}
});
for(const locale of ['he','en'])for(const width of [390,1280])test(`${locale} ${width}: explicit A/B, overlay origin, media and Escape flush`,async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!),en=locale==='en',prefix=en?'/en':'';try{
  const [a,b]=manifest().ids,first=await row(api,a),second=await row(api,b);await page.setViewportSize({width,height:844});await page.goto(prefix+'/profile');const origin=page.url(),u=await open(page,en);
  await expect(u.dialog.getByRole('heading',{name:en?'New listing or saved draft?':'מודעה חדשה או טיוטה שמורה?',exact:true})).toBeVisible();
  expect((await row(api,a)).revision).toBe(first.revision);expect((await row(api,b)).revision).toBe(second.revision);
  if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`plus-${locale}-${width}.png`)});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await choose(page,(second.fields as {title:string}).title,en);await expect(u.title).toHaveValue((second.fields as {title:string}).title);await u.title.press('Escape');await expect(u.dialog).toBeHidden();expect(page.url()).toBe(origin);const closedBRevision=(await row(api,b)).revision;
  await open(page,en);await choose(page,(first.fields as {title:string}).title,en);const title='Synthetic Plus '+locale+' '+width+' '+Date.now();await u.title.fill(title);
  if(!(first.photos as unknown[]).length)await u.dialog.getByLabel(en?'Choose apartment photos':'בחירת תמונות לדירה',{exact:true}).setInputFiles(await png(page));
  await u.title.press('Escape');await expect(u.dialog).toBeHidden();expect(page.url()).toBe(origin);const stored=await row(api,a);expect((stored.fields as {title:string}).title).toBe(title);expect(stored.photos).toHaveLength(1);expect((await row(api,b)).revision).toBe(closedBRevision);
  await open(page,en);await choose(page,title,en);await expect(u.dialog.getByRole('img',{name:en?'Saved photo 1':'תמונה שמורה 1',exact:true})).toBeVisible();await u.save.click();await expect(u.dialog).toBeHidden();
 }finally{await api.auth.signOut({scope:'local'});}
});

test('lost creation replies retry one intent; closing it then choosing New creates a distinct draft',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);try{
  await page.goto('/en/profile');const origin=page.url();let u=await open(page);await expect(u.dialog.getByRole('button',{name:'New listing',exact:true})).toBeVisible();
  let before=(await rows(api)).map(r=>r.id),hidden=false;await page.route('**/*',async route=>{if(!hidden&&route.request().method()==='POST'&&route.request().headers()['next-action']){hidden=true;await route.fetch();return route.abort('failed');}return route.continue();});
  await u.dialog.getByRole('button',{name:'New listing',exact:true}).click();await expect(u.dialog.getByRole('alert')).toHaveText('Could not open the draft. Please retry.');const lost=await recordNew(api,before);expect(lost).toHaveLength(1);await page.unrouteAll({behavior:'wait'});
  await u.dialog.getByRole('button',{name:'Try again',exact:true}).click();await expect(u.title).toHaveValue('');expect(await recordNew(api,before)).toHaveLength(1);await u.save.click();await expect(u.dialog).toBeHidden();
  u=await open(page);await expect(u.dialog.getByRole('button',{name:'New listing',exact:true})).toBeVisible();before=(await rows(api)).map(r=>r.id);hidden=false;await page.route('**/*',async route=>{if(!hidden&&route.request().method()==='POST'&&route.request().headers()['next-action']){hidden=true;await route.fetch();return route.abort('failed');}return route.continue();});
  await u.dialog.getByRole('button',{name:'New listing',exact:true}).click();await expect(u.dialog.getByRole('alert')).toBeVisible();const abandoned=await recordNew(api,before);expect(abandoned).toHaveLength(1);await page.unrouteAll({behavior:'wait'});await u.dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(u.dialog).toBeHidden();
  u=await open(page);const all=(await rows(api)).map(r=>r.id);await u.dialog.getByRole('button',{name:'New listing',exact:true}).click();await expect(u.title).toHaveValue('');const fresh=await recordNew(api,all);expect(fresh).toHaveLength(1);expect(fresh[0].id).not.toBe(abandoned[0].id);expect((await row(api,abandoned[0].id)).revision).toBe(abandoned[0].revision);await u.save.click();await expect(u.dialog).toBeHidden();expect(page.url()).toBe(origin);
 }finally{await api.auth.signOut({scope:'local'});}
});

test('stale selection refresh and failed close preserve exact input and origin',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!),b=manifest().ids[1];try{
  await page.goto('/en/profile');const origin=page.url(),u=await open(page),old=await row(api,b),title=(old.fields as {title:string}).title;
  await expect(u.dialog.getByRole('button',{name:'Continue: '+title,exact:true})).toBeVisible();const changed=await api.rpc('save_listing_draft',{p_draft_id:b,p_expected_revision:old.revision,p_fields:{...(old.fields as object),title:'Synthetic B changed '+Date.now()}});if(changed.error)throw Error('Scoped stale arrangement failed');
  await u.dialog.getByRole('button',{name:'Continue: '+title,exact:true}).click();await expect(u.dialog.getByRole('alert')).toHaveText('This draft changed. Reload the draft list to continue.');await expect(u.title).toHaveCount(0);
  await u.dialog.getByRole('button',{name:'Try again',exact:true}).click();await choose(page,(await row(api,b)).fields.title as string);
  await page.route('**/*',route=>route.request().method()==='POST'&&route.request().headers()['next-action']?route.abort('failed'):route.continue());await u.title.fill('Synthetic retained failed close');await u.title.press('Escape');await expect(u.dialog.getByText('Could not save. Your edits are still here.',{exact:true})).toBeVisible();await expect(u.title).toHaveValue('Synthetic retained failed close');expect(page.url()).toBe(origin);
  await page.unrouteAll({behavior:'wait'});await u.dialog.getByRole('button',{name:'Retry save',exact:true}).click();await expect(u.dialog.getByText('Saved to your account',{exact:true})).toBeVisible();await u.save.click();await expect(u.dialog).toBeHidden();
 }finally{await api.auth.signOut({scope:'local'});}
});

test('unavailable device storage preserves cloud choices and explicit New with in-memory retry',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);try{
  await page.addInitScript(()=>{IDBFactory.prototype.open=function(){throw new DOMException('Synthetic unavailable device storage','SecurityError');};const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('shutaf-plus-new:'))throw new DOMException('Synthetic storage denied','SecurityError');return set.call(this,key,value);};});
  await page.goto('/en/profile');const u=await open(page);await expect(u.dialog.getByRole('alert')).toContainText('Could not check drafts on this device.');await choose(page,(await row(api,manifest().ids[0])).fields.title as string);await u.save.click();await expect(u.dialog).toBeHidden();
  await open(page);const before=(await rows(api)).map(r=>r.id);await u.dialog.getByRole('button',{name:'New listing',exact:true}).click();await expect(u.title).toHaveValue('');expect(await recordNew(api,before)).toHaveLength(1);await u.save.click();await expect(u.dialog).toBeHidden();
 }finally{await api.auth.signOut({scope:'local'});}
});

test('legacy import is explicit, interrupted upload retries one receipt and removes source only after verification',async({page,context,baseURL})=>{
 const {api,ownerId}=await signIn(context,baseURL!);try{
  await page.goto('/en/profile');const photo=await png(page);await page.evaluate(async({ownerId,bytes})=>{const draft={version:1,title:'Synthetic legacy Plus import',bedrooms:'2.',availableFrom:'2026-1',billsIncluded:false,description:'Retained explicit legacy content',roomPrices:['1900.'],address:null,requestKey:null,photos:[new File([new Uint8Array(bytes)],'synthetic-legacy.png',{type:'image/png'})]};await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('shutaf-listing-drafts',2);r.onupgradeneeded=()=>{for(const name of ['drafts','imports'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name);};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(draft,ownerId);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});},{ownerId,bytes:[...photo.buffer]});
  const before=(await rows(api)).map(r=>r.id),u=await open(page);await expect(u.dialog.getByRole('button',{name:'Import draft from this device',exact:true})).toBeVisible();expect((await rows(api)).map(r=>r.id)).toEqual(before);await u.dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(u.dialog).toBeHidden();await open(page);
  await page.route('**/storage/v1/object/listing-draft-media/**',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());await u.dialog.getByRole('button',{name:'Import draft from this device',exact:true}).click();await expect(u.dialog.getByRole('alert')).toHaveText('Could not open the draft. Please retry.');const partial=await recordNew(api,before);expect(partial).toHaveLength(1);
  const localExists=()=>page.evaluate(owner=>new Promise<boolean>((resolve,reject)=>{const r=indexedDB.open('shutaf-listing-drafts');r.onsuccess=()=>{const db=r.result,read=db.transaction('drafts','readonly').objectStore('drafts').get(owner);read.onsuccess=()=>{resolve(Boolean(read.result));db.close();};read.onerror=()=>reject(read.error);};}),ownerId);expect(await localExists()).toBe(true);
  await page.unrouteAll({behavior:'wait'});await u.dialog.getByRole('button',{name:'Try again',exact:true}).click();await expect(u.title).toHaveValue('Synthetic legacy Plus import');const imported=await recordNew(api,before);expect(imported).toHaveLength(1);expect(imported[0].id).toBe(partial[0].id);expect(imported[0].photos).toHaveLength(1);expect(await localExists()).toBe(false);const m=manifest();m.importIds=[...new Set([...(m.importIds??[]),imported[0].id])];persist(m);
  await u.save.click();await expect(u.dialog).toBeHidden();await open(page);await expect(u.dialog.getByRole('button',{name:'Import draft from this device',exact:true})).toHaveCount(0);await u.dialog.getByRole('button',{name:'Close',exact:true}).click();
 }finally{await api.auth.signOut({scope:'local'});}
});

test('account switch during selected load discards private late result',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!);let other:Awaited<ReturnType<typeof signIn>>|undefined,release:(()=>void)|undefined;try{
  await page.goto('/en/profile');const u=await open(page),a=await row(api,manifest().ids[0]);await expect(u.dialog.getByRole('button',{name:'Continue: '+a.fields.title,exact:true})).toBeVisible();let held=false;const wait=new Promise<void>(resolve=>release=resolve);
  await page.route('**/*',async route=>{if(!held&&route.request().method()==='POST'&&route.request().headers()['next-action']){held=true;await wait;}return route.continue();});await u.dialog.getByRole('button',{name:'Continue: '+a.fields.title,exact:true}).click();await expect.poll(()=>held).toBe(true);
  await context.clearCookies();other=await signIn(context,baseURL!,'sl01-lister');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(u.dialog.getByText('Access to drafts could not be verified. Reload to continue.',{exact:true})).toBeVisible();release!();await page.unrouteAll({behavior:'wait'});await expect(u.title).toHaveCount(0);await expect(u.dialog.getByRole('button',{name:/Continue:/})).toHaveCount(0);expect((await row(api,a.id)).revision).toBe(a.revision);await page.keyboard.press('Escape');await expect(u.dialog).toBeHidden();
 }finally{release?.();await page.unrouteAll({behavior:'wait'});await api.auth.signOut({scope:'local'});if(other)await other.api.auth.signOut({scope:'local'});}
});

test('a verified empty resident opens a new cloud draft directly from Plus',async({page,context,baseURL})=>{
 const index=baseURL!.includes('localhost')?0:1,{api,ownerId}=await signIn(context,baseURL!,'sl02-live',index);try{
  const before=await rows(api),m=manifest(),prior=m.emptyFixtures?.find(f=>f.ownerId===ownerId);if(before.length)expect(prior?.zeroVerified).toBe(true);
  await page.goto('/en/profile');const origin=page.url(),u=await open(page);if(before.length)await u.dialog.getByRole('button',{name:'New listing',exact:true}).click();
  await expect(u.title).toHaveValue('');expect(page.url()).toBe(origin);const added=(await rows(api)).filter(r=>!before.some(old=>old.id===r.id));expect(added).toHaveLength(1);
  const fixture={ownerId,index,ids:[...(prior?.ids??[]),added[0].id],zeroVerified:prior?.zeroVerified||!before.length};m.emptyFixtures=[...(m.emptyFixtures??[]).filter(f=>f.ownerId!==ownerId),fixture];persist(m);await u.save.click();await expect(u.dialog).toBeHidden();expect(page.url()).toBe(origin);
 }finally{await api.auth.signOut({scope:'local'});}
});

test('conflict reload stays in the overlay and failed reload preserves local input',async({page,context,baseURL})=>{
 const {api}=await signIn(context,baseURL!),id=manifest().ids[0];try{
  await page.goto('/en/profile');const origin=page.url(),u=await open(page),initial=await row(api,id);await choose(page,initial.fields.title as string);
  const remoteTitle='Synthetic remote overlay '+Date.now(),changed=await api.rpc('save_listing_draft',{p_draft_id:id,p_expected_revision:initial.revision,p_fields:{...(initial.fields as object),title:remoteTitle}});if(changed.error)throw Error('Exact conflict arrangement failed');
  await u.title.fill('Synthetic local overlay input');await expect(u.dialog.getByText('This draft changed elsewhere. Your edits are still here.',{exact:true})).toBeVisible();await expect(u.dialog.getByRole('textbox',{name:'Saved version',exact:true})).toHaveValue(new RegExp(remoteTitle));
  await page.route('**/*',route=>route.request().method()==='POST'&&route.request().headers()['next-action']?route.abort('failed'):route.continue());page.once('dialog',dialog=>dialog.accept());await u.dialog.getByRole('button',{name:'Load saved version',exact:true}).click();await expect(u.dialog.getByText('Could not load the saved version. Your edits are still here.',{exact:true})).toBeVisible();await expect(u.title).toHaveValue('Synthetic local overlay input');expect(page.url()).toBe(origin);
  await page.unrouteAll({behavior:'wait'});page.once('dialog',dialog=>dialog.accept());await u.dialog.getByRole('button',{name:'Load saved version',exact:true}).click();await expect(u.title).toHaveValue(remoteTitle);await expect(u.dialog.getByRole('textbox',{name:'Your edits',exact:true})).toHaveCount(0);expect(page.url()).toBe(origin);await u.save.click();await expect(u.dialog).toBeHidden();
 }finally{await api.auth.signOut({scope:'local'});}
});
