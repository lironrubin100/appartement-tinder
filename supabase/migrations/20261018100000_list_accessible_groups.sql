-- Chats must not query the protected groups table directly. Return only group
-- metadata for groups the signed-in caller may access through the lifecycle
-- policy, keeping roster and non-member groups private.
create or replace function public.list_accessible_groups()
returns table(
  id uuid,
  name text,
  admin_id uuid,
  admission_policy text,
  membership_version bigint
)
language sql stable security definer set search_path='' as $$
  select g.id,g.name,g.admin_id,g.admission_policy,g.membership_version
  from public.groups g
  where auth.uid() is not null and public.can_access_group(g.id)
  order by g.created_at, g.id;
$$;

revoke all on function public.list_accessible_groups() from public,anon;
grant execute on function public.list_accessible_groups() to authenticated;
