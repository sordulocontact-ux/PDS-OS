-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130009_rls.sql), unchanged.

-- Migration 9 — sécurité au niveau des lignes.
-- RLS activée et forcée sur les cinq tables. Sans policy, tout est refusé.
-- anon ne touche à rien : aucune donnée publique en V0. authenticated lit,
-- et ne modifie que les colonnes explicitement accordées ; seules les
-- fonctions SECURITY DEFINER (triggers) écrivent le reste.

alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.people enable row level security;
alter table public.people force row level security;
alter table public.accounts enable row level security;
alter table public.accounts force row level security;
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.membership_events enable row level security;
alter table public.membership_events force row level security;

-- Révocation des droits par défaut de Supabase, puis droits minimaux.
revoke all on table
  public.organizations, public.people, public.accounts,
  public.memberships, public.membership_events
from anon, authenticated;

grant select on table
  public.organizations, public.people, public.accounts,
  public.memberships, public.membership_events
to authenticated;

-- Un admin peut corriger un nom, rien d'autre sur une Personne.
grant update (first_name, last_name) on table public.people to authenticated;

-- Un admin décide d'un statut, d'un rôle, d'un motif. approved_account_id,
-- decided_at et decided_by restent exclusivement posés par trigger.
grant update (status, role, decision_note) on table public.memberships to authenticated;

-- ---------------------------------------------------------------------------
-- organizations : lecture par les membres actifs, aucune écriture client
-- ---------------------------------------------------------------------------

create policy organizations_select_members
  on public.organizations for select to authenticated
  using (public.is_active_member(id));

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------

create policy people_select_self
  on public.people for select to authenticated
  using (id = public.auth_person_id());

create policy people_select_visible
  on public.people for select to authenticated
  using (public.can_view_person(id));

create policy people_update_admin
  on public.people for update to authenticated
  using (public.can_admin_person(id))
  with check (public.can_admin_person(id));

-- ---------------------------------------------------------------------------
-- accounts : sa propre ligne, aucune écriture client
-- ---------------------------------------------------------------------------

create policy accounts_select_self
  on public.accounts for select to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------

create policy memberships_select_self
  on public.memberships for select to authenticated
  using (person_id = public.auth_person_id());

create policy memberships_select_admin
  on public.memberships for select to authenticated
  using (public.is_org_admin(organization_id));

create policy memberships_update_admin
  on public.memberships for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- membership_events : lecture par les admins, aucune écriture client
-- ---------------------------------------------------------------------------

create policy membership_events_select_admin
  on public.membership_events for select to authenticated
  using (public.is_org_admin(organization_id));
