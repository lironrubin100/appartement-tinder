begin;

-- Immutable attempts are private implementation records, not caller-written
-- completion receipts. The public writer remains the only public edit engine.
create table listing_draft_private.edit_attempts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  draft_id uuid references public.listing_drafts(id) on delete set null,
  draft_revision integer not null,
  listing_id uuid not null references public.apartments(id) on delete cascade,
  source_revision integer not null,
  model jsonb not null,
  photo_digests jsonb not null,
  cancelled_at timestamptz,
  primary key(owner_id,request_key)
);
alter table listing_draft_private.edit_attempts enable row level security;
create index edit_attempts_draft on listing_draft_private.edit_attempts(draft_id);
create index edit_attempts_listing on listing_draft_private.edit_attempts(listing_id);
revoke all on listing_draft_private.edit_attempts from public,anon,authenticated;

create function listing_draft_private.edit_model(d public.listing_drafts)
returns jsonb language plpgsql immutable set search_path='' as $$
declare f jsonb:=d.fields; r jsonb; rooms jsonb:='[]'; photos jsonb:='[]';
  p jsonb; n integer:=0; price numeric; beds numeric; day date;
begin
  if d.source_listing_id is null or f ? 'address' or f ? 'roomPrices'
    or not f ?& array['title','bedrooms','availableFrom','billsIncluded','isSublet','description','rooms']
    or jsonb_typeof(f->'rooms') is distinct from 'array'
    or jsonb_typeof(f->'billsIncluded') is distinct from 'boolean'
    or jsonb_typeof(f->'isSublet') is distinct from 'boolean'
    or char_length(btrim(f->>'title')) not between 1 and 100
    or char_length(f->>'description')>2000 then raise exception 'VALIDATION_FAILED'; end if;
  beds:=(f->>'bedrooms')::numeric;
  if beds not between 1 and 20 or trunc(beds)<>beds or jsonb_array_length(f->'rooms')>beds
    or jsonb_array_length(d.photos) not between 3 and 8 then raise exception 'VALIDATION_FAILED'; end if;
  if f->>'availableFrom' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(f->>'availableFrom',4)='0000' then raise exception 'VALIDATION_FAILED'; end if;
  day:=(f->>'availableFrom')::date;
  for r in select value from jsonb_array_elements(f->'rooms') loop
    price:=(r->>'monthlyPrice')::numeric;
    if price not between 1 and 2147483647 or trunc(price)<>price
      or r->>'availableFrom' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(r->>'availableFrom',4)='0000'
      or char_length(coalesce(r->>'label',''))>80 then raise exception 'VALIDATION_FAILED'; end if;
    day:=(r->>'availableFrom')::date;
    rooms:=rooms || jsonb_build_array(jsonb_build_object('id',r->>'id','label',r->'label',
      'monthlyPrice',price::integer,'availableFrom',r->>'availableFrom','isAvailable',r->'isAvailable'));
  end loop;
  for p in select value from jsonb_array_elements(d.photos) loop
    n:=n+1;
    photos:=photos || jsonb_build_array(jsonb_build_object('kind','published','objectPath',
      case when p->>'kind'='draft' then d.publication_request_id::text || '/' || n || '.jpg' else p->>'objectPath' end));
  end loop;
  return jsonb_build_object('title',f->>'title','bedrooms',beds::integer,'billsIncluded',f->'billsIncluded',
    'isSublet',f->'isSublet','availableFrom',f->>'availableFrom','description',f->>'description','rooms',rooms,'photos',photos);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then
  raise exception 'VALIDATION_FAILED';
end $$;
revoke all on function listing_draft_private.edit_model(public.listing_drafts) from public,anon,authenticated;

create function public.begin_listing_draft_edit(p_draft_id uuid,p_expected_revision integer,p_photo_digests jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); d public.listing_drafts; a public.apartments; model jsonb;
  attempt listing_draft_private.edit_attempts; photo jsonb; path text; bucket text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  -- Parent before child, compatible with legacy draft foreign-key key-share.
  select * into a from public.apartments where id=d.source_listing_id and lister_id=actor and source='user' for no key update;
  if not found then raise exception 'SOURCE_UNAVAILABLE'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if d.revision is distinct from p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if d.state<>'open' then raise exception 'DRAFT_CLOSED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || d.publication_request_id::text,0));
  model:=listing_draft_private.edit_model(d);
  if jsonb_typeof(p_photo_digests) is distinct from 'array' or jsonb_array_length(p_photo_digests)<>jsonb_array_length(d.photos)
    or exists(select 1 from jsonb_array_elements(p_photo_digests) x where jsonb_typeof(x)<>'string' or x#>>'{}' !~ '^[0-9a-f]{64}$') then raise exception 'INVALID_PHOTOS'; end if;
  select * into attempt from listing_draft_private.edit_attempts where owner_id=actor and request_key=d.publication_request_id;
  if found then
    if attempt.draft_id is distinct from d.id or attempt.draft_revision<>d.revision or attempt.model<>model
      or attempt.photo_digests<>p_photo_digests or attempt.cancelled_at is not null or d.publication_started_at is null then raise exception 'PUBLICATION_SNAPSHOT_CONFLICT'; end if;
    return jsonb_build_object('draft',to_jsonb(d),'model',attempt.model);
  end if;
  if d.publication_started_at is not null then raise exception 'DRAFT_UNAVAILABLE'; end if;
  if a.revision<>d.source_revision then raise exception 'VERSION_CONFLICT'; end if;
  if exists(select 1 from public.listing_edit_requests where actor_id=actor and request_key=d.publication_request_id)
    or exists(select 1 from public.listing_publication_requests where actor_id=actor and request_key=d.publication_request_id)
    or exists(select 1 from storage.objects where bucket_id='apartment-photos' and name like d.publication_request_id::text || '/%') then raise exception 'PUBLICATION_SNAPSHOT_UNKNOWN'; end if;
  if (select count(*) from public.apartment_rooms where apartment_id=a.id)<>jsonb_array_length(model->'rooms')
    or exists(select 1 from jsonb_array_elements(model->'rooms') r where not exists(select 1 from public.apartment_rooms old
      where old.apartment_id=a.id and old.id=(r->>'id')::uuid and old.is_available=(r->>'isAvailable')::boolean)) then raise exception 'ROOM_INVENTORY_CHANGED'; end if;
  for photo in select value from jsonb_array_elements(d.photos) loop
    path:=photo->>'objectPath'; bucket:=case when photo->>'kind'='draft' then 'listing-draft-media' else 'apartment-photos' end;
    if photo->>'kind'='draft' then
      if path !~ ('^' || actor::text || '/' || d.id::text || '/[0-9a-f-]{36}\.jpg$') then raise exception 'INVALID_PHOTOS'; end if;
    elsif photo->>'kind'<>'published' or not ('https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/' || path)=any(a.photos) then raise exception 'INVALID_PHOTOS'; end if;
    perform 1 from storage.objects where bucket_id=bucket and name=path and owner_id=actor::text for share;
    if not found then raise exception 'INVALID_PHOTOS'; end if;
  end loop;
  insert into listing_draft_private.edit_attempts(owner_id,request_key,draft_id,draft_revision,listing_id,source_revision,model,photo_digests)
    values(actor,d.publication_request_id,d.id,d.revision,d.source_listing_id,d.source_revision,model,p_photo_digests);
  update public.listing_drafts set publication_started_at=now(),publication_payload_hash=pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(model,p_photo_digests)::text,'UTF8')),updated_at=now()
    where id=d.id returning * into d;
  return jsonb_build_object('draft',to_jsonb(d),'model',model);
end $$;

create function public.commit_listing_draft_edit(p_draft_id uuid,p_expected_revision integer,p_reconcile_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); d public.listing_drafts; attempt listing_draft_private.edit_attempts; receipt jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform 1 from public.apartments where id=d.source_listing_id and lister_id=actor and source='user' for no key update;
  if not found then raise exception 'SOURCE_UNAVAILABLE'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if d.revision is distinct from p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if d.state not in ('open','completed') or d.publication_started_at is null then raise exception 'PUBLICATION_NOT_STARTED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || d.publication_request_id::text,0));
  select * into attempt from listing_draft_private.edit_attempts where owner_id=actor and request_key=d.publication_request_id;
  if not found or attempt.cancelled_at is not null or attempt.draft_id is distinct from d.id or attempt.draft_revision<>d.revision
    or attempt.listing_id<>d.source_listing_id or attempt.source_revision<>d.source_revision
    or attempt.model<>listing_draft_private.edit_model(d)
    or d.publication_payload_hash is distinct from pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(attempt.model,attempt.photo_digests)::text,'UTF8')) then raise exception 'PUBLICATION_SNAPSHOT_CONFLICT'; end if;
  if p_reconcile_only is not false or d.state='completed' then
    if not exists(select 1 from public.listing_edit_requests where actor_id=actor and request_key=d.publication_request_id and listing_id=d.source_listing_id)
      then raise exception 'EDIT_PENDING'; end if;
  end if;
  -- Exact normalized receipt replay is checked by4.2 before source CAS. Public
  -- mutation, receipt and private completion commit or roll back together.
  receipt:=public.update_owned_listing(attempt.listing_id,attempt.source_revision,d.publication_request_id,attempt.model);
  if d.state='open' then update public.listing_drafts set state='completed',updated_at=now() where id=d.id returning * into d; end if;
  return jsonb_build_object('draft',to_jsonb(d),'receipt',receipt);
end $$;

create function public.cancel_listing_draft_edit(p_draft_id uuid,p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); d public.listing_drafts; result text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform 1 from public.apartments where id=d.source_listing_id and lister_id=actor for no key update;
  if not found then raise exception 'SOURCE_UNAVAILABLE'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if d.revision is distinct from p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || d.publication_request_id::text,0));
  if exists(select 1 from public.listing_edit_requests where actor_id=actor and request_key=d.publication_request_id) then raise exception 'PUBLICATION_ALREADY_COMMITTED'; end if;
  if d.state<>'open' or d.publication_started_at is null then raise exception 'PUBLICATION_NOT_STARTED'; end if;
  result:=public.cancel_listing_publication(d.publication_request_id);
  if result<>'cancelled' then raise exception 'PUBLICATION_ALREADY_COMMITTED'; end if;
  update listing_draft_private.edit_attempts set cancelled_at=now() where owner_id=actor and request_key=d.publication_request_id;
  insert into public.listing_draft_cancelled_attempts(owner_id,draft_id,request_key) values(actor,d.id,d.publication_request_id) on conflict do nothing;
  update public.listing_drafts set publication_request_id=gen_random_uuid(),publication_started_at=null,publication_payload_hash=null,
    revision=revision+1,updated_at=now() where id=d.id returning * into d;
  return d;
end $$;

-- Explicitly discards the selected private edits only after caller confirmation.
-- It is not part of autosave, page load, conflict detection or cancellation.
create function public.refresh_listing_edit_draft(p_draft_id uuid,p_expected_revision integer)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); d public.listing_drafts; model jsonb; rooms jsonb; v_fields jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  perform 1 from public.apartments where id=d.source_listing_id and lister_id=actor and source='user' for no key update;
  if not found then raise exception 'SOURCE_UNAVAILABLE'; end if;
  select * into d from public.listing_drafts where id=p_draft_id and owner_id=actor for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if d.revision is distinct from p_expected_revision then raise exception 'DRAFT_CONFLICT'; end if;
  if d.state<>'open' or d.publication_started_at is not null then raise exception 'DRAFT_UNAVAILABLE'; end if;
  model:=public.get_owned_listing_editor(d.source_listing_id);
  select coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','label',r->'label','monthlyPrice',r->>'monthlyPrice',
    'availableFrom',r->>'availableFrom','isAvailable',r->'isAvailable') order by position),'[]'::jsonb) into rooms
    from jsonb_array_elements(model->'rooms') with ordinality item(r,position);
  v_fields:=jsonb_build_object('title',model->>'title','bedrooms',model->>'bedrooms','availableFrom',coalesce(model->>'availableFrom',''),
    'billsIncluded',model->'billsIncluded','isSublet',model->'isSublet','description',coalesce(model->>'description',''),'rooms',rooms);
  update public.listing_drafts set fields=v_fields,source_revision=(model->>'revision')::integer,revision=revision+1,updated_at=now() where id=d.id returning * into d;
  return public.set_listing_draft_photos(d.id,d.revision,model->'photos');
end $$;

revoke all on function public.begin_listing_draft_edit(uuid,integer,jsonb),public.commit_listing_draft_edit(uuid,integer,boolean),
  public.cancel_listing_draft_edit(uuid,integer),public.refresh_listing_edit_draft(uuid,integer) from public,anon;
grant execute on function public.begin_listing_draft_edit(uuid,integer,jsonb),public.commit_listing_draft_edit(uuid,integer,boolean),
  public.cancel_listing_draft_edit(uuid,integer),public.refresh_listing_edit_draft(uuid,integer) to authenticated;

-- Same4.2 writer, compatible parent row lock; no model or receipt rule changes.
create or replace function public.update_owned_listing(p_listing_id uuid,p_expected_revision integer,p_request_key uuid,p_model jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid(); v_listing public.apartments%rowtype;
 v_prior public.listing_edit_requests%rowtype; v_room jsonb; v_photo jsonb;
 v_rooms jsonb:='[]'; v_photos jsonb:='[]'; v_normalized jsonb; v_hash bytea;
 v_room_id uuid; v_room_ids uuid[]:='{}'; v_path text; v_paths text[]:='{}';
 v_urls text[]:='{}'; v_object uuid; v_title text; v_description text; v_label text;
 v_bedrooms integer; v_price integer; v_date date; v_date_text text;
 v_trim text:=E' \t\n\r\f' || chr(11) || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
 v_prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
begin
 if v_actor is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_listing from public.apartments a
 where a.id=p_listing_id and a.lister_id=v_actor and a.source='user' for no key update;
 if not found then raise exception 'NOT_FOUND';end if;
 if p_request_key is null or p_expected_revision is null or p_expected_revision<0
  or jsonb_typeof(p_model) is distinct from 'object' then raise exception 'VALIDATION_FAILED';end if;
 if not p_model ?& array['title','bedrooms','billsIncluded','isSublet','availableFrom','description','rooms','photos']
  or exists(select 1 from jsonb_object_keys(p_model) k where k<>all(array['title','bedrooms','billsIncluded','isSublet','availableFrom','description','rooms','photos']))
  or pg_column_size(p_model)>65536 then raise exception 'VALIDATION_FAILED';end if;
 if jsonb_typeof(p_model->'title') is distinct from 'string'
  or jsonb_typeof(p_model->'bedrooms') is distinct from 'number'
  or jsonb_typeof(p_model->'billsIncluded') is distinct from 'boolean'
  or jsonb_typeof(p_model->'isSublet') is distinct from 'boolean'
  or jsonb_typeof(p_model->'availableFrom') is distinct from 'string'
  or jsonb_typeof(p_model->'description') not in ('string','null')
  or jsonb_typeof(p_model->'rooms') is distinct from 'array'
  or jsonb_typeof(p_model->'photos') is distinct from 'array' then raise exception 'VALIDATION_FAILED';end if;
 v_title:=btrim(p_model->>'title',v_trim);
 v_description:=nullif(btrim(p_model->>'description',v_trim),'');
 if char_length(v_title) not between 1 and 100 or char_length(coalesce(p_model->>'description',''))>2000
  or (p_model->>'bedrooms')::numeric not between 1 and 20
  or trunc((p_model->>'bedrooms')::numeric)<>(p_model->>'bedrooms')::numeric then raise exception 'VALIDATION_FAILED';end if;
 v_bedrooms:=(p_model->>'bedrooms')::numeric::integer;
 if jsonb_array_length(p_model->'rooms')>v_bedrooms or jsonb_array_length(p_model->'photos') not between 3 and 8 then raise exception 'VALIDATION_FAILED';end if;
 v_date_text:=p_model->>'availableFrom';
 if v_date_text!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(v_date_text,4)='0000' then raise exception 'VALIDATION_FAILED';end if;
 begin v_date:=v_date_text::date;exception when invalid_datetime_format or datetime_field_overflow then raise exception 'VALIDATION_FAILED';end;

 for v_room in select value from jsonb_array_elements(p_model->'rooms') loop
  if jsonb_typeof(v_room) is distinct from 'object' then raise exception 'VALIDATION_FAILED';end if;
  if not v_room ?& array['id','label','monthlyPrice','availableFrom','isAvailable']
   or exists(select 1 from jsonb_object_keys(v_room) k where k<>all(array['id','label','monthlyPrice','availableFrom','isAvailable']))
   or jsonb_typeof(v_room->'id') is distinct from 'string'
   or (v_room->>'id')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or jsonb_typeof(v_room->'label') not in ('null','string')
   or jsonb_typeof(v_room->'monthlyPrice') is distinct from 'number'
   or jsonb_typeof(v_room->'availableFrom') is distinct from 'string'
   or jsonb_typeof(v_room->'isAvailable') is distinct from 'boolean' then raise exception 'VALIDATION_FAILED';end if;
  v_room_id:=(v_room->>'id')::uuid;
  if v_room_id=any(v_room_ids) or char_length(coalesce(v_room->>'label',''))>80
   or (v_room->>'monthlyPrice')::numeric not between 1 and 2147483647
   or trunc((v_room->>'monthlyPrice')::numeric)<>(v_room->>'monthlyPrice')::numeric then raise exception 'VALIDATION_FAILED';end if;
  v_price:=(v_room->>'monthlyPrice')::numeric::integer;
  v_label:=nullif(btrim(v_room->>'label',v_trim),'');
  v_date_text:=v_room->>'availableFrom';
  if v_date_text!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(v_date_text,4)='0000' then raise exception 'VALIDATION_FAILED';end if;
  begin v_date:=v_date_text::date;exception when invalid_datetime_format or datetime_field_overflow then raise exception 'VALIDATION_FAILED';end;
  v_room_ids:=array_append(v_room_ids,v_room_id);
  v_rooms:=v_rooms || jsonb_build_array(jsonb_build_object('id',v_room_id,'label',v_label,'monthlyPrice',v_price,'availableFrom',v_date,'isAvailable',(v_room->>'isAvailable')::boolean));
 end loop;
 -- Room order is not a persisted property; photo order is.
 select coalesce(jsonb_agg(value order by value->>'id'),'[]'::jsonb) into v_rooms from jsonb_array_elements(v_rooms);
 for v_photo in select value from jsonb_array_elements(p_model->'photos') loop
  if jsonb_typeof(v_photo) is distinct from 'object' then raise exception 'VALIDATION_FAILED';end if;
  if not v_photo ?& array['kind','objectPath']
   or exists(select 1 from jsonb_object_keys(v_photo) k where k<>all(array['kind','objectPath']))
   or v_photo->>'kind' is distinct from 'published' or jsonb_typeof(v_photo->'objectPath') is distinct from 'string' then raise exception 'VALIDATION_FAILED';end if;
  v_path:=v_photo->>'objectPath';
  if char_length(v_path)>384 or v_path!~'^([a-zA-Z0-9_-]+/)+[a-zA-Z0-9_.-]+$'
   or exists(select 1 from unnest(string_to_array(v_path,'/')) part where part in('.','..'))
   or v_path=any(v_paths) then raise exception 'VALIDATION_FAILED';end if;
  v_paths:=array_append(v_paths,v_path);v_urls:=array_append(v_urls,v_prefix || v_path);
  v_photos:=v_photos || jsonb_build_array(jsonb_build_object('kind','published','objectPath',v_path));
 end loop;
 v_normalized:=jsonb_build_object('title',v_title,'bedrooms',v_bedrooms,'billsIncluded',(p_model->>'billsIncluded')::boolean,
  'isSublet',(p_model->>'isSublet')::boolean,'availableFrom',(p_model->>'availableFrom')::date,'description',v_description,'rooms',v_rooms,'photos',v_photos);
 v_hash:=pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(p_listing_id,p_expected_revision,v_normalized)::text,'UTF8'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_request_key::text,0));
 select * into v_prior from public.listing_edit_requests where actor_id=v_actor and request_key=p_request_key;
 if found then
  if v_prior.listing_id<>p_listing_id or v_prior.payload_hash<>v_hash then raise exception 'VERSION_CONFLICT';end if;
  return jsonb_build_object('listingId',v_prior.listing_id,'revision',v_prior.revision,'requestKey',v_prior.request_key);
 end if;
 if v_listing.revision<>p_expected_revision then raise exception 'VERSION_CONFLICT' using detail=jsonb_build_object('revision',v_listing.revision)::text;end if;
 if v_listing.revision=2147483647 then raise exception 'STATE_UNAVAILABLE';end if;

 -- Availability, room creation/deletion and intake are dedicated D18 controls.
 perform r.id from public.apartment_rooms r where r.apartment_id=p_listing_id order by r.id for update;
 if (select count(*) from public.apartment_rooms r where r.apartment_id=p_listing_id)<>cardinality(v_room_ids)
  or exists(select 1 from jsonb_array_elements(v_rooms) r where not exists(select 1 from public.apartment_rooms old
   where old.apartment_id=p_listing_id and old.id=(r->>'id')::uuid and old.is_available=(r->>'isAvailable')::boolean)) then raise exception 'ROOM_INVENTORY_CHANGED';end if;
 for v_path in select unnest(v_paths) loop
  v_object:=null;
  select o.id into v_object from storage.objects o where o.bucket_id='apartment-photos' and o.name=v_path and o.owner_id=v_actor::text for share;
  if v_object is null then raise exception 'INVALID_PHOTOS';end if;
  if not (v_prefix || v_path)=any(v_listing.photos) then
   if v_path!~('^' || p_request_key::text || '/[1-8]\.jpg$')
    or exists(select 1 from public.listing_publication_requests q where q.actor_id=v_actor and q.request_key=p_request_key and q.cancelled)
    or exists(select 1 from public.apartments a where a.id<>p_listing_id and (v_prefix || v_path)=any(a.photos)) then raise exception 'INVALID_PHOTOS';end if;
  end if;
 end loop;
 for v_room in select value from jsonb_array_elements(v_rooms) loop
  update public.apartment_rooms set label=v_room->>'label',monthly_price=(v_room->>'monthlyPrice')::integer,available_from=(v_room->>'availableFrom')::date
   where id=(v_room->>'id')::uuid and apartment_id=p_listing_id;
 end loop;
 -- Location/public point, property identity, status, created/expiry and intake
 -- never appear in the UPDATE. Child triggers maintain only the derived price.
 update public.apartments set title=v_title,bedrooms=v_bedrooms,bills_included=(p_model->>'billsIncluded')::boolean,
  is_sublet=(p_model->>'isSublet')::boolean,available_from=(p_model->>'availableFrom')::date,description=v_description,
  photos=v_urls,revision=v_listing.revision+1 where id=p_listing_id;
 insert into public.listing_edit_requests(actor_id,request_key,listing_id,payload_hash,previous_revision,revision)
 values(v_actor,p_request_key,p_listing_id,v_hash,v_listing.revision,v_listing.revision+1);
 return jsonb_build_object('listingId',p_listing_id,'revision',v_listing.revision+1,'requestKey',p_request_key);
end $$;
revoke all on function public.update_owned_listing(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function public.update_owned_listing(uuid,integer,uuid,jsonb) to authenticated;
comment on function public.update_owned_listing(uuid,integer,uuid,jsonb) is
 'Atomic owner facts/room facts/ordered public photo references. Preserves identity/location/inventory/intake. New photos must be pre-staged under this request UUID; no Storage cleanup.';

commit;
