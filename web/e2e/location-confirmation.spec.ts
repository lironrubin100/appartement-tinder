import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Retained synthetic resident only. This suite edits browser-local drafts and
// never publishes, uploads, or changes the account's profile.
const manifest = process.env.QA_FIXTURE_MANIFEST ?? '.env.qa-sl02-live.local';
const accounts: { email: string; password: string }[] = existsSync(manifest)
  ? JSON.parse(readFileSync(manifest, 'utf8')) : [];
test.skip(!accounts.length, 'Requires a retained synthetic resident fixture');
test.use({ actionTimeout: 15_000 });

for (const locale of ['he', 'en'] as const) {
  test(`${locale}: manual confirmation survives delayed map styles and draft reload`, async ({ page }) => {
    test.setTimeout(90_000);
    const en = locale === 'en';
    const prefix = en ? '/en' : '';
    const t = (he: string, english: string) => en ? english : he;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${prefix}/login`);
    await page.getByLabel(t('כתובת מייל', 'Email'), { exact: true }).fill(accounts[0].email);
    await page.getByLabel(t('סיסמה', 'Password'), { exact: true }).fill(accounts[0].password);
    await page.getByRole('button', { name: t('התחברות עם מייל', 'Sign in with email'), exact: true }).click();
    await page.waitForURL(url => !url.pathname.endsWith('/login'));
    await page.goto(`${prefix}/discover`);

    // Hold any stylesheet requested after the initial page is ready. Before
    // the fix, lazy Leaflet CSS suspends commits to the controlled form inputs.
    let releaseStyles!: () => void;
    const stylesReleased = new Promise<void>(resolve => { releaseStyles = resolve; });
    await page.route('**/*.css*', async route => { await stylesReleased; await route.continue(); });
    await page.route('**/api/geocode', route => route.fulfill({ status: 429, json: { error: 'limited' } }));
    const add = page.getByRole('link', { name: t('הוסף', 'Add'), exact: true });
    await add.click();
    const dialog = page.getByRole('dialog', { name: t('פרסום דירה', 'Publish an apartment') });
    const confirmation = dialog.locator('[name=locationConfirmed]');
    try {
      await dialog.locator('[name=address]').fill('Synthetic confirmation test 123');
      await dialog.getByRole('button', { name: t('הכתובת לא נמצאה? הזנה ותיקון מיקום ידניים', 'Address not found? Enter and adjust location manually'), exact: true }).click();
      await dialog.locator('[name=locationCity]').fill('Tel Aviv');
      await dialog.locator('[name=latitude]').fill('32.085');
      await dialog.locator('[name=longitude]').fill('34.781');
      await confirmation.check();
      await expect(confirmation).toBeChecked();
      await expect(dialog.locator('[name=latitude]')).toHaveValue('32.085');
      await expect(dialog.locator('[name=longitude]')).toHaveValue('34.781');
    } finally { releaseStyles(); }
    await expect(dialog.locator('.leaflet-container')).toBeVisible();
    await expect(confirmation).toBeChecked();
    await dialog.getByRole('button', { name: t('שמירת טיוטה וסגירה', 'Save draft and close'), exact: true }).click();
    await page.reload();
    await add.click();
    await expect(confirmation).toBeChecked();
    await dialog.locator('[name=latitude]').fill('32.086');
    await expect(confirmation).not.toBeChecked();
    await confirmation.focus();
    await confirmation.press('Space');
    await expect(confirmation).toBeChecked();
    await dialog.locator('[name=address]').fill('Synthetic changed address 124');
    await expect(confirmation).not.toBeChecked();
    await dialog.locator('label:has(input[name="locationConfirmed"])').click();
    await expect(confirmation).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/location-confirmation-${locale}.png`, fullPage: true });
  });
}
