import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync(".qa/task415/manifest.json", "utf8"));
test.use({ trace: "off", screenshot: "off", video: "off" });
for (const locale of ["he", "en"] as const)
  for (const width of [390, 1280]) {
    test(`${locale} ${width}: private edit price/date never replace public source`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      const response = await page.goto(
        `${locale === "en" ? "/en" : ""}/listings/${fixture.listingId}`,
      );
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Synthetic private edit draft source",
        }),
      ).toBeVisible();
      await expect(page.locator("body")).toContainText("₪2,100");
      await expect(page.locator("body")).not.toContainText("₪2,999");
      await expect(page.locator("body")).toContainText(
        locale === "en" ? "01/12/2026" : "1.12.2026",
      );
      const images = page.getByRole("img", {
        name: "Synthetic private edit draft source",
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
      for (const value of [
        fixture.savedFields.title,
        "Synthetic task415 PRIVATE address",
        fixture.draftId,
        "sourceRevision",
      ])
        expect(html).not.toContain(value);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
