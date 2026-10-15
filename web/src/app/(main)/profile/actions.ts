'use server';

import { createServerClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { localePath } from '@/utils/navigation';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect(
    localePath(
      '/login',
      (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he'
    )
  );
}
