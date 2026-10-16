import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNext, validateExecution } from './next-work.mjs';
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
test('duplicate priority and unknown packet rejected', () => {const l=fresh();l.priority=['A','B','C','C'];l.packets.X={status:'pending'};assert.ok(validateExecution(manifest,l).length>=2);});
test('completed plan never implies release', () => {const l=fresh();for(const row of Object.values(l.packets))row.status='verified';const next=chooseNext(manifest,l);assert.equal(next.action,'local-plan-complete');assert.equal(next.packet,null);});
