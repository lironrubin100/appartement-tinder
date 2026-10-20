-- D4/J6: persist a cryptographically random public point. Never derive it from
-- the public listing ID. This migration rotates existing public points once;
-- review previously observed/cached positions before applying to any host.
begin;
-- Serialize publication and edits with the function replacement/backfill, so
-- no concurrent insert can commit an old deterministic point during rotation.
lock table public.apartments in share row exclusive mode;
create function public.random_listing_public_point(p_lat double precision, p_lng double precision)
returns table(public_lat double precision, public_lng double precision)
language plpgsql volatile set search_path = '' as $$
declare
  -- gen_random_uuid is backed by PostgreSQL's cryptographic random generator.
  -- The first 48 bits are random and avoid UUID version/variant bits.
  angle_fraction double precision := (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint)::double precision / 281474976710656.0;
  radius_fraction double precision := (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint)::double precision / 281474976710656.0;
  angle_radians double precision := angle_fraction * 2 * pi();
  radius_metres double precision := sqrt(300.0 * 300.0 + radius_fraction * (700.0 * 700.0 - 300.0 * 300.0));
begin
  if p_lat is null or p_lng is null or p_lat not between 29.4 and 33.4 or p_lng not between 34.2 and 35.95 then
    raise exception 'INVALID_LISTING_LOCATION';
  end if;
  return query select p_lat + cos(angle_radians) * radius_metres / 111320.0,
    p_lng + sin(angle_radians) * radius_metres / (111320.0 * cos(radians(p_lat)));
end;
$$;
revoke all on function public.random_listing_public_point(double precision,double precision) from public, anon, authenticated;

create or replace function public.set_public_listing_location() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.lat is not distinct from old.lat and new.lng is not distinct from old.lng then
    return new;
  end if;
  select point.public_lat, point.public_lng into new.public_lat, new.public_lng
  from public.random_listing_public_point(new.lat, new.lng) point;
  return new;
end;
$$;

-- Existing rows rotate in the same transaction as the new trigger. Public
-- projections continue to expose only the resulting point, never its offset.
update public.apartments a
set (public_lat, public_lng) = (select point.public_lat, point.public_lng
  from public.random_listing_public_point(a.lat, a.lng) point);
commit;
