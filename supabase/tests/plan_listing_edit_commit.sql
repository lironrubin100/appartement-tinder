-- Disposable Postgres only: synthetic Storage metadata and fault trigger.
create function public.qa_fail_edit_completion() returns trigger language plpgsql as $$
begin if new.state='completed' and new.fields->>'title'='Commit rollback test' then raise exception 'QA_COMPLETION_FAILURE'; end if; return new; end $$;
create trigger qa_fail_edit_completion after update on public.listing_drafts for each row execute function public.qa_fail_edit_completion();
do $test$
declare
 actor constant uuid:='00000000-0000-4000-8000-000000000008';
 outsider constant uuid:='00000000-0000-4000-8000-000000000007';
 listing constant uuid:='41600000-0000-4000-8000-000000000001';
 prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
 d public.listing_drafts; other public.listing_drafts; frozen jsonb; result jsonb; before_public jsonb;
 digest jsonb:=jsonb_build_array(repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64));
 original_fields jsonb; caught boolean; old_key uuid;
begin
 insert into storage.objects(id,bucket_id,name,owner_id)
 select gen_random_uuid(),'apartment-photos',listing::text||'/'||i||'.jpg',actor::text from generate_series(1,3)i;
 insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,bills_included,is_sublet,available_from,photos)
 values(listing,actor,'user','Edit commit source','PRIVATE COMMIT ADDRESS',31.25,34.79,2100,2,false,false,'2026-12-01',array[prefix||listing::text||'/1.jpg',prefix||listing::text||'/2.jpg',prefix||listing::text||'/3.jpg']);
 insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available)
 values('41600000-0000-4000-8000-000000000011',listing,'Room one',2100,'2026-12-02',true),
 ('41600000-0000-4000-8000-000000000012',listing,'Room two',2600,'2026-12-03',false);
 perform set_config('request.jwt.claim.sub',actor::text,true); execute 'set local role authenticated';
 d:=public.open_listing_edit_draft(listing,gen_random_uuid());
 other:=public.create_listing_draft(gen_random_uuid());
 d:=public.save_listing_draft(d.id,d.revision,jsonb_set(d.fields,'{title}','"Commit rollback test"'));
 execute 'reset role';
 insert into storage.objects(id,bucket_id,name,owner_id) values(gen_random_uuid(),'listing-draft-media',actor::text||'/'||d.id::text||'/41600000-0000-4000-8000-000000000020.jpg',actor::text);
 execute 'set local role authenticated';
 d:=public.set_listing_draft_photos(d.id,d.revision,d.photos || jsonb_build_array(jsonb_build_object('kind','draft','objectPath',actor::text||'/'||d.id::text||'/41600000-0000-4000-8000-000000000020.jpg')));
 select to_jsonb(a) into before_public from public.apartments a where id=listing;
 frozen:=public.begin_listing_draft_edit(d.id,d.revision,digest);
 if frozen#>>'{model,photos,3,objectPath}'<>d.publication_request_id::text||'/4.jpg'
   or frozen#>>'{model,rooms,1,isAvailable}'<>'false' then raise exception 'lost room/media identity'; end if;
 if (select to_jsonb(a) from public.apartments a where id=listing)<>before_public then raise exception 'freeze published data'; end if;
 if public.begin_listing_draft_edit(d.id,d.revision,digest)<>frozen then raise exception 'freeze retry changed snapshot'; end if;
 caught:=false; begin perform public.begin_listing_draft_edit(d.id,d.revision,jsonb_set(digest,'{0}',to_jsonb(repeat('e',64)))); exception when others then if sqlerrm<>'PUBLICATION_SNAPSHOT_CONFLICT' then raise; end if;caught:=true;end;
 if not caught then raise exception 'changed bytes rebound'; end if;
 caught:=false; begin perform public.save_listing_draft(d.id,d.revision,d.fields);exception when others then if sqlerrm<>'PUBLICATION_IN_PROGRESS' then raise;end if;caught:=true;end;
 if not caught then raise exception 'frozen draft editable';end if;
 caught:=false; begin perform public.commit_listing_draft_edit(d.id,d.revision,true);exception when others then if sqlerrm<>'EDIT_PENDING' then raise;end if;caught:=true;end;
 if not caught then raise exception 'reconcile wrote without receipt';end if;
 caught:=false; begin perform public.commit_listing_draft_edit(d.id,d.revision,false);exception when others then if sqlerrm<>'INVALID_PHOTOS' then raise;end if;caught:=true;end;
 if not caught then raise exception 'missing staged image accepted';end if;
 execute 'reset role';insert into storage.objects(id,bucket_id,name,owner_id) values(gen_random_uuid(),'apartment-photos',d.publication_request_id::text||'/4.jpg',actor::text);execute 'set local role authenticated';
 caught:=false;begin perform public.commit_listing_draft_edit(d.id,d.revision,false);exception when others then if sqlerrm<>'QA_COMPLETION_FAILURE' then raise;end if;caught:=true;end;
 if not caught or (select to_jsonb(a) from public.apartments a where id=listing)<>before_public
   or exists(select 1 from public.listing_edit_requests where request_key=d.publication_request_id) then raise exception 'completion failure left public write/receipt';end if;
 d:=public.cancel_listing_draft_edit(d.id,d.revision);
 if d.publication_started_at is not null or d.fields->>'title'<>'Commit rollback test' then raise exception 'cancel discarded input';end if;
 d:=public.save_listing_draft(d.id,d.revision,jsonb_set(d.fields,'{title}','"Updated apartment"'));
 frozen:=public.begin_listing_draft_edit(d.id,d.revision,digest);
 execute 'reset role';insert into storage.objects(id,bucket_id,name,owner_id) values(gen_random_uuid(),'apartment-photos',d.publication_request_id::text||'/4.jpg',actor::text);execute 'set local role authenticated';
 result:=public.commit_listing_draft_edit(d.id,d.revision,false);
 if result#>>'{draft,state}'<>'completed' or result#>>'{receipt,listingId}'<>listing::text or result#>>'{receipt,revision}'<>'1'
   or (select title from public.apartments where id=listing)<>'Updated apartment' then raise exception 'atomic edit result invalid';end if;
 if public.commit_listing_draft_edit(d.id,d.revision,true)<>result or public.commit_listing_draft_edit(d.id,d.revision,false)<>result then raise exception 'receipt retry changed result';end if;
 if (select state from public.listing_drafts where id=other.id)<>'open' or (select revision from public.apartments where id=listing)<>1 then raise exception 'retry touched other work';end if;
 if (select address from public.apartments where id=listing)<>'PRIVATE COMMIT ADDRESS' or (select is_available from public.apartment_rooms where id='41600000-0000-4000-8000-000000000012') then raise exception 'public identity/inventory changed';end if;
 -- A later owner update cannot rewrite this attempt's original receipt.
 update public.apartments set status='taken' where id=listing;
 if public.commit_listing_draft_edit(d.id,d.revision,true)<>result then raise exception 'later source change broke original receipt';end if;
 d:=public.open_listing_edit_draft(listing,gen_random_uuid());
 original_fields:=d.fields;
 frozen:=public.begin_listing_draft_edit(d.id,d.revision,jsonb_build_array(repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64)));
 update public.apartments set status='active' where id=listing;
 caught:=false;begin perform public.commit_listing_draft_edit(d.id,d.revision,false);exception when others then if sqlerrm<>'VERSION_CONFLICT' then raise;end if;caught:=true;end;
 if not caught or (select state from public.listing_drafts where id=d.id)<>'open' then raise exception 'source conflict overwrote/completed';end if;
 old_key:=d.publication_request_id;
 d:=public.cancel_listing_draft_edit(d.id,d.revision);
 if d.fields<>original_fields or d.source_revision<>2 or d.publication_request_id=old_key then raise exception 'cancel silently rebased/lost fields';end if;
 caught:=false;begin perform public.begin_listing_draft_edit(d.id,d.revision,jsonb_build_array(repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64)));exception when others then if sqlerrm<>'VERSION_CONFLICT' then raise;end if;caught:=true;end;
 if not caught then raise exception 'stale source silently rebased';end if;
 d:=public.refresh_listing_edit_draft(d.id,d.revision);
 if d.source_revision<>3 or d.publication_started_at is not null then raise exception 'explicit refresh did not adopt current version';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 caught:=false;begin perform public.commit_listing_draft_edit(d.id,d.revision,false);exception when others then if sqlerrm<>'DRAFT_NOT_FOUND' then raise;end if;caught:=true;end;
 if not caught then raise exception 'foreign draft commit allowed';end if;
 caught:=false;begin perform 1 from listing_draft_private.edit_attempts;exception when insufficient_privilege then caught:=true;end;
 if not caught then raise exception 'private attempt readable';end if;
 execute 'reset role';
 if has_function_privilege('anon','public.begin_listing_draft_edit(uuid,integer,jsonb)','execute')
  or has_function_privilege('anon','public.commit_listing_draft_edit(uuid,integer,boolean)','execute')
  or has_table_privilege('authenticated','listing_draft_private.edit_attempts','insert') then raise exception 'unintended grant';end if;
end $test$;
drop trigger qa_fail_edit_completion on public.listing_drafts;
drop function public.qa_fail_edit_completion();
