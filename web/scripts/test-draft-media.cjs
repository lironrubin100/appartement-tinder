const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
const actor='00000000-0000-4000-8000-000000000001';
const draftId='10000000-0000-4000-8000-000000000001';
const source='20000000-0000-4000-8000-000000000001';
const photo={kind:'published',objectPath:`${source}/1.jpg`};
const row=()=>({id:draftId,owner_id:actor,schema_version:1,revision:0,created_at:'2026-10-23T01:00:00.000001Z',updated_at:'2026-10-23T01:00:00.000001Z',state:'open',source_listing_id:source,source_revision:0,fields:{},photos:[photo],publication_request_id:'30000000-0000-4000-8000-000000000001',import_receipt_id:null,publication_started_at:null});
test('media envelope accepts partial/no-photo drafts and rejects URLs, traversal, forged attributes, prototype and duplicates',()=>{
 const parse=loadDraftServices({}).mediaContract.parsePhotoReferences;
 assert.deepEqual(parse([]),[]);assert.deepEqual(parse([photo]),[photo]);
 for(const value of [[{...photo,objectPath:'https://example.invalid/image.jpg'}],[{...photo,objectPath:'actor/../private.jpg'}],[{...photo,signedUrl:'secret'}],[Object.assign(Object.create({private:true}),photo)],[photo,photo],null,Array.from({length:9},(_,i)=>({...photo,objectPath:`${source}/${i}.jpg`}))])assert.equal(parse(value),null);
});
test('anonymous media calls stop before data/storage and backend exceptions stay sanitized',async()=>{
 const guest=loadDraftServices({auth:{getUser:async()=>({data:{user:null},error:null})}}).mediaActions;
 assert.equal((await guest.setListingCloudDraftPhotos(draftId,0,[])).error.code,'AUTH_REQUIRED');
 assert.equal((await guest.createListingDraftPhotoPreview(draftId,photo)).error.code,'AUTH_REQUIRED');
 const broken=loadDraftServices({auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},from(){throw Error('SYNTHETIC_PRIVATE_INTERNAL_EXCEPTION');}}).mediaActions;
 const failed=await broken.createListingDraftPhotoPreview(draftId,photo);assert.equal(failed.error.code,'INTERNAL');assert.equal(failed.error.retryable,true);assert(failed.error.correlationId);assert(!JSON.stringify(failed).includes('SYNTHETIC_PRIVATE_INTERNAL_EXCEPTION'));
});
test('published references stay in their original bucket and are associated/previewed without copying or deleting source images',async()=>{
 let stored=row();const calls=[];
 const client={auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},
  from(table){const q={select(){return q;},eq(key,value){calls.push([table,key,value]);return q;},async maybeSingle(){return {data:table==='listing_drafts'?stored:{id:source},error:null};}};return q;},
  async rpc(name,args){assert.equal(name,'set_listing_draft_photos');stored={...stored,revision:stored.revision+1,photos:args.p_photos};return {data:stored,error:null};},
  storage:{from(bucket){assert.equal(bucket,'apartment-photos');return {async createSignedUrl(path,ttl){assert.equal(path,photo.objectPath);assert.equal(ttl,60);return {data:{signedUrl:'https://example.invalid/transient-preview'},error:null};}};}}
 };
 const services=loadDraftServices(client);const draft=services.contract.decodeDraft(stored,actor);const input=Object.freeze([Object.freeze({...photo})]);
 const saved=await services.media.saveDraftMedia(draft,input);assert.equal(saved.ok,true);assert.deepEqual(saved.data.photos,[photo]);assert.deepEqual(saved.uploaded,[]);assert.deepEqual(input,[photo]);
 const preview=await services.media.previewDraftPhoto(saved.data,photo);assert.equal(preview.ok,true);assert(calls.some(call=>call[0]==='apartments'&&call[1]==='lister_id'&&call[2]===actor));assert(!JSON.stringify(stored).includes('transient-preview'));
});
