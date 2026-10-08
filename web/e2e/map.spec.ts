import { test, expect, type Page } from '@playwright/test';

// Acceptance criteria for the Map feature (DECISIONS.md A4, D13/D14/D17, L3):
//   1. Map loads centered on Beer Sheva with real apartment pins.
//   2. The sidebar list mirrors the same apartments as the pins.
//   3. Clicking a pin opens an apartment detail card that is fully visible
//      and interactive — not trapped off-screen or "below the map"
//      (regression test for the reported bug).
//   4. Favoriting works from both the pin's detail card and the sidebar
//      list, and the two stay in sync.
//   5. The detail card can be dismissed.
//   6. No unexpected console errors during the whole flow.

async function waitForMap(page: Page) {
  await page.goto('/map');
  await expect(page.getByTestId('map-container')).toBeVisible();
  await expect(page.getByTestId('apartment-marker').first()).toBeVisible({ timeout: 15_000 });
}

test.describe('Map', () => {
  test('root redirects to the Map tab (DECISIONS.md A4)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/map$/);
  });

  test('loads pins in Beer Sheva and mirrors them in the sidebar list', async ({ page }) => {
    await waitForMap(page);

    // Overlapping pins collapse into a numbered cluster below zoom 14
    // (DECISIONS.md D14/D17), so individual markers won't always equal the
    // apartment count directly — sum in each cluster's own number instead.
    const markerCount = await page.getByTestId('apartment-marker').count();
    const clusterCounts = await page.getByTestId('apartment-cluster').allInnerTexts();
    const coveredByMap = markerCount + clusterCounts.reduce((sum, n) => sum + Number(n), 0);

    const cardCount = await page.getByTestId('listing-card').count();

    expect(markerCount).toBeGreaterThan(0);
    expect(coveredByMap).toBe(cardCount);
  });

  test('clicking a pin opens a fully visible, in-viewport detail card', async ({ page }) => {
    await waitForMap(page);

    await page.getByTestId('apartment-marker').first().click();
    const detail = page.getByTestId('modal-content');

    await expect(detail).toBeVisible();
    // Regression guard for "card pops up below the map, can't access it":
    // the overlay must be fixed to the viewport, not sitting in normal
    // document flow underneath the map.
    await expect(detail).toBeInViewport();

    const overlay = page.getByTestId('modal-overlay');
    await expect(overlay).toHaveCSS('position', 'fixed');

    const viewport = page.viewportSize()!;
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);

    // The message button inside the card must be reachable without scrolling
    // the page — this is what "can't access it" was reporting.
    await expect(page.getByRole('button', { name: 'שלח הודעה' })).toBeInViewport();
  });

  test('detail card content matches the clicked apartment', async ({ page }) => {
    await waitForMap(page);

    const firstCard = page.getByTestId('listing-card').first();
    const title = await firstCard.locator('h3').innerText();

    await firstCard.click();
    await expect(page.getByTestId('modal-content')).toBeVisible();
    await expect(page.getByTestId('apartment-detail')).toContainText(title);
  });

  test('favoriting from the detail card syncs with the sidebar card', async ({ page }) => {
    await waitForMap(page);

    const firstCard = page.getByTestId('listing-card').first();
    const apartmentId = await firstCard.getAttribute('data-apartment-id');
    const sidebarFavoriteBtn = firstCard.getByTestId('favorite-toggle');

    await expect(sidebarFavoriteBtn).toHaveAttribute('aria-pressed', 'false');

    await firstCard.click();
    const modalFavoriteBtn = page.getByTestId('apartment-detail').getByTestId('favorite-toggle');
    await modalFavoriteBtn.click();
    await expect(modalFavoriteBtn).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('modal-close').click();
    await expect(page.getByTestId('modal-content')).toBeHidden();

    await expect(sidebarFavoriteBtn).toHaveAttribute('aria-pressed', 'true');

    // Persisted (this project has no auth yet, so favorites fall back to
    // localStorage — see hooks/useFavorites.ts).
    const stored = await page.evaluate(() => localStorage.getItem('shutaf:favorites'));
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain(apartmentId);
  });

  test('favoriting from the sidebar list persists across reload', async ({ page }) => {
    await waitForMap(page);

    const firstCard = page.getByTestId('listing-card').first();
    await firstCard.getByTestId('favorite-toggle').click();
    await expect(firstCard.getByTestId('favorite-toggle')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await waitForMap(page);
    await expect(
      page.getByTestId('listing-card').first().getByTestId('favorite-toggle')
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('detail card can be dismissed via close button and backdrop', async ({ page }) => {
    await waitForMap(page);

    await page.getByTestId('apartment-marker').first().click();
    await expect(page.getByTestId('modal-content')).toBeVisible();
    await page.getByTestId('modal-close').click();
    await expect(page.getByTestId('modal-content')).toBeHidden();

    await page.getByTestId('apartment-marker').first().click();
    await expect(page.getByTestId('modal-content')).toBeVisible();
    await page.getByTestId('modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId('modal-content')).toBeHidden();
  });

  test('no unexpected console errors while loading and interacting with the map', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('422')) {
        errors.push(msg.text());
      }
    });

    await waitForMap(page);
    await page.getByTestId('apartment-marker').first().click();
    await page.getByTestId('modal-close').click();

    expect(errors).toEqual([]);
  });

  test('sidebar renders as a multi-column grid on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await waitForMap(page);

    const cards = page.getByTestId('listing-card');
    await expect(cards.first()).toBeVisible();
    if ((await cards.count()) < 2) test.skip();

    const [firstBox, secondBox] = await Promise.all([
      cards.nth(0).boundingBox(),
      cards.nth(1).boundingBox(),
    ]);
    // Two cards sharing a row means their vertical ranges overlap.
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(10);
  });

  test('sublet-only filter narrows both the map and the grid', async ({ page }) => {
    await waitForMap(page);

    const totalCount = await page.getByTestId('listing-card').count();
    const sublistingCount = await page.getByTestId('listing-card').filter({ hasText: 'סאבלט' }).count();
    test.skip(sublistingCount === 0 || sublistingCount === totalCount, 'fixture data has no mixed sublet/non-sublet listings');

    await page.getByTestId('filter-sublet').locator('input[type=checkbox]').check();

    await expect(page.getByTestId('result-count')).toHaveText(`${sublistingCount} דירות`);
    await expect(page.getByTestId('listing-card')).toHaveCount(sublistingCount);
    for (const card of await page.getByTestId('listing-card').all()) {
      await expect(card).toContainText('סאבלט');
    }
  });

  test('price range filter excludes apartments outside the range', async ({ page }) => {
    await waitForMap(page);

    const priceFilter = page.getByTestId('filter-price');
    const [, maxInput] = await priceFilter.locator('input').all();
    await maxInput.fill('2500');
    await maxInput.dispatchEvent('change');

    const remainingCards = page.getByTestId('listing-card');
    const count = await remainingCards.count();
    expect(count).toBeGreaterThan(0);

    for (const card of await remainingCards.all()) {
      const priceText = await card.locator('span.text-orange').first().innerText();
      const price = Number(priceText.replace(/[^\d]/g, ''));
      expect(price).toBeLessThanOrEqual(2500);
    }
  });

  test('cluster pin is a numbered dark circle (DECISIONS.md D17)', async ({ page }) => {
    await waitForMap(page);

    const cluster = page.getByTestId('apartment-cluster').first();
    if (!(await cluster.isVisible().catch(() => false))) {
      test.skip(true, 'current fixture data does not overlap enough to cluster at this zoom');
    }

    await expect(cluster).toHaveCSS('border-radius', /50%|18px/);
    const bg = await cluster.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(38, 34, 32)'); // #262220 — design token --color-ink
    await expect(cluster).toHaveText(/^\d+$/);
  });
});
