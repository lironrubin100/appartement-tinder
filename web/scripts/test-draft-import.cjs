const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
const actor='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const requestKey='10000000-0000-4000-8000-000000000001';
test('expected account is a server precondition, never caller authority for creation or legacy cancellation',async()=>{
 const client={auth:{getUser:async()=>({data:{user:{id:actor}},error:null})}};
 const services=loadDraftServices(client);
 const created=await services.actions.createListingCloudDraft({requestKey,expectedAccountId:other,fields:{title:'Old account private input'}});
 assert.equal(created.ok,false);assert.equal(created.error.code,'AUTH_REQUIRED');
 assert.deepEqual(await services.listingActions.discardListingAttempt(requestKey,other),{error:true});
 const imported=await services.imports.importLegacyListingDraft(other);assert.equal(imported.ok,false);assert.equal(imported.error.code,'AUTH_CHANGED');
});
test('an already published legacy attempt returns before any Storage deletion',async()=>{
 let calls=0;const services=loadDraftServices({auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},rpc:async(name,args)=>{calls++;assert.equal(name,'cancel_listing_publication');assert.equal(args.p_request_key,requestKey);return {data:'published',error:null};}});
 assert.deepEqual(await services.listingActions.discardListingAttempt(requestKey,actor),{status:'published'});assert.equal(calls,1);
});
