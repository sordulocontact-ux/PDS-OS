# Projet collectif (PDS Mic) : résumé

Résumé de travail de `docs/pds-mic-plan.md` (qui fait foi en cas de doute). Mis à jour à la fin
de chaque lot. Dernière mise à jour : 11/11/2026, après le lot 3.

**Module Business fait en parallèle par un collègue** : rôle Business manager, négociation, deal
memo, contrats, contacts privés, mails. Ces lots n'y touchent pas ; son dossier de négociation
pointe `title_participations.id` (stable, jamais recréé).

## Les 10 décisions validées

1. **Drapeau `projects.collective`**, indépendant du type et du format. « PDS Mic » reste une
   donnée (`content_formats`). Les anciens PDS Mic ne sont pas convertis.
2. **« Projet collectif »**. Artiste principal = `projects.artist_id`, PDS par défaut, modifiable ;
   c'est lui qu'on affiche, jamais « Collectif · N artistes ». Invités = participations.
3. **Titre sans nom, voie A** : titre provisoire au Catalogue dès le premier audio
   (`masters.title_is_provisional`), renommé par le geste de promotion.
4. **Un seul Brief Mix/Master par projet** en V1 ; réglages par titre plus tard, en plus.
5. **Business manager** : module Business (collègue). Ici, aucun chemin nouveau vers un contact
   (pas de SECURITY DEFINER qui lit `network_contacts` ou `contact_id`).
6. **Contrat de participation** : préparation et enregistrement permis avec avertissement ;
   tournage et sortie bloqués sans contrat signé ou dérogation de la direction
   (`participation_waivers`, périmètre `shoot` ou `release`, tracée, révocable).
7. **Mode de sortie** : `singles`, `compilation` ou `singles_then_compilation`. Sortie
   individuelle = `releases.project_title_id` ; compilation = sortie de projet, son UPC.
8. **Abandon** : archivé puis repris sans rien perdre. Maquette brouillon/en développement →
   « abandonnée » ; maquette validée jamais touchée. Titres et artistes ajoutables en cours de projet.
9. **Distribution** pour un collectif quel que soit son type, sortie par sortie.
10. **Crédits** : artiste principal en `main` en tête sur chaque titre, invité en `featuring`.
    Une participation n'enlève jamais un crédit. **Exception** : titre aussi dans un projet non
    collectif → aucun crédit automatique, avertissement « Crédits à vérifier au Catalogue : ce
    titre est aussi dans le projet [nom] » (sur la participation et dans la carte Titres).

## État des lots

| Lot | Contenu | État |
| --- | --- | --- |
| 1 – 3 | Drapeau et artiste principal ; titres, abandon, réactivation ; participations artiste | faits |
| 4 – 5 | Sélections d'artistes ; création d'un collectif depuis une sélection | à faire |
| 6 – 7 | Vue Titres et artistes ; titre provisoire (voie A) | à faire |
| 8 – 9 | Master : sélecteur de titre ; vue consolidée, abandonnés hors des comptes | à faire |
| 10 – 12 | Ciblage marketing par titre ; suivi juridique par participation ; contrat manquant, verrou du tournage | à faire |
| 13 – 15 | Sorties individuelles et compilation ; plan de sortie par titre ; Distribution par sortie | à faire |

## Déjà en base (migrations `20261111…`)

- **Lot 1** (`100101_collective_projects`) : `projects.collective` (posé à la main, pas encore de
  formulaire) ; `project_artist_name` / `project_artist_id` lisent d'abord l'artiste principal d'un
  collectif ; `set_project_main_artist`. Code : `artistNameOf`, `lib/design/identity-mismatch.ts`.
- **Lot 2** (`120101_project_titles`) : `project_titles` (position, `working_title` nul = sans nom,
  `master_id` via `project_masters` en `on delete restrict`, `planned` / `active` / `abandoned`),
  `project_title_events` ; `add_` / `rename_` / `abandon_` / `reactivate_project_title`,
  `fill_project_titles`. Code : `lib/projects/titles.ts`, `title-rules.ts`, `title-actions.ts`,
  `components/projects/project-titles.tsx`.
- **Lot 3** (`140101_title_participations`) : `title_participations` (artiste × titre, rôle,
  statut, `contact_id`, `contract_id`, id stable) ; `add_title_participation`,
  `set_title_participation_status` ; `credit_title_participations` (crédits à la confirmation,
  et au master relié plus tard ; aucun si `master_in_simple_project`) ;
  `project_title_shared_projects` (titres partagés, pour l'avertissement). Code :
  `participation-rules.ts` (`projectArtists`), `participation-actions.ts`. Fiche artiste : ses
  collectifs par participation.
- Tests : `collective-projects`, `project-titles`, `title-participations` (`supabase/tests/`).

## Règles à tenir à chaque lot

- Toute règle nouvelle ne joue que si `projects.collective = true` ; un projet simple ne change pas
  (y compris quand il partage un master avec un collectif : aucun crédit automatique).
- « Artistes du projet » = participations ni refusées ni retirées des titres non abandonnés, plus
  les crédits des titres actifs.
- Les cinq principes : jamais mêler deux titres ; jamais dupliquer le projet ; pas les mêmes actions
  marketing pour chaque titre ; aucun contact privé exposé ; toute dérogation tracée.
- Nouvelle table liée à un projet : RLS forcée, écriture par fonctions, `zz_project_live`, entrée
  dans `delete_project_row`. Calculé, jamais stocké : artistes du projet, état d'un titre, d'un contrat.
- Rien ne se supprime : un titre s'abandonne, une participation se refuse ou se retire.
- Garder verts `project-types` et `visible-project-ids` ; régénérer les types Supabase. Tests sur
  la base locale seulement.
