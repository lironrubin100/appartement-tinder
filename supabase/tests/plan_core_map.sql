-- Disposable resident harness only; no hosted fixture or schema changes.
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  outsider_id constant uuid := '00000000-0000-4000-8000-000000000009';
  active_id constant uuid := '31000000-0000-4000-8000-000000000001';
  empty_id constant uuid := '31000000-0000-4000-8000-000000000002';
  taken_id constant uuid := '31000000-0000-4000-8000-000000000003';
  paused_id constant uuid := '31000000-0000-4000-8000-000000000004';
  public_point jsonb;
  result jsonb;
  actor_id uuid;
  denied boolean := false;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,status)
  values(active_id,owner_id,'user','Core map active fixture','Private core map address',31.25,34.79,900,3,'active'),
        (empty_id,owner_id,'user','Core map closed room fixture','Private core map address',31.25,34.79,900,3,'active'),
        (taken_id,owner_id,'user','Core map taken fixture','Private core map address',31.25,34.79,900,3,'taken'),
        (paused_id,owner_id,'user','Core map paused fixture','Private core map address',31.25,34.79,900,3,'paused');
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(active_id,2000,'2026-12-01',true),(active_id,2600,'2026-12-01',true),
        (active_id,900,'2026-12-01',false),(empty_id,2000,'2026-12-01',false),
        (taken_id,2000,'2026-12-01',true),(paused_id,2000,'2026-12-01',true);
  select jsonb_build_object('lat',public_lat,'lng',public_lng) into public_point
  from public.apartments where id=active_id;
  if public_point = jsonb_build_object('lat',31.25,'lng',34.79) then
    raise exception 'public point equals private point';
  end if;

  foreach actor_id in array array[owner_id,outsider_id,'00000000-0000-4000-8000-000000000024'::uuid] loop
    perform set_config('request.jwt.claim.sub',actor_id::text,true);
    execute 'set local role authenticated';
    select to_jsonb(p) into result from public.apartments_public p where id=active_id;
    if result is null or result->>'id' <> active_id::text or result->>'status' <> 'active'
      or (result->>'available_room_count')::int <> 2
      or (result->>'min_room_price')::int <> 2000 or (result->>'max_room_price')::int <> 2600
      or (result->>'price')::int <> 2000 then raise exception 'public available-room summary incorrect'; end if;
    if result ?| array['address','lister_id','contact_url','public_lat','public_lng','exact_lat','exact_lng','phone','location_seed']
      or result->>'description' like '%Private core map address%'
      or jsonb_build_object('lat',result->'lat','lng',result->'lng') <> public_point
    then raise exception 'public projection leaks private fields or wrong point'; end if;
    if exists(select 1 from public.apartments_public where id in(empty_id,taken_id,paused_id)) then
      raise exception 'ineligible apartment returned by public map view';
    end if;
    if (select to_jsonb(p) from public.apartments_public p where id=active_id) <> result then
      raise exception 'public point or summary unstable on repeat read';
    end if;
    select to_jsonb(p) into result from public.get_public_listing(active_id) p;
    if result->'rooms' <> '[{"monthly_price":2000,"available_from":"2026-12-01"},{"monthly_price":2600,"available_from":"2026-12-01"}]'::jsonb
      or (result->>'available_room_count')::int <> 2
      or result ?| array['address','lat','lng','lister_id','phone','contact_url','location_seed']
      or exists(select 1 from jsonb_array_elements(result->'rooms') room
        where (select array_agg(key order by key) from jsonb_object_keys(room) key) <> array['available_from','monthly_price'])
    then raise exception 'public detail room projection missing or unsafe'; end if;
    if exists(select 1 from public.get_public_listing(empty_id))
      or exists(select 1 from public.get_public_listing(taken_id))
      or exists(select 1 from public.get_public_listing(paused_id))
    then raise exception 'ineligible listing detail returned'; end if;
    execute 'reset role';
  end loop;

  insert into public.blocks(blocker_id,blocked_id) values(outsider_id,owner_id);
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from public.apartments_public where id=active_id) then
    raise exception 'blocked poster remained in authenticated map view';
  end if;
  if exists(select 1 from public.get_public_listing(active_id)) then
    raise exception 'blocked poster remained in listing detail';
  end if;
  execute 'reset role';
  delete from public.blocks where blocker_id=outsider_id and blocked_id=owner_id;

  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role anon';
  select to_jsonb(p) into result from public.get_public_listing(active_id) p;
  if result is null or jsonb_array_length(result->'rooms') <> 2
    or result ?| array['address','lat','lng','lister_id','phone','contact_url','location_seed']
  then raise exception 'anonymous public detail contract unavailable or unsafe'; end if;
  begin
    perform id from public.apartments_public where id=active_id;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'anonymous direct map view access unexpectedly granted'; end if;
  execute 'reset role';
  delete from public.apartments where id in(active_id,empty_id,taken_id,paused_id);
end
$test$;
