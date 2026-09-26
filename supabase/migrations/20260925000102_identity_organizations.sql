-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130002_organizations.sql), unchanged.

-- Migration 2 — organisations.
-- V0 : une seule ligne, PDS. Aucun écran ne crée ni ne sélectionne
-- d'organisation ; la table existe pour que le modèle soit prêt.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- Bootstrap du premier administrateur : l'adresse autorisée, posée par
  -- migration, et le verrou qui se ferme une fois pour toutes.
  bootstrap_admin_email text,
  bootstrap_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_bootstrap_email_normalized
    check (bootstrap_admin_email is null
           or bootstrap_admin_email = public.normalize_email(bootstrap_admin_email))
);

insert into public.organizations (slug, name) values ('pds', 'PDS');
