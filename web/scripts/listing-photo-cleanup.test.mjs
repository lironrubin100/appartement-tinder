import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/listings/photo-cleanup.ts', import.meta.url), 'utf8');
assert.match(source, /^import 'server-only';/);
const compiled = ts.transpileModule(source.replace("import 'server-only';", ''), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
});
assert.deepEqual(compiled.diagnostics, []);
const { cleanupListingPhotos } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
const actor = '10000000-0000-4000-8000-000000000001';
const outsider = '10000000-0000-4000-8000-000000000002';
const id = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = n => ({ objectId: id(n), objectPath: `${id(100 + n)}/1.jpg` });
const ok = data => ({ data, error: null });

function harness({ items = [item(1)], hasMore = false, reserve, remove, finish, switchAt, authThrowsAt } = {}) {
  const calls = []; let authCalls = 0;
  const client = {
    auth: { getUser: async () => {
      authCalls++;
      if (authCalls === authThrowsAt) throw Error('private auth detail');
      return ok({ user: { id: switchAt && authCalls >= switchAt ? outsider : actor } });
    } },
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'reserve_listing_photo_cleanup') return reserve ? reserve(args) : ok({ projectionVersion: 1, items, hasMore });
      assert.equal(name, 'finish_listing_photo_cleanup');
      return finish ? finish(args) : ok({ completed: true });
    },
    storage: { from: bucket => {
      assert.equal(bucket, 'apartment-photos');
      return { remove: async paths => {
        calls.push({ name: 'remove', paths });
        return remove ? remove(paths) : ok(paths.map(name => ({ name })));
      } };
    } },
  };
  return { client, calls, authCalls: () => authCalls };
}

test('one bounded reservation removes independent publication and actor-owned legacy images', async () => {
  const items = [item(1), { objectId: id(2), objectPath: `${actor}/legacy-portrait_2026.png` }];
  const h = harness({ items });
  assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 2, pending: false });
  assert.deepEqual(h.calls, [
    { name: 'reserve_listing_photo_cleanup', args: { p_limit: 8 } },
    ...items.flatMap(i => [{ name: 'remove', paths: [i.objectPath] },
      { name: 'finish_listing_photo_cleanup', args: { p_object_id: i.objectId, p_error_code: null } }]),
  ]);
  assert.equal(h.authCalls(), 10);
  const full = harness({ items: Array.from({ length: 8 }, (_, n) => item(n + 1)), hasMore: true });
  assert.deepEqual(await cleanupListingPhotos(full.client, actor), { removed: 8, pending: true });
  assert.equal(full.calls.filter(c => c.name === 'reserve_listing_photo_cleanup').length, 1);
  const fullDrained = harness({ items: Array.from({ length: 8 }, (_, n) => item(n + 1)) });
  assert.deepEqual(await cleanupListingPhotos(fullDrained.client, actor), { removed: 8, pending: false });
  const skipped = harness({ items: [], hasMore: true });
  assert.deepEqual(await cleanupListingPhotos(skipped.client, actor), { removed: 0, pending: true });
  const empty = harness({ items: [] });
  assert.deepEqual(await cleanupListingPhotos(empty.client, actor), { removed: 0, pending: false });
});

test('malformed or mixed unsafe reservations stop the whole batch before any Storage operation', async () => {
  const invalidPaths = ['https://example.invalid/photo.jpg', `${actor}/../secret.jpg`, `${actor}/photo.jpg?token=private`,
    `${actor}/photo.jpg#fragment`, `${actor}/%2e%2e.jpg`, `${actor}/nested/photo.jpg`, `${actor}/back\\slash.jpg`,
    `${outsider}/legacy.png`, `${id(101)}/9.jpg`, `${actor}/photo.svg`, `${actor}/line\nbreak.jpg`];
  const payloads = [null, {}, { projectionVersion: 2, items: [], hasMore: false }, { projectionVersion: 1, items: null, hasMore: false },
    { projectionVersion: 1, items: [] }, { projectionVersion: 1, items: [], hasMore: 'false' },
    { projectionVersion: 1, items: Array.from({ length: 9 }, (_, n) => item(n + 1)), hasMore: false },
    ...invalidPaths.map(objectPath => ({ projectionVersion: 1, hasMore: false, items: [item(1), { objectId: id(2), objectPath }] })),
    { projectionVersion: 1, hasMore: false, items: [item(1), { ...item(2), objectId: id(1) }] },
    { projectionVersion: 1, hasMore: false, items: [item(1), { ...item(1), objectId: id(2) }] },
    { projectionVersion: 1, hasMore: false, items: [{ ...item(1), objectId: 'invalid' }] }];
  for (const payload of payloads) {
    const h = harness({ reserve: () => ok(payload) });
    assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 0, pending: true });
    assert.equal(h.calls.length, 1);
  }
});

test('auth switches at every request boundary stop all subsequent operations', async () => {
  for (let switchAt = 1; switchAt <= 6; switchAt++) {
    const h = harness({ switchAt });
    assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 0, pending: true });
    assert.equal(h.calls.length, Math.floor(switchAt / 2));
    assert.equal(h.authCalls(), switchAt);
  }
  const h = harness({ items: [item(1), item(2)], switchAt: 7 });
  assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 1, pending: true });
  assert.equal(h.calls.length, 3);
  const unavailable = harness({ authThrowsAt: 4 });
  assert.deepEqual(await cleanupListingPhotos(unavailable.client, actor), { removed: 0, pending: true });
  assert.equal(unavailable.calls.length, 2);
});

test('failed or lost removals record only a retry code, continue other objects, and remain retryable', async () => {
  for (const fail of [() => ({ data: null, error: { message: 'private storage detail' } }),
    () => { throw Error('private lost response'); }, () => undefined, () => ok(null)]) {
    const h = harness({ items: [item(1), item(2)],
      remove: paths => paths[0] === item(1).objectPath ? fail() : ok([]),
      finish: args => ok({ completed: args.p_error_code === null }),
    });
    assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 1, pending: true });
    assert.deepEqual(h.calls.filter(c => c.name === 'finish_listing_photo_cleanup').map(c => c.args), [
      { p_object_id: id(1), p_error_code: 'STORAGE_RETRY' }, { p_object_id: id(2), p_error_code: null },
    ]);
    const retry = harness({ items: [item(1)] });
    assert.deepEqual(await cleanupListingPhotos(retry.client, actor), { removed: 1, pending: false });
  }
});

test('only authoritative completed receipts count and finish failures never break successful edits', async () => {
  for (const failure of [() => undefined, () => ok(null), () => ok({ completed: 'true' }),
    () => ok({ completed: false }), () => ({ data: { completed: true }, error: { message: 'private finish detail' } }),
    () => { throw Error('private finish failure'); }]) {
    const h = harness({ items: [item(1), item(2)], finish: args => args.p_object_id === id(1) ? failure() : ok({ completed: true }) });
    assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 1, pending: true });
    assert.equal(h.calls.filter(c => c.name === 'remove').length, 2);
  }
  const lostAck = harness({ remove: () => { throw Error('lost acknowledgement'); }, finish: () => ok({ completed: true }) });
  assert.deepEqual(await cleanupListingPhotos(lostAck.client, actor), { removed: 1, pending: false });
});

test('reserve failures and invalid actors are sanitized without Storage or finish requests', async () => {
  for (const reserve of [() => undefined, () => ({ data: null, error: { message: 'private reservation detail' } }),
    () => { throw Error('lost reservation response'); }]) {
    const h = harness({ reserve });
    assert.deepEqual(await cleanupListingPhotos(h.client, actor), { removed: 0, pending: true });
    assert.equal(h.calls.length, 1); assert.equal(h.authCalls(), 2);
  }
  const h = harness();
  assert.deepEqual(await cleanupListingPhotos(h.client, 'invalid'), { removed: 0, pending: true });
  assert.deepEqual(h.calls, []);
});
