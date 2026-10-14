-- Run after the migration inside a BEGIN/ROLLBACK transaction.
-- Fixture identities are existing QA profiles; no changes survive this test.
update public.profile_private set phone='0500000000' where profile_id='7f66dea4-87e2-4840-bebf-76178f6c4878';
create function pg_temp.fail_qa_room() returns trigger language plpgsql as $$ begin
  if new.apartment_id='00000000-0000-4000-8000-000000000323' then raise exception 'QA room write failure'; end if;
  return new;
end $$;
create trigger qa_room_failure before insert on public.apartment_rooms for each row execute function pg_temp.fail_qa_room();
select set_config('request.jwt.claim.sub','7f66dea4-87e2-4840-bebf-76178f6c4878',true);
set local role authenticated;
select public.publish_apartment('00000000-0000-4000-8000-000000000321',
  '{"title":"QA transaction apartment","address":"PRIVATE QA ADDRESS","latitude":31.252,"longitude":34.791,"bedrooms":3,"billsIncluded":true,"availableFrom":"2026-11-01","description":"QA description","photos":["a.jpg","b.jpg","c.jpg"],"roomPrices":[1700,2200]}'::jsonb);
do $$ begin
  if (select count(*) from public.apartment_rooms where apartment_id='00000000-0000-4000-8000-000000000321') <> 2 then raise exception 'Room persistence failed'; end if;
  if not exists(select 1 from public.get_public_listing('00000000-0000-4000-8000-000000000321') where min_room_price=1700 and max_room_price=2200 and available_room_count=2) then raise exception 'Room summary failed'; end if;
  begin
    perform public.publish_apartment('00000000-0000-4000-8000-000000000322',
      '{"title":"QA invalid apartment","address":"PRIVATE","latitude":31.252,"longitude":34.791,"bedrooms":1,"availableFrom":"2026-11-01","photos":["a","b","c"],"roomPrices":[1700,2200]}');
    raise exception 'Invalid publication unexpectedly passed';
  exception when raise_exception then
    if sqlerrm <> 'Invalid listing' then raise; end if;
  end;
  if exists(select 1 from public.apartments where id='00000000-0000-4000-8000-000000000322') then raise exception 'Invalid publication left a parent'; end if;
  begin
    perform public.publish_apartment('00000000-0000-4000-8000-000000000323',
      '{"title":"QA room failure","address":"PRIVATE","latitude":31.252,"longitude":34.791,"bedrooms":3,"availableFrom":"2026-11-01","photos":["a","b","c"],"roomPrices":[1700,2200]}');
    raise exception 'Room failure unexpectedly passed';
  exception when raise_exception then
    if sqlerrm <> 'QA room write failure' then raise; end if;
  end;
  if exists(select 1 from public.apartments where id='00000000-0000-4000-8000-000000000323') then raise exception 'Room failure left a parent'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','f1bd5fe6-0091-4496-b438-fe8ecc9d7b67',true);
set local role authenticated;
do $$ declare affected integer; begin
  update public.apartments set status='taken' where id='00000000-0000-4000-8000-000000000321';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Non-owner update succeeded'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare result jsonb; begin
  select to_jsonb(p) into result from public.get_public_listing('00000000-0000-4000-8000-000000000321') p;
  if result is null then raise exception 'Anonymous listing read failed'; end if;
  if result ?| array['address','lat','lng','lister_id','phone'] then raise exception 'Private field leaked'; end if;
  if has_function_privilege('anon','public.publish_apartment(uuid,jsonb)','execute') then raise exception 'Anonymous publication enabled'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','7f66dea4-87e2-4840-bebf-76178f6c4878',true);
set local role authenticated;
update public.apartments set status='taken' where id='00000000-0000-4000-8000-000000000321';
do $$ begin
  if exists(select 1 from public.get_public_listing('00000000-0000-4000-8000-000000000321')) then raise exception 'Rented listing remained public'; end if;
end $$;
reset role;
select 'PASS: atomic publication, room summaries, invalid input rollback, non-owner isolation, anonymous privacy, rented exclusion' as verification;
