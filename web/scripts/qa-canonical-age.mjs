// Ordinary-client canonical adulthood boundary check; exact current run index 5 only.
// Before running, refresh ignored .qa/profile/server-age-clock.json via read-only SQL:
// select current_date::text server_date,(current_date-interval '18 years')::date::text adult_cutoff,
// ((current_date-interval '18 years')::date+1)::text next_day;
// Include target and observed_at. No admin key, SQL write, fixture creation or photo mutation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const at = path => new URL(`../${path}`, import.meta.url);
const report = { started_at: new Date().toISOString(), fixture_index: 5, status: 'running', checks: [], restored_original_dob: false };
const ok = (result, label) => { assert.equal(result.error, null, `${label}: ${result.error?.code ?? 'request error'}`); return result.data; };
let client, original, restoreNeeded = false;
async function snapshot(id) {
  return {
    profile: ok(await client.from('profiles').select('name,bio,mode,onboarded,photo_url').eq('id', id).single(), 'Owner profile read'),
    private: ok(await client.from('profile_private').select('full_name,birth_date,phone,agency_name,adult_confirmed_at').eq('profile_id', id).single(), 'Owner private read'),
    lifestyle: ok(await client.from('profile_lifestyle').select('facts,disclosed_fields,revision,taxonomy_version').eq('profile_id', id).single(), 'Owner canonical read'),
    preferences: ok(await client.from('profile_lifestyle_private').select('preferences').eq('profile_id', id).single(), 'Owner preference read'),
  };
}
function args(dob, revision, key = randomUUID()) {
  return { p_name: original.private.full_name, p_birth_date: dob, p_phone: original.private.phone ?? '', p_bio: original.profile.bio,
    p_facts: original.lifestyle.facts, p_preferences: original.preferences.preferences, p_disclosed_fields: original.lifestyle.disclosed_fields,
    p_complete: true, p_expected_revision: revision, p_request_key: key };
}
async function restore(id) {
  const current = await snapshot(id);
  const result = ok(await client.rpc('save_resident_profile', args(original.private.birth_date, current.lifestyle.revision)), 'Restore original fixture DOB');
  assert.equal(result.revision, original.lifestyle.revision + 2);
  const after = await snapshot(id);
  assert.deepEqual(after.profile, original.profile); assert.deepEqual(after.private, original.private);
  assert.deepEqual(after.preferences, original.preferences);
  assert.deepEqual({ ...after.lifestyle, revision: original.lifestyle.revision }, original.lifestyle);
  restoreNeeded = false; report.restored_original_dob = true; report.revision_after = result.revision;
}
try {
  const rows = JSON.parse(await readFile(at('.env.profile-qa.local'), 'utf8'));
  const run = JSON.parse(await readFile(at('.qa/profile/run.json'), 'utf8'));
  const clock = JSON.parse(await readFile(at('.qa/profile/server-age-clock.json'), 'utf8'));
  const env = Object.fromEntries((await readFile(at('.env.local'), 'utf8')).split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const n = line.indexOf('='); return [line.slice(0, n), line.slice(n + 1).replace(/^['"]|['"]$/g, '')]; }));
  assert.equal(run.target, 'https://npbduvjnqnbydolmdpsc.supabase.co'); assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, run.target); assert.equal(clock.target, run.target);
  assert.deepEqual(rows.map(row => row.id), run.ids); assert.equal(rows.length, 9);
  assert.ok(Date.now() - Date.parse(clock.observed_at) >= 0 && Date.now() - Date.parse(clock.observed_at) < 3600000, 'Fresh actual server-clock query evidence required');
  assert.match(clock.server_date, /^\d{4}-\d{2}-\d{2}$/); assert.match(clock.adult_cutoff, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(Date.parse(clock.adult_cutoff) + 86400000).toISOString().slice(0, 10), clock.next_day);
  const account = rows[5]; assert.equal(account.email, `qa-profile-${account.id}@example.invalid`); assert.ok(account.password);
  report.target = run.target; report.fixture_id = account.id;
  report.server_clock_evidence = { observed_at: clock.observed_at, server_date: clock.server_date, adult_cutoff: clock.adult_cutoff, next_day: clock.next_day, source: 'Read-only PostgreSQL current_date and interval query' };
  client = createClient(run.target, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.equal(ok(await client.auth.signInWithPassword({ email: account.email, password: account.password }), 'Exact fixture sign-in').user.id, account.id);
  original = await snapshot(account.id); report.revision_before = original.lifestyle.revision;
  assert.equal(original.profile.onboarded, true); assert.equal(original.profile.mode, 'resident'); assert.ok(original.private.birth_date && original.private.full_name && original.profile.photo_url);
  assert.equal((await fetch(original.profile.photo_url)).status, 200, 'Retained actual photo available');
  const denied = await client.rpc('save_resident_profile', args(clock.next_day, original.lifestyle.revision));
  assert.ok(denied.error); assert.match(denied.error.message, /incomplete_resident/);
  assert.deepEqual(await snapshot(account.id), original, 'Day after server cutoff rejection causes zero mutation');
  report.checks.push('DOB one day after actual server 18-year cutoff rejected with no profile/private/facts/preferences/revision mutation');
  const key = randomUUID();
  const accepted = ok(await client.rpc('save_resident_profile', args(clock.adult_cutoff, original.lifestyle.revision, key)), 'Exact server 18-year cutoff accepted');
  restoreNeeded = true;
  assert.deepEqual(accepted, { revision: original.lifestyle.revision + 1, onboarded: true });
  const boundary = await snapshot(account.id); assert.equal(boundary.private.birth_date, clock.adult_cutoff);
  assert.deepEqual(boundary.profile, original.profile); assert.deepEqual(boundary.preferences, original.preferences);
  assert.deepEqual({ ...boundary.private, birth_date: original.private.birth_date }, original.private);
  assert.deepEqual({ ...boundary.lifestyle, revision: original.lifestyle.revision }, original.lifestyle);
  assert.deepEqual(ok(await client.rpc('save_resident_profile', args(clock.adult_cutoff, original.lifestyle.revision, key)), 'Exact boundary request retry'), accepted);
  report.checks.push('DOB exactly at actual server 18-year cutoff accepted; exact request-key retry returns same revision');
  await restore(account.id);
  report.checks.push('Original DOB/name/bio/photo/facts/preferences/disclosure retained unchanged; revision increased exactly twice');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = { name: error.name, code: error.code ?? null };
  console.error('Canonical age-boundary acceptance failed; inspect ignored safe report.'); process.exitCode = 1;
} finally {
  if (restoreNeeded && original && client) {
    try { await restore(report.fixture_id); } catch { report.restore_failed = true; console.error('Original fixture DOB restoration needs owner recovery; no other fixtures touched.'); process.exitCode = 1; }
  }
  report.finished_at = new Date().toISOString();
  await writeFile(at('.qa/profile/age-boundary.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  if (client) await client.auth.signOut().catch(() => {});
  if (report.status === 'passed') console.log('Canonical ordinary-client exact server 18-year boundary passed; original fixture DOB and profile restored, revision +2.');
}
