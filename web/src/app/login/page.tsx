'use client';

import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-page-bg px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-ink">Shutaf</h1>
        <p className="text-body-text">התחברות עם חשבון גוגל כדי להמשיך</p>
        <Button variant="primary" size="lg" className="w-full" onClick={signInWithGoogle}>
          המשך עם Google
        </Button>
      </div>
    </div>
  );
}
