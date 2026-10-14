-- Source recovered from the local c8ce worktree. This version matches the
-- migration already recorded in the live Supabase project.
begin;

create table if not exists public.profile_passes (
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user is distinct from to_user)
);

create index if not exists profile_passes_from_user_to_user_idx
  on public.profile_passes (from_user, to_user);

alter table public.profile_passes enable row level security;
grant select, insert on public.profile_passes to authenticated;

drop policy if exists "Users can read their own profile passes" on public.profile_passes;
create policy "Users can read their own profile passes"
  on public.profile_passes for select to authenticated
  using ((select auth.uid()) = from_user);

drop policy if exists "Users can create their own profile passes" on public.profile_passes;
create policy "Users can create their own profile passes"
  on public.profile_passes for insert to authenticated
  with check ((select auth.uid()) = from_user);

alter table public.likes
  add constraint likes_message_minimum_length check (char_length(message) between 10 and 500);

commit;
