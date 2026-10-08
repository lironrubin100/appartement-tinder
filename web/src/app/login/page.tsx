import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import GoogleSignInButton from './GoogleSignInButton';

export default async function LoginPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A remembered browser session should never make someone sign in again just
  // because they revisit a bookmarked /login URL.
  if (user) redirect('/');

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-page-bg px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-ink">Shutaf</h1>
        <p className="text-body-text">התחברות עם חשבון גוגל כדי להמשיך</p>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
