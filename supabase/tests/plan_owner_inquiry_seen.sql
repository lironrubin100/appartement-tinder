begin;
do $test$
declare
  o constant uuid:='00000000-0000-4000-8000-000000000010';
  q constant uuid:='00000000-0000-4000-8000-000000000011';
  x constant uuid:='00000000-0000-4000-8000-000000000013';
  a constant uuid:='62400000-0000-4000-8000-000000000001';
  first_id uuid;second_id uuid;chat_id uuid;before_requests jsonb;before_chat jsonb;result jsonb;again jsonb;actor uuid;denied boolean;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(a,o,'user','Seen fixture','No real address',31.25,34.79,1800,1);
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)values(a,1800,'2026-12-01',true);
  perform set_config('request.jwt.claim.sub',q::text,true);execute 'set local role authenticated';first_id:=public.create_listing_inquiry(a,'Opening');
  execute 'reset role';perform set_config('request.jwt.claim.sub',x::text,true);execute 'set local role authenticated';second_id:=public.create_listing_inquiry(a);
  execute 'reset role';perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';chat_id:=public.accept_listing_inquiry(second_id);
  execute 'reset role';
  select jsonb_agg(to_jsonb(i) order by id) into before_requests from public.listing_inquiries i where apartment_id=a;
  select jsonb_build_object('conversation',(select to_jsonb(c) from public.conversations c where id=chat_id),
    'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.conversation_members m where conversation_id=chat_id),
    'messages',(select jsonb_agg(to_jsonb(m) order by id) from public.messages m where conversation_id=chat_id)) into before_chat;
  execute 'set local role authenticated';
  if exists(select 1 from jsonb_array_elements(public.list_owner_listing_inquiries(a)->'items') i where not (i->>'is_new')::boolean or i->'viewed_at'<>'null'::jsonb)
  then raise exception 'New inquiry initially seen';end if;
  execute 'reset role';if exists(select 1 from listing_inquiry_private.owner_views where inquiry_id in(first_id,second_id))then raise exception 'List read marked seen';end if;
  execute 'set local role authenticated';result:=public.mark_owner_listing_inquiry_seen(first_id);again:=public.mark_owner_listing_inquiry_seen(first_id);
  if result is distinct from again or result->>'inquiry_id'<>first_id::text or (result->>'is_new')::boolean or result->>'viewed_at' is null
  then raise exception 'Seen idempotency/identity failed';end if;
  if not exists(select 1 from jsonb_array_elements(public.list_owner_listing_inquiries(a)->'items') i where i->>'id'=first_id::text and not (i->>'is_new')::boolean and i->>'viewed_at'=result->>'viewed_at')
    or not exists(select 1 from jsonb_array_elements(public.list_owner_listing_inquiries(a)->'items') i where i->>'id'=second_id::text and (i->>'is_new')::boolean)
  then raise exception 'Seen affected wrong card';end if;
  perform public.mark_owner_listing_inquiry_seen(second_id);
  execute 'reset role';
  if before_requests is distinct from(select jsonb_agg(to_jsonb(i) order by id)from public.listing_inquiries i where apartment_id=a)
    or before_chat is distinct from(select jsonb_build_object('conversation',(select to_jsonb(c)from public.conversations c where id=chat_id),
      'members',(select jsonb_agg(to_jsonb(m)order by user_id)from public.conversation_members m where conversation_id=chat_id),
      'messages',(select jsonb_agg(to_jsonb(m)order by id)from public.messages m where conversation_id=chat_id)))
  then raise exception 'Seen altered inquiry/chat/read state';end if;
  foreach actor in array array[q,x] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
    denied:=false;begin perform public.mark_owner_listing_inquiry_seen(first_id);exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;denied:=true;end;
    if not denied then raise exception 'Nonowner marked seen';end if;
    denied:=false;begin perform 1 from listing_inquiry_private.owner_views;exception when insufficient_privilege then denied:=true;end;
    if not denied then raise exception 'Private owner marker disclosed';end if;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.mark_owner_listing_inquiry_seen('62400000-0000-4000-8000-000000000099');exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Unknown inquiry marked seen';end if;
  denied:=false;begin insert into listing_inquiry_private.owner_views(inquiry_id,owner_id)values(first_id,o);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Owner bypassed seen RPC';end if;
  execute 'reset role';insert into public.blocks(blocker_id,blocked_id)values(q,o);execute 'set local role authenticated';
  denied:=false;begin perform public.mark_owner_listing_inquiry_seen(first_id);exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Blocked inquiry mark bypass';end if;
  execute 'reset role';execute 'set local role anon';denied:=false;begin perform public.mark_owner_listing_inquiry_seen(first_id);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Anon marker execute';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role authenticated';denied:=false;
  begin perform public.mark_owner_listing_inquiry_seen(first_id);exception when others then if sqlerrm<>'AUTH_REQUIRED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'Null session marked seen';end if;
  execute 'reset role';
end;
$test$;
rollback;
