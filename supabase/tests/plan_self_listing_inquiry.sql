-- Run in the disposable resident SQL harness after its users are onboarded.
do $test$
declare
  v_owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  v_requester_id constant uuid := '00000000-0000-4000-8000-000000000007';
  listing_id constant uuid := '10000000-0000-4000-8000-000000000099';
  before_conversations bigint;
  created_inquiry uuid;
  denied boolean := false;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(listing_id,v_owner_id,'user','Self inquiry fixture','Private address',31.25,34.79,2000,3);
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(listing_id,2000,'2026-12-01',true);
  select count(*) into before_conversations from public.conversations;
  perform set_config('request.jwt.claim.sub',v_owner_id::text,true);
  execute 'set local role authenticated';
  begin
    perform public.create_listing_inquiry(listing_id);
  exception when others then
    if sqlerrm <> 'listing is unavailable for contact' then raise; end if;
    denied := true;
  end;
  execute 'reset role';
  if not denied then raise exception 'owner inquiry was accepted'; end if;
  if exists (select 1 from public.listing_inquiries where apartment_id=listing_id)
     or (select count(*) from public.conversations) <> before_conversations
     or exists (select 1 from public.listing_address_access where apartment_id=listing_id)
  then raise exception 'owner inquiry produced a side effect'; end if;
  perform set_config('request.jwt.claim.sub',v_requester_id::text,true);
  execute 'set local role authenticated';
  created_inquiry := public.create_listing_inquiry(listing_id);
  execute 'reset role';
  if not exists (select 1 from public.listing_inquiries where id=created_inquiry and apartment_id=listing_id and requester_id=v_requester_id and status='pending')
  then raise exception 'other requester inquiry missing'; end if;
end
$test$;
