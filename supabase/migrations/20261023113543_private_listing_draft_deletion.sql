begin;

alter table public.listing_drafts drop constraint listing_drafts_state_check;
alter table public.listing_drafts add constraint listing_drafts_state_check check(state in ('open','deleting','completed'));

-- A completed job is a permanent idempotency tombstone, not a saved draft.
create table listing_draft_private.deletion_jobs (
  draft_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  original_revision integer not null,
  deletion_revision integer not null,
  import_receipt_id uuid,
  publication_request_id uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index deletion_jobs_owner_receipt on listing_draft_private.deletion_jobs(owner_id,import_receipt_id) where import_receipt_id is not null;
create table listing_draft_private.deletion_objects (
  draft_id uuid not null references listing_draft_private.deletion_jobs(draft_id) on delete cascade,
  object_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null,
  primary key(draft_id,object_id),
  unique(draft_id,object_path)
);
alter table listing_draft_private.deletion_jobs enable row level security;
alter table listing_draft_private.deletion_objects enable row level security;
revoke all on listing_draft_private.deletion_jobs,listing_draft_private.deletion_objects from public,anon,authenticated;
create policy deletion_jobs_owner_read on listing_draft_private.deletion_jobs for select to authenticated using(owner_id=(select auth.uid()));
create policy deletion_objects_owner_read on listing_draft_private.deletion_objects for select to authenticated using(owner_id=(select auth.uid()));

-- Consistent order: owner/receipt -> global draft UUID -> draft row -> publication.
-- Raw limited-column INSERT stays supported for fresh UUIDs, never resurrection.
create function listing_draft_private.guard_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.import_receipt_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-receipt:' || new.owner_id::text || ':' || new.import_receipt_id::text,0));
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-id:' || new.id::text,0));
  if exists(select 1 from listing_draft_private.deletion_jobs j where j.draft_id=new.id or (j.owner_id=new.owner_id and j.import_receipt_id=new.import_receipt_id))
    or exists(select 1 from public.listing_drafts d where d.id=new.id) then raise exception 'DRAFT_UNAVAILABLE'; end if;
  return new;
end $$;
revoke all on function listing_draft_private.guard_draft_identity() from public,anon,authenticated;
create trigger listing_drafts_identity_guard before insert on public.listing_drafts for each row execute function listing_draft_private.guard_draft_identity();

-- Preserve the existing create contract while serializing receipt retries with deletion.
create or replace function public.create_listing_draft(p_import_receipt_id uuid default null,p_source_listing_id uuid default null,p_source_revision integer default null,p_fields jsonb default '{}'::jsonb)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise exception 'INVALID_FIELDS'; end if;
  if (p_source_listing_id is null)<>(p_source_revision is null) or p_source_revision<0 then raise exception 'INVALID_SOURCE'; end if;
  if p_import_receipt_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-receipt:' || v_actor::text || ':' || p_import_receipt_id::text,0));
    if exists(select 1 from listing_draft_private.deletion_jobs j where j.owner_id=v_actor and j.import_receipt_id=p_import_receipt_id) then raise exception 'DRAFT_UNAVAILABLE'; end if;
  end if;
  if p_source_listing_id is not null and not exists(select 1 from public.apartments a where a.id=p_source_listing_id and a.lister_id=v_actor) then raise exception 'SOURCE_UNAVAILABLE'; end if;
  begin
    insert into public.listing_drafts(owner_id,import_receipt_id,source_listing_id,source_revision,fields)
    values(v_actor,p_import_receipt_id,p_source_listing_id,p_source_revision,p_fields)
    on conflict(owner_id,import_receipt_id) where import_receipt_id is not null do nothing returning * into v_draft;
  exception when unique_violation then
    if p_import_receipt_id is null then raise; end if;
    select * into v_draft from public.listing_drafts where owner_id=v_actor and import_receipt_id=p_import_receipt_id;
    if not found then raise; end if;
  end;
  if v_draft.id is null then select * into v_draft from public.listing_drafts where owner_id=v_actor and import_receipt_id=p_import_receipt_id; end if;
  if v_draft.source_listing_id is distinct from p_source_listing_id or v_draft.source_revision is distinct from p_source_revision then raise exception 'IMPORT_CONFLICT'; end if;
  return v_draft;
end $$;

create function listing_draft_private.begin_deletion(p_draft_id uuid,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_draft public.listing_drafts; v_job listing_draft_private.deletion_jobs; v_receipt uuid; v_cancel text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_draft_id is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'INVALID_INPUT'; end if;
  select import_receipt_id into v_receipt from public.listing_drafts where id=p_draft_id and owner_id=v_actor;
  if not found then select import_receipt_id into v_receipt from listing_draft_private.deletion_jobs where draft_id=p_draft_id and owner_id=v_actor; end if;
  if v_receipt is not null then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-receipt:' || v_actor::text || ':' || v_receipt::text,0)); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-id:' || p_draft_id::text,0));
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  select * into v_job from listing_draft_private.deletion_jobs where draft_id=p_draft_id and owner_id=v_actor;
  if v_job.draft_id is not null then
    if p_expected_revision not in (v_job.original_revision,v_job.deletion_revision) then raise exception 'DRAFT_CONFLICT'; end if;
  else
    if v_draft.id is null then raise exception 'DRAFT_NOT_FOUND'; end if;
    if v_draft.state<>'open' then raise exception 'DRAFT_CLOSED'; end if;
    if v_draft.revision<>p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
    -- Existing publisher uses this same lock. A committed/ambiguous publication
    -- must be reconciled; cancellation serializes all future uploads/publish calls.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text,0));
    v_cancel:=public.cancel_listing_publication(v_draft.publication_request_id);
    if v_cancel<>'cancelled' then raise exception 'PUBLICATION_COMMITTED'; end if;
    insert into public.listing_draft_cancelled_attempts(owner_id,draft_id,request_key) values(v_actor,p_draft_id,v_draft.publication_request_id) on conflict do nothing;
    insert into listing_draft_private.deletion_jobs(draft_id,owner_id,original_revision,deletion_revision,import_receipt_id,publication_request_id)
    values(p_draft_id,v_actor,v_draft.revision,v_draft.revision+1,v_draft.import_receipt_id,v_draft.publication_request_id) returning * into v_job;
    insert into listing_draft_private.deletion_objects(draft_id,object_id,owner_id,object_path)
    select p_draft_id,o.id,v_actor,o.name from storage.objects o where o.bucket_id='listing-draft-media' and o.owner_id=v_actor::text and starts_with(o.name,v_actor::text || '/' || p_draft_id::text || '/');
    update public.listing_drafts set state='deleting',revision=v_job.deletion_revision,updated_at=now() where id=p_draft_id;
  end if;
  return jsonb_build_object('draft_id',p_draft_id,'owner_id',v_actor,'original_revision',v_job.original_revision,'revision',v_job.deletion_revision,'completed',v_job.completed_at is not null);
end $$;

create function listing_draft_private.deletion_page(p_draft_id uuid,p_after uuid default null,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_items jsonb; v_last uuid; v_more boolean;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_limit is null or p_limit<1 or p_limit>50 then raise exception 'INVALID_INPUT'; end if;
  if not exists(select 1 from listing_draft_private.deletion_jobs j where j.draft_id=p_draft_id and j.owner_id=v_actor) then raise exception 'DRAFT_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('object_id',q.object_id,'object_path',q.object_path) order by q.object_id),'[]'::jsonb) into v_items
    from (select o.object_id,o.object_path from listing_draft_private.deletion_objects o where o.draft_id=p_draft_id and o.owner_id=v_actor and (p_after is null or o.object_id>p_after) order by o.object_id limit p_limit) q;
  v_last:=(v_items->-1->>'object_id')::uuid;
  v_more:=v_last is not null and exists(select 1 from listing_draft_private.deletion_objects o where o.draft_id=p_draft_id and o.owner_id=v_actor and o.object_id>v_last);
  return jsonb_build_object('items',v_items,'has_more',v_more,'next_cursor',case when v_more then v_last else null end,'projection_version',1);
end $$;

create function listing_draft_private.finish_deletion(p_draft_id uuid,p_expected_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_job listing_draft_private.deletion_jobs; v_receipt uuid; v_draft public.listing_drafts;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select import_receipt_id into v_receipt from listing_draft_private.deletion_jobs where draft_id=p_draft_id and owner_id=v_actor;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if v_receipt is not null then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-receipt:' || v_actor::text || ':' || v_receipt::text,0)); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-id:' || p_draft_id::text,0));
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  select * into v_job from listing_draft_private.deletion_jobs where draft_id=p_draft_id and owner_id=v_actor for update;
  if p_expected_revision is null or p_expected_revision<>v_job.deletion_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_job.completed_at is not null then return; end if;
  if v_draft.state is distinct from 'deleting' or v_draft.revision is distinct from v_job.deletion_revision then raise exception 'DRAFT_UNAVAILABLE'; end if;
  if exists(select 1 from storage.objects o where o.bucket_id='listing-draft-media' and starts_with(o.name,v_actor::text || '/' || p_draft_id::text || '/')) then raise exception 'DRAFT_CLEANUP_REQUIRED'; end if;
  delete from public.listing_drafts where id=p_draft_id and owner_id=v_actor;
  update listing_draft_private.deletion_jobs set completed_at=now() where draft_id=p_draft_id;
end $$;

create function listing_draft_private.deletion_object_access(p_object_id uuid,p_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from listing_draft_private.deletion_jobs j join listing_draft_private.deletion_objects o using(draft_id,owner_id)
    where j.owner_id=(select auth.uid()) and j.completed_at is null and o.object_id=p_object_id and o.object_path=p_name
      and exists(select 1 from public.listing_drafts d where d.id=j.draft_id and d.owner_id=j.owner_id and d.state='deleting'))
$$;
create policy listing_draft_media_cleanup on storage.objects for delete to authenticated using(bucket_id='listing-draft-media' and owner_id=(select auth.uid()::text) and listing_draft_private.deletion_object_access(id,name));

-- Public API remains invoker-only; private implementations derive every owner.
create function public.begin_listing_draft_deletion(p_draft_id uuid,p_expected_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select listing_draft_private.begin_deletion(p_draft_id,p_expected_revision) $$;
create function public.list_listing_draft_deletion_objects(p_draft_id uuid,p_after uuid default null,p_limit integer default 20) returns jsonb language sql security invoker set search_path='' as $$ select listing_draft_private.deletion_page(p_draft_id,p_after,p_limit) $$;
create function public.finish_listing_draft_deletion(p_draft_id uuid,p_expected_revision integer) returns void language sql security invoker set search_path='' as $$ select listing_draft_private.finish_deletion(p_draft_id,p_expected_revision) $$;

-- Compatibility: empty drafts still work; media never gets orphaned by old callers.
create or replace function public.delete_listing_draft(p_draft_id uuid,p_expected_revision integer)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.listing_drafts d where d.id=p_draft_id and d.publication_started_at is not null) then raise exception 'PUBLICATION_IN_PROGRESS'; end if;
  perform listing_draft_private.begin_deletion(p_draft_id,p_expected_revision);
  perform listing_draft_private.finish_deletion(p_draft_id,p_expected_revision+1);
end $$;

revoke all on function listing_draft_private.begin_deletion(uuid,integer),listing_draft_private.deletion_page(uuid,uuid,integer),listing_draft_private.finish_deletion(uuid,integer),listing_draft_private.deletion_object_access(uuid,text),public.begin_listing_draft_deletion(uuid,integer),public.list_listing_draft_deletion_objects(uuid,uuid,integer),public.finish_listing_draft_deletion(uuid,integer) from public,anon;
grant execute on function listing_draft_private.begin_deletion(uuid,integer),listing_draft_private.deletion_page(uuid,uuid,integer),listing_draft_private.finish_deletion(uuid,integer),listing_draft_private.deletion_object_access(uuid,text),public.begin_listing_draft_deletion(uuid,integer),public.list_listing_draft_deletion_objects(uuid,uuid,integer),public.finish_listing_draft_deletion(uuid,integer) to authenticated;

commit;
