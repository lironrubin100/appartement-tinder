import { notFound } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import ChatThread from './ChatThread';
import { headers } from 'next/headers';
import { GroupActions } from '@/components/groups/GroupActions';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const locale =
    (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const { conversationId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [
    { data: inbox },
    { data: messages, error: messagesError },
    { data: inquiry },
  ] = await Promise.all([
    supabase.rpc('list_chat_inbox'),
    supabase
      .from('messages')
      .select('id, sender_id, kind, body, created_at, message_seq')
      .eq('conversation_id', conversationId)
      .order('message_seq', { ascending: false })
      .limit(100),
    supabase
      .from('listing_inquiries')
      .select('apartment_id')
      .eq('conversation_id', conversationId)
      .maybeSingle(),
  ]);
  const conversation = inbox?.find(
    (item) => item.conversation_id === conversationId
  );
  if (!conversation || messagesError) notFound();

  // Accepted renters use the private grant view. The recorded poster already
  // owns the exact address; read only that poster's own row for the same chat.
  // Do not broaden the grant view or read another poster's private apartment.
  const [grantedAddress, ownedAddress] = inquiry
    ? await Promise.all([
        supabase.from('listing_address_access').select('address')
          .eq('apartment_id', inquiry.apartment_id).maybeSingle(),
        supabase.from('apartments').select('address')
          .eq('id', inquiry.apartment_id).eq('lister_id', user.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const [contacts, group, memberships] = conversation.group_id
    ? await Promise.all([
        supabase.rpc('list_group_contacts'),
        supabase
          .from('groups')
          .select('*')
          .eq('id', conversation.group_id)
          .single(),
        supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', conversation.group_id),
      ])
    : [null, null, null];
  const ids = memberships?.data?.map((m) => m.user_id) ?? [];
  const { data: members } = ids.length
    ? await supabase.from('profiles_public').select('id,name').in('id', ids)
    : { data: [] };
  const memberNames = Object.fromEntries(
    (members ?? []).flatMap((m) => (m.id && m.name ? [[m.id, m.name]] : []))
  );
  const controls = group?.data ? (
    <GroupActions
      contacts={contacts?.data ?? []}
      locale={locale}
      group={{
        id: group.data.id,
        admin: group.data.admin_id === user.id,
        policy: group.data.admission_policy,
        members: (members ?? []).flatMap((m) =>
          m.id && m.name ? [{ id: m.id, name: m.name }] : []
        ),
        currentUserId: user.id,
      }}
    />
  ) : null;
  return (
    <ChatThread
      key={conversationId}
      locale={locale}
      memberNames={memberNames}
      controls={controls}
      conversationId={conversationId}
      currentUserId={user.id}
      otherUserName={conversation.display_name}
      exactAddress={grantedAddress.data?.address ?? ownedAddress.data?.address ?? null}
      initialMessages={(messages ?? []).reverse()}
    />
  );
}
