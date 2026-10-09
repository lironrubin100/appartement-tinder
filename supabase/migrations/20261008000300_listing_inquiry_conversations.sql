-- F4 / D4: an accepted apartment inquiry creates one private conversation.
-- The exact address remains in listing_address_access; it is never copied into
-- a message body.
begin;

alter table public.listing_inquiries
  add column if not exists conversation_id uuid references public.conversations on delete set null;
create unique index if not exists listing_inquiries_conversation_id_key
  on public.listing_inquiries (conversation_id)
  where conversation_id is not null;

alter table public.messages
  add column if not exists kind text not null default 'user'
    check (kind in ('user', 'system'));
alter table public.messages
  alter column sender_id drop not null;
alter table public.messages
  drop constraint if exists messages_sender_kind_check;
alter table public.messages
  add constraint messages_sender_kind_check check (
    (kind = 'user' and sender_id is not null)
    or (kind = 'system' and sender_id is null)
  );

create or replace function public.create_listing_inquiry(p_apartment_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_requester_id uuid := auth.uid();
  v_inquiry_id uuid;
begin
  if v_requester_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.apartments a
    where a.id = p_apartment_id
      and a.status = 'active'
      and a.lister_id is not null
      and a.lister_id is distinct from v_requester_id
      and not public.blocked_with(a.lister_id)
  ) then
    raise exception 'listing is unavailable for contact';
  end if;

  insert into public.listing_inquiries (apartment_id, requester_id)
  values (p_apartment_id, v_requester_id)
  on conflict (apartment_id, requester_id) do update
    set updated_at = public.listing_inquiries.updated_at
  returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$fn$;

create or replace function public.accept_listing_inquiry(p_inquiry_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_owner_id uuid := auth.uid();
  v_inquiry public.listing_inquiries%rowtype;
  v_lister_id uuid;
  v_conversation_id uuid;
begin
  if v_owner_id is null then
    raise exception 'authentication required';
  end if;

  select i
    into v_inquiry
  from public.listing_inquiries i
  join public.apartments a on a.id = i.apartment_id
  where i.id = p_inquiry_id
  for update of i;

  select lister_id into v_lister_id
  from public.apartments
  where id = v_inquiry.apartment_id;

  if v_inquiry.id is null or v_lister_id is distinct from v_owner_id then
    raise exception 'not your inquiry';
  end if;

  if v_inquiry.status = 'accepted' and v_inquiry.conversation_id is not null then
    return v_inquiry.conversation_id;
  end if;

  if v_inquiry.status <> 'pending' then
    raise exception 'inquiry is no longer pending';
  end if;

  insert into public.conversations default values returning id into v_conversation_id;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_lister_id), (v_conversation_id, v_inquiry.requester_id);
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (v_conversation_id, null, 'system', 'הפנייה אושרה. הכתובת המדויקת זמינה כעת בכרטיס למטה.');
  update public.listing_inquiries
  set status = 'accepted', conversation_id = v_conversation_id, updated_at = now()
  where id = v_inquiry.id;

  return v_conversation_id;
end;
$fn$;

revoke all on function public.create_listing_inquiry(uuid) from public, anon;
grant execute on function public.create_listing_inquiry(uuid) to authenticated;
revoke all on function public.accept_listing_inquiry(uuid) from public, anon;
grant execute on function public.accept_listing_inquiry(uuid) to authenticated;

commit;
