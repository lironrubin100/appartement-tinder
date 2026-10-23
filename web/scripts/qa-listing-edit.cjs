const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { randomUUID, createHash } = require("node:crypto"),
  { createClient } = require("@supabase/supabase-js"),
  { loadDraftServices } = require("./draft-service-test-loader.cjs");
if (!process.argv.includes("--allow-public-fixtures"))
  throw Error("Explicit scoped public fixture flag required");
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
const file = ".qa/task42/manifest.json";
fs.mkdirSync(".qa/task42", { recursive: true });
const m = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : {
      target: env.NEXT_PUBLIC_SUPABASE_URL,
      listingId: randomUUID(),
      firstKey: randomUUID(),
      replaceKey: randomUUID(),
      foreignKey: randomUUID(),
      retained: true,
    };
const persist = () => fs.writeFileSync(file, JSON.stringify(m, null, 2));
persist();
const sessions = [],
  hash = (x) => createHash("sha256").update(x).digest("hex"),
  bytes = fs.readFileSync(".qa/task221/prepared.jpg");
async function actor(name) {
  const c = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  if (name) {
    const u = JSON.parse(fs.readFileSync(`.env.qa-${name}.local`))[0];
    assert.equal((await c.auth.signInWithPassword(u)).error, null);
    sessions.push(c);
  }
  return c;
}
const checked = (r) => {
  assert.equal(r.ok, true, r.error?.code);
  return r.data;
};
function editable(row) {
  return {
    title: row.title,
    bedrooms: row.bedrooms,
    billsIncluded: row.billsIncluded,
    isSublet: row.isSublet,
    availableFrom: row.availableFrom,
    description: row.description,
    rooms: row.rooms,
    photos: row.photos,
  };
}
async function upload(api, key) {
  const path = `${key}/1.jpg`,
    r = await api.storage
      .from("apartment-photos")
      .upload(path, bytes, { contentType: "image/jpeg", cacheControl: "0" });
  if (r.error) {
    const d = await api.storage
      .from("apartment-photos")
      .download(path, { nonce: randomUUID() }, { cache: "no-store" });
    assert.equal(d.error, null);
    assert.equal(hash(Buffer.from(await d.data.arrayBuffer())), hash(bytes));
  }
  return path;
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
function protectedFields(raw) {
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([k]) =>
        ![
          "title",
          "bedrooms",
          "bills_included",
          "is_sublet",
          "available_from",
          "description",
          "photos",
          "price",
          "revision",
        ].includes(k),
    ),
  );
}
(async () => {
  let owner,
    restore = false;
  try {
    owner = await actor("sl01-lister");
    const peer = await actor("sl01-lister"),
      foreign = await actor("sl01-card"),
      guest = await actor(null);
    m.ownerId = (await owner.auth.getUser()).data.user.id;
    m.foreignId = (await foreign.auth.getUser()).data.user.id;
    persist();
    const load = async () =>
      checked(
        await loadDraftServices(owner).editor.getOwnedListingEditModel(
          m.listingId,
          m.ownerId,
        ),
      );
    if (process.argv.includes("--legacy-check")) {
      m.legacyListingId ??= randomUUID();
      persist();
      const form = new FormData();
      for (const [key, value] of Object.entries({
        requestKey: m.legacyListingId,
        title: "Synthetic legacy publication compatibility",
        bedrooms: "2",
        availableFrom: "2026-12-01",
        description: "Task42 guarded publication after room grant closure",
        address: "Synthetic task42 legacy PRIVATE address",
        latitude: "31.25",
        longitude: "34.79",
        locationMode: "manual",
        locationCity: "Synthetic QA city",
        locationConfirmed: "on",
      }))
        form.set(key, value);
      form.append("roomPrice", "2150");
      form.append("roomPrice", "2650");
      for (let i = 0; i < 3; i++)
        form.append(
          "photos",
          new File([bytes], `${i + 1}.jpg`, { type: "image/jpeg" }),
        );
      const published =
        await loadDraftServices(owner).listingActions.publishListing(form);
      assert.equal(published.error, null);
      assert.equal(published.listingId, m.legacyListingId);
      const publicListing = await guest.rpc("get_public_listing", {
        p_listing_id: m.legacyListingId,
      });
      assert.equal(publicListing.error, null);
      assert.equal(publicListing.data.length, 1);
      assert.equal(publicListing.data[0].available_room_count, 2);
      assert.equal(publicListing.data[0].min_room_price, 2150);
      assert.equal(publicListing.data[0].max_room_price, 2650);
      for (let i = 1; i <= 3; i++) {
        const image = await owner.storage
          .from("apartment-photos")
          .download(
            `${m.legacyListingId}/${i}.jpg`,
            { nonce: randomUUID() },
            { cache: "no-store" },
          );
        assert.equal(image.error, null);
        assert.equal(
          hash(Buffer.from(await image.data.arrayBuffer())),
          hash(bytes),
        );
      }
      m.legacyVerifiedAt = new Date().toISOString();
      persist();
      console.log(
        "PASS actual legacy FormData publication after direct room grants closed: one scoped listing/two rooms/three hash-verified JPEGs, no app privilege expansion",
      );
      return;
    }
    if (!m.published) {
      const form = new FormData();
      for (const [key, value] of Object.entries({
        requestKey: m.listingId,
        title: "Synthetic atomic edit fixture",
        bedrooms: "2",
        availableFrom: "2026-12-01",
        description: "Retained scoped task42 QA",
        address: "Synthetic task42 PRIVATE address",
        latitude: "31.25",
        longitude: "34.79",
        locationMode: "manual",
        locationCity: "Synthetic QA city",
        locationConfirmed: "on",
      }))
        form.set(key, value);
      form.append("roomPrice", "2100");
      form.append("roomPrice", "2600");
      for (let i = 0; i < 3; i++)
        form.append(
          "photos",
          new File([bytes], `${i + 1}.jpg`, { type: "image/jpeg" }),
        );
      const r =
        await loadDraftServices(owner).listingActions.publishListing(form);
      assert.equal(r.error, null);
      assert.equal(r.listingId, m.listingId);
      m.published = true;
      persist();
    }
    let model = await load();
    m.roomIds ??= model.rooms.map((x) => x.id);
    m.originalPaths ??= model.photos.map((x) => x.objectPath);
    m.protectedSnapshot ??= protectedFields(await row(owner));
    persist();
    if (process.argv.includes("--prepare")) {
      console.log(
        JSON.stringify({
          target: m.target,
          listingId: m.listingId,
          ownerId: m.ownerId,
          roomIds: m.roomIds,
          requiredFixtureSetup:
            "Set only the second exact room unavailable before verification; no open edit exists yet.",
        }),
      );
      return;
    }
    assert.equal(model.rooms.length, 2);
    assert.equal(
      model.rooms[1].isAvailable,
      false,
      "Exact fixture setup pending",
    );
    const invoke = (api, input) => api.rpc("update_owned_listing", input);
    if (!m.firstDone) {
      m.firstExpected ??= model.revision;
      m.firstModel ??= {
        ...editable(model),
        title: "Synthetic atomic price/date edit",
        billsIncluded: true,
        description: "Atomic edited facts",
        availableFrom: "2026-12-11",
        rooms: model.rooms.map((r, i) => ({
          ...r,
          label: `Stable room ${i + 1}`,
          monthlyPrice: i ? 2700 : 2200,
          availableFrom: i ? "2026-12-13" : "2026-12-12",
        })),
        photos: [model.photos[2], model.photos[0], model.photos[1]],
      };
      persist();
      const input = {
        p_listing_id: m.listingId,
        p_expected_revision: m.firstExpected,
        p_request_key: m.firstKey,
        p_model: m.firstModel,
      };
      const pair = await Promise.all([
        invoke(owner, input),
        invoke(peer, input),
      ]);
      for (const r of pair) assert.equal(r.error, null);
      assert.deepEqual(pair[0].data, pair[1].data);
      assert.equal(pair[0].data.revision, m.firstExpected + 1);
      m.firstDone = true;
      persist();
      console.log(
        "PASS actual concurrent identical edit retry commits one full model/revision",
      );
    }
    model = await load();
    const retry = await invoke(owner, {
      p_listing_id: m.listingId,
      p_expected_revision: m.firstExpected,
      p_request_key: m.firstKey,
      p_model: m.firstModel,
    });
    assert.equal(retry.error, null);
    assert.equal(retry.data.revision, m.firstExpected + 1);
    assert.equal(
      (
        await invoke(owner, {
          p_listing_id: m.listingId,
          p_expected_revision: m.firstExpected,
          p_request_key: m.firstKey,
          p_model: { ...m.firstModel, title: "different payload" },
        })
      ).error.message,
      "VERSION_CONFLICT",
    );
    if (!m.raceDone) {
      m.raceExpected ??= model.revision;
      m.raceModels ??= [
        {
          ...editable(model),
          title: "Synthetic race candidate A",
          rooms: model.rooms.map((r, i) => ({
            ...r,
            monthlyPrice: i ? 2750 : 2250,
          })),
        },
        {
          ...editable(model),
          title: "Synthetic race candidate B",
          rooms: model.rooms.map((r, i) => ({
            ...r,
            monthlyPrice: i ? 2800 : 2300,
          })),
        },
      ];
      m.raceKeys ??= [randomUUID(), randomUUID()];
      persist();
      const r = await Promise.all(
        m.raceModels.map((p_model, i) =>
          invoke(i ? peer : owner, {
            p_listing_id: m.listingId,
            p_expected_revision: m.raceExpected,
            p_request_key: m.raceKeys[i],
            p_model,
          }),
        ),
      );
      assert.equal(r.filter((x) => !x.error).length, 1);
      assert.equal(r.find((x) => x.error).error.message, "VERSION_CONFLICT");
      m.raceWinner = r.findIndex((x) => !x.error);
      model = await load();
      assert.equal(model.revision, m.raceExpected + 1);
      assert.equal(model.title, m.raceModels[m.raceWinner].title);
      assert.deepEqual(
        model.rooms.map((x) => x.monthlyPrice),
        m.raceModels[m.raceWinner].rooms.map((x) => x.monthlyPrice),
      );
      m.raceDone = true;
      persist();
      console.log(
        "PASS two actual devices at one revision: one complete winner and one conflict, no mixed room facts",
      );
    }
    model = await load();
    const staged = await upload(owner, m.replaceKey);
    await upload(foreign, m.foreignKey);
    if (!m.replaceDone) {
      m.replaceExpected ??= model.revision;
      m.replaceModel ??= {
        ...editable(model),
        title: "Synthetic atomic photo replacement",
        photos: [
          { kind: "published", objectPath: staged },
          ...model.photos.slice(1),
        ],
      };
      persist();
      const args = {
        p_listing_id: m.listingId,
        p_expected_revision: m.replaceExpected,
        p_request_key: m.replaceKey,
        p_model: m.replaceModel,
      };
      const hidden = await invoke(owner, args);
      assert.equal(hidden.error, null);
      const replay = await invoke(peer, args);
      assert.equal(replay.error, null);
      assert.deepEqual(replay.data, hidden.data);
      assert.equal(replay.data.revision, m.replaceExpected + 1);
      m.replaceDone = true;
      persist();
      console.log(
        "PASS replacement refs and facts commit once; simulated lost successful reply reconciles original receipt",
      );
    }
    model = await load();
    const before = structuredClone(model),
      base = editable(model);
    const failures = [
      ["VALIDATION_FAILED", { ...base, location: { address: "replacement" } }],
      ["VALIDATION_FAILED", { ...base, ownerId: m.foreignId }],
      ["VALIDATION_FAILED", { ...base, title: "" }],
      ["VALIDATION_FAILED", { ...base, availableFrom: "2026-02-30" }],
      [
        "VALIDATION_FAILED",
        {
          ...base,
          rooms: model.rooms.map((r, i) => (i ? r : { ...r, monthlyPrice: 0 })),
        },
      ],
      [
        "ROOM_INVENTORY_CHANGED",
        {
          ...base,
          rooms: model.rooms.map((r, i) =>
            i ? { ...r, isAvailable: true } : r,
          ),
        },
      ],
      ["ROOM_INVENTORY_CHANGED", { ...base, rooms: model.rooms.slice(0, 1) }],
      [
        "INVALID_PHOTOS",
        {
          ...base,
          photos: [
            { kind: "published", objectPath: `${m.foreignKey}/1.jpg` },
            ...model.photos.slice(1),
          ],
        },
      ],
      [
        "INVALID_PHOTOS",
        {
          ...base,
          photos: [
            { kind: "published", objectPath: `${randomUUID()}/1.jpg` },
            ...model.photos.slice(1),
          ],
        },
      ],
      [
        "VALIDATION_FAILED",
        {
          ...base,
          photos: [
            { kind: "draft", objectPath: "private/photo.jpg" },
            ...model.photos.slice(1),
          ],
        },
      ],
    ];
    for (const [code, p_model] of failures) {
      const r = await invoke(owner, {
        p_listing_id: m.listingId,
        p_expected_revision: model.revision,
        p_request_key: randomUUID(),
        p_model,
      });
      assert.equal(r.error?.message, code);
      assert.deepEqual(await load(), before);
    }
    assert.equal(
      (
        await invoke(foreign, {
          p_listing_id: m.listingId,
          p_expected_revision: model.revision,
          p_request_key: randomUUID(),
          p_model: base,
        })
      ).error.message,
      "NOT_FOUND",
    );
    const denied = await invoke(guest, {
      p_listing_id: m.listingId,
      p_expected_revision: model.revision,
      p_request_key: randomUUID(),
      p_model: base,
    });
    assert(denied.error);
    assert(!JSON.stringify(denied).includes("PRIVATE address"));
    for (const write of [
      () =>
        owner
          .from("apartment_rooms")
          .update({ monthly_price: 1 })
          .eq("id", m.roomIds[0]),
      () => owner.from("apartment_rooms").delete().eq("id", m.roomIds[0]),
      () =>
        owner.from("apartment_rooms").insert({
          apartment_id: m.listingId,
          monthly_price: 1,
          available_from: "2026-12-01",
        }),
      () =>
        owner
          .from("apartments")
          .update({ revision: 999 })
          .eq("id", m.listingId),
    ])
      assert.equal((await write()).error.code, "42501");
    assert.deepEqual(await load(), before);
    console.log(
      "PASS real negative full-model/media/inventory/foreign/guest checks preserve old state; direct room/revision writes denied",
    );
    model = await load();
    const prev = model.revision;
    restore = true;
    assert.equal(
      (
        await owner
          .from("apartments")
          .update({ status: "taken" })
          .eq("id", m.listingId)
          .eq("lister_id", m.ownerId)
      ).error,
      null,
    );
    assert.equal(
      (
        await owner
          .from("apartments")
          .update({ status: "taken" })
          .eq("id", m.listingId)
          .eq("lister_id", m.ownerId)
      ).error,
      null,
    );
    model = await load();
    assert.equal(model.revision, prev + 1);
    assert.equal(model.status, "taken");
    assert.equal(
      (
        await invoke(owner, {
          p_listing_id: m.listingId,
          p_expected_revision: prev,
          p_request_key: randomUUID(),
          p_model: base,
        })
      ).error.message,
      "VERSION_CONFLICT",
    );
    const takenEdit = await invoke(owner, {
      p_listing_id: m.listingId,
      p_expected_revision: model.revision,
      p_request_key: randomUUID(),
      p_model: { ...editable(model), title: "Synthetic atomic edit verified" },
    });
    assert.equal(takenEdit.error, null);
    model = await load();
    assert.equal(model.status, "taken");
    assert.equal(model.revision, prev + 2);
    assert.equal(model.rooms[1].isAvailable, false);
    const unavailable = await guest.rpc("get_public_listing", {
      p_listing_id: m.listingId,
    });
    assert.equal(unavailable.error, null);
    assert.equal(unavailable.data.length, 0);
    assert.equal(
      (
        await owner
          .from("apartments")
          .update({ status: "active" })
          .eq("id", m.listingId)
          .eq("lister_id", m.ownerId)
      ).error,
      null,
    );
    restore = false;
    model = await load();
    assert.equal(model.revision, prev + 3);
    assert.deepEqual(protectedFields(await row(owner)), m.protectedSnapshot);
    assert.deepEqual(
      model.rooms.map((x) => x.id),
      m.roomIds,
    );
    assert.equal(model.rooms[0].isAvailable, true);
    assert.equal(model.rooms[1].isAvailable, false);
    const receipts = await owner
      .from("listing_edit_requests")
      .select("request_key,revision")
      .eq("listing_id", m.listingId);
    assert.equal(receipts.error, null);
    assert.equal(
      new Set(receipts.data.map((x) => x.request_key)).size,
      receipts.data.length,
    );
    const foreignReceipts = await foreign
      .from("listing_edit_requests")
      .select("listing_id")
      .eq("listing_id", m.listingId);
    assert.equal(foreignReceipts.error, null);
    assert.equal(foreignReceipts.data.length, 0);
    const pub = await guest.rpc("get_public_listing", {
      p_listing_id: m.listingId,
    });
    assert.equal(pub.error, null);
    assert.equal(pub.data.length, 1);
    assert.equal(pub.data[0].available_room_count, 1);
    for (const k of ["address", "lat", "lng", "lister_id", "revision"])
      assert(!Object.hasOwn(pub.data[0], k));
    assert(!JSON.stringify(pub.data).includes("PRIVATE address"));
    for (const path of new Set([
      ...m.originalPaths,
      ...model.photos.map((x) => x.objectPath),
    ])) {
      const d = await owner.storage
        .from("apartment-photos")
        .download(path, { nonce: randomUUID() }, { cache: "no-store" });
      assert.equal(d.error, null);
      assert.equal(hash(Buffer.from(await d.data.arrayBuffer())), hash(bytes));
    }
    m.lastRevision = model.revision;
    m.verifiedAt = new Date().toISOString();
    persist();
    fs.writeFileSync(
      ".qa/task42/audit.json",
      JSON.stringify(
        {
          at: m.verifiedAt,
          target: m.target,
          listingId: m.listingId,
          revision: model.revision,
          rooms: 2,
          unavailableRooms: 1,
          currentPhotos: 3,
          retainedOwnedPhotos: 4,
          foreignControlPhotos: 1,
          receipts: receipts.data.length,
          retained: true,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS status invalidates stale editor, taken facts edit preserves state, identity/private/public points and room IDs unchanged; public-safe projection and old/new photo bytes verified",
    );
  } finally {
    try {
      if (restore && owner) {
        const r = await owner
          .from("apartments")
          .update({ status: "active" })
          .eq("id", m.listingId)
          .eq("lister_id", m.ownerId);
        assert.equal(r.error, null);
      }
    } finally {
      for (const c of sessions) await c.auth.signOut({ scope: "local" });
    }
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
