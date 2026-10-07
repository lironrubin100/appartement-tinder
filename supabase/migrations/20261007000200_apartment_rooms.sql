-- D2/D5/D9: apartments remain the public listing entity. Available rooms are
-- child records with their own rent and cannot be discovered independently.
begin;

alter table public.apartments
  add column if not exists bills_included boolean not null default false;

create table if not exists public.apartment_rooms (
  id             uuid primary key default gen_random_uuid(),
  apartment_id   uuid not null references public.apartments on delete cascade,
  label          text check (char_length(label) <= 80),
  monthly_price  int not null check (monthly_price > 0),
  available_from date not null,
  is_available   boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists apartment_rooms_apartment_available_idx
  on public.apartment_rooms (apartment_id, is_available);

-- Existing apartment data represented a single price. Preserve its visibility
-- by giving each legacy apartment one available-room record.
insert into public.apartment_rooms (apartment_id, monthly_price, available_from)
select id, price, coalesce(available_from, current_date)
from public.apartments
where not exists (
  select 1 from public.apartment_rooms room where room.apartment_id = apartments.id
);

alter table public.apartment_rooms enable row level security;
drop policy if exists read_own_apartment_rooms on public.apartment_rooms;
drop policy if exists insert_own_apartment_rooms on public.apartment_rooms;
drop policy if exists update_own_apartment_rooms on public.apartment_rooms;
drop policy if exists delete_own_apartment_rooms on public.apartment_rooms;
create policy read_own_apartment_rooms on public.apartment_rooms for select to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));
create policy insert_own_apartment_rooms on public.apartment_rooms for insert to authenticated
  with check (exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));
create policy update_own_apartment_rooms on public.apartment_rooms for update to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())))
  with check (exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));
create policy delete_own_apartment_rooms on public.apartment_rooms for delete to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));

create or replace function public.refresh_apartment_room_price() returns trigger
language plpgsql set search_path = public as $fn$
declare
  target_apartment_id uuid := coalesce(new.apartment_id, old.apartment_id);
begin
  update public.apartments
  set price = room_prices.lowest_price
  from (
    select min(monthly_price)::int as lowest_price
    from public.apartment_rooms
    where apartment_id = target_apartment_id and is_available
  ) room_prices
  where apartments.id = target_apartment_id and room_prices.lowest_price is not null;
  return null;
end;
$fn$;
drop trigger if exists refresh_apartment_room_price_after_write on public.apartment_rooms;
create trigger refresh_apartment_room_price_after_write
  after insert or update or delete on public.apartment_rooms
  for each row execute function public.refresh_apartment_room_price();
revoke all on function public.refresh_apartment_room_price() from public, anon, authenticated;

drop view if exists public.apartments_public;
create view public.apartments_public with (security_barrier = true) as
select
  apartments.id, apartments.title, apartments.public_location_label,
  apartments.public_lat as lat, apartments.public_lng as lng,
  room_prices.lowest_price as price,
  room_prices.lowest_price as min_room_price,
  room_prices.highest_price as max_room_price,
  room_prices.available_room_count,
  apartments.bills_included, apartments.bedrooms, apartments.is_sublet,
  apartments.available_from, apartments.description, apartments.photos,
  apartments.status, apartments.created_at
from public.apartments
join lateral (
  select
    min(monthly_price)::int as lowest_price,
    max(monthly_price)::int as highest_price,
    count(*)::int as available_room_count
  from public.apartment_rooms
  where apartment_id = apartments.id and is_available
) room_prices on room_prices.available_room_count > 0
where apartments.status = 'active' and not public.blocked_with(apartments.lister_id);
revoke all on public.apartments_public from anon;
grant select on public.apartments_public to authenticated;

commit;
