const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { loadDraftServices } = require("./draft-service-test-loader.cjs");
function fixture(options = {}) {
  const actor = randomUUID(),
    id = randomUUID(),
    listing = randomUUID(),
    key = randomUUID(),
    bytes = Buffer.from("synthetic immutable edit bytes");
  let who = actor,
    receipt = null,
    attempt = null,
    services;
  const calls = [],
    uploads = new Map();
  const row = {
    id,
    owner_id: actor,
    schema_version: 1,
    revision: 4,
    created_at: "2026-10-24T00:00:00Z",
    updated_at: "2026-10-24T00:00:00Z",
    state: "open",
    source_listing_id: listing,
    source_revision: 7,
    publication_request_id: key,
    import_receipt_id: randomUUID(),
    publication_started_at: null,
    fields: {
      title: "Edited apartment",
      bedrooms: "2",
      availableFrom: "2026-12-01",
      billsIncluded: true,
      isSublet: true,
      description: "Room preserving edit",
      rooms: [true, false].map((isAvailable, i) => ({
        id: randomUUID(),
        label: `Room ${i + 1}`,
        monthlyPrice: String(2100 + i * 500),
        availableFrom: `2026-12-0${i + 2}`,
        isAvailable,
      })),
    },
    photos: [1, 2, 3]
      .map((i) => ({ kind: "published", objectPath: `${listing}/${i}.jpg` }))
      .concat({
        kind: "draft",
        objectPath: `${actor}/${id}/${randomUUID()}.jpg`,
      }),
  };
  const input = () => ({ id, expectedRevision: 4, expectedAccountId: actor });
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: who } }, error: null }),
    },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: structuredClone(row), error: null }),
      };
      return q;
    },
    storage: {
      from: (bucket) => ({
        download: async (path, _options, params) => {
          calls.push(["download", bucket, path]);
          assert.equal(params?.cache, "no-store");
          if (options.readOutage)
            return { error: { message: "offline" }, data: null };
          return {
            data:
              uploads.get(path) ?? new Blob([bytes], { type: "image/jpeg" }),
            error: null,
          };
        },
        upload: async (path, blob, opts) => {
          calls.push(["upload", path]);
          assert.equal(bucket, "apartment-photos");
          assert.equal(opts.upsert, false);
          if (options.uploadOutage) return { error: { message: "offline" } };
          if (uploads.has(path)) return { error: { message: "exists" } };
          uploads.set(
            path,
            options.corruptStage ? new Blob(["wrong bytes"]) : blob,
          );
          return { error: null };
        },
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://example.invalid/${path}` },
        }),
        remove: () => {
          throw Error("Ambiguous cleanup forbidden");
        },
      }),
    },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === "begin_listing_draft_edit") {
        if (options.sourceConflict)
          return { error: { message: "VERSION_CONFLICT" } };
        row.publication_started_at = "2026-10-24T01:00:00Z";
        attempt = services.editModel.listingEditModel(
          row.fields,
          row.photos,
          row.publication_request_id,
        );
        if (options.switchAfterFreeze) who = randomUUID();
        if (options.lostBegin) {
          options.lostBegin = false;
          return { error: { message: "offline" } };
        }
        return {
          data: {
            draft: structuredClone(row),
            model: options.badSnapshot
              ? { ...attempt, title: "wrong snapshot" }
              : attempt,
          },
          error: null,
        };
      }
      if (name === "commit_listing_draft_edit") {
        if (args.p_reconcile_only && !receipt)
          return { error: { message: "EDIT_PENDING" } };
        if (!receipt) {
          receipt = {
            listingId: listing,
            revision: 8,
            requestKey: row.publication_request_id,
          };
          row.state = "completed";
        }
        if (options.lostCommit) {
          options.lostCommit = false;
          return { error: { message: "lost successful response" } };
        }
        return { data: { draft: structuredClone(row), receipt }, error: null };
      }
      if (name === "cancel_listing_draft_edit") {
        if (receipt)
          return { error: { message: "PUBLICATION_ALREADY_COMMITTED" } };
        row.publication_started_at = null;
        row.publication_request_id = randomUUID();
        row.revision++;
        return { data: structuredClone(row), error: null };
      }
      throw Error(`Unexpected ${name}`);
    },
  };
  services = loadDraftServices(client);
  return {
    services,
    row,
    input,
    calls,
    uploads,
    options,
    actor,
    id,
    listing,
    key,
  };
}
test("explicit edit keeps original apartment/room identity, only stages private media and completed retries need no photos", async () => {
  const f = fixture(),
    r = await f.services.editPublishing.saveListingCloudDraftChanges(f.input());
  assert.equal(r.ok, true);
  assert.equal(r.data.listingId, f.listing);
  assert.notEqual(r.data.listingId, r.data.requestKey);
  assert.equal(f.uploads.size, 1);
  assert(f.uploads.has(`${f.key}/4.jpg`));
  const before = f.calls.length;
  f.options.readOutage = true;
  assert.deepEqual(
    await f.services.editPublishing.reconcileListingCloudDraftEdit(f.input()),
    r,
  );
  assert(
    !f.calls
      .slice(before)
      .some((x) =>
        ["download", "upload", "begin_listing_draft_edit"].includes(x[0]),
      ),
  );
});
test("lost successful update response reconciles same original receipt, never writes twice", async () => {
  const f = fixture({ lostCommit: true });
  const r = await f.services.editPublishing.saveListingCloudDraftChanges(
    f.input(),
  );
  assert.equal(r.ok, true);
  assert.equal(
    f.calls.filter(
      (c) => c[0] === "commit_listing_draft_edit" && !c[1].p_reconcile_only,
    ).length,
    1,
  );
  assert.deepEqual(
    await f.services.editPublishing.saveListingCloudDraftChanges(f.input()),
    r,
  );
});
test("lost begin stays frozen and retry resumes; status checks never stage/write a pending update", async () => {
  const f = fixture({ lostBegin: true });
  assert.equal(
    (await f.services.editPublishing.saveListingCloudDraftChanges(f.input()))
      .error.code,
    "PUBLICATION_UNCERTAIN",
  );
  assert(f.row.publication_started_at);
  const before = f.calls.length;
  assert.equal(
    (await f.services.editPublishing.reconcileListingCloudDraftEdit(f.input()))
      .error.code,
    "PUBLICATION_PENDING",
  );
  assert(
    !f.calls
      .slice(before)
      .some((x) =>
        ["download", "upload", "begin_listing_draft_edit"].includes(x[0]),
      ),
  );
  assert.equal(
    (await f.services.editPublishing.saveListingCloudDraftChanges(f.input()))
      .ok,
    true,
  );
});
test("invalid public fields/dates/prices/photo counts and stale/account mismatches cannot freeze or write", async () => {
  for (const mutate of [
    (f) => (f.row.fields.title = ""),
    (f) => (f.row.fields.availableFrom = "2026-02-31"),
    (f) => (f.row.fields.rooms[0].monthlyPrice = ""),
    (f) => (f.row.fields.rooms[1].availableFrom = "2026-02-31"),
    (f) => (f.row.photos = []),
    (f) => (f.row.fields.address = { address: "replacement" }),
    (f) => (f.row.revision = 5),
  ]) {
    const f = fixture();
    mutate(f);
    assert.equal(
      (await f.services.editPublishing.saveListingCloudDraftChanges(f.input()))
        .ok,
      false,
    );
    assert(
      !f.calls.some((x) =>
        [
          "begin_listing_draft_edit",
          "upload",
          "commit_listing_draft_edit",
        ].includes(x[0]),
      ),
    );
  }
  const f = fixture();
  assert.equal(
    (
      await f.services.editPublishing.saveListingCloudDraftChanges({
        ...f.input(),
        expectedAccountId: randomUUID(),
      })
    ).error.code,
    "AUTH_REQUIRED",
  );
  assert.equal(f.calls.length, 0);
});
test("account change after freeze and mismatched server snapshot do not forward bytes or commit", async () => {
  for (const options of [{ switchAfterFreeze: true }, { badSnapshot: true }]) {
    const f = fixture(options);
    assert.equal(
      (await f.services.editPublishing.saveListingCloudDraftChanges(f.input()))
        .ok,
      false,
    );
    assert.equal(f.uploads.size, 0);
    assert(!f.calls.some((x) => x[0] === "commit_listing_draft_edit"));
  }
});
test("corrupt staging stays frozen without cleanup; explicit cancellation preserves input and rotates identity", async () => {
  const f = fixture({ corruptStage: true }),
    before = structuredClone(f.row.fields);
  assert.equal(
    (await f.services.editPublishing.saveListingCloudDraftChanges(f.input()))
      .ok,
    false,
  );
  assert(f.row.publication_started_at);
  assert.equal(f.uploads.size, 1);
  const r = await f.services.editPublishing.cancelListingCloudDraftEdit(
    f.input(),
  );
  assert.equal(r.ok, true);
  assert.equal(r.data.kind, "editable");
  assert.equal(r.data.draft.revision, 5);
  assert.notEqual(r.data.draft.publicationRequestId, f.key);
  assert.deepEqual(r.data.draft.fields, before);
  assert.equal(r.data.draft.sourceRevision, 7);
  assert.equal(f.uploads.size, 1);
});
test("public source CAS is distinct from private draft conflict and preserves current input", async () => {
  const f = fixture({ sourceConflict: true }),
    before = structuredClone(f.row.fields);
  assert.equal(
    (await f.services.editPublishing.saveListingCloudDraftChanges(f.input()))
      .error.code,
    "SOURCE_CONFLICT",
  );
  assert.deepEqual(f.row.fields, before);
  assert.equal(f.row.publication_started_at, null);
  assert.equal(f.uploads.size, 0);
});
