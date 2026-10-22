'use client';

import { useState } from 'react';
import { localePath, type Locale } from '@/utils/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { acceptListingInquiry } from '@/lib/listings/inquiries';

export function InquiryActionButtons({
  inquiryId,
  locale = 'he',
}: {
  inquiryId: string;
  locale?: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryMessage = locale === 'en' ? 'Could not accept the inquiry. Please retry.' : 'לא הצלחנו לאשר את הפנייה. נסו שוב.';
  async function accept() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await acceptListingInquiry(inquiryId);
      if (!result.ok || !result.conversationId) {
        setError(retryMessage);
        return;
      }
      router.push(localePath(`/chats/${result.conversationId}`, locale));
    } catch {
      setError(retryMessage);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm text-muted-text">{locale === 'en'
        ? 'Accepting opens a chat and gives the requester access to the exact address. It does not reserve a room.'
        : 'אישור הפנייה פותח צ׳אט ומעניק לפונה גישה לכתובת המדויקת. הוא אינו שומר חדר.'}</p>
      <Button type="button" size="sm" onClick={accept} disabled={pending}>
        {pending
          ? locale === 'en'
            ? 'Accepting…'
            : 'מאשר…'
          : locale === 'en'
            ? 'Accept and open chat'
            : 'אישור ופתיחת צ׳אט'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
