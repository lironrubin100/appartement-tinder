-- Deterministic local/demo listings for the apartment-with-rooms experience.
-- This migration only creates or refreshes records whose source is `seed`.
-- User-created listings and their rooms are deliberately untouched.
begin;

insert into public.apartments (
  id, lister_id, source, title, address, lat, lng, price, bedrooms,
  bills_included, is_sublet, available_from, description, photos, status
)
values
  (
    '10000000-0000-4000-8000-000000000001', null, 'seed',
    'חדר מואר בדירת שותפים ליד האוניברסיטה', 'שכונה ד׳, באר שבע',
    31.2590, 34.7990, 2050, 4, true, false, date '2026-10-15',
    'דירת ארבעה חדרים נעימה עם סלון משותף גדול. שני חדרים פנויים כרגע.',
    array[
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80'
    ],
    'active'
  ),
  (
    '10000000-0000-4000-8000-000000000002', null, 'seed',
    'דירה שקטה ברמות', 'רמות, באר שבע',
    31.2870, 34.7700, 1850, 3, true, false, date '2026-11-01',
    'חדר פנוי בדירת שלושה שותפים. מטבח מאובזר ומרפסת שמש.',
    array[
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
    ],
    'active'
  ),
  (
    '10000000-0000-4000-8000-000000000003', null, 'seed',
    'שני חדרים פנויים בעיר העתיקה', 'העיר העתיקה, באר שבע',
    31.2460, 34.7920, 1700, 5, true, true, date '2026-10-20',
    'דירה גדולה עם שני חדרים פנויים, קרובה לתחבורה ולמרכז העיר.',
    array[
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=80'
    ],
    'active'
  ),
  (
    '10000000-0000-4000-8000-000000000004', null, 'seed',
    'חדר ליד פארק ההייטק', 'נווה זאב, באר שבע',
    31.2380, 34.7700, 2100, 3, false, false, date '2026-11-15',
    'חדר אחד פנוי בדירה משופצת עם שותפים עובדים.',
    array[
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80'
    ],
    'active'
  )
on conflict (id) do update set
  lister_id = excluded.lister_id,
  source = excluded.source,
  title = excluded.title,
  address = excluded.address,
  lat = excluded.lat,
  lng = excluded.lng,
  price = excluded.price,
  bedrooms = excluded.bedrooms,
  bills_included = excluded.bills_included,
  is_sublet = excluded.is_sublet,
  available_from = excluded.available_from,
  description = excluded.description,
  photos = excluded.photos,
  status = excluded.status
where public.apartments.source = 'seed';

-- Refresh rooms for these fixtures only. This makes reapplying the migration
-- deterministic while preserving every user-created apartment and room.
delete from public.apartment_rooms room
using public.apartments apartment
where room.apartment_id = apartment.id
  and apartment.source = 'seed'
  and apartment.id in (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004'
  );

insert into public.apartment_rooms (apartment_id, label, monthly_price, available_from, is_available)
select apartment.id, fixture.label, fixture.monthly_price, fixture.available_from, true
from (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'חדר עם מרפסת', 2050, date '2026-10-15'),
    ('10000000-0000-4000-8000-000000000001'::uuid, 'חדר גדול', 2350, date '2026-11-01'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'חדר שקט', 1850, date '2026-11-01'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'חדר מרוהט', 1700, date '2026-10-20'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'חדר פינתי', 2200, date '2026-11-10'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'חדר מרוהט', 2100, date '2026-11-15')
) as fixture(apartment_id, label, monthly_price, available_from)
join public.apartments apartment
  on apartment.id = fixture.apartment_id
 and apartment.source = 'seed';

commit;
