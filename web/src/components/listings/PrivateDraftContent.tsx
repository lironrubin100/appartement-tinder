'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Locale } from '@/lib/listings/text';

// Recheck before revealing cached content and clear on account events.
export function PrivateDraftContent({ accountId, locale, children }: {
  accountId: string; locale: Locale; children: ReactNode;
}) {
  const [access, setAccess] = useState<{ account: string | null; pending: boolean }>({ account: null, pending: true });
  useEffect(() => {
    const client = createClient();
    let active = true, generation = 0;
    const check = async () => {
      if (!active) return;
      const current = ++generation;
      try {
        const { data, error } = await client.auth.getUser();
        if (active && generation === current) setAccess({ account: error ? null : data.user?.id ?? null, pending: false });
      } catch {
        if (active && generation === current) setAccess({ account: null, pending: false });
      }
    };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      generation++;
      if (!active) return;
      setAccess({ account: null, pending: session?.user.id === accountId });
      // Run outside the synchronous auth callback to avoid its session lock.
      if (session?.user.id === accountId) setTimeout(() => { void check(); }, 0);
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') { setAccess({ account: null, pending: true }); void check(); }
    };
    void check();
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false; generation++;
      subscription.unsubscribe();
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [accountId]);
  if (access.account !== accountId) return <div className="text-sm text-muted-text">
    <p role="status">{access.pending
      ? (locale === 'en' ? 'Verifying access to saved drafts…' : 'בודקים גישה לטיוטות השמורות…')
      : (locale === 'en' ? 'Access to drafts could not be verified. Reload to continue.' : 'לא הצלחנו לאמת גישה לטיוטות. יש לטעון מחדש כדי להמשיך.')}</p>
    {!access.pending && <a href={locale === 'en' ? '/en/my-listings' : '/my-listings'}
      className="mt-3 inline-block rounded-xl border border-card-border px-4 py-3 font-semibold text-teal">
      {locale === 'en' ? 'Reload' : 'טעינה מחדש'}</a>}
  </div>;
  return children;
}
