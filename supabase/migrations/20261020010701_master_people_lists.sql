-- Master: who the screens name (docs/projet-complet/master.md § 3, § 6, § 9).
-- A member reads only their own membership (RLS): the owner could not say
-- « En attente de Claire Morel » nor offer a member as in-house engineer.
-- Two listings for any active member of the organization, names only.

-- The direction (permission `validate`): who confirms a RIB, pays an
-- invoice, arbitrates a delay.
create or replace function public.list_direction_people(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
    from public.memberships m
    join public.people p on p.id = m.person_id
   where public.is_active_member(p_organization_id)
     and m.organization_id = p_organization_id and m.status = 'approved'
     and 'validate' = any (public.role_permissions(m.role))
   order by m.requested_at;
$$;
revoke execute on function public.list_direction_people(uuid) from public, anon;
grant execute on function public.list_direction_people(uuid) to authenticated;

-- The approved members: one of them may be the in-house engineer.
create or replace function public.list_member_people(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
    from public.memberships m
    join public.people p on p.id = m.person_id
   where public.is_active_member(p_organization_id)
     and m.organization_id = p_organization_id and m.status = 'approved'
   order by p.first_name, p.last_name;
$$;
revoke execute on function public.list_member_people(uuid) from public, anon;
grant execute on function public.list_member_people(uuid) to authenticated;
