-- D18: receiving inquiries is independent from inventory and listing status.
begin;

alter table public.apartments add column inquiries_open boolean not null default true;
revoke update(inquiries_open) on public.apartments from public, anon, authenticated;
comment on column public.apartments.inquiries_open is
  'Owner-controlled inquiry intake; does not change rooms, occupancy, listing status or accepted conversations.';

create function public.set_owned_listing_intake(p_listing_id uuid, p_is_open boolean)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor uuid := auth.uid();
  v_listing public.apartments%rowtype;
  v_reconfirmation_count integer := 0;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_listing_id is null or p_is_open is null then raise exception 'VALIDATION_FAILED'; end if;
  select * into v_listing from public.apartments
  where id=p_listing_id and lister_id=v_actor and source='user' for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_listing.inquiries_open is distinct from p_is_open then
    if v_listing.revision=2147483647 then raise exception 'STATE_UNAVAILABLE'; end if;
    update public.apartments set inquiries_open=p_is_open,revision=revision+1
    where id=v_listing.id returning * into v_listing;
    if not p_is_open then
      update public.listing_inquiries
      set reconfirmation_required_at=coalesce(reconfirmation_required_at,now()),updated_at=now()
      where apartment_id=v_listing.id and status='pending';
      get diagnostics v_reconfirmation_count = row_count;
    end if;
  end if;
  return jsonb_build_object('listingId',v_listing.id,'intakeOpen',v_listing.inquiries_open,
    'revision',v_listing.revision,'pendingReconfirmationCount',v_reconfirmation_count);
end;
$fn$;
revoke all on function public.set_owned_listing_intake(uuid,boolean) from public,anon;
grant execute on function public.set_owned_listing_intake(uuid,boolean) to authenticated;

create or replace function public.create_listing_inquiry(p_apartment_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_requester_id uuid := auth.uid();
  v_listing public.apartments%rowtype;
  v_inquiry_id uuid;
begin
  if v_requester_id is null then raise exception 'authentication required'; end if;
  -- Serialize send, intake, inventory and acceptance on the parent first.
  -- A send racing with stop either commits before stop and is flagged, or fails.
  select a.* into v_listing from public.apartments a
  where a.id=p_apartment_id and a.status='active' and a.inquiries_open
    and a.lister_id is not null and a.lister_id is distinct from v_requester_id
    and not public.blocked_with(a.lister_id)
    and exists(select 1 from public.apartment_rooms r where r.apartment_id=a.id and r.is_available)
  for update of a;
  if not found then raise exception 'listing is unavailable for contact'; end if;

  insert into public.listing_inquiries(apartment_id,requester_id)
  values(v_listing.id,v_requester_id)
  on conflict(apartment_id,requester_id) do update
    set reconfirmation_required_at=case when public.listing_inquiries.status='pending'
          then null else public.listing_inquiries.reconfirmation_required_at end,
        updated_at=case when public.listing_inquiries.status='pending'
          then now() else public.listing_inquiries.updated_at end
  returning id into v_inquiry_id;
  return v_inquiry_id;
end;
$fn$;

create or replace function public.accept_listing_inquiry(p_inquiry_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_owner_id uuid := auth.uid();
  v_apartment_id uuid;
  v_listing public.apartments%rowtype;
  v_inquiry public.listing_inquiries%rowtype;
  v_conversation_id uuid;
begin
  if v_owner_id is null then raise exception 'authentication required'; end if;
  select apartment_id into v_apartment_id from public.listing_inquiries where id=p_inquiry_id;
  if v_apartment_id is null then raise exception 'not your inquiry'; end if;
  -- Match the parent-before-child order used by inventory/intake/send.
  select * into v_listing from public.apartments
  where id=v_apartment_id and lister_id=v_owner_id for update;
  if not found then raise exception 'not your inquiry'; end if;
  select * into v_inquiry from public.listing_inquiries
  where id=p_inquiry_id and apartment_id=v_listing.id for update;
  if not found then raise exception 'not your inquiry'; end if;
  if v_inquiry.status='accepted' and v_inquiry.conversation_id is not null then
    return v_inquiry.conversation_id;
  end if;
  if v_inquiry.status<>'pending' then raise exception 'inquiry is no longer pending'; end if;
  if v_inquiry.reconfirmation_required_at is not null then raise exception 'inquiry requires reconfirmation'; end if;
  if v_listing.status<>'active' or not v_listing.inquiries_open
    or not exists(select 1 from public.apartment_rooms r where r.apartment_id=v_listing.id and r.is_available)
    or public.blocked_with(v_inquiry.requester_id)
  then raise exception 'listing or requester unavailable'; end if;

  insert into public.conversations default values returning id into v_conversation_id;
  insert into public.conversation_members(conversation_id,user_id)
  values(v_conversation_id,v_listing.lister_id),(v_conversation_id,v_inquiry.requester_id);
  insert into public.messages(conversation_id,sender_id,kind,body)
  values(v_conversation_id,null,'system','הפנייה אושרה. הכתובת המדויקת זמינה כעת בכרטיס למעלה.');
  update public.listing_inquiries set status='accepted',conversation_id=v_conversation_id,updated_at=now()
  where id=v_inquiry.id;
  return v_conversation_id;
end;
$fn$;

revoke all on function public.create_listing_inquiry(uuid) from public,anon;
revoke all on function public.accept_listing_inquiry(uuid) from public,anon;
grant execute on function public.create_listing_inquiry(uuid) to authenticated;
grant execute on function public.accept_listing_inquiry(uuid) to authenticated;
comment on function public.set_owned_listing_intake(uuid,boolean) is
  'D18 owner-only inquiry intake. Stop flags pending for explicit requester reconfirmation; reopen never clears it. Rooms/status/accepted chats remain independent.';
commit;
