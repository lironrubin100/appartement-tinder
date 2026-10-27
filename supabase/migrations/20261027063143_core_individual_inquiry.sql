-- F4: optional immutable opening text, preserving the deployed one-arg RPC.
begin;

alter table public.listing_inquiries add column intro text;
alter table public.listing_inquiries add constraint listing_inquiries_intro_check
  check (intro is null or char_length(intro) <= 500);

-- Both arguments are required here: DEFAULT NULL alongside the legacy overload
-- would make omitted-argument resolution ambiguous in the RPC schema cache.
create function public.create_listing_inquiry(p_apartment_id uuid,p_intro text)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_requester_id uuid := auth.uid();
  v_listing public.apartments%rowtype;
  v_inquiry_id uuid;
begin
  if v_requester_id is null then raise exception 'authentication required'; end if;
  if p_intro is not null and char_length(p_intro)>500 then raise exception 'VALIDATION_FAILED'; end if;

  select a.* into v_listing from public.apartments a
  where a.id=p_apartment_id and a.status='active' and a.inquiries_open
    and a.lister_id is not null and a.lister_id is distinct from v_requester_id
  for update of a;
  if not found then raise exception 'listing is unavailable for contact'; end if;
  -- Preserve the separate fresh snapshot after acquiring a waiting parent lock.
  if public.blocked_with(v_listing.lister_id)
    or not exists(select 1 from public.apartment_rooms r where r.apartment_id=v_listing.id and r.is_available)
  then raise exception 'listing is unavailable for contact'; end if;

  insert into public.listing_inquiries(apartment_id,requester_id,intro)
  values(v_listing.id,v_requester_id,p_intro)
  on conflict(apartment_id,requester_id) do update
    set reconfirmation_required_at=case when public.listing_inquiries.status='pending'
          then null else public.listing_inquiries.reconfirmation_required_at end,
        updated_at=case when public.listing_inquiries.status='pending'
          then now() else public.listing_inquiries.updated_at end
    -- NULL also represents a legacy caller: it never erases a saved opening.
    where p_intro is null or public.listing_inquiries.intro is not distinct from p_intro
  returning id into v_inquiry_id;
  if not found then raise exception 'VALIDATION_FAILED'; end if;
  return v_inquiry_id;
end;
$fn$;

create or replace function public.create_listing_inquiry(p_apartment_id uuid)
returns uuid language sql security invoker set search_path = '' as $fn$
  select public.create_listing_inquiry(p_apartment_id,null::text);
$fn$;

revoke all on function public.create_listing_inquiry(uuid,text) from public,anon;
revoke all on function public.create_listing_inquiry(uuid) from public,anon;
grant execute on function public.create_listing_inquiry(uuid,text) to authenticated;
grant execute on function public.create_listing_inquiry(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
