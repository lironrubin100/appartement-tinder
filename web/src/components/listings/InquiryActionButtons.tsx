'use client';

import { useRef, useState } from 'react';
import { localePath, type Locale } from '@/utils/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { acceptListingInquiry, declineListingInquiry } from '@/lib/listings/inquiries';
import type { OwnerInquiryState } from '@/lib/listings/owner-inbox';

type Props = { inquiryId: string; locale?: Locale; state?: OwnerInquiryState; onDeclined?: () => void };

export function InquiryActionButtons(props: Props) {
  return <InquiryActions key={props.inquiryId} {...props} />;
}

function InquiryActions({ inquiryId, locale = 'he', state = 'pending', onDeclined }: Props) {
  const router = useRouter(), en = locale === 'en';
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  if (declined) return <p role="status" className="text-sm text-ink">{en ? 'Inquiry declined.' : 'הפנייה נדחתה.'}</p>;
  if (state !== 'pending' && state !== 'unavailable') return null;

  async function act(action: 'accept' | 'decline') {
    if (inFlight.current) return;
    inFlight.current = true; setError(false); setPending(action);
    try {
      const result = await (action === 'accept' ? acceptListingInquiry(inquiryId) : declineListingInquiry(inquiryId));
      if (!result.ok || action === 'accept' && !result.conversationId) { setError(true); return; }
      if (action === 'accept') router.push(localePath(`/chats/${result.conversationId}`, locale));
      else { setDeclined(true); onDeclined?.(); router.refresh(); }
    } catch { setError(true); }
    finally { inFlight.current = false; setPending(null); }
  }

  return <div className="mt-3 min-w-0 space-y-2">
    {state === 'pending' && <p className="text-sm text-body-text">{en
      ? 'Accepting opens a chat and gives the requester access to the exact address. It does not reserve a room.'
      : 'אישור הפנייה פותח צ׳אט ומעניק לפונה גישה לכתובת המדויקת. הוא אינו שומר חדר.'}</p>}
    <div className="flex flex-wrap gap-3">
      {state === 'pending' && <Button type="button" size="sm" className="min-h-11" onClick={() => void act('accept')} disabled={pending !== null}>
        {pending === 'accept' ? en ? 'Accepting…' : 'מאשר…' : en ? 'Accept and open chat' : 'אישור ופתיחת צ׳אט'}
      </Button>}
      <Button type="button" variant="secondary" size="sm" className="min-h-11" onClick={() => void act('decline')} disabled={pending !== null}>
        {pending === 'decline' ? en ? 'Declining…' : 'דוחים…' : en ? 'Decline inquiry' : 'דחיית הפנייה'}
      </Button>
    </div>
    {error && <p role="alert" className="text-sm text-ink">{en ? 'Could not update the inquiry. Please retry.' : 'לא הצלחנו לעדכן את הפנייה. נסו שוב.'}</p>}
  </div>;
}
