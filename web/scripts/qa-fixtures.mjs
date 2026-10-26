// Local fixture preparation only. Database SQL must be applied through an authorized connector.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { spawn, execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { validatePool, validateBaseline, assertScenarioClean, withPoolLease, REQUIRED_REUSABLE_QA_ROLES, setupPoolActors } from './qa-pool.mjs';

const root = new URL('../', import.meta.url);
const at = name => new URL(name, root);
const exists = async name => { try { await access(at(name)); return true; } catch { return false; } };
const command = process.argv[2];
const quote = value => `'${value.replaceAll("'", "''")}'`;

// Retirement changes only existing visibility fields. Identity/history/media are retained.
const retirementUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const retainedDemoIds = [1,2,3,4].map(n => `de100001-0000-4000-8000-${String(n).padStart(12,'0')}`);
const retainedQaIds = ['408a2c76-e4d3-481a-9a69-859ae96d0ff3','eebcda4b-d5c5-4618-82fe-e9fddfe72dcb','1a89df55-b80d-426b-a068-d2527cf07610'];
const knownSeedIds = [1,2,3,4].map(n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
function exactIds(ids) {
  if (!Array.isArray(ids) || ids.some(id => !retirementUuid.test(id)) || new Set(ids).size !== ids.length) throw Error('Invalid exact retirement IDs.');
  return ids;
}
export function classifyLegacyImage({ width, height, bytes, channels }) {
  if (![width,height,bytes].every(n => Number.isFinite(n) && n > 0) || !Array.isArray(channels) || !channels.length || channels.some(c => !Number.isFinite(c.stdev))) throw Error('Missing decoded image evidence.');
  if (width < 64 || height < 64 || bytes < 256) return {state:'invalid',reason:'tiny-placeholder'};
  if (channels.every(c => c.stdev < 0.5)) return {state:'invalid',reason:'flat-color-placeholder'};
  return {state:'valid'};
}
export function legacyInventorySql(target, preservedIds = [], scope) {
  if (!/^[a-z]{20}$/.test(target)) throw Error('Invalid retirement target.');
  const preserved = [...new Set([...retainedDemoIds,...retainedQaIds,...exactIds(preservedIds)])];
  const list = ids => ids.map(quote).join(',');
  const profiles = scope ? exactIds(scope.profiles) : [];
  const apartments = scope ? exactIds(scope.apartments) : [];
  const scopedList = ids => ids.length ? list(ids) : 'null::uuid';
  const profileScope = scope ? `where p.id in(${scopedList(profiles)}) or exists(select 1 from public.apartments owned where owned.id in(${scopedList(apartments)}) and owned.lister_id=p.id)` : '';
  const projectedProfileScope = scope ? `where t.id in(${scopedList(profiles)})` : '';
  const apartmentScope = scope ? `and a.id in(${scopedList(apartments)})` : '';
  return `with synthetic as(select id from auth.users where email ~ '^(qa-|demo-).+@example\\.invalid$'),
preserved as(select id from auth.users where id not in(select id from synthetic) or id in(${list(preserved)})),
test_profiles as(select p.id,p.mode,p.onboarded,p.photo_url,
coalesce(nullif(btrim(p.name),'') is not null and nullif(btrim(p.bio),'') is not null and nullif(btrim(pp.full_name),'') is not null and pp.birth_date <= (current_date-interval '18 years')::date and l.facts ?& array['cleanliness','sleep_schedule','guests','smoking'],false) as ready,
encode(sha256(convert_to((to_jsonb(p)-'onboarded'-'updated_at')::text,'UTF8')),'hex') as fingerprint,
(p.id in(select id from preserved)
or exists(select 1 from public.group_members a join public.group_members b using(group_id) where a.user_id=p.id and b.user_id in(select id from preserved))
or exists(select 1 from public.conversation_members a join public.conversation_members b using(conversation_id) where a.user_id=p.id and b.user_id in(select id from preserved))
or exists(select 1 from public.likes k where (k.from_user=p.id and k.to_user in(select id from preserved)) or (k.to_user=p.id and k.from_user in(select id from preserved)))
or exists(select 1 from public.listing_inquiries i join public.apartments a on a.id=i.apartment_id where (a.lister_id=p.id and i.requester_id in(select id from preserved)) or(i.requester_id=p.id and a.lister_id in(select id from preserved)))) as protected
from public.profiles p join synthetic s on s.id=p.id left join public.profile_private pp on pp.profile_id=p.id left join public.profile_lifestyle l on l.profile_id=p.id ${profileScope})
select jsonb_build_object('target',${quote(target)},'synthetic_count',(select count(*) from synthetic),'unclassified_accounts',(select count(*) from auth.users where id not in(select id from synthetic)),
'profiles',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from test_profiles t ${projectedProfileScope}),
'apartments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'owner_id',a.lister_id,'source',a.source,'status',a.status,'photos',a.photos,
'ready',(nullif(btrim(a.title),'') is not null and nullif(btrim(a.description),'') is not null and a.bedrooms>0 and exists(select 1 from public.apartment_rooms r where r.apartment_id=a.id and r.monthly_price>0 and r.is_available)),
'fingerprint',encode(sha256(convert_to((to_jsonb(a)-'status'-'updated_at'-'revision')::text,'UTF8')),'hex'),
'protected',(a.id in(${list(preserved)}) or coalesce((select protected from test_profiles where id=a.lister_id),false) or exists(select 1 from public.listing_inquiries i where i.apartment_id=a.id and i.requester_id in(select id from preserved)) or exists(select 1 from public.saves s where s.apartment_id=a.id and s.user_id in(select id from preserved)))) order by a.id),'[]'::jsonb)
from public.apartments a where (a.lister_id in(select id from synthetic) or(a.source='seed' and a.lister_id is null and a.id in(${list(knownSeedIds)}))) ${apartmentScope})) as inventory`;
}

export function planLegacyRetirement(inventory, { preservedIds = [], images = {} } = {}) {
  if (!inventory || !/^[a-z]{20}$/.test(inventory.target) || !Array.isArray(inventory.profiles) || !Array.isArray(inventory.apartments)) throw Error('Invalid retirement inventory.');
  const preserved = new Set([...retainedDemoIds,...retainedQaIds,...exactIds(preservedIds)]);
  const profiles = new Set(inventory.profiles.map(p => p.id));
  const actions = [], exclusions = [];
  for (const [kind, rows] of [['profile',inventory.profiles],['apartment',inventory.apartments]]) for (const row of rows) {
    exactIds([row.id]);
    if (!/^[0-9a-f]{64}$/.test(row.fingerprint) || typeof row.protected !== 'boolean') throw Error('Incomplete snapshot/protection evidence.');
    let reason;
    if (row.protected || preserved.has(row.id) || preserved.has(row.owner_id)) reason = 'preserved-or-linked';
    else if (kind === 'profile' && (!row.onboarded || row.mode !== 'resident')) reason = 'already-hidden-or-nonresident';
    else if (kind === 'apartment' && row.status !== 'active') reason = 'already-hidden';
    else if (kind === 'apartment' && !(profiles.has(row.owner_id) || (row.source === 'seed' && row.owner_id === null && knownSeedIds.includes(row.id)))) reason = 'unclassified-owner';
    if (reason) { exclusions.push({kind,id:row.id,reason}); continue; }
    const urls = kind === 'profile' ? (row.photo_url ? [row.photo_url] : []) : (row.photos ?? []);
    if (!Array.isArray(urls) || urls.some(url => typeof url !== 'string')) throw Error('Malformed image inventory.');
    const required = kind === 'profile' ? 1 : 3;
    const valid = urls.filter(url => images[url]?.state === 'valid').length;
    const unknown = urls.filter(url => !['valid','invalid'].includes(images[url]?.state)).length;
    // Transport uncertainty cannot turn a complete fixture into a retirement candidate.
    const partial = row.ready === false || urls.length < required || valid + unknown < required;
    if (!partial) { exclusions.push({kind,id:row.id,reason:valid >= required ? 'complete' : 'image-unverified'}); continue; }
    actions.push({kind,id:row.id,before:kind === 'profile' ? row.onboarded : row.status,after:kind === 'profile' ? false : 'paused',fingerprint:row.fingerprint,reason:row.ready === false ? 'incomplete-baseline' : 'invalid-or-missing-images'});
  }
  return {version:1,target:inventory.target,preservedIds:[...preserved].sort(),snapshot:structuredClone(inventory),images:structuredClone(images),actions,exclusions};
}

export function legacyRetirementSql(plan, { rollback = false } = {}) {
  const checked = planLegacyRetirement(plan.snapshot,{preservedIds:plan.preservedIds,images:plan.images});
  if (JSON.stringify(checked.actions) !== JSON.stringify(plan.actions)) throw Error('Retirement plan differs from its classified snapshot.');
  const expected = structuredClone(plan.snapshot);
  // Unknown/unmarked identities are protected server-side. Limit explicit IDs to
  // this inventory; newly provisioned actors change the guarded Auth counts.
  const knownIds = new Set([...expected.profiles,...expected.apartments].map(row=>row.id));
  const livePreserved = plan.preservedIds.filter(id=>knownIds.has(id));
  const scope = {profiles:plan.actions.filter(a=>a.kind==='profile').map(a=>a.id),apartments:plan.actions.filter(a=>a.kind==='apartment').map(a=>a.id)};
  expected.profiles = expected.profiles.filter(row => scope.profiles.includes(row.id));
  expected.apartments = expected.apartments.filter(row => scope.apartments.includes(row.id));
  if (rollback) for (const action of plan.actions) {
    const row = expected[action.kind === 'profile' ? 'profiles' : 'apartments'].find(row => row.id === action.id);
    row[action.kind === 'profile' ? 'onboarded' : 'status'] = action.after;
  }
  const changes = plan.actions.map(action => {
    const profile = action.kind === 'profile';
    const value = rollback ? action.before : action.after;
    return `update public.${profile ? 'profiles' : 'apartments'} set ${profile ? 'onboarded' : 'status'}=${typeof value === 'boolean' ? value : quote(value)} where id=${quote(action.id)};`;
  }).join('\n');
  return `begin;
set local lock_timeout='3s';
set local statement_timeout='5s';
lock table auth.users, public.profiles, public.profile_private, public.profile_lifestyle, public.apartments, public.apartment_rooms, public.group_members, public.conversation_members, public.likes, public.listing_inquiries, public.saves in share row exclusive mode;
do $retirement$ declare current_inventory jsonb; begin
select inventory into current_inventory from (${legacyInventorySql(plan.target,livePreserved,scope)}) scoped;
if current_inventory is distinct from ${quote(JSON.stringify(expected))}::jsonb then raise exception 'Retirement snapshot/ownership drift; nothing changed'; end if;
${changes}
end $retirement$;
commit;`;
}
const fixtureCount = Number(process.env.QA_FIXTURE_COUNT ?? '9');
export function syntheticVisibilityInventorySql(target) {
  if (!/^[a-z]{20}$/.test(target)) throw Error('Invalid Synthetic retirement target.');
  // Public marker/visibility and baseline-protection metadata only; no photos/private fields.
  return `with pool(id) as(values('408a2c76-e4d3-481a-9a69-859ae96d0ff3'::uuid),('eebcda4b-d5c5-4618-82fe-e9fddfe72dcb'::uuid),('1a89df55-b80d-426b-a068-d2527cf07610'::uuid)),
candidates as(select p.id,p.onboarded,p.mode,(p.id in(select id from pool)
or exists(select 1 from public.group_members a join public.group_members b using(group_id) where a.user_id=p.id and b.user_id in(select id from pool))
or exists(select 1 from public.conversation_members a join public.conversation_members b using(conversation_id) where a.user_id=p.id and b.user_id in(select id from pool))
or exists(select 1 from public.likes k where (k.from_user=p.id and k.to_user in(select id from pool)) or(k.to_user=p.id and k.from_user in(select id from pool)))
or exists(select 1 from public.listing_inquiries i join public.apartments a on a.id=i.apartment_id where(a.lister_id=p.id and i.requester_id in(select id from pool))or(i.requester_id=p.id and a.lister_id in(select id from pool)))) as protected
from public.profiles p where lower(coalesce(p.name,'')||' '||coalesce(p.bio,'')) like '%synthetic%')
select jsonb_build_object('target','${target}','auth_count',(select count(*) from auth.users),'profile_count',(select count(*) from public.profiles),'apartment_count',(select count(*) from public.apartments),
'profiles',(select coalesce(jsonb_agg(to_jsonb(c) order by id),'[]'::jsonb) from candidates c),
'apartments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'owner_id',a.lister_id,'status',a.status,'protected',coalesce((a.lister_id in(select id from pool) or coalesce((select protected from candidates c where c.id=a.lister_id),false) or exists(select 1 from public.listing_inquiries i where i.apartment_id=a.id and i.requester_id in(select id from pool)) or exists(select 1 from public.saves s where s.apartment_id=a.id and s.user_id in(select id from pool)) or exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id where g.apartment_id=a.id and gm.user_id in(select id from pool))),false)) order by a.id),'[]'::jsonb) from public.apartments a where lower(coalesce(a.title,'')||' '||coalesce(a.description,'')) like '%synthetic%')) as inventory`;
}
export function planSyntheticVisibility(inventory) {
  if (!inventory || !/^[a-z]{20}$/.test(inventory.target) || !['auth_count','profile_count','apartment_count'].every(key=>Number.isInteger(inventory[key])&&inventory[key]>=0) || !Array.isArray(inventory.profiles) || !Array.isArray(inventory.apartments)) throw Error('Invalid Synthetic visibility inventory.');
  exactIds(inventory.profiles.map(p=>p.id)); exactIds(inventory.apartments.map(a=>a.id));
  const actions=[],exclusions=[];
  for (const [kind,rows] of [['profile',inventory.profiles],['apartment',inventory.apartments]]) for (const row of rows) {
    if (typeof row.protected!=='boolean' || (kind==='profile' && typeof row.onboarded!=='boolean')) throw Error('Missing baseline protection.');
    if (retainedQaIds.includes(row.id) || retainedQaIds.includes(row.owner_id) || row.protected) { exclusions.push({kind,id:row.id,reason:'qa-baseline-protected'}); continue; }
    if ((kind==='profile' && !row.onboarded) || (kind==='apartment' && row.status!=='active')) { exclusions.push({kind,id:row.id,reason:'already-hidden'}); continue; }
    actions.push({kind,id:row.id,before:kind==='profile'?row.onboarded:row.status,after:kind==='profile'?false:'paused',reason:'owner-classified-obsolete-Synthetic'});
  }
  return {version:1,target:inventory.target,snapshot:structuredClone(inventory),actions,exclusions};
}
export function syntheticVisibilitySql(plan,{rollback=false}={}) {
  const checked=planSyntheticVisibility(plan.snapshot);
  if (JSON.stringify(checked.actions)!==JSON.stringify(plan.actions)) throw Error('Synthetic plan differs from snapshot.');
  const expected=structuredClone(plan.snapshot);
  if (rollback) for(const action of plan.actions) expected[action.kind==='profile'?'profiles':'apartments'].find(row=>row.id===action.id)[action.kind==='profile'?'onboarded':'status']=action.after;
  const updates=plan.actions.map(action=>{
    const value=rollback?action.before:action.after;
    return `update public.${action.kind==='profile'?'profiles':'apartments'} set ${action.kind==='profile'?'onboarded':'status'}=${typeof value==='boolean'?value:quote(value)} where id=${quote(action.id)};`;
  }).join('\n');
  return `begin;
set local lock_timeout='3s';
set local statement_timeout='5s';
lock table auth.users,public.profiles,public.apartments,public.groups,public.group_members,public.conversation_members,public.likes,public.listing_inquiries,public.saves in share row exclusive mode;
do $synthetic$ declare current_inventory jsonb; begin
select inventory into current_inventory from (${syntheticVisibilityInventorySql(plan.target)}) checked;
if current_inventory is distinct from ${quote(JSON.stringify(expected))}::jsonb then raise exception 'Synthetic visibility snapshot/ownership drift; nothing changed'; end if;
${updates}
end $synthetic$;
commit;`;
}
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
if (command === 'legacy-plan') {
  // Read-only offline dry-run. The connector, not this CLI, owns any hosted apply.
  const directory = '.qa/legacy-retirement';
  for (const name of ['inventory.json','images.json','preserve.json']) execFileSync('git',['check-ignore','--quiet',`${directory}/${name}`],{cwd:fileURLToPath(root)});
  const inventory = JSON.parse(await readFile(at(`${directory}/inventory.json`),'utf8'));
  const images = JSON.parse(await readFile(at(`${directory}/images.json`),'utf8'));
  const preserved = JSON.parse(await readFile(at(`${directory}/preserve.json`),'utf8'));
  const plan = planLegacyRetirement(inventory,{preservedIds:preserved.ids,images});
  await writeFile(at(`${directory}/manifest.json`),JSON.stringify(plan,null,2),{mode:0o600});
  await writeFile(at(`${directory}/apply.sql`),legacyRetirementSql(plan),{mode:0o600});
  await writeFile(at(`${directory}/rollback.sql`),legacyRetirementSql(plan,{rollback:true}),{mode:0o600});
  console.log(JSON.stringify({dry_run:true,profiles:plan.actions.filter(a=>a.kind==='profile').length,apartments:plan.actions.filter(a=>a.kind==='apartment').length,excluded:plan.exclusions.length,remote_mutations:0}));
} else if (command === 'synthetic-plan') {
  const directory = '.qa/legacy-retirement';
  execFileSync('git',['check-ignore','--quiet',`${directory}/synthetic-inventory.json`],{cwd:fileURLToPath(root)});
  const plan=planSyntheticVisibility(JSON.parse(await readFile(at(`${directory}/synthetic-inventory.json`),'utf8')));
  await writeFile(at(`${directory}/synthetic-manifest.json`),JSON.stringify(plan,null,2),{mode:0o600});
  await writeFile(at(`${directory}/synthetic-apply.sql`),syntheticVisibilitySql(plan),{mode:0o600});
  await writeFile(at(`${directory}/synthetic-rollback.sql`),syntheticVisibilitySql(plan,{rollback:true}),{mode:0o600});
  console.log(JSON.stringify({dry_run:true,profiles:plan.actions.filter(a=>a.kind==='profile').length,apartments:plan.actions.filter(a=>a.kind==='apartment').length,excluded:plan.exclusions.length,remote_mutations:0}));
} else if (command === 'prepare') {
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
    if (command === 'run' && await exists(artifact('scenario.json'))) {
      assertScenarioClean(JSON.parse(await readFile(at(artifact('scenario.json')), 'utf8')), run);
    }
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
} else throw new Error('Usage: qa-fixtures.mjs prepare [--reusable --actors=owner,requester,outsider]|ensure|run -- node <test>|check|legacy-plan|synthetic-plan|prepare-cleanup --discard-fixtures|storage|forget --verified-clean');
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
