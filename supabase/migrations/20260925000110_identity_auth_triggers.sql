-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130010_auth_triggers.sql), unchanged.

-- Migration 10 — triggers sur auth.users : T9 (email immuable) et T10
-- (rattachement + bootstrap).
-- Supabase Auth écrit dans auth.users sous le rôle supabase_auth_admin, qui
-- n'a aucun droit sur le schéma public : les deux fonctions sont donc
-- SECURITY DEFINER, avec search_path vide et noms qualifiés, et accordées
-- explicitement à ce seul rôle.

-- ---------------------------------------------------------------------------
-- T9 — un compte rattaché ne change jamais d'adresse
-- ---------------------------------------------------------------------------
-- Vaut pour l'API utilisateur, l'API admin, le dashboard et le SQL direct :
-- c'est l'UPDATE final de la colonne email qui est refusé.

create or replace function public.auth_users_guard_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.normalize_email(new.email) is distinct from public.normalize_email(old.email)
     and exists (select 1 from public.accounts a where a.id = new.id) then
    raise exception 'email_change_forbidden';
  end if;
  return new;
end;
$$;

revoke execute on function public.auth_users_guard_email() from public, anon, authenticated;
grant execute on function public.auth_users_guard_email() to supabase_auth_admin;

create trigger po_guard_email
  before update of email on auth.users
  for each row execute function public.auth_users_guard_email();

-- ---------------------------------------------------------------------------
-- T10 — rattachement à la vérification de l'email, et bootstrap
-- ---------------------------------------------------------------------------
-- Ne se déclenche qu'au moment où email_confirmed_at devient non nul (ou à
-- l'insertion d'un utilisateur déjà confirmé). Impossible à contourner par
-- un appel direct à l'API : rien n'existe dans nos tables avant.
--
-- Invariant G : le rattachement ne modifie jamais un membership existant.
-- Seule exception : la branche bootstrap, gardée par le verrou de
-- l'organisation et consommée une seule fois.

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

  -- Personne existante avec cette adresse : on la retrouve, historique
  -- compris. Sinon on la crée depuis les métadonnées de l'inscription.
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
    -- Bootstrap du premier administrateur, une seule fois, même transaction.
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
    insert into public.memberships (organization_id, person_id, role, status)
    values (v_org.id, v_person_id, 'member', 'pending')
    on conflict (organization_id, person_id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.auth_users_handle_confirmed() from public, anon, authenticated;
grant execute on function public.auth_users_handle_confirmed() to supabase_auth_admin;

create trigger po_handle_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.auth_users_handle_confirmed();
