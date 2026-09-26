-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130006_membership_events.sql), unchanged.

-- Migration 6 — journal des décisions d'accès.
-- Append-only : écrit uniquement par trigger, jamais modifié ni supprimé,
-- même par le rôle postgres (voir le trigger d'inaltérabilité).

create table public.membership_events (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete restrict,
  -- Dénormalisés pour les policies et les requêtes.
  organization_id uuid not null references public.organizations (id),
  person_id uuid not null references public.people (id),
  previous_status text,
  new_status text,
  previous_role text,
  new_role text,
  -- Trace du compte concerné : rend visible une ré-approbation sur un
  -- nouveau compte.
  previous_account_id uuid,
  new_account_id uuid,
  previous_note text,
  new_note text,
  -- NULL = système (rattachement, suppression de compte, bootstrap).
  actor_person_id uuid references public.people (id),
  -- Le compte exact de l'auteur. Sans clé étrangère : il peut être supprimé
  -- plus tard, le journal doit survivre.
  actor_account_id uuid,
  source text not null,
  created_at timestamptz not null default now(),
  constraint membership_events_source_check
    check (source in ('admin', 'system', 'bootstrap'))
);

create index membership_events_membership_idx
  on public.membership_events (membership_id, created_at);
create index membership_events_org_idx
  on public.membership_events (organization_id, created_at);
