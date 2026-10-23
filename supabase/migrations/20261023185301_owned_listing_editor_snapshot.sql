begin;

-- A persisted initial version for the owner reader. Task4.2 supplies the
-- versioned atomic writer before any public edit UI is connected.
alter table public.apartments
  add column revision integer not null default 0 check (revision >= 0);

-- One statement observes facts, rooms and media ownership in one MVCC snapshot.
-- Invoker privileges retain the existing owner RLS on both listing tables.
create function public.get_owned_listing_editor(p_listing_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'id', a.id, 'ownerId', a.lister_id, 'revision', a.revision,
    'status', a.status, 'title', a.title, 'bedrooms', a.bedrooms,
    'billsIncluded', a.bills_included, 'isSublet', a.is_sublet,
    'availableFrom', a.available_from, 'description', a.description,
    'location', pg_catalog.jsonb_build_object('address', a.address, 'latitude', a.lat, 'longitude', a.lng),
    'rooms', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', r.id, 'label', r.label, 'monthlyPrice', r.monthly_price,
        'availableFrom', r.available_from, 'isAvailable', r.is_available
      ) order by r.created_at, r.id)
      from public.apartment_rooms r where r.apartment_id=a.id
    ), '[]'::jsonb),
    'photos', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'kind', 'published', 'objectPath', o.name
      ) order by p.position)
      from pg_catalog.unnest(a.photos) with ordinality p(url,position)
      left join storage.objects o on o.bucket_id='apartment-photos'
        and o.owner_id=(select auth.uid())::text
        and ('https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/' || o.name)=p.url
    ), '[]'::jsonb)
  )
  from public.apartments a
  where a.id=p_listing_id and a.lister_id=(select auth.uid()) and a.source='user';
$$;

revoke all on function public.get_owned_listing_editor(uuid) from public,anon;
grant execute on function public.get_owned_listing_editor(uuid) to authenticated;
comment on function public.get_owned_listing_editor(uuid) is
  'Owner-only private editor snapshot. Exact location must never be used in public projections or caches.';

commit;
