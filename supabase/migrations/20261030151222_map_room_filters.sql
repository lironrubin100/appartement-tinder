-- D5/D13: room conditions belong to one available public room.
-- Reuse the existing safe reader; this invoker grants no private-table access.
begin;

create function public.match_public_listing_ids(
  p_listing_ids uuid[],
  p_min_price integer default 0,
  p_max_price integer default 6000,
  p_available_by date default null,
  p_bedrooms integer default null,
  p_bills_included boolean default false,
  p_sublet_only boolean default false
)
returns table(id uuid)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='Sign in required';
  end if;
  if p_listing_ids is null or coalesce(array_ndims(p_listing_ids),1) <> 1
    or cardinality(p_listing_ids) > 500 then
    raise exception using errcode='22023',message='Invalid candidate scope';
  end if;
  if array_position(p_listing_ids,null::uuid) is not null
    or p_min_price is null or p_max_price is null
    or p_min_price < 0 or p_max_price < p_min_price
    or (p_bedrooms is not null and p_bedrooms not in (1,2,3,4))
    or p_bills_included is null or p_sublet_only is null then
    raise exception using errcode='22023',message='Invalid map filters';
  end if;

  return query
    select listing.id
    from (select distinct candidate_id from unnest(p_listing_ids) as candidates(candidate_id)) candidate
    cross join lateral public.get_public_listing(candidate.candidate_id) listing
    where (p_bedrooms is null or
      case when p_bedrooms=4 then listing.bedrooms>=4 else listing.bedrooms=p_bedrooms end)
      and (not p_bills_included or listing.bills_included is true)
      and (not p_sublet_only or listing.is_sublet is true)
      and exists (
        select 1 from jsonb_array_elements(listing.rooms) room(body)
        where (room.body->>'monthly_price')::integer between p_min_price and p_max_price
          and (p_available_by is null or (room.body->>'available_from')::date <= p_available_by)
      )
    order by listing.id;
end;
$$;

revoke all on function public.match_public_listing_ids(uuid[],integer,integer,date,integer,boolean,boolean) from public,anon;
grant execute on function public.match_public_listing_ids(uuid[],integer,integer,date,integer,boolean,boolean) to authenticated;
commit;
