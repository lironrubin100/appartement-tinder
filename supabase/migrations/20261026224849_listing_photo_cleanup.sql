begin;

-- Historical provenance survives listing/draft removal. Object identity is not
-- an FK: Storage API removes metadata only after the external object operation.
create table listing_draft_private.photo_cleanup_jobs (
 object_id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 object_path text not null,
 source_listing_id uuid not null,
 source_revision integer not null,
 state text not null default 'pending' check(state in ('pending','reserved','completed')),
 attempts integer not null default 0 check(attempts>=0),
 last_error text check(last_error in ('STORAGE_RETRY','STATE_UNAVAILABLE')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,object_path)
);
alter table listing_draft_private.photo_cleanup_jobs enable row level security;
revoke all on listing_draft_private.photo_cleanup_jobs from public,anon,authenticated;
create index photo_cleanup_owner_pending on listing_draft_private.photo_cleanup_jobs(owner_id,state,created_at,object_id);

-- Coarse serialization is deliberately bounded to photo-reference mutations.
-- Try-locks avoid waiting while legacy writers already hold Storage FOR SHARE.
create function listing_draft_private.try_photo_cleanup_lock() returns boolean
language sql volatile security definer set search_path='' as $$
 select pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('shutaf:listing-photo-cleanup:v1',0));
$$;
revoke all on function listing_draft_private.try_photo_cleanup_lock() from public,anon,authenticated;

create function listing_draft_private.photo_is_referenced(p_path text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
begin
 -- A separate fresh statement after serialization, never an RLS-filtered scan.
 return exists(select 1 from public.apartments a where (prefix||p_path)=any(a.photos))
 or exists(select 1 from public.listing_drafts d cross join lateral jsonb_array_elements(d.photos) p
   where d.state='open' and p->>'kind'='published' and p->>'objectPath'=p_path)
 or exists(select 1 from public.listing_drafts d cross join lateral jsonb_array_elements(d.photos) with ordinality p(body,n)
   where d.state='open' and d.publication_started_at is not null and p.body->>'kind'='draft'
     and d.publication_request_id::text||'/'||p.n::text||'.jpg'=p_path)
 or exists(select 1 from listing_draft_private.edit_attempts e cross join lateral jsonb_array_elements(e.model->'photos') p
   where e.cancelled_at is null and p->>'objectPath'=p_path and not exists(
     select 1 from public.listing_edit_requests r where r.actor_id=e.owner_id and r.request_key=e.request_key));
end $$;
revoke all on function listing_draft_private.photo_is_referenced(text) from public,anon,authenticated;

create function listing_draft_private.guard_photo_paths(p_paths text[],p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 if not listing_draft_private.try_photo_cleanup_lock() then raise exception 'INVALID_PHOTOS'; end if;
 foreach path in array coalesce(p_paths,'{}'::text[]) loop
  if exists(select 1 from listing_draft_private.photo_cleanup_jobs j where j.object_path=path and j.state in ('reserved','completed'))
    or not exists(select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.name=path
      and (p_owner is null or o.owner_id=p_owner::text)) then raise exception 'INVALID_PHOTOS'; end if;
 end loop;
end $$;
revoke all on function listing_draft_private.guard_photo_paths(text[],uuid) from public,anon,authenticated;

create function listing_draft_private.guard_photo_references() returns trigger
language plpgsql security definer set search_path='' as $$
declare paths text[]:='{}'; previous text[]:='{}'; actor uuid;
 prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
begin
 -- Serialize before choosing paths using metadata/reservations. A pre-lock
 -- filtered path set could omit a tombstone committed by a concurrent cleanup.
 if not listing_draft_private.try_photo_cleanup_lock() then raise exception 'INVALID_PHOTOS'; end if;
 if tg_table_name='apartments' then
  actor:=new.lister_id;
  if tg_op='UPDATE' then
   select coalesce(array_agg(substr(u,length(prefix)+1)),'{}') into previous from unnest(old.photos) u where starts_with(u,prefix);
  end if;
  select coalesce(array_agg(substr(u,length(prefix)+1)),'{}') into paths from unnest(new.photos) u
    where starts_with(u,prefix) and not substr(u,length(prefix)+1)=any(previous);
 elsif tg_table_name='listing_drafts' then
  actor:=new.owner_id;
  if new.state='open' then
   select coalesce(array_agg(p->>'objectPath'),'{}') into paths from jsonb_array_elements(new.photos) p where p->>'kind'='published';
   if new.publication_started_at is not null then
    paths:=paths||array(select new.publication_request_id::text||'/'||n::text||'.jpg'
      from jsonb_array_elements(new.photos) with ordinality p(body,n) where body->>'kind'='draft'
      -- Staging follows freeze, so generated paths need tombstone protection but
      -- their bytes are not required to exist yet.
      and exists(select 1 from listing_draft_private.photo_cleanup_jobs j where j.object_path=new.publication_request_id::text||'/'||n::text||'.jpg' and j.state in ('reserved','completed')));
   end if;
  end if;
 elsif tg_table_name='edit_attempts' then
  actor:=new.owner_id;
  -- Draft uploads have not been staged yet. Existing published inputs are
  -- guarded by the open draft; generated paths must still respect tombstones.
  select coalesce(array_agg(p->>'objectPath'),'{}') into paths from jsonb_array_elements(new.model->'photos') p
   where exists(select 1 from storage.objects o where o.bucket_id='apartment-photos' and o.name=p->>'objectPath')
    or exists(select 1 from listing_draft_private.photo_cleanup_jobs j where j.object_path=p->>'objectPath' and j.state in ('reserved','completed'));
 end if;
 perform listing_draft_private.guard_photo_paths(paths,actor);
 return new;
end $$;
revoke all on function listing_draft_private.guard_photo_references() from public,anon,authenticated;
create trigger photo_cleanup_apartment_refs before insert or update of photos on public.apartments
 for each row execute function listing_draft_private.guard_photo_references();
create trigger photo_cleanup_draft_refs before insert or update of photos,state,publication_started_at on public.listing_drafts
 for each row execute function listing_draft_private.guard_photo_references();
create trigger photo_cleanup_attempt_refs before insert on listing_draft_private.edit_attempts
 for each row execute function listing_draft_private.guard_photo_references();

create function listing_draft_private.queue_removed_listing_photos() returns trigger
language plpgsql security definer set search_path='' as $$
declare prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
begin
 if old.source='user' and old.lister_id is not null and auth.uid()=old.lister_id and old.photos is distinct from new.photos then
  -- The BEFORE guard has already acquired serialization for this transaction.
  insert into listing_draft_private.photo_cleanup_jobs(object_id,owner_id,object_path,source_listing_id,source_revision)
   select distinct o.id,old.lister_id,o.name,old.id,new.revision from unnest(old.photos) u
   join storage.objects o on o.bucket_id='apartment-photos' and o.owner_id=old.lister_id::text and u=prefix||o.name
   where not u=any(coalesce(new.photos,'{}'::text[])) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function listing_draft_private.queue_removed_listing_photos() from public,anon,authenticated;
create trigger photo_cleanup_removed_refs after update of photos on public.apartments
 for each row execute function listing_draft_private.queue_removed_listing_photos();

create function listing_draft_private.photo_cleanup_storage_delete(p_id uuid,p_bucket text,p_name text,p_owner text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
begin
 if p_bucket<>'apartment-photos' then return true; end if;
 if auth.uid() is null or p_owner is distinct from auth.uid()::text then return false; end if;
 if not listing_draft_private.try_photo_cleanup_lock() then return false; end if;
 if listing_draft_private.photo_is_referenced(p_name) then return false; end if;
 return not exists(select 1 from listing_draft_private.photo_cleanup_jobs j where j.object_path=p_name
   and (j.object_id<>p_id or j.owner_id<>auth.uid() or j.state<>'reserved'));
end $$;
create function listing_draft_private.photo_cleanup_storage_write(p_bucket text,p_name text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
begin
 if p_bucket<>'apartment-photos' then return true; end if;
 if not listing_draft_private.try_photo_cleanup_lock() then return false; end if;
 -- Immutable names remain tombstoned after removal: delayed Storage retries
 -- must never remove replacement bytes uploaded under the old name.
 return not exists(select 1 from listing_draft_private.photo_cleanup_jobs j where j.object_path=p_name and j.state in ('reserved','completed'));
end $$;
revoke all on function listing_draft_private.photo_cleanup_storage_delete(uuid,text,text,text),
 listing_draft_private.photo_cleanup_storage_write(text,text) from public,anon;
grant usage on schema listing_draft_private to authenticated;
grant execute on function listing_draft_private.photo_cleanup_storage_delete(uuid,text,text,text),
 listing_draft_private.photo_cleanup_storage_write(text,text) to authenticated;
create policy photo_cleanup_delete_guard on storage.objects as restrictive for delete to authenticated
 using(listing_draft_private.photo_cleanup_storage_delete(id,bucket_id,name,owner_id));
create policy photo_cleanup_insert_guard on storage.objects as restrictive for insert to authenticated
 with check(listing_draft_private.photo_cleanup_storage_write(bucket_id,name));
create policy photo_cleanup_update_guard on storage.objects as restrictive for update to authenticated
 using(listing_draft_private.photo_cleanup_storage_write(bucket_id,name))
 with check(listing_draft_private.photo_cleanup_storage_write(bucket_id,name));

create function public.reserve_listing_photo_cleanup(p_limit integer default 8) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); job listing_draft_private.photo_cleanup_jobs; items jsonb:='[]'; selected uuid[]:='{}';
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_limit is null or p_limit not between 1 and 8 then raise exception 'INVALID_INPUT'; end if;
 if not listing_draft_private.try_photo_cleanup_lock() then raise exception 'CLEANUP_BUSY'; end if;
 for job in select j.* from listing_draft_private.photo_cleanup_jobs j where j.owner_id=actor and j.state<>'completed'
  and not listing_draft_private.photo_is_referenced(j.object_path)
  order by j.created_at,j.object_id limit p_limit for update of j loop
  if not exists(select 1 from storage.objects o where o.id=job.object_id) then
   update listing_draft_private.photo_cleanup_jobs set state='completed',last_error=null,updated_at=now() where object_id=job.object_id;
  elsif not exists(select 1 from storage.objects o where o.id=job.object_id and o.bucket_id='apartment-photos' and o.name=job.object_path and o.owner_id=actor::text) then
   update listing_draft_private.photo_cleanup_jobs set last_error='STATE_UNAVAILABLE',updated_at=now() where object_id=job.object_id;
  else
   update listing_draft_private.photo_cleanup_jobs set state='reserved',attempts=attempts+1,last_error=null,updated_at=now() where object_id=job.object_id;
   items:=items||jsonb_build_array(jsonb_build_object('objectId',job.object_id,'objectPath',job.object_path));
   selected:=array_append(selected,job.object_id);
  end if;
 end loop;
 return jsonb_build_object('projectionVersion',1,'items',items,'hasMore',exists(
  select 1 from listing_draft_private.photo_cleanup_jobs j where j.owner_id=actor and j.state<>'completed' and not j.object_id=any(selected)));
end $$;

create function public.finish_listing_photo_cleanup(p_object_id uuid,p_error_code text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); job listing_draft_private.photo_cleanup_jobs;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_object_id is null or p_error_code is not null and p_error_code<>'STORAGE_RETRY' then raise exception 'INVALID_INPUT'; end if;
 if not listing_draft_private.try_photo_cleanup_lock() then raise exception 'CLEANUP_BUSY'; end if;
 select * into job from listing_draft_private.photo_cleanup_jobs where object_id=p_object_id and owner_id=actor for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if job.state='completed' then return jsonb_build_object('completed',true); end if;
 if job.state<>'reserved' then raise exception 'STATE_UNAVAILABLE'; end if;
 if p_error_code is not null or exists(select 1 from storage.objects where id=job.object_id) then
  update listing_draft_private.photo_cleanup_jobs set last_error='STORAGE_RETRY',updated_at=now() where object_id=job.object_id;
  return jsonb_build_object('completed',false);
 end if;
 update listing_draft_private.photo_cleanup_jobs set state='completed',last_error=null,updated_at=now() where object_id=job.object_id;
 return jsonb_build_object('completed',true);
end $$;
revoke all on function public.reserve_listing_photo_cleanup(integer),public.finish_listing_photo_cleanup(uuid,text) from public,anon;
grant execute on function public.reserve_listing_photo_cleanup(integer),public.finish_listing_photo_cleanup(uuid,text) to authenticated;

commit;
