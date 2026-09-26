-- Imported from Ibé's PO foundation (po/supabase/migrations/20260914130001_helpers.sql), unchanged.

-- Migration 1 — fonctions utilitaires.
-- Hygiène appliquée à toute fonction du projet : search_path vide et noms
-- qualifiés, propriétaire postgres (rôle des migrations), REVOKE FROM PUBLIC
-- puis GRANT explicite aux seuls rôles qui doivent pouvoir l'exécuter.

-- Normalisation d'une adresse email : espaces extérieurs supprimés, minuscules.
-- Rien d'autre : ni les points ni les suffixes « + » ne sont repliés, ces
-- variantes n'étant pas équivalentes chez tous les fournisseurs.
create or replace function public.normalize_email(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(btrim(input));
$$;

revoke execute on function public.normalize_email(text) from public, anon, authenticated;
-- Requis par les contraintes CHECK, évaluées avec les droits de l'appelant.
grant execute on function public.normalize_email(text) to authenticated, service_role;

-- Horodatage de modification, posé par trigger sur chaque table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
