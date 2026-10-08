-- Shutaf — row level security + read views. Run AFTER schema.sql.
-- Without this file the anon key can read and rewrite your entire database.

-- ------------------------------------------------- auto-create profile on signup
-- Google/Apple hand us a name; guarantee a profile row exists before the app boots.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name', 'New user'));
  insert into profile_private (profile_id) values (new.id);
  return new;
end $fn$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------- helper (avoids RLS recursion)
-- A policy on conversation_members that queries conversation_members recurses
-- forever. security definer breaks the cycle.
create function is_conversation_member(cid uuid) returns boolean
language sql security definer stable set search_path = public as $fn$
  select exists (
    select 1 from conversation_members
    where conversation_id = cid and user_id = auth.uid()
  );
$fn$;

create function blocked_with(other uuid) returns boolean
language sql security definer stable set search_path = public as $fn$
  select exists (
    select 1 from blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$fn$;

alter table profiles             enable row level security;
alter table profile_private      enable row level security;
alter table apartments           enable row level security;
alter table apartment_rooms      enable row level security;
alter table groups               enable row level security;
alter table group_members        enable row level security;
alter table likes                enable row level security;
alter table conversations        enable row level security;
alter table conversation_members enable row level security;
alter table messages             enable row level security;
alter table apartment_interests  enable row level security;
alter table listing_inquiries    enable row level security;
alter table apartment_reports    enable row level security;
alter table saves                enable row level security;
alter table blocks               enable row level security;
alter table user_reports         enable row level security;
alter table push_tokens          enable row level security;

-- ------------------------------------------------- profiles
-- Base profile rows are owner-only. Other members use profiles_public, an
-- explicit projection that contains no contact details or exact birth date.
create policy read_own_profile on profiles for select to authenticated
  using (id = auth.uid());
create policy write_own_profile on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy read_own_private_profile on profile_private for select to authenticated
  using (profile_id = auth.uid());
create policy update_own_private_profile on profile_private for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Student verification is written only by the server-side OTP-confirm route.
revoke update (student_email, student_email_verified_at) on profile_private from authenticated;

-- Safe public projection: age is derived from a private birth date; only
-- explicitly selected badges are returned, and only for profiles visible to
-- this caller (blocked users and Lister accounts are filtered out).
create view profiles_public with (security_barrier = true) as
select
  p.id,
  p.name,
  p.photo_url,
  p.bio,
  case when pp.birth_date is null then null
       else extract(year from age(current_date, pp.birth_date))::int end as age,
  p.gender,
  p.gender_dynamic,
  p.cleanliness,
  p.sleep_schedule,
  p.social_guests,
  p.noise_tolerance,
  p.music_vibe,
  p.climate,
  p.smoking,
  p.kitchen_dietary,
  p.cooking_dynamics,
  p.pets,
  p.weekend_routine,
  p.relationship_status,
  p.study_habits,
  p.financial_splitting,
  p.miluim_reserve_duty,
  case when p.is_verified and 'student_verified' = any(p.public_badges)
       then array['student_verified']::text[] else array[]::text[] end as public_badges
from profiles p
left join profile_private pp on pp.profile_id = p.id
where p.onboarded
  and p.mode <> 'lister'
  and not blocked_with(p.id);

revoke all on profiles_public from anon;
grant select on profiles_public to authenticated;

-- A user must not be able to grant themselves Pro or the verified checkmark.
-- Column privileges, because RLS cannot express "any column except these".
revoke update (is_pro, is_verified) on profiles from authenticated;

-- Same reasoning: only the server-side student-email OTP-verify route
-- (admin client) may set this, never the browser client directly.
revoke update (student_email_verified_at) on profiles from authenticated;

-- ------------------------------------------------- profile_photos
alter table profile_photos enable row level security;
create policy read_profile_photos on profile_photos for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = profile_photos.profile_id
        and p.onboarded
        and p.mode <> 'lister'
        and not blocked_with(p.id)
    )
  );
create policy own_profile_photos on profile_photos for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ------------------------------------------------- profile-photos storage bucket
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "users upload their own profile photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own profile photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own profile photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Apartment photos are listing content and may be displayed publicly; uploads
-- and mutations remain scoped to the authenticated owner's folder.
insert into storage.buckets (id, name, public)
values ('apartment-photos', 'apartment-photos', true)
on conflict (id) do nothing;

create policy "apartment photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'apartment-photos');

create policy "users upload their own apartment photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'apartment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own apartment photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'apartment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own apartment photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'apartment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------- apartments
-- Exact address and coordinates are owner-only. Public discovery uses the
-- narrowly projected apartments_public view below.
create function set_public_listing_location() returns trigger
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
create trigger set_public_listing_location_before_write
  before insert or update of lat, lng on apartments
  for each row execute function set_public_listing_location();
revoke all on function set_public_listing_location() from public, anon, authenticated;

drop policy if exists read_apartments on apartments;
drop policy if exists read_apartments_public on apartments;
create policy read_own_apartments on apartments for select to authenticated
  using (lister_id = (select auth.uid()));
create policy insert_own_apartment on apartments for insert to authenticated
  with check (lister_id = auth.uid() and source = 'user');
create policy update_own_apartment on apartments for update to authenticated
  using (lister_id = auth.uid());

create policy read_own_apartment_rooms on apartment_rooms for select to authenticated
  using (exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));
create policy insert_own_apartment_rooms on apartment_rooms for insert to authenticated
  with check (exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));
create policy update_own_apartment_rooms on apartment_rooms for update to authenticated
  using (exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())))
  with check (exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));
create policy delete_own_apartment_rooms on apartment_rooms for delete to authenticated
  using (exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())));

-- Keep the legacy apartment.price field aligned with the lowest currently
-- available room price. It is a cache, never the authoritative room price.
create function refresh_apartment_room_price() returns trigger
language plpgsql set search_path = public as $fn$
declare
  target_apartment_id uuid := coalesce(new.apartment_id, old.apartment_id);
begin
  update apartments
  set price = room_prices.lowest_price
  from (
    select min(monthly_price)::int as lowest_price
    from apartment_rooms
    where apartment_id = target_apartment_id and is_available
  ) room_prices
  where apartments.id = target_apartment_id and room_prices.lowest_price is not null;
  return null;
end;
$fn$;
create trigger refresh_apartment_room_price_after_write
  after insert or update or delete on apartment_rooms
  for each row execute function refresh_apartment_room_price();
revoke all on function refresh_apartment_room_price() from public, anon, authenticated;

-- This intentionally runs as the view owner: authenticated users have no
-- direct SELECT policy for other owners' apartment records. Its explicit
-- column list is the public API contract; never add address, exact lat/lng,
-- contact_url, or lister_id here.
create view apartments_public with (security_barrier = true) as
select
  id, title, public_location_label, public_lat as lat, public_lng as lng,
  room_prices.lowest_price as price,
  room_prices.lowest_price as min_room_price,
  room_prices.highest_price as max_room_price,
  room_prices.available_room_count,
  bills_included, bedrooms, is_sublet, available_from, description, photos,
  status, created_at,
  (select count(*) from apartment_interests i where i.apartment_id = apartments.id) as interest_count
from apartments
join lateral (
  select
    min(monthly_price)::int as lowest_price,
    max(monthly_price)::int as highest_price,
    count(*)::int as available_room_count
  from apartment_rooms
  where apartment_id = apartments.id and is_available
) room_prices on room_prices.available_room_count > 0
where status = 'active' and not blocked_with(lister_id);
revoke all on apartments_public from anon;
grant select on apartments_public to authenticated;

-- Requesters cannot read the address by sending an inquiry. They receive it
-- only after the listing owner has explicitly accepted the inquiry.
create policy read_listing_inquiries on listing_inquiries for select to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid()))
  );
create policy create_own_listing_inquiry on listing_inquiries for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (select 1 from apartments a where a.id = apartment_id and a.status = 'active' and a.lister_id is distinct from (select auth.uid()))
  );
create policy listing_owner_updates_inquiry on listing_inquiries for update to authenticated
  using (exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid())))
  with check (
    status in ('accepted', 'declined')
    and exists (select 1 from apartments a where a.id = apartment_id and a.lister_id = (select auth.uid()))
  );

-- The precise address is a separate, tightly scoped read surface. It returns
-- nothing until the requester's inquiry is accepted.
create view listing_address_access with (security_barrier = true) as
select a.id as apartment_id, a.address, a.lat, a.lng
from apartments a
join listing_inquiries i on i.apartment_id = a.id
where i.requester_id = auth.uid() and i.status = 'accepted';
revoke all on listing_address_access from anon;
grant select on listing_address_access to authenticated;

-- ------------------------------------------------- groups
create policy read_groups on groups for select to authenticated using (true);
create policy insert_group on groups for insert to authenticated
  with check (admin_id = auth.uid());
create policy admin_updates_group on groups for update to authenticated
  using (admin_id = auth.uid());

create policy read_members on group_members for select to authenticated using (true);
create policy admin_adds_member on group_members for insert to authenticated
  with check (exists (select 1 from groups g
                      where g.id = group_id and g.admin_id = auth.uid()));
create policy leave_group on group_members for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from groups g
                    where g.id = group_id and g.admin_id = auth.uid()));

-- ------------------------------------------------- likes
create policy send_like on likes for insert to authenticated
  with check (from_user = auth.uid() and not blocked_with(coalesce(to_user, from_user)));
create policy read_my_likes on likes for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid()
         or exists (select 1 from group_members gm
                    where gm.group_id = likes.to_group and gm.user_id = auth.uid()));

-- ------------------------------------------------- chat
create policy read_conversations on conversations for select to authenticated
  using (is_conversation_member(id));
create policy read_conv_members on conversation_members for select to authenticated
  using (is_conversation_member(conversation_id));
create policy update_own_read_marker on conversation_members for update to authenticated
  using (user_id = auth.uid());
create policy read_messages on messages for select to authenticated
  using (is_conversation_member(conversation_id));
create policy send_message on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_member(conversation_id));

-- Note there is deliberately NO insert policy on conversations or
-- conversation_members. Starting a chat is three writes that must all land or
-- none, and one of them writes a message on the other person's behalf. Letting
-- the client do it needs "with check (true)", which would let anyone add anyone
-- to any conversation. It goes through this RPC instead.
create function accept_like(p_like_id uuid) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_like  likes%rowtype;
  v_convo uuid;
begin
  select * into v_like from likes where id = p_like_id;
  if v_like.id is null or v_like.to_user is distinct from auth.uid() then
    raise exception 'not your like';
  end if;

  insert into conversations default values returning id into v_convo;
  insert into conversation_members (conversation_id, user_id)
    values (v_convo, v_like.to_user), (v_convo, v_like.from_user);
  insert into messages (conversation_id, sender_id, body)
    values (v_convo, v_like.from_user, v_like.message);

  delete from likes where id = p_like_id;
  return v_convo;
end $fn$;

revoke all on function accept_like(uuid) from public, anon;
grant execute on function accept_like(uuid) to authenticated;

-- ------------------------------------------------- map social
-- Deliberately own-rows-only. If clients could read every interest row they
-- could join it to profiles themselves and the Pro unblur would be worthless.
-- Counts and faces come from the views below instead.
create policy own_interests on apartment_interests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_reports on apartment_reports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_saves on saves for all to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from group_members gm
                    where gm.group_id = saves.group_id and gm.user_id = auth.uid()))
  with check (user_id = auth.uid());

-- A heart changes two user-owned records: a private save and the public
-- interest counter. Do this atomically so a network failure cannot leave one
-- updated without the other.
create or replace function toggle_apartment_save_and_interest(
  p_apartment_id uuid
)
returns table (saved boolean, interest_count bigint)
language plpgsql security definer set search_path = public as $fn$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from apartments a
    where a.id = p_apartment_id
      and a.status = 'active'
      and a.lister_id is distinct from v_user_id
      and not blocked_with(a.lister_id)
      and exists (
        select 1 from apartment_rooms r
        where r.apartment_id = a.id and r.is_available
      )
  ) then
    raise exception 'listing is unavailable';
  end if;

  if exists (select 1 from saves where apartment_id = p_apartment_id and user_id = v_user_id) then
    delete from saves where apartment_id = p_apartment_id and user_id = v_user_id;
    delete from apartment_interests where apartment_id = p_apartment_id and user_id = v_user_id;
    saved := false;
  else
    insert into saves (apartment_id, user_id) values (p_apartment_id, v_user_id)
      on conflict (apartment_id, user_id) do nothing;
    insert into apartment_interests (apartment_id, user_id) values (p_apartment_id, v_user_id)
      on conflict (apartment_id, user_id) do nothing;
    saved := true;
  end if;

  select count(*) into interest_count from apartment_interests where apartment_id = p_apartment_id;
  return next;
end;
$fn$;
revoke all on function toggle_apartment_save_and_interest(uuid) from public, anon;
grant execute on function toggle_apartment_save_and_interest(uuid) to authenticated;

-- ------------------------------------------------- safety
create policy own_blocks on blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy file_report on user_reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy own_push_tokens on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------- views
-- Public counters. Plain (security definer) views, so they can count rows the
-- caller cannot read directly. No triggers, no denormalised counter columns to
-- drift out of sync.
create view apartment_stats as
select a.id as apartment_id,
       (select count(*) from apartment_interests i where i.apartment_id = a.id) as interest_count,
       (select count(*) from apartment_reports  r where r.apartment_id = a.id) as report_count
from apartments a;

-- THE monetisation gate. The blur must happen here, on the server. If the app
-- ever received photo_url and blurred it in CSS, anyone could read the real URL
-- out of the network log and the Pro tier would be unsellable.
create view apartment_hype_faces as
select i.apartment_id,
       i.user_id,
       p.name,
       case when (select is_pro from profiles where id = auth.uid())
            then p.photo_url else p.photo_blur_url end as photo_url,
       coalesce((select is_pro from profiles where id = auth.uid()), false) as unblurred
from apartment_interests i
join profiles p on p.id = i.user_id
where not blocked_with(i.user_id);

grant select on apartment_stats, apartment_hype_faces to authenticated;
revoke all on apartment_stats, apartment_hype_faces from anon;
