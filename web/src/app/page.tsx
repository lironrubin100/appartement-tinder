import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { localePath } from '@/utils/navigation';

export default async function Home() {
  const locale =
    (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(localePath('/login', locale));

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode, onboarded, default_home')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarded)
    redirect(localePath('/onboarding', locale));

  // A4: residents default to Discover, with Map available as their saved choice.
  // D16: Listers use their own listings dashboard.
  if (profile.mode === 'lister') redirect(localePath('/my-listings', locale));
  redirect(
    localePath(profile.default_home === 'map' ? '/map' : '/discover', locale)
  );
}
