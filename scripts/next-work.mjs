// Read-only packet dispatch. Planning readiness is never completion evidence.
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname, posix, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

// Physical order is authoritative for an explicitly owner-dispatched micro-task queue.
export function parseMicroTasks(markdown) {
  return [...markdown.matchAll(/^- \[([ xX])\] \*\*משימה (\d+\.\d+): ([^\r\n]+)\*\*\r?$/gm)]
    .map((match) => ({ id: match[2], done: match[1].toLowerCase() === 'x', title: match[3] }));
}

// The approved demo queue stays in physical checklist order, not packet resume order.
export function parseDemonstrationTasks(markdown) {
  const start = markdown.indexOf('## שלב א׳');
  const end = markdown.indexOf('## שלב ב׳', start);
  if (start < 0 || end < 0) return [];
  let section;
  const tasks = [];
  for (const line of markdown.slice(start, end).split(/\r?\n/)) {
    if (line.startsWith('### ')) section = line.match(/SL\d+(?:\.\d+)?/)?.[0];
    for (const task of parseMicroTasks(line)) tasks.push({ ...task, section });
  }
  return tasks;
}

export function validateExecution(manifest, ledger) {
  const errors = [];
  const ids = new Set(manifest.packets.map((p) => p.id));
  const allowed = ['pending', 'in-progress', 'verification-incomplete', 'blocked', 'verified'];
  if (!Array.isArray(ledger.priority) || ledger.priority.length !== ids.size || new Set(ledger.priority).size !== ids.size || ledger.priority.some((id) => !ids.has(id))) errors.push('Priority must contain every packet exactly once');
  for (const id of Object.keys(ledger.packets ?? {})) if (!ids.has(id)) errors.push(`Unknown execution packet ${id}`);
  const dispatch = ledger.micro_task_dispatch;
  if (dispatch) {
    if (dispatch.plan !== 'implementation_plan.md' || !ids.has(dispatch.packet) || !dispatch.reason ||
        !/^\d+\.\d+$/.test(dispatch.after_task ?? '') || !Array.isArray(dispatch.task_ids) || !dispatch.task_ids.length ||
        new Set(dispatch.task_ids).size !== dispatch.task_ids.length || dispatch.task_ids.some((id) => !/^\d+\.\d+$/.test(id))) {
      errors.push('Invalid owner micro-task dispatch');
    }
  }
  if (ledger.checklist_continuation && (ledger.checklist_continuation.plan !== 'implementation_plan.md' || ledger.checklist_continuation.stage !== 'A')) errors.push('Invalid checklist continuation');
  const override = ledger.owner_priority_override;
  if (override?.status === 'ready' && (!/^\d+\.\d+$/.test(override.task ?? '') || !override.scope || !override.issue || !/^docs\/workstreams\/[A-Za-z0-9_.-]+\.md$/.test(override.handoff ?? ''))) errors.push('Ready owner priority requires task, issue, scope and handoff');
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

export function chooseNext(manifest, ledger, checklist, demonstrationTasks) {
  const byId = new Map(manifest.packets.map((p) => [p.id, p]));
  const eligible = (id) => byId.get(id).state === 'ready' && byId.get(id).depends_on.every((dep) => ledger.packets[dep].status === 'verified');
  const override = ledger.owner_priority_override;
  if (override?.status === 'ready') {
    const selected = checklist?.filter((task) => task.id === override.task);
    if (selected?.length !== 1 || selected[0].done || !override.scope || !override.issue || !override.handoff) return { action: 'blocked', packet: null, reason: 'Ready owner-priority task is missing, duplicated, completed or unscoped; reconcile its evidence.' };
    return { action: 'owner-priority', packet: null, task: override.task, issue: override.issue, scope: override.scope, handoff: override.handoff,
      note: 'Explicit owner-approved subset; check actual task prerequisites/target/ownership. This does not verify or waive its parent packet.' };
  }
  const dispatch = ledger.micro_task_dispatch;
  if (dispatch) {
    if (!checklist || new Set(checklist.map((task) => task.id)).size !== checklist.length ||
        !checklist.some((task) => task.id === dispatch.after_task) ||
        dispatch.task_ids.some((id) => !checklist.some((task) => task.id === id)) ||
        checklist.filter((task) => dispatch.task_ids.includes(task.id)).map((task) => task.id).join(',') !== dispatch.task_ids.join(',')) {
      return { action: 'blocked', packet: null, reason: 'Owner micro-task checklist missing, duplicated or inconsistent with dispatch; reconcile without guessing.' };
    }
    const unfinished = dispatch.task_ids.some((id) => !checklist.find((task) => task.id === id).done);
    if (unfinished) {
      const next = checklist.find((task) => !task.done);
      if (!checklist.find((task) => task.id === dispatch.after_task).done || !dispatch.task_ids.includes(next?.id)) {
        return { action: 'finish-current-micro-task', packet: null, task: next?.id ?? null, plan: dispatch.plan,
          note: 'Preserve the preceding unfinished checklist task; do not interrupt or skip it.' };
      }
      if (!eligible(dispatch.packet) || ['blocked', 'verified'].includes(ledger.packets[dispatch.packet].status)) {
        return { action: 'blocked', packet: dispatch.packet, task: next.id,
          reason: 'Owner-priority packet is blocked, prematurely verified, or has unmet prerequisites; no queue bypass.' };
      }
      return { action: 'micro-task', packet: dispatch.packet, task: next.id, plan: dispatch.plan,
        prerequisites: byId.get(dispatch.packet).depends_on,
        note: 'Verify the selected task within a bounded outcome; publish under standing authorization and continue the approved queue. Stop for a blocker/new decision. Parent evidence gaps remain open.' };
    }
    if (ledger.packets[dispatch.packet].status !== 'verified') {
      return { action: 'reconcile-micro-task-evidence', packet: dispatch.packet,
        note: 'All milestone boxes are checked; verify the bounded packet evidence before resuming the ordinary queue.' };
    }
  }
  if (ledger.checklist_continuation) {
    if (!demonstrationTasks?.length || new Set(demonstrationTasks.map((task) => task.id)).size !== demonstrationTasks.length ||
        demonstrationTasks.some((task) => !task.section || checklist?.filter((row) => row.id === task.id).length !== 1 || checklist.find((row) => row.id === task.id).done !== task.done)) {
      return { action: 'blocked', packet: null, reason: 'Stage A checklist is missing or inconsistent; no fallback to another queue.' };
    }
    const task = demonstrationTasks.find((task) => !task.done);
    if (!task) return { action: 'reconcile-demonstration-evidence', packet: null, note: 'All Stage A tasks checked; verify the combined demonstration before selecting further scope. No full-MVP completion inferred.' };
    const packet = byId.has(task.section) ? task.section : manifest.packets.find((row) => row.parent === task.section)?.id;
    if (!packet || !eligible(packet) || ledger.packets[packet].status === 'blocked') return { action: 'blocked', packet: packet ?? null, task: task.id,
      reason: 'Selected Stage A task needs its prerequisite artifacts/evidence reconciled; preserve checklist order.',
      missing_prerequisites: packet ? byId.get(packet).depends_on.filter((dep) => ledger.packets[dep].status !== 'verified') : [] };
    return { action: 'micro-task', packet, task: task.id, plan: ledger.checklist_continuation.plan,
      prerequisites: byId.get(packet).depends_on, note: 'Stage A physical order. Reuse existing verified behavior; task acceptance does not certify its full parent packet. Continue only after actual checks pass.' };
  }
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
  const plan = ledger.micro_task_dispatch || ledger.checklist_continuation || ledger.owner_priority_override?.status === 'ready'
    ? await readFile(resolve(root, 'implementation_plan.md'), 'utf8') : undefined;
  const checklist = plan ? parseMicroTasks(plan) : undefined;
  const next = chooseNext(manifest, ledger, checklist, plan ? parseDemonstrationTasks(plan) : undefined);
  if (process.argv.includes('--json')) console.log(JSON.stringify(next, null, 2));
  else {
    console.log(next.packet ? `${next.action.toUpperCase()} ${next.packet}` : next.action.toUpperCase());
    if (next.task) console.log(`Micro-task ${next.task} in ${next.plan ?? 'implementation_plan.md'}`);
    console.log('Read docs/START_NEXT_WORK.md; verify actual prerequisite artifacts/source before editing.');
    if (next.action === 'blocked') console.log(JSON.stringify(next.remaining, null, 2));
    if (next.reason) console.log(next.reason);
    if (next.note) console.log(next.note);
    console.log('Read-only selection; no claim, state update, implementation, merge or deployment performed.');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
