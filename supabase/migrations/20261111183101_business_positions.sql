-- Business module, lot BIZ 1 (ticket « Module Business, négociations et
-- Business Manager », Ibé 10/11/2026; Notion épic « Module Business et
-- négociations »): two new positions.
--
--   business_manager — Glen: negotiates the deals assigned to him (the artists
--                      of a PDS MIC first), never writes on a project.
--   business         — Thibault: business development and brand partnerships
--                      (his CRM comes later, BIZ 11).
--
-- Both hold the new permission « negotiate » (what the deals of BIZ 2 will
-- test) and « manage_network » (they work with the Réseau's people, as the
-- creative director does). Reading artists' budgets comes with BUD 2.
-- A position is still never tested by name: the app reads permissions.

alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships
  add constraint memberships_role_check
    check (role in ('general_director', 'project_manager', 'creative_director',
                    'business_manager', 'business'));

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network']
    when 'business' then array['negotiate', 'manage_network']
    else array[]::text[]
  end;
$$;

-- invite_member listed the positions itself: it now asks the single mapping,
-- so a position without any permission is refused and a new one needs no
-- second edit here.
create or replace function public.invite_member(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_email text := public.normalize_email(p_email);
  v_first text := nullif(btrim(coalesce(p_first_name, '')), '');
  v_last text := nullif(btrim(coalesce(p_last_name, '')), '');
  v_person_id uuid;
  v_membership public.memberships%rowtype;
begin
  select o.id into v_org_id from public.organizations o where o.slug = 'pds';

  if v_org_id is null or not public.has_permission(v_org_id, 'administer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role is null or cardinality(public.role_permissions(p_role)) = 0 then
    raise exception 'invalid_role';
  end if;
  if v_email is null or v_email = '' or v_first is null then
    raise exception 'invalid_invitation';
  end if;

  select p.id into v_person_id from public.people p where p.email = v_email;

  if v_person_id is null then
    insert into public.people (email, first_name, last_name, created_by)
    values (v_email, v_first, v_last, public.auth_person_id())
    returning id into v_person_id;
  elsif exists (select 1 from public.accounts a where a.person_id = v_person_id) then
    raise exception 'person_has_account';
  end if;

  select m.* into v_membership
  from public.memberships m
  where m.organization_id = v_org_id and m.person_id = v_person_id;

  if not found then
    insert into public.memberships (organization_id, person_id, role, status)
    values (v_org_id, v_person_id, p_role, 'invited')
    returning * into v_membership;
  else
    update public.memberships
       set role = p_role, status = 'invited', decision_note = null
     where id = v_membership.id
    returning * into v_membership;
  end if;

  return v_membership.id;
end;
$$;

revoke execute on function public.invite_member(text, text, text, text) from public, anon, authenticated;
grant execute on function public.invite_member(text, text, text, text) to authenticated;
