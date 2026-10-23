begin;
-- Keep cards after a listing disappears: only the public reference persists.
alter table public.messages add column listing_id uuid;
alter table public.messages drop constraint messages_kind_check;
alter table public.messages drop constraint messages_sender_kind_check;
alter table public.messages add constraint messages_kind_check check(kind in ('user','system','listing'));
alter table public.messages add constraint messages_sender_kind_check check(
 (kind in ('user','listing') and sender_id is not null) or (kind='system' and sender_id is null));
alter table public.messages add constraint messages_listing_reference_check check(
 (kind='listing' and listing_id is not null and body='Apartment · דירה') or
 (kind<>'listing' and listing_id is null));
-- Existing direct column grants/policy remain text-only. Only this validated RPC
-- can write a listing reference; it reuses sequencing, history and block checks.
create function public.send_listing_card(p_conversation_id uuid,p_listing_id uuid,p_request_key uuid)
returns setof public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_request_key is null or p_listing_id is null then raise exception 'VALIDATION_FAILED'; end if;
 if not public.is_conversation_member(p_conversation_id) then raise exception 'NOT_FOUND'; end if;
 perform 1 from public.conversations where id=p_conversation_id for update;
 if not public.is_conversation_member(p_conversation_id) then raise exception 'NOT_FOUND'; end if;
 select * into result from public.messages where conversation_id=p_conversation_id
  and sender_id=auth.uid() and request_key=p_request_key;
 if found then
  if result.kind<>'listing' or result.listing_id is distinct from p_listing_id then raise exception 'VERSION_CONFLICT'; end if;
  return next result; return;
 end if;
 if not exists(select 1 from public.apartments_public where id=p_listing_id) then raise exception 'LISTING_UNAVAILABLE'; end if;
 insert into public.messages(conversation_id,sender_id,kind,body,listing_id,request_key)
 values(p_conversation_id,auth.uid(),'listing','Apartment · דירה',p_listing_id,p_request_key)
 returning * into result;
 return next result;
end $$;
revoke all on function public.send_listing_card(uuid,uuid,uuid) from public,anon;
grant execute on function public.send_listing_card(uuid,uuid,uuid) to authenticated;
-- Text/card request keys share one namespace; a retry must match its kind too.
create or replace function public.send_chat_message(p_conversation_id uuid,p_body text,p_request_key uuid)
returns setof public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.is_conversation_member(p_conversation_id) then raise exception 'NOT_FOUND'; end if;
 if p_request_key is null or p_body is null or length(btrim(p_body)) not between 1 and 2000 then raise exception 'VALIDATION_FAILED'; end if;
 perform 1 from public.conversations where id=p_conversation_id for update;
 if not public.is_conversation_member(p_conversation_id) then raise exception 'NOT_FOUND'; end if;
 insert into public.messages(conversation_id,sender_id,body,request_key)
 values(p_conversation_id,auth.uid(),btrim(p_body),p_request_key)
 on conflict(conversation_id,sender_id,request_key) where request_key is not null do nothing returning * into result;
 if not found then
  select * into result from public.messages where conversation_id=p_conversation_id and sender_id=auth.uid() and request_key=p_request_key;
  if result.kind<>'user' or result.listing_id is not null or result.body is distinct from btrim(p_body) then raise exception 'VERSION_CONFLICT'; end if;
 end if;
 return next result;
end $$;
revoke all on function public.send_chat_message(uuid,text,uuid) from public,anon;
grant execute on function public.send_chat_message(uuid,text,uuid) to authenticated;
-- Anonymous catalog is an explicit bounded allowlist, matching public detail.
create function public.list_public_listings(p_page integer default 1)
returns table(id uuid,title text,photos text[],min_room_price integer,max_room_price integer,
 available_room_count integer,bedrooms integer,available_from date,bills_included boolean,is_sublet boolean,public_location_label text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_page is null or p_page not between 1 and 1000 then raise exception 'VALIDATION_FAILED';end if;
 return query select a.id,a.title,a.photos[1:1],a.min_room_price,a.max_room_price,a.available_room_count,
 a.bedrooms,a.available_from,a.bills_included,a.is_sublet,a.public_location_label
 from public.apartments_public a order by a.created_at desc,a.id desc limit 13 offset ((p_page-1)*12);
end $$;
revoke all on function public.list_public_listings(integer) from public,anon,authenticated;
grant execute on function public.list_public_listings(integer) to anon,authenticated;
commit;
