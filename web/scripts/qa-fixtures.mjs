// Local fixture preparation only. Database SQL must be applied through an authorized connector.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = new URL('../', import.meta.url);
const at = name => new URL(name, root);
const exists = async name => { try { await access(at(name)); return true; } catch { return false; } };
const command = process.argv[2];
const quote = value => `'${value.replaceAll("'", "''")}'`;
const fixtureCount = Number(process.env.QA_FIXTURE_COUNT ?? '9');
const fixturePrefix = process.env.QA_FIXTURE_PREFIX ?? 'qa-resident';
const fixtureManifest = process.env.QA_FIXTURE_MANIFEST ?? '.env.qa.local';
const fixtureDirectory = process.env.QA_FIXTURE_DIRECTORY ?? '.qa';
const artifact = name => `${fixtureDirectory}/${name}`;
if (!Number.isInteger(fixtureCount) || fixtureCount < 1 || fixtureCount > 9 || !/^[a-z0-9-]+$/.test(fixturePrefix))
  throw new Error('Invalid isolated QA fixture configuration.');
async function fixtures() {
  if (!(await exists(fixtureManifest))) throw new Error(`No QA fixture manifest. Prepare ${fixtureCount} isolated identities and apply its authorized provisioning SQL before retrying.`);
  const rows = JSON.parse(await readFile(at(fixtureManifest), 'utf8'));
  if (rows.length !== fixtureCount || rows.some(r => !/^[0-9a-f-]{36}$/.test(r.id) || r.email !== `${fixturePrefix}-${r.id}@example.invalid` || !r.password))
    throw new Error(`Expected exactly ${fixtureCount} generated QA identities; refusing this manifest.`);
  if (new Set(rows.map(r => r.id)).size !== fixtureCount) throw new Error('Duplicate fixture identity.');
  return rows;
}
async function settings() {
  const text = await readFile(at('.env.local'), 'utf8');
  const env = Object.fromEntries(text.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const n = l.indexOf('='); return [l.slice(0, n), l.slice(n + 1).replace(/^['"]|['"]$/g, '')];
  }));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Missing public Supabase settings in web/.env.local.');
  return { url, key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

if (command === 'prepare') {
  if (await exists(fixtureManifest)) throw new Error('An existing QA run needs cleanup; refusing to overwrite credentials.');
  const { url } = await settings();
  const rows = Array.from({ length: fixtureCount }, () => {
    const id = randomUUID(); return { id, email: `${fixturePrefix}-${id}@example.invalid`, password: `${randomUUID()}Aa1!` };
  });
  await mkdir(at(fixtureDirectory), { recursive: true });
  const ids = rows.map(r => quote(r.id)).join(',');
  const scope = `(${ids})`;
  const guard = `do $$ begin
 if exists(select 1 from auth.users where id in ${scope} and email <> '${fixturePrefix}-' || id::text || '@example.invalid') then raise exception 'QA identity mismatch'; end if;
 if exists(select 1 from public.conversation_members a join public.conversation_members b using(conversation_id) where a.user_id in ${scope} and b.user_id not in ${scope}) then raise exception 'Non-QA conversation participant: inspect before cleanup'; end if;
 if exists(select 1 from public.groups g join public.group_members m on m.group_id=g.id where g.admin_id in ${scope} and m.user_id not in ${scope}) then raise exception 'Non-QA group member: inspect before cleanup'; end if;
end $$;`;
  const provision = `-- Target: ${url}; verify project and authorization before applying. Contains temporary secrets.\nbegin;\n` + rows.map(r => `insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,phone_change,phone_change_token,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values(${quote(r.id)},'00000000-0000-0000-0000-000000000000','authenticated','authenticated',${quote(r.email)},extensions.crypt(${quote(r.password)},extensions.gen_salt('bf')),now(),'','','','','','','','{"provider":"email","providers":["email"]}','{"full_name":"QA resident journey"}',now(),now());
insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at) values(gen_random_uuid(),${quote(r.id)},${quote(r.id)},jsonb_build_object('sub',${quote(r.id)},'email',${quote(r.email)},'email_verified',true),'email',now(),now());`).join('\n') + '\ncommit;\n';
  const cleanup = `-- Run owner Storage cleanup first; this transaction refuses leftover objects.\nbegin;\n${guard}
do $$ begin if exists(select 1 from storage.objects where split_part(name,'/',1) in ${scope}) then raise exception 'Remove QA Storage objects through Storage API first'; end if; end $$;
delete from public.conversations c where exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id in ${scope});
delete from public.groups where admin_id in ${scope};
delete from public.apartments where lister_id in ${scope};
delete from auth.sessions where user_id in ${scope};
  delete from auth.users where id in ${scope} and email='${fixturePrefix}-' || id::text || '@example.invalid';
commit;\n`;
  const verify = `select
 (select count(*) from auth.users where id in ${scope}) as users_remaining,
 (select count(*) from public.profiles where id in ${scope}) as profiles_remaining,
 (select count(*) from public.apartments where lister_id in ${scope}) as listings_remaining,
 (select count(*) from public.groups where admin_id in ${scope}) as groups_remaining,
 (select count(*) from storage.objects where split_part(name,'/',1) in ${scope}) as storage_objects_remaining;\n`;
  await writeFile(at(fixtureManifest), JSON.stringify(rows, null, 2), { mode: 0o600, flag: 'wx' });
  for (const [name, body] of Object.entries({ 'provision.sql': provision, 'cleanup.sql': cleanup, 'verify.sql': verify, 'run.json': JSON.stringify({ created: new Date().toISOString(), target: url, ids: rows.map(r => r.id) }, null, 2) }))
    await writeFile(at(artifact(name)), body, { mode: 0o600 });
  console.log(`Prepared ${fixtureCount} isolated identities for ${url}. SQL is in ${fileURLToPath(at(`${fixtureDirectory}/`))}. No database changes performed.`);
} else if (command === 'check') {
  const rows = await fixtures();
  const { url, key } = await settings();
  const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
  if (run.target !== url) throw new Error('Fixture project differs from current environment.');
  for (const row of rows) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword(row);
    if (result.error || result.data.user?.id !== row.id) throw new Error('QA sign-in failed; provision this run through the authorized database connector first.');
    await client.auth.signOut();
  }
  console.log(`All ${fixtureCount} isolated QA accounts can sign in. Acceptance will not silently skip.`);
} else if (command === 'storage') {
  const rows = await fixtures();
  const { url, key } = await settings();
  const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
  if (run.target !== url) throw new Error('Fixture project differs from current environment.');
  for (const row of rows) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword(row);
    if (result.error || result.data.user?.id !== row.id) throw new Error('Cannot sign in to clean this QA owner. Keep manifest for recovery.');
    try {
      for (const bucket of ['apartment-photos', 'profile-photos']) {
        // Current upload contract is <owner UUID>/<filename>; repeatedly take first page after removal.
        for (let page = 0; page < 100; page++) {
          const list = await client.storage.from(bucket).list(row.id, { limit: 100 });
          if (list.error) throw list.error;
          if (!list.data.length) break;
          if (list.data.some(object => !object.id)) throw new Error('Unexpected nested folder: inspect owner prefix before cleanup.');
          const removed = await client.storage.from(bucket).remove(list.data.map(object => `${row.id}/${object.name}`));
          if (removed.error) throw removed.error;
          if (page === 99) throw new Error('Storage cleanup exceeded its bound; keep manifest.');
        }
      }
    } finally { await client.auth.signOut(); }
  }
  console.log('Removed only fixture-owned uploads through ordinary owner Storage permissions. Now apply cleanup.sql, then verify.sql.');
} else if (command === 'forget') {
  // The agent must have checked zero counts through the connector before supplying this flag.
  if (!process.argv.includes('--verified-clean')) throw new Error('First verify all five database counts are zero; then use --verified-clean.');
  await fixtures();
  for (const name of [fixtureManifest, artifact('provision.sql'), artifact('cleanup.sql'), artifact('verify.sql'), artifact('run.json')])
    if (await exists(name)) await unlink(at(name));
  console.log('Removed temporary credentials and this run\'s SQL files.');
} else throw new Error('Usage: node scripts/qa-fixtures.mjs prepare|check|storage|forget --verified-clean');
