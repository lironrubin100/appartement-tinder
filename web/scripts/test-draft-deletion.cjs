const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
const actor=randomUUID(),id=randomUUID(),object=randomUUID();
const ticket={draft_id:id,owner_id:actor,original_revision:7,revision:8,completed:false};
function fixture({errorAt,foreign=false,malformed=false,switchAt,hiddenFinish=false}={}) {
 let changed=false;const calls=[];
 const client={auth:{getUser:async()=>({data:{user:{id:changed||foreign?randomUUID():actor}},error:null})},
 rpc:async(name,args)=>{
  calls.push(name);if(switchAt===name)changed=true;
  if(errorAt===name)return {error:{message:'DRAFT_CONFLICT'}};
  if(name==='begin_listing_draft_deletion')return {data:ticket};
  if(name==='list_listing_draft_deletion_objects')return {data:{items:[{object_id:object,object_path:malformed?'apartment-photos/active.jpg':`${actor}/${id}/${object}.jpg`}],projection_version:1,has_more:false,next_cursor:null}};
  if(name==='finish_listing_draft_deletion'&&hiddenFinish)throw Error('lost final response');
  return {data:null,error:null};
 },storage:{from:bucket=>({remove:async paths=>{calls.push({bucket,paths});return {error:errorAt==='remove'?{message:'private raw error'}:null};}})}};
 return {services:loadDraftServices(client),calls};
}
test('confirmed deletion uses only private exact manifest paths and requires finish acknowledgement',async()=>{
 const {services,calls}=fixture();assert.equal((await services.deletion.deleteListingCloudDraft(id,7,actor)).ok,true);
 assert.deepEqual(calls,['begin_listing_draft_deletion','list_listing_draft_deletion_objects',{bucket:'listing-draft-media',paths:[`${actor}/${id}/${object}.jpg`]},'finish_listing_draft_deletion']);
 const hidden=fixture({hiddenFinish:true});assert.equal((await hidden.services.deletion.deleteListingCloudDraft(id,7,actor)).error.code,'CLEANUP_PENDING');
});
test('foreign or changed actor, stale revision and malformed manifest stop before cleanup',async()=>{
 for(const options of [{foreign:true},{errorAt:'begin_listing_draft_deletion'},{malformed:true},{switchAt:'begin_listing_draft_deletion'}]){
  const {services,calls}=fixture(options);assert.equal((await services.deletion.deleteListingCloudDraft(id,7,actor)).ok,false);assert(!calls.some(c=>typeof c==='object'));assert(!calls.includes('finish_listing_draft_deletion'));
 }
});
test('Storage failure is durable pending cleanup, never success or draft finalization',async()=>{
 const {services,calls}=fixture({errorAt:'remove'});const result=await services.deletion.deleteListingCloudDraft(id,7,actor);
 assert.equal(result.error.code,'CLEANUP_PENDING');assert(!calls.includes('finish_listing_draft_deletion'));assert(!JSON.stringify(result).includes('private raw error'));
});
