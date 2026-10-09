import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { MessageComposer } from '@/components/chats/MessageComposer';

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('conversation_members').select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle();
  if (!membership) notFound();

  const [{ data: messages }, { data: inquiry }] = await Promise.all([
    supabase.from('messages').select('id, body, kind, sender_id, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
    supabase.from('listing_inquiries').select('apartment_id').eq('conversation_id', conversationId).maybeSingle(),
  ]);
  const { data: apartment } = inquiry
    ? await supabase.from('apartments_public').select('title').eq('id', inquiry.apartment_id).maybeSingle()
    : { data: null };
  const { data: exactAddress } = inquiry
    ? await supabase.from('listing_address_access').select('address').eq('apartment_id', inquiry.apartment_id).maybeSingle()
    : { data: null };

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col bg-page-bg">
      <header className="border-b border-card-border bg-white px-4 py-4"><div className="mx-auto flex max-w-2xl items-center gap-3"><Link href="/chats" className="text-sm font-medium text-orange">חזרה לצ׳אטים</Link><h1 className="font-bold text-ink">{apartment?.title ?? 'פנייה על דירה'}</h1></div></header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 p-4">
        {exactAddress?.address && <section className="rounded-shutaf-md border border-success/30 bg-success/10 p-4" data-testid="exact-address-card"><p className="text-sm font-semibold text-ink">הכתובת המדויקת</p><p className="mt-1 text-ink">{exactAddress.address}</p></section>}
        {(messages ?? []).map((message) => <article key={message.id} className={message.kind === 'system' ? 'self-center rounded-full bg-neutral-bg-soft px-4 py-2 text-center text-sm text-muted-text' : message.sender_id === user.id ? 'max-w-[85%] self-end rounded-shutaf-md bg-orange px-4 py-3 text-white' : 'max-w-[85%] self-start rounded-shutaf-md bg-white px-4 py-3 text-ink shadow-sm'}><p>{message.body}</p></article>)}
      </main>
      <div className="mx-auto w-full max-w-2xl"><MessageComposer conversationId={conversationId} /></div>
    </div>
  );
}
