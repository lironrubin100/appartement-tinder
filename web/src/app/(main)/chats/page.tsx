import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';

export default async function ChatsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id);
  const conversationIds = (memberships ?? []).map((membership) => membership.conversation_id);
  const { data: inquiries } = conversationIds.length
    ? await supabase.from('listing_inquiries').select('conversation_id, apartment_id').in('conversation_id', conversationIds)
    : { data: [] };
  const apartmentIds = [...new Set((inquiries ?? []).map((inquiry) => inquiry.apartment_id))];
  const { data: apartments } = apartmentIds.length
    ? await supabase.from('apartments_public').select('id, title').in('id', apartmentIds)
    : { data: [] };
  const { data: messages } = conversationIds.length
    ? await supabase.from('messages').select('conversation_id, body, created_at').in('conversation_id', conversationIds).order('created_at', { ascending: false })
    : { data: [] };

  const inquiryByConversation = Object.fromEntries(
    (inquiries ?? []).filter((inquiry) => inquiry.conversation_id).map((inquiry) => [inquiry.conversation_id as string, inquiry.apartment_id]),
  );
  const titleByApartment = Object.fromEntries((apartments ?? []).map((apartment) => [apartment.id, apartment.title]));
  const latestByConversation = Object.fromEntries((messages ?? []).map((message) => [message.conversation_id, message]));
  const sortedConversationIds = [...conversationIds].sort((first, second) => {
    const firstTime = latestByConversation[first]?.created_at ?? '';
    const secondTime = latestByConversation[second]?.created_at ?? '';
    return secondTime.localeCompare(firstTime);
  });

  return (
    <div className="min-h-[calc(100vh-80px)] bg-page-bg">
      <div className="mx-auto max-w-2xl bg-white">
        <header className="border-b border-card-border px-6 py-8"><h1 className="text-3xl font-bold text-ink">צ׳אטים</h1></header>
        {!sortedConversationIds.length ? (
          <section className="p-8 text-center"><h2 className="font-semibold text-ink">עדיין אין שיחות</h2><p className="mt-2 text-sm text-muted-text">אחרי שבעל/ת נכס יאשרו פנייה, השיחה תופיע כאן.</p></section>
        ) : (
          <ul className="divide-y divide-card-border">
            {sortedConversationIds.map((conversationId) => {
              const apartmentId = inquiryByConversation[conversationId];
              const latest = latestByConversation[conversationId];
              return <li key={conversationId}><Link href={`/chats/${conversationId}`} className="block px-6 py-4 transition-colors hover:bg-neutral-bg-soft"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-ink">{apartmentId ? titleByApartment[apartmentId] ?? 'פנייה על דירה' : 'שיחה'}</h2>{latest && <time className="shrink-0 text-xs text-muted-text">{new Date(latest.created_at).toLocaleDateString('he-IL')}</time>}</div><p className="mt-1 truncate text-sm text-muted-text">{latest?.body ?? 'השיחה נפתחה'}</p></Link></li>;
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
