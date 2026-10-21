begin;

create table public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  state text not null default 'open' check (state in ('open', 'completed')),
  source_listing_id uuid references public.apartments(id),
  source_revision integer check (source_revision >= 0),
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  publication_request_id uuid not null default gen_random_uuid() unique,
  import_receipt_id uuid,
  check ((source_listing_id is null and source_revision is null)
      or (source_listing_id is not null and source_revision is not null))
);

create unique index listing_drafts_one_open_edit_per_listing
  on public.listing_drafts(owner_id, source_listing_id)
  where state = 'open' and source_listing_id is not null;
create unique index listing_drafts_owner_import_receipt
  on public.listing_drafts(owner_id, import_receipt_id) where import_receipt_id is not null;
create index listing_drafts_owner_updated on public.listing_drafts(owner_id, updated_at desc, id);

alter table public.listing_drafts enable row level security;
revoke all on public.listing_drafts from public, anon, authenticated;
grant select on public.listing_drafts to authenticated;
-- Later revision-aware RPCs own updates, deletion, media, receipts and completion.
grant insert (id, fields, source_listing_id, source_revision) on public.listing_drafts to authenticated;
create policy listing_drafts_owner_read on public.listing_drafts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy listing_drafts_owner_create on public.listing_drafts for insert to authenticated
  with check (owner_id = (select auth.uid()) and (
    source_listing_id is null or exists (
      select 1 from public.apartments a
      where a.id = source_listing_id and a.lister_id = (select auth.uid())
    )
  ));

commit;
