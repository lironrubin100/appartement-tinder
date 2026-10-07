import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode, onboarded, default_home')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarded) redirect('/onboarding');

  // A4: residents default to Discover, with Map available as their saved choice.
  // D16: Listers use their own listings dashboard.
  if (profile.mode === 'lister') redirect('/my-listings');
  redirect(profile.default_home === 'map' ? '/map' : '/discover');
}
