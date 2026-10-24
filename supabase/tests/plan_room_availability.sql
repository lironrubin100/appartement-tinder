-- Run in the disposable resident SQL harness after its users are onboarded.
do $test$
declare
  v_owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  v_requester_id constant uuid := '00000000-0000-4000-8000-000000000007';
  v_outsider_id constant uuid := '00000000-0000-4000-8000-000000000009';
  v_listing_id constant uuid := '44000000-0000-4000-8000-000000000001';
  v_first_room_id constant uuid := '44000000-0000-4000-8000-000000000011';
  v_second_room_id constant uuid := '44000000-0000-4000-8000-000000000012';
  v_pending_id constant uuid := '44000000-0000-4000-8000-000000000021';
  v_accepted_id constant uuid := '44000000-0000-4000-8000-000000000022';
  v_accepted_conversation_id constant uuid := '44000000-0000-4000-8000-000000000031';
  v_result jsonb;
  v_reconfirmed_id uuid;
  v_reconfirmation_required boolean;
  v_new_conversation_id uuid;
  v_pending_status text;
  v_accepted_status text;
  v_preserved_conversation_id uuid;
  v_denied boolean := false;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(v_listing_id,v_owner_id,'user','Room availability fixture','Private room availability address',31.25,34.79,1800,2);
  insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available)
  values(v_first_room_id,v_listing_id,'First room',1800,'2026-12-01',true),
        (v_second_room_id,v_listing_id,'Second room',2400,'2026-12-02',true);
  insert into public.conversations(id) values(v_accepted_conversation_id);
  insert into public.conversation_members(conversation_id,user_id)
  values(v_accepted_conversation_id,v_owner_id),(v_accepted_conversation_id,v_requester_id);
  insert into public.listing_inquiries(id,apartment_id,requester_id,status)
  values(v_pending_id,v_listing_id,v_requester_id,'pending'),
        (v_accepted_id,v_listing_id,v_outsider_id,'accepted');
  update public.listing_inquiries
  set conversation_id=v_accepted_conversation_id
  where id=v_accepted_id;

  perform set_config('request.jwt.claim.sub',v_owner_id::text,true);
  execute 'set local role authenticated';
  v_result := public.set_owned_room_availability(v_first_room_id,false);
  if v_result->>'roomId' <> v_first_room_id::text
    or v_result->>'isAvailable' <> 'false'
    or v_result->>'availableRoomCount' <> '1'
    or v_result->>'minRoomPrice' <> '2400'
    or v_result->>'maxRoomPrice' <> '2400'
    or v_result->>'revision' <> '1'
    or v_result->>'pendingReconfirmationCount' <> '0'
  then raise exception 'single-room availability summary invalid'; end if;
  if (select is_available from public.apartment_rooms where id=v_first_room_id)
    or not (select is_available from public.apartment_rooms where id=v_second_room_id)
    or (select reconfirmation_required_at is not null from public.listing_inquiries where id=v_pending_id)
    or (select available_room_count from public.apartments_public where id=v_listing_id) <> 1
    or (select min_room_price from public.apartments_public where id=v_listing_id) <> 2400
    or (select max_room_price from public.apartments_public where id=v_listing_id) <> 2400
  then raise exception 'single-room closure changed the wrong public state'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub',v_outsider_id::text,true);
  execute 'set local role authenticated';
  v_denied := false;
  begin
    perform public.set_owned_room_availability(v_second_room_id,false);
  exception when others then
    if sqlerrm <> 'NOT_FOUND' then raise; end if;
    v_denied := true;
  end;
  if not v_denied then raise exception 'foreign owner availability mutation succeeded'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub',v_owner_id::text,true);
  execute 'set local role authenticated';
  v_denied := false;
  begin
    update public.apartment_rooms set is_available=false where id=v_second_room_id;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'direct room inventory mutation succeeded'; end if;
  v_result := public.set_owned_room_availability(v_second_room_id,false);
  if v_result->>'availableRoomCount' <> '0'
    or v_result->>'revision' <> '2'
    or v_result->>'pendingReconfirmationCount' <> '1'
    or exists(select 1 from public.apartments_public where id=v_listing_id)
    or not (select reconfirmation_required_at is not null from public.listing_inquiries where id=v_pending_id)
    or (select status from public.listing_inquiries where id=v_accepted_id) <> 'accepted'
    or (select conversation_id from public.listing_inquiries where id=v_accepted_id) <> v_accepted_conversation_id
    or (select count(*) from public.conversation_members where conversation_id=v_accepted_conversation_id) <> 2
  then raise exception 'final-room closure did not preserve D18 state'; end if;

  v_result := public.set_owned_room_availability(v_second_room_id,true);
  if v_result->>'availableRoomCount' <> '1'
    or v_result->>'minRoomPrice' <> '2400'
    or v_result->>'maxRoomPrice' <> '2400'
    or v_result->>'revision' <> '3'
    or not exists(select 1 from public.apartments_public where id=v_listing_id and available_room_count=1 and min_room_price=2400 and max_room_price=2400)
    or not (select reconfirmation_required_at is not null from public.listing_inquiries where id=v_pending_id)
  then raise exception 'reopening room cleared required reconfirmation or public summary'; end if;
  v_denied := false;
  begin
    perform public.accept_listing_inquiry(v_pending_id);
  exception when others then
    if sqlerrm <> 'inquiry requires reconfirmation' then raise; end if;
    v_denied := true;
  end;
  if not v_denied then raise exception 'reopened inventory accepted stale pending inquiry'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub',v_requester_id::text,true);
  execute 'set local role authenticated';
  v_reconfirmed_id := public.create_listing_inquiry(v_listing_id);
  select reconfirmation_required_at is not null into v_reconfirmation_required
  from public.listing_inquiries where id=v_pending_id;
  if v_reconfirmed_id <> v_pending_id or v_reconfirmation_required then
    raise exception 'requester reconfirmation did not clear only the pending requirement';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub',v_owner_id::text,true);
  execute 'set local role authenticated';
  v_new_conversation_id := public.accept_listing_inquiry(v_pending_id);
  select status into v_pending_status from public.listing_inquiries where id=v_pending_id;
  select status, conversation_id into v_accepted_status, v_preserved_conversation_id
  from public.listing_inquiries where id=v_accepted_id;
  if v_new_conversation_id is null
    or v_pending_status <> 'accepted'
    or v_accepted_status <> 'accepted'
    or v_preserved_conversation_id <> v_accepted_conversation_id
  then raise exception 'reconfirmed pending inquiry or accepted conversation changed unexpectedly'; end if;

  execute 'reset role';
  execute 'set local role anon';
  v_denied := false;
  begin
    perform public.set_owned_room_availability(v_second_room_id,false);
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'anonymous availability mutation succeeded'; end if;
  execute 'reset role';
end
$test$;
