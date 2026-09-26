-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130003_people.sql), unchanged.

-- Migration 3 — personnes.
-- Une Personne existe indépendamment de tout compte : elle peut être
-- responsable d'un projet ou apparaître dans l'historique avant de s'inscrire.
-- Pas d'organization_id : une Personne est globale, c'est le membership qui
-- la rattache à une organisation.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  -- Nullable : un intervenant peut n'avoir qu'un téléphone.
  email text,
  first_name text not null,
  last_name text,
  created_by uuid references public.people (id),
  -- Posé par trigger, jamais par le client.
  updated_by uuid references public.people (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_email_normalized
    check (email is null or email = public.normalize_email(email)),
  constraint people_first_name_not_blank
    check (btrim(first_name) <> '')
);

-- Une adresse ne désigne qu'une Personne. Index partiel : les Personnes sans
-- adresse ne sont pas concernées.
create unique index people_email_key on public.people (email) where email is not null;
