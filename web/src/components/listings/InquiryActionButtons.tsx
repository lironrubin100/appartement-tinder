'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptListingInquiry, declineListingInquiry } from '@/lib/listings/inquiries';
import { Button } from '@/components/ui';

export function InquiryActionButtons({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setPending('accept');
    const result = await acceptListingInquiry(inquiryId);
    setPending(null);
    if (!result.ok || !result.conversationId) {
      setError(result.ok ? 'לא הצלחנו לפתוח צ׳אט.' : result.message);
      return;
    }
    router.push(`/chats/${result.conversationId}`);
  }

  async function decline() {
    setError(null);
    setPending('decline');
    const result = await declineListingInquiry(inquiryId);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={accept} disabled={pending !== null}>
        {pending === 'accept' ? 'מאשר…' : 'אישור ופתיחת צ׳אט'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={decline} disabled={pending !== null}>
        {pending === 'decline' ? 'דוחה…' : 'דחייה'}
      </Button>
      {error && <p role="alert" className="w-full text-sm text-error">{error}</p>}
    </div>
  );
}
