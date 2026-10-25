// CLI contract test uses a localhost fake Auth/Data service; never a hosted project.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const web=fileURLToPath(new URL('../',import.meta.url));
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
    const env={...process.env};for(const key of ['QA_FIXTURE_COUNT','QA_FIXTURE_PREFIX','QA_FIXTURE_DIRECTORY','QA_FIXTURE_MANIFEST'])delete env[key];
    const child=spawn(process.execPath,[join(scripts,'qa-fixtures.mjs'),...args],{cwd:folder,env,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
    child.once('error',reject);child.once('exit',code=>resolve({code,output}));
  });
  try {
    for(const name of ['qa-fixtures.mjs','qa-pool.mjs'])await copyFile(join(web,'scripts',name),join(scripts,name));
    await writeFile(join(folder,'.env.local'),`NEXT_PUBLIC_SUPABASE_URL=${target}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-only\n`);
    const prepared=await invoke(['prepare','--reusable','--actors=owner,requester,outsider']);assert.equal(prepared.code,0,prepared.output);
    const manifest=await readFile(join(folder,'.env.qa.local'),'utf8');rows=JSON.parse(manifest);
    assert.equal(rows.length,3);assert.equal(requests.length,0);
    for(let i=0;i<2;i++){const result=await invoke(['ensure']);assert.equal(result.code,0,`${result.output}\nRequests: ${JSON.stringify(requests)}`);}
    const childCode="const fs=require('fs');if(process.env.QA_FIXTURE_COUNT!=='3')process.exit(3);fs.writeFileSync('scenario-ran','ok');";
    const run=await invoke(['run','--',process.execPath,'-e',childCode]);assert.equal(run.code,0,run.output);
    assert.equal(await readFile(join(folder,'scenario-ran'),'utf8'),'ok');
    assert.equal(await readFile(join(folder,'.env.qa.local'),'utf8'),manifest);
    assert.equal((await invoke(['prepare','--reusable','--actors=owner,requester,outsider'])).code,1);
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
