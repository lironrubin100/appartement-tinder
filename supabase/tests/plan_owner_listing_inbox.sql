-- Final-schema disposable acceptance; no hosted connection or retained fixtures.
begin;
do $test$
declare
  o constant uuid:='00000000-0000-4000-8000-000000000010';
  q constant uuid:='00000000-0000-4000-8000-000000000011';
  x constant uuid:='00000000-0000-4000-8000-000000000013';
  a constant uuid:='62300000-0000-4000-8000-000000000001';
  b constant uuid:='62300000-0000-4000-8000-000000000002';
  foreign_listing constant uuid:='62300000-0000-4000-8000-000000000003';
  c uuid; item jsonb; page jsonb; second jsonb; cursor jsonb; ids jsonb; before_rows jsonb;
  denied boolean; req uuid; before_chats bigint;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(a,o,'user','Inbox A','Never project address',31.25,34.79,1800,1),
        (b,o,'user','Inbox B','Never project address',31.25,34.79,1800,1),
        (foreign_listing,x,'user','Foreign listing','Never project address',31.25,34.79,1800,1);
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  select id,1800,'2026-12-01',true from public.apartments where id in(a,b,foreign_listing);
  insert into public.listing_inquiries(apartment_id,requester_id,intro,created_at)
    select a,id,case when id=q then 'Opening survives read' else null end,'2026-10-01'::timestamptz
    from public.profiles where id<>o order by id limit 22;
  insert into public.listing_inquiries(apartment_id,requester_id,status)
  values(b,q,'declined'),(foreign_listing,q,'pending');
  select id into req from public.listing_inquiries where apartment_id=a and requester_id=q;
  select count(*) into before_chats from public.conversations;
  select jsonb_agg(to_jsonb(i) order by id) into before_rows from public.listing_inquiries i where apartment_id in(a,b);
  perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
  page:=public.list_owner_listing_inquiries();
  if jsonb_array_length(page->'items')<>20 or not (page->>'has_more')::boolean or page->>'projection_version'<>'1'
  then raise exception 'Default inbox boundary failed';end if;
  cursor:=page->'next_cursor';
  second:=public.list_owner_listing_inquiries(null,null,20,(cursor->>'created_at')::timestamptz,(cursor->>'id')::uuid);
  if jsonb_array_length(second->'items')<>3 or (second->>'has_more')::boolean or second->'next_cursor'<>'null'::jsonb
    or exists(select 1 from jsonb_array_elements(page->'items') p join jsonb_array_elements(second->'items') s on p->>'id'=s->>'id')
  then raise exception 'Tied-timestamp keyset boundary failed';end if;
  if jsonb_array_length(public.list_owner_listing_inquiries(a)->'items')<>20
    or jsonb_array_length(public.list_owner_listing_inquiries(a,null,50)->'items')<>22
    or jsonb_array_length(public.list_owner_listing_inquiries(b,'declined')->'items')<>1
    or public.list_owner_listing_inquiries(b,'pending')->'items'<>'[]'::jsonb
  then raise exception 'Listing/state filter failed';end if;
  item:=public.list_owner_listing_inquiries(b)->'items'->0;
  if item->>'kind'<>'individual' or item->>'listing_title'<>'Inbox B' or item->'conversation_id'<>'null'::jsonb
    or item->'requester'->>'id'<>q::text or not (item->'requester' ? 'name')
    or exists(select 1 from jsonb_object_keys(item->'requester') k where k not in('id','name','photo_url','public_badges'))
    or item ?| array['address','lat','lng','phone','birth_date','preferences','seen_at']
  then raise exception 'Safe projection failed';end if;
  foreach c in array array[foreign_listing,'62300000-0000-4000-8000-000000000099'::uuid] loop
    denied:=false;begin perform public.list_owner_listing_inquiries(c);exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;denied:=true;end;
    if not denied then raise exception 'Foreign/unknown listing filter leaked';end if;
  end loop;
  for item in select value from jsonb_array_elements('[0,51,null]'::jsonb) loop
    denied:=false;begin perform public.list_owner_listing_inquiries(null,null,(item#>>'{}')::integer);exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
    if not denied then raise exception 'Invalid page size accepted';end if;
  end loop;
  denied:=false;begin perform public.list_owner_listing_inquiries(null,'bogus');exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Invalid state accepted';end if;
  denied:=false;begin perform public.list_owner_listing_inquiries(null,null,20,now(),null);exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Half tuple accepted';end if;
  denied:=false;begin perform public.list_owner_listing_inquiries(null,null,20,'infinity',req);exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Infinite cursor timestamp accepted';end if;
  execute 'reset role';
  if before_rows is distinct from (select jsonb_agg(to_jsonb(i) order by id) from public.listing_inquiries i where apartment_id in(a,b))
    or (select count(*) from public.conversations)<>before_chats then raise exception 'Reader wrote inquiry/chat state';end if;
  update public.listing_inquiries set reconfirmation_required_at=now() where id=req;
  execute 'set local role authenticated';
  if jsonb_array_length(public.list_owner_listing_inquiries(a,'unavailable')->'items')<>1 then raise exception 'Unavailable reconfirmation not projected';end if;
  execute 'reset role';update public.listing_inquiries set reconfirmation_required_at=null where id=req;
  update public.profiles set onboarded=false where id=q;
  execute 'set local role authenticated';
  if public.list_owner_listing_inquiries(b)->'items'->0->'requester'<>'null'::jsonb then raise exception 'Hidden requester used private fallback';end if;
  execute 'reset role';update public.profiles set onboarded=true where id=q;
  update public.apartments set inquiries_open=false where id=a;
  execute 'set local role authenticated';
  if jsonb_array_length(public.list_owner_listing_inquiries(a,'unavailable',50)->'items')<>22 then raise exception 'Paused intake not projected unavailable';end if;
  execute 'reset role';update public.apartments set inquiries_open=true where id=a;
  execute 'set local role authenticated';c:=public.accept_listing_inquiry(req);
  page:=public.list_owner_listing_inquiries(a,'accepted');
  if page->'items'->0->>'conversation_id'<>c::text then raise exception 'Accepted conversation missing';end if;
  execute 'reset role';delete from public.conversation_members where conversation_id=c and user_id=o;
  execute 'set local role authenticated';
  if public.list_owner_listing_inquiries(a,'accepted')->'items'->0->'conversation_id'<>'null'::jsonb then raise exception 'Unauthorized conversation ID disclosed';end if;
  execute 'reset role';insert into public.blocks(blocker_id,blocked_id)values(q,o);
  execute 'set local role authenticated';
  if public.list_owner_listing_inquiries(b)->'items'<>'[]'::jsonb then raise exception 'Block bypass in inbox';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',q::text,true);execute 'set local role authenticated';
  if public.list_owner_listing_inquiries()->'items'<>'[]'::jsonb then raise exception 'Requester read owner inbox';end if;
  execute 'reset role';execute 'set local role anon';
  denied:=false;begin perform public.list_owner_listing_inquiries();exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Anon execute allowed';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role authenticated';
  denied:=false;begin perform public.list_owner_listing_inquiries();exception when others then if sqlerrm<>'AUTH_REQUIRED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Null session allowed';end if;
  execute 'reset role';
end;
$test$;
rollback;
