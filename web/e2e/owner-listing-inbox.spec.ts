import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Database } from '../src/types/database';
import { validatePool, beginScenario, recordScenarioResource, saveScenario, cleanupScenario } from '../scripts/qa-pool.mjs';

// Use qa-fixtures.mjs run: the wrapper owns the same three actor leases.
// Connector checkpoints require independently reviewed exact-target receipts.
// No privileged key, auth trace, replacement account or retained demo is used.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
// The generated snapshot predates the approved 6.1 introduction column, as
// documented by the existing server adapter. Keep this test's read contract local.
type InquiryDatabase = Omit<Database, 'public'> & { public: Omit<Database['public'], 'Tables'> & {
  Tables: Omit<Database['public']['Tables'], 'listing_inquiries'> & { listing_inquiries:
    Omit<Database['public']['Tables']['listing_inquiries'], 'Row'> & {
      Row: Database['public']['Tables']['listing_inquiries']['Row'] & { intro: string | null };
    };
  };
} };
test('individual inquiry survives reload and guest sign-in return to the same listing', async ({ browser, baseURL }) => {
  test.setTimeout(1_200_000);
  expect(process.env.QA_FIXTURE_DIRECTORY).toBe('.qa/room44-pool');
  expect(process.env.QA_FIXTURE_MANIFEST).toBe('.qa/room44-pool/accounts.json');
  const pool = process.env.QA_FIXTURE_DIRECTORY!;
  const load = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
  const run = await load(`${pool}/run.json`);
  const accounts: { id: string; email: string; password: string }[] = await load(process.env.QA_FIXTURE_MANIFEST!);
  const env = new Map((await readFile('.env.local', 'utf8')).split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
  const target = env.get('NEXT_PUBLIC_SUPABASE_URL')!;
  expect(target).toBe('https://npbduvjnqnbydolmdpsc.supabase.co');
  validatePool(accounts, run, target);
  expect(baseURL).toBeTruthy();
  const key = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!;
  const accountFor = (role: string) => accounts.find(account => account.id === run.actors[role])!;
  const api = () => createClient<InquiryDatabase>(target, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const owner = api(), requester = api();
  const checkpoint = async (phase: string, payload: object = {}) => {
    const operation = randomUUID();
    await writeFile(`${pool}/inquiry63-request.json`, JSON.stringify({ operation, phase, target, ...payload }, null, 2), { mode: 0o600 });
    console.log(`Inquiry6.3 ${phase}: awaiting exact connector receipt`);
    const path = `${pool}/inquiry63-${phase}.json`;
    await expect.poll(async () => {
      try { const receipt = await load(path); return receipt.operation === operation && receipt.target === target; }
      catch { return false; }
    }, { timeout: 600_000, intervals: [500, 1000] }).toBe(true);
    const receipt = await load(path);
    expect(receipt.ok).toBe(true);
    return receipt;
  };
  const q = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const baseline = await checkpoint('baseline');
  const journal = beginScenario(run, baseline.inventory);
  const dir = `${pool}/inquiry63-${journal.run_id}`;
  await mkdir(dir);
  const save = (value: object) => saveScenario(`${pool}/scenario.json`, value);
  await save(journal);
  const listingId = randomUUID(), roomId = randomUUID();
  const title = `QA inquiry6.3 ${journal.run_id}`;
  const results: object[] = [];
  try {
    expect((await owner.auth.signInWithPassword(accountFor('owner'))).data.user?.id).toBe(run.actors.owner);
    // Only a temporary no-media listing and room using the approved seed's
    // existing location. The connector must verify this SQL before executing it.
    const sql = `begin;set local lock_timeout='3s';set local statement_timeout='15s';
do $setup$ begin
if (select count(*) from auth.users where id=any(array[${run.ids.map(q).join(',')}]::uuid[]) and email=${q(run.prefix)}||'-'||id::text||'@example.invalid')<>3 then raise exception 'QA identity drift';end if;
insert into public.apartments(id,lister_id,source,title,address,lat,lng,public_lat,public_lng,public_location_label,price,bedrooms,available_from,description,photos,status)
select ${q(listingId)}::uuid,${q(run.actors.owner)}::uuid,'user',${q(title)},'QA fixture, no real address',lat,lng,public_lat,public_lng,public_location_label,1800,1,'2026-12-01','Temporary inquiry persistence acceptance','{}'::text[],'active' from public.apartments where id='10000000-0000-4000-8000-000000000001';
if not found then raise exception 'Approved fixture source absent';end if;
insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available) values(${q(roomId)},${q(listingId)},'QA room',1800,'2026-12-01',true);
end $setup$;commit;`;
    await writeFile(`${dir}/setup.sql`, sql, { mode: 0o600 });
    const setup = await checkpoint('setup', { run_id: journal.run_id, listing_id: listingId, room_id: roomId, sql_path: `${dir}/setup.sql` });
    expect(setup.run_id).toBe(journal.run_id);
    await recordScenarioResource({ journal, run, kind: 'listing', id: listingId, save });
    for (const [role, locale, width] of [['accepted_requester', 'he', 390], ['pending_requester', 'en', 1280]] as const) {
      const account = accountFor(role), en = locale === 'en';
      expect((await requester.auth.signInWithPassword(account)).data.user?.id).toBe(account.id);
      const cookies: { name: string; value: string }[] = [];
      const auth = createServerClient(target, key, { auth: { autoRefreshToken: false }, cookies: {
        getAll: () => cookies, setAll: values => { cookies.splice(0, cookies.length, ...values); },
      } });
      expect((await auth.auth.signInWithPassword(account)).data.user?.id).toBe(account.id);
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const path = `${en ? '/en' : ''}/listings/${listingId}`;
      const waiting = en ? 'Your inquiry was sent. Waiting for the owner to accept.' : 'הפנייה נשלחה. ממתינים לאישור בעל המודעה.';
      const intro = en ? '' : `QA פתיחה ${journal.run_id}`;
      try {
        await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL!, sameSite: 'Lax' as const })));
        const page = await context.newPage();
        await page.goto(`${baseURL}${path}`);
        await page.getByRole('textbox', { name: en ? 'Opening message (optional)' : 'הודעת פתיחה (לא חובה)', exact: true }).fill(intro);
        await page.getByRole('button', { name: en ? 'Request a viewing' : 'שליחת פנייה לבעל המודעה', exact: true }).click();
        // Reconcile the create immediately, before visual assertions can fail.
        const rows = async () => owner.from('listing_inquiries').select('id,status,conversation_id,intro').eq('apartment_id', listingId).eq('requester_id', account.id);
        await expect.poll(async () => (await rows()).data?.length).toBe(1);
        const sent = await rows(); expect(sent.error).toBeNull();
        const inquiry = sent.data![0];
        await recordScenarioResource({ journal, run, kind: 'inquiry', id: inquiry.id, save });
        expect(inquiry).toMatchObject({ status: 'pending', conversation_id: null, intro: intro || null });
        await expect(page.getByRole('status')).toHaveText(waiting);
        await page.reload(); await expect(page.getByRole('status')).toHaveText(waiting);
        await expect(page.getByRole('textbox', { name: en ? 'Opening message (optional)' : 'הודעת פתיחה (לא חובה)' })).toHaveCount(0);
        await context.clearCookies();
        await page.goto(`${baseURL}${path}`);
        await page.getByRole('link', { name: en ? 'Sign in to request a viewing' : 'התחברות ושליחת פנייה', exact: true }).click();
        await expect(page).toHaveURL(url => url.pathname === `${en ? '/en' : ''}/login` && url.searchParams.get('returnTo') === path);
        await page.getByLabel(en ? 'Email' : 'כתובת מייל', { exact: true }).fill(account.email);
        try {
          await page.getByLabel(en ? 'Password' : 'סיסמה', { exact: true }).fill(account.password);
        } catch {
          // Playwright's raw fill error can include its argument. Do not let a
          // failed credential-entry locator expose the reusable pool password.
          throw new Error('QA password entry failed; private credentials retained.');
        }
        await page.getByRole('button', { name: en ? 'Sign in with email' : 'התחברות עם מייל', exact: true }).click();
        await expect(page).toHaveURL(`${baseURL}${path}`);
        await expect(page.getByRole('status')).toHaveText(waiting);
        await page.reload(); await expect(page.getByRole('status')).toHaveText(waiting);
        const after = await rows(); expect(after.error).toBeNull(); expect(after.data).toEqual(sent.data);
        const address = await requester.from('listing_address_access').select('apartment_id').eq('apartment_id', listingId);
        expect(address.error).toBeNull(); expect(address.data).toEqual([]);
        await expect(page.getByRole('link', { name: en ? 'Open conversation' : 'פתיחת השיחה', exact: true })).toHaveCount(0);
        await page.screenshot({ path: `${dir}/${locale}-${width}-returned-pending.png`, fullPage: true });
        results.push({ locale, width, send: true, reload: true, guest_login_same_listing: true, same_inquiry_id: inquiry.id, no_address_or_chat: true });
        await saveScenario(`${dir}/acceptance.json`, { target, run_id: journal.run_id, results, cleanup: 'pending' });
      } finally { await context.close(); await auth.auth.signOut({ scope: 'local' }); }
    }
  } finally {
    try {
      await cleanupScenario({ journal, run, save, removeMedia: undefined, executeSql: async (sql: string) => {
        await writeFile(`${dir}/cleanup.sql`, sql, { mode: 0o600 });
        const receipt = await checkpoint('cleanup', { run_id: journal.run_id, resources: journal.resources, sql_path: `${dir}/cleanup.sql`, listing_id: listingId, room_id: roomId });
        expect(receipt.run_id).toBe(journal.run_id); expect(receipt.baseline_proof_ok).toBe(true);
      } });
      expect(journal.state).toBe('clean');
      await saveScenario(`${dir}/acceptance.json`, { target, run_id: journal.run_id, results, cleanup: 'verified' });
    } finally { await owner.auth.signOut({ scope: 'local' }); await requester.auth.signOut({ scope: 'local' }); }
  }
  expect(results).toHaveLength(2);
});
