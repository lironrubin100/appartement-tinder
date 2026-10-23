do $test$
declare actor constant uuid:='00000000-0000-4000-8000-000000000001'; outsider constant uuid:='00000000-0000-4000-8000-000000000002';
  d public.listing_drafts; b public.listing_drafts; e public.listing_drafts; t jsonb; page jsonb; path text; path_b text; caught boolean; n integer; key uuid:=gen_random_uuid();
begin
  perform set_config('request.jwt.claim.sub',actor::text,true); execute 'set local role authenticated';
  d:=public.create_listing_draft(key); b:=public.create_listing_draft();
  path:=actor::text || '/' || d.id::text || '/70000000-0000-4000-8000-000000000001.jpg';
  path_b:=actor::text || '/' || b.id::text || '/70000000-0000-4000-8000-000000000002.jpg';
  insert into storage.objects(id,bucket_id,name,owner_id) values('70000000-0000-4000-8000-000000000001','listing-draft-media',path,actor::text),('70000000-0000-4000-8000-000000000002','listing-draft-media',path_b,actor::text);
  d:=public.set_listing_draft_photos(d.id,0,jsonb_build_array(jsonb_build_object('kind','draft','objectPath',path)));
  caught:=false; begin perform public.delete_listing_draft(d.id,d.revision); exception when others then if sqlerrm<>'DRAFT_CLEANUP_REQUIRED' then raise; end if; caught:=true; end;
  if not caught or (select state from public.listing_drafts where id=d.id)<>'open' then raise exception 'unsafe compatibility deletion'; end if;
  caught:=false; begin perform public.begin_listing_draft_deletion(d.id,0); exception when others then if sqlerrm<>'DRAFT_CONFLICT' then raise; end if; caught:=true; end;
  if not caught then raise exception 'stale deletion allowed'; end if;
  -- Freeze an uncertain publication, then settle its key before private cleanup.
  d:=public.begin_listing_draft_publication(d.id,d.revision,'{}');
  t:=public.begin_listing_draft_deletion(d.id,d.revision);
  if (t->>'revision')::integer<>d.revision+1 or (t->>'completed')::boolean then raise exception 'bad ticket'; end if;
  if public.begin_listing_draft_deletion(d.id,d.revision)<>t then raise exception 'lost begin not idempotent'; end if;
  caught:=false; begin perform public.finish_listing_draft_deletion(d.id,d.revision+1); exception when others then if sqlerrm<>'DRAFT_CLEANUP_REQUIRED' then raise; end if; caught:=true; end;
  if not caught or (select state from public.listing_drafts where id=d.id)<>'deleting' then raise exception 'cleanup failure lost'; end if;
  page:=public.list_listing_draft_deletion_objects(d.id,null,1);
  if jsonb_array_length(page->'items')<>1 or page->'items'->0->>'object_path'<>path then raise exception 'bad manifest'; end if;
  caught:=false; begin perform public.save_listing_draft(d.id,d.revision+1,'{}'); exception when others then if sqlerrm<>'DRAFT_CLOSED' then raise; end if; caught:=true; end;
  if not caught then raise exception 'deleting draft editable'; end if;
  caught:=false; begin insert into storage.objects(id,bucket_id,name,owner_id) values(gen_random_uuid(),'listing-draft-media',actor::text || '/' || d.id::text || '/70000000-0000-4000-8000-000000000003.jpg',actor::text); exception when insufficient_privilege then caught:=true; end;
  if not caught then raise exception 'late upload'; end if;
  caught:=false; begin perform public.create_listing_draft(key); exception when others then if sqlerrm<>'DRAFT_UNAVAILABLE' then raise; end if; caught:=true; end;
  if not caught then raise exception 'pending receipt resurrected'; end if;
  execute 'reset role'; perform set_config('request.jwt.claim.sub',outsider::text,true); execute 'set local role authenticated';
  caught:=false; begin perform public.begin_listing_draft_deletion(d.id,d.revision); exception when others then if sqlerrm<>'DRAFT_NOT_FOUND' then raise; end if; caught:=true; end;
  if not caught then raise exception 'outsider begin'; end if;
  caught:=false; begin perform public.list_listing_draft_deletion_objects(d.id); exception when others then if sqlerrm<>'DRAFT_NOT_FOUND' then raise; end if; caught:=true; end;
  if not caught then raise exception 'outsider manifest'; end if;
  delete from storage.objects where name=path; get diagnostics n=row_count; if n<>0 then raise exception 'outsider cleanup'; end if;
  execute 'reset role'; perform set_config('request.jwt.claim.sub','',true); execute 'set local role anon';
  caught:=false; begin perform public.begin_listing_draft_deletion(d.id,d.revision); exception when insufficient_privilege then caught:=true; end;
  if not caught then raise exception 'anonymous deletion'; end if;
  execute 'reset role'; perform set_config('request.jwt.claim.sub',actor::text,true); execute 'set local role authenticated';
  -- Only disposable local metadata: hosted cleanup uses the actual Storage API.
  delete from storage.objects where bucket_id='listing-draft-media' and name=path; get diagnostics n=row_count;
  if n<>1 then raise exception 'manifest cleanup denied'; end if;
  perform public.finish_listing_draft_deletion(d.id,d.revision+1);
  perform public.finish_listing_draft_deletion(d.id,d.revision+1);
  t:=public.begin_listing_draft_deletion(d.id,d.revision);
  if not (t->>'completed')::boolean or exists(select 1 from public.listing_drafts where id=d.id) then raise exception 'lost finish retry'; end if;
  if not exists(select 1 from public.listing_drafts where id=b.id) or not exists(select 1 from storage.objects where name=path_b) then raise exception 'other draft affected'; end if;
  caught:=false; begin perform public.create_listing_draft(key); exception when others then if sqlerrm<>'DRAFT_UNAVAILABLE' then raise; end if; caught:=true; end;
  if not caught then raise exception 'completed receipt resurrected'; end if;
  caught:=false; begin insert into public.listing_drafts(id) values(d.id); exception when others then if sqlerrm<>'DRAFT_UNAVAILABLE' then raise; end if; caught:=true; end;
  if not caught then raise exception 'raw identity resurrection'; end if;
  -- Bounded stable manifest includes unattached orphan uploads.
  e:=public.create_listing_draft();
  for n in 1..23 loop insert into storage.objects(id,bucket_id,name,owner_id) values(gen_random_uuid(),'listing-draft-media',actor::text || '/' || e.id::text || '/' || gen_random_uuid()::text || '.jpg',actor::text); end loop;
  t:=public.begin_listing_draft_deletion(e.id,0); page:=public.list_listing_draft_deletion_objects(e.id,null,20);
  if jsonb_array_length(page->'items')<>20 or not (page->>'has_more')::boolean then raise exception 'unbounded manifest'; end if;
  page:=public.list_listing_draft_deletion_objects(e.id,(page->>'next_cursor')::uuid,20);
  if jsonb_array_length(page->'items')<>3 or (page->>'has_more')::boolean then raise exception 'manifest cursor'; end if;
  -- An existing committed public listing/receipt is never deleted.
  select * into e from public.listing_drafts where publication_request_id='10000000-0000-4000-8000-000000000001';
  caught:=false; begin perform public.begin_listing_draft_deletion(e.id,e.revision); exception when others then if sqlerrm not in ('PUBLICATION_COMMITTED','DRAFT_CLOSED') then raise; end if; caught:=true; end;
  if not caught then raise exception 'published deletion'; end if;
  -- Deleting an edit draft discards only its reference to the active source.
  select * into e from public.listing_drafts where owner_id=actor and source_listing_id='10000000-0000-4000-8000-000000000001' and state='open';
  e:=public.set_listing_draft_photos(e.id,e.revision,'[{"kind":"published","objectPath":"10000000-0000-4000-8000-000000000001/1.jpg"}]');
  t:=public.begin_listing_draft_deletion(e.id,e.revision);
  perform public.finish_listing_draft_deletion(e.id,(t->>'revision')::integer);
  if exists(select 1 from public.listing_drafts where id=e.id) then raise exception 'edit draft not removed'; end if;
  execute 'reset role';
  if not exists(select 1 from storage.objects where bucket_id='apartment-photos' and name='10000000-0000-4000-8000-000000000001/1.jpg') then raise exception 'public image affected'; end if;
end $test$;
