do $test$
declare actor constant uuid:='00000000-0000-4000-8000-000000000001'; outsider constant uuid:='00000000-0000-4000-8000-000000000002'; d public.listing_drafts; caught boolean;
begin
  perform set_config('request.jwt.claim.sub',actor::text,true); execute 'set local role authenticated';
  d:=public.create_listing_draft();
  if public.verify_listing_draft_publication_snapshot(d.id,0,'{}') then raise exception 'unfrozen proof'; end if;
  d:=public.begin_listing_draft_publication(d.id,0,'{"title":"bound","photos":["a","b"]}');
  if not public.verify_listing_draft_publication_snapshot(d.id,0,'{"photos":["a","b"],"title":"bound"}') then raise exception 'jsonb canonical proof'; end if;
  if public.verify_listing_draft_publication_snapshot(d.id,0,'{"title":"different","photos":["a","b"]}') then raise exception 'wrong source proof'; end if;
  if public.verify_listing_draft_publication_snapshot(d.id,1,'{"title":"bound","photos":["a","b"]}') then raise exception 'stale revision proof'; end if;
  if (select state from public.listing_drafts where id=d.id)<>'open' then raise exception 'proof changed lifecycle'; end if;
  execute 'reset role'; perform set_config('request.jwt.claim.sub',outsider::text,true); execute 'set local role authenticated';
  if public.verify_listing_draft_publication_snapshot(d.id,0,'{"title":"bound","photos":["a","b"]}') then raise exception 'foreign proof'; end if;
  execute 'reset role'; perform set_config('request.jwt.claim.sub','',true); execute 'set local role anon';
  caught:=false; begin perform public.verify_listing_draft_publication_snapshot(d.id,0,'{}'); exception when insufficient_privilege then caught:=true; end;
  if not caught then raise exception 'anonymous proof'; end if;
  execute 'reset role';
end $test$;
