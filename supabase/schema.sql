-- Shutaf — schema v1 (Beer Sheva launch)
-- Run in the Supabase SQL editor, or `supabase db push`.
-- ponytail: no PostGIS. One city, ~200 listings -> the app fetches all active
-- apartments once and filters/bounds them client-side. Add PostGIS + a GIST
-- index when you launch a second city or cross ~5k listings.

-- ---------------------------------------------------------------- profiles
-- vibe_tags (free text[]) replaced by the structured 31-category taxonomy's
-- renter half per DECISIONS.md C1/C2/C13 -- the 16 columns below. The
-- apartment-side 15 categories live on `apartments`, not here (out of scope
-- until that table needs the same treatment).
create table profiles (
  id             uuid primary key references auth.users on delete cascade,
  name           text not null,
  photo_url      text,          -- full-res. Only ever served to Pro, via the hype view.
  photo_blur_url text,          -- pre-blurred derivative, uploaded by the client.
  gender         text check (gender in ('male','female','other')),
  bio            text check (char_length(bio) <= 300),
  mode           text not null default 'solo'
                 check (mode in ('solo','group','room_filler','lister')),
  -- matching criteria: the PRD says users "edit matching criteria" but never says what they are
  is_verified    boolean not null default false,
  is_pro         boolean not null default false,
  onboarded      boolean not null default false,
  notifications_enabled boolean not null default true,
  -- Residents default to Discover; Settings lets them choose Discover or Map.
  default_home text not null default 'discover' check (default_home in ('discover','map')),
  -- Only selected, verified badges are emitted by profiles_public (B9).
  public_badges text[] not null default array[]::text[],
  -- 16 renter-lifestyle categories, DECISIONS.md C1/C2/C13. Single-select
  -- per category; null = not set yet.
  gender_dynamic       text check (gender_dynamic in ('1_guy_guys','2_girls_1_girl','coed_anyone')),
  cleanliness          text check (cleanliness in ('very_clean','clean','average','relaxed')),
  sleep_schedule       text check (sleep_schedule in ('early_bed_early_wake','night_owl','flexible')),
  social_guests        text check (social_guests in ('frequent_visitors','occasional','rarely')),
  noise_tolerance      text check (noise_tolerance in ('quiet','moderate','high')),
  music_vibe           text check (music_vibe in ('silent','ambient','upbeat','loud')),
  climate              text check (climate in ('cold','moderate','hot')),
  smoking              text check (smoking in ('yes','no','outdoor_only')),
  kitchen_dietary      text check (kitchen_dietary in ('strict','vegetarian','mixed')),
  cooking_dynamics     text check (cooking_dynamics in ('shared_cooking','individual','meal_prep')),
  pets                 text check (pets in ('yes','no','small_only')),
  weekend_routine      text check (weekend_routine in ('home_body','mixed','always_out')),
  relationship_status  text check (relationship_status in ('single','in_relationship','flexible')),
  study_habits         text check (study_habits in ('heavy_studying','moderate','minimal')),
  financial_splitting  text check (financial_splitting in ('strict','flexible','shared_expenses')),
  miluim_reserve_duty  text check (miluim_reserve_duty in ('active','occasional','none')),
  last_active_at timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index on profiles (last_active_at desc) where onboarded;

-- Contact, exact birth date, budget, and move-in data are owner-only. Public
-- profile reads use the allowlisted profiles_public view in rls.sql, which
-- derives age without exposing birth_date.
create table profile_private (
  profile_id                 uuid primary key references profiles on delete cascade,
  birth_date                 date,
  budget_min                 int,
  budget_max                 int,
  move_in_date               date,
  phone                      text,
  agency_name                text,
  student_email              text,
  student_email_verified_at  timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

-- Multi-photo gallery for the profile edit screen. photo_url/photo_blur_url
-- above stay in place -- apartment_hype_faces still reads them for the
-- Pro-unblur gate -- this is an additive gallery, not a replacement.
create table profile_photos (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles on delete cascade,
  url            text not null,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);
create index on profile_photos (profile_id, display_order);

-- ---------------------------------------------------------------- apartments
create table apartments (
  id             uuid primary key default gen_random_uuid(),
  lister_id      uuid references profiles on delete set null,  -- null = seeded by you
  source         text not null default 'seed' check (source in ('seed','user')),
  title          text not null,
  address        text,
  lat            double precision not null,
  lng            double precision not null,
  -- Cached lowest available-room price, retained for map sorting and legacy
  -- data. Canonical prices belong to apartment_rooms below.
  price          int not null,
  bedrooms       int not null,
  bills_included boolean not null default false,
  is_sublet      boolean not null default false,
  available_from date,
  description    text,
  photos         text[] not null default '{}',
  contact_url    text,   -- for seeded listings: the FB post / Yad2 link / phone
  status         text not null default 'active'
                 check (status in ('active','flagged','taken','paused')),
  created_at     timestamptz not null default now()
);
create index on apartments (status, price);

-- A room is always scoped to its parent apartment. It cannot be discovered or
-- shared as a standalone listing (D5/D9).
create table apartment_rooms (
  id             uuid primary key default gen_random_uuid(),
  apartment_id   uuid not null references apartments on delete cascade,
  label          text check (char_length(label) <= 80),
  monthly_price  int not null check (monthly_price > 0),
  available_from date not null,
  is_available   boolean not null default true,
  created_at     timestamptz not null default now()
);
create index on apartment_rooms (apartment_id, is_available);

-- D4: exact location stays on the owner record.  The public map receives the
-- precomputed approximate pin only, through apartments_public in rls.sql.
alter table apartments
  add column public_lat double precision not null default 0,
  add column public_lng double precision not null default 0,
  add column public_location_label text not null default 'Beer Sheva';

-- An inquiry is the permission boundary for a precise address. A poster must
-- explicitly accept it before the requester can read listing_address_access.
create table listing_inquiries (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references apartments on delete cascade,
  requester_id uuid not null references profiles on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (apartment_id, requester_id)
);
create index on listing_inquiries (apartment_id, status);
create index on listing_inquiries (requester_id, status);

-- ---------------------------------------------------------------- groups
create table groups (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references profiles on delete cascade,
  name         text,
  status       text not null default 'open' check (status in ('open','closed')),
  -- room_filler groups already live somewhere; solo-formed groups do not yet
  apartment_id uuid references apartments on delete set null,
  budget_min   int,
  budget_max   int,
  created_at   timestamptz not null default now()
);

create table group_members (
  group_id  uuid references groups on delete cascade,
  user_id   uuid references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- max 4 is a product rule; enforce it in the DB or the REST API is the loophole
create function enforce_group_size() returns trigger language plpgsql as $fn$
begin
  if (select count(*) from group_members where group_id = new.group_id) >= 4 then
    raise exception 'group is full (max 4)';
  end if;
  return new;
end $fn$;

create trigger group_size before insert on group_members
  for each row execute function enforce_group_size();

-- ---------------------------------------------------------------- discover
-- A like carries a message pinned to a tag or the bio (the PRD requires this).
create table likes (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references profiles on delete cascade,
  to_user    uuid references profiles on delete cascade,
  to_group   uuid references groups on delete cascade,
  message    text not null check (char_length(message) between 1 and 500),
  ref_tag    text,   -- the vibe tag it was attached to, or null for the bio
  created_at timestamptz not null default now(),
  check (num_nonnulls(to_user, to_group) = 1),
  check (from_user is distinct from to_user)
);
create unique index on likes (from_user, to_user)  where to_user  is not null;
create unique index on likes (from_user, to_group) where to_group is not null;
create index on likes (to_user);

-- ---------------------------------------------------------------- chat
-- A conversation IS the match. 1:1 starts with 2 members; "upgrade to group"
-- sets group_id and adds members. No separate matches table needed.
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references groups on delete cascade,
  created_at timestamptz not null default now()
);

alter table listing_inquiries
  add column conversation_id uuid unique references conversations on delete set null;

create table conversation_members (
  conversation_id uuid references conversations on delete cascade,
  user_id         uuid references profiles on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  sender_id       uuid references profiles on delete cascade,
  kind            text not null default 'user' check (kind in ('user', 'system')),
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now(),
  check (
    (kind = 'user' and sender_id is not null)
    or (kind = 'system' and sender_id is null)
  )
);
create index on messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------- map social
-- The primary key IS the dedupe: one interest and one report per user per listing.
create table apartment_interests (
  apartment_id uuid references apartments on delete cascade,
  user_id      uuid references profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (apartment_id, user_id)
);

create table apartment_reports (
  apartment_id uuid references apartments on delete cascade,
  user_id      uuid references profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (apartment_id, user_id)
);

-- group_id null = personal save, set = shared group wishlist. One table, both cases.
create table saves (
  apartment_id uuid references apartments on delete cascade,
  user_id      uuid not null references profiles on delete cascade,
  group_id     uuid references groups on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (apartment_id, user_id)
);

-- ---------------------------------------------------------------- safety
-- App Store guideline 1.2 requires block + report on social/UGC apps.
-- Not optional if you want to ship.
create table blocks (
  blocker_id uuid references profiles on delete cascade,
  blocked_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table user_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  reported_id uuid not null references profiles on delete cascade,
  reason      text not null,
  created_at  timestamptz not null default now()
);

create table push_tokens (
  user_id uuid references profiles on delete cascade,
  token   text,
  primary key (user_id, token)
);
