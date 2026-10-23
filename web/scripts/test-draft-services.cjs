const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loadDraftServices } = require('./draft-service-test-loader.cjs');
const actor = randomUUID();
let backendCalls = 0;
const client = { auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) },
  from() { backendCalls++; throw Error('Unexpected query'); }, rpc() { backendCalls++; throw Error('Unexpected RPC'); } };
const { actions, contract: c } = loadDraftServices(client);

test('draft partial fields reject private/media/lifecycle/prototype input without requiring a publishable model', async () => {
  assert.deepEqual(c.parseDraftFields({ title: '', bedrooms: '', roomPrices: [], address: { confirmed: false } }), { title: '', bedrooms: '', roomPrices: [], address: { confirmed: false } });
  for (const fields of [null, [], { ownerId: actor }, { photos: ['https://private.invalid/signed'] }, { state: 'completed' },
    JSON.parse('{"constructor":"bad"}'), { address: JSON.parse('{"__proto__":"bad"}') }, { roomPrices: [1] }, { title: 'x'.repeat(101) }]) {
    assert.equal(c.parseDraftFields(fields), null);
    const result = await actions.saveListingCloudDraft(randomUUID(), 0, fields);
    assert.equal(result.error.code, 'VALIDATION_FAILED');
  }
  assert.equal((await actions.createListingCloudDraft({ requestKey: randomUUID(), fields: null })).error.code, 'VALIDATION_FAILED');
  assert.equal((await actions.createListingCloudDraft({ requestKey: randomUUID(), ownerId: actor })).error.code, 'VALIDATION_FAILED');
  assert.equal((await actions.listListingCloudDrafts({ limit: 51 })).error.code, 'VALIDATION_FAILED');
  assert.equal((await actions.listListingCloudDrafts([])).error.code, 'VALIDATION_FAILED');
  const secret = process.env.LISTING_DRAFT_CURSOR_SECRET;
  delete process.env.LISTING_DRAFT_CURSOR_SECRET;
  assert.equal((await actions.listListingCloudDrafts()).error.code, 'STATE_UNAVAILABLE');
  if (secret !== undefined) process.env.LISTING_DRAFT_CURSOR_SECRET = secret;
  assert.equal(backendCalls, 0);
});
test('draft cursors retain microseconds and reject expiry, actor/filter changes and tampering', () => {
  const last = { id: randomUUID(), updatedAt: '2026-10-23T00:00:00.123456+00:00' };
  const key = 'test-only-private-signing-material', now = 100000, query = c.draftQueryHash('open', 'all', 1);
  const token = c.signDraftCursor(last, actor, query, key, now);
  assert.equal(c.readDraftCursor(token, actor, query, key, now).updatedAt, last.updatedAt);
  assert.equal(c.readDraftCursor(token, randomUUID(), query, key, now), null);
  assert.equal(c.readDraftCursor(token, actor, c.draftQueryHash('all', 'all', 1), key, now), null);
  assert.equal(c.readDraftCursor(token, actor, query, key, now + 1800001), null);
  assert.equal(c.readDraftCursor(token + 'a', actor, query, key, now), null);
  assert.equal(c.readDraftCursor(token, actor, query, '', now), null);
  assert.throws(() => c.signDraftCursor(last, actor, query, '', now));
});
test('decoded rows fail closed for another owner, unknown schema, URL media and invalid edit source', () => {
  const row = { id: randomUUID(), owner_id: actor, schema_version: 1, revision: 0, created_at: '2026-10-23T00:00:00Z', updated_at: '2026-10-23T00:00:00Z', state: 'open', fields: {}, photos: [], publication_request_id: randomUUID(), import_receipt_id: null, publication_started_at: null, source_listing_id: null, source_revision: null };
  assert.equal(c.decodeDraft(row, actor).kind, 'new');
  for (const changed of [{ owner_id: randomUUID() }, { schema_version: 2 }, { photos: [{ kind: 'draft', objectPath: 'https://private.invalid/signed' }] }, { source_listing_id: randomUUID(), source_revision: null }]) assert.throws(() => c.decodeDraft({ ...row, ...changed }, actor));
});
test('anonymous actions fail before storage and failures never return a raw internal exception', async () => {
  const anonymous = loadDraftServices({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }).actions;
  for (const result of await Promise.all([anonymous.createListingCloudDraft({ requestKey: randomUUID() }), anonymous.loadListingCloudDraft(randomUUID()), anonymous.saveListingCloudDraft(randomUUID(), 0, {}), anonymous.listListingCloudDrafts()])) assert.equal(result.error.code, 'AUTH_REQUIRED');
  const result = await actions.loadListingCloudDraft(randomUUID());
  assert.equal(result.error.code, 'INTERNAL'); assert.equal(result.error.retryable, true);
  assert.match(result.error.correlationId, /^[a-f0-9-]{36}$/); assert(!JSON.stringify(result).includes('Unexpected query'));
});
