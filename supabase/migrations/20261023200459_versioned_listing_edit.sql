begin;

-- Only guarded owner mutations may change the room model. Legacy publication
-- already uses SECURITY DEFINER; owner SELECT and status actions stay available.
revoke all on public.apartment_rooms from public,anon,authenticated;
revoke insert(id,apartment_id,label,monthly_price,available_from,is_available,created_at),
 update(id,apartment_id,label,monthly_price,available_from,is_available,created_at),
 references(id,apartment_id,label,monthly_price,available_from,is_available,created_at)
 on public.apartment_rooms from public,anon,authenticated;
grant select on public.apartment_rooms to authenticated;

create table public.listing_edit_requests(
 actor_id uuid not null references public.profiles(id) on delete cascade,
 request_key uuid not null,
 listing_id uuid not null references public.apartments(id) on delete cascade,
 payload_hash bytea not null check(octet_length(payload_hash)=32),
 previous_revision integer not null check(previous_revision>=0),
 revision integer not null check(revision=previous_revision+1),
 created_at timestamptz not null default now(),
 primary key(actor_id,request_key)
);
create index listing_edit_requests_listing on public.listing_edit_requests(listing_id);
alter table public.listing_edit_requests enable row level security;
revoke all on public.listing_edit_requests from public,anon,authenticated;
grant select on public.listing_edit_requests to authenticated;
create policy listing_edit_requests_owner_read on public.listing_edit_requests for select to authenticated
 using(actor_id=(select auth.uid()));

-- A genuine legacy mark-rented/pause change invalidates an already-open editor.
-- Derived price refreshes deliberately do not bump revision. Future inventory
-- RPCs must also lock the parent and advance revision once for their mutation.
create function public.bump_listing_status_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.status is distinct from old.status then
  if old.revision=2147483647 then raise exception 'STATE_UNAVAILABLE';end if;
  new.revision:=old.revision+1;
 end if;
 return new;
end $$;
revoke all on function public.bump_listing_status_revision() from public,anon,authenticated;
create trigger listing_status_revision before update of status on public.apartments
 for each row execute function public.bump_listing_status_revision();

create function public.update_owned_listing(p_listing_id uuid,p_expected_revision integer,p_request_key uuid,p_model jsonb)
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
 where a.id=p_listing_id and a.lister_id=v_actor and a.source='user' for update;
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
