'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { createListingInquiry } from '@/lib/listings/inquiries';
import type { Locale } from '@/utils/navigation';

export function RequestViewing({
  apartmentId,
  pending,
  locale,
}: {
  apartmentId: string;
  pending: boolean;
  locale: Locale;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const en = locale === 'en';
  return (
    <div className="mt-5">
      {pending ? (
        <p role="status" className="rounded-xl bg-orange-soft p-4">
          {en
            ? 'Your inquiry was sent. Waiting for the owner to accept.'
            : 'הפנייה נשלחה. ממתינים לאישור בעל המודעה.'}
        </p>
      ) : (
        <Button
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            setError(false);
            try {
              const result = await createListingInquiry(apartmentId);
              if (result.ok) router.refresh();
              else setError(true);
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? en
              ? 'Sending…'
              : 'שולחים…'
            : en
              ? 'Request a viewing'
              : 'שליחת פנייה לבעל המודעה'}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-error">
          {en
            ? 'Could not send. The listing may no longer be available. Please retry.'
            : 'לא הצלחנו לשלוח. ייתכן שהמודעה אינה זמינה. נסו שוב.'}
        </p>
      )}
    </div>
  );
}
