import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/listings/validation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { validateListingDraft } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const valid = () => ({
  title: 'Synthetic apartment', address: 'Synthetic street 1', latitude: 31.25, longitude: 34.79,
  bedrooms: 2, billsIncluded: false, availableRooms: [{ monthlyPrice: 2000 }, { monthlyPrice: 2300 }],
  availableFrom: '2026-12-01', description: '', photos: Array.from({ length: 3 }, () => ({ type: 'image/jpeg', size: 100 })),
});

test('a single apartment can publish two priced rooms whether bills are included or not', () => {
  assert.equal(validateListingDraft(valid()), null);
  assert.equal(validateListingDraft({ ...valid(), billsIncluded: true }), null);
});

test('each available room must have a positive integer monthly price', () => {
  for (const monthlyPrice of [undefined, null, 0, -1, 12.5, NaN]) {
    assert.notEqual(validateListingDraft({ ...valid(), availableRooms: [{ monthlyPrice }] }), null);
  }
  assert.notEqual(validateListingDraft({ ...valid(), availableRooms: [] }), null);
  assert.notEqual(validateListingDraft({ ...valid(), availableRooms: [{ monthlyPrice: 1 }, { monthlyPrice: 2 }, { monthlyPrice: 3 }] }), null);
});

test('required apartment fields and finite in-range coordinates are validated', () => {
  for (const change of [
    { title: ' ' }, { address: '' }, { bedrooms: 0 }, { bedrooms: 1.5 }, { availableFrom: '' },
    { availableFrom: 'not-a-date' }, { billsIncluded: undefined }, { latitude: NaN },
    { longitude: NaN }, { latitude: 91 }, { longitude: Infinity },
  ]) assert.notEqual(validateListingDraft({ ...valid(), ...change }), null);
});
