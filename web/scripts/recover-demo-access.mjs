// One-time, exact-ID recovery for the four retained synthetic Discover demos.
// A secret key is read only from ignored .qa/demo-recovery/admin.env; never import this from app code.
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { withPoolLease } from './qa-pool.mjs';

export const TARGET_REF = 'npbduvjnqnbydolmdpsc';
export const DEMO_IDS = Object.freeze([1, 2, 3, 4].map(n => `de100001-0000-4000-8000-${String(n).padStart(12, '0')}`));
const EMAIL_MARKER = /^demo-discover-.+@example\.invalid$/i;
const MANIFEST_VERSION = 1;
class RecoveryError extends Error {}

function exactTargetUrl(value, ref = TARGET_REF) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new RecoveryError('Supabase URL is missing or invalid.'); }
  if (ref !== TARGET_REF || parsed.protocol !== 'https:' || parsed.origin !== `https://${TARGET_REF}.supabase.co` || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)
    throw new RecoveryError('Target must be the approved Shutaf project URL.');
  return parsed.origin;
}

function parseEnv(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    entries.set(match[1], match[2].replace(/^(['"])(.*)\1$/, '$2'));
  }
  return entries;
}

export function createPreparedManifest(passwords, createdAt = new Date().toISOString()) {
  if (!Array.isArray(passwords) || passwords.length !== DEMO_IDS.length || passwords.some(p => typeof p !== 'string' || p.length < 32))
    throw new RecoveryError('Prepared recovery credentials are invalid.');
  return {
    version: MANIFEST_VERSION,
    purpose: 'retained-demo-access-recovery',
    target_ref: TARGET_REF,
    ids: [...DEMO_IDS],
    created_at: createdAt,
    accounts: DEMO_IDS.map((id, i) => ({ id, password: passwords[i], status: 'prepared' })),
  };
}

export function validateManifest(manifest) {
  if (manifest?.version !== MANIFEST_VERSION || manifest.purpose !== 'retained-demo-access-recovery' ||
      manifest.target_ref !== TARGET_REF || JSON.stringify(manifest.ids) !== JSON.stringify(DEMO_IDS) ||
      !Array.isArray(manifest.accounts) || manifest.accounts.length !== DEMO_IDS.length ||
      manifest.accounts.some((account, i) => account?.id !== DEMO_IDS[i] || typeof account.password !== 'string' || account.password.length < 32 ||
        !['prepared', 'updated', 'verified'].includes(account.status) ||
        (account.email !== undefined && (typeof account.email !== 'string' || !EMAIL_MARKER.test(account.email)))))
    throw new RecoveryError('Recovery manifest must contain exactly the four approved retained demos.');
  return manifest;
}

export async function applyPreparedRecovery({ targetUrl, expectedRef, manifest, admin, createSignInClient, saveManifest }) {
  const url = exactTargetUrl(targetUrl, expectedRef);
  validateManifest(manifest);
  if (!admin?.getUserById || !admin?.updateUserById || typeof createSignInClient !== 'function' || typeof saveManifest !== 'function')
    throw new RecoveryError('Recovery services are unavailable.');

  // Resolve and validate all four identities before the first password update.
  const users = [];
  for (const id of DEMO_IDS) {
    let result;
    try { result = await admin.getUserById(id); } catch { throw new RecoveryError('Could not preflight the exact synthetic identities.'); }
    const user = result?.data?.user;
    if (result?.error || user?.id !== id || typeof user.email !== 'string' || !EMAIL_MARKER.test(user.email))
      throw new RecoveryError('Identity preflight failed; no password updates were attempted.');
    users.push({ id, email: user.email });
  }
  for (let i = 0; i < users.length; i++) manifest.accounts[i].email = users[i].email;
  await saveManifest(manifest);

  for (const account of manifest.accounts) {
    // A crash after Auth accepted an update but before checkpointing is recovered by
    // testing the prepared credential first; never blindly update an already-working one.
    const verifyLogin = async () => {
      const client = createSignInClient(url);
      try {
        const result = await client.auth.signInWithPassword({ email: account.email, password: account.password });
        return !result.error && result.data?.user?.id === account.id;
      } catch { return false; }
      finally { try { await client.auth.signOut({ scope: 'local' }); } catch { /* local session cleanup only */ } }
    };
    if (await verifyLogin()) {
      if (account.status !== 'verified') { account.status = 'verified'; await saveManifest(manifest); }
      continue;
    }
    if (account.status === 'updated' || account.status === 'verified')
      throw new RecoveryError('A checkpointed credential failed ordinary sign-in; stopped without resetting it again.');
    let update;
    try { update = await admin.updateUserById(account.id, { password: account.password }); }
    catch { throw new RecoveryError('Auth password recovery failed; manifest checkpoint retained for safe resume.'); }
    if (update?.error || update?.data?.user?.id !== account.id)
      throw new RecoveryError('Auth password recovery failed; manifest checkpoint retained for safe resume.');
    account.status = 'updated';
    await saveManifest(manifest);
    if (!(await verifyLogin())) throw new RecoveryError('Ordinary sign-in verification failed; checkpoint retained and no repeat update will be attempted.');
    account.status = 'verified';
    await saveManifest(manifest);
  }
  return { target_ref: TARGET_REF, verified_count: manifest.accounts.filter(a => a.status === 'verified').length };
}

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const recoveryDir = join(webRoot, '.qa', 'demo-recovery');
const manifestPath = join(recoveryDir, 'credentials.json');
const adminEnvPath = join(recoveryDir, 'admin.env');
const exists = async path => { try { await access(path); return true; } catch { return false; } };
const atomicSave = async manifest => {
  const temp = `${manifestPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await rename(temp, manifestPath);
};

async function loadPublicSettings() {
  let text;
  try { text = await readFile(join(webRoot, '.env.local'), 'utf8'); } catch { throw new RecoveryError('Required local web/.env.local is missing.'); }
  const env = parseEnv(text);
  return { url: exactTargetUrl(env.get('NEXT_PUBLIC_SUPABASE_URL')), anonKey: env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') };
}

async function main(args) {
  const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: webRoot, encoding: 'utf8' });
  const primary = worktrees.split(/\r?\n/).find(line => line.startsWith('worktree '))?.slice(9);
  if (!primary || resolve(webRoot) !== resolve(primary, 'web')) throw new RecoveryError('Run retained demo recovery only from the primary checkout; do not create competing manifests.');
  const mode = args[0] ?? 'dry-run';
  if (!['dry-run', 'prepare', '--apply'].includes(mode) || args.length > 1) throw new RecoveryError('Usage: node scripts/recover-demo-access.mjs [dry-run|prepare|--apply]');
  const settings = await loadPublicSettings();
  if (!settings.anonKey) throw new RecoveryError('Required public Supabase settings are incomplete.');

  if (mode === 'prepare') {
    if (await exists(manifestPath)) throw new RecoveryError('Private recovery manifest already exists; refusing overwrite.');
    await mkdir(recoveryDir, { recursive: true });
    const passwords = DEMO_IDS.map(() => `${randomBytes(32).toString('base64url')}Aa1!`);
    const manifest = createPreparedManifest(passwords);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    console.log('Prepared credentials for exactly four approved demo IDs in ignored web/.qa/demo-recovery/credentials.json; no Auth changes made.');
    return;
  }
  if (!(await exists(manifestPath))) throw new RecoveryError('Prepare the private exact-four credentials manifest first.');
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  if (mode === 'dry-run') {
    console.log(`Dry run: target ${TARGET_REF}; exact approved identities ${manifest.accounts.length}; verified ${manifest.accounts.filter(a => a.status === 'verified').length}; no Auth changes.`);
    return;
  }

  let adminText;
  try { adminText = await readFile(adminEnvPath, 'utf8'); } catch { throw new RecoveryError('Missing local admin config: create ignored web/.qa/demo-recovery/admin.env with SUPABASE_PROJECT_REF and SUPABASE_SECRET_KEY.'); }
  const adminEnv = parseEnv(adminText);
  if (adminEnv.get('SUPABASE_PROJECT_REF') !== TARGET_REF || !adminEnv.get('SUPABASE_SECRET_KEY'))
    throw new RecoveryError('Admin config must bind SUPABASE_PROJECT_REF to the approved target and provide SUPABASE_SECRET_KEY.');
  const adminClient = createClient(settings.url, adminEnv.get('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await withPoolLease(join(webRoot, '.qa', 'pool-leases'), {target: settings.url, ids: DEMO_IDS}, () => applyPreparedRecovery({
    targetUrl: settings.url,
    expectedRef: adminEnv.get('SUPABASE_PROJECT_REF'),
    manifest,
    admin: {
      getUserById: id => adminClient.auth.admin.getUserById(id),
      updateUserById: (id, attributes) => adminClient.auth.admin.updateUserById(id, attributes),
    },
    createSignInClient: url => createClient(url, settings.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    saveManifest: atomicSave,
  }));
  console.log(`Recovery complete: ${result.verified_count} of four approved synthetic identities passed ordinary sign-in and local sign-out.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch(error => {
    // Never print SDK errors or configuration values; errors above are sanitized.
    console.error(error instanceof RecoveryError ? error.message : 'Demo recovery failed; inspect local files/connectivity privately. No configuration values were printed.');
    process.exitCode = 1;
  });
}
