-- B10/D1/I9: an existing resident may explicitly become an account-only property poster.
-- Resident profile data remains private for a future, separately approved return flow.
create or replace function public.convert_to_lister(p_phone text,p_agency text default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'authentication required'; end if;
 if nullif(btrim(p_phone),'') is null then raise exception 'private phone required'; end if;

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
 values(u,nullif(btrim(p_phone),''),nullif(btrim(coalesce(p_agency,'')),''))
 on conflict(profile_id) do update
  set phone=excluded.phone,agency_name=excluded.agency_name,updated_at=now();
end $$;

revoke all on function public.convert_to_lister(text,text) from public,anon;
grant execute on function public.convert_to_lister(text,text) to authenticated;
