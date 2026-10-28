-- F4/D18: role-specific personal inquiry transitions. Group context is later.
begin;
alter table public.listing_inquiries drop constraint listing_inquiries_status_check;
alter table public.listing_inquiries add constraint listing_inquiries_status_check
  check(status in('pending','accepted','declined','withdrawn'));

create function public.transition_listing_inquiry(p_inquiry_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  u uuid:=auth.uid();listing_id uuid;requester uuid;
  a public.apartments%rowtype;i public.listing_inquiries%rowtype;target_state text;
begin
  if u is null then raise exception 'AUTH_REQUIRED';end if;
  if p_action is null or p_action not in('decline','withdraw','reconfirm') then raise exception 'VALIDATION_FAILED';end if;
  select li.apartment_id,li.requester_id into listing_id,requester from public.listing_inquiries li where li.id=p_inquiry_id;
  if not found then raise exception 'NOT_FOUND';end if;
  -- Match the established parent-before-inquiry lock order. No client owner ID.
  select ap.* into a from public.apartments ap where ap.id=listing_id and(ap.lister_id=u or requester=u)for update of ap;
  if not found then raise exception 'NOT_FOUND';end if;
  select li.* into i from public.listing_inquiries li where li.id=p_inquiry_id and li.apartment_id=a.id for update of li;
  if not found or(p_action='decline'and a.lister_id is distinct from u)
    or(p_action in('withdraw','reconfirm')and i.requester_id is distinct from u)
  then raise exception 'NOT_FOUND';end if;
  target_state:=case when p_action='decline'then'declined'when p_action='withdraw'then'withdrawn'else'pending'end;
  if p_action in('decline','withdraw')and i.status=target_state and i.conversation_id is null then
    return jsonb_build_object('inquiry_id',i.id,'status',i.status,'conversation_id',null);
  end if;
  if i.status<>'pending'or i.conversation_id is not null then raise exception 'STATE_UNAVAILABLE';end if;
  if p_action='reconfirm' then
    -- A fresh statement after a waiting parent lock sees current room/intake.
    if a.status<>'active'or not a.inquiries_open or a.lister_id is null
      or public.blocked_with(a.lister_id)
      or not exists(select 1 from public.apartment_rooms r where r.apartment_id=a.id and r.is_available)
    then raise exception 'STATE_UNAVAILABLE';end if;
    if i.reconfirmation_required_at is not null then
      update public.listing_inquiries set reconfirmation_required_at=null,updated_at=now()where id=i.id;
    end if;
  else
    -- Closing a pending request creates no message, grant, reservation or group.
    update public.listing_inquiries set status=target_state,updated_at=now()where id=i.id;
  end if;
  return jsonb_build_object('inquiry_id',i.id,'status',target_state,'conversation_id',null);
end;
$fn$;
revoke all on function public.transition_listing_inquiry(uuid,text)from public,anon;
grant execute on function public.transition_listing_inquiry(uuid,text)to authenticated;

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
    or (p_state is not null and p_state not in ('pending','accepted','declined','withdrawn','unavailable'))
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
