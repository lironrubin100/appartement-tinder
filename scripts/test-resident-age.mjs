import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
process.on('uncaughtException', error => { console.error(error.message, error.detail ?? '', error.where ?? ''); process.exit(1); });

// Disposable local SQL only; no hosted target, credentials or fixture mutation.
const require = createRequire(new URL('../web/package.json', import.meta.url));
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE || require.resolve('@electric-sql/pglite')).href);
const db = new PGlite();
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid primary key,bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);
await db.exec(await read('supabase/schema.sql'));
await db.exec((await read('supabase/rls.sql')).replace('revoke update (student_email_verified_at) on profiles from authenticated;', ''));
await db.exec('grant usage on schema public,auth to authenticated; grant all on all tables in schema public to authenticated;');
let foundation = await read('supabase/migrations/20261013000100_chat_inbox_foundation.sql');
foundation = foundation.slice(0, foundation.indexOf('-- Postgres Changes')) + 'commit;';
await db.exec(foundation);
for (const file of [
  '20261014205238_listing_inquiry_conversations.sql',
  '20261013213103_profile_passes_and_like_validation.sql',
  '20261015084833_resident_journeys.sql',
  '20261019212059_resident_adult_validation.sql',
]) await db.exec(await read(`supabase/migrations/${file}`));
const resident = '00000000-0000-4000-8000-000000000001';
const lister = '00000000-0000-4000-8000-000000000002';
await db.query('insert into auth.users(id) values($1),($2)', [resident, lister]);
async function as(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
await as(resident);
const save = (birth, complete, name = 'Age test') => db.query(`select public.save_onboarding($1,true,(${birth})::date,'','','bio','{}',$2)`, [name, complete]);
await save("current_date - interval '17 years'", false, 'Preserved draft');
await assert.rejects(() => save("current_date - interval '18 years' + interval '1 day'", true), /at least 18/);
await assert.rejects(() => save('null', true), /incomplete profile/);
const draft = (await db.query('select name,onboarded from public.profiles where id=$1', [resident])).rows[0];
assert.deepEqual(draft, { name: 'Preserved draft', onboarded: false });
await save("current_date - interval '18 years'", true);
assert.equal((await db.query('select onboarded from public.profiles where id=$1', [resident])).rows[0].onboarded, true);
await assert.rejects(() => db.query("update public.profile_private set birth_date=current_date - interval '17 years' where profile_id=$1", [resident]), /at least 18/);
await assert.rejects(() => db.query('update public.profile_private set birth_date=null where profile_id=$1', [resident]), /at least 18/);
await db.query("update public.profile_private set birth_date=current_date - interval '19 years',phone='corrected' where profile_id=$1", [resident]);
await as(lister);
await db.query("select public.save_onboarding('Lister',false,null,'private-phone','','','{}',true)");
await db.query("update public.profile_private set birth_date=null,phone='still editable' where profile_id=$1", [lister]);
assert.equal((await db.query('select mode,onboarded from public.profiles where id=$1', [lister])).rows[0].mode, 'lister');
await db.close();
console.log('Resident age SQL passed: draft/rejection rollback, 18th birthday, direct DOB bypass, adult correction and lister compatibility.');
