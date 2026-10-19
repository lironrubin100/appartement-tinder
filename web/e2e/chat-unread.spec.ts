import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import type { Database } from '../src/types/database';
import { completeCanonicalResident } from './canonical-fixture';

// Real ordinary accounts and Realtime, never route mocks. Missing fixtures fail.
const settings = () => Object.fromEntries(readFileSync('.env.local', 'utf8')
  .split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')];
  }));

async function login(page: Page, account: { email: string; password: string }, path: string) {
  await page.goto(`/en/login?returnTo=${encodeURIComponent(path)}`);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await expect(page).toHaveURL(path);
}

for (const [locale, offset, viewport] of [
  ['en', 5, { width: 390, height: 844 }],
  ['he', 7, { width: 1280, height: 900 }],
] as const) {
  test(`persistent unread, visible read and reconnect (${locale})`, async ({ browser }) => {
    test.setTimeout(180_000);
    const run = crypto.randomUUID();
    const fixtures: { id: string; email: string; password: string }[] = JSON.parse(readFileSync('.env.qa.local', 'utf8'));
    expect(fixtures.length).toBeGreaterThanOrEqual(9);
    const env = settings();
    const accounts = fixtures.slice(offset, offset + 2);
    const apis = accounts.map(() => createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }));
    const contexts = await Promise.all(accounts.map(() => browser.newContext({ viewport })));
    try {
      for (let i = 0; i < 2; i++) {
        expect((await apis[i].auth.signInWithPassword(accounts[i])).error).toBeNull();
        await completeCanonicalResident(apis[i], accounts[i].id, `Unread ${locale} ${i}`);
      }
      const intro = await apis[0].rpc('send_introduction', {
        p_user: accounts[1].id, p_group: null, p_message: '', p_ref_tag: 'bio',
      });
      expect(intro.error).toBeNull();
      const accepted = await apis[1].rpc('accept_like', { p_like_id: intro.data! });
      expect(accepted.error).toBeNull();
      const cid = accepted.data!;
      const requestKey = crypto.randomUUID();
      const duplicateArgs = { p_conversation_id: cid, p_body: `retry-safe ${run}`, p_request_key: requestKey };
      const duplicates = await Promise.all([apis[0].rpc('send_chat_message', duplicateArgs), apis[0].rpc('send_chat_message', duplicateArgs)]);
      for (const response of duplicates) expect(response.error).toBeNull();
      expect(duplicates[0].data![0].id).toBe(duplicates[1].data![0].id);
      expect((await apis[0].rpc('send_chat_message', { ...duplicateArgs, p_body: 'different payload' })).error).not.toBeNull();
      const send = async (i: number, body: string) => {
        const result = await apis[i].from('messages').insert({ conversation_id: cid, sender_id: accounts[i].id, body })
          .select('message_seq').single();
        expect(result.error).toBeNull(); return result.data!.message_seq;
      };
      const unread = async (i = 0) => {
        const result = await apis[i].rpc('list_chat_inbox');
        expect(result.error).toBeNull(); return result.data!.find(c => c.conversation_id === cid)!.unread_count;
      };
      let ten = 0;
      for (let i = 0; i < 10; i++) ten = await send(0, `baseline ${i}`);
      for (const api of apis) expect((await api.rpc('mark_conversation_read', {
        p_conversation_id: cid, p_through_seq: ten,
      })).error).toBeNull();
      await send(1, `recipient eleven ${run}`);
      const twelve = await send(0, `sender twelve ${run}`);
      expect(await unread()).toBe(1);
      expect(await unread(1)).toBe(1);
      const inbox = await contexts[0].newPage();
      const root = locale === 'en' ? '/en' : '';
      await login(inbox, accounts[0], `${root}/chats`);
      const card = inbox.locator(`a[href="${root}/chats/${cid}"]`);
      await expect(card.getByLabel(locale === 'en' ? 'Unread messages' : 'הודעות שלא נקראו')).toHaveText('1');
      const thread = await contexts[0].newPage();
      await thread.goto(`${root}/chats/${cid}`);
      await thread.bringToFront();
      await expect(thread.getByText(`sender twelve ${run}`, { exact: true })).toBeVisible();
      await expect.poll(() => unread()).toBe(0);
      // A stale read from another tab cannot undo the visible read.
      expect((await apis[0].rpc('mark_conversation_read', { p_conversation_id: cid, p_through_seq: ten })).data).toBeGreaterThanOrEqual(twelve);
      expect(await unread()).toBe(0);
      // Playwright enables focus emulation on every page by default. Disable
      // that automation override to exercise the browser's actual tab focus.
      const nativeFocus = await contexts[0].newCDPSession(thread);
      await nativeFocus.send('Emulation.setFocusEmulationEnabled', { enabled: false });
      await inbox.bringToFront();
      await expect.poll(() => thread.evaluate(() => document.visibilityState === 'visible' && document.hasFocus())).toBe(false);
      const peer = await contexts[1].newPage();
      await login(peer, accounts[1], `/en/chats/${cid}`);
      await peer.bringToFront();
      await expect(thread.getByTestId('chat-connection')).toHaveText(locale === 'en' ? 'Live' : 'מחובר');
      await peer.getByRole('textbox', { name: 'Message', exact: true }).fill(`live while other tab hidden ${run}`);
      await peer.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(thread.getByText(`live while other tab hidden ${run}`, { exact: true })).toBeVisible();
      expect(await unread()).toBe(1);
      await thread.bringToFront();
      await expect.poll(() => unread()).toBe(0);
      await contexts[0].setOffline(true);
      await peer.bringToFront();
      await send(1, `persisted during disconnect ${run}`);
      await contexts[0].setOffline(false);
      await thread.bringToFront();
      await expect(thread.getByText(`persisted during disconnect ${run}`, { exact: true })).toBeVisible({ timeout: 40_000 });
      await expect.poll(() => unread()).toBe(0);
      await thread.reload();
      await expect(thread.getByText(`persisted during disconnect ${run}`, { exact: true })).toHaveCount(1);
      await inbox.bringToFront();
      await expect(card).toContainText(`persisted during disconnect ${run}`);
      await expect(card.getByLabel(locale === 'en' ? 'Unread messages' : 'הודעות שלא נקראו')).toHaveCount(0);
      const outsider = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });
      expect((await outsider.auth.signInWithPassword(fixtures[4])).error).toBeNull();
      expect((await outsider.rpc('mark_conversation_read', { p_conversation_id: cid, p_through_seq: 999999 })).error).not.toBeNull();
      await outsider.auth.signOut();
    } finally {
      await Promise.all(contexts.map(c => c.close()));
      await Promise.all(apis.map(api => api.auth.signOut()));
    }
  });
}
