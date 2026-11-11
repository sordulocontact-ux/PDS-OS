# Projet collectif (PDS Mic) : résumé

Résumé de travail de `docs/pds-mic-plan.md` (qui fait foi en cas de doute). Mis à jour à la fin
de chaque lot. Dernière mise à jour : 11/11/2026, après le lot 5 (validé, commité, pas encore poussé).

**Module Business fait en parallèle par un collègue** : rôle Business manager, négociation, deal
memo, contrats, contacts privés, mails. Ces lots n'y touchent pas ; son dossier de négociation
pointe `title_participations.id` (stable, jamais recréé). Plan § 0 ter : rien côté participation
pour le Deal, aucune étape de négociation dans son statut, prévenir avant de toucher
`budget_lines`, `network_contacts`, `calls`.

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
| 1 – 4 | Drapeau et artiste principal ; titres, abandon, réactivation ; participations artiste ; sélections d'artistes | faits |
| 5 | Création d'un collectif (formulaire, depuis une sélection, PO) | fait, validé (commité, pas poussé) |
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
- **Lot 4** (`232101_artist_selections`) : `artist_selections` (nom, responsable
  `owner_person_id` = « Mes sélections », transmise par / le) et `artist_selection_items`
  (artistes ordonnés) ; lues par toute l'équipe, écrites par `manage_catalog` ;
  `create_` / `rename_artist_selection`, `add_artists_to_selection`,
  `remove_artist_from_selection`, `transmit_artist_selection` (notification
  `selection_transmitted`), `list_selection_recipients`. Pages `/app/catalog/artists/selections`.
  Aucun projet créé. Code : `lib/catalog/selections.ts`, `selection-actions.ts`,
  `components/catalog/selections/` (dans « Ajouter des artistes », la liste ne s'ouvre qu'au
  clic ou à la frappe : `SearchPicker openOnFocus={false}`).
- **Lot 5** (`235101_collective_project_creation`) : `create_collective_project` (collectif dès la
  création, artiste principal obligatoire ; sélection copiée : un titre sans nom `planned` + une
  participation `proposed` featuring par artiste vivant, l'artiste principal écarté, aucun lien
  gardé). Droit : `create_projects`, **ou la responsable de la sélection avec `manage_catalog`**
  (sans `create_projects` pour le reste) : elle est alors la cheffe de projet, seule possible,
  projet accepté et lancé aussitôt. `update_project` n'efface plus l'artiste principal (changé par
  `set_project_main_artist`, absent = gardé). **L'artiste principal n'est jamais invité du projet** :
  `set_project_main_artist` refuse un artiste qui a une participation ni refusée ni retirée sur un
  titre du projet, même abandonné (`main_artist_is_guest`) ; une participation refusée ou retirée
  ne bloque pas (on retire la participation, puis on en fait l'artiste principal), et
  `set_title_participation_status` ne la remet pas en proposée / invitée / confirmée tant que
  l'artiste est principal (`main_artist_not_participant`). Le refus nomme le ou les titres concernés
  (« Titre 4 · sans nom », lus par `guestTitles` dans `edit-actions.ts`). Le champ Artiste ne propose
  plus « Créer l'artiste X » quand un artiste de ce nom existe (`SearchPicker uniqueLabels`).
  Code : `lib/projects/collective-rules.ts` (PDS = l'artiste nommé comme l'organisation, modèle =
  format « PDS Mic » trouvé par son nom),
  `collective-context.ts`, `components/projects/collective-fields.tsx` ; page
  `/app/projects/new?selection=…` ; bouton « Créer le projet » de la sélection ; PO
  `propose_project` (`collective`, `selection`). Le cadrage reste celui du projet.
- Tests : `collective-projects`, `project-titles`, `title-participations`, `artist-selections`,
  `collective-project-creation`.
- **Numérotation** : `artist_selections` (lot 4) portait d'abord la même version que
  `budget_artist_lines` (BUD 1, `200101`) ; renumérotée `232101`, après les migrations Budget et
  Deal (`210101`, `230101`, `231101`) et avant le lot 5 (`235101`), qui en dépend. Elle ne
  redéfinit rien de ce qu'elles touchent.

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
- L'artiste principal n'est jamais invité du projet (participation ni refusée ni retirée), dans un
  sens comme dans l'autre.
- Garder verts `project-types` et `visible-project-ids` ; régénérer les types Supabase. Tests sur
  la base locale seulement. (`visible-project-ids` n° 24 échoue déjà avant ces lots : trois
  politiques du 26/10 et du 05/11 lisent `can_see_project(project_id)`.) Sur une base propre
  (11/11/2026), échouent aussi déjà avant le lot 1 : `team` n° 14-15, `ux-roles` n° 5,
  `marketing-review`, `marketing-review-notifications`, `project-view-cache` ; `marketing-review`
  n° 9 est instable (deux vérifications au même instant).
- Une migration de ces lots vient **après** la dernière migration du module Business et du Budget
  (numérotation sans doublon).
