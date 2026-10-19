import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { residentFields, parseResidentFacts, parseResidentPreferences } from '../web/src/lib/contracts/taxonomy.ts';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const { PGlite } = await import(pathToFileURL(require.resolve('@electric-sql/pglite')).href);
const db = new PGlite();
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
process.on('uncaughtException', error => { console.error(error.message, error.detail ?? '', error.where ?? ''); process.exit(1); });
await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`);
await db.exec(await read('supabase/schema.sql'));
await db.exec((await read('supabase/rls.sql')).replace('revoke update (student_email_verified_at) on profiles from authenticated;', ''));
await db.exec('grant usage on schema public,auth,storage to authenticated;grant all on all tables in schema public to authenticated;grant all on storage.objects to authenticated;');
let foundation = await read('supabase/migrations/20261013000100_chat_inbox_foundation.sql');
foundation = foundation.slice(0, foundation.indexOf('-- Postgres Changes')) + 'commit;';
for (const sql of [foundation,...await Promise.all([
'20261014205238_listing_inquiry_conversations.sql','20261013213103_profile_passes_and_like_validation.sql',
'20261015084833_resident_journeys.sql','20261015084841_group_conversations.sql','20261015084850_inquiry_acceptance_guards.sql',
'20261017082317_lister_safe_browsing.sql','20261017101500_convert_resident_to_lister.sql','20261019212059_resident_adult_validation.sql',
].map(file=>read(`supabase/migrations/${file}`)))]) await db.exec(sql);
const ids=Array.from({length:6},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
for(const id of ids) await db.query('insert into auth.users(id) values($1)',[id]);
await db.query("update public.profiles set mode='resident',onboarded=true,name='Retained Original Name' where id=$1",[ids[5]]);
await db.exec(await read('supabase/migrations/20261019214904_canonical_resident_profiles.sql'));
await db.exec(await read('supabase/migrations/20261019215827_allow_incomplete_intake_correction.sql'));
async function as(i){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[i]]);await db.exec('set role authenticated');}
async function rejected(sql,params=[],match){await assert.rejects(()=>db.query(sql,params),match);}
const facts={cleanliness:'tidy_shared',sleep_schedule:'regular',guests:'occasional',smoking:'none'};
const url=id=>`https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/profile-photos/${id}/photo.jpg`;
const args=(extra={})=>({name:'Ada Lovelace',birth:'2000-01-01',phone:'private',bio:'A short introduction',facts,preferences:{},disclosed:['cleanliness'],complete:true,revision:0,key:crypto.randomUUID(),...extra});
async function save(value){const a=args(value);return (await db.query('select public.save_resident_profile($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result',[a.name,a.birth,a.phone,a.bio,a.facts,a.preferences,a.disclosed,a.complete,a.revision,a.key])).rows[0].result;}
await as(0);
await assert.rejects(()=>save(),/incomplete_resident/);
assert.equal((await db.query('select count(*)::int n from public.profile_lifestyle')).rows[0].n,0);
await rejected('insert into public.profile_photos(profile_id,url) values($1,$2)',[ids[0],url(ids[0])],/owned_photo/);
await db.query("insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',$1,$2)",[`${ids[0]}/photo.jpg`,ids[0]]);
await rejected('insert into public.profile_photos(profile_id,url) values($1,$2)',[ids[0],url(ids[0]).replace('npbduvjnqnbydolmdpsc.supabase.co','evil.test')],/owned_photo/);
await db.query('insert into public.profile_photos(profile_id,url) values($1,$2)',[ids[0],url(ids[0])]);
await assert.rejects(()=>save({bio:' '}),/incomplete_resident/);
await assert.rejects(()=>save({bio:'\t\n'}),/incomplete_resident/);
await assert.rejects(()=>save({name:'\t\n'}),/incomplete_resident/);
await assert.rejects(()=>save({facts:{...facts,smoking:null}}),/incomplete_resident/);
await assert.rejects(()=>save({birth:'2010-01-01'}),/incomplete_resident/);
const bounds=(await db.query("select ((current_date-interval '18 years')::date)::text adult,((current_date-interval '18 years')::date+1)::text minor")).rows[0];
await assert.rejects(()=>save({birth:bounds.minor}),/incomplete_resident/);
const draftKey=crypto.randomUUID();const draft=await save({complete:false,facts:{pets:{answered:false}},disclosed:[],key:draftKey});
assert.deepEqual(draft,{revision:1,onboarded:false});
assert.deepEqual(await save({complete:false,facts:{pets:{answered:false}},disclosed:[],key:draftKey}),draft);
await assert.rejects(()=>save({complete:false,facts:{},disclosed:[],key:draftKey}),/request_key/);
await assert.rejects(()=>save(),/revision/);
const completeKey=crypto.randomUUID();assert.deepEqual(await save({revision:1,key:completeKey,birth:bounds.adult}),{revision:2,onboarded:true});
assert.deepEqual(await save({revision:1,key:completeKey,birth:bounds.adult}),{revision:2,onboarded:true});
const own=(await db.query('select * from public.profiles where id=$1',[ids[0]])).rows[0];assert.equal(own.name,'Ada L.');
assert.equal((await db.query('select full_name from public.profile_private where profile_id=$1',[ids[0]])).rows[0].full_name,'Ada Lovelace');
assert.deepEqual(await save({revision:2,complete:false}),{revision:3,onboarded:true});
await rejected('update public.profiles set photo_url=$1 where id=$2',['https://evil.test',ids[0]],/permission/);
await rejected("update public.profiles set name='Full Secret Name' where id=$1",[ids[0]],/permission/);
await rejected('delete from public.profile_photos where profile_id=$1',[ids[0]],/photo_required/);
await rejected("delete from storage.objects where name=$1",[`${ids[0]}/photo.jpg`],/photo_required/);
await rejected('update public.profile_lifestyle set facts=$1 where profile_id=$2',[{},ids[0]],/permission/);
await rejected('update public.profile_private set full_name=$1 where profile_id=$2',['Forged',ids[0]],/permission/);
await db.query("update public.profiles set default_home='map',public_badges='{}' where id=$1",[ids[0]]);
await as(1);
assert.equal((await db.query('select * from public.profile_lifestyle where profile_id=$1',[ids[0]])).rows.length,0);
assert.equal((await db.query('select * from public.profile_lifestyle_private where profile_id=$1',[ids[0]])).rows.length,0);
const publicView=(await db.query('select * from public.profiles_public where id=$1',[ids[0]])).rows[0];
assert.equal(publicView.name,'Ada L.');assert.deepEqual(publicView.lifestyle_facts,{cleanliness:'tidy_shared'});
for(const key of ['gender','gender_dynamic','relationship_status','miluim_reserve_duty'])assert.equal(publicView[key],null);
for(const key of ['full_name','birth_date','preferences','disclosed_fields','phone'])assert.ok(!(key in publicView));
await rejected('insert into public.profile_photos(profile_id,url) values($1,$2)',[ids[1],url(ids[0])],/owned_photo/);
await rejected("select public.save_onboarding('Lister Full Name',false,null,'phone','','','{}',true)",[],/adult_confirmation/);
await db.query("select public.save_onboarding('Lister Full Name',false,null,'phone','','','{\"adult_confirmed\":true}',true)");
await assert.rejects(()=>save(),/lister/);
const adultConfirmed=(await db.query('select adult_confirmed_at from public.profile_private where profile_id=$1',[ids[1]])).rows[0].adult_confirmed_at;
assert.ok(adultConfirmed);
const listerKey=crypto.randomUUID();
const saveLister=(name,phone,agency,revision,key)=>db.query('select public.save_lister_profile($1,$2,$3,$4,$5) result',[name,phone,agency,revision,key]);
for(const [name,phone] of [['\t\n','phone'],['Name','\t\n'],['','phone'],['Name','']])await assert.rejects(()=>saveLister(name,phone,'',0,crypto.randomUUID()),/lister_profile/);
assert.deepEqual((await saveLister('  Grace Hopper  ',' phone ',' Agency ',0,listerKey)).rows[0].result,{revision:1});
assert.deepEqual((await saveLister('  Grace Hopper  ',' phone ',' Agency ',0,listerKey)).rows[0].result,{revision:1});
await assert.rejects(()=>saveLister('Different Name','phone','Agency',0,listerKey),/request_key/);
await assert.rejects(()=>saveLister('Grace Hopper','phone','Agency',0,crypto.randomUUID()),/revision/);
const listerPrivate=(await db.query('select full_name,phone,agency_name,adult_confirmed_at from public.profile_private where profile_id=$1',[ids[1]])).rows[0];
assert.equal(listerPrivate.full_name,'Grace Hopper');assert.equal(listerPrivate.phone,'phone');assert.equal(listerPrivate.agency_name,'Agency');assert.equal(String(listerPrivate.adult_confirmed_at),String(adultConfirmed));
assert.equal((await db.query('select name from public.profiles where id=$1',[ids[1]])).rows[0].name,'Grace H.');
await rejected('update public.profile_private set phone=$1 where profile_id=$2',['\t\n',ids[1]],/lister_phone/);
await rejected('update public.profile_private set adult_confirmed_at=now() where profile_id=$1',[ids[1]],/permission/);
await as(2);
await db.query("select public.save_onboarding('Correctable Intake',false,null,'','','','{}',false)");
assert.equal((await db.query('select mode from public.profiles where id=$1',[ids[2]])).rows[0].mode,'lister');
assert.deepEqual(await save({complete:false,facts:{},preferences:{},disclosed:[],name:'Corrected Resident'}),{revision:1,onboarded:false});
assert.equal((await db.query('select mode from public.profiles where id=$1',[ids[2]])).rows[0].mode,'resident');
await db.query("select public.save_onboarding('Correctable Again',false,null,'','','','{}',false)");
await db.query("select public.save_onboarding('Legacy Corrected Resident',true,'2000-01-01','','','','{}',false)");
assert.equal((await db.query('select mode from public.profiles where id=$1',[ids[2]])).rows[0].mode,'resident');
await assert.rejects(()=>saveLister('Name','phone','',0,crypto.randomUUID()),/lister_required/);
await rejected("select public.save_onboarding('Legacy User',true,'2000-01-01','','','hello','{\"cleanliness\":\"very_clean\",\"sleep_schedule\":\"night_owl\",\"social_guests\":\"rarely\",\"smoking\":\"no\"}',true)",[],/incomplete_resident/);
await db.query("select public.save_onboarding('Legacy User',true,'2000-01-01','','','hello','{\"gender_dynamic\":\"coed_anyone\",\"relationship_status\":\"single\",\"miluim_reserve_duty\":\"active\"}',false)");
assert.deepEqual((await db.query('select facts,disclosed_fields from public.profile_lifestyle')).rows[0],{facts:{},disclosed_fields:[]});
await as(5);assert.equal((await db.query('select onboarded from public.profiles where id=$1',[ids[5]])).rows[0].onboarded,true);
assert.equal((await db.query('select full_name from public.profile_private where profile_id=$1',[ids[5]])).rows[0].full_name,'Retained Original Name');
assert.equal((await db.query('select adult_confirmed_at from public.profile_private where profile_id=$1',[ids[5]])).rows[0].adult_confirmed_at,null);
await assert.rejects(()=>saveLister('Name','phone','',0,crypto.randomUUID()),/lister_required/);
// Canonical trait references can only name consciously disclosed enum/set values.
await as(0);
await save({revision:3,facts:{...facts,music_habits:{answered:true,values:['headphones']}},disclosed:['cleanliness','music_habits']});
await as(3);
await db.query("insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',$1,$2)",[`${ids[3]}/photo.jpg`,ids[3]]);
await db.query('insert into public.profile_photos(profile_id,url) values($1,$2)',[ids[3],url(ids[3])]);
await save();
await rejected("select public.send_introduction($1,null,'',$2)",[ids[0],`${ids[0]}:canonical.smoking:none`],/invalid trait/);
await rejected("select public.send_introduction($1,null,'',$2)",[ids[0],`${ids[0]}:canonical.music_habits:social_music`],/invalid trait/);
await rejected("select public.send_introduction($1,null,'',$2)",[ids[0],`${ids[0]}:canonical.cleanliness:tidy_shared:extra`],/invalid trait/);
await db.query("select public.send_introduction($1,null,'',$2)",[ids[0],`${ids[0]}:canonical.music_habits:headphones`]);
await as(4);
await db.query("insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',$1,$2)",[`${ids[4]}/photo.jpg`,ids[4]]);
await db.query('insert into public.profile_photos(profile_id,url) values($1,$2)',[ids[4],url(ids[4])]);
const convertedResidentKey=crypto.randomUUID();await save({key:convertedResidentKey});
await rejected("select public.send_introduction($1,null,'',$2)",[ids[3],`${ids[0]}:canonical.cleanliness:tidy_shared`],/invalid trait/);
await db.query("select public.send_introduction($1,null,'',$2)",[ids[0],`${ids[0]}:canonical.cleanliness:tidy_shared`]);
// Group member snapshots reuse safe facts; trait must belong to that target.
await db.exec('reset role');
const group=(await db.query("insert into public.groups(admin_id,name) values($1,'Canonical group') returning id",[ids[0]])).rows[0].id;
await db.query('insert into public.group_members(group_id,user_id) values($1,$2),($1,$3)',[group,ids[0],ids[3]]);
await as(4);
const groupProjection=(await db.query('select * from public.discover_groups()')).rows.find(row=>row.id===group);
assert.ok(groupProjection);assert.equal(groupProjection.members.length,2);
assert.deepEqual(groupProjection.members.find(row=>row.id===ids[0]).lifestyle_facts,{cleanliness:'tidy_shared',music_habits:{answered:true,values:['headphones']}});
await rejected("select public.send_introduction(null,$1,'',$2)",[group,`${ids[4]}:canonical.cleanliness:tidy_shared`],/invalid trait/);
await db.query("select public.send_introduction(null,$1,'',$2)",[group,`${ids[0]}:canonical.cleanliness:tidy_shared`]);
await as(0);
await rejected("select public.convert_to_lister('phone',null)",[],/active_group_membership/);
assert.equal((await db.query('select mode from public.profiles where id=$1',[ids[0]])).rows[0].mode,'resident');
// Owner can remove a secondary photo through row-first ordinary cleanup.
await as(0);
await db.query("insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',$1,$2)",[`${ids[0]}/second.jpg`,ids[0]]);
const secondary=(await db.query("insert into public.profile_photos(profile_id,url,display_order) values($1,$2,1) returning id",[ids[0],url(ids[0]).replace('photo.jpg','second.jpg')])).rows[0].id;
await db.query('delete from public.profile_photos where id=$1',[secondary]);
await db.query('delete from storage.objects where name=$1',[`${ids[0]}/second.jpg`]);
// Lister conversion retains private canonical data and prevents return via resident RPC.
await as(4);await rejected('select public.convert_to_lister($1,null)',['\t\n'],/phone required/);await db.query("select public.convert_to_lister('phone',null)");
const retained=(await db.query('select facts,disclosed_fields from public.profile_lifestyle')).rows[0];
await assert.rejects(()=>saveLister('Updated Lister','phone','',1,convertedResidentKey),/request_key/);
assert.deepEqual((await saveLister('Updated Lister','phone','',1,crypto.randomUUID())).rows[0].result,{revision:2});
assert.deepEqual((await db.query('select facts,disclosed_fields from public.profile_lifestyle')).rows[0],retained);
assert.deepEqual((await db.query('select preferences from public.profile_lifestyle_private')).rows[0].preferences,{});
assert.equal((await db.query('select count(*)::int n from public.profile_lifestyle')).rows[0].n,1);
await assert.rejects(()=>save({revision:1}),/lister/);

// Immutable normalizers compared against frontend manifest for every option/set.
await db.exec('reset role');
let parity=0;
for(const [key,field] of Object.entries(residentFields)) {
 if(field.options)for(const option of Object.keys(field.options)){
  const input={[key]:field.kind==='set'?{answered:true,values:[option]}:option};
  assert.deepEqual((await db.query('select public.normalize_resident_facts($1) facts',[input])).rows[0].facts,parseResidentFacts(input));parity++;
 }
}
for(const input of [{pets:{answered:false}},{pets:{answered:true,values:[]}},{music_habits:{answered:true,values:['social_music','headphones']}},{kitchen_other:' x ',kitchen_rules:'other'}])assert.deepEqual((await db.query('select public.normalize_resident_facts($1) facts',[input])).rows[0].facts,parseResidentFacts(input));
for(const input of [{gender:'other'},{pets:[]},{pets:{answered:true,values:['dog','dog']}},{pets:{answered:false,values:['cat']}},{kitchen_other:'orphan'}])await rejected('select public.normalize_resident_facts($1)',[input]);
for(const input of [{accepted_cleanliness:['relaxed','very_tidy'],preferred_cleanliness:['very_tidy']},{pet_preference_answered:true,accepted_pet_types:[]},{quiet_hours_from:'22:00',quiet_hours_to:'06:00'}])assert.deepEqual((await db.query('select public.normalize_resident_preferences($1) prefs',[input])).rows[0].prefs,parseResidentPreferences(input));
for(const input of [{preferred_smoking:['none']},{accepted_gender:['any']},{pet_preference_answered:true},{accepted_pet_types:[]},{strict_no_pets:'true'},{quiet_hours_from:'24:00',quiet_hours_to:'06:00'}])await rejected('select public.normalize_resident_preferences($1)',[input]);
console.log(`Canonical profile SQL passed: ${parity} option parity checks; draft/completion/age/photo ownership/privacy/revision/idempotency/legacy/lister/group/reference guards.`);
await db.close();
