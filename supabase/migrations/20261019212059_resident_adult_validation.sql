-- B5: the server clock decides adulthood. Incomplete drafts and lister intake
-- retain their existing behavior; do not retroactively mutate existing profiles.
begin;
create or replace function public.save_onboarding(p_name text,p_resident boolean,p_birth_date date,p_phone text,p_agency text,p_bio text,p_tags jsonb,p_complete boolean)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'authentication required'; end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'profile missing'; end if;
 if p_complete and (nullif(trim(p_name),'') is null or (p_resident and (p_birth_date is null or p_birth_date>current_date)) or (not p_resident and nullif(trim(p_phone),'') is null)) then raise exception 'incomplete profile'; end if;
 if p_complete and p_resident and p_birth_date > (current_date - interval '18 years')::date then raise exception 'resident must be at least 18'; end if;
 if exists(select 1 from public.profiles where id=u and onboarded) then raise exception 'already completed'; end if;
 update public.profiles set name=trim(p_name),mode=case when p_resident then 'resident' else 'lister' end,bio=p_bio,
 gender_dynamic=p_tags->>'gender_dynamic',cleanliness=p_tags->>'cleanliness',sleep_schedule=p_tags->>'sleep_schedule',social_guests=p_tags->>'social_guests',noise_tolerance=p_tags->>'noise_tolerance',music_vibe=p_tags->>'music_vibe',climate=p_tags->>'climate',smoking=p_tags->>'smoking',kitchen_dietary=p_tags->>'kitchen_dietary',cooking_dynamics=p_tags->>'cooking_dynamics',pets=p_tags->>'pets',weekend_routine=p_tags->>'weekend_routine',relationship_status=p_tags->>'relationship_status',study_habits=p_tags->>'study_habits',financial_splitting=p_tags->>'financial_splitting',miluim_reserve_duty=p_tags->>'miluim_reserve_duty',onboarded=p_complete where id=u;
 insert into public.profile_private(profile_id,birth_date,phone,agency_name) values(u,case when p_resident then p_birth_date end,nullif(trim(p_phone),''),case when not p_resident then nullif(trim(p_agency),'') end)
 on conflict(profile_id) do update set birth_date=excluded.birth_date,phone=excluded.phone,agency_name=excluded.agency_name,updated_at=now();
end $$;
revoke all on function public.save_onboarding(text,boolean,date,text,text,text,jsonb,boolean) from public,anon;
grant execute on function public.save_onboarding(text,boolean,date,text,text,text,jsonb,boolean) to authenticated;

-- The existing own-row REST grant permits birth_date edits after completion.
-- Enforce the same invariant there without revoking ordinary adult corrections.
create function public.enforce_resident_adult_birth_date()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op = 'INSERT' or new.birth_date is distinct from old.birth_date)
 and exists(select 1 from public.profiles p where p.id=new.profile_id and p.onboarded and p.mode='resident')
 and (new.birth_date is null or new.birth_date > (current_date - interval '18 years')::date) then
  raise exception 'resident must be at least 18';
 end if;
 return new;
end $$;
revoke all on function public.enforce_resident_adult_birth_date() from public,anon,authenticated;
create trigger enforce_resident_adult_birth_date
before insert or update of birth_date on public.profile_private
for each row execute function public.enforce_resident_adult_birth_date();
commit;
