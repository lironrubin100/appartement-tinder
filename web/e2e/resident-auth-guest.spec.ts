import { test, expect } from '@playwright/test';

// Read-only browser checks. Authenticated journeys require the pending migrations.
test.use({ baseURL: 'http://localhost:3000' });

test('English sign-in and sign-up preserve the locale and render usable forms', async ({
  page,
}) => {
  await page.goto(
    '/en/login?returnTo=%2Fen%2Flistings%2F00000000-0000-4000-8000-000000000001'
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Google' })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'New here? Create an account' })
    .click();
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create account', exact: true })
  ).toBeDisabled();
});

test('protected group chat returns to the same destination after sign-in', async ({
  page,
}) => {
  const target = '/en/chats/00000000-0000-4000-8000-000000000001';
  await page.goto(target);
  await expect(page).toHaveURL(
    `/en/login?returnTo=${encodeURIComponent(target)}`
  );
});

test('Hebrew entry remains RTL and incomplete onboarding carries its return destination', async ({
  page,
}) => {
  await page.goto(
    '/onboarding?returnTo=%2Flistings%2F00000000-0000-4000-8000-000000000001'
  );
  await expect(page).toHaveURL(/\/login\?returnTo=%2Flistings/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByLabel('כתובת מייל')).toBeVisible();
});

test('OAuth and email callback failures reject external and looping destinations', async ({
  request,
}) => {
  for (const destination of [
    'https://evil.invalid',
    '//evil.invalid',
    '/auth/callback',
    '/login',
    '/onboarding',
    '/\\evil.invalid',
  ]) {
    const response = await request.get(
      `/auth/callback?locale=en&returnTo=${encodeURIComponent(destination)}`,
      { maxRedirects: 0 }
    );
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location).pathname).toBe('/en/login');
    expect(
      new URL(response.headers().location).searchParams.get('returnTo')
    ).toBe('/en');
    const confirm = await request.get(
      `/auth/confirm?locale=en&next=${encodeURIComponent(destination)}`,
      { maxRedirects: 0 }
    );
    expect(new URL(confirm.headers().location).pathname).toBe('/en/login');
    expect(
      new URL(confirm.headers().location).searchParams.get('returnTo')
    ).toBe('/en');
  }
});
