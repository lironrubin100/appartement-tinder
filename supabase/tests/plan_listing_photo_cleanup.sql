-- Disposable Postgres/RLS tests. Metadata deletes here simulate Storage's SQL
-- authorization step only; hosted acceptance must use the actual Storage API.
begin;
do $test$
declare
 actor constant uuid:='00000000-0000-4000-8000-000000000025';
 outsider constant uuid:='00000000-0000-4000-8000-000000000024';
 listing constant uuid:='47000000-0000-4000-8000-000000000001';
 shared constant uuid:='47000000-0000-4000-8000-000000000002';
 request constant uuid:='47000000-0000-4000-8000-000000000003';
 snapshot_key constant uuid:='47000000-0000-4000-8000-000000000004';
 prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
 paths text[]; old_ids uuid[]:='{}'; object uuid; i integer; d public.listing_drafts; frozen public.listing_drafts;
 model jsonb; reservation jsonb; result jsonb; denied boolean; affected integer;
begin
 for i in 1..4 loop
  object:=gen_random_uuid();old_ids:=array_append(old_ids,object);
  insert into storage.objects(id,bucket_id,name,owner_id) values(object,'apartment-photos',listing::text||'/'||i||'.jpg',actor::text);
 end loop;
 for i in 1..3 loop
  insert into storage.objects(id,bucket_id,name,owner_id) values(gen_random_uuid(),'apartment-photos',request::text||'/'||i||'.jpg',actor::text);
 end loop;
 paths:=array(select prefix||listing::text||'/'||n||'.jpg' from generate_series(1,4)g(n));
 insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,available_from,photos)
 values(listing,actor,'user','Cleanup fixture','No real address',31.25,34.79,2000,1,'2026-12-01',paths),
 (shared,actor,'user','Shared image fixture','No real address',31.25,34.79,2000,1,'2026-12-01',paths[1:1]);
 insert into public.apartment_rooms(id,apartment_id,monthly_price,available_from,is_available)
 values('47000000-0000-4000-8000-000000000011',listing,2000,'2026-12-01',true);

 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 d:=public.create_listing_draft(gen_random_uuid(),listing,0);
 d:=public.set_listing_draft_photos(d.id,d.revision,jsonb_build_array(jsonb_build_object('kind','published','objectPath',listing::text||'/2.jpg')));
 frozen:=public.create_listing_draft(gen_random_uuid());
 execute 'reset role';
 -- Explicit local frozen-new-publication fixture: staged request/index paths
 -- are live even when its persisted photos still point at private uploads.
 update public.listing_drafts set publication_request_id=listing,publication_started_at=now(),
  photos=jsonb_build_array(jsonb_build_object('kind','draft','objectPath',actor::text||'/'||frozen.id::text||'/'||gen_random_uuid()::text||'.jpg')) where id=frozen.id;
 model:=public.get_owned_listing_editor(listing)-array['id','ownerId','revision','status','location'];
 -- Explicit local unresolved edit snapshot, independent of a live draft row.
 insert into listing_draft_private.edit_attempts(owner_id,request_key,draft_id,draft_revision,listing_id,source_revision,model,photo_digests)
 values(actor,snapshot_key,null,0,listing,0,model||jsonb_build_object('photos',jsonb_build_array(
  jsonb_build_object('kind','published','objectPath',listing::text||'/3.jpg'),
  jsonb_build_object('kind','published','objectPath',snapshot_key::text||'/2.jpg'),
  jsonb_build_object('kind','published','objectPath',snapshot_key::text||'/3.jpg'))),'[]');
 execute 'set local role authenticated';
 model:=model||jsonb_build_object('photos',(select jsonb_agg(jsonb_build_object('kind','published','objectPath',request::text||'/'||n||'.jpg')) from generate_series(1,3)g(n)));
 result:=public.update_owned_listing(listing,0,request,model);
 if result->>'revision'<>'1' then raise exception 'edit did not commit';end if;
 execute 'reset role';
 if (select count(*) from listing_draft_private.photo_cleanup_jobs where source_listing_id=listing)<>4 then raise exception 'removed set not durably captured';end if;
 if (select count(*) from listing_draft_private.photo_cleanup_jobs where source_listing_id=listing and state='pending' and source_revision=1)<>4 then raise exception 'wrong cleanup provenance';end if;
 execute 'set local role authenticated';
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>1 or reservation#>>'{items,0,objectId}'<>old_ids[4]::text or reservation->>'hasMore'<>'true' then
  raise exception 'shared/draft/snapshot references were not preserved: %',reservation;end if;
 result:=public.finish_listing_photo_cleanup(old_ids[4],'STORAGE_RETRY');
 if result->>'completed'<>'false' then raise exception 'failed removal reported completed';end if;
 result:=public.finish_listing_photo_cleanup(old_ids[4],null);
 if result->>'completed'<>'false' then raise exception 'existing object acknowledged absent';end if;
 reservation:=public.reserve_listing_photo_cleanup(8);
 if reservation#>>'{items,0,objectId}'<>old_ids[4]::text then raise exception 'retry lost reservation';end if;
 -- All referenced rows stay protected even through direct authenticated DELETE.
 delete from storage.objects where id=any(old_ids[1:3]);get diagnostics affected=row_count;
 if affected<>0 then raise exception 'referenced image deletion permitted';end if;
 execute 'reset role';
 denied:=false;begin update public.apartments set photos=photos||paths[4:4] where id=listing;
 exception when others then if sqlerrm<>'INVALID_PHOTOS' then raise;end if;denied:=true;end;
 if not denied then raise exception 'reservation permitted reattachment';end if;
 perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>0 then raise exception 'foreign reservation leaked';end if;
 denied:=false;begin perform public.finish_listing_photo_cleanup(old_ids[4],null);
 exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;denied:=true;end;
 if not denied then raise exception 'foreign cleanup acknowledged';end if;
 delete from storage.objects where id=old_ids[4];get diagnostics affected=row_count;
 if affected<>0 then raise exception 'foreign object removed';end if;
 execute 'reset role';execute 'set local role anon';
 denied:=false;begin perform public.reserve_listing_photo_cleanup(8);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous cleanup allowed';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 delete from storage.objects where id=old_ids[4];get diagnostics affected=row_count;
 if affected<>1 then raise exception 'reserved unreferenced object not removable';end if;
 -- Lost Storage acknowledgement: next reserve proves absence and completes it.
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>0 then raise exception 'missing object retried for removal';end if;
 result:=public.finish_listing_photo_cleanup(old_ids[4],null);
 if result->>'completed'<>'true' then raise exception 'lost response not reconciled';end if;
 denied:=false;begin insert into storage.objects(id,bucket_id,name,owner_id)
 values(gen_random_uuid(),'apartment-photos',listing::text||'/4.jpg',actor::text);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'immutable removed path reused';end if;

 execute 'reset role';delete from public.apartments where id=shared;
 execute 'set local role authenticated';
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>0 then raise exception 'frozen generated path not preserved';end if;
 execute 'reset role';update public.listing_drafts set state='completed' where id=frozen.id;
 execute 'set local role authenticated';
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>1 or reservation#>>'{items,0,objectId}'<>old_ids[1]::text then raise exception 'completed draft treated as live';end if;
 delete from storage.objects where id=old_ids[1];perform public.finish_listing_photo_cleanup(old_ids[1],null);
 d:=public.set_listing_draft_photos(d.id,d.revision,'[]');
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>1 or reservation#>>'{items,0,objectId}'<>old_ids[2]::text then raise exception 'removed draft reference not released';end if;
 delete from storage.objects where id=old_ids[2];perform public.finish_listing_photo_cleanup(old_ids[2],null);
 execute 'reset role';update listing_draft_private.edit_attempts set cancelled_at=now() where owner_id=actor and request_key=snapshot_key;
 execute 'set local role authenticated';
 reservation:=public.reserve_listing_photo_cleanup(8);
 if jsonb_array_length(reservation->'items')<>1 or reservation#>>'{items,0,objectId}'<>old_ids[3]::text then raise exception 'cancelled snapshot not released';end if;
 delete from storage.objects where id=old_ids[3];perform public.finish_listing_photo_cleanup(old_ids[3],null);
 reservation:=public.reserve_listing_photo_cleanup(8);
 if reservation->>'hasMore'<>'false' or jsonb_array_length(reservation->'items')<>0 then raise exception 'finished queue not drained';end if;
 denied:=false;begin perform public.reserve_listing_photo_cleanup(9);exception when others then if sqlerrm<>'INVALID_INPUT' then raise;end if;denied:=true;end;
 if not denied then raise exception 'unbounded cleanup allowed';end if;
 denied:=false;begin perform 1 from listing_draft_private.photo_cleanup_jobs;exception when insufficient_privilege then denied:=true;end;
 if not denied or has_function_privilege('authenticated','listing_draft_private.photo_is_referenced(text)','execute') then raise exception 'private cleanup data exposed';end if;
 execute 'reset role';
 if (select revision from public.apartments where id=listing)<>1 or (select count(*) from public.listing_edit_requests where actor_id=actor and request_key=request)<>1
  or (select count(*) from listing_draft_private.photo_cleanup_jobs where source_listing_id=listing and state='completed')<>4 then raise exception 'cleanup changed successful edit or lost receipts';end if;
end $test$;
rollback;
