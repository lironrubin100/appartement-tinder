-- D4: public listings use a stable 500m approximate pin. Exact address and
-- coordinates remain on apartments and are available only after acceptance.
begin;

alter table public.apartments
  add column if not exists public_lat double precision not null default 0,
  add column if not exists public_lng double precision not null default 0,
  add column if not exists public_location_label text not null default 'Beer Sheva';

create or replace function public.set_public_listing_location() returns trigger
language plpgsql set search_path = public as $fn$
declare
  hash_value bigint;
  angle_radians double precision;
  radius_metres constant double precision := 500;
begin
  hash_value := abs(hashtextextended(new.id::text, 0));
  angle_radians := mod(hash_value, 360) * pi() / 180;
  new.public_lat := new.lat + (cos(angle_radians) * radius_metres / 111320);
  new.public_lng := new.lng + (sin(angle_radians) * radius_metres /
    (111320 * cos(radians(new.lat))));
  return new;
end;
$fn$;

drop trigger if exists set_public_listing_location_before_write on public.apartments;
create trigger set_public_listing_location_before_write
  before insert or update of lat, lng on public.apartments
  for each row execute function public.set_public_listing_location();
revoke all on function public.set_public_listing_location() from public, anon, authenticated;

update public.apartments
set public_lat = lat + (cos(mod(abs(hashtextextended(id::text, 0)), 360) * pi() / 180) * 500 / 111320),
    public_lng = lng + (sin(mod(abs(hashtextextended(id::text, 0)), 360) * pi() / 180) * 500 /
      (111320 * cos(radians(lat))))
where public_lat is null or public_lng is null;

alter table public.apartments
  alter column public_lat set not null,
  alter column public_lng set not null,
  alter column public_lat set default 0,
  alter column public_lng set default 0;

drop policy if exists read_apartments on public.apartments;
drop policy if exists read_apartments_public on public.apartments;
drop policy if exists read_own_apartments on public.apartments;
create policy read_own_apartments on public.apartments for select to authenticated
  using (lister_id = (select auth.uid()));

drop view if exists public.apartments_public;
create view public.apartments_public with (security_barrier = true) as
select
  id, title, public_location_label, public_lat as lat, public_lng as lng,
  price, bedrooms, is_sublet, available_from, description, photos, status,
  created_at
from public.apartments
where status = 'active' and not public.blocked_with(lister_id);
revoke all on public.apartments_public from anon;
grant select on public.apartments_public to authenticated;

create table if not exists public.listing_inquiries (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments on delete cascade,
  requester_id uuid not null references public.profiles on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (apartment_id, requester_id)
);
create index if not exists listing_inquiries_apartment_status_idx
  on public.listing_inquiries (apartment_id, status);
create index if not exists listing_inquiries_requester_status_idx
  on public.listing_inquiries (requester_id, status);
alter table public.listing_inquiries enable row level security;

drop policy if exists read_listing_inquiries on public.listing_inquiries;
create policy read_listing_inquiries on public.listing_inquiries for select to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid()))
  );
drop policy if exists create_own_listing_inquiry on public.listing_inquiries;
create policy create_own_listing_inquiry on public.listing_inquiries for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (select 1 from public.apartments a where a.id = apartment_id and a.status = 'active' and a.lister_id is distinct from (select auth.uid()))
  );
drop policy if exists listing_owner_updates_inquiry on public.listing_inquiries;
create policy listing_owner_updates_inquiry on public.listing_inquiries for update to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())))
  with check (
    status in ('accepted', 'declined')
    and exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid()))
  );

drop view if exists public.listing_address_access;
create view public.listing_address_access with (security_barrier = true) as
select a.id as apartment_id, a.address, a.lat, a.lng
from public.apartments a
join public.listing_inquiries i on i.apartment_id = a.id
where i.requester_id = auth.uid() and i.status = 'accepted';
revoke all on public.listing_address_access from anon;
grant select on public.listing_address_access to authenticated;

commit;
