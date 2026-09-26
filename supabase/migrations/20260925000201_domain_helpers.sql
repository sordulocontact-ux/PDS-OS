-- Domain helpers shared by every business table.
-- Same hygiene as the identity foundation: empty search_path, qualified
-- names, REVOKE FROM PUBLIC, explicit grants.

-- Author of a row, set by trigger from the session: never written by clients.
create or replace function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := public.auth_person_id();
  return new;
end;
$$;

revoke execute on function public.set_created_by() from public, anon, authenticated;

-- Safe text → uuid cast, used by storage policies on user-supplied paths.
create or replace function public.try_uuid(input text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return input::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke execute on function public.try_uuid(text) from public, anon;
grant execute on function public.try_uuid(text) to authenticated, service_role;

-- Current organization of the signed-in account (V1: a single organization).
create or replace function public.auth_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.memberships m
  join public.accounts a on a.id = m.approved_account_id
  where a.id = auth.uid()
    and a.disabled_at is null
    and m.status = 'approved'
  limit 1;
$$;

revoke execute on function public.auth_organization_id() from public, anon, authenticated;
grant execute on function public.auth_organization_id() to authenticated;
