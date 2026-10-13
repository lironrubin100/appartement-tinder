import { notFound } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import ChatThread from './ChatThread';

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: inbox }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.rpc('list_chat_inbox'),
    supabase.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(100),
  ]);
  const conversation = inbox?.find((item) => item.conversation_id === conversationId);
  if (!conversation || messagesError) notFound();

  return <ChatThread conversationId={conversationId} currentUserId={user.id} otherUserName={conversation.display_name} initialMessages={messages ?? []} />;
}
