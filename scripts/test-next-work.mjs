import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNext, validateExecution, parseMicroTasks, parseDemonstrationTasks, parseStageTasks, executionStage, parseTaskCards, validateTaskCards, atomicSelection, buildBrief, loadTaskSource, usageDecision, dispatchDecision, parseInstinctNotes, claim, release, resumeLease, fingerprint } from './next-work.mjs';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
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
    assert.equal(next.parent_task ?? next.task,ledger.owner_priority_override.task);
    if (next.parent_task && next.parent_task !== next.task) assert.ok(ledger.atomic_dispatch.children[next.parent_task].includes(next.task));
    else if (next.parent_task) assert.ok(ledger.atomic_dispatch.children[next.parent_task].every(id=>checklist.find(task=>task.id===id)?.done),'parent handoff requires all child outcomes accepted');
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

test('Stage B cannot run before evidence and uses the B packet rather than A mapping', () => {
  const text=readFileSync(new URL('../implementation_plan.md',import.meta.url),'utf8');
  const ledger=JSON.parse(readFileSync(new URL('../docs/planning/execution-state.json',import.meta.url),'utf8'));
  const packets=JSON.parse(readFileSync(new URL('../docs/planning/packets.json',import.meta.url),'utf8'));
  delete ledger.owner_priority_override; delete ledger.micro_task_dispatch;
  ledger.checklist_continuation.stage='B';
  assert.equal(chooseNext(packets,ledger,parseMicroTasks(text),parseStageTasks(text,'B')).action,'blocked');
  ledger.checklist_continuation.stage_acceptance.A={status:'verified',source_sha:'a'.repeat(40),verified_at:'2026-10-25T00:00:00Z',handoff:'docs/workstreams/demo.md',checks:[{command_or_scenario:'combined actual demo',result:'passed'}]};
  const cards=parseTaskCards(text);
  assert.match(validateTaskCards(cards,packets,ledger).join('\n'),/verified stage has unfinished/);
  const aIds=new Set(cards.filter(task=>task.stage==='A').map(task=>task.id));
  const checklist=parseMicroTasks(text).map(task=>({...task,done:task.done||aIds.has(task.id)}));
  cards.filter(task=>task.stage==='A').forEach(task=>{task.done=true;});
  assert.deepEqual(validateTaskCards(cards,packets,ledger),[]);
  assert.equal(executionStage(ledger),'B');
  const next=chooseNext(packets,ledger,checklist,parseStageTasks(text,'B'));
  assert.equal(next.task,'0.4');assert.equal(next.packet,'SL00.2');
  assert.equal(next.action,'micro-task');
  const done=parseMicroTasks(text).map(task=>({...task,done:true}));
  const stageDone=parseStageTasks(text,'B').map(task=>({...task,done:true}));
  assert.equal(chooseNext(packets,ledger,done,stageDone).action,'reconcile-mvp-evidence');
});

test('Stage A milestone transition preserves checklist order ahead of Google acceptance', () => {
  const text=readFileSync(new URL('../implementation_plan.md',import.meta.url),'utf8');
  const ledger=JSON.parse(readFileSync(new URL('../docs/planning/execution-state.json',import.meta.url),'utf8'));
  const packets=JSON.parse(readFileSync(new URL('../docs/planning/packets.json',import.meta.url),'utf8'));
  delete ledger.owner_priority_override;
  ledger.checklist_continuation={plan:'implementation_plan.md',stage:'A'};
  ledger.packets[ledger.micro_task_dispatch.packet].status='verified';
  const advance=t=>({...t,done:t.done||ledger.micro_task_dispatch.task_ids.includes(t.id)||['0.7','0.8','0.9','0.10','0.11','0.12','0.13'].includes(t.id)});
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


test('every real A/B/deferred task has a bounded card without a second backlog', async () => {
  const source=await loadTaskSource();
  assert.equal(source.tasks.length,249);
  assert.deepEqual(validateTaskCards(source.tasks,source.manifest,source.ledger),[]);
  for (const task of source.tasks) {
    const card=buildBrief(task,source.manifest,source.ledger,source.decisions);
    assert.equal(card.approved_stage_scope,task.stage!=='C');
    assert.ok(card.scope&&card.instructions&&card.acceptance);
    assert.ok(card.record_files.includes('docs/planning/execution-state.json'));
  }
  const task=source.tasks.find(t=>t.id==='16.32');
  const card=buildBrief(task,source.manifest,source.ledger,source.decisions);
  assert.ok(card.instructions.includes('אל תעלה לשרת'));
  assert.ok(JSON.stringify(card).length<14000,'one focused brief, not the entire planning library');
});

test('duplicate/missing contracts, escaping scopes and atomic cycles fail closed', async () => {
  const source=await loadTaskSource();
  for (const mutate of [s=>s.tasks.push(s.tasks[0]),s=>delete s.tasks[0].acceptance,s=>s.tasks[0].file_scope='`../outside`',s=>s.ledger.atomic_dispatch.steps['16.31'].depends_on=['16.34']]) {
    const copy=structuredClone(source);mutate(copy);
    assert.ok(validateTaskCards(copy.tasks,copy.manifest,copy.ledger).length>0);
  }
  assert.throws(()=>parseTaskCards('## שלב א׳\n### SL00\n- [ ] **משימה 0.1: test**\n  - **קריטריון קבלה:** one\n  - **קריטריון קבלה:** two'),/duplicate/);
});

test('a blocked login does not block independent assets or waive content dependencies',async()=>{
  const source=await loadTaskSource();
  for (const id of ['16.31','16.32','16.33','16.34','16.35','16.36','16.1']) source.tasks.find(t=>t.id===id).done=false;
  source.ledger.atomic_dispatch.steps['16.31'].block={reason:'missing key in this synthetic scenario',revisit_when:'configured'};
  const next={action:'owner-priority',packet:null,task:'16.1'};
  const selected=atomicSelection(next,source.tasks,source.ledger);
  assert.equal(selected.task,'16.32');assert.equal(selected.parent_task,'16.1');
  source.tasks.find(t=>t.id==='16.32').done=true;
  assert.equal(atomicSelection(next,source.tasks,source.ledger).task,'16.33');
  source.tasks.find(t=>t.id==='16.33').done=true;
  assert.equal(atomicSelection(next,source.tasks,source.ledger).action,'blocked');
  assert.equal(source.tasks.find(t=>t.id==='16.1').done,false);
});

test('owner QA priority prepares complete actors before live reuse and preserves unfinished demo work',async()=>{
  const source=await loadTaskSource();
  const next={action:'owner-priority',packet:null,task:'0.10'};
  for (const id of ['0.7','0.11','0.8','0.13','0.9','0.12','0.10']) source.tasks.find(t=>t.id===id).done=false;
  for (const id of ['0.7','0.11','0.8','0.13','0.9','0.12','0.10']) {
    const selected=atomicSelection(next,source.tasks,source.ledger);
    assert.equal(selected.task,id);
    assert.notEqual(selected.action,'blocked');
    source.tasks.find(t=>t.id===id).done=true;
  }
  assert.equal(source.tasks.find(t=>t.id==='16.35').done,false);
  assert.equal(source.tasks.find(t=>t.id==='16.36').done,false);
  source.tasks.find(t=>t.id==='0.11').done=false;
  source.tasks.find(t=>t.id==='0.9').done=false;
  source.ledger.atomic_dispatch.steps['0.11'].block={reason:'identity baseline unavailable in this scenario',revisit_when:'resolved'};
  assert.equal(atomicSelection(next,source.tasks,source.ledger).action,'blocked');
});

test('usage waits for every exhausted window and unknown allowance is never zero',()=>{
  const now=Date.parse('2026-10-25T00:00:00Z');
  const at=seconds=>now/1000+seconds;
  assert.equal(usageDecision(null,now).action,'unknown');
  assert.equal(usageDecision({ordinaryUsageAllowed:true,rateLimitsByLimitId:{codex:{primary:{usedPercent:60,resetsAt:at(300)}}}},now).action,'available');
  const stopped=usageDecision({ordinaryUsageAllowed:false,rateLimitsByLimitId:{codex:{primary:{usedPercent:100,resetsAt:at(300)},secondary:{usedPercent:100,resetsAt:at(600)}}}},now);
  assert.equal(stopped.action,'wait');assert.equal(Date.parse(stopped.not_before),now+600000);
  assert.equal(usageDecision({ordinaryUsageAllowed:false},now).action,'wait');
});

test('scheduler guards audit-only scope, cooldown, competing writer and dirty checkout',()=>{
  const next={action:'micro-task',task:'1.1'};
  assert.equal(dispatchDecision({control:{enabled:false},next}).action,'paused');
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},state:{not_before:'2099-01-01T00:00:00Z'},next}).action,'wait');
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},lease:{task:'1.1'},next}).action,'busy');
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},dirty:true,next}).action,'blocked');
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},next}).task,'1.1');
});

test('Instinct ideas stay notes and only unhandled intake is surfaced once',()=>{
  const notes=parseInstinctNotes('# Business\n### NOTE-20261025-001 thought\n- Type: idea\n- Routing: pending\nJust a raw thought.\n### NOTE-20261025-002 settled\n- Type: decision\n- Owner approval: confirmed\n- Owner words: keep core free\n- Routing: recorded\n## Other business notes\nnot part of this note');
  assert.equal(notes.length,2);assert.equal(notes[0].owner_approval,'unconfirmed');
  assert.ok(!notes[1].text.includes('not part of this note'));
  const result=dispatchDecision({control:{enabled:true,mode:'build'},notes,next:{action:'micro-task',task:'1.1'}});
  assert.equal(result.action,'intake');assert.equal(result.notes.length,1);
  assert.equal(result.notes[0].type,'idea');assert.equal(result.task,'intake');
  assert.ok(result.brief.instructions.includes('No product code/data changes'));
  const resumed=dispatchDecision({control:{enabled:true,mode:'build'},notes,lease:{task:'intake',thread_id:'same',token:'own'},ownThread:'same',dirty:true});
  assert.equal(resumed.action,'resume');assert.equal(resumed.task,'intake');assert.equal(resumed.lease_token,'own');
  notes[0].routing='recorded';
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},notes,next:{action:'micro-task',task:'1.1'}}).action,'micro-task');
});

test('only the owner token releases a lease and concurrent runs cannot claim twice',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'shutaf-dispatch-'));
  try {
    const lease=await claim(dir,'16.32',fingerprint({task:'16.32'}),'old-thread');
    await assert.rejects(claim(dir,'16.33',fingerprint({task:'16.33'})),/already claimed/);
    await assert.rejects(release(dir,'foreign'),/Foreign/);
    await assert.rejects(resumeLease(dir,lease.token,'wrong-owner','new-thread'),/exact stopped owner/);
    const recovered=await resumeLease(dir,lease.token,'old-thread','new-thread');
    assert.equal(recovered.task,'16.32');assert.equal(recovered.fingerprint,lease.fingerprint);
    assert.equal(recovered.resumed_from,'old-thread');
    await assert.rejects(release(dir,lease.token),/Foreign/);
    await release(dir,recovered.token);
    const next=await claim(dir,'16.33',fingerprint({task:'16.33'}));
    await release(dir,next.token);
  } finally {
    const path=resolve(dir);assert.equal(dirname(path),resolve(tmpdir()));assert.ok(basename(path).startsWith('shutaf-dispatch-'));
    await rm(path,{recursive:true,force:true});
  }
});

test('a resumed owner keeps its partial work; different selection cannot steal it',()=>{
  const lease={task:'16.32',thread_id:'thread',token:'token'};
  const good=dispatchDecision({control:{enabled:true,mode:'build'},lease,ownThread:'thread',dirty:true,next:{task:'16.32',brief:{task:'16.32'}}});
  assert.equal(good.action,'resume');assert.equal(good.lease_token,'token');
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},lease,ownThread:'thread',dirty:true,next:{task:'16.33'}}).action,'blocked');
  lease.fingerprint=fingerprint({task:'16.32',instructions:'original'});
  assert.equal(dispatchDecision({control:{enabled:true,mode:'build'},lease,ownThread:'thread',next:{task:'16.32',brief:{task:'16.32',instructions:'changed'}}}).action,'blocked');
});
