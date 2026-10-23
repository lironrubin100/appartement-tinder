const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {loadDraftServices}=require('./draft-service-test-loader.cjs');
function fixture(){
 const actor=randomUUID(),id=randomUUID(),calls=[];let who=actor,error=null,throws=false;
 const row={id,ownerId:actor,revision:0,status:'active',title:'Complete owner model',bedrooms:2,billsIncluded:true,isSublet:false,availableFrom:'2026-12-01',description:null,
  location:{address:'EXACT PRIVATE ADDRESS',latitude:31.25,longitude:34.79},
  rooms:[{id:randomUUID(),label:'Available',monthlyPrice:2100,availableFrom:'2026-12-01',isAvailable:true},{id:randomUUID(),label:null,monthlyPrice:2600,availableFrom:'2026-12-03',isAvailable:false}],
  photos:[{kind:'published',objectPath:randomUUID()+'/1.jpg'}]};
 const client={auth:{getUser:async()=>({data:{user:who?{id:who}:null},error:null})},rpc:async(name,args)=>{calls.push([name,args]);if(throws)throw Error('secret internal RPC payload');return {data:row,error};}};
 const services=loadDraftServices(client);
 return{actor,id,row,calls,services,as:v=>who=v,fail:()=>error={message:'private SQL/address error'},explode:()=>throws=true};
}
test('owner action returns full readonly facts, room states/dates, initial stored revision and published object refs',async()=>{
 const f=fixture();for(const status of ['active','taken','paused','flagged']){f.row.status=status;const r=await f.services.ownerActions.loadOwnedListingForEdit(f.id,f.actor);assert.equal(r.ok,true);assert.deepEqual(r.data,f.row);}
 assert(f.calls.every(([name,args])=>name==='get_owned_listing_editor'&&args.p_listing_id===f.id));
 f.row.email='must never forward';f.row.location.extra='must never forward';const r=await f.services.editor.getOwnedListingEditModel(f.id);assert.equal(r.ok,true);assert(!JSON.stringify(r).includes('must never forward'));
});
test('anonymous, invalid identifiers and expected-account mismatch fail before RPC; missing/foreign returns no model',async()=>{
 const f=fixture();f.as(null);assert.equal((await f.services.ownerActions.loadOwnedListingForEdit(f.id)).error.code,'AUTH_REQUIRED');f.as(f.actor);
 for(const id of ['bad',null,{},f.id+'?x=1'])assert.equal((await f.services.editor.getOwnedListingEditModel(id)).error.code,'VALIDATION_FAILED');
 assert.equal((await f.services.editor.getOwnedListingEditModel(f.id,randomUUID())).error.code,'AUTH_REQUIRED');assert.equal(f.calls.length,0);
 const original=f.row.id;f.row.id=randomUUID();assert.equal((await f.services.editor.getOwnedListingEditModel(original)).error.code,'STATE_UNAVAILABLE');
});
test('malformed version/location/rooms and unproven/foreign or signed media are never forwarded',async()=>{
 for(const change of [r=>delete r.revision,r=>r.revision=-1,r=>r.ownerId=randomUUID(),r=>r.location.latitude=Infinity,r=>r.rooms[0].id='bad',r=>r.rooms[0].availableFrom='2026-02-31',r=>r.rooms[0].monthlyPrice=0,r=>r.rooms.push(r.rooms[0]),r=>r.photos[0].objectPath=null,r=>r.photos[0].kind='draft',r=>r.photos[0].objectPath='https://private.invalid/image?token=secret']){const f=fixture();change(f.row);const r=await f.services.editor.getOwnedListingEditModel(f.id);assert.equal(r.ok,false);assert.equal(r.error.code,'STATE_UNAVAILABLE');assert(!('data'in r));}
});
test('late account change drops a returned private model; RPC exceptions are safe typed recoverable errors',async()=>{
 const f=fixture();let checks=0;const client={auth:{getUser:async()=>({data:{user:{id:++checks===1?f.actor:randomUUID()}},error:null})},rpc:async()=>({data:f.row,error:null})};const s=loadDraftServices(client);assert.equal((await s.editor.getOwnedListingEditModel(f.id)).error.code,'AUTH_REQUIRED');
 for(const mode of ['fail','explode']){const x=fixture();x[mode]();const result=await x.services.ownerActions.loadOwnedListingForEdit(x.id);assert.equal(result.error.code,'INTERNAL');assert.equal(result.error.retryable,true);assert(!JSON.stringify(result).includes('private'));}
 const missing=loadDraftServices({auth:{getUser:async()=>({data:{user:{id:f.actor}},error:null})},rpc:async()=>({data:null,error:null})});assert.deepEqual(await missing.editor.getOwnedListingEditModel(f.id),{ok:false,error:{code:'NOT_FOUND',retryable:false}});
});
