begin;

-- Build the private snapshot in one transaction. Reopening never refreshes an
-- existing draft from the public listing or overwrites its unsaved changes.
create function public.open_listing_edit_draft(p_listing_id uuid,p_request_key uuid)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_draft public.listing_drafts; v_model jsonb; v_fields jsonb; v_rooms jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_listing_id is null or p_request_key is null then raise exception 'INVALID_INPUT'; end if;
  -- Serializes with the atomic writer while allowing legacy draft FK key-share
  -- locks (receipt -> INSERT). Seed facts/rooms/source revision
  -- from one owned property version. Source identity is never caller supplied.
  perform 1 from public.apartments a where a.id=p_listing_id and a.lister_id=v_actor and a.source='user' for no key update;
  if not found then raise exception 'SOURCE_UNAVAILABLE'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('draft-receipt:' || v_actor::text || ':' || p_request_key::text,0));
  if exists(select 1 from listing_draft_private.deletion_jobs j where j.owner_id=v_actor and j.import_receipt_id=p_request_key) then raise exception 'DRAFT_UNAVAILABLE'; end if;
  select * into v_draft from public.listing_drafts where owner_id=v_actor and import_receipt_id=p_request_key;
  if found then
    if v_draft.source_listing_id is distinct from p_listing_id then raise exception 'IMPORT_CONFLICT'; end if;
    if v_draft.state<>'open' then raise exception 'DRAFT_CLOSED'; end if;
    return v_draft;
  end if;
  select * into v_draft from public.listing_drafts where owner_id=v_actor and source_listing_id=p_listing_id and state='open';
  if found then return v_draft; end if;

  v_model:=public.get_owned_listing_editor(p_listing_id);
  if v_model is null or length(v_model->>'title')>100 or length(coalesce(v_model->>'description',''))>2000
    or jsonb_array_length(v_model->'rooms')>20 or exists(
      select 1 from jsonb_array_elements(v_model->'rooms') r where length(r->>'label')>80
    ) then raise exception 'DRAFT_UNAVAILABLE'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r->>'id','label',r->'label','monthlyPrice',r->>'monthlyPrice',
    'availableFrom',r->>'availableFrom','isAvailable',r->'isAvailable'
  ) order by position),'[]'::jsonb) into v_rooms
  from jsonb_array_elements(v_model->'rooms') with ordinality item(r,position);
  -- Location stays on the readonly owner model, outside editable draft fields.
  v_fields:=jsonb_build_object('title',v_model->>'title','bedrooms',v_model->>'bedrooms',
    'availableFrom',coalesce(v_model->>'availableFrom',''),'billsIncluded',v_model->'billsIncluded',
    'isSublet',v_model->'isSublet','description',coalesce(v_model->>'description',''),'rooms',v_rooms);
  begin
    v_draft:=public.create_listing_draft(p_request_key,p_listing_id,(v_model->>'revision')::integer,v_fields);
  exception when unique_violation then
    -- An older create caller may race this initializer without the parent lock.
    -- The existing unique index wins; preserve that caller's private work.
    select * into v_draft from public.listing_drafts where owner_id=v_actor and source_listing_id=p_listing_id and state='open';
    if not found then raise; end if;
    return v_draft;
  end;
  -- Existing media RPC validates owned canonical associated objects and locks
  -- the bytes. A missing/foreign photo rolls back the new draft and receipt.
  return public.set_listing_draft_photos(v_draft.id,v_draft.revision,v_model->'photos');
end $$;
revoke all on function public.open_listing_edit_draft(uuid,uuid) from public,anon;
grant execute on function public.open_listing_edit_draft(uuid,uuid) to authenticated;
comment on function public.open_listing_edit_draft(uuid,uuid) is
  'Open or resume one private owner edit draft. Seeds stable rooms and published media atomically; never updates the public listing.';
commit;
