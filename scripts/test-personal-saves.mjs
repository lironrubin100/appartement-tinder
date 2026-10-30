import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(new URL('../web/package.json',import.meta.url)),ts=require('typescript');
const source=await readFile(new URL('../web/src/lib/listings/personal-saves-store.ts',import.meta.url),'utf8');
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
 {module,exports:module.exports,Set,Map,Promise,AbortController,queueMicrotask,setTimeout,clearTimeout});
const create=module.exports.createPersonalSavesStore,id='10000000-0000-4000-8000-000000000001';
const held=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};};
async function until(fn){const end=Date.now()+1500;while(!fn()){if(Date.now()>end)throw Error('Store did not settle');await new Promise(r=>setImmediate(r));}}
function fixture(){let actor='A';const rows=new Map([['A',new Set()],['B',new Set()]]),calls=[];const backend={
 getActor:async()=>actor,read:async a=>[...rows.get(a)],set:async(a,key,desired)=>{calls.push({actor:a,key,desired});if(desired)rows.get(a).add(key);else rows.get(a).delete(key);return{saved:desired,interestCount:[...rows.values()].filter(x=>x.has(key)).length};}};
 return{backend,rows,calls,setActor:a=>{actor=a;}};
}
test('no I/O at construction; immutable empty server snapshot never carries private state',async()=>{
 const f=fixture();let reads=0;const get=f.backend.getActor;f.backend.getActor=async()=>{reads++;return get();};const s=create(f.backend);assert.equal(reads,0);const server=s.getServerSnapshot();await s.reload();await s.toggle(id);assert.equal(s.getSnapshot().favorites.has(id),true);assert.equal(s.getServerSnapshot(),server);assert.equal(server.favorites.size,0);assert.equal(server.actor,null);
});
test('shared subscribers update together and same-tick actions have one synchronous flight',async()=>{
 const f=fixture(),gate=held(),set=f.backend.set;f.backend.set=async(...args)=>{await gate.promise;return set(...args);};const s=create(f.backend);let a=0,b=0;s.subscribe(()=>a++);s.subscribe(()=>b++);await s.reload();const first=s.toggle(id);const second=await s.toggle(id);assert.equal(second.code,'busy');assert.equal(s.getSnapshot().pending.has(id),true);gate.resolve();assert.equal((await first).ok,true);assert.equal(f.calls.length,1);assert.equal(a,b);assert.ok(a>0);
});
test('read failure is unknown, never a successful empty overlay; retry restores canonical state',async()=>{
 const f=fixture();f.rows.get('A').add(id);let fail=true;const read=f.backend.read;f.backend.read=async(...args)=>{if(fail)throw Error('read failed');return read(...args);};const s=create(f.backend);await s.reload();assert.equal(s.getSnapshot().ready,false);assert.equal(s.getSnapshot().loadError,true);assert.equal((await s.toggle(id)).code,'load');fail=false;await s.reload();assert.equal(s.getSnapshot().favorites.has(id),true);assert.equal(s.getSnapshot().ready,true);
});
test('held old A read cannot populate B after an account change',async()=>{
 const f=fixture(),gate=held();f.rows.get('A').add(id);const read=f.backend.read;let entered=false;f.backend.read=async(a,...args)=>{if(a==='A'){entered=true;await gate.promise;}return read(a,...args);};const s=create(f.backend),old=s.reload();await until(()=>entered);f.setActor('B');s.observe('B');assert.equal(s.getSnapshot().favorites.size,0);await until(()=>s.getSnapshot().ready);gate.resolve();await old;assert.equal(s.getSnapshot().actor,'B');assert.equal(s.getSnapshot().favorites.size,0);
});
test('Retry repeats desired Save after a committed lost ACK, then explicit Unsave removes it',async()=>{
 const f=fixture(),set=f.backend.set;let lose=true;f.backend.set=async(...args)=>{const reply=await set(...args);if(lose){lose=false;throw Error('response lost after commit');}return reply;};const s=create(f.backend);await s.reload();assert.equal((await s.toggle(id)).code,'request');assert.equal(f.rows.get('A').has(id),true);assert.equal(s.getSnapshot().uncertain.has(id),true);assert.equal(s.getSnapshot().pending.size,0);const retry=await s.toggle(id);assert.equal(retry.ok,true);assert.equal(retry.interestCount,1);assert.deepEqual(f.calls.map(x=>x.desired),[true,true]);assert.equal((await s.toggle(id)).saved,false);assert.equal(f.rows.get('A').size,0);
});
test('actor change during an Auth preflight cancels the old intent before any RPC',async()=>{
 const f=fixture(),s=create(f.backend),gate=held();await s.reload();const get=f.backend.getActor;let enter=false;f.backend.getActor=async()=>{if(!enter){enter=true;await gate.promise;}return get();};const old=s.toggle(id);await until(()=>enter);f.setActor('B');s.observe('B');gate.resolve();assert.equal((await old).code,'changed');await until(()=>s.getSnapshot().ready);assert.equal(f.calls.length,0);assert.equal(s.getSnapshot().actor,'B');
});
test('old committed A response cannot clear a new B flight or publish A saved state',async()=>{
 const f=fixture(),aGate=held(),bGate=held(),set=f.backend.set;let aEntered=false,bEntered=false;f.backend.set=async(a,...args)=>{const reply=await set(a,...args);if(a==='A'){aEntered=true;await aGate.promise;}else{bEntered=true;await bGate.promise;}return reply;};const s=create(f.backend);await s.reload();const a=s.toggle(id);await until(()=>aEntered);f.setActor('B');s.observe('B');await until(()=>s.getSnapshot().ready);assert.equal(s.getSnapshot().favorites.size,0);const b=s.toggle(id);await until(()=>bEntered);aGate.resolve();assert.equal((await a).code,'changed');assert.equal(s.getSnapshot().pending.has(id),true);bGate.resolve();assert.equal((await b).ok,true);assert.equal(s.getSnapshot().actor,'B');assert.equal(s.getSnapshot().favorites.has(id),true);assert.deepEqual(f.calls.map(x=>x.actor),['A','B']);
});
test('deadlines settle read/mutation UI; late committed replies and Retry retain intent',async()=>{
 const f=fixture(),readGate=held(),read=f.backend.read;let holdRead=true;f.backend.read=async(...args)=>{if(holdRead)await readGate.promise;return read(...args);};const s=create(f.backend,30);await s.reload();assert.equal(s.getSnapshot().loadError,true);holdRead=false;readGate.resolve();await s.reload();const replyGate=held(),set=f.backend.set;let holdReply=true;f.backend.set=async(...args)=>{const reply=await set(...args);if(holdReply)await replyGate.promise;return reply;};assert.equal((await s.toggle(id)).code,'request');assert.equal(s.getSnapshot().pending.size,0);assert.equal(s.getSnapshot().uncertain.has(id),true);holdReply=false;assert.equal((await s.toggle(id)).ok,true);replyGate.resolve();await new Promise(r=>setImmediate(r));assert.equal(s.getSnapshot().favorites.has(id),true);assert.deepEqual(f.calls.map(x=>x.desired),[true,true]);
});
test('invalid replies are not accepted and logout immediately clears private state',async()=>{
 const f=fixture(),set=f.backend.set;let malformed=true;f.backend.set=async(...args)=>malformed?{saved:false,interestCount:-1}:set(...args);const s=create(f.backend);await s.reload();assert.equal((await s.toggle(id)).code,'request');assert.equal(s.getSnapshot().favorites.size,0);malformed=false;assert.equal((await s.toggle(id)).ok,true);f.setActor(null);s.observe(null);assert.equal(s.getSnapshot().favorites.size,0);assert.equal(s.getSnapshot().actor,null);await until(()=>s.getSnapshot().ready);assert.equal((await s.toggle(id)).code,'auth');
});
