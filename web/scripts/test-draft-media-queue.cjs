const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/listings/draft-save-queue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
const {createDraftSaveQueue}=m.exports,next=()=>new Promise(r=>setImmediate(r));
const initial={id:'draft',ownerId:'owner',revision:4,fields:{title:'old'},photos:[]};
const upload=id=>({kind:'upload',objectId:id,blob:new Blob(['photo '+id],{type:'image/jpeg'}),digest:id.repeat(64).slice(0,64)});
const a=upload('a'),b=upload('b'),ref=item=>({kind:'draft',objectPath:'owner/draft/'+item.objectId+'.jpg'});
(async()=>{
 let current={...initial},release;const calls=[],states=[],acks=[];
 const q=createDraftSaveQueue(initial,async(_id,revision,fields)=>{calls.push(['fields',revision]);current={...current,revision:revision+1,fields};return{ok:true,data:current}},s=>states.push(s),{
  acknowledged:d=>acks.push(d.revision),writeMedia:async(draft,items)=>{calls.push(['media',draft.revision,items.map(x=>x.kind)]);if(calls.length===2)await new Promise(r=>release=r);current={...current,revision:draft.revision+1,photos:items.map(x=>x.kind==='upload'?ref(x):x)};return{ok:true,data:current,uploaded:[]}}
 });
 q.offer({title:'first'},[a]);const run=q.flush();await next();q.offer({title:'latest'},[b,a]);assert.equal(calls.length,2);assert(!states.some(x=>x.phase==='saved'));release();assert(await run);
 assert.deepEqual(calls,[['fields',4],['media',5,['upload']],['fields',6],['media',7,['upload','draft']]]);
 assert.deepEqual(acks,[5,6,7,8]);assert.deepEqual(current.photos,[ref(b),ref(a)]);assert.equal(states.at(-1).phase,'saved');
 let fieldsCalls=0,mediaCalls=0,seenIds=[];let acknowledged={...initial};const failures=[];
 const retry=createDraftSaveQueue(initial,async(_id,rev,fields)=>{fieldsCalls++;acknowledged={...acknowledged,revision:rev+1,fields};return{ok:true,data:acknowledged}},s=>failures.push(s),{writeMedia:async(draft,items)=>{mediaCalls++;seenIds.push(items[0].objectId);if(mediaCalls===1)return{ok:false,error:{code:'UPLOAD_FAILED',retryable:true},recovery:[ref(a)]};acknowledged={...draft,revision:draft.revision+1,photos:[ref(a)]};return{ok:true,data:acknowledged,uploaded:[ref(a)]}}});
 retry.offer({title:'changed'},[a]);assert.equal(await retry.flush(),false);assert.equal(failures.at(-1).phase,'error');assert.equal(fieldsCalls,1);assert(await retry.retry());assert.equal(fieldsCalls,1);assert.deepEqual(seenIds,['a','a']);assert.equal(acknowledged.revision,6);
 let writes=0;const conflict=createDraftSaveQueue(initial,async()=>{throw Error('Unexpected field write')},()=>{},{writeMedia:async()=>{writes++;return{ok:false,error:{code:'VERSION_CONFLICT',retryable:false},recovery:[]}}});conflict.offer(initial.fields,[a]);assert.equal(await conflict.flush(),false);conflict.offer({title:'keep input'},[b,a]);assert.equal(await conflict.retry(),false);assert.equal(writes,1);
 const published={kind:'published',objectPath:'owner/source/photo.jpg'},edit={...initial,photos:[published]};let removed;
 const removal=createDraftSaveQueue(edit,async()=>{throw Error('Unexpected field write')},()=>{},{writeMedia:async(draft,items)=>{removed=items;return{ok:true,data:{...draft,revision:5,photos:[]},uploaded:[]}}});removal.offer(initial.fields,[]);assert(await removal.flush());assert.deepEqual(removed,[]);assert.deepEqual(edit.photos,[published]);
 console.log('PASS shared revision/ordered fields+media, pending reorder/new fields, acknowledged-only Saved, stable retry without rewriting fields, conflict halt and non-mutating published-ref removal');
})().catch(e=>{console.error(e);process.exitCode=1});
