const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { loadDraftServices } = require("./draft-service-test-loader.cjs");
function fixture() {
  const actor = randomUUID(),
    listing = randomUUID(),
    calls = [];
  let who = actor,
    error = null,
    swap = false;
  const room = {
    id: randomUUID(),
    label: null,
    monthlyPrice: "2100",
    availableFrom: "2026-12-02",
    isAvailable: false,
  };
  const row = {
    id: randomUUID(),
    owner_id: actor,
    schema_version: 1,
    revision: 1,
    created_at: "2026-10-23T00:00:00Z",
    updated_at: "2026-10-23T00:00:00Z",
    state: "open",
    source_listing_id: listing,
    source_revision: 7,
    fields: { title: "Seed", isSublet: true, rooms: [room] },
    photos: [{ kind: "published", objectPath: randomUUID() + "/1.jpg" }],
    publication_request_id: randomUUID(),
    import_receipt_id: randomUUID(),
    publication_started_at: null,
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: who ? { id: who } : null },
        error: null,
      }),
    },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (swap) who = randomUUID();
      return { data: row, error };
    },
  };
  const s = loadDraftServices(client);
  return {
    actor,
    listing,
    row,
    room,
    calls,
    s,
    input: {
      listingId: listing,
      requestKey: randomUUID(),
      expectedAccountId: actor,
    },
    as: (v) => (who = v),
    fail: (m) => (error = { message: m }),
    swap: () => (swap = true),
  };
}
test("open adapter returns explicit room-preserving edit document through one authenticated atomic RPC", async () => {
  const f = fixture(),
    r = await f.s.actions.openListingEditCloudDraft(f.input);
  assert.equal(r.ok, true);
  assert.equal(r.data.kind, "edit");
  assert.equal(r.data.sourceRevision, 7);
  assert.deepEqual(r.data.fields.rooms, [f.room]);
  assert.equal(r.data.fields.isSublet, true);
  assert.deepEqual(f.calls, [
    [
      "open_listing_edit_draft",
      { p_listing_id: f.listing, p_request_key: f.input.requestKey },
    ],
  ]);
  const upper = await f.s.actions.openListingEditCloudDraft({
    ...f.input,
    listingId: f.listing.toUpperCase(),
    requestKey: f.input.requestKey.toUpperCase(),
  });
  assert.equal(upper.ok, true);
  assert.equal(f.calls[1][1].p_listing_id, f.listing);
});
test("anonymous, malformed and owner/source override inputs fail before RPC", async () => {
  const f = fixture();
  for (const input of [
    null,
    [],
    { ...f.input, ownerId: f.actor },
    { ...f.input, sourceRevision: 7 },
    { ...f.input, fields: {} },
    { ...f.input, listingId: "bad" },
    { ...f.input, requestKey: null },
  ])
    assert.equal(
      (await f.s.actions.openListingEditCloudDraft(input)).error.code,
      "VALIDATION_FAILED",
    );
  assert.equal(
    (
      await f.s.actions.openListingEditCloudDraft({
        ...f.input,
        expectedAccountId: randomUUID(),
      })
    ).error.code,
    "AUTH_REQUIRED",
  );
  f.as(null);
  assert.equal(
    (await f.s.actions.openListingEditCloudDraft(f.input)).error.code,
    "AUTH_REQUIRED",
  );
  assert.equal(f.calls.length, 0);
});
test("late account replacement never returns private draft content; errors are typed and redacted", async () => {
  const f = fixture();
  f.swap();
  assert.equal(
    (await f.s.actions.openListingEditCloudDraft(f.input)).error.code,
    "AUTH_REQUIRED",
  );
  for (const [message, code] of [
    ["SOURCE_UNAVAILABLE", "NOT_FOUND"],
    ["IMPORT_CONFLICT", "VERSION_CONFLICT"],
    ["DRAFT_CLOSED", "STATE_UNAVAILABLE"],
    ["PHOTO_UNAVAILABLE", "STATE_UNAVAILABLE"],
    ["INVALID_INPUT", "VALIDATION_FAILED"],
    ["secret SQL or address", "INTERNAL"],
  ]) {
    const x = fixture();
    x.fail(message);
    const r = await x.s.actions.openListingEditCloudDraft(x.input);
    assert.equal(r.error.code, code);
    assert(!JSON.stringify(r).includes(message));
  }
  for (const change of [
    (r) => (r.owner_id = randomUUID()),
    (r) => (r.source_listing_id = randomUUID()),
    (r) => (r.source_listing_id = null),
    (r) => (r.state = "completed"),
    (r) => (r.photos[0].objectPath = "https://signed.invalid/token"),
  ]) {
    const x = fixture();
    change(x.row);
    assert.equal(
      (await x.s.actions.openListingEditCloudDraft(x.input)).ok,
      false,
    );
  }
});
test("private room fields allow incomplete strings but reject duplicated identities, metadata and malformed state", () => {
  const f = fixture(),
    parse = f.s.contract.parseDraftFields;
  assert.deepEqual(
    parse({
      rooms: [{ ...f.room, monthlyPrice: "", availableFrom: "" }],
      isSublet: false,
    }),
    {
      rooms: [{ ...f.room, monthlyPrice: "", availableFrom: "" }],
      isSublet: false,
    },
  );
  for (const rooms of [
    [f.room, { ...f.room, id: f.room.id.toUpperCase() }],
    [{ ...f.room, ownerId: f.actor }],
    [{ ...f.room, id: "bad" }],
    [{ ...f.room, isAvailable: "false" }],
    [{ ...f.room, monthlyPrice: 2100 }],
    [{ ...f.room, label: "x".repeat(81) }],
    Array.from({ length: 21 }, () => ({ ...f.room, id: randomUUID() })),
  ])
    assert.equal(parse({ rooms }), null);
});
