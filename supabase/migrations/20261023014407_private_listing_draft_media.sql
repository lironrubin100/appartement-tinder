begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('listing-draft-media','listing-draft-media',false,5242880,array['image/jpeg','image/png','image/webp']);

create schema listing_draft_private;
revoke all on schema listing_draft_private from public,anon;
grant usage on schema listing_draft_private to authenticated;

-- Storage objects are immutable. Writes lock the same draft as save/begin/association.
-- This prevents an association or publication from racing an object deletion.
create function listing_draft_private.listing_draft_media_access(p_name text,p_operation text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_parts text[]; v_draft public.listing_drafts;
begin
  if v_actor is null or p_operation not in ('read','insert','delete') or p_name is null then return false; end if;
  if p_name !~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$' then return false; end if;
  v_parts := pg_catalog.string_to_array(p_name,'/');
  if v_parts[1] <> v_actor::text then return false; end if;
  if p_operation = 'read' then
    return exists(select 1 from public.listing_drafts d where d.id=v_parts[2]::uuid and d.owner_id=v_actor);
  end if;
  select * into v_draft from public.listing_drafts where id=v_parts[2]::uuid and owner_id=v_actor for update;
  if not found or v_draft.state <> 'open' or v_draft.publication_started_at is not null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text,0));
  if exists(select 1 from public.listing_publication_requests r where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id)
    or exists(select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.owner_id=v_actor::text and o.name like v_draft.publication_request_id::text || '/%') then return false; end if;
  if p_operation='delete' and v_draft.photos @> pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('kind','draft','objectPath',p_name)) then return false; end if;
  return true;
end $$;
revoke all on function listing_draft_private.listing_draft_media_access(text,text) from public,anon;
grant execute on function listing_draft_private.listing_draft_media_access(text,text) to authenticated;

create policy listing_draft_media_read on storage.objects for select to authenticated
  using (bucket_id='listing-draft-media' and owner_id=(select auth.uid()::text) and listing_draft_private.listing_draft_media_access(name,'read'));
create policy listing_draft_media_insert on storage.objects for insert to authenticated
  with check (bucket_id='listing-draft-media' and owner_id=(select auth.uid()::text) and listing_draft_private.listing_draft_media_access(name,'insert'));
create policy listing_draft_media_delete on storage.objects for delete to authenticated
  using (bucket_id='listing-draft-media' and owner_id=(select auth.uid()::text) and listing_draft_private.listing_draft_media_access(name,'delete'));
-- No UPDATE policy: retries reuse immutable object identities, never replace bytes.

create function public.set_listing_draft_photos(p_draft_id uuid,p_expected_revision integer,p_photos jsonb)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_draft public.listing_drafts; v_photo jsonb; v_path text; v_kind text;
  v_seen text[] := '{}'; v_object uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_expected_revision is null or p_photos is null or jsonb_typeof(p_photos)<>'array' then raise exception 'INVALID_PHOTOS'; end if;
  if jsonb_array_length(p_photos)>8 then raise exception 'INVALID_PHOTOS'; end if;
  select * into v_draft from public.listing_drafts where id=p_draft_id and owner_id=v_actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || v_draft.publication_request_id::text,0));
  if v_draft.state<>'open' then raise exception 'DRAFT_CLOSED'; end if;
  if v_draft.revision<>p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if v_draft.publication_started_at is not null
    or exists(select 1 from public.listing_publication_requests r where r.actor_id=v_actor and r.request_key=v_draft.publication_request_id)
    or exists(select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.owner_id=v_actor::text and o.name like v_draft.publication_request_id::text || '/%') then raise exception 'PUBLICATION_IN_PROGRESS'; end if;
  for v_photo in select value from jsonb_array_elements(p_photos) loop
    if jsonb_typeof(v_photo)<>'object' or not (v_photo ?& array['kind','objectPath'])
      or (v_photo - 'kind' - 'objectPath')<>'{}'::jsonb
      or jsonb_typeof(v_photo->'kind')<>'string' or jsonb_typeof(v_photo->'objectPath')<>'string' then raise exception 'INVALID_PHOTOS'; end if;
    v_path := v_photo->>'objectPath'; v_kind := v_photo->>'kind';
    if v_path=any(v_seen) then raise exception 'INVALID_PHOTOS'; end if;
    v_seen := array_append(v_seen,v_path);
    if v_kind='draft' then
      if v_path not like v_actor::text || '/' || v_draft.id::text || '/%' or not listing_draft_private.listing_draft_media_access(v_path,'insert') then raise exception 'PHOTO_UNAVAILABLE'; end if;
      select o.id into v_object from storage.objects o where o.bucket_id='listing-draft-media' and o.name=v_path and o.owner_id=v_actor::text for share;
    elsif v_kind='published' then
      if v_draft.source_listing_id is null or not exists(
        select 1 from public.apartments a where a.id=v_draft.source_listing_id and a.lister_id=v_actor
          and ('https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/' || v_path)=any(a.photos)
      ) then raise exception 'PHOTO_UNAVAILABLE'; end if;
      select o.id into v_object from storage.objects o where o.bucket_id='apartment-photos' and o.name=v_path and o.owner_id=v_actor::text for share;
    else raise exception 'INVALID_PHOTOS'; end if;
    if v_object is null then raise exception 'PHOTO_UNAVAILABLE'; end if;
  end loop;
  update public.listing_drafts set photos=p_photos,revision=revision+1,updated_at=now() where id=v_draft.id returning * into v_draft;
  return v_draft;
end $$;
revoke all on function public.set_listing_draft_photos(uuid,integer,jsonb) from public,anon;
grant execute on function public.set_listing_draft_photos(uuid,integer,jsonb) to authenticated;

commit;
