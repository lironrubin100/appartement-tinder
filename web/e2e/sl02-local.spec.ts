import { test, expect, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createHash, randomUUID } from 'node:crypto';
import type { Database } from '../src/types/database';
import { completeCanonicalResident } from './canonical-fixture';

// This suite creates disposable identities and data ONLY on the local stack.
const url = process.env.SL02_LOCAL_URL ?? '';
const key = process.env.SL02_LOCAL_ANON_KEY ?? '';
test.skip(url !== 'http://127.0.0.1:54321' || !key, 'Requires the isolated local Supabase stack');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6E3sAAAAASUVORK5CYII=', 'base64');

async function resident(context: BrowserContext) {
  const cookies: { name: string; value: string }[] = [];
  const client = createServerClient<Database>(url, key, { cookies: { getAll: () => cookies, setAll: values => { cookies.splice(0, cookies.length, ...values); } } });
  const email = `sl02-${randomUUID()}@example.com`;
  const auth = await client.auth.signUp({ email, password: `${randomUUID()}Aa1!` });
  expect(auth.error).toBeNull();
  expect(auth.data.user).not.toBeNull();
  await completeCanonicalResident(client, auth.data.user!.id, 'Local resident');
  const revision = await client.from('profile_lifestyle').select('revision').eq('profile_id', auth.data.user!.id).single();
  expect(revision.error).toBeNull();
  const noPhone = await client.rpc('save_resident_profile', {
    p_name: 'Local resident', p_birth_date: '2000-02-20', p_phone: '', p_bio: 'Synthetic retained QA resident',
    p_facts: { cleanliness: 'tidy_shared', sleep_schedule: 'regular', guests: 'occasional', smoking: 'none' },
    p_preferences: {}, p_disclosed_fields: ['cleanliness'], p_complete: true,
    p_expected_revision: revision.data!.revision, p_request_key: randomUUID(),
  });
  expect(noPhone.error).toBeNull();
  const browserCookies = cookies.map(({ name, value }) => ({ name, value, domain: 'localhost', path: '/', sameSite: 'Lax' as const }));
  await context.addCookies(browserCookies);
  return { client, cookies: browserCookies };
}

for (const locale of ['he', 'en'] as const) {
  test(`${locale}: overlay draft resumes and publishes through ordinary local clients`, async ({ page, context, browser }) => {
    test.setTimeout(180_000);
    const en = locale === 'en';
    const t = (he: string, english: string) => en ? english : he;
    const prefix = en ? '/en' : '';
    const { client } = await resident(context);
    if (en || process.env.SL02_NARROW_HE === '1') await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${prefix}/discover`);
    const originalUrl = page.url();
    await page.getByRole('link', { name: t('הוסף', 'Add'), exact: true }).click();
    const dialog = page.getByRole('dialog', { name: t('פרסום דירה', 'Publish an apartment') });
    await expect(dialog).toBeVisible();
    await dialog.locator('[name=title]').fill('Local SL02 home');
    await dialog.locator('[name=bedrooms]').fill('2');
    await dialog.locator('[name=availableFrom]').fill('2027-02-01');
    await page.route('**/api/geocode', route => route.fulfill({ status: 429, json: { error: 'limited' } }));
    await dialog.locator('[name=address]').fill('Local Test Address 123');
    await expect(dialog.locator('[data-lookup-code]')).toHaveAttribute('data-lookup-code', 'http_429');
    await expect(dialog.getByRole('status').filter({ hasText: t('בוצעו בקשות רבות', 'Too many requests') })).toBeVisible();
    await dialog.getByRole('button', { name: t('הכתובת לא נמצאה? הזנה ותיקון מיקום ידניים', 'Address not found? Enter and adjust location manually'), exact: true }).click();
    await dialog.locator('[name=locationCity]').fill('Tel Aviv');
    await dialog.locator('[name=latitude]').fill('32.085');
    await dialog.locator('[name=longitude]').fill('34.781');
    await dialog.locator('[name=locationConfirmed]').check();
    await dialog.locator('[name=roomPrice]').fill('2000');
    await dialog.getByRole('button', { name: t('+ הוספת חדר פנוי', '+ Add an available room'), exact: true }).click();
    await dialog.locator('[name=roomPrice]').nth(1).fill('2600');
    await dialog.locator('#photos').setInputFiles([1, 2, 3].map(n => ({ name: `broken-${n}.png`, mimeType: 'image/png', buffer: Buffer.from('not a valid image') })));
    await dialog.getByRole('button', { name: t('פרסום המודעה', 'Publish listing'), exact: true }).click();
    await expect(dialog.locator('[role=alert]')).toContainText(t('לא הצלחנו להכין', 'Could not prepare'));
    for (let n = 3; n >= 1; n--) await dialog.getByRole('button', { name: `${t('הסרת תמונה', 'Remove photo')} ${n}`, exact: true }).click();
    await dialog.locator('#photos').setInputFiles([1, 2, 3].map(n => ({ name: `photo-${n}.png`, mimeType: 'image/png', buffer: png })));
    await page.screenshot({ path: `test-results/sl02-${locale}-composer.png`, fullPage: true });
    await dialog.getByRole('button', { name: t('סגירה', 'Close'), exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(page.url()).toBe(originalUrl);
    await page.reload();
    await page.getByRole('link', { name: t('הוסף', 'Add'), exact: true }).click();
    await expect(dialog.locator('[name=title]')).toHaveValue('Local SL02 home');
    await expect(dialog.locator('figure')).toHaveCount(3);
    await expect(dialog.locator('[name=locationCity]')).toHaveValue('Tel Aviv');
    if (!en) {
      // Let the server finish the actual publication, then simulate losing its
      // response. Retrying the same saved draft must return the existing row.
      let dropResponse = true;
      await page.route('**/discover', async route => {
        if (dropResponse && route.request().method() === 'POST' && route.request().headers()['next-action']) {
          dropResponse = false;
          const response = await route.fetch();
          expect(response.ok()).toBe(true);
          await route.abort('failed');
        } else await route.continue();
      });
      await dialog.getByRole('button', { name: 'פרסום המודעה', exact: true }).click();
      await expect(dialog.locator('[role=alert]')).toContainText('לא הצלחנו להכין');
    }
    await dialog.getByRole('button', { name: t('פרסום המודעה', 'Publish listing'), exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/compose/published/[0-9a-f-]+$`), { timeout: 60_000 });
    const listingId = page.url().split('/').pop()!;
    const listing = await client.from('apartments').select('id,price,photos,lat,lng,public_lat,public_lng,apartment_rooms(monthly_price)').eq('id', listingId).single();
    expect(listing.error).toBeNull();
    expect(listing.data?.price).toBe(2000);
    expect(listing.data?.photos).toHaveLength(3);
    expect(listing.data?.apartment_rooms.map(room => room.monthly_price).sort()).toEqual([2000, 2600]);
    const ownerListings = await client.from('apartments').select('id').eq('title', 'Local SL02 home');
    expect(ownerListings.error).toBeNull();
    expect(ownerListings.data).toHaveLength(1);
    const point = await client.from('apartments_public').select('lat,lng').eq('id', listingId).single();
    expect(point.error).toBeNull();
    expect(point.data?.lat).toBe(listing.data?.public_lat);
    expect(point.data?.lng).toBe(listing.data?.public_lng);
    const displacement = Math.hypot((point.data!.lat - listing.data!.lat) * 111320,
      (point.data!.lng - listing.data!.lng) * 111320 * Math.cos(listing.data!.lat * Math.PI / 180));
    expect(displacement).toBeGreaterThanOrEqual(300);
    expect(displacement).toBeLessThanOrEqual(700);
    const digests = await Promise.all(listing.data!.photos.map(async photo => {
      const bytes = await (await fetch(photo)).arrayBuffer();
      return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    }));
    const payload = { title: 'Local SL02 home', address: 'Local Test Address 123', latitude: 32.085, longitude: 34.781,
      bedrooms: 2, billsIncluded: false, availableFrom: '2027-02-01', description: '', photos: listing.data!.photos,
      photoDigests: digests, roomPrices: [2000, 2600] };
    const retry = await client.rpc('publish_apartment_once', { p_request_key: listingId, p_draft: payload });
    expect(retry.error).toBeNull();
    expect(retry.data).toBe(listingId);
    const conflict = await client.rpc('publish_apartment_once', { p_request_key: listingId, p_draft: { ...payload, title: 'Different' } });
    expect(conflict.error?.message).toContain('REQUEST_CONFLICT');
    const otherContext = await browser.newContext();
    try {
      const { client: other } = await resident(otherContext);
      const forbidden = await other.rpc('publish_apartment_once', { p_request_key: listingId, p_draft: payload });
      expect(forbidden.error).not.toBeNull();
      const otherUpdate = await other.from('apartments').update({ status: 'taken' }).eq('id', listingId).select('id');
      expect(otherUpdate.error).toBeNull();
      expect(otherUpdate.data).toEqual([]);
      const otherPoint = await other.from('apartments_public').select('*').eq('id', listingId).single();
      expect(otherPoint.error).toBeNull();
      expect(otherPoint.data?.lat).toBe(point.data!.lat);
      expect(otherPoint.data?.lng).toBe(point.data!.lng);
      expect(otherPoint.data).not.toHaveProperty('address');
    } finally { await otherContext.close(); }
    await page.goto(`${prefix}/listings/${listingId}`);
    await expect(page.locator('body')).not.toContainText('Local Test Address 123');
    await expect(page.locator('body')).not.toContainText(en ? 'Approximate area in Beer Sheva' : 'אזור משוער בבאר שבע');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/sl02-${locale}-local.png`, fullPage: true });
    const markTaken = await client.from('apartments').update({ status: 'taken' }).eq('id', listingId).select('status').single();
    expect(markTaken.error).toBeNull();
    expect(markTaken.data?.status).toBe('taken');
    const publicRead = await client.rpc('get_public_listing', { p_listing_id: listingId });
    expect(publicRead.error).toBeNull();
    expect(publicRead.data).toEqual([]);
  });
}

test('drafts remain scoped to the signed-in account on the same browser', async ({ page, context }) => {
  test.setTimeout(120_000);
  const accountA = await resident(context);
  await page.goto('/discover');
  await page.getByRole('link', { name: 'הוסף', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'פרסום דירה' });
  await dialog.locator('[name=title]').fill('Account A private draft');
  await dialog.getByRole('button', { name: 'סגירה', exact: true }).click();
  await resident(context);
  await page.goto('/discover');
  await page.getByRole('link', { name: 'הוסף', exact: true }).click();
  await expect(dialog.locator('[name=title]')).toHaveValue('');
  await dialog.getByRole('button', { name: 'סגירה', exact: true }).click();
  await context.addCookies(accountA.cookies);
  await page.goto('/discover');
  await page.getByRole('link', { name: 'הוסף', exact: true }).click();
  await expect(dialog.locator('[name=title]')).toHaveValue('Account A private draft');
});

test('editing a selected address clears the selection and confirmation', async ({ page, context }) => {
  test.setTimeout(120_000);
  await resident(context);
  await page.route('**/api/geocode', route => route.fulfill({ status: 200, json: { suggestions: [{
    label: 'Test street 123, Tel Aviv', city: 'Tel Aviv', latitude: 32.085, longitude: 34.781,
    accuracy: 'address', kind: 'address', token: 'synthetic-selection-token',
  }] } }));
  await page.goto('/en/discover');
  await page.getByRole('link', { name: 'Add', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Publish an apartment' });
  const address = dialog.locator('[name=address]');
  await address.fill('Test street');
  await dialog.getByRole('option', { name: 'Test street 123, Tel Aviv' }).click();
  await expect(dialog.locator('[name=locationToken]')).toHaveValue('synthetic-selection-token');
  await dialog.locator('[name=locationConfirmed]').check();
  await address.fill('Another address');
  await expect(dialog.locator('[name=locationToken]')).toHaveValue('');
  await expect(dialog.locator('[name=latitude]')).toHaveValue('');
  await expect(dialog.locator('[name=locationConfirmed]')).toHaveCount(0);
  await page.unroute('**/api/geocode');
  await page.route('**/api/geocode', route => route.abort('timedout'));
  await address.fill('Timeout test address');
  await expect(dialog.getByRole('status').filter({ hasText: 'Address search is unavailable' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Address not found? Enter and adjust location manually', exact: true }).click();
  await expect(dialog.locator('[name=locationCity]')).toBeVisible();
});

test('nonresident poster retains a required private phone and can open composer', async ({ page, context }) => {
  test.setTimeout(120_000);
  const cookies: { name: string; value: string }[] = [];
  const client = createServerClient<Database>(url, key, { cookies: { getAll: () => cookies, setAll: values => { cookies.splice(0, cookies.length, ...values); } } });
  const auth = await client.auth.signUp({ email: `sl02-${randomUUID()}@example.com`, password: `${randomUUID()}Aa1!` });
  expect(auth.error).toBeNull();
  const onboarding = await client.rpc('save_onboarding', { p_name: 'Local poster', p_resident: false,
    p_birth_date: null, p_phone: '0500000000', p_agency: '', p_bio: '', p_tags: { adult_confirmed: true }, p_complete: true });
  expect(onboarding.error).toBeNull();
  const ownPhone = await client.from('profile_private').update({ phone: null }).eq('profile_id', auth.data.user!.id);
  expect(ownPhone.error?.message).toContain('VALIDATION_FAILED:lister_phone');
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, domain: 'localhost', path: '/', sameSite: 'Lax' as const })));
  await page.goto('/en/compose');
  await expect(page.getByRole('button', { name: 'Publish listing', exact: true })).toBeEnabled();
});

for (const alreadyPublished of [false, true]) {
  test(`discard ${alreadyPublished ? 'keeps published listing photos' : 'cancels attempt and removes its photos'}`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const { client } = await resident(context);
    const user = (await client.auth.getUser()).data.user!;
    const key = randomUUID();
    const paths = [1, 2, 3].map(n => `${key}/${n}.jpg`);
    for (const path of paths) expect((await client.storage.from('apartment-photos').upload(path, png, { contentType: 'image/jpeg' })).error).toBeNull();
    const photos = paths.map(path => client.storage.from('apartment-photos').getPublicUrl(path).data.publicUrl);
    const payload = { title: 'Discard test', address: 'Synthetic address', latitude: 32.085, longitude: 34.781,
      bedrooms: 1, billsIncluded: false, availableFrom: '2027-02-01', description: '', photos, roomPrices: [2000] };
    if (alreadyPublished) expect((await client.rpc('publish_apartment_once', { p_request_key: key, p_draft: payload })).data).toBe(key);
    await page.goto('/en/discover');
    await page.evaluate(async ({ accountId, attemptKey }) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('shutaf-listing-drafts', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('drafts');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('drafts', 'readwrite');
          tx.objectStore('drafts').put({ version: 1, title: 'Discard test', bedrooms: '1', availableFrom: '2027-02-01',
            billsIncluded: false, description: '', roomPrices: ['2000'], photos: [], address: null, requestKey: attemptKey }, accountId);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
    }, { accountId: user.id, attemptKey: key });
    await page.getByRole('link', { name: 'Add', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Publish an apartment' });
    await expect(dialog.locator('[name=title]')).toHaveValue('Discard test');
    page.once('dialog', prompt => prompt.accept());
    await dialog.getByRole('button', { name: 'Discard draft', exact: true }).click();
    if (alreadyPublished) {
      await expect(page).toHaveURL(new RegExp(`/en/compose/published/${key}$`));
      expect((await client.storage.from('apartment-photos').download(paths[0])).error).toBeNull();
    } else {
      await expect(dialog).not.toBeVisible();
      expect((await client.storage.from('apartment-photos').download(paths[0])).error).not.toBeNull();
      expect((await client.storage.from('apartment-photos').upload(`${key}/4.jpg`, png, { contentType: 'image/jpeg' })).error).not.toBeNull();
      expect((await client.rpc('publish_apartment_once', { p_request_key: key, p_draft: payload })).error?.message).toContain('REQUEST_CANCELLED');
    }
  });
}

test('concurrent local upload and cancellation leave no uploaded object after cleanup', async ({ context }) => {
  test.setTimeout(120_000);
  const { client } = await resident(context);
  for (let attempt = 0; attempt < 8; attempt++) {
    const requestKey = randomUUID();
    const path = `${requestKey}/1.jpg`;
    const [upload, cancellation] = await Promise.all([
      client.storage.from('apartment-photos').upload(path, png, { contentType: 'image/jpeg' }),
      client.rpc('cancel_listing_publication', { p_request_key: requestKey }),
    ]);
    expect(cancellation.error).toBeNull();
    expect(cancellation.data).toBe('cancelled');
    if (upload.error) expect(upload.error.message).toBeTruthy();
    expect((await client.storage.from('apartment-photos').remove([path])).error).toBeNull();
    expect((await client.storage.from('apartment-photos').download(path)).error).not.toBeNull();
    expect((await client.storage.from('apartment-photos').upload(path, png, { contentType: 'image/jpeg' })).error).not.toBeNull();
  }
});
