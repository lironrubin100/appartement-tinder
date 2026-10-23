-- Disposable synthetic fixtures; ordinary roles exercise the actual RPC/RLS.
do $test$
declare
 a uuid := '00000000-0000-4000-8000-000000000002';
 b uuid := '00000000-0000-4000-8000-000000000003';
 outsider uuid := '00000000-0000-4000-8000-000000000004';
 cid uuid := '51000000-0000-4000-8000-000000000001';
 lid uuid := '51000000-0000-4000-8000-000000000002';
 req uuid := '51000000-0000-4000-8000-000000000003';
 snapshot jsonb; card public.messages%rowtype; again public.messages%rowtype; denied boolean; n bigint;
begin
 insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,photos)
 values(lid,a,'user','Public share fixture','PRIVATE CARD ADDRESS',31.25,34.79,2100,2,'{}');
 insert into public.apartment_rooms(apartment_id,monthly_price,is_available,available_from) values(lid,2100,true,'2026-12-01');
 insert into public.conversations(id) values(cid);
 insert into public.conversation_members(conversation_id,user_id) values(cid,a),(cid,b);
 perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 select * into card from public.send_listing_card(cid,lid,req);
 select * into again from public.send_listing_card(cid,lid,req);
 if card.id<>again.id or card.kind<>'listing' or card.listing_id<>lid or card.body<>'Apartment · דירה' then raise exception 'bad card or duplicate'; end if;
 denied:=false;begin perform public.send_chat_message(cid,card.body,req);exception when others then denied:=true;end;
 if not denied then raise exception 'card/text key collision accepted';end if;
 denied:=false;begin perform public.send_listing_card(cid,'51000000-0000-4000-8000-000000000099',gen_random_uuid());exception when others then denied:=true;end;
 if not denied then raise exception 'missing listing accepted';end if;
 execute 'reset role';
 if (select count(*) from public.saves where apartment_id=lid)<>0 or (select count(*) from public.listing_inquiries where apartment_id=lid)<>0 then raise exception 'share created save or inquiry';end if;
 if (select count(*) from public.messages where conversation_id=cid)<>1 then raise exception 'duplicate/invalid message persisted';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);execute 'set local role authenticated';
 if (select count(*) from public.messages where id=card.id)<>1 then raise exception 'recipient cannot read';end if;
 execute 'reset role';
 update public.conversation_members set visible_after_seq=card.message_seq where conversation_id=cid and user_id=b;
 execute 'set local role authenticated';
 if (select count(*) from public.messages where id=card.id)<>0 then raise exception 'prejoin history leaked';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.send_listing_card(cid,lid,gen_random_uuid());exception when others then denied:=true;end;
 if not denied or (select count(*) from public.messages where conversation_id=cid)<>0 then raise exception 'outsider access';end if;
 execute 'reset role';
 insert into public.blocks(blocker_id,blocked_id) values(a,b);
 perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.send_listing_card(cid,lid,gen_random_uuid());exception when others then denied:=true;end;
 if not denied then raise exception 'blocked send';end if;
 execute 'reset role';delete from public.blocks where blocker_id=a and blocked_id=b;
 update public.apartments set status='taken' where id=lid;
 execute 'set local role authenticated';
 -- Lost successful reply can reconcile even after the listing becomes unavailable.
 select * into again from public.send_listing_card(cid,lid,req);
 if again.id<>card.id then raise exception 'unavailable retry duplicated';end if;
 denied:=false;begin perform public.send_listing_card(cid,lid,gen_random_uuid());exception when others then denied:=true;end;
 if not denied then raise exception 'new unavailable card accepted';end if;
 execute 'reset role';
 update public.apartments set status='active' where id=lid;
 perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
 select to_jsonb(c) into snapshot from public.list_public_listings(1) c limit 1;
 if snapshot is null or snapshot ?| array['address','lat','lng','lister_id','revision','description'] or snapshot::text like '%PRIVATE%' then raise exception 'unsafe guest catalog';end if;
 if (select count(*) from public.list_public_listings(1))>13 then raise exception 'unbounded guest page';end if;
 execute 'reset role';
 if has_function_privilege('anon','public.send_listing_card(uuid,uuid,uuid)','execute') or has_column_privilege('authenticated','public.messages','listing_id','insert') then raise exception 'unvalidated card write allowed';end if;
end $test$;
