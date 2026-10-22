import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Retained synthetic users only. Every browser context has fresh device storage.
// No fixture profile, listing, inquiry or hosted Storage object is changed.
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, '')];
  }));
const fixture = (name: string) => JSON.parse(readFileSync(`.env.qa-${name}.local`, 'utf8'))[0];
const output = process.env.UX_SCREENSHOTS;
const saveScreenshot = async (page: Page, name: string) => {
  if (output) { mkdirSync(output, { recursive: true }); await page.screenshot({ path: path.join(output, `${name}.png`) }); }
};
async function signIn(context: BrowserContext, baseURL: string, name = 'sl01-card') {
  const user = fixture(name);
  const cookies: { name: string; value: string }[] = [];
  const api = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => cookies, setAll: values => { cookies.splice(0, cookies.length, ...values); } },
  });
  const { error } = await api.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error('Synthetic QA sign-in failed');
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL, sameSite: 'Lax' as const })));
  return user;
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);
for (const locale of ['he', 'en'] as const) {
  for (const width of [390, 1280]) {
    test(`${locale} ${width}: ordered local draft saves, Escape, photos, storage failure and retry`, async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width, height: 844 });
      await signIn(context, baseURL!);
      await page.addInitScript(() => {
        const win = window as unknown as {
          qaFailDrafts: boolean; qaPauseDrafts: boolean; qaResumeDraft?: () => void;
        };
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
          if (this.name === 'drafts' && win.qaFailDrafts) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
          return put.apply(this, args);
        };
        const open = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function (...args: Parameters<typeof open>) {
          const request = open.apply(this, args);
          if (args[0] === 'shutaf-listing-drafts') {
            Object.defineProperty(request, 'onsuccess', { set(callback) {
              request.addEventListener('success', event => {
                if (win.qaPauseDrafts) win.qaResumeDraft = () => callback.call(request, event);
                else callback.call(request, event);
              });
            } });
          }
          return request;
        };
      });
      const en = locale === 'en', prefix = en ? '/en' : '';
      await page.goto(`${prefix}/profile`);
      const profileURL = page.url();
      const add = page.getByRole('link', { name: en ? 'Add' : 'הוסף', exact: true });
      await add.click();
      const dialog = page.getByRole('dialog', { name: en ? 'Publish an apartment' : 'פרסום דירה', exact: true });
      const title = dialog.getByRole('textbox', { name: en ? 'Listing title' : 'כותרת המודעה', exact: true });
      const save = dialog.getByRole('button', { name: en ? 'Save draft and close' : 'שמירת טיוטה וסגירה', exact: true });
      await expect(title).toBeVisible();
      const address = dialog.getByRole('combobox', { name: en ? 'Exact address' : 'כתובת מדויקת', exact: true });
      await address.click();
      await expect(address).toHaveAttribute('aria-expanded', 'true');
      await address.press('Escape');
      await expect(address).toHaveAttribute('aria-expanded', 'false');
      await expect(dialog).toBeVisible();
      await title.fill('UX first saved draft');
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
      await dialog.locator('input[type=file]').setInputFiles({ name: 'ux-synthetic.png', mimeType: 'image/png', buffer: png });
      await expect(dialog.getByRole('img', { name: /ux-synthetic.png/ })).toBeVisible();
      await expect(dialog.getByRole('button', { name: en ? 'Discard draft' : 'מחיקת טיוטה', exact: true })).toBeHidden();
      await save.click();
      await expect(dialog).toBeHidden();
      expect(page.url()).toBe(profileURL);
      await add.click();
      await expect(title).toHaveValue('UX first saved draft');
      await expect(dialog.getByRole('img', { name: /ux-synthetic.png/ })).toBeVisible();
      // Reopening after a successful close must permit later saves.
      await title.fill('UX reopened draft');
      await expect.poll(() => page.evaluate(() => new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('shutaf-listing-drafts', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction('drafts', 'readonly').objectStore('drafts').openCursor();
          read.onsuccess = () => { resolve(read.result?.value.title ?? ''); db.close(); };
          read.onerror = () => reject(read.error);
        };
      }))).toBe('UX reopened draft');
      await page.reload();
      await add.click();
      await expect(title).toHaveValue('UX reopened draft');
      await page.evaluate(() => { (window as unknown as { qaPauseDrafts: boolean }).qaPauseDrafts = true; });
      await title.fill('UX earlier autosave');
      await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { qaResumeDraft?: unknown }).qaResumeDraft))).toBe(true);
      await title.fill('UX latest close snapshot');
      await save.click();
      await expect(dialog.getByRole('status').filter({ hasText: en ? 'Saving draft…' : 'שומרים טיוטה…' })).toBeVisible();
      await expect(dialog).toBeVisible();
      await page.evaluate(() => {
        const win = window as unknown as { qaPauseDrafts: boolean; qaResumeDraft: () => void };
        win.qaPauseDrafts = false; win.qaResumeDraft();
      });
      await expect(dialog).toBeHidden();
      await add.click();
      await expect(title).toHaveValue('UX latest close snapshot');
      // A failed Escape close must preserve the form and photo; retry is explicit.
      await page.evaluate(() => { (window as unknown as { qaFailDrafts: boolean }).qaFailDrafts = true; });
      await title.fill('UX retained after failure');
      await title.press('Escape');
      await expect(dialog.getByRole('alert')).toContainText(en ? 'Could not save the draft' : 'לא הצלחנו לשמור טיוטה');
      await expect(title).toHaveValue('UX retained after failure');
      await expect(dialog.getByRole('img', { name: /ux-synthetic.png/ })).toBeVisible();
      await expect(save).toBeEnabled();
      await save.scrollIntoViewIfNeeded();
      await saveScreenshot(page, `draft-failure-${locale}-${width}`);
      await page.evaluate(() => { (window as unknown as { qaFailDrafts: boolean }).qaFailDrafts = false; });
      await save.click();
      await expect(dialog).toBeHidden();
      await add.click();
      await expect(title).toHaveValue('UX retained after failure');
      await title.fill('UX Escape acknowledged');
      await title.press('Escape');
      await expect(dialog).toBeHidden();
      await page.reload();
      await add.click();
      await expect(title).toHaveValue('UX Escape acknowledged');
      await expect(dialog.getByRole('img', { name: /ux-synthetic.png/ })).toBeVisible();
      // Explicit delete remains secondary and asks before changing this context's local draft.
      await dialog.getByText(en ? 'More draft options' : 'אפשרויות נוספות לטיוטה', { exact: true }).click();
      page.once('dialog', confirmation => confirmation.dismiss());
      await dialog.getByRole('button', { name: en ? 'Discard draft' : 'מחיקת טיוטה', exact: true }).click();
      await expect(title).toHaveValue('UX Escape acknowledged');
      await save.scrollIntoViewIfNeeded();
      await saveScreenshot(page, `draft-actions-${locale}-${width}`);
      page.once('dialog', confirmation => confirmation.accept());
      await dialog.getByRole('button', { name: en ? 'Discard draft' : 'מחיקת טיוטה', exact: true }).click();
      await expect(dialog).toBeHidden();
      await add.click();
      await expect(title).toHaveValue('');
      await expect(dialog.getByRole('img', { name: /ux-synthetic.png/ })).toHaveCount(0);
      await save.click();
      await expect(dialog).toBeHidden();
    });
  }
  test(`${locale}: interrupted inquiry acceptance restores the localized retry action`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(context, baseURL!, 'sl01-lister');
    const en = locale === 'en', prefix = en ? '/en' : '';
    await page.goto(`${prefix}/my-listings`);
    const accept = page.getByRole('button', { name: en ? 'Accept and open chat' : 'אישור ופתיחת צ׳אט', exact: true }).first();
    await expect(accept).toBeVisible();
    let aborted = 0;
    await page.route('**/*', route => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        aborted++; return route.abort('failed');
      }
      return route.continue();
    });
    await accept.click();
    await expect(page.getByTestId('owner-listing').getByRole('alert')).toHaveText(en ? 'Could not accept the inquiry. Please retry.' : 'לא הצלחנו לאשר את הפנייה. נסו שוב.');
    await expect(accept).toBeEnabled();
    expect(aborted).toBe(1);
    expect(new URL(page.url()).pathname).toBe(`${prefix}/my-listings`);
    await saveScreenshot(page, `inquiry-retry-${locale}`);
    // Request was aborted before reaching the server; retained inquiry is unchanged.
    await page.unrouteAll({ behavior: 'wait' });
  });
  for (const kind of ['sl01-card', 'sl01-lister', 'sl04-empty']) {
    test(`${locale} ${kind}: profile entry, owned cards, public owner CTA, empty and rented confirmation`, async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const user = await signIn(context, baseURL!, kind);
      const api = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const auth = await api.auth.signInWithPassword({ email: user.email, password: user.password });
      if (auth.error) throw new Error('Synthetic ordinary-client sign-in failed');
      const { data, error } = await api.from('apartments').select('id,status').eq('lister_id', auth.data.user.id).eq('source', 'user');
      if (error) throw new Error('Owned rows unavailable');
      const rows = data!;
      const en = locale === 'en', prefix = en ? '/en' : '';
      await page.goto(`${prefix}/profile`);
      await page.getByRole('link', { name: en ? 'My listings' : 'המודעות שלי', exact: true }).last().click();
      await expect(page).toHaveURL(`${prefix}/my-listings`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(en ? 'My listings' : 'המודעות שלי');
      expect((await page.getByTestId('owner-listing').evaluateAll(cards => cards.map(card => card.getAttribute('data-listing-id')))).sort()).toEqual(rows.map(row => row.id).sort());
      await expect(page.getByRole('link', { name: en ? 'Manage listing' : 'ניהול המודעה', exact: true })).toHaveCount(0);
      if (kind === 'sl04-empty') { expect(rows).toHaveLength(0); await expect(page.getByText(en ? 'No listings yet' : 'עדיין אין לך מודעות', { exact: true })).toBeVisible(); }
      for (const row of rows.filter(row => row.status === 'active')) {
        const card = page.locator(`[data-listing-id="${row.id}"]`);
        await card.getByRole('button', { name: en ? 'Mark rented' : 'סימון כהושכרה', exact: true }).click();
        await expect(card.getByText(en ? 'Has the apartment been rented? It will be removed from available listings.' : 'הדירה הושכרה? המודעה תוסר מהדירות הזמינות.', { exact: true })).toBeVisible();
        await card.getByRole('button', { name: en ? 'Cancel' : 'ביטול', exact: true }).click();
      }
      if (kind === 'sl01-lister' || kind === 'sl04-empty') {
        await page.getByRole('navigation', { name: en ? 'Lister navigation' : 'ניווט מפרסם', exact: true })
          .getByRole('link', { name: en ? 'Profile' : 'פרופיל', exact: true }).click();
        await expect(page).toHaveURL(`${prefix}/profile`);
        await page.getByRole('link', { name: en ? 'My listings' : 'המודעות שלי', exact: true }).last().click();
      }
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(en ? 'My listings' : 'המודעות שלי');
      await saveScreenshot(page, `management-${locale}-${kind}`);
      const active = rows.find(row => row.status === 'active');
      if (active) {
        await page.locator(`[data-listing-id="${active.id}"]`).getByRole('link', { name: en ? 'View listing' : 'צפייה במודעה', exact: true }).click();
        await expect(page).toHaveURL(`${prefix}/listings/${active.id}`);
        await expect(page.getByRole('link', { name: en ? 'Manage your listing' : 'ניהול המודעה שלי', exact: true })).toBeVisible();
      }
      await api.auth.signOut({ scope: 'local' });
    });
  }
}
