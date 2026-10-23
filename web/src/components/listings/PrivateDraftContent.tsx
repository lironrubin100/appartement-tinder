'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Locale } from '@/lib/listings/text';

type Access = { account: string | null; pending: boolean; failed?: boolean };
// Unknown network failures hide a mounted editor. Only proven identity changes
// discard its input; a successful same-account retry reveals it again.
export function PrivateDraftContent({ accountId, locale, children, preserveInput = false }: {
  accountId: string; locale: Locale; children: ReactNode; preserveInput?: boolean;
}) {
  const [access, setAccess] = useState<Access>({ account: null, pending: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const client = createClient();
    let active = true, generation = 0;
    const check = async () => {
      if (!active) return;
      const current = ++generation;
      try {
        const { data, error } = await client.auth.getUser();
        if (!active || generation !== current) return;
        if (error) {
          const denied = error.status === 401 || error.status === 403 || error.name === 'AuthSessionMissingError';
          setAccess(previous => ({ account: denied ? null : previous.account, pending: false, failed: true }));
        } else setAccess({ account: data.user?.id ?? null, pending: false });
      } catch {
        if (active && generation === current) setAccess(previous => ({ account: previous.account, pending: false, failed: true }));
      }
    };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      generation++;
      if (!active) return;
      setAccess(previous => ({ account: session?.user.id === accountId ? previous.account : null, pending: session?.user.id === accountId }));
      if (session?.user.id === accountId) setTimeout(() => { void check(); }, 0);
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') { setAccess(previous => ({ account: previous.account, pending: true })); void check(); }
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
  }, [accountId, retry]);
  const waiting = access.pending || access.failed;
  if (access.account !== accountId || waiting && !preserveInput) return <div className="text-sm text-muted-text">
    <p role="status">{access.pending
      ? (locale === 'en' ? 'Verifying access to saved drafts…' : 'בודקים גישה לטיוטות השמורות…')
      : (locale === 'en' ? 'Access to drafts could not be verified. Reload to continue.' : 'לא הצלחנו לאמת גישה לטיוטות. יש לטעון מחדש כדי להמשיך.')}</p>
    {!access.pending && <a href={locale === 'en' ? '/en/my-listings' : '/my-listings'}
      className="mt-3 inline-block rounded-xl border border-card-border px-4 py-3 font-semibold text-teal">
      {locale === 'en' ? 'Reload' : 'טעינה מחדש'}</a>}
  </div>;
  return <>
    {waiting && <div className="p-4 text-sm text-muted-text"><p role="status">{access.pending
      ? (locale === 'en' ? 'Verifying access…' : 'בודקים גישה…')
      : (locale === 'en' ? 'Could not verify access. Your edits are kept here.' : 'לא הצלחנו לאמת גישה. השינויים שלך נשמרים כאן.')}</p>
      {access.failed && <button type="button" className="mt-3 rounded-xl border border-card-border px-4 py-3 text-teal"
        onClick={() => { setAccess(previous => ({ account: previous.account, pending: true })); setRetry(value => value + 1); }}>{locale === 'en' ? 'Retry verification' : 'ניסיון אימות נוסף'}</button>}
    </div>}
    <div hidden={Boolean(waiting)}>{children}</div>
  </>;
}
