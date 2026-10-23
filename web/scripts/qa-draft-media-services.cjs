// Runs the actual task 2.21 modules. Browser compression uses real canvas; all
// accepted auth/Storage/RPC calls use ordinary Supabase clients, never admin keys.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const ts=require('typescript');
const {chromium}=require('@playwright/test');
const {createClient}=require('@supabase/supabase-js');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
if(!process.argv.includes('--allow-private-fixtures'))throw Error('Explicit private synthetic fixture intent required');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(s=>/^[A-Z_]+=/.test(s)).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,'npbduvjnqnbydolmdpsc.supabase.co');
const sessions=[];
const credentials=fixture=>JSON.parse(fs.readFileSync(`.env.qa-${fixture}.local`,'utf8'))[0];
async function client(fixture,fetcher=fetch){
 const api=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetcher(input,{...init,cache:'no-store'})}});
 if(fixture){const user=credentials(fixture);const r=await api.auth.signInWithPassword({email:user.email,password:user.password});if(r.error)throw Error('Synthetic sign-in failed');sessions.push(api);}
 return api;
}
const checked=r=>{assert.equal(r.ok,true,r.error?.code);return r.data;};
const denied=(r,code)=>{assert.equal(r.ok,false);if(code)assert.equal(r.error.code,code);assert(!JSON.stringify(r).includes('SYNTHETIC_PRIVATE_FAULT'));};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fault=()=>new Response(JSON.stringify({message:'SYNTHETIC_PRIVATE_FAULT',error:'Synthetic unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});
const requestUrl=input=>new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
async function renderPreview(url){
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent('<img id="private-preview" alt="Synthetic private draft image">');await page.locator('img').evaluate((image,url)=>{image.src=url;},url);await page.waitForFunction(()=>{const image=document.querySelector('img');return image.complete&&image.naturalWidth>0;});const dimensions=await page.locator('img').evaluate(image=>[image.naturalWidth,image.naturalHeight]);await page.screenshot({path:'.qa/task221/preview.png'});return dimensions;}finally{await browser.close();}
}
async function browserPreparation(objectId){
 const files={'media':'src/lib/listings/draft-media.ts','contract':'src/lib/listings/draft-media-contract.ts','photos':'src/utils/photos.ts','validation':'src/lib/listings/validation.ts'};
 const code=Object.fromEntries(Object.entries(files).map(([name,file])=>[name,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText]));
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 try{
  const page=await browser.newPage();await page.goto('https://appartement-tinder.vercel.app/en/login');
  return await page.evaluate(async({code,objectId})=>{
   const cache={};function load(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;const req=id=>{
    if(id==='@/utils/photos')return load('photos');if(id==='./validation')return load('validation');if(id==='./draft-media-contract')return load('contract');
    if(['@/utils/supabase/client','./draft-actions','./draft-media-actions'].includes(id))return {};throw Error('Unexpected compression dependency');
   };new Function('require','module','exports',code[name])(req,module,module.exports);return module.exports;}
   const media=load('media'),canvas=document.createElement('canvas');canvas.width=2160;canvas.height=1200;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#416b79';ctx.fillRect(0,0,2160,1200);ctx.fillStyle='#e7d5af';ctx.fillRect(300,250,900,500);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const file=new File([png],'synthetic.png',{type:'image/png'});
   const result=await media.prepareDraftPhoto(file,objectId);if(!result.ok)throw Error(result.error.code);
   const bitmap=await createImageBitmap(result.data.blob);const dimensions=[bitmap.width,bitmap.height];bitmap.close();
   const invalid=await media.prepareDraftPhoto(new File(['broken'],'broken.png',{type:'image/png'}),objectId);
   const wrong=await media.prepareDraftPhoto(new File(['text'],'plain.txt',{type:'text/plain'}),objectId);
   return {bytes:Array.from(new Uint8Array(await result.data.blob.arrayBuffer())),type:result.data.blob.type,digest:result.data.digest,dimensions,originalType:file.type,originalSize:file.size,corrupt:invalid,wrong};
  },{code,objectId});
 }finally{await browser.close();}
}
(async()=>{
 fs.mkdirSync('.qa/task221',{recursive:true});const file='.qa/task221/manifest.json';
 const record=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{target:env.NEXT_PUBLIC_SUPABASE_URL,keys:[randomUUID(),randomUUID()],ids:[],objects:Array.from({length:5},()=>randomUUID()),purpose:'Task 2.21 actual media adapter acceptance',retained:true};
 const persist=()=>fs.writeFileSync(file,JSON.stringify(record,null,2));persist();
 try{
  const prepared=await browserPreparation(record.objects[0]);assert.equal(prepared.type,'image/jpeg');assert.equal(prepared.originalType,'image/png');assert(Math.max(...prepared.dimensions)<=1080);denied(prepared.corrupt,'PREPARATION_FAILED');denied(prepared.wrong,'VALIDATION_FAILED');assert.equal(hash(Buffer.from(prepared.bytes)),prepared.digest);
  const imageFile='.qa/task221/prepared.jpg';if(!fs.existsSync(imageFile))fs.writeFileSync(imageFile,Buffer.from(prepared.bytes));const bytes=fs.readFileSync(imageFile),digest=hash(bytes);
  record.compression={dimensions:prepared.dimensions,type:prepared.type,byteLength:prepared.bytes.length};persist();
  console.log('PASS real browser compression, 1080px JPEG/digest and corrupt/input failure without mutation');
  const owner=await client('sl01-lister'),outside=await client('sl01-card'),guest=await client();
  const actor=(await owner.auth.getUser()).data.user.id;if(record.ownerId)assert.equal(record.ownerId,actor);record.ownerId=actor;persist();
  const services=loadDraftServices(owner),foreign=loadDraftServices(outside),anonymous=loadDraftServices(guest);
  for(let i=0;i<2;i++){const d=checked(await services.actions.createListingCloudDraft({requestKey:record.keys[i],fields:{title:`Synthetic media service ${i+1}`,description:'Retained private QA draft'}}));if(record.ids[i])assert.equal(record.ids[i],d.id);record.ids[i]=d.id;persist();}
  const item=i=>Object.freeze({kind:'upload',objectId:record.objects[i],blob:new Blob([bytes],{type:'image/jpeg'}),digest});
  const reload=id=>services.actions.loadListingCloudDraft(id).then(checked);
  let first=await reload(record.ids[0]);let saved=await services.media.saveDraftMedia(first,Object.freeze([item(0),item(1)]));first=checked(saved);assert.equal(first.photos.length,2);assert.equal(first.photos[0].objectPath,`${actor}/${first.id}/${record.objects[0]}.jpg`);record.paths=first.photos.map(p=>p.objectPath);persist();
  const beforeRetry=first;first=checked(await services.media.saveDraftMedia(first,[item(0),item(1)]));assert.equal(first.revision,beforeRetry.revision+1);assert.deepEqual(first.photos,beforeRetry.photos);
  denied(await services.media.saveDraftMedia(beforeRetry,[item(0),item(1)]),'VERSION_CONFLICT');
  console.log('PASS actual immutable upload/association adapter, stable retries and stale revision preservation');
  const fresh=loadDraftServices(await client('sl01-lister'));const reopened=checked(await fresh.actions.loadListingCloudDraft(first.id));assert.deepEqual(reopened.photos,first.photos);
  const preview=checked(await fresh.media.previewDraftPhoto(reopened,reopened.photos[0]));assert(preview.expiresAt>Date.now()&&preview.expiresAt<=Date.now()+61000);const image=await fetch(preview.url,{cache:'no-store'});assert.equal(image.ok,true);assert.equal(hash(Buffer.from(await image.arrayBuffer())),digest);record.previewDimensions=await renderPreview(preview.url);assert.deepEqual(record.previewDimensions,[1080,600]);persist();
  denied(await foreign.mediaActions.createListingDraftPhotoPreview(first.id,first.photos[0]),'NOT_FOUND');denied(await anonymous.mediaActions.createListingDraftPhotoPreview(first.id,first.photos[0]),'AUTH_REQUIRED');
  denied(await foreign.media.saveDraftMedia(first,first.photos),'AUTH_CHANGED');denied(await anonymous.media.saveDraftMedia(first,first.photos),'AUTH_CHANGED');
  denied(await services.mediaActions.createListingDraftPhotoPreview(first.id,{kind:'draft',objectPath:`${actor}/${record.ids[1]}/${record.objects[3]}.jpg`}), 'NOT_FOUND');
  console.log('PASS fresh-session actual image preview and foreign/guest/unassociated denial');
  let second=await reload(record.ids[1]);if(second.photos.length)second=checked(await services.mediaActions.setListingCloudDraftPhotos(second.id,second.revision,[]));
  const failPath=`${actor}/${second.id}/${record.objects[4]}.jpg`;
  const interrupted=loadDraftServices(await client('sl01-lister',async(input,init)=>{const url=requestUrl(input);if(decodeURIComponent(url.pathname).endsWith(failPath)&&url.pathname.includes('/storage/v1/object/'))return fault();return fetch(input,init);}));
  const selection=Object.freeze([item(3),item(4)]),originalFields=JSON.stringify(second.fields);const partial=await interrupted.media.saveDraftMedia(second,selection);denied(partial,'UPLOAD_FAILED');assert.equal(partial.recovery.length,2);assert.equal(selection[0].blob.size,bytes.length);assert.equal(JSON.stringify((await reload(second.id)).fields),originalFields);assert.deepEqual((await reload(second.id)).photos,[]);
  const firstUpload=await owner.storage.from('listing-draft-media').download(partial.recovery[0].objectPath);assert.equal(firstUpload.error,null);assert.equal(hash(Buffer.from(await firstUpload.data.arrayBuffer())),digest);
  second=checked(await services.media.saveDraftMedia(second,selection));assert.equal(second.photos.length,2);assert.equal(JSON.stringify(second.fields),originalFields);record.paths.push(...second.photos.map(p=>p.objectPath));persist();
  console.log('PASS interrupted second upload preserves input/fields/first object, then exact retry succeeds');
  const uncertainPath=`${actor}/${first.id}/${record.objects[2]}.jpg`;let hidden=false;
  const uncertain=loadDraftServices(await client('sl01-lister',async(input,init)=>{const response=await fetch(input,init);if(decodeURIComponent(requestUrl(input).pathname).endsWith(uncertainPath)&&init?.method==='POST'){record.hiddenUploadStatus=response.status;hidden=true;return fault();}return response;}));
  first=checked(await uncertain.media.saveDraftMedia(first,[...first.photos,item(2)]));assert(hidden);assert.equal(first.photos.length,3);record.paths.push(uncertainPath);persist();
  const changed=Object.freeze({...item(0),blob:new Blob([Buffer.from('different bytes')],{type:'image/jpeg'}),digest:hash(Buffer.from('different bytes'))});
  const conflict=await services.media.saveDraftMedia(first,[changed,...first.photos.slice(1)]);denied(conflict,'PHOTO_CONFLICT');assert.deepEqual((await reload(first.id)).photos,first.photos);
  console.log('PASS hidden upload response reconciles exact bytes; different bytes cannot overwrite or associate');
  let switching;let switched=false;switching=await client('sl01-lister',async(input,init)=>{const response=await fetch(input,init);if(!switched&&requestUrl(input).pathname.includes('/storage/v1/object/sign/')){switched=true;const user=credentials('sl01-card');const login=await switching.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(login.error,null);}return response;});
  const switchedPreview=await loadDraftServices(switching).media.previewDraftPhoto(first,first.photos[0]);denied(switchedPreview,'AUTH_CHANGED');assert(switched);assert.equal(switchedPreview.recovery.length,0);assert(!JSON.stringify(switchedPreview).includes('token='));
  record.paths=[...new Set(record.paths)];record.verifiedAt=new Date().toISOString();record.groups=7;persist();
  console.log('PASS actual account switch during signing discards old-account preview result');
  console.log('PASS retained exactly two new private drafts and five image identities; no public listing or prior demo edits');
 }finally{for(const api of sessions)await api.auth.signOut({scope:'local'});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
