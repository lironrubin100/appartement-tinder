// Ordinary-client Storage acceptance; never uses admin credentials or edits existing demos.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
if (!process.argv.includes('--allow-private-fixtures')) throw Error('Explicit private synthetic fixture intent required');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(s=>/^[A-Z_]+=/.test(s)).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,'npbduvjnqnbydolmdpsc.supabase.co');
const sessions=[];
async function client(fixture) {
  const api=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  if(fixture){const user=JSON.parse(fs.readFileSync(`.env.qa-${fixture}.local`,'utf8'))[0];const r=await api.auth.signInWithPassword({email:user.email,password:user.password});if(r.error)throw Error('Synthetic sign-in failed');sessions.push(api);}
  return api;
}
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const fail=r=>assert(r.error,'Expected denial');
const bucket='listing-draft-media';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH2kAAAAASUVORK5CYII=','base64');
const digest=x=>createHash('sha256').update(x).digest('hex');
(async()=>{
 fs.mkdirSync('.qa/task220',{recursive:true});const file='.qa/task220/manifest.json';
 const record=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{target:env.NEXT_PUBLIC_SUPABASE_URL,keys:[randomUUID(),randomUUID()],ids:[],objects:[randomUUID(),randomUUID()],retained:true,purpose:'Task 2.20 private media acceptance'};
 const persist=()=>fs.writeFileSync(file,JSON.stringify(record,null,2));persist();
 try {
  const owner=await client('sl01-lister'),outsider=await client('sl01-card'),guest=await client();
  const actor=(await owner.auth.getUser()).data.user.id;if(record.ownerId)assert.equal(actor,record.ownerId);record.ownerId=actor;persist();
  for(let i=0;i<2;i++){const d=ok(await owner.rpc('create_listing_draft',{p_import_receipt_id:record.keys[i],p_fields:{title:`Synthetic private media ${i+1}`}}));if(record.ids[i])assert.equal(d.id,record.ids[i]);record.ids[i]=d.id;persist();}
  const paths=record.ids.map((id,i)=>`${actor}/${id}/${record.objects[i]}.png`);record.paths=paths;persist();
  const reload=async(api,id)=>ok(await api.from('listing_drafts').select('*').eq('id',id).single());
  for(const name of paths){const r=await owner.storage.from(bucket).upload(name,image,{contentType:'image/png',upsert:false});if(r.error){const existing=ok(await owner.storage.from(bucket).download(name));assert.equal(digest(Buffer.from(await existing.arrayBuffer())),digest(image));}}
  console.log('PASS exact-ID private uploads and owner reads; retries never replace bytes');
  let d=await reload(owner,record.ids[0]);const photo={kind:'draft',objectPath:paths[0]};
  const results=await Promise.all([owner.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision,p_photos:[photo]}),owner.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision,p_photos:[photo]})]);
  assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error).error.message,'DRAFT_CONFLICT');
  d=await reload(owner,d.id);assert.deepEqual(d.photos,[photo]);
  fail(await owner.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision-1,p_photos:[]}));
  fail(await owner.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision,p_photos:[{kind:'draft',objectPath:paths[1]}]}));
  fail(await owner.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision,p_photos:[{kind:'published',objectPath:paths[0]}]}));
  console.log('PASS revision race, stale preservation and cross-draft/kind association denial');
  for(const api of [outsider,guest]){
   fail(await api.storage.from(bucket).download(paths[0]));fail(await api.storage.from(bucket).createSignedUrl(paths[0],60));
   fail(await api.storage.from(bucket).upload(paths[0],Buffer.from('forbidden'),{contentType:'image/png',upsert:true}));
   await api.storage.from(bucket).remove([paths[0]]);
   fail(await api.rpc('set_listing_draft_photos',{p_draft_id:d.id,p_expected_revision:d.revision,p_photos:[photo]}));
  }
  fail(await owner.storage.from(bucket).upload(paths[0],Buffer.from('replace'),{contentType:'image/png',upsert:true}));
  const removed=ok(await owner.storage.from(bucket).remove([paths[0]]));assert.equal(removed.length,0);
  fail(await owner.storage.from(bucket).upload(`${actor}/${randomUUID()}/${randomUUID()}.png`,image,{contentType:'image/png'}));
  const publicResult=await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${paths[0]}`);assert.equal(publicResult.ok,false);
  console.log('PASS outsider/guest read/sign/replace/delete/associate denied and public URL inaccessible');
  const fresh=await client('sl01-lister');assert.deepEqual((await reload(fresh,d.id)).photos,[photo]);
  const read=ok(await fresh.storage.from(bucket).download(paths[0]));assert.equal(digest(Buffer.from(await read.arrayBuffer())),digest(image));
  const signed=ok(await fresh.storage.from(bucket).createSignedUrl(paths[0],60));const response=await fetch(signed.signedUrl);assert.equal(response.ok,true);assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(image));
  console.log('PASS fresh-session persisted references and authorized short-lived image preview');
  const unused=ok(await owner.storage.from(bucket).remove([paths[1]]));assert.equal(unused.length,1);
  let second=await reload(owner,record.ids[1]);ok(await owner.rpc('begin_listing_draft_publication',{p_draft_id:second.id,p_expected_revision:second.revision,p_payload:{synthetic:true}}));
  try {
   fail(await owner.storage.from(bucket).upload(paths[1],image,{contentType:'image/png'}));
   fail(await owner.rpc('set_listing_draft_photos',{p_draft_id:second.id,p_expected_revision:second.revision,p_photos:[]}));
  } finally {ok(await owner.rpc('cancel_listing_draft_publication',{p_draft_id:second.id,p_expected_revision:second.revision}));}
  assert.deepEqual((await reload(owner,d.id)).photos,[photo]);
  record.verifiedAt=new Date().toISOString();record.groups=5;record.retainedObjects=[paths[0]];persist();
  console.log('PASS frozen draft upload/association denied; exact unused QA upload removed; existing demos untouched');
 } finally {for(const api of sessions)await api.auth.signOut({scope:'local'});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
