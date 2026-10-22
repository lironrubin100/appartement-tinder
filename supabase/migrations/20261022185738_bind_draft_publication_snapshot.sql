begin;
alter table public.listing_drafts add column publication_payload_hash bytea;

-- Retain the old key for exact, authorized cleanup/reconciliation of staged media.
create table public.listing_draft_cancelled_attempts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid references public.listing_drafts(id) on delete set null,
  request_key uuid not null,
  cancelled_at timestamptz not null default now(),
  primary key(owner_id,request_key)
);
alter table public.listing_draft_cancelled_attempts enable row level security;
revoke all on public.listing_draft_cancelled_attempts from public, anon, authenticated;
grant select on public.listing_draft_cancelled_attempts to authenticated;
create policy listing_draft_cancelled_attempts_owner_read on public.listing_draft_cancelled_attempts
  for select to authenticated using(owner_id=(select auth.uid()));

-- Keep the earlier signature as a fail-closed compatibility endpoint.
create or replace function public.begin_listing_draft_publication(p_draft_id uuid, p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  raise exception 'PUBLICATION_PAYLOAD_REQUIRED';
end $$;
create function public.begin_listing_draft_publication(p_draft_id uuid, p_expected_revision integer, p_payload jsonb)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts; v_hash bytea;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if v_draft.state <> 'open' or v_draft.source_listing_id is not null then raise exception 'DRAFT_UNAVAILABLE'; end if;
  if p_expected_revision is null or v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  v_hash := pg_catalog.sha256(pg_catalog.convert_to(p_payload::text,'UTF8'));
  if v_draft.publication_payload_hash is not null and v_draft.publication_payload_hash <> v_hash then raise exception 'PUBLICATION_SNAPSHOT_CONFLICT'; end if;
  if v_draft.publication_payload_hash is null then
    -- An older unbound attempt may only be bound if no upload or receipt exists.
    if exists(select 1 from public.listing_publication_requests r where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id)
      or exists(select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.owner_id=v_actor::text and o.name like v_draft.publication_request_id::text || '/%')
    then raise exception 'PUBLICATION_SNAPSHOT_UNKNOWN'; end if;
    update public.listing_drafts set publication_started_at=coalesce(publication_started_at,now()),
      publication_payload_hash=v_hash, updated_at=now() where id=v_draft.id returning * into v_draft;
  end if;
  return v_draft;
end $$;

create or replace function public.complete_listing_draft(p_draft_id uuid, p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if p_expected_revision is null or v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.source_listing_id is not null or v_draft.publication_started_at is null or v_draft.publication_payload_hash is null or not exists (
    select 1 from public.listing_publication_requests r join public.apartments a on a.id=r.listing_id
    where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id and not r.cancelled
      and r.payload_hash=v_draft.publication_payload_hash and a.lister_id=v_actor
  ) then raise exception 'PUBLICATION_RECEIPT_REQUIRED'; end if;
  if v_draft.state = 'open' then
    update public.listing_drafts set state='completed', updated_at=now() where id=v_draft.id returning * into v_draft;
  end if;
  return v_draft;
end $$;

create function public.cancel_listing_draft_publication(p_draft_id uuid, p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts; v_result text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if v_draft.state <> 'open' then raise exception 'DRAFT_CLOSED'; end if;
  if p_expected_revision is null or v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.publication_started_at is null then raise exception 'PUBLICATION_NOT_STARTED'; end if;
  v_result := public.cancel_listing_publication(v_draft.publication_request_id);
  if v_result <> 'cancelled' then raise exception 'PUBLICATION_ALREADY_COMMITTED'; end if;
  insert into public.listing_draft_cancelled_attempts(owner_id,draft_id,request_key)
    values(v_actor,v_draft.id,v_draft.publication_request_id) on conflict do nothing;
  update public.listing_drafts set publication_request_id=gen_random_uuid(), publication_started_at=null,
    publication_payload_hash=null, revision=revision+1, updated_at=now() where id=v_draft.id returning * into v_draft;
  return v_draft;
end $$;

revoke all on function public.begin_listing_draft_publication(uuid,integer,jsonb) from public, anon;
revoke all on function public.complete_listing_draft(uuid,integer) from public, anon;
revoke all on function public.cancel_listing_draft_publication(uuid,integer) from public, anon;
grant execute on function public.begin_listing_draft_publication(uuid,integer,jsonb),
  public.complete_listing_draft(uuid,integer), public.cancel_listing_draft_publication(uuid,integer) to authenticated;
commit;
