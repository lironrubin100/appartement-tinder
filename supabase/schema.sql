-- Shutaf — schema v1 (Beer Sheva launch)
-- Run in the Supabase SQL editor, or `supabase db push`.
-- ponytail: no PostGIS. One city, ~200 listings -> the app fetches all active
-- apartments once and filters/bounds them client-side. Add PostGIS + a GIST
-- index when you launch a second city or cross ~5k listings.

-- ---------------------------------------------------------------- profiles
create table profiles (
  id             uuid primary key references auth.users on delete cascade,
  name           text not null,
  photo_url      text,          -- full-res. Only ever served to Pro, via the hype view.
  photo_blur_url text,          -- pre-blurred derivative, uploaded by the client.
  birth_date     date,
  gender         text check (gender in ('male','female','other')),
  bio            text check (char_length(bio) <= 300),
  vibe_tags      text[] not null default '{}',
  mode           text not null default 'solo'
                 check (mode in ('solo','group','room_filler','lister')),
  -- matching criteria: the PRD says users "edit matching criteria" but never says what they are
  budget_min     int,
  budget_max     int,
  move_in_date   date,
  is_verified    boolean not null default false,
  is_pro         boolean not null default false,
  onboarded      boolean not null default false,
  last_active_at timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index on profiles (last_active_at desc) where onboarded;

-- ---------------------------------------------------------------- apartments
create table apartments (
  id             uuid primary key default gen_random_uuid(),
  lister_id      uuid references profiles on delete set null,  -- null = seeded by you
  source         text not null default 'seed' check (source in ('seed','user')),
  title          text not null,
  address        text,
  lat            double precision not null,
  lng            double precision not null,
  price          int not null,
  bedrooms       int not null,
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

create table conversation_members (
  conversation_id uuid references conversations on delete cascade,
  user_id         uuid references profiles on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  sender_id       uuid not null references profiles on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
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
