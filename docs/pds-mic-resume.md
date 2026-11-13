# Projet collectif (PDS Mic) : résumé

Résumé de travail de `docs/pds-mic-plan.md` (qui fait foi en cas de doute). Mis à jour à la fin
de chaque lot. Dernière mise à jour : 13/11/2026, après le lot 6 (fait, commité).

**Module Business fait en parallèle par un collègue** : rôle Business manager, négociation, deal
memo, contrats, contacts privés, mails. Ces lots n'y touchent pas ; son dossier de négociation
pointe `title_participations.id` (stable, jamais recréé). Plan § 0 ter : rien côté participation
pour le Deal, aucune étape de négociation dans son statut, prévenir avant de toucher
`budget_lines`, `network_contacts`, `calls`. Ce qu'il a ajouté côté collectifs : section
« Côté Business » plus bas.

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
| 5 | Création d'un collectif (formulaire, depuis une sélection, PO) | fait, validé |
| 6 | Vue « Titres et artistes » (remplace la liste des lots 2-3), raccord Négociation | fait |
| 7 | Titre provisoire (voie A) | à faire |
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
  `fill_project_titles`. Code : `lib/projects/titles.ts`, `title-rules.ts`, `title-actions.ts`
  (la liste `components/projects/project-titles.tsx` est remplacée au lot 6).
- **Lot 3** (`140101_title_participations`) : `title_participations` (artiste × titre, rôle,
  statut, `contact_id`, `contract_id`, id stable) ; `add_title_participation`,
  `set_title_participation_status` ; `credit_title_participations` (crédits à la confirmation,
  et au master relié plus tard ; aucun si `master_in_simple_project`) ;
  `project_title_shared_projects` (titres partagés, pour l'avertissement). Code :
  `participation-rules.ts` (`projectArtists`), `participation-actions.ts`. Fiche artiste : ses
  collectifs par participation.
- **Lot 4** (`233101_artist_selections`) : `artist_selections` (nom, responsable
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
- **Lot 6** (`20261113170101_main_artist_history`) : onglet **« Titres et artistes »** (`/app/projects/[id]/titles`,
  entrée après la Vue d'ensemble, collectif seulement : `projectSections({ collective })`, 404
  sinon ; collectif non lancé : le même tableau dans la Vue d'ensemble, sous « Ce qui est
  transmis »). La liste minimale `ProjectTitles` est supprimée (la Vue d'ensemble lancée n'a plus
  de bloc Titres). Un `DataTable` : une ligne par titre, ses participations en retrait dessous.
  Colonnes des participations : Statut, Contrat (`title_participations.contract_id` ; « À faire »
  si confirmée sans contrat, « Lié » si le lecteur ne lit pas le contrat), **Négociation**
  (étape du deal de la participation, `deals.participation_id`, lien vers le deal ; le deal
  vivant, sinon le dernier abandonné ; « Pas de dossier ») et **Négocié par** (personne affectée,
  « À affecter ») : lus sous la RLS des deals ; les deux colonnes ne paraissent que si le lecteur
  lit tous les deals du projet (direction, responsable : `dealReach = all`) ou en voit au moins
  un (`partial`, « — » sur une ligne sans deal visible), jamais « Pas de dossier » à tort. La ligne
  d'un titre porte son **Master** (calculé sur `master_mix_versions` du projet et
  `masters.audio_state` : À mixer, Mix Vn à valider, Mix/Master Vn+1 attendu, Mix validé,
  Master final) et sa **Distribution** (« Avec le projet », neutre jusqu'au lot 15). Ligne d'un
  titre → Master du projet ; d'une participation → son contrat. Gestes (responsable une fois
  lancé, `create_projects` avant) : ajouter un titre, renommer, abandonner, réactiver, ajouter un
  artiste, changer le statut, **retirer du titre** (détacher = `withdrawn`) et **rattacher**
  (refusée ou retirée → `proposed`), **changer l'artiste principal** (`set_project_main_artist`,
  refus nommant les titres où l'artiste est invité ; avant le lancement, par le formulaire).
  **Le changement d'artiste principal va dans l'Activité** (« Artiste principal · PDS → Mona Lys
  · auteur ») : seule migration du lot, `project_title_events` devient le journal de composition
  du collectif, `title_id` nul pour ce seul événement (`main_artist_changed`, `from` / `to` =
  noms des artistes à ce moment), écrit par `set_project_main_artist` quand l'artiste change
  vraiment (tous les chemins y passent, formulaire compris). Les lignes de ce journal mènent
  maintenant à « Titres et artistes » (avant : Vue d'ensemble).
  Code : `lib/projects/title-board-rules.ts` (pur), `title-board.ts` (lectures),
  `main-artist-actions.ts`, `guest-titles.ts` (partagé avec `edit-actions.ts`),
  `components/projects/titles/` ; `DataTableCell colSpan` ajouté ; `lib/overview/activity.ts`.
- Tests : `collective-projects`, `project-titles`, `title-participations`, `artist-selections`,
  `collective-project-creation`, `title-board` (lot 6 : ce que chaque lecteur lit des deals et
  du contrat d'une participation, changer l'artiste principal après lancement et son
  événement, retirer et rattacher).

## Côté Business (Sacha), touchant les collectifs

Lu après le pull du 13/11/2026 ; ses tests : `deals-collective`, `deals-bm-opens`.

- **Invités dès la création** (`20261112130101_collective_guests`) : `create_collective_project`
  prend `p_guest_artist_ids` (dernier paramètre, facultatif) ; champ « Artistes invités » du
  formulaire (`collective-fields.tsx`), à côté ou à la place d'une sélection. Chaque invité reçoit
  un titre sans nom et une participation proposée, par `add_project_title` /
  `add_title_participation` ; sélection et invités ensemble : chaque artiste une fois, jamais
  l'artiste principal.
- **Le deal d'un collectif passe par une participation** : `create_deal` refuse « projet +
  artiste » ou un projet seul sur un collectif (`collective_needs_participation`, ou
  `use_participation` si l'artiste a une participation en jeu) ; une participation refusée ou
  retirée, ou dont le titre est abandonné, n'a pas de nouveau deal. Un artiste seul (sans projet)
  ne change pas (`20261112120101_deals_collective_fixes`, qui met aussi `deals.contract_id` en
  `on delete set null` pour la suppression d'un projet et retire `zz_project_live` de
  `personal_tasks`).
- **Le deal suit la participation confirmée** (`20261112140101_bm_opens_deals`) : le deal d'une
  participation confirmée démarre en négociation ; un deal ouvert avant y passe quand sa
  participation est confirmée (depuis « À contacter » ou « Call prévu » seulement), avec sa ligne
  de journal (`deal_follows_participation`). La colonne Négociation de « Titres et artistes » le
  montre aussitôt.
- **Le business manager ouvre des deals** (`open_deals`, son poste seul) sur un artiste sans
  projet ; celui d'un projet ou d'un collectif est ouvert par la direction ou le responsable,
  puis confié. Un deal ne donne pas accès au projet : sans être dans l'équipe, le business
  manager ne voit pas « Titres et artistes » (404) et travaille depuis Deals ; la page du deal
  affiche le projet en texte, sans lien.
- **« Voir comme »** : Malik Durand (business manager) et Élise Fabre (business), créés par
  `supabase/preprod/showcase-business.sql`. En local, le seed garde Glen (business manager) et
  Thibault (business).
- **Numérotation** : `artist_selections` (lot 4) portait d'abord la même version que
  `budget_artist_lines` (BUD 1, `200101`), puis la même que `deal_notifications` (`232101`, les
  deux côtés avaient renuméroté) ; depuis le 12/11 `233101`, après les migrations Budget et Deal
  (`210101`, `230101`, `231101`, `232101`) et avant le lot 5 (`235101`), qui en dépend. Elle ne
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
  (numérotation sans doublon : vérifier `ls supabase/migrations | cut -d_ -f1 | uniq -d` après
  chaque merge).
- La largeur utile d'une page de projet est de 1180 px au plus : un tableau y tient 4 colonnes
  fixes en plus du nom ; au-delà, regrouper (lot 6 : les faits d'un titre dans l'espace des
  colonnes de ses participations) plutôt que faire défiler.
