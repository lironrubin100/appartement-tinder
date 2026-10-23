begin;
-- Source fidelity on reconciliation: never infer that the current draft was
-- published merely because an older/direct caller bound some other payload.
-- Invoker + owner SELECT/RLS; no receipt/table privilege is widened.
create function public.verify_listing_draft_publication_snapshot(p_draft_id uuid,p_expected_revision integer,p_payload jsonb)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.listing_drafts d
    where d.id=p_draft_id and d.owner_id=(select auth.uid()) and d.revision=p_expected_revision
      and d.state in ('open','completed') and d.publication_started_at is not null
      and jsonb_typeof(p_payload)='object'
      and d.publication_payload_hash=pg_catalog.sha256(pg_catalog.convert_to(p_payload::text,'UTF8')))
$$;
revoke all on function public.verify_listing_draft_publication_snapshot(uuid,integer,jsonb) from public,anon;
grant execute on function public.verify_listing_draft_publication_snapshot(uuid,integer,jsonb) to authenticated;
commit;
