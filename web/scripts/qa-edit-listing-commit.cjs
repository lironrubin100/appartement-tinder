const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { randomUUID, createHash } = require("node:crypto"),
  { createClient } = require("@supabase/supabase-js"),
  { loadDraftServices } = require("./draft-service-test-loader.cjs");
if (!process.argv.includes("--allow-public-fixtures"))
  throw Error("Explicit exact synthetic fixture intent required");
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((x) => /^[A-Z_]+=/.test(x))
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
assert.equal(
  new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  "npbduvjnqnbydolmdpsc.supabase.co",
);
const resident = process.argv.includes("--resident"),
  dir = ".qa/task416",
  file = dir + (resident ? "/resident.json" : "/manifest.json");
fs.mkdirSync(dir, { recursive: true });
const m = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : {
      listingId: randomUUID(),
      setupKey: randomUUID(),
      phase: 0,
      target: env.NEXT_PUBLIC_SUPABASE_URL,
      retained: true,
    };
const persist = () => fs.writeFileSync(file, JSON.stringify(m, null, 2));
persist();
const account = JSON.parse(
    fs.readFileSync(
      resident ? ".env.qa-sl01-card.local" : ".env.qa-sl01-lister.local",
    ),
  )[0],
  sessions = [];
const bytes = fs.readFileSync(".qa/task221/prepared.jpg"),
  hash = (x) => createHash("sha256").update(x).digest("hex");
const checked = (r) => {
  assert.equal(r.ok, true, r.error?.code);
  return r.data;
};
let mode = "",
  faults = 0;
async function actor(fault = false, credentials = account) {
  const api = createClient(m.target, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const response = await fetch(input, { ...init, cache: "no-store" }),
          url = new URL(
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url,
          );
        const args =
          typeof init?.body === "string" && url.pathname.includes("/rpc/")
            ? JSON.parse(init.body)
            : {};
        if (
          fault &&
          response.ok &&
          ((mode === "begin" &&
            url.pathname.endsWith("/begin_listing_draft_edit")) ||
            (mode === "commit" &&
              url.pathname.endsWith("/commit_listing_draft_edit") &&
              args.p_reconcile_only === false))
        ) {
          faults++;
          return new Response(
            JSON.stringify({ message: "Synthetic lost successful response" }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }
        return response;
      },
    },
  });
  assert.equal(
    (
      await api.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })
    ).error,
    null,
  );
  sessions.push(api);
  return api;
}
const editable = (x) => ({
  title: x.title,
  bedrooms: x.bedrooms,
  billsIncluded: x.billsIncluded,
  isSublet: x.isSublet,
  availableFrom: x.availableFrom,
  description: x.description,
  rooms: x.rooms,
  photos: x.photos,
});
const protectedSource = (x) =>
  Object.fromEntries(
    Object.entries(x).filter(
      ([k]) =>
        ![
          "title",
          "bedrooms",
          "bills_included",
          "is_sublet",
          "available_from",
          "description",
          "photos",
          "revision",
          "price",
        ].includes(k),
    ),
  );
(async () => {
  try {
    const api = await actor(),
      s = loadDraftServices(api);
    m.ownerId = (await api.auth.getUser()).data.user.id;
    persist();
    const readSource = async () => {
      const r = await api
        .from("apartments")
        .select("*")
        .eq("id", m.listingId)
        .single();
      assert.equal(r.error, null);
      return r.data;
    };
    const readRooms = async () => {
      const r = await api
        .from("apartment_rooms")
        .select("*")
        .eq("apartment_id", m.listingId)
        .order("created_at")
        .order("id");
      assert.equal(r.error, null);
      return r.data;
    };
    if (m.phase === 0) {
      const form = new FormData();
      for (const [k, v] of Object.entries({
        requestKey: m.listingId,
        title: resident
          ? "Synthetic resident explicit edit source"
          : "Synthetic explicit edit source",
        bedrooms: "2",
        availableFrom: "2026-12-01",
        description: "Retained task416 exact synthetic source",
        address: "Synthetic task416 PRIVATE address",
        latitude: "31.25",
        longitude: "34.79",
        locationMode: "manual",
        locationCity: "Synthetic city",
        locationConfirmed: "on",
      }))
        form.set(k, v);
      form.append("roomPrice", "2100");
      form.append("roomPrice", "2600");
      for (let i = 1; i <= 3; i++)
        form.append(
          "photos",
          new File([bytes], `${i}.jpg`, { type: "image/jpeg" }),
        );
      const r = await s.listingActions.publishListing(form);
      assert.equal(r.error, null);
      assert.equal(r.listingId, m.listingId);
      m.phase = 1;
      persist();
    }
    if (m.phase === 1) {
      const source = checked(
        await s.editor.getOwnedListingEditModel(m.listingId),
      );
      const result = await api.rpc("update_owned_listing", {
        p_listing_id: m.listingId,
        p_expected_revision: source.revision,
        p_request_key: m.setupKey,
        p_model: {
          ...editable(source),
          rooms: source.rooms.map((r, i) => ({
            ...r,
            label: i ? "Inventory retained" : "Available original",
            availableFrom: i ? "2026-12-03" : "2026-12-02",
          })),
        },
      });
      assert.equal(result.error, null);
      m.roomIds = source.rooms.map((x) => x.id);
      m.phase = 2;
      persist();
    }
    if (process.argv.includes("--prepare")) {
      console.log(
        JSON.stringify({
          listingId: m.listingId,
          ownerId: m.ownerId,
          roomIds: m.roomIds,
          phase: m.phase,
          resident,
        }),
      );
      return;
    }
    if (process.argv.includes("--baseline")) {
      assert(!m.beforeSource, "Baseline already captured");
      m.beforeSource = await readSource();
      m.beforeRooms = await readRooms();
      assert.equal(
        m.beforeRooms.filter((x) => !x.is_available).length,
        resident ? 0 : 1,
      );
      m.phase = 3;
      persist();
      console.log("PASS exact source/room baseline captured");
      return;
    }
    assert.equal(m.phase, 3, "Capture exact baseline first");
    if (process.argv.includes("--service") && !m.serviceDone) {
      const opens = await Promise.all([
        s.editor.openOwnedListingEditDraft({
          listingId: m.listingId,
          requestKey: randomUUID(),
        }),
        s.editor.openOwnedListingEditDraft({
          listingId: m.listingId,
          requestKey: randomUUID(),
        }),
      ]);
      assert.equal(checked(opens[0]).id, checked(opens[1]).id);
      let d = checked(opens[0]);
      const other = checked(
        await s.actions.createListingCloudDraft({
          requestKey: randomUUID(),
          fields: { title: "Task416 isolated sibling" },
        }),
      );
      m.otherDraftId = other.id;
      const before = await readSource();
      const fields = {
        ...d.fields,
        title: "Synthetic explicit edit source",
        availableFrom: "2027-01-01",
        rooms: d.fields.rooms.map((r, i) => ({
          ...r,
          monthlyPrice: String(Number(r.monthlyPrice) + 111),
          availableFrom: i ? "2027-01-03" : "2027-01-02",
        })),
      };
      d = checked(
        await s.actions.saveListingCloudDraft(d.id, d.revision, fields),
      );
      d = checked(
        await s.media.saveDraftMedia(d, [
          {
            kind: "upload",
            objectId: randomUUID(),
            blob: new Blob([bytes], { type: "image/jpeg" }),
            digest: hash(bytes),
          },
          ...d.photos,
        ]),
      );
      assert.deepEqual(await readSource(), before);
      m.privatePaths = d.photos
        .filter((x) => x.kind === "draft")
        .map((x) => x.objectPath);
      persist();
      const faultApi = await actor(true),
        faultService = loadDraftServices(faultApi),
        input = () => ({
          id: d.id,
          expectedRevision: d.revision,
          expectedAccountId: m.ownerId,
        });
      mode = "begin";
      const lost =
        await faultService.editPublishing.saveListingCloudDraftChanges(input());
      assert.equal(lost.ok, false);
      assert(faults > 0);
      assert.equal(
        (await s.editPublishing.reconcileListingCloudDraftEdit(input())).error
          .code,
        "PUBLICATION_PENDING",
      );
      assert.deepEqual(await readSource(), before);
      const cancelled =
        await s.editPublishing.cancelListingCloudDraftEdit(input());
      assert.equal(cancelled.ok, true);
      assert.equal(cancelled.data.kind, "editable");
      assert.deepEqual(cancelled.data.draft.fields, d.fields);
      d = cancelled.data.draft;
      mode = "commit";
      const results = await Promise.all([
        faultService.editPublishing.saveListingCloudDraftChanges(input()),
        s.editPublishing.saveListingCloudDraftChanges(input()),
      ]);
      for (const r of results) {
        assert.equal(r.ok, true, r.error?.code);
        assert.equal(r.data.listingId, m.listingId);
      }
      assert.deepEqual(results[0], results[1]);
      mode = "";
      const completed = checked(await s.actions.loadListingCloudDraft(d.id));
      assert.equal(completed.state, "completed");
      assert.deepEqual(
        await s.editPublishing.reconcileListingCloudDraftEdit(input()),
        results[0],
      );
      assert.equal((await readSource()).revision, before.revision + 1);
      assert.deepEqual(
        checked(await s.actions.loadListingCloudDraft(other.id)),
        other,
      );
      m.completedDraftId = d.id;
      m.completedKey = d.publicationRequestId;
      m.serviceFaults = faults;
      // Conflict uses the actual guarded public writer on this new source only.
      d = checked(
        await s.editor.openOwnedListingEditDraft({
          listingId: m.listingId,
          requestKey: randomUUID(),
        }),
      );
      d = checked(
        await s.actions.saveListingCloudDraft(d.id, d.revision, {
          ...d.fields,
          title: "Private stale edit retained",
        }),
      );
      const current = checked(
        await s.editor.getOwnedListingEditModel(m.listingId),
      );
      const changed = await api.rpc("update_owned_listing", {
        p_listing_id: m.listingId,
        p_expected_revision: current.revision,
        p_request_key: randomUUID(),
        p_model: {
          ...editable(current),
          description: "Scoped concurrent owner update",
        },
      });
      assert.equal(changed.error, null);
      const conflict =
        await s.editPublishing.saveListingCloudDraftChanges(input());
      assert.equal(conflict.error.code, "SOURCE_CONFLICT");
      const still = checked(await s.actions.loadListingCloudDraft(d.id));
      assert.equal(still.fields.title, "Private stale edit retained");
      assert.equal(still.publicationStartedAt, null);
      d = checked(
        await s.editPublishing.refreshListingCloudDraftSource(input()),
      );
      assert.equal(d.sourceRevision, current.revision + 1);
      m.draftId = d.id;
      m.serviceDone = true;
      persist();
      console.log(
        "PASS real ordinary same-draft open, private fields/media, lost begin, cancellation, concurrent commit/lost response, one public revision, exact receipt, sibling isolation and source conflict/explicit refresh",
      );
    }
    const source = await readSource(),
      rooms = await readRooms();
    assert.deepEqual(protectedSource(source), protectedSource(m.beforeSource));
    assert.deepEqual(
      rooms.map(({ id, apartment_id, is_available, created_at }) => ({
        id,
        apartment_id,
        is_available,
        created_at,
      })),
      m.beforeRooms.map(({ id, apartment_id, is_available, created_at }) => ({
        id,
        apartment_id,
        is_available,
        created_at,
      })),
    );
    for (const url of source.photos) {
      const path = url.split("/apartment-photos/")[1];
      assert(path);
      const r = await api.storage
        .from("apartment-photos")
        .download(path, { cacheNonce: randomUUID() }, { cache: "no-store" });
      assert.equal(r.error, null);
      assert((await r.data.arrayBuffer()).byteLength > 0);
    }
    for (let i = 1; i <= 3; i++) {
      const r = await api.storage
        .from("apartment-photos")
        .download(
          `${m.listingId}/${i}.jpg`,
          { cacheNonce: randomUUID() },
          { cache: "no-store" },
        );
      assert.equal(r.error, null);
      assert.equal(hash(Buffer.from(await r.data.arrayBuffer())), hash(bytes));
    }
    const ds = await api
      .from("listing_drafts")
      .select("id,state,revision,publication_request_id,source_revision")
      .eq("source_listing_id", m.listingId);
    assert.equal(ds.error, null);
    const receipts = await api
      .from("listing_edit_requests")
      .select("request_key,previous_revision,revision")
      .eq("listing_id", m.listingId);
    assert.equal(receipts.error, null);
    if (ds.data.length) {
      const outsider = await actor(
        false,
        JSON.parse(
          fs.readFileSync(
            resident ? ".env.qa-sl01-lister.local" : ".env.qa-sl01-card.local",
          ),
        )[0],
      );
      const guest = createClient(m.target, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const target = ds.data[0];
      for (const denied of [outsider, guest])
        for (const name of [
          "begin_listing_draft_edit",
          "commit_listing_draft_edit",
          "cancel_listing_draft_edit",
          "refresh_listing_edit_draft",
        ]) {
          const args = {
            p_draft_id: target.id,
            p_expected_revision: target.revision,
          };
          if (name === "begin_listing_draft_edit")
            args.p_photo_digests = Array(3).fill("a".repeat(64));
          if (name === "commit_listing_draft_edit")
            args.p_reconcile_only = false;
          assert(
            (await denied.rpc(name, args)).error,
            "Foreign/guest edit endpoint allowed",
          );
        }
    }
    let stagedCopiesHashVerified = 0;
    for (const row of ds.data.filter((d) => d.state === "completed")) {
      const full = checked(await s.actions.loadListingCloudDraft(row.id));
      const receipt = receipts.data.find(
        (r) => r.request_key === full.publicationRequestId,
      );
      assert(receipt, "Completed edit has no matching update receipt");
      assert.equal(receipt.previous_revision, full.sourceRevision);
      assert.equal(receipt.revision, full.sourceRevision + 1);
      for (const [index, photo] of full.photos.entries()) {
        if (photo.kind !== "draft") continue;
        const a = await api.storage
          .from("listing-draft-media")
          .download(
            photo.objectPath,
            { cacheNonce: randomUUID() },
            { cache: "no-store" },
          );
        const b = await api.storage
          .from("apartment-photos")
          .download(
            `${full.publicationRequestId}/${index + 1}.jpg`,
            { cacheNonce: randomUUID() },
            { cache: "no-store" },
          );
        assert.equal(a.error, null);
        assert.equal(b.error, null);
        assert.equal(
          hash(Buffer.from(await a.data.arrayBuffer())),
          hash(Buffer.from(await b.data.arrayBuffer())),
        );
        stagedCopiesHashVerified++;
      }
    }
    const audit = {
      at: new Date().toISOString(),
      target: m.target,
      listingId: m.listingId,
      ownerId: m.ownerId,
      protectedSourceUnchanged: true,
      roomInventoryUnchanged: true,
      sourceRevision: source.revision,
      publicPhotos: source.photos.length,
      originalPhotosHashVerified: 3,
      stagedCopiesHashVerified,
      drafts: ds.data,
      receipts: receipts.data,
      retained: true,
    };
    fs.writeFileSync(
      dir + (resident ? "/resident-audit.json" : "/audit.json"),
      JSON.stringify(audit, null, 2),
    );
    console.log(
      "PASS exact protected source/room inventory and published photo audit",
      JSON.stringify({
        listingId: m.listingId,
        revision: source.revision,
        drafts: ds.data.length,
      }),
    );
  } finally {
    for (const c of sessions) await c.auth.signOut({ scope: "local" });
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
