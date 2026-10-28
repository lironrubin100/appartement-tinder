-- F4: private owner-view state, independent from inquiry status/chat read state.
begin;
create schema listing_inquiry_private;
revoke all on schema listing_inquiry_private from public,anon,authenticated;
create table listing_inquiry_private.owner_views(
  inquiry_id uuid not null references public.listing_inquiries(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key(inquiry_id,owner_id)
);
alter table listing_inquiry_private.owner_views enable row level security;
revoke all on listing_inquiry_private.owner_views from public,anon,authenticated;

create function public.mark_owner_listing_inquiry_seen(p_inquiry_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();v_listing uuid;v_requester uuid;v_viewed_at timestamptz;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED';end if;
  -- Parent first; even a waiting ownership check is rechecked before writing.
  select a.id into v_listing from public.apartments a
  join public.listing_inquiries i on i.apartment_id=a.id
  where i.id=p_inquiry_id and a.lister_id=v_actor for share of a;
  if not found then raise exception 'NOT_FOUND';end if;
  select i.requester_id into v_requester from public.listing_inquiries i
    where i.id=p_inquiry_id and i.apartment_id=v_listing for share of i;
  if not found or public.blocked_with(v_requester) then raise exception 'NOT_FOUND';end if;
  insert into listing_inquiry_private.owner_views(inquiry_id,owner_id)
  values(p_inquiry_id,v_actor) on conflict(inquiry_id,owner_id) do nothing;
  select v.viewed_at into v_viewed_at from listing_inquiry_private.owner_views v
  where v.inquiry_id=p_inquiry_id and v.owner_id=v_actor;
  return jsonb_build_object('inquiry_id',p_inquiry_id,'viewed_at',v_viewed_at,'is_new',false);
end;
$fn$;
revoke all on function public.mark_owner_listing_inquiry_seen(uuid) from public,anon;
grant execute on function public.mark_owner_listing_inquiry_seen(uuid) to authenticated;

create or replace function public.list_owner_listing_inquiries(
  p_listing_id uuid default null,
  p_state text default null,
  p_limit integer default 20,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare
  v_actor uuid:=auth.uid();
  v_items jsonb;
  v_more boolean;
  v_last jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED';end if;
  if p_limit is null or p_limit<1 or p_limit>50
    or (p_state is not null and p_state not in ('pending','accepted','declined','unavailable'))
    or (p_after_created_at is null)<>(p_after_id is null)
    or (p_after_created_at is not null and not isfinite(p_after_created_at))
  then raise exception 'VALIDATION_FAILED';end if;
  if p_listing_id is not null and not exists(
    select 1 from public.apartments a where a.id=p_listing_id and a.lister_id=v_actor
  ) then raise exception 'NOT_FOUND';end if;

  with eligible as (
    select i.id,i.apartment_id as listing_id,a.title as listing_title,
      i.status,i.created_at,i.intro,i.requester_id,i.conversation_id,
      case when i.status='pending' and (a.status<>'active' or not a.inquiries_open
          or i.reconfirmation_required_at is not null
          or not exists(select 1 from public.apartment_rooms r where r.apartment_id=a.id and r.is_available))
        then 'unavailable' else i.status end as state
    from public.apartments a join public.listing_inquiries i on i.apartment_id=a.id
    where a.lister_id=v_actor and (p_listing_id is null or a.id=p_listing_id)
      and not public.blocked_with(i.requester_id)
      and (p_after_created_at is null or (i.created_at,i.id)<(p_after_created_at,p_after_id))
  ), page as (
    select e.* from eligible e where p_state is null or e.state=p_state
    order by e.created_at desc,e.id desc limit p_limit+1
  ), numbered as (
    select p.*,row_number() over(order by p.created_at desc,p.id desc) as position from page p
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',n.id,'kind','individual','listing_id',n.listing_id,'listing_title',n.listing_title,
      'is_new',v.inquiry_id is null,'viewed_at',v.viewed_at,'status',n.status,'state',n.state,'created_at',n.created_at,'intro',n.intro,
      -- A hidden/deactivated profile is null, never a base-table fallback.
      'requester',case when p.id is not null then jsonb_build_object(
        'id',p.id,'name',p.name,'photo_url',p.photo_url,'public_badges',p.public_badges) else null end,
      'conversation_id',case when n.status='accepted' and public.is_conversation_member(n.conversation_id)
        and exists(select 1 from public.conversations c where c.id=n.conversation_id and c.group_id is null)
        and exists(select 1 from public.conversation_members m where m.conversation_id=n.conversation_id and m.user_id=n.requester_id)
        then n.conversation_id else null end
    ) order by n.created_at desc,n.id desc) filter(where n.position<=p_limit),'[]'::jsonb),
    count(*)>p_limit
  into v_items,v_more
  from numbered n left join public.profiles_public p on p.id=n.requester_id
  left join listing_inquiry_private.owner_views v on v.inquiry_id=n.id and v.owner_id=v_actor;

  v_last:=v_items->-1;
  return jsonb_build_object('items',v_items,'has_more',v_more,
    'next_cursor',case when v_more then jsonb_build_object('created_at',v_last->'created_at','id',v_last->'id') else null end,
    'projection_version',1);
end;
$fn$;
notify pgrst,'reload schema';
commit;
