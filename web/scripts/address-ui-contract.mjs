// Local mocked UI contract only; not real-provider or listing-publish evidence.
// Run against an owned `next dev --webpack -p 3107` with synthetic Supabase env.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, relative } from 'node:path';

const harness = new URL('../src/app/qa-address-contract/', import.meta.url);
const appRoot = fileURLToPath(new URL('../src/app/', import.meta.url));
if (relative(appRoot, dirname(fileURLToPath(new URL('page.tsx', harness)))) !== 'qa-address-contract') {
  throw new Error('Temporary harness must remain inside the app workspace');
}
await mkdir(harness, { recursive: true });
await writeFile(new URL('page.tsx', harness), `import AddressField from '@/components/map/AddressField';
export default async function Contract({searchParams}: {searchParams: Promise<{locale?:string}>}) {
 const {locale}=await searchParams;
 return <main className="mx-auto w-full max-w-2xl p-4"><form><AddressField locale={locale==='en'?'en':'he'} /></form></main>;
}`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const locale of ['he', 'en']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let mode = 'success';
    let requestBody;
    await page.route('**/api/geocode', async (route) => {
      requestBody = route.request().postDataJSON();
      if (mode === 'limited') return route.fulfill({ status: 429, json: { error: 'rate_limited' } });
      if (mode === 'empty') return route.fulfill({ json: { suggestions: [] } });
      if (mode === 'error') return route.abort();
      if (mode === 'grouped') return route.fulfill({ json: { suggestions: [
        { label: 'Synthetic City', city: 'Synthetic City', kind: 'city', accuracy: 'city', latitude: 31.25, longitude: 34.79, token: '' },
        { label: 'Synthetic Region', city: '', kind: 'region', accuracy: 'county', latitude: 31.25, longitude: 34.79, token: '' },
        { label: 'Synthetic Neighborhood, Synthetic City', city: 'Synthetic City', kind: 'neighborhood', accuracy: 'suburb', latitude: 31.25, longitude: 34.79, token: '' },
      ] } });
      return route.fulfill({ json: { suggestions: [{ label: 'Synthetic address 22, Beer Sheva',
        latitude: 31.25, longitude: 34.79, city: 'Beer Sheva', street: 'Synthetic address', houseNumber: '22', kind: 'address', accuracy: 'building', token: 'synthetic-receipt' }] } });
    });
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(`http://localhost:3107/qa-address-contract?locale=${locale}`);
    const input = page.getByRole('combobox');
    await input.fill('synthetic 22');
    await expect(page.getByRole('option')).toHaveCount(1);
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page.locator('[name=locationToken]')).toHaveValue('synthetic-receipt');
    await expect(page.locator('[name=latitude]')).toHaveValue('31.25');
    await page.locator('[name=locationConfirmed]').check();
    await input.fill('edited address');
    await expect(page.locator('[name=locationToken]')).toHaveValue('');
    await expect(page.locator('[name=latitude]')).toHaveValue('');
    mode = 'grouped';
    await input.fill('Synthetic City');
    await expect(page.getByRole('option')).toHaveCount(3);
    await expect(page.getByRole('group', { name: locale === 'he' ? 'עיר / יישוב' : 'City / town', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: locale === 'he' ? 'אזור' : 'Region', exact: true })).toBeVisible();
    await input.press('ArrowUp');
    await expect(input).toHaveAttribute('aria-activedescendant', /option-2$/);
    await page.getByRole('button', { name: 'Synthetic City', exact: true }).click();
    await expect(input).toHaveValue('');
    await expect(page.locator('[name=locationToken]')).toHaveValue('');
    await expect(page.locator('[name=latitude]')).toHaveValue('');
    mode = 'success';
    await input.fill('Synthetic street 22');
    await expect(page.getByRole('option')).toHaveCount(1);
    expect(requestBody.scope).toBe('Synthetic City');
    await page.getByRole('button', { name: locale === 'he' ? 'רחוב' : 'Street', exact: true }).click();
    await expect(page.getByRole('option')).toHaveCount(1);
    expect(requestBody.category).toBe('street');
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page.locator('[name=locationToken]')).toHaveValue('synthetic-receipt');
    await expect(page.getByText(locale === 'he' ? 'מספר בית' : 'House number', { exact: true })).toBeVisible();
    await input.fill('edit scoped address');
    await page.getByRole('button', { name: locale === 'he' ? 'כל הארץ' : 'All Israel', exact: true }).click();
    mode = 'limited';
    await input.fill('limited address');
    await expect(page.getByRole('status')).toContainText(locale === 'he' ? 'המתינו דקה' : 'Wait a minute');
    mode = 'empty';
    await page.getByRole('button', { name: locale === 'he' ? 'ניסיון חוזר' : 'Retry', exact: true }).click();
    await expect(page.getByRole('status')).toContainText(locale === 'he' ? 'לא נמצאה' : 'No matching');
    mode = 'error';
    await input.fill('network failure');
    await expect(page.getByRole('status')).toContainText(locale === 'he' ? 'אינו זמין' : 'unavailable');
    await page.getByRole('button', { name: /ידניים|manually/ }).click();
    await page.locator('[name=locationCity]').fill('Beer Sheva');
    await page.locator('[name=latitude]').fill('31.25');
    await page.locator('[name=longitude]').fill('34.79');
    await page.locator('[name=locationConfirmed]').check();
    await expect(page.locator('[name=locationMode]')).toHaveValue('manual');
    await page.locator('[name=latitude]').fill('31.26');
    await expect(page.locator('[name=locationConfirmed]')).not.toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(failures).toEqual([]);
    console.log(`${locale} 390px: grouped location types, optional filters, area refinement without coordinates, parsed components, keyboard selection, edit invalidation, errors and manual fallback passed`);
    await page.close();
  }
} finally {
  await browser.close();
  await rm(harness, { recursive: true, force: true });
}
