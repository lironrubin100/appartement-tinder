import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import type { Database } from '../src/types/database';
test.use({ actionTimeout: 20_000 });

const accounts: {id:string;email:string;password:string}[] = JSON.parse(readFileSync(process.env.PROFILE_QA_MANIFEST ?? '.env.profile-qa.local','utf8'));
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const apiFor = () => createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function login(page:Page,index:number,path:string) {
  await page.goto(`/en/login?returnTo=${encodeURIComponent(path)}`);
  await page.getByLabel('Email',{exact:true}).fill(accounts[index].email);
  await page.getByLabel('Password',{exact:true}).fill(accounts[index].password);
  await page.getByRole('button',{name:'Sign in with email',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  await page.goto(path);
}
for (const [locale,index,viewport] of [['en',0,{width:390,height:844}],['he',1,{width:1280,height:900}]] as const) {
  test(`canonical draft, required completion, private preferences and edit (${locale})`,async ({browser})=>{
    test.setTimeout(90_000);
    const context = await browser.newContext({viewport}); const page = await context.newPage();
    const api=apiFor(); const en=locale==='en'; const prefix=en?'/en':'';
    const text=(english:string,hebrew:string)=>en?english:hebrew;
    try {
      expect((await api.auth.signInWithPassword(accounts[index])).error).toBeNull();
      await login(page,index,`${prefix}/onboarding`);
      console.log(`Profile ${locale}: authenticated intake loaded`);
      const choice=page.getByRole('button',{name:text('Yes, I’m looking for roommates','כן, אני מחפש/ת שותפים'),exact:true});
      if(await choice.isVisible()) await choice.click();
      const name=text('Full name (private)','שם מלא (פרטי)');
      await page.getByLabel(name,{exact:false}).fill(en?'Maya Canonical':'יעל הדגמה');
      console.log(`Profile ${locale}: resident form loaded`);
      await page.getByLabel(text('Birth date','תאריך לידה'),{exact:false}).fill('01012000');
      await page.getByRole('textbox',{name:text('A little about you (required)','קצת עליך (חובה)'),exact:true}).fill(text('Synthetic profile for a friendly shared home.','פרופיל הדגמה לשותפות נעימה.'));
      await page.getByRole('button',{name:text('Save and finish later','שמירה והמשך מאוחר יותר'),exact:true}).click();
      await expect(page.getByRole('status')).toHaveText(text('Details saved','הפרטים נשמרו'));
      await page.reload();
      console.log(`Profile ${locale}: draft saved and reloaded`);
      await expect(page.getByLabel(name,{exact:false})).toHaveValue(en?'Maya Canonical':'יעל הדגמה');
      await page.getByRole('button',{name:text('Continue','המשך'),exact:true}).click();
      await expect(page.locator('form [role="alert"]')).toBeVisible();
      const photo=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#44a89e';ctx.fillRect(0,0,80,80);return canvas.toDataURL('image/jpeg').split(',')[1];});
      await page.getByLabel(text('Upload photo','העלאת תמונה'),{exact:false}).setInputFiles({name:'synthetic-demo.jpg',mimeType:'image/jpeg',buffer:Buffer.from(photo,'base64')});
      await expect(page.getByRole('img',{name:text('Primary photo','תמונה ראשית'),exact:true})).toBeVisible();
      const labels=en?['Shared-space cleanliness','Sleep schedule','Social life and guests','Smoking habits']:['ניקיון במרחב המשותף','שגרת שינה','אירוח וחברה','הרגלי עישון'];
      for(let i=0;i<labels.length;i++)await page.getByRole('combobox',{name:labels[i],exact:true}).selectOption(['tidy_shared','regular','occasional','none'][i]);
      const facts=page.getByTestId('profile-facts');
      const disclosure=facts.getByLabel(text('Show this answer on my public profile','להציג תשובה זו בפרופיל הציבורי'),{exact:true});
      await expect(disclosure.first()).not.toBeChecked(); await disclosure.first().check();
      const prefs=page.getByTestId('profile-preferences'); await prefs.locator('summary').click();
      await prefs.getByLabel(text('Non-smoking is required','ללא עישון — תנאי הכרחי'),{exact:true}).check();
      await page.getByRole('button',{name:text('Continue','המשך'),exact:true}).click();
      await expect(page).not.toHaveURL(/onboarding/);
      await page.goto(`${prefix}/profile/edit`);
      await expect(page.getByLabel(name,{exact:false})).toHaveValue(en?'Maya Canonical':'יעל הדגמה');
      await expect(page.getByRole('combobox',{name:labels[0],exact:true})).toHaveValue('tidy_shared');
      await page.getByTestId('profile-preferences').locator('summary').click();
      await expect(page.getByLabel(text('Non-smoking is required','ללא עישון — תנאי הכרחי'),{exact:true})).toBeChecked();
      await page.getByRole('textbox',{name:text('A little about you (required)','קצת עליך (חובה)'),exact:true}).fill(text('Updated synthetic roommate bio.','ביו מעודכן לפרופיל ההדגמה.'));
      await page.getByRole('button',{name:text('Save profile','שמירת הפרופיל'),exact:true}).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/profile$`));
      const publicProfile=await api.from('profiles_public').select('*').eq('id',accounts[index].id).single();
      expect(publicProfile.error).toBeNull();
      expect(publicProfile.data?.name).toBe(en?'Maya C.':'יעל ה.');
      expect(publicProfile.data?.lifestyle_facts).toEqual({cleanliness:'tidy_shared'});
      expect(publicProfile.data?.gender).toBeNull();
      const privatePrefs=await api.from('profile_lifestyle_private').select('preferences').eq('profile_id',accounts[index].id).single();
      expect(privatePrefs.data?.preferences).toMatchObject({strict_non_smoking:true});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    } finally {await context.close();await api.auth.signOut();}
  });
}

test('lister adult declaration, short intake and private account edit',async({page})=>{
  test.setTimeout(120_000); await page.setViewportSize({width:390,height:844});
  await login(page,Number(process.env.PROFILE_QA_LISTER_INDEX ?? 2),'/en/onboarding');
  const choice=page.getByRole('button',{name:'No, I’m posting for others',exact:true});
  if(await choice.isVisible())await choice.click();
  await page.getByLabel('Full name',{exact:true}).fill('Dana Demo');
  await page.getByLabel('Contact phone',{exact:true}).fill('0500000000');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('form [role="alert"]')).toContainText('at least 18');
  await expect(page.getByTestId('profile-facts')).toHaveCount(0);
  await page.getByLabel('I confirm I am at least 18 years old',{exact:true}).check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page).not.toHaveURL(/onboarding/);
  await page.goto('/en/profile/edit');
  await page.getByLabel('Full name (private)',{exact:false}).fill('Dana Updated');
  await page.getByRole('button',{name:/^Save (profile|contact details)$/}).click();
  await expect(page.getByRole('status')).toHaveText('Details saved');
  await page.reload();
  await expect(page.getByLabel('Full name (private)',{exact:false})).toHaveValue('Dana Updated');
});
