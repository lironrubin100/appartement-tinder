-- Disposable transaction fault injection: fails after facts/rooms/photos updated.
create function pg_temp.fail_listing_edit_receipt() returns trigger language plpgsql as $$
begin
 if new.request_key='42000000-0000-4000-8000-000000000099'::uuid then raise exception 'injected after all writes';end if;
 return new;
end $$;
create trigger test_edit_rollback before insert on public.listing_edit_requests
 for each row execute function pg_temp.fail_listing_edit_receipt();
do $test$
declare
 v_owner uuid:='00000000-0000-4000-8000-000000000008';
 v_other uuid:='00000000-0000-4000-8000-000000000007';
 lid uuid:='42000000-0000-4000-8000-000000000001';
 r1 uuid:='42000000-0000-4000-8000-000000000002';
 r2 uuid:='42000000-0000-4000-8000-000000000003';
 key1 uuid:='42000000-0000-4000-8000-000000000010';
 key2 uuid:='42000000-0000-4000-8000-000000000011';
 fault_key uuid:='42000000-0000-4000-8000-000000000099';
 prefix text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
 model jsonb; changed jsonb; before_model jsonb; result jsonb; again jsonb;
 before_parent jsonb; after_parent jsonb; objects_before jsonb; denied boolean; message text;
 path text; forbidden text;
begin
 insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,available_from,description,photos)
 values(lid,v_owner,'user','Original home','PRIVATE ATOMIC ADDRESS',31.25,34.79,2100,2,'2026-12-01','Original description',
 array[prefix || lid::text || '/1.jpg',prefix || lid::text || '/2.jpg',prefix || v_owner::text || '/legacy.jpg']);
 insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available)
 values(r1,lid,'Available',2100,'2026-12-01',true),(r2,lid,'Unavailable retained',2600,'2026-12-03',false);
 insert into storage.objects(id,bucket_id,name,owner_id)
 values(gen_random_uuid(),'apartment-photos',lid::text || '/1.jpg',v_owner::text),
 (gen_random_uuid(),'apartment-photos',lid::text || '/2.jpg',v_owner::text),
 (gen_random_uuid(),'apartment-photos',v_owner::text || '/legacy.jpg',v_owner::text),
 (gen_random_uuid(),'apartment-photos',key2::text || '/1.jpg',v_owner::text),
 (gen_random_uuid(),'apartment-photos',fault_key::text || '/1.jpg',v_owner::text),
 (gen_random_uuid(),'apartment-photos','42000000-0000-4000-8000-000000000050/1.jpg',v_other::text),
 (gen_random_uuid(),'apartment-photos','42000000-0000-4000-8000-000000000051/1.jpg',v_owner::text);
 perform set_config('request.jwt.claim.sub',v_owner::text,true);execute 'set local role authenticated';
 model:=public.get_owned_listing_editor(lid)-array['id','ownerId','revision','status','location'];
 select to_jsonb(a) into before_parent from public.apartments a where id=lid;
 model:=model || jsonb_build_object('title','  Edited home v  ','bedrooms',3,'billsIncluded',true,'isSublet',true,'availableFrom','2026-12-15','description','  Edited details  ');
 model:=jsonb_set(model,'{rooms,0,monthlyPrice}','2200');model:=jsonb_set(model,'{rooms,1,monthlyPrice}','2700');
 model:=jsonb_set(model,'{rooms,0,availableFrom}','"2026-12-16"');
 model:=jsonb_set(model,'{rooms,1,availableFrom}','"2026-12-18"');
 model:=jsonb_set(model,'{photos}',jsonb_build_array(model#>'{photos,2}',model#>'{photos,0}',model#>'{photos,1}'));
 result:=public.update_owned_listing(lid,0,key1,model);
 if result<>jsonb_build_object('listingId',lid,'revision',1,'requestKey',key1) then raise exception 'bad initial receipt';end if;
 before_model:=public.get_owned_listing_editor(lid);
 if before_model->>'title'<>'Edited home v' or before_model->>'description'<>'Edited details' or (before_model->>'revision')::integer<>1
  or before_model#>>'{rooms,0,id}'<>r1::text or before_model#>>'{rooms,1,id}'<>r2::text
  or before_model#>>'{rooms,0,monthlyPrice}'<>'2200' or before_model#>>'{rooms,1,monthlyPrice}'<>'2700'
  or before_model#>>'{rooms,0,availableFrom}'<>'2026-12-16' or before_model#>>'{rooms,1,isAvailable}'<>'false'
  or before_model#>>'{photos,0,objectPath}'<>v_owner::text || '/legacy.jpg' then raise exception 'incomplete edit or repeated version increment';end if;
 select to_jsonb(a) into after_parent from public.apartments a where id=lid;
 if (before_parent-array['title','bedrooms','bills_included','is_sublet','available_from','description','photos','price','revision'])
  is distinct from (after_parent-array['title','bedrooms','bills_included','is_sublet','available_from','description','photos','price','revision'])
  or after_parent->>'price'<>'2200' then raise exception 'identity/location/status/age changed or bad price cache';end if;
 changed:=model || jsonb_build_object('title','Edited home v','description','Edited details');
 changed:=jsonb_set(changed,'{rooms}',jsonb_build_array(changed#>'{rooms,1}',changed#>'{rooms,0}'));
 again:=public.update_owned_listing(lid,0,key1,changed);
 if result<>again or public.get_owned_listing_editor(lid)<>before_model then raise exception 'normalized retry changed model';end if;
 denied:=false;begin perform public.update_owned_listing(lid,0,key1,model || '{"title":"Different"}');exception when raise_exception then if sqlerrm='VERSION_CONFLICT' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'key changed payload accepted';end if;
 denied:=false;begin perform public.update_owned_listing(lid,0,gen_random_uuid(),model);exception when raise_exception then if sqlerrm='VERSION_CONFLICT' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'stale revision accepted';end if;
 for changed in select value from jsonb_array_elements(jsonb_build_array(
  model || '{"title":""}',model || jsonb_build_object('title',chr(160)),model || '{"bedrooms":1}',model || '{"bedrooms":2.5}',
  model || '{"billsIncluded":"true"}',model || '{"availableFrom":"2026-02-30"}',model || '{"availableFrom":"0000-01-01"}',
  model || '{"location":{"address":"replacement"}}',model || '{"status":"active"}',model || '{"ownerId":"forged"}',
  jsonb_set(model,'{rooms,0,monthlyPrice}','0'),jsonb_set(model,'{rooms,0,monthlyPrice}','2147483648'),
  jsonb_set(model,'{rooms,0,availableFrom}','"2026-02-30"'),jsonb_set(model,'{rooms,1,id}',to_jsonb(r1::text)),
  jsonb_set(model,'{photos,0,kind}','"draft"'),jsonb_set(model,'{photos,0,url}','"signed-url"'),
  jsonb_set(model,'{photos,0,objectPath}','"https://signed.invalid/private"'),jsonb_set(model,'{photos,0,objectPath}','"folder/../secret.jpg"'),
  jsonb_set(model,'{photos,1}',model#>'{photos,0}')
 )) loop
  denied:=false;begin perform public.update_owned_listing(lid,1,gen_random_uuid(),changed);exception when raise_exception then if sqlerrm='VALIDATION_FAILED' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'invalid full model accepted';end if;
 end loop;
 for changed in select value from jsonb_array_elements(jsonb_build_array(
  jsonb_set(model,'{rooms,1,isAvailable}','true'),jsonb_set(model,'{rooms}',jsonb_build_array(model#>'{rooms,0}')),
  jsonb_set(model,'{rooms,1,id}',to_jsonb(gen_random_uuid()::text))
 )) loop
  denied:=false;begin perform public.update_owned_listing(lid,1,gen_random_uuid(),changed);exception when raise_exception then if sqlerrm='ROOM_INVENTORY_CHANGED' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'inventory silently changed';end if;
 end loop;
 foreach path in array array['42000000-0000-4000-8000-000000000050/1.jpg','42000000-0000-4000-8000-000000000051/1.jpg','missing/1.jpg'] loop
  changed:=jsonb_set(model,'{photos,0,objectPath}',to_jsonb(path));
  denied:=false;begin perform public.update_owned_listing(lid,1,gen_random_uuid(),changed);exception when raise_exception then if sqlerrm='INVALID_PHOTOS' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'unowned/unbound/missing photo accepted';end if;
 end loop;
 if public.get_owned_listing_editor(lid)<>before_model then raise exception 'validation failure wrote part of model';end if;
 -- An exact owned pre-staged replacement and retained old refs commit together.
 model:=jsonb_set(model,'{photos,0,objectPath}',to_jsonb(key2::text || '/1.jpg'));
 result:=public.update_owned_listing(lid,1,key2,model);
 if result->>'revision'<>'2' then raise exception 'replacement version wrong';end if;
 before_model:=public.get_owned_listing_editor(lid);
 execute 'reset role';select jsonb_agg(to_jsonb(o) order by o.id) into objects_before from storage.objects o;
 execute 'set local role authenticated';
 changed:=jsonb_set(model || '{"title":"Rollback after room facts"}','{photos,0,objectPath}',to_jsonb(fault_key::text || '/1.jpg'));
 changed:=jsonb_set(changed,'{rooms,0,monthlyPrice}','2300');
 denied:=false;begin perform public.update_owned_listing(lid,2,fault_key,changed);exception when raise_exception then if sqlerrm='injected after all writes' then denied:=true;else raise;end if;end;
 if not denied or public.get_owned_listing_editor(lid)<>before_model then raise exception 'late failure failed to roll back full model';end if;
 if exists(select 1 from public.listing_edit_requests where request_key=fault_key) then raise exception 'failed receipt persisted';end if;
 execute 'reset role';
 if objects_before is distinct from(select jsonb_agg(to_jsonb(o) order by o.id) from storage.objects o) then raise exception 'SQL edit changed/deleted Storage metadata';end if;
 execute 'set local role authenticated';
 denied:=false;begin update public.apartment_rooms set monthly_price=1 where id=r1;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'direct room update bypass';end if;
 denied:=false;begin update public.apartments set revision=99 where id=lid;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'direct revision bypass';end if;
 update public.apartments set status='taken' where id=lid;
 update public.apartments set status='taken' where id=lid;
 if (public.get_owned_listing_editor(lid)->>'revision')::integer<>3 then raise exception 'status version/noop wrong';end if;
 denied:=false;begin perform public.update_owned_listing(lid,2,gen_random_uuid(),model);exception when raise_exception then if sqlerrm='VERSION_CONFLICT' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'status versus edit stale write';end if;
 -- Admin-only fixture setup, never an allowed direct client inventory mutation.
 execute 'reset role';update public.apartment_rooms set is_available=false where apartment_id=lid;
 execute 'set local role authenticated';
 model:=public.get_owned_listing_editor(lid)-array['id','ownerId','revision','status','location'];
 result:=public.update_owned_listing(lid,3,gen_random_uuid(),model || '{"title":"Unavailable facts edit"}');
 if result->>'revision'<>'4' or exists(select 1 from public.apartment_rooms where apartment_id=lid and is_available)
  or public.get_owned_listing_editor(lid)->>'status'<>'taken' then raise exception 'ordinary edit reopened inventory';end if;
 if (select count(*) from public.listing_edit_requests where actor_id=v_owner and listing_id=lid)<>3 then raise exception 'bad receipt count';end if;
 perform set_config('request.jwt.claim.sub',v_other::text,true);
 denied:=false;begin perform public.update_owned_listing(lid,4,gen_random_uuid(),model);exception when raise_exception then if sqlerrm='NOT_FOUND' then denied:=true;else raise;end if;end;
 if not denied or exists(select 1 from public.listing_edit_requests where listing_id=lid) then raise exception 'foreign owner model/receipt access';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
 denied:=false;begin perform public.update_owned_listing(lid,4,gen_random_uuid(),model);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous edit allowed';end if;
 execute 'reset role';
 if has_function_privilege('anon','public.update_owned_listing(uuid,integer,uuid,jsonb)','execute')
  or has_column_privilege('authenticated','public.apartment_rooms','monthly_price','update')
  or has_column_privilege('authenticated','public.apartment_rooms','id','insert')
  or has_table_privilege('authenticated','public.apartment_rooms','delete')
  or has_table_privilege('authenticated','public.listing_edit_requests','insert') then raise exception 'write grant bypass';end if;
end $test$;
drop trigger test_edit_rollback on public.listing_edit_requests;
drop function pg_temp.fail_listing_edit_receipt();
