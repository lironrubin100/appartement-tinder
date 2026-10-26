// CLI contract test uses a localhost fake Auth/Data service; never a hosted project.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setupPoolActors } from './qa-pool.mjs';
import { classifyLegacyImage, legacyInventorySql, planLegacyRetirement, legacyRetirementSql } from './qa-fixtures.mjs';
import { PGlite } from '@electric-sql/pglite';

test('retirement uses decoded image evidence and preserves unknown, retained and unclassified records',()=>{
  assert.equal(classifyLegacyImage({width:1,height:1,bytes:1024,channels:[{stdev:5}]}).state,'invalid');
  assert.equal(classifyLegacyImage({width:1024,height:1536,bytes:4096,channels:[{stdev:0}]}).reason,'flat-color-placeholder');
  assert.equal(classifyLegacyImage({width:1024,height:1536,bytes:4096,channels:[{stdev:25}]}).state,'valid');
  assert.throws(()=>classifyLegacyImage({width:1024,height:1536,bytes:4096}),/evidence/);
  const id=n=>`90000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const profile=(n,extra={})=>({id:id(n),mode:'resident',onboarded:true,ready:true,photo_url:`https://example.invalid/${n}`,protected:false,fingerprint:'a'.repeat(64),...extra});
  const inventory={target:'npbduvjnqnbydolmdpsc',synthetic_count:7,unclassified_accounts:1,profiles:[profile(1,{ready:false}),profile(2),profile(3),profile(4,{protected:true,ready:false}),profile(5,{ready:false}),profile(6,{mode:'lister',ready:false}),profile(7,{id:'de100001-0000-4000-8000-000000000001',ready:false})],apartments:[{id:id(8),owner_id:id(9),source:'user',status:'active',ready:false,photos:[],protected:false,fingerprint:'b'.repeat(64)}]};
  const plan=planLegacyRetirement(inventory,{preservedIds:[id(5)],images:{'https://example.invalid/2':{state:'invalid'},'https://example.invalid/3':{state:'unknown'}}});
  assert.deepEqual(plan.actions.map(a=>a.id),[id(1),id(2)]);
  assert.ok(plan.exclusions.some(a=>a.id===id(3)&&a.reason==='image-unverified'));
  assert.ok(plan.exclusions.some(a=>a.id===id(8)&&a.reason==='unclassified-owner'));
  assert.throws(()=>legacyRetirementSql({...plan,actions:[{...plan.actions[0],after:true}]}),/differs/);
  assert.match(legacyRetirementSql(plan),/statement_timeout='5s'/);
  assert.doesNotMatch(legacyRetirementSql(plan),/delete from|truncate|drop table/i);
});

test('isolated retirement changes only visibility, rolls back, rejects drift/relationships and repeats without changes',async()=>{
  const db=new PGlite();
  const target='npbduvjnqnbydolmdpsc';
  const resident='90000000-0000-4000-8000-000000000001';
  const other='90000000-0000-4000-8000-000000000002';
  const listing='90000000-0000-4000-8000-000000000003';
  const chat='90000000-0000-4000-8000-000000000004';
  const execute=async sql=>{try{await db.exec(sql);}catch(error){await db.exec('rollback');throw error;}};
  const inventory=async()=> (await db.query(legacyInventorySql(target))).rows[0].inventory;
  try{
    await db.exec('create schema auth; create table auth.users(id uuid primary key,email text);');
    await db.exec(await readFile(new URL('../../supabase/schema.sql',import.meta.url),'utf8'));
    // Canonical columns used by this visibility guard; no hosted migrations run here.
    await db.exec("alter table public.profiles drop constraint profiles_mode_check; alter table public.profile_private add column full_name text; create table public.profile_lifestyle(profile_id uuid primary key references public.profiles,facts jsonb);");
    await db.query("insert into auth.users values($1,'qa-retirement@example.invalid'),($2,'owner@example.invalid')",[resident,other]);
    for(const id of [resident,other])await db.query("insert into public.profiles(id,name,mode,onboarded,bio,photo_url) values($1,'Synthetic baseline','resident',true,'Retained body','https://example.invalid/photo.png')",[id]);
    await db.query("insert into public.apartments(id,lister_id,source,title,lat,lng,price,bedrooms,description) values($1,$2,'user','Incomplete synthetic listing',0,0,1000,2,'Keep every field')",[listing,resident]);
    const before=await inventory();
    const plan=planLegacyRetirement(before);
    assert.equal(plan.actions.length,2);
    assert.equal(before.unclassified_accounts,1);
    assert.equal(before.profiles.length,1,'personal account does not leave the database');
    await execute(legacyRetirementSql(plan));
    assert.equal((await db.query('select onboarded from profiles where id=$1',[resident])).rows[0].onboarded,false);
    assert.equal((await db.query('select status from apartments where id=$1',[listing])).rows[0].status,'paused');
    assert.equal(planLegacyRetirement(await inventory()).actions.length,0,'second dry-run is idempotent');
    await execute(legacyRetirementSql(plan,{rollback:true}));
    assert.deepEqual(await inventory(),before,'full scoped rows including fingerprints restored');
    await db.query("update profiles set bio='Changed since snapshot' where id=$1",[resident]);
    await assert.rejects(execute(legacyRetirementSql(plan)),/drift/);
    assert.equal((await db.query('select status from apartments where id=$1',[listing])).rows[0].status,'active','no partial listing update');
    await db.query("update profiles set bio='Retained body' where id=$1",[resident]);
    await db.query('insert into conversations(id) values($1)',[chat]);
    for(const id of [resident,other])await db.query('insert into conversation_members(conversation_id,user_id) values($1,$2)',[chat,id]);
    await assert.rejects(execute(legacyRetirementSql(plan)),/drift/);
    assert.equal(planLegacyRetirement(await inventory()).actions.length,0,'personal-linked fixture is protected');
    assert.equal(Number((await db.query('select count(*) n from auth.users')).rows[0].n),2);
    assert.equal(Number((await db.query('select count(*) n from conversation_members')).rows[0].n),2);
    await db.query('delete from conversation_members where conversation_id=$1',[chat]);
    await execute(legacyRetirementSql(plan));
    assert.equal(planLegacyRetirement(await inventory()).actions.length,0);
  }finally{await db.close();}
});

test('setup rejects identity collisions and existing credential failures before creating any actor', async () => {
  const target = 'https://npbduvjnqnbydolmdpsc.supabase.co';
  const ids = [1,2,3].map(n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  const rows = ids.map(id => ({ id, email: `qa-pool-${id}@example.invalid`, password: 'local-test-only' }));
  const run = { version:1, purpose:'reusable-qa', prefix:'qa-pool', target, ids, actors:Object.fromEntries(roles.map((role,i)=>[role,ids[i]])) };
  run.baseline = readyBaseline(run);
  const bytes = Buffer.alloc(2048, 1);
  for (const actor of Object.values(run.baseline.actors)) actor.portrait.sha256 = createHash('sha256').update(bytes).digest('hex');
  let writes = 0;
  const options = { rows, run, target, portraitBytes:async()=>bytes, saveReceipt:async()=>{writes++;},
    clientFor:()=>({ auth:{signInWithPassword:async()=>({error:{message:'invalid'}}),signOut:async()=>({})} }),
    admin:{listUsers:async()=>({data:{users:[{id:ids[0],email:'unrelated@example.invalid'}]}}),createUser:async()=>{writes++;}} };
  await assert.rejects(setupPoolActors(options), /collision/);
  options.admin.listUsers = async()=>({data:{users:[rows[1]]}});
  await assert.rejects(setupPoolActors(options), /credentials failed/);
  assert.equal(writes, 0, 'missing first actor is not provisioned before later existing credentials are checked');
});

const web=fileURLToPath(new URL('../',import.meta.url));
const roles=['owner','accepted_requester','pending_requester'];
function readyBaseline(run) {
  return {version:1,target:run.target,state:'ready',actors:Object.fromEntries(roles.map((role,index)=>[role,{id_ref:role,profile:{completed:true,mode:'resident',name:`QA ${role}`,birth_date:'1999-01-01',bio:'Fictional reusable QA actor.',facts:{cleanliness:'tidy_shared'},preferences:{strict_non_smoking:true},disclosed_fields:['cleanliness']},portrait:{owner_role:role,source:'web/public/demo-content/portraits/demo-portrait-01.png',sha256:'a'.repeat(64),bytes:2048,width:1024,height:1536,storage_path_template:`{actor_id}/qa-pool-portrait-${index + 1}.png`,provenance:'Tracked fictional portrait asset; upload is reserved for card 0.11.'}}]))};
}
test('reusable CLI prepares three actors once, preflights/runs twice, never recreates or resets them',{timeout:45000},async()=>{
  const base=join(web,'.qa');await mkdir(base,{recursive:true});
  const folder=await mkdtemp(join(base,'fixture-contract-'));
  const scripts=join(folder,'scripts');await mkdir(scripts);
  let rows=[],profilesReady=true;const requests=[],logoutScopes=[];
  const server=createServer(async(req,res)=>{
    requests.push(`${req.method} ${req.url.split('?')[0]}`);
    res.setHeader('content-type','application/json');
    if(req.url.startsWith('/auth/v1/token')) {
      let body='';for await(const chunk of req)body+=chunk;
      const {email,password}=JSON.parse(body);const row=rows.find(r=>r.email===email&&r.password===password);
      if(!row){res.writeHead(400);res.end('{}');return;}
      const payload=Buffer.from(JSON.stringify({sub:row.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
      res.end(JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'local-test',token_type:'bearer',expires_in:3600,user:{id:row.id,email:row.email,aud:'authenticated'}}));
    } else if(req.url.startsWith('/auth/v1/logout')) {logoutScopes.push(new URL(req.url,'http://localhost').searchParams.get('scope'));res.writeHead(204);res.end();}
    else if(req.url.startsWith('/rest/v1/profiles')) {
      const id=new URL(req.url,'http://localhost').searchParams.get('id')?.replace('eq.','');
      res.end(JSON.stringify({id,onboarded:profilesReady,mode:'resident'}));
    } else {res.writeHead(404);res.end('{}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const target=`http://127.0.0.1:${server.address().port}`;
  const invoke=(args)=>new Promise((resolve,reject)=>{
    const env={...process.env,NO_PROXY:'127.0.0.1,localhost'};for(const key of ['QA_FIXTURE_COUNT','QA_FIXTURE_PREFIX','QA_FIXTURE_DIRECTORY','QA_FIXTURE_MANIFEST','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','NODE_USE_ENV_PROXY'])delete env[key];
    const child=spawn(process.execPath,[join(scripts,'qa-fixtures.mjs'),...args],{cwd:folder,env,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
    child.once('error',reject);child.once('exit',code=>resolve({code,output}));
  });
  try {
    for(const name of ['qa-fixtures.mjs','qa-pool.mjs'])await copyFile(join(web,'scripts',name),join(scripts,name));
    await writeFile(join(folder,'.env.local'),`NEXT_PUBLIC_SUPABASE_URL=${target}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-only\n`);
    const prepared=await invoke(['prepare','--reusable','--actors=owner,accepted_requester,pending_requester']);assert.equal(prepared.code,0,prepared.output);
    const manifest=await readFile(join(folder,'.env.qa.local'),'utf8');rows=JSON.parse(manifest);
    const runPath=join(folder,'.qa','run.json');const metadata=JSON.parse(await readFile(runPath,'utf8'));assert.equal((await invoke(['ensure'])).code,1);assert.equal(requests.length,0);
    metadata.baseline=readyBaseline(metadata);await writeFile(runPath,JSON.stringify(metadata));
    assert.equal(rows.length,3);assert.equal(requests.length,0);
    for(let i=0;i<2;i++){const result=await invoke(['ensure']);assert.equal(result.code,0,`${result.output}\nRequests: ${JSON.stringify(requests)}`);}
    const childCode="const fs=require('fs');if(process.env.QA_FIXTURE_COUNT!=='3')process.exit(3);fs.writeFileSync('scenario-ran','ok');";
    const run=await invoke(['run','--',process.execPath,'-e',childCode]);assert.equal(run.code,0,run.output);
    assert.equal(await readFile(join(folder,'scenario-ran'),'utf8'),'ok');
    assert.equal(await readFile(join(folder,'.env.qa.local'),'utf8'),manifest);
    assert.equal((await invoke(['prepare','--reusable','--actors=owner,accepted_requester,pending_requester'])).code,1);
    profilesReady=false;
    const notReady=await invoke(['ensure']);assert.equal(notReady.code,1,notReady.output);assert.match(notReady.output,/not ready/);
    assert.equal((await invoke(['prepare-cleanup','--discard-fixtures'])).code,1);
    const metaPath=join(folder,'.qa','run.json');const meta=JSON.parse(await readFile(metaPath,'utf8'));meta.target='https://wrong.invalid';await writeFile(metaPath,JSON.stringify(meta));
    const before=requests.length;assert.equal((await invoke(['ensure'])).code,1);assert.equal(requests.length,before);
    assert.ok(requests.every(r=>r==='POST /auth/v1/token'||r==='POST /auth/v1/logout'||r==='GET /rest/v1/profiles'));
    assert.ok(logoutScopes.length>0);assert.ok(logoutScopes.every(scope=>scope==='local'));
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    const checked=resolve(folder);assert.equal(dirname(checked),resolve(base));assert.ok(basename(checked).startsWith('fixture-contract-'));
    await rm(checked,{recursive:true,force:true});
  }
});
