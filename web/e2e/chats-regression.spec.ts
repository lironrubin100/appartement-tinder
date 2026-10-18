import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import type { Database } from '../src/types/database';

const env = Object.fromEntries(
  (existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
    })
);
const fixtures: { id: string; email: string; password: string }[] =
  existsSync('.env.chats-qa.local') ? JSON.parse(readFileSync('.env.chats-qa.local', 'utf8')) : [];

test.skip(fixtures.length < 5, 'Requires five isolated chat QA accounts.');

const client = () => createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resident(index: number, name: string) {
  const api = client();
  expect((await api.auth.signInWithPassword(fixtures[index])).error).toBeNull();
  const onboarding = await api.rpc('save_onboarding', {
    p_name: name,
    p_resident: true,
    p_birth_date: '2000-02-20',
    p_phone: '0500000000',
    p_agency: '',
    p_bio: 'Chat regression QA',
    p_tags: { cleanliness: 'clean' },
    p_complete: true,
  });
  expect(onboarding.error?.message === 'already completed' ? null : onboarding.error).toBeNull();
  return api;
}

test('a pending personal introduction is actionable in Chats without direct groups-table access', async ({ page }) => {
  test.setTimeout(90_000);
  const sender = await resident(0, 'QA chat sender');
  const recipient = await resident(1, 'QA chat recipient');
  expect((await sender.rpc('send_introduction', {
    p_user: fixtures[1].id,
    p_group: null,
    p_message: '',
    p_ref_tag: 'bio',
  })).error).toBeNull();
  await sender.auth.signOut();
  await recipient.auth.signOut();

  await page.goto('/en/login?returnTo=%2Fen%2Fchats');
  await page.getByLabel('Email').fill(fixtures[1].email);
  await page.getByLabel('Password').fill(fixtures[1].password);
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await expect(page).toHaveURL('/en/chats');
  await expect(page.getByRole('button', { name: 'Accept', exact: true })).toBeVisible();
});
