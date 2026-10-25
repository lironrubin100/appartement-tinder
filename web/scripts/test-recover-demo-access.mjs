import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPreparedRecovery, createPreparedManifest, DEMO_IDS, TARGET_REF } from './recover-demo-access.mjs';

const targetUrl = `https://${TARGET_REF}.supabase.co`;
const emailFor = id => `demo-discover-${id.slice(-3)}@example.invalid`;
const freshManifest = () => createPreparedManifest(DEMO_IDS.map((_, i) => `SyntheticDemoPassword-${i}-SecureAa1!`), '2026-10-25T00:00:00.000Z');
const userFor = id => ({ id, email: emailFor(id) });

test('rejects a wrong target before identity reads or password updates', async () => {
  const manifest = freshManifest();
  let reads = 0;
  let updates = 0;
  await assert.rejects(applyPreparedRecovery({
    targetUrl: 'https://another-project.supabase.co', expectedRef: TARGET_REF, manifest,
    admin: { getUserById: async () => { reads++; }, updateUserById: async () => { updates++; } },
    createSignInClient() {}, saveManifest: async () => {},
  }), /approved Shutaf project URL/);
  assert.equal(reads, 0);
  assert.equal(updates, 0);
});

test('rejects any non-demo exact ID among the four before the first update', async () => {
  const manifest = freshManifest();
  let updates = 0;
  const admin = {
    async getUserById(id) {
      return { data: { user: userFor(id === DEMO_IDS[2] ? 'unapproved' : id) }, error: null };
    },
    async updateUserById() { updates++; return { data: {}, error: null }; },
  };
  await assert.rejects(applyPreparedRecovery({
    targetUrl, expectedRef: TARGET_REF, manifest, admin,
    createSignInClient() {}, saveManifest: async () => {},
  }), /Identity preflight failed/);
  assert.equal(updates, 0);
});

test('resumes a partial run without updating an already-working account again', async () => {
  const manifest = freshManifest();
  const passwords = new Map();
  const updateCalls = new Map();
  let failSecondUpdateOnce = true;
  const admin = {
    async getUserById(id) { return { data: { user: userFor(id) }, error: null }; },
    async updateUserById(id, attrs) {
      updateCalls.set(id, (updateCalls.get(id) ?? 0) + 1);
      if (id === DEMO_IDS[1] && failSecondUpdateOnce) {
        failSecondUpdateOnce = false;
        return { data: null, error: { name: 'AuthError' } };
      }
      passwords.set(id, attrs.password);
      return { data: { user: { id } }, error: null };
    },
  };
  const snapshots = [];
  const saveManifest = async value => snapshots.push(structuredClone(value));
  const createSignInClient = () => ({ auth: {
    async signInWithPassword({ email, password }) {
      const account = manifest.accounts.find(row => row.email === email);
      return account && passwords.get(account.id) === password
        ? { data: { user: { id: account.id } }, error: null }
        : { data: { user: null }, error: { name: 'AuthError' } };
    },
    async signOut(options) { assert.deepEqual(options, { scope: 'local' }); },
  } });
  const args = { targetUrl, expectedRef: TARGET_REF, manifest, admin, createSignInClient, saveManifest };

  await assert.rejects(applyPreparedRecovery(args), /Auth password recovery failed/);
  assert.equal(manifest.accounts[0].status, 'verified');
  assert.equal(manifest.accounts[1].status, 'prepared');
  assert.equal(updateCalls.get(DEMO_IDS[0]), 1);

  const result = await applyPreparedRecovery(args);
  assert.deepEqual(result, {
    target_ref: TARGET_REF,
    verified_count: 4,
    updated_count: 3,
    already_working_count: 1,
  });
  assert.equal(updateCalls.get(DEMO_IDS[0]), 1, 'verified first account was not reset again');
  assert.equal(updateCalls.get(DEMO_IDS[1]), 2, 'failed update retried once with the same prepared credential');
  assert.equal(manifest.accounts.every(row => row.status === 'verified'), true);
  assert.ok(snapshots.length >= 8, 'each progress checkpoint was persisted');
});


test('rejects alternate port and embedded credentials on the approved hostname', async () => {
  for (const url of [`https://${TARGET_REF}.supabase.co:8443`, `https://user:private@${TARGET_REF}.supabase.co`]) {
    let touched = false;
    await assert.rejects(applyPreparedRecovery({targetUrl: url, expectedRef: TARGET_REF, manifest: freshManifest(),
      admin: {getUserById: async () => { touched = true; }, updateUserById: async () => { touched = true; }},
      createSignInClient() {}, saveManifest: async () => { touched = true; }}), /approved Shutaf project URL/);
    assert.equal(touched, false);
  }
});

test('exact IDs with an unmarked email are rejected before any password update', async () => {
  let updates = 0;
  await assert.rejects(applyPreparedRecovery({targetUrl, expectedRef: TARGET_REF, manifest: freshManifest(),
    admin: {getUserById: async id => ({data: {user: {id, email: id === DEMO_IDS[3] ? 'person@example.com' : emailFor(id)}}}),
      updateUserById: async () => { updates++; }}, createSignInClient() {}, saveManifest: async () => {}}), /Identity preflight failed/);
  assert.equal(updates, 0);
});
