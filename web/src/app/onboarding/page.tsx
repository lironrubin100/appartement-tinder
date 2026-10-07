import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { ResidentOnboarding } from './resident-onboarding';

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, onboarded')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarded) redirect('/');

  return <ResidentOnboarding initialName={profile?.name ?? ''} />;
}
