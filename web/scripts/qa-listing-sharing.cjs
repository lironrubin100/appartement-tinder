const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { randomUUID, createHash } = require("node:crypto"),
  { createClient } = require("@supabase/supabase-js"),
  { loadDraftServices } = require("./draft-service-test-loader.cjs");
if (!process.argv.includes("--allow-public-fixtures"))
  throw Error("Explicit scoped synthetic fixture flag required");
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
const file = ".qa/sharing/manifest.json";
fs.mkdirSync(".qa/sharing", { recursive: true });
const m = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : {
      listingId: randomUUID(),
      groupName: `QA sharing ${randomUUID().slice(0, 8)}`,
      retained: true,
      target: env.NEXT_PUBLIC_SUPABASE_URL,
    };
const persist = () => fs.writeFileSync(file, JSON.stringify(m, null, 2));
persist();
const all = [];
async function actor(u) {
  const c = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  if (u) {
    const a = await c.auth.signInWithPassword(u);
    assert.equal(a.error, null);
    all.push(c);
  }
  return c;
}
(async () => {
  try {
    const pair = JSON.parse(fs.readFileSync(".env.qa-sl02-live.local")),
      ownerAccount = JSON.parse(
        fs.readFileSync(".env.qa-sl01-lister.local"),
      )[0];
    assert.equal(pair.length, 2);
    const a = await actor(pair[0]),
      b = await actor(pair[1]),
      owner = await actor(ownerAccount),
      guest = await actor(null);
    m.accountIds = pair.map((u) => u.id);
    m.ownerId = ownerAccount.id;
    persist();
    if (!m.published) {
      const bytes = fs.readFileSync(".qa/task221/prepared.jpg"),
        form = new FormData();
      for (const [key, value] of Object.entries({
        requestKey: m.listingId,
        title: "Synthetic apartment sharing preview",
        bedrooms: "2",
        availableFrom: "2026-12-01",
        description: "Retained isolated sharing QA",
        address: "Synthetic SHARING PRIVATE address",
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
    if (!m.personalCid) {
      const intro = await a.rpc("send_introduction", {
        p_user: pair[1].id,
        p_group: null,
        p_message: "",
        p_ref_tag: "bio",
      });
      assert.equal(intro.error, null);
      const accepted = await b.rpc("accept_like", { p_like_id: intro.data });
      assert.equal(accepted.error, null);
      m.personalCid = accepted.data;
      persist();
    }
    if (!m.groupCid) {
      const prior = await a
        .from("groups")
        .select("id")
        .eq("name", m.groupName)
        .eq("admin_id", pair[0].id);
      assert.equal(prior.error, null);
      if (prior.data.length) {
        m.groupId = prior.data[0].id;
        const inbox = await a.rpc("list_chat_inbox");
        assert.equal(inbox.error, null);
        m.groupCid = inbox.data.find(
          (x) => x.group_id === m.groupId,
        ).conversation_id;
      } else {
        const group = await a.rpc("create_group_from_chats", {
          p_name: m.groupName,
          p_contacts: [pair[1].id],
          p_policy: "admin",
        });
        assert.equal(group.error, null);
        m.groupCid = group.data;
        const c = await a
          .from("conversations")
          .select("group_id")
          .eq("id", m.groupCid)
          .single();
        assert.equal(c.error, null);
        m.groupId = c.data.group_id;
      }
      persist();
    }
    if (!m.prejoinId) {
      m.prejoinKey ??= randomUUID();
      persist();
      const sent = await a.rpc("send_listing_card", {
        p_conversation_id: m.groupCid,
        p_listing_id: m.listingId,
        p_request_key: m.prejoinKey,
      });
      assert.equal(sent.error, null);
      m.prejoinId = sent.data[0].id;
      persist();
    }
    const invite = await b
      .from("group_invites")
      .select("id,status")
      .eq("group_id", m.groupId)
      .eq("invitee_id", pair[1].id)
      .single();
    assert.equal(invite.error, null);
    if (invite.data.status === "pending") {
      const accepted = await b.rpc("respond_group_invite", {
        p_invite: invite.data.id,
        p_accept: true,
      });
      assert.equal(accepted.error, null);
      assert.equal(accepted.data, m.groupCid);
    }
    const invisible = await b
      .from("messages")
      .select("id")
      .eq("id", m.prejoinId);
    assert.equal(invisible.error, null);
    assert.equal(invisible.data.length, 0);
    for (const cid of [m.personalCid, m.groupCid]) {
      const key = randomUUID(),
        args = {
          p_conversation_id: cid,
          p_listing_id: m.listingId,
          p_request_key: key,
        };
      const result = await Promise.all([
        a.rpc("send_listing_card", args),
        a.rpc("send_listing_card", args),
      ]);
      for (const r of result) assert.equal(r.error, null);
      assert.equal(result[0].data[0].id, result[1].data[0].id);
      const row = result[0].data[0];
      assert.equal(row.kind, "listing");
      assert.equal(row.body, "Apartment · דירה");
      assert.equal(row.listing_id, m.listingId);
      assert(!JSON.stringify(row).includes("PRIVATE"));
      const read = await b
        .from("messages")
        .select("id,listing_id")
        .eq("id", row.id);
      assert.equal(read.error, null);
      assert.equal(read.data.length, 1);
      const collision = await a.rpc("send_chat_message", {
        p_conversation_id: cid,
        p_body: row.body,
        p_request_key: key,
      });
      assert(collision.error);
    }
    assert(
      (
        await owner.rpc("send_listing_card", {
          p_conversation_id: m.groupCid,
          p_listing_id: m.listingId,
          p_request_key: randomUUID(),
        })
      ).error,
    );
    assert(
      (
        await guest.rpc("send_listing_card", {
          p_conversation_id: m.groupCid,
          p_listing_id: m.listingId,
          p_request_key: randomUUID(),
        })
      ).error,
    );
    for (const api of [a, b]) {
      const saved = await api
        .from("saves")
        .select("apartment_id")
        .eq("apartment_id", m.listingId);
      assert.equal(saved.error, null);
      assert.equal(saved.data.length, 0);
    }
    const inquiries = await owner
      .from("listing_inquiries")
      .select("id")
      .eq("apartment_id", m.listingId);
    assert.equal(inquiries.error, null);
    assert.equal(inquiries.data.length, 0);
    const pub = await guest.rpc("get_public_listing", {
      p_listing_id: m.listingId,
    });
    assert.equal(pub.error, null);
    assert.equal(pub.data.length, 1);
    for (const key of ["address", "lat", "lng", "lister_id", "revision"])
      assert(!Object.hasOwn(pub.data[0], key));
    assert.equal(pub.data[0].available_room_count, 2);
    const bytes = fs.readFileSync(".qa/task221/prepared.jpg"),
      hash = (x) => createHash("sha256").update(x).digest("hex");
    for (let i = 1; i <= 3; i++) {
      const r = await owner.storage
        .from("apartment-photos")
        .download(
          `${m.listingId}/${i}.jpg`,
          { nonce: randomUUID() },
          { cache: "no-store" },
        );
      assert.equal(r.error, null);
      assert.equal(hash(Buffer.from(await r.data.arrayBuffer())), hash(bytes));
    }
    m.verifiedAt = new Date().toISOString();
    persist();
    console.log(
      "PASS ordinary personal/group concurrent retry, recipient read, prejoin history isolation, foreign/guest denial, no saves/inquiries and public privacy; three fresh photos hash verified. Scoped synthetic listing/group/card messages retained.",
    );
  } finally {
    for (const c of all) await c.auth.signOut({ scope: "local" });
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
