import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { validatePool, withPoolLease, beginScenario, recordScenarioResource, validateScenario, assertScenarioClean, cleanupScenario, saveScenario } from './qa-pool.mjs';
import { PGlite } from '@electric-sql/pglite';

const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'];
const target='http://127.0.0.1:54321';
const roles=['owner','accepted_requester','pending_requester'];
function pool() {
  const rows=ids.map(id=>({id,email:`qa-pool-${id}@example.invalid`,password:'fixture-test-only'}));
  const actors=Object.fromEntries(roles.map((role,index)=>[role,ids[index]]));
  const baseline={version:1,target,state:'ready',actors:Object.fromEntries(roles.map(role=>[role,{id_ref:role,profile:{completed:true,mode:'resident',name:`QA ${role}`,birth_date:'1999-01-01',bio:'Fictional reusable QA actor.',facts:{cleanliness:'tidy_shared'},preferences:{strict_non_smoking:true},disclosed_fields:['cleanliness']},portrait:{owner_role:role,source:'web/public/demo-content/portraits/demo-portrait-01.png',sha256:'a'.repeat(64),bytes:2048,width:1024,height:1536,storage_path_template:'{actor_id}/qa-pool-portrait.png',provenance:'Tracked fictional portrait asset; card 0.11 uploads through the owner route.'}}]))};
  return {rows,run:{version:1,purpose:'reusable-qa',prefix:'qa-pool',target,ids:[...ids],actors,baseline}};
}
async function clean(directory) {
  const path=resolve(directory);
  assert.equal(dirname(path),resolve(tmpdir()));
  assert.ok(basename(path).startsWith('shutaf-qa-lease-'));
  await rm(path,{recursive:true,force:true});
}
test('three exact reusable actors validate without provisioning or replacing identities',()=>{
  const {rows,run}=pool();const before=JSON.stringify({rows,run});
  assert.equal(validatePool(rows,run,target),rows);
  assert.equal(validatePool(rows,run,target),rows);
  assert.equal(JSON.stringify({rows,run}),before);
});
test('demo/legacy manifests and wrong target, roles, or baseline cannot become reusable QA',()=>{
  for(const change of [p=>delete p.run.purpose,p=>p.run.purpose='demo',p=>p.run.target='https://other.invalid',p=>p.rows[0].email='someone@example.com',p=>p.rows[0].id=p.rows[1].id,p=>p.run.ids.reverse(),p=>p.run.actors.pending_requester=ids[0],p=>delete p.run.actors.owner,p=>delete p.run.baseline,p=>p.run.baseline.actors.owner.portrait.sha256='bad']) {
    const p=pool();change(p);assert.throws(()=>validatePool(p.rows,p.run,target));
  }
});
test('overlapping actor pools serialize, partial acquisition rolls back only own locks',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'shutaf-qa-lease-'));
  try {
    await withPoolLease(dir,{target,ids:[ids[1]]},async()=>{
      await assert.rejects(withPoolLease(dir,{target,ids:[ids[0],ids[1]]},async()=>assert.fail('must not run')),/already leased/);
      assert.equal((await readdir(dir)).length,1);
      await withPoolLease(dir,{target,ids:[ids[0]]},async()=>assert.equal((await readdir(dir)).length,2));
    });
    assert.deepEqual(await readdir(dir),[]);
  } finally {await clean(dir);}
});
test('failed scenario releases leases so same accounts can be reused',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'shutaf-qa-lease-'));
  try {
    await assert.rejects(withPoolLease(dir,{target,ids},async()=>{throw new Error('scenario failure');}),/scenario failure/);
    let ran=false;await withPoolLease(dir,{target,ids},async()=>{ran=true;});
    assert.equal(ran,true);assert.deepEqual(await readdir(dir),[]);
  } finally {await clean(dir);}
});

test('scenario cleanup restores real Postgres group/chat data twice, rejects outsiders and cascades, and recovers uncertain commits', async () => {
  const db = new PGlite();
  const dir = await mkdtemp(join(tmpdir(), 'shutaf-qa-lease-'));
  const { run, rows } = pool();
  const outsider = '90000000-0000-4000-8000-000000000001';
  const baselineGroup = '20000000-0000-4000-8000-000000000001';
  const baselineChat = '20000000-0000-4000-8000-000000000002';
  const group = '30000000-0000-4000-8000-000000000001';
  const chat = '30000000-0000-4000-8000-000000000002';
  const path = join(dir, 'scenario.json');
  const save = journal => saveScenario(path, journal);
  const executeSql = async sql => { try { await db.exec(sql); } catch (error) { await db.exec('rollback'); throw error; } };
  const count = async table => Number((await db.query(`select count(*) n from public.${table}`)).rows[0].n);
  const snapshot = async () => Object.fromEntries(await Promise.all(Object.entries({group:'groups',listing:'apartments',inquiry:'listing_inquiries',conversation:'conversations'}).map(async ([kind,table]) => [kind,(await db.query(`select id from public.${table}`)).rows.map(row=>row.id)])));
  const create = async () => {
    const journal = beginScenario(run, await snapshot()); await save(journal);
    await db.query('insert into public.groups(id,admin_id,name) values($1,$2,$3)',[group,ids[0],'Run group']);
    await recordScenarioResource({journal,run,kind:'group',id:group,save});
    await db.query('insert into public.conversations(id,group_id) values($1,$2)',[chat,group]);
    await recordScenarioResource({journal,run,kind:'conversation',id:chat,save});
    for (const id of ids) {
      await db.query('insert into public.group_members(group_id,user_id) values($1,$2)',[group,id]);
      await db.query('insert into public.conversation_members(conversation_id,user_id) values($1,$2)',[chat,id]);
    }
    await db.query("insert into public.messages(conversation_id,sender_id,body) values($1,$2,'QA message')",[chat,ids[0]]);
    await db.query('insert into public.group_invites(group_id,inviter_id,invitee_id) values($1,$2,$3)',[group,ids[0],ids[1]]);
    return journal;
  };
  try {
    await db.exec('create schema auth; create table auth.users(id uuid primary key,email text);');
    await db.exec(await readFile(new URL('../../supabase/schema.sql',import.meta.url),'utf8'));
    await db.exec('create table public.group_invites(id uuid primary key default gen_random_uuid(),group_id uuid references public.groups on delete cascade,inviter_id uuid references public.profiles,invitee_id uuid references public.profiles);');
    for (const row of [...rows,{id:outsider,email:'outside@example.invalid'}]) {
      await db.query('insert into auth.users(id,email) values($1,$2)',[row.id,row.email]);
      await db.query("insert into public.profiles(id,name,onboarded) values($1,'Retained profile',true)",[row.id]);
    }
    await db.query("insert into public.groups(id,admin_id,name) values($1,$2,'Retained demo')",[baselineGroup,ids[0]]);
    await db.query('insert into public.conversations(id) values($1)',[baselineChat]);
    for (let iteration=0;iteration<2;iteration++) await withPoolLease(dir,{target,ids},async()=>{
      const journal=await create();
      assert.throws(()=>validateScenario({...journal,resources:[...journal.resources,{kind:'group',id:baselineGroup}]},run),/retained/);
      await cleanupScenario({journal,run,save,executeSql});
      assert.equal(journal.state,'clean'); assert.equal(await count('groups'),1); assert.equal(await count('conversations'),1);
      assert.doesNotThrow(()=>assertScenarioClean(journal,run));
      assert.equal(await count('profiles'),4); assert.equal(await count('messages'),0);
    });
    const journal = await create();
    const rejectCleanup = async (sql,params,undo,undoParams) => {
      await db.query(sql,params);
      const before = await count('groups');
      await assert.rejects(cleanupScenario({journal,run,save,executeSql}),/Outside actor|Unknown dependent|Unjournaled/);
      assert.equal(await count('groups'),before,'preflight failure must leave every root untouched');
      assert.equal(JSON.parse(await readFile(path,'utf8')).state,'failed');
      assert.throws(()=>assertScenarioClean(journal,run),/recovery/);
      await db.query(undo,undoParams);
    };
    await rejectCleanup('update public.group_members set user_id=$1 where group_id=$2 and user_id=$3',[outsider,group,ids[2]],'update public.group_members set user_id=$1 where group_id=$2 and user_id=$3',[ids[2],group,outsider]);
    await rejectCleanup('update public.conversation_members set user_id=$1 where conversation_id=$2 and user_id=$3',[outsider,chat,ids[2]],'update public.conversation_members set user_id=$1 where conversation_id=$2 and user_id=$3',[ids[2],chat,outsider]);
    await rejectCleanup('update public.group_invites set invitee_id=$1 where group_id=$2',[outsider,group],'update public.group_invites set invitee_id=$1 where group_id=$2',[ids[1],group]);
    await db.exec('create table public.unreviewed_dependency(group_id uuid references public.groups on delete cascade);');
    await rejectCleanup('insert into public.unreviewed_dependency values($1)',[group],'delete from public.unreviewed_dependency where group_id=$1',[group]);
    const unrecorded = '30000000-0000-4000-8000-000000000003';
    await rejectCleanup('insert into public.conversations(id,group_id) values($1,$2)',[unrecorded,group],'delete from public.conversations where id=$1',[unrecorded]);
    await rejectCleanup('insert into public.groups(id,admin_id) values($1,$2)',[unrecorded,ids[0]],'delete from public.groups where id=$1',[unrecorded]);
    // Simulate a lost response after the DB committed. The durable failed journal
    // recovers idempotently without touching retained identities or baseline data.
    await assert.rejects(cleanupScenario({journal,run,save,executeSql:async sql=>{await executeSql(sql);throw Error('lost cleanup response');}}),/lost cleanup response/);
    assert.equal(await count('groups'),1); assert.equal(journal.state,'failed');
    await cleanupScenario({journal,run,save,executeSql});
    assert.equal(journal.state,'clean'); assert.equal(await count('profiles'),4);
    const bad = structuredClone(journal);bad.media=[{owner_id:ids[0],bucket:'profile-photos',path:`${ids[0]}/retained-portrait.png`}];
    assert.throws(()=>validateScenario(bad,run),/run-owned/);
    journal.media=[1,2].map(n=>({owner_id:ids[0],bucket:'apartment-photos',path:`${ids[0]}/${journal.run_id}/${n}.png`}));
    const objects=new Set(journal.media.map(item=>item.path));
    const removed=[];
    await assert.rejects(cleanupScenario({journal,run,save,executeSql,removeMedia:async item=>{
      if(removed.length===1)throw Error('Storage interruption');
      removed.push(item.path);objects.delete(item.path);
    }}),/Storage interruption/);
    assert.equal(JSON.parse(await readFile(path,'utf8')).state,'failed');
    assert.equal(objects.size,1);
    await cleanupScenario({journal,run,save,executeSql,removeMedia:async item=>{removed.push(item.path);objects.delete(item.path);}});
    assert.equal(objects.size,0);assert.equal(journal.state,'clean');
    assert.ok(removed.every(path=>path.startsWith(`${ids[0]}/${journal.run_id}/`)));
    assert.equal(await count('profiles'),4);
  } finally {await db.close();await clean(dir);}
});
