import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import type { Database } from '../src/types/database';

// This covers the explicit Settings transition against a real authenticated
// client. It deliberately uses fresh disposable QA identities only.
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
  existsSync('.env.conversion-qa.local') ? JSON.parse(readFileSync('.env.conversion-qa.local', 'utf8')) : [];

test.skip(fixtures.length < 6, 'Requires six isolated conversion QA accounts.');

function client() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(page: Page, fixture: number, locale: 'en' | 'he') {
  const prefix = locale === 'en' ? '/en' : '';
  await page.goto(`${prefix}/login?returnTo=${encodeURIComponent(`${prefix}/settings`)}`);
  await page.getByLabel(locale === 'en' ? 'Email' : 'כתובת מייל').fill(fixtures[fixture].email);
  await page.getByLabel(locale === 'en' ? 'Password' : 'סיסמה').fill(fixtures[fixture].password);
  await page.getByRole('button', { name: locale === 'en' ? 'Sign in with email' : 'התחברות עם מייל', exact: true }).click();
  await expect(page).toHaveURL(`${prefix}/settings`);
}

async function makeResident(fixture: number, name: string) {
  const api = client();
  expect((await api.auth.signInWithPassword(fixtures[fixture])).error).toBeNull();
  const profile = await api.from('profiles').select('onboarded,mode').eq('id', fixtures[fixture].id).single();
  if (!profile.data?.onboarded) {
    expect((await api.rpc('save_onboarding', {
      p_name: name,
      p_resident: true,
      p_birth_date: '2000-02-20',
      p_phone: '0500000000',
      p_agency: '',
      p_bio: 'Conversion QA resident',
      p_tags: { cleanliness: 'clean' },
      p_complete: true,
    })).error).toBeNull();
  }
  await api.auth.signOut();
}

test('English phone-width Settings conversion requires acknowledgement and removes the resident projection', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await makeResident(4, 'QA conversion English');
  await signIn(page, 4, 'en');

  await page.getByRole('button', { name: 'Switch to a property poster account', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Confirm property poster account', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Private contact phone').fill('0501111111');
  await expect(confirm).toBeDisabled();
  await page.getByLabel('I understand this hides my resident profile from Discover and limits new social actions.').check();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page).toHaveURL('/en/my-listings');
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

  const api = client();
  expect((await api.auth.signInWithPassword(fixtures[4])).error).toBeNull();
  const profile = await api.from('profiles').select('mode').eq('id', fixtures[4].id).single();
  expect(profile.data?.mode).toBe('lister');
  const privateProfile = await api.from('profile_private').select('phone').eq('profile_id', fixtures[4].id).single();
  expect(privateProfile.data?.phone).toBe('0501111111');
  expect((await api.from('profiles_public').select('id').eq('id', fixtures[4].id)).data).toEqual([]);
  expect((await api.rpc('pass_discovery', { p_target: fixtures[5].id, p_kind: 'individual' })).error).not.toBeNull();
  await api.auth.signOut();
});

test('Hebrew desktop Settings conversion exposes the same deliberate confirmation flow', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await makeResident(5, 'QA conversion Hebrew');
  await signIn(page, 5, 'he');

  await page.getByRole('button', { name: 'לעבור לחשבון מפרסם', exact: true }).click();
  await expect(page.getByText('אחרי המעבר הפרופיל לא יופיע ב־Discover ולא ניתן יהיה לשלוח פניות או Pass. שיחות קיימות נשמרות.')).toBeVisible();
  await page.getByLabel('טלפון פרטי ליצירת קשר').fill('0502222222');
  await page.getByLabel('אני מבינ/ה שהמעבר מסתיר את פרופיל הדייר שלי מ־Discover ומגביל פעולות חברתיות חדשות.').check();
  await page.getByRole('button', { name: 'אישור מעבר לחשבון מפרסם', exact: true }).click();
  await expect(page).toHaveURL('/my-listings');
});
