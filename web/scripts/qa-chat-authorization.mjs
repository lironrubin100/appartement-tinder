// Real ordinary-client checks, limited to this run's exact synthetic identities.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const at=p=>new URL(`../${p}`,import.meta.url);
const accounts=JSON.parse(await readFile(at('.env.qa.local'),'utf8'));
const run=JSON.parse(await readFile(at('.qa/run.json'),'utf8'));
assert.deepEqual(accounts.map(a=>a.id),run.ids);
assert.equal(run.target,'https://npbduvjnqnbydolmdpsc.supabase.co');
const env=Object.fromEntries((await readFile(at('.env.local'),'utf8')).split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,run.target);
const rows=[accounts[5],accounts[6],accounts[4]];
const clients=rows.map(()=>createClient(run.target,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const checks=[];let createdBlock=false;
try {
 for(let i=0;i<3;i++)ok(await clients[i].auth.signInWithPassword(rows[i]));
 const [a,b,x]=clients;
 const cid=ok(await a.rpc('list_chat_inbox')).find(c=>c.other_user_id===rows[1].id)?.conversation_id;
 assert.ok(cid,'Expected this run’s accepted chat');
 assert.equal(ok(await x.from('messages').select('id').eq('conversation_id',cid)).length,0);
 assert.ok((await x.rpc('mark_conversation_read',{p_conversation_id:cid,p_through_seq:999999})).error);
 assert.ok((await x.rpc('send_chat_message',{p_conversation_id:cid,p_body:'outsider',p_request_key:crypto.randomUUID()})).error);
 checks.push('outsider history/read/send denied');
 assert.ok((await a.from('conversation_members').update({last_read_seq:999999}).eq('conversation_id',cid).eq('user_id',rows[0].id)).error);
 checks.push('direct sequence-marker write denied');
 const key=crypto.randomUUID();const args={p_conversation_id:cid,p_body:'Retry-safe demo message',p_request_key:key};
 const retries=await Promise.all([a.rpc('send_chat_message',args),a.rpc('send_chat_message',args)]);
 assert.equal(ok(retries[0])[0].id,ok(retries[1])[0].id);
 assert.ok((await a.rpc('send_chat_message',{...args,p_body:'different payload'})).error);
 checks.push('concurrent retry returns one ID; changed payload conflicts');
 assert.equal(ok(await a.from('blocks').select('blocker_id').eq('blocker_id',rows[0].id).eq('blocked_id',rows[1].id)).length,0,'Refuse to remove any preexisting block');
 ok(await a.from('blocks').insert({blocker_id:rows[0].id,blocked_id:rows[1].id}));createdBlock=true;
 for(const c of [a,b]) {
  assert.equal(ok(await c.rpc('list_chat_inbox')).filter(i=>i.conversation_id===cid).length,0);
  assert.equal(ok(await c.from('messages').select('id').eq('conversation_id',cid)).length,0);
  assert.ok((await c.rpc('mark_conversation_read',{p_conversation_id:cid,p_through_seq:999999})).error);
  assert.ok((await c.rpc('send_chat_message',{p_conversation_id:cid,p_body:'blocked',p_request_key:crypto.randomUUID()})).error);
 }
 checks.push('symmetric block denies both users’ inbox/history/read/send');
 await writeFile(at('.qa/chat-authorization.json'),JSON.stringify({target:run.target,verified_at:new Date().toISOString(),fixture_ids:rows.map(r=>r.id),conversation_id:cid,checks,result:'passed',retained_demo:true},null,2),{mode:0o600});
 console.log(`Chat ordinary-client authorization passed: ${checks.length} scenario groups; synthetic demos retained.`);
} finally {
 if(createdBlock)ok(await clients[0].from('blocks').delete().eq('blocker_id',rows[0].id).eq('blocked_id',rows[1].id));
 await Promise.all(clients.map(c=>c.auth.signOut()));
}
