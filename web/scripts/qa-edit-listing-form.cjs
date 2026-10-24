const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { randomUUID, createHash } = require("node:crypto"),
  { createClient } = require("@supabase/supabase-js"),
  { loadDraftServices } = require("./draft-service-test-loader.cjs");
if (!process.argv.includes("--allow-public-fixtures"))
  throw Error("Explicit exact synthetic fixture flag required");
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
const resident = process.argv.includes("--resident");
const dir = ".qa/task43",
  file = dir + (resident ? "/resident.json" : "/manifest.json");
fs.mkdirSync(dir, { recursive: true });
const m = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : {
      target: env.NEXT_PUBLIC_SUPABASE_URL,
      listingId: randomUUID(),
      setupKey: randomUUID(),
      phase: 0,
      retained: true,
    };
const save = () => fs.writeFileSync(file, JSON.stringify(m, null, 2));
save();
const bytes = fs.readFileSync(".qa/task221/prepared.jpg"),
  hash = (b) => createHash("sha256").update(b).digest("hex");
(async () => {
  const api = createClient(m.target, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    user = JSON.parse(
      fs.readFileSync(
        resident ? ".env.qa-sl01-card.local" : ".env.qa-sl01-lister.local",
      ),
    )[0];
  assert.equal(
    (
      await api.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })
    ).error,
    null,
  );
  try {
    m.ownerId = (await api.auth.getUser()).data.user.id;
    if (resident) {
      const p = await api
        .from("profiles")
        .select("mode")
        .eq("id", m.ownerId)
        .single();
      assert.equal(p.error, null);
      assert.notEqual(p.data.mode, "lister");
    }
    save();
    const s = loadDraftServices(api);
    if (m.phase === 0) {
      const form = new FormData();
      for (const [k, v] of Object.entries({
        requestKey: m.listingId,
        title: resident
          ? "Synthetic resident edit UI source"
          : "Synthetic private editor UI source",
        bedrooms: "2",
        availableFrom: "2026-12-01",
        description: "Task43 retained private UI source",
        address: "Synthetic task43 PRIVATE address",
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
      save();
    }
    if (m.phase === 1) {
      const r = await s.editor.getOwnedListingEditModel(m.listingId);
      assert(r.ok);
      const source = r.data,
        edit = {
          title: source.title,
          bedrooms: source.bedrooms,
          billsIncluded: true,
          isSublet: true,
          availableFrom: source.availableFrom,
          description: source.description,
          rooms: source.rooms.map((room, i) => ({
            ...room,
            label: i
              ? resident
                ? "Resident room 2"
                : "Retained unavailable"
              : "Available original",
            availableFrom: i ? "2026-12-03" : "2026-12-02",
          })),
          photos: source.photos,
        };
      const updated = await api.rpc("update_owned_listing", {
        p_listing_id: m.listingId,
        p_expected_revision: source.revision,
        p_request_key: m.setupKey,
        p_model: edit,
      });
      assert.equal(updated.error, null);
      m.roomIds = source.rooms.map((x) => x.id);
      m.phase = 2;
      save();
    }
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
    const a = await api
        .from("apartments")
        .select("*")
        .eq("id", m.listingId)
        .single(),
      rooms = await api
        .from("apartment_rooms")
        .select("*")
        .eq("apartment_id", m.listingId)
        .order("created_at")
        .order("id");
    assert.equal(a.error, null);
    assert.equal(rooms.error, null);
    assert.equal(
      rooms.data.filter((x) => !x.is_available).length,
      resident ? 0 : 1,
    );
    if (process.argv.includes("--baseline")) {
      assert(!m.beforeSource, "Baseline already recorded");
      m.beforeSource = a.data;
      m.beforeRooms = rooms.data;
      m.phase = 3;
      save();
      console.log(
        "PASS isolated source baseline captured after exact-ID room fixture setup",
      );
      return;
    }
    assert.deepEqual(a.data, m.beforeSource);
    assert.deepEqual(rooms.data, m.beforeRooms);
    const d = await api
      .from("listing_drafts")
      .select("*")
      .eq("source_listing_id", m.listingId)
      .eq("state", "open");
    assert.equal(d.error, null);
    assert.equal(d.data.length, 1);
    const draft = d.data[0];
    assert.equal(draft.source_revision, m.beforeSource.revision);
    assert.deepEqual(
      draft.fields.rooms.map((x) => ({ id: x.id, isAvailable: x.isAvailable })),
      m.beforeRooms.map((x) => ({ id: x.id, isAvailable: x.is_available })),
    );
    assert(!("address" in draft.fields));
    assert(!("roomPrices" in draft.fields));
    for (const path of [1, 2, 3].map((i) => `${m.listingId}/${i}.jpg`)) {
      const r = await api.storage
        .from("apartment-photos")
        .download(path, { cacheNonce: randomUUID() }, { cache: "no-store" });
      assert.equal(r.error, null);
      assert.equal(hash(Buffer.from(await r.data.arrayBuffer())), hash(bytes));
    }
    const privateHashes = [];
    for (const photo of draft.photos.filter((x) => x.kind === "draft")) {
      const r = await api.storage
        .from("listing-draft-media")
        .download(
          photo.objectPath,
          { cacheNonce: randomUUID() },
          { cache: "no-store" },
        );
      assert.equal(r.error, null);
      const b = Buffer.from(await r.data.arrayBuffer());
      assert(b.length > 0);
      privateHashes.push({ path: photo.objectPath, sha256: hash(b) });
    }
    fs.writeFileSync(
      dir + (resident ? "/resident-audit.json" : "/audit.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          target: m.target,
          listingId: m.listingId,
          draftId: draft.id,
          draftRevision: draft.revision,
          sourceRevision: draft.source_revision,
          publicUnchanged: true,
          roomsPreserved: true,
          publicPhotosHashVerified: 3,
          privateHashes,
          retained: true,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS exact public/rooms snapshot unchanged, one private edit, stable room IDs/flags/source revision and published/private photo bytes",
    );
  } finally {
    await api.auth.signOut({ scope: "local" });
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
