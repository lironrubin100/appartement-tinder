-- Source recovered from the local c8ce worktree. This version matches the
-- migration already recorded in the live Supabase project.
create index if not exists profile_passes_to_user_idx
  on public.profile_passes (to_user);
