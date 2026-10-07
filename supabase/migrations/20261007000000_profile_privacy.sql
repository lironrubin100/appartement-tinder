-- Generated as a repository migration because the Supabase CLI is not
-- installed in this workspace. Apply only after reviewing the active project.
begin;

alter table public.profiles
  add column if not exists default_home text not null default 'discover'
    check (default_home in ('discover', 'map')),
  add column if not exists public_badges text[] not null default array[]::text[];

create table if not exists public.profile_private (
  profile_id uuid primary key references public.profiles on delete cascade,
  birth_date date,
  budget_min int,
  budget_max int,
  move_in_date date,
  phone text,
  agency_name text,
  student_email text,
  student_email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profile_private (
  profile_id, birth_date, budget_min, budget_max, move_in_date,
  student_email, student_email_verified_at
)
select id, birth_date, budget_min, budget_max, move_in_date,
       student_email, student_email_verified_at
from public.profiles
on conflict (profile_id) do nothing;

alter table public.profiles
  drop column if exists birth_date,
  drop column if exists budget_min,
  drop column if exists budget_max,
  drop column if exists move_in_date,
  drop column if exists student_email,
  drop column if exists student_email_verified_at;

drop policy if exists read_profiles on public.profiles;
drop policy if exists read_own_profile on public.profiles;
create policy read_own_profile on public.profiles for select to authenticated
  using (id = (select auth.uid()));

alter table public.profile_private enable row level security;
drop policy if exists read_own_private_profile on public.profile_private;
drop policy if exists update_own_private_profile on public.profile_private;
create policy read_own_private_profile on public.profile_private for select to authenticated
  using (profile_id = (select auth.uid()));
create policy update_own_private_profile on public.profile_private for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
revoke update (student_email, student_email_verified_at)
  on public.profile_private from authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name', 'New user'));
  insert into public.profile_private (profile_id) values (new.id);
  return new;
end $fn$;

drop view if exists public.profiles_public;
create view public.profiles_public with (security_barrier = true) as
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
from public.profiles p
left join public.profile_private pp on pp.profile_id = p.id
where p.onboarded
  and p.mode <> 'lister'
  and not public.blocked_with(p.id);

revoke all on public.profiles_public from anon;
grant select on public.profiles_public to authenticated;

drop policy if exists read_profile_photos on public.profile_photos;
create policy read_profile_photos on public.profile_photos for select to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_photos.profile_id
        and p.onboarded
        and p.mode <> 'lister'
        and not public.blocked_with(p.id)
    )
  );

insert into storage.buckets (id, name, public)
values ('apartment-photos', 'apartment-photos', true)
on conflict (id) do nothing;
drop policy if exists "apartment photos are publicly readable" on storage.objects;
drop policy if exists "users upload their own apartment photos" on storage.objects;
drop policy if exists "users update their own apartment photos" on storage.objects;
drop policy if exists "users delete their own apartment photos" on storage.objects;
create policy "apartment photos are publicly readable" on storage.objects for select
  using (bucket_id = 'apartment-photos');
create policy "users upload their own apartment photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'apartment-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update their own apartment photos" on storage.objects for update to authenticated
  using (bucket_id = 'apartment-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete their own apartment photos" on storage.objects for delete to authenticated
  using (bucket_id = 'apartment-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
