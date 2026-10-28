import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
process.on('uncaughtException', error => { console.error(error.message, error.detail ?? '', error.where ?? ''); process.exit(1); });

// Run against a disposable, in-memory Postgres engine. Never connects to Supabase.
const require = createRequire(new URL('../web/package.json', import.meta.url));
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE || require.resolve('@electric-sql/pglite')).href);
const db = new PGlite();
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key,bucket_id text,name text,owner_id text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);
await db.exec(await read('supabase/schema.sql'));
// The legacy bootstrap retains one revoke for a column moved to profile_private.
await db.exec((await read('supabase/rls.sql')).replace('revoke update (student_email_verified_at) on profiles from authenticated;', ''));
await db.exec('grant usage on schema public,auth to authenticated; grant all on all tables in schema public to authenticated;');
let foundation = await read('supabase/migrations/20261013000100_chat_inbox_foundation.sql');
foundation = foundation.slice(0, foundation.indexOf('-- Postgres Changes')) + 'commit;';
for (const sql of [foundation,
  await read('supabase/migrations/20261014205238_listing_inquiry_conversations.sql'),
  await read('supabase/migrations/20261014211718_listing_photo_ownership.sql'),
  await read('supabase/migrations/20261013213103_profile_passes_and_like_validation.sql'),
  await read('supabase/migrations/20261015084833_resident_journeys.sql'),
  await read('supabase/migrations/20261015084841_group_conversations.sql'),
  await read('supabase/migrations/20261015084850_inquiry_acceptance_guards.sql'),
  await read('supabase/migrations/20261019210659_monotonic_chat_read_markers.sql'),
  await read('supabase/migrations/20261017082317_lister_safe_browsing.sql'),
  await read('supabase/migrations/20261017101500_convert_resident_to_lister.sql'),
  await read('supabase/migrations/20261020204057_private_random_listing_location.sql'),
  await read('supabase/migrations/20261020204548_listing_retry_owned_photos.sql'),
  await read('supabase/migrations/20261021225221_private_listing_drafts.sql'),
  await read('supabase/migrations/20261022075546_save_listing_draft_revision.sql'),
  await read('supabase/migrations/20261022185738_bind_draft_publication_snapshot.sql'),
  await read('supabase/migrations/20261023014407_private_listing_draft_media.sql'),
  await read('supabase/migrations/20261023113543_private_listing_draft_deletion.sql'),
  await read('supabase/migrations/20261023154219_verify_draft_publication_snapshot.sql'),
  await read('supabase/migrations/20261023185301_owned_listing_editor_snapshot.sql'),
  await read('supabase/migrations/20261023192226_core_listing_card.sql'),
  await read('supabase/migrations/20261023200459_versioned_listing_edit.sql'),
  await read('supabase/migrations/20261023202753_open_listing_edit_draft.sql'),
  await read('supabase/migrations/20261024083041_listing_edit_draft_commit.sql'),
  await read('supabase/migrations/20261024140758_room_availability_controls.sql'),
  await read('supabase/migrations/20261026143946_listing_inquiry_intake.sql'),
  await read('supabase/migrations/20261026174553_listing_inquiry_inventory_recheck.sql'),
  await read('supabase/migrations/20261026224849_listing_photo_cleanup.sql'),
  await read('supabase/migrations/20261027063143_core_individual_inquiry.sql'),
  await read('supabase/migrations/20261028102629_owner_listing_inbox.sql'),
  await read('supabase/migrations/20261028103654_owner_inquiry_seen.sql'),
  await read('supabase/migrations/20261028114557_inquiry_state_transitions.sql'),
  await read('supabase/migrations/20261028174705_owner_listing_status.sql')]) await db.exec(sql);

await db.exec('alter table storage.objects enable row level security; grant usage on schema storage,auth to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;');

const ids = Array.from({ length: 25 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
for (const id of ids) await db.query('insert into auth.users(id) values($1)', [id]);
async function as(i) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ids[i]]); await db.exec('set role authenticated'); }
async function rpc(sql, params = []) { return (await db.query(sql, params)).rows[0]; }
async function rejected(sql, params = []) { await assert.rejects(() => db.query(sql, params)); }
const listerIndex = 23;
for (let i = 0; i < ids.length; i++) {
  await as(i);
  await rpc(
    i === listerIndex
      ? "select public.save_onboarding($1,false,null,'private-phone','QA agency','', '{}',true)"
      : "select public.save_onboarding($1,true,'2000-01-01','private-phone','','hello','{\"cleanliness\":\"clean\"}',true)",
    [i === listerIndex ? `Lister ${i}` : `Resident ${i}`]
  );
}
await db.exec('reset role');
await db.exec(await read('supabase/tests/plan_self_listing_inquiry.sql'));
console.log('PASS: owner self-inquiry denied without side effects; another resident can inquire.');
await db.exec(await read('supabase/tests/plan_room_availability.sql'));
console.log('PASS: owner-only room availability, public count/range, D18 pending reconfirmation and accepted-chat preservation.');
await db.exec(await read('supabase/tests/plan_listing_inquiry_intake.sql'));
console.log('PASS: owner-only intake independent from inventory, stopped send/accept, pending reconfirmation and accepted chat/address preservation.');
await db.exec(await read('supabase/tests/plan_core_inquiry.sql'));
console.log('PASS: optional Unicode opening, legacy/same-text retry, immutable intro/reconfirmation, owner-only read and no preaccept chat/address.');
await db.exec(await read('supabase/tests/plan_core_inquiry_accept.sql'));
console.log('PASS: owner-only personal acceptance, exact conversation/members/system message, idempotent retry, atomic fault rollback and requester-only address.');
await db.exec(await read('supabase/tests/plan_owner_listing_inbox.sql'));
console.log('PASS: owner inbox listing/state filters, stable bounded keyset pages, safe requester projection, accepted membership and outsider/guest/block denial.');
await db.exec(await read('supabase/tests/plan_owner_inquiry_seen.sql'));
console.log('PASS: private owner-only seen marker, explicit idempotent view, per-card isolation, no inquiry/chat/unread mutation and guest/block/outsider denial.');
await db.exec(await read('supabase/tests/plan_listing_status_transitions.sql'));
console.log('PASS: protected owner status/legacy direct writes, exact revision retry, pending reconfirmation and accepted history/expiry/restriction preservation.');
await db.exec(await read('supabase/tests/plan_inquiry_transitions.sql'));
console.log('PASS: role-bound decline/withdraw/reconfirm, terminal idempotency, D18 intake guard and accepted history preservation.');
await db.exec(await read('supabase/tests/plan_core_listing_card.sql'));
console.log('PASS: reference-only card authority, retry collision, private history and no side effects.');
await db.exec(await read('supabase/tests/plan_listing_edit.sql'));
console.log('PASS: owner atomic edit, one revision, durable retry receipts, preserved inventory/location, rollback and direct-write denial.');
await db.exec(await read('supabase/tests/plan_listing_edit_draft.sql'));
console.log('PASS: atomic private edit draft initialization, stable rooms/photos, resume preservation, rollback and authorization.');
await db.exec(await read('supabase/tests/plan_listing_edit_commit.sql'));
console.log('PASS: frozen edit snapshot, atomic public update/completion, exact receipt replay, rollback, cancellation and explicit source refresh.');
await db.exec(await read('supabase/tests/plan_listing_editor.sql'));
console.log('PASS: one-snapshot owner-only editor model, rooms/media ownership and private location boundary.');
await db.exec(await read('supabase/tests/plan_listing_photo_cleanup.sql'));
console.log('PASS: durable owned photo cleanup, live-reference preservation, reservations, retry/absence proof, private authorization and immutable path tombstones.');
await db.exec(await read('supabase/tests/plan_listing_drafts.sql'));
console.log('PASS: private draft owner, outsider, anonymous and edit-source isolation.');
// D2/B2: a completed resident can publish without a phone; a nonresident cannot.
await db.exec('reset role');
await db.query('update public.profile_private set phone=null where profile_id = any($1::uuid[])', [[ids[0], ids[listerIndex]]]);
const listingId = '10000000-0000-4000-8000-000000000001';
const basePhotoUrl = 'https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
const listingDraft = JSON.stringify({ title: 'Test home', address: 'Test address', latitude: 31.2, longitude: 34.8,
  bedrooms: 2, billsIncluded: false, availableFrom: '2026-12-01', description: '',
  photos: [1, 2, 3].map(i => `${basePhotoUrl}${listingId}/${i}.jpg`), photoDigests: ['one', 'two', 'three'], roomPrices: [2000, 2600] });
const receiptDraftId = '10000000-0000-4000-8000-000000000090';
await db.query('insert into public.listing_drafts(id,owner_id,publication_request_id) values($1,$2,$3)', [receiptDraftId, ids[0], listingId]);
await as(0);
await rpc('select public.begin_listing_draft_publication($1,0,$2::jsonb)', [receiptDraftId, listingDraft]);
await db.exec('reset role');
for (let i = 1; i <= 3; i++) await db.query('insert into storage.objects(id,bucket_id,name,owner_id) values($1,$2,$3,$4)',
  [`20000000-0000-4000-8000-00000000000${i}`, 'apartment-photos', `${listingId}/${i}.jpg`, ids[0]]);
await as(0);
assert.equal((await rpc('select public.publish_apartment_once($1,$2::jsonb) id', [listingId, listingDraft])).id, listingId);
assert.equal((await rpc('select public.publish_apartment_once($1,$2::jsonb) id', [listingId, listingDraft])).id, listingId);
assert.equal((await rpc('select public.cancel_listing_publication($1) result', [listingId])).result, 'published');
await db.exec('reset role');
await db.exec(await read('supabase/tests/plan_listing_draft_revision.sql'));
console.log('PASS: draft revision, import retry, publication freeze and verified completion.');
await db.exec(await read('supabase/tests/plan_listing_draft_media.sql'));
console.log('PASS: private media upload/read, immutable objects, owner/revision association, freeze and source preservation.');
await db.exec('reset role');
await db.exec(await read('supabase/tests/plan_listing_draft_deletion.sql'));
console.log('PASS: durable private draft deletion, exact media cleanup, idempotency and isolation.');
await db.exec('reset role');
await db.exec(await read('supabase/tests/plan_listing_draft_publication_snapshot.sql'));
await as(0);
assert.equal((await rpc('select public.verify_listing_draft_publication_snapshot($1,0,$2::jsonb) result',[receiptDraftId,listingDraft])).result,true);
assert.equal((await rpc('select public.verify_listing_draft_publication_snapshot($1,0,$2::jsonb) result',[receiptDraftId,JSON.stringify({...JSON.parse(listingDraft),title:'wrong source'})])).result,false);
console.log('PASS: owner-only Postgres snapshot proof for frozen and completed drafts, stale/foreign/mismatched denial.');
const position = await rpc('select lat,lng,public_lat,public_lng from public.apartments where id=$1', [listingId]);
const metres = Math.hypot((position.public_lat - position.lat) * 111320,
  (position.public_lng - position.lng) * 111320 * Math.cos(position.lat * Math.PI / 180));
assert.ok(metres >= 300 && metres <= 700, `public displacement ${metres}m outside approved range`);
await db.query("update public.apartments set status='taken' where id=$1", [listingId]);
await db.query("update public.apartments set status='active' where id=$1", [listingId]);
assert.deepEqual(await rpc('select lat,lng,public_lat,public_lng from public.apartments where id=$1', [listingId]), position);
await rejected('select * from public.random_listing_public_point(32.085,34.781)');
await db.exec('reset role');
await db.query('update public.apartments set lat=lat,lng=lng where id=$1', [listingId]);
assert.deepEqual(await rpc('select lat,lng,public_lat,public_lng from public.apartments where id=$1', [listingId]), position);
const randomPoints = await db.query('select public_lat,public_lng from generate_series(1,30) cross join lateral public.random_listing_public_point(32.085 + 0*generate_series,34.781)');
assert.equal(new Set(randomPoints.rows.map(row => `${row.public_lat},${row.public_lng}`)).size, 30);
for (const point of randomPoints.rows) {
  const distance = Math.hypot((point.public_lat - 32.085) * 111320, (point.public_lng - 34.781) * 111320 * Math.cos(32.085 * Math.PI / 180));
  assert.ok(distance >= 300 && distance <= 700);
}
const oldAngle = (await rpc('select mod(abs(hashtextextended($1::text,0)),360)::float8 angle', [listingId])).angle * Math.PI / 180;
const oldRecovered = randomPoints.rows.filter(point => Math.abs(point.public_lat - Math.cos(oldAngle) * 500 / 111320 - 32.085) < 0.00000001);
assert.ok(oldRecovered.length < 2, 'old public-ID formula should not recover the independently random points');
for (const latitude of [29.4, 33.4]) {
  const point = await rpc('select * from public.random_listing_public_point($1,34.781)', [latitude]);
  const distance = Math.hypot((point.public_lat - latitude) * 111320, (point.public_lng - 34.781) * 111320 * Math.cos(latitude * Math.PI / 180));
  assert.ok(distance >= 300 && distance <= 700);
}
await db.exec('begin');
await db.query('update public.apartments set lat=32.085,lng=34.781 where id=$1', [listingId]);
const corrected = await rpc('select lat,lng,public_lat,public_lng from public.apartments where id=$1', [listingId]);
assert.notDeepEqual([corrected.public_lat, corrected.public_lng], [position.public_lat, position.public_lng]);
assert.ok(Math.hypot((corrected.public_lat - corrected.lat) * 111320, (corrected.public_lng - corrected.lng) * 111320 * Math.cos(corrected.lat * Math.PI / 180)) >= 300);
await db.exec('rollback');
await as(0);
await rejected('select public.publish_apartment_once($1,$2::jsonb)', [listingId, listingDraft.replace('Test home', 'Different home')]);
assert.equal((await rpc('select count(*)::int count from public.apartment_rooms where apartment_id=$1', [listingId])).count, 2);
await rejected('update public.apartment_rooms set monthly_price=2700 where apartment_id=$1', [listingId]);
await db.exec('reset role');
// Privileged fixture setup retains the derived-price trigger check; ordinary edits use the guarded RPC.
await db.query('update public.apartment_rooms set monthly_price=2700 where apartment_id=$1 and monthly_price=2000', [listingId]);
assert.equal((await rpc('select price from public.apartments where id=$1', [listingId])).price, 2600);
await as(listerIndex);
await rejected('select public.publish_apartment($1,$2::jsonb)', ['10000000-0000-4000-8000-000000000002', listingDraft]);
await as(1);
await rejected('select public.publish_apartment_once($1,$2::jsonb)', [listingId, listingDraft]);
await rejected('select * from public.listing_publication_requests');
await rejected('insert into public.apartments(id,lister_id,source,title,lat,lng,price,bedrooms) values($1,$2,$3,$4,$5,$6,$7,$8)',
  ['10000000-0000-4000-8000-000000000004', ids[1], 'user', 'Bypass', 31.2, 34.8, 1000, 1]);
await as(0);
await rejected('update public.apartments set lat=31.3 where id=$1', [listingId]);
const rollbackId = '10000000-0000-4000-8000-000000000003';
const cancelledId = '10000000-0000-4000-8000-000000000005';
const referencedId = '10000000-0000-4000-8000-000000000006';
await db.exec('reset role');
await db.exec('begin');
// Valid setup stages metadata before attaching its canonical public reference.
await db.query('insert into storage.objects(id,bucket_id,name,owner_id) values($1,$2,$3,$4)',
  ['30000000-0000-4000-8000-000000000006', 'apartment-photos', `${referencedId}/1.jpg`, ids[0]]);
await db.query('update public.apartments set photos=$1 where id=$2', [[`${basePhotoUrl}${referencedId}/1.jpg`], listingId]);
await as(0);
await rejected('select public.cancel_listing_publication($1)', [referencedId]);
await db.exec('rollback');
await as(0);
assert.equal((await rpc('select public.cancel_listing_publication($1) result', [cancelledId])).result, 'cancelled');
assert.equal((await rpc('select public.cancel_listing_publication($1) result', [cancelledId])).result, 'cancelled');
await rejected('select public.publish_apartment_once($1,$2::jsonb)', [cancelledId, listingDraft]);
await rejected('select public.publish_apartment($1,$2::jsonb)', [cancelledId, listingDraft]);
await db.exec('reset role');
for (let i = 1; i <= 3; i++) await db.query('insert into storage.objects(id,bucket_id,name,owner_id) values($1,$2,$3,$4)',
  [`30000000-0000-4000-8000-00000000000${i}`, 'apartment-photos', `${rollbackId}/${i}.jpg`, ids[0]]);
await as(0);
const badDraft = JSON.stringify({ ...JSON.parse(listingDraft), photos: [1, 2, 3].map(i => `${basePhotoUrl}${rollbackId}/${i}.jpg`), roomPrices: [2000, 0] });
await rejected('select public.publish_apartment_once($1,$2::jsonb)', [rollbackId, badDraft]);
await db.exec('reset role');
assert.equal((await rpc('select count(*)::int count from public.apartments where id=$1', [rollbackId])).count, 0);
assert.equal((await rpc('select count(*)::int count from public.listing_publication_requests where request_key=$1', [rollbackId])).count, 0);
// Fail after the parent insert, during the child write, to prove transaction rollback.
await db.exec(`create function public.test_fail_room_write() returns trigger language plpgsql as $$
begin raise exception 'synthetic room failure'; end $$;
create trigger test_fail_room_write before insert on public.apartment_rooms
for each row execute function public.test_fail_room_write();`);
await as(0);
const validRollbackDraft = JSON.stringify({ ...JSON.parse(listingDraft), photos: [1, 2, 3].map(i => `${basePhotoUrl}${rollbackId}/${i}.jpg`) });
await rejected('select public.publish_apartment_once($1,$2::jsonb)', [rollbackId, validRollbackDraft]);
await db.exec('reset role');
assert.equal((await rpc('select count(*)::int count from public.apartments where id=$1', [rollbackId])).count, 0);
assert.equal((await rpc('select count(*)::int count from public.listing_publication_requests where request_key=$1', [rollbackId])).count, 0);
await db.exec('drop trigger test_fail_room_write on public.apartment_rooms; drop function public.test_fail_room_write();');
await db.exec('reset role');
await db.query("update public.profile_private set phone='private-phone' where profile_id = any($1::uuid[])", [[ids[0], ids[listerIndex]]]);
await as(0);
const publicProfile = await rpc('select * from public.profiles_public where id=$1', [ids[1]]);
assert.equal(publicProfile.name, 'Resident 1'); assert.ok(!('birth_date' in publicProfile)); assert.ok(!('phone' in publicProfile));
assert.equal((await db.query('select * from public.profile_private where profile_id=$1', [ids[1]])).rows.length, 0);
await rejected('update public.profiles set onboarded=false where id=$1', [ids[0]]);
await rejected('update public.profile_private set student_email_verified_at=now() where profile_id=$1', [ids[0]]);
await rejected("select public.send_introduction($1,null,'','invalid:phone:value')", [ids[1]]);
const like = await rpc("select public.send_introduction($1,null,'','bio') id", [ids[1]]);
await as(2); await rejected('select public.accept_like($1)', [like.id]);
await as(1); const personal = await rpc('select public.accept_like($1) id', [like.id]);
assert.equal((await rpc('select public.accept_like($1) id', [like.id])).id, personal.id);
await as(0);
const group = await rpc("select public.create_group_from_chats('Our group',$1,'admin') id", [[ids[1]]]);
await db.query("insert into public.messages(conversation_id,sender_id,body) values($1,$2,'before joining')", [group.id, ids[0]]);
await as(1);
const invite = await rpc('select * from public.list_group_invites()');
assert.equal(invite.group_name, 'Our group');
await rpc('select public.respond_group_invite($1,true)', [invite.id]);
assert.equal((await db.query('select body from public.messages where conversation_id=$1', [group.id])).rows.length, 0);
assert.equal((await rpc('select * from public.list_chat_inbox() where conversation_id=$1', [group.id])).last_message_body, null);
await rejected('select last_message_body from public.conversations where id=$1', [group.id]);
await rejected('update public.conversation_members set visible_after_seq=0 where user_id=$1', [ids[1]]);
await db.query("insert into public.messages(conversation_id,sender_id,body) values($1,$2,'after joining')", [group.id, ids[1]]);
assert.equal((await db.query('select body from public.messages where conversation_id=$1', [group.id])).rows[0].body, 'after joining');
await as(2);
assert.equal((await db.query('select * from public.messages where conversation_id=$1', [group.id])).rows.length, 0);
assert.equal((await db.query('select * from public.groups')).rows.length, 0);
const foundGroup = await rpc('select * from public.discover_groups()');
assert.equal(foundGroup.name, 'Our group');
const groupLike = await rpc("select public.send_introduction(null,$1,'hi','bio') id", [foundGroup.id]);
await as(1); await rejected('select public.decide_group_introduction($1)', [groupLike.id]);
await as(0); await rpc("select public.configure_group($1,'majority')", [foundGroup.id]);
assert.equal((await rpc('select public.decide_group_introduction($1) id', [groupLike.id])).id, null);
await as(1); assert.equal((await rpc('select public.decide_group_introduction($1) id', [groupLike.id])).id, group.id);
await as(2); assert.equal((await db.query('select * from public.messages where conversation_id=$1', [group.id])).rows.length, 0);
await rpc("select public.pass_discovery($1,'individual')", [ids[3]]);
assert.equal((await db.query('select * from public.discover_individuals() where id=$1', [ids[3]])).rows.length, 0);
await db.exec('reset role'); await db.query("update public.discovery_passes set created_at=now()-interval '31 days' where from_user=$1", [ids[2]]);
await as(2); assert.equal((await db.query('select * from public.discover_individuals() where id=$1', [ids[3]])).rows.length, 1);
await db.query('insert into public.blocks(blocker_id,blocked_id) values($1,$2)', [ids[2], ids[0]]);
assert.equal((await db.query('select * from public.list_chat_inbox() where conversation_id=$1', [group.id])).rows.length, 0);
await rejected("insert into public.messages(conversation_id,sender_id,body) values($1,$2,'blocked')", [group.id, ids[2]]);
await as(0); assert.equal((await db.query('select * from public.list_chat_inbox() where conversation_id=$1', [group.id])).rows.length, 0);
await as(2); await db.query('delete from public.blocks where blocker_id=$1 and blocked_id=$2', [ids[2], ids[0]]);
await as(0); await rpc("select public.configure_group($1,'any_member')", [foundGroup.id]);
await as(3); const fourth = await rpc("select public.send_introduction(null,$1,'','bio') id", [foundGroup.id]);
await as(1); assert.equal((await rpc('select public.decide_group_introduction($1) id', [fourth.id])).id, group.id);
await as(5); const fifth = await rpc("select public.send_introduction(null,$1,'','bio') id", [foundGroup.id]);
await as(1); await rejected('select public.decide_group_introduction($1)', [fifth.id]);
await as(0); await rpc('select public.remove_group_member($1,$2)', [foundGroup.id, ids[3]]);
await as(3); assert.equal((await db.query('select * from public.messages where conversation_id=$1', [group.id])).rows.length, 0);

// Apartment inquiry acceptance: availability, ownership, idempotency and address isolation.
await db.exec('reset role');
const apartment = await rpc("insert into public.apartments(lister_id,source,title,address,lat,lng,price,bedrooms) values($1,'user','Local fixture','Private exact address',31.25,34.79,2000,3) returning id", [ids[7]]);
await db.query("insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available) values($1,2000,'2026-12-01',true)", [apartment.id]);
await as(6); const inquiry = await rpc('select public.create_listing_inquiry($1) id', [apartment.id]);
assert.equal((await db.query('select * from public.listing_address_access where apartment_id=$1', [apartment.id])).rows.length, 0);
await rejected("update public.listing_inquiries set status='accepted' where id=$1", [inquiry.id]);
await as(8); await rejected('select public.accept_listing_inquiry($1)', [inquiry.id]);
await as(7); await db.query("update public.apartments set status='taken' where id=$1", [apartment.id]);
await rejected('select public.accept_listing_inquiry($1)', [inquiry.id]);
await db.query("update public.apartments set status='active' where id=$1", [apartment.id]);
await rejected('select public.accept_listing_inquiry($1)', [inquiry.id]);
await as(6); await rpc("select public.transition_listing_inquiry($1,'reconfirm') result", [inquiry.id]);
await as(7);
const viewing = await rpc('select public.accept_listing_inquiry($1) id', [inquiry.id]);
assert.equal((await rpc('select public.accept_listing_inquiry($1) id', [inquiry.id])).id, viewing.id);
await as(6); assert.equal((await rpc('select address from public.listing_address_access where apartment_id=$1', [apartment.id])).address, 'Private exact address');
await as(8); assert.equal((await db.query('select * from public.listing_address_access where apartment_id=$1', [apartment.id])).rows.length, 0);

// Incomplete drafts stay private; invalid completion rolls all profile writes back.
await db.exec('reset role'); const draftId = '00000000-0000-4000-8000-999999999999';
await db.query('insert into auth.users(id) values($1)', [draftId]);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [draftId]); await db.exec('set role authenticated');
await rpc("select public.save_onboarding('Draft',true,null,'','','draft bio','{}',false)");
await rejected("select public.save_onboarding('Invalid replacement',true,null,'','','','{}',true)");
assert.equal((await rpc('select name,onboarded from public.profiles where id=$1', [draftId])).name, 'Draft');
await as(0); assert.equal((await db.query('select * from public.profiles_public where id=$1', [draftId])).rows.length, 0);
// A completed property poster can read only the safe person/group projections.
await as(listerIndex);
assert.ok((await db.query('select * from public.discover_individuals()')).rows.length > 0);
assert.ok((await db.query('select * from public.discover_groups()')).rows.length > 0);
await rejected('select public.pass_discovery($1,$2)', [ids[0], 'individual']);
await rejected("select public.send_introduction($1,null,'','bio')", [ids[0]]);
await db.exec('reset role');
await db.query('insert into public.blocks(blocker_id,blocked_id) values($1,$2)', [ids[listerIndex], ids[0]]);
await as(listerIndex);
assert.equal((await db.query('select * from public.discover_individuals() where id=$1', [ids[0]])).rows.length, 0);
await db.exec('reset role');
await db.query('delete from public.blocks where blocker_id=$1 and blocked_id=$2', [ids[listerIndex], ids[0]]);
// A resident can explicitly become a lister; the public profile is hidden and social actions are denied.
await as(10);
await rpc("select public.convert_to_lister('converted-private-phone','Converted agency')");
assert.equal((await rpc('select mode from public.profiles where id=$1', [ids[10]])).mode, 'lister');
assert.equal((await db.query('select * from public.profiles_public where id=$1', [ids[10]])).rows.length, 0);
assert.equal((await rpc('select phone,agency_name from public.profile_private where profile_id=$1', [ids[10]])).phone, 'converted-private-phone');
await rejected('select public.pass_discovery($1,$2)', [ids[0], 'individual']);
await rejected("select public.send_introduction($1,null,'','bio')", [ids[0]]);
// Group membership must be resolved before changing account capability.
await as(1);
await rejected("select public.convert_to_lister('private-phone','')");
await as(4);
for (const id of ids.filter(id => id !== ids[4] && id !== ids[10]).slice(0, 20)) await rpc("select public.send_introduction($1,null,'','bio')", [id]);
await rejected("select public.send_introduction($1,null,'','bio')", [ids[24]]);
await rejected("insert into public.likes(from_user,to_user,message) values($1,$2,'bypass')", [ids[4], ids[24]]);
console.log('PASS: migrations, private drafts/atomic completion, resident-to-lister conversion, trait validation, poster safe-browse/action denial/block isolation, optional introductions, idempotent acceptance, invitation consent, admin/any-member/majority, four-member cap/removal, history/preview boundaries, outsider isolation, pass expiry, symmetric blocking, daily quota, inquiry owner/availability/address checks and direct-write denial.');

// SL08.1 regression: run the forward migration over existing fixtures/history.
await db.exec('reset role');
// Monotonic messaging migration is loaded before card validation above.
await as(0);
const marker = async (seq) => Number((await rpc('select public.mark_conversation_read($1,$2) n',[personal.id,seq])).n);
const unread = async () => Number((await rpc('select * from public.list_chat_inbox() where conversation_id=$1',[personal.id])).unread_count);
const send = async (i,body) => {
  await as(i);
  return Number((await rpc('insert into public.messages(conversation_id,sender_id,body) values($1,$2,$3) returning message_seq n',[personal.id,ids[i],body])).n);
};
for(let i=0;i<10;i++) await send(0,`baseline ${i}`);
const ten = Number((await rpc('select max(message_seq) n from public.messages where conversation_id=$1',[personal.id])).n);
assert.equal(await marker(ten),ten);
await as(1); await marker(ten);
await send(1,'incoming 11');
const twelve=await send(0,'own 12');
assert.equal(await unread(),1);
await db.query("update public.conversation_members set last_read_at='2099-01-01' where conversation_id=$1 and user_id=$2",[personal.id,ids[0]]);
assert.equal(await unread(),1);
await rejected('update public.conversation_members set last_read_seq=999999 where conversation_id=$1',[personal.id]);
await rejected('select public.mark_conversation_read($1,-1)',[personal.id]);
await rejected('select public.mark_conversation_read($1,null)',[personal.id]);
assert.equal(await marker(twelve),twelve);
assert.equal(await marker(ten),twelve);
assert.equal(await unread(),0);
await as(1); assert.equal(await unread(),1);
assert.equal(await marker(999999),twelve);
await send(0,'after clamped marker');
await db.exec('reset role');
await db.query("insert into public.messages(conversation_id,sender_id,kind,body) values($1,null,'system','not unread')",[personal.id]);
await as(1); assert.equal(await unread(),1);
await as(2); await rejected('select public.mark_conversation_read($1,999999)',[personal.id]);
await as(0);
await db.query('insert into public.blocks(blocker_id,blocked_id) values($1,$2)',[ids[0],ids[1]]);
await rejected('select public.mark_conversation_read($1,999999)',[personal.id]);
await as(1); await rejected('select public.mark_conversation_read($1,999999)',[personal.id]);
assert.equal((await db.query('select * from public.list_chat_inbox() where conversation_id=$1',[personal.id])).rows.length,0);
await as(0); await db.query('delete from public.blocks where blocker_id=$1 and blocked_id=$2',[ids[0],ids[1]]);
await as(2);
const boundary=Number((await rpc('select visible_after_seq n from public.conversation_members where conversation_id=$1 and user_id=$2',[group.id,ids[2]])).n);
assert.ok(Number((await rpc('select public.mark_conversation_read($1,0) n',[group.id])).n)>=boundary);
await as(3); await rejected('select public.mark_conversation_read($1,999999)',[group.id]);
await db.exec('reset role; set role anon');
await rejected('select public.mark_conversation_read($1,999999)',[personal.id]);
await as(0);
const requestKey='11111111-1111-4111-8111-111111111111';
const sent=await rpc('select * from public.send_chat_message($1,$2,$3)',[personal.id,'retry-safe',requestKey]);
assert.equal((await rpc('select * from public.send_chat_message($1,$2,$3)',[personal.id,'retry-safe',requestKey])).id,sent.id);
assert.equal(Number((await rpc('select count(*) n from public.messages where id=$1',[sent.id])).n),1);
await rejected('select * from public.send_chat_message($1,$2,$3)',[personal.id,'different payload',requestKey]);
await as(2); await rejected('select * from public.send_chat_message($1,$2,$3)',[personal.id,'outsider',requestKey]);
console.log('PASS: idempotent send retry, same-key payload conflict and outsider denial.');
console.log('PASS: sequence unread, sender/system exclusion, stale-tab monotonicity, clamp/future-message safety, legacy clock immunity, direct-write/anonymous/outsider/block/removed-member denial and group cutoff.');
await db.close();
