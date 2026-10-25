import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNext, validateExecution, parseMicroTasks, parseDemonstrationTasks } from './next-work.mjs';
import { readFileSync } from 'node:fs';
const manifest = { packets: [
  {id:'A',state:'ready',depends_on:[]},
  {id:'B',state:'ready',depends_on:['A']},
  {id:'C',state:'ready',depends_on:['A']},
  {id:'D',state:'ready',depends_on:['B','C']},
]};
const fresh = () => ({ priority:['A','B','C','D'], packets:Object.fromEntries(['A','B','C','D'].map((id) => [id,{status:'pending'}])) });
test('planning ready does not make dependent packets executable', () => { assert.equal(chooseNext(manifest,fresh()).packet,'A'); });
test('resume incomplete verification before new work', () => { const l=fresh();l.packets.A.status='verified';l.packets.B.status='verification-incomplete';assert.equal(chooseNext(manifest,l).action,'resume');assert.equal(chooseNext(manifest,l).packet,'B'); });
test('blocked branch does not stop independent approved work', () => { const l=fresh();l.packets.A.status='verified';l.packets.B.status='blocked';assert.equal(chooseNext(manifest,l).packet,'C');l.packets.C.status='verified';assert.equal(chooseNext(manifest,l).action,'blocked'); });
test('verified claim without evidence rejected', () => {const l=fresh();l.packets.A.status='verified';assert.match(validateExecution(manifest,l).join('\n'),/verified requires/);});
test('historical absolute evidence paths work across operating systems', () => {
  for (const worktree of ['/workspace/project', 'C:/Users/Owner/project', 'C:\\Users\\Owner\\project', '\\\\server\\share\\project']) {
    const ledger = fresh();
    ledger.packets.A = { status: 'verified', handoff: 'docs/workstreams/baseline.md',
      worktree, source_sha: 'a'.repeat(40), diff_sha256: 'clean',
      verified_at: '2026-10-19T00:00:00Z', outcome: 'baseline',
      checks: [{ command_or_scenario: 'baseline check', result: 'passed' }] };
    assert.deepEqual(validateExecution(manifest, ledger), [], worktree);
    assert.equal(chooseNext(manifest, ledger).packet, 'B');
  }
});
test('relative evidence paths remain invalid', () => {
  for (const worktree of ['project', 'C:project', './project', '']) {
    const ledger = fresh();
    ledger.packets.A = { status: 'verified', worktree };
    assert.match(validateExecution(manifest, ledger).join('\n'), /absolute worktree/);
  }
});
test('duplicate priority and unknown packet rejected', () => {const l=fresh();l.priority=['A','B','C','C'];l.packets.X={status:'pending'};assert.ok(validateExecution(manifest,l).length>=2);});
test('completed plan never implies release', () => {const l=fresh();for(const row of Object.values(l.packets))row.status='verified';const next=chooseNext(manifest,l);assert.equal(next.action,'local-plan-complete');assert.equal(next.packet,null);});

const ownerQueue = () => {
  const ledger = fresh();
  ledger.packets.A.status = 'verified';
  ledger.packets.B.status = 'verification-incomplete';
  ledger.micro_task_dispatch = { plan: 'implementation_plan.md', packet: 'C', after_task: '1.4',
    task_ids: ['4.9', '2.16'], reason: 'Owner approved priority after active task' };
  const checklist = parseMicroTasks('- [X] **משימה 1.4: current**\r\n- [ ] **משימה 4.9: owner**\r\n- [ ] **משימה 2.16: drafts**\r\n');
  return { ledger, checklist };
};

test('owner dispatch chooses physical micro-task ahead of unrelated incomplete verification', () => {
  const {ledger,checklist}=ownerQueue();
  const next=chooseNext(manifest,ledger,checklist);
  assert.equal(next.action,'micro-task');assert.equal(next.packet,'C');assert.equal(next.task,'4.9');
  assert.equal(ledger.packets.B.status,'verification-incomplete');
});
test('owner dispatch preserves preceding unfinished work', () => {
  const {ledger,checklist}=ownerQueue(); checklist[0].done=false;
  assert.equal(chooseNext(manifest,ledger,checklist).action,'finish-current-micro-task');
  assert.equal(chooseNext(manifest,ledger,checklist).task,'1.4');
});
test('owner dispatch advances to interleaved ID without numeric sorting', () => {
  const {ledger,checklist}=ownerQueue(); checklist[1].done=true;
  assert.equal(chooseNext(manifest,ledger,checklist).task,'2.16');
});
test('owner dispatch cannot bypass prerequisite, blocked state or premature verification', () => {
  for (const state of ['unverified-prerequisite','blocked','verified']) {
    const {ledger,checklist}=ownerQueue();
    if(state==='unverified-prerequisite')ledger.packets.A.status='pending'; else ledger.packets.C.status=state;
    assert.equal(chooseNext(manifest,ledger,checklist).action,'blocked');
  }
});
test('missing, reordered, duplicated and unknown checklist tasks fail closed', () => {
  for(const mutate of [()=>undefined, c=>c.slice(1), c=>[c[0],c[2],c[1]], c=>[...c,c[1]], c=>c.slice(0,2)]) {
    const {ledger,checklist}=ownerQueue();
    assert.equal(chooseNext(manifest,ledger,mutate(checklist)).action,'blocked');
  }
});
test('checked milestone requires evidence then restores ordinary selection', () => {
  const {ledger,checklist}=ownerQueue(); for(const task of checklist)task.done=true;
  assert.equal(chooseNext(manifest,ledger,checklist).action,'reconcile-micro-task-evidence');
  ledger.packets.C.status='verified';
  assert.equal(chooseNext(manifest,ledger,checklist).packet,'B');
});
test('invalid dispatch metadata is rejected without changing ordinary validation', () => {
  for(const patch of [{plan:'../outside.md'},{packet:'X'},{task_ids:['4.9','4.9']},{task_ids:[]},{reason:''},{after_task:'no-id'}]) {
    const {ledger}=ownerQueue();Object.assign(ledger.micro_task_dispatch,patch);
    assert.match(validateExecution(manifest,ledger).join('\n'),/Invalid owner micro-task dispatch/);
  }
});
test('integrated production checklist is atomic and agrees with owner dispatch', () => {
  const text=readFileSync(new URL('../implementation_plan.md',import.meta.url),'utf8');
  const checklist=parseMicroTasks(text);
  const ledger=JSON.parse(readFileSync(new URL('../docs/planning/execution-state.json',import.meta.url),'utf8'));
  const actualManifest=JSON.parse(readFileSync(new URL('../docs/planning/packets.json',import.meta.url),'utf8'));
  assert.equal(new Set(checklist.map(t=>t.id)).size,checklist.length);
  assert.ok(checklist.length>=229);
  // Each task has one file scope, instruction and acceptance field.
  const sections=text.split(/(?=^- \[[ xX]\] \*\*משימה \d+\.\d+:)/m).slice(1);
  for(const section of sections) {
    const body=section.split(/^#{2,4} /m)[0];
    for(const field of ['קבצים לעריכה/יצירה','הוראות טכניות ברורות','קריטריון קבלה'])
      assert.equal(body.split(`**${field}:**`).length-1,1,`${body.split('\n')[0]} ${field}`);
  }
  assert.deepEqual(validateExecution(actualManifest,ledger),[]);
  const next=chooseNext(actualManifest,ledger,checklist,parseDemonstrationTasks(text));
  if(ledger.owner_priority_override?.status==='ready') {
    assert.equal(next.action,'owner-priority');
    assert.equal(next.task,ledger.owner_priority_override.task);
    assert.equal(next.packet,null);
    return;
  }
  const first=checklist.find(t=>!t.done);
  if(first && ledger.micro_task_dispatch.task_ids.includes(first.id)) {
    assert.equal(next.action,'micro-task');assert.equal(next.packet,'SL04.2');assert.equal(next.task,first.id);
  } else if(ledger.micro_task_dispatch.task_ids.some(id=>!checklist.find(t=>t.id===id).done)) {
    assert.equal(next.action,'finish-current-micro-task');
  } else {
    assert.notEqual(next.action,'micro-task');
  }
});

test('Stage A milestone transition preserves checklist order ahead of Google acceptance', () => {
  const text=readFileSync(new URL('../implementation_plan.md',import.meta.url),'utf8');
  const ledger=JSON.parse(readFileSync(new URL('../docs/planning/execution-state.json',import.meta.url),'utf8'));
  const packets=JSON.parse(readFileSync(new URL('../docs/planning/packets.json',import.meta.url),'utf8'));
  delete ledger.owner_priority_override;
  ledger.checklist_continuation={plan:'implementation_plan.md',stage:'A'};
  ledger.packets[ledger.micro_task_dispatch.packet].status='verified';
  const advance=t=>({...t,done:t.done||ledger.micro_task_dispatch.task_ids.includes(t.id)});
  const checklist=parseMicroTasks(text).map(advance), demo=parseDemonstrationTasks(text).map(advance);
  const next=chooseNext(packets,ledger,checklist,demo);
  assert.equal(next.task,'3.1');assert.equal(next.packet,'SL03.1');
  assert.equal(next.action,'blocked');assert.deepEqual(next.missing_prerequisites,['SL02.1']);
  assert.equal(ledger.packets['SL01.2'].status,'verification-incomplete');
  // Once real prerequisite evidence is reconciled, dispatch the same task.
  ledger.packets['SL02.1'].status='verified';
  assert.equal(chooseNext(packets,ledger,checklist,demo).action,'micro-task');
});

test('missing Stage A source fails closed and checked demo requires evidence review', () => {
  const l=fresh();for(const row of Object.values(l.packets))row.status='verified';
  l.checklist_continuation={plan:'implementation_plan.md',stage:'A'};
  assert.equal(chooseNext(manifest,l,[]).action,'blocked');
  const tasks=[{id:'3.1',done:true,title:'demo',section:'SL03'}];
  assert.equal(chooseNext(manifest,l,tasks,tasks).action,'reconcile-demonstration-evidence');
});

test('explicit ready owner subset selects a real unchecked task without verifying its parent', () => {
  const {ledger,checklist}=ownerQueue();
  ledger.owner_priority_override={status:'ready',task:'2.16',issue:'DEMO',scope:'named approved subset',handoff:'docs/workstreams/demo.md'};
  const next=chooseNext(manifest,ledger,checklist);
  assert.equal(next.action,'owner-priority');assert.equal(next.task,'2.16');assert.equal(next.packet,null);
  assert.equal(ledger.packets.C.status,'pending');
  checklist[2].done=true;
  assert.equal(chooseNext(manifest,ledger,checklist).action,'blocked');
  ledger.owner_priority_override.task='9.99';
  assert.equal(chooseNext(manifest,ledger,checklist).action,'blocked');
});
