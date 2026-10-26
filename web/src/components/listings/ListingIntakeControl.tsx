'use client';

import { useState, useTransition } from 'react';
import { setOwnedListingIntake } from '@/app/(main)/my-listings/actions';
import type { Locale } from '@/lib/listings/text';

export function ListingIntakeControl({ listingId, open, listingAvailable, locale }: {
  listingId: string; open: boolean; listingAvailable: boolean; locale: Locale;
}) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function change() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await setOwnedListingIntake(listingId, !open);
        if (result.error) {
          setError(result.error === 'AUTH_REQUIRED'
            ? t('יש להתחבר מחדש כדי לעדכן קבלת פניות.', 'Sign in again to update inquiry intake.')
            : t('לא הצלחנו לעדכן קבלת פניות. נסו שוב.', 'Could not update inquiry intake. Please retry.'));
        } else setSaved(true);
      } catch {
        setError(t('לא הצלחנו לעדכן קבלת פניות. נסו שוב.', 'Could not update inquiry intake. Please retry.'));
      }
    });
  }

  return (
    <section className="mt-4 space-y-3 border-t border-card-border pt-4" aria-labelledby={`listing-intake-${listingId}`} aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id={`listing-intake-${listingId}`} className="font-semibold text-ink">{t('קבלת פניות', 'Inquiry intake')}</h3>
          <p className="text-sm text-muted-text">{open ? t('קבלת פניות מופעלת', 'Inquiry intake enabled') : t('קבלת פניות מושהית', 'Inquiry intake paused')}</p>
        </div>
        <button type="button" disabled={pending} onClick={change}
          className="min-h-11 rounded-xl border border-card-border bg-white px-3 py-2 text-sm font-semibold text-ink disabled:cursor-wait disabled:opacity-60">
          {open ? t('עצירת פניות', 'Pause inquiries') : t('חידוש פניות', 'Resume inquiries')}
        </button>
      </div>
      {open && !listingAvailable && <p className="text-sm text-muted-text">
        {t('פניות חדשות יתאפשרו רק כשהמודעה פעילה ויש בה חדר פנוי.', 'New inquiries are only available when the listing is active and has an available room.')}
      </p>}
      <p className="text-sm text-muted-text">
        {t('שיחות קיימות נשמרות. עצירה אינה משנה את זמינות החדרים; פניות ממתינות ידרשו אישור מחדש של הפונה לאחר חידוש.', 'Existing chats remain. Pausing does not change room availability; pending inquiries require requester reconfirmation after resuming.')}
      </p>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {pending ? <p role="status" className="text-sm text-muted-text">{t('מעדכנים קבלת פניות…', 'Updating inquiry intake…')}</p>
        : saved && !error && <p role="status" className="text-sm text-teal">{t('מצב קבלת הפניות נשמר.', 'Inquiry intake setting saved.')}</p>}
    </section>
  );
}
