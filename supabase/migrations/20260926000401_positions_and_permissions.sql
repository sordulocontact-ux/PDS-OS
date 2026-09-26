-- Position ≠ permission ≠ authority (docs/CONTEXTE-PROJET.md § 12).
--
-- memberships.role now stores a POSITION only:
--   general_director   Directeur général
--   project_manager    Chef de projet
--   creative_director  Directeur créatif
-- What a position allows is decided in one place, role_permissions(). Every
-- check asks for a permission, never for a position name, so giving a
-- permission to another position is a one-line change here.
--
-- Permissions (V1 matrix):
--   administer       team, accounts, positions, global view
--   assign_projects  hand a project to a project manager
--   validate         decide every validation (the launch strategy included)
--   pilot_projects   receive, accept or refuse a project, then run it
--   creative_work    work on assigned creative deliverables, submit versions
-- Only "administer" is enforced so far; the others are declared for the next
-- steps (project assignment, validations, creative deliverables).

-- ---------------------------------------------------------------------------
-- Positions
-- ---------------------------------------------------------------------------

alter table public.memberships drop constraint memberships_role_check;

-- Renaming in place: the last-admin guard (still the old version here) would
-- read general_director as a demotion, and the decision date would move. Both
-- triggers are paused for the rename only; the journal still records it.
alter table public.memberships disable trigger c_guard_last_admin;
alter table public.memberships disable trigger b_before_write;
update public.memberships set role = 'general_director' where role = 'admin';
update public.memberships set role = 'creative_director' where role = 'artistic_director';
alter table public.memberships enable trigger b_before_write;
alter table public.memberships enable trigger c_guard_last_admin;

alter table public.memberships
  add constraint memberships_role_check
    check (role in ('general_director', 'project_manager', 'creative_director'));

-- ---------------------------------------------------------------------------
-- Position → permissions: the single mapping
-- ---------------------------------------------------------------------------

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then array['administer', 'assign_projects', 'validate']
    when 'project_manager' then array['pilot_projects']
    when 'creative_director' then array['creative_work']
    else array[]::text[]
  end;
$$;

revoke execute on function public.role_permissions(text) from public, anon, authenticated;
grant execute on function public.role_permissions(text) to authenticated;

-- Does the logged-in account hold this permission in the organization?
-- Same access rule as is_active_member: approved membership bound to this very
-- account, account not disabled.
create or replace function public.has_permission(org_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.accounts a on a.id = m.approved_account_id
    where a.id = auth.uid()
      and a.disabled_at is null
      and m.organization_id = org_id
      and m.status = 'approved'
      and p_permission = any (public.role_permissions(m.role))
  );
$$;

revoke execute on function public.has_permission(uuid, text) from public, anon, authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Identity foundation: "admin" now means "holds administer"
-- ---------------------------------------------------------------------------

-- Kept under its name: every RLS policy of the foundation calls it.
create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission(org_id, 'administer');
$$;

create or replace function public.usable_admin_count(
  org_id uuid,
  exclude_membership_id uuid default null,
  exclude_account_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.memberships m
  join public.accounts a on a.id = m.approved_account_id
  where m.organization_id = org_id
    and m.status = 'approved'
    and 'administer' = any (public.role_permissions(m.role))
    and a.disabled_at is null
    and (exclude_membership_id is null or m.id <> exclude_membership_id)
    and (exclude_account_id is null or a.id <> exclude_account_id);
$$;

revoke execute on function public.usable_admin_count(uuid, uuid, uuid) from public, anon, authenticated;

-- T4 — never zero usable administrator.
create or replace function public.memberships_guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_usable boolean;
  v_still_usable boolean;
begin
  perform 1 from public.organizations o where o.id = old.organization_id for update;

  v_was_usable := old.status = 'approved'
    and 'administer' = any (public.role_permissions(old.role))
    and old.approved_account_id is not null
    and exists (
      select 1 from public.accounts a
      where a.id = old.approved_account_id and a.disabled_at is null
    );

  if v_was_usable then
    if tg_op = 'DELETE' then
      v_still_usable := false;
    else
      v_still_usable := new.status = 'approved'
        and 'administer' = any (public.role_permissions(new.role))
        and new.approved_account_id is not null;
    end if;

    if not v_still_usable
       and public.usable_admin_count(old.organization_id, old.id, null) = 0 then
      raise exception 'last_usable_admin';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.memberships_guard_last_admin() from public, anon, authenticated;

-- T8 — no disabling the last usable administrator.
create or replace function public.accounts_guard_disable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  if new.disabled_at is not null and old.disabled_at is null then
    for v_org_id in
      select m.organization_id
      from public.memberships m
      where m.approved_account_id = old.id
        and m.status = 'approved'
        and 'administer' = any (public.role_permissions(m.role))
    loop
      perform 1 from public.organizations o where o.id = v_org_id for update;
      if public.usable_admin_count(v_org_id, null, old.id) = 0 then
        raise exception 'last_usable_admin';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

revoke execute on function public.accounts_guard_disable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- T10 — bootstrap gives the general director position
-- ---------------------------------------------------------------------------
-- Same as 20260926000201, the bootstrap position renamed.

create or replace function public.auth_users_handle_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_person_id uuid;
  v_first text;
  v_last text;
  v_org public.organizations%rowtype;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;
  if exists (select 1 from public.accounts a where a.id = new.id) then
    return new;
  end if;

  v_email := public.normalize_email(new.email);
  if v_email is null or v_email = '' then
    return new;
  end if;

  select p.id into v_person_id from public.people p where p.email = v_email;

  if v_person_id is null then
    v_first := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
    v_last := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
    if v_first is null then
      v_first := split_part(v_email, '@', 1);
    end if;
    insert into public.people (email, first_name, last_name)
    values (v_email, v_first, v_last)
    returning id into v_person_id;
  end if;

  insert into public.accounts (id, person_id) values (new.id, v_person_id);

  select * into v_org from public.organizations o where o.slug = 'pds';

  if v_org.bootstrap_completed_at is null
     and v_org.bootstrap_admin_email is not null
     and v_org.bootstrap_admin_email = v_email then
    perform set_config('po.event_source', 'bootstrap', true);
    insert into public.memberships
      (organization_id, person_id, role, status, approved_account_id, decision_note)
    values
      (v_org.id, v_person_id, 'general_director', 'approved', new.id, 'Bootstrap initial')
    on conflict (organization_id, person_id) do update
      set role = 'general_director',
          status = 'approved',
          approved_account_id = excluded.approved_account_id,
          decision_note = 'Bootstrap initial';
    update public.organizations
       set bootstrap_completed_at = now()
     where id = v_org.id;
  else
    perform set_config('po.event_source', 'system', true);
    update public.memberships m
       set status = 'approved', decision_note = null
     where m.organization_id = v_org.id
       and m.person_id = v_person_id
       and m.status = 'invited';
    if not found then
      insert into public.memberships (organization_id, person_id, status)
      values (v_org.id, v_person_id, 'pending')
      on conflict (organization_id, person_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.auth_users_handle_confirmed() from public, anon, authenticated;
grant execute on function public.auth_users_handle_confirmed() to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- invite_member — creating accounts requires "administer"
-- ---------------------------------------------------------------------------

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
  if p_role is null
     or p_role not in ('general_director', 'project_manager', 'creative_director') then
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

-- ---------------------------------------------------------------------------
-- get_my_access — also returns the permissions, computed here
-- ---------------------------------------------------------------------------
-- The application reads permissions from this answer and never maps a
-- position to a right itself.

create or replace function public.get_my_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_person public.people%rowtype;
  v_membership public.memberships%rowtype;
  v_state text;
begin
  if v_uid is null then
    return jsonb_build_object('state', 'anonymous');
  end if;

  select * into v_account from public.accounts a where a.id = v_uid;
  if not found then
    return jsonb_build_object('state', 'unlinked');
  end if;

  select * into v_person from public.people p where p.id = v_account.person_id;

  select m.* into v_membership
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.person_id = v_account.person_id
    and o.slug = 'pds';

  if v_account.disabled_at is not null then
    v_state := 'disabled';
  elsif not found then
    v_state := 'pending';
  elsif v_membership.status = 'approved' and v_membership.approved_account_id = v_uid then
    v_state := 'approved';
  elsif v_membership.status = 'approved' then
    v_state := 'pending';
  else
    v_state := v_membership.status;
  end if;

  return jsonb_build_object(
    'state', v_state,
    'role', v_membership.role,
    'permissions', case when v_state = 'approved'
                        then to_jsonb(public.role_permissions(v_membership.role))
                        else '[]'::jsonb end,
    'person_id', v_person.id,
    'organization_id', v_membership.organization_id,
    'first_name', v_person.first_name,
    'last_name', v_person.last_name
  );
end;
$$;

revoke execute on function public.get_my_access() from public, anon, authenticated;
grant execute on function public.get_my_access() to authenticated;
