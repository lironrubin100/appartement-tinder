import { test, expect, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(s=>/^[A-Z_]+=/.test(s)).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
async function signIn(context:BrowserContext,baseURL:string){
 const u=JSON.parse(readFileSync('.env.qa-sl01-lister.local','utf8'))[0],cookies:{name:string;value:string}[]=[];
 const api=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:v=>{cookies.splice(0,cookies.length,...v);}}});
 if((await api.auth.signInWithPassword({email:u.email,password:u.password})).error)throw Error('Synthetic sign-in failed');
 await context.addCookies(cookies.map(({name,value})=>({name,value,url:baseURL,sameSite:'Lax' as const})));return api;
}
async function arrange(api:Awaited<ReturnType<typeof signIn>>,label:string){
 const receipt=randomUUID(),manifest='.qa/task230/ui-manifest.json';mkdirSync('.qa/task230',{recursive:true});
 const records=(()=>{try{return JSON.parse(readFileSync(manifest,'utf8'));}catch{return[];}})();const record:{receipt:string;label:string;id?:string;path?:string;completed?:boolean}={receipt,label};records.push(record);const persist=()=>writeFileSync(manifest,JSON.stringify(records,null,2));persist();
 const created=await api.rpc('create_listing_draft',{p_import_receipt_id:receipt,p_fields:{title:'Synthetic delete '+label}});if(created.error)throw Error('Exact private arrangement failed');record.id=created.data.id;persist();
 const actor=(await api.auth.getUser()).data.user!.id;record.path=`${actor}/${record.id}/${randomUUID()}.jpg`;persist();
 const bytes=readFileSync('.qa/task221/prepared.jpg');if((await api.storage.from('listing-draft-media').upload(record.path,bytes,{contentType:'image/jpeg',cacheControl:'0'})).error)throw Error('Private upload failed');
 const linked=await api.rpc('set_listing_draft_photos',{p_draft_id:record.id,p_expected_revision:0,p_photos:[{kind:'draft',objectPath:record.path}]});if(linked.error)throw Error('Private association failed');
 return {id:record.id!,path:record.path,revision:linked.data.revision,done:()=>{record.completed=true;persist();}};
}
const source=()=>JSON.parse(readFileSync('.qa/task227/manifest.json','utf8')).source;
async function verifySource(api:Awaited<ReturnType<typeof signIn>>){const s=source();const r=await api.from('apartments').select('title,photos,status').eq('id',s.id).single();expect(r.error).toBeNull();expect(r.data!.title).toBe(s.title);expect(r.data!.photos).toEqual(s.photos);expect(r.data!.status).toBe('active');const image=await api.storage.from('apartment-photos').download(s.path);expect(image.error).toBeNull();expect(createHash('sha256').update(Buffer.from(await image.data!.arrayBuffer())).digest('hex')).toBe(s.digest);}
test.use({trace:'off',screenshot:'off',video:'off'});test.describe.configure({mode:'serial'});test.setTimeout(120_000);
for(const locale of ['he','en'])for(const width of [390,1280])test(`${locale} ${width}: explicit cancel, failed cleanup, reload and exact retry`,async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),en=locale==='en',prefix=en?'/en':'';const d=await arrange(api,`${locale}-${width}-${new URL(baseURL!).hostname}`);
 try{
  await page.setViewportSize({width,height:844});await page.goto(prefix+'/my-listings');const row=page.locator(`[data-draft-id="${d.id}"]`);await expect(row).toBeVisible();const remove=row.getByRole('button',{name:en?'Delete draft':'מחיקת טיוטה',exact:true});await expect(remove).toBeEnabled();
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain(en?'private photos':'תמונותיה הפרטיות');await dialog.dismiss();});await remove.click();expect((await api.from('listing_drafts').select('state').eq('id',d.id).single()).data!.state).toBe('open');
  let actions=0,blocked=false;await page.route('**/*',async route=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']&&route.request().postData()?.includes(d.id)&&++actions===2){blocked=true;return route.abort('failed');}return route.continue();});
  page.once('dialog',dialog=>dialog.accept());await remove.click();await expect.poll(()=>blocked).toBe(true);await page.unrouteAll({behavior:'wait'});
  await expect(row.getByText(en?'Deletion pending. This draft cannot be edited.':'המחיקה ממתינה. אי אפשר לערוך את הטיוטה.',{exact:true})).toBeVisible();await expect(row.getByRole('link')).toHaveCount(0);
  const stored=await api.storage.from('listing-draft-media').download(d.path);expect(stored.error).toBeNull();
  await page.reload();await expect(row.getByText(en?'Deletion pending. This draft cannot be edited.':'המחיקה ממתינה. אי אפשר לערוך את הטיוטה.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await row.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`delete-${locale}-${width}.png`)});}
  page.once('dialog',dialog=>dialog.accept());await row.getByRole('button',{name:en?'Retry cleanup':'ניסיון ניקוי נוסף',exact:true}).click();await expect(row).toHaveCount(0);
  expect((await api.from('listing_drafts').select('id').eq('id',d.id)).data).toEqual([]);expect((await api.storage.from('listing-draft-media').download(d.path,{cacheNonce:randomUUID()},{cache:'no-store'})).error).not.toBeNull();d.done();await verifySource(api);
 }finally{await api.auth.signOut({scope:'local'});}
});
test('stale delete preserves changed draft and private image',async({page,context,baseURL})=>{
 const api=await signIn(context,baseURL!),d=await arrange(api,'stale-'+new URL(baseURL!).hostname);try{
  await page.goto('/en/my-listings');const row=page.locator(`[data-draft-id="${d.id}"]`);await expect(row.getByRole('button',{name:'Delete draft',exact:true})).toBeEnabled();
  expect((await api.rpc('save_listing_draft',{p_draft_id:d.id,p_expected_revision:d.revision,p_fields:{title:'Synthetic changed before deletion'}})).error).toBeNull();
  page.once('dialog',dialog=>dialog.accept());await row.getByRole('button',{name:'Delete draft',exact:true}).click();await expect(row.getByRole('alert')).toContainText('changed');
  expect((await api.from('listing_drafts').select('state,fields').eq('id',d.id).single()).data).toMatchObject({state:'open',fields:{title:'Synthetic changed before deletion'}});expect((await api.storage.from('listing-draft-media').download(d.path)).error).toBeNull();
 }finally{await api.auth.signOut({scope:'local'});}
});
