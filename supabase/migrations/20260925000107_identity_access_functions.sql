-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130007_access_functions.sql), unchanged.

-- Migration 7 — fonctions d'accès.
-- Toutes SECURITY DEFINER : elles lisent accounts et memberships hors RLS,
-- sinon une policy sur memberships qui lit memberships s'appellerait
-- elle-même. search_path vide, noms qualifiés, droits explicites.

-- La Personne du compte connecté. NULL si aucun compte, ou si le compte est
-- désactivé : un compte désactivé ne voit plus rien, pas même lui-même.
create or replace function public.auth_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.person_id
  from public.accounts a
  where a.id = auth.uid()
    and a.disabled_at is null;
$$;

revoke execute on function public.auth_person_id() from public, anon, authenticated;
grant execute on function public.auth_person_id() to authenticated;

-- Membre actif d'une organisation : un membership approuvé qui désigne
-- exactement le compte courant, non désactivé. Jointure directe sur
-- approved_account_id : c'est ce qui rend l'accès non transmissible à un
-- compte recréé.
create or replace function public.is_active_member(org_id uuid)
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
  );
$$;

revoke execute on function public.is_active_member(uuid) from public, anon, authenticated;
grant execute on function public.is_active_member(uuid) to authenticated;

create or replace function public.is_org_admin(org_id uuid)
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
      and m.role = 'admin'
  );
$$;

revoke execute on function public.is_org_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- Une Personne est visible de moi si elle a un accès approuvé dans une
-- organisation où je suis membre actif, ou un membership (tout statut) dans
-- une organisation où je suis admin. Sa propre ligne est traitée à part.
create or replace function public.can_view_person(target_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.person_id = target_person_id
      and (
        (m.status = 'approved' and public.is_active_member(m.organization_id))
        or public.is_org_admin(m.organization_id)
      )
  );
$$;

revoke execute on function public.can_view_person(uuid) from public, anon, authenticated;
grant execute on function public.can_view_person(uuid) to authenticated;

-- Je peux administrer une Personne si elle a un membership dans une
-- organisation où je suis admin.
create or replace function public.can_admin_person(target_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.person_id = target_person_id
      and public.is_org_admin(m.organization_id)
  );
$$;

revoke execute on function public.can_admin_person(uuid) from public, anon, authenticated;
grant execute on function public.can_admin_person(uuid) to authenticated;

-- Nombre d'administrateurs réellement utilisables : membership approuvé,
-- rôle admin, compte désigné existant (garanti par la clé étrangère) et non
-- désactivé. Réservée aux triggers : aucun grant.
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
    and m.role = 'admin'
    and a.disabled_at is null
    and (exclude_membership_id is null or m.id <> exclude_membership_id)
    and (exclude_account_id is null or a.id <> exclude_account_id);
$$;

revoke execute on function public.usable_admin_count(uuid, uuid, uuid) from public, anon, authenticated;

-- L'état d'accès complet du compte connecté, en une requête. C'est la seule
-- fonction qui répond à un compte désactivé, pour afficher l'écran adéquat.
-- V0 : une seule organisation, PDS ; l'état est celui du membership PDS.
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
    -- Session valide mais rattachement pas encore fait (cas rare).
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
    -- Approuvé pour un autre compte : structurellement impossible, mais on
    -- ne donne jamais l'accès par défaut.
    v_state := 'pending';
  else
    v_state := v_membership.status;
  end if;

  return jsonb_build_object(
    'state', v_state,
    'role', v_membership.role,
    'person_id', v_person.id,
    'organization_id', v_membership.organization_id,
    'first_name', v_person.first_name,
    'last_name', v_person.last_name
  );
end;
$$;

revoke execute on function public.get_my_access() from public, anon, authenticated;
grant execute on function public.get_my_access() to authenticated;
