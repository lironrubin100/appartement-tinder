'use client';
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { createListingInquiry } from '@/lib/listings/inquiries';
import { createClient } from '@/utils/supabase/client';
import type { Locale } from '@/utils/navigation';
import { localePath } from '@/utils/navigation';

type RequestViewingProps = {
  apartmentId: string;
  pending: boolean;
  locale: Locale;
};

export function RequestViewing(props: RequestViewingProps) {
  return <InquiryForm key={props.apartmentId} {...props} />;
}

function InquiryForm({ apartmentId, pending, locale }: RequestViewingProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'send' | 'account' | null>(null);
  const [intro, setIntro] = useState('');
  const [attempt, setAttempt] = useState<{ actorId: string; intro: string } | null>(null);
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);
  const fieldId = useId();
  const router = useRouter();
  const en = locale === 'en';
  const count = Array.from(intro).length;
  const overLimit = count > 500;
  return (
    <div className="mt-5">
      {pending || sent ? (
        <p role="status" className="rounded-xl bg-orange-soft p-4">
          {en
            ? 'Your inquiry was sent. Waiting for the owner to accept.'
            : 'הפנייה נשלחה. ממתינים לאישור בעל המודעה.'}
        </p>
      ) : (
        <form
          action={async () => {
            if (inFlight.current || overLimit) return;
            inFlight.current = true;
            setBusy(true);
            setError(null);
            // A lost response may follow a committed inquiry. Every retry must
            // keep the same introduction and session/listing identity.
            try {
              let snapshot = attempt;
              if (!snapshot) {
                const { data: { user }, error: authError } = await createClient().auth.getUser();
                if (authError || !user) { setError('send'); return; }
                snapshot = { actorId: user.id, intro };
                setAttempt(snapshot);
              }
              const result = await createListingInquiry(apartmentId, snapshot.intro, snapshot.actorId);
              if (result.ok) {
                setSent(true);
                if (result.conversationId) router.push(localePath(`/chats/${result.conversationId}`, locale));
                else router.refresh();
              } else setError(result.code === 'ACCOUNT_CHANGED' ? 'account' : 'send');
            } catch {
              setError('send');
            } finally {
              inFlight.current = false;
              setBusy(false);
            }
          }}
          aria-busy={busy}
          className="space-y-3"
        >
          <label htmlFor={fieldId} className="block font-semibold">
            {en ? 'Opening message (optional)' : 'הודעת פתיחה (לא חובה)'}
          </label>
          <textarea
            id={fieldId}
            name="intro"
            rows={4}
            value={intro}
            onChange={event => { if (attempt === null) setIntro(event.target.value); }}
            readOnly={busy || attempt !== null}
            aria-invalid={overLimit}
            aria-describedby={`${fieldId}-hint ${fieldId}-count${error ? ` ${fieldId}-error` : ''}`}
            className="w-full resize-y rounded-xl border border-card-border bg-white p-3 text-ink read-only:bg-neutral-bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          />
          <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
            <p id={`${fieldId}-hint`} className="text-muted-text">
              {attempt !== null
                ? en ? 'Retrying sends this same message.' : 'ניסיון חוזר ישלח את אותה הודעה.'
                : en ? 'Up to 500 characters. Shared with the listing owner.' : 'עד 500 תווים. ההודעה תוצג לבעל המודעה.'}
            </p>
            <span id={`${fieldId}-count`} dir="ltr" className={overLimit ? 'text-error' : 'text-muted-text'}>
              {count} / 500
            </span>
          </div>
          {overLimit && <p role="alert" className="text-error">
            {en ? 'Keep your message within 500 characters.' : 'יש לקצר את ההודעה לעד 500 תווים.'}
          </p>}
          <Button type="submit" disabled={busy || overLimit || error === 'account'}>
            {busy
              ? en ? 'Sending…' : 'שולחים…'
              : en ? 'Request a viewing' : 'שליחת פנייה לבעל המודעה'}
          </Button>
        </form>
      )}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="mt-2 text-error">
          {error === 'account'
            ? en ? 'Your account changed. Refresh this page before sending again.' : 'החשבון השתנה. רעננו את העמוד לפני שליחה נוספת.'
            : en
              ? 'Could not confirm sending. Your message is kept for retry. The listing may no longer be available.'
              : 'לא הצלחנו לאשר את השליחה. ההודעה נשמרה לניסיון חוזר. ייתכן שהמודעה אינה זמינה.'}
        </p>
      )}
    </div>
  );
}
