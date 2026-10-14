import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';
import { createServerClient } from '@supabase/ssr';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Real Supabase integration. No mocked routes or service credentials in browsers.
// The connected database tool prepares isolated QA accounts; this suite uses
// ordinary owner permissions and removes its uploaded photos on completion.
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
    const at = line.indexOf('=');
    return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, '')];
  }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fixtures: { id: string; email: string; password: string }[] = JSON.parse(readFileSync('.env.qa.local', 'utf8'));
const clients: SupabaseClient<Database>[] = [];
let nextFixture = 0;
const listingIds: string[] = [];

async function account(context: BrowserContext, name: string, mode = 'lister') {
  const { id, email, password } = fixtures[nextFixture++];
  const cookies: { name: string; value: string }[] = [];
  const client = createServerClient<Database>(url, anonKey, { cookies: { getAll: () => cookies, setAll: (values) => { cookies.splice(0, cookies.length, ...values); } } });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`QA sign-in failed: ${signedIn.error.message}`);
  const profileUpdate = await client.from('profiles').update({ name, mode }).eq('id', id);
  if (profileUpdate.error) throw profileUpdate.error;
  await context.addCookies(cookies.map(({ name: cookieName, value }) => ({ name: cookieName, value, domain: 'localhost', path: '/', sameSite: 'Lax' as const })));
  clients.push(client);
  return { id, client };
}

test.describe('Three listing slices, real database', () => {
  test.describe.configure({ mode: 'default' });
  test.afterAll(async () => {
    // Ordinary owner permissions remove only this run's uploaded photos.
    // The coordinating SQL cleanup removes the QA database rows/accounts.
    for (const client of clients) {
      const { data: { user } } = await client.auth.getUser();
      if (!user) continue;
      const { data, error } = await client.from('apartments').select('photos').eq('lister_id', user.id);
      if (error) throw error;
      const paths = (data ?? []).flatMap((listing) => listing.photos.map((photo: string) => photo.split('/apartment-photos/')[1])).filter(Boolean);
      if (paths.length) { const result = await client.storage.from('apartment-photos').remove(paths); if (result.error) throw result.error; }
    }
  });

  for (const locale of ['he', 'en'] as const) {
    test(`${locale}: publish → confirmation → public listing → owner dashboard → rented`, async ({ page, context, browser }) => {
      test.setTimeout(120_000);
      const prefix = locale === 'en' ? '/en' : '';
      const owner = await account(context, `QA ${locale} owner`, locale === 'he' ? 'solo' : 'lister');
      const title = `QA slice ${locale} ${randomUUID().slice(0, 8)}`;
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${prefix}/compose`);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'he' ? 'rtl' : 'ltr');
      await page.getByLabel(locale === 'he' ? 'כותרת המודעה' : 'Listing title', { exact: true }).fill(title);
      await page.locator('[name=bedrooms]').fill('3');
      await page.locator('[name=availableFrom]').fill('2026-11-01');
      await page.locator('[name=address]').fill('PRIVATE TEST ADDRESS 123');
      await page.locator('[name=latitude]').fill('31.252');
      await page.locator('[name=longitude]').fill('34.791');
      await page.locator('[name=roomPrice]').fill('1700');
      await page.getByRole('button', { name: locale === 'he' ? '+ הוספת חדר פנוי' : '+ Add an available room', exact: true }).click();
      await page.locator('[name=roomPrice]').nth(1).fill('2200');
      await page.locator('[name=billsIncluded]').check();
      await page.locator('textarea[name=description]').fill('A bright apartment for the QA journey.');
      // A failed validation must preserve the draft and show a recoverable error.
      await page.getByRole('button', { name: locale === 'he' ? 'פרסום המודעה' : 'Publish listing', exact: true }).click();
      await expect(page.locator('form [role=alert]')).toContainText(locale === 'he' ? 'לפחות 3 תמונות' : 'at least 3 photos');
      await page.locator('#photos').setInputFiles([1, 2, 3].map((n) => ({ name: `broken-${n}.png`, mimeType: 'image/png', buffer: Buffer.from('invalid image') })));
      await page.getByRole('button', { name: locale === 'he' ? 'פרסום המודעה' : 'Publish listing', exact: true }).click();
      await expect(page.locator('form [role=alert]')).toContainText(locale === 'he' ? 'לא הצלחנו להכין' : 'Could not prepare');
      await expect(page.getByRole('button', { name: locale === 'he' ? 'פרסום המודעה' : 'Publish listing', exact: true })).toBeEnabled();
      for (let n = 3; n >= 1; n--) await page.getByRole('button', { name: `${locale === 'he' ? 'הסרת תמונה' : 'Remove photo'} ${n}`, exact: true }).click();
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6E3sAAAAASUVORK5CYII=', 'base64');
      await page.locator('#photos').setInputFiles([1, 2, 3].map((n) => ({ name: `qa-${n}.png`, mimeType: 'image/png', buffer: png })));
      await expect(page.locator('figure').first()).toHaveCSS('aspect-ratio', '3 / 2');
      await page.getByRole('button', { name: locale === 'he' ? 'פרסום המודעה' : 'Publish listing', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/compose/published/[0-9a-f-]+$`), { timeout: 45_000 });
      const listingId = page.url().split('/').pop()!;
      listingIds.push(listingId);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale === 'he' ? 'המודעה פורסמה!' : 'Listing published!');
      await page.screenshot({ path: `test-results/${locale}-published.png`, fullPage: true });
      const stored = await owner.client.from('apartments').select('status,photos,apartment_rooms(monthly_price)').eq('id', listingId).single();
      expect(stored.error).toBeNull();
      expect(stored.data?.photos).toHaveLength(3);
      expect(stored.data?.apartment_rooms.map((r: { monthly_price: number }) => r.monthly_price).sort()).toEqual([1700, 2200]);
      for (const photo of stored.data?.photos ?? []) expect((await page.request.get(photo)).ok()).toBeTruthy();
      await page.getByRole('link', { name: locale === 'he' ? 'צפייה במודעה' : 'View listing', exact: true }).click();
      await expect(page).toHaveURL(`${prefix}/listings/${listingId}`, { timeout: 45_000 });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.locator('body')).toContainText('₪1,700–2,200');

      const guest = await browser.newContext();
      try {
        const guestPage = await guest.newPage();
        const response = await guestPage.goto(`${prefix}/listings/${listingId}`);
        expect(response?.status()).toBe(200);
        await expect(guestPage.locator('html')).toHaveAttribute('lang', locale);
        await expect(guestPage.locator('html')).toHaveAttribute('dir', locale === 'he' ? 'rtl' : 'ltr');
        await expect(guestPage.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
        await expect(guestPage.locator('link[rel="canonical"]')).toHaveAttribute('href', `http://localhost:3000${prefix}/listings/${listingId}`);
        await expect(guestPage.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\//);
        expect(await response?.text()).not.toContain('PRIVATE TEST ADDRESS 123');
        const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
        const publicRead = await anonymous.rpc('get_public_listing', { p_listing_id: listingId });
        expect(publicRead.error).toBeNull();
        for (const key of ['address', 'lister_id', 'phone', 'lat', 'lng']) expect(publicRead.data[0]).not.toHaveProperty(key);
        expect(JSON.stringify(publicRead.data)).not.toContain(owner.id);
        await guestPage.screenshot({ path: `test-results/${locale}-public-listing.png`, fullPage: true });
        await guestPage.setViewportSize({ width: 390, height: 844 });
        expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await guestPage.screenshot({ path: `test-results/${locale}-mobile-listing.png`, fullPage: true });
        // Public links switch language without requiring sign-in.
        await guestPage.getByRole('link', { name: locale === 'he' ? 'English' : 'עברית', exact: true }).click();
        await expect(guestPage).toHaveURL(`${locale === 'he' ? '/en' : ''}/listings/${listingId}`, { timeout: 45_000 });
        await expect(guestPage.locator('html')).toHaveAttribute('dir', locale === 'he' ? 'ltr' : 'rtl', { timeout: 20_000 });

        const stranger = await browser.newContext();
        try {
          const other = await account(stranger, 'QA other owner', 'solo');
          const otherPage = await stranger.newPage();
          await otherPage.goto(`${prefix}/my-listings`);
          await expect(otherPage.getByTestId('owner-listing')).toHaveCount(0);
          const forbidden = await other.client.from('apartments').update({ status: 'taken' }).eq('id', listingId).select('id');
          expect(forbidden.data).toEqual([]);
          const confirmation = await otherPage.goto(`${prefix}/compose/published/${listingId}`);
          expect(confirmation?.status()).toBe(404);
          const inquiry = await other.client.rpc('create_listing_inquiry', { p_apartment_id: listingId });
          expect(inquiry.error).toBeNull();
        } finally { await stranger.close(); }

        await page.goto(`${prefix}/my-listings`);
        const card = page.getByTestId('owner-listing').filter({ hasText: title });
        await expect(card).toContainText('₪1,700–2,200');
        await expect(card).toContainText(locale === 'he' ? '1 פניות ממתינות' : '1 pending inquiries');
        await page.reload();
        await expect(card).toBeVisible();
        await card.getByRole('button', { name: locale === 'he' ? 'סימון כהושכרה' : 'Mark rented', exact: true }).click();
        await card.getByRole('button', { name: locale === 'he' ? 'ביטול' : 'Cancel', exact: true }).click();
        await expect(card.getByTestId('listing-status')).toHaveText(locale === 'he' ? 'פעילה' : 'Active');
        await card.getByRole('button', { name: locale === 'he' ? 'סימון כהושכרה' : 'Mark rented', exact: true }).click();
        await card.getByRole('button', { name: locale === 'he' ? 'כן, הדירה הושכרה' : 'Yes, mark rented', exact: true }).click();
        await expect(card.getByTestId('listing-status')).toHaveText(locale === 'he' ? 'הושכרה' : 'Rented');
        await page.screenshot({ path: `test-results/${locale}-dashboard-rented.png`, fullPage: true });
        expect((await owner.client.from('apartments_public').select('id').eq('id', listingId)).data).toEqual([]);
        expect((await guestPage.goto(`${prefix}/listings/${listingId}`))?.status()).toBe(404);
        if (locale === 'he') {
          await page.goto('/map');
          await expect(page.getByTestId('listing-grid')).toBeVisible();
          await expect(page.getByTestId('apartment-marker').first()).toBeVisible({ timeout: 20_000 });
          await expect(page.locator(`[data-apartment-id="${listingId}"]`)).toHaveCount(0);
        }
      } finally { await guest.close(); }
      expect(errors).toEqual([]);
    });
  }
  test('invalid and missing public listing IDs return 404', async ({ page }) => {
    for (const path of ['/listings/not-a-uuid', `/en/listings/${randomUUID()}`]) expect((await page.goto(path))?.status()).toBe(404);
  });
});
