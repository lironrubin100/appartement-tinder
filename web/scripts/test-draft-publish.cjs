const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
function fixture(options={}){
 const actor=randomUUID(),id=randomUUID(),key=randomUUID(),bytes=Buffer.from('immutable prepared JPEG bytes');let receipt=false,canonical=null,failComplete=options.failComplete??0,who=actor;const calls=[],uploads=new Map();
 const row={id,owner_id:actor,schema_version:1,revision:4,created_at:'2026-10-23T00:00:00Z',updated_at:'2026-10-23T00:00:00Z',state:'open',source_listing_id:null,source_revision:null,publication_request_id:key,import_receipt_id:randomUUID(),publication_started_at:null,
 fields:{title:' Synthetic snapshot ',bedrooms:'2',availableFrom:'2026-12-01',billsIncluded:false,description:' Same content ',roomPrices:['2100','2600'],address:{address:' Synthetic exact address ',latitude:'31.25',longitude:'34.79',city:'Synthetic city',manual:true,confirmed:true}},
 photos:Array.from({length:3},()=>({kind:'draft',objectPath:`${actor}/${id}/${randomUUID()}.jpg`}))};
 const client={auth:{getUser:async()=>({data:{user:{id:who}},error:null})},from:table=>{
  const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='listing_drafts'?{...row}:table==='profiles'?{mode:'resident'}:{phone:null},error:null})};return q;},
 storage:{from:bucket=>({getPublicUrl:path=>({data:{publicUrl:`https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/${bucket}/${path}`}}),
 download:async(path,_options,parameters)=>{calls.push(['download',bucket,path]);if(bucket==='listing-draft-media'){assert.equal(parameters.cache,'no-store');return {data:new Blob([bytes],{type:'image/jpeg'}),error:null};}return uploads.has(path)?{data:uploads.get(path),error:null}:{data:null,error:{message:'absent'}};},
 upload:async(path,blob)=>{calls.push(['upload',bucket,path]);assert.equal(bucket,'apartment-photos');if(uploads.has(path))return {error:{message:'exists'}};uploads.set(path,blob);return {error:null};},
 remove:()=>{throw Error('Cleanup is forbidden');}})},
 rpc:async(name,args)=>{calls.push([name,args]);
  if(name==='begin_listing_draft_publication'){if(options.beginOutage)return {error:{message:'synthetic transient begin outage'}};if(canonical&&JSON.stringify(canonical)!==JSON.stringify(args.p_payload))return {error:{message:'PUBLICATION_SNAPSHOT_CONFLICT'}};canonical=args.p_payload;if(options.completedAtBegin){receipt=true;row.publication_started_at='2026-10-23T01:00:00Z';row.state='completed';return {error:{message:'DRAFT_UNAVAILABLE'}};}row.publication_started_at='2026-10-23T01:00:00Z';if(options.switchAfterFreeze)who=randomUUID();return {data:{...row},error:null};}
  if(name==='verify_listing_draft_publication_snapshot')return {data:!!canonical&&JSON.stringify(canonical)===JSON.stringify(args.p_payload)&&!options.badProof,error:null};
  if(name==='complete_listing_draft'){if(!receipt)return {error:{message:'PUBLICATION_RECEIPT_REQUIRED'}};if(failComplete-->0)return {error:{message:'network failed'}};row.state='completed';return {data:{...row},error:null};}
  if(name==='publish_apartment_once'){assert.deepEqual(args.p_draft,canonical);receipt=true;if(options.lostPublish)return {error:{message:'network failed'}};return {data:key,error:null};}
  throw Error('Unexpected RPC');
 }};
 return {actor,id,key,row,calls,uploads,bytes,services:loadDraftServices(client),input:()=>({id,expectedRevision:4,expectedAccountId:actor}),makeFrozen:()=>{row.publication_started_at='2026-10-23T01:00:00Z';canonical={wrong:'source'};row.state='completed';}};
}
test('one canonical payload binds exact snapshot/key/bytes and completed retries reuse the same listing',async()=>{
 const f=fixture(),result=await f.services.publishing.publishListingCloudDraft(f.input());assert.equal(result.ok,true);assert.equal(result.data.listingId,f.key);assert.equal(f.uploads.size,3);
 const payload=f.calls.find(c=>c[0]==='begin_listing_draft_publication')[1].p_payload;assert.equal(payload.title,'Synthetic snapshot');assert.equal(payload.description,'Same content');assert.equal(payload.address,'Synthetic exact address');assert.deepEqual(payload.photoDigests,Array(3).fill(createHash('sha256').update(f.bytes).digest('hex')));
 const retried=await f.services.publishing.publishListingCloudDraft({...f.input(),providerToken:'expired-transient-token'});assert.deepEqual(retried,result);assert.equal(f.calls.filter(c=>c[0]==='publish_apartment_once').length,1);
});
test('lost publish response reconciles; completion outage preserves frozen key then retry completes',async()=>{
 for(const options of [{lostPublish:true},{failComplete:1}]){const f=fixture(options),r=await f.services.publishing.publishListingCloudDraft(f.input());if(options.failComplete){assert.equal(r.error.code,'PUBLICATION_UNCERTAIN');assert.equal(f.row.state,'open');}else assert.equal(r.ok,true);const again=await f.services.publishing.publishListingCloudDraft(f.input());assert.equal(again.ok,true);assert.equal(again.data.listingId,f.key);assert.equal(f.calls.filter(c=>c[0]==='publish_apartment_once').length,1);}
});
test('completed/direct-bound mismatched source is refused before completion or publication',async()=>{
 const f=fixture();f.makeFrozen();const result=await f.services.publishing.publishListingCloudDraft(f.input());assert.equal(result.error.code,'STATE_UNAVAILABLE');assert(!f.calls.some(c=>['publish_apartment_once','complete_listing_draft'].includes(c[0])));
});
test('partial, foreign photo, stale revision and expected-account mismatch do not freeze/upload',async()=>{
 for(const change of [f=>f.row.photos=[],f=>f.row.fields.title='',f=>f.row.fields.availableFrom='2026-02-31',f=>f.row.fields.availableFrom='0000-01-01',f=>f.row.fields.roomPrices=['2147483648'],f=>f.row.photos[0].objectPath=`${randomUUID()}/${f.id}/${randomUUID()}.jpg`,f=>f.row.revision=5]){const f=fixture();change(f);assert.equal((await f.services.publishing.publishListingCloudDraft(f.input())).ok,false);assert(!f.calls.some(c=>c[0]==='begin_listing_draft_publication'||c[0]==='upload'));}
 const f=fixture();assert.equal((await f.services.publishing.publishListingCloudDraft({...f.input(),expectedAccountId:randomUUID()})).error.code,'AUTH_REQUIRED');
 const wrong=new FormData();wrong.set('expectedAccountId',randomUUID());assert('error' in await f.services.listingActions.publishListing(wrong));
});
test('provider draft needs a fresh exact-bound token; explicit manual confirmation cannot be inferred',async()=>{
 const f=fixture();f.row.fields.address.manual=false;assert.equal((await f.services.publishing.publishListingCloudDraft(f.input())).error.code,'LOCATION_REQUIRED');assert(!f.calls.some(c=>c[0]==='begin_listing_draft_publication'));
 const key=process.env.GEOAPIFY_API_KEY;process.env.GEOAPIFY_API_KEY='unit-only-private-provider-material';
 try{const form=new FormData();for(const [name,value]of Object.entries({address:'Synthetic exact address',latitude:'31.25',longitude:'34.79',locationMode:'provider',locationConfirmed:'on',locationToken:'invalid'}))form.set(name,value);assert.equal(f.services.publication.listingPublicationLocationValid(form,f.actor,process.env.GEOAPIFY_API_KEY),false);
 const {signAddress}=(()=>{const fs=require('fs'),ts=require('typescript'),path=require('path'),m={exports:{}};const load=filename=>{const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(filename),id+'.ts')):require(id),mod,mod.exports);return mod.exports;};return load(path.resolve('src/lib/listings/geocoding.ts'));})();
 const token=signAddress({label:'Synthetic exact address',latitude:31.25,longitude:34.79,city:'Synthetic city',accuracy:'building'},f.actor,process.env.GEOAPIFY_API_KEY);const result=await f.services.publishing.publishListingCloudDraft({...f.input(),providerToken:token});assert.equal(result.ok,true);
 }finally{if(key===undefined)delete process.env.GEOAPIFY_API_KEY;else process.env.GEOAPIFY_API_KEY=key;}
 const unconfirmed=fixture();unconfirmed.row.fields.address.confirmed=false;assert.equal((await unconfirmed.services.publishing.publishListingCloudDraft(unconfirmed.input())).error.code,'LOCATION_REQUIRED');
});
test('account change after freezing prevents forwarding private bytes to publisher',async()=>{
 const f=fixture({switchAfterFreeze:true});assert.equal((await f.services.publishing.publishListingCloudDraft(f.input())).error.code,'AUTH_REQUIRED');assert.equal(f.uploads.size,0);
});

test('concurrent completion between load and begin is reconciled without another upload',async()=>{const f=fixture({completedAtBegin:true});const result=await f.services.publishing.publishListingCloudDraft(f.input());assert.equal(result.ok,true);assert.equal(result.data.listingId,f.key);assert.equal(f.uploads.size,0);});

test('begin outage before commit remains retryable and leaves the draft unfrozen',async()=>{const f=fixture({beginOutage:true});const result=await f.services.publishing.publishListingCloudDraft(f.input());assert.equal(result.error.code,'PUBLICATION_UNCERTAIN');assert.equal(result.error.retryable,true);assert.equal(f.row.publication_started_at,null);assert.equal(f.uploads.size,0);});
