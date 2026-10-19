// Real Storage last-photo invariant; only the fresh single qa-photo-guard identity.
// Intentionally attempts deletion only of this isolated synthetic fixture's photo.
// If an object disappears despite metadata rollback, recover with a NEW owned path.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const at = path => new URL(`../${path}`, import.meta.url);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6E3sAAAAASUVORK5CYII=', 'base64');
const report = { started_at: new Date().toISOString(), status: 'running', checks: [], objects: [], recovery: null };
const ok = (result, label) => { assert.equal(result.error, null, `${label}: ${result.error?.code ?? 'request error'}`); return result.data; };
let client, account, primary, stage = 'target and fixture validation';
async function flush() { await writeFile(at('.qa/photo-guard/acceptance.json'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
async function bytes(url) {
  const response = await fetch(`${url}?qa=${randomUUID()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' } });
  return { status: response.status, matches: response.ok && Buffer.from(await response.arrayBuffer()).equals(png) };
}
async function upload(order = 0) {
  const path = `${account.id}/${randomUUID()}.png`;
  ok(await client.storage.from('profile-photos').upload(path, png, { contentType: 'image/png', cacheControl: '0' }), 'Real owned synthetic upload');
  const url = client.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
  const object = { path, url, gallery_id: null, retained: true }; report.objects.push(object); await flush();
  const row = ok(await client.from('profile_photos').insert({ profile_id: account.id, url, display_order: order }).select('id').single(), 'Attach owned object to gallery');
  object.gallery_id = row.id; assert.deepEqual(await bytes(url), { status: 200, matches: true }, 'Fresh uploaded bytes actually present');
  await flush(); return object;
}
async function recover(bad) {
  report.recovery = { started_at: new Date().toISOString(), status: 'running' }; await flush();
  const replacement = await upload(-1); report.recovery.replacement_path = replacement.path;
  const profile = ok(await client.from('profiles').select('photo_url').eq('id', account.id).single(), 'Recovery primary read');
  assert.equal(profile.photo_url, replacement.url, 'Replacement becomes primary before bad reference cleanup');
  if (bad.gallery_id) ok(await client.from('profile_photos').delete().eq('id', bad.gallery_id), 'Delete only bad gallery reference after replacement');
  const removal = await client.storage.from('profile-photos').remove([bad.path]);
  report.recovery.bad_object_cleanup_error_code = removal.error?.statusCode ?? removal.error?.status ?? null;
  bad.retained = false;
  assert.deepEqual(await bytes(replacement.url), { status: 200, matches: true });
  report.recovery.status = removal.error ? 'replacement_retained_cleanup_incomplete' : 'recovered';
  report.recovery.finished_at = new Date().toISOString(); await flush();
}
try {
  const accounts = JSON.parse(await readFile(at('.env.photo-guard-qa.local'), 'utf8'));
  const run = JSON.parse(await readFile(at('.qa/photo-guard/run.json'), 'utf8'));
  const env = Object.fromEntries((await readFile(at('.env.local'), 'utf8')).split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const n = line.indexOf('='); return [line.slice(0, n), line.slice(n + 1).replace(/^['"]|['"]$/g, '')]; }));
  assert.equal(accounts.length, 1); assert.equal(run.target, 'https://npbduvjnqnbydolmdpsc.supabase.co'); assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, run.target);
  assert.deepEqual(accounts.map(row => row.id), run.ids); account = accounts[0]; assert.equal(account.email, `qa-photo-guard-${account.id}@example.invalid`); assert.ok(account.password);
  report.target = run.target; report.fixture_id = account.id;
  client = createClient(run.target, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.equal(ok(await client.auth.signInWithPassword({ email: account.email, password: account.password }), 'Sign in isolated fixture').user.id, account.id);
  const original = ok(await client.from('profiles').select('onboarded').eq('id', account.id).single(), 'Own pristine profile');
  assert.equal(original.onboarded, false, 'Never reuse an already retained completed demo');
  assert.equal(ok(await client.from('profile_photos').select('id').eq('profile_id', account.id), 'Own pristine gallery').length, 0);
  assert.equal(ok(await client.from('profile_lifestyle').select('revision').eq('profile_id', account.id), 'Own pristine canonical state').length, 0);
  stage = 'real photo upload and canonical completion'; primary = await upload();
  const completed = ok(await client.rpc('save_resident_profile', {
    p_name: 'Isolated Photo Guard Demo', p_birth_date: '2000-01-01', p_phone: '', p_bio: 'Synthetic isolated Storage deletion guard fixture retained for inspection.',
    p_facts: { cleanliness: 'tidy_shared', sleep_schedule: 'regular', guests: 'rare', smoking: 'none' }, p_preferences: {}, p_disclosed_fields: ['cleanliness'], p_complete: true, p_expected_revision: 0, p_request_key: randomUUID(),
  }), 'Complete resident with sole real photo');
  assert.deepEqual(completed, { revision: 1, onboarded: true }); report.checks.push('Actual owned PNG upload/gallery/fetch and strict canonical completion'); await flush();
  stage = 'last gallery row deletion';
  const galleryDelete = await client.from('profile_photos').delete().eq('id', primary.gallery_id).select('id');
  report.gallery_delete_denied = Boolean(galleryDelete.error);
  const galleryAfter = ok(await client.from('profile_photos').select('id,url').eq('profile_id', account.id), 'Gallery after denied deletion');
  if (!galleryDelete.error || !galleryAfter.some(row => row.id === primary.gallery_id)) {
    report.status = 'failed'; report.failed_invariant = 'Last gallery row deletion was not denied atomically';
    await recover(primary); throw new Error('Gallery guard failure');
  }
  assert.match(galleryDelete.error.message, /photo_required/); report.checks.push('Direct last gallery DELETE denied and original row retained'); await flush();
  stage = 'last Storage object deletion';
  const storageDelete = await client.storage.from('profile-photos').remove([primary.path]);
  report.storage_delete_denied = Boolean(storageDelete.error);
  report.storage_error_status = storageDelete.error?.statusCode ?? storageDelete.error?.status ?? null;
  report.storage_error_message = storageDelete.error?.message?.slice(0, 500) ?? null;
  const afterBytes = await bytes(primary.url); report.post_delete_cache_busted_fetch = afterBytes;
  const finalGallery = ok(await client.from('profile_photos').select('id,url').eq('profile_id', account.id), 'Gallery after Storage API delete');
  report.gallery_preserved_after_storage = finalGallery.some(row => row.id === primary.gallery_id && row.url === primary.url);
  if (!afterBytes.matches) {
    report.status = 'failed'; report.failed_invariant = 'Storage API deleted physical blob despite metadata guard/rollback'; await flush();
    await recover(primary); throw new Error('Storage physical object guard failure');
  }
  assert.ok(storageDelete.error, 'Storage API must reject deleting sole canonical photo');
  assert.ok(report.gallery_preserved_after_storage, 'Metadata/gallery reference remains unchanged');
  const profile = ok(await client.from('profiles').select('photo_url,onboarded').eq('id', account.id).single(), 'Retained final profile');
  assert.equal(profile.photo_url, primary.url); assert.equal(profile.onboarded, true);
  report.checks.push('Direct Storage.remove last object denied; cache-busted exact PNG bytes, gallery and primary still present');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failed_stage = stage; report.failure = { name: error.name, code: error.code ?? null };
  console.error(`Isolated photo guard acceptance failed at ${stage}; exact safe report includes recovery outcome. No previous fixture touched.`); process.exitCode = 1;
} finally {
  report.finished_at = new Date().toISOString(); await flush();
  if (client) await client.auth.signOut().catch(() => {});
  if (report.status === 'passed') console.log('Isolated real Storage last-photo guard passed; owned PNG still present after denied gallery and Storage API deletions. Exact demo retained.');
}
