-- Disposable final-schema acceptance; no hosted target or persistent test RPC.
begin;
create function public.qa62_fail_system_message() returns trigger language plpgsql as $fn$
begin
  if new.kind='system' and current_setting('qa62.fail',true)='on' then
    raise exception 'QA62_MESSAGE_FAILURE';
  end if;
  return new;
end;
$fn$;
create trigger qa62_fail_system_message before insert on public.messages
for each row execute function public.qa62_fail_system_message();

do $test$
declare
  owner_id constant uuid:='00000000-0000-4000-8000-000000000010';
  requester constant uuid:='00000000-0000-4000-8000-000000000011';
  outsider constant uuid:='00000000-0000-4000-8000-000000000012';
  listing_id constant uuid:='62000000-0000-4000-8000-000000000001';
  inquiry_id uuid; chat_id uuid; before_counts jsonb; inquiry_before jsonb;
  actual_counts jsonb; actor uuid; denied boolean;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(listing_id,owner_id,'user','Accept fixture','QA private fixture address',31.25,34.79,1800,1);
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(listing_id,1800,'2026-12-01',true);
  perform set_config('request.jwt.claim.sub',requester::text,true);execute 'set local role authenticated';
  inquiry_id:=public.create_listing_inquiry(listing_id,E'שלום\nOptional opening');
  if exists(select 1 from public.listing_address_access where apartment_id=listing_id) then raise exception 'address before acceptance';end if;
  execute 'reset role';
  select jsonb_build_array((select count(*) from public.conversations),(select count(*) from public.conversation_members),(select count(*) from public.messages)) into before_counts;
  select to_jsonb(i) into inquiry_before from public.listing_inquiries i where id=inquiry_id;

  foreach actor in array array[requester,outsider] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
    denied:=false;begin perform public.accept_listing_inquiry(inquiry_id);
    exception when others then if sqlerrm<>'not your inquiry' then raise;end if;denied:=true;end;
    if not denied then raise exception 'nonowner accepted';end if;
    execute 'reset role';
  end loop;
  execute 'set local role anon';denied:=false;
  begin perform public.accept_listing_inquiry(inquiry_id);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'guest accepted';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role authenticated';denied:=false;
  begin perform public.accept_listing_inquiry(inquiry_id);
  exception when others then if sqlerrm<>'authentication required' then raise;end if;denied:=true;end;
  if not denied then raise exception 'null session accepted';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';denied:=false;
  begin perform public.accept_listing_inquiry('62000000-0000-4000-8000-000000000099');
  exception when others then if sqlerrm<>'not your inquiry' then raise;end if;denied:=true;end;
  if not denied then raise exception 'unknown inquiry accepted';end if;

  -- Failure happens after conversation/member INSERTs; the RPC must roll back all.
  perform set_config('qa62.fail','on',true);denied:=false;
  begin perform public.accept_listing_inquiry(inquiry_id);
  exception when others then if sqlerrm<>'QA62_MESSAGE_FAILURE' then raise;end if;denied:=true;end;
  perform set_config('qa62.fail','off',true);
  if not denied then raise exception 'fault did not reach message insert';end if;
  execute 'reset role';
  select jsonb_build_array((select count(*) from public.conversations),(select count(*) from public.conversation_members),(select count(*) from public.messages)) into actual_counts;
  if actual_counts is distinct from before_counts or (select to_jsonb(i) from public.listing_inquiries i where id=inquiry_id) is distinct from inquiry_before
  then raise exception 'denial/failure left partial acceptance';end if;
  perform set_config('request.jwt.claim.sub',requester::text,true);execute 'set local role authenticated';
  if exists(select 1 from public.listing_address_access where apartment_id=listing_id) then raise exception 'failed acceptance granted address';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  chat_id:=public.accept_listing_inquiry(inquiry_id);
  if chat_id is null or public.accept_listing_inquiry(inquiry_id)<>chat_id then raise exception 'retry changed conversation';end if;
  execute 'reset role';
  select jsonb_build_array((select count(*) from public.conversations),(select count(*) from public.conversation_members),(select count(*) from public.messages)) into actual_counts;
  if actual_counts<>jsonb_build_array((before_counts->>0)::int+1,(before_counts->>1)::int+2,(before_counts->>2)::int+1)
    or not exists(select 1 from public.conversations where id=chat_id and group_id is null)
    or (select array_agg(user_id order by user_id) from public.conversation_members where conversation_id=chat_id) is distinct from array[owner_id,requester]
    or (select count(*) from public.messages where conversation_id=chat_id and kind='system' and sender_id is null and position('QA private fixture address' in body)=0)<>1
    or not exists(select 1 from public.listing_inquiries where id=inquiry_id and status='accepted' and conversation_id=chat_id and intro=E'שלום\nOptional opening')
  then raise exception 'accepted personal conversation shape or idempotency failed';end if;
  perform set_config('request.jwt.claim.sub',requester::text,true);execute 'set local role authenticated';
  if not exists(select 1 from public.listing_address_access where apartment_id=listing_id and address='QA private fixture address' and lat=31.25 and lng=34.79)
    or not exists(select 1 from public.conversations where id=chat_id)
  then raise exception 'accepted requester lacks chat/address';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
  if exists(select 1 from public.listing_address_access where apartment_id=listing_id)
    or exists(select 1 from public.conversations where id=chat_id)
  then raise exception 'outsider inherited accepted access';end if;
  denied:=false;begin perform public.accept_listing_inquiry(inquiry_id);
  exception when others then if sqlerrm<>'not your inquiry' then raise;end if;denied:=true;end;
  if not denied then raise exception 'accepted retry bypassed owner authorization';end if;
  execute 'reset role';
end;
$test$;
rollback;
