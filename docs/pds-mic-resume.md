# Projet collectif (PDS Mic) : résumé

Résumé de travail de `docs/pds-mic-plan.md` (qui fait foi en cas de doute). Mis à jour à la fin
de chaque lot. Dernière mise à jour : 14/11/2026, après les lots 12 bis et 13.

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
| 7 | Titre provisoire (voie A) | fait |
| 8 | Master : sélecteur de titre | fait |
| 9 | Master : vue consolidée, abandonnés hors des comptes ; « Demander des fichiers » (9 bis) | fait |
| 10 | Ciblage marketing par titre | fait |
| 11 | Suivi juridique par participation (« Participations et contrats », deals de Sacha lus) | fait |
| 12 | Contrat manquant, verrous du tournage et de la sortie, dérogations ; 12 bis (parcours de la Production, avertissements, Historique du master) | fait |
| 13 | Sorties individuelles et compilation (données, page « Sorties ») | fait |
| 14 – 15 | Plan de sortie par titre ; Distribution par sortie | à faire |

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
- **Lot 7** (`20261113180101_provisional_titles`) : `masters.title_is_provisional` (jamais écrit
  par le navigateur ; tout renommage du master le termine). `ensure_project_title_master` : au
  premier audio (« Déposer un audio » dans le « ⋯ » d'un titre pas encore au Catalogue, qui ouvre
  l'onglet Audio de sa fiche) ou à la première session (les titres sans master des collectifs
  sont proposés dans « Nouvelle session », `pt:` + id), maquette `draft` « Sans titre · Artiste ·
  Projet », créditée à l'artiste principal (`main`), invités confirmés en `featuring`, reliée au
  projet, titre actif. Droits : qui écrit les titres, ou `manage_sessions` sur un projet visible.
  `rename_project_title` nomme le master provisoire. `attach_master_to_project_title` (« Rattacher
  un titre du Catalogue »). « Rattacher à un projet existant » propose les collectifs (lancés ou
  non, tout type) dont la personne écrit les titres, nouveau titre ou titre qui attendait.
  Catalogue : badge « Nom provisoire » (Maquettes, en-tête). Dans le projet, un nom provisoire
  n'est jamais le nom du titre (`masterNameOf`). Journal : `cataloged`, `master_attached`.
  Compte rendu : `docs/pds-mic-rapports/lot-7.md`.
- **Lot 8** (sans migration) : Master d'un collectif **un titre à la fois** (`?titre=<master>`),
  choisi dans le fil « Master ▸ titre ▸ étape » (`CrumbSwitcher` : titres du Master dans l'ordre,
  état Master en gris, coche du Master final, « Abandonné »), gardé d'étape en étape.
  `loadMasterTitleScope` (`lib/master-workflow/title-scope.ts`, nul hors collectif). Filtré :
  Source, versions/retours/décisions (`loadRoundStep(…, masterId)`), Master final. Projet entier :
  Brief, paquet, lien, tarif, ingénieur, fil, facture, Historique ; « tout est validé » et le
  bilan du Master final comptent tous les titres. Par défaut : titre qui attend une décision
  (Mixage, Mastering), règle de la Source, sinon premier titre vivant. La ligne d'un titre de
  « Titres et artistes » ouvre le Master sur lui. Compte rendu : `docs/pds-mic-rapports/lot-8.md`.
- **Lot 9** (`20261113190101_abandoned_titles_counts`) : un titre abandonné sort des comptes « tous
  les titres » sans être délié. `ProjectDetail.abandonedMasterIds` + `countedTitlesProject` aux
  entrées du Master (contexte, paquet, Brief), de l'état des workflows (pas le Juridique, lot 11)
  et de la Distribution ; `getProject().masters` reste complet (formulaire d'édition). Facture de
  l'ingénieur : `request_project_master_invoices`, aussi appelée par `abandon_project_title`
  (l'abandon du dernier titre en attente l'envoie). Sélecteur du Master sans les abandonnés. Vue
  consolidée `TitlesOverview` (source, mix, mastering, validation).
- **Lot 9 bis** (`20261114100101_master_file_requests`) : « Demander des fichiers » (décision du
  14/11 : un membre de l'équipe, la source seulement). `master_file_requests` = **une ligne par
  titre** (une seule ouverte par titre ; redemander à une autre personne remplace et garde),
  reçue **toute seule** par le déclencheur `z_receive_file_requests` sur `master_files` (premier
  fichier audio de ce titre, quel que soit le chemin). `request_master_files` (responsable,
  collectif, titres vivants du Master), `cancel_master_file_request` (auteur ou responsable),
  `list_file_request_recipients` / `file_request_recipient_ok` (équipe `project_creatives`,
  ingénieur interne du Master, direction ; jamais soi-même, jamais un contact). Dépôt de la
  personne sollicitée sans droit Catalogue : chemin à usage unique d'une heure
  (`open_` / `record_file_request_delivery`, politique de stockage
  `is_open_file_request_slot`), mise à plat ou maquette. Notifications `master_files_requested`
  (à la personne), `master_files_received` (à l'auteur). Bouton sous les tuiles, « dont N
  demandés » sur « Attendent leur source », « À vous » de l'étape Source (journey), « Fichiers
  qui vous sont demandés » en tête de la Source, « Fichiers demandés à … » + « Annuler la
  demande » sur le titre. Une ligne ne compte que tant que son titre attend sa source. Entrée
  dans `delete_project_row`. Compte rendu : `docs/pds-mic-rapports/lot-9-bis.md`.
- **Lot 10** (`20261113200101_deliverable_titles`) : `deliverable_titles` = titres visés par une
  action (livrable engagé de la Stratégie ou activation, un seul). Aucune ligne = tout le projet
  (défaut) ; `all_titles` (une ligne, vaut pour les titres à venir) ; `titles` (une ligne par
  titre) ; `none`. Jamais dupliquée, rien créé par titre. `set_marketing_title_scope` (responsable,
  collectif, lignes remplacées ; abandonné déjà visé gardé, jamais revisé). Modale « Titres
  visés » (`TitleScopeLine`, `TitleScopeButton`) : page d'une activation, d'un livrable en
  Production, livrables de la Stratégie ; périmètre affiché sous chaque activation et dans la
  barre de la Production ; filtre « Titre » de la liste des activations (tout le projet et tous
  les titres restent visibles). Entrée dans `delete_project_row`. Compte rendu :
  `docs/pds-mic-rapports/lot-10.md`.
- **Lot 11** (sans migration) : page **« Participations et contrats »** du Juridique d'un
  collectif (`/legal/participations`, lien en pied de la colonne du parcours ; 404 pour un projet
  simple ou sans `manage_legal`). Un groupe par titre, une ligne par participation : statut,
  contrat (`contract_id` : état, « Manquant », « Lié »), étape du deal et négociateur
  (`DealStageBadge`), prochaine action comme la liste des deals (relance due, action et date,
  relance à venir) ; la ligne ouvre le deal. Sans deal vivant : « Pas de dossier de négociation »
  et « Ouvrir un dossier » / « Ouvrir un nouveau dossier » (direction ou responsable, titre
  vivant, participation en jeu) = l'action `createDeal` de Sacha avec la participation, négociateur
  facultatif. Lecture `loadTitleBoard` (deal : `next_action`, `next_action_on`, `follow_up_on` en
  plus), `participation-tracking(-rules).ts`, `components/legal/participations/`. « Titres et
  artistes » : contrat manquant dit « Manquant ». Aucun contact lu. Compte rendu :
  `docs/pds-mic-rapports/lot-11.md`.
- **Lot 12** (`20261114110101_participation_waivers`) : `participation_waivers` en ajout seul
  (`shoot` / `release`, motif et **échéance** obligatoires, échue = ne couvre plus, révocation
  tracée ; générique pour PDSBIZ-010 : étendre le `scope_check`). Couverture
  `participation_covered` (contrat `signed` ou dérogation ouverte) ; `contract_gaps` (interne) /
  `list_contract_gaps` : participations **confirmées** des titres **non abandonnés** concernés
  (titres visés du livrable, `none` = aucun, sinon tous). `grant_` / `revoke_participation_waiver`
  : **direction seule**, journal du collectif (`waiver_granted` / `waiver_revoked`, Activité),
  responsable prévenue. **Verrous collectif seulement** : `c_contract_check` sur
  `production_shoots` (départ ou tournage déclaré tenu) et `distribution_versions` (soumission,
  tous les titres jusqu'au lot 15) → `contract_missing`, DETAIL = contrats manquants. Écrans :
  encart en Vue d'ensemble (`ContractGapsCallout`), « Contrat manquant : … » sur le titre de
  « Titres et artistes », information avant « Prête pour tournage », `ShootContractNotice` à la
  place de « Lancer le tournage », porte de soumission de la Distribution ; gestes « ⋯ » de la
  direction et lignes de dérogation dans « Participations et contrats ». Pas de système de
  dérogation côté Sacha (vérifié). Compte rendu : `docs/pds-mic-rapports/lot-12.md`.
- **Lot 12 bis** (sans migration) : l'étape suivante de la Production d'un collectif prête pour le
  tournage dit « Faire signer les contrats avant le tournage » (contrats nommés, lien vers
  « Participations et contrats ») quand `list_contract_gaps` en trouve, étape « Tournage »
  marquée bloquée, plus de « Confirmer que le tournage a eu lieu » en externe (`NextInput.
  contractGaps`, `ProductionNext.blockedBy`, `JourneyInput.contractBlocked`) ; encart
  « Contrats de participation non signés » dans le Brief du Master et sur la page d'une session
  studio (par projet collectif, filtré à ses titres) ; « Demander des fichiers » dans
  l'Historique du master (`fileRequestLog` : demandé, reçu, annulé, remplacé). Compte rendu :
  `docs/pds-mic-rapports/lot-12-bis.md`.
- **Lot 13** (`20261114120101_title_releases`) : `projects.collective_release_mode` (`singles` par
  défaut ; collectifs déjà lancés avec leur sortie : `singles_then_compilation`), modifiable
  (`set_collective_release_mode`, droits des titres, archive / ramène, refusé si la sortie retirée
  est partie, journal). `releases.project_title_id` (nul = sortie du projet / compilation) et
  `archived_at` ; création idempotente (`ensure_title_release` : titre actif avec master, plan
  lancé ; `ensure_compilation_release`) ; dates : la sortie d'un titre garde la sienne, la
  compilation suit l'échéance. `loadRelease(…, PROJECT_RELEASE | { kind: "title" })` échoue pour
  un collectif sans sélecteur ; lectures « la » date : `next_release_date`. Détection : ISRC du
  master du titre, UPC de la compilation. UPC par sortie. Verrou de sortie du lot 12 étendu aux
  sorties (livrée ou confirmée en ligne). Page **« Sorties »** du collectif (entrée sous
  « Titres et artistes ») : mode, sorties des titres, compilation, abandonnés, date / UPC / ISRC /
  état, contrats manquants. Compte rendu : `docs/pds-mic-rapports/lot-13.md`.
- Tests : `collective-projects`, `project-titles`, `title-participations`, `artist-selections`,
  `collective-project-creation`, `title-board` (lot 6 : ce que chaque lecteur lit des deals et
  du contrat d'une participation, changer l'artiste principal après lancement et son
  événement, retirer et rattacher), `provisional-titles` (lot 7), `collective-master` (lots 8 et 9), `master-file-requests` (lot 9 bis), `deliverable-titles` (lot 10), `legal-participations` (lot 11), `participation-waivers` (lot 12), `title-releases` (lot 13).

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

## Passe Chrome des lots 7 à 10 (13/11/2026)

Corrigé : libellé du lien d'un deal pour les lecteurs d'écran (lot 6) ; plus d'état Master sur un
titre abandonné ; « Déjà fait » d'une étape du Master filtré au titre actif (lignes d'historique
rattachées à leur titre, `MasterHistoryItem.masterId`) ; filtre « Titre » des activations dans une
ligne ; « Périmètre » en liste déroulante ; récapitulatif en mots des titres choisis ; « Tous
titres confondus » pour l'absence de filtre ; renommage d'un titre provisoire expliqué. Détail :
`docs/pds-mic-rapports/recap-7-10.md`.

## Passe Chrome des lots 9 bis à 12 (14/11/2026)

Corrigé : « Participations et contrats » accessible même quand le Juridique n'est pas dans le
plan du projet (le verrou « workflow non lancé » est décidé par la page du Juridique, pas son
layout ; toujours 404 sans `manage_legal`), lien depuis « Titres et artistes » ; « Contrat non
signé » (règle) vs « Manquant » (aucun contrat) ; encart fusionné quand tournage et sortie
nomment les mêmes contrats ; toasts (double point, « Dossier de négociation ouvert. ») ;
erreurs de la modale de dérogation effacées à la saisie ; élisions des libellés lus (« d'Iris
Moon »). Le parcours de la Production bloqué par un contrat est traité au lot 12 bis. Détail : `docs/pds-mic-rapports/recap-9-12.md`.

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
  la base locale seulement, **sur base propre** pour la suite complète : avec les données de démo
  de pré-prod chargées (plusieurs directeurs généraux), `rls`, `plan-all-workflows` et `strategy*`
  échouent (`multiple_validators`) sans rapport avec ces lots. (`visible-project-ids` n° 24 échoue déjà avant ces lots : trois
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
