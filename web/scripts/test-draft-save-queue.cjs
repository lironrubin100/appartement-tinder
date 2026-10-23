const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/listings/draft-save-queue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
const {createDraftSaveQueue}=m.exports,base={id:'draft',ownerId:'owner',revision:4};
const next=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const states=[],calls=[];let release;
 const q=createDraftSaveQueue(base,async(id,rev,fields)=>{calls.push({id,rev,fields});if(calls.length===1)await new Promise(resolve=>release=resolve);return{ok:true,data:{...base,revision:rev+1}}},s=>states.push(s));
 const a={title:'first'};q.offer(a);a.title='mutated externally';const run=q.flush();await next();
 assert.equal(states.at(-1).phase,'saving');q.offer({title:'middle'});q.offer({title:'latest'});assert.equal(calls.length,1);release();assert(await run);
 assert.deepEqual(calls.map(x=>[x.rev,x.fields.title]),[[4,'first'],[5,'latest']]);assert.equal(states.at(-1).phase,'saved');
 let attempts=0;const errors=[];
 const retry=createDraftSaveQueue(base,async(_id,revision)=>{attempts++;if(attempts===1)throw Error('lost response');return{ok:true,data:{...base,revision:revision+1}}},s=>errors.push(s));
 retry.offer({title:'kept'});assert.equal(await retry.flush(),false);assert.equal(errors.at(-1).phase,'error');assert(await retry.retry());assert.equal(errors.at(-1).phase,'saved');
 let conflicts=0;const c=createDraftSaveQueue(base,async()=>{conflicts++;return{ok:false,error:{code:'VERSION_CONFLICT',retryable:false}}},()=>{});c.offer({title:'local'});assert.equal(await c.flush(),false);c.offer({title:'newer local'});assert.equal(await c.retry(),false);assert.equal(conflicts,1);
 let unblock;const late=[];const stopped=createDraftSaveQueue(base,async()=>{await new Promise(resolve=>unblock=resolve);return{ok:true,data:{...base,revision:5}}},s=>late.push(s));stopped.offer({title:'private'});const pending=stopped.flush();await next();stopped.stop();unblock();assert.equal(await pending,false);assert.equal(late.at(-1).phase,'saving');
 console.log('PASS ordered single-flight/latest coalescing, snapshot isolation, acknowledged saved, failure retry, conflict halt and unmount late-result guard');
})().catch(error=>{console.error(error);process.exitCode=1});
