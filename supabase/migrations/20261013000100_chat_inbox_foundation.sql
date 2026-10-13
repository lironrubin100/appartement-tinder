-- Chat MVP: efficient inbox previews and safe, user-scoped read helpers.
-- Apply after the base schema/RLS files that create conversations and messages.

begin;

alter table public.conversations
  add column if not exists last_message_at timestamptz,
  add column if not exists last_message_body text;

create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);

create index if not exists conversation_members_user_conversation_idx
  on public.conversation_members (user_id, conversation_id);

-- Keep both halves explicit: a member may only update their own read marker
-- and may not use that update to transfer the row to another account.
drop policy if exists update_own_read_marker on public.conversation_members;
create policy update_own_read_marker on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Keep the small Inbox preview on the conversation instead of loading every
-- message in every thread. The canonical message history remains in messages.
create or replace function public.refresh_conversation_preview()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_body = new.body
  where id = new.conversation_id;
  return new;
end;
$fn$;

drop trigger if exists refresh_conversation_preview_after_message on public.messages;
create trigger refresh_conversation_preview_after_message
  after insert on public.messages
  for each row execute function public.refresh_conversation_preview();
revoke all on function public.refresh_conversation_preview() from public, anon, authenticated;

-- Backfill previews for conversations that existed before this migration.
update public.conversations c
set (last_message_at, last_message_body) = (
  select m.created_at, m.body
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
)
where c.last_message_at is null
  and exists (select 1 from public.messages m where m.conversation_id = c.id);

-- A caller only receives conversations they belong to. For the current MVP a
-- conversation is a 1:1 accepted-like thread; group presentation will be
-- added with group-chat work rather than leaking arbitrary profile rows here.
create or replace function public.list_chat_inbox()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  display_name text,
  photo_url text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
security definer
stable
set search_path = public
as $fn$
  select
    c.id,
    other_member.user_id,
    p.name,
    p.photo_url,
    c.last_message_body,
    c.last_message_at,
    count(m.id) filter (
      where m.sender_id <> auth.uid()
        and m.created_at > own_member.last_read_at
    ) as unread_count
  from public.conversation_members own_member
  join public.conversations c on c.id = own_member.conversation_id
  join lateral (
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = c.id
      and cm.user_id <> auth.uid()
    limit 1
  ) other_member on true
  join public.profiles p on p.id = other_member.user_id
  left join public.messages m on m.conversation_id = c.id
  where own_member.user_id = auth.uid()
    and c.group_id is null
    and not public.blocked_with(other_member.user_id)
  group by c.id, other_member.user_id, p.name, p.photo_url,
           c.last_message_body, c.last_message_at
  order by c.last_message_at desc nulls last, c.created_at desc;
$fn$;

revoke all on function public.list_chat_inbox() from public, anon;
grant execute on function public.list_chat_inbox() to authenticated;

-- Postgres Changes observes RLS, so only conversation members can receive
-- events for message rows they are already allowed to read.
do $fn$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$fn$;

commit;
