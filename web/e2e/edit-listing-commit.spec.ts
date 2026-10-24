import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((x) => /^[A-Z_]+=/.test(x))
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const m = JSON.parse(readFileSync(".qa/task416/manifest.json", "utf8"));
const resident = JSON.parse(readFileSync(".qa/task416/resident.json", "utf8"));
test.use({ trace: "off", screenshot: "off", video: "off" });
test.describe.configure({ mode: "serial" });
test.setTimeout(150000);
async function signIn(
  context: BrowserContext,
  baseURL: string,
  name = "sl01-lister",
) {
  const u = JSON.parse(readFileSync(`.env.qa-${name}.local`, "utf8"))[0],
    cookies: { name: string; value: string }[] = [];
  const api = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false },
      cookies: {
        getAll: () => cookies,
        setAll: (v) => {
          cookies.splice(0, cookies.length, ...v);
        },
      },
    },
  );
  expect(
    (
      await api.auth.signInWithPassword({
        email: u.email,
        password: u.password,
      })
    ).error,
  ).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({ ...c, url: baseURL, sameSite: "Lax" as const })),
  );
  return api;
}
type Api = Awaited<ReturnType<typeof signIn>>;
async function source(api: Api, id = m.listingId) {
  const r = await api.from("apartments").select("*").eq("id", id).single();
  expect(r.error).toBeNull();
  return r.data!;
}
async function open(api: Api, id = m.listingId) {
  const r = await api.rpc("open_listing_edit_draft", {
    p_listing_id: id,
    p_request_key: randomUUID(),
  });
  expect(r.error).toBeNull();
  return r.data!;
}
async function currentDraft(api: Api, id: string) {
  const r = await api.from("listing_drafts").select("*").eq("id", id).single();
  expect(r.error).toBeNull();
  return r.data!;
}
const roomPrice = (page: Page, en = true) =>
  page.getByRole("textbox", {
    name: en ? "Monthly room price 1 (₪)" : "מחיר חודשי לחדר 1 (₪)",
    exact: true,
  });
const saved = (page: Page, en = true) =>
  page.getByText(en ? "Saved to your account" : "נשמר בחשבון", { exact: true });
const protectedSource = (x: Record<string, unknown>) =>
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
const editable = (x: Record<string, unknown>) =>
  Object.fromEntries(
    [
      "title",
      "bedrooms",
      "billsIncluded",
      "isSublet",
      "availableFrom",
      "description",
      "rooms",
      "photos",
    ].map((k) => [k, x[k]]),
  );
async function freeze(api: Api, d: Awaited<ReturnType<typeof open>>) {
  const hashes = [];
  for (const photo of d.photos as { kind: string; objectPath: string }[]) {
    const r = await api.storage
      .from(photo.kind === "draft" ? "listing-draft-media" : "apartment-photos")
      .download(
        photo.objectPath,
        { cacheNonce: randomUUID() },
        { cache: "no-store" },
      );
    expect(r.error).toBeNull();
    hashes.push(
      createHash("sha256")
        .update(Buffer.from(await r.data!.arrayBuffer()))
        .digest("hex"),
    );
  }
  const r = await api.rpc("begin_listing_draft_edit", {
    p_draft_id: d.id,
    p_expected_revision: d.revision,
    p_photo_digests: hashes,
  });
  expect(r.error).toBeNull();
}
async function success(page: Page, en = true) {
  await expect(
    page.getByRole("heading", {
      name: en ? "Listing changes saved" : "השינויים במודעה נשמרו",
      exact: true,
    }),
  ).toBeVisible();
}

for (const locale of ["he", "en"])
  for (const width of [390, 1280])
    test(`${locale} ${width}: explicit save flushes latest private fields/media, updates same listing once and completes exact draft`, async ({
      page,
      context,
      browser,
      baseURL,
    }) => {
      const api = await signIn(context, baseURL!),
        en = locale === "en",
        prefix = en ? "/en" : "",
        before = await source(api),
        d = await open(api);
      const beforeRooms = await api
        .from("apartment_rooms")
        .select("*")
        .eq("apartment_id", m.listingId)
        .order("created_at")
        .order("id");
      expect(beforeRooms.error).toBeNull();
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${prefix}/compose?draft=${d.id}`);
      await expect(roomPrice(page, en)).toBeVisible();
      const newPrice = String(
        Number(
          (d.fields as { rooms: { monthlyPrice: string }[] }).rooms[0]
            .monthlyPrice,
        ) + 17,
      );
      await roomPrice(page, en).fill(newPrice);
      await page
        .getByRole("textbox", {
          name: en ? "Available from" : "תאריך כניסה",
          exact: true,
        })
        .fill("2027-02-01");
      await page
        .getByRole("textbox", {
          name: en ? "Room available from 1" : "תאריך כניסה לחדר 1",
          exact: true,
        })
        .fill("2027-02-02");
      if (locale === "he" && width === 390) {
        await page
          .getByLabel("בחירת תמונות לדירה", { exact: true })
          .setInputFiles(".qa/task221/prepared.jpg");
        await expect(page.getByTestId("draft-photo")).toHaveCount(
          d.photos.length + 1,
        );
      }
      await expect(saved(page, en)).toBeVisible();
      expect(await source(api)).toEqual(before);
      if (process.env.UX_SCREENSHOTS) {
        mkdirSync(".qa/task416/screenshots", { recursive: true });
        await page.screenshot({
          path: `.qa/task416/screenshots/edit-${locale}-${width}.png`,
          fullPage: true,
        });
      }
      // This final uncontrolled change and click must flush without waiting for debounce.
      const latestDescription = `Latest explicit edit ${locale}-${width}-${randomUUID()}`;
      await page
        .getByRole("textbox", {
          name: en ? "Apartment description" : "תיאור הדירה",
          exact: true,
        })
        .fill(latestDescription);
      await page
        .getByRole("button", {
          name: en ? "Save changes" : "שמירת שינויים",
          exact: true,
        })
        .click();
      await success(page, en);
      const after = await source(api);
      expect(after.id).toBe(before.id);
      expect(after.revision).toBe(before.revision + 1);
      expect(after.available_from).toBe("2027-02-01");
      expect(after.description).toBe(latestDescription);
      expect(protectedSource(after)).toEqual(protectedSource(before));
      const completed = await currentDraft(api, d.id);
      expect(completed.state).toBe("completed");
      expect(
        after.photos.map((url: string) => url.split("/apartment-photos/")[1]),
      ).toEqual(
        completed.photos.map(
          (photo: { kind: string; objectPath: string }, index: number) =>
            photo.kind === "published"
              ? photo.objectPath
              : `${completed.publication_request_id}/${index + 1}.jpg`,
        ),
      );
      const rooms = await api
        .from("apartment_rooms")
        .select("*")
        .eq("apartment_id", m.listingId)
        .order("created_at")
        .order("id");
      expect(rooms.error).toBeNull();
      expect(
        rooms.data!.map((x) => [x.id, x.is_available, x.created_at]),
      ).toEqual(
        beforeRooms.data!.map((x) => [x.id, x.is_available, x.created_at]),
      );
      expect(String(rooms.data![0].monthly_price)).toBe(newPrice);
      const receipts = await api
        .from("listing_edit_requests")
        .select("*")
        .eq("request_key", completed.publication_request_id);
      expect(receipts.error).toBeNull();
      expect(receipts.data).toHaveLength(1);
      const guest = await browser.newContext(),
        publicPage = await guest.newPage();
      try {
        const r = await publicPage.goto(
          `${baseURL}${prefix}/listings/${m.listingId}`,
        );
        expect(r?.status()).toBe(200);
        await expect(
          publicPage.getByRole("heading", { name: after.title, exact: true }),
        ).toBeVisible();
        await expect(
          publicPage
            .getByText(
              new RegExp(`₪${Number(newPrice).toLocaleString("en-US")}`),
            )
            .first(),
        ).toBeVisible();
        expect(await publicPage.content()).not.toContain(
          "Synthetic task416 PRIVATE address",
        );
        for (const img of await publicPage.locator("img").all())
          await expect
            .poll(() =>
              img.evaluate(
                (x: HTMLImageElement) => x.complete && x.naturalWidth > 0,
              ),
            )
            .toBe(true);
      } finally {
        await guest.close();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.goto(`${prefix}/compose?draft=${d.id}`);
      await success(page, en);
      expect((await source(api)).revision).toBe(after.revision);
      await api.auth.signOut({ scope: "local" });
    });

test("invalid public input remains editable/private without freeze or partial public update", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!),
    before = await source(api),
    d = await open(api);
  await page.goto(`/en/compose?draft=${d.id}`);
  await roomPrice(page).fill("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Complete valid listing" }),
  ).toBeVisible();
  await expect(roomPrice(page)).toHaveValue("");
  expect(await source(api)).toEqual(before);
  const latest = await currentDraft(api, d.id);
  expect(latest.publication_started_at).toBeNull();
  expect(latest.state).toBe("open");
  await roomPrice(page).fill(
    String(
      (d.fields as { rooms: { monthlyPrice: string }[] }).rooms[0].monthlyPrice,
    ),
  );
  await expect(saved(page)).toBeVisible();
  await api.auth.signOut({ scope: "local" });
});

test("source conflict preserves local input, shows current facts and refresh only follows confirmation", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!),
    d = await open(api),
    before = await source(api);
  await page.goto(`/en/compose?draft=${d.id}`);
  const local = String(
    Number(
      (d.fields as { rooms: { monthlyPrice: string }[] }).rooms[0].monthlyPrice,
    ) + 77,
  );
  await roomPrice(page).fill(local);
  await expect(saved(page)).toBeVisible();
  const s = await api.rpc("get_owned_listing_editor", {
    p_listing_id: m.listingId,
  });
  expect(s.error).toBeNull();
  const model = s.data as Record<string, unknown>;
  const updated = await api.rpc("update_owned_listing", {
    p_listing_id: m.listingId,
    p_expected_revision: before.revision,
    p_request_key: randomUUID(),
    p_model: {
      ...editable(model),
      description: "Concurrent public browser edit",
    } as never,
  });
  expect(updated.error).toBeNull();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const comparison = page.getByTestId("listing-source-conflict");
  await expect(comparison).toContainText("Concurrent public browser edit");
  await expect(roomPrice(page)).toHaveValue(local);
  page.once("dialog", (x) => x.dismiss());
  await comparison
    .getByRole("button", { name: "Reload current listing", exact: true })
    .click();
  await expect(roomPrice(page)).toHaveValue(local);
  page.once("dialog", (x) => x.accept());
  await comparison
    .getByRole("button", { name: "Reload current listing", exact: true })
    .click();
  await expect(roomPrice(page)).toHaveValue(
    (d.fields as { rooms: { monthlyPrice: string }[] }).rooms[0].monthlyPrice,
  );
  await expect(page.getByTestId("listing-source-conflict")).toHaveCount(0);
  expect((await source(api)).revision).toBe(before.revision + 1);
  expect((await currentDraft(api, d.id)).source_revision).toBe(
    before.revision + 1,
  );
  await api.auth.signOut({ scope: "local" });
});

test("lost successful server action reply reconciles without a duplicate public revision", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!),
    d = await open(api),
    before = await source(api);
  await page.goto(`/en/compose?draft=${d.id}`);
  await roomPrice(page).fill(
    String(
      Number(
        (d.fields as { rooms: { monthlyPrice: string }[] }).rooms[0]
          .monthlyPrice,
      ) + 9,
    ),
  );
  await expect(saved(page)).toBeVisible();
  let lost = false;
  await page.route("**/en/compose?draft=*", async (route) => {
    const req = route.request();
    if (
      !lost &&
      req.method() === "POST" &&
      req.headers()["next-action"] &&
      req.postData()?.includes("expectedAccountId")
    ) {
      lost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await success(page);
  expect(lost).toBe(true);
  expect((await source(api)).revision).toBe(before.revision + 1);
  expect((await currentDraft(api, d.id)).state).toBe("completed");
  await api.auth.signOut({ scope: "local" });
});

test("reopening a pending edit checks only; explicit retry completes the same update once", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!),
    d = await open(api),
    before = await source(api);
  await freeze(api, d);
  await page.goto(`/en/compose?draft=${d.id}`);
  await expect(
    page.getByRole("heading", { name: "Listing changes status", exact: true }),
  ).toBeVisible();
  await expect(page.locator("section[aria-busy] [role=alert]")).toContainText(
    "Changes are not confirmed",
  );
  expect(await source(api)).toEqual(before);
  await page
    .getByRole("button", { name: "Check saved changes", exact: true })
    .click();
  await expect(page.locator("section[aria-busy] [role=alert]")).toContainText(
    "Changes are not confirmed",
  );
  expect(await source(api)).toEqual(before);
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await success(page);
  expect((await source(api)).revision).toBe(before.revision + 1);
  await api.auth.signOut({ scope: "local" });
});

test("explicit cancellation restores editable snapshot with new key, unchanged public version and preserved input", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!),
    d = await open(api),
    before = await source(api);
  await freeze(api, d);
  await page.goto(`/en/compose?draft=${d.id}`);
  await expect(page.locator("section[aria-busy] [role=alert]")).toContainText(
    "Changes are not confirmed",
  );
  page.once("dialog", (x) => x.accept());
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Load saved draft to edit", exact: true }),
  ).toBeVisible();
  page.once("dialog", (x) => x.accept());
  await page
    .getByRole("button", { name: "Load saved draft to edit", exact: true })
    .click();
  await expect(roomPrice(page)).toBeVisible();
  const restored = await currentDraft(api, d.id);
  expect(restored.publication_started_at).toBeNull();
  expect(restored.publication_request_id).not.toBe(d.publication_request_id);
  expect(restored.fields).toEqual(d.fields);
  expect(await source(api)).toEqual(before);
  await api.auth.signOut({ scope: "local" });
});

test("resident Plus uses the same explicit public save within its overlay", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!, "sl01-card"),
    d = await open(api, resident.listingId),
    before = await source(api, resident.listingId);
  await page.goto("/en/discover");
  await page.getByRole("link", { name: "Add", exact: true }).click();
  const overlay = page.getByRole("dialog");
  await expect(overlay).toBeVisible();
  await overlay
    .getByRole("button", {
      name: new RegExp("Synthetic resident explicit edit source"),
    })
    .click();
  await expect(roomPrice(page)).toBeVisible();
  await roomPrice(page).fill(
    String(
      Number(
        (d.fields as { rooms: { monthlyPrice: string }[] }).rooms[0]
          .monthlyPrice,
      ) + 21,
    ),
  );
  await overlay
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await success(page);
  await expect(page).toHaveURL("/en/discover");
  expect((await source(api, resident.listingId)).revision).toBe(
    before.revision + 1,
  );
  expect((await currentDraft(api, d.id)).state).toBe("completed");
  await api.auth.signOut({ scope: "local" });
});
