'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';

type PendingLike = {
  id: string;
  message: string;
  ref_tag: string | null;
  created_at: string;
  sender: { id: string | null; name: string | null; photo_url: string | null };
};

function initials(name: string | null) {
  return (name ?? 'משתמש').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function PendingLikes({ likes }: { likes: PendingLike[] }) {
  const router = useRouter();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acceptLike(likeId: string) {
    setAcceptingId(likeId);
    setError(null);
    const { data: conversationId, error: rpcError } = await createClient().rpc('accept_like', { p_like_id: likeId });
    if (rpcError || !conversationId) {
      setError('לא הצלחנו לפתוח את השיחה. נסו שוב.');
      setAcceptingId(null);
      return;
    }
    router.push(`/chats/${conversationId}`);
    router.refresh();
  }

  if (!likes.length) return null;

  return (
    <section className="border-b border-card-border bg-orange-soft px-4 py-4">
      <h2 className="font-semibold text-ink mb-3">לייקים נכנסים</h2>
      <div className="space-y-3">
        {likes.map((like) => (
          <article key={like.id} className="bg-white rounded-shutaf-md border border-card-border p-3 flex items-center gap-3">
            <Avatar initials={initials(like.sender.name)} src={like.sender.photo_url} alt={like.sender.name ?? 'משתמש'} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{like.sender.name ?? 'משתמש'}</p>
              <p className="text-sm text-body-text line-clamp-2">{like.message}</p>
            </div>
            <Button type="button" size="sm" onClick={() => acceptLike(like.id)} disabled={acceptingId === like.id}>
              {acceptingId === like.id ? 'פותחים…' : 'קבלה'}
            </Button>
          </article>
        ))}
      </div>
      {error && <p className="text-sm text-error mt-3">{error}</p>}
    </section>
  );
}
