-- D18: room inventory is independent from inquiry intake. A listing owner may
-- open or close one room through this RPC only. Closing the final available
-- room preserves accepted conversations but requires pending requesters to
-- reconfirm after a room is reopened.
begin;

alter table public.listing_inquiries
  add column if not exists reconfirmation_required_at timestamptz;

create or replace function public.create_listing_inquiry(p_apartment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_requester_id uuid := auth.uid();
  v_inquiry_id uuid;
begin
  if v_requester_id is null then raise exception 'authentication required'; end if;

  if not exists (
    select 1
    from public.apartments a
    where a.id = p_apartment_id
      and a.status = 'active'
      and a.lister_id is not null
      and a.lister_id is distinct from v_requester_id
      and not public.blocked_with(a.lister_id)
      and exists (
        select 1
        from public.apartment_rooms r
        where r.apartment_id = a.id and r.is_available
      )
  ) then
    raise exception 'listing is unavailable for contact';
  end if;

  insert into public.listing_inquiries (apartment_id, requester_id)
  values (p_apartment_id, v_requester_id)
  on conflict (apartment_id, requester_id) do update
    set reconfirmation_required_at = case
          when public.listing_inquiries.status = 'pending' then null
          else public.listing_inquiries.reconfirmation_required_at
        end,
        updated_at = case
          when public.listing_inquiries.status = 'pending' then now()
          else public.listing_inquiries.updated_at
        end
  returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$fn$;

create or replace function public.accept_listing_inquiry(p_inquiry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_owner_id uuid := auth.uid();
  v_inquiry public.listing_inquiries%rowtype;
  v_lister_id uuid;
  v_conversation_id uuid;
begin
  if v_owner_id is null then raise exception 'authentication required'; end if;

  select i.* into v_inquiry
  from public.listing_inquiries i
  join public.apartments a on a.id = i.apartment_id
  where i.id = p_inquiry_id
  for update of i;

  select lister_id into v_lister_id
  from public.apartments
  where id = v_inquiry.apartment_id
  for update;

  if v_inquiry.id is null or v_lister_id is distinct from v_owner_id then
    raise exception 'not your inquiry';
  end if;
  if v_inquiry.status = 'accepted' and v_inquiry.conversation_id is not null then
    return v_inquiry.conversation_id;
  end if;
  if v_inquiry.status <> 'pending' then raise exception 'inquiry is no longer pending'; end if;
  if v_inquiry.reconfirmation_required_at is not null then
    raise exception 'inquiry requires reconfirmation';
  end if;
  if not exists (
    select 1
    from public.apartments a
    where a.id = v_inquiry.apartment_id
      and a.status = 'active'
      and exists (
        select 1
        from public.apartment_rooms r
        where r.apartment_id = a.id and r.is_available
      )
  ) or public.blocked_with(v_inquiry.requester_id) then
    raise exception 'listing or requester unavailable';
  end if;

  insert into public.conversations default values returning id into v_conversation_id;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_lister_id), (v_conversation_id, v_inquiry.requester_id);
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (v_conversation_id, null, 'system', 'הפנייה אושרה. הכתובת המדויקת זמינה כעת בכרטיס למעלה.');
  update public.listing_inquiries
  set status = 'accepted', conversation_id = v_conversation_id, updated_at = now()
  where id = v_inquiry.id;

  return v_conversation_id;
end;
$fn$;

create function public.set_owned_room_availability(
  p_room_id uuid,
  p_is_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_actor uuid := auth.uid();
  v_listing public.apartments%rowtype;
  v_room public.apartment_rooms%rowtype;
  v_available_before integer;
  v_available_after integer;
  v_min_price integer;
  v_max_price integer;
  v_reconfirmation_count integer := 0;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_room_id is null or p_is_available is null then raise exception 'VALIDATION_FAILED'; end if;

  select a.* into v_listing
  from public.apartments a
  join public.apartment_rooms r on r.apartment_id = a.id
  where r.id = p_room_id
    and a.lister_id = v_actor
    and a.source = 'user'
  for update of a;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_room
  from public.apartment_rooms
  where id = p_room_id and apartment_id = v_listing.id
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  select count(*)::integer into v_available_before
  from public.apartment_rooms
  where apartment_id = v_listing.id and is_available;

  if v_room.is_available is distinct from p_is_available then
    if v_listing.revision = 2147483647 then raise exception 'STATE_UNAVAILABLE'; end if;

    update public.apartment_rooms
    set is_available = p_is_available
    where id = v_room.id;

    update public.apartments
    set revision = v_listing.revision + 1
    where id = v_listing.id
    returning * into v_listing;
  end if;

  select count(*)::integer, min(monthly_price)::integer, max(monthly_price)::integer
  into v_available_after, v_min_price, v_max_price
  from public.apartment_rooms
  where apartment_id = v_listing.id and is_available;

  if v_available_before > 0 and v_available_after = 0 then
    update public.listing_inquiries
    set reconfirmation_required_at = coalesce(reconfirmation_required_at, now()),
        updated_at = now()
    where apartment_id = v_listing.id
      and status = 'pending';
    get diagnostics v_reconfirmation_count = row_count;
  end if;

  return jsonb_build_object(
    'listingId', v_listing.id,
    'roomId', v_room.id,
    'isAvailable', p_is_available,
    'revision', v_listing.revision,
    'availableRoomCount', v_available_after,
    'minRoomPrice', v_min_price,
    'maxRoomPrice', v_max_price,
    'pendingReconfirmationCount', v_reconfirmation_count
  );
end;
$fn$;

revoke all on function public.set_owned_room_availability(uuid, boolean) from public, anon;
grant execute on function public.set_owned_room_availability(uuid, boolean) to authenticated;

comment on function public.set_owned_room_availability(uuid, boolean) is
  'D18 owner-only inventory control. Locks the source listing, changes exactly one room, advances the listing revision, and flags pending inquiries only when the final available room closes.';

commit;
