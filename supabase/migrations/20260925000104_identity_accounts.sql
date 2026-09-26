-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130004_accounts.sql), unchanged.

-- Migration 4 — comptes.
-- Un compte relie un utilisateur Supabase Auth à une Personne. Il n'existe
-- qu'après vérification de l'adresse email (voir le trigger de rattachement).
-- Si l'utilisateur Supabase est supprimé, le compte disparaît ; la Personne
-- et son historique restent.

create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Une Personne a au plus un compte.
  person_id uuid not null unique references public.people (id),
  -- Désactivation au niveau du compte, distincte de la suspension d'un accès.
  disabled_at timestamptz,
  disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Support de la clé étrangère composite des memberships : le compte
  -- approuvé doit appartenir à la Personne du membership.
  constraint accounts_id_person_key unique (id, person_id)
);
