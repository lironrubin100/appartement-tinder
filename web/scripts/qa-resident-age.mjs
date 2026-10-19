import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

// Explicit ordinary-client acceptance. Mutates only this run's fixture index 4.
// Run only after the owning executor finishes concurrent browser acceptance.
const root = new URL('../', import.meta.url);
const at = path => new URL(path, root);
const report = { started_at: new Date().toISOString(), checks: [] };
let client;
function check(condition, label) {
  assert.ok(condition, label);
  report.checks.push({ scenario: label, result: 'passed' });
}
function yearsBeforeToday(years, today) {
  const year = today.getUTCFullYear() - years;
  const month = today.getUTCMonth();
  const day = Math.min(today.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
async function snapshot(id) {
  const profile = await client.from('profiles').select('name,mode,onboarded,bio').eq('id', id).single();
  const privateProfile = await client.from('profile_private').select('birth_date,phone,agency_name').eq('profile_id', id).single();
  assert.ok(!profile.error && !privateProfile.error, 'Read exact own fixture state');
  return { profile: profile.data, private: privateProfile.data };
}
try {
  const rows = JSON.parse(await readFile(at('.env.qa.local'), 'utf8'));
  const run = JSON.parse(await readFile(at('.qa/run.json'), 'utf8'));
  const envText = await readFile(at('.env.local'), 'utf8');
  const env = Object.fromEntries(envText.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const split = line.indexOf('=');
    return [line.slice(0, split), line.slice(split + 1).replace(/^['"]|['"]$/g, '')];
  }));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.equal(url, 'https://npbduvjnqnbydolmdpsc.supabase.co', 'Named authorized Shutaf target');
  assert.equal(run.target, url, 'Fixture target equals public environment target');
  assert.ok(key && Array.isArray(rows) && rows.length === 9 && Array.isArray(run.ids), 'Complete exact fixture manifest');
  assert.deepEqual(rows.map(row => row.id), run.ids, 'All manifest IDs match current run in order');
  const fixture = rows[4];
  assert.match(fixture.id, /^[0-9a-f-]{36}$/);
  assert.equal(fixture.email, `qa-resident-${fixture.id}@example.invalid`, 'Exact generated synthetic identity');
  assert.ok(fixture.password, 'Fixture has a private credential');
  report.target = url;
  report.fixture_id = fixture.id;
  report.fixture_index = 4;
  report.date_source = 'Current UTC date; no arbitrary SQL or privileged API';
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  check(!login.error && login.data.user?.id === fixture.id, 'Ordinary-client sign-in matches exact fixture ID');
  const initial = await snapshot(fixture.id);
  check(initial.profile.onboarded === false, 'Unused fixture is incomplete before age acceptance');
  const today = new Date();
  const age17 = yearsBeforeToday(17, today);
  const age18 = yearsBeforeToday(18, today);
  const age19 = yearsBeforeToday(19, today);
  report.utc_date = today.toISOString().slice(0, 10);
  report.boundary_birth_date = age18;
  const save = (birth, complete, name) => client.rpc('save_onboarding', {
    p_name: name, p_resident: true, p_birth_date: birth, p_phone: '',
    p_agency: '', p_bio: 'Synthetic retained age acceptance demo',
    p_tags: { cleanliness: 'clean' }, p_complete: complete,
  });
  const draftSave = await save(age17, false, 'Age acceptance draft');
  check(!draftSave.error, 'Age 17 draft saves successfully');
  const draft = await snapshot(fixture.id);
  check(draft.private.birth_date === age17 && !draft.profile.onboarded, 'Draft persists age 17 without completing');
  const underage = await save(age17, true, 'Rejected replacement');
  check(Boolean(underage.error) && /at least 18/.test(underage.error.message), 'Age 17 completion rejected by server age rule');
  assert.deepEqual(await snapshot(fixture.id), draft, 'Rejected completion leaves exact draft unchanged');
  report.checks.push({ scenario: 'Rejected completion leaves exact draft unchanged', result: 'passed' });
  const completed = await save(age18, true, 'Age acceptance demo');
  check(!completed.error, 'Exact 18th birthday completes successfully');
  const adult = await snapshot(fixture.id);
  check(adult.profile.onboarded && adult.profile.mode === 'resident' && adult.private.birth_date === age18, 'Adult resident completion persists');
  for (const [label, birth] of [['under 18', age17], ['null', null]]) {
    const update = await client.from('profile_private').update({ birth_date: birth }).eq('profile_id', fixture.id);
    check(Boolean(update.error) && /at least 18/.test(update.error.message), `Own direct DOB ${label} rejected by server`);
    assert.deepEqual(await snapshot(fixture.id), adult, 'Rejected direct DOB update preserves adult state');
  }
  const corrected = await client.from('profile_private').update({ birth_date: age19 }).eq('profile_id', fixture.id);
  check(!corrected.error && (await snapshot(fixture.id)).private.birth_date === age19, 'Own adult age 19 correction allowed and persists');
  report.result = 'passed';
  report.retained = true;
} catch (error) {
  report.result = 'failed';
  // Our assertion messages contain no credentials; never print raw provider objects.
  report.failure = error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Execution failed; inspect target/connectivity privately';
  process.exitCode = 1;
} finally {
  if (client) await client.auth.signOut({ scope: 'local' });
  report.finished_at = new Date().toISOString();
  await writeFile(at('.qa/age-acceptance.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(`Resident age ordinary-client acceptance: ${report.result}; ${report.checks.length} checks. Evidence: web/.qa/age-acceptance.json`);
}
