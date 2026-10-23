import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const m = JSON.parse(readFileSync(".qa/task42/manifest.json", "utf8"));
const winner = m.raceModels[m.raceWinner];
test.use({ trace: "off", screenshot: "off", video: "off" });
for (const locale of ["he", "en"])
  for (const width of [390, 1280])
    test(`${locale} ${width}: atomic owner update is reflected in public detail without private data`, async ({
      page,
    }) => {
      const en = locale === "en",
        prefix = en ? "/en" : "";
      await page.setViewportSize({ width, height: 844 });
      const response = await page.goto(`${prefix}/listings/${m.listingId}`);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Synthetic atomic edit verified",
        }),
      ).toBeVisible();
      await expect(page.locator("body")).toContainText(
        `₪${winner.rooms[0].monthlyPrice.toLocaleString("en-US")}`,
      );
      await expect(page.locator("body")).toContainText(
        en ? "1 available rooms" : "1 חדרים פנויים",
      );
      await expect(page.locator("body")).toContainText(
        en ? "Bills included" : "חשבונות כלולים",
      );
      await expect(page.locator("body")).toContainText(
        en ? "11/12/2026" : "11.12.2026",
      );
      const images = page.getByRole("img", {
        name: /Synthetic atomic edit verified/,
      });
      await expect(images).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await images.nth(i).scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            images
              .nth(i)
              .evaluate((img) => (img as HTMLImageElement).naturalWidth),
          )
          .toBeGreaterThan(0);
      }
      const html = await response!.text();
      expect(html).not.toContain("Synthetic task42 PRIVATE address");
      expect(html).not.toContain(`${m.foreignKey}/1.jpg`);
      expect(html).not.toContain("payload_hash");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
