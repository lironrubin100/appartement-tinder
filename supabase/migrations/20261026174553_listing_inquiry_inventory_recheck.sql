-- Recheck mutable child inventory after a waiting parent lock is acquired.
begin;
create or replace function public.create_listing_inquiry(p_apartment_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_requester_id uuid := auth.uid();
  v_listing public.apartments%rowtype;
  v_inquiry_id uuid;
begin
  if v_requester_id is null then raise exception 'authentication required'; end if;
  select a.* into v_listing from public.apartments a
  where a.id=p_apartment_id and a.status='active' and a.inquiries_open
    and a.lister_id is not null and a.lister_id is distinct from v_requester_id
  for update of a;
  if not found then raise exception 'listing is unavailable for contact'; end if;
  -- A separate statement gets a fresh child snapshot after any parent wait.
  if public.blocked_with(v_listing.lister_id)
    or not exists(select 1 from public.apartment_rooms r where r.apartment_id=v_listing.id and r.is_available)
  then raise exception 'listing is unavailable for contact'; end if;

  insert into public.listing_inquiries(apartment_id,requester_id)
  values(v_listing.id,v_requester_id)
  on conflict(apartment_id,requester_id) do update
    set reconfirmation_required_at=case when public.listing_inquiries.status='pending'
          then null else public.listing_inquiries.reconfirmation_required_at end,
        updated_at=case when public.listing_inquiries.status='pending'
          then now() else public.listing_inquiries.updated_at end
  returning id into v_inquiry_id;
  return v_inquiry_id;
end;
$fn$;
revoke all on function public.create_listing_inquiry(uuid) from public,anon;
grant execute on function public.create_listing_inquiry(uuid) to authenticated;
commit;
