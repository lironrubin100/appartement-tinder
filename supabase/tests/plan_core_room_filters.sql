-- Disposable harness only; the live feature performs no data writes.
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  outsider_id constant uuid := '00000000-0000-4000-8000-000000000009';
  active_id constant uuid := '34000000-0000-4000-8000-000000000001';
  taken_id constant uuid := '34000000-0000-4000-8000-000000000002';
  empty_id constant uuid := '34000000-0000-4000-8000-000000000003';
  actor uuid;
  rejected boolean;
  bad integer;
  result jsonb;
begin
  if exists(select 1 from pg_proc where oid='public.match_public_listing_ids(uuid[],integer,integer,date,integer,boolean,boolean)'::regprocedure
    and (prosecdef or provolatile<>'s')) then raise exception 'Matcher must remain stable invoker'; end if;
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,bills_included,is_sublet,status)
  values(active_id,owner_id,'user','Room filter fixture','Private room filter address',31.25,34.79,900,3,true,false,'active'),
        (taken_id,owner_id,'user','Taken filter fixture','Private room filter address',31.25,34.79,900,3,true,false,'taken'),
        (empty_id,owner_id,'user','Empty filter fixture','Private room filter address',31.25,34.79,900,3,true,false,'active');
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(active_id,2000,'2026-12-01',true),(active_id,2600,'2026-12-15',true),(active_id,900,'2026-11-01',false),
        (taken_id,2000,'2026-12-01',true),(empty_id,2000,'2026-12-01',false);
  foreach actor in array array[owner_id,outsider_id,'00000000-0000-4000-8000-000000000024'::uuid] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
    if (select count(*) from public.match_public_listing_ids(array[active_id,taken_id,empty_id]))<>1
      then raise exception 'Eligibility/default filter failed';end if;
    if exists(select 1 from public.match_public_listing_ids(array[active_id],2100,2500))
      then raise exception 'Summary-range gap falsely matched';end if;
    if exists(select 1 from public.match_public_listing_ids(array[active_id],2500,2700,'2026-12-01'))
      then raise exception 'Price/date combined different rooms';end if;
    if exists(select 1 from public.match_public_listing_ids(array[active_id],0,1000))
      then raise exception 'Unavailable cheap room matched';end if;
    if (select count(*) from public.match_public_listing_ids(array[active_id],2000,2000,'2026-12-01',3,true,false))<>1
      or (select count(*) from public.match_public_listing_ids(array[active_id],2600,2600,'2026-12-15'))<>1
      then raise exception 'Inclusive room price/date failed';end if;
    if exists(select 1 from public.match_public_listing_ids(array[active_id],0,6000,null,4))
      or exists(select 1 from public.match_public_listing_ids(array[active_id],0,6000,null,null,false,true))
      then raise exception 'Apartment bedroom/sublet filter failed';end if;
    if (select count(*) from public.match_public_listing_ids(array[active_id,active_id]))<>1
      or (select count(*) from public.match_public_listing_ids(array_fill(active_id,array[500])))<>1
      or exists(select 1 from public.match_public_listing_ids('{}'::uuid[]))
      then raise exception 'Bounded candidate semantics failed';end if;
    select to_jsonb(projected) into result from (select * from public.match_public_listing_ids(array[active_id])) projected;
    if result<>jsonb_build_object('id',active_id) then raise exception 'Matcher returned extra fields';end if;
    for bad in 1..6 loop
      rejected:=false;
      begin
        if bad=1 then perform * from public.match_public_listing_ids(array_fill(active_id,array[501]));
        elsif bad=2 then perform * from public.match_public_listing_ids(array[active_id,null::uuid]);
        elsif bad=3 then perform * from public.match_public_listing_ids(null::uuid[]);
        elsif bad=4 then perform * from public.match_public_listing_ids(array[active_id],2600,2000);
        elsif bad=5 then perform * from public.match_public_listing_ids(array[active_id],-1,6000);
        else perform * from public.match_public_listing_ids(array[active_id],0,6000,null,5);end if;
      exception when invalid_parameter_value then rejected:=true;end;
      if not rejected then raise exception 'Invalid matcher input accepted %',bad;end if;
    end loop;
    execute 'reset role';
  end loop;
  insert into public.blocks(blocker_id,blocked_id) values(outsider_id,owner_id);
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);execute 'set local role authenticated';
  if exists(select 1 from public.match_public_listing_ids(array[active_id])) then raise exception 'Block bypass';end if;
  execute 'reset role';delete from public.blocks where blocker_id=outsider_id and blocked_id=owner_id;
  perform set_config('request.jwt.claim.sub','',true);
  foreach bad in array array[1,2] loop
    if bad=1 then execute 'set local role anon';else execute 'set local role authenticated';end if;
    rejected:=false;begin perform * from public.match_public_listing_ids(array[active_id]);
    exception when insufficient_privilege then rejected:=true;end;
    if not rejected then raise exception 'Anonymous/null-session matcher access';end if;execute 'reset role';
  end loop;
  delete from public.apartments where id in(active_id,taken_id,empty_id);
end $test$;
