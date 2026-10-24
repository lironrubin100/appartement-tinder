import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((s) => /^[A-Z_]+=/.test(s))
    .map((s) => {
      const i = s.indexOf("=");
      return [s.slice(0, i), s.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const file = ".qa/task43/manifest.json",
  m = JSON.parse(readFileSync(file, "utf8"));
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
async function draft(api: Api) {
  const r = await api
    .from("listing_drafts")
    .select("*")
    .eq("source_listing_id", m.listingId)
    .eq("state", "open")
    .single();
  expect(r.error).toBeNull();
  return r.data!;
}
async function publicUnchanged(api: Api) {
  const a = await api
      .from("apartments")
      .select("*")
      .eq("id", m.listingId)
      .single(),
    r = await api
      .from("apartment_rooms")
      .select("*")
      .eq("apartment_id", m.listingId)
      .order("created_at")
      .order("id");
  expect(a.error).toBeNull();
  expect(r.error).toBeNull();
  expect(a.data).toEqual(m.beforeSource);
  expect(r.data).toEqual(m.beforeRooms);
}
const price = (page: import("@playwright/test").Page, en = true) =>
  page.getByRole("textbox", {
    name: en ? "Monthly room price 1 (₪)" : "מחיר חודשי לחדר 1 (₪)",
    exact: true,
  });
const saved = (page: import("@playwright/test").Page, en = true) =>
  page.getByText(en ? "Saved to your account" : "נשמר בחשבון", { exact: true });
test.use({ trace: "off", screenshot: "off", video: "off" });
test.describe.configure({ mode: "serial" });
test.setTimeout(150_000);
for (const locale of ["he", "en"])
  for (const width of [390, 1280])
    test(`${locale} ${width}: owner edit private autosave, close, reopen, fixed rooms and public preservation`, async ({
      page,
      context,
      baseURL,
    }) => {
      const api = await signIn(context, baseURL!),
        en = locale === "en",
        prefix = en ? "/en" : "";
      try {
        await page.setViewportSize({ width, height: 844 });
        const before = await api
          .from("listing_drafts")
          .select("id")
          .eq("source_listing_id", m.listingId)
          .eq("state", "open");
        expect(before.error).toBeNull();
        await page.request.get(`${prefix}/compose?listing=${m.listingId}`);
        const afterGet = await api
          .from("listing_drafts")
          .select("id")
          .eq("source_listing_id", m.listingId)
          .eq("state", "open");
        expect(afterGet.data).toEqual(before.data);
        let dropped = false;
        if (!m.draftId)
          await page.route("**/*", async (route) => {
            if (
              !dropped &&
              route.request().method() === "POST" &&
              route.request().headers()["next-action"]
            ) {
              dropped = true;
              await route.fetch();
              return route.abort("failed");
            }
            return route.continue();
          });
        await page.goto(prefix + "/my-listings");
        const card = page.locator(
          `[data-testid="owner-listing"][data-listing-id="${m.listingId}"]`,
        );
        await card
          .getByRole("link", {
            name: en ? "Manage listing" : "ניהול המודעה",
            exact: true,
          })
          .click();
        if (!m.draftId) {
          await expect(
            page.getByText("לא הצלחנו לפתוח את טיוטת העריכה. נסו שוב.", {
              exact: true,
            }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "ניסיון נוסף", exact: true })
            .click();
        }
        await expect(price(page, en)).toBeVisible();
        await expect(page).toHaveURL(/compose\?draft=[a-f0-9-]+$/);
        await page.unrouteAll({ behavior: "wait" });
        const initial = await draft(api);
        m.draftId = initial.id;
        writeFileSync(file, JSON.stringify(m, null, 2));
        await expect(page.getByTestId("edit-room")).toHaveCount(2);
        expect(
          await page
            .getByTestId("edit-room")
            .evaluateAll((nodes) =>
              nodes.map((n) => n.getAttribute("data-room-id")),
            ),
        ).toEqual(m.roomIds);
        await expect(page.getByTestId("edit-property-location")).toContainText(
          "Synthetic task43 PRIVATE address",
        );
        await expect(
          page.locator(
            "input[name=address],input[name=latitude],input[name=longitude]",
          ),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: en ? "+ Add an available room" : "+ הוספת חדר פנוי",
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: en ? "Publish listing" : "פרסום המודעה",
            exact: true,
          }),
        ).toHaveCount(0);
        await page.waitForTimeout(600);
        expect((await draft(api)).revision).toBe(initial.revision);
        const value = String(3000 + (en ? 200 : 0) + (width === 390 ? 10 : 20));
        await price(page, en).fill(value);
        await page
          .getByRole("textbox", {
            name: en ? "Available from" : "תאריך כניסה",
            exact: true,
          })
          .fill("2027-01-10");
        await page
          .getByRole("textbox", {
            name: en ? "Room available from 2" : "תאריך כניסה לחדר 2",
            exact: true,
          })
          .fill("2027-01-12");
        await page
          .getByRole("textbox", {
            name: en ? "Room label 1" : "שם חדר 1",
            exact: true,
          })
          .fill(en ? "Private edited label" : "שם חדר בטיוטה");
        await page
          .getByRole("checkbox", { name: en ? "Sublet" : "סאבלט", exact: true })
          .uncheck();
        await expect
          .poll(async () =>
            String((await draft(api)).fields.rooms[0].monthlyPrice),
          )
          .toBe(value);
        await expect(saved(page, en)).toBeVisible();
        const stored = await draft(api);
        expect(stored.fields.rooms[1].isAvailable).toBe(false);
        expect(stored.fields.rooms[1].label).toBe("Retained unavailable");
        expect(stored.source_revision).toBe(m.beforeSource.revision);
        expect(stored.fields.isSublet).toBe(false);
        expect(stored.fields).not.toHaveProperty("address");
        expect(stored.fields).not.toHaveProperty("roomPrices");
        if (process.env.UX_SCREENSHOTS) {
          mkdirSync(process.env.UX_SCREENSHOTS, { recursive: true });
          await page.screenshot({
            path: path.join(
              process.env.UX_SCREENSHOTS,
              `edit-${locale}-${width}.png`,
            ),
            fullPage: true,
          });
        }
        const finalPrice = String(Number(value) + 1);
        await price(page, en).fill(finalPrice);
        await page
          .getByRole("button", {
            name: en ? "Save draft and close" : "שמירת טיוטה וסגירה",
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(prefix + "/my-listings");
        expect((await draft(api)).fields.rooms[0].monthlyPrice).toBe(
          finalPrice,
        );
        await page.goto(prefix + "/compose?draft=" + stored.id);
        await expect(price(page, en)).toHaveValue(finalPrice);
        await expect(
          page.getByRole("textbox", {
            name: en ? "Room available from 2" : "תאריך כניסה לחדר 2",
            exact: true,
          }),
        ).toHaveValue("2027-01-12");
        await publicUnchanged(api);
        const response = await page.request.get(
          `${prefix}/listings/${m.listingId}`,
        );
        expect(response.status()).toBe(200);
        const html = await response.text();
        expect(html).not.toContain("Synthetic task43 PRIVATE address");
        expect(html).not.toContain("Private edited label");
        expect(html).not.toContain(m.draftId);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      } finally {
        await api.auth.signOut({ scope: "local" });
      }
    });
test("private media can be added/reordered without modifying active photos", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!);
  try {
    await page.goto("/en/compose?draft=" + m.draftId);
    await expect(price(page)).toBeVisible();
    const before = await draft(api);
    const previews = page.getByTestId("draft-photo").getByRole("img");
    await expect(previews).toHaveCount(before.photos.length);
    for (let i = 0; i < before.photos.length; i++)
      await expect
        .poll(() =>
          previews
            .nth(i)
            .evaluate((image) => (image as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    if (before.photos.every((p: { kind: string }) => p.kind === "published")) {
      await page
        .getByLabel("Choose apartment photos", { exact: true })
        .setInputFiles(".qa/task221/prepared.jpg");
      await expect
        .poll(
          async () =>
            (await draft(api)).photos.filter(
              (p: { kind: string }) => p.kind === "draft",
            ).length,
        )
        .toBe(1);
      await expect(saved(page)).toBeVisible();
      await page
        .getByRole("button", { name: "Move photo earlier 4", exact: true })
        .click();
      await expect
        .poll(async () => (await draft(api)).photos[2].kind)
        .toBe("draft");
    }
    await page
      .getByRole("button", { name: "Save draft and close", exact: true })
      .click();
    await expect(page).toHaveURL("/en/my-listings");
    await publicUnchanged(api);
  } finally {
    await api.auth.signOut({ scope: "local" });
  }
});
test("stale tab preserves room input/comparison; failed source reload keeps old input and successful reload is explicit", async ({
  browser,
  baseURL,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    api = await signIn(a, baseURL!),
    peer = await signIn(b, baseURL!);
  try {
    const beforeRace = await draft(api),
      win = String(
        (Number(beforeRace.fields.rooms[0].monthlyPrice) || 3000) + 100,
      ),
      lose = String(Number(win) + 10);
    const x = await a.newPage(),
      y = await b.newPage();
    await Promise.all([
      x.goto("/en/compose?draft=" + m.draftId),
      y.goto("/en/compose?draft=" + m.draftId),
    ]);
    await expect(price(x)).toBeVisible();
    await expect(price(y)).toBeVisible();
    await price(x).fill(win);
    await expect(saved(x)).toBeVisible();
    await expect
      .poll(async () => (await draft(api)).fields.rooms[0].monthlyPrice)
      .toBe(win);
    await price(y).fill(lose);
    await expect(
      y.getByText("This draft changed elsewhere. Your edits are still here.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(price(y)).toHaveValue(lose);
    await expect(
      y.getByRole("textbox", { name: "Your edits", exact: true }),
    ).toHaveValue(new RegExp(lose));
    await expect(
      y.getByRole("textbox", { name: "Saved version", exact: true }),
    ).toHaveValue(new RegExp(win));
    await y.route("**/*", (route) =>
      route.request().method() === "POST" &&
      route.request().headers()["next-action"] &&
      route.request().postData()?.includes(m.listingId)
        ? route.abort("failed")
        : route.continue(),
    );
    y.once("dialog", (dialog) => dialog.accept());
    await y
      .getByRole("button", { name: "Load saved version", exact: true })
      .click();
    await expect(
      y.getByText(
        "Could not load the saved version. Your edits are still here.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(price(y)).toHaveValue(lose);
    await y.unrouteAll({ behavior: "wait" });
    y.once("dialog", (dialog) => dialog.accept());
    await y
      .getByRole("button", { name: "Load saved version", exact: true })
      .click();
    await expect(price(y)).toHaveValue(win);
    await publicUnchanged(api);
  } finally {
    await api.auth.signOut({ scope: "local" });
    await peer.auth.signOut({ scope: "local" });
    await a.close();
    await b.close();
  }
});
test("failed private save retains input; account switch removes owner rooms, address and previews", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!);
  let other: Api | undefined;
  try {
    await page.goto("/en/compose?draft=" + m.draftId);
    await expect(price(page)).toBeVisible();
    const initial = await draft(api);
    await page.route("**/*", (route) =>
      route.request().method() === "POST" &&
      route.request().headers()["next-action"]
        ? route.abort("failed")
        : route.continue(),
    );
    await price(page).fill("unsaved partial price");
    await expect(
      page.getByText("Could not save. Your edits are still here.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(price(page)).toHaveValue("unsaved partial price");
    expect((await draft(api)).revision).toBe(initial.revision);
    await context.clearCookies();
    other = await signIn(context, baseURL!, "sl01-card");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByTestId("edit-room")).toHaveCount(0);
    await expect(page.getByTestId("edit-property-location")).toHaveCount(0);
    await expect(page.getByTestId("draft-photo")).toHaveCount(0);
    expect((await draft(api)).revision).toBe(initial.revision);
    await publicUnchanged(api);
  } finally {
    await api.auth.signOut({ scope: "local" });
    if (other) await other.auth.signOut({ scope: "local" });
  }
});
test("guest returns to the same edit intent and foreign/missing/invalid edits reveal no owner model", async ({
  browser,
  baseURL,
}) => {
  const guest = await browser.newContext(),
    outsider = await browser.newContext(),
    api = await signIn(outsider, baseURL!, "sl01-card");
  try {
    const g = await guest.newPage();
    await g.goto("/en/compose?listing=" + m.listingId);
    expect(new URL(g.url()).pathname).toBe("/en/login");
    expect(new URL(g.url()).searchParams.get("returnTo")).toBe(
      "/en/compose?listing=" + m.listingId,
    );
    const p = await outsider.newPage();
    for (const id of [
      m.listingId,
      "00000000-0000-4000-8000-999999999999",
      "invalid",
    ]) {
      await p.goto("/en/compose?listing=" + id);
      await expect(
        p.getByText(
          "This edit is unavailable. Any saved draft is kept unchanged.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(p.getByTestId("edit-room")).toHaveCount(0);
      expect(await p.content()).not.toContain(
        "Synthetic task43 PRIVATE address",
      );
    }
  } finally {
    await api.auth.signOut({ scope: "local" });
    await guest.close();
    await outsider.close();
  }
});

test("transient account verification after source response offers retry instead of a stuck loading screen", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await signIn(context, baseURL!);
  let rejectActor = false,
    injected = false;
  try {
    const before = await draft(api);
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (req.url().includes("/auth/v1/user") && rejectActor)
        return route.abort("failed");
      if (
        !injected &&
        req.method() === "POST" &&
        req.headers()["next-action"] &&
        req.postData()?.includes(m.listingId)
      ) {
        const response = await route.fetch();
        injected = true;
        rejectActor = true;
        return route.fulfill({ response });
      }
      return route.continue();
    });
    await page.goto("/en/compose?draft=" + m.draftId);
    await expect(
      page.getByText("Could not open your edit draft. Please retry.", {
        exact: true,
      }),
    ).toBeVisible();
    rejectActor = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(price(page)).toBeVisible();
    expect((await draft(api)).revision).toBe(before.revision);
    await publicUnchanged(api);
  } finally {
    await api.auth.signOut({ scope: "local" });
  }
});

test("resident Plus continues the same owned edit in its overlay without changing public data", async ({
  page,
  context,
  baseURL,
}) => {
  const r = JSON.parse(readFileSync(".qa/task43/resident.json", "utf8")),
    api = await signIn(context, baseURL!, "sl01-card");
  try {
    await page.goto("/en/my-listings");
    await page
      .locator(
        `[data-testid="owner-listing"][data-listing-id="${r.listingId}"]`,
      )
      .getByRole("link", { name: "Manage listing", exact: true })
      .click();
    await expect(price(page)).toBeVisible();
    await price(page).fill("3611");
    await expect(saved(page)).toBeVisible();
    await page
      .getByRole("button", { name: "Save draft and close", exact: true })
      .click();
    await expect(page).toHaveURL("/en/my-listings");
    const origin = page.url();
    await page.getByRole("link", { name: "Add", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Publish an apartment",
      exact: true,
    });
    await dialog
      .getByRole("button", {
        name: "Continue: " + r.beforeSource.title,
        exact: true,
      })
      .click();
    await expect(price(page)).toHaveValue("3611");
    await expect(dialog.getByTestId("edit-room")).toHaveCount(2);
    expect(page.url()).toBe(origin);
    await price(page).fill("3622");
    await dialog
      .getByRole("button", { name: "Save draft and close", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    const d = await api
      .from("listing_drafts")
      .select("*")
      .eq("source_listing_id", r.listingId)
      .eq("state", "open")
      .single();
    expect(d.error).toBeNull();
    expect(d.data!.fields.rooms[0].monthlyPrice).toBe("3622");
    const a = await api
      .from("apartments")
      .select("*")
      .eq("id", r.listingId)
      .single();
    expect(a.data).toEqual(r.beforeSource);
    r.draftId = d.data!.id;
    writeFileSync(".qa/task43/resident.json", JSON.stringify(r, null, 2));
  } finally {
    await api.auth.signOut({ scope: "local" });
  }
});
