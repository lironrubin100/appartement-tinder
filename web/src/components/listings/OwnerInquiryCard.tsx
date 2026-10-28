'use client';

import Link from 'next/link';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { localePath, type Locale } from '@/utils/navigation';
import type { OwnerInboxResult, OwnerInquiryItem, OwnerInquiryViewed } from '@/lib/listings/owner-inbox';

type Props = {
  inquiry: OwnerInquiryItem;
  locale: Locale;
  onView?: (inquiryId: string) => Promise<OwnerInboxResult<OwnerInquiryViewed>>;
  actions?: ReactNode;
};

export function OwnerInquiryCard(props: Props) {
  // A reused list position must never inherit another inquiry's disclosure,
  // successful view acknowledgement or retry state.
  return <InquiryCardBody key={props.inquiry.id} {...props} />;
}

function InquiryCardBody({ inquiry, locale, onView, actions }: Props) {
  const en = locale === 'en';
  const [open, setOpen] = useState(false);
  const [viewConfirmed, setViewConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const headingId = useId(), detailsId = useId();
  const isNew = inquiry.is_new && !viewConfirmed;
  const name = inquiry.requester?.name || (en ? 'Profile unavailable' : 'הפרופיל אינו זמין');
  const statuses = {
    pending: en ? 'Pending' : 'ממתינה',
    accepted: en ? 'Accepted' : 'אושרה',
    declined: en ? 'Declined' : 'נדחתה',
    withdrawn: en ? 'Withdrawn by requester' : 'בוטלה על ידי הפונה',
    unavailable: en ? 'Unavailable' : 'לא זמינה',
  };
  const date = new Intl.DateTimeFormat(en ? 'en-GB' : 'he-IL', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem',
  }).format(new Date(inquiry.created_at));

  async function markViewed() {
    if (!onView || !isNew || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(false);
    try {
      const result = await onView(inquiry.id);
      if (result.ok && result.data.inquiry_id === inquiry.id && result.data.is_new === false && result.data.viewed_at) setViewConfirmed(true);
      else setError(true);
    } catch { setError(true); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return (
    <article aria-labelledby={headingId} data-inquiry-id={inquiry.id} dir={en ? 'ltr' : 'rtl'} className="min-w-0 rounded-2xl border border-card-border bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar src={inquiry.requester?.photo_url} alt={name} initials={Array.from(name).slice(0, 1).join('')}
          verified={inquiry.requester?.public_badges.includes('student_verified')} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="break-words font-semibold text-ink"><bdi>{name}</bdi></h3>
          <Link href={localePath(`/listings/${inquiry.listing_id}`, locale)} className="mt-1 block break-words py-1 text-sm text-teal-hover underline">{inquiry.listing_title}</Link>
          <time dateTime={inquiry.created_at} className="mt-1 block text-sm text-body-text"><bdi>{date}</bdi></time>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label={en ? 'Inquiry status' : 'מצב הפנייה'}>
        <Badge style={{ color: 'var(--color-ink)' }} variant={inquiry.state === 'accepted' ? 'success' : inquiry.state === 'declined' ? 'error' : 'default'}>{statuses[inquiry.state]}</Badge>
        {isNew && <Badge style={{ color: 'var(--color-ink)' }}>{en ? 'New' : 'חדש'}</Badge>}
      </div>
      {inquiry.state === 'unavailable' && <p className="mt-3 text-sm text-body-text">{en ? 'This inquiry is currently unavailable.' : 'הפנייה אינה זמינה כרגע.'}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" className="min-h-11" aria-expanded={open} aria-controls={detailsId}
          onClick={() => { const opening = !open; setOpen(opening); if (opening) void markViewed(); }}>
          {open ? en ? 'Hide inquiry details' : 'הסתרת פרטי הפנייה' : en ? 'View inquiry details' : 'פתיחת פרטי הפנייה'}
        </Button>
        {inquiry.state === 'accepted' && inquiry.conversation_id && <Link href={localePath(`/chats/${inquiry.conversation_id}`, locale)} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-hover underline">{en ? 'Open conversation' : 'פתיחת השיחה'}</Link>}
      </div>
      {open && <div id={detailsId} role="region" aria-label={en ? 'Inquiry details' : 'פרטי הפנייה'} className="mt-4 space-y-3 border-t border-card-border pt-4">
        <p className="text-sm font-semibold text-ink">{en ? 'Opening message' : 'הודעת פתיחה'}</p>
        <p className="whitespace-pre-wrap break-words text-body-text">{inquiry.intro || (en ? 'No opening message was sent.' : 'לא נשלחה הודעת פתיחה.')}</p>
        {busy && <p role="status" className="text-sm text-body-text">{en ? 'Saving viewed state…' : 'שומרים סימון צפייה…'}</p>}
        {error && <div className="space-y-2">
          <p role="alert" className="text-sm text-ink">{en ? 'Could not save the viewed state. You can retry.' : 'לא הצלחנו לשמור את סימון הצפייה. אפשר לנסות שוב.'}</p>
          <Button type="button" variant="secondary" size="sm" className="min-h-11" disabled={busy} onClick={() => void markViewed()}>{en ? 'Retry' : 'ניסיון חוזר'}</Button>
        </div>}
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>}
    </article>
  );
}
