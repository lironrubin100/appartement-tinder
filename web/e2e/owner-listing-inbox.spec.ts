import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validatePool, validateScenario, saveScenario, recordScenarioResource } from '../scripts/qa-pool.mjs';
// Ordinary users and actual Next actions. The exact-fixture driver holds all
// three actor leases and performs separately verified DB/private-view cleanup.
// Includes the previously accepted6.3 send/reload/guest-return journey.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('owner inbox and individual inquiry: guest return, intro, filters, seen, accept/decline and exact chat (HE/EN)', async ({ browser, baseURL }) => {
    test.setTimeout(1200000);
    expect(process.env.QA_FIXTURE_DIRECTORY).toBe('.qa/room44-pool');
    expect(process.env.QA_FIXTURE_MANIFEST).toBe('.qa/room44-pool/accounts.json');
    const pool = process.env.QA_FIXTURE_DIRECTORY!, load = async (p: string) => JSON.parse(await readFile(p, 'utf8')), run = await load(join(pool, 'run.json')), accounts: {
        id: string;
        email: string;
        password: string;
    }[] = await load(process.env.QA_FIXTURE_MANIFEST!);
    const current = await load(join(pool, 'inbox629-current.json')), dir: string = current.artifact_dir, ledger = await load(join(dir, 'ledger.json')), journal = await load(join(pool, 'scenario.json')), target = 'https://npbduvjnqnbydolmdpsc.supabase.co';
    expect(join(dir)).toBe(join(pool, 'inbox629-' + journal.run_id));
    validatePool(accounts, run, target);
    validateScenario(journal, run);
    expect(journal.state).toBe('active');
    expect(current.run_id).toBe(journal.run_id);
    expect(ledger.run_id).toBe(journal.run_id);
    expect(ledger.target).toBe(target);
    const env = new Map((await readFile('.env.local', 'utf8')).split(/\r?\n/).flatMap(l => { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); return m ? [[m[1], m[2].replace(/^(['"])(.*)\1$/, '$2')]] : []; }));
    expect(env.get('NEXT_PUBLIC_SUPABASE_URL')).toBe(target);
    const key = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!;
    const owner = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } }), requester = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } }), pending = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const account = (role: string) => accounts.find(a => a.id === run.actors[role])!, persist = () => saveScenario(join(dir, 'ledger.json'), ledger), save = (j: object) => saveScenario(join(pool, 'scenario.json'), j), owned = [ledger.roots.A, ledger.roots.B];
    const readInbox = async (client = owner) => { const r = await client.rpc('list_owner_listing_inquiries'); expect(r.error).toBeNull(); return r.data; };
    const sync = async () => {
        const r = await owner.from('listing_inquiries').select('id,apartment_id,requester_id,status,conversation_id,intro').in('apartment_id', owned);
        expect(r.error).toBeNull();
        ledger.inquiries = r.data;
        for (const i of r.data!) {
            if (!journal.resources.some((x: {
                kind: string;
                id: string;
            }) => x.kind === 'inquiry' && x.id === i.id))
                await recordScenarioResource({ journal, run, kind: 'inquiry', id: i.id, save });
            if (i.conversation_id && !ledger.conversations.includes(i.conversation_id)) {
                ledger.conversations.push(i.conversation_id);
                await recordScenarioResource({ journal, run, kind: 'conversation', id: i.conversation_id, save });
            }
        }
        const page = await readInbox();
        ledger.seen = page.items.filter((i: {
            is_new: boolean;
            viewed_at: string;
        }) => !i.is_new && i.viewed_at).map((i: {
            id: string;
        }) => i.id);
        await persist();
    };
    const inquiry = async (id: string) => { const r = await owner.from('listing_inquiries').select('id,status,conversation_id,intro,apartment_id').eq('id', id).single(); expect(r.error).toBeNull(); return r.data!; };
    const signIn = async (context: BrowserContext, role: string) => { const a = account(role), cookies: {
        name: string;
        value: string;
    }[] = []; const auth = createServerClient(target, key, { auth: { autoRefreshToken: false }, cookies: { getAll: () => cookies, setAll: xs => { cookies.splice(0, cookies.length, ...xs); } } }); expect((await auth.auth.signInWithPassword({ email: a.email, password: a.password })).data.user?.id).toBe(a.id); await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL!, sameSite: 'Lax' as const }))); return auth; };
    try {
        for (const [c, role] of [[owner, 'owner'], [requester, 'accepted_requester'], [pending, 'pending_requester']] as const) {
            const a = account(role);
            expect((await c.auth.signInWithPassword({ email: a.email, password: a.password })).data.user?.id).toBe(a.id);
        }
        expect((await requester.rpc('get_owned_listing_editor', { p_listing_id: ledger.roots.foreign })).data).not.toBeNull();
        for (const id of owned)
            expect((await owner.rpc('create_listing_inquiry', { p_apartment_id: id, p_intro: null })).error).not.toBeNull();
        await sync();
        expect(ledger.inquiries).toHaveLength(0);
        for (const [kind, locale, width] of [['A', 'he', 390], ['B', 'en', 1280]] as const)
            await test.step(`${locale} ${width}: send and owner actions`, async () => {
                const listing: string = ledger.roots[kind], en = locale === 'en', prefix = en ? '/en' : '', path = prefix + '/listings/' + listing, intro = en ? '' : `QA פתיחה ${journal.run_id}`, waiting = en ? 'Your inquiry was sent. Waiting for the owner to accept.' : 'הפנייה נשלחה. ממתינים לאישור בעל המודעה.';
                const declined = await pending.rpc('create_listing_inquiry', { p_apartment_id: listing, p_intro: null });
                expect(declined.error).toBeNull();
                await sync();
                const context = await browser.newContext({ viewport: { width, height: 1000 } }), ownContext = await browser.newContext({ viewport: { width, height: 1000 } }), auth = await signIn(context, 'accepted_requester'), ownerAuth = await signIn(ownContext, 'owner'), page = await context.newPage(), management = await ownContext.newPage();
                try {
                    await page.goto(path);
                    await page.getByRole('textbox', { name: en ? 'Opening message (optional)' : 'הודעת פתיחה (לא חובה)', exact: true }).fill(intro);
                    await page.getByRole('button', { name: en ? 'Request a viewing' : 'שליחת פנייה לבעל המודעה', exact: true }).click();
                    await expect.poll(async () => { await sync(); return ledger.inquiries.filter((i: {
                        apartment_id: string;
                        requester_id: string;
                    }) => i.apartment_id === listing && i.requester_id === run.actors.accepted_requester).length; }).toBe(1);
                    const sent = ledger.inquiries.find((i: {
                        apartment_id: string;
                        requester_id: string;
                    }) => i.apartment_id === listing && i.requester_id === run.actors.accepted_requester);
                    expect(sent).toMatchObject({ status: 'pending', conversation_id: null, intro: intro || null });
                    await expect(page.getByRole('status')).toHaveText(waiting);
                    await page.reload();
                    await expect(page.getByRole('status')).toHaveText(waiting);
                    await context.clearCookies();
                    await page.goto(path);
                    await page.getByRole('link', { name: en ? 'Sign in to request a viewing' : 'התחברות ושליחת פנייה', exact: true }).click();
                    await expect(page).toHaveURL(url => url.pathname === prefix + '/login' && url.searchParams.get('returnTo') === path);
                    const a = account('accepted_requester');
                    await page.getByLabel(en ? 'Email' : 'כתובת מייל', { exact: true }).fill(a.email);
                    try {
                        await page.getByLabel(en ? 'Password' : 'סיסמה', { exact: true }).fill(a.password);
                    }
                    catch {
                        throw Error('QA password entry failed; private credential retained.');
                    }
                    await page.getByRole('button', { name: en ? 'Sign in with email' : 'התחברות עם מייל', exact: true }).click();
                    await expect(page).toHaveURL(baseURL + path);
                    await expect(page.getByRole('status')).toHaveText(waiting);
                    await page.reload();
                    await expect(page.getByRole('status')).toHaveText(waiting);
                    expect((await inquiry(sent.id)).intro).toBe(intro || null);
                    const noAddress = await requester.from('listing_address_access').select('apartment_id').eq('apartment_id', listing);
                    expect(noAddress.error).toBeNull();
                    expect(noAddress.data).toEqual([]);
                    await expect(page.getByRole('link', { name: en ? 'Open conversation' : 'פתיחת השיחה', exact: true })).toHaveCount(0);
                    const dashboard = prefix + '/my-listings?view=inquiries', cards = management.locator('article[data-inquiry-id]');
                    await management.goto(dashboard + '&listing=' + listing);
                    await expect(cards).toHaveCount(2);
                    expect(new Set(await cards.evaluateAll(xs => xs.map(x => (x as HTMLElement).dataset.inquiryId)))).toEqual(new Set(ledger.inquiries.filter((i: {
                        apartment_id: string;
                    }) => i.apartment_id === listing).map((i: {
                        id: string;
                    }) => i.id)));
                    await management.getByRole('combobox', { name: en ? 'Apartment' : 'דירה', exact: true }).selectOption('');
                    await expect(cards).toHaveCount(kind === 'A' ? 2 : 4);
                    await management.getByRole('combobox', { name: en ? 'Apartment' : 'דירה', exact: true }).selectOption(listing);
                    await expect(cards).toHaveCount(2);
                    const card = management.locator(`[data-inquiry-id="${sent.id}"]`);
                    await expect(card.getByText(en ? 'New' : 'חדש', { exact: true })).toBeVisible();
                    await card.getByRole('button', { name: en ? 'View inquiry details' : 'פתיחת פרטי הפנייה', exact: true }).click();
                    await expect(card.getByText(en ? 'New' : 'חדש', { exact: true })).toHaveCount(0);
                    await sync();
                    await expect(card.getByText(intro || (en ? 'No opening message was sent.' : 'לא נשלחה הודעת פתיחה.'), { exact: true })).toBeVisible();
                    expect((await inquiry(sent.id)).status).toBe('pending');
                    expect((await inquiry(sent.id)).conversation_id).toBeNull();
                    expect(await card.innerText()).not.toContain(a.email);
                    expect(await card.innerText()).not.toContain('QA fixture, no real address');
                    await card.getByRole('button', { name: en ? 'Accept and open chat' : 'אישור ופתיחת צ׳אט', exact: true }).click();
                    await expect(management).toHaveURL(/\/chats\/[0-9a-f-]+$/);
                    await sync();
                    const accepted = await inquiry(sent.id);
                    expect(accepted.status).toBe('accepted');
                    expect(new URL(management.url()).pathname).toBe(prefix + '/chats/' + accepted.conversation_id);
                    await expect(management.getByTestId('exact-address-card')).toContainText('QA fixture, no real address');
                    const members = await owner.from('conversation_members').select('user_id').eq('conversation_id', accepted.conversation_id);
                    expect(members.error).toBeNull();
                    expect(new Set(members.data!.map(x => x.user_id))).toEqual(new Set([run.actors.owner, run.actors.accepted_requester]));
                    const forbiddenChat = await pending.from('conversation_members').select('user_id').eq('conversation_id', accepted.conversation_id);
                    expect(forbiddenChat.error).toBeNull();
                    expect(forbiddenChat.data).toEqual([]);
                    const inventory = await owner.from('apartment_rooms').select('is_available').eq('apartment_id', listing);
                    expect(inventory.error).toBeNull();
                    expect(inventory.data).toEqual([{ is_available: true }]);
                    await management.goto(dashboard + '&listing=' + listing);
                    const decline = management.locator(`[data-inquiry-id="${declined.data}"]`);
                    await decline.getByRole('button', { name: en ? 'View inquiry details' : 'פתיחת פרטי הפנייה', exact: true }).click();
                    await decline.getByRole('button', { name: en ? 'Decline inquiry' : 'דחיית הפנייה', exact: true }).click();
                    await expect(decline.getByText(en ? 'Declined' : 'נדחתה', { exact: true })).toBeVisible();
                    await sync();
                    expect(await inquiry(declined.data)).toMatchObject({ status: 'declined', conversation_id: null });
                    const viewed = (await readInbox()).items.find((i: {
                        id: string;
                    }) => i.id === sent.id).viewed_at;
                    const markers = await owner.from('conversation_members').select('user_id,last_read_at,last_read_seq').eq('conversation_id', accepted.conversation_id).order('user_id');
                    expect(markers.error).toBeNull();
                    const again = management.locator(`[data-inquiry-id="${sent.id}"]`);
                    await again.getByRole('button', { name: en ? 'View inquiry details' : 'פתיחת פרטי הפנייה', exact: true }).click();
                    await expect(again.getByText(en ? 'New' : 'חדש', { exact: true })).toHaveCount(0);
                    await sync();
                    expect((await readInbox()).items.find((i: {
                        id: string;
                    }) => i.id === sent.id).viewed_at).toBe(viewed);
                    const afterMarkers = await owner.from('conversation_members').select('user_id,last_read_at,last_read_seq').eq('conversation_id', accepted.conversation_id).order('user_id');
                    expect(afterMarkers.error).toBeNull();
                    expect(afterMarkers.data).toEqual(markers.data);
                    expect(await management.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                    await management.screenshot({ path: join(dir, `${locale}-${width}-owner-inbox.png`), fullPage: true });
                    await page.goto(dashboard);
                    await expect(page.locator('article[data-inquiry-id]')).toHaveCount(0);
                    expect((await readInbox(requester)).items).toEqual([]);
                    await page.goto(dashboard + '&listing=' + listing);
                    await expect(page.getByRole('alert').filter({ hasText: en ? 'unavailable for this account' : 'אינה זמינה לניהול' })).toBeVisible();
                    await expect(page.locator('article[data-inquiry-id]')).toHaveCount(0);
                    ledger.results.push({ locale, width, guest_return_same_inquiry: true, intro: intro ? 'present' : 'legacy_absent', listing_filter: true, seen_not_accept: true, seen_independent_of_chat_read: true, accept_exact_chat: true, decline_without_chat: true, no_self_inquiry: true, foreign_owner_denied: true, room_still_available: true });
                    await persist();
                }
                finally {
                    await sync();
                    await context.close();
                    await ownContext.close();
                    await auth.auth.signOut({ scope: 'local' });
                    await ownerAuth.auth.signOut({ scope: 'local' });
                }
            });
        for (const [locale, width] of [['he', 1280], ['en', 390]] as const) {
            const en = locale === 'en', prefix = en ? '/en' : '', context = await browser.newContext({ viewport: { width, height: 1000 } }), auth = await signIn(context, 'owner');
            try {
                const page = await context.newPage();
                await page.goto(prefix + '/my-listings?view=inquiries');
                const cards = page.locator('article[data-inquiry-id]');
                await expect(cards).toHaveCount(4);
                await page.getByRole('combobox', { name: en ? 'Inquiry status' : 'מצב הפנייה', exact: true }).selectOption('accepted');
                await expect(cards).toHaveCount(2);
                await page.getByRole('combobox', { name: en ? 'Inquiry status' : 'מצב הפנייה', exact: true }).selectOption('declined');
                await expect(cards).toHaveCount(2);
                await page.getByRole('combobox', { name: en ? 'Inquiry status' : 'מצב הפנייה', exact: true }).selectOption('pending');
                await expect(cards).toHaveCount(0);
                await page.getByRole('combobox', { name: en ? 'Inquiry status' : 'מצב הפנייה', exact: true }).selectOption('');
                await expect(cards).toHaveCount(4);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await page.screenshot({ path: join(dir, `${locale}-${width}-owner-filters.png`), fullPage: true });
                ledger.results.push({ locale, width, accepted_declined_empty_filters: true });
                await persist();
            }
            finally {
                await context.close();
                await auth.auth.signOut({ scope: 'local' });
            }
        }
        await sync();
        await saveScenario(join(dir, 'browser-acceptance.json'), { target, run_id: journal.run_id, results: ledger.results, real_next_ordinary_users: true });
    }
    finally {
        await owner.auth.signOut({ scope: 'local' });
        await requester.auth.signOut({ scope: 'local' });
        await pending.auth.signOut({ scope: 'local' });
    }
});
