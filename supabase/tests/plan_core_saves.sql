-- Disposable resident harness only. All fixtures removed before returning.
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  saver_a constant uuid := '00000000-0000-4000-8000-000000000009';
  saver_b constant uuid := '00000000-0000-4000-8000-000000000010';
  lister_id constant uuid := '00000000-0000-4000-8000-000000000024';
  listing_id constant uuid := '51000000-0000-4000-8000-000000000001';
  closed_id constant uuid := '51000000-0000-4000-8000-000000000002';
  empty_id constant uuid := '51000000-0000-4000-8000-000000000003';
  denied boolean;
  result record;
  viewer uuid;
  inquiries_before bigint;
  chats_before bigint;
  groups_before bigint;
begin
  select count(*) into inquiries_before from public.listing_inquiries;
  select count(*) into chats_before from public.conversations;
  select count(*) into groups_before from public.groups;
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,status)
  values(listing_id,owner_id,'user','Personal save fixture','Private save address',31.25,34.79,2000,3,'active'),
    (closed_id,owner_id,'user','Paused save fixture','Private save address',31.25,34.79,2000,3,'paused'),
    (empty_id,owner_id,'user','Empty save fixture','Private save address',31.25,34.79,2000,3,'active');
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(listing_id,2000,'2026-12-01',true),(closed_id,2000,'2026-12-01',true),(empty_id,2000,'2026-12-01',false);
  -- Legacy shadow drift must never manufacture public interest.
  insert into public.apartment_interests(apartment_id,user_id) values(listing_id,saver_b);
  if (select interest_count from public.apartment_stats where apartment_id=listing_id)<>0 then
    raise exception 'legacy interest row inflated canonical save count'; end if;

  denied:=false;
  begin insert into public.saves(apartment_id,user_id,group_id)
    values(listing_id,saver_a,'51000000-0000-4000-8000-000000000099');
  exception when check_violation then denied:=true;end;
  if not denied then raise exception 'group-tagged save accepted';end if;
  execute $sql$create function pg_temp.reject_save_shadow() returns trigger language plpgsql as $fn$
    begin raise exception 'SAVE_TEST_SHADOW_FAILURE';end $fn$$sql$;
  execute $sql$create trigger save_test_shadow_failure before insert on public.apartment_interests
    for each row when(new.apartment_id='51000000-0000-4000-8000-000000000001')
    execute function pg_temp.reject_save_shadow()$sql$;
  perform set_config('request.jwt.claim.sub',saver_a::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.toggle_apartment_save_and_interest(listing_id);
  exception when raise_exception then
    if sqlerrm<>'SAVE_TEST_SHADOW_FAILURE' then raise;end if;denied:=true;end;
  if not denied or exists(select 1 from public.saves where apartment_id=listing_id) then
    raise exception 'failed shadow insert left a partial save';end if;
  execute 'reset role';
  execute 'drop trigger save_test_shadow_failure on public.apartment_interests';
  execute 'drop function pg_temp.reject_save_shadow()';

  perform set_config('request.jwt.claim.sub',saver_a::text,true);execute 'set local role authenticated';
  select * into result from public.toggle_apartment_save_and_interest(listing_id);
  if not result.saved or result.interest_count<>1 then raise exception 'first save did not count exactly once'; end if;
  if (select count(*) from public.saves where apartment_id=listing_id)<>1 then raise exception 'own save missing';end if;
  if (select interest_count from public.apartments_public where id=listing_id)<>1
    or (select interest_count from public.apartment_stats where apartment_id=listing_id)<>1 then
    raise exception 'public counters disagree with private save';end if;
  execute 'reset role';denied:=false;
  begin insert into public.saves(apartment_id,user_id) values(listing_id,saver_a);
  exception when unique_violation then denied:=true;end;
  if not denied then raise exception 'duplicate actor/listing save accepted';end if;
  execute 'set local role authenticated';
  denied:=false;
  begin insert into public.saves(apartment_id,user_id) values(closed_id,saver_a);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'direct save bypass allowed';end if;
  denied:=false;
  begin insert into public.apartment_interests(apartment_id,user_id) values(closed_id,saver_a);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'direct interest bypass allowed';end if;
  execute 'reset role';

  foreach viewer in array array[saver_b,owner_id,lister_id] loop
    perform set_config('request.jwt.claim.sub',viewer::text,true);execute 'set local role authenticated';
    if exists(select 1 from public.saves where apartment_id=listing_id) then raise exception 'another actor can enumerate saver';end if;
    denied:=false;begin perform 1 from public.apartment_hype_faces limit 1;
    exception when insufficient_privilege then denied:=true;end;
    if not denied then raise exception 'ordinary identity view still readable';end if;
    denied:=false;begin perform 1 from public.apartment_interests limit 1;
    exception when insufficient_privilege then denied:=true;end;
    if not denied then raise exception 'legacy saver identity rows still readable';end if;
    execute 'reset role';
  end loop;
  -- Pro never grants MVP saver identity visibility.
  update public.profiles set is_pro=true where id=owner_id;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  denied:=false;begin perform 1 from public.apartment_hype_faces limit 1;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Pro bypasses saver privacy';end if;
  denied:=false;begin perform public.toggle_apartment_save_and_interest(listing_id);
  exception when sqlstate '22023' then denied:=true;end;
  if not denied then raise exception 'owner saved own listing';end if;
  execute 'reset role';update public.profiles set is_pro=false where id=owner_id;

  perform set_config('request.jwt.claim.sub',saver_b::text,true);execute 'set local role authenticated';
  select * into result from public.toggle_apartment_save_and_interest(listing_id);
  if not result.saved or result.interest_count<>2 then raise exception 'second actor count incorrect';end if;
  if (select count(*) from public.saves where apartment_id=listing_id)<>1 then raise exception 'B sees A save';end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',saver_a::text,true);execute 'set local role authenticated';
  select * into result from public.toggle_apartment_save_and_interest(listing_id);
  if result.saved or result.interest_count<>1 then raise exception 'unsave count incorrect';end if;
  if exists(select 1 from public.saves where apartment_id=listing_id) then raise exception 'A sees B save after unsave';end if;
  foreach viewer in array array[closed_id,empty_id,'00000000-0000-4000-8000-999999999999'::uuid] loop
    denied:=false;begin perform public.toggle_apartment_save_and_interest(viewer);
    exception when sqlstate '22023' then denied:=true;end;
    if not denied then raise exception 'ineligible listing saved';end if;
  end loop;
  execute 'reset role';
  insert into public.blocks(blocker_id,blocked_id) values(saver_a,owner_id);
  perform set_config('request.jwt.claim.sub',saver_a::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.toggle_apartment_save_and_interest(listing_id);
  exception when sqlstate '22023' then denied:=true;end;
  if not denied then raise exception 'blocked owner listing saved';end if;
  execute 'reset role';delete from public.blocks where blocker_id=saver_a and blocked_id=owner_id;

  -- Removal is still possible when an already saved listing becomes unavailable.
  update public.apartments set status='taken' where id=listing_id;
  perform set_config('request.jwt.claim.sub',saver_b::text,true);execute 'set local role authenticated';
  select * into result from public.toggle_apartment_save_and_interest(listing_id);
  if result.saved or result.interest_count<>0 then raise exception 'closed private save cannot be removed';end if;
  execute 'reset role';update public.apartments set status='active' where id=listing_id;

  -- Completed listers retain ordinary personal save semantics.
  perform set_config('request.jwt.claim.sub',lister_id::text,true);execute 'set local role authenticated';
  select * into result from public.toggle_apartment_save_and_interest(listing_id);
  if not result.saved or result.interest_count<>1 then raise exception 'lister personal save failed';end if;
  perform public.toggle_apartment_save_and_interest(listing_id);execute 'reset role';

  perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
  denied:=false;begin perform public.toggle_apartment_save_and_interest(listing_id);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'guest can save';end if;
  denied:=false;begin perform 1 from public.saves;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'guest can enumerate saves';end if;
  execute 'reset role';execute 'set local role authenticated';
  denied:=false;begin perform public.toggle_apartment_save_and_interest(listing_id);
  exception when sqlstate '28000' then denied:=true;end;
  if not denied then raise exception 'null session can save';end if;
  execute 'reset role';

  if (select count(*) from public.listing_inquiries)<>inquiries_before
    or (select count(*) from public.conversations)<>chats_before
    or (select count(*) from public.groups)<>groups_before then raise exception 'saving changed inquiry/chat/group state';end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='saves_user_apartment_idx') then
    raise exception 'own-state lookup index missing';end if;
  delete from public.apartments where id in(listing_id,closed_id,empty_id);
end $test$;
