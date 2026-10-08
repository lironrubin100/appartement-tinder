-- A heart represents one deliberate action: save the apartment and join its
-- interest count. Keeping both writes in one RPC prevents partial UI state.
begin;

create or replace function public.toggle_apartment_save_and_interest(
  p_apartment_id uuid
)
returns table (saved boolean, interest_count bigint)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- The RPC is security definer so its two writes are atomic. Keep its scope
  -- no wider than the public feed: active listings with an available room,
  -- excluding the caller's own listing and blocked listers.
  if not exists (
    select 1
    from public.apartments a
    where a.id = p_apartment_id
      and a.status = 'active'
      and a.lister_id is distinct from v_user_id
      and not public.blocked_with(a.lister_id)
      and exists (
        select 1
        from public.apartment_rooms r
        where r.apartment_id = a.id and r.is_available
      )
  ) then
    raise exception 'listing is unavailable';
  end if;

  if exists (
    select 1 from public.saves
    where apartment_id = p_apartment_id and user_id = v_user_id
  ) then
    delete from public.saves
    where apartment_id = p_apartment_id and user_id = v_user_id;
    delete from public.apartment_interests
    where apartment_id = p_apartment_id and user_id = v_user_id;
    saved := false;
  else
    insert into public.saves (apartment_id, user_id)
    values (p_apartment_id, v_user_id)
    on conflict (apartment_id, user_id) do nothing;
    insert into public.apartment_interests (apartment_id, user_id)
    values (p_apartment_id, v_user_id)
    on conflict (apartment_id, user_id) do nothing;
    saved := true;
  end if;

  select count(*) into interest_count
  from public.apartment_interests
  where apartment_id = p_apartment_id;
  return next;
end;
$fn$;

revoke all on function public.toggle_apartment_save_and_interest(uuid) from public, anon;
grant execute on function public.toggle_apartment_save_and_interest(uuid) to authenticated;

create or replace view public.apartments_public with (security_barrier = true) as
select
  apartments.id, apartments.title, apartments.public_location_label,
  apartments.public_lat as lat, apartments.public_lng as lng,
  room_prices.lowest_price as price,
  room_prices.lowest_price as min_room_price,
  room_prices.highest_price as max_room_price,
  room_prices.available_room_count,
  apartments.bills_included, apartments.bedrooms, apartments.is_sublet,
  apartments.available_from, apartments.description, apartments.photos,
  apartments.status, apartments.created_at,
  (select count(*) from public.apartment_interests i where i.apartment_id = apartments.id) as interest_count
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

commit;
