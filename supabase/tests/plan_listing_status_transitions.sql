begin;
-- Disposable failure injection proves parent status/revision and pending markers
-- share a transaction. This trigger/function disappear with the test rollback.
create function public.qa_fail_status_marker()returns trigger language plpgsql as $$
begin
 if current_setting('qa.status_fault',true)='on' and new.apartment_id='42020000-0000-4000-8000-000000000001'
 then raise exception 'QA_STATUS_FAULT';end if;
 return new;
end $$;
create trigger qa_status_fault after update of reconfirmation_required_at on public.listing_inquiries
for each row execute function public.qa_fail_status_marker();

do $test$
declare
 o uuid:='00000000-0000-4000-8000-000000000010';q uuid:='00000000-0000-4000-8000-000000000011';
 x uuid:='00000000-0000-4000-8000-000000000012';outsider uuid:='00000000-0000-4000-8000-000000000013';
 a uuid:='42020000-0000-4000-8000-000000000001';accepted_id uuid;pending_id uuid;chat_id uuid;
 before_parent jsonb;before_rooms jsonb;before_inquiries jsonb;before_chat jsonb;marker timestamptz;
 result jsonb;again jsonb;revision_before integer;denied boolean;restricted text;
begin
 insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
 values(a,o,'user','Status transition QA','No real address',31.25,34.79,1800,2);
 insert into public.apartment_rooms(apartment_id,label,monthly_price,available_from,is_available)
 values(a,'Open',1800,'2026-12-01',true),(a,'Closed',2100,'2027-01-01',false);
 perform set_config('request.jwt.claim.sub',q::text,true);execute 'set local role authenticated';accepted_id:=public.create_listing_inquiry(a,'Accepted original');execute 'reset role';
 perform set_config('request.jwt.claim.sub',x::text,true);execute 'set local role authenticated';pending_id:=public.create_listing_inquiry(a,'Pending original');execute 'reset role';
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';chat_id:=public.accept_listing_inquiry(accepted_id);execute 'reset role';
 select to_jsonb(t)-array['status','revision'] into before_parent from public.apartments t where id=a;
 select jsonb_agg(to_jsonb(t)order by id)into before_rooms from public.apartment_rooms t where apartment_id=a;
 select jsonb_build_object('inquiry',(select to_jsonb(i)from public.listing_inquiries i where id=accepted_id),
 'members',(select jsonb_agg(to_jsonb(m)order by user_id)from public.conversation_members m where conversation_id=chat_id),
 'messages',(select jsonb_agg(to_jsonb(m)order by id)from public.messages m where conversation_id=chat_id))into before_chat;
 select revision into revision_before from public.apartments where id=a;
 perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.set_owned_listing_status(a,'taken');exception when others then if sqlerrm<>'NOT_FOUND'then raise;end if;denied:=true;end;if not denied then raise exception'Foreign status RPC';end if;
 update public.apartments set status='taken'where id=a;if found then raise exception'Foreign direct status write';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.set_owned_listing_status(a,'paused');exception when others then if sqlerrm<>'VALIDATION_FAILED'then raise;end if;denied:=true;end;if not denied then raise exception'Invalid status';end if;
 denied:=false;begin perform public.set_owned_listing_status('42020000-0000-4000-8000-000000000099','active');exception when others then if sqlerrm<>'NOT_FOUND'then raise;end if;denied:=true;end;if not denied then raise exception'Unknown status target';end if;
 result:=public.set_owned_listing_status(a,'taken');again:=public.set_owned_listing_status(a,'taken');
 if result<>again or result->>'status'<>'taken' or(result->>'revision')::integer<>revision_before+1 or(result->>'pendingReconfirmationCount')::integer<>1 then raise exception'Taken retry/revision/marker';end if;
 execute 'reset role';select reconfirmation_required_at into marker from public.listing_inquiries where id=pending_id;if marker is null then raise exception'Missing pending marker';end if;
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
 result:=public.set_owned_listing_status(a,'active');again:=public.set_owned_listing_status(a,'active');
 if result<>again or(result->>'revision')::integer<>revision_before+2 then raise exception'Reopen retry/revision';end if;
 denied:=false;begin perform public.accept_listing_inquiry(pending_id);exception when others then if sqlerrm not like '%reconfirm%'then raise;end if;denied:=true;end;if not denied then raise exception'Reopen bypassed requester reconfirmation';end if;
 execute 'reset role';
 if before_parent is distinct from(select to_jsonb(t)-array['status','revision']from public.apartments t where id=a)
 or before_rooms is distinct from(select jsonb_agg(to_jsonb(t)order by id)from public.apartment_rooms t where apartment_id=a)
 or marker is distinct from(select reconfirmation_required_at from public.listing_inquiries where id=pending_id)
 then raise exception'Reopen changed date/location/intake/rooms/pending marker';end if;
 perform set_config('request.jwt.claim.sub',q::text,true);execute 'set local role authenticated';if not exists(select 1 from public.listing_address_access where apartment_id=a)then raise exception'Accepted address lost';end if;execute 'reset role';
 perform set_config('request.jwt.claim.sub',x::text,true);execute 'set local role authenticated';if exists(select 1 from public.listing_address_access where apartment_id=a)then raise exception'Pending granted address';end if;
 perform public.transition_listing_inquiry(pending_id,'reconfirm');execute 'reset role';
 select to_jsonb(t)into before_parent from public.apartments t where id=a;
 select jsonb_agg(to_jsonb(t)order by id)into before_inquiries from public.listing_inquiries t where apartment_id=a;
 perform set_config('qa.status_fault','on',true);perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.set_owned_listing_status(a,'taken');exception when others then if sqlerrm<>'QA_STATUS_FAULT'then raise;end if;denied:=true;end;if not denied then raise exception'Failure injection absent';end if;
 execute 'reset role';perform set_config('qa.status_fault','off',true);
 if before_parent is distinct from(select to_jsonb(t)from public.apartments t where id=a)
 or before_inquiries is distinct from(select jsonb_agg(to_jsonb(t)order by id)from public.listing_inquiries t where apartment_id=a)then raise exception'Partial status/marker after rollback';end if;
 -- The deployed legacy direct update remains compatible and cannot bypass D18.
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
 update public.apartments set status='taken'where id=a;update public.apartments set status='active'where id=a;
 execute 'reset role';if not exists(select 1 from public.listing_inquiries where id=pending_id and reconfirmation_required_at is not null and intro='Pending original')then raise exception'Legacy status bypassed marker';end if;
 -- Inventory/intake are not silently reopened, even when zero rooms are open.
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';perform public.set_owned_listing_intake(a,false);
 execute 'reset role';update public.apartment_rooms set is_available=false where apartment_id=a;
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';perform public.set_owned_listing_status(a,'taken');perform public.set_owned_listing_status(a,'active');execute 'reset role';
 if(select inquiries_open from public.apartments where id=a)or exists(select 1 from public.apartment_rooms where apartment_id=a and is_available)then raise exception'Status reopened intake/inventory';end if;
 foreach restricted in array array['flagged','paused']loop
  update public.apartments set status=restricted where id=a;
  perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
  denied:=false;begin perform public.set_owned_listing_status(a,'active');exception when others then if sqlerrm<>'STATE_UNAVAILABLE'then raise;end if;denied:=true;end;if not denied then raise exception'Restriction RPC bypass';end if;
  denied:=false;begin update public.apartments set status='taken'where id=a;exception when others then if sqlerrm<>'STATE_UNAVAILABLE'then raise;end if;denied:=true;end;if not denied then raise exception'Restriction direct laundering';end if;
  execute 'reset role';if(select status from public.apartments where id=a)<>restricted then raise exception'Restriction lost';end if;
 end loop;
 update public.apartments set status='taken',created_at=now()-interval '45 days'where id=a;
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.set_owned_listing_status(a,'active');exception when others then if sqlerrm<>'STATE_UNAVAILABLE'then raise;end if;denied:=true;end;if not denied then raise exception'Expired RPC reopen';end if;
 denied:=false;begin update public.apartments set status='active'where id=a;exception when others then if sqlerrm<>'STATE_UNAVAILABLE'then raise;end if;denied:=true;end;if not denied then raise exception'Expired direct reopen';end if;
 execute 'reset role';if(select created_at from public.apartments where id=a)<>now()-interval '45 days'then raise exception'Reopen renewed expiry';end if;
 update public.apartments set status='active',created_at=now()where id=a;update public.apartments set revision=2147483647 where id=a;
 perform set_config('request.jwt.claim.sub',o::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.set_owned_listing_status(a,'taken');exception when others then if sqlerrm<>'STATE_UNAVAILABLE'then raise;end if;denied:=true;end;if not denied then raise exception'Revision overflow';end if;
 execute 'reset role';
 if before_chat is distinct from(select jsonb_build_object('inquiry',(select to_jsonb(i)from public.listing_inquiries i where id=accepted_id),'members',(select jsonb_agg(to_jsonb(m)order by user_id)from public.conversation_members m where conversation_id=chat_id),'messages',(select jsonb_agg(to_jsonb(m)order by id)from public.messages m where conversation_id=chat_id)))then raise exception'Accepted history mutated';end if;
 execute 'set local role anon';denied:=false;begin perform public.set_owned_listing_status(a,'active');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception'Guest status RPC';end if;execute 'reset role';
 perform set_config('request.jwt.claim.sub','',true);execute 'set local role authenticated';denied:=false;begin perform public.set_owned_listing_status(a,'active');exception when others then if sqlerrm<>'AUTH_REQUIRED'then raise;end if;denied:=true;end;if not denied then raise exception'No-session status RPC';end if;execute 'reset role';
end $test$;
rollback;
