import { test, expect, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Exact owner-approved workflow: two new retained synthetic listings, one per locale.
// A durable per-locale record prevents a retry from silently creating more listings.
test.skip(process.env.UX_LIVE_JOURNEY !== '1', 'Requires explicit two-listing synthetic QA authorization');
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(180_000);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const directory = '.qa/owner-ux';
mkdirSync(directory, { recursive: true });
async function account(context: BrowserContext, baseURL: string, fixture: string) {
  const user = JSON.parse(readFileSync(`.env.qa-${fixture}.local`, 'utf8'))[0];
  const cookies: { name: string; value: string }[] = [];
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => cookies, setAll: values => { cookies.splice(0, cookies.length, ...values); } },
  });
  const result = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (result.error) throw new Error('Synthetic QA sign-in failed');
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL, sameSite: 'Lax' as const })));
  return client;
}
for (const locale of ['he', 'en'] as const) {
  test(`${locale}: real publication, network recovery, acceptance/address/chat and rented state`, async ({ browser, context, page, baseURL }) => {
    expect(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname).toBe('npbduvjnqnbydolmdpsc.supabase.co');
    const recordFile = path.join(directory, `live-${locale}.json`);
    const record: { title: string; listingId?: string; submitted?: boolean; conversationId?: string; verifiedAt?: string } = existsSync(recordFile)
      ? JSON.parse(readFileSync(recordFile, 'utf8')) : { title: `Synthetic UX review ${locale} ${Date.now()}` };
    const persist = () => writeFileSync(recordFile, JSON.stringify({ ...record, target: env.NEXT_PUBLIC_SUPABASE_URL, baseURL, retained: true }, null, 2));
    persist();
    await page.setViewportSize({ width: 390, height: 844 });
    const owner = await account(context, baseURL!, 'sl01-lister');
    const peerContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    const requester = await account(peerContext, baseURL!, 'sl01-card');
    const peer = await peerContext.newPage();
    const outsiderContext = await browser.newContext({ baseURL });
    const outsider = await account(outsiderContext, baseURL!, 'sl04-empty');
    const prefix = locale === 'en' ? '/en' : '';
    const t = (he: string, en: string) => locale === 'en' ? en : he;
    const exactAddress = 'Synthetic QA location 123';
    try {
      if (!record.listingId && record.submitted) {
        const result = await owner.from('apartments').select('id').eq('title', record.title);
        if (result.error || result.data?.length !== 1) throw new Error('Uncertain prior publication; reconcile the exact receipt before retry, never create another fixture.');
        record.listingId = result.data[0].id; persist();
      }
      if (!record.listingId) {
        await page.goto(`${prefix}/my-listings`);
        await page.getByRole('link', { name: t('+ הוספת מודעה', '+ Add listing'), exact: true }).click();
        const form = page.locator('form');
        await form.locator('[name=title]').fill(record.title);
        await form.locator('[name=bedrooms]').fill('2');
        await form.locator('[name=availableFrom]').fill('2027-02-01');
        await form.getByRole('button', { name: t('הכתובת לא נמצאה? הזנה ותיקון מיקום ידניים', 'Address not found? Enter and adjust location manually'), exact: true }).click();
        await form.locator('[name=address]').fill(exactAddress);
        await form.locator('[name=locationCity]').fill('Tel Aviv');
        await form.locator('[name=latitude]').fill('32.085');
        await form.locator('[name=longitude]').fill('34.781');
        await expect(form.locator('.leaflet-container')).toBeVisible();
        await form.locator('[name=locationConfirmed]').check();
        await form.locator('[name=roomPrice]').fill('2100');
        const png = await page.evaluate(() => {
          const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300;
          const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#bed8d2'; ctx.fillRect(0, 0, 400, 300);
          return canvas.toDataURL('image/png').split(',')[1];
        });
        await form.locator('input[type=file]').setInputFiles([1, 2, 3].map(i => ({ name: `synthetic-ux-${i}.png`, mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })));
        record.submitted = true; persist();
        await form.getByRole('button', { name: t('פרסום המודעה', 'Publish listing'), exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${prefix}/compose/published/[0-9a-f-]+$`), { timeout: 90_000 });
        record.listingId = page.url().split('/').pop()!; persist();
        await expect(page.getByRole('heading', { name: t('המודעה פורסמה!', 'Listing published!'), exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByRole('heading', { name: t('המודעה פורסמה!', 'Listing published!'), exact: true })).toBeVisible();
        await page.getByRole('link', { name: t('צפייה במודעה', 'View listing'), exact: true }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(record.title);
      }
      const listingId = record.listingId!;
      const owned = await owner.from('apartments').select('photos,status').eq('id', listingId).single();
      if (owned.error) throw new Error('Fresh publication is not owned');
      expect(owned.data.photos).toHaveLength(3);
      for (const photo of owned.data.photos) expect((await page.request.get(photo)).ok()).toBe(true);
      let inquiry = await requester.from('listing_inquiries').select('id,status,conversation_id').eq('apartment_id', listingId).maybeSingle();
      if (inquiry.error) throw new Error('Own inquiry could not be read');
      if (inquiry.data?.status !== 'accepted') {
        const projection = await requester.rpc('get_public_listing', { p_listing_id: listingId });
        if (projection.error) throw new Error('Public listing projection unavailable');
        expect(projection.data).toHaveLength(1);
        for (const key of ['address', 'lat', 'lng']) expect(Object.keys(projection.data[0])).not.toContain(key);
        const before = await requester.from('listing_address_access').select('address').eq('apartment_id', listingId);
        expect(before.error).toBeNull(); expect(before.data).toEqual([]);
        if (!inquiry.data) {
          await peer.goto(`${prefix}/listings/${listingId}`);
          const request = peer.getByRole('button', { name: t('שליחת פנייה לבעל המודעה', 'Request a viewing'), exact: true });
          await peer.route('**/*', route => route.request().method() === 'POST' && route.request().headers()['next-action'] ? route.abort('failed') : route.continue());
          await request.click();
          await expect(peer.locator('p[role=alert]')).toContainText(t('לא הצלחנו לשלוח', 'Could not send'));
          await expect(request).toBeEnabled();
          await peer.unrouteAll({ behavior: 'wait' });
          await request.click();
          await expect(peer.getByRole('status')).toContainText(t('הפנייה נשלחה', 'Your inquiry was sent'));
        }
        await page.goto(`${prefix}/my-listings`);
        const card = page.locator(`[data-listing-id="${listingId}"]`);
        await expect(card.getByText(t('אישור הפנייה פותח צ׳אט', 'Accepting opens a chat'), { exact: false })).toBeVisible();
        const accept = card.getByRole('button', { name: t('אישור ופתיחת צ׳אט', 'Accept and open chat'), exact: true });
        await page.route('**/*', route => route.request().method() === 'POST' && route.request().headers()['next-action'] ? route.abort('failed') : route.continue());
        await accept.click();
        await expect(card.getByRole('alert')).toHaveText(t('לא הצלחנו לאשר את הפנייה. נסו שוב.', 'Could not accept the inquiry. Please retry.'));
        await expect(accept).toBeEnabled();
        expect((await requester.from('listing_address_access').select('address').eq('apartment_id', listingId)).data).toEqual([]);
        await page.unrouteAll({ behavior: 'wait' });
        await accept.click();
        await expect(page).toHaveURL(new RegExp(`${prefix}/chats/[0-9a-f-]+$`));
        record.conversationId = page.url().split('/').pop()!; persist();
      } else record.conversationId = inquiry.data.conversation_id;
      inquiry = await requester.from('listing_inquiries').select('id,status,conversation_id').eq('apartment_id', listingId).single();
      expect(inquiry.data?.status).toBe('accepted');
      const conversationId = inquiry.data!.conversation_id!;
      record.conversationId = conversationId; persist();
      await page.goto(`${prefix}/chats/${conversationId}`);
      await expect(page.getByText(exactAddress, { exact: false })).toBeVisible();
      await peer.goto(`${prefix}/listings/${listingId}`);
      if (owned.data.status === 'active') await peer.getByRole('link', { name: t('פתיחת השיחה', 'Open conversation'), exact: true }).click();
      else await peer.goto(`${prefix}/chats/${conversationId}`);
      await expect(peer).toHaveURL(`${prefix}/chats/${conversationId}`);
      await expect(peer.getByText(exactAddress, { exact: false })).toBeVisible();
      await peer.reload();
      await expect(peer.getByText(exactAddress, { exact: false })).toBeVisible();
      const denied = await outsider.from('listing_address_access').select('address').eq('apartment_id', listingId);
      expect(denied.error).toBeNull(); expect(denied.data).toEqual([]);
      if (process.env.UX_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.UX_SCREENSHOTS, `accepted-chat-${locale}.png`) });
      await page.goto(`${prefix}/my-listings`);
      const card = page.locator(`[data-listing-id="${listingId}"]`);
      if (owned.data.status === 'active') {
        await card.getByRole('button', { name: t('סימון כהושכרה', 'Mark rented'), exact: true }).click();
        await card.getByRole('button', { name: t('כן, הדירה הושכרה', 'Yes, mark rented'), exact: true }).click();
      }
      await expect(card.getByTestId('listing-status')).toHaveText(t('הושכרה', 'Rented'));
      expect((await owner.from('apartments').select('status').eq('id', listingId).single()).data?.status).toBe('taken');
      expect((await page.request.get(`${prefix}/listings/${listingId}`)).status()).toBe(404);
      await peer.goto(`${prefix}/chats/${conversationId}`);
      await expect(peer.getByText(exactAddress, { exact: false })).toBeVisible();
      record.verifiedAt = new Date().toISOString(); persist();
      if (process.env.UX_SCREENSHOTS) { await card.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(process.env.UX_SCREENSHOTS, `rented-${locale}.png`) }); }
    } finally {
      await owner.auth.signOut({ scope: 'local' }); await requester.auth.signOut({ scope: 'local' }); await outsider.auth.signOut({ scope: 'local' });
      await peerContext.close(); await outsiderContext.close();
    }
  });
}
