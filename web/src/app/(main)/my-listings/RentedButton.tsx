'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markListingRented } from './actions';
import { listingError, type Locale } from '@/lib/listings/text';

export function RentedButton({ id, locale = 'he' }: { id: string; locale?: Locale }) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <div className="mt-3">
    {!confirming ? <button className="rounded-xl border border-card-border px-4 py-3 text-teal" onClick={() => setConfirming(true)}>{t('סימון כהושכרה', 'Mark rented')}</button> : <div>
      <p className="text-sm text-body-text">{t('הדירה הושכרה? המודעה תוסר מהדירות הזמינות.', 'Has the apartment been rented? It will be removed from available listings.')}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button disabled={pending} className="rounded-xl bg-orange px-4 py-3 text-white disabled:opacity-50" onClick={() => startTransition(async () => {
          setError(null);
          try { const result = await markListingRented(id); if (result.error) setError(listingError(result.error, locale)); else { setConfirming(false); router.refresh(); } }
          catch { setError(t('לא הצלחנו לעדכן. נסו שוב.', 'Could not update. Please retry.')); }
        })}>{pending ? t('מעדכנים…', 'Updating…') : t('כן, הדירה הושכרה', 'Yes, mark rented')}</button>
        <button disabled={pending} onClick={() => { setConfirming(false); setError(null); }} className="rounded-xl px-4 py-3 text-body-text">{t('ביטול', 'Cancel')}</button>
      </div>
    </div>}
    {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
  </div>;
}
