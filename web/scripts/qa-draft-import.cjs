// Actual IndexedDB + canvas + browser Supabase client; server calls bridge to
// actual TS server functions with ordinary clients at the Next cookie boundary.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto'),ts=require('typescript');
const {chromium}=require('@playwright/test'),{createClient}=require('@supabase/supabase-js');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
if(!process.argv.includes('--allow-private-fixtures'))throw Error('Explicit private synthetic fixture intent required');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(s=>/^[A-Z_]+=/.test(s)).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,'npbduvjnqnbydolmdpsc.supabase.co');
const credentials=fixture=>JSON.parse(fs.readFileSync(`.env.qa-${fixture}.local`,'utf8'))[0];
const users={owner:credentials('sl01-lister'),outside:credentials('sl01-card')};
const clients={},services={};let context,serverRole='owner',switchOnCreate=false;
const checked=r=>{assert.equal(r.ok,true,r.error?.code);return r;};
const denied=(r,code)=>{assert.equal(r.ok,false);assert.equal(r.error.code,code);};
(async()=>{
 fs.mkdirSync('.qa/task222',{recursive:true});const file='.qa/task222/manifest.json';
 const record=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{target:env.NEXT_PUBLIC_SUPABASE_URL,purpose:'Task 2.22 actual legacy import acceptance',seed:randomUUID(),created:{},done:{},retained:true};
 const persist=()=>fs.writeFileSync(file,JSON.stringify(record,null,2));persist();
 try{
  for(const role of Object.keys(users)){const api=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const login=await api.auth.signInWithPassword({email:users[role].email,password:users[role].password});assert.equal(login.error,null);users[role].id=login.data.user.id;clients[role]=api;services[role]=loadDraftServices(api);}
  record.ownerId=users.owner.id;persist();
  context=await chromium.launchPersistentContext(path.resolve('.qa/task222/chrome-profile'),{channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true,viewport:{width:390,height:844}});
  const page=context.pages()[0]||await context.newPage();
  const files={'import':'src/lib/listings/draft-import.ts','store':'src/lib/listings/draft-store.ts','media':'src/lib/listings/draft-media.ts','contract':'src/lib/listings/draft-media-contract.ts','validation':'src/lib/listings/validation.ts','photos':'src/utils/photos.ts'};
  const code=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText]));
  await page.exposeBinding('qaServerRole',(_source,role)=>{assert(['owner','outside'].includes(role));serverRole=role;});
  await page.exposeBinding('qaAction',async(_source,name,args)=>{
   if(name==='create'&&switchOnCreate){switchOnCreate=false;await page.evaluate(()=>window.qaSwitch('outside'));}
   const api=services[serverRole],methods={create:api.actions.createListingCloudDraft,load:api.actions.loadListingCloudDraft,setPhotos:api.mediaActions.setListingCloudDraftPhotos,preview:api.mediaActions.createListingDraftPhotoPreview,discard:api.listingActions.discardListingAttempt};assert(methods[name]);
   const result=await methods[name](...args);
   if(name==='create'&&result.ok){record.created[args[0].requestKey]=result.data.id;persist();}
   return result;
  });
  async function bootstrap(){
   await page.goto('https://appartement-tinder.vercel.app/en/login');await page.addScriptTag({path:path.resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js')});
   await page.evaluate(async({code,url,key,users,seed})=>{
    const net=window.fetch.bind(window);window.qaFault={};const cache={};
    window.qaClient=window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
     const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url),method=init?.method||'GET';
     if(u.pathname.includes('/storage/v1/object/')&&((window.qaFault.blockObject&&u.pathname.endsWith('/'+window.qaFault.blockObject+'.jpg'))||(window.qaFault.blockDownloads&&method==='GET')))return new Response(JSON.stringify({message:'Synthetic exact-path interruption'}),{status:503,headers:{'Content-Type':'application/json'}});
     if(window.qaFault.editOnUpload&&u.pathname.includes('/storage/v1/object/')&&method==='POST'){window.qaFault.editOnUpload=false;await window.qaStore.saveListingDraft(users.owner.id,{...window.qaSource,title:'Concurrent local edit '+seed});}
     return net(input,{...init,cache:'no-store'});
    }}});
    window.qaSwitch=async role=>{const user=users[role];const result=await window.qaClient.auth.signInWithPassword({email:user.email,password:user.password});if(result.error)throw Error('Browser fixture sign-in failed');await window.qaServerRole(role);};
    function load(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;const req=id=>{
     if(id==='@/utils/supabase/client')return {createClient:()=>window.qaClient};if(id==='@/utils/photos')return load('photos');
     if(id==='./draft-store')return load('store');if(id==='./draft-media')return load('media');if(id==='./draft-media-contract')return load('contract');if(id==='./validation')return load('validation');
     if(id==='./draft-actions')return {createListingCloudDraft:(...args)=>window.qaAction('create',args),loadListingCloudDraft:(...args)=>window.qaAction('load',args)};
     if(id==='./draft-media-actions')return {setListingCloudDraftPhotos:(...args)=>window.qaAction('setPhotos',args),createListingDraftPhotoPreview:(...args)=>window.qaAction('preview',args)};
     if(id==='./actions')return {discardListingAttempt:(...args)=>window.qaAction('discard',args)};throw Error('Unexpected import dependency '+id);
    };new Function('require','module','exports',code[name])(req,module,module.exports);return module.exports;}
    window.qaStore=load('store');window.qaImport=load('import');window.qaOwner=users.owner.id;window.qaOutside=users.outside.id;window.qaSeed=seed;
    window.qaMakeSource=async(name,count=1,requestKey=null)=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=700;const ctx=canvas.getContext('2d');ctx.fillStyle='#4c736e';ctx.fillRect(0,0,1200,700);ctx.fillStyle='#e7d8bd';ctx.fillRect(170,140,600,300);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return {version:1,title:name+' '+seed,bedrooms:'',availableFrom:'',billsIncluded:false,description:'Synthetic import check',roomPrices:[],address:{address:'Synthetic private address',selected:null,manual:true,latitude:'31.25',longitude:'34.79',city:'Synthetic city',confirmed:false},photos:Array.from({length:count},(_,i)=>new File([blob],'synthetic-'+i+'.png',{type:'image/png',lastModified:1792717386000})),requestKey};};
    window.qaRun=()=>window.qaImport.importLegacyListingDraft(users.owner.id);
    await window.qaSwitch('owner');
   },{code,url:env.NEXT_PUBLIC_SUPABASE_URL,key:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,users,seed:record.seed});
  }
  await bootstrap();
  if(!record.done.partial){
   const setup=await page.evaluate(async()=>{window.qaSource=await window.qaMakeSource('Import partial',2);await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);await window.qaStore.saveListingDraft(window.qaOutside,{...window.qaSource,title:'Outside namespace '+window.qaSeed});const ticket=await window.qaStore.claimLegacyDraftImport(window.qaOwner);window.qaFault.blockObject=ticket.receipt.objectIds[1];return {key:ticket.receipt.requestKey,object:ticket.receipt.objectIds[1]};});
   record.partialKey=setup.key;persist();
   if(!record.partialInterrupted){const interrupted=await page.evaluate(()=>window.qaRun());denied(interrupted,'UPLOAD_FAILED');assert.equal(await page.evaluate(async()=>Boolean(await window.qaStore.loadListingDraft(window.qaOwner))),true);record.partialInterrupted=true;persist();}
   await bootstrap();const result=checked(await page.evaluate(()=>window.qaRun()));assert.equal(result.data.id,record.created[setup.key]);assert.equal(result.data.photos.length,2);assert.equal(result.sourceRemoved,true);
   const retry=checked(await page.evaluate(()=>window.qaRun()));assert.equal(retry.data.id,result.data.id);
   const namespaces=await page.evaluate(async()=>({own:await window.qaStore.loadListingDraft(window.qaOwner),outside:(await window.qaStore.loadListingDraft(window.qaOutside)).title}));assert.equal(namespaces.own,undefined);assert.equal(namespaces.outside,'Outside namespace '+record.seed);
   record.done.partial=result.data.id;persist();
  }
  console.log('PASS real IndexedDB/browser import interruption, reload, same receipt/objects, completed retry and namespace preservation');
  if(!record.done.cleanup){
   await page.evaluate(async()=>{window.qaSource=await window.qaMakeSource('Import cleanup');await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);window.qaOriginalDelete=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){if(this.name==='drafts'&&key===window.qaOwner)throw new DOMException('Synthetic cleanup failure','UnknownError');return window.qaOriginalDelete.call(this,key);};});
   const failed=await page.evaluate(()=>window.qaRun());denied(failed,'LOCAL_STORAGE_FAILED');assert.equal(await page.evaluate(async()=>Boolean(await window.qaStore.loadListingDraft(window.qaOwner))),true);
   await page.evaluate(()=>{IDBObjectStore.prototype.delete=window.qaOriginalDelete;});const result=checked(await page.evaluate(()=>window.qaRun()));assert.equal(result.sourceRemoved,true);record.done.cleanup=result.data.id;persist();
  }
  console.log('PASS local cleanup transaction failure retains source and exact cloud receipt for retry');
  if(!record.done.concurrent){
   await page.evaluate(async()=>{window.qaSource=await window.qaMakeSource('Import original');await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);window.qaFault.editOnUpload=true;});
   const older=checked(await page.evaluate(()=>window.qaRun()));assert.equal(older.sourceRemoved,false);assert.equal(await page.evaluate(async()=>(await window.qaStore.loadListingDraft(window.qaOwner)).title),'Concurrent local edit '+record.seed);
   const newer=checked(await page.evaluate(()=>window.qaRun()));assert.notEqual(newer.data.id,older.data.id);assert.equal(newer.sourceRemoved,true);assert.equal(newer.data.fields.title,'Concurrent local edit '+record.seed);record.done.concurrent=[older.data.id,newer.data.id];persist();
  }
  console.log('PASS concurrent local edit survives old-snapshot completion and imports separately without overwriting cloud');
  if(!record.done.verification){
   await page.evaluate(async()=>{window.qaSource=await window.qaMakeSource('Import verification');await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);window.qaFault.blockDownloads=true;});
   const failed=await page.evaluate(()=>window.qaRun());denied(failed,'VERIFICATION_FAILED');assert.equal(await page.evaluate(async()=>Boolean(await window.qaStore.loadListingDraft(window.qaOwner))),true);
   await page.evaluate(()=>{window.qaFault={};});const result=checked(await page.evaluate(()=>window.qaRun()));assert.equal(result.sourceRemoved,true);record.done.verification=result.data.id;persist();
  }
  console.log('PASS failed cloud byte verification preserves local source until verified retry');
  if(!record.done.account){
   await page.evaluate(async()=>{window.qaSource=await window.qaMakeSource('Import account');await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);});const before=Object.keys(record.created).length;switchOnCreate=true;
   const switched=await page.evaluate(()=>window.qaRun());denied(switched,'AUTH_CHANGED');assert.equal(Object.keys(record.created).length,before);assert.equal(await page.evaluate(async()=>Boolean(await window.qaStore.loadListingDraft(window.qaOwner))),true);
   await page.evaluate(()=>window.qaSwitch('owner'));record.done.account=true;persist();
  }
  console.log('PASS actual account switch at create boundary cannot send old-account fields into another cloud account');
  if(!record.done.validation){
   const before=Object.keys(record.created).length;
   await page.evaluate(async()=>{const source=await window.qaMakeSource('Import oversized',0);source.photos=[new File([new Uint8Array(12*1024*1024+1)],'oversized.png',{type:'image/png',lastModified:1792717386000})];await window.qaStore.saveListingDraft(window.qaOwner,source);});
   denied(await page.evaluate(()=>window.qaRun()),'VALIDATION_FAILED');assert.equal(Object.keys(record.created).length,before);assert.equal(await page.evaluate(async()=>Boolean(await window.qaStore.loadListingDraft(window.qaOwner))),true);record.done.validation=true;persist();
  }
  console.log('PASS oversized legacy photo rejected before hashing/cloud creation with local source retained');
  if(!record.done.published){
   const listings=await clients.owner.from('apartments').select('id').eq('lister_id',users.owner.id).limit(1).single();assert.equal(listings.error,null);record.publishedKey=listings.data.id;persist();
   await page.evaluate(async key=>{window.qaSource=await window.qaMakeSource('Import published',1,key);await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);},listings.data.id);const before=Object.keys(record.created).length;
   const result=await page.evaluate(()=>window.qaRun());denied(result,'LEGACY_PUBLICATION_EXISTS');assert.equal(Object.keys(record.created).length,before);assert.equal(await page.evaluate(async()=>Boolean(await window.qaStore.loadListingDraft(window.qaOwner))),true);record.done.published=true;persist();
  }
  console.log('PASS existing owned publication blocks duplicate import and keeps local source without public changes');
  if(!record.done.cancelled){
   record.cancelKey??=randomUUID();persist();
   await page.evaluate(async key=>{window.qaSource=await window.qaMakeSource('Import cancelled',1,key);await window.qaStore.saveListingDraft(window.qaOwner,window.qaSource);},record.cancelKey);
   const result=checked(await page.evaluate(()=>window.qaRun()));assert.equal(result.sourceRemoved,true);assert.notEqual(result.data.publicationRequestId,record.cancelKey);record.done.cancelled=result.data.id;persist();
  }
  const oldAttempt=await clients.owner.rpc('cancel_listing_publication',{p_request_key:record.cancelKey});assert.equal(oldAttempt.error,null);assert.equal(oldAttempt.data,'cancelled');
  console.log('PASS unpublished legacy attempt is safely tombstoned before private import, without public duplication');
  const receiptMetadata=await page.evaluate(()=>new Promise((resolve,reject)=>{const open=indexedDB.open('shutaf-listing-drafts');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,read=db.transaction('imports','readonly').objectStore('imports').getAll();read.onerror=()=>reject(read.error);read.onsuccess=()=>{const records=read.result.filter(r=>r&&typeof r==='object'&&r.accountId===window.qaOwner).map(r=>({requestKey:r.requestKey,id:r.cloudDraftId,verified:r.verified,digests:r.digests,objectIds:r.objectIds,snapshotTitle:r.snapshot?.title,hasSnapshot:Boolean(r.snapshot),hasPrepared:Boolean(r.prepared)}));db.close();resolve(records);};};}));
  const titles={};titles[record.done.partial]='Import partial '+record.seed;titles[record.done.cleanup]='Import cleanup '+record.seed;titles[record.done.concurrent[0]]='Import original '+record.seed;titles[record.done.concurrent[1]]='Concurrent local edit '+record.seed;titles[record.done.verification]='Import verification '+record.seed;titles[record.done.cancelled]='Import cancelled '+record.seed;
  let images=0;
  for(const [key,id] of Object.entries(record.created)){
   const receipt=receiptMetadata.find(r=>r.requestKey===key);assert(receipt?.verified);assert.equal(receipt.id,id);assert.equal(receipt.hasSnapshot,false);assert.equal(receipt.hasPrepared,false);
   const cloud=checked(await services.owner.actions.loadListingCloudDraft(id)).data;assert.equal(cloud.ownerId,users.owner.id);assert.equal(cloud.importReceiptId,key);assert.equal(cloud.fields.title,titles[id]);assert.equal(cloud.photos.length,receipt.objectIds.length);
   for(const [index,photo] of cloud.photos.entries()){assert.equal(photo.kind,'draft');assert.equal(photo.objectPath,`${users.owner.id}/${id}/${receipt.objectIds[index]}.jpg`);const downloaded=await clients.owner.storage.from('listing-draft-media').download(photo.objectPath);assert.equal(downloaded.error,null);assert.equal(createHash('sha256').update(Buffer.from(await downloaded.data.arrayBuffer())).digest('hex'),receipt.digests[index]);images++;}
  }
  const blocked=receiptMetadata.find(r=>r.snapshotTitle==='Import account '+record.seed);assert(blocked&&!blocked.verified&&!blocked.id);
  for(const api of Object.values(clients)){const leaked=await api.from('listing_drafts').select('id').eq('import_receipt_id',blocked.requestKey);assert.equal(leaked.error,null);assert.equal(leaked.data.length,0);}
  const otherTitle=await page.evaluate(async()=>(await window.qaStore.loadListingDraft(window.qaOutside)).title);assert.equal(otherTitle,'Outside namespace '+record.seed);
  record.receipts=receiptMetadata.map(({requestKey,id,verified})=>({requestKey,id,verified}));record.images=images;
  console.log('PASS final ordinary-client field/reference/byte audit, cleared completed local payloads and zero cross-account receipt rows');
  record.verifiedAt=new Date().toISOString();record.privateDrafts=[...new Set(Object.values(record.created))];record.groups=8;persist();
  console.log('PASS retained exact-ID private import fixtures and persistent ignored QA profile; no public listing created');
 }finally{if(context)await context.close();for(const api of Object.values(clients))await api.auth.signOut({scope:'local'});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
