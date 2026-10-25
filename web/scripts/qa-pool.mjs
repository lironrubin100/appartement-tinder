// Reusable QA identities are explicit; retained demo manifests are never adopted implicitly.
import { mkdir, open, readFile, unlink, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha256 = /^[a-f0-9]{64}$/i;
const scenarioTables = { group: 'groups', listing: 'apartments', inquiry: 'listing_inquiries', conversation: 'conversations' };

// Journals contain identifiers only. The pre-run inventory prevents a retained
// resource being adopted as a newly created test resource, even with QA owners.
export function beginScenario(run, baseline) {
  if (run.purpose !== 'reusable-qa' || run.baseline?.state !== 'ready') throw new Error('Scenario needs a validated reusable pool.');
  const journal = { version: 1, target: run.target, pool_ids: [...run.ids], run_id: randomUUID(), state: 'active', baseline, resources: [], media: [] };
  validateScenario(journal, run);
  return journal;
}

export function validateScenario(journal, run) {
  const canonicalId = id => typeof id === 'string' && uuid.test(id) && id === id.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(run.prefix ?? '') || !Array.isArray(run.ids) || run.ids.length !== 3 || run.ids.some(id => !canonicalId(id)) || new Set(run.ids).size !== 3 ||
      journal?.version !== 1 || journal.target !== run.target || JSON.stringify(journal.pool_ids) !== JSON.stringify(run.ids) ||
      !uuid.test(journal.run_id ?? '') || !['active', 'cleaning', 'failed', 'clean'].includes(journal.state) ||
      !record(journal.baseline) || !Array.isArray(journal.resources) || !Array.isArray(journal.media)) throw new Error('Scenario journal does not match this pool/target.');
  for (const kind of Object.keys(scenarioTables)) if (!Array.isArray(journal.baseline[kind]) || journal.baseline[kind].some(id => !canonicalId(id))) throw new Error('Pre-run resource inventory is incomplete or noncanonical.');
  const keys = new Set();
  for (const resource of journal.resources) {
    if (!Object.hasOwn(scenarioTables, resource.kind) || !canonicalId(resource.id) || journal.baseline[resource.kind].includes(resource.id) ||
        keys.has(`${resource.kind}:${resource.id}`) || Object.keys(resource).some(key => !['kind', 'id'].includes(key))) throw new Error('Resource is retained, duplicated or not owned by this run.');
    keys.add(`${resource.kind}:${resource.id}`);
  }
  for (const item of journal.media) if (!run.ids.includes(item.owner_id) || !['apartment-photos', 'profile-photos'].includes(item.bucket) ||
      typeof item.path !== 'string' || !item.path.startsWith(`${item.owner_id}/${journal.run_id}/`) || item.path.includes('..') ||
      Object.keys(item).some(key => !['owner_id', 'bucket', 'path'].includes(key))) throw new Error('Media must use an exact actor/run-owned prefix.');
  return journal;
}

export async function saveScenario(path, journal) {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(journal, null, 2), { mode: 0o600, flag: 'wx' });
  await rename(temp, path);
}

export async function recordScenarioResource({ journal, run, kind, id, save }) {
  if (journal.state !== 'active') throw new Error('Recover the previous scenario before recording new resources.');
  const next = structuredClone(journal);
  next.resources.push({ kind, id });
  validateScenario(next, run);
  await save(next);
  Object.assign(journal, next);
}

export function assertScenarioClean(journal, run) {
  validateScenario(journal, run);
  if (journal.state !== 'clean') throw new Error('Previous QA scenario requires exact journal recovery before rerun; no child started.');
}

export function scenarioCleanupSql(journal, run) {
  validateScenario(journal, run);
  const literal = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const roots = journal.resources.map(resource => ({ table: scenarioTables[resource.kind], id: resource.id }));
  // Only known descendants can be touched. New schema relationships fail closed
  // when they actually reference a run resource, including SET NULL and RESTRICT.
  const allowed = ['groups', 'apartments', 'listing_inquiries', 'conversations', 'group_members', 'group_invites', 'likes', 'group_admission_votes', 'conversation_members', 'messages', 'apartment_rooms', 'apartment_interests', 'apartment_reports', 'saves'];
  return `begin;
create temporary table qa_cleanup_nodes(rel oid, body jsonb, primary key(rel,body)) on commit drop;
do $qa$ declare
 roots jsonb := ${literal(roots)}; actors jsonb := ${literal(run.ids)};
 baseline jsonb := ${literal(journal.baseline)};
 allowed jsonb := ${literal(allowed)};
 root jsonb; node record; fk record; child record; field record;
 child_rel regclass; predicate text; affected integer; added integer;
begin
 if (select count(*) from auth.users where id::text in (select jsonb_array_elements_text(actors)) and email = '${run.prefix}' || '-' || id::text || '@example.invalid') <> jsonb_array_length(actors) then raise exception 'QA identity guard failed'; end if;
 -- Lock known resource/descendant tables before graph discovery so an ordinary
 -- writer cannot insert a new reference between validation and deletion.
 for field in select value #>> '{}' as name from jsonb_array_elements(allowed) order by 1 loop
   child_rel := to_regclass('public.' || field.name);
   if child_rel is not null then execute format('lock table %s in share row exclusive mode',child_rel); end if;
 end loop;
 for root in select value from jsonb_array_elements(roots) loop
   execute format('insert into qa_cleanup_nodes select $1,to_jsonb(t) from public.%I t where id=$2::uuid on conflict do nothing',root->>'table') using to_regclass('public.' || (root->>'table'))::oid,root->>'id';
 end loop;
 -- A failed create response may leave a resource before its ID is journaled.
 -- Do not declare a clean baseline while any new actor-owned root is untracked.
 if exists(select 1 from public.groups t where actors ? t.admin_id::text and not (baseline->'group') ? t.id::text and not exists(select 1 from jsonb_array_elements(roots) r where r->>'table'='groups' and r->>'id'=t.id::text))
 or exists(select 1 from public.apartments t where actors ? t.lister_id::text and not (baseline->'listing') ? t.id::text and not exists(select 1 from jsonb_array_elements(roots) r where r->>'table'='apartments' and r->>'id'=t.id::text))
 or exists(select 1 from public.listing_inquiries t where actors ? t.requester_id::text and not (baseline->'inquiry') ? t.id::text and not exists(select 1 from jsonb_array_elements(roots) r where r->>'table'='listing_inquiries' and r->>'id'=t.id::text))
 or exists(select 1 from public.conversations t where (exists(select 1 from public.conversation_members m where m.conversation_id=t.id and actors ? m.user_id::text) or exists(select 1 from public.groups g where g.id=t.group_id and actors ? g.admin_id::text)) and not (baseline->'conversation') ? t.id::text and not exists(select 1 from jsonb_array_elements(roots) r where r->>'table'='conversations' and r->>'id'=t.id::text))
 then raise exception 'Unjournaled actor resource; recover creation response before cleanup'; end if;
 loop
   added := 0;
   for node in select * from qa_cleanup_nodes loop
     for fk in select c.conrelid,c.conkey,c.confkey from pg_constraint c where c.contype='f' and c.confrelid=node.rel loop
       select string_agg(format('to_jsonb(t)->>%L = $1->>%L', ca.attname,pa.attname),' and ') into predicate
       from unnest(fk.conkey,fk.confkey) k(child_num,parent_num)
       join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=k.child_num
       join pg_attribute pa on pa.attrelid=node.rel and pa.attnum=k.parent_num;
       for child in execute format('select to_jsonb(t) as body from %s t where %s',fk.conrelid::regclass,predicate) using node.body loop
         if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=fk.conrelid and n.nspname='public' and allowed ? c.relname) then raise exception 'Unknown dependent table; no cleanup'; end if;
         insert into qa_cleanup_nodes values(fk.conrelid,child.body) on conflict do nothing;
         get diagnostics affected = row_count; added := added + affected;
       end loop;
     end loop;
   end loop;
   exit when added=0;
 end loop;
 for node in select n.*,c.relname from qa_cleanup_nodes n join pg_class c on c.oid=n.rel loop
   -- Every root entity reached through a dependency must itself be journaled.
   if node.relname in ('groups','apartments','listing_inquiries','conversations') and not exists(select 1 from jsonb_array_elements(roots) r where r->>'table'=node.relname and r->>'id'=node.body->>'id') then raise exception 'Unjournaled dependent entity; no cleanup'; end if;
   for field in select key,value from jsonb_each_text(node.body) where key in ('admin_id','lister_id','requester_id','user_id','from_user','to_user','sender_id','invitee_id','inviter_id','voter_id','actor_id','owner_id','reporter_id','reported_id') loop
     if field.value is not null and not actors ? field.value then raise exception 'Outside actor in cleanup graph'; end if;
   end loop;
   -- Deleting a run entity must not modify or detach an existing conversation,
   -- apartment or group reached through a forward reference either.
   for field in select key,value from jsonb_each_text(node.body) where key in ('group_id','to_group','apartment_id','conversation_id') and value is not null loop
     if not exists(select 1 from jsonb_array_elements(roots) r where r->>'id'=field.value and r->>'table'=case when field.key in ('group_id','to_group') then 'groups' when field.key='apartment_id' then 'apartments' else 'conversations' end) then raise exception 'Reference to retained baseline entity'; end if;
   end loop;
 end loop;
 -- Only recorded roots are deleted; proven run-only dependent rows follow their
 -- existing FK rules. Profiles/Auth/Storage are never deletion targets.
 for root in select value from jsonb_array_elements(roots) order by case value->>'table' when 'listing_inquiries' then 1 when 'conversations' then 2 when 'groups' then 3 else 4 end loop
   execute format('delete from public.%I where id=$1::uuid',root->>'table') using root->>'id';
 end loop;
end $qa$;
commit;`;
}

// Call under the pool lease. executeSql must execute the whole SQL transaction;
// removeMedia uses an ordinary owner Storage API and exact paths, never metadata SQL.
export async function cleanupScenario({ journal, run, save, executeSql, removeMedia }) {
  validateScenario(journal, run);
  journal.state = 'cleaning'; await save(journal);
  try {
    await executeSql(scenarioCleanupSql(journal, run));
    if (journal.media.length && typeof removeMedia !== 'function') throw new Error('Ordinary owner media cleanup is unavailable.');
    for (const item of journal.media) await removeMedia(item);
    journal.state = 'clean'; await save(journal);
  } catch (error) {
    journal.state = 'failed'; await save(journal);
    throw error;
  }
}
export const REQUIRED_REUSABLE_QA_ROLES = ['owner', 'accepted_requester', 'pending_requester'];

// Card 0.11 only. Privileged access is restricted to exact-ID account creation;
// profile/media work uses each actor's ordinary session. Never reset passwords.
export async function setupPoolActors({ rows, run, target, admin, clientFor, portraitBytes, saveReceipt }) {
  validatePool(rows, run, target);
  if (target !== 'https://npbduvjnqnbydolmdpsc.supabase.co') throw new Error('Unapproved setup target.');
  const inventory = await admin.listUsers({ page: 1, perPage: 1000 });
  if (inventory.error || !inventory.data?.users || inventory.data.users.length >= 1000) throw new Error('Cannot establish bounded Auth collision inventory.');
  const users = inventory.data.users;
  const clients = new Map();
  const assets = new Map();
  const receipt = { version: 1, target, actors: {}, private_denied: false };
  const checked = (result, message) => { if (result.error) throw new Error(message); return result.data; };
  try {
    // Validate every identity, credential and local asset before the first write.
    for (const [role, id] of Object.entries(run.actors)) {
      const row = rows.find(item => item.id === id);
      const byId = users.find(user => user.id === id);
      const byEmail = users.find(user => user.email?.toLowerCase() === row.email.toLowerCase());
      if ((byId && byId.email !== row.email) || (byEmail && byEmail.id !== id)) throw new Error('QA identity/email collision; no account changed.');
      const bytes = await portraitBytes(run.baseline.actors[role].portrait);
      const expected = run.baseline.actors[role].portrait;
      if (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) throw new Error('QA portrait failed integrity check.');
      assets.set(id, bytes);
      const client = clientFor(); clients.set(id, client);
      if (byId) {
        const signed = checked(await client.auth.signInWithPassword(row), 'Existing QA credentials failed; no password reset allowed.');
        if (signed.user?.id !== id) throw new Error('QA sign-in identity mismatch.');
      }
    }
    for (const [role, id] of Object.entries(run.actors)) {
      const row = rows.find(item => item.id === id);
      const client = clients.get(id);
      if (!users.some(user => user.id === id)) {
        const created = checked(await admin.createUser({ id, email: row.email, password: row.password, email_confirm: true }), 'Exact QA account creation failed; preserve manifest.');
        if (created.user?.id !== id) throw new Error('Provisioned identity differs; preserve manifest and stop.');
        receipt.actors[role] = { created: true }; await saveReceipt(receipt);
        const signed = checked(await client.auth.signInWithPassword(row), 'New QA ordinary sign-in failed.');
        if (signed.user?.id !== id) throw new Error('New QA sign-in identity mismatch.');
      }
      const baseline = run.baseline.actors[role];
      const profile = checked(await client.from('profiles').select('mode,onboarded').eq('id', id).single(), 'Cannot read QA profile.');
      if (profile.mode === 'lister') throw new Error('QA actor is a lister; do not convert implicitly.');
      const lifestyle = checked(await client.from('profile_lifestyle').select('revision').eq('profile_id', id).maybeSingle(), 'Cannot read QA profile revision.');
      const path = baseline.portrait.storage_path_template.replace('{actor_id}', id);
      if (!path.startsWith(`${id}/`) || path.includes('..')) throw new Error('Portrait path escapes actor.');
      const url = `${target}/storage/v1/object/public/profile-photos/${path}`;
      const photos = checked(await client.from('profile_photos').select('id,url').eq('profile_id', id), 'Cannot read QA gallery.');
      if (!photos.some(photo => photo.url === url)) {
        const uploaded = await client.storage.from('profile-photos').upload(path, assets.get(id), { contentType: 'image/png', upsert: false });
        if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message ?? '')) throw new Error('Ordinary QA portrait upload failed.');
        checked(await client.from('profile_photos').insert({ profile_id: id, url, display_order: 0 }), 'Ordinary QA gallery attach failed.');
      }
      if (!profile.onboarded) {
        const p = baseline.profile;
        checked(await client.rpc('save_resident_profile', { p_name: p.name, p_birth_date: p.birth_date, p_phone: '', p_bio: p.bio, p_facts: p.facts, p_preferences: p.preferences, p_disclosed_fields: p.disclosed_fields, p_complete: true, p_expected_revision: lifestyle?.revision ?? 0, p_request_key: randomUUID() }), 'Ordinary QA canonical profile save failed.');
      }
      const publicProfile = checked(await client.from('profiles_public').select('*').eq('id', id).single(), 'QA public projection unavailable.');
      const ownPrivate = checked(await client.from('profile_private').select('full_name,birth_date').eq('profile_id', id).single(), 'QA private baseline unavailable.');
      const ownFacts = checked(await client.from('profile_lifestyle').select('facts,disclosed_fields').eq('profile_id', id).single(), 'QA facts baseline unavailable.');
      const ownPreferences = checked(await client.from('profile_lifestyle_private').select('preferences').eq('profile_id', id).single(), 'QA preferences baseline unavailable.');
      const same = (actual, expected) => Array.isArray(expected)
        ? Array.isArray(actual) && actual.length === expected.length && expected.every(value => actual.some(item => same(item, value)))
        : expected && typeof expected === 'object'
          ? actual && Object.keys(expected).every(key => same(actual[key], expected[key]))
          : actual === expected;
      const expected = baseline.profile;
      if (ownPrivate.full_name !== expected.name || ownPrivate.birth_date !== expected.birth_date || publicProfile.bio !== expected.bio ||
          !same(ownFacts.facts, expected.facts) || !same(ownFacts.disclosed_fields, expected.disclosed_fields) || !same(ownPreferences.preferences, expected.preferences))
        throw new Error('QA baseline drifted; preserve existing content and investigate rather than reset.');
      if (!publicProfile.name || !publicProfile.bio || publicProfile.photo_url !== url || !publicProfile.lifestyle_facts?.cleanliness) throw new Error('QA public baseline incomplete.');
      for (const key of ['birth_date', 'phone', 'preferences']) if (publicProfile[key] != null) throw new Error('Private data exposed publicly.');
      const image = await fetch(url);
      if (!image.ok || (await image.arrayBuffer()).byteLength !== assets.get(id).length) throw new Error('QA portrait is not publicly fetchable.');
      receipt.actors[role] = { ...receipt.actors[role], ordinary_login: true, photo_url: url, completed: true };
      await saveReceipt(receipt);
    }
    for (const [id, client] of clients) {
      for (const table of ['profile_private', 'profile_lifestyle_private']) {
        const result = checked(await client.from(table).select('*').in('profile_id', run.ids.filter(other => other !== id)), 'QA outsider privacy check failed.');
        if (result.length) throw new Error('QA actor can read another actor private profile.');
      }
    }
    receipt.private_denied = true; await saveReceipt(receipt);
    return receipt;
  } finally { for (const client of clients.values()) await client.auth.signOut({ scope: 'local' }).catch(() => {}); }
}

function record(value) { return value && typeof value === 'object' && !Array.isArray(value); }

export function validateBaseline(run) {
  const baseline = run.baseline;
  if (!record(baseline) || baseline.version !== 1 || baseline.target !== run.target ||
      !['pending-live-validation', 'ready'].includes(baseline.state) || !record(baseline.actors))
    throw new Error('Reusable QA pool baseline is missing or targets a different environment. Preserve the manifest and complete card 0.11; do not replace accounts.');
  if (JSON.stringify(Object.keys(baseline.actors).sort()) !== JSON.stringify([...REQUIRED_REUSABLE_QA_ROLES].sort()))
    throw new Error('Reusable QA baseline must define owner, accepted_requester, and pending_requester exactly once.');
  for (const role of REQUIRED_REUSABLE_QA_ROLES) {
    const actor = baseline.actors[role];
    const profile = actor?.profile;
    const portrait = actor?.portrait;
    if (!record(actor) || actor.id_ref !== role || !record(profile) || !record(profile.facts) || !record(profile.preferences) ||
        !Array.isArray(profile.disclosed_fields) || !profile.disclosed_fields.length || profile.completed !== true ||
        profile.mode !== 'resident' || typeof profile.name !== 'string' || !profile.name.trim() ||
        typeof profile.bio !== 'string' || !profile.bio.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(profile.birth_date) ||
        !record(portrait) || portrait.owner_role !== role || typeof portrait.source !== 'string' || !portrait.source.startsWith('web/public/') ||
        !sha256.test(portrait.sha256 ?? '') || !Number.isInteger(portrait.bytes) || portrait.bytes < 1024 ||
        !Number.isInteger(portrait.width) || portrait.width < 320 || !Number.isInteger(portrait.height) || portrait.height < 320 ||
        typeof portrait.storage_path_template !== 'string' || !portrait.storage_path_template.startsWith('{actor_id}/') || typeof portrait.provenance !== 'string' || !portrait.provenance.trim())
      throw new Error(`Reusable QA baseline for ${role} is incomplete or drifted. Preserve the manifest and diagnose; do not create or reset an account.`);
  }
  return baseline;
}

export function validatePool(rows, run, target) {
  if (run?.purpose !== 'reusable-qa' || run.version !== 1) throw new Error('Not a dedicated reusable QA pool; retained demos need their own manifest.');
  if (run.target !== target) throw new Error('QA pool target differs from the current environment.');
  if (!/^[a-z0-9-]+$/.test(run.prefix ?? '') || !Array.isArray(rows) || rows.length < 1 || rows.length > 9 || new Set(rows.map(row => row.id)).size !== rows.length ||
      rows.some(row => !uuid.test(row.id) || row.email !== `${run.prefix}-${row.id}@example.invalid` || typeof row.password !== 'string' || !row.password) ||
      JSON.stringify(run.ids) !== JSON.stringify(rows.map(row => row.id))) throw new Error('QA pool identity manifest mismatch.');
  const actors = Object.entries(run.actors ?? {});
  if (actors.length !== REQUIRED_REUSABLE_QA_ROLES.length || rows.length !== REQUIRED_REUSABLE_QA_ROLES.length ||
      JSON.stringify(actors.map(([name]) => name).sort()) !== JSON.stringify([...REQUIRED_REUSABLE_QA_ROLES].sort()) ||
      actors.some(([name, id]) => !/^[a-z][a-z0-9_-]{0,39}$/.test(name) || !run.ids.includes(id)) ||
      new Set(actors.map(([, id]) => id)).size !== rows.length) throw new Error('QA pool actors must name each exact identity once.');
  validateBaseline(run);
  return rows;
}

export async function withPoolLease(directory, scope, action) {
  if (typeof scope.target !== 'string' || !scope.target || !scope.ids?.length || scope.ids.some(id => !uuid.test(id)) || new Set(scope.ids).size !== scope.ids.length) throw new Error('Invalid QA lease scope.');
  await mkdir(directory, { recursive: true });
  const token = randomUUID();
  const held = [];
  const release = async () => {
    for (const path of held.reverse()) {
      const current = JSON.parse(await readFile(path, 'utf8'));
      if (current.token !== token) throw new Error('QA lease changed; preserve it for investigation.');
      await unlink(path);
    }
  };
  try {
    for (const id of [...scope.ids].sort()) {
      // Per-actor locks also protect overlapping subsets and duplicate manifests.
      const name = createHash('sha256').update(`${scope.target}\n${id.toLowerCase()}`).digest('hex');
      const path = join(directory, `${name}.json`);
      let file;
      try { file = await open(path, 'wx', 0o600); }
      catch (error) {
        if (error.code === 'EEXIST') throw new Error('QA actors are already leased. Do not create another cohort; inspect the existing run.');
        throw error;
      }
      held.push(path);
      try { await file.writeFile(JSON.stringify({ token, pid: process.pid, created_at: new Date().toISOString() })); }
      finally { await file.close(); }
    }
    return await action();
  } finally { await release(); }
}
