-- M07 / D2, D4, D5, D9: expose every available room's public rent and
-- availability date on an apartment detail page. The projection deliberately
-- excludes room IDs, the exact address/coordinates, lister identity and phone.
begin;

drop function if exists public.get_public_listing(uuid);

create function public.get_public_listing(p_listing_id uuid)
returns table (
  id uuid,
  title text,
  public_location_label text,
  min_room_price integer,
  max_room_price integer,
  available_room_count integer,
  bills_included boolean,
  bedrooms integer,
  is_sublet boolean,
  available_from date,
  description text,
  photos text[],
  rooms jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.title,
    a.public_location_label,
    a.min_room_price,
    a.max_room_price,
    a.available_room_count,
    a.bills_included,
    a.bedrooms,
    a.is_sublet,
    a.available_from,
    a.description,
    a.photos,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'monthly_price', r.monthly_price,
            'available_from', r.available_from
          )
          order by r.available_from, r.monthly_price, r.id
        )
        from public.apartment_rooms r
        where r.apartment_id = a.id
          and r.is_available
      ),
      '[]'::jsonb
    )
  from public.apartments_public a
  where a.id = p_listing_id;
$$;

revoke all on function public.get_public_listing(uuid) from public;
grant execute on function public.get_public_listing(uuid) to anon, authenticated;

commit;