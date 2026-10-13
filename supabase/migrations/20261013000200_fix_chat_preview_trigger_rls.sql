-- A message insert is performed by an authenticated conversation member.
-- The trigger must be able to update the denormalized conversation preview,
-- while conversations intentionally have no client UPDATE policy.

begin;

create or replace function public.refresh_conversation_preview()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_body = new.body
  where id = new.conversation_id;
  return new;
end;
$fn$;

revoke all on function public.refresh_conversation_preview() from public, anon, authenticated;

commit;
