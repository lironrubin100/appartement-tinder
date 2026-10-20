-- Publication receipts are private and remain for the lifetime of the listing.
create table public.listing_publication_requests (
  actor_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  payload_hash bytea not null,
  listing_id uuid not null,
  cancelled boolean not null default false,
  primary key (actor_id, request_key)
);
alter table public.listing_publication_requests enable row level security;
revoke all on public.listing_publication_requests from public, anon, authenticated;

-- Never trust a photo URL without checking the actual Storage owner and path.
create function public.listing_photos_owned(p_listing_id uuid, p_photos text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and coalesce(cardinality(p_photos),0) between 3 and 8
    and (select count(distinct photo) from unnest(p_photos) photo) = cardinality(p_photos)
    and not exists (
      select 1 from unnest(p_photos) with ordinality as ph(url, pos)
      where not exists (select 1 from storage.objects o
        where o.bucket_id='apartment-photos' and o.owner_id=auth.uid()::text
          and o.name=p_listing_id::text || '/' || ph.pos::text || '.jpg'
          and ph.url='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/' || o.name)
    );
$$;
revoke all on function public.listing_photos_owned(uuid,text[]) from public, anon;
grant execute on function public.listing_photos_owned(uuid,text[]) to authenticated;
-- D2/B2: only nonresident listers require a private phone to publish.
create or replace function public.publish_apartment(p_listing_id uuid, p_draft jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_prices integer[];
  v_photos text[];
  v_bedrooms integer := (p_draft->>'bedrooms')::integer;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  -- The same lock is taken by retry and cancellation before inspecting a
  -- receipt. This also protects the compatible legacy publication RPC.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_listing_id::text, 0));
  if exists (select 1 from public.listing_publication_requests r
    where r.actor_id=v_user and r.request_key=p_listing_id and r.cancelled) then
    raise exception 'REQUEST_CANCELLED';
  end if;
  if not exists (select 1 from public.profiles p where p.id=v_user and p.onboarded
    and (p.mode='lister' or nullif(btrim(p.name),'') is not null)) then
    raise exception 'Complete onboarding first';
  end if;
  if exists (select 1 from public.profiles p where p.id=v_user and p.mode='lister')
    and not exists (select 1 from public.profile_private p where p.profile_id=v_user
      and nullif(btrim(p.phone),'') is not null) then raise exception 'Private phone required'; end if;
  select array_agg(value::integer) into v_prices from jsonb_array_elements_text(p_draft->'roomPrices');
  select array_agg(value) into v_photos from jsonb_array_elements_text(p_draft->'photos');
  if not public.listing_photos_owned(p_listing_id,v_photos) then raise exception 'Invalid owned photos'; end if;
  if coalesce(cardinality(v_prices),0) < 1 or cardinality(v_prices) > v_bedrooms
    or v_bedrooms not between 1 and 20 or exists(select 1 from unnest(v_prices) p where p is null or p < 1)
    or coalesce(cardinality(v_photos),0) not between 3 and 8
    or nullif(btrim(p_draft->>'title'),'') is null or length(p_draft->>'title') > 100
    or nullif(btrim(p_draft->>'address'),'') is null or length(p_draft->>'address') > 200
    or length(coalesce(p_draft->>'description','')) > 2000
    or (p_draft->>'latitude') is null or (p_draft->>'latitude')::numeric not between 29.4 and 33.4
    or (p_draft->>'longitude') is null or (p_draft->>'longitude')::numeric not between 34.2 and 35.95
    or nullif(p_draft->>'availableFrom','') is null
  then raise exception 'Invalid listing'; end if;
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,
    bills_included,available_from,description,photos,public_location_label,status)
  values(p_listing_id,v_user,'user',btrim(p_draft->>'title'),btrim(p_draft->>'address'),
    (p_draft->>'latitude')::numeric,(p_draft->>'longitude')::numeric,
    (select min(p) from unnest(v_prices) p),v_bedrooms,
    coalesce((p_draft->>'billsIncluded')::boolean,false),(p_draft->>'availableFrom')::date,
    nullif(btrim(p_draft->>'description'),''),v_photos,'אזור משוער','active');
  insert into public.apartment_rooms(apartment_id,label,monthly_price,available_from,is_available)
  select p_listing_id,'חדר פנוי ' || ordinality,price,(p_draft->>'availableFrom')::date,true
    from unnest(v_prices) with ordinality as rooms(price,ordinality);
  return p_listing_id;
end;
$$;
revoke all on function public.publish_apartment(uuid,jsonb) from public, anon;
grant execute on function public.publish_apartment(uuid,jsonb) to authenticated;

-- New apartments must pass the guarded RPC. Existing status updates (such as
-- mark rented) remain available; direct edits of precise location/photos do not.
revoke insert, update on public.apartments from public, anon, authenticated;
grant update(status) on public.apartments to authenticated;

-- Room writes still need to refresh the derived parent price after the direct
-- apartment price grant is removed. The trigger itself cannot be called as RPC.
create or replace function public.refresh_apartment_room_price() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target_apartment_id uuid := coalesce(new.apartment_id, old.apartment_id);
begin
  update public.apartments as apartment
    set price = room_prices.lowest_price
    from (select min(monthly_price)::int as lowest_price from public.apartment_rooms
      where apartment_id = target_apartment_id and is_available) room_prices
    where apartment.id = target_apartment_id and room_prices.lowest_price is not null;
  return null;
end;
$$;

-- A receipt and the apartment/rooms commit in one transaction. The unique
-- actor/key serializes concurrent retries; a changed payload never reuses it.
create or replace function public.publish_apartment_once(p_request_key uuid, p_draft jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_hash bytea;
  v_existing public.listing_publication_requests%rowtype;
  v_result uuid;
  v_created boolean := false;
begin
  if v_actor is null or p_request_key is null or p_draft is null then
    raise exception 'AUTH_OR_REQUEST_REQUIRED';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_request_key::text, 0));
  v_hash := pg_catalog.sha256(pg_catalog.convert_to(p_draft::text,'UTF8'));
  insert into public.listing_publication_requests(actor_id,request_key,payload_hash,listing_id)
    values(v_actor,p_request_key,v_hash,p_request_key)
    on conflict(actor_id,request_key) do nothing returning true into v_created;
  select * into v_existing from public.listing_publication_requests
    where actor_id=v_actor and request_key=p_request_key for update;
  if v_existing.cancelled then raise exception 'REQUEST_CANCELLED'; end if;
  if v_existing.payload_hash is distinct from v_hash then raise exception 'REQUEST_CONFLICT'; end if;
  if not coalesce(v_created,false) then
    if exists(select 1 from public.apartments a where a.id=v_existing.listing_id and a.lister_id=v_actor) then
      return v_existing.listing_id;
    end if;
    raise exception 'LISTING_UNAVAILABLE';
  end if;
  -- publish_apartment validates eligibility, all fields and the caller-owned
  -- Storage objects. It writes the parent and rooms within this transaction.
  v_result := public.publish_apartment(v_existing.listing_id,p_draft);
  if v_result is distinct from v_existing.listing_id then raise exception 'INVALID_RESULT'; end if;
  return v_result;
end;
$$;
revoke all on function public.publish_apartment_once(uuid,jsonb) from public, anon;
grant execute on function public.publish_apartment_once(uuid,jsonb) to authenticated;

-- Cancellation is a durable tombstone, not a guess about whether a timed-out
-- publication committed. It serializes with both publication entrypoints.
create or replace function public.cancel_listing_publication(p_request_key uuid)
returns text language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_existing public.listing_publication_requests%rowtype;
begin
  if v_actor is null or p_request_key is null then raise exception 'AUTH_OR_REQUEST_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_request_key::text, 0));
  -- Legacy clients can have published without creating a receipt.
  if exists (select 1 from public.apartments a where a.id=p_request_key and a.lister_id=v_actor) then
    return 'published';
  end if;
  -- Older clients used account-prefixed paths. Refuse cancellation whenever
  -- any listing references this prefix, even if its ID differs from the key.
  if exists (select 1 from public.apartments a cross join lateral unnest(a.photos) photo(url)
    where position('/apartment-photos/' || p_request_key::text || '/' in photo.url) > 0) then
    raise exception 'PHOTO_IN_USE';
  end if;
  insert into public.listing_publication_requests(actor_id,request_key,payload_hash,listing_id,cancelled)
    values(v_actor,p_request_key,pg_catalog.sha256(''::bytea),p_request_key,true)
    on conflict(actor_id,request_key) do nothing;
  select * into v_existing from public.listing_publication_requests
    where actor_id=v_actor and request_key=p_request_key for update;
  if not v_existing.cancelled then raise exception 'LISTING_UNAVAILABLE'; end if;
  return 'cancelled';
end;
$$;
revoke all on function public.cancel_listing_publication(uuid) from public, anon;
grant execute on function public.cancel_listing_publication(uuid) to authenticated;

-- Serialize recognized attempt uploads with cancellation. A cancelled key
-- cannot acquire new object metadata after its cleanup has started.
create function public.listing_photo_attempt_active(p_name text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_key uuid;
begin
  if v_actor is null then return false; end if;
  if p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-8]\.jpg$' then
    return true; -- Preserve the existing legacy owner-prefixed upload policy.
  end if;
  v_key := split_part(p_name,'/',1)::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_key::text, 0));
  return not exists (select 1 from public.listing_publication_requests r
    where r.actor_id=v_actor and r.request_key=v_key and r.cancelled);
end;
$$;
revoke all on function public.listing_photo_attempt_active(text) from public, anon;
grant execute on function public.listing_photo_attempt_active(text) to authenticated;

drop policy if exists "users upload their own apartment photos" on storage.objects;
create policy "users upload their own apartment photos" on storage.objects for insert to authenticated
  with check (bucket_id='apartment-photos' and owner_id=(select auth.uid()::text)
    and ((storage.foldername(name))[1]=(select auth.uid()::text)
      or name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-8]\.jpg$')
    and public.listing_photo_attempt_active(name));
drop policy if exists "users update their own apartment photos" on storage.objects;
create policy "users update their own apartment photos" on storage.objects for update to authenticated
  using (bucket_id='apartment-photos' and owner_id=(select auth.uid()::text))
  with check (bucket_id='apartment-photos' and owner_id=(select auth.uid()::text)
    and public.listing_photo_attempt_active(name));
