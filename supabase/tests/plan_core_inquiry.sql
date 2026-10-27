-- Final-schema disposable regression; all fixture changes roll back.
begin;
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000010';
  requester constant uuid := '00000000-0000-4000-8000-000000000011';
  legacy_actor constant uuid := '00000000-0000-4000-8000-000000000012';
  outsider constant uuid := '00000000-0000-4000-8000-000000000013';
  listing_id constant uuid := '61000000-0000-4000-8000-000000000001';
  intro_text text := E'שלום, אשמח להכיר\n' || repeat('😀',500-char_length(E'שלום, אשמח להכיר\n'));
  inquiry_id uuid; legacy_id uuid; before_chats bigint; marker timestamptz; denied boolean;
begin
  if char_length(intro_text)<>500 then raise exception 'Unicode test setup drift';end if;
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(listing_id,owner_id,'user','Inquiry fixture','No real address',31.25,34.79,1800,1);
  insert into public.apartment_rooms(apartment_id,monthly_price,available_from,is_available)
  values(listing_id,1800,'2026-12-01',true);
  select count(*) into before_chats from public.conversations;

  perform set_config('request.jwt.claim.sub',requester::text,true);execute 'set local role authenticated';
  inquiry_id:=public.create_listing_inquiry(listing_id,intro_text);
  if public.create_listing_inquiry(listing_id,intro_text)<>inquiry_id
    or public.create_listing_inquiry(listing_id)<>inquiry_id
    or public.create_listing_inquiry(listing_id,null::text)<>inquiry_id
    or not exists(select 1 from public.listing_inquiries where id=inquiry_id and intro=intro_text and requester_id=requester and status='pending' and conversation_id is null)
    or exists(select 1 from public.listing_address_access where apartment_id=listing_id)
  then raise exception 'opening roundtrip/retry/privacy failed';end if;
  denied:=false;begin perform public.create_listing_inquiry(listing_id,intro_text||'😀');
  exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied then raise exception '501 Unicode codepoints accepted';end if;
  denied:=false;begin update public.listing_inquiries set intro='changed' where id=inquiry_id;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'direct intro update permitted';end if;
  denied:=false;begin insert into public.listing_inquiries(apartment_id,requester_id,intro)values(listing_id,outsider,'spoof');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'direct request identity spoof permitted';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
  if not exists(select 1 from public.listing_inquiries where id=inquiry_id and intro=intro_text) then raise exception 'owner cannot read opening';end if;
  denied:=false;begin perform public.create_listing_inquiry(listing_id,'self');
  exception when others then if sqlerrm<>'listing is unavailable for contact' then raise;end if;denied:=true;end;
  if not denied then raise exception 'self inquiry accepted';end if;
  perform public.set_owned_listing_intake(listing_id,false);
  perform public.set_owned_listing_intake(listing_id,true);
  select reconfirmation_required_at into marker from public.listing_inquiries where id=inquiry_id;
  if marker is null then raise exception 'fixture reconfirmation missing';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',requester::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.create_listing_inquiry(listing_id,'new opening');
  exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied or not exists(select 1 from public.listing_inquiries where id=inquiry_id and intro=intro_text and reconfirmation_required_at=marker)
  then raise exception 'different retry changed text/reconfirmation';end if;
  if public.create_listing_inquiry(listing_id)<>inquiry_id then raise exception 'legacy reconfirmation changed identity';end if;
  if not exists(select 1 from public.listing_inquiries where id=inquiry_id and intro=intro_text and reconfirmation_required_at is null)
  then raise exception 'legacy reconfirmation lost opening';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',legacy_actor::text,true);execute 'set local role authenticated';
  legacy_id:=public.create_listing_inquiry(listing_id);
  if public.create_listing_inquiry(listing_id,null::text)<>legacy_id or not exists(select 1 from public.listing_inquiries where id=legacy_id and intro is null)
  then raise exception 'legacy null creation failed';end if;
  denied:=false;begin perform public.create_listing_inquiry(listing_id,'replacement');
  exception when others then if sqlerrm<>'VALIDATION_FAILED' then raise;end if;denied:=true;end;
  if not denied then raise exception 'legacy pending opening was replaced';end if;

  execute 'reset role';perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
  if exists(select 1 from public.listing_inquiries where apartment_id=listing_id) then raise exception 'outside inquiry disclosure';end if;
  execute 'reset role';execute 'set local role anon';
  denied:=false;begin perform public.create_listing_inquiry(listing_id,'anon');exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'anonymous overload allowed';end if;
  denied:=false;begin perform public.create_listing_inquiry(listing_id);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'anonymous wrapper allowed';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role authenticated';
  denied:=false;begin perform public.create_listing_inquiry(listing_id,'no session');
  exception when others then if sqlerrm<>'authentication required' then raise;end if;denied:=true;end;
  if not denied then raise exception 'null session allowed';end if;

  execute 'reset role';
  if (select count(*) from public.conversations)<>before_chats or exists(select 1 from public.listing_inquiries where apartment_id=listing_id and conversation_id is not null)
  then raise exception 'sending created a conversation';end if;
  -- Existing terminal state never becomes pending or loses its original text.
  update public.listing_inquiries set status='declined' where id=inquiry_id;
  perform set_config('request.jwt.claim.sub',requester::text,true);execute 'set local role authenticated';
  if public.create_listing_inquiry(listing_id,intro_text)<>inquiry_id or not exists(select 1 from public.listing_inquiries where id=inquiry_id and status='declined' and intro=intro_text)
  then raise exception 'terminal inquiry revived';end if;
  execute 'reset role';
end;
$test$;
rollback;
