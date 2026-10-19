// Read-only packet dispatch. Planning readiness is never completion evidence.
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname, posix, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateExecution(manifest, ledger) {
  const errors = [];
  const ids = new Set(manifest.packets.map((p) => p.id));
  const allowed = ['pending', 'in-progress', 'verification-incomplete', 'blocked', 'verified'];
  if (!Array.isArray(ledger.priority) || ledger.priority.length !== ids.size || new Set(ledger.priority).size !== ids.size || ledger.priority.some((id) => !ids.has(id))) errors.push('Priority must contain every packet exactly once');
  for (const id of Object.keys(ledger.packets ?? {})) if (!ids.has(id)) errors.push(`Unknown execution packet ${id}`);
  for (const id of ids) {
    const row = ledger.packets?.[id];
    if (!row || !allowed.includes(row.status)) { errors.push(`${id}: missing/invalid execution status`); continue; }
    if (row.status === 'blocked' && (!row.reason || !row.revisit_when)) errors.push(`${id}: blocked requires reason and revisit condition`);
    if (['in-progress', 'verification-incomplete'].includes(row.status) && (!row.handoff || !row.worktree)) errors.push(`${id}: active work requires handoff and worktree`);
    if (row.status === 'verified') {
      if (!row.handoff || !/^\d{4}-\d{2}-\d{2}T/.test(row.verified_at ?? '') || !row.outcome || !row.checks?.length || row.checks.some((c) => !c.command_or_scenario || c.result !== 'passed')) errors.push(`${id}: verified requires dated handoff, outcome and passed checks`);
      // Evidence may come from another OS; preserve its original absolute path.
      const absoluteWorktree = typeof row.worktree === 'string' && (posix.isAbsolute(row.worktree) || win32.isAbsolute(row.worktree));
      if (!/^[a-f0-9]{40}$/.test(row.source_sha ?? '') || !absoluteWorktree || !/^(clean|[a-f0-9]{64})$/.test(row.diff_sha256 ?? '')) errors.push(`${id}: verified requires exact source SHA, absolute worktree and clean/diff SHA256`);
      for (const dep of manifest.packets.find((p) => p.id === id).depends_on) if (ledger.packets?.[dep]?.status !== 'verified') errors.push(`${id}: verified with unverified prerequisite ${dep}`);
    }
    if (row.handoff && (!/^docs\/workstreams\/[A-Za-z0-9_.-]+\.md$/.test(row.handoff))) errors.push(`${id}: handoff must be a local workstream Markdown path`);
  }
  return errors;
}

export function chooseNext(manifest, ledger) {
  const byId = new Map(manifest.packets.map((p) => [p.id, p]));
  const eligible = (id) => byId.get(id).state === 'ready' && byId.get(id).depends_on.every((dep) => ledger.packets[dep].status === 'verified');
  for (const status of ['in-progress', 'verification-incomplete']) {
    const id = ledger.priority.find((id) => ledger.packets[id].status === status && eligible(id));
    if (id) return { action: 'resume', packet: id, record: ledger.packets[id], prerequisites: byId.get(id).depends_on };
  }
  const id = ledger.priority.find((id) => ledger.packets[id].status === 'pending' && eligible(id));
  if (id) return { action: 'start', packet: id, prerequisites: byId.get(id).depends_on };
  if (ledger.priority.every((id) => ledger.packets[id].status === 'verified')) return { action: 'local-plan-complete', packet: null, note: 'Reconcile integrated artifacts and actual pilot acceptance; no automatic release/publication.' };
  return { action: 'blocked', packet: null, remaining: ledger.priority.filter((id) => ledger.packets[id].status !== 'verified').map((id) => ({ id, ...ledger.packets[id], missing_prerequisites: byId.get(id).depends_on.filter((dep) => ledger.packets[dep].status !== 'verified') })) };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(await readFile(resolve(root, 'docs/planning/packets.json'), 'utf8'));
  const ledger = JSON.parse(await readFile(resolve(root, 'docs/planning/execution-state.json'), 'utf8'));
  const errors = validateExecution(manifest, ledger);
  for (const [id, row] of Object.entries(ledger.packets)) if (row.handoff) {
    try { await access(resolve(root, row.handoff)); } catch { errors.push(`${id}: missing handoff file`); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const next = chooseNext(manifest, ledger);
  if (process.argv.includes('--json')) console.log(JSON.stringify(next, null, 2));
  else {
    console.log(next.packet ? `${next.action.toUpperCase()} ${next.packet}` : next.action.toUpperCase());
    console.log('Read docs/START_NEXT_WORK.md; verify actual prerequisite artifacts/source before editing.');
    if (next.action === 'blocked') console.log(JSON.stringify(next.remaining, null, 2));
    if (next.note) console.log(next.note);
    console.log('Read-only selection; no claim, state update, implementation, merge or deployment performed.');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
