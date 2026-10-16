// Structural planning checks only. No network, backend writes or runtime claims.
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { validateExecution } from './next-work.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const errors = [];
const inventory = JSON.parse(await read('docs/planning/legacy-inventory.json'));
const catalog = await read('docs/SLICES.md');
const map = await read('docs/LEGACY_SLICE_MAP.md');
const decisions = await read('DECISIONS.md');
const decisionIds = new Set([...decisions.matchAll(/^\| ([A-M]\d+) \|/gm)].map((m) => m[1]));
const coverage = JSON.parse(await read('docs/planning/decision-coverage.json'));
const currentDecisionRows = decisions.split(/\r?\n/).filter((line) => /^\| [A-M]\d+ \|/.test(line)).map((line) => {
  const cells = line.split('|').map((value) => value.trim());
  return { id: cells[1], title: cells[2], status: cells[3] };
});
const coverageIds = new Set(coverage.rows.map((row) => row.id));
if (coverageIds.size !== coverage.rows.length) errors.push('Duplicate decision coverage IDs');
for (const row of currentDecisionRows) if (!coverageIds.has(row.id)) errors.push(`Decision ${row.id} lacks assigned coverage owner`);
for (const id of coverageIds) if (!decisionIds.has(id)) errors.push(`Decision coverage references removed ${id}`);
// Git on Windows may materialize CRLF. Coverage tracks content, not checkout EOLs.
const decisionHash = createHash('sha256').update(decisions.replace(/\r\n/g, '\n')).digest('hex');
if (process.argv.includes('--write-decisions') && !errors.length) {
  const dateArg = process.argv.find((arg) => arg.startsWith('--date='));
  if (dateArg) {
    const date = dateArg.slice('--date='.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error('Invalid snapshot date');
    coverage.date = date;
  }
  const owners = new Map(coverage.rows.map((row) => [row.id, row.primary_slice]));
  coverage.rows = currentDecisionRows.map((row) => ({ ...row, primary_slice: owners.get(row.id) }));
  coverage.decision_source_sha256 = decisionHash;
  coverage.counts = {
    decided: coverage.rows.filter((row) => row.status.startsWith('DECIDED')).length,
    open: coverage.rows.filter((row) => row.status === 'OPEN').length,
    research: coverage.rows.filter((row) => row.status === 'RESEARCH').length,
  };
  await writeFile(resolve(root, 'docs/planning/decision-coverage.json'), JSON.stringify(coverage, null, 2) + '\n');
  const counts = coverage.counts;
  let markdown = '# Decision coverage snapshot\n\nGenerated ' + coverage.date + ' from DECISIONS.md. Navigation only; DECISIONS.md remains authoritative. Primary slice owns preparation/closure, not approval. Deferred placement does not silently defer a DECIDED v1 capability.\n\n';
  markdown += `${coverage.rows.length} rows: ${counts.decided} DECIDED variants, ${counts.open} OPEN, ${counts.research} RESEARCH. Unresolved rows are not all new owner questions; many concern technical choices or later releases.\n\n`;
  markdown += '| Decision | Current state | Primary slice | Topic |\n| --- | --- | --- | --- |\n';
  for (const row of coverage.rows) markdown += `| ${row.id} | ${row.status} | ${row.primary_slice} | ${row.title} |\n`;
  await writeFile(resolve(root, 'docs/DECISION_COVERAGE.md'), markdown);
}
if (coverage.decision_source_sha256 !== decisionHash) errors.push('Decision coverage stale; assign any new IDs then run --write-decisions');
const sections = [...catalog.matchAll(/^## (SL\d{2}) — ([^\r\n]+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)];
const slices = new Map();
function decisionReferences(line) {
  const refs = new Set();
  for (const match of line.matchAll(/\b([A-M])(\d+)(?:-([A-M])?(\d+))?\b/g)) {
    const [, prefix, first, endPrefix, last] = match;
    if (!last) { refs.add(prefix + first); continue; }
    if ((endPrefix && endPrefix !== prefix) || Number(last) < Number(first)) {
      errors.push(`Invalid decision range ${match[0]}`); continue;
    }
    for (let number = Number(first); number <= Number(last); number++) refs.add(prefix + number);
  }
  return refs;
}
for (const [, id, title, body] of sections) {
  if (slices.has(id)) errors.push(`Duplicate slice ${id}`);
  slices.set(id, { title, body });
  for (const field of ['Depends on', 'Readiness', 'Release', 'Outcome', 'Decisions', 'Tasks', 'Acceptance', 'Evidence']) {
    if (!new RegExp(`^- ${field}: .+`, 'm').test(body)) errors.push(`${id}: missing ${field}`);
  }
  const state = body.match(/^- Readiness: (.+)/m)?.[1].trim();
  slices.get(id).state = state;
  if (!['needs-decision', 'needs-research', 'ready', 'packetized'].includes(state)) errors.push(`${id}: invalid readiness ${state}`);
  const decisionLine = body.match(/^- Decisions: (.+)/m)?.[1] ?? '';
  for (const ref of decisionReferences(decisionLine)) {
    if (!decisionIds.has(ref)) errors.push(`${id}: unknown decision ${ref}`);
    if (state === 'ready') {
      const row = decisions.split(/\r?\n/).find((line) => line.startsWith(`| ${ref} |`));
      if (!/\| DECIDED(?:[^|]*)\|/.test(row ?? '')) errors.push(`${id}: ready references non-decided ${ref}`);
    }
  }
}
if (!slices.size) errors.push('No slice sections parsed');
for (const row of coverage.rows) if (!slices.has(row.primary_slice)) errors.push(`${row.id}: unknown primary slice ${row.primary_slice}`);
const deps = new Map();
for (const [id, { body }] of slices) {
  const line = body.match(/^- Depends on: (.+)/m)?.[1]?.trim();
  const list = line === 'none' ? [] : (line?.split(',').map((value) => value.trim()) ?? []);
  deps.set(id, list);
  for (const dep of list) {
    if (!slices.has(dep)) errors.push(`${id}: unknown dependency ${dep}`);
    else if (slices.get(id).state === 'ready' && slices.get(dep).state !== 'ready') {
      errors.push(`${id}: ready depends on unresolved planning prerequisite ${dep}`);
    }
  }
}
const visiting = new Set();
const done = new Set();
function visit(id, chain = []) {
  if (visiting.has(id)) { errors.push(`Dependency cycle ${[...chain, id].join(' -> ')}`); return; }
  if (done.has(id)) return;
  visiting.add(id);
  for (const dep of deps.get(id) ?? []) if (slices.has(dep)) visit(dep, [...chain, id]);
  visiting.delete(id); done.add(id);
}
for (const id of slices.keys()) visit(id);
const mapped = new Map();
for (const [, slice, cell] of map.matchAll(/^\| (SL\d{2}) \| ([^|]+) \|/gm)) {
  if (!slices.has(slice)) errors.push(`Legacy map references unknown slice ${slice}`);
  for (const id of cell.split(',').map((value) => value.trim())) {
    if (mapped.has(id)) errors.push(`Legacy ${id} assigned to ${mapped.get(id)} and ${slice}`);
    mapped.set(id, slice);
  }
}
const legacy = new Set(inventory.slices.map((slice) => slice.id));
if (legacy.size !== inventory.slices.length) errors.push('Duplicate IDs in source inventory');
for (const id of legacy) if (!mapped.has(id)) errors.push(`Unmapped legacy ${id}`);
for (const id of mapped.keys()) if (!legacy.has(id)) errors.push(`Unknown legacy ${id}`);

const documents = [
  'docs/BUILD_BLUEPRINT.md', 'docs/PILOT_SCOPE.md', 'docs/SLICES.md',
  'docs/LEGACY_SLICE_MAP.md', 'docs/EXECUTION_PROTOCOL.md',
  'docs/specs/MATCHING.md', 'docs/specs/LIFECYCLE_AND_PRIVACY.md',
  'docs/specs/MAP_SEARCH.md', 'docs/specs/NOTIFICATIONS_AND_MEASUREMENT.md',
  'docs/specs/DATA_CONTRACTS.md', 'docs/REVIEW_CHOICES.md', 'docs/BUSINESS_MODEL.md',
  'docs/DECISION_COVERAGE.md',
  'docs/MVP_DECISION_ANSWERS.md', 'docs/LOCAL_TESTING_WORKFLOW.md', 'docs/KNOWN_ISSUES.md',
  'docs/WORK_PLAN.md', 'docs/EXECUTION_PACKETS.md',
  'docs/REMAINING_MVP_PACKETS.md',
  'docs/START_NEXT_WORK.md',
  'docs/specs/TECHNICAL_DEFAULTS.md', 'docs/specs/POSTER_OUTREACH.md',
  'docs/specs/TAXONOMY.md',
];
// Bounded packets may be locally ready while their whole parent envelope has
// other policy/research gaps. Context refs are not normative packet blockers.
const packetManifest = JSON.parse(await read('docs/planning/packets.json'));
const packets = new Map();
const currentStatuses = new Map(currentDecisionRows.map((row) => [row.id, row.status]));
for (const packet of packetManifest.packets) {
  if (packets.has(packet.id)) errors.push(`Duplicate packet ${packet.id}`);
  packets.set(packet.id, packet);
  const packetText = await read(packet.id === 'SL00.1' || packet.id === 'SL01.1' || packet.id === 'SL08.1' ? 'docs/EXECUTION_PACKETS.md' : 'docs/REMAINING_MVP_PACKETS.md');
  if (!packetText.includes(`## ${packet.id} — `)) errors.push(`${packet.id}: missing concrete packet section`);
  if (!/^SL\d{2}\.\d+$/.test(packet.id) || !packet.id.startsWith(packet.parent + '.')) errors.push(`Invalid packet ID ${packet.id}`);
  if (!slices.has(packet.parent)) errors.push(`${packet.id}: unknown parent ${packet.parent}`);
  if (!['ready', 'blocked'].includes(packet.state)) errors.push(`${packet.id}: invalid packet state`);
  if (!Array.isArray(packet.depends_on) || !Array.isArray(packet.required_decisions) || !Array.isArray(packet.context_decisions) || !Array.isArray(packet.contracts) || !packet.contracts.length) errors.push(`${packet.id}: incomplete packet contract`);
  for (const ref of [...(packet.required_decisions ?? []), ...(packet.context_decisions ?? [])]) {
    if (!decisionIds.has(ref)) errors.push(`${packet.id}: unknown decision ${ref}`);
  }
  for (const ref of packet.required_decisions ?? []) {
    if (packet.state === 'ready' && !currentStatuses.get(ref)?.startsWith('DECIDED')) errors.push(`${packet.id}: ready packet requires non-decided ${ref}`);
  }
  if (!packet.live_gate || !packet.release_gate) errors.push(`${packet.id}: missing independent acceptance/release gates`);
  if (packet.state === 'blocked' && !packet.blocker) errors.push(`${packet.id}: missing blocker reason`);
  for (const contract of packet.contracts ?? []) {
    if (!/^docs\/[A-Za-z0-9_./-]+\.md$/.test(contract) || contract.split('/').includes('..')) { errors.push(`${packet.id}: unsafe contract path`); continue; }
    try { await access(resolve(root, contract)); } catch { errors.push(`${packet.id}: missing contract ${contract}`); }
  }
}
const packetVisiting = new Set();
const packetDone = new Set();
function visitPacket(id) {
  if (packetVisiting.has(id)) { errors.push(`Packet dependency cycle at ${id}`); return; }
  if (packetDone.has(id)) return;
  packetVisiting.add(id);
  const packet = packets.get(id);
  for (const dep of packet.depends_on ?? []) {
    if (!packets.has(dep)) errors.push(`${id}: unknown packet dependency ${dep}`);
    else {
      if (packet.state === 'ready' && packets.get(dep).state !== 'ready') errors.push(`${id}: ready packet depends on blocked ${dep}`);
      visitPacket(dep);
    }
  }
  packetVisiting.delete(id); packetDone.add(id);
}
for (const id of packets.keys()) visitPacket(id);
for (const [id, slice] of slices) {
  if (slice.state === 'packetized' && ![...packets.values()].some((packet) => packet.parent === id)) errors.push(`${id}: packetized envelope has no execution packet`);
}
const executionLedger = JSON.parse(await read('docs/planning/execution-state.json'));
errors.push(...validateExecution(packetManifest, executionLedger));
for (const document of documents) {
  const content = await read(document);
  for (const [, target] of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^(https?:|#|\/|[A-Z]:)/i.test(target)) continue;
    const path = target.split('#')[0];
    if (!path) continue;
    try { await access(resolve(root, dirname(document), path)); }
    catch { errors.push(`${document}: broken local link ${target}`); }
  }
}
if (errors.length) {
  process.stderr.write(errors.join('\n') + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write(`PASS: ${slices.size} slices; acyclic dependencies; ${legacy.size} legacy IDs mapped exactly once; ${currentDecisionRows.length} decisions assigned; decision references and local package links valid.\n`);
  process.stdout.write(`${packets.size} bounded packets validated; context research does not masquerade as local policy blockers.\n`);
  process.stdout.write('Structural validation only; policy approval, implementation, runtime acceptance and deployment remain separate.\n');
}
