import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validatePool, validateScenario, saveScenario } from '../scripts/qa-pool.mjs';
// Run inside the exact-fixture driver's actor lease. Real Auth/Next/Storage;
// only ordinary credentials enter Playwright. The driver owns guarded cleanup.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('two owners and two tabs: private edit, rooms, intake, reopen and existing chat (HE/EN phone/desktop)', async ({ browser, baseURL }) => {
    test.setTimeout(900000);
    expect(process.env.QA_FIXTURE_DIRECTORY).toBe('.qa/room44-pool');
    expect(process.env.QA_FIXTURE_MANIFEST).toBe('.qa/room44-pool/accounts.json');
    const pool = process.env.QA_FIXTURE_DIRECTORY!, load = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
    const run = await load(join(pool, 'run.json')), accounts: {
        id: string;
        email: string;
        password: string;
    }[] = await load(process.env.QA_FIXTURE_MANIFEST!);
    const current = await load(join(pool, 'edit48-current.json')), directory: string = current.artifact_dir;
    expect(join(directory)).toBe(join(pool, 'edit48-' + current.run_id));
    const ledger = await load(join(directory, 'ledger.json')), journal = await load(join(pool, 'scenario.json'));
    const target = 'https://npbduvjnqnbydolmdpsc.supabase.co';
    validatePool(accounts, run, target);
    validateScenario(journal, run);
    expect(journal.state).toBe('active');
    expect(current.run_id).toBe(journal.run_id);
    expect(ledger.run_id).toBe(journal.run_id);
    expect(ledger.target).toBe(target);
    const env = new Map((await readFile('.env.local', 'utf8')).split(/\r?\n/).flatMap(line => { const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); return m ? [[m[1], m[2].replace(/^(['"])(.*)\1$/, '$2')]] : []; }));
    expect(env.get('NEXT_PUBLIC_SUPABASE_URL')).toBe(target);
    const key = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!;
    const api = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } }), other = createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const persist = () => saveScenario(join(directory, 'ledger.json'), ledger), main: string = ledger.roots.main, companion: string = ledger.roots.other, roomId: string = ledger.rooms.main[0];
    const row = async () => { const r = await api.from('apartments').select('*').eq('id', main).single(); expect(r.error).toBeNull(); return r.data!; };
    const rooms = async () => { const r = await api.from('apartment_rooms').select('id,apartment_id,label,monthly_price,available_from,is_available').eq('apartment_id', main).order('id'); expect(r.error).toBeNull(); return r.data!; };
    const draft = async (id: string) => { const r = await api.from('listing_drafts').select('*').eq('id', id).single(); expect(r.error).toBeNull(); return r.data!; };
    const chat = async () => { const m = await api.from('conversation_members').select('user_id').eq('conversation_id', ledger.conversation).order('user_id'), r = await api.from('messages').select('id,body,message_seq').eq('conversation_id', ledger.conversation).order('message_seq'); expect(m.error).toBeNull(); expect(r.error).toBeNull(); return { members: m.data, messages: r.data }; };
    const sync = async () => { const r = await api.from('listing_drafts').select('id,owner_id,source_listing_id,publication_request_id,import_receipt_id,state,revision').eq('source_listing_id', main); expect(r.error).toBeNull(); for (const d of r.data!) {
        expect(d.owner_id).toBe(run.actors.owner);
        const e = ledger.drafts.find((e: {
            id: string;
        }) => e.id === d.id);
        if (e)
            Object.assign(e, d);
        else
            ledger.drafts.push(d);
    } await persist(); };
    const signIn = async (context: BrowserContext, role: string) => {
        const a = accounts.find(a => a.id === run.actors[role])!, cookies: {
            name: string;
            value: string;
        }[] = [];
        const auth = createServerClient(target, key, { auth: { autoRefreshToken: false }, cookies: { getAll: () => cookies, setAll: xs => { cookies.splice(0, cookies.length, ...xs); } } });
        const r = await auth.auth.signInWithPassword({ email: a.email, password: a.password });
        expect(r.error).toBeNull();
        expect(r.data.user?.id).toBe(a.id);
        await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL!, sameSite: 'Lax' as const })));
        return auth;
    };
    try {
        for (const [client, role] of [[api, 'owner'], [other, 'accepted_requester']] as const) {
            const a = accounts.find(a => a.id === run.actors[role])!;
            expect((await client.auth.signInWithPassword({ email: a.email, password: a.password })).error).toBeNull();
        }
        const originalChat = await chat();
        expect(originalChat.members).toHaveLength(2);
        const companionBefore = await other.from('apartments').select('*').eq('id', companion).single();
        expect(companionBefore.error).toBeNull();
        for (const locale of ['he', 'en'])
            for (const width of [390, 1280])
                await test.step(`${locale} ${width}`, async () => {
                    const en = locale === 'en', prefix = en ? '/en' : '', context = await browser.newContext({ viewport: { width, height: 1000 } }), foreignContext = await browser.newContext({ viewport: { width, height: 1000 } });
                    const ownerAuth = await signIn(context, 'owner'), foreignAuth = await signIn(foreignContext, 'accepted_requester'), first = await context.newPage(), second = await context.newPage(), foreign = await foreignContext.newPage();
                    const dashboard = prefix + '/my-listings', card = second.locator(`[data-listing-id="${main}"]`);
                    try {
                        const before = await row(), beforeRooms = await rooms();
                        await first.goto(dashboard);
                        await first.locator(`[data-listing-id="${main}"]`).getByRole('link', { name: en ? 'Manage listing' : 'ניהול המודעה', exact: true }).click();
                        await expect(first).toHaveURL(/\/compose\?draft=[0-9a-f-]+$/, { timeout: 60000 });
                        const id = new URL(first.url()).searchParams.get('draft')!;
                        await sync();
                        expect((await draft(id)).source_listing_id).toBe(main);
                        const titleName = en ? 'Listing title' : 'כותרת המודעה';
                        await expect(first.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(before.title);
                        await second.goto(prefix + '/compose?draft=' + id);
                        await expect(second.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(before.title);
                        await foreign.goto(dashboard);
                        await expect(foreign.locator(`[data-listing-id="${companion}"]`)).toBeVisible();
                        await expect(foreign.locator(`[data-listing-id="${main}"]`)).toHaveCount(0);
                        await foreign.goto(prefix + '/compose?listing=' + main);
                        await expect(foreign.getByText(en ? 'This edit is unavailable. Any saved draft is kept unchanged.' : 'העריכה אינה זמינה. טיוטה שנשמרה נשארת ללא שינוי.', { exact: true })).toBeVisible();
                        await expect(foreign.getByRole('textbox', { name: titleName, exact: true })).toHaveCount(0);
                        const denied = await other.from('listing_drafts').select('id').eq('id', id);
                        expect(denied.error).toBeNull();
                        expect(denied.data).toEqual([]);
                        const nextTitle = `QA edit4.8 ${journal.run_id} ${locale} ${width}`, price = 2200 + (en ? 100 : 0) + (width === 390 ? 10 : 20);
                        await first.getByRole('textbox', { name: titleName, exact: true }).fill(nextTitle);
                        await first.locator(`[data-testid="edit-room"][data-room-id="${roomId}"]`).getByRole('textbox', { name: en ? /^Monthly room price/ : /^מחיר חודשי לחדר/ }).fill(String(price));
                        await first.getByRole('button', { name: en ? 'Save draft and close' : 'שמירת טיוטה וסגירה', exact: true }).click();
                        await expect(first).toHaveURL(dashboard);
                        expect(await row()).toEqual(before);
                        expect(await rooms()).toEqual(beforeRooms);
                        expect((await draft(id)).fields.title).toBe(nextTitle);
                        const staleTitle = nextTitle + ' stale tab';
                        await second.getByRole('textbox', { name: titleName, exact: true }).fill(staleTitle);
                        await expect(second.getByText(en ? 'This draft changed elsewhere. Your edits are still here.' : 'הטיוטה השתנתה במקום אחר. השינויים שלך נשארו כאן.', { exact: true })).toBeVisible();
                        await expect(second.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(staleTitle);
                        expect((await draft(id)).fields.title).toBe(nextTitle);
                        expect(await row()).toEqual(before);
                        second.once('dialog', d => d.accept());
                        await second.getByRole('button', { name: en ? 'Load saved version' : 'טעינת הגרסה השמורה', exact: true }).click();
                        await expect(second.getByRole('textbox', { name: titleName, exact: true })).toHaveValue(nextTitle);
                        await second.getByRole('button', { name: en ? 'Save changes' : 'שמירת שינויים', exact: true }).click();
                        await expect(second.getByRole('heading', { name: en ? 'Listing changes saved' : 'השינויים במודעה נשמרו', exact: true })).toBeVisible({ timeout: 90000 });
                        const after = await row(), afterRooms = await rooms();
                        expect(after.title).toBe(nextTitle);
                        expect(after.revision).toBe(before.revision + 1);
                        for (const field of ['id', 'lister_id', 'source', 'address', 'lat', 'lng', 'public_lat', 'public_lng', 'public_location_label', 'photos', 'status', 'created_at', 'inquiries_open'])
                            expect(after[field]).toEqual(before[field]);
                        for (const r of afterRooms)
                            expect(r).toEqual(r.id === roomId ? { ...beforeRooms.find(x => x.id === r.id), monthly_price: price } : beforeRooms.find(x => x.id === r.id));
                        expect((await draft(id)).state).toBe('completed');
                        await sync();
                        await foreign.goto(prefix + '/listings/' + main);
                        await expect(foreign.getByRole('heading', { level: 1, name: nextTitle, exact: true })).toBeVisible();
                        expect(await foreign.locator('main').innerText()).not.toContain('QA fixture, no real address');
                        const photos = foreign.getByRole('img', { name: new RegExp(nextTitle) });
                        await expect(photos).toHaveCount(3);
                        for (const image of await photos.all()) {
                            await image.scrollIntoViewIfNeeded();
                            await expect.poll(() => image.evaluate(n => (n as HTMLImageElement).naturalWidth), { timeout: 60000 }).toBeGreaterThan(0);
                        }
                        await second.goto(dashboard);
                        const room = card.locator(`[data-room-id="${roomId}"]`);
                        await room.getByRole('button', { name: /Mark unavailable|סימון כלא פנוי/ }).click();
                        await expect(room.getByRole('button', { name: /Open room|פתיחת החדר/ })).toBeVisible();
                        expect((await rooms()).every(r => !r.is_available)).toBe(true);
                        await room.getByRole('button', { name: /Open room|פתיחת החדר/ }).click();
                        await expect(room.getByRole('button', { name: /Mark unavailable|סימון כלא פנוי/ })).toBeVisible();
                        await card.getByRole('button', { name: en ? 'Pause inquiries' : 'עצירת פניות', exact: true }).click();
                        await expect(card.getByRole('button', { name: en ? 'Resume inquiries' : 'חידוש פניות', exact: true })).toBeVisible();
                        expect((await row()).inquiries_open).toBe(false);
                        await card.getByRole('button', { name: en ? 'Resume inquiries' : 'חידוש פניות', exact: true }).click();
                        await expect(card.getByRole('button', { name: en ? 'Pause inquiries' : 'עצירת פניות', exact: true })).toBeVisible();
                        expect((await row()).inquiries_open).toBe(true);
                        for (const state of ['taken', 'active']) {
                            await card.getByRole('button', { name: state === 'taken' ? (en ? 'Mark rented' : 'סימון כהושכרה') : (en ? 'Reopen listing' : 'החזרה לפעילות'), exact: true }).click();
                            await card.getByRole('button', { name: state === 'taken' ? (en ? 'Yes, mark rented' : 'כן, הדירה הושכרה') : (en ? 'Yes, reopen listing' : 'כן, החזרה לפעילות'), exact: true }).click();
                            await expect(card.getByTestId('listing-status')).toHaveText(state === 'taken' ? (en ? 'Rented' : 'הושכרה') : (en ? 'Active' : 'פעילה'));
                        }
                        const reopened = await row();
                        expect(reopened.id).toBe(main);
                        expect(reopened.inquiries_open).toBe(true);
                        expect(reopened.status).toBe('active');
                        expect(await rooms()).toEqual(afterRooms);
                        const pending = await api.from('listing_inquiries').select('status,reconfirmation_required_at').eq('id', ledger.pending).single();
                        expect(pending.error).toBeNull();
                        expect(pending.data!.status).toBe('pending');
                        expect(pending.data!.reconfirmation_required_at).not.toBeNull();
                        expect((await api.rpc('accept_listing_inquiry', { p_inquiry_id: ledger.pending })).error?.message).toMatch(/reconfirm/i);
                        expect(await chat()).toEqual(originalChat);
                        await foreign.goto(prefix + '/chats/' + ledger.conversation);
                        await expect(foreign.getByTestId('exact-address-card')).toContainText('QA fixture, no real address');
                        await second.reload();
                        await expect(card.getByTestId('listing-status')).toHaveText(en ? 'Active' : 'פעילה');
                        expect(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                        await second.screenshot({ path: join(directory, `${locale}-${width}-edited-reopened.png`), fullPage: true });
                        const untouched = await other.from('apartments').select('*').eq('id', companion).single();
                        expect(untouched.error).toBeNull();
                        expect(untouched.data).toEqual(companionBefore.data);
                        ledger.results.push({ locale, width, other_owner_denied: true, private_until_explicit_save: true, stale_tab_preserved_and_explicit_reload: true, atomic_one_revision: true, room_inventory_and_intake_independent: true, rented_to_active: true, accepted_chat_and_address_retained: true, pending_reconfirmation_required: true });
                        await persist();
                    }
                    finally {
                        await sync();
                        await context.close();
                        await foreignContext.close();
                        await ownerAuth.auth.signOut({ scope: 'local' });
                        await foreignAuth.auth.signOut({ scope: 'local' });
                    }
                });
        await saveScenario(join(directory, 'browser-acceptance.json'), { target, run_id: journal.run_id, results: ledger.results, real_next_storage: true });
    }
    finally {
        await api.auth.signOut({ scope: 'local' });
        await other.auth.signOut({ scope: 'local' });
    }
});
