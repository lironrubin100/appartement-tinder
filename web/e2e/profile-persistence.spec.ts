import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Repeatable deployed acceptance using this run's retained completed demos.
const accounts: {email:string;password:string}[] = JSON.parse(readFileSync('.env.profile-qa.local','utf8'));
test.use({ actionTimeout:20_000 });
for(const [locale,index] of [['en',0],['he',1]] as const) {
  test(`persisted private editor, startup choice and signout (${locale})`,async({page})=>{
    test.setTimeout(90_000); const en=locale==='en';const root=en?'/en':'';
    await page.setViewportSize(en?{width:390,height:844}:{width:1280,height:900});
    await page.goto(`${root}/profile/edit`);
    await expect(page).toHaveURL(new RegExp(`${root}/login\\?returnTo=`));
    await page.getByLabel(en?'Email':'כתובת מייל',{exact:true}).fill(accounts[index].email);
    await page.getByLabel(en?'Password':'סיסמה',{exact:true}).fill(accounts[index].password);
    await page.getByRole('button',{name:en?'Sign in with email':'התחברות עם מייל',exact:true}).click();
    await expect(page).toHaveURL(`${root}/profile/edit`);
    await expect(page.getByLabel(en?'Full name (private)':'שם מלא (פרטי)',{exact:false})).toHaveValue(en?'Maya Canonical':'יעל הדגמה');
    await expect(page.getByRole('combobox',{name:en?'Shared-space cleanliness':'ניקיון במרחב המשותף',exact:true})).toHaveValue('tidy_shared');
    await page.getByTestId('profile-preferences').locator('summary').click();
    await expect(page.getByLabel(en?'Non-smoking is required':'ללא עישון — תנאי הכרחי',{exact:true})).toBeChecked();
    await page.goto(`${root}/settings`);
    await page.locator('input[name="default-home"][value="map"]').check();
    await expect(page.getByRole('status')).toContainText(en?'saved':'נשמרה');
    await page.reload();
    await expect(page.locator('input[name="default-home"][value="map"]')).toBeChecked();
    await page.goto(root || '/');
    await expect(page).toHaveURL(`${root}/map`);
    await page.goto(`${root}/settings`);
    await page.locator('input[name="default-home"][value="discover"]').check();
    await expect(page.getByRole('status')).toContainText(en?'saved':'נשמרה');
    await page.getByRole('button',{name:en?/Sign out/:/התנתקות/}).click();
    await expect(page).toHaveURL(`${root}/login`);
    await page.goto(`${root}/profile/edit`);
    await expect(page).toHaveURL(new RegExp(`${root}/login\\?returnTo=`));
  });
}
test('retained lister private name and contact edit persists',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/en/profile/edit');
  await page.getByLabel('Email',{exact:true}).fill(accounts[2].email);
  await page.getByLabel('Password',{exact:true}).fill(accounts[2].password);
  await page.getByRole('button',{name:'Sign in with email',exact:true}).click();
  await expect(page).toHaveURL('/en/profile/edit');
  await expect(page.getByTestId('profile-facts')).toHaveCount(0);
  await page.getByLabel('Full name (private)',{exact:false}).fill('Dana Updated');
  await page.getByLabel('Private account phone',{exact:true}).fill('0500000000');
  await page.getByRole('button',{name:/^Save (profile|contact details)$/}).click();
  await expect(page.getByRole('status')).toHaveText('Details saved');
  await page.reload();
  await expect(page.getByLabel('Full name (private)',{exact:false})).toHaveValue('Dana Updated');
});
