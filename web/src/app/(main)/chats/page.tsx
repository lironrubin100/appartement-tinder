import Link from 'next/link';
import { Avatar } from '@/components/ui';
import { createServerClient } from '@/utils/supabase/server';
import PendingLikes from './PendingLikes';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatTimestamp(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default async function ChatsPage() {
  const supabase = await createServerClient();
  const [{ data: conversations, error }, { data: { user } }] = await Promise.all([
    supabase.rpc('list_chat_inbox'),
    supabase.auth.getUser(),
  ]);
  if (error) console.error('Could not load chat inbox:', error.message);
  const { data: likes } = user
    ? await supabase.from('likes').select('id, from_user, message, ref_tag, created_at').eq('to_user', user.id).order('created_at', { ascending: false })
    : { data: [] };
  const senderIds = [...new Set((likes ?? []).map((like) => like.from_user))];
  const { data: senders } = senderIds.length
    ? await supabase.from('profiles_public').select('id, name, photo_url').in('id', senderIds)
    : { data: [] };
  const sendersById = new Map((senders ?? []).map((sender) => [sender.id, sender]));
  const pendingLikes = (likes ?? []).flatMap((like) => {
    const sender = sendersById.get(like.from_user);
    return sender ? [{ ...like, sender }] : [];
  });

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        <div className="border-b border-card-border px-6 py-8 sticky top-0 bg-white z-10">
          <h1 className="text-3xl font-bold text-ink">צ׳אטים</h1>
        </div>
        <PendingLikes likes={pendingLikes} />
        {!conversations?.length ? (
          <div className="px-6 py-16 text-center text-muted-text">
            <p className="font-medium text-ink mb-2">עדיין אין לך צ׳אטים</p>
            <p className="text-sm">כשמישהו יקבל את הלייק שלך, השיחה תופיע כאן.</p>
          </div>
        ) : <div className="divide-y divide-card-border">
          {conversations.map((conversation) => (
            <Link key={conversation.conversation_id} href={`/chats/${conversation.conversation_id}`} className="w-full px-4 py-4 hover:bg-neutral-bg-soft transition-colors text-start flex items-center gap-4">
              <Avatar initials={initials(conversation.display_name)} src={conversation.photo_url} alt={conversation.display_name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-3">
                  <h2 className="font-semibold text-ink truncate">{conversation.display_name}</h2>
                  <span className="text-xs text-muted-text whitespace-nowrap">{formatTimestamp(conversation.last_message_at)}</span>
                </div>
                <p className="text-sm text-muted-text truncate">{conversation.last_message_body || 'התחילו שיחה'}</p>
              </div>
              {conversation.unread_count > 0 && <div className="w-6 h-6 rounded-full bg-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{conversation.unread_count > 9 ? '9+' : conversation.unread_count}</div>}
            </Link>
          ))}
        </div>}
      </div>
    </div>
  );
}
