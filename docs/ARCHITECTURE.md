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
| `…260927000501_budget_lines` | Lignes de budget d'un projet : libellé, montant (centimes ≥ 0), famille (taxonomie des leviers) et levier retenus facultatifs (même projet, trigger ; levier supprimé → lien retiré), statut `planned`/`committed`/`paid` (+ `proposed` et `master_role` depuis `…20261005012001_budget_four_states`, § 8 septies). Lecture `can_see_project`, écriture `is_project_owner`, droits colonne par colonne. Tests `supabase/tests/budget.test.sql`. |
| `…260926002301_call_consent_by_contract` | Consentement donné par contrat : `calls.consent` vaut `granted` par défaut, les calls `pending` passent à `granted`. Colonne, trigger et `calls_audio_requires_consent` conservés. |
| `…260926001501_project_team_at_creation_and_framing_call` | Type `event`. `create_project` prend `p_assignee_person_id` (transmission d'office via `transmit_project`) et `p_creative_person_ids` (via `add_project_creative`), dans la même transaction : un refus annule tout. **Pas de cadrage sans call** : `framing_is_open` (compte rendu de call, ou Cadrage déjà entamé avant la règle), politiques restrictives sur `field_values` `brief`, `needs`, `project_team_members`, `start_stage` → `framing_requires_call`. |
| `…260926001401_strategy_choice_suggestions` | Questions à choix fermé de la Stratégie : `field_values` clés `<champ>_choices` (confirmé, manuel) et `<champ>_suggestions` (source `suggestion`, toujours `proposed`/`rejected`). |
| `…260926000201_team_roles_invitations` | Postes (renommés en `…000401`), statut `invited`, `invite_member(...)`, T10 réécrit pour ouvrir une invitation à la confirmation d'email. |
| `…260927000701_archive_records` | Archivage (§ 2 quater) : permission `archive_records` (DG), `set_artist_archived` / `set_master_archived` / `set_project_archived` (SECURITY DEFINER, seul chemin d'écriture de `archived_at`, grant colonne retiré), refus `*_in_use` / `project_launched` / `*_uses_archived` / `artist_name_taken` ; ligne archivée non modifiable (politiques d'UPDATE), transmission d'un projet archivé gelée (trigger `b_guard_archived`). |
| `…20261006000301_delete_records` (numéroté `000101` à l'origine, en double avec le Cadrage intelligent) | Suppression définitive (§ 2 quater) : `delete_records(kind, ids[])` (SECURITY DEFINER, `archive_records`, 200 lignes au plus) renvoie une ligne par id (`error` nul = supprimée, sinon `not_found` / `forbidden` / `*_in_use` / `generic`), chaque id dans son sous-bloc ; un projet part avec tout son contenu (`delete_project_row`, enfants avant parents), un master / artiste / contact seulement s'il n'est plus utilisé ; crédits et parts d'un contact supprimé gardent le nom sans lien. Tests : `delete-records.test.sql`. |
| `…260927001101_framing_team_roles`, `…001201_framing_constraints`, `…001401_framing_guided_review` | Cadrage en relecture guidée (§ 6) : `project_team_members.role_key` (rôle fixe, au plus une ligne par rôle), table `framing_constraints` (une ligne par contrainte typée, provenance, relue comme les besoins), source `voice` et changement de type autorisés, droits colonne sur `role_key`, lignes figées une fois le Cadrage soumis (`framing_is_editable`). |
| `…260927001101_security_audit_fixes` | Correctifs de l'audit back du 27/09 : lecture des objets `artist-files` en **positif** (`manage_catalog`, ou une ligne `artist_files` visible — les contrats restent cachés) ; **Cadrage figé une fois soumis** (`framing_is_editable` : Brief, besoins, équipe écrits seulement en `not_started` / `in_progress`, policies restrictives insert + update) ; `project_masters` modifiable seulement avant lancement, sur un projet et un master non archivés (`project_masters_editable`) ; Web Push protégé par un secret serveur (§ 8 bis). Tests : `security-audit.test.sql`. |
| `…260927004101_project_drafts` | Brouillons du formulaire « Nouveau projet » (retour n°6, § 2 octies) : `project_drafts.form_values` (objet JSON, 64 Ko au plus), auteur posé par trigger ; lus, modifiés et supprimés par leur auteur seul, tant qu'il a `create_projects`. Tests : `project-drafts.test.sql`. |
| `…260927012001_catalog_file_library` | Bibliothèque de fichiers (retour n°6, § 2) : `artist_files.description` et `master_files.description` (précision libre, 200 car., `null` si vide) ; `manage_catalog` modifie nom, catégorie et précision (droits colonne, policies `*_update_catalog`), jamais un fichier audio de titre (`category <> 'audio'` avant et après) ; événement `file_updated` (`previous_category` si reclassé, privé si contrat avant **ou** après) ; lecture des objets `master-files` passée en positif comme `artist-files` (même faille que l'audit du 27/09). Tests : `file-library.test.sql`. |
| `…20261006000101_framing_intelligent` | Cadrage intelligent (§ 6) : `source_label` (field_values, needs, framing_constraints, project_team_members, vue `current_field_values` recréée), type de contrainte `human`, `project_team_members.contact_id` (Réseau), `framing_deadlines`, `report_items.brief_key` (genre `brief_fact`), `framing_briefs` (versions, `create_framing_brief`, `send_framing_brief`, `decide_framing_brief`, trigger `framing_brief_follow_validation`), `request_validation` refuse un Cadrage sans version (`brief_required`), `framing_key_dimension` / `framing_dimension_editable` + politiques restrictives par dimension, `framing_calls` + `create_framing_call`. Tests : `framing-intelligent.test.sql`. |
| `…20261006000201_project_plan` | Plan du Projet (§ 6 ter) : `project_plans`, `project_plan_items`, `workflow_is_launched`, `launch_project_plan`, `launch_plan_workflow` ; `start_stage` refuse la Stratégie sans plan (`plan_required`). |
| `…20261009000101_strategy_workflow` | Workflow Stratégie complet (§ 6 bis) : `strategy_workspaces` (`start_strategy`, `open_strategy_revision`), `strategy_is_editable` (en cours, ou révision ouverte, jamais pendant une relecture), `milestones.channel` / `notes`, `strategy_deliverables.quantity`, `strategy_budget_lines`, `strategy_kpis`, `strategy_documents` + `strategy_document_reviews` (`create_strategy_document`, `send_strategy_document`, `decide_strategy_document`, `remind_strategy_review`, garde `validations_strategy_guard`), `request_validation` refuse la Stratégie sans version, notifications `strategy_review_*`, `strategy_document_drafts`, `share_links.document_id` + `share_strategy_document` / `get_shared_strategy_document` (anon), bucket public `document-visuals`, `strategy_calls` + `create_strategy_call`, `strategy_recommendations`. Tests : `strategy-workflow.test.sql`. |
| `…20261007000101_plan_add_workflow` | Audit du 07/10 : `launch_plan_workflow(projet, workflow, titre, raison)` ajoute au plan lancé, en Focus et au nom de qui le lance, un workflow qui n'y figure pas (retiré avant le lancement ou jamais proposé), puis le démarre ; `plan_required` sans plan, `invalid_transition` s'il est déjà lancé. Tests : `framing-intelligent.test.sql`. |
| `…20261007000201_legal_confirm_without_questions` | Audit du 07/10 : `confirm_legal_intake` crée le dossier juridique s'il n'existe pas (projet sans question à poser), au lieu de `legal_intake_not_started`. Tests : `legal-intake.test.sql`. |
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
  les directeurs créatifs (pastilles `PeoplePicker`). Ni étape, ni responsable avant
  l'acceptation (`owner_person_id` posé uniquement par `respond_to_assignment`). En SQL,
  l'assigné reste facultatif (tests, projets hérités) : l'obligation est dans le schéma zod. Statut du projet **calculé par
  le code** (`projectStatusOf`) : étapes présentes → lancé, sinon dernière transmission
  (en attente, refusé, précision demandée), sinon non transmis. Les sections Cadrage / Calls / Sortie répondent 404 tant que le projet n'a
  pas d'étape (`requireLaunchedProject`).

### 2 quater. Archiver, restaurer, modifier depuis une liste

- **Archiver** : artiste, master, projet disparaissent des listes, des
  sélecteurs, de PO et de leur fiche (404), mais restent en base avec leur historique,
  leurs contacts et leurs fichiers. Restaurables par le DG depuis le filtre « Archivés »
  des pages de liste (`?view=archived`, ignoré pour les autres postes).
- **Supprimer** (demande de Sacha du 06/10/2026, qui remplace la règle « aucune
  suppression » du 27/09) : « Supprimer » dans le « ⋯ » de chaque ligne et fiche
  (actif ou archivé), et **cases à cocher** sur les quatre pages de liste (Artistes,
  Catalogue, Projets, Réseau ; `selectable`) : la case d'en-tête prend toutes les lignes
  affichées, une barre « verre » flottante en bas de l'écran annonce « n sélectionnés »,
  « Supprimer » (confirmé, définitif) et ✕ / Échap pour désélectionner. La sélection ne
  garde que les lignes à l'écran (`components/ui/row-selection.tsx` : chaque case
  enregistre sa ligne tant qu'elle est montée), donc jamais une ligne cachée par la
  recherche. DG seul (même permission `archive_records`), une seule fonction SQL
  `delete_records` (`lib/archive/delete-actions.ts`). Règles :
  - **projet** : supprimé avec tout ce qu'il contient (étapes, calls, tâches, stratégie,
    budget, lignes de fichiers, juridique, master, contrats du projet), lancé ou non ;
    ses masters et son artiste restent au catalogue ;
  - **master** : refusé tant qu'un projet l'utilise (même archivé) ; ses artistes
    crédités, sessions, pistes, crédits, splits, déclarations, fichiers et journal partent
    avec lui ;
  - **artiste** : refusé tant qu'un master le crédite, ou qu'un projet ou un contrat le
    nomme ; contacts, fichiers et journal partent avec lui ; une part de split ou un
    contact du Réseau lié garde son nom, sans lien ;
  - **contact du Réseau** : crédits et parts qui le nommaient gardent le nom sans lien
    (comme « Garder seulement le nom »), membres d'une structure deviennent
    indépendants ; refusé tant qu'un contrat, un Brief, une fiche juridique ou un envoi
    le nomme ;
  - **sélection** : ce qui peut partir part, chaque ligne gardée est signalée avec sa
    raison (toast) et reste cochée ; on supprime donc de haut en bas (projet → master →
    artiste) ;
  - toute référence inconnue de la fonction (nouvelle table) fait échouer la ligne sans
    rien en effacer (`foreign_key_violation` → « encore utilisé ») : **une nouvelle table
    qui pointe vers un projet doit être ajoutée à `delete_project_row`** ;
  - les objets Storage (fichiers, audio, photos) restent dans leurs buckets, inaccessibles :
    la politique de nettoyage Storage reste à décider (« À faire »).
- **Archivage : DG seul** (`archive_records`), **refusé si utilisé** : un artiste crédité sur un master
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

**Six onglets, un seul niveau** (04/10/2026) : Vue d'ensemble (+ Variantes `#variants`,
Activité `#activity`) · Audio (+ Sessions & pistes `#sessions`) · Crédits (+ Splits
`#splits-master`, pour `manage_catalog` seulement) · Droits · Projets & sorties (+
Distribution `#distribution`) · Fichiers. Les sections ci-dessous sont des blocs
(`PageSection`) de ces pages, plus des onglets : onze onglets débordaient de la barre, et
un second niveau (pastilles) aurait mélangé navigation et filtres. Les anciennes URL
(`/sessions`, `/variants`, `/splits`, `/distribution`, `/activity`) redirigent vers le
bloc ; `routes.masterSessions` & co. donnent directement l'onglet + l'ancre.

- **Vue d'ensemble** : tuiles cliquables (fichiers audio, variantes, sessions,
  contributeurs, projets), **dossier du titre** (ISRC, ISWC, titulaire ℗, contributeurs,
  splits à 100 %, déclarations déposées, fichier audio au stade Master final) calculé par le code (`masterChecklist`), faits,
  artistes interprètes.
- **Sessions & pistes** : `master_sessions` (enregistrement, production, mixage, mastering,
  autre ; date, lieu, ingénieur, notes) et `master_tracks` (piste du multipiste,
  interprète, session facultative **du même master**, vérifié par trigger ; supprimer une
  session garde ses pistes, sans session).
- **Audio** (`/audio`) : les fichiers audio successifs dans **un seul tableau**, l'état audio
  en colonne (pastille `AudioStateBadge`), le plus avancé en haut puis le plus récent
  (`byAudioProgress`) ; pas un bloc par état (un filtre en dur, surtout des blocs vides).
  Ajout par « Ajouter un fichier audio » ou dépôt sur le bloc : la modale de la
  bibliothèque (`AddFilesDialog` en mode `audio`) demande l'état, présélectionné sur celui du
  titre (§ 2 septies). Puis Sessions et Pistes.
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
  avec `manage_catalog` seulement** (comme les contrats) : le bloc est masqué aux autres,
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
  `mix` Mix (depuis le 05/10/2026 : une version du mix reçue de l'ingénieur, § 8 septies) →
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
- **Catalogue** (liste des titres, « Titres » jusqu'au 04/10/2026) : onglets par état audio dans l'URL (`?state=`) : **Hors maquettes (par
  défaut)**, Maquettes, Mises à plat, Mix, Masters, Masters finaux, Tous ; un titre « Non
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
  l'état toutes les 5 s si un traitement tourne ailleurs) → redirection vers la relecture
  de l'échange dans le Cadrage (`?step=review&call=…`, § 6).
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
- **Page commune** `CallWorkspace` (`components/calls/call-workspace.tsx`) : en-tête (retour,
  date, état, **« Rejoindre »** si un lien de visio est posé et que rien n'est enregistré,
  « Ajouter / Modifier le lien de visio » pour qui travaille sur le call), ordre du jour,
  enregistrement, traitement, puis **Décisions et actions** et le compte rendu. Utilisée par
  le call d'un projet et par la réunion interne.
- **Lien de visio** `calls.meeting_url` (https seulement, vérifié en SQL et en zod) : saisi à
  la création ou ensuite (`updateCallLink`), ouvert dans un nouvel onglet ; l'enregistrement
  reste celui de l'app (`…260929000301`).
- **Réunion interne** = call **sans projet** (`project_id` nul), créé depuis `/app/calls`
  (« Nouvelle réunion », `createMeeting`) par n'importe quel membre, avec des participants
  (`call_attendees`, membres actifs, **seulement sur une réunion**, chacun notifié
  `meeting_invited`). Vue par son créateur et ses participants (`can_see_call`), enregistrée
  et traitée par son créateur seul (`is_call_owner`), page `/app/calls/[callId]`. Pas de Brief
  à remplir (`fillBriefFromCall` renvoie faux, étape « Brief » absente du suivi) ; hors du
  journal d'activité d'un projet et de `search_calls` (jointure sur `projects`). La liste
  `/app/calls` est rangée dans le groupe `(list)` pour que son squelette n'enveloppe pas la
  page d'une réunion. Politique de lecture de `calls` écrite **sur les colonnes de la ligne**,
  pas via `can_see_call(id)` : une ligne en cours d'insertion n'est pas encore visible d'une
  fonction, et `insert … returning` vérifie cette politique (même piège sur `contracts`).
- **Décisions et actions** (`lib/calls/outcomes.ts`, `components/calls/call-outcomes.tsx`) :
  sous chaque call traité, les `report_items` `decided` (lus tels quels) et `next_action`,
  chacune avec la tâche qui en est née (`tasks.source_report_item_id`) ou le formulaire
  `ActionTaskForm` (responsable + échéance choisis par une personne, jamais par PO), partagé
  avec le Cadrage. Call de projet : son responsable crée la tâche dans le projet. Réunion
  interne : la tâche va dans un projet lancé **dont le lecteur est responsable**
  (`listOwnedProjects`) — la RLS de `tasks` ne laisse créer que le responsable.

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

## 6. Cadrage intelligent (étape 1)

`app/(app)/app/projects/[projectId]/framing`, `lib/framing/*`, `components/framing/intel/*`,
migration `…20261006000101_framing_intelligent.sql`, tests
`supabase/tests/framing-intelligent.test.sql`. D'après le ticket « Cadrage intelligent d'un
projet » du 30/09/2026. Décisions du 06/10/2026 (`docs/CONTEXTE-PROJET.md` § 2) : les besoins
restent dans 01 Objectif, la temporalité a de vraies dates confirmées, Stratégie / Master /
Juridique attendent le Plan du Projet, le bouton final s'appelle « Lancer le plan ».

**Six dimensions** (`lib/framing/dimensions.ts`, même liste en SQL dans
`framing_key_dimension`) : 01 Objectif (résultat, critère de réussite, priorité principale,
ce qu'il faut produire = besoins & activations), 02 Temporalité (date cible, échéances
imposées `framing_deadlines`, contraintes calendaires, prérequis), 03 Budget & contraintes
(enveloppe, engagements, contraintes financières / créatives / humaines / opérationnelles),
04 Équipe (intervenants = rôles + équipe créative, décideurs, ressources manquantes ; rôles
Mixage et Mastering tenus par un contact du Réseau sur un projet musical), 05 État de départ
(état réel, éléments existants, décisions prises, travail commencé), 06 Cadre juridique
(parties, accords, contrats et droits à prévoir, éléments sécurisés, blocages connus = lignes
`framing_constraints` de type `rights`). Chaque question a un genre (texte, date, montant,
liste), est obligatoire ou non, accepte ou non « Rien à signaler » (`{"none": true}`).

- **Analyse préalable** (`lib/framing/knowledge.ts` + `lib/framing/assess.ts`) : en un
  aller-retour, ce que le projet sait (fiche, équipe, titres et état audio, crédits, contrats,
  Budget, fichiers, décisions des calls, travail, Brief Mix/Master, Cadrage juridique). Le
  **code** classe chaque question connu / à confirmer / manquant : une réponse confirmée est
  connue ; une proposition (call, dictée, contexte initial) ou une valeur déjà enregistrée
  ailleurs (échéance et budget de la fiche, crédits, contrats…, `source_label`) est à
  confirmer ; sinon manquante. « Confirmer » relit la valeur côté serveur, jamais celle du
  client. « Écarter » / « Passer » écrit une ligne rejetée : la valeur n'est plus proposée.
- **Entrée** (`FramingEntry`, Vue d'ensemble et Cadrage) : « ✓ Prise en charge acceptée »,
  l'analyse par dimension, « Commencer le cadrage » (`startFramingWithPo` : ouvre le Cadrage
  sans call, démarre l'étape, PO lit **une fois** le contexte initial, marqueur
  `context_analysis`) et « Préparer un échange ». « Reprendre » n'apparaît qu'une fois
  l'étape démarrée et le contexte lu (`framingStarted`).
- **Parcours direct** (`?step=<dimension>&q=<question>`) : une question à la fois, la
  suivante calculée par le code (`nextAfter`), la question adaptée (« La date cible est-elle
  toujours le 20 novembre 2026 ? »), « M'aider à définir » (`lib/framing/help.ts` : jusqu'à
  trois formulations, chacune citée mot pour mot d'une source et vérifiée par le code, gardées
  dans `<clé>_suggestions`), « Écrire moi-même », « Déjà connu » sous la carte. Les listes
  reprennent les écrans d'avant (pastilles de besoins, lignes de contraintes, cartes de rôles)
  plus les échéances. `?step=brief` : ce qui reste avant le Brief, ou « Créer le Brief ».
- **Lecture par PO** (`lib/framing/analyse.ts`, schéma plat `lib/ai/schemas/framing-facts.ts`)
  : du contexte initial ou de la transcription d'un call, des propositions « à confirmer »
  pour les six dimensions. Citation introuvable = écartée ; valeur déjà confirmée ou proposée
  = jamais touchée ; dimension fermée = laissée ; mise en forme Markdown retirée. Dates et
  montants sont **cités** par le modèle et **lus** par le code (`lib/framing/said.ts` : date
  complète avec l'année, sinon une personne la choisit).
- **Parcours Call** : « Préparer un échange » (`FramingCallSheet`, panneau latéral) : but,
  sujets calculés par le code à partir de ce qui manque (`lib/framing/call-prep.ts`, une
  ligne par dimension ouverte, « Préparer en détail » ajoute les questions), sujets ajoutés,
  participants, documents du projet, date et lien ; « Lancer » = `create_framing_call` (un
  call normal + `framing_calls`). La page du call montre but, participants, documents et
  l'ordre du jour détaillé (`AgendaItem.questions`).
- **Exploitation d'un call** (`lib/framing/call-analysis.ts`, route `extract`) : après le
  compte rendu (qui reste dans Calls) et `fillBriefFromCall`, PO lit la transcription une fois
  par compte rendu ; ses faits deviennent des `report_items` de genre `brief_fact`
  (`brief_key`), localisés dans la transcription, et les propositions pointent vers eux. Le
  call terminé ouvre `?step=review&call=<id>` : par dimension, chaque donnée entendue
  « Confirmer » / « Modifier », chaque manque « Information manquante » / « Compléter ». Un
  échange du Master n'est jamais lu pour le Cadrage.
- **Brief versionné** (`framing_briefs`, `lib/framing/brief-snapshot.ts`) : « Créer le
  Brief » seulement quand toute question obligatoire est connue et que rien n'est à confirmer
  (`assessment.ready`) ; le serveur écrit l'instantané des six dimensions avec leurs sources
  (`create_framing_brief`, responsable seul), version suivante, la précédente non envoyée
  « remplacée ». Si le Cadrage a changé depuis, « Mettre à jour le Brief » avant l'envoi
  (`snapshotMatches`). Page `/framing/brief` : la version telle qu'envoyée, son état, les
  actions, l'historique (qui, quand, demande du valideur, dimensions rouvertes, changements
  ligne à ligne avec la version d'avant). Export PDF de la dernière version
  (`lib/framing/brief-pdf.ts`). L'instantané est écrit par le serveur avec la session du
  responsable : c'est ce que le valideur lit, donc ce qu'il valide.
- **Validation** : « Envoyer en validation » = `send_framing_brief` (passe par
  `request_validation` : notification, Mon Travail, Validations du projet ; une validation du
  Cadrage sans version en attente est refusée, `brief_required`). Le valideur (DG,
  `sole_validator`) : « Valider le Brief » ou « Demander une modification » avec un
  commentaire et **au moins une dimension** (`decide_framing_brief`). Le trigger
  `framing_brief_follow_validation` aligne l'état de la version sur la décision. Les
  notifications de validation du Cadrage ouvrent la page du Brief.
- **Correction** : `framing_dimension_editable` (SQL) n'ouvre que les dimensions rouvertes,
  pour toute la correction (reportées sur la version suivante) ; les politiques restrictives
  de `field_values` (Brief), `needs`, `project_team_members`, `framing_constraints` et
  `framing_deadlines` l'imposent. L'écran le dit (bandeau du valideur, « Dimension fermée »).
- **Validé** : « ✓ Brief validé ✓ Cadrage terminé » ; le Cadrage reste consultable, la Vue
  d'ensemble passe au Plan du Projet (`ProjectAttention`). Un Cadrage validé avant les
  versions se lit en direct.
- Sources : `field_values.source_label` (et sur les lignes) dit d'où vient une valeur reprise
  (« Fiche projet », « Contexte initial », « Crédits des titres »…) ; provenance `record` à
  côté de `call` et `voice`.
- Liens : le Brief Mix/Master part de l'ingénieur du mix et du mastering (rôles du Cadrage)
  et de la date du master final (échéance) avant son premier enregistrement
  (`lib/master-workflow/framing-defaults.ts`, les crédits des titres d'abord) ; l'État des
  lieux du Juridique liste les réponses confirmées de la dimension 06.

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
  Étapes branchées : Cadrage, Stratégie, Brief Mix/Master (`master_brief`, § 8 septies).
  `proposeFrom` (la moitié extraction de `dictate`) sert aussi à une transcription de call
  déjà faite (échanges du Master).
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
### Workflow Stratégie complet (ticket « Stratégie · Finalisation du workflow après cadrage », 09/10/2026)

Migration `…20261009000101_strategy_workflow`, tests `strategy-workflow.test.sql` (30) et
`strategy.test.sql` (mis à jour : on soumet une version du Brief de sortie). Le travail
avait été commencé dans un stash (`stash@{0}`, « !!GitHub_Desktop<pre-prod> ») puis repris :
sa migration, numérotée `20261006001001` comme `legal_forms_no_name_link`, est renumérotée.

- **Pages** (onglets `StrategyTabs` : Pilotage · Brief de sortie · Documents · Suivi, sous un
  layout qui garde Cadrage validé + Plan du Projet) : `/strategy` (entrée puis pilotage),
  `/strategy/brief`, `/strategy/documents` (+ `/documents/[kind]?v=`, et `/documents/version?v=`
  qui redirige, pour les notifications), `/strategy/release-plan?step=1..8`,
  `/strategy/press-kit?step=1..4`, `/strategy/follow-up`. PDF :
  `/api/projects/[id]/strategy-documents/[documentId]`. Lien public : `/d/[token]` (route
  qui rend le HTML, CSP sans script, `noindex`).
- **Entrée et pilotage** : « Commencer la stratégie » (`start_strategy`, `strategy_workspaces`)
  ou « Préparer un échange » (`strategy_calls`, `create_strategy_call` ; son compte rendu
  remplit la Stratégie, jamais le Cadrage : `fillStrategyFromCall`). Huit dimensions
  (`lib/strategy/dimensions.ts`), état À compléter / En cours / À arbitrer / Complété décidé
  par `lib/strategy/assess.ts` ; `?d=<dimension>` ouvre le panneau de travail.
- **Dimensions** : narratif en 4 parties + l'angle (`field_values`), leviers courants en un clic,
  livrables avec quantité, calendrier par canal (`milestones.channel`, `notes`) avec jalons
  modifiables, **échéances amont** calculées par le code (`lib/strategy/upstream.ts` :
  conception J-14, production J-7, validation J-2 avant publication, constantes à un seul
  endroit) **propagées au Planning** (`ProjectPlan.upstream`, type `upstream` de la frise,
  « En retard » si passée sans version approuvée en Conception). **Budget stratégie**
  (`strategy_budget_lines` : montant par levier, validé ou à arbitrer, totaux par
  `lib/strategy/budget.ts`, lu par qui voit le projet, jamais par PO, jamais dans un
  document externe ; « Pas de budget dédié » possible). **Objectifs & KPIs** (`strategy_kpis`,
  cible saisie, valeur réelle notée par le responsable ou lue en direct : fans Deezer).
- **Brief de sortie** : instantané écrit par le serveur (`buildStrategySnapshot`), versionné
  (`strategy_documents`, kind `brief`), « Générer » seulement quand aucune dimension n'est À
  compléter ni En cours ; met en évidence le « Reste à arbitrer ». **Validation à plusieurs**
  (`strategy_document_reviews`) : le DG toujours (seul valideur, `sole_validator`), plus les
  directeurs créatifs du projet que le responsable nomme ; Non commencé (avant envoi) / En
  attente / Validé, commentaires, « Relancer » (12 h minimum, notification), historique. Le
  Brief passe par la validation de l'étape (Mon Travail, notifications) mais elle ne se
  décide que via `decide_strategy_document` (garde `use_strategy_brief`). Validé par tous :
  étape validée, **V1 figée**. « Réviser la stratégie » (`open_strategy_revision`) rouvre
  l'écriture sans toucher l'étape ni V1 ; la V2 suit le même circuit.
- **Documents externes** (`lib/strategy/documents/`) : un modèle de pages et de blocs
  (`model.ts`), construit par le code depuis le Brief **validé** et les choix du générateur
  (`build.ts`, jamais la section budget), rendu par **un seul** HTML (`render.ts`) pour
  l'aperçu (iframe sans script), le lien public et le PDF (`htmlToPdf(..., { fullBleed })`).
  Choix gardés entre deux visites dans `strategy_document_drafts` (`saveDocumentDraft`,
  responsable seul). **Plan de sortie** : entrée (déjà connu / à compléter), phases proposées
  depuis le calendrier (`phases.ts` : Teasing avant J0, Sortie, Amplification après ; leur
  nombre et leurs noms restent ceux du responsable), contenus repris des livrables, univers
  visuel (images du projet, des titres, de l'artiste, dépôt dans les fichiers du projet),
  direction (proposée **par le code** dans le navigateur à partir des images : clarté,
  saturation, palette ; trois thèmes fermés et une couleur d'accent, aucun modèle d'IA),
  récapitulatif des pages (modifier, masquer, réordonner), génération, aperçu. **Dossier de
  presse** : textes pré-remplis par le code (bio de l'artiste, actualité, histoire du morceau,
  contact du responsable), visuels et direction (repris du Plan s'il existe), pages, aperçu ;
  liens d'écoute = smartlink et liens détectés (onglet Sortie). Les visuels autorisés sont
  **copiés à la génération** dans le bucket public `document-visuals`
  (`<org>/<projet>/<uuid>.<ext>`, écriture par le responsable seul) : le lien public et le
  PDF n'ont pas de session. Partage : `share_strategy_document` (Plan et Dossier seulement,
  jamais le Brief interne), lu sans compte par `get_shared_strategy_document`.
- **Suivi** (`lib/strategy/follow-up.ts`, pur ; `follow-up-data.ts`) : avant la sortie, Prêt /
  En cours / En attente / Bloqué pour les contenus (versions de la Conception, échéances),
  les leviers retenus, la coordination (tâches) et les validations ; après, KPIs contre leur
  cible et une recommandation **seulement** sur une valeur réelle sous la cible (Appliquer :
  une tâche pour le responsable à J+7 ; Ignorer ; Parler à PO, `AskPoButton`), recalculée
  par le serveur, `strategy_recommendations` pour ne plus la reproposer.
- **Notifications** : `strategy_review_requested`, `_approved`, `_changes_requested`,
  `_reminder` (trigger sur `strategy_document_reviews`) ; une validation d'étape Stratégie
  ouvre le Brief de sortie. Mon Travail liste aussi les relectures de documents à faire
  (`TodoValidation.source = "document"`, visibles sans la permission `validate`).
- **RLS** : documents et relectures lus via `is_strategy_reviewer` /
  `strategy_document_visible` (security definer : les deux politiques se lisaient l'une
  l'autre, récursion infinie trouvée par le test).
- **Décisions prises sans le ticket** : « Modifier avec PO » renvoie au pilotage sur la première
  dimension à régler (où PO dicte et propose) ; « Non commencé » = personne nommée avant
  l'envoi ; la direction du document est calculée par le code (le ticket laisse la
  technologie ouverte) ; pas de KPI alimenté automatiquement hors fans Deezer (Spotify n'a
  plus d'API, `docs/CONTEXTE-PROJET.md` § 6).

---

## 6 ter. Plan du Projet

Vue d'ensemble `app/(app)/app/projects/[projectId]/page.tsx`, `lib/plan/*`, `components/plan/*`, migration
`…20261006000201_project_plan.sql` (tests dans `framing-intelligent.test.sql`).

- **Proposition calculée par le code** (`proposePlan`), à chaque visite tant que le plan
  n'est pas lancé : Stratégie en Focus ; Master (titres sans master final) en Focus si la date
  cible confirmée est à 42 jours ou moins, sinon Pendant ce temps ; Juridique (projet musical,
  besoins ou blocages juridiques) en Focus s'il y a un blocage connu, sinon Pendant ce temps ;
  Conception et Livraison & sortie en Ensuite avec leurs dépendances ; À anticiper : échéances
  datées, rôles à trouver, enveloppe absente ou dépassée, contrats à prévoir, points ouverts.
  Cadrage spécialisé nommé : Brief Mix/Master, Cadrage juridique.
- **Modifier le plan** : changer de colonne, de responsable (membre approuvé), retirer ou
  remettre. **Lancer le plan** : le navigateur n'envoie que ces choix par clé, le serveur
  repropose et `launch_project_plan` enregistre une fois (`project_plans`,
  `project_plan_items`). Les workflows en Focus ou Pendant ce temps démarrent (la Stratégie
  passe en cours) ; ceux d'Ensuite attendent « Lancer maintenant » (`launch_plan_workflow`).
- **Workflow hors du plan** (audit du 07/10) : Stratégie, Master ou Juridique retirés avant le
  lancement, ou jamais proposés, sont listés sous le plan lancé (« Hors du plan ») ;
  « Ajouter et lancer » les ajoute en Focus (titre et raison écrits par le serveur,
  responsable = qui lance) et les démarre. Leur page verrouillée le dit (`absent` de
  `workflowGate`). Une Stratégie retirée ne bloque donc plus Conception et Sortie.
- **Verrou** : `workflow_is_launched` (lancé par le plan, ou déjà commencé avant : Brief
  Mix/Master ou source, Cadrage juridique, Stratégie entamée). `start_stage` refuse la
  Stratégie sans plan (`plan_required`). Master et Juridique : layouts `master/` et `legal/`
  qui affichent `WorkflowLocked` au lieu de la page (verrou de parcours, pas de sécurité : la
  RLS de leurs tables n'a pas changé). Fil des étapes : Stratégie grisée jusqu'au plan.
- Mon Travail : un projet au Cadrage validé et sans plan a pour prochaine action
  « Construire et lancer le plan du projet ».
- **Le plan est sur la Vue d'ensemble** (07/10/2026) : dès le Brief validé, la Vue
  d'ensemble montre le plan lui-même (`ProjectPlanSection` : `PlanBoard` tant qu'il est
  proposé) à la place de la liste des étapes ; **une fois lancé, la nouvelle Vue d'ensemble**
  (`ProjectBoard`, § 8 ter, lot 4 de l'architecture globale) prend sa place. **Il n'y a
  plus de page `/plan`** (supprimée le 08/10/2026) ni de section « Plan du projet » dans
  `project-sections.ts` : `routes.projectPlan` = la Vue d'ensemble, ancre `#plan` (liens du
  Brief, du Travail et du workflow verrouillé). Un ancien lien vers `/plan` répond 404.
- **Le Juridique sur la Vue d'ensemble** : `LegalOverview` a été supprimé le 08/10/2026 (lot 4
  de l'architecture globale) ; le Juridique y est sa carte de workflow, ses actions (décisions
  et actions libres du Suivi, `summarizeTracking` et `trackPlan` inchangés) dans « À faire
  ensuite » et ses emprunts non sécurisés dans « Blocages ». **Bloque la sortie = seulement
  un accord non sécurisé**, la seule règle donnée par le ticket Juridique 08 (fixture : « Humanisme
  sans autorisation est OPEN et bloquant ») ; le reste de sa ReadinessPolicy est un point à
  trancher (`docs/CONTEXTE-PROJET.md` § 2). Lecture seule : la génération automatique des
  contrats reste faite par les pages Contrats et Suivi.

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

**Architecture globale (ticket du 08/10/2026, lot 1 : navigation).** La sidebar sépare le
niveau Projet du niveau Workflow (`lib/ui/project-sections.ts`) : Vue d'ensemble et
Cadrage en tête, au-dessus de tout ; puis le groupe **Workflows** — Master, Juridique,
**Marketing** (section qui couvre `/strategy`, `/design` et `/activations` ; Activations
quitte le groupe Production) et **Distribution** (`/release`, la Sortie) ; puis Pilotage et
Production. Les 7 chevrons du parcours (`WorkflowBreadcrumb`, `lib/ui/workflow-steps.ts`)
sont supprimés ; les `project_stages` restent la source d'état, inchangés en base. Le
Marketing a ses chevrons (`lib/ui/marketing-steps.ts`, `SectionSteps` avec `within` = ses
pages) : Stratégie (verrouillée tant que le Plan du Projet ne l'a pas lancée, comme avant),
Conception, Production et Suivi & bilan (sans page : grisés), Activations ; coche = stage
validé (`launch_strategy`, `design`, `production`, `review`). **Défense** n'a plus de place à
l'écran tant que le DG ne l'a pas rattachée. Sans `manage_legal`, le Juridique est listé
`restricted` (grisé, cadenas, raison), jamais un lien ; sa page répond toujours 404 (pas
de fuite par lien profond). Fil d'Ariane ajouté au lot 6.

**Lot 2** : Master en 4 chevrons (§ 8 septies) ; **Distribution** = la page Sortie en deux
étapes sans nouvelle capacité, **Préparation** (`/release`, identifiants et date) puis **En
ligne** (`/release/online`, détection et smartlink, qui dit attendre la Préparation tant
qu'aucune sortie n'est enregistrée ; actions revalidées en `layout` pour les deux pages) ;
**Juridique** : le chevron du plan devient « Suivi » une fois lancé, et « Étape du dossier »
donne l'une des cinq étapes du DG (`legalPhase`, depuis `loadLegalStepsDone`).

**Lot 3 : statuts communs** (`lib/workflow-status/`). `rules.ts` (pur, testé) traduit les
états de chaque workflow en **Non démarré / En cours / En attente / Bloqué / Terminé**, avec
l'étape (chevron) d'où vient le statut, sa raison en mots (« V3 à valider par Akili
Mensah ») et l'avancement en unités du métier (titres, actions, étapes) ; `load.ts`
(`loadWorkflowStates`, `cache` React : le layout et la Vue d'ensemble partagent une lecture
par requête) lit les sources existantes avec la session : Master = `loadStepView` (mix),
`loadMixVersions` (mix, mastering), envois de mastering, `loadFinalView` ; Juridique =
`loadIntake`, `legal_intakes`, `loadTracking` + `summarizeTracking`, seulement avec
`manage_legal` (sinon `restricted`, rien n'est lu) ; Marketing = les `project_stages`
`launch_strategy`, `design`, `production`, `review` (Défense ignorée) ; Distribution = la
ligne `releases`. Non démarré = workflow pas lancé depuis le Plan du projet
(`workflow_is_launched`) ou rien d'enregistré. Rien n'est stocké. **Workflows d'un projet**
(`applicableWorkflows`, ticket § 13) : le Master s'il a des titres, la Distribution pour un
projet Musical, Juridique et Marketing toujours ; la sidebar et les onglets n'affichent que
ceux-là. Le layout en tire le **point de statut** de chaque workflow dans la sidebar
(`StatusDot`, `workflowStatusTone`, sans violet) et les **coches** des chevrons du Master,
de la Distribution et du Juridique. **Bloqué** n'est produit par aucune règle tant que les
dépendances entre workflows n'existent pas (lot 5).

**Lot 4 : Vue d'ensemble** (`components/overview/`, `ProjectBoard`), montrée une fois le plan
du projet lancé (avant : `ProjectPlanSection`). Sous l'en-tête, le bandeau **Cadrage** (date
de validation, lien), puis **une carte par workflow** (`WorkflowCards`) : statut commun,
barre fine des chevrons (fait en encre, en cours en gris), étape et « étape n sur N » (le
Juridique : l'étape du dossier), raison, avancement ; le nom est un lien étiré vers l'étape
en cours ; un workflow non lancé offre « Lancer » au responsable (`launch_plan_workflow`,
même action que l'ancien plan lancé) ; sans `manage_legal`, la carte Juridique dit
seulement « Accès restreint » (rien n'est lu). Un workflow absent du projet est nommé sous
les cartes. Puis, calculés par `lib/workflow-status/board.ts` (pur, testé) : **À faire
ensuite** (la prochaine étape de chaque workflow en cours, avec la date du Brief pour le
Master et la sortie pour la Distribution ; pour le Juridique lancé, ses décisions et
actions libres du Suivi ; retards d'abord puis par date), **Blocages** (workflow au statut
Bloqué, emprunts non sécurisés ; un clic ouvre un panneau `Sheet` : cause, impact, source,
« Ouvrir dans … »), **Échéances** (échéance du projet, calendrier du Brief tant que son
étape n'est pas passée — Mix V1 tant qu'on est en Préparation —, actions datées du Suivi,
sortie prévue ; les retards gardés, triés par date, six au plus). `LaunchedPlan` n'est plus
affiché ; `LegalOverview` et `loadLegalOverview` sont supprimés.

**Lot 5 : dépendances entre workflows** (`dependencies` et `withDependencies` dans
`rules.ts`, calculées dans `loadWorkflowStates`, jamais saisies ni stockées). Seules celles
que les données existantes savent dire, chacune avec les champs du ticket § 10 (source,
attendu, consommateur, état Disponible / En cours / En attente / Bloqué, échéance,
responsable, lien vers la source) : **Master final de chaque titre → Distribution** (mise en
ligne ; état du Master, date du Master final du Brief), **emprunts sécurisés → Distribution**
(mise en ligne ; emprunts du Suivi lancé, lus seulement avec `manage_legal`),
**ingénieurs du Brief → Juridique** (contrats de prestation). Une dépendance ne bloque que
l'action qui l'exige (§ 3) : la Distribution prête (étape En ligne, en attente) passe
**Bloqué** tant qu'une dépendance vers elle manque, sa Préparation jamais ; aucun autre
workflow n'est gelé. Sur la Vue d'ensemble : tableau **Dépendances entre workflows**
(`DependenciesTable`, `DataTable`, la ligne ouvre la source, `dependencyTone`) ; chaque
dépendance manquante d'un workflow bloqué devient un **blocage** dont la source est le
workflow qui doit fournir (les emprunts gardent une ligne par emprunt), et un workflow
bloqué quitte « À faire ensuite ». Pas de dépendance inventée sans donnée (pochette,
date de sortie de la Stratégie, NDA : à décider).

**Lot 6 : alignement sur les maquettes du ticket (09/10/2026)** (Vue d'ensemble, Master,
Conception, Juridique ; leurs valeurs sont illustratives, rien n'en est recopié).
- **Fil d'Ariane** (`ProjectBreadcrumb`) en tête de toute page de projet : « ← Projets ›
  Artiste › Projet › Section › Étape » (« Vue d'ensemble » sur l'accueil du projet, rien
  après le projet avant son lancement). Chaque niveau sauf la page ouverte est un lien ; la
  flèche remonte d'un niveau (jamais vers l'artiste, chemin de côté). Section par
  `projectSections` (le Juridique restreint n'y est jamais nommé), étape par les mêmes
  listes que les chevrons, calculées une fois par le layout. Artiste : premier crédit du
  premier titre, sinon l'artiste du projet de contenu (`ProjectDetail.mainArtistId`).
  La décision « pas de fil d'Ariane » du lot 1 est levée par le ticket (§ 6).
- **En-tête du projet** (`ProjectHeader`) : pochette = dernière image « artwork » déposée
  sur ses titres (`master_files`, URL signée 1 h, session de l'utilisateur,
  `lib/projects/cover.ts`), sinon un disque ; type en surtitre, titre, artiste et « Sortie
  le … » (date prévue de la ligne `releases`, rien sinon) ; **statut du projet** calculé par
  `projectStatus` (`rules.ts`) depuis ses workflows lisibles : Terminé si tous le sont,
  Non démarré si aucun n'a commencé, En cours sinon ; avant le lancement, le statut de
  transmission. Ni genre, ni humeur, ni label, ni « Voir le projet » : aucune donnée ne les
  porte.
- **Chevrons** pleine largeur, étapes de même largeur (`ProcessSteps`). Étape verrouillée
  focalisable, sa raison dans une bulle `Tooltip` et lue après le libellé.
- **Juridique en cinq chevrons** (critère du ticket et maquette 04) : État des lieux ›
  Cadrage juridique › Confirmation › Plan d'action › Suivi, sur les deux pages existantes
  (aucune page ni URL nouvelle) : les trois premiers ouvrent l'État des lieux (Cadrage à
  `#legal-questions`, Confirmation à `#legal-dossier`, `LEGAL_ANCHORS`), les deux derniers
  la page du plan. En noir : l'étape du dossier quand la page la porte (`legalCurrentStep`).
  Verrous : Confirmation tant qu'une question reste sans réponse, Plan d'action tant que le
  dossier n'est pas confirmé, Suivi tant que le plan n'est pas lancé. Coches et étape
  courante calculées par `legalState` (`done` : État des lieux et Cadrage une fois toutes
  les réponses données, Confirmation, Plan lancé, Suivi quand toutes ses actions sont
  closes) ; la ligne « Étape du dossier » disparaît.
- **Vue d'ensemble** : cartes des workflows avec un anneau (`ProgressRing`, part des étapes
  vraiment faites), statut, « n / N étapes », étape en cours et raison ; **À faire ensuite**
  en tableau (`NextActionsTable`, onglets par workflow filtrés sur place, la ligne ouvre
  l'action) ; puis Blocages et **Prochaine échéance** (la plus proche en grand, les autres
  et les retards dessous, « Voir le planning ») ; puis les dépendances. Avant le plan, plus
  de liste numérotée des 7 étapes ni d'« Étape en cours » (`ProjectStages` supprimé) : sous
  le Cadrage, les cartes des workflows, sans « Lancer ».
- **Sidebar** : le dernier groupe (Calls, Livrables, Fichiers, Validations, Activité) n'a
  plus de titre (« Production » est une étape du Marketing). Le Marketing reste une entrée
  sans sous-menu : ses chevrons suffisent (§ 5, pas de second système).
- **Aucun violet** (§ 12) : ton `action` en encre sur gris, teinte de catégorie `violet`
  renommée `ink` (type Musical, titres du Juridique).
- **Juridique fermé au lecteur** (§ 9) : le tableau des dépendances ajoute une ligne
  « Ce que le Juridique fournit aux autres workflows · Accès restreint », sans détail ni
  lien ; la dépendance « ingénieurs du Brief → Juridique », lue dans le Master seul, reste
  visible. **Limite connue** : l’état d’un emprunt se calcule dans le code depuis les
  sources du Juridique (`trackPlan`), que la RLS réserve à `manage_legal` ; la Distribution
  ne passe donc en Bloqué pour un emprunt que chez qui lit le Juridique (le recopier en SQL
  dupliquerait une logique fragile ; le service role est exclu).
- **Lecture seule** (§ 9) : les contrôles d’écriture restent absents pour qui n’écrit pas
  (modèle existant, 62 composants), et le bandeau en tête de chaque page nomme le chef de
  projet qui écrit (`ReadOnlyNotice`). Passer à des contrôles grisés un par un reste à
  décider : refonte large, à juger à l’écran.

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
  frise par mois (temps forts, calls du projet à leur jour de Paris avec l'heure, échéances,
  tâches, sortie prévue, échéance du projet), J-x depuis la même date de référence que la
  Stratégie. Modification : dans la Stratégie (un call : sur sa page).
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

## 8 quinquies. Réseau, contrats, versions de fichiers, bibliothèque globale

Ajouts du MVP du 15 octobre (`…260929000101` à `…000301`, tests
`supabase/tests/network-contracts-meetings.test.sql`).

- **Permissions** : `manage_network` (tous les postes) et `manage_contracts` (DG et chefs de
  projet), dans `role_permissions` comme les autres.
- **Réseau** `/app/network` (`network_contacts`, `lib/network/`, `components/network/`) :
  une personne ou une structure, **au moins un rôle** parmi une liste fermée (artiste,
  beatmaker, musicien·ne, ingé son, prestataire, partenaire, label, éditeur…), coordonnées,
  notes ; « Éditeur » (`publisher`, `…20261007000501_network_publisher_role.sql`) ajouté le
  07/10/2026 pour les emprunts : l'œuvre d'un sample s'autorise auprès de son éditeur, le son
  auprès de son label, deux structures ajoutées une fois au Réseau et choisies ensuite ;
  une personne peut appartenir à une structure du réseau (`parent_id`, vérifié par trigger),
  un contact peut renvoyer à un artiste du catalogue (`artist_id`). **Lu par tous les
  membres actifs** (c'est l'annuaire partagé), écrit par `manage_network`, **archivé, jamais
  supprimé**, par le DG (`set_network_contact_archived`, refusé tant qu'un contrat non résilié
  le nomme). Onglets par famille de rôles (un contact apparaît dans chacune des siennes),
  recherche instantanée, Archivés pour le DG. Les contacts d'artiste (`artist_contacts`) et
  les intervenants cités restent à part : pas de fusion automatique en V1.
- **Contrats** `/app/contracts` (`contracts`, `contract_parties`, `contract_files`,
  `lib/contracts/`, `components/contracts/`) : titre, type (liste fermée), responsable
  (membre `manage_contracts` ; le DG choisit via `list_contract_owners`, les autres suivent
  les leurs), projet et artiste facultatifs, échéance, début/fin, notes ; **parties** =
  contacts du Réseau avec leur rôle. **Lus** par leur responsable, la direction
  (`view_all_projects`) et le responsable du projet lié (`can_see_contract`) ; écrits par le
  responsable ou la direction, **figés en RLS** pendant la relecture et une fois résiliés
  (`can_edit_contract`). Statut déplacé par `advance_contract` seulement : `draft` →
  soumettre → `in_review` → le DG (`validate`) valide (`approved`) ou demande des
  modifications (commentaire obligatoire, retour en `draft`) → envoyer (`sent`) → signature
  avec sa date (jamais future, `signed_on`) → résilier (`terminated`). Notifications
  `contract_review_requested` (à chaque détenteur de `validate`), `contract_approved`,
  `contract_changes_requested`. **« Expiré » est calculé par le code** (signé et date de fin
  passée, `contractStateOf`), jamais stocké ; une échéance passée sur un contrat non signé est
  signalée (`isContractDue`).
- **Versions de fichiers** (les quatre bibliothèques : artiste, titre, projet, contrat) :
  chaque version est sa ligne et son objet, groupées par `series_id`, numérotées par la base
  (`version`, trigger `file_versions_link`, qui refuse une version d'un autre propriétaire).
  « ⋯ » → « Nouvelle version » (même catégorie et précision) et « Versions (n) » (historique,
  chacune ouvrable et téléchargeable) ; la liste montre la dernière, « v2 » dans le sous-titre.
  Reclasser (catégorie, précision) s'applique à toute la série, renommer à la version ;
  supprimer la dernière rend la précédente actuelle. Les versions audio d'un titre
  (`audio_state`) gardent leur propre logique et ne passent pas par là.
- **Bibliothèque globale** `/app/files` (`lib/library/queries.ts`) : vue SQL `library_files`
  (**security invoker** : la RLS de chaque table s'applique, contrats compris), dernière version
  de chaque fichier lisible, avec ce à quoi il est rattaché (lien vers sa bibliothèque, où il
  se modifie et se versionne). Onglets par rattachement, recherche instantanée, 500 fichiers
  les plus récents au plus (le reste est dit).

## 8 sexies. Juridique (`/legal`, `lib/legal/`, `components/legal/`)

Workflow spécialisé du projet, mené en parallèle des 7 étapes (`docs/CONTEXTE-PROJET.md` § 2).
Parcours interne : État des lieux → Cadrage juridique → Confirmation → Plan d'action → Suivi
(`lib/ui/legal-steps.ts`). Les tickets Juridique 01 à 08 du 30/09 sont livrés par lots.

- **Intervenants non crédités** (08/10/2026, lot 6 de l'architecture globale ;
  `legal_project_contacts`, migration `20261008000101`, 11 tests pgTAP) : un avocat, un
  distributeur, un photographe, un réalisateur… ajouté au dossier depuis le Réseau (jamais un
  nom libre : `PersonPickerField allowNameOnly={false}`), avec un rôle de fiche (liste fermée de
  `FORM_ROLES`, pré-rempli depuis ses rôles du Réseau, `suggestedFormRole`). Écrit par
  `add_legal_project_contact` / `remove_legal_project_contact` (`manage_legal` +
  `can_see_project`) ; une personne créditée sur un titre est refusée (connue par son crédit),
  le retrait est refusé tant qu'un contrat est prévu pour elle dans la cartographie ; lu en
  RLS par `manage_legal` seul ; le projet supprimé l'emporte (cascade). `readInventoryRows`
  le lit, **`formPeople` l'ajoute après les crédités** (clé `contact:<id>`) : il reçoit donc
  sa fiche de renseignements et sa ligne dans la cartographie des contrats (modèles
  compatibles par rôle), sans autre changement. Section « Intervenants non crédités » en bas
  de l'État des lieux (`ProjectContactsSection`). **Pas encore** dans le plan d'action proposé
  ni le Suivi (leurs actions et la coche automatique lisent les crédits, en SQL) ; **un seul
  contrat par personne et par projet** reste la règle (`legal_agreement_needs`) : plusieurs
  (NDA en plus d'une prestation) attendent la décision sur le NDA.

- **Simplification du 07/10/2026** (Sacha : « la partie juridique est très compliquée »,
  audit et prototype validés le même jour). Les objets, leurs règles et leurs preuves ne
  bougent pas (les tickets interdisent de les confondre : 04, 05, 06) ; ce sont les **lieux**
  qui se regroupent (ticket 07 : « Le Plan d'action et le Suivi sont deux vues du même
  graphe ») :
  - **Deux étapes à l'écran** (`LEGAL_TABS`, `LegalSteps`) : **État des lieux** (`/legal`), qui
    porte aussi la question de PO en cours (`IntakeWorkspace embedded`), les réponses et le
    dossier à confirmer (`ConfirmationPanel`), puis **Plan d'action** (`/legal/plan`), grisé
    tant que le dossier n'est pas confirmé, qui devient le Suivi une fois lancé. Les anciennes
    adresses `/framing`, `/confirmation` (avec `?question=`) et `/tracking` redirigent. Plus de
    pastilles de dossiers sous les étapes (une pastille veut dire filtre, `DESIGN.md` § 4) :
    chaque action du plan ouvre sa branche, qui garde un lien « ← Plan d'action ».
  - **Le plan lancé, comme le prototype** (08/10/2026, `TrackingView`, `lib/legal/plan/board.ts`) :
    une carte par démarche dans l'ordre où elles se débloquent, **une ligne par personne
    (fiches), par personne (contrats), par titre (répartitions, SACEM) ou par emprunt**, avec
    son état en badge et le verbe de ce qu'il y a à faire ; **toute la ligne ouvre un panneau
    où la démarche se fait** (`PlanRowSheet`) : `FichePanel` (préparer, lien affiché une fois,
    marquer envoyée, nouveau lien, révoquer, corrections à accepter, réponses), `ContractPanel`
    (générer, soumettre, valider ou demander des modifications pour la direction, envoyer avec
    sa façon, signé et preuve déposés, marquer signé ; valeurs et leurs sources), `SplitPanel`
    (éditeur en ligne, envoi pour confirmation, réponses et nouveaux liens, contestation),
    l'emprunt (`ClearanceBody`), la SACEM (`FormalityCard`), la cartographie des contrats
    (`MappingPanel`, une ligne « Cartographie des contrats » tant qu'elle n'est pas validée) ;
    en pied de panneau, le responsable (« Modifier » = délégation) et « Ouvrir la page ». Les
    tuiles comptent les lignes ; « Prêt pour la sortie » : barre des emprunts sécurisés et ceux
    qui bloquent. Le plan lit pour cela les données de chaque branche (`loadForms`,
    `loadAgreementsGenerated`, `loadSplits`, `loadClearances`, `loadFormalities`,
    `contractProofOf`).
  - **Avant le 08/10** (`TrackingView`) : une section par démarche dans l'ordre où elles se
    débloquent (fiches et emprunts en parallèle, puis contrats, répartitions, SACEM ;
    `groups.ts`), avec son avancement et « Après : … » ; les tuiles des quatre groupes
    d'attention filtrent (`?view=`), par défaut « Ce qui attend une action » (à traiter et
    décisions), « Tout le plan » replie en une ligne ce qui attend un retour, une autre action,
    ou est fait. À côté, « Prêt pour la sortie » (`ReleaseReadiness`) : seuls les emprunts non
    sécurisés bloquent (ticket 08), le reste de la politique est dit « à décider ».
  - **« Accords » devient « Emprunts »** à l'écran : le mot désignait aussi les contrats
    (ticket 01). Le code garde `clearance`.
  - **Un emprunt en trois temps** (`ClearanceStages`, le parcours du prototype « Juridique
    PDS OS v3 », repris à l'identique le 07/10 à la demande de Sacha ; chaque bouton = une
    action de `lib/legal/clearance/flow-actions.ts` qui enchaîne les états par les mêmes
    fonctions SQL) :
    - **Demander** (`AskMoment`) : ce qui est repris en pastilles (proposé par le code selon
      l'élément : un sample = l'œuvre et l'enregistrement, une topline, une interpolation ou une
      reprise = l'œuvre ; à corriger, rien d'appliqué avant le clic), un ayant droit par droit
      choisi dans le Réseau (`PersonPickerField`, rôle repris du Réseau, sinon éditeur pour
      l'œuvre, label pour l'enregistrement ; libellés « Qui détient l'œuvre « X » ? » et « Qui
      détient l'enregistrement original de « X » ? » avec où trouver : répertoire SACEM, mention
      ℗ ; « Ajouter au Réseau » crée une structure Éditeur ou Label sans quitter le panneau),
      « Copier un modèle de demande », puis « J'ai envoyé la demande » (`requestClearance` :
      qualification avec l'usage écrit par le code depuis le dossier, ayants droit, identifiés,
      envoi consigné, contactés). « Rien à sécuriser » demande sa raison et clôt.
    - **Négocier** (`NegotiateMoment`) : leur réponse collée, lue par PO
      (`readClearanceMessage`), les conditions affichées dans des champs à corriger, « Envoyer à
      la direction » (`submitClearanceReply` : réponse au journal, conditions proposées, en
      négociation) ou « Enregistrer le refus ». La direction voit « Valider les conditions » ou
      « Demander une contre-proposition » ; le responsable voit « Chez la direction ».
      **Notifications** (`…20261007000601_clearance_terms_notifications.sql`, trigger sur
      `legal_clearance_terms`) : des conditions proposées notifient chaque membre qui valide
      (`clearance_terms_proposed`) ; leur validation ou leur refus notifie le responsable de
      l'emprunt, sinon du projet (`clearance_terms_validated` / `_rejected`) ; le lien ouvre
      la page Emprunts avec le panneau ouvert (`?emprunt=`). Dans le plan, un emprunt dont
      les conditions attendent passe en « Décision requise » (`termsPending`).
    - **Décision du 07/10/2026** : valider les conditions vaut accord sur l'emprunt. Le même
      clic de la direction (`validateClearanceTerms`) prépare le contrat d'autorisation (un
      contrat pour l'emprunt, type licence, suivi par le responsable de l'emprunt sinon du
      projet, ayants droit en parties, rattaché à chaque droit concerné), le soumet et
      l'approuve : une validation au lieu de deux. À revoir si le DG veut relire le document
      lui-même avant l'envoi.
    - **Signer** (`SignMoment`) : « Envoyé par e-mail / par un outil de signature / remis en
      main propre » (`sendClearanceContract`, la façon est la preuve d'envoi), puis le signé et
      sa preuve **déposés dans le panneau** (`ContractProofSlot`, rangés dans le contrat), puis
      « Marquer comme sécurisé » (`secureClearanceFlow` : contrat signé ce jour, emprunt signé
      puis sécurisé, jamais en arrière ; manques dits en rouge avant). Un emprunt arrivé là sans
      contrat (avant le 07/10) garde le rattachement d'avant (`DocumentsTab`).
    Le journal (échanges, historique) est replié sous les trois temps ; la seule autre issue
    est « Retirer l'élément du titre » (abandon avec sa raison). Le panneau s'ouvre aussi depuis
    la ligne du plan et depuis « Prêt pour la sortie ».

- **Permission `manage_legal`** (`…20261004000101_legal_permission.sql`) : DG et chefs de
  projet. Décision par défaut prise le 04/10/2026, en attendant la réponse du DG sur
  « qui pilote le Juridique ». Un poste RAF / juriste pourra la recevoir dans
  `role_permissions`. Pour l'instant, elle décide seulement **qui voit la section** : lien
  absent de la sidebar, des onglets et de la vue d'ensemble (`projectSections(id,
  { legal })`), et la page répond 404 sans elle. Les futures tables juridiques la
  vérifieront dans leur RLS.
- **Lot 1 : État des lieux** (`/legal`, lecture seule). `loadLegalInventory` lit en une
  fois, en parallèle et avec la session de l'utilisateur (`lib/legal/inventory-rows.ts`,
  une requête par table, pas de N+1), ce que le projet sait déjà :
  - les titres du projet (ISRC, ISWC, ayant droit ℗) ;
  - leurs contributeurs (`master_contributors`) ;
  - les splits, seulement avec `manage_catalog` ;
  - les déclarations ;
  - les contrats rattachés au projet ;
  - les contraintes de type `rights` du Cadrage.

  Le code classe chaque fait en **connu / à confirmer / manquant**, les trois niveaux du
  Cadrage (`lib/legal/title-facts.ts`, `project-facts.ts`) :
  - un contributeur est connu si un contact du Réseau porte le même nom (comparaison sans
    accents ni casse, `normalizeSearch`) ;
  - un split est connu à 100 %, à confirmer en dessous, manquant à 0 ;
  - un contrat est connu une fois signé, à confirmer avant, manquant s'il est expiré ou
    résilié ; s'il n'y en a aucun, une seule ligne « manquant » ;
  - seules les déclarations **déposées** sont listées, ou une ligne « Aucune déclaration »
    par titre. Lister les cinq organismes comme manquants poserait une règle que personne
    n'a fixée : ADAMI n'est pas une formalité avant la sortie, SCPP et SPPF sont des
    alternatives ;
  - une contrainte de droits du Cadrage reste à confirmer.

  Chaque ligne mène à la page où le fait se complète (fiche du titre, Réseau, contrat,
  Cadrage). Rien ne s'écrit sur la page elle-même. Seule exception, un crédit absent du
  Réseau : pour un membre `manage_network`, « Ajouter au Réseau » remplace sa pastille. Le
  bouton ouvre le formulaire de contact habituel, pré-rempli avec le nom et un rôle déduit
  du crédit (compositeur ou auteur → songwriter, ingénieurs → engineer…, modifiable).
  L'enregistrement passe par `saveNetworkContact` (`stay` : pas de redirection), puis la page
  se rafraîchit et la ligne devient « Dans le Réseau ». « Ajouter un contributeur », en
  tête de Personnes (avec `manage_catalog`), ouvre le formulaire de la fiche du titre
  (`ContributorForm`, `saveContributor`). Si le projet a plusieurs titres, on choisit
  d'abord lequel.
- **Tout compléter depuis la page** (retour de Sacha, 04/10/2026), avec les formulaires
  des fiches d'origine, sans logique dupliquée (`MasterEditForm`, `RightsForm`, `SplitForm`
  + `SplitsTable`, `DeclarationForm`, `ContractForm`). Chaque ligne garde son état. L'action
  est décidée par le serveur (`LegalFactAction`, `manage_catalog` pour le titre, les parts
  et les déclarations, `manage_network` pour le Réseau, `manage_contracts` pour un contrat)
  et la page se rafraîchit après chaque écriture :
  - **Titres** : « ⋯ » → Modifier le titre (ISRC, crédits…) ou les droits (ISWC, ℗) ;
  - **Répartitions** : « Répartir » / « Modifier » ouvre la liste des parts du titre dans la
    modale (ajout, modification, suppression ; jamais plus de 100 %, vérifié en SQL) ;
  - **Déclarations** : « Déclarer » (titre puis organisme pas encore déclaré), « ⋯ » d'un
    dépôt (modifier, supprimer) ;
  - **Accords** : « Nouveau contrat » déjà rattaché au projet, qui ouvre ensuite le contrat
    pour ses parties et ses fichiers. Sa validation reste sur la page du contrat.

  Les processus (contrat généré depuis un modèle, confirmations de splits par les
  externes, clearance) iront dans Plan d'action et Suivi, pas ici.
- **Lisibilité** : Titres = une ligne par titre (avec ses artistes), ISRC / ISWC / ayant droit
  en colonnes. Ailleurs, le titre d'une ligne est un **tag dans sa colonne Titre**, de la
  teinte du titre (`titleHue`, selon sa place dans le projet). Il n'est jamais mêlé au
  détail : « yyyyy · Compositeur », et non « Compositeur · Essai PO ». Une lecture en échec affiche « Impossible de lire »
  dans sa section, au lieu d'une liste vide.
- **Personnes** : les interprètes (`master_artists`) d'abord, puis les contributeurs. Un
  interprète est **connu par sa fiche artiste** (« Artiste du catalogue », source « Fiche
  artiste », sans action). Juridique 01 lit « Artiste » comme une source au même titre que
  le Réseau, et interdit de redemander ce qui est fiable. Le bulletin SACEM ne demande que
  de nommer les interprètes. Il n'est donc jamais poussé dans le Réseau (décision du
  04/10/2026). Un contributeur n'est « Dans le Réseau » que s'il est **relié**
  (`master_contributors.contact_id`, `…20261004000201_contributor_contact.sql`, clé
  composite par organisation, écrit avec `manage_catalog`, tests
  `supabase/tests/legal.test.sql`). Un contact du même nom (sans accents ni casse) ne
  suffit plus : la ligne est « à confirmer » et propose « Relier »
  (`linkContributorContact`, une décision humaine). « Ajouter au Réseau » crée le contact
  puis relie le crédit.
- **Tuiles qui filtrent** (comme l'État du master, `lib/facts/views.ts`) : un clic sur
  « connues », « à confirmer » ou « manquantes » ne garde que les lignes de cet état
  (`?state=`), et les sections sans ligne de cet état disparaissent. Les compteurs restent
  ceux du dossier entier, et un second clic réaffiche tout.
- **Une personne créditée sur plusieurs titres** : « Ajouter au Réseau » et « Relier »
  relient tous les crédits de ce nom qui ne le sont pas encore, sur tous les titres
  (`unlinkedCreditsByName`).
- **Étapes** : seules celles de `LEGAL_BUILT_STEPS` ont une page (`builtLegalStepOf` lit
  l'adresse). Les autres sont grisées (« Bientôt disponible ») et répondent 404.
- **Lot 2 : Cadrage juridique** (`/legal/framing`, `…20261004001001_legal_intake.sql`,
  tests `supabase/tests/legal-intake.test.sql`), d'après le ticket Juridique 01 :
  - **Questions** calculées par le code (`lib/legal/intake/questions.ts`), une seule à la
    fois, dans cet ordre : pour chaque titre, ses participants puis un élément repris ; les
    accords du projet ; l'éditeur de chaque titre. Chaque question répond à un besoin
    nommé par un ticket (source citée dans le fichier). Une question déjà réglée par une
    donnée fiable n'est jamais posée : crédits présents, éditeur dans le split édition,
    contrat rattaché. Chaque question dit pourquoi elle est posée.
  - **Réponse libre**, tapée ou dictée, lue par PO (`interpretAnswer`, `extract`, un schéma
    et une consigne fixe par question, la réponse en donnée seulement). Le code ne garde un
    nom, une œuvre ou une partie que s'il est écrit mot pour mot dans la réponse
    (`verbatimFrom`) ; le reste est écarté et compté. L'écran montre « Ce que PO a
    compris » avec la citation de chaque élément : on retire ce qui est faux, rien n'est
    gardé avant « Enregistrer ».
  - **Enregistrement** par `record_legal_answer` (security definer, `manage_legal` sur un
    projet visible, une transaction) : session `legal_intakes` ouverte en brouillon,
    réponse `legal_answers` gardée telle quelle, faits `legal_facts` (valeur, statut,
    source, citation, déclarant ; confirmateur et preuve plus tard), statut **déclaré**,
    sauf un élément tiers, **à vérifier** comme dans le cas Humanisme du ticket.
    Objets minimum : une contribution devient un crédit du titre (avec `manage_catalog`,
    sans doublon nom + rôle ; « interprète » reste un fait), un élément tiers un point à
    sécuriser `legal_clearances` (`to_investigate`, états du ticket Juridique 05, jamais
    une autorisation).
  - **Correction** : « Corriger » repose la question, la nouvelle réponse remplace les faits
    actifs (`superseded_by_answer_id`) sans les effacer, et un point à sécuriser encore
    intact part avec son fait. La liste des questions se recalcule.
  - **Panneau « Le dossier »** : l'État des lieux résumé par domaine, les éléments tiers,
    les responsables (désignés au plan d'action).
  - Statuts : les 7 du ticket sont stockés (CONNU … SIMULÉ en anglais) ; l'écran les
    regroupe en connu / à confirmer / manquant.
- **Lot 3 : Confirmation** (`/legal/confirmation`, `…20261004001101_legal_intake_confirmation.sql`,
  tests dans `legal-intake.test.sql`). Le ticket : « PO reformule le dossier, montre les
  corrections possibles et demande confirmation », « valider la synthèse du dossier ».
  - **Synthèse écrite par le code** (`lib/legal/confirmation/synthesis.ts`), jamais par
    l'IA (règle 6 ; chaque ligne doit s'expliquer par sa source). Quatre parties :
    - Personnes : interprètes et crédits du catalogue, plus une interprétation déclarée
      mais pas créditée ;
    - Éléments repris ;
    - Accords : contrats du projet, plus accords déclarés ;
    - Éditeurs : split édition, plus réponses.

    Chaque ligne a sa source (fiche, crédits, contrats, splits, « Cadrage juridique »), son
    état (les 7 statuts regroupés en 3) et, pour ce qui vient d'une réponse, « Corriger ».
    Une question sans réponse donne une ligne « Sans réponse » avec « Répondre ». Les deux
    mènent à `/legal/framing?question=<clé>:<titre|project>`, qui ouvre cette question
    (avec la réponse précédente pour une correction).
  - **« Confirmer le dossier »** n'apparaît que lorsque toutes les questions ont une
    réponse (vérifié par le code, qui calcule les questions). Sans aucune question à poser
    (pas de titre, contrat déjà rattaché), le Cadrage le dit (« Aucune question à poser »,
    étape cochée) et la Confirmation se propose directement : `confirm_legal_intake` crée
    alors le dossier (audit du 07/10, plus de renvoi en boucle entre les deux étapes). `confirm_legal_intake`
    (security definer, `manage_legal` sur un projet visible) passe le dossier à
    « confirmé », avec qui et quand, et ses faits **déclarés** à « confirmé »
    (`confirmed_by`). Un fait **à vérifier** le reste (l'attribution de Humanisme n'est pas
    réglée par la confirmation de l'équipe), un fait **simulé** aussi (« une donnée
    simulée ne devient jamais confirmée »). L'écran rappelle que confirmer ne vaut ni
    signature, ni autorisation, ni dépôt.
  - **Réouverture** : une nouvelle réponse (`record_legal_answer`) repasse un dossier
    confirmé en brouillon (« une session confirmée reste corrigeable »). L'écran le dit
    (« une réponse a changé depuis la dernière confirmation ») et redemande la
    confirmation.
- **Lot 4 : Plan d'action** (`/legal/plan`, `…20261004001201_legal_plan.sql`, tests
  `legal-plan.test.sql`), d'après les tickets 01 (« Après confirmation, PO propose le plan
  d'action ») et 07 (trois colonnes ; « responsabilités, dépendances et calendrier » ;
  « Confirmation du plan avant lancement » ; « aucune séquence artificiellement linéaire »).
  - **Proposition calculée par le code** à chaque visite (`proposePlan`, jamais stockée
    avant lancement). Une action par branche nommée par un ticket :
    - **fiches de renseignements** (02) : une seule, pour les crédités pas encore reliés au
      Réseau ;
    - **contrat** par personne créditée (03), sauf si un contrat signé du projet l'a pour
      partie. « En cours » si un contrat est en route, sinon après les fiches pour qui
      n'est pas dans le Réseau ;
    - **répartition de l'édition** par titre ayant des auteurs, compositeurs ou arrangeurs
      (04), après les fiches ;
    - **sécuriser** chaque élément tiers (05) : à lancer s'il est à instruire, « En cours »
      s'il attend un retour ;
    - **déclaration SACEM** par titre dont la SACEM n'a pas **confirmé** la déclaration
      (06), après les fiches, la répartition et les éléments tiers du titre (et le master
      final, noté). Une déclaration seulement « soumise » ou refusée garde l'action : elle
      peut encore être refusée, le Suivi la montre « en attente d'un retour » (règle commune
      avec `trackPlan` et `legal_plan_item_done`, 08/10/2026 ; avant, une déclaration
      soumise retirait l'action et la page SACEM n'était plus atteignable).

    Colonnes : à lancer maintenant (rien ne retient), en cours (attend un retour), à
    venir (dépend d'une autre action). Fiches et clearances partent en parallèle.
  - **Choix humains** : garder ou retirer une action (« valider ou corriger la
    cartographie », 03), responsable parmi les détenteurs de `manage_legal`
    (`list_legal_people` ; le chef de projet par défaut, faute des postes du ticket), et
    échéance facultative.
  - **Lancement** : `launchLegalPlan` reconstruit les actions côté serveur (le navigateur
    n'envoie que les choix ; une action retirée ne retient plus les autres), puis
    `launch_legal_plan` (dossier confirmé obligatoire, une seule fois, responsable
    vérifié) enregistre le plan **confirmé et actif** d'un coup, avec les états du
    ticket 07 (`action_now`, `waiting_external`, `blocked`). Rien n'est envoyé, aucun
    contrat créé.
- **Lot 5 : Suivi** (`/legal/tracking`, `…20261004001301_legal_plan_delegation.sql`, tests
  dans `legal-plan.test.sql`), d'après le ticket 07 (« Après confirmation et lancement, la
  vue devient Suivi » ; « Qu'est-ce qui nécessite notre attention ? »).
  - **État réel recalculé** à chaque visite par le code (`lib/legal/tracking/`), à partir
    des objets sources (« Une Rule lit les objets sources, jamais une copie UI ») :
    - fiches : toutes les personnes créditées reliées au Réseau ;
    - contrat : contrats du projet dont le contact est partie (signé = fait, envoyé =
      attente, à valider = décision du DG, résilié ou expiré = décision) ;
    - répartition : split édition à 100 % ;
    - clearance : son état (refus = décision, retour attendu = attente) ;
    - formalité : déclaration SACEM (déposée = attente, refusée = décision).

    Une action est libre quand toutes celles dont elle dépend sont faites ou plus
    nécessaires (« débloquée indépendamment »). Elle est « plus nécessaire » quand sa
    source a disparu (personne plus créditée, titre retiré, clearance abandonnée). Elle
    est en retard si son échéance est passée. Rien n'est écrit par ce calcul : le relire
    deux fois ne produit aucun effet en double.
  - **Quatre groupes** du ticket : À traiter maintenant, Décision requise (refus, rejet,
    contrat à valider, échéance dépassée), En attente d'un retour (avec « depuis le »,
    d'après la dernière modification de la source : « un contrat en signature quitte la
    todo humaine et devient une attente surveillée »), Progression silencieuse (fait, plus
    nécessaire, attend une autre action).
  - **Délégation** : « Modifier » change le responsable ou l'échéance par
    `update_legal_plan_item`, qui garde chaque changement dans `legal_plan_events` (« Délégation
    ou escalade explicite lorsque le responsable change »).
  - **Les actions sont des tâches** (`…20261004001401_legal_plan_tasks.sql`, puis
    `…20261005003001_legal_tasks_auto.sql`, `legal-tasks.test.sql` ; retours de Sacha du
    04/10 « c'est du travail à donner ? » et du 05/10 « pourquoi on doit créer la tâche,
    elle pourrait se créer toute seule ? »). Chaque action est écrite en clair avec une
    phrase qui dit pourquoi (`why`) et son sujet seul (`subject` : la personne, le titre).
    - **Création** : au lancement, **chaque** action qui a un responsable devient une tâche
      du Travail (`insert_legal_plan_item` → `legal_plan_item_task`), assignée et
      notifiée, échéance de l'action, sinon du projet, sinon aucune (`tasks.due_date`
      nullable pour les seules tâches du plan, contrainte `tasks_due_date_required`).
      Donner un responsable ou une échéance à une action (délégation) crée ou déplace
      sa tâche (trigger `z_sync_task`). Plus de bouton « Créer la tâche ».
    - **En attente** : une tâche dont une action dépendante a encore sa tâche ouverte
      s'affiche « En attente de : … » dans le Travail du projet et quitte l'accueil
      (`lib/legal/tasks.ts`, calculé à la lecture, rien n'est stocké).
    - **Coche par les sources** : `legal_plan_item_done` lit les mêmes règles que le Suivi
      (toutes les fiches complètes, contrat signé liant le contact des crédits
      `credit_ids`, split édition à 100 %, clearance `cleared`, déclaration SACEM
      confirmée) ; les triggers `z_legal_tick` de `legal_forms`, `contracts`,
      `contract_parties`, `master_contributors`, `master_splits`, `legal_clearances` et
      `master_declarations` cochent la tâche dans la même transaction. Jamais décochée par
      eux. Les deux jeux de règles (SQL et `lib/legal/tracking/sources.ts`) doivent rester
      alignés.
    - **Là où ça se fait** : `lib/legal/plan/where.ts` donne la page et le libellé du bouton
      de chaque nature d'action (fiches → `/legal/forms`, contrat → `/legal/contracts`,
      répartition → splits du titre, déclaration → droits du titre, accord → État des
      lieux), le même dans le Plan, le Suivi et la tâche du Travail.
    - **Actions apparues après le lancement** (une personne créditée, un titre ajouté) :
      le Suivi compare le plan à ce que le dossier demande maintenant et propose « Ajouter
      au plan » (`add_legal_plan_items`, une clé déjà présente est laissée).
    - **Plans déjà lancés** : la migration crée les tâches manquantes, retrouve les crédits
      des contrats par le nom (même comparaison que `lib/utils/search.ts`, accents français)
      et coche ce qui est déjà fait.
  - **Lecture groupée** (retour du 05/10 « beaucoup de répétitions ») : dans le Plan et le
    Suivi, les actions d'une même nature forment un groupe (`groupActions`) qui dit une
    fois son nom, sa raison et ce qu'il attend, avec un seul bouton quand toutes se font
    au même endroit ; chaque ligne ne garde que son sujet.
  - **Dossiers** : les pages des branches (Fiches de renseignements, Contrats) sont en
    pastilles sous les étapes du Juridique, ouvertes à tout moment.
  - **Pas encore** (dit à l'écran, comme le demande le ticket) : l'envoi en signature,
    les dépôts SACEM, l'outbox d'événements, les relances, et les effets des branches 04 à
    06.
- **Contact créé, crédits reliés** (retour de Sacha du 05/10/2026 : « si on rajoute au
  réseau, c'est logique que ça soit le même ») : à la création d'un contact du Réseau, d'où
  qu'elle vienne (page Réseau, « Ajouter au Réseau », en-tête « Ingénieurs du Réseau »), le
  serveur relie les crédits **non reliés** de l'organisation qui portent exactement son nom
  (`lib/network/link-credits.ts`, insensible à la casse, avec la session : `manage_catalog`).
  Un crédit déjà relié n'est jamais déplacé ; un homonyme d'un contact **existant** reste une
  suggestion (« Relier »). Des accents différents (« Etait » / « était ») ne se relient pas
  seuls.
- **Choisir plutôt que retaper** (retours de Sacha du 05/10/2026) : le nom d'un crédit et
  l'ayant droit d'une part du titre se choisissent dans une liste (`PersonPickerField`) :
  le Réseau pour un crédit ; pour une part, les personnes créditées sur le titre, ses
  artistes, puis le Réseau (l'ordre suit le type de part). Le choix est gardé
  (`master_contributors.contact_id`, `master_splits.contact_id` ou `artist_id`,
  migration `…20261005008001_split_parties.sql`) ; « Ajouter « X » au Réseau » crée le
  contact en modale ; « Garder seulement le nom » reste possible. La fiche du titre montre
  la répartition de l'édition confirmée dans le Juridique et propose « Reprendre ces
  parts » (un clic, arrondi au plus fort reste à 2 décimales : 33,34 / 33,33 / 33,33) ;
  la version exacte reste dans le Juridique.
- **Branche 02 : fiches de renseignements** (`/legal/forms`, page publique `/f/<jeton>`,
  `…20261004004001_legal_forms.sql`, `legal-forms.test.sql`), d'après le ticket Juridique 02.
  - **Une fiche par personne créditée** sur les titres du projet (`formPeople`, regroupée
    par contact ou, à défaut, par nom). « Préparer la fiche » (`prepare_legal_form`, manage_legal)
    crée le contact s'il manque (seul ce contact neuf prend les crédits non reliés de son
    nom), révoque le lien précédent et
    renvoie un jeton de 64 hex **affiché une seule fois** : seul son `sha256` est gardé,
    il expire après 30 jours. L'équipe l'envoie par le canal qu'elle veut (« notamment pour
    un envoi WhatsApp dans le MVP ») puis le marque envoyé.
  - **Jamais de rattachement par le nom** (audit du 06/10/2026,
    `…20261006001001_legal_forms_no_name_link.sql`, `brief-credits-forms.test.sql`) : une
    personne qui a déjà un contact ne lui fait pas prendre ses autres crédits non reliés, et
    une personne sans contact mais avec un **homonyme dans le Réseau** n'a pas de fiche
    (`legal_form_namesake`, `FormPerson.namesakeId`) : la ligne renvoie à « Relier » sur l'État
    des lieux, sinon la fiche créait un doublon (l'ingénieur du mix y perdait son historique
    côté Master). Comparaison des noms en SQL : `legal_name_key`, comme `normalizeSearch`.
  - **Sans compte** : `/f/` est hors session dans `lib/supabase/proxy.ts` ; la page lit et
    écrit par deux fonctions `security definer` accordées à `anon` (`get_legal_form`,
    `submit_legal_form`), qui ne font rien d'autre que ce jeton permet. Aucune table n'est
    ouverte à `anon`.
  - **Rôles d'abord**, puis le tronc commun et les blocs de ces rôles seulement
    (`BLOCKS_OF`, définition versionnée `LEGAL_FORM_VERSION`) ; aucun schéma SPPF ou The
    Orchard. Le serveur rejette les champs hors rôles et refuse un envoi incomplet en
    nommant les champs (`checkSubmission`).
  - **Où vont les réponses** : les données permanentes (identité, société, SIRET, IPI…)
    sur le contact (`contact_legal_details.details`), les données du morceau dans la
    soumission (`legal_form_submissions.contribution`). Une valeur déjà connue et
    différente **n'est pas appliquée** : la fiche passe « Reçue, à vérifier » et l'équipe
    accepte ou garde l'ancienne (`review_legal_form`, « revue avant propagation »).
  - **Suivi** : l'action « Fiches » est faite quand chaque personne créditée a une fiche
    complète (`completeFormContacts`) ; un contrat ne passe « à lancer » que si la fiche
    de son contact est complète, sinon il attend la fiche.
- **Branche 03 : contrats depuis des modèles** (`/legal/contracts`, `/app/contracts/templates`,
  `…20261005001001_contract_templates.sql`, `legal-contracts.test.sql`), d'après le ticket
  Juridique 03. Étend le module Contrats (§ 8 quinquies) au lieu de le dupliquer.
  - **Modèles** (`contract_templates`) : collés par un humain (« Aucun modèle juridique
    nouveau ni aucune clause n'est inventé »), écrits par `manage_legal`, **validés par le
    DG** (`validate`). Une ligne n'est jamais modifiée, sauf son état : une correction est
    une nouvelle version de la même série (`create_contract_template`), validée à son tour ;
    valider une version retire la précédente, les copies déjà faites gardent la leur.
  - **Champs** : `{{id}}` d'une liste fermée (`lib/legal/contracts/fields.ts`), refusée à
    l'enregistrement si un id est inconnu. Chaque valeur est lue par le code à **une** source
    (`values.ts`) : fiche de renseignements (`contact_legal_details`), Réseau, projet,
    crédits des titres, cartographie (rémunération), structure. Aucune valeur saisie à la
    main au moment de générer : une valeur manquante se complète à sa source, ce qui la rend
    traçable.
  - **Éditeur du texte** (demande de Sacha, 07/10/2026 : « super compliqué s'il faut mettre
    des variables ») : personne ne tape `{{…}}`. `TemplateBodyEditor` est un `contenteditable`
    en texte brut où chaque champ est une **pastille** non modifiable (« Nom civil »),
    insérée au curseur par les boutons groupés au-dessus (La personne / Le projet / L'accord,
    `CONTRACT_FIELD_GROUPS`) ; le texte enregistré est relu du DOM (`serialize`, pastille →
    `{{id}}`, `<br>` → `\n`), le format en base ne change pas. Collage en texte brut, `{{id}}`
    collés convertis en pastilles, pas de gras. Le même rendu en lecture (`TemplateBody`).
  - **Partir d'un contrat déjà rempli** (« Repérer les valeurs », `suggestTemplateValues`) :
    on colle le contrat d'une vraie personne ; le **code** repère ce qui a une forme
    (e-mail, téléphone, SIRET, IPI : `value-patterns.ts`), **PO** les noms, l'adresse, les
    titres, la somme et la structure (`lib/ai/instructions/contract-template-values.ts`, le
    contrat en donnée, 40 000 premiers caractères). Un extrait n'est gardé que s'il est écrit
    **tel quel**, mot entier, hors pastille (`countExcerpt`) ; à qui il appartient (personne
    ou label) n'est jamais décidé par la machine. Les valeurs restantes sont surlignées dans
    le texte (CSS Custom Highlight, `::highlight(template-value)`), chacune avec son champ
    (modifiable), « Remplacer » (toutes ses occurrences, annulable) ou « Ignorer » ; un texte
    collé n'est remplacé qu'au clic. **Un contrat importé** (Word, PDF, texte) est lu par PO
    dès l'import et ce qu'il repère est **remplacé aussitôt** (demande de Sacha, 07/10/2026 :
    pas de transcription à relire, l'analyse directe) : « Ce que PO a repéré dans « … » »,
    chaque valeur avec son champ encore modifiable (la pastille suit) et « Annuler » ; le
    texte reste replié derrière « Afficher le texte ». Dans la même lecture, PO décrit le
    modèle (nom sans nom propre, type de contrat, rôles de la personne, usage) : seuls les
    champs encore vides sont pré-remplis, avec un encart qui le dit, et tout se corrige.
    L'import est en tête du formulaire. Rien n'est enregistré avant
    « Enregistrer le modèle », et le DG valide encore le modèle. PO pointe, il n'écrit ni
    clause ni valeur. PO en échec → seules les valeurs du code sont proposées, et c'est dit.
  - **Cartographie** (`legal_agreement_needs`) : une ligne par personne créditée qui a un
    contact. Le code propose le modèle validé dont les rôles recoupent le mieux ceux de la
    personne (aucune table rôle → type de contrat inventée) et la rémunération de sa fiche
    quand c'est un montant simple (`feeCentsOf`). « Valider la cartographie » enregistre tout
    d'un coup (`approve_contract_mapping`, événement `contract_mapping.approved`) ; une
    personne décochée n'a pas d'accord ; une ligne déjà générée ne change plus.
  - **États** (`lib/legal/contracts/state.ts`) : cartographie à valider, pas d'accord,
    NEEDS_INFO (modèle absent ou valeur manquante), READY_TO_GENERATE, puis ceux du contrat
    (DRAFT, REVIEW_REQUIRED, APPROVED = prêt à envoyer, SIGNATURE_PENDING, SIGNED). APPROVED
    et READY_FOR_SIGNATURE ne font qu'un : l'approbation du document précis par le DG
    est l'autorisation d'envoi (décision du 05/10/2026, à revoir si Justine et le DG ne
    sont pas la même personne).
  - **Copie** (`contract_documents`, `generate_legal_contract`) : le texte est rempli **en SQL**
    à partir du modèle et des valeurs données par le serveur ; refusée tant qu'une valeur
    manque. Elle crée un contrat brouillon du module Contrats (responsable = **le responsable
    du projet**, à défaut l'auteur ; la personne en partie) et garde le modèle, sa version et
    chaque valeur avec sa source.
  - **Génération automatique** (demande de Sacha, 07/10/2026, étape 3 du ticket : « dès que
    les prérequis d'un accord sont disponibles, PO duplique le template compatible ») :
    `generateReadyAgreements` (`lib/legal/contracts/auto-generate.ts`) génère chaque accord
    « prêt » sans clic, avec la session de la personne, là où les accords sont regardés : la
    page Contrats et le Suivi du Juridique (au rendu, `loadAgreementsGenerated`) et juste
    après « Valider la cartographie ». Pas de trigger ni de cron : les valeurs sont lues par
    le code TypeScript à leurs sources, et le service role est réservé au cron. Une fiche
    remplie par lien sans compte ne génère donc rien tant que personne n'ouvre le Juridique.
    Le journal dit « automatique » ; le brouillon reste à soumettre et à valider par le DG.
    « Générer le contrat » reste en secours si la génération automatique a échoué.
  - **Fichier source** (« ContractTemplate : … fichier source ») : un modèle peut être importé
    d'un Word (.docx), d'un PDF ou d'un texte (10 Mo au plus) ; le navigateur le dépose dans le
    bucket privé `contract-template-sources` (`<organisation>/<uuid>.<ext>`, RLS
    `manage_legal`), le serveur en lit le texte (`readTemplateSource`, `source-text.ts` :
    Word lu sans dépendance, document.xml du zip ; PDF par **unpdf**) et le met dans
    l'éditeur, replié, puis PO en repère les valeurs (ci-dessus) ; l'ancien texte reste à un
    clic (« Annuler »). Le fichier est gardé avec la
    version (`source_path`, `source_name`, vérifiés par `create_contract_template`), repris
    par une nouvelle version, téléchargeable depuis « Voir le modèle ». Perdu à l'import :
    mise en page, numérotation automatique de Word, en-têtes et pieds de page.
  - **Clauses** : « Modifier une clause » crée une nouvelle version avec sa raison
    (`revise_contract_document`, brouillon ou approuvé seulement) ; un contrat approuvé
    repasse en brouillon et doit être validé à nouveau.
  - **Preuves** : pour un contrat généré, `advance_contract` demande comment il a été envoyé
    (la note est gardée dans le journal comme preuve d'envoi) et refuse la signature tant
    que les fichiers n'ont pas un « Signé » **et** une « Preuve de signature » (nouvelle
    catégorie `evidence`). Les contrats écrits à la main gardent l'ancien comportement.
    Signature électronique (Yousign ou autre) : non intégrée, rien ne la présente comme
    disponible.
  - **Besoin financier** (`financial_needs`) : à la signature d'un contrat dont l'accord a une
    rémunération, un trigger crée un besoin « en attente de facture » (jamais « à payer »),
    un seul par contrat. La suite (facture, paiement) est hors du ticket.
  - **Journal** (`contract_events`, écrit par les fonctions seules) : génération, clause
    modifiée, envoi en validation, approbation, demande de modifications, envoi en
    signature, signature, résiliation, besoin financier créé.
  - **Export** : `/api/contracts/[id]/document`, la dernière version seule en PDF
    (Playwright), sans habillage de l'app.
  - Le Suivi envoie l'action « Contrat » d'une personne dont la fiche est complète vers
    `/legal/contracts`.
- **Branche 04 : répartitions confirmées** (`/legal/splits`, page publique `/s/<jeton>`,
  `…20261005005001_legal_splits.sql`, `legal-splits.test.sql`), d'après le ticket Juridique 04.
  - **Feuille par titre** (`legal_split_sheets`), **versions** (`legal_split_versions` : brouillon,
    envoyée, confirmée en partie, confirmée, contestée, remplacée), **lignes**
    (`legal_split_entries` : nom, rôle, part `numeric(7,4)`, contact et crédit d'origine).
  - **Parts exactes** : le code compte en dix-millièmes de pourcent (entiers,
    `lib/legal/splits/shares.ts`), « Parts égales » donne le reste aux premières lignes
    (33,3334 + 33,3333 + 33,3333) ; `propose_split_version` refuse tout total autre que 100 ;
    l'écran arrondit à 2 décimales.
  - **Un lien par personne et par version** (`legal_split_confirmations`, jeton de 64 hex,
    seul son `sha256` gardé, 30 jours, « Nouveau lien » révoque l'ancien). La page publique lit
    la version et son empreinte (`split_content_hash`) ; la réponse est refusée si l'empreinte
    a changé (« ne vaut que pour le contenu exact présenté ») et garde en preuve l'empreinte,
    le contenu, l'heure et le navigateur. Une contestation exige sa raison, rien n'est effacé.
  - **Nouvelle version** : enregistrer après un envoi crée la version suivante ; l'envoyer
    remplace la précédente et révoque ses liens en attente (« supersède, ne copie pas »).
  - Le plan : « Répartir l'édition » est fait quand la version active est confirmée (trigger
    sur `legal_split_versions`) ; `master_splits` reste la donnée du titre et la répartition
    SACEM n'en est jamais déduite.
  - **Point de départ** (retour de Sacha du 05/10) : si l'édition est déjà répartie à 100 % sur
    la fiche du titre (`master_splits`, lue avec `manage_catalog`), la première version part de
    ces parts (`titlePublishingLines`) : la carte les affiche, « Envoyer pour confirmation » directement (`proposeTitleSplit` relit les parts côté serveur, brouillon puis envoi) ou « Modifier avant l'envoi » ; comme le Suivi (« Répartie sur la fiche
    du titre, à faire confirmer ») ; sinon, les créateurs crédités à parts égales. L'action
    reste ouverte : seule la confirmation de chacun la clôt (ticket 04).
- **Branche 05 : accords (clearance)** (`/legal/clearances`, `…20261005006001_legal_clearance.sql`,
  `legal-clearance.test.sql`), d'après le ticket Juridique 05, générique (aucun workflow
  « Humanisme »).
  - `legal_clearances` reçoit sa **qualification** : usage exact, droits concernés (œuvre,
    master, les deux, ou rien à sécuriser avec sa raison), responsable. Autour : ayants droit
    par droit, journal des échanges, conditions (`legal_clearance_terms`, proposées jusqu'à la
    **validation du DG**), le contrat de chaque droit (`legal_clearance_contracts`, un contrat
    du module Contrats : documents et preuves y vivent), l'historique.
  - **États** du ticket, chacun avec ce qu'il exige (`clearance_missing`) : ayants droit de
    chaque droit concerné, un envoi consigné, des conditions validées, un contrat par droit,
    signé, puis le signé **et** la preuve pour « Sécurisé ». Refus, abandon et action requise
    disent leur raison ; un refus « bloque la sortie en l'état ». Un refus ou une action
    requise **n'est pas une fin** : « Reprendre à … » ramène l'accord à l'état qu'il avait
    avant (lu dans son journal, `nextStatus`), avec les mêmes exigences ; seul l'abandon
    clôt. Rien à sécuriser passe
    directement à « Sécurisé » avec sa raison (Für Elise rejouée : composition du domaine
    public, à confirmer par le juridique).
  - **PO lit un échange libre** (`readClearanceMessage`, `lib/ai/schemas/legal-clearance.ts`) :
    il relève la nature de l'échange, les ayants droit, les conditions ; le code ne garde que
    ce qui est écrit mot pour mot et choisit l'état à proposer (`statusFromEvent`, matrice
    d'actions) ; chaque proposition s'applique d'un clic par les mêmes fonctions.
- **Branche 06 : formalités et SACEM 725** (`/legal/formalities`,
  `…20261005007001_legal_formalities.sql`, `legal-formalities.test.sql`), d'après le ticket
  Juridique 06 et le bulletin SACEM 725 — 02/2026 (œuvres éditées).
  - **Moteur générique** : `legal_formalities` (une par titre et définition, version de la
    définition, responsable, champs rouverts, preuves, identifiant externe),
    `legal_formality_values` (valeur validée et sa source), `legal_formality_documents`
    (versions du bulletin), `legal_formality_signatures`, `legal_formality_events`. La
    définition `SACEM_725_EDITED_WORK` v1 : ses champs dans `lib/legal/formalities/definition.ts`,
    ses règles dans `formality_missing` (SQL).
  - **Pré-remplissage sourcé** (`prefill.ts`) : titre et ISWC du titre (ISWC seulement s'il
    existe), durée **du master final seulement**, interprètes du titre, créateurs des crédits et
    des fiches (nom civil, pseudonyme, IPI/COAD). Jamais déduits : première exploitation,
    territoires, DEP/DR, parts Phono (la répartition n'est pas recopiée). À l'enregistrement,
    une valeur non saisie est relue à sa source par le serveur, le navigateur ne peut pas la
    falsifier.
  - **Créateurs et éditeurs choisis, jamais tapés** (Sacha, 07/10/2026) : chaque créateur est
    choisi dans le Réseau par `PersonPickerField` (personnes créditées sur le titre comme
    auteur, compositeur ou arrangeur en tête), chaque éditeur parmi les structures du Réseau
    (éditeurs de la répartition de l'édition en tête) : `lib/legal/formalities/party-actions.ts`.
    Le choix remplit nom civil, prénom, pseudonyme, IPI/COAD (fiche de renseignements,
    `contact_legal_details`) et la qualité (rôle du crédit), tous corrigeables ; seule la part
    Phono se saisit. Le bulletin garde le `contact_id` de chacun. Les éditeurs de la
    répartition sont pré-remplis par leur nom, jamais par leur part. « Garder seulement le
    nom » reste possible pour quelqu'un qu'on ne met pas au Réseau. Choisir dans le Réseau une
    personne non créditée sur le titre **ne crée pas de crédit** (ce serait une écriture au
    Catalogue, `manage_catalog`, cachée dans un formulaire du Juridique) : à faire par
    « Ajouter un contributeur ».
  - **Manques en rouge** : au clic sur « Valider le dossier », le dossier est enregistré tel
    quel puis chaque code de `formality_missing` est dit sous son champ, en rouge, avec sa
    raison (`field-errors.ts`) ; un message au-dessus du bouton compte les manques, le premier
    champ en rouge prend le focus. Un champ redevient normal dès que sa valeur à l'écran
    répond au manque. La règle reste en SQL : l'écran ne fait que la traduire.
  - **Règles** : titre, durée, au moins un créateur (5 au plus, 3 éditeurs au plus), nom et
    qualité de chacun, parts Phono à 100 % exactement, réponse de la rubrique D, portée de
    l'autorisation d'arrangement s'il y a un arrangeur, contrat d'édition si seuls les éditeurs
    signent sinon la date du contrat (rubrique G), et **chaque emprunt du titre sécurisé**
    avant de générer.
  - **Champs alignés sur le bulletin papier** (07/10/2026, lecture du PDF 725 - 02/2026) :
    la rubrique D n'est pas un choix « DEP ou DR » mais une case : au sein de chaque catégorie,
    le partage des DEP et DR **suit les parts Phono** (`follow_phono`, case cochée) ou le
    **partage égal du Règlement général** (`statutory`) ; les anciennes réponses DEP/DR sont
    rouvertes « à vérifier » (`…20261007000401_formality_dep_dr_follow_phono.sql`). La première
    exploitation est une date (`first_exploitation`) et, à part, un lieu ou diffuseur
    (`first_exploitation_place`). La rubrique G est la **date du contrat** conclu conjointement
    entre créateurs et éditeurs ; le tableau des contrats non conjoints (éditeur n°, créateur n°,
    date) n'est pas géré (point à trancher).
  - **Le PDF est le bulletin officiel rempli** (`bulletin-pdf.ts`, `pdf-lib`) : le formulaire
    SACEM fourni avec le ticket (`lib/legal/formalities/assets/sacem-725-02-2026.pdf`, 156
    champs aux noms opaques, reliés à leur rubrique par leur position sur la page) reçoit les
    valeurs de la version. Durée en h / m / s, dates en jj / mm / aaaa, ISWC réduit à ses 10
    chiffres, « Monde » coche la case, sinon « Autres » + la liste ; qualité cochée et part Phono
    sur sa ligne (entier, décimales) ; une seule valeur « IPI / COAD » va dans « Code
    international » si elle a 9 chiffres ou plus, sinon dans COAD (la notice : l'IPI, à défaut
    le COAD). Laissés vides, le PDF restant modifiable : signatures, « Je fais partie du groupe
    » (oui / non, non demandé par PDS OS, point à trancher), « Fait le », partie réservée à la
    SACEM. Un caractère que la police standard ne sait pas écrire perd son accent. Un nouveau
    bulletin SACEM = un nouveau fichier et une nouvelle table de correspondance.
  - **Étapes** : données à compléter → prête à générer → bulletin généré (version, bulletin
    officiel rempli `/api/legal/formalities/[id]/document`) → signatures (chaque ayant droit qui signe, avec la
    preuve) ou déclaration partielle avec sa raison → prête à déposer → **déposée** (preuve du
    dépôt, déclaration SACEM du titre « déposée ») → en traitement → **enregistrée** (preuve du
    résultat, identifiant SACEM, ISWC reporté sur le titre s'il était vide, déclaration
    « confirmée », tâche du plan cochée). Une **correction** rouvre seulement les champs
    nommés ; les autres restent ; une nouvelle version et de nouvelles signatures suivent.
  - Pas d'SPPF ni de dépôt numérique : le dépôt et la preuve restent humains (MVP).
  - **Contrat d'édition signé** (demande de Sacha, 07/10/2026, ticket 03 : « contract.signed
    … peut débloquer Formalités ») : un contrat de type `publishing` du projet qui passe à
    « signé » coche « La copie du contrat d'édition est jointe » sur chaque bulletin SACEM du
    projet encore en préparation (trigger `contracts_tick_formalities`, source « Contrat
    signé : … », événement `contract.signed`, puis `formality_settle`). Un bulletin déjà
    généré n'est pas modifié (ses signatures ne correspondraient plus) : son historique dit
    de joindre le contrat au dépôt. Un bulletin ouvert après la signature le reçoit en
    pré-remplissage (`prefill.ts`). Le contrat vaut pour tous les titres du projet (un
    contrat n'est pas rattaché à un titre) ; décocher reste possible. Un contrat résilié
    ensuite ne décoche rien.
- **Depuis le Cadrage intelligent** (§ 6, 06/10/2026) : les réponses confirmées (ou
  proposées) de la dimension 06 « Cadre juridique » du Brief (parties, accords, contrats et
  droits à prévoir, éléments sécurisés) rejoignent les points signalés de l'État des lieux
  (`inventory-rows.ts`), à côté des contraintes de droits ; leur lien ouvre la dimension.
  Le Juridique **se lance depuis le Plan du Projet** (§ 6 ter) : layout `legal/` verrouillé
  tant que le plan ne l'a pas lancé, sauf s'il avait déjà commencé (Cadrage juridique).

## 8 septies. Master (`/master`, `lib/master-workflow/`, `components/master-workflow/`)

Workflow spécialisé du projet, mené en parallèle des 7 étapes et du Juridique
(`docs/CONTEXTE-PROJET.md` § 2), d'après le ticket « Workflow Master » du 30/09/2026.
Parcours interne : État du master → Brief Mix/Master → Mix (versions, retours, validation
du mix final) → Mastering → Master final (`lib/ui/master-steps.ts`, chevrons `SectionSteps`
sous l'en-tête). Une étape = un dossier sous `/master` : une étape pas encore construite est
grisée (« Bientôt disponible ») et son adresse répond 404 sans route attrape-tout. Livré par
lots, chacun utile seul.

- **Simplification du 07/10/2026** (Sacha : « aussi optimisée que le juridique, la plus
  simple, la plus fluide ») : **trois étapes à l'écran** (`MASTER_TABS`, `masterSteps`,
  `SectionSteps also`), les cinq pages et leurs règles inchangées :
  - **Préparer** (`/master`) : en tête, « Où en est la préparation » (`PrepareSummary`, lu dans
    la vue de l'envoi au mixeur, donc les mêmes blocages) : source de chaque titre, Brief
    Mix/Master, envoi au mixeur, chacun avec son seul bouton ; puis l'État du master. Le Brief
    (`/master/brief`) s'ouvre de là, avec « ← Préparer ».
  - **Mix et mastering** (`/master/mix`, `ProductionPage`) : les deux tours sur une page, chacun
    avec son dossier et ses versions décidées titre par titre ; le mastering s'ouvre quand chaque
    titre a son mix final, un tour fini se replie en une ligne ; une fois envoyé, « ce que reçoit
    l'ingénieur » se replie (`PackageSections`).
- **Quatre étapes depuis le 08/10/2026** (ticket « Architecture globale », lot 2 : un chevron
  = un jalon que le métier reconnaît) : **Préparation**, **Mixage** (`/master/mix`),
  **Mastering** (`/master/mastering`, redevenue une page : même `ProductionPage` avec
  `stage`, en attente avec le nombre de mix finals tant que chaque titre n'a pas le sien) et
  **Master final**. Les validations du mix et du master restent dans leur page, jamais une
  étape. Les notifications du mastering ouvrent `/master/mastering` ; l'accusé de réception
  d'un dossier (`master_transmission_received`) ouvre toujours le Mixage, la notification ne
  disant pas quel tour (limite connue). `masterSteps(projectId, done)` accepte les étapes
  faites, branchées au lot 3.
  - **Master final** (`/master/final`) inchangé.

- **Qui voit, qui écrit** (décision du 04/10/2026, en attendant le DG) : pas de permission
  dédiée. La page se lit par **quiconque voit le projet** (DG, chef de projet, directeur
  créatif de l'équipe), comme Workflow. Au lot 1, rien ne s'écrit sur la page : chaque
  complément ouvre le formulaire de la fiche d'origine, sous **sa** permission
  (`manage_catalog` pour un titre, `manage_network` pour un contact), décidée par le serveur
  et revérifiée par la RLS. Les futures tables du Master (source confirmée, Brief Mix/Master,
  versions, retours) seront écrites par le **responsable du projet seul**
  (`is_project_owner`), comme le reste d'un projet lancé ; la décision finale sur une version
  reviendra au validateur désigné dans le Brief. Contrairement au Juridique, aucun poste
  absent (RAF, juriste) ne justifie d'exception.
- **Lot 1 : État du master** (`/master`, lecture). `loadMasterInventory` lit en une fois, en
  parallèle et avec la session de l'utilisateur (`lib/master-workflow/inventory-rows.ts`,
  une requête par table, pas de N+1) : état des titres, fichiers audio et stems
  (`master_files`), sessions, crédits de mix et de mastering du projet, Réseau, crédits de
  mix / mastering **reliés** à un contact sur tous les titres (l'historique). Chaque fait est
  classé par le code en connu / à confirmer / manquant (les trois niveaux partagés,
  `lib/facts/types.ts`) :
  - **Source du mix** (`lib/master-workflow/audio-source.ts`) : la dernière version audio, la
    plus avancée puis la plus récente comme sur l'onglet Audio (`byAudioProgress`). Un
    Master final est le résultat du workflow (connu, rien à confirmer) ; aucun fichier =
    manquant ; sinon la source se confirme (lot 2, ci-dessous). Puis la dernière session
    d'enregistrement (tout type sauf mixage et mastering, qui disent qui mixe ou masterise).
  - **Pistes et fichiers** : les stems du titre, comptés par série (dernière version de
    chaque fichier). « Production définitive », « voix définitives » ne se lisent dans
    aucune donnée : ce sont des questions du Brief Mix/Master, pas des faits inventés ici.
  - **Mix et mastering** : par rôle, le crédit (`mix_engineer`, `mastering_engineer`) et son
    lien au Réseau, par la même règle que le Juridique (`creditContactState`,
    `lib/facts/credit-contact.ts` : relié = connu, homonyme = « Relier », absent = « Ajouter
    au Réseau ») ; sinon l'ingénieur nommé dans une session de mixage / mastering, à
    confirmer en le créditant ; sinon manquant, avec le nombre d'ingénieurs du Réseau (on ne
    demande jamais si le Réseau en a un, le code le sait).
  - **Ingénieurs du Réseau** : les contacts au rôle `engineer`, ceux avec qui PDS a le plus
    travaillé d'abord (« Mix sur 2 titres · Mastering sur 1 titre », titres distincts), avec
    structure, ville, coordonnées. Les tarifs et disponibilités n'existent pas encore dans le
    Réseau.
- **Lot 2 : confirmer la source** (ticket § 1, migration `…20261004002001_master_flow_sources.sql`,
  tests `supabase/tests/master-flow.test.sql`). « Confirmer » ouvre la modale des versions
  audio du titre, la dernière détectée présélectionnée (« Utiliser cette version comme
  source ? »), les autres au choix (« Choisir une autre version ») ; « Utiliser cette
  version » enregistre (`confirmMasterSource`). Règles, toutes en SQL :
  - **le responsable du projet seul** confirme (`is_project_owner`) ; tout membre qui voit
    le projet lit la source ;
  - le titre appartient au projet (clé composite sur `project_masters`), le fichier est une
    version audio de ce titre et **jamais son Master final** (trigger
    `check_master_flow_source`) ;
  - **une ligne par confirmation, jamais modifiée ni supprimée** (ni `update` ni `delete`
    accordés) : la dernière fait foi, les précédentes sont l'historique. Changer de source
    est une nouvelle confirmation, jamais un remplacement silencieux. Retirer le titre du
    projet ou supprimer le fichier efface ses confirmations : la page redemande la source.

  États calculés par le code : pas de confirmation → « Source à confirmer » ; confirmée →
  « Source confirmée » (version, date, qui), « Changer » ; une version **reçue après** la
  confirmation et différente de la source → « Version plus récente reçue », à confirmer à
  nouveau : c'est la surveillance d'une condition que demande le ticket, sans tâche de
  fond, recalculée à chaque lecture. Pas encore dans l'Activité du projet (reconstruite
  depuis les tables, `lib/insights/activity.ts`).
- **Lot 3 : Brief Mix/Master** (ticket § 3, 4, 5, 7 ; `/master/brief`, migration
  `…20261005000101_master_briefs.sql`, tests `supabase/tests/master-brief.test.sql`). **Un
  Brief par projet** (les sources restent par titre) : écrit par le **responsable du projet
  seul**, lu par quiconque voit le projet (mêmes champs, verrouillés), jamais supprimé.
  `loadMasterBrief` réutilise la lecture de l'État du master (`readMasterRows`) plus le Brief
  et les directeurs créatifs, en un aller-retour. Dimensions :
  - **Source** : les faits « Source du mix », session et stems de l'État du master, avec
    leurs actions (confirmer la source sans quitter le Brief) ;
  - **Mix** : ingénieur choisi parmi les ingénieurs du Réseau (sa fiche s'affiche : structure,
    ville, coordonnées, titres déjà faits avec PDS), tarif estimé, révisions incluses (0 à
    20), **validateur** = le chef de projet ou un directeur créatif du projet (trigger
    `check_master_brief_validator`) ; « Ajouter un ingénieur » en tête de page sans perdre
    la saisie ;
  - **Mastering** : « Même ingénieur que le mix » (alors pas de contact de mastering,
    contrainte SQL) ou un autre ingénieur, tarif estimé ;
  - **Direction artistique** : références, direction, contraintes (2 000 caractères) ;
  - **Livrables** : liste fermée (Mix final, Master final, Instrumental, A cappella, clean,
    radio edit, live, TV mix, stems), Mix final et Master final cochés par défaut, rien
    d'imposé ;
  - **Calendrier** : la date du master final, puis Mix V1, Mix final, Mastering. Le code
    **propose** les trois dates (6, 3 et 1 jours calendaires avant, l'exemple du ticket :
    master final le 10 → 4, 7, 9 ; `proposeMasterCalendar`), « Utiliser ces dates » les
    applique, la personne les ajuste ; l'ordre est vérifié en SQL
    (`master_briefs_calendar_order`) et par le code avant (`calendarInOrder`) ;
  - **Budget estimé** : total des deux tarifs, calculé par le code.

  **L'ingénieur choisi est crédité** (audit du 06/10/2026,
  `…20261006002001_master_brief_engineer_credits.sql`) : le trigger `z_credit_engineers` de
  `master_briefs` ajoute un crédit `mix_engineer` / `mastering_engineer` **relié au contact**
  sur chaque titre actif du projet sans Master final qui n'en a pas encore ; ce crédit est
  marqué `from_brief` et remplacé si le Brief change d'ingénieur ; un crédit écrit à la main
  n'est jamais touché. Sans ça, le Juridique (qui ne lit que les crédits) ne prévoyait ni
  fiche ni contrat pour l'ingénieur, et l'État du master affichait « Personne ».

  **Avant le premier enregistrement**, le Brief part de ce que le projet sait : l'ingénieur
  de mix (ou de mastering) relié sur les crédits, s'il est le même sur tous les titres (et
  « même ingénieur » s'il fait les deux), le chef de projet comme validateur, Mix final et
  Master final comme livrables. Enregistrement : mise à jour, sinon création
  (`saveMasterBrief`) ; pas d'upsert, qui réécrirait `project_id` et `organization_id`,
  colonnes que personne ne peut modifier (droits colonne par colonne).
  Pas encore : la transmission au mixeur (package, suivi, relances, § 8), le Budget à
  quatre états (§ 9).
- **Lot 3 bis : remplir le Brief à la voix ou par un échange** (ticket § 3 « Commencer
  directement / Préparer un échange » ; migration `…20261005010001_master_brief_calls.sql`,
  tests `supabase/tests/master-exchange.test.sql`). Tout passe par un seul adaptateur,
  `masterBriefVoice` (`lib/master-workflow/voice.ts`, schéma fermé
  `lib/ai/schemas/master-brief.ts`, consignes `lib/ai/instructions/master-brief.ts`) :
  - **Ce que le modèle peut proposer** : réécrire références, direction, contraintes ;
    nommer l'ingénieur du mix ou du mastering ; dire « même ingénieur » ; recopier les mots
    d'un tarif ; ajouter un livrable de la liste. **Jamais** une date, un délai, un nombre
    de révisions, le validateur ni la source : une personne les décide.
  - **Le code décide** de ce qui est nouveau (doublons et non-changements écartés), de qui
    est l'ingénieur (nom comparé sans accents ni casse aux ingénieurs du Réseau ; un nom
    inconnu n'est pas proposé, on l'ajoute d'abord au Réseau), et **lit le montant d'un
    tarif dans les mots dits** (`parseSaidEuros`, « 800 euros » → 800 €), à la proposition
    puis de nouveau à l'application : aucun nombre ne vient du modèle ni du client. Une
    citation (et pour un tarif, le montant) introuvable dans ce qui a été dit → la
    proposition est décochée par défaut. « Même ingénieur » dit : pas de proposition
    d'ingénieur de mastering en plus.
  - **Dictée** : « Remplir en dictant » en tête du Brief, étape `master_brief` du moteur
    commun (`/api/voice/master_brief`, responsable seul).
  - **Préparer un échange** : une modale (titre, date, lien de visio, champs communs
    `CallFields` avec « Nouveau call ») montre l'ordre du jour **écrit par le code** à
    partir de ce que le Brief ne dit pas encore (`masterExchangeAgenda` : ingénieurs,
    tarifs et révisions, direction, livrables restés par défaut, date du master final,
    source à confirmer ; sinon « relire ensemble le Brief »), durée = somme des points.
    `create_master_exchange` (SQL, droits de l'appelant) crée le call et le rattache
    (`master_brief_calls`) dans une seule transaction, puis la page du call s'ouvre :
    enregistrement et traitement comme tout call. **Un échange n'est jamais importé dans le
    Brief du Cadrage** (`app/api/calls/[callId]/extract`).
  - **Proposer pour le Brief** : dans « Échanges », sur un call transcrit, la transcription
    passe par le même adaptateur (`proposeFrom`, la moitié extraction du moteur de dictée,
    `lib/voice/engine.ts`), puis la même relecture (`DictationReview`). « Appliquer »
    (`applyBriefProposals`) écrit les propositions gardées avec la session du responsable
    (mise à jour, sinon création avec le responsable comme validateur ; rien à écrire = rien
    d'écrit).
  - Robustesse du modèle (ministral-14b, 05/10/2026) : il imbrique parfois un texte dans
    sa propre valeur, sans la citation extérieure. Le schéma accepte les deux formes, le
    code (`textOf`) garde le texte intérieur ; les mises en forme (`*titre*`) sont retirées.
- **Lot 4 : transmettre au mixeur** (ticket § 8 ; étape **Mix**, `/master/mix` ; migration
  `…20261005011001_master_transmissions.sql`, tests `supabase/tests/master-transmission.test.sql`).
  L'ingénieur est un contact du Réseau, **sans compte** : le dossier l'atteint par un **lien
  privé**, sur le modèle des fiches de renseignements du Juridique (`/f/[token]`).
  - **Le dossier, montré avant l'envoi** (`loadMixView`, `PackagePreview`) : le destinataire
    (l'ingénieur du mix du Brief), les **titres à mixer** (ceux sans Master final) avec leur
    **source confirmée** et leurs stems (dernière version de chaque fichier), direction,
    références, contraintes, livrables, révisions, échéances Mix V1 et Mix final. **Les
    tarifs n'y sont pas** : ils restent internes. Ce qui bloque l'envoi est calculé par le
    code et dit en tête (pas d'ingénieur, rien à mixer, une source à confirmer).
  - **« Transmettre au mixeur »** (`transmitToMixer`) recalcule tout côté serveur, signe les
    fichiers **avec la session du responsable** pour 30 jours (aucun service role), puis
    `create_master_transmission` (SQL, responsable seul) : destinataire = l'ingénieur du
    Brief, lien précédent révoqué, **seul le SHA-256 du jeton est stocké**, le jeton n'est
    rendu qu'une fois. La modale affiche le lien une seule fois : « Copier le lien », « Écrire
    un e-mail » (mailto pré-rempli), « Fermer ». Le dossier est un **instantané** (`package`,
    JSON validé par `masterPackageSchema`).
  - **Page du mixeur** `/m/[token]` (sans session, `SESSIONLESS_PREFIXES`, jamais indexée,
    sans referrer) : `get_master_transmission` ne rend le dossier que pour un lien ouvert ou
    reçu, sinon « remplacé » ou « expiré » ; « J'ai bien reçu le dossier »
    (`acknowledge_master_transmission`, une seule fois) **notifie l'expéditeur**
    (notification `master_transmission_received`, lien vers l'étape Mix).
  - **Suivi** (`TransmissionHistory`) : un envoi par ligne, état **calculé par le code**
    (`transmissionState`) : reçu, en attente, **sans réponse depuis 3 jours → à relancer**
    (`REMIND_AFTER_DAYS`, décision du 05/10/2026 : le ticket ne fixe pas de délai, trois
    jours laissent passer un week-end), lien expiré, remplacé. **« Relancer »** = un nouvel
    envoi qui remplace le lien précédent et renouvelle les fichiers pour 30 jours.
    **« Renvoyer le dossier »** une fois le dossier reçu (nouvelle source confirmée, stems
    définitifs, lien expiré) : même envoi, dossier recalculé tel qu'il est ce jour-là ; les
    retours transmis restent lisibles (lus par projet, pas par envoi).
  - Ingénieur membre de l'équipe (« pour un utilisateur PO → Mon Travail ») : pas en V1, les
    ingénieurs sont des contacts du Réseau ; à brancher sur Travail le jour où l'un d'eux a
    un compte.
  - Notifications : `notifications_kind_check` redéclarée avec la liste du dépôt +
    `master_transmission_received`, **`NOT VALID`** (une base locale peut garder des types
    d'une branche abandonnée ; toute nouvelle ligne est contrôlée).
- **Lot 5 : budget à quatre états** (ticket § 9 ; migration
  `…20261005012001_budget_four_states.sql`, tests `supabase/tests/master-budget.test.sql`).
  Le Budget du projet entier passe à **Estimé → Proposé → Engagé → Payé** (`planned`,
  `proposed`, `committed`, `paid`) : « Prévu » devient « Estimé » (vocabulaire du ticket),
  « Proposé » = un devis reçu, pas accepté. **Un montant proposé ne consomme pas
  l'enveloppe** : il a sa tuile (`proposedCents`), le reste reste enveloppe − engagé
  (`budgetTotals`). Ton `proposed` = warning (attend une décision).
  - **Depuis le Brief** (section « Budget du projet », `BriefBudget`) : par rôle (mix,
    mastering), « Inscrire au budget » crée la ligne Estimé à partir du tarif **enregistré**
    du Brief (`addBriefRateToBudget`, libellé « Mix · ingénieur », famille Création &
    contenus), reliée au rôle par `budget_lines.master_role` (une ligne par rôle et par
    projet, index unique ; jamais déplacée). Son état se change sur place
    (`setBriefBudgetStatus`) ou dans le Budget, comme toute ligne. Si le Brief et la ligne
    divergent, la section le dit (« Le Brief dit 750 € ») sans rien écrire. Même ingénieur
    sans tarif de mastering : « compris dans le tarif du mix ». Total estimé du Brief
    calculé par le code (la somme de ses tarifs enregistrés).
- **Lot 6 : versions et retours du mix** (ticket § 10 ; section « Versions du mix » de l'étape
  Mix ; migration `…20261005013001_master_mix_versions.sql`, tests
  `supabase/tests/master-mix.test.sql`).
  - **Nouvel état audio `mix`** (Mix), entre la mise à plat et le master : une version du mix
    est une version audio du titre comme les autres (onglet Audio, onglet « Mix » du
    Catalogue, `y_advance_title` qui ne fait jamais reculer un titre). Décision du
    05/10/2026 : plutôt qu'une table de fichiers à part, qui aurait caché ces versions de la
    fiche du titre.
  - **À réception** (« Ajouter une version », l'import audio du titre, état Mix présélectionné) :
    le trigger `z_create_mix_versions` sur `master_files` crée la version
    (`master_mix_versions`) **dans chaque projet du titre qui a un Brief Mix/Master**,
    numérotée V1, V2… par titre et par projet, avec son auteur, sa date, son statut, et
    **notifie** les directeurs créatifs du projet et le validateur du Brief
    (`master_mix_version_received`, jamais l'auteur de l'envoi). Sans Brief enregistré, la
    section ne propose pas d'import (il ne créerait aucune version) et renvoie au Brief.
  - **Retours** : tout membre qui voit le projet commente une version (`master_mix_comments`,
    RLS `can_see_project`) — « les contributeurs commentent ».
  - **Synthèse** : le responsable l'écrit ; **« Proposer une synthèse »** fait rédiger PO
    (`proposeMixSummary`, schéma `lib/ai/schemas/mix-feedback.ts`, consignes
    `lib/ai/instructions/mix-feedback.ts`) à partir des commentaires passés **en données**
    (règle 4), sans auteurs, sans décision ; le texte remplit le champ, rien n'est écrit avant
    « Enregistrer la synthèse ». **« Transmettre les retours »** (`send_mix_feedback`,
    responsable seul, une fois, synthèse obligatoire) : la synthèse envoyée n'est **plus
    jamais réécrite** (RLS) et s'affiche sur la page du mixeur (`/m/[token]`, « Retours sur
    vos versions », renvoyés par `get_master_transmission`).
  - La validation d'une version (Valider / Demander une modification) et le Mix final
    viennent au lot 7.
- **Lot 7 : validation du mix, puis mastering** (ticket § 11 et 12 ; migration
  `…20261005014001_master_mix_decisions.sql`, tests `supabase/tests/master-decision.test.sql`).
  - **Qui tranche** : le validateur du Brief ; **sans validateur, le responsable du
    projet** (décision du 05/10/2026, le ticket suppose toujours un validateur désigné).
    `decide_mix_version` (SQL) vérifie qui, que la version est **la dernière** du titre et
    pas encore tranchée.
  - **« Valider ce mix »** (confirmation, définitif) : la version devient le **Mix final** du
    titre (un seul par titre et par projet, index unique) ; **« Demander une
    modification »** (note facultative) : la version reste dans l'historique, la suivante
    se tranche à son tour. Une décision ne change jamais (décision, note, qui, quand
    conservés). Une version reçue après le Mix final **ne le remplace pas** : la page le
    dit, sans bouton de décision. Le responsable est notifié de chaque décision prise par
    quelqu'un d'autre (`master_mix_approved`, `master_mix_changes_requested`).
  - **Mastering** (étape `/master/mastering`) : quand chaque titre à masteriser a son Mix
    final, le code l'écrit (« Le Mix final est validé. Le Mastering peut commencer. ») et
    nomme qui masterise (« même ingénieur que le mix : poursuivez avec X », ou l'ingénieur
    du mastering du Brief). Le dossier de mastering est le même mécanisme que celui du
    mix, par rôle (`loadStepView(…, "mastering")`, `transmitPackage`, `PackageSections`) :
    les Mix finals validés (au lieu des sources, sans stems), échéances Mastering et
    Master final, envoi **après confirmation humaine**, lien privé, suivi, relance. La
    page de l'ingénieur ne montre que les retours de sa propre étape.
- **Lot 8 : master final** (ticket § 13 ; étape `/master/final` ; migration
  `…20261005015001_master_mastering_versions.sql`, tests `supabase/tests/master-final.test.sql`).
  - Les versions ont une **étape** (`stage`) : un fichier audio **Mix** crée une version de
    mix, un fichier **Master** ou **Master final** une version de **mastering** ; numérotées
    dans leur étape, mêmes retours, synthèse, transmission et décision (section « Versions du
    mastering » de l'étape Mastering, libellés par étape `fr.masterWorkflow.mixVersions.stages`).
  - **Valider une version de mastering = le Master final** : `decide_mix_version` fait passer
    son fichier à l'état « Master final » et **le titre avec lui** (le Catalogue, l'État du
    master et le dossier du titre le voient). Un seul Master final par titre et par projet.
    Notifications `master_mastering_version_received`, `master_final_approved`,
    `master_mastering_changes_requested`.
  - **Étape Master final** (`loadFinalView`, `FinalPage`) : par titre, la version validée
    (fichier, qui, quand), l'ingénieur du mastering, l'état au Catalogue, puis **les autres
    livrables du Brief** (instrumental, clean, radio edit, stems…) que le responsable coche à
    leur réception (`master_deliverables_received`, les deux masters exclus en SQL : ce sont
    les résultats du workflow).
  - **Distribution** : la brique n'existe pas ; la page le dit. Le prérequis « Master final »
    se lira sur `masters.audio_state = 'final_master'` et la version validée, sans ressaisie.
- **Lot 9 : questions aux bonnes personnes** (ticket § 6 : « ne pas demander
  systématiquement toutes les informations au Chef de projet » ; section « Questions à
  l'équipe » du Brief ; migration `…20261005016001_master_brief_questions.sql`, tests
  `supabase/tests/master-questions.test.sql`).
  - **Qui est interrogé sur quoi : une règle du code** (`lib/master-workflow/questions-plan.ts`),
    pas un choix de PO (règle 6) : la **direction artistique** (vide au Brief) et les **autres
    livrables** (rien au-delà des deux masters) vont aux **directeurs créatifs du projet** ;
    ingénieurs, tarifs, calendrier et validateur restent au responsable, qui pilote. Une
    personne déjà interrogée sur un point ne l'est pas deux fois (une réponse « rien
    d'autre » compte).
  - **Le responsable pose les questions** (un geste humain, « Poser les questions ») :
    l'action recalcule le plan côté serveur (rien ne vient du client), puis
    `ask_master_brief_questions`
    vérifie le responsable et que chaque personne est directeur créatif du projet, crée la
    question et **une tâche de son Travail** (`tasks.master_question_id`, échéance J+3,
    notification `task_assigned` par le trigger des tâches). La tâche mène au Brief
    (`questionTaskHref`, Travail personnel et Travail du projet).
  - **La personne répond sur le Brief** (`answer_master_question`, une fois) : un texte pour la
    direction, des livrables cochés (aucun = « rien d'autre ») ; sa tâche est cochée dans la
    même transaction.
  - **Les réponses alimentent le Brief par le responsable** (`apply_master_question`, une
    fois) : la direction s'ajoute à ce qui est écrit, les livrables rejoignent ceux du Brief
    (créé avec ses valeurs par défaut s'il n'existait pas). Le formulaire est remonté à chaque
    enregistrement (`key = savedAt`) et repart du Brief à jour.
  - Lecture : quiconque voit le projet ; aucune écriture directe sur `master_brief_questions`.
- **Compléter depuis la page**, toujours avec le formulaire d'origine (`MasterFactAction`) :
  « Ajouter l'audio » (import audio du titre, état demandé), « Ajouter les pistes » (import
  de la bibliothèque, catégorie stems), « Ajouter une session » (`SessionForm`),
  « Créditer » (`ContributorForm` avec le rôle et l'ingénieur de la session pré-remplis,
  prop `initial`), « Relier » / « Ajouter au Réseau » (`components/network/`), « Ajouter un
  ingénieur » en tête du Réseau (formulaire de contact, rôle ingénieur, on reste sur la
  page). La page se rafraîchit après chaque écriture (`FileImport onAdded`, `router.refresh`).
- **Filtrer par état** (demande de Sacha, 04/10/2026) : les trois tuiles sont des filtres
  (`?state=known|to_confirm|missing`, `factTiles` et `filterFactSections`,
  `lib/facts/views.ts`) : seules les lignes de cet état, dans les blocs qui en ont ; le
  Réseau est masqué ; la tuile active (à l'encre) ramène à tout.
- **Une personne, plusieurs crédits** (retours de Sacha, 04 et 05/10/2026) : le même
  ingénieur crédité sur deux titres, ce sont deux crédits. **Créer le contact** (« Ajouter
  au Réseau », « Ajouter un ingénieur », ou depuis le Réseau) relie côté serveur **tous les
  crédits non reliés de ce nom** (sans accents ni casse), sur tous les titres
  (`lib/network/link-credits.ts`, appelé par `saveNetworkContact`, avec `manage_catalog`) ;
  la modale l'annonce avant d'enregistrer. **« Relier »**, pour un contact déjà au Réseau,
  relie d'un clic les crédits non reliés de ce nom **dans le projet**
  (`unlinkedCreditsByName`, `linkContributorContact` avec une liste), annoncé dans son
  titre. Un crédit déjà relié à un autre contact n'est jamais déplacé
  (`contact_id is null` dans la mise à jour).
- **Socle commun avec le Juridique** : `lib/facts/` (types de faits, `groupOf`, statut d'un
  crédit dans le Réseau, filtres par état), `FactTable` (`components/ui/fact-table.tsx`, l'action dessinée par
  `renderAction`), `factTone`, textes `fr.facts`, action `linkContributorContact`
  (`lib/catalog/master/contact-link-actions.ts`).
- **Depuis le Cadrage intelligent** (§ 6, 06/10/2026) : avant son premier enregistrement,
  le Brief Mix/Master part de l'ingénieur du mix et du mastering choisis au Cadrage (rôles
  tenus par un contact du Réseau) quand les crédits des titres ne le disent pas, et de la
  date du master final (échéance confirmée) (`framing-defaults.ts`). Le Master **se lance
  depuis le Plan du Projet** (§ 6 ter) : layout `master/` verrouillé tant que le plan ne l'a
  pas lancé, sauf s'il avait déjà commencé (Brief ou source confirmée).
- **Pas encore là** : la brique Distribution n'existe pas, ses exigences ne sont pas codées
  en dur (ticket § 14). Le
  Budget à quatre états (Estimé / Proposé / Engagé / Payé) étendra `budget_lines` au lot
  suivant ; le Brief n'en garde que les tarifs estimés.

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
- **Types de la base sans la CLI** (Windows) : le générateur du conteneur `pg_meta` est plus
  ancien que celui de la CLI et omet `isOneToOne` dans les relations (le typage des jointures
  casse). Ne pas remplacer `database.types.ts` par sa sortie : n'y reporter que les tables,
  colonnes et fonctions nouvelles.
- **`\d` dans un gabarit** : `` new RegExp(`\d…`) `` perd la barre oblique (une séquence
  inconnue d'un gabarit vaut la lettre seule) ; écrire `String.raw` (`lib/framing/said.ts`).
- Données de test locales : `admin@pds.test` / `Framing-test-2026!` (admin), projet
  « Lueur » ; `cp-conception@pds.test` / `Conception-test-2026!` (chef de projet, responsable
  de « Soleil noir — conception (test) »). Fictives uniquement : les paliers gratuits peuvent entraîner leurs modèles.
