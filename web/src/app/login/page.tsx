import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import GoogleSignInButton from './GoogleSignInButton';
import EmailPasswordForm from './EmailPasswordForm';
import { headers } from 'next/headers';
import { localePath, safeReturnTo } from '@/utils/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const locale =
    (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const en = locale === 'en';
  const returnTo = safeReturnTo(
    (await searchParams).returnTo,
    localePath('/', locale)
  );
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A remembered browser session should never make someone sign in again just
  // because they revisit a bookmarked /login URL.
  if (user) redirect(returnTo);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-page-bg px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-ink">Shutaf</h1>
        <p className="text-body-text">
          {en ? 'Sign in to continue' : 'התחברות כדי להמשיך'}
        </p>
        <EmailPasswordForm returnTo={returnTo} locale={locale} />
        <div className="flex items-center gap-3 text-xs text-muted-text">
          <span className="h-px flex-1 bg-card-border" />
          <span>{en ? 'or' : 'או'}</span>
          <span className="h-px flex-1 bg-card-border" />
        </div>
        <GoogleSignInButton returnTo={returnTo} locale={locale} />
        <Link href={localePath('/listings', locale)} className="inline-block text-teal underline">{en ? 'Browse apartments without an account' : 'צפייה בדירות ללא הרשמה'}</Link>
      </div>
    </div>
  );
}
