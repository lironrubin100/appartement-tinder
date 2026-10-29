// Task selection and local executor leases. Planning readiness is never completion evidence.
import { readFile, access, mkdir, open, unlink, writeFile } from 'node:fs/promises';
import { resolve, dirname, posix, win32, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Physical order is authoritative for an explicitly owner-dispatched micro-task queue.
export function parseMicroTasks(markdown) {
  return [...markdown.matchAll(/^- \[([ xX])\] \*\*משימה (\d+\.\d+): ([^\r\n]+)\*\*\r?$/gm)]
    .map((match) => ({ id: match[2], done: match[1].toLowerCase() === 'x', title: match[3] }));
}

// The approved demo queue stays in physical checklist order, not packet resume order.
export function parseStageTasks(markdown, stage = 'A') {
  return parseTaskCards(markdown).filter(task => task.stage === stage).map(task => ({...task, section: task.section.match(/SL\d+(?:\.\d+)?/)?.[0]}));
}
export const parseDemonstrationTasks = markdown => parseStageTasks(markdown, 'A');
export const executionStage = ledger => ledger.checklist_continuation?.stage === 'B' || ledger.checklist_continuation?.stage_acceptance?.A?.status === 'verified' ? 'B' : 'A';

export function validateExecution(manifest, ledger) {
  const errors = [];
  if (ledger.workflow_mode !== undefined && !['plan','build'].includes(ledger.workflow_mode)) errors.push('Workflow mode must be plan or build');
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
  if (ledger.checklist_continuation && (ledger.checklist_continuation.plan !== 'implementation_plan.md' || !['A', 'B'].includes(ledger.checklist_continuation.stage))) errors.push('Invalid checklist continuation');
  for (const [stage, gate] of Object.entries(ledger.checklist_continuation?.stage_acceptance ?? {})) {
    if (!['A', 'B'].includes(stage) || !['pending', 'verified'].includes(gate.status)) errors.push('Invalid stage acceptance');
    if (gate.status === 'verified' && (!/^[a-f0-9]{40}$/.test(gate.source_sha ?? '') || !/^docs\/workstreams\/[A-Za-z0-9_.-]+\.md$/.test(gate.handoff ?? '') || !/^\d{4}-\d{2}-\d{2}T/.test(gate.verified_at ?? '') || !gate.checks?.length || gate.checks.some(c => c.result !== 'passed' || !c.command_or_scenario))) errors.push(`${stage}: stage acceptance requires exact source and passed journey evidence`);
  }
  const override = ledger.owner_priority_override;
  if (override?.status === 'ready' && (!/^\d+\.\d+$/.test(override.task ?? '') || !override.scope || !override.issue || !/^docs\/workstreams\/[A-Za-z0-9_.-]+\.md$/.test(override.handoff ?? ''))) errors.push('Ready owner priority requires task, issue, scope and handoff');
  for (const [stage, receipts] of Object.entries(ledger.checklist_continuation?.prerequisite_artifacts ?? {})) {
    if (stage !== 'A' || !receipts || typeof receipts !== 'object' || Array.isArray(receipts)) {
      errors.push('Only Stage A supports bounded prerequisite artifacts'); continue;
    }
    for (const [id, receipt] of Object.entries(receipts)) {
      if (!stageArtifactValid(id, receipt, manifest, ledger)) errors.push(`${id}: invalid Stage A prerequisite artifact evidence`);
    }
  }
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

// A demonstration artifact is narrower than full-packet certification. It is
// usable only when explicitly bound to an already verified source packet and
// every Stage A checklist task of the predecessor has actually been accepted.
function stageArtifactValid(id, receipt, manifest, ledger, tasks) {
  const source = ledger.packets?.[receipt?.source_packet];
  if (!manifest.packets.some(p => p.id === id) || ledger.packets?.[id]?.status === 'blocked' ||
      !receipt || receipt.status !== 'verified' || receipt.source_packet === id || source?.status !== 'verified' ||
      !/^[a-f0-9]{40}$/.test(receipt.source_sha ?? '') || receipt.source_sha !== source.source_sha ||
      !/^docs\/workstreams\/[A-Za-z0-9_.-]+\.md$/.test(receipt.handoff ?? '') || receipt.handoff !== source.handoff ||
      !/^\d{4}-\d{2}-\d{2}T/.test(receipt.verified_at ?? '') || !Number.isFinite(Date.parse(receipt.verified_at)) ||
      typeof receipt.artifact !== 'string' || !receipt.artifact.trim() ||
      !Array.isArray(receipt.task_ids) || !receipt.task_ids.length || new Set(receipt.task_ids).size !== receipt.task_ids.length ||
      !Array.isArray(receipt.checks) || !receipt.checks.length || receipt.checks.some(c => !c?.command_or_scenario || c.result !== 'passed')) return false;
  if (tasks) {
    const required = tasks.filter(task => task.stage === 'A' && packetFor(task, manifest) === id);
    if (!required.length || required.some(task => !task.done) ||
        JSON.stringify(required.map(task => task.id)) !== JSON.stringify(receipt.task_ids)) return false;
  }
  return true;
}

function chooseBase(manifest, ledger, checklist, demonstrationTasks) {
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
    const stage = executionStage(ledger);
    if (stage === 'B' && ledger.checklist_continuation.stage_acceptance?.A?.status !== 'verified') return {action: 'blocked', packet: null, reason: 'Stage B requires recorded Stage A journey acceptance.'};
    if (!demonstrationTasks?.length || new Set(demonstrationTasks.map((task) => task.id)).size !== demonstrationTasks.length ||
        demonstrationTasks.some((task) => !task.section || checklist?.filter((row) => row.id === task.id).length !== 1 || checklist.find((row) => row.id === task.id).done !== task.done)) {
      return { action: 'blocked', packet: null, reason: 'Stage A checklist is missing or inconsistent; no fallback to another queue.' };
    }
    const task = demonstrationTasks.find((task) => !task.done);
    if (!task) return { action: stage === 'A' ? 'reconcile-demonstration-evidence' : 'reconcile-mvp-evidence', packet: null, note: `All Stage ${stage} tasks checked; verify its combined acceptance. Stage C is never automatic.` };
    const packet = packetFor({...task, stage}, manifest);
    const prerequisiteReady = dep => ledger.packets[dep].status === 'verified' || stage === 'A' &&
      stageArtifactValid(dep, ledger.checklist_continuation.prerequisite_artifacts?.A?.[dep], manifest, ledger, demonstrationTasks);
    if (!packet || byId.get(packet).state !== 'ready' || !byId.get(packet).depends_on.every(prerequisiteReady) || ledger.packets[packet].status === 'blocked') return { action: 'blocked', packet: packet ?? null, task: task.id,
      reason: `Selected Stage ${stage} task needs its prerequisite artifacts/evidence reconciled; preserve checklist order.`,
      missing_prerequisites: packet ? byId.get(packet).depends_on.filter(dep => !prerequisiteReady(dep)) : [] };
    return { action: 'micro-task', packet, task: task.id, plan: ledger.checklist_continuation.plan,
      ...(stage === 'A' ? {prerequisite_artifacts: Object.fromEntries(byId.get(packet).depends_on
        .filter(dep => ledger.packets[dep].status !== 'verified')
        .map(dep => [dep,ledger.checklist_continuation.prerequisite_artifacts.A[dep]]))} : {}),
      prerequisites: byId.get(packet).depends_on, note: `Stage ${stage} physical order. Reuse existing verified behavior; task acceptance does not certify its full parent packet. Continue only after actual checks pass.` };
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

export function chooseNext(manifest, ledger, checklist, stageTasks) {
  const next = chooseBase(manifest, ledger, checklist, stageTasks);
  return ['micro-task', 'owner-priority', 'finish-current-micro-task'].includes(next.action) ? atomicSelection(next, checklist ?? [], ledger) : next;
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
  const cards = plan ? parseTaskCards(plan) : [];
  const cardErrors = cards.length ? validateTaskCards(cards, manifest, ledger) : [];
  for (const [stage, gate] of Object.entries(ledger.checklist_continuation?.stage_acceptance ?? {})) if (gate.status === 'verified') {
    try { await access(resolve(root, gate.handoff)); } catch { cardErrors.push(`${stage}: missing stage acceptance handoff`); }
  }
  if (cardErrors.length) throw new Error(cardErrors.join('\n'));
  const next = chooseNext(manifest, ledger, checklist, plan ? parseStageTasks(plan, executionStage(ledger)) : undefined);
  if (process.argv.includes('--brief')) {
    const card = ['micro-task', 'owner-priority', 'finish-current-micro-task'].includes(next.action) && cards.find(task => task.id === next.task);
    const decisions = card ? await readFile(resolve(root, 'DECISIONS.md'), 'utf8') : '';
    console.log(JSON.stringify({...next, ...(card ? {brief: buildBrief(card, manifest, ledger, decisions)} : {})}, null, 2));
  } else if (process.argv.includes('--json')) console.log(JSON.stringify(next, null, 2));
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

// Derive bounded executor context from the single maintained checklist; never copy it.

const fields = ['קבצים לעריכה/יצירה', 'הוראות טכניות ברורות', 'קריטריון קבלה'];
export function parseTaskCards(markdown) {
  let stage, section = '', context = [], current;
  const tasks = [];
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (/^## שלב/.test(line)) { stage = line.includes('א׳') ? 'A' : line.includes('ב׳') ? 'B' : 'C'; current = undefined; }
    if (line.startsWith('### ')) { section = line.slice(4); context = []; current = undefined; }
    const match = line.match(/^- \[([ xX])\] \*\*משימה (\d+\.\d+): (.+)\*\*$/);
    if (match) {
      current = { id: match[2], done: match[1].toLowerCase() === 'x', title: match[3], stage, section, context: context.join('\n'), line: index + 1 };
      tasks.push(current);
    } else if (current) {
      for (const [i, field] of fields.entries()) {
        const prefix = `  - **${field}:**`;
        if (line.startsWith(prefix)) {
          const key = ['file_scope', 'instructions', 'acceptance'][i];
          if (current[key] !== undefined) throw new Error(`${current.id}: duplicate ${key}`);
          current[key] = line.slice(prefix.length).trim();
        }
      }
    } else if (line.trim() && !line.startsWith('#')) context.push(line);
  }
  return tasks;
}

export function packetFor(task, manifest) {
  const sections = [...task.section.matchAll(/SL\d+(?:\.\d+)?/g)].map(m => m[0]);
  if (sections.includes('SL04.2') || sections.includes('SL06.3')) return sections.find(id => manifest.packets.some(p => p.id === id));
  const domain = `SL${task.id.split('.')[0].padStart(2, '0')}`;
  const choices = manifest.packets.filter(p => p.parent === domain);
  if (choices.length === 1) return choices[0].id;
  const split = { SL00: ['SL00.1', 'SL00.2'], SL01: ['SL01.1', 'SL01.2'], SL08: ['SL08.1', 'SL08.2'], SL04: ['SL04.2', 'SL04.1'], SL06: ['SL06.1', 'SL06.2'] };
  return split[domain]?.[task.stage === 'A' ? 0 : 1];
}

export function validateTaskCards(tasks, manifest, ledger) {
  const errors = [], ids = new Set(tasks.map(t => t.id));
  if (!tasks.length || ids.size !== tasks.length) errors.push('Checklist is empty or has duplicate task IDs');
  for (const [id, receipt] of Object.entries(ledger.checklist_continuation?.prerequisite_artifacts?.A ?? {})) {
    if (!stageArtifactValid(id, receipt, manifest, ledger, tasks)) errors.push(`${id}: Stage A artifact requires all exact predecessor task IDs completed`);
  }
  for (const [stage, gate] of Object.entries(ledger.checklist_continuation?.stage_acceptance ?? {})) {
    if (gate.status === 'verified' && (!tasks.some(task => task.stage === stage) || tasks.some(task => task.stage === stage && !task.done))) errors.push(`${stage}: verified stage has unfinished or missing checklist tasks`);
  }
  for (const task of tasks) {
    if (!['A', 'B', 'C'].includes(task.stage) || !task.section) errors.push(`${task.id}: missing stage/section`);
    for (const key of ['file_scope', 'instructions', 'acceptance']) if (!task[key]) errors.push(`${task.id}: missing ${key}`);
    const paths = [...(task.file_scope ?? '').matchAll(/`([^`]+)`/g)].map(m => m[1]);
    if (!paths.length || paths.some(p => isAbsolute(p) || posix.isAbsolute(p) || win32.isAbsolute(p) || p.split(/[\\/]/).includes('..'))) errors.push(`${task.id}: scope must name contained relative files`);
    if (task.stage !== 'C' && !packetFor(task, manifest)) errors.push(`${task.id}: no packet mapping`);
  }
  const steps = ledger.atomic_dispatch?.steps ?? {};
  for (const [parent, children] of Object.entries(ledger.atomic_dispatch?.children ?? {})) {
    if (!ids.has(parent) || !children.length || new Set(children).size !== children.length || children.some(id => !ids.has(id) || id === parent)) errors.push(`${parent}: invalid atomic children`);
    if (tasks.find(t => t.id === parent)?.done && children.some(id => !tasks.find(t => t.id === id)?.done)) errors.push(`${parent}: completed parent has unfinished children`);
  }
  for (const [id, step] of Object.entries(steps)) {
    if (!ids.has(id) || !Array.isArray(step.depends_on) || step.depends_on.some(dep => !ids.has(dep) || dep === id)) errors.push(`${id}: invalid task dependencies`);
    if (step.block && (!step.block.reason || !step.block.revisit_when)) errors.push(`${id}: block requires reason and revisit condition`);
  }
  const visit = (id, stack = new Set(), visited = new Set()) => {
    if (stack.has(id)) { errors.push(`${id}: cyclic atomic dependency`); return; }
    if (visited.has(id)) return;
    stack.add(id);
    for (const dep of steps[id]?.depends_on ?? []) visit(dep, stack, visited);
    stack.delete(id); visited.add(id);
  };
  for (const id of Object.keys(steps)) visit(id);
  return errors;
}

export function atomicSelection(next, tasks, ledger) {
  if (!next.task) return next;
  const byId = new Map(tasks.map(t => [t.id, t]));
  const children = ledger.atomic_dispatch?.children?.[next.task];
  const candidates = children?.filter(id => !byId.get(id)?.done) ?? [next.task];
  const blocked = [];
  for (const id of candidates.length ? candidates : [next.task]) {
    const step = ledger.atomic_dispatch?.steps?.[id];
    const missing = (step?.depends_on ?? []).filter(dep => !byId.get(dep)?.done);
    if (step?.block || missing.length) { blocked.push({task: id, ...step?.block, missing_tasks: missing}); continue; }
    return {...next, task: id, ...(children ? {parent_task: next.task} : {})};
  }
  return {action: 'blocked', packet: next.packet, task: next.task, reason: 'Atomic prerequisites or external setup remain open; do not retry unchanged blockers.', blocked};
}

export function buildBrief(task, manifest, ledger, decisions) {
  const packet = manifest.packets.find(p => p.id === packetFor(task, manifest));
  const decisionIds = [...new Set([...(packet?.required_decisions ?? []), ...`${task.context}\n${task.instructions}\n${task.acceptance}`.matchAll(/\b[A-M]\d+\b/g)].map(value => typeof value === 'string' ? value : value[0]))];
  const decisionRows = decisions.split(/\r?\n/).filter(line => decisionIds.some(id => line.startsWith(`| ${id} |`)));
  const files = [...task.file_scope.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  const commands = [{cwd: '.', command: 'git diff --check'}];
  if (files.some(p => /\.(ts|tsx)$/.test(p))) commands.push({cwd: 'web', command: 'node node_modules/typescript/bin/tsc --noEmit'}, {cwd: 'web', command: `node node_modules/eslint/bin/eslint.js ${files.filter(p => p.startsWith('web/') && /\.(ts|tsx)$/.test(p)).map(p => `"${p.slice(4)}"`).join(' ')}`});
  if (files.some(p => p.startsWith('web/src/'))) commands.push({cwd: 'web', command: 'npm run build'});
  if (files.some(p => p.startsWith('supabase/'))) commands.push({cwd: '.', command: 'npm --prefix web run test:db'});
  for (const file of files.filter(p => /\.(mjs|cjs)$/.test(p))) commands.push({cwd: '.', command: `node --check "${file}"`});
  if (files.every(p => /\.(md|json)$/.test(p))) commands.push({cwd: '.', command: 'node scripts/check-planning.mjs'});
  const handoff = ledger.atomic_dispatch?.steps?.[task.id]?.handoff ?? ledger.packets?.[packet?.id]?.handoff ?? `docs/workstreams/implementation-plan-SL${task.id.split('.')[0].padStart(2, '0')}.md`;
  return {task: task.id, title: task.title, stage: task.stage, completed: task.done,
    approved_stage_scope: task.stage !== 'C', dispatch_required: 'Build mode, enabled preflight and task claim; inspecting a card grants no execution permission.', packet: packet?.id ?? null,
    scope: task.file_scope, instructions: task.instructions, acceptance: task.acceptance,
    depends_on_tasks: ledger.atomic_dispatch?.steps?.[task.id]?.depends_on ?? [],
    decision_rows: decisionRows, read: {contract_context: task.context, contracts: packet?.contracts.filter(p => p.startsWith('docs/specs/')) ?? [], ...(files.some(p => p.startsWith('web/src/')) ? {framework: 'web/AGENTS.md and relevant installed-version docs'} : {})},
    checks: commands, runtime_acceptance: 'Use the task acceptance above with ordinary actors; helper/static checks alone do not pass it.',
    record_files: [handoff, 'PROJECT_STATUS.md', 'implementation_plan.md', 'docs/planning/execution-state.json', 'docs/WORKTREE_INVENTORY.md'],
    live_gate: packet?.live_gate ?? 'AGENTS target/data/ownership authorization applies',
    stop: task.stage === 'C' ? 'Deferred scope: explicit owner dispatch and unresolved decisions required.' : 'Stop and record missing prerequisite, unavailable tool/permission, unsafe scope expansion or new product choice; never invent a policy or retry an unchanged block.',
  };
}

export async function loadTaskSource(base = projectRoot) {
  const [plan, manifest, ledger, decisions] = await Promise.all(['implementation_plan.md', 'docs/planning/packets.json', 'docs/planning/execution-state.json', 'DECISIONS.md'].map(p => readFile(resolve(base, p), 'utf8')));
  return {tasks: parseTaskCards(plan), manifest: JSON.parse(manifest), ledger: JSON.parse(ledger), decisions};
}

async function taskBriefMain() {
  const source = await loadTaskSource();
  const errors = [...validateExecution(source.manifest, source.ledger), ...validateTaskCards(source.tasks, source.manifest, source.ledger)];
  if (errors.length) throw new Error(errors.join('\n'));
  if (process.argv.includes('--check')) {
    for (const packet of source.manifest.packets) for (const path of packet.contracts) await access(resolve(projectRoot, path));
    console.log(JSON.stringify({tasks: source.tasks.length, stages: Object.fromEntries(['A', 'B', 'C'].map(stage => [stage, {total: source.tasks.filter(t => t.stage === stage).length, open: source.tasks.filter(t => t.stage === stage && !t.done).length}])), distinct_scope_instruction_acceptance: true, atomic_dependencies: 'valid', product_execution: false}));
  } else {
    const id = process.argv.find(a => a.startsWith('--task='))?.slice(7);
    const task = source.tasks.find(t => t.id === id);
    if (!task) throw new Error('Use --check or --task=<existing ID>. This command never executes a product task.');
    console.log(JSON.stringify(buildBrief(task, source.manifest, source.ledger, source.decisions), null, 2));
  }
}

// Local scheduler guard. Never starts a model, implements a task or modifies product data.

export function usageDecision(snapshot, now = Date.now()) {
  if (!snapshot || typeof snapshot.ordinaryUsageAllowed !== 'boolean') return {action: 'unknown', reason: 'Read fresh usage limits; missing is not zero usage.'};
  const buckets = Object.values(snapshot.rateLimitsByLimitId ?? {default: snapshot.rateLimits}).filter(Boolean);
  const blocked = buckets.flatMap(b => [b.primary, b.secondary]).filter(w => typeof w?.usedPercent === 'number' && w.usedPercent >= 100);
  const stop = !snapshot.ordinaryUsageAllowed || blocked.length || buckets.some(b => b.spendControlReached || b.individualLimit?.usedPercent >= 100);
  if (!stop) return {action: 'available'};
  const resets = blocked.map(w => w.resetsAt * 1000).filter(t => Number.isFinite(t) && t > now);
  return {action: 'wait', ...(resets.length ? {not_before: new Date(Math.max(...resets)).toISOString()} : {}), reason: 'No reset/credit purchase is authorized; retry only after fresh allowance is available.'};
}

export function parseInstinctNotes(markdown) {
  return markdown.split(/(?=^### NOTE-\d{8}-\d+\b)/m).slice(1).map(block => {
    const heading = block.split('\n')[0];
    const field = name => block.match(new RegExp(`^- ${name}: (.+)$`, 'm'))?.[1].trim();
    return {id: heading.match(/NOTE-\d{8}-\d+/)[0], type: field('Type') ?? 'idea', owner_approval: field('Owner approval') ?? 'unconfirmed', owner_words: field('Owner words') ?? null, routing: field('Routing') ?? 'pending', text: block.split(/^## /m)[0].trim()};
  });
}

export function dispatchDecision({control, state = {}, lease, ownThread, notes = [], dirty = false, next, preview = false}, now = Date.now()) {
  if (!preview && (control?.enabled !== true || control?.mode !== 'build')) return {action: 'paused', reason: 'Plan/setup only. Build mode and product dispatch must both be explicitly enabled.'};
  if (state.not_before && Date.parse(state.not_before) > now) return {action: 'wait', not_before: state.not_before, reason: 'Saved usage cooldown; no new task should start.'};
  const ownLease = lease && ownThread && lease.thread_id === ownThread;
  if (lease && !ownLease) return {action: 'busy', task: lease.task, owner_thread: lease.thread_id, lease_token: lease.token, since: lease.created_at, reason: 'Check the owner with wait_threads. Resume only after a fresh non-running owner result; never expire by time.'};
  if (dirty && !ownLease) return {action: 'blocked', reason: 'Primary checkout has uncommitted work; identify its owner before starting a new writer.'};
  const pending = notes.filter(note => note.routing === 'pending');
  if (pending.length && (!ownLease || lease.task === 'intake')) return {action: ownLease ? 'resume' : 'intake', task: 'intake', notes: pending, ...(ownLease ? {lease_token: lease.token} : {}),
    brief: {task:'intake', scope:'docs/BUSINESS_MODEL.md and affected existing decision/plan/issue/roadmap records only', instructions:'Record ideas/research without creating development tasks. Route an explicit approved decision or reported problem once under the Instinct intake contract. No product code/data changes.', acceptance:'Each note has one recorded disposition/destination; unapproved ideas remain notes. Existing owner answers and task evidence preserved.'}};
  if (ownLease && next?.task !== lease.task) return {action:'blocked', reason:'Claimed task no longer matches selection; reconcile its existing checkpoint and release the lease before starting another task.'};
  if (ownLease && lease.fingerprint && next?.brief && lease.fingerprint !== fingerprint(next.brief)) return {action:'blocked', reason:'Claimed instructions changed; reconcile the owning checkpoint before resuming.'};
  return next ? {...next, ...(ownLease ? {action:'resume', lease_token:lease.token} : {})} : {action: 'blocked', reason: 'No validated task selection supplied.'};
}

export async function claim(directory, task, fingerprint, threadId = process.env.CODEX_THREAD_ID ?? null) {
  if (!task || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Claim requires a task and current brief fingerprint.');
  await mkdir(directory, {recursive: true});
  const record = {token: randomUUID(), task, fingerprint, thread_id:threadId, created_at: new Date().toISOString()};
  let file;
  try {file = await open(join(directory, 'lease.json'), 'wx', 0o600);}
  catch (error) {if (error.code === 'EEXIST') throw new Error('Executor already claimed; no replacement run was started.'); throw error;}
  try {await file.writeFile(JSON.stringify(record));} finally {await file.close();}
  return record;
}
export async function resumeLease(directory, token, stoppedOwner, ownThread) {
  const path=join(directory,'lease.json');
  const recoveryPath=join(directory,'recovery.lock');
  let lock;
  try {lock=await open(recoveryPath,'wx',0o600);} catch(error) {if(error.code==='EEXIST') throw new Error('Lease recovery already in progress.'); throw error;}
  try {
    const lease=JSON.parse(await readFile(path,'utf8'));
    if (!ownThread || !stoppedOwner || lease.thread_id!==stoppedOwner || lease.token!==token) throw new Error('Resume must match the exact stopped owner and lease; checkpoint preserved.');
    const next={...lease, token:randomUUID(), thread_id:ownThread, resumed_from:stoppedOwner, resumed_at:new Date().toISOString()};
    // Keep the existing lock path occupied throughout recovery (Windows sandbox
    // does not reliably permit replacing an existing file by rename).
    // Malformed interrupted state fails closed on the next JSON read.
    await writeFile(path,JSON.stringify(next),{mode:0o600});
    return next;
  } finally {await lock.close();await unlink(recoveryPath);}
}
export async function release(directory, token) {
  const path = join(directory, 'lease.json');
  const lease = JSON.parse(await readFile(path, 'utf8'));
  if (!token || lease.token !== token) throw new Error('Foreign executor lease; refusing release.');
  await unlink(path);
}
async function optionalJson(path) {
  try {return JSON.parse(await readFile(path, 'utf8'));} catch (error) {if (error.code === 'ENOENT') return undefined; throw error;}
}
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function preflightMain() {
  const ledger = JSON.parse(await readFile(join(projectRoot, 'docs/planning/execution-state.json'), 'utf8'));
  const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain'], {cwd: projectRoot, encoding: 'utf8'});
  const primary = worktrees.split(/\r?\n/).find(line => line.startsWith('worktree '))?.slice(9);
  if (!primary || resolve(primary) !== projectRoot) throw new Error('Scheduled dispatch runs only in the primary checkout.');
  const directory = join(projectRoot, 'web/.qa/automation');
  const args = process.argv.slice(2);
  const arg = name => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (arg('release')) {await release(directory, arg('release')); console.log('Released only this executor lease.'); return;}
  if (arg('resume')) {
    if (ledger.automation_control?.enabled!==true || ledger.workflow_mode!=='build' || args.includes('--preview')) throw new Error('Dispatch is disabled; resume would authorize product work.');
    console.log(JSON.stringify(await resumeLease(directory,arg('resume'),arg('owner-stopped'),process.env.CODEX_THREAD_ID)));
    return;
  }
  if (arg('defer-until')) {
    const seconds = Number(arg('defer-until'));
    if (!Number.isFinite(seconds) || seconds * 1000 <= Date.now() || seconds * 1000 > Date.now() + 366 * 86400000) throw new Error('Provide a future usage reset Unix timestamp in seconds.');
    await mkdir(directory, {recursive: true});
    await writeFile(join(directory, 'state.json'), JSON.stringify({not_before: new Date(seconds * 1000).toISOString(), reason: 'usage'}), {mode: 0o600});
    console.log('Recorded usage cooldown; no product work started.'); return;
  }
  const state = await optionalJson(join(directory, 'state.json'));
  const lease = await optionalJson(join(directory, 'lease.json'));
  const control = {...ledger.automation_control,mode:ledger.workflow_mode};
  const preview = args.includes('--preview');
  const ownThread = process.env.CODEX_THREAD_ID;
  const ownLease = lease && ownThread && lease.thread_id === ownThread;
  let next;
  // Paused/cooling/busy runs do not read the plan or business history at all.
  if ((preview || (control?.enabled && control?.mode === 'build')) && (!lease || ownLease) && !(state?.not_before && Date.parse(state.not_before) > Date.now())) {
    const notes = parseInstinctNotes(await readFile(join(projectRoot, 'docs/BUSINESS_MODEL.md'), 'utf8'));
    const dirty = execFileSync('git', ['status', '--porcelain'], {cwd: projectRoot, encoding: 'utf8'}).trim().length > 0;
    if ((!notes.some(note => note.routing === 'pending') || ownLease) && (!dirty || ownLease)) next = JSON.parse(execFileSync(process.execPath, [join(projectRoot, 'scripts/next-work.mjs'), '--brief'], {encoding: 'utf8'}));
    const decision = dispatchDecision({control, state, lease, ownThread, notes, dirty, next, preview});
    if (decision.brief) decision.fingerprint = fingerprint(decision.brief);
    if (arg('claim')) {
      if (preview || control?.enabled !== true || !decision.brief || decision.task !== arg('claim') || decision.fingerprint !== arg('fingerprint')) throw new Error('Claim differs from enabled current selection/fingerprint; no writer started.');
      console.log(JSON.stringify(await claim(directory, decision.task, decision.fingerprint))); return;
    }
    console.log(JSON.stringify(decision, null, 2)); return;
  }
  console.log(JSON.stringify(dispatchDecision({control, state, lease, ownThread, preview}), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  const preflight=args.some(arg => /^--(preflight|preview|claim|release|resume|defer-until)(=|$)/.test(arg));
  const taskCard=args.includes('--check') || args.some(arg=>arg.startsWith('--task='));
  (preflight ? preflightMain() : taskCard ? taskBriefMain() : main()).catch(error=>{console.error(error.message);process.exitCode=1;});
}
