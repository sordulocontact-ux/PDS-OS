-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130008_triggers.sql), unchanged.

-- Migration 8 — triggers T1 à T8.
-- Les fonctions qui lisent ou écrivent hors du périmètre RLS de l'appelant
-- sont SECURITY DEFINER. Aucune n'est accordée à un rôle : elles ne
-- s'exécutent que par le mécanisme de trigger.
--
-- Les triggers BEFORE d'une même table se déclenchent par ordre alphabétique
-- de nom : les préfixes a_, b_ fixent l'ordre voulu.

-- ---------------------------------------------------------------------------
-- T1 — horodatage de modification
-- ---------------------------------------------------------------------------

create trigger a_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger a_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger a_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- Sur people, l'auteur de la modification est aussi posé par trigger : le
-- client ne peut pas l'écrire (colonne non accordée) ni le falsifier.
create or replace function public.people_set_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := public.auth_person_id();
  return new;
end;
$$;

revoke execute on function public.people_set_audit() from public, anon, authenticated;

create trigger a_set_audit
  before update on public.people
  for each row execute function public.people_set_audit();

-- ---------------------------------------------------------------------------
-- T2 — verrou du bootstrap : irréversible, même pour postgres
-- ---------------------------------------------------------------------------

create or replace function public.organizations_guard_bootstrap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.bootstrap_completed_at is not null then
    if new.bootstrap_completed_at is distinct from old.bootstrap_completed_at
       or new.bootstrap_admin_email is distinct from old.bootstrap_admin_email then
      raise exception 'bootstrap_locked';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.organizations_guard_bootstrap() from public, anon, authenticated;

create trigger b_guard_bootstrap
  before update on public.organizations
  for each row execute function public.organizations_guard_bootstrap();

-- ---------------------------------------------------------------------------
-- T3 — liaison de l'approbation à un compte, décision horodatée
-- ---------------------------------------------------------------------------

create or replace function public.memberships_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
  v_changed boolean;
begin
  new.decision_note := nullif(btrim(new.decision_note), '');

  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status <> 'approved' or new.approved_account_id is null then
      select a.id into v_account_id
      from public.accounts a
      where a.person_id = new.person_id;
      if v_account_id is null then
        raise exception 'person_has_no_account';
      end if;
      new.approved_account_id := v_account_id;
    end if;
  else
    new.approved_account_id := null;
  end if;

  if tg_op = 'INSERT' then
    v_changed := true;
  else
    v_changed := new.status is distinct from old.status
              or new.role is distinct from old.role
              or new.decision_note is distinct from old.decision_note;
  end if;

  if v_changed then
    new.decided_at := now();
    new.decided_by := public.auth_person_id();
  end if;

  return new;
end;
$$;

revoke execute on function public.memberships_before_write() from public, anon, authenticated;

create trigger b_before_write
  before insert or update on public.memberships
  for each row execute function public.memberships_before_write();

-- ---------------------------------------------------------------------------
-- T4 — jamais zéro administrateur réellement utilisable
-- ---------------------------------------------------------------------------

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
  -- Verrou de ligne sur l'organisation : sérialise les retraits concurrents.
  perform 1 from public.organizations o where o.id = old.organization_id for update;

  v_was_usable := old.status = 'approved'
    and old.role = 'admin'
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
        and new.role = 'admin'
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

create trigger c_guard_last_admin
  before update or delete on public.memberships
  for each row execute function public.memberships_guard_last_admin();

-- ---------------------------------------------------------------------------
-- T5 — journal : toute décision, automatiquement
-- ---------------------------------------------------------------------------

create or replace function public.memberships_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_person uuid;
  v_source text;
begin
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.role is not distinct from old.role
     and new.approved_account_id is not distinct from old.approved_account_id
     and new.decision_note is not distinct from old.decision_note then
    return null;
  end if;

  -- Les chemins système annoncent leur source pour la transaction ;
  -- sinon : un utilisateur connecté est un admin, personne est le système.
  v_source := nullif(current_setting('po.event_source', true), '');
  if v_source is null then
    v_source := case when v_uid is null then 'system' else 'admin' end;
  end if;

  if v_uid is not null then
    select a.person_id into v_actor_person from public.accounts a where a.id = v_uid;
  end if;

  insert into public.membership_events (
    membership_id, organization_id, person_id,
    previous_status, new_status,
    previous_role, new_role,
    previous_account_id, new_account_id,
    previous_note, new_note,
    actor_person_id, actor_account_id, source
  ) values (
    new.id, new.organization_id, new.person_id,
    case when tg_op = 'UPDATE' then old.status end, new.status,
    case when tg_op = 'UPDATE' then old.role end, new.role,
    case when tg_op = 'UPDATE' then old.approved_account_id end, new.approved_account_id,
    case when tg_op = 'UPDATE' then old.decision_note end, new.decision_note,
    v_actor_person, v_uid, v_source
  );

  return null;
end;
$$;

revoke execute on function public.memberships_log_event() from public, anon, authenticated;

create trigger log_event
  after insert or update on public.memberships
  for each row execute function public.memberships_log_event();

-- ---------------------------------------------------------------------------
-- T6 — journal inaltérable
-- ---------------------------------------------------------------------------

create or replace function public.membership_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'membership_events_immutable';
end;
$$;

revoke execute on function public.membership_events_immutable() from public, anon, authenticated;

create trigger immutable_rows
  before update or delete on public.membership_events
  for each row execute function public.membership_events_immutable();

create trigger immutable_table
  before truncate on public.membership_events
  for each statement execute function public.membership_events_immutable();

-- ---------------------------------------------------------------------------
-- T7 — suppression d'un compte : l'approbation retombe en attente
-- ---------------------------------------------------------------------------

create or replace function public.accounts_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('po.event_source', 'system', true);
  -- Si ce compte est le dernier admin utilisable, T4 refuse et la
  -- suppression échoue : on ne vide pas une organisation de ses admins.
  update public.memberships m
     set status = 'pending',
         approved_account_id = null,
         decision_note = 'Compte supprimé'
   where m.approved_account_id = old.id;
  return old;
end;
$$;

revoke execute on function public.accounts_before_delete() from public, anon, authenticated;

create trigger b_before_delete
  before delete on public.accounts
  for each row execute function public.accounts_before_delete();

-- ---------------------------------------------------------------------------
-- T8 — désactivation d'un compte : pas si c'est le dernier admin utilisable
-- ---------------------------------------------------------------------------

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
        and m.role = 'admin'
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

create trigger b_guard_disable
  before update of disabled_at on public.accounts
  for each row execute function public.accounts_guard_disable();
