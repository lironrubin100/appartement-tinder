-- I9/I19, B9, C6-C9: resident profiles and introductions.
begin;
alter table public.profiles drop constraint profiles_mode_check;
alter table public.profiles alter column mode drop default,alter column mode drop not null;
update public.profiles set mode='resident' where mode in ('solo','group','room_filler');
alter table public.profiles add constraint profiles_mode_check check(mode in ('resident','lister'));

create function public.save_onboarding(p_name text,p_resident boolean,p_birth_date date,p_phone text,p_agency text,p_bio text,p_tags jsonb,p_complete boolean)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'authentication required'; end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'profile missing'; end if;
 if p_complete and (nullif(trim(p_name),'') is null or (p_resident and (p_birth_date is null or p_birth_date>current_date)) or (not p_resident and nullif(trim(p_phone),'') is null)) then raise exception 'incomplete profile'; end if;
 if exists(select 1 from public.profiles where id=u and onboarded) then raise exception 'already completed'; end if;
 update public.profiles set name=trim(p_name),mode=case when p_resident then 'resident' else 'lister' end,bio=p_bio,
 gender_dynamic=p_tags->>'gender_dynamic',cleanliness=p_tags->>'cleanliness',sleep_schedule=p_tags->>'sleep_schedule',social_guests=p_tags->>'social_guests',noise_tolerance=p_tags->>'noise_tolerance',music_vibe=p_tags->>'music_vibe',climate=p_tags->>'climate',smoking=p_tags->>'smoking',kitchen_dietary=p_tags->>'kitchen_dietary',cooking_dynamics=p_tags->>'cooking_dynamics',pets=p_tags->>'pets',weekend_routine=p_tags->>'weekend_routine',relationship_status=p_tags->>'relationship_status',study_habits=p_tags->>'study_habits',financial_splitting=p_tags->>'financial_splitting',miluim_reserve_duty=p_tags->>'miluim_reserve_duty',onboarded=p_complete where id=u;
 insert into public.profile_private(profile_id,birth_date,phone,agency_name) values(u,case when p_resident then p_birth_date end,nullif(trim(p_phone),''),case when not p_resident then nullif(trim(p_agency),'') end)
 on conflict(profile_id) do update set birth_date=excluded.birth_date,phone=excluded.phone,agency_name=excluded.agency_name,updated_at=now();
end $$;
revoke all on function public.save_onboarding(text,boolean,date,text,text,text,jsonb,boolean) from public,anon;
grant execute on function public.save_onboarding(text,boolean,date,text,text,text,jsonb,boolean) to authenticated;

-- Profile completion and verification flags cannot be forged through REST.
revoke update on public.profiles from authenticated;
grant update(name,bio,photo_url,photo_blur_url,gender,default_home,notifications_enabled,public_badges,gender_dynamic,cleanliness,sleep_schedule,social_guests,noise_tolerance,music_vibe,climate,smoking,kitchen_dietary,cooking_dynamics,pets,weekend_routine,relationship_status,study_habits,financial_splitting,miluim_reserve_duty) on public.profiles to authenticated;
revoke update on public.profile_private from authenticated;
grant update(birth_date,phone,agency_name,budget_min,budget_max,move_in_date) on public.profile_private to authenticated;

-- A single authoritative primary photo for all existing editor/upload paths.
create function public.sync_primary_profile_photo() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid:=coalesce(new.profile_id,old.profile_id);
begin
 update public.profiles set photo_url=(select url from public.profile_photos where profile_id=u order by display_order,id limit 1) where id=u;
 return null;
end $$;
create trigger sync_primary_profile_photo after insert or update or delete on public.profile_photos for each row execute function public.sync_primary_profile_photo();
revoke all on function public.sync_primary_profile_photo() from public,anon,authenticated;
update public.profiles p set photo_url=(select url from public.profile_photos ph where ph.profile_id=p.id order by display_order,id limit 1) where exists(select 1 from public.profile_photos ph where ph.profile_id=p.id);

alter table public.likes drop constraint likes_message_minimum_length;
alter table public.likes drop constraint likes_message_check;
alter table public.likes add constraint likes_message_check check(char_length(message)<=500);
alter table public.likes add column status text not null default 'pending' check(status in ('pending','accepted','declined')),
 add column conversation_id uuid references public.conversations on delete set null;
drop index if exists public.likes_from_user_to_user_idx;
drop index if exists public.likes_from_user_to_group_idx;
create unique index pending_user_introduction on public.likes(from_user,to_user) where to_user is not null and status='pending';
create unique index pending_group_introduction on public.likes(from_user,to_group) where to_group is not null and status='pending';

-- Cap remains configurable in one server-owned value for this testable MVP.
create table public.mvp_limits(id boolean primary key default true check(id),group_members int not null check(group_members between 2 and 20),introductions_per_day int not null check(introductions_per_day>0));
insert into public.mvp_limits values(true,4,20);
alter table public.mvp_limits enable row level security;
revoke all on public.mvp_limits from anon,authenticated;

create function public.send_introduction(p_user uuid,p_group uuid,p_message text,p_ref_tag text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v uuid; daily_limit int;
begin
 if u is null then raise exception 'authentication required'; end if;
 perform 1 from public.profiles where id=u and onboarded and mode<>'lister' for update;
 if not found then raise exception 'resident profile required'; end if;
 if num_nonnulls(p_user,p_group)<>1 then raise exception 'one target required'; end if;
 select id into v from public.likes where from_user=u and to_user is not distinct from p_user and to_group is not distinct from p_group and status='pending';
 if v is not null then return v; end if;
 select introductions_per_day into daily_limit from public.mvp_limits;
 if (select count(*) from public.likes where from_user=u and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=daily_limit then raise exception 'daily_limit'; end if;
 if p_user is not null and (p_user=u or not exists(select 1 from public.profiles where id=p_user and onboarded and mode<>'lister') or public.blocked_with(p_user)) then raise exception 'recipient unavailable'; end if;
 if p_group is not null and (not exists(select 1 from public.groups where id=p_group and status='open') or exists(select 1 from public.group_members where group_id=p_group and (user_id=u or public.blocked_with(user_id)))) then raise exception 'group unavailable'; end if;
 if coalesce(p_ref_tag,'bio')<>'bio' and not exists(
 select 1 from public.profiles p where p.id::text=split_part(p_ref_tag,':',1)
 and split_part(p_ref_tag,':',2)=any(array['gender_dynamic','cleanliness','sleep_schedule','social_guests','noise_tolerance','music_vibe','climate','smoking','kitchen_dietary','cooking_dynamics','pets','weekend_routine','relationship_status','study_habits','financial_splitting','miluim_reserve_duty'])
 and to_jsonb(p)->>split_part(p_ref_tag,':',2)=split_part(p_ref_tag,':',3)
 and (p.id=p_user or exists(select 1 from public.group_members gm where gm.group_id=p_group and gm.user_id=p.id))
 ) then raise exception 'invalid trait reference'; end if;
 insert into public.likes(from_user,to_user,to_group,message,ref_tag) values(u,p_user,p_group,coalesce(p_message,''),p_ref_tag) returning id into v;
 return v;
end $$;
revoke all on function public.send_introduction(uuid,uuid,text,text) from public,anon;
grant execute on function public.send_introduction(uuid,uuid,text,text) to authenticated;
revoke insert,update,delete on public.likes from authenticated,anon;

create or replace function public.accept_like(p_like_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.likes%rowtype; c uuid;
begin
 select * into l from public.likes where id=p_like_id for update;
 if auth.uid() is null or l.to_user is distinct from auth.uid() then raise exception 'not your introduction'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(l.from_user,l.to_user)::text||greatest(l.from_user,l.to_user)::text,0));
 if public.blocked_with(l.from_user) then raise exception 'recipient unavailable'; end if;
 if l.status='accepted' then return l.conversation_id; end if;
 if l.status<>'pending' then raise exception 'not pending'; end if;
 -- Keep a single personal thread between these two residents.
 select c1.conversation_id into c from public.conversation_members c1 join public.conversation_members c2 using(conversation_id) join public.conversations cv on cv.id=c1.conversation_id where c1.user_id=l.from_user and c2.user_id=l.to_user and cv.group_id is null and not exists(select 1 from public.listing_inquiries i where i.conversation_id=cv.id) limit 1;
 if c is null then
 insert into public.conversations default values returning id into c;
 insert into public.conversation_members(conversation_id,user_id) values(c,l.to_user),(c,l.from_user);
 end if;
 if l.message<>'' then insert into public.messages(conversation_id,sender_id,body) values(c,l.from_user,l.message); end if;
 update public.likes set status='accepted',conversation_id=c where id=l.id;
 return c;
end $$;

-- Both target types use durable, server-timed passes.
create table public.discovery_passes(from_user uuid not null references public.profiles on delete cascade,target_id uuid not null,target_kind text not null check(target_kind in ('individual','group')),created_at timestamptz not null default now(),primary key(from_user,target_id,target_kind));
alter table public.discovery_passes enable row level security;
create policy own_passes on public.discovery_passes for select to authenticated using(from_user=auth.uid());
grant select on public.discovery_passes to authenticated;
insert into public.discovery_passes select from_user,to_user,'individual',created_at from public.profile_passes on conflict do nothing;
create function public.pass_discovery(p_target uuid,p_kind text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 insert into public.discovery_passes values(auth.uid(),p_target,p_kind,now()) on conflict(from_user,target_id,target_kind) do update set created_at=now();
end $$;
revoke all on function public.pass_discovery(uuid,text) from public,anon;
grant execute on function public.pass_discovery(uuid,text) to authenticated;
create function public.discover_individuals(p_after uuid default null) returns setof public.profiles_public language sql stable security definer set search_path='' as $$
 select p.* from public.profiles_public p where auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and onboarded and mode<>'lister') and p.id<>auth.uid() and (p_after is null or p.id>p_after)
 and not exists(select 1 from public.likes l where ((l.from_user=auth.uid() and l.to_user=p.id) or (l.from_user=p.id and l.to_user=auth.uid())) and l.status in ('pending','accepted'))
 and not exists(select 1 from public.discovery_passes where from_user=auth.uid() and target_id=p.id and target_kind='individual' and created_at>now()-interval '30 days') order by p.id limit 30;
$$;
revoke all on function public.discover_individuals(uuid) from public,anon;
grant execute on function public.discover_individuals(uuid) to authenticated;
commit;
