-- Disposable fixtures only. The setter preserves the accepted personal-save boundary.
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  a constant uuid := '00000000-0000-4000-8000-000000000009';
  b constant uuid := '00000000-0000-4000-8000-000000000010';
  listing_id constant uuid := '52000000-0000-4000-8000-000000000001';
  result record;
  denied boolean;
  inquiries_before bigint;
begin
  select count(*) into inquiries_before from public.listing_inquiries;
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,status)
  values(listing_id,owner_id,'user','Save state fixture','Private state address',31.25,34.79,2000,3,'active');
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(listing_id,2000,'2026-12-01',true);
  perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
  for i in 1..3 loop
    select * into result from public.set_apartment_saved(listing_id,true,a);
    if not result.saved or result.interest_count<>1 then raise exception 'repeated desired Save toggled or inflated count';end if;
  end loop;
  if (select count(*) from public.saves where apartment_id=listing_id)<>1 then raise exception 'duplicate personal row';end if;
  denied:=false;begin perform public.set_apartment_saved(listing_id,false,b);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'wrong expected actor accepted';end if;
  denied:=false;begin perform public.set_apartment_saved(listing_id,true,null);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'missing expected actor accepted';end if;
  denied:=false;begin perform public.set_apartment_saved(listing_id,null,a);
  exception when sqlstate '22023' then denied:=true;end;
  if not denied then raise exception 'null desired state accepted';end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',b::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.set_apartment_saved(listing_id,false,a);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'stale A intent ran in B session';end if;
  if exists(select 1 from public.saves where apartment_id=listing_id) then raise exception 'B sees A saved state';end if;
  select * into result from public.set_apartment_saved(listing_id,true,b);
  if not result.saved or result.interest_count<>2 then raise exception 'B save not independent';end if;
  perform public.set_apartment_saved(listing_id,true,b);
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
  for i in 1..3 loop
    select * into result from public.set_apartment_saved(listing_id,false,a);
    if result.saved or result.interest_count<>1 then raise exception 'repeated Unsave changed B state';end if;
  end loop;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',b::text,true);execute 'set local role authenticated';
  select * into result from public.set_apartment_saved(listing_id,false,b);
  if result.saved or result.interest_count<>0 then raise exception 'final state not restored';end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.set_apartment_saved(listing_id,true,owner_id);
  exception when sqlstate '22023' then denied:=true;end;
  if not denied then raise exception 'owner can use setter to bypass save eligibility';end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
  denied:=false;begin perform public.set_apartment_saved(listing_id,true,a);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'guest setter allowed';end if;
  execute 'reset role';execute 'set local role authenticated';
  denied:=false;begin perform public.set_apartment_saved(listing_id,true,a);
  exception when sqlstate '28000' then denied:=true;end;
  if not denied then raise exception 'null-session setter allowed';end if;
  execute 'reset role';
  if exists(select 1 from public.saves where apartment_id=listing_id)
    or exists(select 1 from public.apartment_interests where apartment_id=listing_id)
    or (select count(*) from public.listing_inquiries)<>inquiries_before then raise exception 'setter left state/side effects';end if;
  delete from public.apartments where id=listing_id;
end $test$;
