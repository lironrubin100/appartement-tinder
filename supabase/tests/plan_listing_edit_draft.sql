-- Disposable fixtures: no hosted fault trigger or Storage metadata mutation.
create function public.qa_fail_edit_draft_seed() returns trigger language plpgsql as $$
begin if new.fields->>'title'='Fault injection private edit' and jsonb_array_length(new.photos)>0 then raise exception 'QA_SEED_FAILURE'; end if; return new; end $$;
create trigger qa_fail_edit_draft_seed after update of photos on public.listing_drafts for each row execute function public.qa_fail_edit_draft_seed();
do $test$
declare
  actor constant uuid:='00000000-0000-4000-8000-000000000008';
  foreign_actor constant uuid:='00000000-0000-4000-8000-000000000007';
  listing constant uuid:='41500000-0000-4000-8000-000000000001';
  broken constant uuid:='41500000-0000-4000-8000-000000000002';
  request constant uuid:='41500000-0000-4000-8000-000000000003';
  fault_request constant uuid:='41500000-0000-4000-8000-000000000004';
  prefix constant text:='https://npbduvjnqnbydolmdpsc.supabase.co/storage/v1/object/public/apartment-photos/';
  d public.listing_drafts; again public.listing_drafts; before_public jsonb; before_rooms jsonb; saved jsonb; caught boolean;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms,bills_included,is_sublet,available_from,description,photos)
  values(listing,actor,'user','Private edit source','PRIVATE SEED ADDRESS',31.25,34.79,2100,2,true,true,'2026-12-01','Source description',array[prefix||listing::text||'/1.jpg',prefix||listing::text||'/2.jpg',prefix||listing::text||'/3.jpg']),
        (broken,actor,'user','Fault injection private edit','PRIVATE FAULT ADDRESS',31.25,34.79,2100,1,false,false,'2026-12-01',null,array[prefix||listing::text||'/1.jpg']);
  insert into public.apartment_rooms(id,apartment_id,label,monthly_price,available_from,is_available,created_at)
  values('41500000-0000-4000-8000-000000000011',listing,'Preserved available',2100,'2026-12-02',true,'2026-10-23T00:00:00Z'),
        ('41500000-0000-4000-8000-000000000012',listing,null,2600,'2026-12-03',false,'2026-10-23T00:00:00Z');
  insert into storage.objects(id,bucket_id,name,owner_id)
  select ('41500000-0000-4000-8000-'||lpad((20+i)::text,12,'0'))::uuid,'apartment-photos',listing::text||'/'||i||'.jpg',actor::text from generate_series(1,3) i;
  select to_jsonb(a) into before_public from public.apartments a where id=listing;
  select jsonb_agg(to_jsonb(r) order by id) into before_rooms from public.apartment_rooms r where apartment_id=listing;
  perform set_config('request.jwt.claim.sub',actor::text,true); execute 'set local role authenticated';
  d:=public.open_listing_edit_draft(listing,request);
  if d.owner_id<>actor or d.source_listing_id<>listing or d.source_revision<>0 or d.state<>'open' or d.revision<>1
    or d.fields->>'isSublet'<>'true' or d.fields ? 'address' or d.fields ? 'ownerId'
    or d.fields#>>'{rooms,0,id}'<>'41500000-0000-4000-8000-000000000011'
    or d.fields#>>'{rooms,0,monthlyPrice}'<>'2100' or d.fields#>>'{rooms,0,availableFrom}'<>'2026-12-02'
    or d.fields#>>'{rooms,1,isAvailable}'<>'false' or d.fields#>'{rooms,1,label}'<>'null'::jsonb
    or d.photos<>public.get_owned_listing_editor(listing)->'photos' then raise exception 'incomplete private initial snapshot'; end if;
  again:=public.open_listing_edit_draft(listing,request);
  if to_jsonb(again)<>to_jsonb(d) then raise exception 'same-key replay changed draft'; end if;
  saved:=jsonb_set(jsonb_set(d.fields,'{title}','"Private unsaved title"'),'{rooms,0,monthlyPrice}','"2999"');
  d:=public.save_listing_draft(d.id,d.revision,saved);
  again:=public.open_listing_edit_draft(listing,gen_random_uuid());
  if to_jsonb(again)<>to_jsonb(d) then raise exception 'new-key reopen overwrote private work'; end if;
  if (select to_jsonb(a) from public.apartments a where id=listing)<>before_public
    or (select jsonb_agg(to_jsonb(r) order by id) from public.apartment_rooms r where apartment_id=listing)<>before_rooms
    then raise exception 'draft creation/save changed public listing/rooms'; end if;
  caught:=false;
  begin perform public.open_listing_edit_draft(broken,request); exception when others then if sqlerrm<>'IMPORT_CONFLICT' then raise; end if; caught:=true; end;
  if not caught then raise exception 'request key reused for different source'; end if;
  caught:=false;
  begin perform public.open_listing_edit_draft(broken,fault_request); exception when others then if sqlerrm<>'QA_SEED_FAILURE' then raise; end if; caught:=true; end;
  if not caught or exists(select 1 from public.listing_drafts where import_receipt_id=fault_request) then raise exception 'late seed failure left partial draft/receipt'; end if;
  -- Changes elsewhere do not refresh the private input or original source CAS.
  update public.apartments set status='taken' where id=listing;
  again:=public.open_listing_edit_draft(listing,request);
  if to_jsonb(again)<>to_jsonb(d) or again.source_revision<>0 then raise exception 'source change overwrote original private version'; end if;
  execute 'reset role';
  update public.listing_drafts set state='completed' where id=d.id;
  execute 'set local role authenticated';
  caught:=false;
  begin perform public.open_listing_edit_draft(listing,request); exception when others then if sqlerrm<>'DRAFT_CLOSED' then raise; end if; caught:=true; end;
  if not caught then raise exception 'closed request resurrected'; end if;
  again:=public.open_listing_edit_draft(listing,gen_random_uuid());
  if again.id=d.id or again.source_revision<>1 or again.fields->>'title'<>'Private edit source' then raise exception 'new edit did not start from current version'; end if;
  -- Foreign Storage ownership invalidates initialization and leaves no row.
  execute 'reset role';
  update public.listing_drafts set state='completed' where id=again.id;
  update storage.objects set owner_id=foreign_actor::text where name=listing::text||'/1.jpg';
  execute 'set local role authenticated';
  caught:=false;
  begin perform public.open_listing_edit_draft(listing,fault_request); exception when others then if sqlerrm not in ('INVALID_PHOTOS','PHOTO_UNAVAILABLE') then raise; end if; caught:=true; end;
  if not caught or exists(select 1 from public.listing_drafts where import_receipt_id=fault_request) then raise exception 'foreign photo produced partial draft'; end if;
  execute 'reset role';
  update storage.objects set owner_id=actor::text where name=listing::text||'/1.jpg';
  execute 'set local role authenticated';
  -- Preserve older incomplete/private drafts instead of silently reseeding them.
  d:=public.create_listing_draft(gen_random_uuid(),listing,0,'{"title":"Older private work"}');
  again:=public.open_listing_edit_draft(listing,gen_random_uuid());
  if to_jsonb(again)<>to_jsonb(d) then raise exception 'older draft was silently rewritten'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',foreign_actor::text,true); execute 'set local role authenticated';
  caught:=false;
  begin perform public.open_listing_edit_draft(listing,gen_random_uuid()); exception when others then if sqlerrm<>'SOURCE_UNAVAILABLE' then raise; end if; caught:=true; end;
  if not caught or exists(select 1 from public.listing_drafts where source_listing_id=listing) then raise exception 'foreign owner read/created private draft'; end if;
  execute 'reset role'; perform set_config('request.jwt.claim.sub','',true); execute 'set local role anon';
  caught:=false; begin perform public.open_listing_edit_draft(listing,gen_random_uuid()); exception when insufficient_privilege then caught:=true; end;
  if not caught then raise exception 'anonymous edit draft execution allowed'; end if;
  execute 'reset role';
  if has_function_privilege('anon','public.open_listing_edit_draft(uuid,uuid)','execute') then raise exception 'anonymous grant'; end if;
end $test$;
drop trigger qa_fail_edit_draft_seed on public.listing_drafts;
drop function public.qa_fail_edit_draft_seed();
