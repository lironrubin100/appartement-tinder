import { test, expect, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
  const at = l.indexOf('='); return [l.slice(0, at), l.slice(at + 1).replace(/^['"]|['"]$/g, '')];
}));
async function signIn(context: BrowserContext, baseURL: string, name: string) {
  const user = JSON.parse(readFileSync(`.env.qa-${name}.local`, 'utf8'))[0];
  const cookies: { name: string; value: string }[] = [];
  const api = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false }, cookies: { getAll: () => cookies, setAll: values => { cookies.splice(0, cookies.length, ...values); } },
  });
  const auth = await api.auth.signInWithPassword({ email: user.email, password: user.password });
  if (auth.error) throw Error('Synthetic QA sign-in failed');
  await context.clearCookies();
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL, sameSite: 'Lax' as const })));
  return api;
}
const draftIds = async (api: Awaited<ReturnType<typeof signIn>>) => {
  const { data, error } = await api.from('listing_drafts').select('id, fields, photos').eq('state', 'open').order('updated_at', { ascending: false }).order('id', { ascending: false }).limit(20);
  if (error) throw Error('Ordinary draft read failed');
  return data!;
};
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(90_000);
for (const locale of ['he', 'en']) for (const width of [390, 1280]) {
  test(`${locale} ${width}: owned drafts and published listings stay separate and private`, async ({ page, context, baseURL }) => {
    const en = locale === 'en', prefix = en ? '/en' : '';
    await page.setViewportSize({ width, height: 844 });
    const api = await signIn(context, baseURL!, 'sl01-card');
    try {
      const rows = await draftIds(api); expect(rows.length).toBeGreaterThan(1);
      const published = await api.from('apartments').select('id').eq('source', 'user');
      if (published.error) throw Error('Ordinary listing read failed');
      const response = await page.goto(`${prefix}/my-listings`);
      const section = page.locator('#saved-drafts');
      await expect(section.getByTestId('listing-draft')).toHaveCount(rows.length);
      expect(await section.getByTestId('listing-draft').evaluateAll(items => items.map(item => item.getAttribute('data-draft-id')))).toEqual(rows.map(row => row.id));
      const publicIds = await page.getByTestId('owner-listing').evaluateAll(items => items.map(item => item.getAttribute('data-listing-id')));
      expect(publicIds.sort()).toEqual(published.data!.map(row => row.id).sort());
      expect(publicIds.some(id => rows.some(row => row.id === id))).toBe(false);
      await expect(section.getByText(en ? 'Listing edit' : 'עריכת מודעה', { exact: true })).toBeVisible();
      await expect(section.getByRole('link')).toHaveCount(0); // No unimplemented editor/delete action.
      await expect(page.locator('html')).toHaveAttribute('dir', en ? 'ltr' : 'rtl');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const html = await response!.text();
      for (const row of rows) {
        for (const ref of (row.photos as {objectPath?: string}[])) if (ref.objectPath) expect(html).not.toContain(ref.objectPath);
        const address = (row.fields as {address?: {address?: string}}).address?.address;
        if (address) expect(html).not.toContain(address);
      }
      if (process.env.UX_SCREENSHOTS) {
        mkdirSync(process.env.UX_SCREENSHOTS, { recursive: true });
        await section.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(process.env.UX_SCREENSHOTS, `cloud-drafts-${locale}-${width}.png`) });
      }
      // An actual expired/malformed cursor is an error, never an empty list.
      await page.goto(`${prefix}/my-listings?draftCursor=invalid#saved-drafts`);
      await expect(section.getByRole('alert')).toContainText(en ? 'expired' : 'תוקף');
      await expect(page.getByTestId('owner-listing')).toHaveCount(publicIds.length);
      await expect(section.getByText(en ? 'No saved drafts yet.' : 'עדיין אין טיוטות שמורות.', {exact:true})).toHaveCount(0);
      await section.getByRole('link', { name: en ? 'Latest drafts' : 'הטיוטות העדכניות', exact: true }).click();
      await expect(section.getByTestId('listing-draft')).toHaveCount(rows.length);
    } finally { await api.auth.signOut({ scope: 'local' }); }
  });
}
for (const locale of ['he', 'en']) {
  test(`${locale}: empty drafts and auth verification failure recover independently`, async ({ page, context, baseURL }) => {
    const prefix = locale === 'en' ? '/en' : '', en = locale === 'en';
    const api = await signIn(context, baseURL!, 'sl01-intake');
    try {
      expect(await draftIds(api)).toHaveLength(0);
      await page.goto(`${prefix}/my-listings`);
      await expect(page.locator('#saved-drafts').getByText(en ? 'No saved drafts yet.' : 'עדיין אין טיוטות שמורות.', {exact:true})).toBeVisible();
      await page.route('**/auth/v1/user', route => route.abort('failed'));
      await page.reload();
      const section = page.locator('#saved-drafts');
      await expect(section.getByRole('status')).toContainText(en ? 'could not be verified' : 'לא הצלחנו לאמת');
      await expect(section.getByTestId('listing-draft')).toHaveCount(0);
      await page.unrouteAll({behavior:'wait'});
      await section.getByRole('link', {name:en?'Reload':'טעינה מחדש',exact:true}).click();
      await expect(section.getByText(en ? 'No saved drafts yet.' : 'עדיין אין טיוטות שמורות.', {exact:true})).toBeVisible();
    } finally { await api.auth.signOut({ scope: 'local' }); }
  });
}
test('account switch and another-tab sign-out remove the previous private drafts', async ({ page, context, baseURL }) => {
  const first = await signIn(context, baseURL!, 'sl01-card');
  const firstRows = await draftIds(first);
  await page.goto('/en/my-listings');
  const section = page.locator('#saved-drafts');
  await expect(section.getByTestId('listing-draft')).toHaveCount(firstRows.length);
  const second = await signIn(context, baseURL!, 'sl04-empty');
  try {
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(section.getByTestId('listing-draft')).toHaveCount(0);
    const switchedResponse = await page.reload();
    const switchedHTML = await switchedResponse!.text();
    for (const row of firstRows) expect(switchedHTML).not.toContain(row.id);
    const secondRows = await draftIds(second);
    await expect(section.getByTestId('listing-draft')).toHaveCount(secondRows.length);
    const ids = await section.getByTestId('listing-draft').evaluateAll(items => items.map(item => item.getAttribute('data-draft-id')));
    expect(ids.some(id => firstRows.some(row => row.id === id))).toBe(false);
    // Real sign-out action in another tab, then stale page regains focus.
    const tab = await context.newPage();
    await tab.goto('/en/profile');
    await tab.getByRole('button', {name:'Sign out',exact:true}).click();
    await expect(tab).toHaveURL(/\/en\/login/);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(section.getByTestId('listing-draft')).toHaveCount(0);
    await tab.close();
    await page.reload();
    await expect(page).toHaveURL(/\/en\/login/);
  } finally { await first.auth.signOut({ scope: 'local' }); await second.auth.signOut({scope:'local'}); }
});
