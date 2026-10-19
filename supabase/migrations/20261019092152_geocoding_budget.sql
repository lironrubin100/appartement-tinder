-- Shared, atomic geocoder budget. No changes to user/listing data or policies.
create schema if not exists private;
create table private.geocoding_budget (
  day date primary key,
  requests integer not null default 0,
  second_bucket timestamptz not null default date_trunc('second',now()),
  second_requests integer not null default 0,
  paused_until timestamptz
);
create table private.geocoding_actor_budget (
  actor uuid primary key,
  minute_bucket timestamptz not null,
  requests integer not null
);
alter table private.geocoding_budget enable row level security;
alter table private.geocoding_actor_budget enable row level security;
revoke all on private.geocoding_budget, private.geocoding_actor_budget from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.geocoding_budget, private.geocoding_actor_budget to service_role;

create function public.reserve_geocoding_request(p_actor uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  today date := (now() at time zone 'UTC')::date;
  tick timestamptz := date_trunc('second',now());
  minute_tick timestamptz := date_trunc('minute',now());
  shared private.geocoding_budget%rowtype;
  actor_usage private.geocoding_actor_budget%rowtype;
begin
  if auth.role() is distinct from 'service_role' or p_actor is null then
    raise exception 'not authorized' using errcode='42501';
  end if;
  insert into private.geocoding_budget(day) values(today) on conflict do nothing;
  -- Lock shared row first everywhere; concurrent deployments cannot overspend.
  select * into shared from private.geocoding_budget where day=today for update;
  if shared.requests >= 2000 or shared.paused_until > now()
    or (shared.second_bucket=tick and shared.second_requests>=4) then return false; end if;
  insert into private.geocoding_actor_budget(actor,minute_bucket,requests)
    values(p_actor,minute_tick,0) on conflict do nothing;
  select * into actor_usage from private.geocoding_actor_budget where actor=p_actor for update;
  if actor_usage.minute_bucket=minute_tick and actor_usage.requests>=30 then return false; end if;
  update private.geocoding_actor_budget set minute_bucket=minute_tick,
    requests=case when actor_usage.minute_bucket=minute_tick then actor_usage.requests+1 else 1 end
    where actor=p_actor;
  update private.geocoding_budget set requests=requests+1,second_bucket=tick,
    second_requests=case when second_bucket=tick then second_requests+1 else 1 end where day=today;
  -- Small operational counters only, no query/address history; bound retention.
  delete from private.geocoding_budget where day<today-2;
  delete from private.geocoding_actor_budget where minute_bucket<now()-interval '1 day';
  return true;
end $$;

create function public.pause_geocoding_provider() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not authorized' using errcode='42501';
  end if;
  update private.geocoding_budget set paused_until=now()+interval '1 minute'
    where day=(now() at time zone 'UTC')::date;
end $$;
revoke all on function public.reserve_geocoding_request(uuid), public.pause_geocoding_provider() from public,anon,authenticated;
grant execute on function public.reserve_geocoding_request(uuid), public.pause_geocoding_provider() to service_role;
