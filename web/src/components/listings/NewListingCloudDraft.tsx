'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createListingCloudDraft } from '@/lib/listings/draft-actions';
import { createClient } from '@/utils/supabase/client';
import { localePrefix, type Locale } from '@/lib/listings/text';

// Mounted intent only: rendering/prefetching GET /compose performs no write.
// Keep the receipt across ambiguous responses, never load a latest draft.
export function NewListingCloudDraft({ accountId, locale }: { accountId: string; locale: Locale }) {
  const router = useRouter();
  const [retry, setRetry] = useState(0), [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const key = 'shutaf-new-listing:' + accountId;
    void (async () => {
      try {
        const client = createClient();
        if ((await client.auth.getUser()).data.user?.id !== accountId) throw Error('AUTH_CHANGED');
        if (!active) return;
        const receipt = sessionStorage.getItem(key) || crypto.randomUUID();
        sessionStorage.setItem(key, receipt);
        const result = await createListingCloudDraft({ requestKey: receipt, expectedAccountId: accountId });
        if (!active) return;
        if (!result.ok || result.data.ownerId !== accountId || result.data.kind !== 'new') throw Error('UNAVAILABLE');
        if ((await client.auth.getUser()).data.user?.id !== accountId || !active) return;
        sessionStorage.removeItem(key);
        router.replace(localePrefix(locale) + '/compose?draft=' + result.data.id);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [accountId, locale, retry, router]);
  return <div className="mx-auto max-w-2xl p-6">
    <p role={failed ? 'alert' : 'status'}>{failed
      ? (locale === 'en' ? 'Could not start a new draft. Please retry.' : 'לא הצלחנו לפתוח טיוטה חדשה. נסו שוב.')
      : (locale === 'en' ? 'Starting a new draft…' : 'פותחים טיוטה חדשה…')}</p>
    {failed && <button className="mt-4 rounded-xl bg-orange px-4 py-3 font-semibold text-white"
      onClick={() => { setFailed(false); setRetry(value => value + 1); }}>{locale === 'en' ? 'Try again' : 'ניסיון נוסף'}</button>}
  </div>;
}
