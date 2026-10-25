// Local fixture preparation only. Database SQL must be applied through an authorized connector.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { spawn, execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { validatePool, validateBaseline, withPoolLease, REQUIRED_REUSABLE_QA_ROLES, setupPoolActors } from './qa-pool.mjs';

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
async function fixtures(count = fixtureCount, prefix = fixturePrefix) {
  if (!(await exists(fixtureManifest))) throw new Error(`No QA fixture manifest. Prepare ${fixtureCount} isolated identities and apply its authorized provisioning SQL before retrying.`);
  if (arguments.length === 0 && await exists(artifact('run.json'))) {
    const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
    if (run.purpose === 'reusable-qa') { count = run.ids?.length; prefix = run.prefix; }
  }
  const rows = JSON.parse(await readFile(at(fixtureManifest), 'utf8'));
  if (rows.length !== count || rows.some(r => !/^[0-9a-f-]{36}$/.test(r.id) || r.email !== `${prefix}-${r.id}@example.invalid` || !r.password))
    throw new Error(`Expected exactly ${count} generated QA identities; refusing this manifest.`);
  if (new Set(rows.map(r => r.id)).size !== count) throw new Error('Duplicate fixture identity.');
  return rows;
}

async function reusablePool() {
  if (!(await exists(fixtureManifest)) || !(await exists(artifact('run.json')))) throw new Error('No existing reusable QA pool. Prepare a dedicated pool once with prepare --reusable --actors=owner,requester,outsider; never replace retained demos.');
  const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
  const config = await settings();
  const rows = await fixtures(run.ids?.length, run.prefix);
  const baseline = validateBaseline(run);
  validatePool(rows, run, config.url);
  return { run, rows, config, baseline };
}

async function checkAccounts(rows, config, requireReady = false) {
  for (const row of rows) {
    const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const result = await client.auth.signInWithPassword({ email: row.email, password: row.password });
      if (result.error || result.data.user?.id !== row.id) throw new Error(`QA sign-in failed (${result.error?.name ?? 'identity mismatch'}). Preserve the existing manifest and diagnose; no new accounts were generated.`);
      if (requireReady) {
        const profile = await client.from('profiles').select('id,onboarded,mode').eq('id', row.id).single();
        if (profile.error || profile.data?.id !== row.id || !profile.data.onboarded) throw new Error('Reusable QA actor is not ready. Complete its approved role explicitly; no profile reset or provisioning was performed.');
      }
    } finally { await client.auth.signOut({ scope: 'local' }).catch(() => {}); }
  }
}

async function guardPoolDisposal() {
  if (await exists(artifact('run.json'))) {
    const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
    if (run.purpose === 'reusable-qa' && !process.argv.includes('--discard-reusable-pool')) throw new Error('Reusable QA pool is retained. Disposal additionally requires --discard-reusable-pool and explicit owner intent for these exact IDs.');
  }
}
function cleanupGuard(rows) {
  const ids = rows.map(r => quote(r.id)).join(',');
  const scope = `(${ids})`;
  return `do $$ begin
 if exists(select 1 from auth.users where id in ${scope} and email <> '${fixturePrefix}-' || id::text || '@example.invalid') then raise exception 'QA identity mismatch'; end if;
 if exists(select 1 from public.conversation_members a join public.conversation_members b using(conversation_id) where a.user_id in ${scope} and b.user_id not in ${scope}) then raise exception 'Non-QA conversation participant: inspect before cleanup'; end if;
 if exists(select 1 from public.groups g join public.group_members m on m.group_id=g.id where g.admin_id in ${scope} and m.user_id not in ${scope}) then raise exception 'Non-QA group member: inspect before cleanup'; end if;
 if exists(select 1 from public.group_members a join public.groups g on g.id=a.group_id where a.user_id in ${scope} and g.admin_id not in ${scope}) then raise exception 'Non-QA group administrator: inspect before cleanup'; end if;
end $$;`;
}
function prepareCleanupSql(rows, url) {
  const scope = `(${rows.map(r => quote(r.id)).join(',')})`;
  return `-- Explicit disposal stage ONLY; never apply to retained owner demos. Target: ${url}.
-- Review this run's exact IDs and existing external-peer guard before execution.
-- Does not remove Storage metadata or objects; ordinary owner API cleanup follows.
begin;
${cleanupGuard(rows)}
-- Serialize with ordinary profile completion/edit/conversion before changing capability.
select id from public.profiles where id in ${scope} order by id for update;
update public.profiles p set onboarded=false
where p.id in ${scope}
and exists(select 1 from auth.users u where u.id=p.id and u.email='${fixturePrefix}-' || u.id::text || '@example.invalid');
commit;
`;
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

async function main() {
if (command === 'prepare') {
  if (await exists(fixtureManifest)) throw new Error('An existing QA run needs cleanup; refusing to overwrite credentials.');
  const { url } = await settings();
  const reusable = process.argv.includes('--reusable');
  const actorArgument = process.argv.find(value => value.startsWith('--actors='));
  const actors = actorArgument?.slice('--actors='.length).split(',');
  if (actorArgument && (!reusable || JSON.stringify(actors) !== JSON.stringify(REQUIRED_REUSABLE_QA_ROLES))) throw new Error('A reusable pool must use exactly owner,accepted_requester,pending_requester; no broad replacement cohort is allowed.');
  if (reusable && !actors) throw new Error('Name the required reusable actors with --actors; no automatic nine-account cohort.');
  if (actors && process.env.QA_FIXTURE_COUNT && fixtureCount !== actors.length) throw new Error('Actor list conflicts with QA_FIXTURE_COUNT.');
  const count = actors?.length ?? fixtureCount;
  const rows = Array.from({ length: count }, () => {
    const id = randomUUID(); return { id, email: `${fixturePrefix}-${id}@example.invalid`, password: `${randomUUID()}Aa1!` };
  });
  await mkdir(at(fixtureDirectory), { recursive: true });
  const ids = rows.map(r => quote(r.id)).join(',');
  const scope = `(${ids})`;
  const guard = cleanupGuard(rows);
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
  const run = { created: new Date().toISOString(), target: url, ids: rows.map(r => r.id), ...(reusable ? {version:1,purpose:'reusable-qa',prefix:fixturePrefix,actors:Object.fromEntries(actors.map((name,i)=>[name,rows[i].id])),baseline:{version:1,target:url,state:'pending-live-validation',actors:{}}} : {}) };
  for (const [name, body] of Object.entries({ 'provision.sql': provision, 'prepare-cleanup.sql': prepareCleanupSql(rows, url), 'cleanup.sql': cleanup, 'verify.sql': verify, 'run.json': JSON.stringify(run, null, 2) }))
    await writeFile(at(artifact(name)), body, { mode: 0o600 });
  console.log(`Prepared ${count} ${reusable ? 'dedicated reusable QA' : 'isolated'} identities for ${url}. SQL is in ${fileURLToPath(at(`${fixtureDirectory}/`))}. No database changes performed.`);
} else if (command === 'setup') {
  const { parseEnv } = await import('./ensure-demo-content.mjs');
  if (!process.argv.includes('--apply')) throw new Error('Card 0.11 setup requires --apply and fresh target/history/ownership checks.');
  const { run, rows, config } = await reusablePool();
  if (fixtureDirectory !== '.qa/room44-pool' || fixtureManifest !== '.qa/room44-pool/accounts.json') throw new Error('Setup only accepts the existing room44 pool.');
  const cwd = fileURLToPath(root);
  const primary = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8' }).split(/\r?\n/)[0];
  if (primary.replaceAll('\\', '/') !== `worktree ${cwd.replaceAll('\\', '/').replace(/\/$/, '').replace(/\/web$/, '')}`) throw new Error('Setup must run in the primary checkout.');
  for (const path of [fixtureManifest, artifact('run.json'), '.qa/demo-recovery/admin.env']) execFileSync('git', ['check-ignore', '--quiet', path], { cwd });
  const adminEnv = parseEnv(await readFile(at('.qa/demo-recovery/admin.env'), 'utf8'));
  if (adminEnv.get('SUPABASE_PROJECT_REF') !== 'npbduvjnqnbydolmdpsc' || !adminEnv.get('SUPABASE_SECRET_KEY')) throw new Error('Missing target-bound local admin settings.');
  const admin = createClient(config.url, adminEnv.get('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  await withPoolLease(join(cwd, '.qa', 'pool-leases'), { target: config.url, ids: run.ids }, async () => {
    const receipt = await setupPoolActors({ rows, run, target: config.url, admin: admin.auth.admin,
      clientFor: () => createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } }),
      portraitBytes: portrait => readFile(new URL(portrait.source.replace(/^web\//, ''), root)),
      saveReceipt: receipt => writeFile(at(artifact('setup-receipt.json')), JSON.stringify(receipt, null, 2), { mode: 0o600 }),
    });
    // Ready means ordinary API baseline validated; browser acceptance remains separate.
    run.baseline.state = 'ready';
    await writeFile(at(artifact('run.json')), JSON.stringify(run, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ setup: 'ordinary-api-verified', actors: Object.keys(receipt.actors), private_denied: receipt.private_denied, browser_acceptance: 'pending' }));
  });
} else if (command === 'ensure' || command === 'run') {
  const childArgs = process.argv.slice(process.argv.indexOf('--') + 1);
  if (command === 'run' && (!process.argv.includes('--') || !childArgs.length)) throw new Error('Usage: qa-fixtures.mjs run -- node <test runner>');
  const { run, rows, config, baseline } = await reusablePool();
  if (baseline.state !== 'ready') throw new Error('Reusable QA baseline is declared locally but not live-validated. Card 0.11 must complete the exact existing actors; no sign-in, account creation, password reset, or hosted write was attempted.');
  const listing = execFileSync('git', ['worktree','list','--porcelain'], { cwd: fileURLToPath(root), encoding:'utf8' });
  const primary = listing.split(/\r?\n/).find(line => line.startsWith('worktree '))?.slice(9);
  if (!primary) throw new Error('Cannot find shared QA lease location; no test started.');
  await withPoolLease(join(primary,'web','.qa','pool-leases'), {target:config.url,ids:run.ids}, async () => {
    await checkAccounts(rows, config, true);
    if (command === 'ensure') console.log(`Validated ${rows.length} existing named QA actors; no account/content creation or reset. Scenario preconditions still belong to its test.`);
    else {
      const code = await new Promise((resolve,reject) => {
        const child = spawn(childArgs[0], childArgs.slice(1), { cwd:fileURLToPath(root), stdio:'inherit', shell:false,
          env:{...process.env,QA_FIXTURE_COUNT:String(rows.length),QA_FIXTURE_PREFIX:run.prefix,QA_FIXTURE_MANIFEST:fixtureManifest,QA_FIXTURE_DIRECTORY:fixtureDirectory} });
        child.once('error',reject);child.once('exit',(code,signal)=>resolve(signal ? 1 : (code ?? 1)));
      });
      process.exitCode = code;
    }
  });
} else if (command === 'prepare-cleanup') {
  if (!process.argv.includes('--discard-fixtures')) throw new Error('Retained demos must remain intact. To generate disposal SQL for an explicitly discarded run, use prepare-cleanup --discard-fixtures. No remote action is automatic.');
  await guardPoolDisposal();
  const rows = await fixtures();
  const { url } = await settings();
  const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
  if (run.target !== url || JSON.stringify(run.ids) !== JSON.stringify(rows.map(row => row.id))) throw new Error('Fixture target/IDs differ from the current run; refusing cleanup preparation.');
  await writeFile(at(artifact('prepare-cleanup.sql')), prepareCleanupSql(rows, url), { mode: 0o600 });
  console.log(`Generated only ${artifact('prepare-cleanup.sql')}. Review and explicitly apply it to the confirmed target only when discarding these exact synthetic fixtures. No remote mutation performed.`);
} else if (command === 'check') {
  const { url, key } = await settings();
  const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
  const rows = await fixtures(run.purpose === 'reusable-qa' ? run.ids?.length : fixtureCount, run.purpose === 'reusable-qa' ? run.prefix : fixturePrefix);
  if (run.purpose === 'reusable-qa') validatePool(rows,run,url);
  if (run.target !== url) throw new Error('Fixture project differs from current environment.');
  await checkAccounts(rows,{url,key});
  console.log(`All ${rows.length} exact QA accounts can sign in. Acceptance will not silently skip.`);
 } else if (command === 'storage') {
  await guardPoolDisposal();
  const rows = await fixtures();
  const { url, key } = await settings();
  const run = JSON.parse(await readFile(at(artifact('run.json')), 'utf8'));
  if (run.target !== url || JSON.stringify(run.ids) !== JSON.stringify(rows.map(row => row.id))) throw new Error('Fixture project/IDs differ from current run.');
  const sessions = [];
  try {
    // Check every owner before removing ANY bucket's objects. In particular,
    // never partially remove listing photos before discovering a later profile guard.
    for (const row of rows) {
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      sessions.push({ row, client });
      const result = await client.auth.signInWithPassword({ email: row.email, password: row.password });
      if (result.error || result.data.user?.id !== row.id) throw new Error('Cannot sign in to preflight this QA owner. Keep manifest for recovery.');
      const profile = await client.from('profiles').select('id,onboarded').eq('id', row.id).single();
      if (profile.error || profile.data?.id !== row.id) throw new Error('Cannot verify exact own profile before cleanup. No Storage removal started.');
      if (profile.data.onboarded) throw new Error(`Completed fixture retained: no Storage removal started. If this run is explicitly being discarded, generate prepare-cleanup --discard-fixtures, review/apply ${artifact('prepare-cleanup.sql')} through the authorized connector, then retry storage. Never apply that SQL to retained demos.`);
    }
    for (const { row, client } of sessions) {
      for (const bucket of ['apartment-photos', 'profile-photos']) {
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
    }
  } finally { for (const { client } of sessions) await client.auth.signOut().catch(() => {}); }
  console.log('Removed only fixture-owned uploads through ordinary owner Storage permissions. Now apply cleanup.sql, then verify.sql.');
} else if (command === 'forget') {
  // The agent must have checked zero counts through the connector before supplying this flag.
  if (!process.argv.includes('--verified-clean')) throw new Error('First verify all five database counts are zero; then use --verified-clean.');
  await guardPoolDisposal();
  await fixtures();
  for (const name of [fixtureManifest, artifact('provision.sql'), artifact('prepare-cleanup.sql'), artifact('cleanup.sql'), artifact('verify.sql'), artifact('run.json')])
    if (await exists(name)) await unlink(at(name));
  console.log('Removed temporary credentials and this run\'s SQL files.');
} else throw new Error('Usage: qa-fixtures.mjs prepare [--reusable --actors=owner,requester,outsider]|ensure|run -- node <test>|check|prepare-cleanup --discard-fixtures|storage|forget --verified-clean');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
