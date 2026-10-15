'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button } from '@/components/ui';
import { localePath, type Locale } from '@/utils/navigation';
import { createClient } from '@/utils/supabase/client';
import { localizedTags } from '@/utils/profileTags';

type PendingLike = {
  id: string;
  groupName?: string;
  groupPolicy?: string;
  groupId?: string;
  votes?: number;
  canApprove?: boolean;
  message: string;
  ref_tag: string | null;
  created_at: string;
  sender: { id: string | null; name: string | null; photo_url: string | null };
};

function initials(name: string | null) {
  return (name ?? 'משתמש')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function PendingLikes({
  likes,
  locale = 'he',
}: {
  likes: PendingLike[];
  locale?: Locale;
}) {
  const en = locale === 'en';
  const router = useRouter();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acceptLike(like: PendingLike) {
    setAcceptingId(like.id);
    setError(null);
    const { data: conversationId, error: rpcError } = like.groupId
      ? await createClient().rpc('decide_group_introduction', {
          p_like: like.id,
        })
      : await createClient().rpc('accept_like', { p_like_id: like.id });
    if (rpcError) {
      setError(
        en
          ? 'Could not accept. Check group capacity and try again.'
          : 'לא הצלחנו לאשר. בדקו מקום בקבוצה ונסו שוב.'
      );
      setAcceptingId(null);
      return;
    }
    setAcceptingId(null);
    if (conversationId)
      router.push(localePath(`/chats/${conversationId}`, locale));
    else
      setError(
        en
          ? 'Your vote is saved. Waiting for a majority.'
          : 'ההצבעה נשמרה. ממתינים לרוב.'
      );
    router.refresh();
  }

  if (!likes.length) return null;

  return (
    <section className="border-b border-card-border bg-orange-soft px-4 py-4">
      <h2 className="font-semibold text-ink mb-3">
        {en ? 'Introductions' : 'היכרויות חדשות'}
      </h2>
      <div className="space-y-3">
        {likes.map((like) => (
          <article
            key={like.id}
            className="bg-white rounded-shutaf-md border border-card-border p-3 flex items-center gap-3"
          >
            <Avatar
              initials={initials(like.sender.name)}
              src={like.sender.photo_url}
              alt={like.sender.name ?? 'משתמש'}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">
                {like.sender.name ?? 'Shutaf'}
                {like.groupName ? ` → ${like.groupName}` : ''}
              </p>
              {like.ref_tag && (
                <p className="text-xs text-muted-text">
                  {(() => {
                    const [, key, value] = like.ref_tag.split(':');
                    const category = localizedTags(locale).find(
                      (c) => c.key === key
                    );
                    const label = category?.options.find(
                      (o) => o.value === value
                    )?.label;
                    return label
                      ? `${category?.label}: ${label}`
                      : en
                        ? 'Responding to your profile'
                        : 'בתגובה לפרופיל שלך';
                  })()}
                </p>
              )}
              {like.groupPolicy === 'majority' && (
                <p className="text-xs text-muted-text">
                  {like.votes ?? 0} {en ? 'votes so far' : 'הצבעות עד כה'}
                </p>
              )}
              <p className="text-sm text-body-text line-clamp-2">
                {like.message}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => acceptLike(like)}
              disabled={acceptingId !== null || like.canApprove === false}
            >
              {acceptingId === like.id
                ? en
                  ? 'Saving…'
                  : 'שומרים…'
                : like.groupPolicy === 'majority'
                  ? en
                    ? 'Vote to accept'
                    : 'הצבעה בעד'
                  : en
                    ? 'Accept'
                    : 'קבלה'}
            </Button>
          </article>
        ))}
      </div>
      {error && <p className="text-sm text-error mt-3">{error}</p>}
    </section>
  );
}
