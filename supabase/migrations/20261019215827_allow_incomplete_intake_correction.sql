-- I9/B10: an incomplete intake is not a completed lister capability.
-- Keep one-way restrictions for completed/converted accounts unchanged.
begin;
create or replace function public.save_resident_profile(p_name text,p_birth_date date,p_phone text,p_bio text,p_facts jsonb,p_preferences jsonb,p_disclosed_fields text[],p_complete boolean,p_expected_revision integer,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.profiles%rowtype; f jsonb; prefs jsonb; rev integer; payload_hash text; prior public.profile_save_requests%rowtype; result jsonb; completed boolean;
begin
 if u is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into p from public.profiles where id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p.mode='lister' and p.onboarded then raise exception 'FORBIDDEN:lister'; end if;
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
  if p.mode='lister' and p.onboarded then raise exception 'FORBIDDEN:lister'; end if;
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

commit;
