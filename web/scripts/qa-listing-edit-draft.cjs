const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { randomUUID, createHash } = require("node:crypto"),
  { createClient } = require("@supabase/supabase-js"),
  { loadDraftServices } = require("./draft-service-test-loader.cjs");
if (!process.argv.includes("--allow-public-fixtures"))
  throw Error("Exact new synthetic fixture intent required");
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((s) => /^[A-Z_]+=/.test(s))
    .map((s) => {
      const i = s.indexOf("=");
      return [s.slice(0, i), s.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
assert.equal(
  new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  "npbduvjnqnbydolmdpsc.supabase.co",
);
const file = ".qa/task415/manifest.json";
fs.mkdirSync(".qa/task415", { recursive: true });
const m = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : {
      target: env.NEXT_PUBLIC_SUPABASE_URL,
      listingId: randomUUID(),
      keys: [randomUUID(), randomUUID()],
      phase: 0,
      retained: true,
    };
const persist = () => fs.writeFileSync(file, JSON.stringify(m, null, 2));
persist();
const sessions = [],
  checked = (r) => {
    assert.equal(r.ok, true, r.error?.code);
    return r.data;
  },
  bytes = fs.readFileSync(".qa/task221/prepared.jpg"),
  digest = (b) => createHash("sha256").update(b).digest("hex");
async function actor(name) {
  const c = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  if (name) {
    const u = JSON.parse(fs.readFileSync(`.env.qa-${name}.local`))[0];
    assert.equal(
      (
        await c.auth.signInWithPassword({
          email: u.email,
          password: u.password,
        })
      ).error,
      null,
    );
    sessions.push(c);
  }
  return c;
}
async function row(api) {
  const r = await api
    .from("apartments")
    .select("*")
    .eq("id", m.listingId)
    .single();
  assert.equal(r.error, null);
  return r.data;
}
(async () => {
  let owner,
    restore = false;
  try {
    owner = await actor("sl01-lister");
    const peer = await actor("sl01-lister"),
      foreign = await actor("sl01-card"),
      guest = await actor(null),
      s = loadDraftServices(owner),
      p = loadDraftServices(peer),
      other = loadDraftServices(foreign),
      anon = loadDraftServices(guest);
    m.ownerId = (await owner.auth.getUser()).data.user.id;
    persist();
    if (m.phase === 0) {
      const form = new FormData();
      for (const [k, v] of Object.entries({
        requestKey: m.listingId,
        title: "Synthetic private edit draft source",
        bedrooms: "2",
        availableFrom: "2026-12-01",
        description: "Retained task415 QA source",
        address: "Synthetic task415 PRIVATE address",
        latitude: "31.25",
        longitude: "34.79",
        locationMode: "manual",
        locationCity: "Synthetic QA city",
        locationConfirmed: "on",
      }))
        form.set(k, v);
      form.append("roomPrice", "2100");
      form.append("roomPrice", "2600");
      for (let i = 0; i < 3; i++)
        form.append(
          "photos",
          new File([bytes], `${i + 1}.jpg`, { type: "image/jpeg" }),
        );
      const r = await s.listingActions.publishListing(form);
      assert.equal(r.error, null);
      assert.equal(r.listingId, m.listingId);
      m.phase = 1;
      persist();
    }
    const rawRooms = await owner
      .from("apartment_rooms")
      .select("*")
      .eq("apartment_id", m.listingId)
      .order("created_at")
      .order("id");
    assert.equal(rawRooms.error, null);
    m.roomIds = rawRooms.data.map((r) => r.id);
    persist();
    if (process.argv.includes("--prepare")) {
      console.log(
        JSON.stringify({
          listingId: m.listingId,
          ownerId: m.ownerId,
          roomIds: m.roomIds,
          phase: m.phase,
        }),
      );
      return;
    }
    if (process.argv.includes("--race-init")) {
      m.raceListingId ??= randomUUID();
      m.legacyKey ??= randomUUID();
      persist();
      console.log(
        JSON.stringify({
          raceListingId: m.raceListingId,
          legacyKey: m.legacyKey,
          ownerId: m.ownerId,
        }),
      );
      return;
    }
    if (process.argv.includes("--legacy-race")) {
      if (process.argv.includes("--opener-delay"))
        await new Promise((r) => setTimeout(r, 12000));
      const probe = loadDraftServices({
        auth: owner.auth,
        rpc: async (...args) => {
          const r = await owner.rpc(...args);
          if (r.error)
            fs.writeFileSync(
              ".qa/task415/legacy-error.json",
              JSON.stringify(r.error),
            );
          return r;
        },
      });
      const started = Date.now();
      const result = checked(
        await probe.actions.openListingEditCloudDraft({
          listingId: m.raceListingId,
          requestKey: m.legacyKey,
          expectedAccountId: m.ownerId,
        }),
      );
      assert.equal(result.fields.title, "Synthetic legacy race private input");
      assert.equal(result.revision, 0);
      assert.deepEqual(result.photos, []);
      assert.equal(result.sourceListingId, m.raceListingId);
      m.legacyWaitMs = Date.now() - started;
      if (process.argv.includes("--expect-wait"))
        assert(
          m.legacyWaitMs >= 2000,
          "Controlled receipt wait was not observed",
        );
      m.legacyDraftId = result.id;
      m.legacyRaceVerifiedAt = new Date().toISOString();
      persist();
      console.log(
        JSON.stringify({
          legacyDraftId: result.id,
          legacyRacePreserved: true,
          waitMs: m.legacyWaitMs,
        }),
      );
      return;
    }
    const before = await row(owner),
      source = checked(
        await s.editor.getOwnedListingEditModel(m.listingId, m.ownerId),
      );
    assert.equal(
      source.rooms.filter((r) => !r.isAvailable).length,
      1,
      "Exact scoped fixture must have one unavailable room",
    );
    const input = (key) => ({
      listingId: m.listingId,
      requestKey: key,
      expectedAccountId: m.ownerId,
    });
    let d;
    if (m.phase === 1) {
      const opened = await Promise.all([
        s.actions.openListingEditCloudDraft(input(m.keys[0])),
        p.actions.openListingEditCloudDraft(input(m.keys[1])),
      ]);
      d = checked(opened[0]);
      assert.equal(checked(opened[1]).id, d.id);
      assert.deepEqual(opened[0], opened[1]);
      assert.equal(d.kind, "edit");
      assert.equal(d.sourceRevision, source.revision);
      assert.equal(d.revision, 1);
      assert.deepEqual(d.photos, source.photos);
      assert.deepEqual(
        d.fields.rooms,
        source.rooms.map((r) => ({
          ...r,
          monthlyPrice: String(r.monthlyPrice),
        })),
      );
      assert.equal(d.fields.isSublet, source.isSublet);
      assert(!("address" in d.fields));
      m.draftId = d.id;
      m.sourceRevision = d.sourceRevision;
      m.seed = d;
      m.phase = 2;
      persist();
    }
    d = checked(await s.actions.loadListingCloudDraft(m.draftId));
    if (m.phase === 2) {
      m.savedFields = {
        ...d.fields,
        title: "Synthetic private price draft",
        availableFrom: "2027-01-10",
        rooms: d.fields.rooms.map((r, i) =>
          i === 0
            ? { ...r, monthlyPrice: "2999", availableFrom: "2027-01-11" }
            : r,
        ),
      };
      persist();
      d = checked(
        await s.actions.saveListingCloudDraft(d.id, d.revision, m.savedFields),
      );
      m.saved = d;
      m.phase = 3;
      persist();
    }
    assert.deepEqual(d.fields, m.savedFields);
    assert.deepEqual(
      checked(await p.actions.openListingEditCloudDraft(input(randomUUID()))),
      d,
    );
    assert.equal(d.sourceRevision, m.sourceRevision);
    const savedRooms = await owner
      .from("apartment_rooms")
      .select("*")
      .eq("apartment_id", m.listingId)
      .order("created_at")
      .order("id");
    assert.equal(savedRooms.error, null);
    assert.deepEqual(savedRooms.data, rawRooms.data);
    assert.deepEqual(await row(owner), before);
    const count = await owner
      .from("listing_drafts")
      .select("id")
      .eq("source_listing_id", m.listingId)
      .eq("state", "open");
    assert.equal(count.error, null);
    assert.equal(count.data.length, 1);
    let drop = true;
    const ambiguous = {
      auth: peer.auth,
      rpc: async (...args) => {
        const r = await peer.rpc(...args);
        if (drop && !r.error) {
          drop = false;
          return {
            data: null,
            error: { message: "simulated discarded successful reply" },
          };
        }
        return r;
      },
    };
    const retry = loadDraftServices(ambiguous).actions,
      key = randomUUID();
    assert.equal(
      (await retry.openListingEditCloudDraft(input(key))).error.retryable,
      true,
    );
    assert.deepEqual(
      checked(await retry.openListingEditCloudDraft(input(key))),
      d,
    );
    assert.equal(
      (
        await other.actions.openListingEditCloudDraft({
          listingId: m.listingId,
          requestKey: randomUUID(),
        })
      ).error.code,
      "NOT_FOUND",
    );
    assert.equal(
      (await other.actions.loadListingCloudDraft(d.id)).error.code,
      "NOT_FOUND",
    );
    assert.equal(
      (await other.actions.saveListingCloudDraft(d.id, d.revision, {})).error
        .code,
      "NOT_FOUND",
    );
    assert.equal(
      (await anon.actions.openListingEditCloudDraft(input(randomUUID()))).error
        .code,
      "AUTH_REQUIRED",
    );
    assert(
      (
        await guest.rpc("open_listing_edit_draft", {
          p_listing_id: m.listingId,
          p_request_key: randomUUID(),
        })
      ).error,
    );
    assert.equal(
      (
        await s.actions.openListingEditCloudDraft({
          listingId: randomUUID(),
          requestKey: randomUUID(),
        })
      ).error.code,
      "NOT_FOUND",
    );
    assert.equal(
      (
        await s.actions.openListingEditCloudDraft({
          ...input(randomUUID()),
          expectedAccountId: (await foreign.auth.getUser()).data.user.id,
        })
      ).error.code,
      "AUTH_REQUIRED",
    );
    if (m.phase === 3) {
      restore = true;
      const status = await owner
        .from("apartments")
        .update({ status: "taken" })
        .eq("id", m.listingId)
        .eq("lister_id", m.ownerId)
        .select("id");
      assert.equal(status.error, null);
      assert.equal(status.data.length, 1);
      assert.deepEqual(
        checked(await p.actions.openListingEditCloudDraft(input(randomUUID()))),
        d,
      );
      assert.equal(
        checked(await s.editor.getOwnedListingEditModel(m.listingId)).revision,
        m.sourceRevision + 1,
      );
      const active = await owner
        .from("apartments")
        .update({ status: "active" })
        .eq("id", m.listingId)
        .eq("lister_id", m.ownerId)
        .select("id");
      assert.equal(active.error, null);
      assert.equal(active.data.length, 1);
      restore = false;
      m.phase = 4;
      persist();
    }
    const pub = await guest.rpc("get_public_listing", {
      p_listing_id: m.listingId,
    });
    assert.equal(pub.error, null);
    assert.equal(pub.data.length, 1);
    assert.equal(pub.data[0].title, "Synthetic private edit draft source");
    assert.equal(pub.data[0].min_room_price, 2100);
    assert(!JSON.stringify(pub.data).includes("PRIVATE address"));
    assert(!JSON.stringify(pub.data).includes(m.savedFields.title));
    const final = await row(owner);
    for (const k of Object.keys(before))
      if (!["status", "revision"].includes(k))
        assert.deepEqual(final[k], before[k], k);
    assert.equal(final.status, "active");
    for (const photo of d.photos) {
      const image = await owner.storage
        .from("apartment-photos")
        .download(
          photo.objectPath,
          { cacheNonce: randomUUID() },
          { cache: "no-store" },
        );
      assert.equal(image.error, null);
      assert.equal(
        digest(Buffer.from(await image.data.arrayBuffer())),
        digest(bytes),
      );
    }
    assert.deepEqual(
      checked(await p.actions.openListingEditCloudDraft(input(randomUUID()))),
      d,
    );
    m.verifiedAt = new Date().toISOString();
    persist();
    fs.writeFileSync(
      ".qa/task415/audit.json",
      JSON.stringify(
        {
          at: m.verifiedAt,
          target: m.target,
          listingId: m.listingId,
          draftId: d.id,
          sourceRevision: d.sourceRevision,
          draftRevision: d.revision,
          currentListingRevision: final.revision,
          rooms: 2,
          unavailableRooms: 1,
          photos: 3,
          newStorageCopies: 0,
          retained: true,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS ordinary concurrent owner open/resume, complete stable rooms/published refs, private-only price/date save, discarded reply retry, stale source preservation, guest/foreign/account denial, exact public snapshot/room preservation and three JPEG hashes; one synthetic source and edit draft retained",
    );
  } finally {
    try {
      if (restore) {
        const r = await owner
          .from("apartments")
          .update({ status: "active" })
          .eq("id", m.listingId)
          .eq("lister_id", m.ownerId)
          .select("id");
        assert.equal(r.error, null);
        assert.equal(r.data.length, 1);
      }
    } finally {
      for (const c of sessions) await c.auth.signOut({ scope: "local" });
    }
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
