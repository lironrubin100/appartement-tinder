begin;

-- Retain legacy rows and keys. Personal save state is the sole count authority.
-- No group wishlist or direct client write can bypass the atomic RPC.
alter table public.saves enable row level security;
alter table public.apartment_interests enable row level security;
drop policy if exists own_saves on public.saves;
create policy own_saves on public.saves for select to authenticated
  using (user_id = (select auth.uid()));
alter table public.saves add constraint saves_personal_only check (group_id is null);
create index saves_user_apartment_idx on public.saves(user_id, apartment_id);

revoke all on public.saves, public.apartment_interests, public.apartment_hype_faces,
  public.apartment_stats from public, anon, authenticated;
grant select on public.saves, public.apartment_stats to authenticated;

create or replace function public.toggle_apartment_save_and_interest(p_apartment_id uuid)
returns table(saved boolean, interest_count bigint)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  -- Match the shared actor -> listing lock order; serialize each listing count.
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  perform 1 from public.apartments where id=p_apartment_id for update;
  if not found then raise exception 'listing is unavailable' using errcode='22023'; end if;

  if exists(select 1 from public.saves where apartment_id=p_apartment_id and user_id=actor) then
    -- A private bookmark remains removable after the public listing closes.
    delete from public.saves where apartment_id=p_apartment_id and user_id=actor;
    delete from public.apartment_interests where apartment_id=p_apartment_id and user_id=actor;
    saved := false;
  else
    if not exists(select 1 from public.apartments a
      where a.id=p_apartment_id and a.status='active'
        and a.lister_id is distinct from actor and not public.blocked_with(a.lister_id)
        and exists(select 1 from public.apartment_rooms r where r.apartment_id=a.id and r.is_available))
    then raise exception 'listing is unavailable' using errcode='22023'; end if;
    insert into public.saves(apartment_id,user_id) values(p_apartment_id,actor);
    -- Keep the legacy shadow atomic for compatibility, without read/write grants.
    insert into public.apartment_interests(apartment_id,user_id) values(p_apartment_id,actor)
      on conflict(apartment_id,user_id) do nothing;
    saved := true;
  end if;
  select count(*) into interest_count from public.saves where apartment_id=p_apartment_id;
  return next;
end $$;
revoke all on function public.toggle_apartment_save_and_interest(uuid) from public,anon,authenticated;
grant execute on function public.toggle_apartment_save_and_interest(uuid) to authenticated;

-- Same public fields/eligibility as the existing view; count only current saves.
create or replace view public.apartments_public with (security_barrier=true) as
select a.id,a.title,a.public_location_label,a.public_lat as lat,a.public_lng as lng,
  room_prices.lowest_price as price,room_prices.lowest_price as min_room_price,
  room_prices.highest_price as max_room_price,room_prices.available_room_count,
  a.bills_included,a.bedrooms,a.is_sublet,a.available_from,a.description,a.photos,
  a.status,a.created_at,
  (select count(*) from public.saves s where s.apartment_id=a.id) as interest_count
from public.apartments a
join lateral(select min(monthly_price) as lowest_price,max(monthly_price) as highest_price,
  count(*)::integer as available_room_count from public.apartment_rooms
  where apartment_id=a.id and is_available) room_prices on room_prices.available_room_count>0
where a.status='active' and not public.blocked_with(a.lister_id);

create or replace view public.apartment_stats as
select a.id as apartment_id,
  (select count(*) from public.saves s where s.apartment_id=a.id) as interest_count,
  (select count(*) from public.apartment_reports r where r.apartment_id=a.id) as report_count
from public.apartments a;

commit;
