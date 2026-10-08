'use client';

import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';

export default function GoogleSignInButton() {
  async function signInWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      // The user remains on the sign-in screen and can retry; we avoid
      // persisting any Google credentials in the app.
      console.error('Google sign-in could not be started:', error.message);
    }
  }

  return (
    <Button variant="primary" size="lg" className="w-full" onClick={signInWithGoogle}>
      המשך עם Google
    </Button>
  );
}
