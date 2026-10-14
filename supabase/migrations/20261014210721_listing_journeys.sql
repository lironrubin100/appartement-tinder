-- D4/D5/D9/J15: a single active apartment, through the privacy projection.
-- No anonymous access to base tables or the bulk listing view is granted.
create or replace function public.get_public_listing(p_listing_id uuid)
returns table (id uuid, title text, public_location_label text,
  min_room_price integer, max_room_price integer, available_room_count integer,
  bills_included boolean, bedrooms integer, is_sublet boolean,
  available_from date, description text, photos text[])
language sql stable security definer set search_path = '' as $$
  select a.id,a.title,a.public_location_label,a.min_room_price,a.max_room_price,
    a.available_room_count,a.bills_included,a.bedrooms,a.is_sublet,
    a.available_from,a.description,a.photos
  from public.apartments_public a where a.id = p_listing_id;
$$;
revoke all on function public.get_public_listing(uuid) from public;
grant execute on function public.get_public_listing(uuid) to anon, authenticated;

-- D2/D3/D5/D9: all database writes succeed together, or none persist.
-- INVOKER preserves owner RLS; no privileged client is needed by the app.
create or replace function public.publish_apartment(p_listing_id uuid, p_draft jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_prices integer[];
  v_photos text[];
  v_bedrooms integer := (p_draft->>'bedrooms')::integer;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_user and p.onboarded
    and (p.mode='lister' or nullif(btrim(p.name),'') is not null)) then
    raise exception 'Complete onboarding first';
  end if;
  if not exists (select 1 from public.profile_private p where p.profile_id=v_user
    and nullif(btrim(p.phone),'') is not null) then raise exception 'Private phone required'; end if;
  select array_agg(value::integer) into v_prices from jsonb_array_elements_text(p_draft->'roomPrices');
  select array_agg(value) into v_photos from jsonb_array_elements_text(p_draft->'photos');
  if coalesce(cardinality(v_prices),0) < 1 or cardinality(v_prices) > v_bedrooms
    or v_bedrooms not between 1 and 20 or exists(select 1 from unnest(v_prices) p where p is null or p < 1)
    or coalesce(cardinality(v_photos),0) not between 3 and 8
    or nullif(btrim(p_draft->>'title'),'') is null or length(p_draft->>'title') > 100
    or nullif(btrim(p_draft->>'address'),'') is null or length(p_draft->>'address') > 200
    or length(coalesce(p_draft->>'description','')) > 2000
    or (p_draft->>'latitude')::numeric not between -90 and 90
    or (p_draft->>'longitude')::numeric not between -180 and 180
    or nullif(p_draft->>'availableFrom','') is null
  then raise exception 'Invalid listing'; end if;
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,
    bills_included,available_from,description,photos,public_location_label,status)
  values(p_listing_id,v_user,'user',btrim(p_draft->>'title'),btrim(p_draft->>'address'),
    (p_draft->>'latitude')::numeric,(p_draft->>'longitude')::numeric,
    (select min(p) from unnest(v_prices) p),v_bedrooms,
    coalesce((p_draft->>'billsIncluded')::boolean,false),(p_draft->>'availableFrom')::date,
    nullif(btrim(p_draft->>'description'),''),v_photos,'אזור משוער בבאר שבע','active');
  insert into public.apartment_rooms(apartment_id,label,monthly_price,available_from,is_available)
  select p_listing_id,'חדר פנוי ' || ordinality,price,(p_draft->>'availableFrom')::date,true
    from unnest(v_prices) with ordinality as rooms(price,ordinality);
  return p_listing_id;
end;
$$;
revoke all on function public.publish_apartment(uuid,jsonb) from public, anon;
grant execute on function public.publish_apartment(uuid,jsonb) to authenticated;
