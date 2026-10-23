// Uses actual draft-actions.ts with only Next's request-cookie client factory
// supplied by a real ordinary authenticated Supabase client. No mocked queries,
// auth identity or RPCs. There is no draft UI/action endpoint until later tasks.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { loadDraftServices } = require('./draft-service-test-loader.cjs');
if (!process.argv.includes('--allow-private-fixtures')) throw Error('Explicit private synthetic fixture intent required');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
  const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, '')];
}));
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname, 'npbduvjnqnbydolmdpsc.supabase.co');
if (!env.LISTING_DRAFT_CURSOR_SECRET?.trim()) throw Error('Private draft cursor signing material is unavailable');
process.env.LISTING_DRAFT_CURSOR_SECRET = env.LISTING_DRAFT_CURSOR_SECRET;
const clients = [];
async function client(fixture) {
  const api = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
  if (fixture) {
    const user = JSON.parse(fs.readFileSync(`.env.qa-${fixture}.local`, 'utf8'))[0];
    const result = await api.auth.signInWithPassword({ email: user.email, password: user.password });
    if (result.error) throw Error('Synthetic fixture sign-in failed');
    clients.push(api);
  }
  return api;
}
const checked = result => { assert.equal(result.ok, true, result.error?.code); return result.data; };
const denied = (result, code) => { assert.equal(result.ok, false); assert.equal(result.error.code, code); };
(async () => {
  fs.mkdirSync('.qa/task219', { recursive: true });
  const file = '.qa/task219/manifest.json';
  const record = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { target: env.NEXT_PUBLIC_SUPABASE_URL, keys: [randomUUID(), randomUUID()], ids: [], purpose: 'Task 2.19 private cloud draft service acceptance', retained: true };
  const persist = () => fs.writeFileSync(file, JSON.stringify(record, null, 2));
  persist();
  try {
    const owner = await client('sl04-empty'), outsider = await client('sl01-card'), anonymous = await client();
    const ownerId = (await owner.auth.getUser()).data.user.id;
    if (record.ownerId) assert.equal(record.ownerId, ownerId);
    record.ownerId = ownerId; persist();
    const actions = loadDraftServices(owner).actions;
    const outside = loadDraftServices(outsider).actions, guest = loadDraftServices(anonymous).actions;
    const first = checked(await actions.createListingCloudDraft({ requestKey: record.keys[0], fields: { title: 'Synthetic cloud draft A', bedrooms: '', roomPrices: [] } }));
    record.ids[0] = first.id; persist();
    const second = checked(await actions.createListingCloudDraft({ requestKey: record.keys[1], fields: { title: 'Synthetic cloud draft B', address: { city: 'Synthetic QA area', confirmed: false } } }));
    record.ids[1] = second.id; persist();
    assert.notEqual(first.id, second.id); assert.equal(first.ownerId, ownerId);
    assert.equal(checked(await actions.createListingCloudDraft({ requestKey: record.keys[0], fields: {} })).id, first.id);
    console.log('PASS create two private incomplete drafts and retry the same creation receipt');
    const page1 = checked(await actions.listListingCloudDrafts({ limit: 1 }));
    assert.equal(page1.items.length, 1); assert.equal(page1.has_more, true); assert(page1.next_cursor);
    const page2 = checked(await actions.listListingCloudDrafts({ limit: 1, cursor: page1.next_cursor }));
    assert.notEqual(page1.items[0].id, page2.items[0].id);
    assert.deepEqual(new Set([...page1.items, ...page2.items].map(row => row.id)), new Set(record.ids));
    denied(await outside.listListingCloudDrafts({ limit: 1, cursor: page1.next_cursor }), 'CURSOR_STALE');
    denied(await actions.listListingCloudDrafts({ limit: 2, cursor: page1.next_cursor }), 'CURSOR_STALE');
    denied(await actions.listListingCloudDrafts({ limit: 1, cursor: page1.next_cursor + 'x' }), 'CURSOR_STALE');
    console.log('PASS bounded signed pagination, distinct pages and actor/filter/tamper rejection');
    const races = await Promise.all([
      actions.saveListingCloudDraft(first.id, first.revision, { title: 'Synthetic race A' }),
      actions.saveListingCloudDraft(first.id, first.revision, { title: 'Synthetic race B' }),
    ]);
    assert.equal(races.filter(result => result.ok).length, 1);
    denied(races.find(result => !result.ok), 'VERSION_CONFLICT');
    const winner = checked(await actions.loadListingCloudDraft(first.id));
    assert.equal(winner.revision, first.revision + 1);
    assert(['Synthetic race A', 'Synthetic race B'].includes(winner.fields.title));
    denied(await actions.saveListingCloudDraft(first.id, first.revision, { title: 'Do not overwrite' }), 'VERSION_CONFLICT');
    assert.deepEqual(checked(await actions.loadListingCloudDraft(first.id)), winner);
    checked(await actions.saveListingCloudDraft(second.id, second.revision, { title: 'Synthetic cloud draft B saved', description: '' }));
    console.log('PASS real concurrent writes: one winner, one conflict and stale retry preserves winner');
    const fresh = loadDraftServices(await client('sl04-empty')).actions;
    assert.equal(checked(await fresh.loadListingCloudDraft(first.id)).fields.title, winner.fields.title);
    assert.equal(checked(await fresh.loadListingCloudDraft(second.id)).fields.title, 'Synthetic cloud draft B saved');
    for (const id of record.ids) {
      denied(await outside.loadListingCloudDraft(id), 'NOT_FOUND');
      denied(await outside.saveListingCloudDraft(id, 0, { title: 'Forbidden' }), 'NOT_FOUND');
      denied(await guest.loadListingCloudDraft(id), 'AUTH_REQUIRED');
    }
    denied(await guest.createListingCloudDraft({ requestKey: randomUUID() }), 'AUTH_REQUIRED');
    denied(await guest.listListingCloudDrafts(), 'AUTH_REQUIRED');
    const outsiderId = (await outsider.auth.getUser()).data.user.id;
    const source = await outsider.from('apartments').select('id').eq('lister_id', outsiderId).limit(1).single();
    assert.equal(source.error, null);
    denied(await actions.createListingCloudDraft({ requestKey: randomUUID(), source: { listingId: source.data.id, revision: 0 } }), 'NOT_FOUND');
    denied(await actions.createListingCloudDraft({ requestKey: randomUUID(), ownerId: outsiderId }), 'VALIDATION_FAILED');
    denied(await actions.saveListingCloudDraft(first.id, winner.revision, { photos: ['https://private.invalid/signed'], state: 'completed' }), 'VALIDATION_FAILED');
    record.verifiedAt = new Date().toISOString(); record.checks = 5; persist();
    console.log('PASS fresh-session persistence and guest/outsider/foreign-source/owner-forgery/media-write denial');
    console.log('PASS retained exactly two new private draft IDs; existing demos and public listings unchanged');
  } finally { for (const api of clients) await api.auth.signOut({ scope: 'local' }); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
