// Complete only the four approved retained Discover demos through their normal owner APIs.
// Credentials and upload receipts live in ignored .qa/demo-recovery; this script never uses an admin key.
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { DEMO_IDS, TARGET_REF } from './recover-demo-access.mjs';
import { withPoolLease } from './qa-pool.mjs';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const recoveryDir = join(webRoot, '.qa', 'demo-recovery');
const credentialPath = join(recoveryDir, 'credentials.json');
const receiptPath = join(recoveryDir, 'demo-content-receipts.json');
const portraitDir = join(webRoot, 'public', 'demo-content', 'portraits');
const REQUIRED_FACT_KEYS = ['cleanliness', 'sleep_schedule', 'guests', 'smoking'];
const ALLOWED_FACT_KEYS = new Set(['cleanliness', 'sleep_schedule', 'guests', 'household_noise', 'music_habits', 'climate', 'smoking', 'kitchen_rules', 'kitchen_other', 'grocery_sharing', 'cooking_habits', 'pets', 'pets_other', 'weekend_presence', 'overnight_guests', 'study_work_location', 'expense_style', 'extended_absences']);
const OWNED_PHOTO_PREFIX = `https://${TARGET_REF}.supabase.co/storage/v1/object/public/profile-photos/`;
class DemoContentError extends Error {}

// Every person is fictional, adult, and deliberately distinct. Phone is left blank unless
// the retained owner previously supplied one; it is private and is never reported.
export const DEMO_PEOPLE = Object.freeze([
  { id: DEMO_IDS[0], portrait: 'demo-portrait-01.png', name: 'Maya Levin', birthDate: '1999-04-18', bio: 'Graduate student who enjoys a calm, tidy home and the occasional shared dinner.', facts: { cleanliness: 'very_tidy', sleep_schedule: 'regular', guests: 'occasional', household_noise: 'quiet', music_habits: { answered: true, values: ['headphones'] }, climate: 'windows', smoking: 'none', kitchen_rules: 'no_special_rule', grocery_sharing: 'some_shared', cooking_habits: { answered: true, values: ['shared_meals', 'individual_cooking'] }, pets: { answered: true, values: [] }, weekend_presence: 'home', overnight_guests: 'rare', study_work_location: 'private_room', expense_style: 'equal', extended_absences: 'occasional' }, disclosed: ['cleanliness', 'sleep_schedule', 'guests', 'household_noise', 'smoking', 'cooking_habits'] },
  { id: DEMO_IDS[1], portrait: 'demo-portrait-02.png', name: 'Noam Bar', birthDate: '1997-09-03', bio: 'Software student looking for considerate roommates, good coffee, and clear shared-space routines.', facts: { cleanliness: 'tidy_shared', sleep_schedule: 'late', guests: 'rare', household_noise: 'moderate', music_habits: { answered: true, values: ['background_speakers'] }, climate: 'moderate_ac', smoking: 'none', kitchen_rules: 'kosher', grocery_sharing: 'separate', cooking_habits: { answered: true, values: ['meal_prep', 'takeaway'] }, pets: { answered: true, values: [] }, weekend_presence: 'away', overnight_guests: 'rare', study_work_location: 'outside', expense_style: 'discuss', extended_absences: 'not_expected' }, disclosed: ['cleanliness', 'sleep_schedule', 'guests', 'climate', 'smoking', 'kitchen_rules'] },
  { id: DEMO_IDS[2], portrait: 'demo-portrait-03.png', name: 'Tamar Shaham', birthDate: '2000-01-27', bio: 'Design student who values a warm shared home, respectful communication, and planning ahead.', facts: { cleanliness: 'tidy_shared', sleep_schedule: 'early', guests: 'occasional', household_noise: 'quiet', music_habits: { answered: true, values: ['social_music'] }, climate: 'flexible', smoking: 'outdoors_only', kitchen_rules: 'no_special_rule', grocery_sharing: 'shared', cooking_habits: { answered: true, values: ['shared_meals'] }, pets: { answered: true, values: ['cat'] }, weekend_presence: 'varies', overnight_guests: 'occasional', study_work_location: 'shared_space', expense_style: 'equal', extended_absences: 'occasional' }, disclosed: ['cleanliness', 'sleep_schedule', 'guests', 'music_habits', 'smoking', 'pets'] },
  { id: DEMO_IDS[3], portrait: 'demo-portrait-04.png', name: 'Eitan Cohen', birthDate: '1998-06-11', bio: 'Engineering student who likes a relaxed home, quiet study time, and practical agreements on costs.', facts: { cleanliness: 'relaxed', sleep_schedule: 'regular', guests: 'frequent', household_noise: 'lively', music_habits: { answered: true, values: ['headphones', 'social_music'] }, climate: 'cool_ac', smoking: 'none', kitchen_rules: 'no_special_rule', grocery_sharing: 'some_shared', cooking_habits: { answered: true, values: ['individual_cooking', 'takeaway'] }, pets: { answered: false }, weekend_presence: 'home', overnight_guests: 'occasional', study_work_location: 'private_room', expense_style: 'usage', extended_absences: 'frequent' }, disclosed: ['cleanliness', 'sleep_schedule', 'guests', 'household_noise', 'smoking', 'expense_style'] },
]);

const nonBlank = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const photoPath = person => `${person.id}/demo-content-${person.portrait}`;
const photoUrl = person => `${OWNED_PHOTO_PREFIX}${photoPath(person)}`;

export function parseEnv(text) {
  return new Map(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    return !match || match[1].startsWith('#') ? [] : [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]];
  }));
}

export function exactTargetUrl(value) {
  let url; try { url = new URL(value); } catch { throw new DemoContentError('Target must be the approved Shutaf project URL.'); }
  if (url.protocol !== 'https:' || url.origin !== `https://${TARGET_REF}.supabase.co` || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new DemoContentError('Target must be the approved Shutaf project URL.');
  return url.origin;
}

export function mergeOwnerContent(person, state) {
  const facts = { ...person.facts, ...record(state.facts) };
  const disclosed = Array.isArray(state.disclosed) && state.disclosed.length
    ? state.disclosed.filter(key => typeof key === 'string' && ALLOWED_FACT_KEYS.has(key))
    : person.disclosed;
  return {
    name: nonBlank(state.fullName) ? state.fullName.trim() : person.name,
    birthDate: typeof state.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(state.birthDate) ? state.birthDate : person.birthDate,
    phone: typeof state.phone === 'string' ? state.phone : '',
    bio: nonBlank(state.bio) ? state.bio.trim() : person.bio,
    facts,
    preferences: record(state.preferences),
    disclosed,
  };
}

export function needsCanonicalSave(state, merged) {
  if (!state.onboarded || state.mode === 'lister' || !nonBlank(state.fullName) || !nonBlank(state.bio) || !state.birthDate) return true;
  if (REQUIRED_FACT_KEYS.some(key => !record(state.facts)[key])) return true;
  if (!(Array.isArray(state.disclosed) && state.disclosed.length)) return true;
  return Object.keys(merged.facts).some(key => !(key in record(state.facts)));
}

async function readSettings() {
  let text; try { text = await readFile(join(webRoot, '.env.local'), 'utf8'); } catch { throw new DemoContentError('Required local web/.env.local is missing.'); }
  const env = parseEnv(text); const url = exactTargetUrl(env.get('NEXT_PUBLIC_SUPABASE_URL'));
  if (!env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')) throw new DemoContentError('Required public Supabase settings are incomplete.');
  return { url, anonKey: env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') };
}

async function readJson(path, message) { try { return JSON.parse(await readFile(path, 'utf8')); } catch { throw new DemoContentError(message); } }
async function atomicJson(path, value) { const temp = `${path}.${process.pid}.${randomUUID()}.tmp`; await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' }); await rename(temp, path); }
async function exists(path) { try { await access(path); return true; } catch { return false; } }

function validateCredentials(value) {
  if (value?.target_ref !== TARGET_REF || !Array.isArray(value.accounts) || value.accounts.length !== DEMO_PEOPLE.length ||
      value.accounts.some((account, index) => account?.id !== DEMO_PEOPLE[index].id || typeof account.email !== 'string' || !/^demo-discover-.+@example\.invalid$/i.test(account.email) || typeof account.password !== 'string' || account.password.length < 32))
    throw new DemoContentError('Private credentials do not match exactly the approved retained demo cohort.');
  return value;
}
function validateReceipts(value) {
  if (value == null) return { version: 1, target_ref: TARGET_REF, accounts: {} };
  if (value.version !== 1 || value.target_ref !== TARGET_REF || !record(value.accounts) || Object.keys(value.accounts).some(id => !DEMO_IDS.includes(id)))
    throw new DemoContentError('Private demo-content receipts do not match the approved cohort.');
  return value;
}
async function portraitBytes(person) {
  const bytes = await readFile(join(portraitDir, person.portrait));
  const expected = ['9b8812ddc5daee4e7d2577511dd0b33b568bbb68ff54f3364f6654f965879679', '2659cba71ee560d523fab8991ebb648287cfaed0882b2bff99dc57f5ce70fcf0', 'bec5518a6993ac9d3775c62694cd714ae5e57da9540e525c57547f9ae994427b', 'a57678127f698f91ee4ae651246af5ffb3a38495b7c21dfa0302e9e9e5b7d17e'][DEMO_PEOPLE.indexOf(person)];
  if (bytes.length < 1024 || createHash('sha256').update(bytes).digest('hex') !== expected) throw new DemoContentError('Approved local portrait asset failed validation.');
  return bytes;
}
async function ownState(client, id) {
  const [profile, privateProfile, lifestyle, privateLifestyle, photos] = await Promise.all([
    client.from('profiles').select('id,name,bio,onboarded,mode,photo_url').eq('id', id).single(),
    client.from('profile_private').select('full_name,birth_date,phone').eq('profile_id', id).maybeSingle(),
    client.from('profile_lifestyle').select('facts,disclosed_fields,revision').eq('profile_id', id).maybeSingle(),
    client.from('profile_lifestyle_private').select('preferences').eq('profile_id', id).maybeSingle(),
    client.from('profile_photos').select('id,url,display_order').eq('profile_id', id).order('display_order').order('id'),
  ]);
  for (const result of [profile, privateProfile, lifestyle, privateLifestyle, photos]) if (result.error) throw new DemoContentError('Could not read the current owner profile state.');
  if (!profile.data || profile.data.id !== id) throw new DemoContentError('Owner profile identity did not match the approved cohort.');
  return { ...profile.data, fullName: privateProfile.data?.full_name ?? '', birthDate: privateProfile.data?.birth_date ?? null, phone: privateProfile.data?.phone ?? '', facts: lifestyle.data?.facts ?? {}, disclosed: lifestyle.data?.disclosed_fields ?? [], revision: lifestyle.data?.revision ?? 0, preferences: privateLifestyle.data?.preferences ?? {}, photos: photos.data ?? [] };
}
function isOwnedPhoto(id, url) { return typeof url === 'string' && url.startsWith(`${OWNED_PHOTO_PREFIX}${id}/`); }
async function ensurePhoto(client, person, state, receipts) {
  const existing = state.photos.find(photo => isOwnedPhoto(person.id, photo.url));
  if (existing) return { action: 'reused', url: existing.url, galleryId: existing.id };
  const path = photoPath(person); const url = photoUrl(person); const bytes = await portraitBytes(person);
  const upload = await client.storage.from('profile-photos').upload(path, bytes, { contentType: 'image/png', cacheControl: '31536000', upsert: false });
  if (upload.error && !/already exists|duplicate/i.test(upload.error.message ?? '')) throw new DemoContentError('Owner portrait upload failed.');
  const attachment = await client.from('profile_photos').insert({ profile_id: person.id, url, display_order: Math.min(0, ...state.photos.map(photo => photo.display_order ?? 0)) - 1 }).select('id,url').single();
  if (attachment.error || !attachment.data) {
    const prior = await client.from('profile_photos').select('id,url').eq('profile_id', person.id).eq('url', url).maybeSingle();
    if (prior.error || !prior.data) throw new DemoContentError('Owner gallery attachment failed.');
    receipts.accounts[person.id] = { portrait_path: path, gallery_id: prior.data.id, uploaded: false };
    await atomicJson(receiptPath, receipts); return { action: 'attached-existing', url, galleryId: prior.data.id };
  }
  receipts.accounts[person.id] = { portrait_path: path, gallery_id: attachment.data.id, uploaded: !upload.error };
  await atomicJson(receiptPath, receipts); return { action: upload.error ? 'attached-existing' : 'uploaded', url, galleryId: attachment.data.id };
}
async function completeOwner(client, person, receipts) {
  const state = await ownState(client, person.id);
  if (state.mode === 'lister') throw new DemoContentError('A retained demo is a completed lister and cannot be converted in this task.');
  const photo = await ensurePhoto(client, person, state, receipts);
  const current = await ownState(client, person.id);
  const merged = mergeOwnerContent(person, current);
  if (needsCanonicalSave(current, merged)) {
    const result = await client.rpc('save_resident_profile', { p_name: merged.name, p_birth_date: merged.birthDate, p_phone: merged.phone, p_bio: merged.bio, p_facts: merged.facts, p_preferences: merged.preferences, p_disclosed_fields: merged.disclosed, p_complete: true, p_expected_revision: current.revision, p_request_key: randomUUID() });
    if (result.error || !result.data?.onboarded) throw new DemoContentError('Owner canonical profile save failed.');
  }
  const finalState = await ownState(client, person.id);
  if (!finalState.onboarded || REQUIRED_FACT_KEYS.some(key => !record(finalState.facts)[key]) || !finalState.photos.some(item => isOwnedPhoto(person.id, item.url))) throw new DemoContentError('Owner profile did not reach the approved complete state.');
  return { photo_action: photo.action, saved: needsCanonicalSave(current, merged), photo_url: finalState.photo_url };
}
async function assertPublicAndPrivateBoundary(settings, credentials) {
  const outsiderAccount = credentials.accounts[0]; const client = createClient(settings.url, settings.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const signedIn = await client.auth.signInWithPassword({ email: outsiderAccount.email, password: outsiderAccount.password });
    if (signedIn.error || signedIn.data.user?.id !== outsiderAccount.id) throw new DemoContentError('Outsider ordinary sign-in failed.');
    const publicRows = await client.from('profiles_public').select('id,name,bio,photo_url,lifestyle_facts').in('id', DEMO_IDS);
    if (publicRows.error || publicRows.data?.length !== DEMO_IDS.length || publicRows.data.some(row => !row.photo_url || !row.bio || !row.name || !record(row.lifestyle_facts).cleanliness)) throw new DemoContentError('Public-safe projection did not contain all completed demos.');
    const forbidden = await Promise.all([
      client.from('profile_private').select('profile_id,birth_date,phone').in('profile_id', DEMO_IDS.filter(id => id !== outsiderAccount.id)),
      client.from('profile_lifestyle_private').select('profile_id,preferences').in('profile_id', DEMO_IDS.filter(id => id !== outsiderAccount.id)),
    ]);
    if (forbidden.some(result => result.error || (result.data?.length ?? 0) !== 0)) throw new DemoContentError('Outsider private-profile boundary was not preserved.');
    for (const row of publicRows.data) {
      const response = await fetch(`${row.photo_url}?demo_content_check=${randomUUID()}`, { cache: 'no-store' });
      if (!response.ok || Number(response.headers.get('content-length') ?? 0) === 0) throw new DemoContentError('A public-safe portrait could not be fetched.');
    }
    return { public_count: publicRows.data.length, private_denied: true };
  } finally { await client.auth.signOut({ scope: 'local' }).catch(() => {}); }
}

async function main(args) {
  if (args.length > 1 || !['dry-run', '--apply'].includes(args[0] ?? 'dry-run')) throw new DemoContentError('Usage: node scripts/ensure-demo-content.mjs [dry-run|--apply]');
  const primary = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: webRoot, encoding: 'utf8' }).split(/\r?\n/).find(line => line.startsWith('worktree '))?.slice(9);
  if (!primary || resolve(webRoot) !== resolve(primary, 'web')) throw new DemoContentError('Run retained demo content only from the primary checkout.');
  const settings = await readSettings(); const credentials = validateCredentials(await readJson(credentialPath, 'Private retained-demo credentials are unavailable.'));
  const mode = args[0] ?? 'dry-run';
  if (mode === 'dry-run') { console.log(`Dry run: target ${TARGET_REF}; exact approved identities ${credentials.accounts.length}; no profile, gallery, or Storage changes.`); return; }
  await mkdir(recoveryDir, { recursive: true }); const receipts = validateReceipts(await ((await exists(receiptPath)) ? readJson(receiptPath, 'Private demo-content receipts are invalid.') : Promise.resolve(null)));
  const summary = await withPoolLease(join(webRoot, '.qa', 'pool-leases'), { target: settings.url, ids: DEMO_IDS }, async () => {
    const outcomes = [];
    for (const person of DEMO_PEOPLE) {
      const account = credentials.accounts.find(item => item.id === person.id); const client = createClient(settings.url, settings.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      try {
        const signedIn = await client.auth.signInWithPassword({ email: account.email, password: account.password });
        if (signedIn.error || signedIn.data.user?.id !== person.id) throw new DemoContentError('An approved owner ordinary sign-in failed.');
        outcomes.push(await completeOwner(client, person, receipts));
      } finally { await client.auth.signOut({ scope: 'local' }).catch(() => {}); }
    }
    const boundary = await assertPublicAndPrivateBoundary(settings, credentials);
    return { outcomes, boundary };
  });
  console.log(JSON.stringify({ target_ref: TARGET_REF, profiles: summary.outcomes.map((outcome, index) => ({ id: DEMO_IDS[index], complete: true, photo: outcome.photo_action, saved: outcome.saved })), public_safe_count: summary.boundary.public_count, outsider_private_denied: summary.boundary.private_denied }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2)).catch(error => { console.error(error instanceof DemoContentError ? error.message : 'Demo content failed safely; inspect local state without exposing private data.'); process.exitCode = 1; });
