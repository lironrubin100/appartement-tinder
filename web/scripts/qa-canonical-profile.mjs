// Ordinary authenticated acceptance. Does not provision users or use privileged keys.
// Run only after the reviewed migration is applied. Owns this profile run's indices 3–8.
// Retains completed demos/photos/group; refuses to repurpose existing completed accounts.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const at = path => new URL(`../${path}`, import.meta.url);
const report = { started_at: new Date().toISOString(), status: 'running', checks: [], retained: { profiles: [], photos: [], groups: [], conversations: [] } };
const clients = [];
let stage = 'fixture configuration';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6E3sAAAAASUVORK5CYII=', 'base64');
const facts = { cleanliness: 'tidy_shared', sleep_schedule: 'regular', guests: 'occasional', smoking: 'none', music_habits: { answered: true, values: ['headphones'] }, pets: { answered: true, values: [] } };
const preferences = { accepted_cleanliness: ['tidy_shared'], preferred_cleanliness: ['tidy_shared'], strict_non_smoking: true, pet_preference_answered: true, accepted_pet_types: [] };
const disclosed = ['cleanliness', 'music_habits', 'pets'];
const record = label => report.checks.push({ scenario: label, result: 'passed' });
const ok = (result, label) => { assert.equal(result.error, null, `${label}: ${result.error?.code ?? 'request error'}`); return result.data; };
const denied = (result, label, message) => { assert.ok(result.error, label); if (message) assert.match(result.error.message, message, label); };
const residentArgs = (extra = {}) => ({ p_name: 'Canonical Demo Resident', p_birth_date: '2000-01-01', p_phone: '0500000000', p_bio: 'Synthetic roommate demo retained for inspection.', p_facts: facts, p_preferences: preferences, p_disclosed_fields: disclosed, p_complete: true, p_expected_revision: 0, p_request_key: randomUUID(), ...extra });
async function flush() { await mkdir(at('.qa/profile'), { recursive: true }); await writeFile(at('.qa/profile/acceptance.json'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
async function photo(client, id, order = 0) {
  const path = `${id}/${randomUUID()}.png`;
  ok(await client.storage.from('profile-photos').upload(path, png, { contentType: 'image/png' }), 'Actual owner Storage upload');
  const url = client.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
  // Record the object immediately so a later gallery failure still leaves recovery evidence.
  const retained = { profile_id: id, bucket: 'profile-photos', path, url, gallery_id: null };
  report.retained.photos.push(retained); await flush();
  const row = ok(await client.from('profile_photos').insert({ profile_id: id, url, display_order: order }).select('id,url,display_order').single(), 'Owned gallery insertion');
  retained.gallery_id = row.id;
  const response = await fetch(url);
  assert.equal(response.status, 200, 'Uploaded public photo is actually fetchable');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.equals(png), 'Storage serves the uploaded PNG bytes');
  return { ...row, path };
}
async function state(client, id) {
  return {
    profile: ok(await client.from('profiles').select('name,bio,onboarded,mode,photo_url').eq('id', id).single(), 'Own public profile read'),
    private: ok(await client.from('profile_private').select('full_name,birth_date,phone,agency_name,adult_confirmed_at').eq('profile_id', id).single(), 'Own private read'),
    lifestyle: ok(await client.from('profile_lifestyle').select('*').eq('profile_id', id).maybeSingle(), 'Own lifestyle read'),
    preferences: ok(await client.from('profile_lifestyle_private').select('*').eq('profile_id', id).maybeSingle(), 'Own preference read'),
  };
}
try {
  const rows = JSON.parse(await readFile(at('.env.profile-qa.local'), 'utf8'));
  const run = JSON.parse(await readFile(at('.qa/profile/run.json'), 'utf8'));
  const env = Object.fromEntries((await readFile(at('.env.local'), 'utf8')).split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const split = line.indexOf('='); return [line.slice(0, split), line.slice(split + 1).replace(/^['"]|['"]$/g, '')]; }));
  assert.equal(run.target, 'https://npbduvjnqnbydolmdpsc.supabase.co');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, run.target);
  assert.ok(env.NEXT_PUBLIC_SUPABASE_ANON_KEY && rows.length === 9);
  assert.deepEqual(rows.map(row => row.id), run.ids);
  const indices = [3, 4, 5, 6, 7, 8];
  const accounts = indices.map(index => rows[index]);
  for (const row of accounts) { assert.match(row.id, /^[0-9a-f-]{36}$/); assert.equal(row.email, `qa-profile-${row.id}@example.invalid`); assert.ok(row.password); }
  report.target = run.target; report.fixture_indices = indices; report.fixture_ids = accounts.map(row => row.id);
  const makeClient = () => createClient(run.target, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const account of accounts) {
    const client = makeClient(); clients.push(client);
    const auth = ok(await client.auth.signInWithPassword({ email: account.email, password: account.password }), 'Exact synthetic sign-in');
    assert.equal(auth.user.id, account.id);
    const before = await state(client, account.id);
    assert.equal(before.profile.onboarded, false, 'Pristine fixture required; retained completed demos must not be reused');
    assert.equal(before.lifestyle, null, 'Pristine canonical fixture required');
    assert.equal(ok(await client.from('profile_photos').select('id').eq('profile_id', account.id), 'Pristine gallery check').length, 0);
  }
  let [a, b, outsider, lister, converted, draftOnly] = clients;
  const [aid, bid, xid, lid, cid, did] = accounts.map(account => account.id);
  record('Named target, exact fixture IDs and pristine accounts 3–8; browser accounts 0–2 untouched');

  stage = 'required completion rollback and draft persistence';
  const initial = await state(a, aid);
  denied(await a.rpc('save_resident_profile', residentArgs()), 'Completion requires actual owner photo', /incomplete_resident/);
  assert.deepEqual(await state(a, aid), initial, 'Failed completion is atomic');
  const draftArgs = residentArgs({ p_name: 'Draft Full Name', p_bio: '', p_facts: { pets: { answered: false } }, p_preferences: {}, p_disclosed_fields: [], p_complete: false });
  assert.deepEqual(ok(await a.rpc('save_resident_profile', draftArgs), 'Save incomplete canonical draft'), { revision: 1, onboarded: false });
  assert.deepEqual(ok(await a.rpc('save_resident_profile', draftArgs), 'Exact draft retry'), { revision: 1, onboarded: false });
  denied(await a.rpc('save_resident_profile', { ...draftArgs, p_bio: 'changed' }), 'Changed request-key payload is rejected', /request_key/);
  await a.auth.signOut(); a = makeClient(); clients.push(a);
  ok(await a.auth.signInWithPassword({ email: accounts[0].email, password: accounts[0].password }), 'Fresh session reload');
  const reloaded = await state(a, aid); assert.equal(reloaded.lifestyle.revision, 1); assert.deepEqual(reloaded.lifestyle.facts, { pets: null });
  assert.equal(reloaded.private.full_name, 'Draft Full Name'); assert.equal(reloaded.profile.name, 'Draft N.');
  record('Required-photo completion rolls back; draft survives fresh session; unanswered differs from explicit none; retry is idempotent');

  stage = 'Storage ownership and required core validation';
  const mainPhoto = await photo(a, aid);
  const foreignInsert = await b.from('profile_photos').insert({ profile_id: bid, url: mainPhoto.url });
  denied(foreignInsert, 'Foreign owned object cannot be attached', /owned_photo/);
  denied(await a.from('profile_photos').insert({ profile_id: aid, url: mainPhoto.url.replace('npbduvjnqnbydolmdpsc.supabase.co', 'invalid.example') }), 'Forged public hostname rejected', /owned_photo/);
  denied(await a.from('profiles').update({ photo_url: 'https://invalid.example/profile.png' }).eq('id', aid), 'Direct authoritative photo spoof rejected');
  for (const field of ['cleanliness', 'sleep_schedule', 'guests', 'smoking']) {
    const before = await state(a, aid);
    denied(await a.rpc('save_resident_profile', residentArgs({ p_expected_revision: 1, p_facts: { ...facts, [field]: null } })), `Required ${field} cannot be omitted`, /incomplete_resident/);
    assert.deepEqual(await state(a, aid), before, `Rejected ${field} rolls back all rows`);
  }
  for (const extra of [{ p_name: '\t\n' }, { p_bio: '\t\n' }, { p_birth_date: '2015-01-01' }]) {
    const before = await state(a, aid);
    denied(await a.rpc('save_resident_profile', residentArgs({ p_expected_revision: 1, ...extra })), 'Whitespace/adulthood completion rejected', /incomplete_resident/);
    assert.deepEqual(await state(a, aid), before);
  }
  const complete = residentArgs({ p_expected_revision: 1 });
  assert.deepEqual(ok(await a.rpc('save_resident_profile', complete), 'Complete strict canonical resident'), { revision: 2, onboarded: true });
  const races = await Promise.all([a.rpc('save_resident_profile', residentArgs({ p_expected_revision: 2 })), a.rpc('save_resident_profile', residentArgs({ p_expected_revision: 2 }))]);
  assert.equal(races.filter(result => !result.error).length, 1, 'Exactly one stale-tab contender commits');
  assert.equal(races.filter(result => result.error?.message.includes('revision')).length, 1);
  assert.deepEqual(ok(await a.rpc('save_resident_profile', complete), 'Earlier exact retry remains stable after newer save'), { revision: 2, onboarded: true });
  report.retained.profiles.push({ id: aid, purpose: 'Canonical resident with conscious disclosure', revision: 3 });
  record('Real Storage bytes and exact owner/origin proof; four required facts/name/bio/adult validation atomic; concurrent CAS and tombstones');

  stage = 'gallery order and safe secondary removal';
  const secondary = await photo(a, aid, -1);
  assert.equal((await state(a, aid)).profile.photo_url, secondary.url, 'New first gallery photo becomes primary');
  ok(await a.from('profile_photos').update({ display_order: -2 }).eq('id', mainPhoto.id), 'Reorder existing owner photo');
  assert.equal((await state(a, aid)).profile.photo_url, mainPhoto.url);
  ok(await a.from('profile_photos').delete().eq('id', secondary.id), 'Remove only secondary gallery row');
  ok(await a.storage.from('profile-photos').remove([secondary.path]), 'Remove now-unreferenced secondary Storage object');
  report.retained.photos = report.retained.photos.filter(photo => photo.gallery_id !== secondary.id);
  assert.equal((await state(a, aid)).profile.photo_url, mainPhoto.url);
  const stillPresent = await fetch(mainPhoto.url); assert.equal(stillPresent.status, 200, 'Retained active photo remains fetchable');
  record('Owned gallery ordering synchronizes primary; row-first secondary Storage removal works; active primary retained');

  stage = 'peer completion and safe public disclosure';
  for (const [client, id, name] of [[b, bid, 'Canonical Peer Demo'], [outsider, xid, 'Canonical Outsider Demo'], [converted, cid, 'Canonical Conversion Demo']]) {
    await photo(client, id);
    ok(await client.rpc('save_resident_profile', residentArgs({ p_name: name })), 'Complete separate synthetic resident');
    report.retained.profiles.push({ id, purpose: name });
  }
  for (const table of ['profiles', 'profile_private', 'profile_lifestyle', 'profile_lifestyle_private']) {
    const key = table === 'profiles' ? 'id' : 'profile_id';
    assert.equal(ok(await outsider.from(table).select('*').eq(key, aid), `Outsider ${table} read`).length, 0, `${table} owner-only`);
  }
  const publicProfile = ok(await outsider.from('profiles_public').select('*').eq('id', aid).single(), 'Consciously disclosed public resident');
  assert.equal(publicProfile.name, 'Canonical R.'); assert.deepEqual(publicProfile.lifestyle_facts, { cleanliness: 'tidy_shared', music_habits: { answered: true, values: ['headphones'] }, pets: { answered: true, values: [] } });
  for (const key of ['full_name', 'birth_date', 'phone', 'email', 'preferences', 'disclosed_fields', 'budget_min']) assert.ok(!(key in publicProfile), `${key} never projected`);
  for (const key of ['gender', 'gender_dynamic', 'relationship_status', 'miluim_reserve_duty', 'smoking']) assert.equal(publicProfile[key], null, 'Legacy fields not automatically disclosed');
  const own = await state(a, aid); assert.equal(own.private.full_name, 'Canonical Demo Resident'); assert.deepEqual(own.preferences.preferences, preferences);
  denied(await a.from('profiles').update({ name: 'Public Full Secret Name' }).eq('id', aid), 'Direct full-name publication forbidden');
  denied(await a.from('profile_lifestyle').update({ disclosed_fields: ['smoking'] }).eq('profile_id', aid), 'Direct canonical write forbidden');
  record('Separate ordinary clients cannot read full name/private preferences; public projection contains only consciously disclosed canonical facts');

  stage = 'account-only lister completion and editing';
  const intake = { p_name: 'Canonical Lister Demo', p_resident: false, p_birth_date: null, p_phone: '0500000001', p_agency: 'Synthetic demo', p_bio: '', p_tags: {}, p_complete: true };
  const listerBefore = await state(lister, lid);
  denied(await lister.rpc('save_onboarding', intake), 'New lister must explicitly confirm adulthood', /adult_confirmation/);
  assert.deepEqual(await state(lister, lid), listerBefore);
  ok(await lister.rpc('save_onboarding', { ...intake, p_tags: { adult_confirmed: true } }), 'Complete account-only lister');
  assert.ok((await state(lister, lid)).private.adult_confirmed_at);
  const editLister = { p_name: 'Canonical Updated Lister', p_phone: '0500000002', p_agency: 'Retained demo', p_expected_revision: 0, p_request_key: randomUUID() };
  assert.deepEqual(ok(await lister.rpc('save_lister_profile', editLister), 'Save own account-only profile'), { revision: 1 });
  assert.deepEqual(ok(await lister.rpc('save_lister_profile', editLister), 'Exact lister edit retry'), { revision: 1 });
  denied(await lister.rpc('save_lister_profile', { ...editLister, p_request_key: randomUUID() }), 'Lister stale revision rejected', /revision/);
  denied(await lister.rpc('save_lister_profile', { ...editLister, p_phone: '\t\n', p_expected_revision: 1, p_request_key: randomUUID() }), 'Lister empty phone rejected');
  denied(await lister.rpc('save_resident_profile', residentArgs({ p_expected_revision: 1 })), 'Completed lister cannot return through resident API', /lister/);
  report.retained.profiles.push({ id: lid, purpose: 'Account-only lister with explicit adult confirmation' });
  record('New lister consent persisted; account-only edits use CAS/idempotency and cannot grant resident capability');

  stage = 'B10 conversion retaining private canonical data';
  const beforeConversion = await state(converted, cid);
  ok(await converted.rpc('convert_to_lister', { p_phone: '0500000003', p_agency: 'Converted demo' }), 'Explicit resident-to-lister conversion');
  const afterConversion = await state(converted, cid);
  assert.equal(afterConversion.profile.mode, 'lister'); assert.deepEqual(afterConversion.lifestyle, beforeConversion.lifestyle); assert.deepEqual(afterConversion.preferences, beforeConversion.preferences);
  assert.equal(afterConversion.private.full_name, beforeConversion.private.full_name);
  assert.equal(afterConversion.private.adult_confirmed_at, null, 'Conversion does not invent checkbox declaration');
  assert.equal(ok(await outsider.from('profiles_public').select('id').eq('id', cid), 'Converted public visibility').length, 0);
  denied(await converted.rpc('save_resident_profile', residentArgs({ p_expected_revision: 1 })), 'Converted lister cannot regain resident capability', /lister/);
  record('Explicit B10 conversion preserves canonical private state and removes public resident visibility');

  stage = 'ordinary accepted chat and group conversion refusal';
  const introduction = ok(await a.rpc('send_introduction', { p_user: bid, p_group: null, p_message: 'Synthetic connection retained for the demo.', p_ref_tag: `${bid}:canonical.cleanliness:tidy_shared` }), 'Trait-attached introduction');
  const conversation = ok(await b.rpc('accept_like', { p_like_id: introduction }), 'Recipient accepts ordinary introduction');
  report.retained.conversations.push(conversation);
  const groupName = `Canonical demo ${aid.slice(0, 8)}`;
  const groupConversation = ok(await a.rpc('create_group_from_chats', { p_name: groupName, p_contacts: [bid], p_policy: 'admin' }), 'Create group through accepted chat');
  report.retained.conversations.push(groupConversation);
  const ownedGroup = ok(await a.rpc('list_accessible_groups'), 'Authorized own group lookup').find(item => item.name === groupName); assert.ok(ownedGroup);
  const group = ownedGroup.id; report.retained.groups.push(group);
  const invites = ok(await b.rpc('list_group_invites'), 'Recipient own group invites');
  const invite = invites.find(invite => invite.group_name === groupName); assert.ok(invite);
  ok(await b.rpc('respond_group_invite', { p_invite: invite.id, p_accept: true }), 'Explicit group invitation acceptance');
  const beforeGroupRefusal = await state(a, aid);
  denied(await a.rpc('convert_to_lister', { p_phone: '0500000004', p_agency: '' }), 'Active group member conversion refused', /active_group_membership/);
  assert.deepEqual(await state(a, aid), beforeGroupRefusal, 'Group refusal leaves entire own profile unchanged');
  const groupView = ok(await outsider.rpc('discover_groups'), 'Outsider safe groups discovery').find(item => item.id === group); assert.ok(groupView); assert.equal(groupView.members.length, 2);
  assert.deepEqual(groupView.members.find(member => member.id === aid).lifestyle_facts, publicProfile.lifestyle_facts);
  record('Real accepted introduction/chat/group admission; group member conversion refused atomically; group projection uses safe facts');

  stage = 'legacy completion bypass and draft-only fixture';
  const legacy = { p_name: 'Legacy Attempt Demo', p_resident: true, p_birth_date: '2000-01-01', p_phone: '', p_agency: '', p_bio: 'No owned photo.', p_tags: { cleanliness: 'very_clean', sleep_schedule: 'night_owl', social_guests: 'rarely', smoking: 'no' }, p_complete: true };
  const untouched = await state(draftOnly, did);
  denied(await draftOnly.rpc('save_onboarding', legacy), 'Legacy signature cannot bypass owned-photo/core completion', /incomplete_resident/);
  assert.deepEqual(await state(draftOnly, did), untouched);
  ok(await draftOnly.rpc('save_resident_profile', residentArgs({ p_name: 'Retained Incomplete Demo', p_bio: '', p_facts: {}, p_preferences: {}, p_disclosed_fields: [], p_complete: false })), 'Retain useful incomplete draft');
  report.retained.profiles.push({ id: did, purpose: 'Incomplete draft for owner inspection' });
  record('Legacy resident completion cannot bypass I9; fresh incomplete draft retained');
  report.status = 'passed'; report.finished_at = new Date().toISOString();
  await flush(); console.log(`Canonical ordinary-client acceptance passed: ${report.checks.length} scenario groups. Retained exact synthetic demos and active photos; safe report .qa/profile/acceptance.json.`);
} catch (error) {
  report.status = 'failed'; report.failed_stage = stage; report.failure = { name: error.name, code: error.code ?? null }; report.finished_at = new Date().toISOString();
  await flush(); console.error(`Canonical ordinary-client acceptance failed at ${stage}. Inspect exact fixture state and safe report before rerunning; retained demos were not cleaned.`); process.exitCode = 1;
} finally {
  for (const client of clients) await client.auth.signOut().catch(() => {});
}
