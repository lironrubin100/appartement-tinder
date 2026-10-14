-- Public photo paths must not disclose the posting account UUID.
-- Storage assigns owner_id from the upload JWT; use that for authorization.
-- Existing owner-prefixed paths remain compatible with older clients.
alter policy "users upload their own apartment photos" on storage.objects
  to authenticated
  with check (bucket_id = 'apartment-photos' and owner_id = (select auth.uid()::text)
    and ((storage.foldername(name))[1] = (select auth.uid()::text)
      or name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-8]\.jpg$'));
alter policy "users update their own apartment photos" on storage.objects
  to authenticated
  using (bucket_id = 'apartment-photos' and owner_id = (select auth.uid()::text))
  with check (bucket_id = 'apartment-photos' and owner_id = (select auth.uid()::text));
alter policy "users delete their own apartment photos" on storage.objects
  to authenticated
  using (bucket_id = 'apartment-photos' and owner_id = (select auth.uid()::text));
