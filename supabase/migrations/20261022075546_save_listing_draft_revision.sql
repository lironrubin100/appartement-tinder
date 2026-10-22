begin;

alter table public.listing_drafts add column publication_started_at timestamptz;

create function public.create_listing_draft(
  p_import_receipt_id uuid default null,
  p_source_listing_id uuid default null,
  p_source_revision integer default null,
  p_fields jsonb default '{}'::jsonb
) returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then raise exception 'INVALID_FIELDS'; end if;
  if (p_source_listing_id is null) <> (p_source_revision is null) or p_source_revision < 0 then raise exception 'INVALID_SOURCE'; end if;
  if p_source_listing_id is not null and not exists (
    select 1 from public.apartments a where a.id=p_source_listing_id and a.lister_id=v_actor
  ) then raise exception 'SOURCE_UNAVAILABLE'; end if;
  begin
    insert into public.listing_drafts(owner_id,import_receipt_id,source_listing_id,source_revision,fields)
      values(v_actor,p_import_receipt_id,p_source_listing_id,p_source_revision,p_fields)
      on conflict (owner_id,import_receipt_id) where import_receipt_id is not null do nothing
      returning * into v_draft;
  exception when unique_violation then
    -- A concurrent edit import can hit the open-edit index before the receipt index.
    if p_import_receipt_id is null then raise; end if;
    select * into v_draft from public.listing_drafts where owner_id=v_actor and import_receipt_id=p_import_receipt_id;
    if not found then raise; end if;
  end;
  if v_draft.id is null then
    select * into v_draft from public.listing_drafts
      where owner_id=v_actor and import_receipt_id=p_import_receipt_id;
  end if;
  if v_draft.source_listing_id is distinct from p_source_listing_id
    or v_draft.source_revision is distinct from p_source_revision then raise exception 'IMPORT_CONFLICT'; end if;
  return v_draft;
end $$;

create function public.save_listing_draft(p_draft_id uuid, p_expected_revision integer, p_fields jsonb)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_expected_revision is null or p_fields is null or jsonb_typeof(p_fields) <> 'object' then raise exception 'INVALID_INPUT'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if v_draft.state <> 'open' then raise exception 'DRAFT_CLOSED'; end if;
  if v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.publication_started_at is not null or exists (
    select 1 from public.listing_publication_requests r where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id
  ) or exists (
    select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.owner_id=v_actor::text
      and o.name like v_draft.publication_request_id::text || '/%'
  ) then raise exception 'PUBLICATION_IN_PROGRESS'; end if;
  update public.listing_drafts set fields=p_fields, revision=revision+1, updated_at=now()
    where id=v_draft.id returning * into v_draft;
  return v_draft;
end $$;

-- Freeze the revision before uploading or invoking the existing publication RPC.
create function public.begin_listing_draft_publication(p_draft_id uuid, p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if v_draft.state <> 'open' or v_draft.source_listing_id is not null then raise exception 'DRAFT_UNAVAILABLE'; end if;
  if p_expected_revision is null or v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.publication_started_at is null then
    update public.listing_drafts set publication_started_at=now(), updated_at=now() where id=v_draft.id returning * into v_draft;
  end if;
  return v_draft;
end $$;

create function public.delete_listing_draft(p_draft_id uuid, p_expected_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if p_expected_revision is null or v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.state <> 'open' then raise exception 'DRAFT_CLOSED'; end if;
  if v_draft.publication_started_at is not null or exists (
    select 1 from public.listing_publication_requests r where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id
  ) or exists (
    select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.owner_id=v_actor::text
      and o.name like v_draft.publication_request_id::text || '/%'
  ) then raise exception 'PUBLICATION_IN_PROGRESS'; end if;
  delete from public.listing_drafts where id=v_draft.id;
end $$;

create function public.complete_listing_draft(p_draft_id uuid, p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text, 0));
  if p_expected_revision is null or v_draft.revision <> p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.source_listing_id is not null or not exists (
    select 1 from public.listing_publication_requests r join public.apartments a on a.id=r.listing_id
    where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id and not r.cancelled and a.lister_id=v_actor
  ) then raise exception 'PUBLICATION_RECEIPT_REQUIRED'; end if;
  if v_draft.state = 'open' then
    update public.listing_drafts set state='completed', updated_at=now() where id=v_draft.id returning * into v_draft;
  end if;
  return v_draft;
end $$;

revoke all on function public.create_listing_draft(uuid,uuid,integer,jsonb) from public, anon;
revoke all on function public.save_listing_draft(uuid,integer,jsonb) from public, anon;
revoke all on function public.begin_listing_draft_publication(uuid,integer) from public, anon;
revoke all on function public.delete_listing_draft(uuid,integer) from public, anon;
revoke all on function public.complete_listing_draft(uuid,integer) from public, anon;
grant execute on function public.create_listing_draft(uuid,uuid,integer,jsonb), public.save_listing_draft(uuid,integer,jsonb),
  public.begin_listing_draft_publication(uuid,integer), public.delete_listing_draft(uuid,integer),
  public.complete_listing_draft(uuid,integer) to authenticated;
commit;
