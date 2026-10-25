// Reusable QA identities are explicit; retained demo manifests are never adopted implicitly.
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePool(rows, run, target) {
  if (run?.purpose !== 'reusable-qa' || run.version !== 1) throw new Error('Not a dedicated reusable QA pool; retained demos need their own manifest.');
  if (run.target !== target) throw new Error('QA pool target differs from the current environment.');
  if (!/^[a-z0-9-]+$/.test(run.prefix ?? '') || !Array.isArray(rows) || rows.length < 1 || rows.length > 9 || new Set(rows.map(row => row.id)).size !== rows.length ||
      rows.some(row => !uuid.test(row.id) || row.email !== `${run.prefix}-${row.id}@example.invalid` || typeof row.password !== 'string' || !row.password) ||
      JSON.stringify(run.ids) !== JSON.stringify(rows.map(row => row.id))) throw new Error('QA pool identity manifest mismatch.');
  const actors = Object.entries(run.actors ?? {});
  if (actors.length !== rows.length || actors.some(([name, id]) => !/^[a-z][a-z0-9_-]{0,39}$/.test(name) || !run.ids.includes(id)) ||
      new Set(actors.map(([, id]) => id)).size !== rows.length) throw new Error('QA pool actors must name each exact identity once.');
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
