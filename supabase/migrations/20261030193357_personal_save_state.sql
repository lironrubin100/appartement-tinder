begin;

-- Explicit intent is safe to repeat after a committed response is lost.
-- Retain the legacy toggle API and reuse its eligibility, writes and counters.
create function public.set_apartment_saved(
  p_apartment_id uuid, p_saved boolean, p_expected_actor uuid
)
returns table(saved boolean,interest_count bigint)
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  current_saved boolean;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
  if p_expected_actor is distinct from actor then raise exception 'SESSION_CHANGED' using errcode='42501';end if;
  if p_saved is null then raise exception 'VALIDATION_FAILED' using errcode='22023';end if;
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
  perform 1 from public.apartments where id=p_apartment_id for update;
  if not found then raise exception 'listing is unavailable' using errcode='22023';end if;
  select exists(select 1 from public.saves where apartment_id=p_apartment_id and user_id=actor) into current_saved;
  if current_saved is distinct from p_saved then
    return query select * from public.toggle_apartment_save_and_interest(p_apartment_id);
  else
    return query select current_saved,(select count(*) from public.saves where apartment_id=p_apartment_id);
  end if;
end $$;
revoke all on function public.set_apartment_saved(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.set_apartment_saved(uuid,boolean,uuid) to authenticated;

commit;
