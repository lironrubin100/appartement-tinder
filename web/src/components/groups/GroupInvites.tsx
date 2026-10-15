'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { localePath, type Locale } from '@/utils/navigation';

export function GroupInvites({
  invites,
  locale,
}: {
  invites: { id: string; group_name: string; inviter_name: string }[];
  locale: Locale;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState('');
  const en = locale === 'en';
  if (!invites.length) return null;
  return (
    <section className="space-y-3 bg-teal-soft p-5">
      <h2 className="font-bold">
        {en ? 'Group invitations' : 'הזמנות לקבוצות'}
      </h2>
      {invites.map((i) => (
        <article key={i.id} className="rounded-xl bg-white p-4 space-y-3">
          <p>
            {i.group_name} · {i.inviter_name}
          </p>
          <p className="text-sm text-muted-text">
            {en
              ? 'Join to see new messages only.'
              : 'לאחר הצטרפות רואים רק הודעות חדשות.'}
          </p>
          <div className="flex gap-2">
            {[true, false].map((accept) => (
              <Button
                key={String(accept)}
                variant={accept ? 'primary' : 'secondary'}
                disabled={busy !== null}
                onClick={async () => {
                  setBusy(i.id);
                  setError('');
                  const { data, error: e } = await createClient().rpc(
                    'respond_group_invite',
                    { p_invite: i.id, p_accept: accept }
                  );
                  setBusy(null);
                  if (e) {
                    setError(
                      en
                        ? 'Could not join. The group may be full. Please retry.'
                        : 'לא הצלחנו להצטרף. ייתכן שהקבוצה מלאה. נסו שוב.'
                    );
                    return;
                  }
                  if (data) router.push(localePath(`/chats/${data}`, locale));
                  router.refresh();
                }}
              >
                {accept
                  ? en
                    ? 'Join group'
                    : 'הצטרפות'
                  : en
                    ? 'Decline'
                    : 'לא תודה'}
              </Button>
            ))}
          </div>
        </article>
      ))}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
    </section>
  );
}
