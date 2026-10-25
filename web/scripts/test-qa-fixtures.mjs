// CLI contract test uses a localhost fake Auth/Data service; never a hosted project.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

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
