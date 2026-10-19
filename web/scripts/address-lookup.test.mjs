import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const directory = await mkdtemp(join(tmpdir(), 'shutaf-geocoding-'));
const require = createRequire(import.meta.url);
for (const name of ['address-types', 'geocoding']) {
  const source = await readFile(new URL(`../src/lib/listings/${name}.ts`, import.meta.url), 'utf8');
  await writeFile(join(directory, `${name}.js`), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const { signAddress, verifyAddress, normalizeAddresses, lookupAddresses } = require(join(directory, 'geocoding.js'));
const selection = { label: 'Synthetic address', latitude: 31.25, longitude: 34.79, city: 'Beer Sheva', accuracy: 'building' };

test('provider receipts bind exact selection, actor, expiry and key; tampering fails', () => {
  const now = 1700000000000;
  const token = signAddress(selection, 'actor-a', 'test-key', now);
  const valid = (overrides = {}) => verifyAddress(overrides.token ?? token, overrides.actor ?? 'actor-a',
    overrides.address ?? selection.label, overrides.lat ?? selection.latitude, overrides.lon ?? selection.longitude,
    overrides.key ?? 'test-key', overrides.now ?? now);
  assert.equal(valid(), true);
  for (const change of [{ actor: 'actor-b' }, { address: 'edited' }, { lat: 31.3 },
    { key: 'another' }, { now: now + 900000 }, { token: `${token}changed` }, { token: 'broken' }]) {
    assert.equal(valid(change), false);
  }
});

test('normalization rejects foreign/invalid/centroid data, bounds output and strips provider metadata', () => {
  const row = { formatted: 'Example street', lat: 31.25, lon: 34.79, country_code: 'il', result_type: 'building', city: 'Beer Sheva', secret: 'discard' };
  const data = { results: [row, row, { ...row, country_code: 'de' }, { ...row, lat: null },
    { ...row, result_type: 'city' }, ...Array.from({ length: 8 }, (_, i) => ({ ...row, formatted: `Street ${i}` }))] };
  const result = normalizeAddresses(data);
  assert.equal(result.length, 5);
  assert.equal('secret' in result[0], false);
  assert.deepEqual(normalizeAddresses(null), []);
});

test('lookup sends correct locale/bias/filter and handles 429 without forwarding raw errors', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url.searchParams.get('lang'), 'he');
      assert.equal(url.searchParams.get('filter'), 'countrycode:il');
      assert.equal(options.cache, 'no-store');
      return new Response('private provider error', { status: 429 });
    };
    assert.deepEqual(await lookupAddresses('רגר 1', 'he', 'not-a-live-key', 'actor'), { suggestions: [], status: 429 });
  } finally { globalThis.fetch = original; }
});

test('private shared budget enforces actor/day/rate/circuit and denies ordinary clients', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to anon,authenticated,service_role;
      create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role',true) $$;`);
    await db.exec(await readFile(new URL('../../supabase/migrations/20261019092152_geocoding_budget.sql', import.meta.url), 'utf8'));
    const actor = '00000000-0000-4000-8000-000000000001';
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role};`);
      await assert.rejects(db.query('select public.reserve_geocoding_request($1)', [actor]));
      await assert.rejects(db.query('select * from private.geocoding_budget'));
      await db.exec('reset role');
    }
    await db.exec("set role service_role; select set_config('request.jwt.claim.role','service_role',false)");
    const reserve = async () => (await db.query('select public.reserve_geocoding_request($1) as allowed', [actor])).rows[0].allowed;
    assert.equal(await reserve(), true);
    await db.exec("update private.geocoding_actor_budget set requests=30; update private.geocoding_budget set second_bucket=now()-interval '2 seconds'");
    assert.equal(await reserve(), false);
    await db.exec("update private.geocoding_actor_budget set minute_bucket=now()-interval '2 minutes'; update private.geocoding_budget set requests=2000");
    assert.equal(await reserve(), false);
    await db.exec('update private.geocoding_budget set requests=0');
    await db.exec('select public.pause_geocoding_provider()');
    assert.equal(await reserve(), false);
    await db.exec("update private.geocoding_budget set paused_until=null, second_bucket=date_trunc('second',now()),second_requests=4");
    assert.equal(await reserve(), false);
  } finally { await db.close(); }
});

test.after(async () => { await rm(directory, { recursive: true, force: true }); });
