-- Disposable transaction; no live target or retained scenario is used here.
begin;
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000010';
  pending_actor constant uuid := '00000000-0000-4000-8000-000000000011';
  accepted_actor constant uuid := '00000000-0000-4000-8000-000000000012';
  foreign_actor constant uuid := '00000000-0000-4000-8000-000000000013';
  new_actor constant uuid := '00000000-0000-4000-8000-000000000014';
  listing_id constant uuid := '41700000-0000-4000-8000-000000000001';
  room_one constant uuid := '41700000-0000-4000-8000-000000000011';
  room_two constant uuid := '41700000-0000-4000-8000-000000000012';
  pending_id uuid;
  accepted_id uuid;
  accepted_chat uuid;
  new_chat uuid;
  rooms_before jsonb;
  result jsonb;
  denied boolean;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(listing_id,owner_id,'user','Intake fixture','No real address',31.25,34.79,1800,2);
  insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available)
  values(room_one,listing_id,'First room',1800,'2026-12-01',true),(room_two,listing_id,'Second room',2400,'2026-12-02',true);
  select jsonb_agg(to_jsonb(r) order by id) into rooms_before from public.apartment_rooms r where apartment_id=listing_id;
  if not(select inquiries_open from public.apartments where id=listing_id) then raise exception 'new listing intake must default open';end if;

  perform set_config('request.jwt.claim.sub',foreign_actor::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.set_owned_listing_intake(listing_id,false);
  exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;denied:=true;end;
  if not denied then raise exception 'foreign actor changed intake';end if;
  execute 'reset role';execute 'set local role anon';
  denied:=false;begin perform public.set_owned_listing_intake(listing_id,false);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'anonymous intake mutation succeeded';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  denied:=false;begin update public.apartments set inquiries_open=false where id=listing_id;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'direct owner intake mutation succeeded';end if;
  denied:=false;begin perform public.set_owned_listing_intake(listing_id,null);
  exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'null intake accepted';end if;

  result:=public.set_owned_listing_intake(listing_id,false);
  if result->>'intakeOpen'<>'false' or result->>'revision'<>'1' or result->>'pendingReconfirmationCount'<>'0'
    or (select jsonb_agg(to_jsonb(r) order by id) from public.apartment_rooms r where apartment_id=listing_id) is distinct from rooms_before
    or (select status from public.apartments where id=listing_id)<>'active'
    or not exists(select 1 from public.apartments_public where id=listing_id and available_room_count=2)
  then raise exception 'intake stop changed inventory/visibility or returned wrong state';end if;
  result:=public.set_owned_listing_intake(listing_id,false);
  if result->>'revision'<>'1' then raise exception 'unchanged intake advanced revision';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',new_actor::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.create_listing_inquiry(listing_id);
  exception when others then if sqlerrm<>'listing is unavailable for contact' then raise;end if;denied:=true;end;
  if not denied or exists(select 1 from public.listing_inquiries where apartment_id=listing_id and requester_id=new_actor) then raise exception 'stopped intake created a new inquiry';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  result:=public.set_owned_listing_intake(listing_id,true);
  if result->>'revision'<>'2' or result->>'intakeOpen'<>'true' then raise exception 'intake did not reopen';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',accepted_actor::text,true);execute 'set local role authenticated';
  accepted_id:=public.create_listing_inquiry(listing_id);
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  accepted_chat:=public.accept_listing_inquiry(accepted_id);
  execute 'reset role';perform set_config('request.jwt.claim.sub',pending_actor::text,true);execute 'set local role authenticated';
  pending_id:=public.create_listing_inquiry(listing_id);
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  result:=public.set_owned_listing_intake(listing_id,false);
  if result->>'revision'<>'3' or result->>'pendingReconfirmationCount'<>'1'
    or not(select reconfirmation_required_at is not null from public.listing_inquiries where id=pending_id)
    or (select status from public.listing_inquiries where id=accepted_id)<>'accepted'
    or (select conversation_id from public.listing_inquiries where id=accepted_id)<>accepted_chat
  then raise exception 'stop did not preserve accepted/mark pending';end if;
  if public.accept_listing_inquiry(accepted_id)<>accepted_chat then raise exception 'stopped intake lost accepted chat reuse';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',accepted_actor::text,true);execute 'set local role authenticated';
  if not exists(select 1 from public.conversations where id=accepted_chat)
    or not exists(select 1 from public.listing_address_access where apartment_id=listing_id)
  then raise exception 'accepted chat/address access lost on stop';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  result:=public.set_owned_listing_intake(listing_id,true);
  denied:=false;begin perform public.accept_listing_inquiry(pending_id);
  exception when others then if sqlerrm<>'inquiry requires reconfirmation' then raise;end if;denied:=true;end;
  if not denied or not(select reconfirmation_required_at is not null from public.listing_inquiries where id=pending_id) then raise exception 'reopen automatically enabled stale pending';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',pending_actor::text,true);execute 'set local role authenticated';
  if public.create_listing_inquiry(listing_id)<>pending_id then raise exception 'reconfirmation created another request';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  new_chat:=public.accept_listing_inquiry(pending_id);
  if new_chat is null or new_chat=accepted_chat then raise exception 'reconfirmed inquiry chat invalid';end if;

  perform public.set_owned_listing_intake(listing_id,false);
  perform public.set_owned_room_availability(room_one,false);
  perform public.set_owned_room_availability(room_one,true);
  if (select inquiries_open from public.apartments where id=listing_id) then raise exception 'inventory change reopened intake';end if;
  perform public.set_owned_listing_intake(listing_id,true);
  if (select jsonb_agg(to_jsonb(r) order by id) from public.apartment_rooms r where apartment_id=listing_id) is distinct from rooms_before then raise exception 'intake altered room contents';end if;
  if (select count(*) from public.conversation_members where conversation_id in(accepted_chat,new_chat))<>4 then raise exception 'accepted memberships changed';end if;
  execute 'reset role';
end;
$test$;
rollback;
