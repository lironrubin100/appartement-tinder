-- F4/D16: read-only personal inquiries across session-owned listings.
-- This SQL boundary returns a keyset tuple. The 6.25 server adapter owns the
-- account/query/version-bound HMAC and expiry, as in the existing draft service.
begin;

create index owner_listing_inbox_owner_idx on public.apartments(lister_id,id);
create index owner_listing_inbox_page_idx
  on public.listing_inquiries(apartment_id,created_at desc,id desc);

create function public.list_owner_listing_inquiries(
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
      'status',n.status,'state',n.state,'created_at',n.created_at,'intro',n.intro,
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
  from numbered n left join public.profiles_public p on p.id=n.requester_id;

  v_last:=v_items->-1;
  return jsonb_build_object('items',v_items,'has_more',v_more,
    'next_cursor',case when v_more then jsonb_build_object('created_at',v_last->'created_at','id',v_last->'id') else null end,
    'projection_version',1);
end;
$fn$;

revoke all on function public.list_owner_listing_inquiries(uuid,text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.list_owner_listing_inquiries(uuid,text,integer,timestamptz,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
