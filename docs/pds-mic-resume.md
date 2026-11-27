# Projet collectif (PDS Mic) : résumé

Résumé de travail de `docs/pds-mic-plan.md` (qui fait foi en cas de doute). Mis à jour à la fin
de chaque lot. Dernière mise à jour : 21/11/2026, après les retours d'Ibé du 18/11 (ticket
`PDSMIC-retours-ibe-18-11.md`, lots L0 à L5, branche `pre-prod`) ; avant : 14/11/2026, lots 12 bis et 13 et leur passe Chrome
(`docs/pds-mic-rapports/recap-12bis-13.md`).

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
| 6 | Vue « Titres et artistes » (remplace la liste des lots 2-3) ; depuis le 21/11 son tableau est le récap (retours d'Ibé) | fait |
| 7 | Titre provisoire (voie A) | fait |
| 8 | Master : sélecteur de titre | fait |
| 9 | Master : vue consolidée, abandonnés hors des comptes ; « Demander des fichiers » (9 bis) | fait |
| 10 | Ciblage marketing par titre | fait |
| 11 | Suivi juridique par participation (« Participations et contrats », deals de Sacha lus) | fait |
| 12 | Contrat manquant, verrous du tournage et de la sortie, dérogations ; 12 bis (parcours de la Production, avertissements, Historique du master) | fait |
| 13 | Sorties individuelles et compilation (données, page « Sorties ») | fait |
| 14 | Plan de sortie éditorial par titre (versions, lien de partage, PDF 16:9 style Jeho) | fait |
| 15 | Distribution par sortie | fait |
| Retours d'Ibé 18/11 | Création (invités en pastilles, pas d'homonyme), « Titre de X (à nommer) », récap des titres et des artistes, Juridique par titre, contrats d'un titre, pas de contrat avant l'accord, rattacher au Catalogue, nettoyage du Plan | fait le 21/11, migrations **à pousser en prod par Sacha** ; reste : vrais contrats par titre, questions pour Ibé le 23/11 |

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
  transmis », sans les notes). Collectif lancé : le récap compact en bas de la Vue d'ensemble,
  sans les notes (23/11/2026) ; depuis le 25/11/2026, Statut en tag, Accord, Fiche et Contrat
  (deux colonnes) et Mix, en mots courts comme le tableau. La liste minimale `ProjectTitles` est supprimée (la Vue d'ensemble lancée n'a plus
  de bloc Titres). Un `DataTable` : une ligne par titre, ses participations en retrait dessous.
  Depuis le 21/11/2026 (retours d'Ibé du 18/11) les colonnes Contrat, Négociation et Négocié par
  n'existent plus : c'est le **récap** (`loadTitleRecap`). Depuis le 22/11/2026, **une ligne par
  artiste** avec les colonnes de l'Excel d'Ibé : Artiste (titre dessous), Statut (À contacter,
  Contacté, D'accord, A refusé, Retiré ; en tag depuis le 25/11/2026, les autres états en
  point + mot), Contact (qui et son numéro, sans bouton Appeler ni WhatsApp), Accord (étape
  en mots courts, « Validé », « À valider », jour du call ; « Call à caler », le geste « Caler
  le call » étant dans le « ⋯ » de la ligne depuis le 25/11/2026, plus aucun bouton dans le
  tableau), Taux, Fiche de renseignement (ouvre la fiche), Contrat (« Envoyé », « À
  contresigner », « Attend l'accord »), puis Mix, Sortie, Distribution, Beatmaker (le nom
  seul), Note ; le tableau défile dans son cadre, Artiste fixe à gauche. Un deal est toujours
  lu sous la RLS : jamais « Pas de dossier » à tort. La ligne
  d'un titre porte (récap : Mix, fiche beatmaker, Sortie, Distribution) son **Master** (calculé sur `master_mix_versions` du projet et
  `masters.audio_state` : À mixer, Mix Vn à valider, Mix/Master Vn+1 attendu, Mix validé,
  Master final) et sa **Distribution** (lot 15 : le dépôt de la sortie du titre, ou « Avec la
  compilation · … »). Ligne d'un
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
  `loadMasterTitleScope` (`lib/master-workflow/title-scope.ts`, nul hors collectif). Depuis le
  23/11/2026, la colonne et l'en-tête de l'étape lisent **le parcours du titre**
  (`masterTitleJourney` : faits du seul master, `titleFacts`), et `/master?titre=` ouvre l'étape
  qui attend pour ce titre. Filtré :
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
  consolidée `TitlesOverview` (source, mix, mastering, validation). Depuis le 26/11/2026, un titre actif sans
  master compte parmi « Attendent leur source » (`MasterTitleScope.withoutAudio`), et ni le Master ni la
  Distribution (titre actif sans sortie, mode avec sorties de titres) ne sont « Terminé » tant qu'il en reste.
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
  ceux de sa sortie depuis le lot 15) → `contract_missing`, DETAIL = contrats manquants. Écrans :
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
  lancé ; `ensure_compilation_release`) ; dates : la sortie d'un titre naît datée de l'échéance
  du projet (depuis le 26/11/2026, M6 du test de parcours), puis garde la sienne, modifiable dans
  « Sorties » (une sortie ramenée garde sa date) ; la compilation suit l'échéance. `loadRelease(…, PROJECT_RELEASE | { kind: "title" })` échoue pour
  un collectif sans sélecteur ; lectures « la » date : `next_release_date`. Détection : ISRC du
  master du titre, UPC de la compilation. UPC par sortie. Verrou de sortie du lot 12 étendu aux
  sorties (livrée ou confirmée en ligne). Page **« Sorties »** du collectif (entrée sous
  « Titres et artistes ») : mode, sorties des titres, compilation, abandonnés, date / UPC / ISRC /
  état, contrats manquants. Compte rendu : `docs/pds-mic-rapports/lot-13.md`.
- **Lot 14** (`20261114130101_title_release_plans`) : un **plan de sortie éditorial par titre**
  (`title_release_plans`, né « Brouillon » avec le titre, brouillon `config`) ; statuts Brouillon
  › Planning provisoire (date cible = sortie du titre, ou compilation en mode « compilation »)
  › Version interne › Prêt à partager › Version révisée › Plan actif › Plan archivé (bilan, ou
  titre abandonné ; réactivé, il retrouve son statut). Versions en ajout seul
  (`title_release_plan_versions` : document, brouillon, actions lues, auteur, statut), journal
  (`title_release_plan_events`). Responsable du projet seule. Actions = ciblées sur le titre +
  globales (lot 10) ; une action modifiée après la dernière version est **signalée** (calculé).
  Lien `/t/[token]` d'une version (anon, document seul, révocable) ; PDF 16:9
  (`htmlToPdf(…, { cssPage: true })`). Rendu `lib/projects/title-plan/html.ts` ; polices dans
  `fonts.ts` (League Gothic 75 % pour SegmentA, Hanken Grotesk) ; logo tracé `pds-logo.ts`, à
  remplacer par le fichier officiel. Pages « Plans de sortie » (sous « Sorties »). Compte rendu :
  `docs/pds-mic-rapports/lot-14.md`.
- **Lot 15** (`20261114140101_release_distribution`) : la **Distribution par sortie**. Depuis le
  23/11/2026 : `/release` sans `?sortie=` ouvre la sortie où une étape attend le lecteur (sinon
  une non finie ; « Sorties » s'il n'y en a aucune), et le fil « Distribution ▸ sortie » propose
  les autres sorties avec l'état de leur dépôt.
  `release_id` sur les dix tables de la Distribution (nul = projet simple, inchangé ; index
  partiels ; garde-fou : un collectif écrit toujours avec sa sortie) ; fonctions avec
  `p_release_id` (nul par défaut, `release_required` pour un collectif sans sortie). Refus de
  soumission : sortie archivée, titre abandonné, titre provisoire, contrat sans dérogation de
  sortie (`release_submission_blockers`). Sortie d'un titre : pochette livrée par la Production
  quand il y en a une qui couvre le titre (depuis le 26/11/2026), sinon celle du titre (Catalogue),
  crédits pour les plateformes (PDS principal, invités en featuring, « Titre (feat. X) »,
  `trackDelivery`), format Single ; compilation : pochette du projet, pistes = titres actifs.
  Adresse `?sortie=` (`lib/distribution/scope.ts`), sortie et pistes `release-scope.ts`.
  « Sorties » et « Titres et artistes » lisent `release_distribution_states`. La Distribution
  s'applique à tout collectif (décision 9). Compte rendu : `docs/pds-mic-rapports/lot-15.md`.
  Depuis le 26/11/2026, « Prêt pour la sortie » d'un collectif se calcule sur chacune de ses sorties actives
  (`collectiveDistribution`, `lib/legal/readiness/queries.ts`), plus sur une sortie de projet absente en mode
  « Sorties individuelles ».
- **Retours d'Ibé du 18/11** (`20261121200101_collective_recap`, `20261121210101_collective_title_contracts`,
  **à pousser en prod par Sacha** ; détail : `docs/ARCHITECTURE.md` § 8 sexies). Récap : `project_titles.release_decision`
  (sortie oui / non / nul, par titre, sans conséquence) et `set_project_title_release` (journal `release_decided`) ;
  `set_title_participation_contact` et `set_title_participation_note` (écrits, jamais lus : aucun contact privé
  retourné) ; notifications `participation_confirmed` / `participation_declined` au responsable du projet, quel que soit
  le chemin (déclencheur sur `title_participations`) ; garde `artists` `artist_name_taken` (23505, nom normalisé : pas
  d'homonyme vivant) ; `project_title_label` (« Titre de X (à nommer) ») lu par les textes SQL des contrats manquants et
  des sorties (`title_release_name` stocké : les noms déjà là changent au prochain `ensure_title_release`).
  Contrats : `title_contract_needs` (production, `image_rights`, `publishing`, `beatmaker` par titre ; RLS
  `manage_legal`, `zz_project_live`, `delete_project_row`) écrite par `confirm_title_contract_needs` (journal
  `contract_needs_confirmed`) ; garde `agreement_not_validated` (P0001) dans `generate_legal_contract` pour un invité dont
  une participation en jeu n'a pas d'accord validé, et sur `title_participations.contract_id`
  (`participation_agreement_validated`, `artist_agreement_pending`). Rédaction : toujours un contrat par personne.
  Tests : `collective-recap` (42), `collective-title-contracts` (39). Données de démo « Assurance 30 » :
  `supabase/preprod/showcase-assurance-30.sql`, à jouer à la main en pré-prod après `showcase-business.sql`.
- **Entrer par le titre** (Maël 25/11/2026, sans migration) : « Titres » (`/tracks`, entrée de navigation avant « Titres
  et artistes ») liste les titres avec leur Master, Juridique et Distribution (un anneau, le nom de l'étape, « À vous »
  quand c'est au lecteur : deux lignes par case au plus) ; la page d'un titre (`/tracks/[titleId]`) est la Vue
  d'ensemble d'un projet pour ce seul titre (« Maintenant », « Progression », puis ses artistes en récap compact), les
  autres titres dans le fil. Dans le fil d'un module, le nom du titre ramène à sa page (« Master / Néons ⌄ / Source ») ;
  les sélecteurs des modules restent des raccourcis. Le nom d'un titre dans « Titres et
  artistes » ouvre sa page. Calcul : `lib/projects/title-journeys.ts` (`masterTitleJourney`, portée de
  `legalTitleLayout`, `distributionContext` de la sortie du titre ou de la compilation, puis `workflowCards`). Cadrage
  et Marketing restent ceux du projet. Depuis le 25/11/2026, **une seule entrée « Titres », deux vues** : Par titre
  (`/tracks`) et Par artiste (`/titles`, l'ancien « Titres et artistes »), même en-tête et mêmes gestes ; le récap de
  la Vue d'ensemble s'appelle « Artistes ». La Distribution d'un titre qui sort avec la compilation le dit
  (« Distribution · avec la compilation », « Avec la compilation » dans la liste) : ce qui s'y fait vaut pour tous les
  titres de la compilation.
- **Test de parcours du 26/11** (`docs/pds-mic-rapports/test-parcours-26-11.md`) : création (M2, M3, ci-dessous
  « Invités dès la création ») et date des sorties de titres (M6, lot 13) ; le Brief de cadrage et le Plan comptent
  tous les titres actifs, avec ou sans master (M4) ; la sortie d'un titre reprend la pochette livrée par la
  Production (M7) ; « Confirmer pour les N titres » sur « Contrats du titre » (M8) ; la page de l'ingénieur nomme
  les titres du dossier (M9) ; sans `?sortie=`, la Distribution ouvre la seule sortie ou laisse choisir (M10) ; le
  « À vous » de chaque sortie compte dans le menu et la Vue d'ensemble (M12) ; après « Pas d'accord nécessaire »,
  le plan ne propose plus le contrat d'un invité (même choisi avant le lancement), une action déjà stockée passe en
  « fait », « Prêt pour la sortie » le lit réglé, et le Suivi liste les invités dans « Projet ».
- Tests : `collective-projects`, `collective-creation-credits` (26/11), `project-titles`, `title-participations`, `artist-selections`,
  `collective-project-creation`, `title-board` (lot 6 : ce que chaque lecteur lit des deals et
  du contrat d'une participation, changer l'artiste principal après lancement et son
  événement, retirer et rattacher), `provisional-titles` (lot 7), `collective-master` (lots 8 et 9), `master-file-requests` (lot 9 bis), `deliverable-titles` (lot 10), `legal-participations` (lot 11), `participation-waivers` (lot 12), `title-releases` (lot 13), `title-release-plans` (lot 14), `release-distribution` (lot 15).

## Côté Business (Sacha), touchant les collectifs

Lu après le pull du 13/11/2026 ; ses tests : `deals-collective`, `deals-bm-opens`.

- **Invités dès la création** (`20261112130101_collective_guests`) : `create_collective_project`
  prend `p_guest_artist_ids` (dernier paramètre, facultatif) ; champ « Artistes invités » du
  formulaire (`collective-fields.tsx`), à côté ou à la place d'une sélection ; sélection et
  invités ensemble : chaque artiste une fois, jamais l'artiste principal. Les artistes crédités
  des titres choisis sont préremplis dans « Artistes invités » (`ProjectKindFields`).
  Depuis le 26/11/2026 (`20261126180101_collective_creation_credits`, décisions de Maël après le
  test de parcours, qui remplacent celles du 23/11) :
  - un invité déjà crédité sur un titre choisi reçoit sa participation proposée **sur ce titre**
    (sur chacun de ceux qui le créditent), sans titre « à nommer » ; seul un invité crédité sur
    aucun titre choisi reçoit un titre sans nom (`add_project_title` / `add_title_participation`) ;
  - chaque titre choisi crédite l'artiste principal en tête (`main`) et les invités du titre en
    featuring (« PDS feat. Elio Danvers »), sans doublon ni retrait
    (`credit_collective_title_at_creation`, à la création seulement) ; un master aussi dans un
    projet simple ou archivé reste tel quel (décision 10). Le dossier de livraison n'a donc plus
    à renvoyer au Catalogue pour « Crédits pour les plateformes » ;
  - les titres choisis ne sont proposés qu'en Musical : un collectif Contenu · PDS Mic part de
    ses invités, chacun sur un titre sans nom.
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
  de journal (`deal_follows_participation`). La cellule Accord du récap de « Titres et artistes » le
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

## Passe Chrome des lots 12 bis et 13 (14/11/2026)

Vérifié : parcours de la Production bloqué puis débloqué par une dérogation (Travail compris),
encarts du Brief et d'une session studio, demandes de fichiers dans l'Historique du master, page
« Sorties » dans les trois modes (date, UPC, retour des mêmes sorties), Distribution d'un projet
classique inchangée. Corrigé : colonne « État » des sorties sous le nom sur téléphone, bouton
« Modifier le mode ». Corrigé ensuite (commit séparé) : dans un collectif, l'Historique du
master nomme chaque titre comme le projet, le nom au Catalogue en second s'il diffère
(« Ballade du port · Velours au Catalogue »). Détail : `docs/pds-mic-rapports/recap-12bis-13.md`.

## Passe Chrome du lot 14 (14/11/2026)

Vérifié : un plan par titre, actions ciblées et globales au bon plan, gestes Brouillon → Plan
actif, version révisée, signalement après le changement d'une action globale, lien ouvert sans
compte (rien d'interne) puis retiré, PDF 16:9 comparé page par page à la référence (conforme,
page « Intention » ajoutée, placements sans logos), lecture seule pour la direction, projet
classique inchangé, 390 px sombre et clair. Corrigé : tailles des titres condensés et des dates
du document, textes alternatifs, frise et lignes d'actions sur téléphone, journal des liens.
Retouches ensuite (commit séparé) : couverture « PDS - Titre (feat. Invité) » avec les invités
confirmés (`withFeaturing`, `joinArtistNames` dans `participation-rules.ts`) ; plateformes et
placements séparés dans le brouillon (`placements` avec logo, `listeningVisual`), logo au-dessus
du placement et capture au-dessus du lien d'écoute comme la référence, texte seul sans image.
Détail : `docs/pds-mic-rapports/lot-14.md`.

## Passe Chrome du lot 15 (14/11/2026)

Vérifié (desktop, 390 px, sombre et clair ; Lina et Claire) : « Sorties » et « Titres et
artistes » lisent le dépôt de chaque sortie ; Distribution de Marina (crédits pour les
plateformes, pochette du titre, refus pour contrat, dérogation de sortie, V1 soumise puis
validée) ; titre provisoire bloquant ; compilation (pistes, crédits par piste, pochette du
projet) ; « Minuit pile » inchangé. Corrigé : droit d'insérer `release_id` sur le dossier,
pochette d'une sortie de titre (paramètres, dossier, contrôle « Visuel »), lien des contrats vers
« Participations et contrats », date d'une sortie de titre dans « Sorties ». Base locale
reconstruite après une remise à zéro faite par erreur (voir `lot-15.md`). Détail :
`docs/pds-mic-rapports/lot-15.md`.

## Règles à tenir à chaque lot

- Le récap suit l'Excel d'Ibé (21/11) : fiche « Pas envoyée / Envoyée / Renseignée » (22/11), contrat envoyé / retour reçu /
  signé, « Son reçu » lu au Master (jamais un champ en double), rôle du contact (« Producteur » = libellé libre
  `title_participations.contact_label`, migration `20261121220101`, pas le rôle `producer` du Réseau). Il ne lit
  **jamais** les données personnelles d'une fiche (naissance, sécu, adresse, RIB) : garde-fou `privateReadsOf`.

- Toute règle nouvelle ne joue que si `projects.collective = true` ; un projet simple ne change pas
  (y compris quand il partage un master avec un collectif : aucun crédit automatique).
- « Artistes du projet » = participations ni refusées ni retirées des titres non abandonnés, plus
  les crédits des titres actifs.
- Les cinq principes : jamais mêler deux titres ; jamais dupliquer le projet ; pas les mêmes actions
  marketing pour chaque titre ; aucun contact privé exposé ; toute dérogation tracée.
- Nouvelle table liée à un projet : RLS forcée, écriture par fonctions, `zz_project_live`, entrée
  dans `delete_project_row`. Calculé, jamais stocké : artistes du projet, état d'un titre, d'un contrat.
- Rien ne se supprime : un titre s'abandonne, une participation se refuse ou se retire.
- Un titre sans nom se lit « Titre de X (à nommer) » (« Titre 3 (à nommer) » sans invité), partout, en SQL
  comme dans l'app (`project_title_label`, `projectTitleLabel`).
- Au Juridique d'un collectif, un invité et un contributeur de même nom sont une seule personne.
- Le contrat d'un invité n'est rédigé qu'après l'accord validé (« En attente de l'accord »).
- Le même artiste sur deux titres est permis, avec confirmation ; jamais d'homonyme au Catalogue.
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
  fixes en plus du nom ; au-delà, regrouper plutôt que faire défiler. Seule exception :
  « Titres et artistes » (22/11/2026), qui reprend l'Excel entier, défile dans son cadre avec la
  colonne Artiste fixe (jamais la page).
