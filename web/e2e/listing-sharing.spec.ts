import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync, mkdirSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const fixture = JSON.parse(readFileSync(".qa/sharing/manifest.json", "utf8"));
const pair = JSON.parse(readFileSync(".env.qa-sl02-live.local", "utf8"));
async function signIn(
  context: BrowserContext,
  baseURL: string,
  account: { email: string; password: string },
) {
  const cookies: { name: string; value: string }[] = [];
  const api = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false },
      cookies: {
        getAll: () => cookies,
        setAll: (values) => {
          cookies.splice(0, cookies.length, ...values);
        },
      },
    },
  );
  expect((await api.auth.signInWithPassword(account)).error).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({ ...c, url: baseURL, sameSite: "Lax" as const })),
  );
  return api;
}
test.use({ trace: "off", screenshot: "off", video: "off" });
test.setTimeout(150_000);
for (const locale of ["he", "en"] as const)
  for (const width of [390, 1280]) {
    test(`${locale} ${width}: guest browses and opens shareable public apartment`, async ({
      page,
      context,
      baseURL,
    }) => {
      const en = locale === "en",
        prefix = en ? "/en" : "";
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${prefix}/login`);
      await page
        .getByRole("link", {
          name: en
            ? "Browse apartments without an account"
            : "צפייה בדירות ללא הרשמה",
        })
        .click();
      await expect(page).toHaveURL(`${prefix}/listings`);
      const cards = page.getByTestId("listing-preview");
      expect(await cards.count()).toBeGreaterThan(0);
      expect(await cards.count()).toBeLessThanOrEqual(12);
      const response = await page.goto(
        `${prefix}/listings/${fixture.listingId}`,
      );
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Synthetic apartment sharing preview",
        }),
      ).toBeVisible();
      expect(await page.content()).not.toContain(
        "Synthetic SHARING PRIVATE address",
      );
      await page
        .getByRole("button", {
          name: en ? "Share apartment" : "שיתוף דירה",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("textbox")).toHaveValue(
        `${baseURL}${prefix}/listings/${fixture.listingId}`,
      );
      await expect(
        dialog.getByRole("link", {
          name: en ? "Sign in to share in a chat" : "התחברו לשיתוף בתוך צ׳אט",
        }),
      ).toBeVisible();
      await expect(dialog.locator("[data-conversation-id]")).toHaveCount(0);
      await dialog
        .getByRole("button", { name: en ? "Close" : "סגירה", exact: true })
        .click();
      await page
        .getByRole("link", {
          name: en ? "Browse apartments in Shutaf" : "לצפייה בדירות ב־Shutaf",
        })
        .click();
      await expect(page).toHaveURL(`${prefix}/listings`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (en && width === 390) {
        await page.getByRole("link", { name: "Sign in", exact: true }).click();
        await page.getByLabel("Email", { exact: true }).fill(pair[0].email);
        await page
          .getByLabel("Password", { exact: true })
          .fill(pair[0].password);
        await page
          .getByRole("button", { name: "Sign in with email", exact: true })
          .click();
        await expect(page).toHaveURL("/en/listings");
      }
      await context.clearCookies();
    });
    test(`${locale} ${width}: personal/group live card, retry, reload and independent saves`, async ({
      browser,
      baseURL,
    }) => {
      const en = locale === "en",
        prefix = en ? "/en" : "",
        contexts = await Promise.all([
          browser.newContext({ viewport: { width, height: 844 } }),
          browser.newContext({ viewport: { width, height: 844 } }),
        ]);
      const apis = await Promise.all(
        contexts.map((c, i) => signIn(c, baseURL!, pair[i])),
      );
      const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
      const saved = async (i: number) => {
        const r = await apis[i]
          .from("saves")
          .select("apartment_id")
          .eq("user_id", pair[i].id)
          .eq("apartment_id", fixture.listingId);
        expect(r.error).toBeNull();
        return r.data!.length === 1;
      };
      const prior = await Promise.all([saved(0), saved(1)]);
      try {
        for (const cid of [fixture.personalCid, fixture.groupCid]) {
          await b.goto(`${prefix}/chats/${cid}`);
          await expect(b.getByTestId("chat-connection")).toHaveText(
            en ? "Live" : "מחובר",
          );
          const before = await b.getByTestId("listing-preview").count();
          await a.goto(`${prefix}/listings/${fixture.listingId}`);
          await a
            .getByRole("button", {
              name: en ? "Share apartment" : "שיתוף דירה",
              exact: true,
            })
            .click();
          const dialog = a.getByRole("dialog"),
            target = dialog.locator(`[data-conversation-id="${cid}"]`);
          await expect(target).toBeVisible();
          const snapshot = await apis[0]
            .from("messages")
            .select("id")
            .eq("conversation_id", cid);
          expect(snapshot.error).toBeNull();
          if (en && width === 390 && cid === fixture.groupCid) {
            await a.route(
              "**/rest/v1/rpc/send_listing_card",
              async (route) => {
                await route.fetch();
                await route.abort("failed");
              },
              { times: 1 },
            );
            await target.click();
            await expect(dialog.getByRole("alert")).toContainText(
              "Could not confirm delivery",
            );
            await target.click();
          } else await target.click();
          await expect(dialog.getByRole("status")).toHaveText(
            en ? "Apartment sent." : "הדירה נשלחה.",
          );
          await expect(b.getByTestId("listing-preview")).toHaveCount(
            before + 1,
          );
          const after = await apis[0]
            .from("messages")
            .select("id,kind,listing_id,body")
            .eq("conversation_id", cid);
          expect(after.error).toBeNull();
          expect(after.data!.length - snapshot.data!.length).toBe(1);
          const newRow = after.data!.find(
            (x) => !snapshot.data!.some((y) => x.id === y.id),
          )!;
          expect(newRow.kind).toBe("listing");
          expect(newRow.listing_id).toBe(fixture.listingId);
          expect(newRow.body).toBe("Apartment · דירה");
          await dialog
            .getByRole("link", { name: en ? "Open chat" : "פתיחת הצ׳אט" })
            .click();
          await expect(a).toHaveURL(`${prefix}/chats/${cid}`);
          const preview = a.getByTestId("listing-preview").last();
          await expect(
            preview.getByRole("heading", {
              name: "Synthetic apartment sharing preview",
            }),
          ).toBeVisible();
          await expect(preview).toContainText("₪2,100–2,600");
          await expect(preview).toContainText(
            en ? "2 available rooms" : "2 חדרים פנויים",
          );
          await expect(preview.getByRole("img")).toBeVisible();
          await expect
            .poll(() =>
              preview
                .getByRole("img")
                .evaluate(
                  (img: HTMLImageElement) =>
                    img.complete && img.naturalWidth > 0,
                ),
            )
            .toBe(true);
          expect(await a.content()).not.toContain(
            "Synthetic SHARING PRIVATE address",
          );
          expect(await b.content()).not.toContain(
            "Synthetic SHARING PRIVATE address",
          );
          await b.reload();
          await expect(b.getByTestId("listing-preview")).toHaveCount(
            before + 1,
          );
        }
        expect(await saved(0)).toBe(prior[0]);
        expect(await saved(1)).toBe(prior[1]);
        for (let i = 0; i < 2; i++)
          if (await saved(i)) {
            const r = await apis[i].rpc("toggle_apartment_save_and_interest", {
              p_apartment_id: fixture.listingId,
            });
            expect(r.error).toBeNull();
          }
        await a.reload();
        await b.reload();
        const ca = a.getByTestId("listing-preview").last(),
          cb = b.getByTestId("listing-preview").last();
        await ca
          .getByRole("button", {
            name: en ? "Save for me" : "שמירה אישית",
            exact: true,
          })
          .click();
        await expect.poll(() => saved(0)).toBe(true);
        expect(await saved(1)).toBe(false);
        await cb
          .getByRole("button", {
            name: en ? "Save for me" : "שמירה אישית",
            exact: true,
          })
          .click();
        await expect.poll(() => saved(1)).toBe(true);
        await ca
          .getByRole("button", {
            name: en ? "Unsave" : "ביטול שמירה",
            exact: true,
          })
          .click();
        await expect.poll(() => saved(0)).toBe(false);
        expect(await saved(1)).toBe(true);
        expect(
          await a.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await b.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (process.env.UX_SCREENSHOTS) {
          mkdirSync(".qa/sharing/screenshots", { recursive: true });
          await ca.screenshot({
            path: `.qa/sharing/screenshots/card-${locale}-${width}.png`,
          });
        }
      } finally {
        for (let i = 0; i < 2; i++) {
          if ((await saved(i)) !== prior[i])
            await apis[i].rpc("toggle_apartment_save_and_interest", {
              p_apartment_id: fixture.listingId,
            });
          await apis[i].auth.signOut({ scope: "local" });
          await contexts[i].close();
        }
      }
    });
  }
test("unavailable apartment replaces card after refresh and restores exact QA fixture", async ({
  browser,
  baseURL,
}) => {
  const c = await browser.newContext(),
    oc = await browser.newContext(),
    api = await signIn(c, baseURL!, pair[1]);
  const ownerAccount = JSON.parse(
      readFileSync(".env.qa-sl01-lister.local", "utf8"),
    )[0],
    owner = await signIn(oc, baseURL!, ownerAccount),
    p = await c.newPage();
  try {
    await p.goto(`/en/chats/${fixture.groupCid}`);
    await expect(p.getByTestId("listing-preview").first()).toBeVisible();
    const r = await owner
      .from("apartments")
      .update({ status: "taken" })
      .eq("id", fixture.listingId)
      .eq("lister_id", fixture.ownerId)
      .select("id");
    expect(r.error).toBeNull();
    expect(r.data?.length).toBe(1);
    await p.reload();
    await expect(p.getByTestId("listing-unavailable").first()).toBeVisible();
    await expect(p.getByTestId("listing-preview")).toHaveCount(0);
    const missing = await p.goto(`/en/listings/${fixture.listingId}`);
    expect(missing?.status()).toBe(404);
  } finally {
    expect(
      (
        await owner
          .from("apartments")
          .update({ status: "active" })
          .eq("id", fixture.listingId)
          .eq("lister_id", fixture.ownerId)
      ).error,
    ).toBeNull();
    await api.auth.signOut({ scope: "local" });
    await owner.auth.signOut({ scope: "local" });
    await c.close();
    await oc.close();
  }
});

test("account sign-out clears private share success; reopen and map sharing preserve locale", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    api = await signIn(context, baseURL!, pair[0]),
    page = await context.newPage();
  context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(25000);
  const runtimeErrors:string[]=[];page.on("pageerror",error=>runtimeErrors.push(error.message));
  page.on("crash",()=>console.info("sharing edge: renderer crashed"));
  console.info("sharing edge: signed in");
  try {
    await page.goto(`/en/listings/${fixture.listingId}`);
    await page
      .getByRole("button", { name: "Share apartment", exact: true })
      .click();
    console.info("sharing edge: detail opened");
    const dialog = page.getByRole("dialog");
    await dialog
      .locator(`[data-conversation-id="${fixture.groupCid}"]`)
      .click();
    await expect(dialog.getByRole("link", { name: "Open chat" })).toBeVisible();
    console.info("sharing edge: sent card");
    const signout = await context.newPage();
    await signout.goto("/en/profile");
    console.info("sharing edge: profile opened");
    await signout
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await expect(signout).toHaveURL(/\/en\/login/);
    console.info("sharing edge: signed out");
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(dialog.getByRole("link", { name: "Open chat" })).toHaveCount(
      0,
    );
    await expect(dialog.locator("[data-conversation-id]")).toHaveCount(0);
    await expect(dialog.getByRole("alert")).toContainText("Account changed");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Share apartment", exact: true })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("link", { name: "Sign in to share in a chat" }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    console.info("sharing edge: old fields cleared; guest reopened");
    const next = await signIn(context, baseURL!, pair[1]);
    try {
      await page
        .getByRole("button", { name: "Share apartment", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .locator(`[data-conversation-id="${fixture.groupCid}"]`),
      ).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .click();
      console.info("sharing edge: switched account");
      await page.goto("/en/map", {waitUntil:"domcontentloaded"});
      const listing = page.locator(
        `[data-testid="listing-card"][data-apartment-id="${fixture.listingId}"]`,
      );
      await expect(listing).toBeVisible();
      await listing
        .getByRole("button", { name: "Share apartment", exact: true })
        .click();
      await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue(
        `${baseURL}/en/listings/${fixture.listingId}`,
      );
      expect(runtimeErrors).toEqual([]);
      await expect(
        page
          .getByRole("dialog")
          .locator(`[data-conversation-id="${fixture.groupCid}"]`),
      ).toBeVisible();
    } finally {
      await next.auth.signOut({ scope: "local" });
    }
  } finally {
    await api.auth.signOut({ scope: "local" });
    await context.close();
  }
});
