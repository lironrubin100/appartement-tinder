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
  const [{ data: lifestyle }, { data: privateLifestyle }, { data: photos }] = await Promise.all([
    supabase.from('profile_lifestyle').select('*').eq('profile_id', user.id).maybeSingle(),
    supabase.from('profile_lifestyle_private').select('*').eq('profile_id', user.id).maybeSingle(),
    supabase.from('profile_photos').select('*').eq('profile_id', user.id).order('display_order').order('id'),
  ]);
  return (
    <ResidentOnboarding
      profile={profile}
      privateProfile={privateProfile}
      lifestyle={lifestyle}
      privateLifestyle={privateLifestyle}
      initialPhotos={photos ?? []}
      returnTo={returnTo}
      locale={locale}
    />
  );
}
