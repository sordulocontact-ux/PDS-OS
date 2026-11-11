# Projet collectif (modèle PDS Mic) : état des lieux et proposition de modèle

Lot 0, exploration seule (11/11/2026), complété au lot 0 bis (même jour) par les décisions
validées et le découpage. Aucun code ni migration n'a été modifié. Ce document décrit l'existant
tel que le code le montre, les décisions prises, puis le modèle et les lots. Les chemins sont
relatifs à la racine du dépôt ; les migrations sont dans `supabase/migrations/` (la plus récente
qui redéfinit un objet fait foi).

**Ordre de lecture** : § 0 (constat), **§ 0 bis (décisions validées)**, § 3 (modèle), **§ 3 bis
(sorties titre par titre)**, § 6 (risques), **§ 8 (découpage)**. Les § 1 et 2 sont l'inventaire de
référence ; là où le § 0 bis tranche une question ou une variante des § 3 à 7, il fait foi.

Objectif rappelé : **un seul projet** qui contient **plusieurs artistes** et **plusieurs titres**,
chacun avec son propre suivi, sans casser les projets à un seul artiste.

---

## 0. Ce qu'il faut retenir

1. **Le socle multi-titres existe déjà.** Un projet a N titres (`project_masters`), un titre a N
   artistes crédités (`master_artists`). Le Master, les répartitions et les bulletins SACEM sont
   déjà tenus **par titre dans un projet** (clé `project_id` + `master_id`).
2. **Le projet ne connaît pas ses artistes.** Il les lit sur ses titres, et partout où un seul
   artiste est affiché, c'est **le premier crédit du premier titre** (`project_artist_name`,
   `project_artist_id`, `artistNameOf`). Un collectif s'afficherait sous le nom d'un seul artiste.
3. **Aujourd'hui, un « PDS Mic » est un projet de type Contenu** (`content_formats`) qui **ne peut
   pas avoir de titre** (`create_project`, `link_master_to_project` → `project_takes_no_title`) et
   n'a qu'un artiste facultatif (`projects.artist_id`).
4. **Tout le reste est au niveau du projet** : Brief Mix/Master (un ingénieur, un valideur, un jeu
   de dates), tout le Marketing, la Distribution (un dossier, une date de sortie), le Budget.
   Aucune action marketing ne peut cibler un titre ou un artiste.
5. **Il n'existe ni « Business manager » ni contact privé** : tout le Réseau est lisible par
   tout membre actif.
6. **Un titre ne peut pas être retiré d'un projet sans perdre son historique** : supprimer la
   ligne `project_masters` efface en cascade ses versions de mix et de mastering, ses sources
   confirmées et ses livrables reçus.

---

## 0 bis. Décisions validées (lot 0 bis, 11/11/2026, réponses du client intégrées le même jour)

| # | Décision | Ce qu'elle change dans le plan |
| --- | --- | --- |
| 1 | **Collectif = drapeau `projects.collective`**, indépendant du type et du format. « PDS Mic » reste une donnée (`content_formats`). **Les anciens PDS Mic ne sont pas convertis.** | Aucune migration de données sur les projets existants : `collective` vaut `false` partout par défaut. |
| 2 | **Libellé « Projet collectif ».** **PDS est l'artiste principal par défaut** (modifiable) : son nom s'affiche à la place de l'artiste unique. Les invités sont des participations. L'artiste principal est aussi **crédité `main` sur chaque titre** (décision 10). | L'artiste principal d'un collectif est porté par `projects.artist_id` (déjà là, aujourd'hui réservé au contenu), proposé à PDS à la création. Pour un collectif, `project_artist_name` / `project_artist_id` / `artistNameOf` lisent **d'abord** `projects.artist_id` (ordre inverse de la règle actuelle, qui garde la sienne pour les projets simples) : la lecture reste juste pour un collectif encore sans titre au Catalogue, ou dont un titre aurait un autre premier crédit. Les invités ne passent pas par `projects.artist_id`. |
| 3 | **Titre sans nom : voie A.** Titre provisoire au Catalogue dès le premier audio, marqué `masters.title_is_provisional`. | § 3.3 tranché. Le vrai nom remplace le provisoire par le même geste que la promotion d'une maquette (`promote_demo(p_master_id, p_title)` prend déjà le titre, `20261105220101…:422`). |
| 4 | **Brief Mix/Master : un seul par projet pour la V1**, sans bloquer un futur réglage par titre. | `master_briefs` garde `unique (project_id)`. Un réglage par titre viendra plus tard **en plus** (table de surcharges par titre, nulle = Brief du projet), jamais en éclatant le Brief. |
| 5 | **Business manager : futur poste**, qui ne verra que les dossiers qui lui sont affectés ; ses contacts visibles par lui et la direction. **Fait avec le module Business, hors de ces lots.** | Plus de lot « contacts privés » ici. Règle pour ces lots : **ne créer aucun chemin nouveau qui expose un contact** (pas de fonction SECURITY DEFINER qui lit `network_contacts` ; `title_participations.contact_id` lu sous RLS seulement), pour ne rien avoir à défaire quand la visibilité privée arrivera. |
| 6 | **Contrat de participation** (client, 11/11/2026). Sans contrat signé, **la préparation et l'enregistrement restent possibles**, mais PO prévient en amont que le contrat manque. **Le passage au tournage est bloqué** tant que le contrat n'est pas signé ; la **direction seule** (`validate`) peut autoriser exceptionnellement la poursuite (motif, personne qui valide, date, dans l'historique). **Aucune sortie sans contrat signé ou dérogation formelle.** | Contrat signé = contrat lié à la participation au statut `signed` (`contracts_status_check`, `20260929000201_file_versions_and_contracts.sql:154-157`). Trois niveaux, pour un collectif seulement : **avertissement** (préparation, enregistrement : vue Titres, sessions studio, Brief Mix/Master), **verrou du tournage** (Production, voir « Où est l'étape tournage » ci-dessous), **verrou de la sortie** (soumission en Distribution d'une sortie, lot 15). `participation_waivers` porte un **périmètre** `shoot` ou `release` : une autorisation de tournage ne vaut pas pour la sortie. Ajout seul, révocable (lot 12). |
| 7 | **Mode de sortie réglé par projet collectif** (client) : **sorties individuelles uniquement**, **compilation finale uniquement**, ou **sorties individuelles puis compilation**. | `projects.collective_release_mode` (`singles` / `compilation` / `singles_then_compilation`). Sortie individuelle = une ligne `releases` par titre (`project_title_id` renseigné). **Compilation = la sortie de projet** (`project_title_id` nul) avec son propre UPC. Détail et code touché au § 3 bis. |
| 8 | **Abandon confirmé** (client) : un titre abandonné est **archivé puis repris sans perdre** historique, fichiers, négociations ni validations. Son master reste au Catalogue en **maquette « abandonnée »**. **On peut ajouter des titres et des artistes en cours de projet.** | `project_titles.status` : `abandoned` → `active` permis (motif d'abandon gardé dans l'historique). L'abandon ne change **que** le statut du titre (et `masters.demo_status`) : rien n'est supprimé ni modifié dans `project_masters`, les versions Master, les répartitions, bulletins, clearances, participations, contrats ou dérogations ; la réactivation retrouve tout tel quel. À l'abandon, `masters.demo_status = 'abandoned'` ; à la réactivation, retour à l'état de maquette d'avant. Cas limite au lot 2 : un titre **déjà promu** au Catalogue n'est plus une maquette (`set_demo_status` refuse `not_a_demo`, `20261105220101…:401-403`) ; on ne le repasse pas en maquette, seul le titre du projet est abandonné. Ajouts en cours de route, pour un collectif seulement : titres (lot 2, assouplit `project_masters_editable`) et participations (lot 3, jamais figées par le lancement). |
| 9 | **Distribution : un projet collectif passe par la Distribution, sortie par sortie.** | La Distribution s'applique à un collectif quel que soit son type (aujourd'hui réservée à `music_release`, `lib/workflow-status/rules.ts:52-62`), et se tient par sortie : chaque sortie individuelle et la compilation (§ 3 bis, lot 15). |
| 10 | **Crédits** (client) : sur les plateformes, **PDS est l'artiste principal et l'invité est en featuring**, par exemple « PDS MIC #4 (feat. Artiste) ». Les sorties alimentent la page artiste de PDS **et** celle de l'invité. | L'artiste principal du projet (`projects.artist_id`, PDS par défaut) est crédité **`main`, en tête, sur chaque titre** (`master_artists`) ; l'invité est crédité **`featuring`**. Ces crédits sont écrits à la création du titre au Catalogue (lot 7) et à la confirmation d'une participation (lot 3), jamais retirés par une participation. Dans PO, les deux fiches artiste trouvent le titre par leurs crédits ; sur les plateformes, par les crédits livrés. La Distribution vérifie et applique les règles du distributeur et des plateformes (featuring dans le titre ou en champ dédié, orthographe, ordre) **sans changer ce principe** (lot 15). |

**Plus aucune question n'est en attente du client** (réponses du 11/11/2026 : décisions 6, 7, 8
et 10). Reste un point à vérifier sur les données, sans toucher à la base, avant le lot 1 : qu'une
fiche artiste « PDS » existe au Catalogue.

### Où est l'étape « tournage » dans le code (décision 6)

- Le tournage appartient au module **Production**, qui se tient **par livrable marketing** et non
  par titre : une fiche `production_sheets` par `deliverable_id`
  (`20261010003001_production_preparation.sql:67-71`).
- Les phases sont calculées dans `lib/production/phase.ts:15-16,42-45` : « Prête pour tournage » =
  `production_sheets.ready_at` posé ; « Tournage en cours » = `production_shoots.state =
  'in_progress'`.
- « Prête pour tournage » : `mark_production_ready`
  (`20261014000601_production_readiness_evidence.sql:225-254`), refusé tant qu'un contrôle
  avant tournage requis est ouvert (`checks_open`).
- « Lancer le tournage » : `startShoot` (`lib/production/shoot/shoot-actions.ts:201-211`) →
  `writeShoot` (`:33-58`), qui écrit `production_shoots.state = 'in_progress'`.
- **Point de verrou unique en base** : le trigger `production_shoots_check`
  (`20261010006101_production_shoot.sql:62-107`, jamais redéfini depuis) refuse déjà (`not_ready`)
  tout passage à `in_progress` / `done` / `partial` / `interrupted` depuis `planned` / `postponed`
  ou à l'insertion quand la fiche n'est pas prête. Toute écriture de `production_shoots` y passe,
  y compris la confirmation « le tournage a eu lieu » d'une production externe. Le verrou
  « contrat » s'y ajoute (nouvelle erreur, par exemple `contract_missing`), **pour un collectif
  seulement**.
- **Prévenir en amont** : la synthèse des contrôles avant tournage (`readySynthesis`,
  `components/production/readiness/ready-synthesis-table.tsx`) montre le contrat manquant comme
  une information, **pas** comme un contrôle qui empêcherait « Prête pour tournage » : le client
  bloque le tournage, pas sa préparation.
- **Ce que ça impose** : comme la fiche de Production vise un livrable et non un titre, le verrou
  a besoin du lien livrable → titres, `deliverable_titles` (lot 10) ; le lot 12 dépend donc du
  lot 10. Règle **validée** (11/11/2026) : un livrable **ciblé** ne vérifie que les participations
  confirmées des titres visés ;
  un livrable **sans ciblage** vaut pour tout le projet et vérifie celles de **tous les titres
  actifs** (prudent : un seul contrat manquant bloque, d'où l'intérêt de cibler). Les
  participations prises en compte sont les `confirmed` ; l'artiste principal (PDS) n'est pas une
  participation et n'est pas vérifié.

---

## 1. Les modèles existants

Légende du niveau : **projet** = une ligne par projet ; **projet × titre** = une ligne par titre
dans un projet ; **titre** = attaché au titre du Catalogue, quel que soit le projet ; **artiste**
= attaché à la fiche artiste.

### 1.1 Projet

| Table | Rôle | Niveau | Source |
| --- | --- | --- | --- |
| `projects` | titre, `type` (`music_release` / `content` / `event`), `music_format` (single, ep, album, mixtape, compilation, other), `content_format_id`, `artist_id` (facultatif, contenu seul), `owner_person_id`, `master_validator_person_id`, échéance, budget, priorité | projet | `20260925000202_domain_projects.sql`, `20260927011001_project_types_and_formats.sql`, `20261105170101_project_master_validator.sql` |
| `content_formats` | formats PDS réutilisables (« PDS Mic » est une ligne, jamais du code) | organisation | `20260927011001…:19`, `20260927011101_pds_mic_format.sql` |
| `project_masters` | titres du projet, clé primaire `(project_id, master_id)` + `position` | projet × titre | `20260926000501_catalog_and_project_creation.sql:189-203` |
| `project_stages`, `project_plans`, `project_plan_items` | étapes, plan du projet, un workflow au plus par plan (`unique (plan_id, workflow)`) | projet | `20260925000202…:83`, `20261006000201_project_plan.sql:17,50` |
| `framing_briefs` (+ `framing_*`) | Brief de cadrage versionné ; l'instantané porte **un seul** `artist` texte | projet | `20261006000101…:160`, `lib/framing/brief-snapshot.ts:54,196` |

Règles de forme : `check_project_shape` (`20260927011001…:101-127`) exige au moins un titre pour
une sortie musicale et **un seul pour un single** ; le trigger différé `z_check_masters`
(`20260926000501…:238-245`) le revérifie au commit. **La liste des titres n'est modifiable
qu'avant le lancement** (`project_masters_editable`, `20260927001102_security_audit_fixes.sql:84-116`).

### 1.2 Artiste et titre (Catalogue)

| Table | Rôle | Niveau | Source |
| --- | --- | --- | --- |
| `artists` | nom (unique par organisation), `relation` (`signed` / `collaboration`), profil | artiste | `20260926000501…`, `20260927002101_artist_relation.sql` |
| `artist_contacts` | contacts de l'artiste, rôle `manager` / `booker` / `press` / `legal` / `other`, lien `contact_id` vers le Réseau | artiste | `20260926002001_artist_profile.sql:46-67` |
| `artist_files`, `artist_identity_versions`, `artist_moodboards` | fichiers, identité, moodboards | artiste | `20260927000101…`, `20261013100101_artist_identity.sql`, `20261110150101…` |
| `masters` (« Titre » à l'écran) | `title` **obligatoire et non vide** (`masters_title_not_blank`), ISRC unique par organisation, `audio_state`, `variant`, `demo_status` (`draft` / `developing` / `validated` / `abandoned`) | titre | `20260926000501…:80,87`, `20261105220101_studio_sessions.sql:359-363` |
| `master_artists` | crédits ordonnés, rôle `main` / `featuring`, clé `(master_id, artist_id)` | titre | `20260926000501…:100-102` |
| `master_files`, `master_tracks` (pistes), `master_contributors`, `master_splits`, `master_declarations` | audio, pistes, crédits, parts, déclarations SCPP/SACEM… | titre | `20260927003001_master_page.sql` |
| `master_sessions` + `master_session_titles` / `_projects` / `_artists` | sessions studio, liens N:N | titre / projet / artiste | `20261105220101…:132` |

Invariant : un titre a au moins un artiste (`master_requires_artist`).

### 1.3 Master (workflow)

| Table | Niveau | Remarque |
| --- | --- | --- |
| `master_briefs` | **projet** (`unique (project_id)`, `20261005000101_master_briefs.sql:42`) | un ingénieur mix, un ingénieur mastering, un valideur, un jeu de dates, une direction artistique pour tous les titres |
| `master_transmissions` | projet | le paquet JSON liste les titres, chacun avec son `masterId` (`lib/master-workflow/transmission-types.ts:14-18`) |
| `master_mix_versions` | **projet × titre** | `unique (project_id, master_id, stage, number)`, une version approuvée par `(projet, titre, étape)` (`20261005015001…:22-27`) |
| `master_flow_sources`, `master_deliverables_received` | projet × titre | source confirmée, livrables reçus |
| `project_invoices` (origine master) | projet | une facture par ingénieur et par projet, demandée quand **tous** les titres ont leur master final (`20261020060101_project_invoices.sql:100,270-295`) |

Le parcours Master gère déjà plusieurs titres : une étape est faite quand chaque titre du tour
l'est (`docs/ARCHITECTURE.md` § 8 septies ; `lib/workflow-status/rules.ts:127-130`).

### 1.4 Juridique

| Table | Niveau | Source |
| --- | --- | --- |
| `legal_intakes`, `legal_plans`, `release_validations` | projet (unique `project_id`) | `20261004001001_legal_intake.sql:40`, `20261004001201…:36`, `20261019090201…:46-58` |
| `legal_answers`, `legal_facts` | projet, ou projet × titre (`master_id` nul = tout le projet) | `20261004001001…:52-53,113-114` |
| `legal_clearances` (+ ayants droit, échanges, termes, contrats, événements) | projet, titre facultatif | `20261005006001_legal_clearance.sql` |
| `legal_plan_items` | projet, titre facultatif | `20261004001201…:47-68` |
| `legal_split_sheets` → versions → parts → confirmations | **projet × titre** (`unique (project_id, master_id)`) | `20261005005001_legal_splits.sql:34-36` |
| `legal_formalities` (bulletin SACEM 725) | **projet × titre** (`unique (project_id, master_id, definition_key)`) | `20261005007001_legal_formalities.sql:62` |
| `legal_agreement_needs`, `legal_no_agreement_reasons`, `legal_project_contacts` | projet × personne (`unique (project_id, contact_id)`) | `20261005001001…:292`, `20261019090101…`, `20261008000101…:21` |
| `contracts`, `contract_parties` | `project_id` et `artist_id` facultatifs, **aucun lien à un titre** (sauf via une clearance) | `20260929000201_file_versions_and_contracts.sql:126-165,281-296` |

### 1.5 Marketing

Toutes les tables sont **au niveau du projet**, aucune n'a de `master_id` ni d'`artist_id` :
`strategy_*` (`strategy_workspaces` clé `project_id`), `design_*` (`design_workspaces` clé
`project_id` avec **une** identité d'artiste), `production_*` (par fiche, elle-même par
livrable), `marketing_activations` et `activation_*` (cibles = contacts presse/influence, pas des
titres), `marketing_reports`, `marketing_closures` (une active par projet). Les livrables viennent
de la Stratégie (`strategy_deliverables`, titre libre). Rien n'impose une action par titre, mais
rien ne permet d'en viser un.

### 1.6 Distribution

Tout est **au niveau du projet** : `distribution_dossiers` (`unique (project_id)`,
`20261011100101…:39`), versions (une en attente par projet), contrôles (`unique (project_id,
check_key)`, sans clé par titre), plateformes, déclarations, clôture (une ouverte),
`distribution_derogations` (une ouverte par projet). `releases` porte titre, ISRC, UPC et date ;
le schéma permet plusieurs sorties par projet mais **le code n'en lit qu'une**
(`.limit(1).maybeSingle()` : `lib/release/queries.ts:40-44`, `lib/design/conception.ts:231-236`,
`lib/distribution/platforms-queries.ts:56-61`, `lib/legal/readiness/queries.ts:61-67`…). L'ISRC
est aussi sur chaque titre (`masters.isrc`) ; l'UPC seulement sur la sortie.

### 1.7 Budget

`budget_lines` : projet (lien facultatif à un levier, un livrable, une activation, une facture),
**aucun lien à un titre** ; une ligne Mix et une ligne Mastering par projet (`unique (project_id,
master_role)`, `20261005012001_budget_four_states.sql:20-22`). Les dépenses d'artiste sont
retirées (`20261109190101_budget_posts.sql:26`). Lecture : `can_read_project_budget` (responsable
ou `view_all_projects`, `20261010001701_budget_privacy.sql`).

### 1.8 Rôles et visibilité

- **Trois postes** (`memberships.role`) : `general_director`, `project_manager`,
  `creative_director` ; permissions par `role_permissions()` (dernière version
  `20261105220101_studio_sessions.sql:26-43`). Aucun poste ni rôle « Business manager ».
- **Qui voit un projet** : `can_see_project_row` / `visible_project_ids()` (direction, responsable,
  destinataire d'une transmission en attente, directeurs créatifs de l'équipe, ingénieurs du
  Brief, membres de la Production). Les deux fonctions doivent rester identiques
  (`supabase/tests/visible-project-ids.test.sql`).
- **Qui écrit** : le responsable seul (`is_project_owner`).
- **Artistes et Catalogue** : lisibles par **tout membre**, jamais filtrés par projet ;
  `artist_contacts` réservé à `manage_catalog` (direction et chefs de projet).
- **Réseau** (`network_contacts`) : **lisible par tout membre actif**, écrit par tous les postes
  (`manage_network`) ; aucune colonne de propriétaire ni de visibilité
  (`20260929000101_network_contacts.sql:127-140`). `contact_legal_details` : `manage_legal` ou
  `manage_contracts`, sur toute l'organisation ; RIB (`contact_bank_accounts`) : direction seule.

### 1.9 Dérogations déjà tracées

| Mécanisme | Ce qui est gardé | Limite |
| --- | --- | --- |
| `release_readiness_waivers` | contrôle levé, motif, `granted_by`, `granted_at` ; direction seule (`validate`) | `unique (project_id, control_key)` : un nouvel octroi **remplace** le précédent, pas de révocation |
| `distribution_derogations` | périmètre, risque, motif, échéance, octroi, usage, révocation | une ouverte par projet ; ne concerne que la Distribution |
| `legal_no_agreement_reasons` | « pas d'accord nécessaire », motif, auteur, date | par personne et par projet |

Aucun mécanisme ne **bloque** aujourd'hui l'avancée faute de contrat signé : les contrôles
« contrat » de « Prêt pour la sortie » ne sont jamais bloquants (`lib/legal/readiness/controls.ts:131`).

---

## 2. Comment un projet est lié à un artiste aujourd'hui

```
projects ──< project_masters >── masters ──< master_artists >── artists
    │                                                     (main / featuring)
    └── artist_id (facultatif, projets de contenu et anciens projets)
```

- **Sortie musicale** : aucun artiste sur le projet. Ses artistes sont ceux crédités sur ses
  titres. `create_project` écrit `artist_id = null` (`20261105170101…:214`).
- **Contenu** (dont PDS Mic) : un seul `projects.artist_id`, facultatif, et aucun titre.
- **« L'artiste du projet »** = premier crédit du premier titre, sinon `projects.artist_id` :
  - SQL : `project_artist_name` (`20260926000501…:249-269` ; recherche, `get_smartlink`),
    `project_artist_id` (`20261013100101…:22-37` ; identité artistique de la Conception, quatre
    appels dans ce fichier) ;
  - TS : `artistNameOf` (`lib/projects/queries.ts:162-167`) → `artistName`, repris par le Brief de
    cadrage, le Brief créatif, le dossier de presse, le plan de sortie, les fiches presse et
    influence, la fiche de livraison (« Artiste principal », `lib/distribution/delivery-file.ts:111`),
    l'en-tête du projet (`lib/projects/header.ts:63`), les feuilles de call.
- **La fiche artiste** trouve ses projets par ses titres et par `projects.artist_id`
  (`docs/ARCHITECTURE.md` § 2, « Onglets de la fiche artiste »).
- Déjà prêt pour plusieurs artistes : `master_listener_contacts`
  (`20261020010201_master_artist_listen.sql:33-36`), les sessions studio.

---

## 3. Proposition de modèle de données

Principe directeur : **étendre, ne pas dupliquer**. Le projet reste une ligne `projects` ; le
titre du Catalogue reste `masters` ; tout ce qui est déjà tenu par `(project_id, master_id)`
continue de l'être. On ajoute seulement ce qui manque : le titre **dans le projet** (qui peut
exister avant d'avoir un nom ou un audio, et être abandonné) et la **participation** d'un artiste
à un titre.

### 3.1 Schéma

```
projects (existant)
  + collective boolean not null default false        ← décision 1
    artist_id (existant) = artiste principal d'un collectif, PDS par défaut   ← décision 2
  + collective_release_mode text null                 ← décision 7 (lot 13)
      singles | compilation | singles_then_compilation   requis si collective, nul sinon
     │
     ├──< project_titles (nouveau)                    « Titre » du projet collectif
     │      id, organization_id, project_id, position
     │      working_title text null                   titre de travail, nul = sans nom
     │      master_id uuid null ─────────────┐        rempli quand le titre existe au Catalogue
     │      status  planned | active | abandoned
     │      abandoned_at, abandoned_by, abandon_reason   (motif obligatoire si abandonné)
     │      created_by, created_at
     │      unique (project_id, master_id)
     │      fk (project_id, master_id) → project_masters  on delete restrict
     │                                       │
     ├──< project_masters (existant) >───────┘── masters (existant)
     │
     └──< title_participations (nouveau)              « Participation artiste »
            id, organization_id, project_id, title_id → project_titles
            artist_id → artists
            role    main | featuring                  mêmes mots que master_artists ; featuring
                                                      par défaut (décision 10)
            status  proposed | invited | confirmed | declined | withdrawn
            contact_id null → network_contacts        interlocuteur (manager…), voir § 5.4
            contract_id null → contracts              contrat de participation ; « signé » =
                                                      contracts.status = 'signed'
            decided_by, decided_at, note
            unique (title_id, artist_id)
            ajout possible à tout moment pour un collectif (décision 8)

participation_waivers (nouveau, ajout seul)            avancer sans contrat signé (décision 6)
  id, organization_id, project_id, participation_id
  scope   shoot | release                              tournage OU sortie : l'un ne couvre pas l'autre
  reason (obligatoire), risk, due_on
  granted_by, granted_at                               direction seule (validate), dans l'historique
  revoked_by, revoked_at

deliverable_titles (nouveau, lot Marketing)            cibler des titres, jamais imposé
  id, organization_id, project_id, title_id
  strategy_deliverable_id | design_deliverable_id | activation_id (un seul renseigné)

artist_selections (nouveau, lot 4)                     sélection d'artistes réutilisable
  id, organization_id, name, note, created_by, created_at, archived_at
artist_selection_items (nouveau, lot 4)
  selection_id, artist_id, position, note              unique (selection_id, artist_id)

releases (existant)                                    la SORTIE : date, ISRC, UPC, Distribution
  + project_title_id uuid null → project_titles        ← décision 7, voir § 3 bis
    unique (project_title_id) where project_title_id is not null
    renseigné = sortie individuelle d'un titre ; nul = sortie de projet (projet simple,
    ou COMPILATION d'un collectif, avec son propre UPC)

masters (existant)
  + title_is_provisional boolean not null default false   ← décision 3

master_artists (existant)                              ← décision 10
  titre d'un collectif : artiste principal du projet (PDS par défaut) en main, en tête ;
  chaque invité confirmé en featuring

title_release_plans (nouveau, lot 14)                  le PLAN DE SORTIE éditorial d'un titre
  id, organization_id, project_id, title_id → project_titles     unique (title_id)
  status  draft | provisional | internal | ready_to_share | revised | active | archived
  current_version_id → title_release_plan_versions
  status_changed_by, status_changed_at
title_release_plan_versions (nouveau, ajout seul)
  id, organization_id, plan_id, version, content jsonb, config jsonb, created_by, created_at
  unique (plan_id, version)
title_release_plan_events (nouveau, ajout seul)        journal des statuts
  id, plan_id, version_id, from_status, to_status, note, created_by, created_at
share_links (existant)
  + scope « title_release_plan » + title_plan_version_id   lien vers UNE version, jamais l'interface
```

**Sortie ≠ plan de sortie.** La sortie (`releases`) porte la date, l'ISRC, l'UPC et la
Distribution (§ 3 bis). Le plan de sortie est un **document éditorial partageable avec
l'artiste**, sur le modèle du plan Jeho fourni par le client (absent du dépôt) : couverture, date,
objectif, actions marketing du titre, timeline, moodboard, versions. Il **lit** la date de la
sortie du titre, il ne la porte pas.

Le plan de sortie existe déjà **au niveau du projet**, dans la Stratégie :
`strategy_documents` (`kind = 'release_plan'`, `unique (project_id, kind, version)`, états de
validation `pending` / `sent` / `approved` / `changes_requested` / `superseded`,
`20261010000801_strategy_documents.sql:31-59`), réglages du générateur dans
`strategy_document_drafts` (clé `(project_id, kind)`, `…:547-574`), partage d'une version par
`share_links` + `share_strategy_document` (`…:590-640`), contenu et rendu dans
`lib/strategy/documents/release-plan-*.ts` (sources : `release-plan-sources.ts`, qui prend
l'artiste du premier titre, `:67-69`). Pourquoi des tables à part pour le plan d'un titre plutôt
qu'une colonne de titre sur `strategy_documents` : le cycle de vie est autre (sept statuts
éditoriaux au lieu des cinq états de validation) et l'unicité `(project_id, kind, version)`
devrait changer pour tous les projets. **On réutilise** la forme du contenu
(`ReleasePlanContent`), le générateur et son rendu, et le patron de partage (une version, un jeton,
révocable, lu par `anon` par le seul lien). Pour le titre, les sources changent : artistes =
participations du titre (pas le premier crédit du projet), date = sortie du titre, ou celle de
la compilation en mode « compilation finale uniquement » où le titre n'a pas de sortie propre
(lot 13),
couverture = pochette du titre (`lib/catalog/cover-rules.ts`), actions = livrables du projet sans
ciblage (globaux) **plus** ceux ciblés sur ce titre par `deliverable_titles` (lot 10). Le lien de
partage montre une version propre, sans données internes (transcriptions, notes, budget,
coordonnées). Les règles de passage d'un statut à l'autre sont écrites au lot 14.

Les sélections d'artistes (lots 4 et 5) ne figuraient pas dans la proposition du lot 0.
**Décidé (lot 0 bis)** : une sélection est **visible par toute l'équipe**, comme les fiches
artiste (lecture par tout membre actif, même règle que `artists`). Créer un projet depuis une
sélection **copie** ses artistes en participations, **sans lien vivant** : la sélection peut
évoluer ensuite sans toucher au projet.

Calculés par le code, jamais stockés :

- **les artistes du projet** = participations ni refusées ni retirées, plus les crédits des titres
  actifs ;
- **où en est un titre** = faits du Master (versions), du Juridique (répartition, bulletin), de la
  participation (contrat ou dérogation) ; seul `status` (prévu / actif / abandonné) est une
  décision humaine, donc stockée ;
- **où en est le contrat d'une participation confirmée** (décision 6) = signé, sinon dérogation
  ouverte de tournage et/ou de sortie, sinon manquant. Manquant : avertissement en préparation et
  à l'enregistrement, tournage refusé sans dérogation `shoot`, sortie refusée sans dérogation
  `release`.

### 3.2 Pourquoi ces choix

- **`project_titles` plutôt qu'étendre `project_masters`** : la clé primaire de `project_masters`
  est `(project_id, master_id)`, donc pas de titre sans master ; la changer toucherait trois clés
  étrangères (`master_flow_sources`, `master_mix_versions`, `master_deliverables_received`). La
  clé étrangère composite de `project_titles` (nulle tant qu'il n'y a pas de master, vérifiée
  ensuite) garantit que le titre est bien lié au projet, et `on delete restrict` empêche de
  retirer un titre qui a un historique.
- **`title_participations` plutôt que `master_artists` seul** : un crédit suppose un titre au
  Catalogue et vaut pour tous les projets ; une participation existe avant (invitation, refus,
  contrat) et ne vaut que pour ce projet. Règle : à la confirmation, si le titre a un master, la
  participation crée le crédit manquant dans `master_artists` (dans ce sens seulement, par une
  fonction), en `featuring` par défaut, derrière l'artiste principal du projet crédité `main`
  (décision 10) ; un crédit déjà présent n'est jamais retiré par la participation.
- **`participation_waivers.scope`** : le client distingue deux verrous (tournage, sortie) ; une
  dérogation par périmètre évite qu'une autorisation de tourner vaille en silence autorisation de
  sortir.
- **Pas de `project_artists`** : la liste se déduit des participations ; une table de plus serait
  une seconde vérité.
- **`participation_waivers` à part** plutôt que `release_readiness_waivers` : celle-ci écrase
  l'octroi précédent (`unique (project_id, control_key)`) et ne se révoque pas ; le principe 5
  demande de tout tracer. Même patron que `distribution_derogations` (motif, risque, échéance,
  révocation).
- **`deliverable_titles` facultatif** : sans ligne, un livrable vaut pour tout le projet (le
  comportement actuel) ; avec des lignes, il vise un ou plusieurs titres (un teaser pour trois
  titres). Rien n'est créé par titre automatiquement.

### 3.3 Où le titre sans master reçoit ses fichiers

Les fichiers audio, les versions et les répartitions ont besoin d'un `master_id`. **Voie A
retenue (décision 3).** Le nom provisoire doit être remplacé avant toute soumission en
Distribution (un titre provisoire ne part jamais chez le distributeur).

- **A (retenue)** : créer le titre au Catalogue dès le premier audio ou la première session, comme
  une maquette (`demo_status = 'draft'`), avec un nom provisoire lisible (« Sans titre · Artiste ·
  PDS Mic #12 ») marqué comme tel (nouvelle colonne `masters.title_is_provisional`) ; le
  `working_title` du projet devient le titre du master quand il est connu.
- **B** : un titre sans nom n'a ni audio ni Master tant qu'on ne l'a pas nommé ; il porte
  seulement ses participations.

---

## 3 bis. Sorties individuelles et compilation (décisions 7, 9 et 10) : ce que ça implique dans le code

Constat vérifié dans le code au lot 0 bis ; modes de sortie ajoutés après la réponse du client
(11/11/2026).

### Les trois modes de sortie d'un collectif

Réglage par projet collectif, `projects.collective_release_mode` :

| Mode | Sorties individuelles (`project_title_id` renseigné) | Compilation (sortie de projet, `project_title_id` nul) |
| --- | --- | --- |
| `singles` : sorties individuelles uniquement | une par titre actif qui a un master | aucune |
| `compilation` : compilation finale uniquement | aucune | une, qui regroupe les titres actifs |
| `singles_then_compilation` : sorties individuelles puis compilation | une par titre actif qui a un master | une, après les sorties individuelles |

Chaque sortie, individuelle ou compilation, a **sa** date, **son** UPC, **son** smartlink, **ses**
liens plateformes et **son** dépôt en Distribution. La compilation regroupe les titres **actifs**
au moment de sa soumission, dans l'ordre de `project_titles.position` ; un titre abandonné n'y
entre pas, un titre réactivé y revient. Tous les crédits suivent la décision 10 (artiste principal
`main`, invité `featuring`), y compris sur chaque piste de la compilation.

Changer de mode : permis tant qu'aucune sortie **retirée** par le nouveau mode n'a été soumise en
Distribution (par exemple, passer de `singles_then_compilation` à `singles` reste possible tant
que la compilation n'est pas soumise ; la ligne de compilation non soumise est alors archivée, pas
supprimée). Règle détaillée au lot 13.

### Ce qui suppose une seule sortie par projet

| Point | Où | Effet avec 10 sorties dans un projet |
| --- | --- | --- |
| **Création** : une sortie par projet au lancement du plan, nommée comme le projet, gardée par `not exists` | trigger `release_on_plan_launch` (`20261019100101_distribution_real_sources.sql:136-156`) | une seule sortie, au nom du projet |
| **Date imposée** : avant chaque insertion ou modification, `planned_release_date` reçoit `projects.due_date` | trigger `b_release_date` (`…100101:88-110`) | **impossible de donner une date propre à un titre** : toute écriture la remet à l'échéance du projet |
| **Date propagée** : l'échéance du projet est recopiée sur **toutes** ses sorties | trigger `z_release_date_sync` (`…100101:112-131`) | les 10 dates écrasées par une seule |
| **Lecture « la sortie »** : `.eq(project_id).order(created_at).limit(1).maybeSingle()` | `lib/release/queries.ts:40-44` (page Sortie, sources de la Distribution), `lib/design/conception.ts:231`, `lib/distribution/platforms-queries.ts:56`, `lib/legal/formalities/queries.ts:103`, `lib/legal/readiness/queries.ts:61`, `lib/master-workflow/engineer-thread-actions.ts:137`, `lib/project-plan/queries.ts:140`, `lib/strategy/queries.ts:184` ; existence seule : `lib/plan/queries.ts:228` | **prend la plus ancienne en silence** : mauvais titre, sans erreur |
| **ISRC** : chaque sortie est cherchée avec l'ISRC du **premier titre** du projet | `releaseIsrcs` (`lib/release/isrc.ts:12-30`), job `app/api/cron/detect-releases/route.ts:47` | 10 sorties détectées avec l'ISRC du titre 1 : fausses mises en ligne |
| **UPC** : `setReleaseUpc` modifie **toutes** les sorties du projet | `lib/distribution/upc-actions.ts:34-38` | le même UPC sur 10 sorties, alors que chaque sortie d'un titre a le sien |
| **Distribution** : un dossier, des contrôles, des plateformes, une version en attente, une clôture ouverte, une dérogation ouverte **par projet** | `distribution_dossiers` `unique (project_id)` (`20261011100101…:39`), `distribution_versions` `unique (project_id, number)`, `distribution_checks` `unique (project_id, check_key)` (`20261011100201…:46,146`), `distribution_platforms` `unique (project_id, platform)` (`20261011100401…:43`), clôtures, anomalies, dérogations | un seul dépôt pour tout le collectif |
| **Pochette** de la Distribution : une par projet | `distribution_cover` (`20261019100101…:~55-80`) | chaque titre a pourtant sa pochette (`lib/catalog/cover-rules.ts`) |
| **Artiste principal** de la fiche de livraison : l'artiste du projet | `lib/distribution/view.ts:139` → `lib/distribution/delivery-file.ts:111` | PDS en artiste principal : **juste** (décision 10) ; il manque les invités en featuring, à lire sur les crédits du titre |
| **Détection** de la mise en ligne : par ISRC seulement | `app/api/cron/detect-releases/route.ts:48-78` avec `releaseIsrcs` | en mode `singles_then_compilation`, l'ISRC du premier titre retrouverait la **sortie individuelle** et marquerait la compilation en ligne à tort |

Déjà prêt pour plusieurs sorties : `releases` n'a pas d'unicité par projet (seulement
`(organization_id, isrc)`, `20260925000203_domain_releases.sql:35`) ; le smartlink (jeton unique),
les liens plateformes (`release_links`), la détection (`record_release_detection`) et la livraison
(`release_delivery`) sont **par sortie** ; `lib/catalog/master/overview.ts:24`,
`lib/insights/activity.ts:137` et le job de détection lisent déjà toutes les sorties.

### Solution retenue comme la plus sûre

Garder **une ligne `releases` par sortie** et lui donner son titre, plutôt qu'un projet enfant par
titre (interdit par le principe 2) ou des colonnes de sortie sur `project_titles` (qui
dupliqueraient smartlink, liens et détection).

1. **Clé** : `releases.project_title_id` (nulle) et `unique (project_title_id) where
   project_title_id is not null`. **Nulle = sortie de projet** : tous les projets simples, sans
   rattrapage ni changement, et **la compilation d'un collectif** (une au plus, avec son UPC).
   **Renseignée = sortie individuelle d'un titre.**
2. **Création** selon le mode : `release_on_plan_launch` ne crée la sortie de projet d'un
   collectif qu'en mode `compilation` ou `singles_then_compilation` (projets simples : inchangé) ;
   une fonction unique et idempotente crée la sortie individuelle d'un titre, en mode `singles` ou
   `singles_then_compilation`, quand il est actif et a un master, y compris pour un titre ajouté
   en cours de projet. Un titre abandonné garde sa sortie (historique), hors des comptes ; réactivé,
   il la retrouve.
3. **Dates** : `b_release_date` et `z_release_date_sync` ne s'appliquent qu'aux sorties de projet
   (`project_title_id is null`) ; une sortie individuelle garde sa propre date. Pour un collectif,
   l'échéance du projet est donc **la date de la compilation** (modes avec compilation) ; en mode
   `singles`, elle ne date aucune sortie. Projets simples : comportement identique.
4. **Détection** : la sortie individuelle est cherchée avec l'ISRC **de son master**. La
   compilation d'un collectif est cherchée par **son UPC**, jamais par l'ISRC d'un de ses titres
   (piège du tableau ci-dessus) ; sans UPC, elle attend. La détection actuelle ne cherche que par
   ISRC : la recherche par UPC est à ajouter au job, pour la compilation d'un collectif seulement.
   La sortie de projet d'un projet simple garde la règle actuelle (premier titre qui a un ISRC).
5. **UPC** : `setReleaseUpc` vise **une sortie** (son id), plus le projet : chaque sortie
   individuelle et la compilation ont chacune le leur. Pour un projet simple, même résultat (il
   n'a qu'une sortie).
6. **Lectures** : un seul accès (par exemple `loadRelease(projectId, { titleId } | { compilation:
   true })`) remplace les neuf lectures en `limit 1`. Projet simple : la sortie de projet, comme
   aujourd'hui. Collectif : la sortie du titre demandé, ou la compilation ; **appelé sans l'un ni
   l'autre, il échoue au lieu de prendre la plus ancienne** (pas de mauvaise sortie en silence).
7. **Distribution (lot 15)** : `release_id` ajouté aux tables de la Distribution ; chaque
   `unique (project_id, …)` devient deux index partiels, `(project_id, …) where release_id is
   null` (l'existant, inchangé) et `(release_id, …) where release_id is not null`. Rien à reprendre
   sur les données (`release_id` nul partout = comportement actuel). **Pour un collectif, toute
   ligne de Distribution porte son `release_id`, compilation comprise** : le chemin `release_id`
   nul reste celui des projets simples, et deux dépôts d'un même collectif ne partagent jamais un
   contrôle. Sortie individuelle : pochette du titre, artiste principal + featuring lus sur les
   crédits du titre. Compilation : pochette du projet (`distribution_cover`), liste des pistes =
   titres actifs, crédits de chaque piste lus sur son titre. Refus de soumission : titre
   provisoire (`title_is_provisional`) dans la sortie ; participation confirmée sans contrat signé
   ni dérogation `release` ouverte, sur le titre (sortie individuelle) ou sur l'un des titres
   (compilation) (décision 6). Les règles du distributeur et des plateformes sur les crédits
   (featuring dans le titre ou en champ dédié) sont vérifiées et appliquées à la fiche de
   livraison sans changer le principe de la décision 10.
8. **Ordre et tests** : le lot 13 pose les données (clé, mode, création, dates, détection, UPC,
   accès unique) avant le lot 15 (Distribution). Tests SQL à écrire : projet simple inchangé (une
   sortie, date synchronisée avec l'échéance) ; collectif dans chaque mode (`singles` : N sorties
   individuelles, aucune sortie de projet ; `compilation` : une seule sortie de projet ;
   `singles_then_compilation` : N + 1) ; dates individuelles indépendantes ; ISRC de chaque titre ;
   UPC par sortie ; compilation jamais détectée par l'ISRC d'un titre.

---

## 4. Les cas à supporter

| Cas | Avec le modèle proposé | Ce qui existe déjà |
| --- | --- | --- |
| **Un artiste invité sur un titre** | une `project_titles`, une `title_participations` (`featuring`) ; crédits du titre : artiste principal du projet (PDS) en `main`, l'invité en `featuring` (décision 10), par exemple « PDS MIC #4 (feat. Artiste) » | un titre à deux crédits ordonnés, déjà possible |
| **Plusieurs artistes sur un titre** | une `project_titles`, N participations (`featuring` par défaut, `main` possible), `unique (title_id, artist_id)` ; l'artiste principal du projet reste crédité `main` en tête | `master_artists` accepte déjà N crédits ordonnés |
| **Un artiste sur plusieurs titres** | une participation par titre, chacune avec son statut, son contrat ou sa dérogation | un artiste crédité sur N masters, déjà possible |
| **Un titre sans nom** | `working_title` nul, affiché « Titre 3 · sans nom » par le code ; `master_id` nul jusqu'au premier audio, puis titre provisoire au Catalogue (voie A, décision 3) | impossible aujourd'hui : `masters.title` est obligatoire |
| **Un titre abandonné sans perdre l'historique** | `status = 'abandoned'` + motif, auteur, date ; la ligne `project_masters` est **gardée** (sinon ses versions partent en cascade) ; le master reste au Catalogue (`demo_status = 'abandoned'` s'il est une maquette) ; participations, contrats, dérogations, Juridique et versions Master restent intacts ; le titre sort des comptes « tous les titres » (master final, facture, Distribution, pistes de la compilation) ; **réactivable**, il retrouve tout tel quel (décision 8) | aucun geste : retirer un titre n'est possible qu'avant le lancement, et ce retrait efface son historique Master |

Cas voisins à prévoir : une participation refusée ou retirée (gardée, statut) ; un titre ou un
artiste ajouté en cours de projet (permis pour un collectif, décision 8 ; un titre ajouté après le
lancement reste interdit pour un projet simple, voir § 6.3) ; un même titre dans le collectif et
dans un single de l'artiste (déjà possible, voir § 6.7).

---

## 5. Les cinq principes, tenus par le modèle

1. **Ne jamais mélanger fichiers, validations ou états de deux titres.** Fichiers sur le master,
   versions et décisions par `(projet, titre, étape)` : déjà vrai. À tenir dans les lots suivants :
   un valideur et des ingénieurs **par titre** possibles (le Brief Mix/Master est aujourd'hui un
   seul par projet), sans jamais qu'une décision porte sur deux titres.
2. **Ne jamais dupliquer le projet.** Un seul `projects` ; artistes et titres en lignes filles.
3. **Pas les mêmes actions marketing pour chaque titre.** Marketing au niveau du projet par défaut,
   ciblage facultatif par `deliverable_titles`, aucune création automatique par titre.
4. **Contacts privés du Business manager.** Rien ne le permet aujourd'hui (§ 1.8). Il faudra une
   visibilité sur `network_contacts` (par exemple `visibility` `team` / `private` +
   `owner_person_id`), de nouvelles politiques de lecture, et un audit des fonctions SECURITY
   DEFINER qui lisent le Réseau sans RLS (`contact_project_pairs`, `contact_projects`, pages
   privées `/c/`, recherche de PO…). `title_participations.contact_id` ne doit rien exposer : on
   le lit sous RLS, jamais par une fonction qui la contourne. **Décision 5** : le Business manager
   sera un poste du module Business, hors de ces lots ; d'ici là, ces lots n'ouvrent aucun chemin
   nouveau vers un contact.
5. **Tracer toute dérogation sans contrat signé.** `participation_waivers` en ajout seul
   (périmètre `shoot` / `release`, motif, risque, échéance, qui, quand, révocation), accordée par
   la direction seule (décision 6). Une participation « confirmée » sans contrat signé : **montrée**
   en préparation et à l'enregistrement (avertissement, sans blocage) ; **tournage refusé** sans
   dérogation `shoot` (`production_shoots_check`, lot 12) ; **sortie refusée** sans dérogation
   `release` (soumission en Distribution, lot 15). Chaque dérogation garde motif, personne qui
   valide et date dans l'historique.

---

## 6. Risques de régression sur les projets existants

Chaque risque est classé : **sûr** si le changement n'agit que quand `collective = true`, **à
surveiller** s'il change un comportement partagé.

1. **Artiste unique affiché partout** (à surveiller). `project_artist_name`, `project_artist_id`,
   `artistNameOf`, `release-plan-sources.ts:67-69`, `kpi-actuals.ts:29-33` (fans Deezer du premier
   artiste), `delivery-file.ts:111`. Les faire évoluer sans changer le résultat d'un projet à un
   seul artiste : garder la règle actuelle, et pour un collectif **afficher l'artiste principal**
   (`projects.artist_id`, PDS par défaut, décision 2), jamais « Collectif · N artistes » ni la
   liste des invités. Les invités se lisent par titre (participations, crédits `featuring`), pas
   à la place de l'artiste du projet. La fiche de livraison d'une sortie de titre lit les crédits
   du titre, artiste principal plus featuring (lot 15).
2. **Identité artistique de la Conception** (sûr si fait par `project_artist_id`).
   `design_workspaces.identity_version_id` et ses triggers comparent à `project_artist_id`.
   **Décidé (11/11/2026)** : pour un collectif, l'identité artistique de la Conception est celle de
   **l'artiste principal** (PDS par défaut). Comme `project_artist_id` lit d'abord
   `projects.artist_id` pour un collectif (décision 2, lot 1), les triggers suivent sans autre
   changement ; projets simples : règle actuelle inchangée.
   **Changement d'artiste principal sur un collectif dont la Conception a déjà une identité
   (décidé le 11/11/2026)** : l'identité choisie est **gardée**, jamais remplacée en silence, et
   PO **signale** qu'elle ne correspond plus à l'artiste principal. Passer à l'identité du nouvel
   artiste reste un geste explicite du responsable (`use_artist_identity_version`). Ce que fait le
   code aujourd'hui quand l'artiste du projet change (constaté, `20261013100101_artist_identity.sql`
   et `lib/design/`) :
   - **en base, rien n'est remplacé** : `design_workspaces.identity_version_id` n'est posé qu'à
     l'insertion (trigger `a_identity`, `:244-259`) et n'est plus réécrit ;
     `use_artist_identity_version` (`:263-285`) n'accepte qu'une version du nouvel artiste ;
     `design_references_identity_check` (`:324-341`) refuse d'ajouter une référence copiée de
     l'ancienne identité (`invalid_identity`) ;
   - **à l'écran, rien n'est signalé, et l'identité gardée disparaît ou se fait passer pour une
     autre** : `loadReleaseIdentity` (`lib/design/release-identity.ts:56-65`) cherche la version
     gardée parmi celles du **nouvel** artiste, ne la trouve pas, renvoie `used = null` et propose
     l'identité actuelle du nouvel artiste comme « plus récente » ; à l'inverse,
     `lib/design/call-sheet-data.ts:84-102` (préparation du call) et
     `lib/design/brief-identity.ts:22-41` (Brief créatif) lisent la version gardée sans vérifier à
     quel artiste elle appartient, et la montrent comme si c'était l'identité de l'artiste actuel.
   Pour un collectif, ces trois lectures doivent comparer l'artiste de la version gardée à
   `project_artist_id` et, en cas d'écart, montrer la version gardée **et** le signal « ne
   correspond plus à l'artiste principal ». Projets simples : comportement actuel inchangé (le même
   défaut y existe quand le premier artiste change ; hors de ces lots).
3. **Titres figés au lancement** (sûr si limité au collectif). `project_masters_editable` interdit
   tout ajout ou retrait après le lancement ; un collectif doit pouvoir ajouter un titre en cours de
   route. Assouplir **pour le collectif seulement**, ajout seul, jamais de retrait (abandon à la
   place).
4. **Forme du projet** (à surveiller). `check_project_shape`, `z_check_masters`, `create_project`
   et `link_master_to_project` refusent les titres d'un contenu et exigent un titre pour une
   sortie musicale ; un collectif peut démarrer sans titre au Catalogue. Toute modification de ces
   fonctions doit garder les tests de `supabase/tests/project-types.test.sql` verts.
5. **Comptes « tous les titres »** (sûr si l'abandon est réservé au collectif). Master final de
   tous les titres (`rules.ts:127-130`, `load.ts:100-161`), facture de l'ingénieur
   (`20261020060101…:270-295`), contrôles de Distribution : un titre abandonné doit en sortir.
   Les projets simples n'ont pas d'abandon, donc pas de changement pour eux.
6. **Contraintes « une ligne par projet »** (à surveiller). `master_briefs`, `budget_lines` par
   rôle Mix/Mastering, `project_invoices` par ingénieur, `distribution_dossiers`, une sortie lue
   par projet. Ne pas les casser : des réglages par titre viendraient **en plus** (exemple : une
   table de dérogations au Brief par titre, nulle = Brief du projet).
7. **Un même titre dans deux projets** (existant, plus fréquent). Le trigger `create_mix_versions`
   crée une version dans **chaque** projet du titre qui a un Brief : un titre du collectif repris
   en single aurait deux séries de versions et de décisions. Comportement actuel, à garder en tête.
8. **Suppression d'un projet** (sûr si fait). Toute nouvelle table qui pointe vers un projet doit
   entrer dans `delete_project_row` (`docs/ARCHITECTURE.md` § 2 quater), sinon la suppression
   échoue (« encore utilisé »).
9. **Contacts privés** (hors de ces lots, décision 5). Changer la lecture de `network_contacts`
   touchera tous les écrans du Réseau, les pages privées, PO et les fonctions SECURITY DEFINER ; ce
   sera fait avec le module Business, avec la visibilité par défaut inchangée (`team`).
10. **Visibilité des projets** (sûr). Ajouter des artistes ne donne accès à personne : les données
    d'artiste sont déjà lisibles par toute l'organisation, et les artistes ne sont pas des
    membres. Si une participation devait ouvrir un projet à quelqu'un, il faudrait modifier
    `can_see_project_row` **et** `visible_project_ids()` ensemble.
11. **Sortie et détection en ligne** (à surveiller). `releaseIsrcs` (`lib/release/isrc.ts:12-30`)
    prend l'ISRC du premier titre ; une date de sortie par projet (`releases` lu en `limit 1`,
    date imposée par trigger). Décision 7 : un mode de sortie par collectif (sorties
    individuelles, compilation, ou les deux) ; une sortie individuelle est détectée par l'ISRC de
    son titre, la **compilation par son UPC, jamais par l'ISRC d'un titre** (sinon elle serait
    marquée en ligne à la sortie individuelle de son premier titre). Projets simples : règle
    actuelle. Détail et solution au § 3 bis.
12. **Types générés et PO.** `lib/supabase/database.types.ts` à régénérer ; les outils de PO qui
    proposent un projet (`lib/assistant/propose/project.ts`) ne connaissent pas le collectif.
13. **Projets PDS Mic existants** (sûr si rien n'est converti d'office). Un PDS Mic déjà créé
    reste un contenu simple ; aucune migration ne le transforme en collectif sans décision.

---

## 7. Questions posées au lot 0 (tranchées au § 0 bis)

Gardées pour l'historique ; **toutes tranchées**, plus rien n'est en attente du client.
Réponses : 1 → décision 1 (drapeau) et 9 (Distribution) ; 2 → décisions 2 et 10 (PDS artiste
principal, crédité `main` sur chaque titre) ; 3 → décision 3 (voie A) ; 4 → décision 4 ; 5 →
décision 5 ; 6 → décision 6 (direction seule ; préparation et enregistrement avec avertissement,
tournage bloqué, sortie bloquée, sauf dérogation) ; 7 → décision 7 (trois modes : sorties
individuelles, compilation finale, ou les deux) ; 8 → décision 8 (archivé puis repris sans
perte ; titres et artistes ajoutables en cours de projet).

1. **Où vit le collectif ?** Proposé : un drapeau `projects.collective`, indépendant du type et du
   format, pour qu'une édition PDS Mic (contenu) comme une compilation (musical) puisse être
   collective, et que « PDS Mic » reste une donnée (`content_formats`). Alternative : un format
   musical `collective`. Conséquence : un contenu collectif avec des titres doit-il avoir Master,
   Juridique **et Distribution** (aujourd'hui la Distribution est réservée au type musical,
   `rules.ts:52-62`) ?
2. **Libellé à l'écran** : « Projet collectif » ? Et le nom affiché à la place de « l'artiste »
   (« Collectif », la liste, le nom de l'édition) ?
3. **Titre sans nom** : voie A (titre provisoire au Catalogue dès le premier audio) ou voie B (pas
   d'audio avant d'avoir un nom) ?
4. **Suivi propre à chaque titre** : faut-il un ingénieur, un valideur et des dates **par titre**
   (Brief Mix/Master), ou le Brief du projet suffit-il pour la V1 ?
5. **Business manager** : un nouveau poste dans l'app (avec ses permissions), ou un rôle côté
   artiste (contact) dont les coordonnées restent privées ? Qui doit voir ses contacts : lui seul,
   lui et la direction ?
6. **Contrat de participation** : à partir de quel moment l'absence de contrat signé bloque-t-elle
   (enregistrement, tournage, sortie) ? Qui accorde la dérogation (direction seule, comme les
   autres) ?
7. **Sortie** : un collectif sort-il en une fois (une date, un UPC) ou titre par titre (une date
   et un ISRC par titre) ?
8. **Abandon** : un titre abandonné peut-il être repris ? Le master au Catalogue reste-t-il visible
   (archivé, ou maquette « abandonnée ») ?

---

## 8. Découpage validé (lot 0 bis)

Chaque lot est livrable et testable seul, et ne change rien pour un projet simple
(`collective = false`). Les risques cités renvoient au § 6.

| Lot | Contenu | Dépend de | Points d'attention |
| --- | --- | --- | --- |
| **1. Drapeau collectif et artiste principal** | `projects.collective` ; `projects.artist_id` permis pour un collectif, PDS proposé par défaut ; `project_artist_name` / `project_artist_id` / `artistNameOf` lisent d'abord l'artiste principal **pour un collectif seulement** ; libellé « Projet collectif » | — | risques 1, 2, 4, 12, 13 ; vérifier qu'une fiche artiste PDS existe ; afficher l'artiste principal, jamais « Collectif · N artistes » ; artiste principal changé : identité de la Conception gardée et signalée comme ne correspondant plus (risque 2) |
| **2. Titres du projet, abandon et réactivation** | `project_titles` (titre de travail, master facultatif, statut, motif) ; ajout de titres après lancement **pour un collectif seulement** ; abandon (archivé : master en maquette « abandonnée ») et réactivation **sans rien perdre** (historique, fichiers, négociations, validations) ; jamais de suppression du lien `project_masters` | 1 | risques 3, 5, 8 ; cas du titre déjà promu (décision 8) ; l'abandon ne touche ni participations, ni contrats, ni Juridique, ni versions Master |
| **3. Participations artiste** | `title_participations` (rôle, `featuring` par défaut, statut, contact, contrat) ; ajout d'artistes **à tout moment** pour un collectif ; à la confirmation, si le titre a un master, crédits `master_artists` : artiste principal du projet en `main` (en tête) s'il manque, invité en `featuring` | 2 | décision 5 : contact lu sous RLS seulement ; décision 10 : un crédit n'est jamais retiré par une participation |
| **4. Sélections d'artistes** | `artist_selections`, `artist_selection_items` : créer, nommer, ordonner une sélection ; **visible par toute l'équipe**, comme les fiches artiste | — | même règle de lecture que `artists` (tout membre actif) |
| **5. Création d'un projet collectif depuis une sélection** | « Créer un projet collectif » depuis une sélection : un titre et une participation (`proposed`) par artiste, **copiés** | 1, 2, 3, 4 | **aucun lien vivant** avec la sélection : la modifier ensuite ne touche pas au projet |
| **6. Vue Titres et artistes** | page du projet collectif : titres (actifs, prévus, abandonnés), leurs artistes et où en est chaque titre (calculé par le code) | 2, 3 | patrons existants (`docs/DESIGN.md`, `docs/COMPOSANTS.md`) ; nouveau composant à annoncer avant de le créer |
| **7. Titre provisoire (voie A)** | `masters.title_is_provisional` ; titre créé au premier audio, crédité dès sa création à l'artiste principal du projet (`main`) et aux invités confirmés (`featuring`) ; nommage par le geste de promotion | 2 | catalogue : signaler les titres provisoires dans les listes ; décision 10 ; `master_requires_artist` est tenu par l'artiste principal |
| **8. Master : sélecteur de titre** | dans le workflow Master d'un collectif, travailler titre par titre sans jamais mêler fichiers ni décisions | 2 | principe 1 ; Brief unique (décision 4) |
| **9. Master : vue consolidée, demande en masse, titres abandonnés exclus des comptes** | vue de tous les titres ; une demande pour plusieurs titres, qui produit une ligne par titre ; master final, facture de l'ingénieur et comptes du workflow sans les titres abandonnés | 8 | risque 5 ; une décision ne porte jamais sur deux titres |
| **10. Ciblage marketing par titre** | `deliverable_titles` facultatif ; sans ligne, un livrable vaut pour tout le projet | 2 | principe 3 : rien de créé par titre d'office |
| **11. Suivi juridique par participation** | répartition, bulletin et contrat lus par participation (répartitions et bulletins déjà par titre dans le projet) ; état du contrat calculé : signé (`contracts.status = 'signed'`), dérogation, manquant | 3 | `legal_agreement_needs` est par personne et par projet : un invité sur deux titres ne doit pas mêler ses deux contrats |
| **12. Contrat manquant : avertissement, verrou du tournage, dérogations** | `participation_waivers` (périmètre `shoot` / `release`, motif, risque, échéance, octroi par la direction seule, révocation, ajout seul, dans l'historique) ; **avertissement** en amont (vue Titres, sessions studio, Brief Mix/Master, synthèse avant tournage) ; **verrou du tournage** dans `production_shoots_check` pour un collectif : refus sans contrat signé ni dérogation `shoot` | 3, 10, 11 | décision 6 et « Où est l'étape tournage » (§ 0 bis) : le tournage est par livrable, le verrou lit les titres visés (`deliverable_titles`) ou, sans ciblage, tous les titres actifs ; le verrou de la **sortie** est au lot 15 ; projets simples : trigger inchangé |
| **13. Sorties individuelles et compilation (données)** | `projects.collective_release_mode` (choisi à la création du collectif, modifiable selon § 3 bis) ; la **sortie** (`releases`) d'un titre : `releases.project_title_id`, création selon le mode, dates propres ; **compilation** = sortie de projet avec son UPC ; ISRC du master du titre, détection de la compilation par UPC, UPC par sortie, accès unique à la sortie qui échoue au lieu de prendre la plus ancienne | 2, 7 | § 3 bis (modes, points 1 à 6 et 8) ; projets simples inchangés (sortie de projet, `project_title_id` nul) |
| **14. Plan de sortie éditorial par titre** | le **plan de sortie** (document partageable avec l'artiste, modèle du plan Jeho) décliné par titre depuis le plan existant (`lib/strategy/documents/release-plan-*.ts`) : `title_release_plans`, versions, journal ; statuts **Brouillon › Planning provisoire › Version interne › Prêt à partager › Version révisée › Plan actif › Plan archivé** ; page du plan ; actions globales du projet et actions dédiées au titre (via `deliverable_titles`) ; lien de partage d'une version, sans données internes | 10, 13 | § 3.1 « Sortie ≠ plan de sortie » ; le plan de sortie du projet (Stratégie) reste tel quel ; artistes lus sur les participations du titre, pas sur le premier crédit |
| **15. Distribution par sortie** | `release_id` sur les tables de la Distribution (compilation comprise pour un collectif), index partiels, un dépôt par sortie individuelle et un pour la compilation ; pochette et crédits du titre (artiste principal + featuring), pistes de la compilation ; **verrou de la sortie** : refus sans contrat signé ni dérogation `release` ; titre provisoire refusé ; règles du distributeur et des plateformes sur les crédits | 12, 13 | § 3 bis point 7 ; le plus gros lot, risque 11 ; décisions 6 et 10 |

Hors de ces lots : contacts privés et poste de Business manager (module Business, décision 5) ;
réglages Mix/Master par titre (décision 4, après la V1).
