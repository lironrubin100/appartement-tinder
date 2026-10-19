import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import type { Database } from '../src/types/database';
import { completeCanonicalResident } from './canonical-fixture';

// Real accounts, browser sessions, Storage, RPCs and Realtime; no route mocks.
const env = Object.fromEntries(
  (existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const at = l.indexOf('=');
      return [l.slice(0, at), l.slice(at + 1).replace(/^['"]|['"]$/g, '')];
    })
);
const fixtures: { id: string; email: string; password: string }[] = (existsSync('.env.qa.local') ? JSON.parse(readFileSync('.env.qa.local', 'utf8')) : []);
test.skip(fixtures.length < 9, 'Requires isolated QA accounts in ignored .env.qa.local');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6E3sAAAAASUVORK5CYII=',
  'base64'
);
const makeClient = () =>
  createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

async function client(i: number) {
  const c = makeClient();
  const result = await c.auth.signInWithPassword(fixtures[i]);
  expect(result.error).toBeNull();
  return c;
}
async function login(page: Page, i: number, returnTo = '/en/discover') {
  await page.goto(`/en/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Email', { exact: true }).fill(fixtures[i].email);
  await page.getByLabel('Password', { exact: true }).fill(fixtures[i].password);
  await page
    .getByRole('button', { name: 'Sign in with email', exact: true })
    .click();
}
async function send(page: Page, body: string) {
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill(body);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText(body, { exact: false })).toBeVisible();
}

test.use({ actionTimeout: 15000 });

test('new resident, accepted introduction, configurable group and private viewing journeys', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  console.info('Resident QA: prepare isolated sessions');
  const run = Date.now().toString(36);
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const errors: string[] = [];
  for (let n = 0; n < 5; n++) {
    const context = await browser.newContext();
    contexts.push(context);
    const p = await context.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    pages.push(p);
  }
  const [a, b, c, owner, d] = pages;

  const ca = await client(4),
    cb = await client(5),
    cc = await client(6),
    co = await client(7),
    cd = await client(8);
  const allClients = [ca, cb, cc, co, cd];
  try {
    for (const [api, name] of [
      [cb, 'QA B connected'],
      [cc, 'QA C applicant'],
      [cd, 'QA D outsider'],
    ] as const) {
      const user = await api.auth.getUser();
      expect(user.error).toBeNull();
      await completeCanonicalResident(api, user.data.user!.id, name);
    }

    const connectedProfile = await ca.from('profiles_public').select('*').eq('id', fixtures[5].id).single();
    expect(connectedProfile.error).toBeNull();
    const connectedName = connectedProfile.data!.name!;

    console.info('Resident QA: initial login and draft');
    // A first-time resident fills a private draft, resumes and completes it.
    const completedA = await ca.from('profiles').select('onboarded').single();
    if (!completedA.data?.onboarded) {
      await login(a, 4);
      await expect(a).toHaveURL(/\/en\/onboarding\?/);
      console.info('Resident QA: onboarding reached');
      await a
        .getByRole('button', { name: 'Yes, I’m looking for roommates' })
        .click();
      await a.getByLabel('Full name (private)').fill('QA A resident');
      await a.getByPlaceholder('DD/MM/YYYY').fill('15032000');
      await expect(a.getByPlaceholder('DD/MM/YYYY')).toHaveValue('15/03/2000');
      await a
        .getByLabel('A little about you (required)')
        .fill('QA A public bio');
      await a.getByLabel('Shared-space cleanliness', { exact: true }).selectOption('tidy_shared');
      await a.getByLabel('Sleep schedule', { exact: true }).selectOption('regular');
      await a.getByLabel('Social life and guests', { exact: true }).selectOption('occasional');
      await a.getByLabel('Smoking habits', { exact: true }).selectOption('none');
      console.info('Resident QA: upload profile photo');
      await a
        .getByLabel('Upload photo')
        .setInputFiles({
          name: 'profile.png',
          mimeType: 'image/png',
          buffer: png,
        });
      await expect(a.getByRole('img', { name: 'Primary photo', exact: true })).toBeVisible();
      await a.getByRole('button', { name: 'Save and finish later' }).click();
      await expect(a.getByRole('status')).toHaveText('Details saved');
      expect(
        (await cb.from('profiles_public').select('*').eq('id', fixtures[4].id))
          .data
      ).toEqual([]);
      await a.reload();
      await expect(a.getByLabel('Full name (private)')).toHaveValue(
        'QA A resident'
      );
      await expect(a.getByPlaceholder('DD/MM/YYYY')).toHaveValue('15/03/2000');
      await a.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(a).toHaveURL('/en/discover');
      await expect(
        a.getByRole('button', { name: 'Individuals', exact: true })
      ).toHaveAttribute('aria-pressed', 'true');
      const publicProfile = await cb
        .from('profiles_public')
        .select('*')
        .eq('id', fixtures[4].id)
        .single();
      expect(publicProfile.data?.bio).toBe('QA A public bio');
      expect(publicProfile.data?.photo_url).toBeTruthy();
      for (const key of ['birth_date', 'phone', 'budget_min', 'student_email'])
        expect(publicProfile.data).not.toHaveProperty(key);
      await a.goto('/en');
      await expect(a).toHaveURL('/en/discover');
      expect(
        (
          await ca
            .from('profiles')
            .update({ default_home: 'map' })
            .eq('id', fixtures[4].id)
        ).error
      ).toBeNull();
      await a.goto('/en');
      await expect(a).toHaveURL('/en/map');
      await ca
        .from('profiles')
        .update({ default_home: 'discover' })
        .eq('id', fixtures[4].id);
      await a.goto('/en/discover');
    } else {
      await login(a, 4);
      await expect(a).toHaveURL('/en/discover');
    }
    let personalId = (await ca.rpc('list_chat_inbox')).data?.find(
      (x) => x.other_user_id === fixtures[5].id && !x.group_id
    )?.conversation_id;
    if (!personalId) {
      for (
        let n = 0;
        n < 15 &&
        !(await a.getByRole('heading', { name: connectedName, exact: true }).isVisible());
        n++
      ) {
        await a.getByRole('button', { name: 'Pass', exact: true }).click();
        await expect(
          a.getByRole('button', { name: 'Pass', exact: true })
        ).toBeEnabled();
      }
      await expect(
        a.getByRole('heading', { name: connectedName, exact: true })
      ).toBeVisible();
      await a.getByRole('button', { name: 'Introduce yourself' }).click();
      await a
        .getByLabel('What caught your attention?')
        .selectOption(`${fixtures[5].id}:canonical.cleanliness:tidy_shared`);
      await a
        .getByRole('button', { name: 'Send introduction', exact: true })
        .click();
      await expect(a.getByRole('dialog')).toHaveCount(0);
      const intro = await ca
        .from('likes')
        .select('id,ref_tag,message')
        .eq('from_user', fixtures[4].id)
        .eq('to_user', fixtures[5].id)
        .single();
      expect(intro.error).toBeNull();
      expect(intro.data?.message).toBe('');
      expect(intro.data?.ref_tag).toContain('cleanliness');
      await login(b, 5, '/en/chats');
      await expect(
        b.getByRole('button', { name: 'Accept', exact: true })
      ).toBeVisible();
      await b.getByRole('button', { name: 'Accept', exact: true }).click();
      await expect(b).toHaveURL(/\/en\/chats\/[a-f0-9-]+$/);
      personalId = b.url().split('/').pop()!;
    } else {
      await login(b, 5, `/en/chats/${personalId}`);
      await expect(b).toHaveURL(`/en/chats/${personalId}`);
    }
    await a.goto(`/en/chats/${personalId}`);
    await expect(b.getByTestId('chat-connection')).toHaveText('Live');
    await expect(a.getByTestId('chat-connection')).toHaveText('Live');
    await send(a, 'QA personal message A ' + run);
    await expect(
      b.getByText('QA personal message A ' + run, { exact: true })
    ).toBeVisible();
    await send(b, 'QA personal reply B ' + run);
    await a.bringToFront();
    await expect(
      a.getByText('QA personal reply B ' + run, { exact: true })
    ).toBeVisible();
    await a.reload();
    await expect(
      a.getByText('QA personal reply B ' + run, { exact: true })
    ).toBeVisible();
    expect(
      (await cc.from('messages').select('id').eq('conversation_id', personalId))
        .data
    ).toEqual([]);
    await login(c, 6, `/en/chats/${personalId}`);
    await expect(c.getByRole('heading', { name: /404/ })).toBeVisible();

    console.info('Resident QA: group formation and admission');
    // Existing personal chat stays intact when a separate group is created.
    await a.goto('/en/chats');
    await a
      .getByRole('button', { name: 'Create a group', exact: true })
      .click();
    await a.getByLabel('Group name', { exact: true }).fill('QA group journey');
    await a.getByLabel(connectedName, { exact: true }).check();
    await a
      .getByRole('button', { name: 'Create and send invitations' })
      .click();
    await expect(a).toHaveURL(/\/en\/chats\/[a-f0-9-]+$/);
    const groupThread = a.url().split('/').pop()!;
    await send(a, 'QA hidden before B joined ' + run);
    await b.goto('/en/chats');
    await b.getByRole('button', { name: 'Join group', exact: true }).click();
    await expect(b).toHaveURL(`/en/chats/${groupThread}`);
    await expect(
      b.getByText('QA hidden before B joined ' + run, { exact: false })
    ).toHaveCount(0);
    expect(
      (
        await cb
          .from('messages')
          .select('body')
          .eq('conversation_id', groupThread)
      ).data
    ).toEqual([]);
    expect(
      (await cb.rpc('list_chat_inbox')).data?.find(
        (x) => x.conversation_id === groupThread
      )?.last_message_body
    ).toBeNull();
    await send(a, 'QA group after B joined ' + run);
    await expect(
      b.getByText('QA group after B joined ' + run, { exact: false })
    ).toBeVisible();
    await a.getByRole('button', { name: 'Group details', exact: true }).click();
    await a.getByLabel('Who approves new members?').selectOption('majority');
    await a.getByRole('button', { name: 'Save setting' }).click();
    await c.goto('/en/discover');
    await c.getByRole('button', { name: 'Groups', exact: true }).click();
    await expect(
      c.getByRole('heading', { name: 'QA group journey', exact: true })
    ).toBeVisible();
    await c.getByRole('button', { name: 'Introduce yourself' }).click();
    await c
      .getByRole('button', { name: 'Send introduction', exact: true })
      .click();
    await expect(c.getByRole('dialog')).toHaveCount(0);
    await a.goto('/en/chats');
    await a
      .getByRole('button', { name: 'Vote to accept', exact: true })
      .click();
    await expect(
      a.getByText('Your vote is saved. Waiting for a majority.')
    ).toBeVisible();
    const groupId = (await ca.rpc('list_chat_inbox')).data!.find(
      (x) => x.conversation_id === groupThread
    )!.group_id!;
    expect(
      (await cc.from('group_members').select('*').eq('group_id', groupId)).data
    ).toEqual([]);
    await b.goto('/en/chats');
    await b
      .getByRole('button', { name: 'Vote to accept', exact: true })
      .click();
    await expect(b).toHaveURL(`/en/chats/${groupThread}`);
    await c.goto(`/en/chats/${groupThread}`);
    await expect(
      c.getByText('QA group after B joined ' + run, { exact: false })
    ).toHaveCount(0);
    expect(
      (
        await cc
          .from('messages')
          .select('body')
          .eq('conversation_id', groupThread)
      ).data
    ).toEqual([]);
    await a.goto(`/en/chats/${groupThread}`);
    await send(c, 'QA C new member message ' + run);
    await expect(
      a.getByText('QA C new member message ' + run, { exact: false })
    ).toBeVisible();
    await expect(
      b.getByText('QA C new member message ' + run, { exact: false })
    ).toBeVisible();
    expect(
      (await ca.rpc('list_chat_inbox')).data?.some(
        (x) => x.conversation_id === personalId
      )
    ).toBe(true);
    expect(
      (
        await cb
          .from('conversation_members')
          .update({ visible_after_seq: 0 })
          .eq('conversation_id', groupThread)
          .eq('user_id', fixtures[5].id)
      ).error
    ).not.toBeNull();
    expect(
      (await cd.from('messages').select('*').eq('conversation_id', groupThread))
        .data
    ).toEqual([]);
    await ca.rpc('configure_group', {
      p_group: groupId,
      p_policy: 'any_member',
    });
    const fourth = await cd.rpc('send_introduction', {
      p_user: null,
      p_group: groupId,
      p_message: '',
      p_ref_tag: 'bio',
    });
    expect(fourth.error).toBeNull();
    expect(
      (await cb.rpc('decide_group_introduction', { p_like: fourth.data! })).data
    ).toBe(groupThread);
    expect(
      (await ca.from('group_members').select('*').eq('group_id', groupId)).data
    ).toHaveLength(4);
    expect(
      (await cd.from('messages').select('*').eq('conversation_id', groupThread))
        .data
    ).toEqual([]);
    expect(
      (
        await cd
          .from('blocks')
          .insert({ blocker_id: fixtures[8].id, blocked_id: fixtures[4].id })
      ).error
    ).toBeNull();
    expect(
      (await ca.rpc('list_chat_inbox')).data?.some(
        (x) => x.conversation_id === groupThread
      )
    ).toBe(false);
    expect(
      (
        await ca
          .from('messages')
          .insert({
            conversation_id: groupThread,
            sender_id: fixtures[4].id,
            body: 'blocked',
          })
      ).error
    ).not.toBeNull();
    await cd
      .from('blocks')
      .delete()
      .eq('blocker_id', fixtures[8].id)
      .eq('blocked_id', fixtures[4].id);

    console.info('Resident QA: lister and inquiry');
    // New lister intake, then guest → sign in → original listing → inquiry.
    await login(owner, 7, '/en/my-listings');
    await owner
      .getByRole('button', { name: 'No, I’m posting for others' })
      .click();
    await owner.getByLabel('Full name', { exact: true }).fill('QA owner');
    await owner.getByLabel('Contact phone', { exact: true }).fill('0500000000');
    await owner.getByLabel('I confirm I am at least 18 years old', { exact: true }).check();
    await owner.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(owner).toHaveURL('/en/my-listings');
    await owner.goto('/en/compose');
    await owner
      .getByLabel('Listing title', { exact: true })
      .fill('QA viewing apartment');
    await owner.locator('[name=bedrooms]').fill('2');
    await owner.locator('[name=availableFrom]').fill('2026-11-01');
    await owner.locator('[name=address]').fill('QA PRIVATE VIEWING ADDRESS');
    await owner.getByRole('button', { name: 'Address not found? Enter and adjust location manually', exact: true }).click();
    await owner.locator('[name=locationCity]').fill('Beer Sheva');
    await owner.locator('[name=latitude]').fill('31.252');
    await owner.locator('[name=longitude]').fill('34.791');
    await owner.locator('[name=locationConfirmed]').check();
    await owner.locator('[name=roomPrice]').fill('2000');
    await owner
      .locator('#photos')
      .setInputFiles(
        [1, 2, 3].map((n) => ({
          name: `view-${n}.png`,
          mimeType: 'image/png',
          buffer: png,
        }))
      );
    await owner
      .getByRole('button', { name: 'Publish listing', exact: true })
      .click();
    await expect(owner).toHaveURL(/\/en\/compose\/published\/[a-f0-9-]+$/);
    const apartmentId = owner.url().split('/').pop()!;
    await d.goto(`/en/listings/${apartmentId}`);
    await d.getByRole('link', { name: 'Sign in to request a viewing' }).click();
    await d.getByLabel('Email', { exact: true }).fill(fixtures[8].email);
    await d.getByLabel('Password', { exact: true }).fill(fixtures[8].password);
    await d
      .getByRole('button', { name: 'Sign in with email', exact: true })
      .click();
    await expect(d).toHaveURL(`/en/listings/${apartmentId}`);
    await d
      .getByRole('button', { name: 'Request a viewing', exact: true })
      .click();
    await expect(d.getByRole('status')).toContainText('Waiting for the owner');
    await d.reload();
    await expect(d.getByRole('status')).toContainText('Waiting for the owner');
    expect(
      (
        await cd
          .from('listing_address_access')
          .select('*')
          .eq('apartment_id', apartmentId)
      ).data
    ).toEqual([]);
    await owner.goto('/en/my-listings');
    await owner
      .getByRole('button', { name: 'Accept and open chat', exact: true })
      .click();
    await expect(owner).toHaveURL(/\/en\/chats\/[a-f0-9-]+$/);
    const viewingId = owner.url().split('/').pop()!;
    await d.goto(`/en/listings/${apartmentId}`);
    await d
      .getByRole('link', { name: 'Open conversation', exact: true })
      .click();
    await expect(d).toHaveURL(`/en/chats/${viewingId}`);
    await expect(d.getByTestId('exact-address-card')).toContainText(
      'QA PRIVATE VIEWING ADDRESS'
    );
    expect(
      (
        await cc
          .from('listing_address_access')
          .select('*')
          .eq('apartment_id', apartmentId)
      ).data
    ).toEqual([]);
    await send(owner, 'QA viewing appointment ' + run);
    await expect(
      d.getByText('QA viewing appointment ' + run, { exact: true })
    ).toBeVisible();
    await send(d, 'QA viewing confirmed ' + run);
    await expect(
      owner.getByText('QA viewing confirmed ' + run, { exact: true })
    ).toBeVisible();
    await d.reload();
    await expect(
      d.getByText('QA viewing confirmed ' + run, { exact: true })
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    for (const api of allClients) {
      const {
        data: { user },
      } = await api.auth.getUser();
      if (!user) continue;
      const { data: listings } = await api
        .from('apartments')
        .select('photos')
        .eq('lister_id', user.id);
      const paths = (listings ?? [])
        .flatMap((l) => l.photos.map((p) => p.split('/apartment-photos/')[1]))
        .filter(Boolean);
      if (paths.length)
        expect(
          (await api.storage.from('apartment-photos').remove(paths)).error
        ).toBeNull();
      const { data: photos } = await api.storage
        .from('profile-photos')
        .list(user.id);
      if (photos?.length)
        expect(
          (
            await api.storage
              .from('profile-photos')
              .remove(photos.map((p) => `${user.id}/${p.name}`))
          ).error
        ).toBeNull();
      await api.auth.signOut();
    }
    for (const context of contexts) await context.close();
  }
});
