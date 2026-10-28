-- D16/D18: undo rented is not renewal, room availability or occupancy.
begin;

create function public.guard_owner_listing_status() returns trigger
language plpgsql security invoker set search_path='' as $fn$
begin
  -- Direct ordinary writes retain their RLS boundary. Reviewed SECURITY
  -- DEFINER operations validate their own actor; trusted maintenance remains
  -- able to apply reviewer restrictions (including with no user session).
  if current_user in ('authenticated','anon') then
    if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
    if old.lister_id is distinct from auth.uid() or old.source<>'user' then raise exception 'NOT_FOUND';end if;
    if new.status is distinct from old.status then
      if old.status not in ('active','taken') or new.status not in ('active','taken') then raise exception 'STATE_UNAVAILABLE';end if;
      if new.status='active' and old.created_at<=clock_timestamp()-interval '45 days' then raise exception 'STATE_UNAVAILABLE';end if;
    end if;
  end if;
  return new;
end;
$fn$;
revoke all on function public.guard_owner_listing_status()from public,anon,authenticated;
create trigger guard_owner_listing_status before update of status on public.apartments
for each row execute function public.guard_owner_listing_status();

create function public.mark_taken_inquiries_for_reconfirmation() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
  -- Parent UPDATE already holds its row lock, before the inquiry locks. The
  -- existing status-revision trigger advances revision exactly once.
  if new.status='taken' and old.status is distinct from new.status then
    update public.listing_inquiries set reconfirmation_required_at=now(),updated_at=now()
    where apartment_id=new.id and status='pending' and reconfirmation_required_at is null;
  end if;
  return null;
end;
$fn$;
revoke all on function public.mark_taken_inquiries_for_reconfirmation()from public,anon,authenticated;
create trigger taken_listing_reconfirmation after update of status on public.apartments
for each row execute function public.mark_taken_inquiries_for_reconfirmation();

create function public.set_owned_listing_status(p_listing_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  actor uuid:=auth.uid();a public.apartments%rowtype;pending_count integer;
begin
  if actor is null then raise exception 'AUTH_REQUIRED';end if;
  if p_listing_id is null or p_status is null or p_status not in ('active','taken') then raise exception 'VALIDATION_FAILED';end if;
  select ap.* into a from public.apartments ap where ap.id=p_listing_id and ap.lister_id=actor and ap.source='user' for update of ap;
  if not found then raise exception 'NOT_FOUND';end if;
  if a.status not in ('active','taken') then raise exception 'STATE_UNAVAILABLE';end if;
  -- There is no renewal clock in the current schema: created_at is the
  -- publication clock. The separately planned renewal feature must own that
  -- future clock/cohort integration. Never refresh it through undo-rented.
  if p_status='active' and a.created_at<=clock_timestamp()-interval '45 days' then raise exception 'STATE_UNAVAILABLE';end if;
  if a.status is distinct from p_status then
    update public.apartments set status=p_status where id=a.id returning * into a;
  end if;
  select count(*)into pending_count from public.listing_inquiries
  where apartment_id=a.id and status='pending' and reconfirmation_required_at is not null;
  return jsonb_build_object('listingId',a.id,'status',a.status,'revision',a.revision,'pendingReconfirmationCount',pending_count);
end;
$fn$;
revoke all on function public.set_owned_listing_status(uuid,text)from public,anon;
grant execute on function public.set_owned_listing_status(uuid,text)to authenticated;
notify pgrst,'reload schema';
commit;
