-- Groups are conversations, not account modes. All membership writes are RPC-only.
begin;
alter table public.groups add column admission_policy text not null default 'admin' check(admission_policy in ('admin','any_member','majority')),add column membership_version bigint not null default 0;
drop trigger if exists group_size on public.group_members;
create unique index one_group_conversation on public.conversations(group_id) where group_id is not null;
alter table public.conversations add column last_message_seq bigint not null default 0;
alter table public.messages add column message_seq bigint;
with ordered as (select id,row_number() over(partition by conversation_id order by created_at,id) n from public.messages) update public.messages m set message_seq=o.n from ordered o where o.id=m.id;
update public.conversations c set last_message_seq=coalesce((select max(message_seq) from public.messages m where m.conversation_id=c.id),0);
alter table public.messages alter column message_seq set not null;
create unique index conversation_message_sequence on public.messages(conversation_id,message_seq);
alter table public.conversation_members add column visible_after_seq bigint not null default 0;
create function public.sequence_message() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.conversations set last_message_seq=last_message_seq+1 where id=new.conversation_id returning last_message_seq into new.message_seq;
 new.created_at=clock_timestamp();
 return new;
end $$;
create trigger sequence_message before insert on public.messages for each row execute function public.sequence_message();
revoke all on function public.sequence_message() from public,anon,authenticated;

create function public.can_access_group(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.group_members where group_id=g and user_id=auth.uid()) and not exists(select 1 from public.group_members where group_id=g and public.blocked_with(user_id));
$$;
create or replace function public.is_conversation_member(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.conversation_members where conversation_id=cid and user_id=auth.uid()) and not exists(select 1 from public.conversation_members where conversation_id=cid and public.blocked_with(user_id));
$$;
create function public.can_read_message(cid uuid,seq bigint) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_conversation_member(cid) and exists(select 1 from public.conversation_members where conversation_id=cid and user_id=auth.uid() and seq>visible_after_seq);
$$;
revoke all on function public.can_access_group(uuid),public.is_conversation_member(uuid),public.can_read_message(uuid,bigint) from public,anon;
grant execute on function public.can_access_group(uuid),public.is_conversation_member(uuid),public.can_read_message(uuid,bigint) to authenticated;
drop policy read_messages on public.messages;
create policy read_messages on public.messages for select to authenticated using(public.can_read_message(conversation_id,message_seq));
drop policy send_message on public.messages;
create policy send_message on public.messages for insert to authenticated with check(sender_id=auth.uid() and kind='user' and public.is_conversation_member(conversation_id));
revoke all on public.messages from anon,authenticated;
grant select on public.messages to authenticated;
grant insert(conversation_id,sender_id,body) on public.messages to authenticated;
revoke select on public.conversations from authenticated,anon;
grant select(id,group_id,created_at) on public.conversations to authenticated;
revoke update,insert,delete,truncate,references,trigger on public.conversation_members from anon,authenticated;
grant update(last_read_at) on public.conversation_members to authenticated;

-- Replace permissive legacy group policies, including globally visible closed rosters.
do $$ declare p record; begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('groups','group_members') loop execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
create policy member_groups on public.groups for select to authenticated using(public.can_access_group(id));
create policy member_rosters on public.group_members for select to authenticated using(public.can_access_group(group_id));
revoke all on public.groups,public.group_members from anon,authenticated;
grant select on public.groups,public.group_members to authenticated;

create table public.group_invites(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.groups on delete cascade,invitee_id uuid not null references public.profiles on delete cascade,inviter_id uuid not null references public.profiles on delete cascade,status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz not null default now(),unique(group_id,invitee_id));
alter table public.group_invites enable row level security;
create policy own_invites on public.group_invites for select to authenticated using(invitee_id=auth.uid() or public.can_access_group(group_id));
revoke all on public.group_invites from anon,authenticated;
grant select on public.group_invites to authenticated;
create table public.group_admission_votes(introduction_id uuid references public.likes on delete cascade,voter_id uuid references public.profiles on delete cascade,membership_version bigint not null,primary key(introduction_id,voter_id));
alter table public.group_admission_votes enable row level security;
create policy group_votes on public.group_admission_votes for select to authenticated using(exists(select 1 from public.likes l where l.id=introduction_id and public.can_access_group(l.to_group)));
revoke all on public.group_admission_votes from anon,authenticated;
grant select on public.group_admission_votes to authenticated;

-- Internal admission helper. The group lock serializes cap checks; the conversation
-- lock serializes admission with message sequencing. Existing messages stay private.
create function public.admit_group_member(g uuid,u uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; boundary bigint; cap int;
begin
 perform 1 from public.groups where id=g for update;
 select group_members into cap from public.mvp_limits;
 if exists(select 1 from public.group_members where group_id=g and user_id=u) then select id into c from public.conversations where group_id=g; return c; end if;
 if (select count(*) from public.group_members where group_id=g)>=cap then raise exception 'group_full'; end if;
 if exists(select 1 from public.group_members gm join public.blocks b on (b.blocker_id=gm.user_id and b.blocked_id=u) or (b.blocked_id=gm.user_id and b.blocker_id=u) where gm.group_id=g) then raise exception 'blocked relationship'; end if;
 if not exists(select 1 from public.profiles where id=u and onboarded and mode<>'lister') then raise exception 'resident required'; end if;
 select id,last_message_seq into c,boundary from public.conversations where group_id=g for update;
 if c is null then raise exception 'group conversation missing'; end if;
 insert into public.group_members(group_id,user_id) values(g,u);
 insert into public.conversation_members(conversation_id,user_id,visible_after_seq) values(c,u,boundary);
 update public.groups set membership_version=membership_version+1 where id=g;
 return c;
end $$;
revoke all on function public.admit_group_member(uuid,uuid) from public,anon,authenticated;

create function public.invite_group_contact(p_group uuid,p_contact uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.groups where id=p_group and admin_id=auth.uid() for update;
 if not found or not public.can_access_group(p_group) then raise exception 'admin required'; end if;
 if not exists(select 1 from public.conversation_members a join public.conversation_members b using(conversation_id) join public.conversations c on c.id=a.conversation_id where a.user_id=auth.uid() and b.user_id=p_contact and c.group_id is null and not exists(select 1 from public.listing_inquiries i where i.conversation_id=c.id)) or public.blocked_with(p_contact) then raise exception 'accepted connection required'; end if;
 if exists(select 1 from public.group_members where group_id=p_group and user_id=p_contact) then raise exception 'already member'; end if;
 insert into public.group_invites(group_id,invitee_id,inviter_id) values(p_group,p_contact,auth.uid()) on conflict(group_id,invitee_id) do update set status='pending',inviter_id=auth.uid(),created_at=now();
end $$;
create function public.create_group_from_chats(p_name text,p_contacts uuid[],p_policy text default 'admin') returns uuid language plpgsql security definer set search_path='' as $$
declare g uuid; c uuid; contact uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and onboarded and mode<>'lister') then raise exception 'resident required'; end if;
 if nullif(trim(p_name),'') is null or char_length(p_name)>80 or cardinality(p_contacts) not between 1 and 3 then raise exception 'name and one to three contacts required'; end if;
 insert into public.groups(admin_id,name,admission_policy) values(auth.uid(),trim(p_name),p_policy) returning id into g;
 insert into public.conversations(group_id) values(g) returning id into c;
 insert into public.group_members(group_id,user_id) values(g,auth.uid());
 insert into public.conversation_members(conversation_id,user_id) values(c,auth.uid());
 foreach contact in array p_contacts loop perform public.invite_group_contact(g,contact); end loop;
 return c;
end $$;
create function public.respond_group_invite(p_invite uuid,p_accept boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.group_invites%rowtype; c uuid;
begin
 select * into i from public.group_invites where id=p_invite;
 if auth.uid() is null or i.invitee_id is distinct from auth.uid() then raise exception 'not your invite'; end if;
 perform 1 from public.groups where id=i.group_id for update;
 select * into i from public.group_invites where id=p_invite for update;
 if i.status='accepted' then select id into c from public.conversations where group_id=i.group_id; return c; end if;
 if i.status<>'pending' then raise exception 'not pending'; end if;
 if p_accept then c:=public.admit_group_member(i.group_id,auth.uid()); end if;
 update public.group_invites set status=case when p_accept then 'accepted' else 'declined' end where id=p_invite;
 return c;
end $$;
create function public.decide_group_introduction(p_like uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.likes%rowtype; g public.groups%rowtype; votes int; total int; c uuid;
begin
 select * into l from public.likes where id=p_like;
 select * into g from public.groups where id=l.to_group for update;
 if not public.can_access_group(g.id) then raise exception 'member required'; end if;
 select * into l from public.likes where id=p_like for update;
 if l.status='accepted' then return l.conversation_id; end if;
 if l.status<>'pending' or g.status<>'open' then raise exception 'unavailable'; end if;
 if g.admission_policy='admin' and g.admin_id<>auth.uid() then raise exception 'admin required'; end if;
 insert into public.group_admission_votes values(l.id,auth.uid(),g.membership_version) on conflict(introduction_id,voter_id) do update set membership_version=excluded.membership_version;
 if g.admission_policy='majority' then
 select count(*) into votes from public.group_admission_votes v join public.group_members m on m.user_id=v.voter_id and m.group_id=g.id where v.introduction_id=l.id and v.membership_version=g.membership_version;
 select count(*) into total from public.group_members where group_id=g.id;
 if votes<=total/2 then return null; end if;
 end if;
 c:=public.admit_group_member(g.id,l.from_user);
 update public.likes set status='accepted',conversation_id=c where id=l.id;
 return c;
end $$;
create function public.configure_group(p_group uuid,p_policy text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.groups set admission_policy=p_policy,membership_version=membership_version+1 where id=p_group and admin_id=auth.uid() and public.can_access_group(id);
 if not found then raise exception 'admin required'; end if;
end $$;
create function public.remove_group_member(p_group uuid,p_member uuid) returns void language plpgsql security definer set search_path='' as $$
declare a uuid;
begin
 select admin_id into a from public.groups where id=p_group for update;
 if auth.uid() is null or (a<>auth.uid() and p_member<>auth.uid()) or a=p_member then raise exception 'admin cannot leave; admin or self required'; end if;
 delete from public.conversation_members where user_id=p_member and conversation_id in(select id from public.conversations where group_id=p_group);
 delete from public.group_members where group_id=p_group and user_id=p_member;
 update public.groups set membership_version=membership_version+1 where id=p_group;
end $$;
revoke all on function public.invite_group_contact(uuid,uuid),public.create_group_from_chats(text,uuid[],text),public.respond_group_invite(uuid,boolean),public.decide_group_introduction(uuid),public.configure_group(uuid,text),public.remove_group_member(uuid,uuid) from public,anon;
grant execute on function public.invite_group_contact(uuid,uuid),public.create_group_from_chats(text,uuid[],text),public.respond_group_invite(uuid,boolean),public.decide_group_introduction(uuid),public.configure_group(uuid,text),public.remove_group_member(uuid,uuid) to authenticated;

-- Public projection uses the already allowlisted profile view; no group budget,
-- private member fields or closed roster is returned.
create function public.discover_groups(p_after uuid default null) returns table(id uuid,name text,admission_policy text,members jsonb) language sql stable security definer set search_path='' as $$
 select g.id,g.name,g.admission_policy,jsonb_agg(to_jsonb(p) order by gm.joined_at,p.id) from public.groups g join public.group_members gm on gm.group_id=g.id join public.profiles_public p on p.id=gm.user_id
 where auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and onboarded and mode<>'lister') and g.status='open' and (p_after is null or g.id>p_after)
 and not exists(select 1 from public.group_members where group_id=g.id and (user_id=auth.uid() or public.blocked_with(user_id)))
 and not exists(select 1 from public.discovery_passes where from_user=auth.uid() and target_id=g.id and target_kind='group' and created_at>now()-interval '30 days')
 and not exists(select 1 from public.likes where from_user=auth.uid() and to_group=g.id and status in ('pending','accepted'))
 group by g.id having count(*)>=2 and count(*)<(select group_members from public.mvp_limits) order by g.id limit 30;
$$;
revoke all on function public.discover_groups(uuid) from public,anon;
grant execute on function public.discover_groups(uuid) to authenticated;

drop function public.list_chat_inbox();
create function public.list_chat_inbox() returns table(conversation_id uuid,other_user_id uuid,display_name text,photo_url text,last_message_body text,last_message_at timestamptz,unread_count bigint,group_id uuid) language sql stable security definer set search_path='' as $$
 select c.id,other_member.user_id,coalesce(g.name,p.name,'Shutaf'),case when c.group_id is null then p.photo_url end,last_msg.body,last_msg.created_at,
 (select count(*) from public.messages m where m.conversation_id=c.id and m.message_seq>own.visible_after_seq and m.created_at>own.last_read_at and m.sender_id<>auth.uid()),c.group_id
 from public.conversation_members own join public.conversations c on c.id=own.conversation_id left join public.groups g on g.id=c.group_id
 left join lateral(select cm.user_id from public.conversation_members cm where cm.conversation_id=c.id and cm.user_id<>auth.uid() order by cm.user_id limit 1) other_member on true
 left join public.profiles p on p.id=other_member.user_id
 left join lateral(select body,created_at from public.messages m where m.conversation_id=c.id and m.message_seq>own.visible_after_seq order by message_seq desc limit 1) last_msg on true
 where own.user_id=auth.uid() and public.is_conversation_member(c.id) order by last_msg.created_at desc nulls last,c.created_at desc;
$$;
revoke all on function public.list_chat_inbox() from public,anon;
grant execute on function public.list_chat_inbox() to authenticated;
create function public.list_group_contacts() returns table(id uuid,name text) language sql stable security definer set search_path='' as $$
 select distinct p.id,p.name from public.conversation_members a join public.conversation_members b using(conversation_id) join public.conversations c on c.id=a.conversation_id join public.profiles_public p on p.id=b.user_id
 where a.user_id=auth.uid() and b.user_id<>auth.uid() and c.group_id is null and not exists(select 1 from public.listing_inquiries i where i.conversation_id=c.id) order by p.name,p.id;
$$;
create function public.list_group_invites() returns table(id uuid,group_name text,inviter_name text) language sql stable security definer set search_path='' as $$
 select i.id,g.name,p.name from public.group_invites i join public.groups g on g.id=i.group_id join public.profiles p on p.id=i.inviter_id
 where i.invitee_id=auth.uid() and i.status='pending' and not exists(select 1 from public.group_members where group_id=g.id and public.blocked_with(user_id));
$$;
revoke all on function public.list_group_contacts(),public.list_group_invites() from public,anon;
grant execute on function public.list_group_contacts(),public.list_group_invites() to authenticated;
commit;
