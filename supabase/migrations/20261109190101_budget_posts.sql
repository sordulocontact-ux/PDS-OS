-- « Poste » d'une ligne du Budget d'un projet (retour du 09/11/2026) : les
-- postes du Budget d'un artiste (20261108120101, 20261108140101 : transport,
-- restauration, livraison de repas, per diem…) rejoignent les familles du
-- Budget des projets (MKT-S1-11), dans une seule liste. « Déplacements »
-- (travel) est remplacé par Transport, Hébergement et Per diem : ses lignes
-- passent en Transport. La colonne garde son nom (family) : les fonctions qui
-- écrivent 'services' (lignes d'un ingénieur, d'un contrat) ne changent pas.
--
-- Le Budget de la fiche artiste est retiré (« comme c'était avant ») : toute
-- dépense se saisit dans le Budget d'un projet. Sa table et sa fonction
-- partent avec lui.

alter table public.budget_lines drop constraint budget_lines_family_check;

update public.budget_lines set family = 'transport' where family = 'travel';

alter table public.budget_lines add constraint budget_lines_family_check
  check (family is null or family in (
    'content_production', 'photo_video', 'image',
    'advertising', 'events',
    'studio', 'services', 'coaching', 'equipment',
    'transport', 'lodging', 'per_diem',
    'food', 'food_delivery',
    'misc', 'other'));

drop table if exists public.artist_expenses;
drop function if exists public.is_signed_artist(uuid);
