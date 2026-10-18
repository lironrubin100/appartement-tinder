-- B10/D16/I19: account-only property posters may browse safe social projections,
-- but never participate in resident introductions or passes without a resident profile.
create or replace function public.pass_discovery(p_target uuid,p_kind text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 perform 1 from public.profiles where id=auth.uid() and onboarded and mode='resident';
 if not found then raise exception 'resident profile required'; end if;
 insert into public.discovery_passes values(auth.uid(),p_target,p_kind,now()) on conflict(from_user,target_id,target_kind) do update set created_at=now();
end $$;
revoke all on function public.pass_discovery(uuid,text) from public,anon;
grant execute on function public.pass_discovery(uuid,text) to authenticated;

create or replace function public.discover_individuals(p_after uuid default null) returns setof public.profiles_public language sql stable security definer set search_path='' as $$
 select p.* from public.profiles_public p
 where auth.uid() is not null
   and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.onboarded)
   and p.id<>auth.uid()
   and (p_after is null or p.id>p_after)
   and not public.blocked_with(p.id)
   and (
     exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.mode='lister')
     or (
       not exists(select 1 from public.likes l where ((l.from_user=auth.uid() and l.to_user=p.id) or (l.from_user=p.id and l.to_user=auth.uid())) and l.status in ('pending','accepted'))
       and not exists(select 1 from public.discovery_passes where from_user=auth.uid() and target_id=p.id and target_kind='individual' and created_at>now()-interval '30 days')
     )
   )
 order by p.id limit 30;
$$;
revoke all on function public.discover_individuals(uuid) from public,anon;
grant execute on function public.discover_individuals(uuid) to authenticated;

create or replace function public.discover_groups(p_after uuid default null) returns table(id uuid,name text,admission_policy text,members jsonb) language sql stable security definer set search_path='' as $$
 select g.id,g.name,g.admission_policy,jsonb_agg(to_jsonb(p) order by gm.joined_at,p.id)
 from public.groups g
 join public.group_members gm on gm.group_id=g.id
 join public.profiles_public p on p.id=gm.user_id
 where auth.uid() is not null
   and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.onboarded)
   and g.status='open'
   and (p_after is null or g.id>p_after)
   and not exists(select 1 from public.group_members member where member.group_id=g.id and public.blocked_with(member.user_id))
   and (
     exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.mode='lister')
     or (
       not exists(select 1 from public.group_members where group_id=g.id and user_id=auth.uid())
       and not exists(select 1 from public.discovery_passes where from_user=auth.uid() and target_id=g.id and target_kind='group' and created_at>now()-interval '30 days')
       and not exists(select 1 from public.likes where from_user=auth.uid() and to_group=g.id and status in ('pending','accepted'))
     )
   )
 group by g.id
 having count(*)>=2 and count(*)<(select group_members from public.mvp_limits)
 order by g.id limit 30;
$$;
revoke all on function public.discover_groups(uuid) from public,anon;
grant execute on function public.discover_groups(uuid) to authenticated;
