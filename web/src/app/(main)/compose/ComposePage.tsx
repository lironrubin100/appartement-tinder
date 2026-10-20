import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import ComposeForm from './ComposeForm';
import type { Locale } from '@/lib/listings/text';

export async function renderCompose(locale: Locale) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode')
    .eq('id', user.id)
    .maybeSingle();
  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('phone')
    .eq('profile_id', user.id)
    .maybeSingle();

  return <ComposeForm key={user.id} accountId={user.id} locale={locale} requiresPrivatePhone={!profile || profile.mode === 'lister'} hasPrivatePhone={Boolean(privateProfile?.phone?.trim())} />;
}
