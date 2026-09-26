-- Team positions and account creation by the general director.
--
-- 1. Positions. The role column now names a PDS position:
--      admin              = Directeur général : sees everything and is the only
--                           one who manages the team (the stored value stays
--                           'admin' so every access function and guard of the
--                           identity foundation keeps working unchanged);
--      project_manager    = Chef de projet;
--      artistic_director  = Directeur artistique.
--    Project managers and artistic directors keep today's member access. Finer
--    restrictions (budgets, own projects only…) wait for the business rules.
--
-- 2. Invitations. The director creates the account ahead of time: a Person
--    and a membership in the 'invited' status, with the chosen position. No
--    auth user is created here (that would need the service role, forbidden
--    on a user path): the person signs up with that address, and once the
--    address is confirmed the link trigger turns the invitation into an
--    approved access with the position already set. Confirming the address
--    proves the person owns the mailbox the director chose.

-- ---------------------------------------------------------------------------
-- Positions
-- ---------------------------------------------------------------------------

alter table public.memberships drop constraint memberships_role_check;

update public.memberships set role = 'project_manager' where role = 'member';

alter table public.memberships
  alter column role set default 'project_manager',
  add constraint memberships_role_check
    check (role in ('admin', 'project_manager', 'artistic_director'));

-- ---------------------------------------------------------------------------
-- Invited status
-- ---------------------------------------------------------------------------

alter table public.memberships drop constraint memberships_status_check;

alter table public.memberships
  add constraint memberships_status_check
    check (status in ('invited', 'pending', 'approved', 'rejected', 'suspended'));

-- An invitation only makes sense for someone without an account: a person who
-- already has one is approved from the team screen instead.
create or replace function public.memberships_guard_invited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'invited'
     and (tg_op = 'INSERT' or old.status <> 'invited')
     and exists (select 1 from public.accounts a where a.person_id = new.person_id) then
    raise exception 'person_has_account';
  end if;
  return new;
end;
$$;

revoke execute on function public.memberships_guard_invited() from public, anon, authenticated;

create trigger b_guard_invited
  before insert or update on public.memberships
  for each row execute function public.memberships_guard_invited();

-- ---------------------------------------------------------------------------
-- invite_member : called with the director's session (RLS stays the rule,
-- the function checks the director right itself before writing).
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

  if v_org_id is null or not public.is_org_admin(v_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('admin', 'project_manager', 'artistic_director') then
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
    -- Without an account, a membership is either invited or a cancelled
    -- invitation (rejected): both are (re)opened with the chosen position.
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
-- T10 — link on email confirmation, now honouring invitations
-- ---------------------------------------------------------------------------
-- Same as 20260925000110, with two changes: a self-signup gets the default
-- position, and an existing 'invited' membership is approved. This is the one
-- deliberate exception to invariant G besides the bootstrap: only a director
-- can create an invitation, for an address the person has just proved.

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
      (v_org.id, v_person_id, 'admin', 'approved', new.id, 'Bootstrap initial')
    on conflict (organization_id, person_id) do update
      set role = 'admin',
          status = 'approved',
          approved_account_id = excluded.approved_account_id,
          decision_note = 'Bootstrap initial';
    update public.organizations
       set bootstrap_completed_at = now()
     where id = v_org.id;
  else
    perform set_config('po.event_source', 'system', true);
    -- Invitation: approved with the position the director chose.
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
