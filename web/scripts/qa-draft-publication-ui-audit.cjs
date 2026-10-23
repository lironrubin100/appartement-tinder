const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),{createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const manifest=JSON.parse(fs.readFileSync('.qa/task232/manifest.json','utf8'));assert.equal(manifest.target,'https://npbduvjnqnbydolmdpsc.supabase.co');
const sessions=[],actors=new Map(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function bytes(api,bucket,p){const r=await api.storage.from(bucket).download(p,{cacheNonce:randomUUID()},{cache:'no-store'});assert.equal(r.error,null,'Exact image unavailable');return Buffer.from(await r.data.arrayBuffer());}
(async()=>{try{
 for(const name of ['sl01-lister','sl01-card']){const u=JSON.parse(fs.readFileSync(`.env.qa-${name}.local`))[0],api=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const a=await api.auth.signInWithPassword({email:u.email,password:u.password});assert.equal(a.error,null);sessions.push(api);actors.set(a.data.user.id,api);}
 let privateImages=0,publicImages=0,publicListings=0;const audit=[];
 for(const entry of manifest.entries){assert(entry.id&&entry.owner&&entry.key);const api=actors.get(entry.owner);assert(api);const loaded=await api.from('listing_drafts').select('*').eq('id',entry.id).eq('owner_id',entry.owner).single();assert.equal(loaded.error,null);const d=loaded.data;
 const listed=await api.storage.from('listing-draft-media').list(`${entry.owner}/${entry.id}`,{limit:20});assert.equal(listed.error,null);assert.equal(listed.data.length,d.photos.length);const digests=[];
 for(const ref of d.photos){assert.equal(ref.kind,'draft');digests.push(hash(await bytes(api,'listing-draft-media',ref.objectPath)));privateImages++;}
 const pub=await api.from('apartments').select('id,title,photos,status').eq('id',d.publication_request_id).eq('lister_id',entry.owner);assert.equal(pub.error,null);assert(pub.data.length<=1);
 if(pub.data.length){const listing=pub.data[0];assert.equal(d.state,'completed');assert.equal(listing.title,d.fields.title.trim());assert.equal(listing.photos.length,d.photos.length);for(let i=0;i<listing.photos.length;i++){assert.equal(hash(await bytes(api,'apartment-photos',`${listing.id}/${i+1}.jpg`)),digests[i]);publicImages++;}publicListings++;}
 const oldStage=await api.storage.from('apartment-photos').list(entry.key,{limit:20});assert.equal(oldStage.error,null);
 audit.push({id:d.id,owner:entry.owner,purpose:entry.purpose,revision:d.revision,state:d.state,frozen:Boolean(d.publication_started_at),originalKey:entry.key,currentKey:d.publication_request_id,privateImages:digests.length,publicListing:pub.data[0]?.id??null,originalStagedObjects:oldStage.data.map(o=>o.name),privateDigests:digests});
 }
 const result={at:new Date().toISOString(),target:manifest.target,privateDrafts:audit.length,privateImages,publicListings,publicImages,retained:true,audit};fs.writeFileSync('.qa/task232/audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify({privateDrafts:audit.length,privateImages,publicListings,publicImages,retained:true}));
}finally{for(const api of sessions)await api.auth.signOut({scope:'local'});}})().catch(e=>{console.error(e.message);process.exitCode=1;});
