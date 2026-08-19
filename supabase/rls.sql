-- Roomie — row level security + read views. Run AFTER schema.sql.
-- Without this file the anon key can read and rewrite your entire database.

-- ------------------------------------------------- auto-create profile on signup
-- Google/Apple hand us a name; guarantee a profile row exists before the app boots.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name', 'New user'));
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
alter table apartments           enable row level security;
alter table groups               enable row level security;
alter table group_members        enable row level security;
alter table likes                enable row level security;
alter table conversations        enable row level security;
alter table conversation_members enable row level security;
alter table messages             enable row level security;
alter table apartment_interests  enable row level security;
alter table apartment_reports    enable row level security;
alter table saves                enable row level security;
alter table blocks               enable row level security;
alter table user_reports         enable row level security;
alter table push_tokens          enable row level security;

-- ------------------------------------------------- profiles
create policy read_profiles on profiles for select to authenticated
  using (not blocked_with(id));
create policy write_own_profile on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- A user must not be able to grant themselves Pro or the verified checkmark.
-- Column privileges, because RLS cannot express "any column except these".
revoke update (is_pro, is_verified) on profiles from authenticated;

-- ------------------------------------------------- apartments
create policy read_apartments on apartments for select to authenticated
  using (status <> 'paused');
create policy insert_own_apartment on apartments for insert to authenticated
  with check (lister_id = auth.uid() and source = 'user');
create policy update_own_apartment on apartments for update to authenticated
  using (lister_id = auth.uid());

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
