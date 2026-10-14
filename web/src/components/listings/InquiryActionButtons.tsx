'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { acceptListingInquiry } from '@/lib/listings/inquiries';

export function InquiryActionButtons({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setError(null); setPending(true);
    const result = await acceptListingInquiry(inquiryId);
    setPending(false);
    if (!result.ok || !result.conversationId) { setError(result.ok ? 'לא הצלחנו לפתוח צ׳אט.' : result.message); return; }
    router.push(`/chats/${result.conversationId}`);
  }
  return <div className="mt-3"><Button type="button" size="sm" onClick={accept} disabled={pending}>{pending ? 'מאשר…' : 'אישור ופתיחת צ׳אט'}</Button>{error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}</div>;
}
