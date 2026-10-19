-- SL08.1: sequence markers cannot be forged by a device clock or regressed by
-- another tab. Keep the legacy timestamp column/API for old deployed clients.
begin;

alter table public.conversation_members
  add column last_read_seq bigint not null default 0 check (last_read_seq >= 0);

-- Preserve previously read visible history at rollout, without exposing pre-join
-- messages or treating a client's future timestamp as a future sequence.
update public.conversation_members cm
set last_read_seq = greatest(cm.visible_after_seq, coalesce((
  select max(m.message_seq) from public.messages m
  where m.conversation_id = cm.conversation_id
    and m.message_seq > cm.visible_after_seq and m.created_at <= cm.last_read_at
), 0));

create function public.mark_conversation_read(p_conversation_id uuid, p_through_seq bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  member public.conversation_members%rowtype;
  authorized_seq bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_through_seq is null or p_through_seq < 0 then
    raise exception 'VALIDATION_FAILED';
  end if;
  select * into member from public.conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid()
    for update;
  if not found or not public.is_conversation_member(p_conversation_id) then
    raise exception 'NOT_FOUND';
  end if;
  select coalesce(max(m.message_seq), member.visible_after_seq) into authorized_seq
    from public.messages m where m.conversation_id = p_conversation_id
      and m.message_seq > member.visible_after_seq and m.message_seq <= p_through_seq;
  update public.conversation_members
    set last_read_seq = greatest(last_read_seq, authorized_seq)
    where conversation_id = p_conversation_id and user_id = auth.uid()
    returning last_read_seq into authorized_seq;
  return authorized_seq;
end;
$$;
revoke all on function public.mark_conversation_read(uuid,bigint) from public,anon;
grant execute on function public.mark_conversation_read(uuid,bigint) to authenticated;
-- No direct grant for last_read_seq: callers must pass authorization/clamping.

create or replace function public.list_chat_inbox()
returns table(conversation_id uuid,other_user_id uuid,display_name text,photo_url text,last_message_body text,last_message_at timestamptz,unread_count bigint,group_id uuid)
language sql stable security definer set search_path='' as $$
 select c.id,other_member.user_id,coalesce(g.name,p.name,'Shutaf'),
 case when c.group_id is null then p.photo_url end,last_msg.body,last_msg.created_at,
 (select count(*) from public.messages m where m.conversation_id=c.id
   and m.message_seq>greatest(own.visible_after_seq,own.last_read_seq)
   and m.sender_id is distinct from auth.uid() and m.kind<>'system'),c.group_id
 from public.conversation_members own
 join public.conversations c on c.id=own.conversation_id
 left join public.groups g on g.id=c.group_id
 left join lateral(select cm.user_id from public.conversation_members cm where cm.conversation_id=c.id and cm.user_id<>auth.uid() order by cm.user_id limit 1) other_member on true
 left join public.profiles p on p.id=other_member.user_id
 left join lateral(select body,created_at from public.messages m where m.conversation_id=c.id and m.message_seq>own.visible_after_seq order by message_seq desc limit 1) last_msg on true
 where own.user_id=auth.uid() and public.is_conversation_member(c.id)
 order by last_msg.created_at desc nulls last,c.created_at desc;
$$;
revoke all on function public.list_chat_inbox() from public,anon;
grant execute on function public.list_chat_inbox() to authenticated;
-- A retry is the same message, even when the first response was lost.
alter table public.messages add column request_key uuid;
create unique index message_request_key on public.messages(conversation_id,sender_id,request_key)
  where request_key is not null;
create function public.send_chat_message(p_conversation_id uuid,p_body text,p_request_key uuid)
returns setof public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_conversation_member(p_conversation_id) then raise exception 'NOT_FOUND'; end if;
  if p_request_key is null or p_body is null or length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'VALIDATION_FAILED';
  end if;
  insert into public.messages(conversation_id,sender_id,body,request_key)
    values(p_conversation_id,auth.uid(),btrim(p_body),p_request_key)
    on conflict(conversation_id,sender_id,request_key) where request_key is not null do nothing
    returning * into result;
  if not found then
    select * into result from public.messages where conversation_id=p_conversation_id
      and sender_id=auth.uid() and request_key=p_request_key;
    if result.body is distinct from btrim(p_body) then raise exception 'VERSION_CONFLICT'; end if;
  end if;
  return next result;
end;
$$;
revoke all on function public.send_chat_message(uuid,text,uuid) from public,anon;
grant execute on function public.send_chat_message(uuid,text,uuid) to authenticated;

-- Self membership updates are safe invalidation signals for another inbox tab.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
       and schemaname='public' and tablename='conversation_members') then
    alter publication supabase_realtime add table public.conversation_members;
  end if;
end $$;
commit;
