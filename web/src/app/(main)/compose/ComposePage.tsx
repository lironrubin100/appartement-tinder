import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import ComposeForm from './ComposeForm';
import type { Locale } from '@/lib/listings/text';

export async function renderCompose(locale: Locale) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('phone')
    .eq('profile_id', user.id)
    .maybeSingle();

  return <ComposeForm locale={locale} hasPrivatePhone={Boolean(privateProfile?.phone?.trim())} />;
}
