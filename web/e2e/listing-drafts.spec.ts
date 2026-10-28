import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validatePool, beginScenario, saveScenario, recordScenarioResource, cleanupScenario } from '../scripts/qa-pool.mjs';

// Execute through qa-fixtures.mjs run. An executor services nonce-bound baseline
// and exact cleanup checkpoints; administrative credentials never enter this test.
// Real Auth, Next actions and Storage are required. No fallbacks or skipped cases.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('two devices retain independent private photo drafts when one is published (HE/EN, phone/desktop)', async ({ browser, baseURL }) => {
  test.setTimeout(3_600_000);
  const folder = process.env.QA_FIXTURE_DIRECTORY;
  expect(folder).toBe('.qa/room44-pool');
  expect(process.env.QA_FIXTURE_MANIFEST).toBe('.qa/room44-pool/accounts.json');
  const pool = folder!;
  const load = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
  const run = await load(join(pool, 'run.json'));
  const accounts: { id: string; email: string; password: string }[] = await load(process.env.QA_FIXTURE_MANIFEST!);
  const values = new Map((await readFile('.env.local', 'utf8')).split(/\r?\n/).flatMap(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    return m ? [[m[1], m[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
  const target = values.get('NEXT_PUBLIC_SUPABASE_URL')!;
  expect(target).toBe('https://npbduvjnqnbydolmdpsc.supabase.co');
  validatePool(accounts, run, target);
  const key = values.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!;
  const checkpoint = async (phase: string, payload: object = {}) => {
    const operation = randomUUID();
    await writeFile(join(pool, 'draft233-request.json'), JSON.stringify({ operation, target, phase, ...payload }, null, 2), { mode: 0o600 });
    console.log(`Draft2.33 ${phase} checkpoint ready`);
    let receipt: { operation: string; target: string; ok: boolean; inventory: object; baseline_proof_ok?: boolean } | null = null;
    await expect.poll(async () => {
      try {
        const candidate = await load(join(pool, `draft233-${phase}.json`));
        if (candidate.operation === operation && candidate.target === target) receipt = candidate;
      } catch { /* Await the exact nonce, never accept a previous run's file. */ }
      return receipt !== null;
    }, { timeout: 1_200_000, intervals: [500, 1000] }).toBe(true);
    expect(receipt!.ok).toBe(true);
    return receipt!;
  };
  const baseline = await checkpoint('baseline', { actor_ids: run.ids });
  const journal = beginScenario(run, baseline.inventory);
  const directory = join(pool, 'draft233-' + journal.run_id);
  await mkdir(directory);
  const save = (value: object) => saveScenario(join(pool, 'scenario.json'), value);
  await save(journal);
  type Entry = { receipt: string; purpose: string; id?: string; owner?: string; key?: string; paths: string[]; publishedPaths: string[] };
  const ledger: { target: string; run_id: string; entries: Entry[]; results: object[] } = { target, run_id: journal.run_id, entries: [], results: [] };
  const persist = () => saveScenario(join(directory, 'ledger.json'), ledger);
  await persist();
  const api = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const other = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const row = async (id: string) => {
    const r = await api.from('listing_drafts').select('*').eq('id', id).single();
    expect(r.error).toBeNull();
    return r.data!;
  };
  const signIn = async (context: BrowserContext, role: string) => {
    const account = accounts.find(a => a.id === run.actors[role])!;
    const cookies: { name: string; value: string }[] = [];
    const auth = createServerClient(target, key, { auth: { autoRefreshToken: false }, cookies: {
      getAll: () => cookies,
      setAll: next => { cookies.splice(0, cookies.length, ...next); },
    } });
    const signed = await auth.auth.signInWithPassword({ email: account.email, password: account.password });
    expect(signed.error).toBeNull(); expect(signed.data.user?.id).toBe(account.id);
    await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL!, sameSite: 'Lax' as const })));
    return auth;
  };
  try {
    for (const [client, role] of [[api, 'owner'], [other, 'pending_requester']] as const) {
      const account = accounts.find(a => a.id === run.actors[role])!;
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      expect(login.error).toBeNull(); expect(login.data.user?.id).toBe(account.id);
    }
    // Fictional generated pixels, not a person's photograph. Both objects and
    // their bytes are journaled before mutation; a lost reply stays recoverable.
    const canvas = await browser.newPage();
    const jpeg = Buffer.from(await canvas.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 600;
      const x = c.getContext('2d')!; x.fillStyle = '#147d78'; x.fillRect(0, 0, 900, 600);
      x.fillStyle = '#f4d780'; x.fillRect(100, 100, 500, 350);
      return c.toDataURL('image/jpeg', 0.85).split(',')[1];
    }), 'base64');
    await canvas.close();
    const bytesHash = createHash('sha256').update(jpeg).digest('hex');
    const make = async (purpose: string) => {
      const entry: Entry = { receipt: randomUUID(), purpose, paths: [], publishedPaths: [] };
      ledger.entries.push(entry); await persist();
      const result = await api.rpc('create_listing_draft', { p_import_receipt_id: entry.receipt, p_source_listing_id: null, p_source_revision: null,
        p_fields: { title: `QA draft2.33 ${journal.run_id} ${purpose}`, bedrooms: '2', availableFrom: '2026-12-01', billsIncluded: false,
          description: 'Temporary fictional cross-device QA', roomPrices: ['2100', '2600'],
          address: { address: 'QA fixture, no real address', latitude: '31.25', longitude: '34.79', city: 'Synthetic QA city', manual: true, confirmed: true } } });
      expect(result.error).toBeNull();
      const d = result.data;
      entry.id = d.id; entry.owner = d.owner_id; entry.key = d.publication_request_id;
      entry.paths = [0, 1, 2].map(() => `${d.owner_id}/${d.id}/${randomUUID()}.jpg`);
      // Publication uses JPEG normalization and deterministic ordered paths.
      entry.publishedPaths = [1, 2, 3].map(i => `${d.publication_request_id}/${i}.jpg`);
      await persist();
      for (const objectPath of entry.paths) {
        const uploaded = await api.storage.from('listing-draft-media').upload(objectPath, jpeg, { contentType: 'image/jpeg', cacheControl: '0' });
        expect(uploaded.error).toBeNull();
      }
      const media = await api.rpc('set_listing_draft_photos', { p_draft_id: d.id, p_expected_revision: d.revision,
        p_photos: entry.paths.map(objectPath => ({ kind: 'draft', objectPath })) });
      expect(media.error).toBeNull();
      return row(d.id);
    };
    for (const locale of ['he', 'en']) for (const width of [390, 1280]) await test.step(`${locale} ${width}`, async () => {
      const en = locale === 'en', prefix = en ? '/en' : '';
      const a = await make(`${locale}-${width}-A`), b = await make(`${locale}-${width}-B`), beforeB = await row(b.id);
      const one = await browser.newContext({ viewport: { width, height: 1000 } });
      const two = await browser.newContext({ viewport: { width: width === 390 ? 1280 : 390, height: 1000 } });
      const outsider = await browser.newContext({ viewport: { width, height: 1000 } });
      const sessions = await Promise.all([signIn(one, 'owner'), signIn(two, 'owner'), signIn(outsider, 'pending_requester')]);
      const first = await one.newPage(), second = await two.newPage(), foreign = await outsider.newPage();
      try {
        const drafts = `${prefix}/my-listings?view=drafts`;
        await first.goto(drafts); await second.goto(drafts);
        for (const page of [first, second]) for (const d of [a, b]) await expect(page.locator(`[data-draft-id="${d.id}"]`)).toContainText(d.fields.title);
        await first.locator(`[data-draft-id="${a.id}"]`).getByRole('link').click();
        const titleName = en ? 'Listing title' : 'כותרת המודעה';
        await expect(first.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(a.fields.title);
        const changedTitle = a.fields.title + ' saved on device 1';
        await first.getByRole('textbox', { name: titleName, exact: true }).fill(changedTitle);
        await first.getByRole('button', { name: en ? 'Save draft and close' : 'שמירת טיוטה וסגירה', exact: true }).click();
        await expect.poll(async () => (await row(a.id)).fields.title).toBe(changedTitle);
        await second.reload();
        await second.locator(`[data-draft-id="${a.id}"]`).getByRole('link').click();
        await expect(second.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(changedTitle);
        // Real private bytes survive the second device and refresh, in order.
        const reloadedA = await row(a.id); expect(reloadedA.photos).toEqual(a.photos);
        for (const photo of reloadedA.photos) {
          const downloaded = await api.storage.from('listing-draft-media').download(photo.objectPath);
          expect(downloaded.error).toBeNull();
          expect(createHash('sha256').update(Buffer.from(await downloaded.data!.arrayBuffer())).digest('hex')).toBe(bytesHash);
          const denied = await other.storage.from('listing-draft-media').download(photo.objectPath); expect(denied.error).not.toBeNull();
        }
        await second.reload(); await expect(second.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(changedTitle);
        for (let i = 1; i <= 3; i++) {
          const image = second.getByRole('img', { name: (en ? 'Saved photo ' : 'תמונה שמורה ') + i, exact: true });
          // Next Image is lazy: phone images below the fold need a real scroll.
          await image.scrollIntoViewIfNeeded();
          await expect(image).toBeVisible();
          await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth), { timeout: 60_000 }).toBeGreaterThan(0);
        }
        await foreign.goto(drafts);
        for (const d of [a, b]) await expect(foreign.locator(`[data-draft-id="${d.id}"]`)).toHaveCount(0);
        const deniedRows = await other.from('listing_drafts').select('id').in('id', [a.id, b.id]);
        expect(deniedRows.error).toBeNull(); expect(deniedRows.data).toEqual([]);
        await foreign.goto(`${prefix}/compose?draft=${a.id}`);
        await expect(foreign.getByRole('textbox', { name: titleName, exact: true })).toHaveCount(0);
        expect(await foreign.locator('main').innerText()).not.toContain(changedTitle);
        await second.getByRole('button', { name: en ? 'Publish listing' : 'פרסום המודעה', exact: true }).click();
        await expect(second).toHaveURL(`${prefix}/compose/published/${a.publication_request_id}`, { timeout: 90_000 });
        await expect.poll(async () => (await row(a.id)).state).toBe('completed');
        await recordScenarioResource({ journal, run, kind: 'listing', id: a.publication_request_id, save });
        const published = await api.from('apartments').select('id,title,photos').eq('id', a.publication_request_id).single();
        expect(published.error).toBeNull(); expect(published.data!.title).toBe(changedTitle); expect(published.data!.photos).toHaveLength(3);
        expect(await row(b.id)).toEqual(beforeB);
        await first.goto(drafts); await second.goto(drafts);
        for (const page of [first, second]) {
          await expect(page.locator(`[data-draft-id="${a.id}"]`)).toHaveCount(0);
          await expect(page.locator(`[data-draft-id="${b.id}"]`)).toContainText(b.fields.title);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        await first.locator(`[data-draft-id="${b.id}"]`).getByRole('link').click();
        await expect(first.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(b.fields.title);
        expect(await row(b.id)).toEqual(beforeB);
        await first.screenshot({ path: join(directory, `${locale}-${width}-remaining.png`), fullPage: true });
        ledger.results.push({ locale, width, two_independent_devices: true, ordinary_explicit_save_and_resume: true,
          two_photo_drafts: true, private_bytes_verified: true, other_account_denied: true, publish_one_keep_other: true });
        await persist();
      } finally {
        await Promise.all([one.close(), two.close(), outsider.close()]);
        await Promise.all(sessions.map(auth => auth.auth.signOut({ scope: 'local' })));
      }
    });
    await saveScenario(join(directory, 'acceptance.json'), { target, run_id: journal.run_id, results: ledger.results, no_storage_mocks: true, cleanup: 'pending' });
  } finally {
    try {
      // Executor validates all FK/private dependencies and resets only these
      // temporary drafts to empty/open with fresh cleanup keys before deleting
      // journaled listing roots. This permits ordinary owner Storage removal.
      // The final proof checkpoint removes the exact draft/receipt rows only
      // after Storage absence and compares the complete private-table baseline.
      await cleanupScenario({ journal, run, save, removeMedia: undefined, executeSql: async (sql: string) => {
        const sqlPath = join(directory, 'cleanup-base.sql'); await writeFile(sqlPath, sql, { mode: 0o600 });
        await checkpoint('cleanup', { run_id: journal.run_id, artifact_dir: directory, sql_path: sqlPath });
        for (const entry of ledger.entries) for (const [bucket, paths] of [['listing-draft-media', entry.paths], ['apartment-photos', entry.publishedPaths]] as const) {
          if (!paths.length) continue;
          const removed = await api.storage.from(bucket).remove(paths); expect(removed.error).toBeNull();
          for (const objectPath of paths) {
            const result = await api.storage.from(bucket).download(objectPath); expect(result.error).not.toBeNull();
          }
        }
        const proof = await checkpoint('proof', { run_id: journal.run_id, artifact_dir: directory });
        expect(proof.baseline_proof_ok).toBe(true);
      } });
      await saveScenario(join(directory, 'final.json'), { target, run_id: journal.run_id, cases: ledger.results.length, cleanup: 'verified', storage_absent: true });
    } catch (error) {
      journal.state = 'failed'; await save(journal); throw error;
    } finally {
      await api.auth.signOut({ scope: 'local' }); await other.auth.signOut({ scope: 'local' });
    }
  }
});
