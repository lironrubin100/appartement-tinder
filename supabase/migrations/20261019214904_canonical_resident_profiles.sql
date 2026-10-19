-- C2/I9/B5/B6/B9: compatible canonical resident facts with explicit disclosure.
-- Generated field definitions: node --experimental-strip-types scripts/generate-profile-schema.mjs.
begin;
-- BEGIN GENERATED MANIFEST
create function public.resident_field_schema() returns jsonb language sql immutable set search_path='' as $schema$
select '{"cleanliness":{"kind":"enum","options":["very_tidy","tidy_shared","relaxed"]},"sleep_schedule":{"kind":"enum","options":["early","regular","late","variable"]},"guests":{"kind":"enum","options":["rare","occasional","frequent"]},"household_noise":{"kind":"enum","options":["quiet","moderate","lively"]},"music_habits":{"kind":"set","options":["headphones","background_speakers","social_music"]},"climate":{"kind":"enum","options":["cool_ac","moderate_ac","windows","flexible"]},"smoking":{"kind":"enum","options":["none","outdoors_only","indoors"]},"kitchen_rules":{"kind":"enum","options":["no_special_rule","kosher","other"]},"kitchen_other":{"kind":"text","max":160},"grocery_sharing":{"kind":"enum","options":["separate","some_shared","shared"]},"cooking_habits":{"kind":"set","options":["meal_prep","takeaway","shared_meals","individual_cooking"]},"pets":{"kind":"set","options":["dog","cat","other"]},"pets_other":{"kind":"text","max":80},"weekend_presence":{"kind":"enum","options":["home","away","varies"]},"overnight_guests":{"kind":"enum","options":["rare","occasional","frequent"]},"study_work_location":{"kind":"enum","options":["outside","private_room","shared_space","varies"]},"expense_style":{"kind":"enum","options":["equal","usage","discuss"]},"extended_absences":{"kind":"enum","options":["occasional","frequent","not_expected","undisclosed"]}}'::jsonb
$schema$;
create function public.resident_preference_fields() returns text[] language sql immutable set search_path='' as $$
select array['cleanliness','sleep_schedule','guests','household_noise','music_habits','climate','smoking','kitchen_rules','grocery_sharing','cooking_habits','weekend_presence','expense_style']::text[]
$$;
-- END GENERATED MANIFEST

create function public.normalize_resident_facts(p_input jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; d jsonb; item jsonb; result jsonb:='{}'; values_out jsonb;
begin
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'VALIDATION_FAILED:facts'; end if;
 for k,v in select * from jsonb_each(p_input) loop
  d:=public.resident_field_schema()->k;
  if d is null then raise exception 'VALIDATION_FAILED:%',k; end if;
  if v='null'::jsonb then result:=result||jsonb_build_object(k,null); continue; end if;
  if d->>'kind'='enum' then
   if jsonb_typeof(v)<>'string' or not (d->'options' ? (v#>>'{}')) then raise exception 'VALIDATION_FAILED:%',k; end if;
  elsif d->>'kind'='text' then
   if jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>(d->>'max')::int then raise exception 'VALIDATION_FAILED:%',k; end if;
   v:=to_jsonb(btrim(v#>>'{}'));
  elsif d->>'kind'='set' then
   if jsonb_typeof(v)<>'object' or exists(select 1 from jsonb_object_keys(v) x where x not in ('answered','values')) or jsonb_typeof(v->'answered') is distinct from 'boolean' then raise exception 'VALIDATION_FAILED:%',k; end if;
   if v->'answered'='false'::jsonb then
    if v ? 'values' and v->'values'<>'[]'::jsonb then raise exception 'VALIDATION_FAILED:%',k; end if;
    v:='null';
   else
    if jsonb_typeof(v->'values') is distinct from 'array' then raise exception 'VALIDATION_FAILED:%',k; end if;
    for item in select * from jsonb_array_elements(v->'values') loop
     if jsonb_typeof(item)<>'string' or not (d->'options' ? (item#>>'{}')) then raise exception 'VALIDATION_FAILED:%',k; end if;
    end loop;
    if (select count(*)<>count(distinct x) from jsonb_array_elements(v->'values') x) then raise exception 'VALIDATION_FAILED:%',k; end if;
    select coalesce(jsonb_agg(x order by n),'[]'::jsonb) into values_out from jsonb_array_elements(d->'options') with ordinality as o(x,n) where (v->'values') @> jsonb_build_array(x);
    v:=jsonb_build_object('answered',true,'values',values_out);
   end if;
  end if;
  result:=result||jsonb_build_object(k,v);
 end loop;
 if coalesce(result->>'kitchen_other','')<>'' and result->>'kitchen_rules' is distinct from 'other' then raise exception 'VALIDATION_FAILED:kitchen_other'; end if;
 if coalesce(result->>'pets_other','')<>'' and not coalesce(result->'pets'->'values' ? 'other',false) then raise exception 'VALIDATION_FAILED:pets_other'; end if;
 return result;
end $$;

create function public.normalize_resident_preferences(p_input jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; f text; d jsonb; result jsonb:='{}'; a jsonb; b jsonb; item jsonb;
begin
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'VALIDATION_FAILED:preferences'; end if;
 for k,v in select * from jsonb_each(p_input) loop
  if k in ('strict_non_smoking','strict_no_pets','pet_preference_answered') then
   if v<>'null'::jsonb and jsonb_typeof(v)<>'boolean' then raise exception 'VALIDATION_FAILED:%',k; end if;
  elsif k in ('quiet_hours_from','quiet_hours_to') then
   if v<>'null'::jsonb and (jsonb_typeof(v)<>'string' or (v#>>'{}')!~'^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$') then raise exception 'VALIDATION_FAILED:%',k; end if;
  else
   f:=case when k='accepted_pet_types' then 'pets' else regexp_replace(k,'^(accepted|preferred)_','') end;
   if not (k='accepted_pet_types' or (k=any(array['accepted_'||f,'preferred_'||f]) and f=any(public.resident_preference_fields()))) or jsonb_typeof(v)<>'array' then raise exception 'VALIDATION_FAILED:%',k; end if;
   d:=public.resident_field_schema()->f;
   for item in select * from jsonb_array_elements(v) loop
    if jsonb_typeof(item)<>'string' or not (d->'options' ? (item#>>'{}')) then raise exception 'VALIDATION_FAILED:%',k; end if;
   end loop;
   if (select count(*)<>count(distinct x) from jsonb_array_elements(v) x) then raise exception 'VALIDATION_FAILED:%',k; end if;
   select coalesce(jsonb_agg(x order by n),'[]'::jsonb) into v from jsonb_array_elements(d->'options') with ordinality as o(x,n) where v @> jsonb_build_array(x);
  end if;
  result:=result||jsonb_build_object(k,v);
 end loop;
 foreach f in array public.resident_preference_fields() loop
  a:=coalesce(result->('accepted_'||f),'[]'); b:=coalesce(result->('preferred_'||f),'[]');
  if not a @> b then raise exception 'VALIDATION_FAILED:preferred_%',f; end if;
 end loop;
 if (result->>'quiet_hours_from' is null)<>(result->>'quiet_hours_to' is null) then raise exception 'VALIDATION_FAILED:quiet_hours'; end if;
 if result ? 'accepted_pet_types' and result->'pet_preference_answered' is distinct from 'true'::jsonb then raise exception 'VALIDATION_FAILED:pet_preference_answered'; end if;
 if result->'pet_preference_answered'='true'::jsonb and not result ? 'accepted_pet_types' then raise exception 'VALIDATION_FAILED:accepted_pet_types'; end if;
 return result;
end $$;

create function public.resident_disclosure_valid(p_fields text[]) returns boolean language sql immutable set search_path='' as $$
 select p_fields is not null and array_position(p_fields,null) is null
 and not exists(select 1 from unnest(p_fields) x where not public.resident_field_schema() ? x)
 and cardinality(p_fields)=(select count(distinct x) from unnest(p_fields) x)
$$;

create table public.profile_lifestyle(
 profile_id uuid primary key references public.profiles on delete cascade,
 taxonomy_version integer not null default 1 check(taxonomy_version=1),
 facts jsonb not null default '{}' check(facts=public.normalize_resident_facts(facts)),
 disclosed_fields text[] not null default '{}' check(public.resident_disclosure_valid(disclosed_fields)),
 revision integer not null default 0 check(revision>=0), updated_at timestamptz not null default now()
);
create table public.profile_lifestyle_private(
 profile_id uuid primary key references public.profiles on delete cascade,
 preferences jsonb not null default '{}' check(preferences=public.normalize_resident_preferences(preferences)),
 updated_at timestamptz not null default now()
);
-- Request tombstones deliberately store no private payload; exact payload hash is sufficient.
create table public.profile_save_requests(
 profile_id uuid not null references public.profiles on delete cascade, request_key uuid not null,
 payload_hash text not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(profile_id,request_key)
);
alter table public.profile_lifestyle enable row level security;
alter table public.profile_lifestyle_private enable row level security;
alter table public.profile_save_requests enable row level security;
revoke all on public.profile_lifestyle,public.profile_lifestyle_private,public.profile_save_requests from public,anon,authenticated;
grant select on public.profile_lifestyle,public.profile_lifestyle_private to authenticated;
create policy own_lifestyle on public.profile_lifestyle for select to authenticated using(profile_id=(select auth.uid()));
create policy own_lifestyle_private on public.profile_lifestyle_private for select to authenticated using(profile_id=(select auth.uid()));

alter table public.profile_private add column full_name text,
 add column adult_confirmed_at timestamptz;
create function public.profile_trim(p_value text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(p_value,'^[[:space:]]+|[[:space:]]+$','','g')
$$;
-- Preserve existing names privately, then stop publishing surname tokens everywhere.
update public.profile_private pp set full_name=p.name from public.profiles p where p.id=pp.profile_id;
create function public.profile_display_name(p_name text) returns text language sql immutable set search_path='' as $$
 select case when cardinality(x)>1 then x[1]||' '||left(x[cardinality(x)],1)||'.' else coalesce(x[1],'') end from (select regexp_split_to_array(public.profile_trim(p_name),'\s+') x) s
$$;
update public.profiles set name=public.profile_display_name(name);

create function public.owned_profile_photo(p_profile_id uuid,p_url text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(exists(select 1 from storage.objects o
 where o.bucket_id='profile-photos' and o.owner_id=p_profile_id::text
 and o.name ~ ('^'||p_profile_id::text||'/[A-Za-z0-9._-]+$')
 and p_url='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/profile-photos/'||o.name),false)
$$;
create function public.guard_profile_gallery() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid:=coalesce(new.profile_id,old.profile_id);
begin
 perform 1 from public.profiles where id=u for update;
 if tg_op<>'DELETE' and (tg_op='INSERT' or new.url is distinct from old.url or new.profile_id is distinct from old.profile_id) and not public.owned_profile_photo(new.profile_id,new.url) then raise exception 'VALIDATION_FAILED:owned_photo'; end if;
 if tg_op='UPDATE' and new.profile_id<>old.profile_id then raise exception 'FORBIDDEN'; end if;
 if tg_op='DELETE' and exists(select 1 from public.profiles p join public.profile_lifestyle l on l.profile_id=p.id where p.id=u and p.onboarded and p.mode='resident') and not exists(select 1 from public.profile_photos ph where ph.profile_id=u and ph.id<>old.id and public.owned_profile_photo(u,ph.url)) then raise exception 'VALIDATION_FAILED:photo_required'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger guard_profile_gallery before insert or update or delete on public.profile_photos for each row execute function public.guard_profile_gallery();
create or replace function public.sync_primary_profile_photo() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid:=coalesce(new.profile_id,old.profile_id);
begin
 update public.profiles set photo_url=(select ph.url from public.profile_photos ph
 where ph.profile_id=u and (not exists(select 1 from public.profile_lifestyle l where l.profile_id=u) or public.owned_profile_photo(u,ph.url))
 order by ph.display_order,ph.id limit 1) where id=u;
 return null;
end $$;
-- Object deletion cannot undermine the last canonical resident photo.
create function public.guard_profile_photo_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id::text=old.owner_id for update;
 -- Remove the gallery reference first; its own guard prevents losing the last
 -- completed resident photo. This also prevents dangling public primary URLs.
 if old.bucket_id='profile-photos' and exists(
 select 1 from public.profiles p join public.profile_lifestyle l on l.profile_id=p.id
 join public.profile_photos ph on ph.profile_id=p.id
 where p.id::text=old.owner_id and p.onboarded and p.mode='resident'
 and ph.url='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/profile-photos/'||old.name
 ) then raise exception 'VALIDATION_FAILED:photo_required'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger guard_profile_photo_object before delete or update of name,bucket_id,owner_id on storage.objects for each row execute function public.guard_profile_photo_object();

revoke update(name,bio,photo_url,photo_blur_url,gender,gender_dynamic,cleanliness,sleep_schedule,social_guests,noise_tolerance,music_vibe,climate,smoking,kitchen_dietary,cooking_dynamics,pets,weekend_routine,relationship_status,study_habits,financial_splitting,miluim_reserve_duty) on public.profiles from authenticated;

create function public.save_resident_profile(p_name text,p_birth_date date,p_phone text,p_bio text,p_facts jsonb,p_preferences jsonb,p_disclosed_fields text[],p_complete boolean,p_expected_revision integer,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.profiles%rowtype; f jsonb; prefs jsonb; rev integer; payload_hash text; prior public.profile_save_requests%rowtype; result jsonb; completed boolean;
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into p from public.profiles where id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p.mode='lister' then raise exception 'FORBIDDEN:lister'; end if;
 if p_request_key is null or p_expected_revision is null or p_expected_revision<0 or p_complete is null then raise exception 'VALIDATION_FAILED:request'; end if;
 payload_hash:=encode(sha256(convert_to(jsonb_build_array('resident',p_name,p_birth_date,p_phone,p_bio,p_facts,p_preferences,p_disclosed_fields,p_complete,p_expected_revision)::text,'UTF8')),'hex');
 select * into prior from public.profile_save_requests where profile_id=u and request_key=p_request_key;
 if found then
  if prior.payload_hash<>payload_hash then raise exception 'STATE_CONFLICT:request_key'; end if;
  return prior.result;
 end if;
 f:=public.normalize_resident_facts(p_facts); prefs:=public.normalize_resident_preferences(p_preferences);
 if p_disclosed_fields is null or array_position(p_disclosed_fields,null) is not null or exists(select 1 from unnest(p_disclosed_fields) x where not public.resident_field_schema() ? x) or cardinality(p_disclosed_fields)<>(select count(distinct x) from unnest(p_disclosed_fields) x) then raise exception 'VALIDATION_FAILED:disclosed_fields'; end if;
 if p_name is null or char_length(p_name)>80 or char_length(coalesce(p_bio,''))>300 or char_length(coalesce(p_phone,''))>80 then raise exception 'VALIDATION_FAILED:profile'; end if;
 select revision into rev from public.profile_lifestyle where profile_id=u;
 rev:=coalesce(rev,0);
 if rev<>p_expected_revision then raise exception 'STATE_CONFLICT:revision'; end if;
 completed:=p.onboarded or p_complete;
 if completed and (nullif(public.profile_trim(p_name),'') is null or nullif(public.profile_trim(p_bio),'') is null or p_birth_date is null or p_birth_date>(current_date-interval '18 years')::date or exists(select 1 from unnest(array['cleanliness','sleep_schedule','guests','smoking']) x where f->>x is null) or not exists(select 1 from public.profile_photos ph where ph.profile_id=u and public.owned_profile_photo(u,ph.url))) then raise exception 'VALIDATION_FAILED:incomplete_resident'; end if;
 if p_birth_date>current_date then raise exception 'VALIDATION_FAILED:birth_date'; end if;
 update public.profiles set name=public.profile_display_name(p_name),bio=public.profile_trim(p_bio),mode='resident',onboarded=completed,photo_url=coalesce((select ph.url from public.profile_photos ph where ph.profile_id=u and public.owned_profile_photo(u,ph.url) order by ph.display_order,ph.id limit 1),photo_url) where id=u;
 insert into public.profile_private(profile_id,full_name,birth_date,phone) values(u,public.profile_trim(p_name),p_birth_date,nullif(public.profile_trim(p_phone),'')) on conflict(profile_id) do update set full_name=excluded.full_name,birth_date=excluded.birth_date,phone=excluded.phone,updated_at=now();
 insert into public.profile_lifestyle(profile_id,facts,disclosed_fields,revision) values(u,f,p_disclosed_fields,rev+1) on conflict(profile_id) do update set facts=excluded.facts,disclosed_fields=excluded.disclosed_fields,revision=excluded.revision,updated_at=now();
 insert into public.profile_lifestyle_private(profile_id,preferences) values(u,prefs) on conflict(profile_id) do update set preferences=excluded.preferences,updated_at=now();
 result:=jsonb_build_object('revision',rev+1,'onboarded',completed);
 insert into public.profile_save_requests(profile_id,request_key,payload_hash,result) values(u,p_request_key,payload_hash,result);
 return result;
end $$;
revoke all on function public.save_resident_profile(text,date,text,text,jsonb,jsonb,text[],boolean,integer,uuid) from public,anon;
grant execute on function public.save_resident_profile(text,date,text,text,jsonb,jsonb,text[],boolean,integer,uuid) to authenticated;

-- Existing private REST edits remain usable without bypassing required lister phone.
create function public.guard_lister_private_contact() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.profiles where id=new.profile_id and onboarded and mode='lister')
 and nullif(public.profile_trim(new.phone),'') is null then raise exception 'VALIDATION_FAILED:lister_phone'; end if;
 if char_length(coalesce(new.phone,''))>80 or char_length(coalesce(new.agency_name,''))>120 then raise exception 'VALIDATION_FAILED:contact'; end if;
 return new;
end $$;
create trigger guard_lister_private_contact before insert or update of phone,agency_name on public.profile_private for each row execute function public.guard_lister_private_contact();

-- Account-only editing preserves all former resident data privately after B10.
create function public.save_lister_profile(p_name text,p_phone text,p_agency text,p_expected_revision integer,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.profiles%rowtype; rev integer; payload_hash text; prior public.profile_save_requests%rowtype; result jsonb;
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into p from public.profiles where id=u for update;
 if not found or p.mode is distinct from 'lister' or not p.onboarded then raise exception 'FORBIDDEN:lister_required'; end if;
 if p_request_key is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'VALIDATION_FAILED:request'; end if;
 payload_hash:=encode(sha256(convert_to(jsonb_build_array('lister',p_name,p_phone,p_agency,p_expected_revision)::text,'UTF8')),'hex');
 select * into prior from public.profile_save_requests where profile_id=u and request_key=p_request_key;
 if found then
  if prior.payload_hash<>payload_hash then raise exception 'STATE_CONFLICT:request_key'; end if;
  return prior.result;
 end if;
 if nullif(public.profile_trim(p_name),'') is null or char_length(p_name)>80 or nullif(public.profile_trim(p_phone),'') is null or char_length(p_phone)>80 or char_length(coalesce(p_agency,''))>120 then raise exception 'VALIDATION_FAILED:lister_profile'; end if;
 select revision into rev from public.profile_lifestyle where profile_id=u;
 rev:=coalesce(rev,0);
 if rev<>p_expected_revision then raise exception 'STATE_CONFLICT:revision'; end if;
 update public.profiles set name=public.profile_display_name(p_name) where id=u;
 insert into public.profile_private(profile_id,full_name,phone,agency_name) values(u,public.profile_trim(p_name),public.profile_trim(p_phone),nullif(public.profile_trim(p_agency),''))
 on conflict(profile_id) do update set full_name=excluded.full_name,phone=excluded.phone,agency_name=excluded.agency_name,updated_at=now();
 insert into public.profile_lifestyle(profile_id,revision) values(u,rev+1)
 on conflict(profile_id) do update set revision=excluded.revision,updated_at=now();
 result:=jsonb_build_object('revision',rev+1);
 insert into public.profile_save_requests(profile_id,request_key,payload_hash,result) values(u,p_request_key,payload_hash,result);
 return result;
end $$;
revoke all on function public.save_lister_profile(text,text,text,integer,uuid) from public,anon;
grant execute on function public.save_lister_profile(text,text,text,integer,uuid) to authenticated;

-- Signature-compatible legacy entrypoint: strict I9 checks through canonical RPC;
-- no inference of disclosure or sensitive replacement behaviors.
create or replace function public.save_onboarding(p_name text,p_resident boolean,p_birth_date date,p_phone text,p_agency text,p_bio text,p_tags jsonb,p_complete boolean)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.profiles%rowtype; f jsonb:='{}'; key text; v text; rev integer;
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into p from public.profiles where id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p.onboarded then raise exception 'already completed'; end if;
 if p_resident is null or p_complete is null or jsonb_typeof(p_tags) is distinct from 'object' then raise exception 'VALIDATION_FAILED:intake'; end if;
 if p_resident then
  if p.mode='lister' then raise exception 'FORBIDDEN:lister'; end if;
  if p_tags->>'taxonomy_version'='1' then
   f:=coalesce(p_tags->'facts','{}');
  else
   for key,v in select * from jsonb_each_text(p_tags) loop
    case key
     when 'cleanliness' then if v in ('very_clean','relaxed') then f:=f||jsonb_build_object(key,case v when 'very_clean' then 'very_tidy' else 'relaxed' end); end if;
     when 'sleep_schedule' then if v in ('early_bed_early_wake','night_owl') then f:=f||jsonb_build_object(key,case v when 'early_bed_early_wake' then 'early' else 'late' end); end if;
     when 'social_guests' then if v in ('frequent_visitors','occasional','rarely') then f:=f||jsonb_build_object('guests',case v when 'frequent_visitors' then 'frequent' when 'rarely' then 'rare' else v end); end if;
     when 'smoking' then if v in ('no','outdoor_only') then f:=f||jsonb_build_object(key,case v when 'no' then 'none' else 'outdoors_only' end); end if;
     else null;
    end case;
   end loop;
  end if;
  select coalesce(l.revision,0) into rev from public.profiles q left join public.profile_lifestyle l on l.profile_id=q.id where q.id=u;
  perform public.save_resident_profile(p_name,p_birth_date,p_phone,p_bio,f,'{}','{}',p_complete,rev,gen_random_uuid());
 else
  if p_complete and (nullif(public.profile_trim(p_name),'') is null or nullif(public.profile_trim(p_phone),'') is null or p_tags->'adult_confirmed' is distinct from 'true'::jsonb) then raise exception 'VALIDATION_FAILED:lister_adult_confirmation'; end if;
  if char_length(p_name)>80 or char_length(coalesce(p_phone,''))>80 or char_length(coalesce(p_agency,''))>120 then raise exception 'VALIDATION_FAILED:profile'; end if;
  update public.profiles set name=public.profile_display_name(p_name),mode='lister',onboarded=p_complete where id=u;
  insert into public.profile_private(profile_id,full_name,phone,agency_name,adult_confirmed_at) values(u,public.profile_trim(p_name),nullif(public.profile_trim(p_phone),''),nullif(public.profile_trim(p_agency),''),case when p_complete then now() end) on conflict(profile_id) do update set full_name=excluded.full_name,phone=excluded.phone,agency_name=excluded.agency_name,adult_confirmed_at=coalesce(public.profile_private.adult_confirmed_at,excluded.adult_confirmed_at),updated_at=now();
 end if;
end $$;

create or replace function public.convert_to_lister(p_phone text,p_agency text default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'authentication required'; end if;
 if char_length(coalesce(p_phone,''))>80 or char_length(coalesce(p_agency,''))>120 then raise exception 'VALIDATION_FAILED:contact'; end if;
 if nullif(public.profile_trim(p_phone),'') is null then raise exception 'private phone required'; end if;

 perform 1 from public.profiles
  where id=u and onboarded and mode='resident'
  for update;
 if not found then raise exception 'resident profile required'; end if;

 -- Do not silently leave a social group in an invalid state. The resident can
 -- leave or transfer/close the group under its existing lifecycle first.
 if exists(select 1 from public.group_members where user_id=u) then
  raise exception 'active_group_membership';
 end if;

 update public.profiles set mode='lister' where id=u;
 insert into public.profile_private(profile_id,phone,agency_name)
 values(u,nullif(public.profile_trim(p_phone),''),nullif(public.profile_trim(coalesce(p_agency,'')),''))
 on conflict(profile_id) do update
  set phone=excluded.phone,agency_name=excluded.agency_name,updated_at=now();
end $$;


-- Keep the existing composite view/OIDs and RPC signatures. Append safe facts.
-- Full names have already moved to profile_private; all legacy facts are hidden
-- unless an explicit canonical disclosure can be projected with exact meaning.
create or replace view public.profiles_public with(security_barrier=true) as
select p.id,p.name,p.photo_url,p.bio,
 case when pp.birth_date is null then null else extract(year from age(current_date,pp.birth_date))::int end as age,
 null::text as gender,null::text as gender_dynamic,
 null::text as cleanliness,null::text as sleep_schedule,null::text as social_guests,
 null::text as noise_tolerance,null::text as music_vibe,null::text as climate,null::text as smoking,
 null::text as kitchen_dietary,null::text as cooking_dynamics,null::text as pets,null::text as weekend_routine,
 null::text as relationship_status,null::text as study_habits,null::text as financial_splitting,null::text as miluim_reserve_duty,
 case when p.is_verified and 'student_verified'=any(p.public_badges) then array['student_verified']::text[] else array[]::text[] end as public_badges,
 coalesce((select jsonb_object_agg(k,v) from jsonb_each(l.facts) as fact(k,v) where k=any(l.disclosed_fields)),'{}'::jsonb) as lifestyle_facts
from public.profiles p left join public.profile_private pp on pp.profile_id=p.id left join public.profile_lifestyle l on l.profile_id=p.id
where p.onboarded and p.mode<>'lister' and not public.blocked_with(p.id);

create or replace function public.send_introduction(p_user uuid,p_group uuid,p_message text,p_ref_tag text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v uuid; daily_limit int;
begin
 if u is null then raise exception 'authentication required'; end if;
 perform 1 from public.profiles where id=u and onboarded and mode<>'lister' for update;
 if not found then raise exception 'resident profile required'; end if;
 if num_nonnulls(p_user,p_group)<>1 then raise exception 'one target required'; end if;
 select id into v from public.likes where from_user=u and to_user is not distinct from p_user and to_group is not distinct from p_group and status='pending';
 if v is not null then return v; end if;
 select introductions_per_day into daily_limit from public.mvp_limits;
 if (select count(*) from public.likes where from_user=u and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=daily_limit then raise exception 'daily_limit'; end if;
 if p_user is not null and (p_user=u or not exists(select 1 from public.profiles where id=p_user and onboarded and mode<>'lister') or public.blocked_with(p_user)) then raise exception 'recipient unavailable'; end if;
 if p_group is not null and (not exists(select 1 from public.groups where id=p_group and status='open') or exists(select 1 from public.group_members where group_id=p_group and (user_id=u or public.blocked_with(user_id)))) then raise exception 'group unavailable'; end if;
 if coalesce(p_ref_tag,'bio')<>'bio' and not exists(
 select 1 from public.profiles_public p where p.id::text=split_part(p_ref_tag,':',1)
 and cardinality(string_to_array(p_ref_tag,':'))=3
 and (
  (split_part(p_ref_tag,':',2)=any(array['cleanliness','sleep_schedule','social_guests','noise_tolerance','music_vibe','climate','smoking','kitchen_dietary','cooking_dynamics','pets','weekend_routine','study_habits','financial_splitting'])
   and to_jsonb(p)->>split_part(p_ref_tag,':',2)=split_part(p_ref_tag,':',3))
  or (split_part(p_ref_tag,':',2) like 'canonical.%' and (
   (public.resident_field_schema()->substr(split_part(p_ref_tag,':',2),11)->>'kind'='enum'
    and p.lifestyle_facts->>substr(split_part(p_ref_tag,':',2),11)=split_part(p_ref_tag,':',3))
   or (public.resident_field_schema()->substr(split_part(p_ref_tag,':',2),11)->>'kind'='set'
    and p.lifestyle_facts->substr(split_part(p_ref_tag,':',2),11)->'answered'='true'::jsonb
    and p.lifestyle_facts->substr(split_part(p_ref_tag,':',2),11)->'values' ? split_part(p_ref_tag,':',3))
  ))
 )
 and (p.id=p_user or exists(select 1 from public.group_members gm where gm.group_id=p_group and gm.user_id=p.id))
 ) then raise exception 'invalid trait reference'; end if;
 insert into public.likes(from_user,to_user,to_group,message,ref_tag) values(u,p_user,p_group,coalesce(p_message,''),p_ref_tag) returning id into v;
 return v;
end $$;

-- Helpers are not public APIs. CHECK functions execute under the owning RPC.
revoke all on function public.resident_disclosure_valid(text[]),public.resident_field_schema(),public.resident_preference_fields(),public.normalize_resident_facts(jsonb),public.normalize_resident_preferences(jsonb),public.guard_lister_private_contact(),public.profile_trim(text),public.profile_display_name(text),public.owned_profile_photo(uuid,text),public.guard_profile_gallery(),public.guard_profile_photo_object() from public,anon,authenticated;
commit;
