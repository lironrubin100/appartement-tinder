import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { ComposerNavigation } from '@/components/navigation/ComposerNavigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { authPath, safeReturnTo } from '@/utils/navigation';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const returnTo = safeReturnTo(requestHeaders.get('x-shutaf-path'));
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(authPath('login', returnTo, locale));

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, mode')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarded)
    redirect(authPath('onboarding', returnTo, locale));

  const isLister = profile.mode === 'lister';
  const { data: privateProfile } = !isLister
    ? await supabase.from('profile_private').select('phone').eq('profile_id', user.id).maybeSingle()
    : { data: null };
  const en = (await headers()).get('x-shutaf-locale') === 'en';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content area */}
      <main className="flex-1 pb-24 md:pb-0">
        {isLister && (
          <div className="border-b border-card-border bg-white px-4 py-3">
            <nav className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-2" aria-label={en ? 'Lister navigation' : 'ניווט מפרסם'}>
              <Link href={en ? '/en/my-listings' : '/my-listings'} className="font-medium text-orange">
                {en ? 'My listings' : 'המודעות שלי'}
              </Link>
              <Link href={en ? '/en/discover' : '/discover'} className="font-medium text-teal">
                {en ? 'Browse people' : 'עיון באנשים'}
              </Link>
              <Link href={en ? '/en/map' : '/map'} className="font-medium text-teal">
                {en ? 'Map' : 'מפה'}
              </Link>
              <Link href={en ? '/en/chats' : '/chats'} className="font-medium text-teal">
                {en ? 'Chats' : "צ'אטים"}
              </Link>
            </nav>
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom navigation (fixed) */}
      {!isLister && <ComposerNavigation key={user.id} accountId={user.id} locale={locale} hasPrivatePhone={Boolean(privateProfile?.phone?.trim())} />}
    </div>
  );
}
