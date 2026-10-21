-- Disposable SQL harness fixtures only; the surrounding runner created the users.
do $test$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  outsider_id constant uuid := '00000000-0000-4000-8000-000000000007';
  own_listing constant uuid := '10000000-0000-4000-8000-000000000098';
  own_draft constant uuid := '10000000-0000-4000-8000-000000000091';
  second_draft constant uuid := '10000000-0000-4000-8000-000000000092';
  denied boolean;
begin
  insert into public.apartments(id,lister_id,source,title,address,lat,lng,price,bedrooms)
  values(own_listing,owner_id,'user','Draft fixture','Private address',31.25,34.79,2000,3);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  execute 'set local role authenticated';
  insert into public.listing_drafts(id,fields) values(own_draft,'{}'),(second_draft,'{"title":"unfinished"}');
  if (select count(*) from public.listing_drafts where id in (own_draft,second_draft)) <> 2 then
    raise exception 'owner cannot create and read two drafts';
  end if;
  insert into public.listing_drafts(source_listing_id,source_revision) values(own_listing,0);
  denied := false;
  begin insert into public.listing_drafts(source_listing_id,source_revision) values(own_listing,0);
  exception when unique_violation then denied := true; end;
  if not denied then raise exception 'duplicate open edit allowed'; end if;
  denied := false;
  begin update public.listing_drafts set owner_id=outsider_id where id=own_draft;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'owner can transfer ownership'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from public.listing_drafts where id in (own_draft,second_draft)) then
    raise exception 'outsider read owner drafts';
  end if;
  denied := false;
  begin insert into public.listing_drafts(source_listing_id,source_revision) values(own_listing,0);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'foreign listing used in edit draft'; end if;
  denied := false;
  begin update public.listing_drafts set fields='{}' where id=own_draft;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'outsider can modify draft'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role anon';
  denied := false;
  begin perform 1 from public.listing_drafts;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'anonymous can read drafts'; end if;
  denied := false;
  begin insert into public.listing_drafts(id) values(gen_random_uuid());
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'anonymous can create drafts'; end if;
  execute 'reset role';
  if exists(select 1 from pg_views where schemaname='public' and viewname in ('apartments_public','profiles_public') and definition ilike '%listing_drafts%') then
    raise exception 'drafts leaked into public projection';
  end if;
end
$test$;
