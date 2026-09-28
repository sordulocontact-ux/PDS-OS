# PDS OS — Architecture et mémoire technique

Mémoire longue du code : ce qui existe, où, pourquoi, et les pièges déjà rencontrés.
`CLAUDE.md` en donne le résumé ; ce fichier le détail. À tenir à jour avec le code.

Dernière mise à jour : 25 septembre 2026.

---

## 1. Vue d'ensemble

```
Navigateur ──► Next.js 16 (App Router, Vercel)
                 ├─ pages serveur (lecture via Supabase, session utilisateur, RLS)
                 ├─ server actions / route handlers (écritures, IA, audio)
                 └─ proxy.ts (rafraîchit la session, protège /app/*)
             ──► Supabase (Postgres + RLS, Auth, Storage « call-audio »)
             ──► Groq (transcription) · Mistral (extraction, assistant) — via Vercel AI SDK
             ──► Deezer · iTunes · MusicBrainz · (Odesli avec clé) — détection de sortie
Cron Vercel ──► /api/cron/detect-releases (service role, seul chemin autorisé)
```

Toute écriture passe par la session de l'utilisateur : **le RLS est la sécurité**. La
service role n'est utilisée que par le cron (`lib/supabase/admin.ts`).

---

## 2. Base de données (`supabase/migrations/`)

| Migrations | Contenu |
| --- | --- |
| `…0001xx_identity_*` | Fondation identité **importée d'Ibé** (repo `po`), inchangée, commentaires FR : `organizations`, `people`, `accounts`, `memberships`, `membership_events` (journal inaltérable), fonctions `auth_person_id`, `is_active_member`, `is_org_admin`, `get_my_access`, triggers (dernier admin protégé, email immuable, rattachement à la confirmation d'email, bootstrap du premier admin). |
| `…0002xx_domain_*` | Métier : `stage_definitions` (étapes configurables, 7 par défaut), `artists`, `projects`, `project_stages`, `releases`, `release_links`, `share_links`, `calls`, `transcripts`, `call_reports`, `report_items`, `field_values` (+ vue `current_field_values`), `needs`, `project_team_members`, `tasks`, `open_points`, `validations`, bucket `call-audio` + policies. |
| `…000301_release_detection` | `record_release_detection(release, links)` : seul chemin d'écriture des liens détectés (membre ou service role). |
| `…000401_save_call_report` | `save_call_report(...)` : compte rendu + éléments en une transaction (SECURITY INVOKER). |
| `…000501_assistant_search` | `pg_trgm`, index plein texte français, `search_projects`, `search_calls` (SECURITY INVOKER). |
| `…260926000101_voice_source` | `source_type = 'voice'` autorisé sur `field_values`, `needs`, `project_team_members` (dictée). |
| `…260926000401_positions_and_permissions` | Postes `general_director` / `project_manager` / `creative_director`, `role_permissions` (seule correspondance poste → permissions), `has_permission`, fonctions de la fondation réécrites sur la permission `administer`, `get_my_access` renvoie les permissions. |
| `…260926000301_membership_role_chosen_on_approval` | Plus de poste par défaut : une inscription libre attend **sans poste**, `approved` exige un poste (contrainte). |
| `…260926000501_catalog_and_project_creation` | Catalogue et création de projet (`docs/PARCOURS-01-ARTISTE-MASTER-PROJET.md`) : `masters`, `master_artists` (crédits ordonnés, `main`/`featuring`), `project_masters` ; `projects.type` (`music_release`/`partnership`/`content`) remplace `release_type`, + échéance, budget (centimes), priorité, notes de cadrage ; `artist_id` devient facultatif (projets antérieurs). **Plus de trigger `create_stages`** : les étapes naîtront au lancement. Permissions `manage_catalog` (DG, CP) et `create_projects` (DG). `create_master`, `create_project` (SECURITY INVOKER, une transaction), `project_artist_name`. |
| `…260926000601_project_transmission` | Circuit d'attribution : `project_assignments` (historique, une seule transmission `pending` par projet, aucune écriture client), `transmit_project` (permission `assign_projects`, destinataire `pilot_projects`, projet non lancé), `respond_to_assignment` (destinataire seul ; refus et précision exigent un message ; **l'acceptation lance** : responsable + étapes), `list_assignable_people`, `person_has_permission`. `owner_person_id` n'est plus modifiable par un client ; `projects_create_stages` supprimée. |
| `…260926000701_notifications` | `notifications` (destinataire seul en lecture, aucune écriture client, publiée dans Realtime), alimentée **par triggers** : transmission, acceptation / refus / précision, validation demandée / décidée, tâche assignée — jamais à soi-même. `mark_notifications_read`, `push_subscriptions` (`save_push_subscription`, `forget_push_subscription`), `claim_push_deliveries` (l'auteur réclame les push de ce qu'il vient de causer : pas de service role). |
| `…260926000801_artist_deezer` | `artists.deezer_id` (unique par organisation parmi les actifs), `picture_url`, `deezer_url` (https uniquement), tous facultatifs ; droits colonne insert/update. |
| `…260926000901_owner_writes_project` | **Seul le responsable écrit dans un projet** (`is_project_owner`, `is_call_owner`) : cadrage, calls (+ audios du Storage), sortie ; le DG et les autres lisent. `start_stage` / `request_validation` réservées au responsable, valideur = détenteur de `validate` (`list_validators`). L'assigné d'une tâche peut la cocher. `record_release_detection` : responsable ou job serveur. |
| `…260926001001_validated_stage_is_final` | Une étape validée est **définitive** : `start_stage` ne démarre qu'une étape « à venir » (plus de « Rouvrir »). Un refus renvoie toujours en cours. |
| `…260926001101_launch_strategy` | Stratégie de lancement : `levers` (famille, `to_decide`/`selected`/`rejected`, `need_id` facultatif, provenance), `strategy_deliverables` (levier retenu obligatoire, responsable et échéance facultatifs), `milestones` (date saisie, type fermé, livrable facultatif, détaché si le livrable est retiré). `strategy_is_editable` : **responsable + étape en cours** → écriture (y compris `field_values` `strategy`, politique restrictive), figée dès la demande de validation. `start_stage` refuse la Stratégie tant que le Cadrage n'est pas validé (`previous_stage_not_validated`). Triggers `check_strategy_links` (`lever_not_selected`, `lever_has_deliverables`). `report_items` : kinds `positioning`, `audiences`, `narrative`, `lever`. |
| `…260926001201_project_visibility` | **Qui voit un projet** : `can_see_project` / `can_see_project_row` — DG (`view_all_projects`), responsable, destinataire d'une transmission en attente, directeur créatif de l'équipe (`project_creatives`, `add_project_creative` / `remove_project_creative` par le DG ou le responsable, notification `project_creative_added`). Policies de lecture de toutes les tables d'un projet (et audios Storage) réécrites ; une tâche reste visible à son assigné, une validation à son valideur. Catalogue visible par tous. |
| `…260926001301_lever_voice_source` | `source_type = 'voice'` autorisé sur `levers` (dictée de la Stratégie). |
| `…260927000501_budget_lines` | Lignes de budget d'un projet : libellé, montant (centimes ≥ 0), famille (taxonomie des leviers) et levier retenus facultatifs (même projet, trigger ; levier supprimé → lien retiré), statut `planned`/`committed`/`paid`. Lecture `can_see_project`, écriture `is_project_owner`, droits colonne par colonne. Tests `supabase/tests/budget.test.sql`. |
| `…260926002301_call_consent_by_contract` | Consentement donné par contrat : `calls.consent` vaut `granted` par défaut, les calls `pending` passent à `granted`. Colonne, trigger et `calls_audio_requires_consent` conservés. |
| `…260926001501_project_team_at_creation_and_framing_call` | Type `event`. `create_project` prend `p_assignee_person_id` (transmission d'office via `transmit_project`) et `p_creative_person_ids` (via `add_project_creative`), dans la même transaction : un refus annule tout. **Pas de cadrage sans call** : `framing_is_open` (compte rendu de call, ou Cadrage déjà entamé avant la règle), politiques restrictives sur `field_values` `brief`, `needs`, `project_team_members`, `start_stage` → `framing_requires_call`. |
| `…260926001401_strategy_choice_suggestions` | Questions à choix fermé de la Stratégie : `field_values` clés `<champ>_choices` (confirmé, manuel) et `<champ>_suggestions` (source `suggestion`, toujours `proposed`/`rejected`). |
| `…260926000201_team_roles_invitations` | Postes (renommés en `…000401`), statut `invited`, `invite_member(...)`, T10 réécrit pour ouvrir une invitation à la confirmation d'email. |
| `…260927000701_archive_records` | Archivage (§ 2 quater) : permission `archive_records` (DG), `set_artist_archived` / `set_master_archived` / `set_project_archived` (SECURITY DEFINER, seul chemin d'écriture de `archived_at`, grant colonne retiré), refus `*_in_use` / `project_launched` / `*_uses_archived` / `artist_name_taken` ; ligne archivée non modifiable (politiques d'UPDATE), transmission d'un projet archivé gelée (trigger `b_guard_archived`). |
| `…260927001101_framing_team_roles`, `…001201_framing_constraints`, `…001401_framing_guided_review` | Cadrage en relecture guidée (§ 6) : `project_team_members.role_key` (rôle fixe, au plus une ligne par rôle), table `framing_constraints` (une ligne par contrainte typée, provenance, relue comme les besoins), source `voice` et changement de type autorisés, droits colonne sur `role_key`, lignes figées une fois le Cadrage soumis (`framing_is_editable`). |
| `…260927001101_security_audit_fixes` | Correctifs de l'audit back du 27/09 : lecture des objets `artist-files` en **positif** (`manage_catalog`, ou une ligne `artist_files` visible — les contrats restent cachés) ; **Cadrage figé une fois soumis** (`framing_is_editable` : Brief, besoins, équipe écrits seulement en `not_started` / `in_progress`, policies restrictives insert + update) ; `project_masters` modifiable seulement avant lancement, sur un projet et un master non archivés (`project_masters_editable`) ; Web Push protégé par un secret serveur (§ 8 bis). Tests : `security-audit.test.sql`. |
| `…260927004101_project_drafts` | Brouillons du formulaire « Nouveau projet » (retour n°6, § 2 octies) : `project_drafts.form_values` (objet JSON, 64 Ko au plus), auteur posé par trigger ; lus, modifiés et supprimés par leur auteur seul, tant qu'il a `create_projects`. Tests : `project-drafts.test.sql`. |
| `…260927012001_catalog_file_library` | Bibliothèque de fichiers (retour n°6, § 2) : `artist_files.description` et `master_files.description` (précision libre, 200 car., `null` si vide) ; `manage_catalog` modifie nom, catégorie et précision (droits colonne, policies `*_update_catalog`), jamais un fichier audio de titre (`category <> 'audio'` avant et après) ; événement `file_updated` (`previous_category` si reclassé, privé si contrat avant **ou** après) ; lecture des objets `master-files` passée en positif comme `artist-files` (même faille que l'audit du 27/09). Tests : `file-library.test.sql`. |
| `…260927013001_project_files` | Documents d'un projet (§ 8 ter) : `project_files` (catégories `brief` / `visual` / `contract` / `press` / `other`, `description`), bucket privé `project-files` (`<org>/<projet>/<uuid>[.<ext>]`) ; lecture `can_see_project`, contrats via `can_read_project_contracts` (responsable ou `view_all_projects`) ; insertion, modification (nom, catégorie, précision) et suppression par `is_project_owner` ; objets lus en positif (responsable, ou ligne visible). Tests : `project-files.test.sql`. |
| `…260927011001_project_types_and_formats`, `…011101_pds_mic_format` | Types et formats de projet (retour n°2, `docs/CONTEXTE-PROJET.md` § 12, « Types et formats ») : `partnership` retiré (devenu `content`), `event` refusé par `create_project` ; `projects.music_format` (single, ep, album, mixtape, compilation, other ; musical seulement), `projects.content_format_id` → `content_formats` (formats PDS réutilisables, lus par tout membre, créés par `create_projects`, nom unique par organisation ; « PDS Mic » inséré pour `pds`), `artist_id` d'un contenu ; `framing_notes` renommé `initial_context`. `check_project_shape` (format obligatoire, un seul master pour un single), appelé par `create_project` et `update_project`, qui écartent ce que le type n'utilise pas. Tests : `project-types.test.sql`. |

Principes :

- Chaque table métier porte `organization_id` ; clés étrangères **composites**
  `(parent_id, organization_id)` : impossible de rattacher un objet au projet d'une autre
  organisation.
- RLS activé **et forcé** partout ; `anon` n'a accès à aucune table (le smartlink public
  passe par `get_smartlink(token)`). Droits d'écriture **colonne par colonne**.
- `created_by`, horodatages, consentement (`consent_recorded_at/by`) posés par triggers.
- États (étapes, validations) : uniquement via `start_stage`, `request_validation`,
  `decide_validation` (transitions vérifiées, seul le valideur désigné décide).
- `field_values` append-only : chaque modification ajoute une ligne → historique et
  provenance. Une proposition de PO n'écrase jamais une valeur confirmée.
- Tâche ≠ point ouvert : une tâche a toujours responsable + échéance ; un point ouvert n'en
  a pas.
- Questions métier ouvertes (§ 10 du contexte) rendues réversibles : étapes en données,
  circuit de validation générique (n'importe quel membre approuvé peut être valideur).

- **Qui écrit dans un projet lancé** : son responsable seul (chef de projet qui l'a accepté,
  et qui a toujours `pilot_projects`). Le DG lit et décide les validations qu'on lui
  demande. Côté écran : `canEditProject()` (`lib/projects/edit-access.ts`) alimente
  `useCanEditProject()` depuis le layout du projet ; les routes API des calls et de la
  dictée refusent en 403 **avant** tout appel payant au fournisseur.
- **Qui voit un projet** : DG tous ; chef de projet ses projets + ceux qui attendent sa
  réponse (plus après un refus) ; directeur créatif ceux de son équipe créative. Tout ce qui
  est dans un projet suit la même règle. Piège : la policy de `projects` évalue la règle sur
  les colonnes de la ligne (`can_see_project_row`), car `INSERT … RETURNING` vérifie la
  nouvelle ligne avant qu'un `select` sur `projects` puisse la voir.
- Invariants vérifiés **au commit** (triggers de contrainte différés) : un master a au
  moins un artiste (`master_requires_artist`) ; une sortie musicale non archivée a au moins
  un master (`music_release_requires_master`), quel que soit le chemin d'écriture.
- Nom d'artiste unique par organisation, casse et espaces ignorés (index sur
  `lower(btrim(name))`) ; ISRC d'un master stocké sans tirets, unique par organisation.
- **Artiste importé de Deezer** : la modale « Nouvel artiste » cherche d'abord sur Deezer
  (`GET /api/catalog/artist-search?q=`, permission `manage_catalog`, résultats marqués
  « Déjà au catalogue » par `deezer_id`), « Créer sans Deezer » garde la saisie manuelle.
  Seul le `deezerId` part du navigateur : `createArtist` relit la photo et le lien sur
  Deezer (`getDeezerArtist`), jamais une URL fournie par le client. La recherche Deezer
  classe mal (homonymes obscurs en tête) : on prend 25 résultats, triés par fans, 8 gardés.
  Les petits artistes n'y sortent jamais : le même champ accepte un **lien Deezer**
  (`lib/catalog/deezer-link.ts`) — `deezer.com/[fr/]artist/<id>` lu directement, lien de
  partage `link.deezer.com/s/…` résolu par **une** redirection (`resolveDeezerShareLink`,
  seuls ces hôtes sont appelés, jamais une URL arbitraire). Lien d'album ou de titre : aucun
  résultat, message qui demande le lien de la page de l'artiste.
  Photo = URL du CDN Deezer (pas de copie Storage) ; `ArtistAvatar` retombe sur les
  initiales si elle ne charge plus.
- **Fiche artiste enrichie** (`lib/catalog/artist-profile.ts`) : pour un artiste importé de
  Deezer, la page lit en direct fans, discographie complète (album / EP / single /
  compilation, `lib/integrations/deezer-artist.ts`), top titres et artistes similaires.
  « Dernière sortie », « Dernier album » et « À paraître » sont **calculés par le code**
  (date du jour à Paris). Rien en base : cache `unstable_cache` d'une heure (une erreur
  n'est jamais mise en cache), deux `Suspense` pour qu'un Deezer lent ne bloque pas la
  page. **Bio** : API **interne** de Deezer (`lib/integrations/deezer-bio.ts`,
  `gw-light.php` `deezer.pageArtist`, jeton CSRF + cookies d'une session anonyme — non
  officielle, peut casser), puis repli **Wikipédia** trouvé par Wikidata via la propriété
  « Deezer artist ID » P2722, jamais par le nom (`lib/integrations/wikipedia.ts`, fr puis
  en, crédit + lien obligatoires CC BY-SA). HTML de Deezer réduit à du texte
  (`htmlToText`), jamais rendu comme balisage. Wikidata limite vite le débit (429) :
  ne pas marteler en test.
- **Profil d'artiste** (`20260926002001_artist_profile.sql`) : `legal_name`, `country_code`
  (ISO alpha-2, noms via `Intl.DisplayNames`, `lib/catalog/countries.ts`), `bio` (saisie,
  prime sur la bio auto ; vide = auto), `picture_path`. Photo : le navigateur envoie dans le
  bucket privé `artist-pictures` (`<org>/<artist>/<uuid>.<ext>`, contrainte SQL sur le
  chemin), puis `setArtistPicture` l'enregistre et supprime l'ancienne ; affichage par URL
  signées d'une heure (`lib/catalog/pictures.ts`), Deezer en repli. Contacts
  `artist_contacts` : RLS `manage_catalog` en lecture **et** écriture (le directeur créatif
  ne voit pas les coordonnées), premier contact principal d'office, un seul principal
  (trigger avant écriture), suppression du principal → promotion du plus ancien. Piège :
  dans une policy `storage.objects`, écrire `objects.name` dans une sous-requête sur une
  table qui a aussi une colonne `name` (sinon c'est elle qui est lue).
- **Onglets de la fiche artiste** : Vue d'ensemble, Masters, Projets, Fichiers, Activité,
  Discographie (Deezer seul). Masters et Projets réutilisent les tableaux des pages de liste
  (`listMasters({ ids })`, `listProjects({ ids })` ; `ArtistDetail.projectIds` = projets
  vivants des masters de l'artiste, RLS de visibilité), ouverts aussi par les tuiles
  chiffrées (`StatTiles` `href`). **Fichiers** (`artist_files`, bucket privé `artist-files`,
  50 Mo, `<org>/<artist>/<uuid>[.<ext>]`) : catégories presse / photo / contrat / audio /
  autre ; tout membre lit, **contrats lus seulement avec `manage_catalog`** (ligne et objet) ;
  `manage_catalog` ajoute, modifie et supprime. Le navigateur envoie l'objet puis
  `recordCatalogFile` enregistre la ligne (objet supprimé si l'enregistrement échoue) ; une
  seule signature par lot (`createSignedUrls`, une heure) sert à **ouvrir** et à
  **télécharger** (`download=<nom>` ajouté à l'URL, hors jeton) (`lib/catalog/file-*.ts`,
  `files.ts`, `upload-file.ts`). **Bibliothèque** (retour n°6, 27/09/2026) : un fichier =
  une ligne, la **catégorie est une propriété**, jamais une copie ; Tous / Presse / Photos /
  Contrats / Audio / Autres sont des vues filtrées par le code (`?category=`,
  `fileViewsOf`, `FileLibrary`), nombres compris. « Tous » = les lignes que la RLS laisse
  lire : un contrat n'y apparaît jamais pour qui ne peut pas l'ouvrir, et la vue Contrats
  n'est pas proposée sans `manage_catalog`. Pour `manage_catalog`, toute la bibliothèque est
  une zone de dépôt (glisser, clic dans le cadre vide, bouton « Ajouter un fichier ») ; la
  modale demande la catégorie (proposée d'après la vue ouverte, sinon le type : image →
  photo / pochette, son → audio) et une **précision libre** (`description`) plutôt que des
  sous-types, à structurer plus tard selon l'usage. Plusieurs fichiers déposés ensemble
  partagent catégorie et précision. « ⋯ » : Ouvrir (nouvel onglet), Télécharger, Modifier
  (nom, catégorie = reclasser, précision), Supprimer. **Pas d'archivage d'un fichier** :
  l'archivage reste réservé aux artistes, titres et projets (§ 2 quater) ; un fichier se
  supprime (`manage_catalog`, confirmé). Même bibliothèque sur l'onglet Fichiers d'un titre
  (hors fichiers audio, qui gardent leur onglet) et sur la page Fichiers d'un projet lancé
  (§ 8 ter), prête pour un call ou une activation (`FileOwner`). **Activité**
  (`activity_events`) : journal écrit **par triggers seuls** (création / modification de
  l'artiste, contacts, fichiers, masters, projets liés, transmissions), `detail` copié au
  moment de l'événement, historique antérieur reconstitué par la migration ; lecture filtrée
  par RLS (contacts et contrats : `manage_catalog`, événements de projet : `can_see_project`).
  Phrases et jours (heure de Paris) composés par le code (`lib/catalog/activity*.ts`,
  `components/catalog/artist-page/activity/`).
- Projet créé **avec son équipe** : le formulaire exige un chef de projet (le projet lui est
  transmis d'office, il accepte / refuse / demande une précision comme avant) et propose
  les directeurs créatifs (pastilles `CreativePicker`). Ni étape, ni responsable avant
  l'acceptation (`owner_person_id` posé uniquement par `respond_to_assignment`). En SQL,
  l'assigné reste facultatif (tests, projets hérités) : l'obligation est dans le schéma zod. Statut du projet **calculé par
  le code** (`projectStatusOf`) : étapes présentes → lancé, sinon dernière transmission
  (en attente, refusé, précision demandée), sinon non transmis. Les sections Cadrage / Calls / Sortie répondent 404 tant que le projet n'a
  pas d'étape (`requireLaunchedProject`).

### 2 quater. Archiver, restaurer, modifier depuis une liste

- **Archiver, pas supprimer** : artiste, master, projet disparaissent des listes, des
  sélecteurs, de PO et de leur fiche (404), mais restent en base avec leur historique,
  leurs contacts et leurs fichiers. Restaurables par le DG depuis le filtre « Archivés »
  des pages de liste (`?view=archived`, ignoré pour les autres postes). Aucune suppression
  définitive n'existe (décision de Sacha, 27/09/2026).
- **DG seul** (`archive_records`), **refusé si utilisé** : un artiste crédité sur un master
  actif (ou artiste d'un projet actif), un master utilisé par un projet actif, un projet
  **lancé** (son travail vit dans ses étapes). On archive donc de haut en bas (projet →
  master → artiste) et on restaure dans l'autre sens. La raison connue d'avance
  (`masterCount`, `projectCount`, étapes) est expliquée dans le dialogue au lieu de
  demander ; la base reste la seule à décider (`lib/archive/actions.ts` traduit ses codes).
- Un projet archivé en attente de réponse garde sa transmission, gelée : elle revient
  telle quelle à la restauration.
- **Membres** : pas d'archivage à part — « Suspendre » (déjà réversible, motif obligatoire)
  joue ce rôle, et n'est **pas** bloqué quand la personne a des projets : couper un accès
  doit toujours rester possible.
- **Modifier un membre** (« ⋯ » Modifier de la page Équipe) : prénom, nom et poste dans
  la modale (`FormDialog`, `app/(app)/app/members/member-edit-form.tsx`), une seule
  intention `edit` de `memberAction`. Le poste ne se change que pour une invitation ou un
  accès actif, jamais le sien ; sinon la modale l'affiche avec la raison (se choisit à
  l'approbation, ou réactiver d'abord). Deux mises à jour (`people` puis `memberships`),
  chacune bornée par ses droits colonne.
- **Menu « ⋯ » par ligne** (`RowActions`, `components/archive/record-actions.tsx`) :
  Modifier ouvre le **vrai formulaire** dans la modale du design system (`FormDialog`), chargé à
  l'ouverture (`lib/catalog/edit-form-actions.ts`, `lib/projects/edit-form-actions.ts`) ;
  un projet ne se modifie qu'avant lancement. Même menu dans l'en-tête des fiches artiste,
  master et projet non lancé ; après archivage depuis une fiche, retour à la liste.

### 2 quinquies. Relation d'un artiste avec PDS (Signé / Collaboration)

- **Deux axes indépendants** (demande de Sacha, 27/09/2026) : la **relation avec PDS**
  (`artists.relation` : `signed` = intégré au roster, `collaboration` = projets ponctuels,
  un PDS Mic…) décrit l'artiste ; **Actif / Archivé** (`archived_at`) décrit la fiche. Un
  seul objet Artiste : passer de Collaboration à Signé ne change que la colonne, la fiche
  garde masters, projets, contacts, fichiers et journal.
- **Toujours choisie par une personne** : obligatoire à la création (pas de défaut en base,
  ni dans le formulaire, ni chez PO), modifiable dans « Modifier » par `manage_catalog`
  (mêmes droits que le reste de la fiche). Les artistes existants avant la migration
  (`…002101`) ont été classés Signés.
- **Liste** : onglets Tous (défaut) / Signés / Collaborations avec leur nombre
  (`DataTableViews`), dans l'URL (`?relation=`),
  combinable avec Archivés du DG (`?view=archived`) — chaque filtre garde l'autre
  (`ArtistListViews`). La colonne « Relation » n'apparaît que dans « Tous ».
- **Journal** : `artists_log` copie la relation à la création (« Fiche artiste créée
  (Signé) ») et la nouvelle valeur à chaque changement (« … (désormais Signé) »).
- **PO** : `propose_artist` ne remplit la relation que si l'utilisateur l'a dite ;
  `find_artists` la donne pour chaque artiste et filtre par relation.
- Après « Créer l'artiste » depuis la page Artistes, la fiche du nouvel artiste s'ouvre ;
  depuis un sélecteur (master, projet), l'artiste est rendu au formulaire sans le quitter.

### 2 sexies. Fiche titre à onglets (`/app/catalog/masters/[id]/…`)

> Depuis le retour n°5 (27/09/2026), l'objet s'appelle **Titre** à l'écran ; le code et les
> URL gardent `master` (voir § 2 septies).

Migration `…003001_master_page.sql`, code dans `lib/catalog/master/`, écrans dans
`components/catalog/master-page/`. Layout commun (en-tête, « Créer un projet », « ⋯ »,
`MasterTabs`), une page par onglet, `loading.tsx` qui ne remplace que le corps.

- **Vue d'ensemble** : tuiles cliquables (fichiers audio, variantes, sessions,
  contributeurs, projets), **dossier du titre** (ISRC, ISWC, titulaire ℗, contributeurs,
  splits à 100 %, déclarations déposées, fichier audio au stade Master final) calculé par le code (`masterChecklist`), faits,
  artistes interprètes.
- **Sessions & pistes** : `master_sessions` (enregistrement, production, mixage, mastering,
  autre ; date, lieu, ingénieur, notes) et `master_tracks` (piste du multipiste,
  interprète, session facultative **du même master**, vérifié par trigger ; supprimer une
  session garde ses pistes, sans session).
- **Audio** (`/audio`) : les fichiers audio successifs, un bloc par état audio (§ 2 septies).
- **Variantes** (`/variants`) : décidées par le code (`listMasterVariantIds`) : les autres
  titres actifs **de même nom** (casse et espaces ignorés) qui créditent un des artistes
  principaux. « Nouvelle variante » ouvre `/masters/new?variantOf=<id>` pré-rempli (nom,
  crédits) ; chaque variante a son propre ISRC. Le champ Variante ne fait que la nommer.
- **Contributeurs & crédits** : les artistes interprètes restent `master_artists`
  (modifiés par « Modifier ») ; `master_contributors` porte tous les autres crédits (rôle
  fermé, précision libre), triés dans l'ordre des rôles.
- **Splits** : `master_splits`, deux types (master, édition), parts en % à deux décimales.
  **Total ≤ 100 % par type, vérifié au commit** (`split_total_over_100`, trigger différé) ;
  total, reste et statut calculés par le code (`splitTotal`, en centièmes). **Lus et écrits
  avec `manage_catalog` seulement** (comme les contrats) : l'onglet est masqué aux autres,
  leurs événements de journal sont `catalog_only`.
- **Droits & déclarations** : colonnes `masters.iswc` (normalisé `T` + 10 chiffres),
  `rights_holder`, `rights_year` (mention ℗ composée par le code) ; `master_declarations` une
  ligne par organisme (SACEM, SCPP, SPPF, ADAMI, SPEDIDAM) une fois déposée : Déposée,
  Confirmée, Refusée ; pas de ligne = « À déposer ».
- **Distribution** : lecture seule, les sorties (`releases`) des projets actifs qui portent
  le master, avec UPC, date, statut (`releaseStatusOf`) et liens détectés ; on modifie dans
  la Sortie du projet.
- **Projets**, **Fichiers**, **Activité** : mêmes tableaux et composants que la fiche
  artiste. Fichiers : `master_files` + bucket privé `master-files` (stems, pochette, contrat,
  autre ; les fichiers `audio` ont leur onglet), contrats réservés à `manage_catalog` ; composants et
  actions communs artiste / master (`components/catalog/files/`, `FileOwner`).
  Journal : `activity_events` porte maintenant `master_id` (et `artist_id` devient
  facultatif, l'un des deux obligatoire) ; triggers `masters_log` (création, identité,
  droits), `master_items_log` (un événement générique `master_item_*` avec la section et
  un nom copié), `master_files_log`, `project_masters_log_master`. Rendu commun
  `ActivityLog`.
- **Écritures** : `manage_catalog` et **master actif seulement** (`master_is_live` dans les
  politiques RLS) ; lecture par tout membre (splits exceptés). Toute écriture rafraîchit
  le layout du master (`revalidatePath(…, "layout")`).

### 2 septies. Titre, état audio, variante (retour n°5)

Migration `…004001_titles_audio_state.sql`, règles `lib/catalog/title-rules.ts`, vues
`lib/catalog/title-views.ts`, composants `components/catalog/title/`.

- **Vocabulaire** : à l'écran, « Titre » partout (Titres, Nouveau titre, Créer le titre) ;
  « master » ne désigne plus que l'état audio et le split de propriété de
  l'enregistrement. Le code, la table (`masters`), les routes (`/app/catalog/masters`) et
  les fonctions de PO (`propose_master`, `find_masters`) gardent leur nom : les renommer
  aurait touché toutes les clés étrangères sans rien changer au sens.
- **Un titre = l'objet musical durable**, créé dès la maquette et enrichi sans jamais être
  recréé. Obligatoires : titre et artiste principal. Facultatifs mais proposés dès la
  création (bloc « Si vous les connaissez déjà ») : état audio, variante, ISRC, durée,
  fichier audio.
- **État audio** (`masters.audio_state`) : `demo` Maquette → `rough_mix` Mise à plat →
  `master` Master → `final_master` Master final (`audio_state_rank` en SQL). **Null =
  non renseigné**, jamais deviné : un titre existant avant la migration reste « Non
  renseigné ». Ton : `audioStateTone`, pastille `AudioStateBadge`.
- **Variante** (`masters.variant`, défaut `original`) : Original, Radio Edit, Instrumental,
  Acapella, Remix, Autre ; `variant_label` (précision libre) **seulement pour Autre**
  (contrainte SQL). Remplace l'ancien champ libre `version`, converti par la migration (texte
  non reconnu → Autre avec ses mots). Libellé : `variantText`, `masterLabel`
  (« Sauvéé (Instrumental) »).
- **Fichiers audio successifs** : `master_files.category = 'audio'` avec `audio_state`
  obligatoire et `duration_seconds` (lue par le navigateur, `readAudioDuration` : métadonnées
  `<audio>`, sinon décodage Web Audio jusqu'à 25 Mo ; null s'il ne sait pas). Anciennes
  catégories converties : `master` → audio Master final, `mix` → audio Mise à plat. Un
  fichier ne crée jamais de titre.
- **Le titre avance seul** : trigger `y_advance_title` (security invoker : les droits de la
  personne qui dépose) — un fichier audio d'un état **≥** celui du titre le fait passer à
  cet état (jamais en arrière) et lui donne sa durée si elle est connue. Journal : « Fichier
  audio … ajouté (Master) », « État audio : Master ».
- **Fichier choisi à la création** : il reste dans le navigateur ; `createMaster` rend le
  titre (`intent=upload`), puis `useTitleAudioUpload` l'envoie et ouvre la fiche. Un
  fichier sans état audio est refusé avant l'envoi (pas d'état deviné) ; un envoi raté
  laisse le titre créé, toast et ouverture de l'onglet Audio.
- **Liste Titres** : onglets par état audio dans l'URL (`?state=`) : **Hors maquettes (par
  défaut)**, Maquettes, Mises à plat, Masters, Masters finaux, Tous ; un titre « Non
  renseigné » n'est jamais caché ; Archivés du DG en pastilles, comme Artistes. Colonne
  État audio.
- **Création automatique depuis Studio (à venir)** : elle devra appeler `create_master`,
  seule porte d'entrée, avec l'état `demo` et le fichier rattaché comme ci-dessus, sans
  inventer titre, artiste, crédits, splits ni ISRC : même objet qu'une création manuelle.
- **PO** : `propose_master` ne remplit état audio et variante que si l'utilisateur les
  nomme ; ses mots sont vérifiés et lus par le code (`parseSaidAudioState`,
  `parseSaidVariant` dans `lib/assistant/verbatim.ts`), comme l'ISRC.

Tests : `supabase test db` (pgTAP, `supabase/tests/*.test.sql`, 422 tests ; `pg_temp.add_call_report` ouvre le Cadrage dans les fixtures). Fixtures uniques par exécution (tag aléatoire) : passent sans reset.

Premier admin : `supabase/seed.sql` pose `admin@pds.test` en local. En production, poser
`bootstrap_admin_email` par une requête SQL explicite ; le verrou se ferme après usage.

---

### 2 octies. Brouillon d'un nouveau projet (retour n°6)

- **Problème** : un DG quitte « Nouveau projet » (pour créer le compte d'un chef de projet,
  par exemple) et perd tout ce qu'il avait saisi.
- **Enregistré au fil de la saisie**, en base (`project_drafts`, jamais `localStorage`) :
  `useProjectDraft` (`components/projects/use-project-draft.ts`) relit le formulaire toutes
  les 1,5 s — plusieurs champs sont des contrôles maison qui écrivent des champs cachés sans
  événement — et l'enregistre s'il a changé, puis en quittant la page. Rien n'est écrit
  avant une première modification. L'adresse prend `?draft=<id>` par `history.replaceState`
  (une vraie navigation re-rendrait le formulaire en pleine saisie), pour qu'un
  rechargement ou le retour arrière le reprenne ; si la page en cache date d'avant le
  brouillon, elle est relue (`router.refresh`). Enregistrer en quittant rafraîchit la liste
  des projets (où sont les brouillons), jamais pendant la saisie.
- **Reprendre** : la liste **Projets** montre en tête les brouillons de la personne (vue
  Actifs, avec `create_projects`), le plus récent d'abord, avec leur type (« Musical · EP »)
  et une pastille « Brouillon » (`draftTone`, neutre) ; chacun rouvre le formulaire
  pré-rempli (`/app/projects/new?draft=<id>`) ; un brouillon introuvable le dit. La page
  « Nouveau projet » ne les liste plus (demande de Sacha, 27/09/2026). Les valeurs sont relues comme une saisie (`draftValues`) et revérifiées
  à la création.
- **Fin** : « Créer le projet » supprime le brouillon (`createProject`, session de
  l'auteur) ; l'enregistrement s'arrête pendant l'envoi et reprend si la création est
  refusée. « Supprimer le brouillon » (confirmé) le jette. Un brouillon supprimé ailleurs
  n'est jamais recréé par un onglet resté ouvert.
- Seulement sur la page « Nouveau projet » : pas dans le panneau ouvert par PO (son
  brouillon est déjà la carte de PO), ni pour modifier un projet.

## 3. Authentification et navigation (étape 3)

- Portée d'Ibé : `lib/auth/{access,dal,redirects,actions,errors,schemas,form-state,site-url}.ts`,
  `components/auth/*`, pages `app/(public)/*` (connexion, inscription, vérification,
  mot de passe) et `app/(gate)/*` (en attente, refusé, indisponible).
- **Chaque page** vérifie l'accès (`requireApproved`, `requireAdmin`…) : un layout ne se
  ré-exécute pas à la navigation.
- `proxy.ts` : rafraîchit la session, redirige seulement `/app/*` ; exclut `/l/`,
  `/api/cron/`, `/api/labo/` (le proxy tamponne les corps de requête à 10 Mo).
- Emails : confirmation activée, templates `supabase/templates/*`, lecture en local via
  Mailpit. `site_url` = `http://localhost:3000`.
- **Postes ≠ permissions** (`docs/CONTEXTE-PROJET.md` § 12). `memberships.role` ne stocke
  qu'un poste : `general_director`, `project_manager`, `creative_director`
  (`ORGANIZATION_ROLES`). **Seule** `role_permissions(role)` (SQL) traduit un poste en
  permissions (`administer`, `assign_projects`, `validate`, `pilot_projects`,
  `creative_work`) ; `has_permission(org, perm)` les vérifie, `is_org_admin` = « détient
  `administer` » (gardée pour les policies de la fondation). `get_my_access` renvoie les
  permissions : le code teste `can(access, "administer")` (`lib/auth/access.ts`), jamais
  un nom de poste. Seule `administer` est appliquée pour l'instant (équipe) ; les autres
  attendent l'attribution des projets, les validations et les livrables créatifs. Chef
  de projet et Directeur créatif ont donc encore l'accès d'un membre (tous les projets) :
  la restriction aux projets attribués ou affectés viendra en RLS.
- **Pas de poste par défaut** : une inscription libre arrive sans poste, le DG le choisit
  en approuvant (« Approuver » ouvre le choix ; la base refuse un accès approuvé sans poste).
- **Création de compte par le DG** (`/app/members/new`, `inviteMember`) : prénom, nom,
  email, mot de passe, poste. 1) `invite_member` (session du DG) crée la Personne et un
  membership `invited` avec le poste ; 2) `auth.signUp` sur un client anon **sans session**
  (`lib/supabase/anonymous.ts` : le même droit que le formulaire public, jamais le service
  role, et la session du DG n'est pas touchée). La confirmation de l'email approuve
  l'invitation avec le poste (journal : source `system`). Sans confirmation, le compte est
  utilisable tout de suite ; avec, la personne confirme d'abord (lien `/signup?email=…` en
  secours, onglet Invités). Annuler une invitation = statut `rejected` ; réinviter la
  rouvre. Une adresse qui a déjà un compte est refusée (`person_has_account`).
- **Confirmation d'email désactivée en local** (`supabase/config.toml`,
  `enable_confirmations = false`) pour tester les comptes vite : s'inscrire = être connecté
  (en attente d'approbation, sauf invitation). **À réactiver sur le projet hébergé** :
  sans confirmation, n'importe qui peut s'inscrire avec l'adresse d'une invitation et
  récupérer le poste. Changer ce réglage demande `supabase stop && supabase start`.
- Coquille : `app/(app)/layout.tsx` (barre latérale blanche flottante, tiroir mobile), projets
  (`lib/projects/*`, étape actuelle calculée par le code), onglets projet : Vue d'ensemble,
  Cadrage, Calls, Sortie.
- Demandes d'accès en attente : comptées par le layout (`countPendingMemberships`, admins
  seulement) et affichées sur « Équipe », qui ouvre alors `?status=pending`. Un layout ne
  se recalcule pas à chaque navigation : le compteur se met à jour au chargement d'une
  page et après une action qui revalide (décision prise sur l'écran Équipe).

---

## 3 bis. Fluidité de la navigation

Un clic ne doit jamais laisser l'écran figé, et changer de vue dans une même page (section
d'un projet, onglet d'artiste, étape du fil d'Ariane, filtre Actifs / Archivés) doit
s'afficher sans chargement.

- **Vues préchargées** : ces liens passent par `ViewLink` (`components/ui/view-link.tsx`),
  un `Link` en `prefetch` complet : la page **et ses données** sont rendues en arrière-plan
  dès que le lien est à l'écran. Mesuré en production locale : 5 à 25 ms par changement de
  section, aucun squelette. Coût : ~12 rendus de page en fond à l'ouverture d'un projet,
  acceptable pour 3 à 5 utilisateurs ; ne pas l'étendre à des listes longues (une ligne =
  un préchargement complet).
- **Cache du routeur** (`next.config.ts`, `experimental.staleTimes`) : `dynamic: 30` (page
  revisitée en moins de 30 s), `static: 60` (vue préchargée, re-préchargée au survol une
  fois expirée). Jamais périmé après une écriture : tout `revalidatePath` d'une Server
  Action vide ce cache, les notifications Realtime font `router.refresh()`. Une écriture
  d'un collègue **sans** notification peut rester invisible 60 s au plus.
- **Squelettes** (`loading.tsx`) pour ce qui n'est pas préchargé (première entrée dans une
  page) : `app/(app)/app/loading.tsx` générique (`PageLoading`), listes avec leur vrai titre,
  sections d'un projet (`ProjectSectionLoading`, sous l'en-tête et les barres qui restent),
  onglets d'artiste, accueil (`HomeFrame` : PO utilisable avant les cartes). Piège : un
  `loading.tsx` enveloppe **aussi les segments enfants**, et le layout asynchrone d'un
  enfant s'attend sous le `loading.tsx` du parent. D'où les groupes `(list)` et `(home)` :
  sans eux, ouvrir une fiche artiste montrait le squelette de la liste des artistes.
- **Streaming** : accueil et Travail affichent l'en-tête tout de suite, les cartes arrivent
  derrière un `<Suspense>` (`HomeFeed`, `MyWorkCards`).
- **Pas de cascade** : une page lance l'accès, l'enregistrement et ses données en un seul
  aller-retour avec `allInOrder` (`lib/utils/parallel.ts`), qui renvoie la première erreur
  **dans l'ordre des arguments** (accès, puis enregistrement, puis données) : une
  redirection vers le bon écran l'emporte toujours sur un 404. Lancer une requête avant de
  connaître l'accès ne révèle rien : le RLS la filtre de toute façon.
- **Auth sans aller-retour** : `getClaims()` (proxy et `fetchAccess`) vérifie la signature
  du jeton localement (clés asymétriques ES256, JWKS mis en cache par auth-js) au lieu
  d'interroger le serveur Auth deux fois par page. Revers : une session révoquée ailleurs
  reste lisible jusqu'à l'expiration du jeton (1 h) ; sans effet sur les droits,
  `get_my_access` relit l'adhésion à chaque page et le RLS s'applique au même jeton.
- **À savoir** : `next dev` ne précharge jamais et compile chaque page à sa première visite.
  La fluidité se juge avec `pnpm build && pnpm start`.

---

## 4. Calls, audio, transcription (étape 4 + enregistreur)

- Page d'un call, **une étape à la fois** : enregistrer (fichier en repli, replié) →
  traitement **automatique** dès l'envoi (`CallProcessing` : transcription puis compte
  rendu, suivi `ProcessingSteps`, « Réessayer » seulement en cas d'échec, relecture de
  l'état toutes les 5 s si un traitement tourne ailleurs) → redirection vers le Cadrage.
  Consentement **accordé par contrat** (défaut `granted`, `…260926002301`) : plus d'écran.
- **Enregistreur dans l'app** (`components/calls/call-recorder.tsx`, `use-recorder.ts`,
  `recorder-media.ts`, `recording-live.tsx`, `recording-review.tsx`) :
  - source « onglet » (Meet, Zoom… + micro mixés) ou « micro seul » ;
  - Opus 32 kbit/s ≈ 14 Mo/h ; chrono, jauge, pause, réécoute, confirmation avant
    suppression, garde `beforeunload` ;
  - arrêt auto si le partage d'onglet est coupé ; **raccrocher ne suffit pas** (l'onglet
    reste partagé) → rappel affiché + **alerte après 2 min de silence de l'onglet**
    (`TAB_SILENCE_MS`), mesurée sur l'onglet seul, par minuteur (les animations sont
    suspendues dans un onglet caché) ; titre de l'onglet = état de l'enregistrement.
  - Pièges : `AudioContext` souvent suspendu après l'autorisation → `resume()` ;
    Chrome ne partage le son d'un onglet que si la vidéo est demandée (elle est coupée).
- Envoi (fichier ou enregistrement) : `lib/calls/upload-audio.ts` → Storage direct depuis
  le navigateur (RLS) → `attachAudio` (vérifie chemin, type, taille).
- Pipeline (`lib/calls/pipeline.ts`, routes `app/api/calls/[callId]/{transcribe,extract}`) :
  statut du call = verrou (un traitement à la fois), erreurs traduites (`audio_too_large`,
  `provider_quota`…), compte rendu via `save_call_report`. La route `extract` enchaîne
  `fillBriefFromCall` (`lib/framing/import-report.ts`) : le **premier** compte rendu d'un
  call est versé dans le Brief tant que le Cadrage n'est ni soumis ni validé ; la réponse
  porte `briefFilled`, qui déclenche la redirection.
- Groq : `lib/ai/groq-tolerant-fetch.ts` complète les champs de segment nuls renvoyés sur de
  vrais enregistrements (sinon « Invalid JSON response »). Limite 25 Mo (gratuit) / 100 Mo.

---

## 5. IA (`lib/ai/`)

- Points d'entrée uniques : `llm.ts` (`extract`, `getChatModel`) et `transcribe.ts`.
  Fournisseurs et modèles par défaut : `providers.ts`. Mistral gratuit : quota nul sur
  `small`/`medium` → `ministral-14b-latest` ; surcharge `LLM_MODEL`.
- Extraction du compte rendu : `call-report.ts`, schéma `schemas/call-report.ts`, consignes
  `instructions/call-report.ts` (la transcription n'arrive qu'en message utilisateur, dans
  `<data>`). « who »/« why » à null s'ils ne sont pas dits.
- **Provenance** : chaque élément porte une citation ; `provenance.ts` la retrouve
  (`timed` / `found` / `missing`) — une citation introuvable signale un élément inventé.
- Préparation de call (labo) : `call-prep.ts`, champs vides du Brief calculés par le code.

---

## 6. Cadrage (étape 5)

`app/(app)/app/projects/[projectId]/framing`, `lib/framing/*`, `components/framing/*`.
**Le cadrage part d'un call, ou du Brief en amont** : tant que `framing_is_open` est faux
(aucun compte rendu, aucun Brief entamé ; lu par `isFramingOpen`), la page et la vue
d'ensemble affichent `FramingStart` (deux options). « Préparer un call de cadrage » crée le
call avec un ordre du jour fixe (les cinq rubriques du Brief, temps approximatif par
rubrique — `lib/calls/first-call-agenda.ts`, affiché sur la fiche du call par `CallAgenda`
tant qu'il n'est pas enregistré). « Commencer en amont » ouvre le Brief à la main, sans
pré-remplissage (`start_framing_without_call`, fonction SQL security definer : la policy
`field_values_framing_open` réclame `framing_is_open` déjà vrai pour la toute première
ligne ; la fonction casse cette circularité en vérifiant `is_project_owner` elle-même). Un call brouillon daté dans le futur est affiché « À venir »
(`isUpcoming`, calculé par le code) : c'est la planification d'un échange.
Compte rendu versé **automatiquement** (plus de panneau d'import sur le Cadrage ; la
Stratégie garde le sien) → propositions « proposé · à confirmer » (Brief, besoins, cadre,
équipe, points ouverts), actions proposées → tâches (responsable + échéance choisis par une
personne), circuit de validation.

**Relecture guidée** (27/09/2026, d'après les maquettes de Sacha) : la page est un parcours
d'une question à la fois, l'écran dans l'URL (`?step=overview|objective|timing|needs|frame|team|summary`,
`lib/framing/guide.ts`), menu des 5 points à gauche (`FramingStepNav`, statut et résumé
d'une ligne **calculés par le code**), un écran par point (`components/framing/guide/`) :

- **Objectif** : on clique une formulation (celle du call, ou une de PO via « Proposer des
  formulations », citée mot pour mot et vérifiée, `chooseObjective` relit le texte en base,
  jamais celui du client) ou « Autre intention » en saisie libre.
- **Temporalité** : texte tel qu'il a été dit (« sortie visée le 24 octobre »), jamais
  converti en date ; encart « hypothèse à confirmer » avec la source. Pas de « Voir les
  impacts » : le planning ne se construit qu'après validation.
- **Besoins & activations** : pastilles (`FilterChip` soft) ; un clic ne change que la
  sélection à l'écran, rien n'est écrit avant « Confirmer cette sélection », qui ajoute,
  rejette et confirme en une fois (`saveNeedsSelection`) ;
  activation = famille `promotion_distribution`, besoin = le reste. L'état identifié /
  engagé n'est plus manipulé ici (l'engagement se fait dans la Stratégie, par les leviers).
- **Cadre & contraintes** : lignes de `framing_constraints` (type budget / production /
  artistique / droits / autre), une modale par ligne ; le compte rendu les importe en
  « autre » (le modèle ne type pas), la personne choisit le type.
- **Équipe projet** : une carte par rôle fixe (`lib/framing/team-roles.ts`, rôles
  débloqués par les besoins, `teamBoard`), pleine ou « À trouver » ; « Attribuer » en un
  clic à une personne déjà dans l'équipe ou à un nouveau nom (`role_key`, au plus une ligne
  par rôle).
- « Confirmer la sélection / le cadre / l'équipe » confirme d'un coup les lignes encore
  proposées de l'écran (`confirmProposed`) puis passe au point suivant.
- **Récapitulatif** : aperçu du Brief (`briefFacts`, faits écrits par le code), « Reste à
  faire » (points à confirmer, rôles à pourvoir, points ouverts), demande de validation
  (responsable), « Valider et clôturer » (valideur seul, `decide_validation`), points
  ouverts et tâches.
- **Brief partageable** `/framing/brief` : lecture seule, « Copier le lien » (ouvert aux
  seuls membres qui voient le projet — pas de lien public à jeton en V1) et « Exporter en
  PDF » qui **télécharge un fichier** (jamais la fenêtre d'impression) : route
  `GET /api/projects/[projectId]/framing-brief`, données lues avec la session (RLS), HTML
  autonome et échappé (`lib/framing/brief-pdf.ts`) imprimé par Playwright.

**Export PDF** (`lib/pdf/render.ts`, seul point d'entrée) : `playwright-core` reçoit un HTML
complet (`setContent`), le navigateur ne visite jamais l'app, aucune session ne lui est
confiée. Sur Vercel, Chromium de `@sparticuz/chromium` ; en local, le Chrome installé
(`channel: "chrome"`, il doit donc être présent sur la machine). Les deux paquets sont en
`serverExternalPackages` et le dossier `bin` de Chromium est ajouté au traçage de la route
(`next.config.ts`) ; `maxDuration` 60 s. Environ 2 s par PDF, plus au premier lancement.

### Dictée (bouton « Dicter » : Cadrage et Stratégie)

Remplir ou modifier un formulaire d'étape à la voix. Commun à toutes les étapes ; une étape
n'écrit qu'un **adaptateur**.

- Moteur `lib/voice/engine.ts` : audio → `transcribe()` → `extract()` (état actuel du
  formulaire + dictée, **en données**, jamais dans le prompt système) → `toProposals` de
  l'adaptateur (le code écarte doublons et non-changements, vérifie chaque citation avec
  `locateQuote`). **N'écrit rien.** Route `app/api/voice/[stage]` (multipart, 2 min /
  2 Mo max, audio jamais stocké), aiguillage `lib/voice/adapters.ts`.
- Adaptateur Cadrage : `lib/framing/voice.ts`, schéma fermé `lib/ai/schemas/framing-dictation.ts`
  (champs texte du Brief, ajout de besoins / équipe / points ouverts ; **ni tâches ni
  validation**), consignes `lib/ai/instructions/framing-dictation.ts`.
- Interface : `useDictation` + `DictationButton` / `DictationPanel` (`components/voice/`),
  enregistreur des calls réutilisé en micro seul. Relecture avant/après, « Écarter » par
  élément (citation introuvable → écartée par défaut), rien en base avant « Appliquer ».
- Écriture : `applyDictation` (`lib/framing/actions/voice.ts`) re-valide tout, insère en
  `confirmed` avec `source_type = 'voice'` + `source_quote` ; l'auteur est `created_by` →
  provenance « Dicté par X ».
- Ajouter une étape : un adaptateur (`VoiceAdapter`), un `case` dans `dictateFor`, la valeur
  dans `VOICE_STAGES`, une action d'application et la mise en mots des propositions.
- Micro de l'assistant (accueil) : **transcription seule**, `app/api/voice/transcribe`
  (`transcribeDictation`), hook `useVoiceInput` + `VoiceInputButton` / `VoiceInputStatus`.
  Le texte s'insère dans la saisie, **jamais envoyé automatiquement** (noms propres mal
  transcrits) ; ensuite, c'est un message tapé comme un autre. Échap annule.
- Les deux routes partagent `lib/voice/http.ts` (session approuvée, taille bornée).

---

## 6 bis. Stratégie de lancement

`app/(app)/app/projects/[projectId]/strategy`, `lib/strategy/*`, `components/strategy/*`.
Même page que le Cadrage, mêmes briques réutilisées (`BriefFieldCard`, `ValidationPanel`,
`ImportPanel`, `ProvenanceNote`, `useFramingAction`, `ActionResult`) : elles prennent le
livrable, les libellés ou l'action d'import en props.

- Champs texte : positionnement, publics, narratif (`field_values`, `deliverable = 'strategy'`,
  actions génériques `saveField` / `confirmField` / `rejectField`).
- Dispositif : leviers par famille (taxonomie des besoins) ; un besoin confirmé du Brief
  sans levier est proposé comme point de départ (« En faire un levier »).
- Livrables engagés : rattachés à un levier retenu. Calendrier : temps forts saisis à la
  main ; décompte J-n calculé par `lib/strategy/calendar.ts` depuis la date de sortie
  prévue (onglet Sortie), sinon l'échéance du projet.
- IA : le compte rendu d'un call extrait aussi positionnement, publics, narratif et leviers
  (citation obligatoire) ; `importStrategyReport` les pose en « proposé · à confirmer ».
  **Jamais de temps fort ni de livrable proposé**, jamais d'état de levier décidé par PO.
- Écriture : un `EditAccessProvider` imbriqué n'ouvre les contrôles qu'au responsable et
  pendant « en cours » ; la base l'impose (`strategy_is_editable`), un refus RLS devient
  `stage_locked`.
- Dictée : adaptateur `lib/strategy/voice.ts` (positionnement, publics, narratif, leviers ;
  un levier dicté reste « à décider », jamais de date, de temps fort ni de livrable).
- Questions à choix fermé (positionnement, publics, narratif) : liste dans
  `lib/strategy/choices.ts`, libellés dans `lib/i18n/fr/strategy.ts`. « Proposer des
  réponses » : `lib/strategy/suggest.ts` envoie le Brief confirmé et les éléments de
  comptes rendus **en données** (sources `brief:<champ>`, `item:<id>`), le modèle ne peut
  renvoyer que des clés de la liste + une citation ; le code écarte toute citation non
  retrouvée mot pour mot dans sa source. Droits vérifiés (`strategy_is_editable`) **avant**
  l'appel payant. Une suggestion n'est un choix qu'après « Accepter ».
  Cocher des réponses **compose la réponse texte** (`lib/strategy/compose.ts`, code, pas
  d'IA ; phrases dans `fr.strategy.choices.phrases`), que le responsable retouche avant
  « Enregistrer la réponse » (choix + texte en une écriture).
- Hors périmètre pour l'instant : export Plan de sortie (Playwright), lien partagé.

---

## 7. Sortie et smartlink (étape 6)

- `lib/release/detect.ts` : Deezer (ISRC) → iTunes (**UPC** de l'album puis numéro de
  piste ; iTunes ne cherche pas par ISRC) → MusicBrainz (liens communautaires, souvent vides
  le jour J) → Odesli **seulement avec `ODESLI_API_KEY`** (API publique fermée : 401
  `PUBLIC_API_ACCESS_DEPRECATED`, en fin de vie).
- Le lien Spotify saisi à la main compte comme lien `manual` mais ne rend jamais une
  sortie « en ligne ».
- Page `…/release`, bouton « Vérifier maintenant », cron quotidien `vercel.json`
  (`0 7 * * *`, Bearer `CRON_SECRET`), smartlink public `/l/[token]` (noindex), activable.

---

## 8. Assistant PO et accueil

Spécification : `docs/ASSISTANT.md` (à modifier avant le code).

- Route `app/api/assistant/route.ts` (streaming, 5 étapes max, messages bornés).
- Fonctions en lecture seule `lib/assistant/tools.ts` : `find_projects`,
  `project_status`, `my_todo`, `recent_activity`, `search_calls` ; session utilisateur.
- **Faits rédigés par le code** (`lib/assistant/facts.ts`) et affichés sous chaque réponse
  (« Données utilisées ») avec les liens ; le texte du modèle n'est qu'un résumé. Markdown
  et liens écrits par le modèle retirés à l'affichage.
- **Jamais la date du jour dans le contexte du modèle** (il ajoutait des années et jugeait
  les retards) ; retards écrits par le code (« EN RETARD » / « dans les temps »).
- Accueil : `AssistantPanel` + cartes (`components/home/*`) alimentées par `lib/insights/`
  (todo, activité, sorties), les mêmes requêtes que l'assistant.

### Page Travail (`/app/work`)

Ce qui attend la personne connectée, **un bloc par permission** (jamais par nom de poste :
qui cumule plusieurs permissions voit tous les blocs). Seule la phrase d'en-tête dépend du
poste. Chargée par `loadMyWork` (`lib/work/queries.ts`), session utilisateur, RLS.

| Permission | Blocs |
| --- | --- |
| `validate` | À valider (validations dont on est le validateur) |
| `assign_projects` | À retransmettre (refusés, précision demandée) · En attente d'un chef de projet |
| `pilot_projects` | Projets à accepter · Mes projets (lancés, dont on est responsable) avec la **prochaine action** · Livrables à attribuer (sans responsable ou sans échéance) · Propositions de PO de ses projets |
| `creative_work` | Livrables à concevoir (livrables de Stratégie qui lui sont attribués) · Projets de son équipe créative, Conception signalée |
| tous | Mes tâches |

- **Prochaine action** : décidée par le code (`lib/work/next-action.ts`) depuis l'étape en
  cours — Cadrage sans compte rendu de call → planifier/enregistrer le call ; Cadrage →
  rédiger le Brief ; Stratégie → la construire ; Conception → suivre l'équipe créative ;
  Livraison → préparer la sortie ; étape soumise → « en attente de validation », rangée
  après ce que le responsable peut faire. Jamais par PO (règle 6).
- Le circuit d'attribution (à accepter, à retransmettre, en attente) est calculé par
  `handoverOf` (`lib/projects/handover.ts`), partagé avec l'accueil.
- Le directeur créatif ne dépose pas encore de versions : ses livrables mènent à la
  Stratégie où ils sont engagés. Le dépôt viendra avec la Conception.

---

## 8 bis. Notifications et mise à jour en direct

- Source unique : la table `notifications`, écrite par la base. Le texte est rédigé par le
  code (`lib/notifications/types.ts`), la base ne stocke que des identifiants.
- **Cloche** (`components/notifications/notification-bell.tsx`) dans la barre latérale
  (panneau ouvert à droite) et l'en-tête mobile (dessous), données chargées par
  `app/(app)/layout.tsx`.
- **Realtime** (`notification-listener.tsx`) : à chaque insertion pour la personne
  connectée → `router.refresh()` (la page se met à jour sans recharger) + toast `sonner`
  (écart au design system, à valider avec Ibé). `supabase.realtime.setAuth()` **avant**
  `subscribe()`, sinon la socket est anonyme et la RLS ne laisse rien passer.
- **Web Push** : `public/sw.js` (écrit à la main, sans next-pwa), bouton d'activation
  dans la cloche, dépendance `web-push`. Envoi : `schedulePendingPushes()` après chaque
  action qui notifie (transmission, réponse, validation, tâche), exécuté dans `after()`
  avec la session de l'auteur. Clés VAPID facultatives : sans elles, la cloche marche,
  seules les notifications système sont coupées. iPhone : seulement app installée (PWA).
- **Secret de réclamation** : `claim_push_deliveries(p_secret)` et
  `drop_gone_push_subscription` (abonnement mort, 404/410) exigent `PUSH_CLAIM_SECRET`,
  comparé au secret Vault `push_claim_secret`. Sans lui, n'importe quel membre appelait la
  RPC depuis le navigateur et lisait les abonnements de ses collègues (endpoint + clés),
  puis pouvait les supprimer ou se les approprier. `forget_push_subscription` ne supprime
  que ses propres navigateurs. Endpoints limités aux services de push connus (FCM,
  Mozilla, Apple, Windows : `lib/notifications/push-hosts.ts` et la même liste en SQL),
  sinon le serveur POSTerait vers n'importe quel hôte. Local : secret posé par
  `supabase/seed.sql`. **Production** : une fois, dans l'éditeur SQL,
  `select vault.create_secret('<openssl rand -hex 32>', 'push_claim_secret');` et la même
  valeur dans `PUSH_CLAIM_SECRET` sur Vercel — sans cela, aucun push ne part (échec fermé).
- Son : onglet visible → carillon synthétisé (`lib/notifications/chime.ts`, muet tant que
  la page n'a reçu aucun clic) ; onglet caché → notification système, son géré par l'OS
  (macOS : Réglages → Notifications → Google Chrome). Un push accepté (`201`) mais
  invisible vient presque toujours de ce réglage ou du mode Concentration.
- Une modification qui ne notifie personne ne rafraîchit pas les autres écrans.

## 8 ter. Pages d'un projet lancé

Une page par section de la sidebar du projet, toutes derrière `requireLaunchedProject`
(404 avant lancement), en-tête `ProjectPageHeader`. Tout ce qui est état, retard, décompte
ou total est calculé par le code, jamais par PO.

- **Travail** (`lib/project-work/`) : une carte par personne, triée en retard → à faire →
  en attente → fait. Tâche à faire échue = en retard. Livrable : chez son responsable (en
  retard si daté dans le passé — pas encore d'état « livré ») ; sans responsable, chez le
  chef de projet en « Livrable à attribuer ». Validation en attente : « à donner » chez le
  validateur, « demandée » (en attente) chez le demandeur. Points ouverts : bloc projet
  « À décider », jamais sur une personne. Le responsable ajoute une tâche (`createTask`),
  le responsable ou l'assigné la coche (`setTaskDone`). `?person=` filtre.
- **Équipe** : membres internes et leur charge (mêmes fonctions que Travail), équipe
  créative (`CreativeTeam`), intervenants cités dans les calls (`project_team_members`).
- **Livrables / Activations / Planning** (`lib/project-plan/`, une lecture commune) : état
  d'un livrable En retard / À attribuer / Planifié ; leviers par famille, retenus d'abord ;
  frise par mois (temps forts, échéances, tâches, sortie prévue, échéance du projet), J-x
  depuis la même date de référence que la Stratégie. Modification : dans la Stratégie.
- **Fichiers / Validations / Activité** (`lib/project-history/`) : en tête, les
  **documents du projet** (`project_files`, bucket privé `project-files`), même
  bibliothèque que la fiche artiste (§ 2) : catégories Brief / Visuels / Contrats / Presse /
  Autres, précision libre ; lus par qui voit le projet (`can_see_project`), **contrats lus
  seulement par le responsable et la direction** (`can_read_project_contracts` :
  `is_project_owner` ou `view_all_projects`), écrits (ajout, modification, suppression)
  par **le responsable seul**, comme tout le projet lancé ; le DG lit sans écrire. Un
  ajout apparaît dans le journal (« Document ajouté »). Dessous, sans être copiés dans la
  bibliothèque : versions déposées en conception, puis audio des calls
  (téléchargement par URL signée de 15 min, session utilisateur) ; historique des
  validations, en attente d'abord, décision sur la page de l'étape (`stageHref`) ; journal
  reconstruit par `loadRecentActivity` (filtré par projet dans la requête), groupé par jour.
- **Budget** (`lib/budget/`) : enveloppe = `projects.budget_cents` (fixée à la création),
  Prévu = lignes prévues, Engagé = engagées + payées, Reste = enveloppe − engagé,
  dépassement écrit en toutes lettres. Le responsable seul écrit ; PO ne lit pas la table.

## 8 quater. Retours sur l'application (`/app/feedback`)

Circuit : l'équipe écrit au **DG**, PO regroupe les doublons, le DG choisit ce qui est
utile et le **transmet** avec une priorité à l'équipe qui construit l'outil.

- **Fenêtre de retour** (`FeedbackProvider`, une pour toute l'app) : « Envoyer un retour »
  en bas de la navigation, « Nouveau retour » sur la page. Type fermé (`bug`, `idea`,
  `other`), message (4 000 caractères), page d'origine jointe d'office (chemin `/app…`
  seulement), captures facultatives (5 au plus). Le formulaire est chargé à la première ouverture.
- **Capture d'écran** : un navigateur ne voit pas une capture système (⌘⇧3/4/5 sont pris
  par macOS). La fenêtre s'ouvre donc sur ce qu'on peut voir : la touche **Impr. écran**
  (Windows), et une image **collée** (⌘V / Ctrl+V) n'importe où dans l'app, qu'elle joint.
  Une zone peut s'y soustraire avec `data-paste-ignore`. Dans la fenêtre, une **zone de
  dépôt** (`FileDropZone`) reçoit les captures glissées ou s'ouvre au clic sur le
  sélecteur de fichiers (plusieurs à la fois) ; une image lâchée ailleurs dans le
  formulaire est jointe aussi, plutôt que d'ouvrir l'image à la place de la page. Chaque
  image (PNG, JPEG, WebP, 5 Mo) part du navigateur vers le bucket privé `feedback-screenshots`, dans
  `<organisation>/<personne>/<uuid>.<ext>` (RLS : chacun son dossier ; lecture par
  l'auteur et le DG), avant l'envoi du retour ; un trigger refuse un chemin qui n'est pas
  celui de l'auteur. Chemins dans `feedback.screenshot_paths` (`text[]`, 5 au plus,
  vérifié par contrainte et par le code). Affichées par URL signée (1 h).
- **Dictée du message** : micro dans le coin du champ (`VoiceFieldControl`, `addon` de
  `TextareaField`) ; le texte transcrit (`/api/voice/transcribe`, audio jamais gardé)
  s'ajoute à ce qui est écrit, relu avant l'envoi. Réutilisable sur tout champ texte.
- **Capture d'une zone** (touche **C**, comme les commentaires de Figma) : hors d'un champ et
  sans fenêtre ouverte, `useCaptureShortcut` affiche `ZoneCapture` : curseur en croix avec
  l'icône des retours, un clic sur un coin puis sur le coin opposé (ou un glisser), Échap
  ou clic droit pour annuler ; la page ne défile pas pendant la sélection. Au relâchement
  ou au second clic, la zone **se fige** (elle ne suit plus la souris) et « Capture… »
  s'affiche ; Échap annule encore. La zone est capturée (`lib/feedback/capture-region.ts`)
  puis la fenêtre de retour s'ouvre avec ; au-delà de 20 s, elle s'ouvre sans capture.
  Un navigateur ne peut pas lire l'écran sans demander l'autorisation à chaque fois
  (`getDisplayMedia`, avec un bandeau de partage qui décale la page) : la page est donc
  **redessinée depuis son DOM** par `modern-screenshot` (rendu du navigateur via SVG
  `foreignObject`, polices et images embarquées, chargé à la première capture), le corps
  entier puis recadré. Piège : la copie est dessinée non défilée ; les éléments `sticky`
  et `fixed` (barre latérale) sont donc épinglés là où on les voit, par un attribut
  temporaire que la copie reprend. Autre piège : la bibliothèque attend **toutes** les
  images de la page (30 s chacune par défaut) et les retélécharge ; une image `lazy` hors
  écran ne se charge jamais et la capture restait sur « Capture… ». Une image pas encore
  chargée (qui n'affiche rien) est donc remplacée par une image vide le temps de la copie,
  une image chargée hors de la zone n'est pas retéléchargée (`fetchFn`), et toute attente
  est plafonnée à 5 s. Le calque porte `data-capture-ignore` et n'apparaît pas
  sur la capture. Limites : une vidéo, un `<canvas>` ou une image d'un domaine sans CORS
  peuvent sortir vides ; PNG, JPEG si plus de 5 Mo.
- **Retour du DG → directement sur Notion** (demande de Sacha, 27/09/2026) : le DG n'a
  pas à se trier lui-même. Pour qui a `read_feedback`, la fenêtre de retour (bouton,
  touche **C**, capture collée) s'intitule « Envoyer un retour sur Notion » et demande la
  **priorité** (Normale par défaut, choisie par un humain). `sendFeedback` enregistre le
  retour, puis `sendDirectToNotion` (`lib/feedback/direct.ts`) : PO écrit titre et résumé
  (repli : premiers mots, par le code), `file_feedback` ouvre un sujet à lui seul,
  `review_feedback_topic` le transmet, `syncTopicToNotion` crée le ticket avec ses
  captures et la page d'origine — mêmes fonctions SQL et même session que depuis la page
  Retours, aucune migration. Échec Notion : toast avec la raison, sujet dans « Transmis »
  avec « Réessayer sur Notion » ; échec du classement : retour laissé dans la boîte « À
  examiner ». Le « Envoyer » d'une carte de PO passe encore par la boîte (pas de priorité).
- Table `feedback` : auteur posé par trigger, **jamais supprimée**. **Son auteur la modifie**
  (« Modifier » sur chaque carte de « Vos retours », même fenêtre de retour pré-remplie) :
  type, message, captures (garder, retirer, ajouter), à tout moment, pour ajouter une
  précision ou une capture oubliée. Droits colonne par colonne (`kind`, `message`,
  `screenshot_paths`) + politique `feedback_update_author` ; `edited_at` posé par trigger
  (`mark_feedback_edited`, pas quand `file_feedback` pose `topic_id`) ; les captures
  ajoutées passent le même contrôle de dossier (`b_check_screenshot` à l'insertion et à la
  modification). La page d'origine, l'auteur et le sujet ne changent jamais. Un retour
  modifié après la dernière publication d'un sujet compte dans « N retours pas encore sur
  Notion » (`newSinceSync`, code) : le DG met la page à jour. Le résumé de PO n'est pas
  réécrit. Une capture retirée reste dans le bucket (politique de suppression Storage à
  faire).
- **Lecture** : chacun voit les siens ; la permission **`read_feedback`** (DG seul,
  `role_permissions`) voit tous ceux de l'organisation et décide.
- **Tri par PO** (`lib/feedback/triage.ts`) : à l'ouverture de la page par le DG, s'il y a
  des retours non classés, `FeedbackTriage` appelle `triageFeedback` (session du DG,
  jamais le service role) et affiche « PO vérifie… » à la place de la liste. Pour chaque
  retour, PO reçoit le message et les sujets ouverts (données, jamais consignes) et dit
  s'il rejoint un sujet (identifiant court vérifié par le code, sinon nouveau sujet) ;
  il écrit le titre et le résumé, jamais de compteur, de date ni de priorité. En cas
  d'échec, les retours restent « En attente de tri », visibles, avec « Réessayer ».
- **Sujets** `feedback_topics` : `new` (à examiner), `sent` (transmis, priorité
  `high` / `normal` / `low` obligatoire, date et auteur de la transmission), `dismissed`
  (écarté). Changements par `review_feedback_topic` seulement : transmettre, changer la
  priorité, écarter, remettre à examiner. Un retour qui rejoint un sujet écarté le remet à
  examiner ; un sujet transmis affiche « N nouveaux retours depuis la transmission »
  (calculé par le code).
- La page est dans la navigation principale (« Retours », hors Figma, pour tous) : le DG y
  trouve sa boîte, les autres leurs retours envoyés.
- **Modifier avant de transmettre** (sujet à examiner ou écarté, jamais transmis) : le DG
  corrige titre, résumé et type dans la modale « Modifier le retour »
  (`edit_feedback_topic`, qui pose `edited_at` / `edited_by`). « Demander à PO de
  réécrire » : PO repart des retours d'origine et d'une consigne facultative du DG, et sa
  proposition remplit les champs ; rien n'est écrit avant « Enregistrer » par le DG. Un
  sujet modifié affiche « Modifié le … par … » au lieu de « résumé par PO », et PO ne
  réécrit plus son résumé quand un nouveau retour le rejoint (`file_feedback`). Le texte
  de PO est nettoyé de toute mise en forme par le code (`plainText`).
- Onglets du DG (`?view=`) : À examiner, Transmis (par priorité puis date), Écartés,
  **Tous les retours** tels qu'envoyés, puisque PO peut se tromper ; chaque sujet déplie
  aussi ses retours d'origine.
- **Par PO** (`docs/ASSISTANT.md` § 3 bis) : tout membre dit « fais-moi ce retour… » et PO
  prépare le retour, envoyé depuis sa carte tel quel (« Envoyer ») ou après retouche dans
  la fenêtre de retour (« Modifier », `FeedbackDraftActions`) ; la page d'ouverture est
  jointe seulement depuis la fenêtre Espace Espace, qui la connaît ; le DG fait tout le reste par PO : lire, modifier, transmettre,
  écarter. Chaque proposition s'ouvre dans le vrai formulaire (fenêtre de retour,
  « Modifier le retour », confirmation de décision) et l'humain enregistre.
- **Où arrivent les retours transmis : Notion** (`lib/integrations/notion.ts`, seul point
  d'entrée, `fetch` sans dépendance). À « Transmettre », le serveur crée une page dans la
  base `NOTION_FEEDBACK_DATABASE_ID` avec le jeton d'intégration interne `NOTION_TOKEN`
  (serveur seulement), puis la met à jour à chaque changement de priorité ou avec
  « Mettre à jour sur Notion » (propriétés, et retours arrivés depuis ajoutés au corps).
  Propriétés attendues, nom et type exacts : **Titre** (titre), **Résumé** (texte),
  **Type** (sélection), **Priorité** (sélection), **Retours** (nombre), **Transmis par**
  (texte), **Transmis le** (date), **Lien** (URL) ; facultative : **Captures** (fichiers et
  médias), remplie seulement si la base l'a (schéma lu à chaque envoi). Les captures sont
  **téléversées** chez Notion (API *File Upload* : création, envoi en multipart, puis
  rattachement), jamais en lien : les URL signées de l'app expirent en une heure. Elles
  apparaissent en blocs image sous chaque retour d'origine du corps, et dans la colonne
  Captures (toutes, renvoyées quand il en arrive de nouvelles, une colonne se remplaçant
  en entier). Lues avec la session du DG (RLS du bucket) ; une capture qui échoue est
  laissée de côté, jamais une raison de refuser l'envoi. Le lien de la page et la date de
  dernière mise à jour sont écrits par `record_feedback_notion` (session du DG). Un échec
  Notion n'annule jamais la transmission : sa **raison** en clair (réglage manquant, jeton
  refusé, base non partagée avec l'intégration, colonne manquante, Notion indisponible…)
  s'affiche en toast et reste sur le sujet (`notion_error`, `record_feedback_notion_error`)
  jusqu'au prochain envoi réussi, avec « Réessayer sur Notion ». Réglage manquant : bandeau
  sur « À examiner » et « Transmis ». Sans les deux variables, rien ne part : onglet « Transmis »
  seulement. Mise en place : intégration interne sur notion.so/my-integrations, base
  partagée avec elle (« … » → Connexions), variables dans `.env.local` / Vercel.
- `lib/ai/llm.ts` : si ministral renvoie sa réponse emballée dans la forme du schéma
  (`{"type":"object","properties":{…}}`), le contenu de `properties` est validé à la
  place (vu sur le tri, 27/09/2026).

## 9. Design (`docs/DESIGN.md`)

- Design system : tokens et pont shadcn dans `app/globals.css`, polices
  Google Sans Flex / Geist Mono, boutons pilule noire (boutons-icônes en carré arrondi),
  barre latérale blanche flottante sur fond `--surface-app` (`docs/DESIGN.md` § 4).
- États métier → cinq tons sémantiques (`neutral`, `info`, `warning`, `success`,
  `danger`) dans `lib/ui/state-tones.ts`, affichés par `components/ui/status-badge.tsx`.
- Liste des masters : la sortie affichée (prochaine à venir, sinon la plus récente) est
  choisie par `pickMasterRelease` (`lib/catalog/master-release.ts`), recherche côté client.
- Liens soulignés seulement s'ils n'ont pas de classe (adaptation assumée).
- **Piège `cn()`** : il confond les tailles de texte du système (`text-body-md`…) avec des
  couleurs ; dans une classe passée à `cn`, écrire `text-[length:var(--type-body-md)]`.
  Il ne connaît pas non plus `rounded-pill` : deux arrondis restent alors dans la classe
  et Tailwind, qui les trie par nom, fait gagner `rounded-pill` sur `rounded-lg` (d'où
  `rounded-full` dans `button.tsx`).
- **Photo d'artiste** : exception voulue à « avatar = initiales, jamais de photographie »,
  pour les artistes seulement (`components/catalog/artist-avatar.tsx`).
- Écarts au système à arbitrer : toasts (sonner), animations d'ouverture du
  select et du tiroir, densité compacte non exposée.

---

## 10. Labo (`/labo`)

Banc de test local sans authentification (404 en production, `lib/labo/guard.ts`) :
transcription, compte rendu, préparation de call, détection ISRC. Faux call :
`docs/labo/faux-call.m4a` (+ `.txt`). Interface jetable ; la logique vit dans `lib/`.

---

## 11. Variables d'environnement

Voir `.env.example` (commenté). Schémas zod : `lib/env.ts` (serveur) et
`lib/env-public.ts` (`NEXT_PUBLIC_*`). Clés requises : Supabase (URL, anon), clé du
fournisseur LLM choisi, clé Groq ; optionnelles : `LLM_MODEL`, `TRANSCRIPTION_MODEL`,
`ODESLI_API_KEY`, `CRON_SECRET` (≥ 32 car.), `SUPABASE_SERVICE_ROLE_KEY` (cron),
clés VAPID et `PUSH_CLAIM_SECRET` (≥ 32 car., même valeur que le secret Vault, § 8 bis).

---

## 12. Pièges rencontrés (à ne pas redécouvrir)

- **Une sous-requête dans une policy subit le RLS de l'appelant.** Écrire « lisible s'il
  n'existe pas de ligne interdite » ne protège rien : pour qui ne voit pas ces lignes, le
  `not exists` est toujours vrai (fuite des contrats `artist-files`, corrigée en
  `…001101`). Toujours écrire la condition en positif (« il existe une ligne que je vois »).
- **Un état figé se garde en RLS, pas seulement dans l'action.** Un client authentifié
  appelle PostgREST directement : le Cadrage validé restait modifiable tant que seul
  `lib/framing/` refusait (`framing_is_editable`, `…001101`).
- Docker Desktop est installé mais son CLI n'est pas dans le PATH : préfixer
  `PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"` pour `supabase`.
- Une seule stack Supabase à la fois (le repo `po` d'Ibé utilise les mêmes ports).
- `AGENTS.md` est réécrit par `next dev` : ne pas le supprimer (sinon il écrase `CLAUDE.md`).
- Next 16 : `proxy.ts` remplace le middleware ; sa doc est dans `node_modules/next/dist/docs/`.
- zsh : ne jamais nommer une variable de boucle `path` (elle écrase `PATH`).
- Chrome headless : `--use-fake-device-for-media-stream` fournit un bip (micro et onglet),
  `--use-file-for-fake-audio-capture` reste muet sur macOS ; un vrai silence d'onglet ne
  se simule pas.
- **`text[] || 'littéral'` dans un trigger** : le littéral non typé est lu comme un
  tableau (`malformed array literal`). `artists_log` échouait ainsi sur toute
  modification de fiche artiste jusqu'à `…002101` ; écrire `array_append(v, 'x')`.
- **Numéros de migration en parallèle** : deux sessions ont créé chacune un `…000801`
  (et encore un `…002001` le 27/09). Avant
  d'ajouter une migration, lister `supabase/migrations/` et prendre le numéro suivant.
- **Tests Realtime** : la RLS de Realtime se vérifie avec deux vraies sessions (script
  Node, `signInWithPassword`), pas en pgTAP.
- **Types générés des RPC** : un paramètre SQL sans `default` est typé obligatoire et non
  nul. Mettre les paramètres facultatifs en fin de signature avec `default null`, et
  passer `undefined` (pas `null`) côté TypeScript.
- **Triggers de contrainte différés et pgTAP** : un test tourne dans une seule transaction ;
  pour vérifier un refus au commit, finir l'instruction par `set constraints all immediate`
  dans le `throws_ok`, puis `set constraints all deferred`.
- **ministral-14b et les schémas sans champ texte** : un schéma fait seulement d'objets et
  de listes reçoit en réponse… le schéma lui-même (`{"type":"object","properties":…}`),
  à chaque fois. Un premier champ texte libre (`request` dans la dictée) règle le problème.
  Rendre `nullable` un objet que le modèle peut vouloir mettre à `null`.
- **ministral-14b et les schémas imbriqués** (dictée, 26/09/2026) : sous un objet englobant
  (`changes: { brief, needs, … }`), le modèle ferme l'objet trop tôt et sort les listes au
  premier niveau → `No object generated: response did not match schema` → 502. Garder le
  schéma **à plat**. Sur une dictée courte, il **omet** les champs non dictés au lieu
  d'écrire `null` : `.nullish()` pour les champs, `.default([])` pour les listes. Pour voir
  la réponse brute, `error.text` de `NoObjectGeneratedError` (journal du serveur :
  `.next/dev/logs/next-development.log`).
- Test de la dictée sans micro : Chrome headless en CDP, `getUserMedia` remplacé par un
  script qui joue un fichier (`say -v Thomas … -o x.aiff` puis `afconvert -f m4af -d aac`)
  dans un `MediaStreamDestination`.
- Données de test locales : `admin@pds.test` / `Framing-test-2026!` (admin), projet
  « Lueur ». Fictives uniquement : les paliers gratuits peuvent entraîner leurs modèles.
