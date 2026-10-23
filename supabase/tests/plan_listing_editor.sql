-- Disposable fixtures only. The runner supplies identities and migration chain.
do $test$
declare
  v_owner constant uuid := '00000000-0000-4000-8000-000000000008';
  outsider_id constant uuid := '00000000-0000-4000-8000-000000000007';
  listing_id constant uuid := '41000000-0000-4000-8000-000000000001';
  other_listing constant uuid := '41000000-0000-4000-8000-000000000002';
  room_a constant uuid := '41000000-0000-4000-8000-000000000003';
  room_b constant uuid := '41000000-0000-4000-8000-000000000004';
  prefix constant text := 'https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
  legacy_path text := v_owner::text || '/legacy.jpg';
  snapshot jsonb;
  denied boolean := false;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,bills_included,available_from,description,photos)
  values(listing_id,v_owner,'user','Owner editor fixture','PRIVATE EDITOR ADDRESS',31.25,34.79,2100,2,true,'2026-12-01','Full owner model',array[prefix || listing_id::text || '/1.jpg',prefix || legacy_path]),
        (other_listing,outsider_id,'user','Foreign fixture','FOREIGN PRIVATE ADDRESS',31.26,34.8,2000,1,false,'2026-12-02','Foreign model','{}');
  insert into storage.objects(id,bucket_id,name,owner_id)
  values('41000000-0000-4000-8000-000000000005','apartment-photos',listing_id::text || '/1.jpg',v_owner::text),
        ('41000000-0000-4000-8000-000000000006','apartment-photos',legacy_path,v_owner::text);
  insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available,created_at)
  values(room_b,listing_id,'Unavailable retained',2600,'2026-12-03',false,'2026-10-23T00:00:00Z'),
        (room_a,listing_id,'Available room',2100,'2026-12-02',true,'2026-10-23T00:00:00Z');
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  execute 'set local role authenticated';
  snapshot := public.get_owned_listing_editor(listing_id);
  if snapshot->>'id' <> listing_id::text or snapshot->>'ownerId' <> v_owner::text or (snapshot->>'revision')::integer <> 0
    or snapshot#>>'{location,address}' <> 'PRIVATE EDITOR ADDRESS' or snapshot#>>'{location,latitude}' <> '31.25'
    or snapshot->>'billsIncluded' <> 'true' or jsonb_array_length(snapshot->'rooms') <> 2
    or snapshot#>>'{rooms,0,id}' <> room_a::text or snapshot#>>'{rooms,1,id}' <> room_b::text
    or snapshot#>>'{rooms,1,isAvailable}' <> 'false' or snapshot#>>'{rooms,0,availableFrom}' <> '2026-12-02'
    or snapshot#>>'{photos,0,objectPath}' <> listing_id::text || '/1.jpg'
    or snapshot#>>'{photos,1,objectPath}' <> legacy_path
  then raise exception 'incomplete or unordered owner model'; end if;
  if public.get_owned_listing_editor(other_listing) is not null
    or public.get_owned_listing_editor('41000000-0000-4000-8000-000000000099') is not null
  then raise exception 'foreign or missing listing leaked a payload'; end if;
  execute 'reset role';
  -- An associated URL alone cannot prove ownership of somebody else's object.
  update storage.objects set owner_id=outsider_id::text where name=legacy_path and bucket_id='apartment-photos';
  execute 'set local role authenticated';
  snapshot := public.get_owned_listing_editor(listing_id);
  if snapshot#>>'{photos,1,objectPath}' is not null then raise exception 'foreign Storage object returned as owned reference'; end if;
  execute 'reset role';
  update storage.objects set owner_id=v_owner::text where name=legacy_path and bucket_id='apartment-photos';
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  execute 'set local role authenticated';
  if public.get_owned_listing_editor(listing_id) is not null then raise exception 'outsider read owner address/rooms/media'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role anon';
  begin perform public.get_owned_listing_editor(listing_id); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'anonymous can invoke private editor reader'; end if;
  execute 'reset role';
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='apartments_public' and column_name='revision')
    or exists(select 1 from pg_proc where oid='public.get_owned_listing_editor(uuid)'::regprocedure and prosecdef)
  then raise exception 'public revision projection or privileged reader'; end if;
end
$test$;
