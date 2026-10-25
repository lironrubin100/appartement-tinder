import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { validatePool, withPoolLease } from './qa-pool.mjs';

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
