import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

test('public canonical fact labels support a real trait-attached introduction',async({page})=>{
  test.setTimeout(120_000);
  const accounts:{id:string;email:string;password:string}[]=JSON.parse(readFileSync('.env.profile-qa.local','utf8'));
  const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
  const api=createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  expect((await api.auth.signInWithPassword(accounts[0])).error).toBeNull();
  try {
    // Only this run's disposable sender gains passes; other accounts are untouched.
    const candidates=await api.rpc('discover_individuals');expect(candidates.error).toBeNull();
    expect(candidates.data?.some(p=>p.id===accounts[1].id)).toBe(true);
    for(const person of candidates.data??[]) {
      if(person.id===accounts[1].id)break;
      expect((await api.rpc('pass_discovery',{p_target:person.id!,p_kind:'individual'})).error).toBeNull();
    }
    await page.goto('/en/login?returnTo=%2Fen%2Fdiscover');
    await page.getByLabel('Email',{exact:true}).fill(accounts[0].email);
    await page.getByLabel('Password',{exact:true}).fill(accounts[0].password);
    await page.getByRole('button',{name:'Sign in with email',exact:true}).click();
    await expect(page).toHaveURL('/en/discover');
    const article=page.getByRole('article');
    await expect(article).toContainText('יעל ה.');
    await expect(article).toContainText('Tidy shared spaces');
    await expect(article).not.toContainText('יעל הדגמה');
    await expect(article).not.toContainText('strict_non_smoking');
    await page.getByRole('button',{name:'Introduce yourself',exact:true}).click();
    const ref=`${accounts[1].id}:canonical.cleanliness:tidy_shared`;
    await page.getByRole('combobox',{name:'What caught your attention?',exact:true}).selectOption(ref);
    await page.getByRole('button',{name:'Send introduction',exact:true}).click();
    await expect(page.getByRole('combobox',{name:'What caught your attention?',exact:true})).toHaveCount(0);
    const stored=await api.from('likes').select('ref_tag').eq('from_user',accounts[0].id).eq('to_user',accounts[1].id).single();
    expect(stored.error).toBeNull();expect(stored.data?.ref_tag).toBe(ref);
  }finally{await api.auth.signOut();}
});
