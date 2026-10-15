begin;
create or replace function public.accept_listing_inquiry(p_inquiry_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_owner_id uuid := auth.uid();
  v_inquiry public.listing_inquiries%rowtype;
  v_lister_id uuid;
  v_conversation_id uuid;
begin
  if v_owner_id is null then raise exception 'authentication required'; end if;
  select i.* into v_inquiry from public.listing_inquiries i
    join public.apartments a on a.id = i.apartment_id
    where i.id = p_inquiry_id for update of i;
  select lister_id into v_lister_id from public.apartments where id = v_inquiry.apartment_id for update;
  if v_inquiry.id is null or v_lister_id is distinct from v_owner_id then raise exception 'not your inquiry'; end if;
  if v_inquiry.status = 'accepted' and v_inquiry.conversation_id is not null then return v_inquiry.conversation_id; end if;
  if v_inquiry.status <> 'pending' then raise exception 'inquiry is no longer pending'; end if;
  if not exists(select 1 from public.apartments where id=v_inquiry.apartment_id and status='active') or public.blocked_with(v_inquiry.requester_id) then raise exception 'listing or requester unavailable'; end if;
  insert into public.conversations default values returning id into v_conversation_id;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_lister_id), (v_conversation_id, v_inquiry.requester_id);
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (v_conversation_id, null, 'system', 'הפנייה אושרה. הכתובת המדויקת זמינה כעת בכרטיס למעלה.');
  update public.listing_inquiries set status = 'accepted', conversation_id = v_conversation_id, updated_at = now()
    where id = v_inquiry.id;
  return v_conversation_id;
end;
$fn$;


revoke insert,update,delete,truncate,references,trigger on public.listing_inquiries from authenticated,anon;
create or replace view public.listing_address_access with(security_barrier=true) as
select a.id as apartment_id,a.address,a.lat,a.lng from public.apartments a join public.listing_inquiries i on i.apartment_id=a.id where i.requester_id=auth.uid() and i.status='accepted' and not public.blocked_with(a.lister_id);
commit;
