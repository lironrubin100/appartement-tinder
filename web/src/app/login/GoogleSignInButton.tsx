'use client';

import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';
import { useState } from 'react';
import type { Locale } from '@/utils/navigation';

export default function GoogleSignInButton({
  returnTo = '/',
  locale = 'he',
}: {
  returnTo?: string;
  locale?: Locale;
}) {
  const [error, setError] = useState(false);
  async function signInWithGoogle() {
    setError(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}&locale=${locale}`,
      },
    });

    if (error) {
      // The user remains on the sign-in screen and can retry; we avoid
      // persisting any Google credentials in the app.
      setError(true);
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={signInWithGoogle}
      >
        {locale === 'en' ? 'Continue with Google' : 'המשך עם Google'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {locale === 'en'
            ? 'Could not start sign-in. Please try again.'
            : 'לא הצלחנו להתחיל התחברות. נסו שוב.'}
        </p>
      )}
    </div>
  );
}
