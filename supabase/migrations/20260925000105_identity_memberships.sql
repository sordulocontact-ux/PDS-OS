-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130005_memberships.sql), unchanged.

-- Migration 5 — memberships : l'accès d'une Personne à une organisation.
-- C'est lui, et lui seul, qui ouvre les données. Le rôle vit ici.
--
-- Principe d'accès : une Personne a accès si, et seulement si, un membership
-- « approved » désigne explicitement le compte avec lequel elle est connectée.
-- Le statut seul ne suffit jamais.

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  person_id uuid not null references public.people (id),
  role text not null default 'member',
  status text not null default 'pending',
  -- Le compte auquel l'approbation a été accordée. Posé par trigger, jamais
  -- par le client. Un compte recréé (nouvel identifiant) n'hérite donc jamais
  -- d'une approbation passée.
  approved_account_id uuid,
  requested_at timestamptz not null default now(),
  -- Posés par trigger, jamais par le client.
  decided_at timestamptz,
  decided_by uuid references public.people (id),
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint memberships_org_person_key unique (organization_id, person_id),
  constraint memberships_role_check check (role in ('admin', 'member')),
  constraint memberships_status_check
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  -- Approuvé si et seulement si un compte est désigné.
  constraint memberships_approved_requires_account
    check ((status = 'approved') = (approved_account_id is not null)),
  -- Refus et suspension motivés, motif non vide après trim.
  constraint memberships_decision_note_required
    check (status not in ('rejected', 'suspended')
           or btrim(coalesce(decision_note, '')) <> ''),
  -- Le compte désigné appartient à la Personne du membership. Action par
  -- défaut (NO ACTION) : un compte désigné ne peut pas être supprimé tant que
  -- l'approbation n'a pas été levée — échec bruyant, jamais de trou.
  constraint memberships_approved_account_belongs_to_person
    foreign key (approved_account_id, person_id)
    references public.accounts (id, person_id)
);

create index memberships_person_idx on public.memberships (person_id);
create index memberships_org_status_idx on public.memberships (organization_id, status);
create index memberships_approved_account_idx
  on public.memberships (approved_account_id) where approved_account_id is not null;
