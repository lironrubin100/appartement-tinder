'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendConversationMessage } from '@/lib/listings/inquiries';
import { Button } from '@/components/ui';

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await sendConversationMessage(conversationId, body);
    setSending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody('');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="border-t border-card-border bg-white p-4">
      <label htmlFor="message" className="sr-only">הודעה חדשה</label>
      <div className="flex gap-2">
        <textarea
          id="message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="כתבו הודעה…"
          className="min-w-0 flex-1 resize-none rounded-shutaf-md border border-card-border px-3 py-2 text-ink focus:border-orange focus:outline-none"
        />
        <Button type="submit" disabled={sending}>{sending ? 'שולח…' : 'שליחה'}</Button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
    </form>
  );
}
