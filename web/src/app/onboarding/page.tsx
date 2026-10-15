import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { ResidentOnboarding } from './resident-onboarding';
import { headers } from 'next/headers';
import { authPath, localePath, safeReturnTo } from '@/utils/navigation';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const locale =
    (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const returnTo = safeReturnTo(
    (await searchParams).returnTo,
    localePath('/', locale)
  );
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(authPath('login', returnTo, locale));

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarded) redirect(returnTo);

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();
  return (
    <ResidentOnboarding
      profile={profile}
      privateProfile={privateProfile}
      returnTo={returnTo}
      locale={locale}
    />
  );
}
