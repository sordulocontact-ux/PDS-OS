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
| `…260927001101_framing_team_roles`, `…001201_framing_constraints`, `…001401_framing_guided_review` | Cadrage en relecture guidée (§ 6) : `project_team_members.role_key` (rôle fixe, au plus une ligne par rôle ; une personne peut cumuler plusieurs rôles, une ligne chacun, et « Attribuer » propose aussi les directeurs créatifs, du projet puis de l'organisation pour la direction artistique ou créative, `assignRole` avec `personId` : Sacha, 10/10/2026), table `framing_constraints` (une ligne par contrainte typée, provenance, relue comme les besoins), source `voice` et changement de type autorisés, droits colonne sur `role_key`, lignes figées une fois le Cadrage soumis (`framing_is_editable`). |
| `…260927001101_security_audit_fixes` | Correctifs de l'audit back du 27/09 : lecture des objets `artist-files` en **positif** (`manage_catalog`, ou une ligne `artist_files` visible — les contrats restent cachés) ; **Cadrage figé une fois soumis** (`framing_is_editable` : Brief, besoins, équipe écrits seulement en `not_started` / `in_progress`, policies restrictives insert + update) ; `project_masters` modifiable seulement avant lancement, sur un projet et un master non archivés (`project_masters_editable`) ; Web Push protégé par un secret serveur (§ 8 bis). Tests : `security-audit.test.sql`. |
| `…260927004101_project_drafts` | Brouillons du formulaire « Nouveau projet » (retour n°6, § 2 octies) : `project_drafts.form_values` (objet JSON, 64 Ko au plus), auteur posé par trigger ; lus, modifiés et supprimés par leur auteur seul, tant qu'il a `create_projects`. Tests : `project-drafts.test.sql`. |
| `…260927012001_catalog_file_library` | Bibliothèque de fichiers (retour n°6, § 2) : `artist_files.description` et `master_files.description` (précision libre, 200 car., `null` si vide) ; `manage_catalog` modifie nom, catégorie et précision (droits colonne, policies `*_update_catalog`), jamais un fichier audio de titre (`category <> 'audio'` avant et après) ; événement `file_updated` (`previous_category` si reclassé, privé si contrat avant **ou** après) ; lecture des objets `master-files` passée en positif comme `artist-files` (même faille que l'audit du 27/09). Tests : `file-library.test.sql`. |
| `…20261006000101_framing_intelligent` | Cadrage intelligent (§ 6) : `source_label` (field_values, needs, framing_constraints, project_team_members, vue `current_field_values` recréée), type de contrainte `human`, `project_team_members.contact_id` (Réseau), `framing_deadlines`, `report_items.brief_key` (genre `brief_fact`), `framing_briefs` (versions, `create_framing_brief`, `send_framing_brief`, `decide_framing_brief`, trigger `framing_brief_follow_validation`), `request_validation` refuse un Cadrage sans version (`brief_required`), `framing_key_dimension` / `framing_dimension_editable` + politiques restrictives par dimension, `framing_calls` + `create_framing_call`. Tests : `framing-intelligent.test.sql`. |
| `…20261006000201_project_plan` | Plan du Projet (§ 6 ter) : `project_plans`, `project_plan_items`, `workflow_is_launched`, `launch_project_plan`, `launch_plan_workflow` ; `start_stage` refuse la Stratégie sans plan (`plan_required`). |
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
- **Archiver une sélection** (demande de Sacha du 11/10/2026) : la barre de sélection
  propose « Archiver » avant « Supprimer » (« Restaurer » dans la vue Archivés), confirmé
  comme pour une ligne. `setManyArchived` (`lib/archive/actions.ts`) appelle les mêmes
  fonctions `set_*_archived` ligne par ligne avec la session : ce qui peut l'être est
  archivé, chaque ligne refusée (lancée, encore utilisée…) est signalée avec sa raison et
  reste cochée. Les brouillons de projet ne s'archivent pas : ils sont laissés de côté
  (le bouton disparaît si seuls des brouillons sont cochés).
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
  fermé, précision libre), **une ligne par rôle en base, une ligne par personne à l'écran**
  avec tous ses rôles (`groupContributors`, § 2 nonies), triés dans l'ordre des rôles.
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
  refusée. « Supprimer le brouillon » (confirmé) le jette ; dans la liste Projets, chaque
  brouillon a sa case à cocher comme un projet (retour du 11/10/2026) : son auteur peut en
  supprimer un ou plusieurs, mêlés aux projets cochés par le DG (`deleteProjectDrafts`, RLS
  de l'auteur ; `useDeleteRecords` envoie le reste à `delete_records`). Un brouillon supprimé ailleurs
  n'est jamais recréé par un onglet resté ouvert.
- Seulement sur la page « Nouveau projet » : pas dans le panneau ouvert par PO (son
  brouillon est déjà la carte de PO), ni pour modifier un projet.

### 2 nonies. Ne jamais faire retaper (test UX du 09/10/2026, section 8)

Migration `20261010002101_credits_at_creation.sql`, 11 tests pgTAP
(`credits-at-creation.test.sql`).

- **Crédits à la création d'un titre** : « Nouveau titre » (page et modale du projet) a un
  bloc « Crédits » (`CreditRowsField`) : une ligne par personne du Réseau (ou un nom), avec
  tous ses rôles ; envoyé en un champ JSON `contributors` à `create_master`
  (`p_contributors`), qui écrit une ligne par rôle dans la même transaction (titre refusé
  si un crédit n'a pas de rôle, `contributor_requires_role`). Une ligne incomplète passe en
  rouge à la validation, avec un `FormMessage` qui compte les manques.
- **Une personne, plusieurs rôles** : `ContributorForm` choisit les rôles en une fois
  (`OptionSelect multiple`) ; `set_master_contributor_roles` (security invoker) remplace les
  lignes de cette personne : un rôle gardé garde sa ligne (son id, ce que le Juridique y a
  relié), un rôle retiré est supprimé, un rôle ajouté est créé, jamais en double pour le même
  contact (ou le même nom sans contact). La fiche du titre montre une ligne par personne ; le
  « ⋯ » Supprimer retire tous ses rôles.
- **Rôle repris du Réseau** (`creditRolesOf`, `lib/catalog/master/contributor-groups.ts`) :
  auteur·rice-compositeur·rice → paroles + composition, beatmaker → composition + réalisation,
  réalisateur·rice → réalisation, musicien·ne → musicien·ne ; un·e ingénieur·e du son laisse le
  rôle à choisir (enregistrement, mixage ou mastering n'est pas su). Seulement quand aucun
  rôle n'est encore choisi par la personne ; toujours corrigeable.
- **Ce qui a été tapé est repris** : « Créer le titre « X » » depuis le sélecteur de titres
  du projet ouvre la modale avec « X » ; le nom du projet prend celui de son seul titre tant
  que personne n'en a tapé un autre (`onSelectionChange` de `MasterPicker`).
- **Contact homonyme d'un artiste** : à la création d'un contact du Réseau, une personne
  nommée exactement comme un artiste du catalogue y est reliée (correspondance du code, sans
  accents ni casse, jamais PO), dit à l'écran et « Retirer » ; la liste des artistes reste
  absente de la création (décision du 10/10/2026).
- **Nouvel artiste en un écran** : sans Deezer, une photo se choisit dans la modale (envoyée
  par le navigateur une fois l'artiste créé, dans la même soumission) ; le **contact
  principal** (manager par défaut) est une personne du Réseau (`ContactPersonFields`, e-mail
  et téléphone repris de sa fiche, modifiables), aussi sur la fiche artiste :
  `artist_contacts.contact_id` (`on delete set null (contact_id)` : le contact supprimé du
  Réseau reste un nom). Photo ou contact qui n'ont pas suivi : dit avant d'ouvrir la fiche.
  Le brouillon de PO garde la relecture des contacts un par un.
- **Participants des échanges préparés** (Cadrage, Stratégie) : une recherche sur l'équipe
  proposée par PO et le Réseau, ou « Ajouter « X » au Réseau » ; plus de nom libre.
  `participants` garde `{ name, contact_id? }` (`lib/calls/participants.ts`). Les calls et
  réunions planifiés passaient déjà par `AttendeesField` (§ 4 bis).
- **Fiche de renseignements v2** (`LEGAL_FORM_VERSION = 2`) : catégorie « Featuring » ;
  `prefill.answers` (`formAnswersOf`) pré-remplit le nom d'artiste et le nom à créditer
  (fiche artiste reliée par son contact, sinon le nom du crédit) et la catégorie
  (featuring / principal) ; les réponses déjà données par la personne priment. L'artiste
  principal crédité (auteur qui chante) a « Artiste interprète » coché sur sa fiche
  (`formRolesOf`), sans changer ses rôles du plan ni de la cartographie des contrats.
- **Parts Phono du bulletin SACEM** : la répartition confirmée est lue pour le titre dans
  **n'importe quel projet** (la dernière version confirmée) ; un créateur ou un éditeur
  ajouté à la main prend sa part ; un dossier enregistré avant la confirmation se complète
  là où la part est vide. **Décision du 10/10/2026** : sans répartition confirmée, les splits
  de la fiche du titre ne sont **pas** repris (non confirmés par les ayants droit), ce que le
  dossier dit. Les questions de PO au Juridique disent « featuring du titre ».
- **Piège corrigé** : quatre lectures de `master_contributors` triaient par `position`, une
  colonne qui n'existe pas sur cette table (PostgREST renvoie une erreur, donc aucun crédit) :
  le bulletin SACEM n'avait jamais ses créateurs, ni l'éditeur de répartition et les ayants
  droit d'un emprunt les personnes créditées. Tri par `created_at`.

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

## 4 bis. Calls planifiés comme sur Teams (10/10/2026)

Demande de Sacha : « un call comme sur Teams ». Deux vues de la page Calls, et une création
de call qui donne un lien Google Meet.

- **Deux vues** de `/app/calls`, choisies dans l'URL (`ViewToggle` dans l'en-tête) :
  **Calendrier par défaut** (demande de Sacha, 10/10) et **Liste** (`?display=list`, Tous /
  À venir / Passés). Le calendrier (`components/calls/calendar/`, places calculées par le
  serveur sur l'heure de Paris, `lib/calls/calendar.ts`) reprend Teams :
  - périodes **Semaine (défaut) et Mois** (`?mode=month&date=AAAA-MM-JJ`, sans `date` =
    aujourd'hui ; Jour et Semaine de travail retirés à la demande de Sacha, 10/10), « Aujourd'hui »,
    période précédente / suivante ; dans le mois, le numéro d'un jour et « n autres » ouvrent sa
    semaine ;
  - grille de 24 h défilante, arrivée sur 7 h 30 (ou le premier call), trait de l'heure actuelle,
    calls côte à côte quand ils se chevauchent (`dayEvents`), teinte du projet (`projectHue`) ;
  - **clic ou glisser sur une plage libre** → « Nouvelle réunion » sur ce créneau (pas de 30 min,
    un clic = 30 min ; Mois : un clic sur un jour = 9 h) ; un seul formulaire pour le bouton et la
    grille (`MeetingComposerProvider`) ;
  - **glisser un de ses calls** pour le déplacer (autre jour compris, pas de 15 min), **son bord
    bas** pour le rallonger, Échap annule ; affiché aussitôt puis enregistré
    (`rescheduleCall`, remis en place si refusé) ; Mois : glisser vers un autre jour, même heure ;
  - **clic sur un call** → sa fiche (`EventPeek`) : quand, projet, état, « Rejoindre »,
    « Ouvrir le call », « Modifier l'horaire » (le même déplacement au clavier, WCAG 2.5.7) ;
  - seul qui travaille sur le call le déplace (responsable du projet ou créateur de la réunion,
    RLS `is_call_owner`), et seulement avant tout enregistrement (`audio_path` nul) ; s'il a un
    événement Google, il suit (`moveMeetEvent`, Google prévient les invités) ; un refus de Google
    n'annule pas le déplacement, il est dit ;
  - sur téléphone, la période se lit en agenda de jours (`AgendaList`), sans geste.
  Non construit : annuler / supprimer un call depuis le calendrier, réunions récurrentes,
  disponibilités des participants, créer un call **de projet** depuis la grille (on crée une
  réunion interne).
- **Page d'un call = ses détails d'abord** (retour de Sacha, 10/10 : « quand je clique sur le
  call, les informations avec le lien Google Meet ») : `CallDetails` en tête de `CallWorkspace`
  (quand, rattachement, organisateur, **lien de visio écrit en clair** avec « Rejoindre » et
  « Copier le lien », participants membres et invités). L'enregistrement passe dessous, replié
  jusqu'à 15 min avant le call, réservé à qui y travaille ; un call qui a un lien de visio ne
  demande plus « visio ou sur place » (`videoCall` de `CallRecorder`). La fiche du calendrier
  (`EventPeek`) montre aussi le lien et « Copier le lien ».
- **Fiche du call pour l'extérieur** (retour du 10/10 : « partager le call à des personnes
  extérieures… heure, plan du call, durée et le lien ») : en bas de `CallDetails`, « Copier la
  fiche du call » et « Envoyer par e-mail » (`mailto:` adressé aux invités par e-mail, rien
  n'est envoyé par PDS OS). Le texte est écrit par le code (`lib/calls/sheet.ts`) : titre, jour,
  début – fin et durée (sans fin : durée estimée de l'ordre du jour), ordre du jour avec les
  minutes, lien de visio. Rien sur le projet ni l'équipe, et les questions préparées d'un point
  restent dans l'app. Pas de page publique : la fiche est un instantané, à recopier si le call
  bouge.
- **Créneau** : `calls.ends_at` (fin, après le début, vérifié en SQL ; 12 h au plus, vérifié
  par le code). Un call sans fin (antérieur, ou préparé depuis un workflow) dure son ordre
  du jour, sinon une heure (`callEndOf`). « À venir » et « Rejoindre » durent jusqu'à la fin
  du créneau : un call en cours se rejoint encore.
- **Création** (`CallPlanForm`, commun au « Nouveau call » d'un projet, à la « Nouvelle
  réunion » de la page Calls et au brouillon de PO) dans l'ordre de Teams : nom, participants,
  jour + début → fin (la fin suit le début en gardant la durée, durée affichée), visio. Champs
  manquants en rouge au premier essai seulement (`docs/DESIGN.md` § 4).
- **Participants** (`AttendeesField`) : une seule recherche sur les membres (l'équipe du
  projet pour un call de projet, proposés d'office comme avant) et le **Réseau**, ou une
  **adresse e-mail tapée** pour quelqu'un d'extérieur. Membres → `call_attendees` (notifiés
  dans l'app, inchangé) ; contacts et adresses → `call_guests` (e-mail en minuscules, une
  fois par call ; l'adresse d'un contact est relue dans le Réseau côté serveur, jamais prise
  du navigateur ; un contact sans e-mail est refusé). Lus par qui voit le call, écrits par qui
  y travaille (`is_call_owner`), supprimés avec le call.
- **Lien Google Meet** (`lib/integrations/google-calendar.ts`, seul point d'entrée) : à la
  création, PDS OS crée l'événement dans l'agenda du compte Google organisateur
  (`conferenceDataVersion=1`, `hangoutsMeet`, `sendUpdates=all`) : **Google envoie
  l'invitation par e-mail** au créateur, aux membres et aux invités ; le lien devient
  `meeting_url`, l'événement `google_event_id`. Le call est enregistré **avant** l'appel à
  Google : un refus ne perd jamais le call, sa page le dit (`?meet=failed`) et le lien peut
  être collé à la main. Décoché, ou sans Google configuré, on colle le lien d'un autre outil.
  Le créneau déplacé dans le calendrier met l'événement à jour ; changer les invités après
  coup, non (non construit).
- **Configurer Google** (facultatif, `.env.example`) : projet Google Cloud avec l'API Google
  Calendar, client OAuth « Desktop app », puis
  `node scripts/google-calendar-token.mjs <client id> <client secret>` connecté avec le
  compte qui organisera les calls (celui de l'agence) → `GOOGLE_CALENDAR_REFRESH_TOKEN`.
  Portée demandée : `calendar.events` seulement.

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
  **Parties impliquées** (`projectParties`, 10/10/2026) = tous ceux hors de PDS : crédits
  des titres, équipe confirmée tenue par un contact du Réseau ou un nom (jamais un membre de
  l'app), intervenants ajoutés au Juridique ; une ligne par nom (« – »), rôles fusionnés.
  **Contrats et droits à prévoir** en découle : « Un accord avec chaque partie : … », à
  confirmer (le type de contrat de chacun reste la cartographie du Juridique). Une valeur
  confirmée telle que le projet l'enregistrait (importée, avec `source_label`, sans
  citation) est **reproposée** si l'enregistrement a changé depuis, tant que le Cadrage est
  ouvert (une personne ajoutée à l'équipe après coup) ; une valeur écrite à la main, jamais.
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

- **Entrée** (ticket Stratégie, étape 1 ; migration `20261010000401_strategy_calls`) : le
  plan démarre l'étape (`launch_strategy` en cours), mais la page reste l'entrée tant que
  le responsable n'a pas ouvert le travail (`strategy_workspaces`, écrit par
  `start_strategy` seul ; les stratégies déjà travaillées ont été reprises par la
  migration). L'entrée montre le contexte (projet, artiste, type, date de sortie de
  référence, statut « Non commencée ») et deux portes : « Commencer la stratégie » et
  « Préparer un échange ». Aucun tableau de bord avant. Le lecteur (DG…) voit la même
  entrée sans bouton.
- **Préparer un échange** (`components/strategy/strategy-call-*`, `lib/strategy/call-prep.ts`,
  `prepareStrategyCall`) : le code propose l'objectif, les participants (responsable,
  directeurs créatifs, artiste), les sujets calculés depuis ce qui manque (champ vide ou à
  confirmer, besoin sans levier, levier à arbitrer, levier retenu sans livrable, date de
  sortie et temps forts absents ; 4 min par question, 5 à 15 par sujet), la date et le
  **format** (visio, sur place, téléphone ; lien seulement en visio). « Vérifier » affiche
  un récapitulatif, seul « Créer l'échange » crée le call (`create_strategy_call` : call +
  `strategy_calls` en une transaction, refusé avant le Brief validé et une fois la
  stratégie soumise). Le serveur recalcule l'ordre du jour, jamais envoyé par le client.
  Sujets et participants : composants partagés avec le Cadrage
  (`AgendaTopicsField`, `ParticipantsField`, `lib/calls/prepare.ts`).
- **Après un échange stratégie** (`/api/calls/[callId]/extract`) : le compte rendu remplit
  la Stratégie et non le Cadrage (`fillStrategyFromCall`, `lib/strategy/import-report.ts`) :
  l'entrée cède la place (`start_strategy`), les éléments du compte rendu deviennent des
  propositions sourcées (positionnement, publics, narratif, leviers), puis PO pré-coche les
  choix fermés appuyés par les sources (`proposeStrategyChoices`) : un même passage peut
  nourrir plusieurs dimensions. Le traitement ouvre ensuite la Stratégie. Seul le premier
  compte rendu d'un call est importé.
- **Pilotage** (ticket Stratégie, étape 2 ; migration `20261010000501_strategy_objectives`) :
  après « Commencer », la page centrale est une liste verticale des **8 dimensions**
  (`lib/strategy/dimensions.ts`) : Positionnement, Publics prioritaires, Narratif de sortie,
  Dispositif, Livrables engagés, Calendrier de lancement, Budget stratégie, Objectifs & KPIs.
  Chaque ligne : nom, résumé, état (**À compléter / En cours / À arbitrer / Complété**),
  calculés par le code (`dimensionStatuses`, ton `strategyDimensionTone`). « À arbitrer » =
  une proposition ou un choix attend une décision (proposition d'un call, choix pré-cochés,
  levier à arbitrer, devis à accepter, enveloppe dépassée). Au clic, la dimension **se déplie
  sur place** sous sa ligne, chevron à droite (`?d=<dimension>`, `AccordionSteps` + `AccordionRegion`, communs avec la Conception), une seule
  à la fois ; recliquer la ligne la replie. Plus de panneau latéral (demande de Sacha,
  10/10/2026). L'URL garde la dimension ouverte : un rechargement, le Brief de sortie ou le
  Planning (`?d=calendar`) la retrouvent dépliée, et sa ligne est ramenée à l'écran si une
  autre, repliée au-dessus, l'a décalée. **Enregistrer replie** : une réponse enregistrée ou
  confirmée (`StrategyChoices`, via `useCloseAccordion`) referme la dimension ; sans rien à
  enregistrer, « Terminé » prend la place du bouton. Les dimensions faites d'une liste
  (Dispositif, Livrables, Calendrier, Budget, KPIs) restent dépliées après chaque ajout, pour
  en saisir plusieurs (une dépense après l'autre au Budget), et se replient par « Terminé »
  en bas ou par la ligne. Les blocs existants (choix fermés, leviers, livrables, calendrier) y sont
  repris tels quels.
  - **Narratif** : 4 éléments de récit saisis à la main (`NARRATIVE_PARTS` : origine,
    ce qu'il raconte, contexte artistique, pourquoi maintenant, champs `field_values`
    `narrative_*`) + l'**angle** (le champ `narrative`, ses choix fermés). Gardés séparés
    pour être repris par le Plan de sortie, le Dossier de presse et les pitchs. Pas encore
    extraits des calls.
  - **Budget stratégie** = les **lignes du budget du projet** (`budget_lines`, page Budget),
    rattachées aux leviers : un seul budget, jamais deux qui divergent. Mêmes composants
    (`BudgetSummary`, `BudgetLines`). Les montants ne sont jamais lus par PO : « Préparer un
    échange » ne cite que les libellés.
  - **Objectifs & KPIs** : `strategy_objectives` (libellé, cible facultative, unité,
    échéance), saisis par une personne, jamais par PO ; écrits par le responsable
    pendant « en cours » (`strategy_is_editable`).
  - Les sujets de « Préparer un échange » suivent les 8 dimensions.
- **Dispositif** (étape 3) : chaque levier est **Retenu / À arbitrer / Non retenu**, les trois
  états côte à côte (`LeverStateControl`), un clic pour changer ; la base refuse de « dé-retenir »
  un levier qui porte des livrables (`lever_has_deliverables`). **Leviers courants en un clic**
  (`lib/strategy/lever-presets.ts` : social organique, influence, RP / médias, pitching
  playlists, partenariats, publicité en ligne, radio, live / showcase, clip / contenus vidéo),
  proposés par le code, ajoutés « à arbitrer », masqués une fois présents (même libellé, sans
  accent ni casse). Le détail opérationnel d'un levier retenu se traite dans Activations.
- **Livrables engagés** (étape 4 ; migration `20261010000601_strategy_calendar_channels`) :
  saisis par une personne (nature, **quantité** `strategy_deliverables.quantity` 1 à 99, levier
  retenu, responsable, échéance), groupés par levier retenu, modifiables en place
  (`lib/strategy/actions/deliverables.ts`). **Jamais de liste prédéfinie** : nombre et nature
  dépendent du projet. Titre avec quantité par `deliverableTitle` (« Capsules × 5 »), repris en
  Conception, qui lit ces livrables une fois la Stratégie validée.
- **Calendrier de lancement** (étape 5) : rétroplanning à deux niveaux, onglets **Temps forts**
  (J-n / J0 / J+n calculés par `dayOffset` depuis la date de sortie de référence) et **Par canal**
  (`milestones.channel` : Organique, Influence, RP / Médias, Sortie toujours affichés ; Live /
  Event et Autre seulement s'ils ont un temps fort). Chaque temps fort s'ouvre et se modifie
  dans la modale (`components/strategy/calendar/milestone-form.tsx`) : titre, **jour relatif
  « J-10 »** converti en date par le code (synchronisé avec la date), type, canal (suit le type
  tant qu'on ne l'a pas choisi), livrable qui sort ce jour-là, note (`milestones.notes`).
  Toujours saisi par une personne, jamais par PO.
  - **Échéances amont** calculées par le code (`lib/strategy/upstream.ts`) : pour chaque livrable
    rattaché à un temps fort, depuis le **premier** où il sort, conception terminée à J-21,
    production terminée à J-10, validation à J-4 (`UPSTREAM_LEAD_DAYS`, délais par défaut, à
    ajuster là). Une étape déjà passée alors que le temps fort est à venir est « Trop tard » ;
    la dimension Calendrier passe alors **À arbitrer**.
  - **Propagées vers le Planning** : type `upstream` de `lib/project-plan/timeline.ts`, avec le
    canal des temps forts ; un clic ouvre `/strategy?d=calendar`.
- **Budget stratégie** (étape 6) : lecture stratégie des `budget_lines` (`lib/strategy/budget.ts`,
  `strategyBudget`) : **proposé** = toutes les lignes, **validé** = engagé ou payé, **à arbitrer**
  = estimé ou devis, reste = enveloppe − validé ; **répartition par levier** (chaque levier
  retenu, même à 0 €, puis les autres leviers qui portent des lignes, puis « Hors levier »).
  Panneau : tuiles, tableau par levier, puis l'éditeur de lignes de la page Budget. La dimension
  est « À arbitrer » s'il reste un montant à arbitrer ou si l'enveloppe est dépassée.
  **Strictement interne** : dans le Brief de sortie, jamais dans le Plan de sortie ni le Dossier
  de presse (règle pour les générateurs à venir).
- **Objectifs & KPIs** (étape 7 ; migration `20261010000701_strategy_kpis`) : l'**objectif
  stratégique** est un champ texte (`strategic_objective`) ; chaque KPI est **quantitatif**
  (cible, unité, échéance) ou **qualitatif** (le signal attendu, sans chiffre : vérifié en SQL).
  Un KPI quantitatif peut être alimenté automatiquement par les **fans Deezer de l'artiste**
  (`source = 'deezer_fans'`, `lib/strategy/kpi-actuals.ts`), lus par le code **après la
  date de sortie** ; sans donnée : « Donnée indisponible ». Aucune valeur inventée, jamais par PO.
- **Brief de sortie consolidé** (étape 8, `/strategy/brief`, `components/strategy/brief/`) :
  établi quand **aucune dimension n'est « À compléter »** (`briefReadiness`, `lib/strategy/brief.ts`) ;
  sinon la page et le pilotage nomment les dimensions manquantes. Document interne de référence,
  rendu en direct depuis les données (les huit dimensions dans l'ordre), avec en tête **uniquement
  les éléments restant à arbitrer** (`arbitrations` : proposition à confirmer, choix pré-cochés,
  levier à arbitrer, échéance amont trop tard, budget à arbitrer ou dépassé), chacun menant à son
  panneau. **Modifier avec PO** = la dictée de la Stratégie (propositions relues avant écriture) ;
  **Demander la validation** = le circuit de l'étape (le DG décide), proposé seulement quand le
  Brief est établi ; le pilotage renvoie vers le Brief pour la demander.
- **Demande de validation et V1** (étape 9 ; migration `20261010000801_strategy_documents`) :
  « Demander la validation » (`requestBriefValidation`) relit la stratégie côté serveur, écrit un
  **instantané** (`lib/strategy/documents/brief-snapshot.ts`, même format pour le Brief en direct
  et chaque version, rendu par `BriefSnapshotView`), crée la version (`create_strategy_document`)
  et l'envoie (`send_strategy_document`) au **DG (toujours) + les directeurs créatifs du projet
  choisis**. Une validation de `launch_strategy` sans version de Brief est refusée en SQL
  (`validations_strategy_request`) ; la décision générique est refusée aussi
  (`validations_strategy_guard`) : chacun décide sur sa revue (`decide_strategy_document`).
  Pendant la revue : état « En attente de validation », stratégie figée, ni Plan ni Dossier
  final. Écran : valideurs avec leur état (Validé, En attente, Non commencé = revue annulée par
  une demande de modification), commentaires, **Relancer** (12 h minimum, notification),
  historique des versions. Une demande de modification (commentaire obligatoire) rouvre l'étape.
  Toutes les revues validées : étape validée, **« Brief de sortie — V1 »** figé dans
  `strategy_documents.content`, consultable par `?v=n`, **PDF** immédiat
  (`/api/projects/[id]/strategy-documents/[docId]`, `documentHtml` par type, budget inclus car
  interne), **Partager** = lien interne de l'app (jamais public). Notifications
  `strategy_review_*` (par trigger), ouvrant la version (`/strategy/document/[id]`).
  **Révision** : « Réviser la stratégie » (`open_strategy_revision`) rend la stratégie
  modifiable sans rouvrir l'étape ; V2 passe par le même circuit ; V1 reste la référence et
  n'est jamais écrasée.
- **Écran Stratégie validée** (étape 10) : trois documents (Brief de sortie ✓ Validé Vn ·
  Voir · Partager · PDF · Versions ; Plan de sortie, état ou « À générer » ; Dossier de presse
  « À générer · Bientôt »), puis la suite : Conception (contenus et assets des livrables),
  Activations (influence, RP, diffusion, partage), Planning (échéances et dépendances). Rien
  n'oblige à lancer la Conception. Le pilotage reste dessous, en lecture.
- **Plan de sortie** (étape 11, `/strategy/release-plan?step=1..8`,
  `lib/strategy/documents/release-plan-*`, `components/strategy/release-plan/`) : générateur en
  8 étapes (entrée avec ce qui est déjà validé et ce qui reste, phases proposées par le code
  depuis le calendrier — avant J-1 Teasing, J-1 à J+1 Sortie, après Amplification, modifiables
  —, contenus repris des livrables, univers visuel choisi parmi photo d'artiste, images du
  projet, artwork, dépôts et liens, direction proposée depuis les images derrière
  `proposeDirection` (`lib/strategy/documents/direction.ts`, technologie interchangeable),
  récapitulatif des pages (modifier, masquer, réordonner), génération, aperçu versionné).
  Brouillon dans `strategy_document_drafts` ; visuels autorisés copiés dans le bucket public
  `document-visuals` ; **un seul rendu HTML** (`releasePlanHtml`) pour l'aperçu, le lien public
  `/d/[token]` (`get_shared_strategy_document`, sans session) et le PDF ; **jamais de budget**
  (`assertNoBudget`) ; versions immuables, nouvelle génération = nouvelle version ;
  « Demander validation » par le même circuit que le Brief. Fermé sans Brief validé ou
  pendant qu'un Brief attend sa validation.
- **Dossier de presse** (étape 12, `/strategy/press-kit?step=1..8`,
  `lib/strategy/documents/press-kit-*`, `components/strategy/press-kit/`) : construit depuis le
  Brief validé, la **fiche Artiste** (`artistPresentation`, fonction isolée pour un futur Artist
  Deck / Kit Artiste réutilisable, non construit), le projet et sa sortie (date, format, label,
  UPC, titres et ISRC), les visuels choisis. Textes préremplis par le code (présentation de
  l'artiste : bio saisie, sinon Deezer, sinon Wikipédia ; actualité ; histoire ; narratif ;
  informations presse à écrire), modifiables, retirables. **Liens d'écoute** : seulement ceux
  que le projet détient (smartlink actif, URL de sortie confirmée, liens détectés, Spotify, Deezer
  de l'artiste), jamais inventés. **Contact presse** : le responsable par défaut, modifiable.
  Mêmes écrans que le Plan de sortie (prop `kind`), même rendu (`editorialHtml`), direction reprise
  du Plan. Jamais de budget, versionné, lien public `/d/[token]`, PDF, validation par le même
  circuit.
- **Documents finalisés** (étape 13) : sur l'écran Stratégie validée, chaque document montre sa
  version de référence et son état réel (À générer, Généré, En attente de validation, ✓ Validé,
  Modification demandée, « Vn en cours »), son public (Interne, Équipe artiste, Médias) et
  Voir · Partager (Brief = lien interne ; Plan et Dossier = lien public) · PDF · Versions
  (historique conservé). Les trois validés : titre « Documents finalisés ».
- **Suivi** (étape 14, `/strategy/follow-up`, ouvert une fois l'étape validée ; migration
  `20261010004001_strategy_follow_up`) :
  - **Avant la sortie** : uniquement Prêt / En cours / En attente / Bloqué, calculés par
    `lib/strategy/follow-up*.ts` (ton `followUpTone`), avec une raison écrite par le code, par
    domaine : contenus (livrables : livré → Prêt ; temps fort passé sans livraison ou échéance
    amont dépassée → Bloqué ; fichier à approuver / contrôler / livrer ou version de conception
    déposée → En attente ; sinon En cours), influence, RP, playlisting (leviers retenus dont le
    libellé correspond, pire état de leurs livrables), coordination (tâches, échéances amont),
    validations (documents et étapes en attente).
  - **Après la sortie** : chaque KPI face à sa **dernière donnée réelle** (fans Deezer lus par
    le code, ou valeur notée par une personne avec date et source dans `strategy_kpi_measures`),
    pourcentage et écart calculés par le code ; KPI qualitatif = signal à observer, sans chiffre ;
    sans donnée : « Pas encore de donnée ».
  - **Recommandations** fondées uniquement sur des données réelles (`follow-up-results.ts`) :
    KPI sous 80 % du prorata linéaire de sa cible, KPI manqué à l'échéance, échéance amont
    dépassée, temps fort passé sans livraison. **Appliquer** = tâche du responsable à J+7,
    **Ignorer**, **Parler à PO** (`AskPoButton`, question écrite par le code citant la donnée) ;
    `strategy_recommendations` empêche de reproposer.
- **Règles produit non négociables** (ticket Stratégie) : Brief = interne, Plan de sortie =
  équipe artiste, Dossier de presse = médias ; le budget n'existe que dans le Brief ; PO réutilise
  ce qui est connu avant de demander ; appels et documents préremplissent plusieurs dimensions ;
  validation humaine obligatoire avant V1 ; documents liés aux données et versionnés ; décisions
  → Conception, Activations, Planning ; Plan de sortie généré interactivement ; après lancement,
  suivi et adaptation ; PO n'invente aucune donnée ; **rien n'est codé en dur pour un artiste ou
  une sortie** (Piégée / Dioo ne sont que des exemples).
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
(404 avant lancement), titre = nom de la section (`ProjectPageTitle` dans le layout,
fil d'Ariane sur une sous-page), action éventuelle en `ProjectPageActions`. Tout ce qui est état, retard, décompte
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
de fuite par lien profond). Pas de fil d'Ariane pour l'instant (décision de Sacha).

**Lot 2** : Master en 4 chevrons (§ 8 septies) ; **Distribution** (remplacée depuis par les
cinq étapes du § 8 octies) = la page Sortie en deux étapes sans nouvelle capacité, **Préparation** (`/release`, identifiants et date) puis **En
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
de la Distribution et du Juridique. **Master et titres déjà au master final** (09/10/2026) : un
titre dont l'audio le plus avancé est un Master final n'entre pas dans le workflow (comme le
dossier du mixeur) ; si c'est le cas de tous, le Master lancé est Terminé avec la raison
« Chaque titre avait déjà son master final : rien à mixer ». Aucun chevron n'est coché tant
que le workflow n'est pas lancé ; la dépendance vers la mise en ligne lit le fait
(`mastersFinal`), pas les coches, et reste donc disponible. La page Master final montre alors le fichier
Master final du Catalogue et sa date (« Déjà au Catalogue le …, avant le workflow »), sans
l'ingénieur du Brief, au lieu de « Pas encore de master final validé ». Mixage et Mastering
disent « Rien à mixer » / « Rien à masteriser » (lien vers le Master final) au lieu du dossier
vide, et leurs compteurs ne comptent que les titres du tour (`roundCount`). **Bloqué** n'est produit par aucune règle tant que les
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
  (Windows), puis on y colle la capture. **Coller (⌘V / Ctrl+V) ailleurs n'ouvre jamais la
  fenêtre** : le collage va aux zones de dépôt de la page (ci-dessous). Dans la fenêtre, une **zone de
  dépôt** (`FileDropZone`) reçoit les captures glissées ou s'ouvre au clic sur le
  sélecteur de fichiers (plusieurs à la fois) ; une image lâchée ailleurs dans le
  formulaire est jointe aussi, plutôt que d'ouvrir l'image à la place de la page. Chaque
  image (PNG, JPEG, WebP, 5 Mo) part du navigateur vers le bucket privé `feedback-screenshots`, dans
  `<organisation>/<personne>/<uuid>.<ext>` (RLS : chacun son dossier ; lecture par
  l'auteur et le DG), avant l'envoi du retour ; un trigger refuse un chemin qui n'est pas
  celui de l'auteur. Chemins dans `feedback.screenshot_paths` (`text[]`, 5 au plus,
  vérifié par contrainte et par le code). Affichées par URL signée (1 h).
- **Coller dans une zone de dépôt** (partout dans l'app) : toute zone bâtie sur
  `useFileDrop` (`FileDropZone`, fichiers d'une fiche, source d'un modèle de contrat) prend
  aussi les fichiers collés (⌘V / Ctrl+V), vérifiés par l'appelant comme un dépôt
  (`components/ui/paste-targets.ts`, un seul écouteur). Un collage va à **une** zone : celle
  qui a le focus, sinon celle sous le pointeur, sinon la dernière touchée, sinon la première
  de la page ; seulement les zones de la couche active (la modale ouverte, sinon la page).
  Un texte collé dans un champ reste du texte (des cellules copiées portent aussi une image),
  et un collage déjà pris (formulaire de retour) n'est pas repris.
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
  (texte), **Transmis le** (date et heure, pour trier par le plus récent ; vues triées dessus), **Lien** (URL) ; facultative : **Captures** (fichiers et
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
  une personne ou une structure (organisation depuis le 11/10), des rôles parmi une liste
  fermée (artiste, beatmaker, musicien·ne, ingé son, label, éditeur… ; facultatifs et
  séparés du type de relation depuis le 11/10, ci-dessous), coordonnées,
  notes ; « Éditeur » (`publisher`, `…20261007000501_network_publisher_role.sql`) ajouté le
  07/10/2026 pour les emprunts : l'œuvre d'un sample s'autorise auprès de son éditeur, le son
  auprès de son label, deux structures ajoutées une fois au Réseau et choisies ensuite ;
  une personne peut appartenir à une structure du réseau (`parent_id`, vérifié par trigger),
  un contact peut renvoyer à un artiste du catalogue (`artist_id`), choisi à la
  modification seulement : la création ne liste pas les artistes (Sacha, 10/10/2026 ; un
  lien trouvé par PO est gardé). **Lu par tous les
  membres actifs** (c'est l'annuaire partagé), écrit par `manage_network`, **archivé, jamais
  supprimé**, par le DG (`set_network_contact_archived`, refusé tant qu'un contrat non résilié
  le nomme). Recherche instantanée, Archivés pour le DG ; onglets et filtres ci-dessous. **Onglet « Artistes »** (Sacha, 10/10/2026) :
  rôles Artiste et Beatmaker, les artistes à contacter un jour, ni signés ni en collaboration
  (ceux-là sont au Catalogue), repérés sur TikTok depuis le Labo (§ 10 bis) ou ajoutés à la
  main ; « Musique » garde musicien·ne, auteur·rice, ingé son, réalisateur·rice. **Réseaux**
  (`…20261010008001_network_socials.sql`, `lib/network/socials.ts`, test
  `network-socials.test.sql`) : pseudo TikTok et Instagram (minuscules), id d'artiste Spotify et
  Deezer, gardés comme identifiants (contraintes SQL), jamais comme URL libres ; le formulaire
  accepte « @pseudo » ou le lien collé, la fiche affiche les liens, la liste montre le TikTok
  quand il n'y a ni e-mail ni téléphone. Les contacts d'artiste (`artist_contacts`) et
  les intervenants cités restent à part : pas de fusion automatique en V1.
- **Personnes et organisations** (ticket « Retour PO / Réseau » du 11/10/2026 et retour
  Notion « Restructuration et enrichissement de la page Réseau » du 10/10,
  `…20261011200101_network_kinds_relations.sql`, test `network-kinds-relations.test.sql`) :
  « Structure » s'appelle **Organisation** à l'écran. Deux informations distinctes :
  **métiers** d'une personne ou **activités** d'une organisation (`roles`, une liste par type
  dans `lib/network/types.ts` : `PERSON_ROLES`, `ORGANIZATION_ROLES` ; Agence, Société de
  production et Entreprise ajoutées ; Management des deux côtés) et **type de relation**
  (`relations` : client, prestataire, partenaire, fournisseur, plusieurs à la fois) ;
  « Prestataire » et « Partenaire » ont quitté les rôles (déplacés par la migration).
  **Seuls le type et le nom sont obligatoires.** La liste des rôles par type est une règle du
  formulaire, pas une contrainte SQL : un rôle tenu avant le ticket et qui ne convient pas
  au type reste affiché et choisi jusqu'à ce qu'on le retire (rien n'est perdu sans être vu).
  Le formulaire s'adapte au type : une personne a une **organisation associée** (recherchée
  dans le Réseau, facultative) et peut être reliée à un artiste du catalogue ; une
  organisation n'a ni l'un ni l'autre (champs absents, ligne « Fiche artiste » absente de sa
  fiche, mis à vide par le serveur). **Changer le type** d'un contact enregistré dit d'abord
  ce qui part (rôles mis de côté, rendus si l'on revient au type d'avant, organisation
  détachée, artiste délié) et que contrats, crédits et historique restent ; une organisation
  qui a des personnes associées ne devient pas une personne (refus SQL, message clair).
  **Doublons** : à la création, les contacts du même nom (sans casse, accents ni séparateurs,
  ou mêmes mots dans un autre ordre, `lib/network/similar.ts`) sont signalés avec « Ouvrir la
  fiche » (nouvel onglet depuis un formulaire qui reste ouvert), jamais bloquants ; trouvés
  par le code, jamais par PO. **Onglets** : Tous / Personnes / Organisations / **Artistes
  repérés** (rôle Artiste ou Beatmaker et relié à aucun artiste du catalogue : un artiste
  repéré qui signe garde son contact, relié à sa fiche, et quitte l'onglet). **Filtres**
  (bouton « Filtres », un choix par axe, dans l'URL avec l'onglet, pastilles qui les retirent) :
  métier par domaine (Musique, Image & vidéo, Presse & influence, Affaires & conseil, Autres),
  type de relation, ville ; le statut actif / archivé reste la vue « Archivés » du DG.
  **Suppression** : un contact qui a des relevés datés (Marketing) n'est plus supprimable
  (ils partaient avec lui) : on l'archive ; contrats, crédits, parts et projets le
  protégeaient déjà (`contact_in_use`) ou gardent le nom.
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

### Allègement du test UX du 09/10/2026 (section 6)

« Complet mais lourd pour un non-juriste » (sévérité 2-3). Aucun changement de schéma.

- **Une ligne par personne, par titre** (`mergeSteps`, `lib/legal/plan/board.ts`) : la fiche puis
  le contrat d'une personne, la répartition puis le bulletin SACEM d'un titre, dans un seul
  panneau à étapes ; la ligne montre l'étape la plus urgente (décision > à faire > en attente >
  bloqué > fait), son badge préfixé (« Fiche · Envoyée »), son verbe, sa délégation. Sections :
  Personnes, Emprunts, Titres. Les actions du plan et les tâches ne changent pas.
- **Le panneau reste ouvert** : la ligne ouverte est celle du plan (`PlanSheetProvider`), écrite
  dans l'URL (`?ligne=`, `history.replaceState`, sans aller-retour) ; après une action, la page
  rafraîchie la rend ouverte même si elle a changé de groupe (toujours affichée, son repli
  ouvert). « Suivant : … » ouvre la prochaine ligne qui attend l'équipe dans la vue. Le lien d'une
  fiche préparée est gardé par le plan (survit au remontage).
- **Verbe qui agit** (`RowAction`) quand l'étape n'a rien à saisir : préparer la fiche, marquer
  envoyée, générer le contrat, le soumettre, envoyer la répartition (liens affichés une fois),
  ouvrir le bulletin ; le panneau s'ouvre ensuite sur le résultat. « Valider le document » garde
  son panneau (il faut lire le contrat).
- **Featuring** (`featuredArtists`, `lib/legal/forms/people.ts`) : un artiste en featuring est
  « Artiste interprète » dans le Juridique (fiche, plan, cartographie : le modèle interprète lui
  est proposé), sur la personne du contact relié à sa fiche artiste (`network_contacts.artist_id`,
  jamais par le nom) ou comme personne à part ; sans contact relié, « Ajouter au Réseau » (relié à
  l'artiste) avant toute fiche. Les rôles cochés sur une fiche complète comptent pour le contrat.
- **SACEM** : une phrase d'aide sous Qualité, Part Phono, Dénomination, et sur le partage DEP / DR
  (Règlement général) ; **parts Phono pré-remplies depuis la répartition confirmée** du titre,
  rapprochées par contact (décidé avec Sacha le 10/10/2026, contre la règle « jamais la
  répartition »), signalées « à vérifier » tant qu'elles ne sont pas retouchées ; « Qui signera le
  bulletin » nommé avant sa génération ; un éditeur signataire dit « Éditeur ».
- **Questions de PO** : ce que le Cadrage a confirmé (contraintes de droits nommant le titre, ou
  « aucun blocage » ; accords existants ou « aucun ») arrive comme réponse pré-remplie
  (`lib/legal/intake/cadrage.ts`), lue par PO puis gardée par une personne ; bouton « Aucun
  emprunt / Aucun accord / Pas d'éditeur » qui enregistre la réponse vide sans PO, et
  « Enregistrer : aucun … » quand PO n'a rien gardé.
- **Personnes déjà connues** (retour de Sacha du 10/10/2026, « le code connaît déjà des
  choses ») : la question « Qui a participé » part de ce que PDS OS sait du titre
  (`lib/legal/intake/known-people.ts`, lu par `known-queries.ts`) : ses artistes (interprètes),
  les ingénieurs de mix et de mastering confirmés au Cadrage (contacts du Réseau, appliqués à
  chaque titre du projet) et l'ingénieur noté sur une session d'enregistrement, de mixage ou
  de mastering. Ils sont écrits en tête de la réponse, une ligne par personne avec sa source ;
  la question devient « Qui d'autre a participé ? » (composition, texte, arrangement,
  production, musiciens : rien de cela n'est déduit). À l'enregistrement, le serveur relit ces
  personnes et relie le crédit d'un ingénieur du Cadrage à son contact (`contact_id` passé à
  `record_legal_answer`, migration `20261010001801`, gardé seulement pour un contact actif de
  l'organisation, jamais trouvé par le nom).
- **Échéances** (`lib/legal/plan/due-dates.ts`, décision du 10/10/2026, aucun ticket) : fiches
  aujourd'hui + 7 j, emprunts sortie − 45 j, contrats et répartitions − 30 j, SACEM − 15 j, jamais
  avant aujourd'hui + 3 j ; sans date de sortie, seules les fiches ont une échéance. **Jamais due
  avant ce dont elle dépend** (Sacha, 11/10/2026 : contrats au 13, fiches au 17) : au moins 7 j
  après la dernière échéance de ses dépendances, même au-delà de la sortie (`planDueDates`, aussi
  pour une action ajoutée après le lancement, qui part des échéances du plan).
- **E-mail** : « Envoyer par e-mail » (`mailto:`, `lib/utils/mailto.ts`) à côté de chaque lien à
  copier (fiche, répartition, dossier du mixeur), adressé au contact du Réseau. PDS OS n'envoie
  aucun e-mail lui-même (pas de fournisseur : point à trancher).

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
- **Cinq étapes depuis le 11/10/2026** (Sacha, après un proto comparant cinq placements du
  Brief) : **Source · Brief · Mixage · Mastering · Master final**, le parcours du ticket
  « Workflow Master ». Le Brief, rangé sous Préparation le 08/10, ne s'ouvrait que depuis la
  carte « Où en est la préparation » : il a maintenant son chevron (`/master/brief`, titre
  « Master » comme toute étape, plus de fil d'Ariane). **Source** = `/master` (la carte, puis
  l'État du master). Statut commun (`masterState`) : étape Source tant qu'une source n'est pas
  confirmée, Brief tant que le Brief ou son ingénieur du mix manque, puis **Mixage**, où se fait
  l'envoi au mixeur (raison « Dossier à envoyer au mixeur ») ; coche Source = toutes les sources
  confirmées, coche Brief = Brief enregistré avec son ingénieur, coche Mixage = envoyé et chaque
  mix final validé. L'échéance « Mix V1 » de la Vue d'ensemble reste affichée jusqu'à la première
  version du mix (le chargeur la retire alors), au lieu de disparaître à l'envoi.

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
    au Réseau ») ; sinon l'ingénieur **confirmé au Cadrage** (rôle d'équipe tenu par un
    contact du Réseau, `framingEngineers` de `readMasterRows`, « Désigné au Cadrage »), à
    confirmer par « Créditer » (formulaire de crédit pré-rempli et déjà relié au contact :
    un crédit est un fait du titre, posé par une personne, jamais automatiquement) ; sinon
    l'ingénieur nommé dans une session de mixage / mastering, à confirmer en le créditant ;
    sinon manquant, avec le nombre d'ingénieurs du Réseau (on ne demande jamais si le Réseau
    en a un, le code le sait). Le Brief lit la même équipe du Cadrage (même lecture), pour que
    les deux pages disent la même chose (retour de Sacha du 10/10/2026).
  - **Ingénieurs du Réseau** : plus affichés sur la Préparation depuis le 10/10/2026 (liste
    sans action, doublon du choix de l'ingénieur) ; leur historique avec PDS (« Mix sur 2
    titres · Mastering sur 1 titre », `networkEngineers`) est montré dans le Brief, là où on
    les choisit. Les tarifs et disponibilités n'existent pas encore dans le Réseau.
- **Lot 2 : confirmer la source** (ticket § 1, migration `…20261004002001_master_flow_sources.sql`,
  tests `supabase/tests/master-flow.test.sql`). « Confirmer » ouvre la modale des versions
  audio du titre, la dernière détectée présélectionnée (« Utiliser cette version comme
  source ? »), les autres au choix (« Choisir une autre version ») ; « Utiliser cette
  version » enregistre (`confirmMasterSource`). Une version absente de la liste s'importe
  depuis la modale (« Importer une version » : le même import audio que l'onglet Audio du
  titre, `manage_catalog`, le fichier reste au titre) ; revenue avec la page rafraîchie, elle
  est présélectionnée (10/10/2026). Règles, toutes en SQL :
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

## 8 octies. Distribution : dossier, dépôt manuel déclaré, plateformes, clôture

Ticket « Distribution » (11/10/2026), livré en 7 lots. **Décision V1 : PDS OS prépare, contrôle et
suit un dépôt MANUEL dans The Orchard ; il n'envoie rien, n'importe rien, ne lit aucune capture**
(CA07, CA18). Le module référence ses sources (Catalogue, Master, Juridique, Conception, Projet) et
ne les recopie jamais en données modifiables (CA03) ; seuls ses paramètres propres et les
déclarations des personnes sont stockés. Aucun état n'est déduit d'un autre (§ 7) : chaque état lit
ses propres déclarations. Rappel « dépôt manuel, rien n'est transmis » en tête de chaque étape.

**Cinq chevrons** (`lib/ui/distribution-steps.ts`, `/release/…`) : Préparation · Dossier · Suivi ·
Plateformes (`/online`) · Clôture. L'ancienne livraison (`record_release_delivery`,
`confirm_release_online`, `DeliveryCard`) n'a plus d'écran : remplacée par le dépôt déclaré et les
plateformes. Ses colonnes de `releases` restent (données), plus rien ne les écrit depuis l'app.

- **Préparation** (`/release`) : contrôle de préparation calculé par le code
  (`lib/distribution/readiness.ts`, pur, lu par `lib/distribution/sources.ts`) classé par module
  source, chaque élément avec sa provenance, son état (Validé à la source, Disponible — module
  sans validation —, Non validé, Manquant, Accès restreint), sa date et « Corriger » vers le module
  propriétaire ; en tête, l'état du § 7 calculé par le code : À préparer (aucun élément bloquant
  prêt), Incomplet, Prêt pour contrôle (jamais en vert : ce n'est pas une validation). Bloquent : titre et artiste principal, ISRC, compositeur ou auteur, ligne ℗ (par
  titre), master final (validé ou déjà au Catalogue), pochette validée, sortie et date. Ne bloquent
  pas : UPC, actions juridiques autres qu'un emprunt (le Juridique ne se lit qu'avec
  `manage_legal`, sinon « Accès restreint »), contraintes de droits du Cadrage. **Pochette** : la
  Fiche Livrable de la Conception choisie dans les paramètres, sinon devinée par son titre
  (« pochette », « cover », « artwork ») et signalée comme telle — la Conception n'a pas de type
  « pochette ». Puis le formulaire de la sortie (identifiants, date), inchangé.
- **Dossier** (`/release/dossier`) : validation, six contrôles, paramètres, puis le **dossier de
  livraison** en sections proches de The Orchard (Release, Tracks, Artwork, Territories & Rights,
  Pricing & Dates, Notes ; `lib/distribution/delivery-file.ts`), chaque champ avec sa source.
  **Paramètres** (`distribution_dossiers`, une ligne par projet, responsable seul, droits colonne par
  colonne) : territoires (monde / seulement / monde sauf, codes ISO), précommande et avant-première
  (oui / non / à renseigner, date facultative), catégorie tarifaire (Front, Mid, Budget, à
  confirmer), notes, pochette. **Six contrôles** (`distribution_checks`,
  `record_distribution_check`, responsable ou validateur désigné) : Non vérifié / Conforme / Non
  conforme (note obligatoire) / Non applicable, qui et quand écrits par la base ; à côté, le
  **calcul de PDS OS** (`lib/distribution/checks.ts`) — Cohérent, Écart ou « À confirmer par une
  personne », jamais « Conforme » : Droits et territoires n'est jamais « Cohérent » (aucun droit
  structuré par territoire n'existe). **Validation** : le responsable désigne le **validateur
  Distribution** parmi les détenteurs de `validate`, jamais lui-même (lecture la plus stricte du
  § 11 tant que la séparation n'est pas arbitrée) ; sans lui, rien ne peut être demandé.
  `submit_distribution_version` fige une **version** numérotée avec l'**instantané** construit par
  le serveur (`snapshotOf`) ; refusée tant qu'un élément bloque, qu'un paramètre manque, qu'un
  contrôle est non conforme ; les contrôles non vérifiés sont dits, pas bloquants.
  `decide_distribution_version` (validateur demandé seul, refus motivé). Paramètres figés tant
  qu'une version attend ou est validée (policy restrictive `distribution_dossier_editable`).
  **Écarts depuis la version** (`snapshotDrift`) : ce qui a changé à la source depuis la Vn (§ 13).
- **Suivi** (`/release/tracking`) : `distribution_declarations`, jamais réécrites — dépôt manuel
  (après validation seulement, CA06), réception, corrections demandées (note obligatoire),
  acceptation, livraison aux plateformes ; date indiquée, identifiant The Orchard et **preuve**
  (fichier du bucket privé `distribution-proofs`, envoyé par le navigateur puis enregistré, ou lien
  https) facultatifs, leur absence affichée (CA08). Badges « Déclaré, sans preuve » / « Déclaré,
  preuve jointe », jamais verts. Une erreur se **retire** (motif), elle reste barrée dans la
  chronologie. Un cycle = une version déposée. **Anomalies** (`distribution_anomalies`) : type,
  description, plateforme, gravité, module où corriger (lien vers lui, CA12), état suivi (ouverte →
  en correction → résolue / écartée, motif). **Nouvelle version** (`prepare_distribution_version`,
  depuis la validation du Dossier) : la version validée est marquée remplacée avec son cycle, les
  six contrôles repartent à « non vérifié » (anciens résultats dans l'historique), CA13.
- **Plateformes** (`/release/online`) : `distribution_platforms` — Spotify, Apple Music, Deezer,
  YouTube Music, Amazon Music, d'autres par leur nom ; lien officiel et disponibilité déclarée
  (responsable), **vérification** (disponible / indisponible) et **conformité** (conforme / non
  conforme) par une personne qui a ouvert le lien, qui et quand, et ses anomalies ouvertes (§ 12,
  traitées dans le Suivi). Un nouveau lien remet les deux à vérifier. **Disponibilité publique** (`lib/distribution/platforms.ts`) : non déclarée → déclarée
  (déclaration « available » du cycle, ou une plateforme déclarée) → vérifiée partiellement →
  vérifiée (les cinq de référence vérifiées par une personne, CA16). La **détection** existante
  (cron, `release_links`) ne fait que **suggérer** un lien ; le smartlink reste. Le dossier de presse
  lit les liens vérifiés.
- **Clôture** (`/release/closure`) : `distribution_closures`. Le responsable propose, le validateur
  désigné décide (refus motivé). **Normale** seulement si tout est rempli (même règle en SQL,
  `distribution_closure_ready`, revérifiée à la décision) ; sinon **avec réserves** : réserves
  calculées par le serveur (`lib/distribution/closure.ts`) et regroupées par cause — les cinq
  plateformes non vérifiées font une seule réserve, détail gardé —, arbitrage et case « ces réserves
  restent non vérifiées » obligatoires. « Clôturée avec réserves » n'est jamais en vert ni dit
  « distribué ». **Rouvrir** (motif) ajoute la réouverture sans effacer la décision.
  **Historique** : `distribution_events`, écrit par les fonctions et triggers seuls, rendu en
  phrases (`lib/distribution/history.ts`) : qui, quoi, quand, avec ou sans preuve (CA17).
- **Statut commun** (`distributionState`, `rules.ts`) : Préparation → Dossier (à soumettre, en
  attente, refusée) → Suivi (dépôt à déclarer — Bloqué si une dépendance manque —, en attente du
  distributeur, corrections) → Plateformes (n sur 5 vérifiées) → Clôture (en attente) → Terminé
  (« Clôturée normalement » ou « Clôturée avec réserves (n) »). Coches : prepare, dossier (version
  validée), tracking (accepté et livré déclarés), online (5 vérifiées), closure.
- Migrations `20261011100101_distribution_dossier` à `…100601_distribution_closure` (7 lots) ;
  tests `supabase/tests/distribution.test.sql` (103, fixture Piégée simulée).

## 8 nonies. Marketing : Production et Suivi & bilan

Même test UX : « Production » et « Suivi & bilan » n'avaient pas de page, un contenu ne pouvait être
ni livré ni clos. Migration `20261010000301_production_delivery_and_review.sql`.

- **Production** (`/production`, `lib/production/`) : la tranche du ticket « Workflow Production
  complet » qui termine le parcours, § 20 : par livrable engagé dans la Stratégie, sa source créative
  (version validée en Conception), un **fichier final** (lien https vers les exports), puis **trois
  décisions distinctes et dans l'ordre**, chacune avec qui et quand : version finale validée (le
  responsable ou un directeur créatif du projet), exports contrôlés, livré (le responsable). Un
  nouveau fichier annule les décisions du précédent ; « Rouvrir » aussi. Écritures seulement
  pendant l'étape `production` (démarrée par le responsable, validée par le DG comme les autres) ;
  sa validation est refusée tant qu'un livrable n'est pas livré (`deliveries_open`).
- **Préparation d'un livrable, lot 1** (parcours 1 à 3 du ticket ; `/production/[deliverableId]`,
  `lib/production/sheet.ts`, `components/production/prep/`, migration
  `20261010003001_production_preparation.sql`, tests `production-preparation.test.sql`) :
  - **Entrée** : depuis la liste Production, « Préparer » sur un livrable dont une version est
    validée en Conception (la « Fiche Livrable validée » : faute de fiche dédiée côté Conception
    à ce jour, c'est la dernière `design_versions` approuvée). `production_sheets` (une par
    livrable engagé) garde la **version source** ; une version validée plus tard est signalée,
    jamais substituée. L'**héritage** est lu, jamais recopié ni redemandé : levier, quantité,
    échéance, responsable, intentions confirmées (livrable puis direction), références, dates du
    calendrier rattachées, budget du levier (totaux par le code), dépendance à la version, points
    ouverts (sujets sans réponse confirmée, propositions de PO non confirmées). Durée, ratios et
    sous-titres n'existent pas encore en Conception : affichés « Non renseigné ».
  - **Trois modes** (`open_production_sheet`) : direct, call, import. Le choix n'agit qu'à
    l'intérieur de PDS OS ; le premier démarre l'étape `production` (comme `start_design`),
    changer de mode garde le brief et les équipes.
  - **Brief réalisateur** (colonnes de `production_sheets`, `save_production_brief`) : intention de
    mise en scène, découpage, dispositif caméra, son, déroulé, contraintes, références, besoins à
    confirmer. Trois choix fermés (plan-séquence / découpage / mixte ; une ou plusieurs caméras ;
    playback / captation live / mixte) qui servent aux suggestions de postes. Écrit par le
    responsable ou par le **réalisateur désigné** s'il est membre (`set_production_director`,
    membre ou contact du Réseau, le responsable seul le désigne).
  - **Besoins humains** (`production_needs`, `production_assignments`) : cinq familles séparées
    (Réalisation, Équipe image, Équipe son, Musiciens / artistes, Production et régie), postes
    préréglés par famille + « Autre » avec libellé (même liste en SQL et dans
    `lib/production/roles.ts`), **spécialité** pour un musicien ou artiste (« Guitare » n'est pas
    une catégorie). PO suggère des postes **calculés par le code** depuis les choix fermés
    (`suggestNeeds`, jamais stockés) et des **profils connus** (contacts du Réseau du bon rôle) ;
    seul le responsable ajoute un besoin, fixe le nombre, affecte et confirme une disponibilité
    (qui / quand écrits par trigger). Une personne peut tenir plusieurs postes ; un poste n'a
    jamais plus de personnes que son nombre (`need_full`, `headcount_below_assigned`). Le
    réalisateur reste sur le brief : Réalisation l'affiche en tête, sans doublon.
  - **Call de production** (`production_calls`, `create_production_call`, `lib/production/call-prep.ts`) :
    sujets calculés par le code depuis ce qui manque (rubriques du brief, réalisateur, familles sans
    poste, postes non pourvus — un « indisponible » ne compte pas comme affecté —, disponibilités à
    confirmer), ordre du jour recalculé côté serveur ; détails affichés sur la page du call. Le
    traitement du compte rendu en plan d'actions vient au lot suivant.
  - **Importer une organisation** (`lib/production/import.ts`, `import-verify.ts`) : le texte collé
    (≤ 20 000 caractères) n'arrive qu'en message utilisateur, jamais dans le prompt système ; PO
    propose des valeurs du brief et des besoins, chacun avec une citation d'au moins 3 mots retrouvée
    dans le texte (`locateQuote`), sinon écartée ; un nombre dans un texte proposé doit figurer dans le
    texte collé ; jamais de nombre de personnes ni de nom (un intitulé ou une spécialité avec un chiffre
    est écarté) ; poste inconnu → « Autre » s'il a un intitulé. Une rubrique déjà renseignée est
    montrée avant → après, décochée par défaut. **Rien n'est stocké avant « Appliquer »** (ni le texte
    ni les propositions) ; l'application insère les besoins puis fusionne le brief (deux écritures,
    mêmes droits).
  - Tout s'écrit pendant l'étape `production` en cours, se lit par quiconque voit le projet ;
    tables en `revoke all` puis droits colonne par colonne (piège : sans `revoke`, les privilèges
    par défaut de Supabase donnent tout à `authenticated`).
- **Source = la Fiche Livrable transférée** (migration `20261010006201_production_post.sql`) :
  `open_production_sheet` prend d'abord le dernier `design_handoffs` du livrable (via `design_sheets` →
  `design_deliverables.strategy_deliverable_id`), sinon la version validée en Conception (repli du
  lot 1). `production_sheets.handoff_id` garde le transfert d'origine ; un transfert plus récent est
  signalé, jamais substitué. Le snapshot (`design_submissions.snapshot`) est lu par
  `lib/production/fiche.ts` : durée, ratios, sous-titres, dates, budget prévisionnel, contraintes,
  dépendances, points laissés à la Production, références, éléments d'une série.
- **Lots 2 à 4 : une fiche, cinq onglets** (`/production/[deliverableId]` + `/preproduction`, `/shoot`,
  `/post`, `/delivery`, mise en page commune `layout.tsx` : en-tête, source, **phase calculée** par
  `lib/production/phase.ts` — À préparer → Préproduction → Prête pour tournage → Tournage en cours →
  Tournage terminé → Postproduction → Contrôle final → Livrée → Transmise à Activations, chaque phase
  lue dans ses propres données, jamais stockée). Dates et enveloppe : celles de Production si elles
  sont saisies, sinon celles de la Fiche, divergence affichée (`lib/production/logistics.ts`).
  - **Préproduction** (`20261010006001_production_preproduction.sql`) : briefs d'équipe
    (`production_team_briefs`, champs propres à l'équipe + extrait calculé ; « Transmettre » garde un
    instantané et la version source) ; ce que produit le call technique (`production_call_items` :
    décision, hypothèse, action proposée, point à arbitrer, provenance manuelle ou compte rendu cité,
    une proposition de PO reste « proposée » jusqu'à une décision humaine) ; plan de préproduction
    (`production_plan_actions` : brouillon / approuvée / retirée, pressenti, échéance, dépendances,
    bloquant ; une action approuvée ne devient une tâche de Travail que par `create_production_task`,
    confirmation explicite, membre et date obligatoires) ; fichiers (`production_files`, bucket privé
    `production-files`, 500 Mo, dépôt par le responsable, `lib/production/files/`) ; matériel
    (`production_equipment`, Besoin → Devis reçu → À vérifier → Retenu → Réservé confirmé → Récupéré →
    À rendre → Rendu / Incident ; qui a vérifié une ligne lue sur un devis et qui a confirmé un retour
    sont écrits par trigger ; MVP sans extraction IA des devis) ; budget (`production_budget_lines`,
    Prévu / À estimer / Estimé / À arbitrer / Validé / Engagé, seul « À estimer » sans montant ; ce n'est
    pas la Finance : `budget_lines` restent les engagements du projet) ; feuille de service
    (`production_call_sheets`, équipe et matériel lus dans leurs tables) ; contrôle avant tournage
    (`production_readiness_checks` : lieu, équipe, matériel, planning, budget, feuille de service,
    autorisations — facultatives par défaut ; `mark_production_ready` refuse tant qu'un contrôle requis
    n'est pas confirmé, retirer ou exiger un contrôle rend la fiche non prête).
  - **Tournage** (`20261010006101_production_shoot.sql`) : `production_shoots` (prévu, en cours, terminé,
    partiel, reporté, interrompu ; démarre seulement si la fiche est prête ; partiel ou interrompu exige
    les séquences manquantes) ; trois déclarations séparées — rushes vidéo, sources audio, sauvegarde
    vérifiée — tamponnées qui / quand, **jamais présentées comme un contrôle des fichiers** ; compte
    rendu validé par le responsable, rouvert si le tournage change ensuite ; incidents
    (`production_incidents` : impact, suivi, résolution écrite = résolu ; bloquer la clôture ou la
    postproduction est un choix humain).
  - **Postproduction et livraison** (`20261010006201_production_post.sql`) : références et étapes
    (`production_post_references`, `production_post_steps`, intervenant membre ou contact du Réseau,
    jamais par défaut) ; versions illimitées (`production_versions`, numérotées par la base, seul un
    brouillon se modifie ou se supprime, une version sans fichier ni lien n'est jamais soumise) ;
    « Soumettre pour retours » et « Soumettre à validation finale » distincts
    (`submit_production_version`) ; retours horodatés ou généraux (`production_version_comments`,
    « corrigé déclaré » passe par « à vérifier ») ; décision du validateur créatif — responsable ou
    directeur créatif du projet — Valider / Demander des corrections / Refuser
    (`decide_production_version`, raison obligatoire sauf pour valider ; valider enregistre la décision
    créative sur `deliverable_deliveries.version_id`, qui n'exige plus de lien) ; contrôle technique
    (`production_export_checks`, une ligne par fichier attendu, proposée depuis la Fiche par
    `expectedExports`) ; `advance_deliverable_delivery` : avec une fiche de production, « approve » est
    refusé (la décision est sur la version) et « Exports contrôlés » exige toutes les lignes conformes ;
    transmission à Activations (`production_activation_handoffs`, `transmit_to_activations`, seulement
    une fois livré : une référence à la version livrée, rien n'est publié).
  - Tests : `supabase/tests/production-workflow.test.sql` (parcours Piégée, 32 assertions).
    Garde-fous ajoutés par `20261010006301_production_delivery_guards.sql` : « Exports contrôlés »
    refuse une ligne contrôlée avant la dernière validation de version ou le dernier fichier final
    (« à revérifier ») ; retirer une ligne après le contrôle le rouvre.
- **Décisions prises faute de règle dans le ticket (10/10/2026)** :
  - *Préproduction* (`lib/production/preprod/`) : navigation par tuiles liées aux ancres (pas de second
    niveau d'onglets). Extrait de chaque brief d'équipe calculé par le code ; Production et régie ne
    reçoit ni donnée créative ni budget ; « À retransmettre » quand le contenu diffère de
    l'instantané ; rien n'est envoyé par e-mail. Call technique : six sujets pré-remplis depuis ce qui
    manque, seuls ceux qui ont des questions cochés. `fillProductionFromCall` lit le premier compte
    rendu d'un call de production une seule fois : une proposition n'est gardée que si sa citation
    (≥ 3 mots) est retrouvée dans l'élément source et si chaque nombre y figure ; 40 au plus ; sujet le
    plus proche, sinon « Autres ». États d'une action (Brouillon sans qui/quand, À examiner, Approuvée,
    En exécution / Terminée selon sa tâche, Bloquée si une dépendance n'est pas finie) et du plan
    calculés par le code. Matériel : une ligne saisie depuis un document démarre « À vérifier » ;
    doublons = même catégorie et libellé normalisé, rapprochés seulement sur confirmation (quantités
    additionnées). Rétroplanning à décalages fixes depuis le tournage J (brief J-21, lieu J-14, équipe
    et estimations J-10, location J-7, feuille de service J-2, sauvegarde J+1) et la livraison L
    (validation L-3, exports L-1) ; dates contradictoires signalées, jamais corrigées ; il reste dans
    Production (pas de propagation au Planning dans ce lot). Budget : estimé = somme des montants,
    reste = enveloppe − estimé, dépassement signalé sans rien bloquer.
  - *Tournage* (`lib/production/shoot/`) : état global du retour (aucun / incident / tout rendu /
    partiellement rendu / à rendre) calculé sur les lignes confirmées ; « Rendu » toujours confirmé ;
    la postproduction attend, une fois le tournage fini, les trois déclarations et les incidents
    marqués « bloque la postproduction » ; la clôture administrative attend le matériel rendu et les
    incidents marqués « bloque la clôture » (pas d'action de clôture dans ce lot) ; les suivis
    proposés (déclaration manquante, reprise, incident, retour en retard) deviennent une tâche
    seulement quand une personne choisit qui et quand, la notification de la tâche tient lieu
    d'alerte.
  - *Postproduction* (`lib/production/post/`) : étapes proposées par le code (« Mixage de la captation
    live » si le son est capté en direct ou mixte, « Sous-titrage » si la Fiche demande des
    sous-titres), personne par défaut ; auteur d'une version facultatif ; pièce jointe d'un retour
    réservée au responsable (le stockage n'accepte que lui) ; corrections à transmettre = retours
    ouverts ou pris en compte, groupés par catégorie, triés par timecode, texte à copier.
  - *Livraison* (`lib/production/delivery/`) : la checklist se crée depuis la Fiche, relue côté serveur,
    tant qu'elle est vide ; changer le lien d'une ligne remet son résultat à zéro ; la transmission à
    Activations est proposée une fois livré (formats = ratios de la Fiche, contraintes reprises) et à
    nouveau seulement si la livraison a changé ; une transmission dépassée (livraison rouverte, version
    ou lien changés) est signalée sur Activations (« une activation peut pointer vers une version
    antérieure »), qui n'affiche que la dernière par livrable.
  - *Compte rendu d'un call de production* : `app/api/calls/[callId]/extract/route.ts` appelle
    `fillProductionFromCall` après la Conception ; la page de traitement et le lien « terminé » de la
    page du call mènent à la Préproduction (`#technical-call`).
- **Hors de ce lot** : extraction IA / OCR des devis et comparaison multi-devis (après MVP selon le
  ticket), propagation du rétroplanning vers le Planning V1, événements et notifications propres à la
  Production, partage des briefs d'équipe avec des intervenants sans compte, action de clôture
  administrative.
- **Clôture du projet** (`/closure`, `lib/review/`, ex-« Suivi & bilan » ; déplacée le 11/10/2026 sous
  la Vue d'ensemble par le ticket « Suivi & bilan », § 8 terdecies) : l'état de chaque workflow (lu
  par `loadWorkflowStates`), le bilan (résultats, ce qui a marché, à améliorer, `project_reviews`,
  écrit pendant l'étape `review`), puis « Bilan & clôture du projet » : le DG valide, le projet est
  clos (l'étape `review` validée). Clôture refusée sans bilan écrit (`review_required`). Décision
  prise ici, faute de ticket : la clôture n'exige pas que les autres workflows soient terminés, la
  direction en juge en lisant l'état affiché (dont l'encart « Volet Marketing »).

## 8 decies. Marketing : Conception (`/design`, `lib/design/`, `components/design/`)

Ticket « Conception », étape 1 (Accueil, Chemin A, Chemin B). Migration
`20261010000901_conception_entry.sql`, tests `supabase/tests/conception.test.sql`. La Stratégie dit
quoi produire, pour qui et quand ; la Conception dit ce que chaque livrable raconte et à quoi il
ressemble. Elle reste sous Marketing, les livrables avancent en parallèle (pas de tunnel).

- **Accès** : la page attend la Stratégie **validée** (`DesignNeedsStrategy`). Fil d'Ariane
  « Marketing / Conception » (`projectTrail`), « / Travail direct » sur `/design/work` ; le projet
  est nommé par le sélecteur de la sidebar, comme partout ailleurs.
- **Livrables de la Conception** (`design_deliverables`) : une ligne par livrable engagé dans la
  Stratégie, créée **par trigger** à l'insertion d'un `strategy_deliverables` (titre, levier,
  quantité, échéance lus là-bas, jamais recopiés), statut `confirmed` ; plus les **ajouts de
  dernière minute** (« Ajouter un livrable », responsable seul, Conception ouverte = Stratégie
  validée et Conception ni soumise ni validée, `design_is_open`) avec une provenance explicite :
  `manual`, `strategy_decision` (un levier retenu) ou `call` (un call du projet). Un ajout est
  toujours `to_qualify` : la colonne `status` n'est pas accordée en écriture, rien ne le valide ni ne
  le planifie tout seul. Un besoin à qualifier peut être retiré (confirmé dans une modale). Toute
  donnée de Conception pointe vers `design_deliverables.id`.
- **Accueil** (`ConceptionEntry`) : projet, artiste, sortie, état de la Stratégie, résumé compact
  « n confirmés · n à qualifier », liste dépliable (`<details>` natif), puis « Commencer
  directement » (`start_design` : démarre l'étape `design` si besoin et ouvre `design_workspaces`)
  et « Préparer un échange créatif ». Une fois commencé : « Reprendre le travail », le nombre de
  propositions de PO à relire et la validation de l'étape (`ValidationPanel`).
- **Chemin A, échange créatif** (`design_calls`, `create_design_call`) : objectif, participants,
  livrables concernés, sujets (calculés par le code depuis les intentions manquantes, recalculés
  côté serveur), date, format, récapitulatif avant création. Après traitement du call
  (`app/api/calls/[callId]/extract`), `fillDesignFromCall` démarre la Conception, enregistre le call
  comme **source** (`design_sources`, une seule fois par call) et PO propose des intentions depuis
  les éléments du compte rendu ; la page s'ouvre sur le travail direct.
- **Chemin B, travail direct** (`/design/work?d=<id|direction>&q=<topic>`) : les cibles (direction
  créative, livrables) en pastilles au-dessus du titre (« n/4 » ; état, propositions et « À qualifier »
  de la cible ouverte à côté de son titre, plus de colonne collante, retour de Sacha du 11/10/2026),
  ce qui est déjà connu (rôle, timing et échéances amont, public, narratif, contraintes du Cadrage,
  dépendances), puis **les quatre questions** (`story`, `look`, `tone`, `musts`,
  `lib/design/intentions.ts`) **répondues comme celles de la Stratégie** (retour de Sacha du
  11/10/2026 : l'ancienne conversation avec PO perdait l'utilisateur) : lignes numérotées dépliables
  (`AccordionSteps`, une ouverte à la fois par `?q=`, À compléter / Complété, ton
  `intentionTopicTone`), choix fermés en cartes + « Autre » qui composent la réponse par le code
  (`lib/design/intention-choices.ts`, phrases dans `fr.conceptionWork.choices` ; pour `musts`,
  « Doit y figurer » et « À éviter » séparés), réponse retouchable à la main ou à la voix,
  « Enregistrer » replie la ligne. Les choix cochés sont gardés avec la réponse
  (`design_intentions.choices`, forme vérifiée en SQL, clés vérifiées par l'action serveur) et
  recochés à la réouverture ; une proposition de PO confirmée n'en a pas. Réponse = `save_design_intention`
  (la précédente passe en `replaced`, historique gardé). Références (liens https,
  `design_references`) et import d'un brief existant (texte collé, `design_sources` kind `import`)
  sont des actions du travail direct, pas un troisième parcours. Le dépôt de versions existant
  (`design_versions`, dont dépend la Production) reste sous chaque livrable engagé.
- **Propositions de PO** (`lib/design/propose.ts`) : extraction structurée sur la source (données,
  jamais consignes), sujet en liste fermée, citation **vérifiée mot pour mot** par le code
  (`locateQuote`), cibles vérifiées. Une décision qui concerne plusieurs livrables devient une
  proposition par livrable pointant vers la **même source** ; une proposition que PO ne sait pas
  rattacher reste `unassigned`. Signaux d'ambiguïté calculés par le code (concerne aussi…, diffère
  de la réponse posée). Rien n'est confirmé sans une personne (`review_design_intention`).
- **Qui écrit** : le responsable et l'équipe créative du projet, pendant l'étape en cours
  (`design_can_write`) ; le responsable seul démarre, prépare les échanges et ajoute des livrables.
- **Décisions prises ici, faute de ticket** : l'ancien « Dossier de conception » (champs
  `design_doc`) est remplacé par les intentions de la direction créative (ses valeurs ne sont pas
  reprises : aucune donnée réelle) ; les références sont des liens (les fichiers viendront avec les
  moodboards) ; un besoin « à qualifier » n'a pas encore de geste pour devenir confirmé (étape
  suivante du ticket).

**Étapes 4 à 13** (migration `20261010005001_conception_direction_sheets.sql`, test d'acceptation
`supabase/tests/conception-piegee.test.sql` sur la fixture Piégée, rejouée dans une transaction
annulée : aucune action réelle). Pages du module sous `ConceptionTabs` : Accueil, Intentions
(`/design/work`), Références, Direction artistique, Brief créatif, Fiches Livrables.

- **États** : tous calculés par `lib/design/states.ts` depuis les faits (jamais stockés) —
  Conception (Non commencée → En cours → À arbitrer → Partiellement validée → Terminée), intentions
  d'une cible (Brouillon → À confirmer → Confirmées → À réviser), direction artistique (À attribuer →
  En préparation → Prête à soumettre → En attente → Validée / Modifications demandées / Refusée),
  Fiche Livrable (Brouillon → À compléter → Prête à soumettre → En attente → Validée · Prête pour
  Production → Transférée).
- **Consolidation** : fusionner (`merge_design_intentions`, les originaux passent en `merged` avec
  `merged_into`) ou dissocier (`split_design_intention`, parties `split_from`, même source) les
  propositions ; le chef de projet confirme l'ensemble d'une cible (`confirm_design_intentions`,
  refusé tant qu'une proposition attend) : instantané `design_intent_confirmations`. Un changement
  ultérieur rend la cible « À réviser ».
- **Responsables et validateurs** (`design_assignments`, `design_validators`) : désignés par le
  chef de projet seul (`assign_design_responsible`, `set_design_validators`), une désignation
  remplace la précédente (historique gardé). PO suggère (équipe créative d'abord), n'affecte jamais
  et ne connaît pas les disponibilités. **Décision prise ici** : une personne désignée doit pouvoir
  agir, donc être membre ; si elle ne voit pas le projet et a le travail créatif, la désignation
  l'ajoute à l'équipe créative, sinon elle est refusée (`person_cannot_see_project`). Le Réseau n'a
  pas de compte : il ne peut ni soumettre ni décider.
- **Références** : une ressource (`design_references`, lien https ou fichier du bucket privé
  `design-references`, 50 Mo, images / PDF / vidéos) liée à autant de cibles qu'il faut
  (`design_reference_links`) ; sans lien = « À rattacher ». Même fichier (sha256) ou même lien =
  une seule ressource, jamais un second import. Une référence reste une proposition tant qu'aucune
  section approuvée de la direction ne la contient.
  Miniature d'un lien (`lib/integrations/link-preview.ts`, page Références seule) : image YouTube
  connue, adresse d'image directe, sinon l'image Open Graph / Twitter de la page lue par le serveur
  (hôtes publics seulement, chaque redirection revérifiée, 2 Mo et 5 s au plus, cache d'un jour ;
  un échec réseau n'est pas mis en cache). L'image est chargée par le navigateur
  (`referrerPolicy="no-referrer"`) ; refusée par le site, la carte reprend l'icône « Lien ».
- **Références semblables (Unsplash + Tumblr)** (11/10/2026, demande de Sacha : « que PO cherche
  d'autres images qui ressemblent à celles envoyées, pour agrandir le moodboard ». Essayé dans la
  journée : Are.na, puis Are.na + Openverse ; retenu : « Unsplash + Tumblr, et pour le moment tu
  peux laisser de côté Are.na ». Pinterest et Cosmos écartés : pas d'API de recherche ouverte,
  seulement les épingles du compte connecté pour Pinterest, des aspirateurs tiers pour Cosmos.)
  « Chercher des références semblables » sur la page Références, pour qui écrit dans la Conception
  (`design_can_write`, vérifié avant tout appel). **Sources** (`lib/design/similar-sources.ts`, le
  seul endroit qui dit lesquelles sont allumées) : **Unsplash** (`lib/integrations/unsplash.ts`,
  `UNSPLASH_ACCESS_KEY`, gratuit, 50 appels par heure en mode démo) et **Tumblr**
  (`lib/integrations/tumblr.ts`, `TUMBLR_API_KEY`, gratuit, 1 000 appels par heure), chacune
  allumée par sa clé ; sans aucune clé, la fenêtre le dit. **Are.na** (`ARENA_ENABLED`, rebond par
  ses chaînes, recherche par mots seulement avec un compte Premium) et **Openverse**
  (`OPENVERSE_ENABLED`) restent dans le code, éteints. Deux actions serveur
  (`lib/design/actions/reference-similar.ts`) :
  1. PO lit les 4 dernières images lisibles de la base choisie (une cible, ou « Toutes les
     images » ; JPEG / PNG / WebP / GIF de 5 Mo au plus, `similar-rules.ts`) en un seul message
     (`extractFromImages`, images = données) et rend ce qu'il voit, 3 ou 4 **recherches** pour
     Unsplash (2 à 4 mots) et 3 ou 4 **tags** pour Tumblr (1 ou 2 mots, `/v2/tagged` ne cherche
     que par tag), nettoyés par le code (`cleanSearches`).
  2. Chaque source allumée reçoit ses mots, 12 images par recherche ou tag (Tumblr : 3 images
     par billet au plus, photos d'un billet classique ou `<img>` d'un billet au nouveau format).
  Un groupe par source et par recherche, chaque image une fois, celles déjà gardées écartées,
  groupes vides masqués ; un appel échoué n'empêche pas les autres, l'erreur nomme la source.
  L'écran montre « Ce que PO voit », les groupes en pastilles (« Unsplash · grainy film portrait
  · 12 » ; décocher masque leurs images) et la grille à cocher, auteur et licence sous chaque
  image ; **rien n'est ajouté sans clic**. Les propositions s'affichent depuis les adresses des
  sources (règle « hotlinking » d'Unsplash). Garder une image : seuls la source et l'id viennent
  du navigateur (Tumblr : `<blog>:<billet>:<rang>`), le serveur relit l'image à sa source,
  télécharge son fichier (Unsplash « regular », 1 080 px ; 15 Mo au plus, type d'image vérifié),
  la range dans le bucket avec la session de l'utilisateur et l'enregistre comme un fichier déposé
  (dédoublonné par sha256), rattachée par défaut à la cible de départ (la direction pour « Toutes
  les images ») ; **Unsplash est prévenu de chaque photo gardée** (`download_location`, règle de
  son API). La note crédite l'image et garde son adresse (`unsplash.com/photos/<id>`,
  `tumblr.com/<blog>/<billet>#<rang>`) : c'est ce qui l'écarte d'une recherche suivante, sans
  colonne de plus. Les images de Tumblr appartiennent à leurs auteurs : de l'inspiration, jamais à
  publier telles quelles.
- **Soumissions et décisions** (`design_submissions`, `design_decisions`) : pour la direction
  (sections choisies par le responsable) et pour chaque fiche (la fiche, puis chaque élément d'une
  série). L'instantané est écrit par la base à la soumission. Mode de validation du projet
  (`design_workspaces.validation_mode`) : global (une décision) ou par section. Valider / Demander des
  modifications / Refuser, commentaire obligatoire hors validation ; une décision par section (la
  seconde concurrente est refusée, les décisions restent séparées) ; la version se ferme quand tout
  est décidé, jamais par silence. Une nouvelle version n'écrase pas la précédente.
- **Brief créatif global** (`design_briefs`) : versionné, contenu construit par le serveur sans IA
  (contexte, objectifs, publics, narratif, principes, tonalité, à montrer / éviter, cohérence,
  livrables, références validées, contraintes, décisions, sources, points ouverts). Il ne remplace
  pas les fiches.
- **Fiches Livrables** (`design_sheets`, `design_sheet_items`) : une par livrable, créée par le chef
  de projet ; une série a autant d'éléments numérotés que décidé (jamais un nombre codé en dur).
  Écrite par le chef de projet ou son responsable, **figée pendant une soumission en attente**
  (`design_sheet_can_edit`). Provenance de chaque valeur (`provenance`), historique dans
  `design_events` (écrit par triggers seuls). Contrôles bloquants / reportables à Production
  calculés par le code ; PO propose seulement des formulations, acceptées par la personne.
- **Transfert à Production** (`design_handoffs`, `handoff_design_sheet`) : chef de projet, dernière
  version validée ; Production lit l'instantané de cette version et le Brief en vigueur, sans
  ressaisie. Ne réserve rien, ne crée ni équipe, ni tâche, ni notification.
- **Hors de cette étape** : notifications des soumissions et décisions (le Travail et la cloche
  pourront les lire plus tard), annulation d'un livrable après validation, circuits de validation
  complexes et délégations (après MVP).

## 8 undecies. Les autres rôles (test UX du 09/10/2026, section 5)

« Les autres rôles n'ont pas leur outil » (sévérité 3). Migrations `20261010001001` à `…1701`,
tests `supabase/tests/ux-roles.test.sql` (41).

- **Accueil par permission** (`components/home/home-feed.tsx`) : « Validations » seulement avec
  `validate`, « Propositions de PO » seulement avec `pilot_projects`, sur les projets dont on est
  responsable (filtré dans `loadMyTodo`), et masquée quand il n'y a rien. « Mes tâches » = tâches +
  **livrables assignés encore à concevoir** (`plateOf`, `Todo.deliverables` : sans version, ou
  retouches demandées ; une version soumise attend le responsable, une approuvée est faite) ; la
  page Travail lit la même liste (`myDeliverables`).
- **Où mène une tâche** (`lib/project-work/task-href.ts`) : action du Juridique, question du Brief,
  sinon le **livrable** qu'elle nomme (`tasks.deliverable_id`, même projet vérifié par trigger,
  ancre `#deliverable-<id>` de la Conception), sinon le **Travail du projet** (plus jamais le
  Cadrage) ; sur le Travail lui-même, la ligne n'est pas un lien (`CardRow` sans `href`). Le
  formulaire de tâche propose « Livrable concerné » (facultatif).
- **Notifications de l'équipe créative** (triggers) : `project_launched` à l'acceptation,
  `brief_approved` quand une version du Brief est validée, `call_invited` pour un call de projet.
  Un call de projet a désormais des **participants** (`call_attendees`), choisis par le
  responsable **dans l'équipe du projet seulement** (responsable + directeurs créatifs,
  `attendee_not_in_team`) : « Nouveau call » les propose tous cochés ; un échange préparé (Cadrage,
  Stratégie) invite les membres de l'équipe dont le nom, proposé par le code depuis cette même
  équipe, est resté dans la liste (`inviteProjectTeam`).
- **Dépôt créatif avant la Conception** : un directeur créatif du projet écrit dans la
  bibliothèque Fichiers **en Visuels et Autres**, modifie et supprime **ses** fichiers seulement
  (`is_project_creative`, policies `project_files_*_creative`, `FileWriteScope` côté écran) ; Brief,
  Contrats et Presse restent au responsable. La Conception non démarrée (ou la Stratégie non
  validée) renvoie vers Fichiers › Visuels (`EarlyDepositLink`).
- **Dépôt de l'ingénieur par son lien** (`/m/[token]`, sans compte, sans service role) :
  `open_master_delivery` ouvre un **emplacement à usage unique** (chemin aléatoire du bucket
  `master-files`, une heure, 20 par heure et par lien) où Storage accepte l'envoi anonyme
  (`is_open_delivery_slot`), puis `record_master_delivery` vérifie que l'objet existe, lit sa
  taille dans Storage et crée le fichier audio du titre à l'état **Mix** (lien de mix) ou
  **Master** (lien de mastering) : la version suit (`create_mix_versions`), l'équipe et
  l'expéditeur sont notifiés (`master_delivery_received`, `master_mastering_delivery_received`).
  Seuls les dossiers envoyés depuis le 10/10/2026 portent `masterId` par titre : un ancien lien
  n'offre pas le dépôt (« Relancer » en donne un nouveau). Limite : 50 Mo (celle du bucket).
- **Durée du lien de l'ingénieur** (`lib/master-workflow/link-expiry.ts`) : 14 jours après la
  date finale de l'étape au Brief (mix final, master final), jamais moins de 30 jours, au plus
  179 ; les fichiers sont signés pour la même durée ; la base refuse hors de 1 à 180 jours.
- **Fiche `/f/…`** : `get_legal_form` renvoie `requester` (nom de l'organisation, responsable du
  projet et son e-mail) pour tout jeton connu ; la page dit qui demande, à qui écrire
  (`RequesterNote`), à quoi servent les données (`DataUseNote`, RGPD art. 13 : finalités,
  destinataires, conservation, droits art. 15 à 17) et, après l'envoi, la suite.
- **Recrue** : carte « Bienvenue » sur l'accueil (`WelcomeCard`) pour un membre approuvé depuis
  moins de 30 jours, trois repères choisis **par permission** (`welcomeVariantOf`), fermée en base
  (`member_welcomes`). PO : `my_todo` commence par les projets à accepter et liste les livrables,
  `find_projects` dit `status` et `waitingForYourAnswer`, `project_status` présente un projet non
  lancé (contexte initial, échéance) ; la première suggestion de l'accueil devient « Présente-moi
  le projet « X » » (`PageSuggestions`).
- **Confidentialité d'une transmission** : `note` et `response` de `project_assignments` ne sont
  plus lisibles directement (droits colonne) ; `project_assignment_messages()` les rend à la
  personne transmise, à celle qui a transmis et aux membres `assign_projects`. Les autres voient
  l'historique (qui, quand, la décision), pas les mots.
- **Budget** : lignes (et leurs notes, et les tarifs du Brief Mix/Master inscrits au budget) lues
  par le responsable et la direction seulement (`can_read_project_budget`) ; section absente de la
  navigation et page 404 pour les autres (`canSeeProjectBudget`) ; les tarifs du Brief ne quittent
  pas le serveur pour eux (`BriefView.canSeeBudget`). **Pas couvert** (point à trancher,
  `docs/CONTEXTE-PROJET.md`) : l'enveloppe du Cadrage (dans le Brief partagé avec l'équipe), les
  colonnes de tarif de `master_briefs` lues par l'API, ce qui se dit du budget dans les calls.

## 8 duodecies. Marketing : Activations (`/activations`, `lib/activations/`, `components/activations/`)

Tickets « Marketing / Activations — Vue d'ensemble et pilotage », « … / Influence » et « … /
Relations presse (RP) » (Drive, 11/10/2026). Migrations `20261011000101` (socle) à
`20261011000501` (RP), tests `supabase/tests/marketing-activations.test.sql` (52, fixture
Piégée / Dioo / Alka et chiffres ATYR rejoués dans une transaction annulée).

- **Modèle (la décision structurante)** : une **activation** (`marketing_activations`) est
  l'unité de pilotage Marketing (contenu, influence, RP, événement / session, autre). Influence
  et RP ont un **mode** (Gestion interne / Agence externe) : un seul module, un parcours par mode,
  le changement de mode garde tout l'historique. Une activation vient d'un levier retenu, d'un
  livrable engagé ou d'un transfert de la Production (un lien, jamais une copie ; un livrable ou
  un transfert n'a qu'une activation, un levier peut en porter plusieurs), ou est créée à la main.
- **Trois axes, jamais fusionnés** : le **statut opérationnel** (Brouillon → À préparer → Prête →
  En cours → Réalisée déclarée → Clôturée, + Annulée / Suspendue / Bloquée avec raison), posé par
  une personne ; la **preuve** (`activation_evidence` : lien, fichier ou source de la déclaration ;
  `activation_evidence_checks` : chaque contrôle avec méthode, auteur, date, append-only ; une
  preuve retirée reste historisée) ; la **mesure** (`activation_metrics` : relevés datés avec
  source, période, méthode, toujours « déclarés » à l'enregistrement, vérifiés à part, invalidés
  sans effacement). États de preuve et de mesure **calculés par le code** (`lib/activations/states.ts`),
  jamais stockés ; une statistique manquante n'est jamais un zéro.
- **Pilotage** (`board.ts`) : alertes calculées (responsable absent, échéance passée, réalisée sans
  preuve ou sans statistiques, preuve contestée, dépendance bloquante ou changée, écart agence /
  PDS, droits publicitaires expirés), vues (À lancer, En cours, À vérifier, Bloquées, À mesurer,
  Prêtes pour bilan, Clôturées), compteurs avec leur règle affichée, **prochaine action** : celle
  d'une personne d'abord, sinon la première règle non écartée (les règles des modules —
  cadrage, concepts, versions, messages, propositions d'agence, bilan — passent avant preuve et
  mesure). **Rien n'est créé dans Travail sans « Créer une tâche »** (`create_activation_task`,
  `tasks.activation_id`, la tâche ramène à l'activation). Blocages saisis (`activation_blockers`,
  résolution gardée), **dépendances** liées à un livrable, un contrat, un emprunt ou une tâche,
  état relu à la source, « version observée » gardée pour signaler un changement
  (`activation_dependencies`, `dependencies.ts`). Journal append-only `activation_events`, écrit
  par triggers et fonctions seulement. Clôture `close_activation` (définitive ou avec réserves
  listées par le code et gardées telles que montrées ; définitive malgré des réserves = motif),
  réouverture `reopen_activation` avec raison.
- **Qui écrit** : le responsable du projet et le responsable de l'activation
  (`activation_can_write`) ; **validateur PDS** = le DG ou un directeur créatif du projet
  (`marketing_can_validate`) : il vérifie preuves et statistiques, décide des fiches et des
  versions de contenu. Les montants (propositions, paiements, factures, preuves de paiement) sont
  réservés aux lecteurs du budget (`can_read_project_budget`, fichiers `restricted`).
- **Communs Influence / RP** : **fiches versionnées** `activation_sheets` (cadrage, concept
  générique, concept par influenceur), champs vérifiés par l'app (`lib/activations/sheets.ts`),
  chacun avec sa provenance, préremplies depuis les réponses **confirmées** de la Stratégie et les
  temps forts du canal (`framingPrefill`) ; Brouillon → À valider → Validée / Corrections
  demandées / Refusée (`decide_activation_sheet`) ; toute modification après validation ouvre une
  version ; une Stratégie modifiée après la validation est signalée, jamais réécrite. **Cibles**
  `activation_targets` (un profil du Réseau par campagne, unique : un doublon ouvre l'existante ;
  alertes calculées avant ajout et confirmées : déjà proposé / contacté / collaboré, refus
  antérieur, audience absente ou de plus de 6 mois). **Messages** `activation_messages`
  (Brouillon → À valider → Validé → Envoi déclaré ; prouvé = déclaré avec preuve ; jamais envoyé
  par PDS OS, « Copier » et `mailto:` seulement) ; relance refusée après refus, opportunité
  ouverte ou clôture sans dérogation écrite.
- **Influence interne** (`lib/activations/influence/`) : collaboration = cible ; **étape calculée**
  (`stage.ts`, Candidate → … → Publiée vérifiée → Administration, sorties par l'issue) ;
  propositions immuables, conditions validées par décision explicite sur la dernière position ;
  **accord express** `/i/<jeton>` (64 hex, seul le hash gardé, 30 jours, nouveau lien = ancien
  révoqué) : version exacte (empreinte), nom + consentement, première ouverture notée, « Demander
  une modification » devient une position du créateur ; ce n'est **pas** une signature qualifiée
  (mention affichée) ; droits **organiques et publicitaires séparés**, acceptés / refusés /
  révoqués / expirés chacun, nouvelle version après décision, le « Bon pour accord » n'accepte
  que les blocs montrés ; versions de contenu sans limite, retours horodatés (timecode,
  catégorie, statut « corrigé déclaré » ≠ « résolu »), décision sur une version précise ;
  publication = preuve de la collaboration ; **paiement administratif** (Bon à payer exige un
  accord accepté, Payé vérifié une preuve à accès restreint ; aucun virement ni coordonnée
  bancaire) ; brief externe composé par le code depuis le concept validé, les conditions et les
  droits (`brief.ts`).
- **RP interne** (`lib/activations/press/`) : cadrage commun aux deux modes + le **Dossier de
  presse de la Stratégie** (jamais dupliqué ; validé ≠ envoyé : compté par les messages envoyés
  qui le joignent) ; modèle commun validé puis un brouillon par cible (salutation et angle de la
  cible ajoutés par le code) ; opportunités / interviews (`press_opportunities`, créneau confirmé
  = date + qui a confirmé et par quel canal, heure saisie en heure de Paris) ; brief d'interview
  composé par le code depuis le cadrage validé, sans réponse inventée ; retombées = preuves
  vérifiées à part.
- **Agence (Influence et RP, un seul module)** (`lib/activations/agency/`) : sources en lecture
  seule (`agency_sources` : lien Google Sheets lu par son export CSV public, fichier Excel / CSV
  déposé à chaque actualisation — l'onglet portant le nom de la source, sinon le premier —, ou
  saisie à la main pour un PDF) ; « Actualiser » lit, mappe (correspondance proposée par le code
  d'après les en-têtes, confirmée par une personne, `fields.ts`) et signale sans corriger
  (#REF!, texte dans un nombre, lien invalide, catégorie dont l'audience dépasse le seuil écrit
  dans son libellé) ; **aperçu** enregistré (`record_agency_preview` : ajout / modification /
  inchangée / absente) puis **confirmation** totale ou partielle (`apply_agency_snapshot`) ;
  instantanés et lignes brutes gardés ; une ligne absente est marquée, jamais supprimée ; la
  **décision PDS** et la note interne (`agency_rows`) ne sont jamais touchées par une
  actualisation ; écart statut agence / décision signalé (`divergence.ts`, lecture des mots du
  statut) ; retour à l'agence = brouillon écrit par le code depuis les décisions, sans les notes ;
  statistiques importées en relevés « Agence » datés ; bilan (`agency_reports`) gardé tel que
  reçu, décidé provisoirement avec réserves (listées par le code côté serveur), compléments,
  archivé, ou validé (motif si réserves) ; synthèse par source et totale « données agence ».
- **Réseau** : rôles `influencer` et `journalist`, onglets « Influenceurs » et « Médias &
  journalistes » ; **relevés datés** `network_observations` (abonnés, engagement, tarif connu,
  catégorie ; jamais écrasés, invalidés avec raison) ; la fiche contact montre ses campagnes
  (cibles et lignes d'agence rattachées, projets visibles seulement).
- **Suivi & bilan** reçoit chaque activation avec ses trois axes et ses réserves
  (`ActivationsReview`) ; le volet Marketing n'est dit clôturé que quand l'étape `review` est
  validée.
- **Décisions prises faute de règle dans les tickets (11/10/2026)** : validateur PDS = DG ou
  directeur créatif du projet, sans interdiction d'auto-validation (option « séparation des
  rôles » non activée) ; « En vérification » (preuve) non modélisé (pas d'état en cours stocké) ;
  séries de retours de contenu non modélisées (retours unitaires avec statut) ; fusion de
  doublons du Réseau non construite (rattachement manuel + alertes, comme le socle MVP) ;
  journaliste rattaché à un média par la structure du Réseau, sans historique daté des
  rattachements ; adresse IP non gardée dans la preuve d'accord (« si légalement autorisé » :
  au Juridique de trancher), user-agent gardé ; un aperçu d'accord ouvert par un robot de
  prévisualisation compte comme « affiché » ; le seuil d'une catégorie d'agence n'est contrôlé
  que s'il est écrit dans le libellé (« Micro (10k-100k) ») ; agrégations cross-projets,
  vérification automatique des liens, collecte API, synchronisation planifiée : après MVP.
- **Dépendance** : `read-excel-file` (lecture seule d'un .xlsx côté serveur).
## 8 terdecies. Marketing : Suivi & bilan et clôture du Marketing (`/review`, `lib/marketing/`, `components/marketing/`)

Ticket « Suivi & bilan » (11/10/2026), livré en six lots, chacun testé (pgTAP
`supabase/tests/marketing-review.test.sql`, 95 assertions sur la fixture fictive Piégée / Dioo /
Alka, plus vérification à l'écran). Quatre objets distincts : le **tableau de bord** vivant, le
**rapport** figé et versionné, la **validation d'un bilan provisoire** avec réserves, la **clôture
du volet Marketing**. Aucun ne clôt le projet : la clôture du projet reste l'étape `review`, sur
`/closure` (§ 8 nonies).

- **Lot 1 — activations et preuves lues** (`20261011000601_marketing_review_sources.sql`) : **un seul
  modèle d'activations**, celui du ticket « Activations » (§ 8 duodecies). Les deux tickets ont été
  menés en parallèle le 11/10 ; à la fusion (décision de Sacha), le registre minimal que créait ce lot
  (`marketing_activations` à quatre statuts, `marketing_evidence`, page « Suivi des activations »)
  a été retiré et le Suivi & bilan **lit** les activations par deux vues `security_invoker` (la RLS
  des Activations s'applique), jamais stockées :
  `marketing_review_activations` regroupe le statut opérationnel en quatre (**Prévue** = brouillon,
  à préparer, prête ; **En cours** = en cours, suspendue, bloquée ; **Réalisée** = réalisée déclarée,
  clôturée ; **Annulée**), l'échéance tient lieu de fin de période, la description de note ; une
  activation n'est jamais archivée. `marketing_review_evidence` = les preuves (publication ; retombée
  = retombée, diffusion, interview, autre) et les statistiques (**dernier relevé valide** de chaque
  sujet, métrique et unité, comme `lib/activations/totals.ts`) ; niveau **Déclarée** (aucun
  contrôle), **À vérifier** (dernier contrôle : contestée ou indisponible, lien signalé
  inaccessible), **Vérifiée** (dernier contrôle vérifié : qui et quand) ; une preuve retirée est
  archivée. Une statistique est toujours « Disponible » (un relevé a une valeur) ; un pourcentage
  n'est jamais additionné. Noms des sources et des métriques : ceux des Activations
  (`lib/marketing/review-labels.ts`). Contributeurs du bilan : le responsable et les directeurs
  créatifs du projet (`marketing_can_contribute`). `marketing_events` = audit des rapports,
  validations, réserves et clôture, écrit par triggers seuls (les activations gardent leur journal
  `activation_events`).
- **Lot 2 — tableau de bord** (`/review`, `lib/marketing/dashboard.ts`) : calculé à chaque ouverture,
  filtres dans l'URL (période, type, responsable, statut, déclarant, niveau, réserve), chaque chiffre
  ouvre son détail (`?detail=`) avec sa **règle de calcul** et la provenance des preuves comptées.
  Les compteurs déclaré / à vérifier / vérifié sont exclusifs ; « Liens manquants » = publications
  sans lien. Totaux par mesure : seules les valeurs existantes s'additionnent, déclaré et vérifié à
  part, « Indisponible » sinon. Budget : lignes du budget du projet, seulement pour qui le lit.
  Les règles sont versionnées (`RULES_VERSION`) : un rapport garde sa version et
  `reportFigures` le relit avec elle, jamais recalculé en silence.
- **Lot 3 — rapport figé** (`20261011000701_marketing_reports.sql`, `/review/reports`,
  `lib/marketing/reports/`) : préparation (périmètre, période, sections du « Contenu recommandé »,
  résumé et recommandations écrits par l'auteur) ; avant génération, le code montre données
  manquantes, incohérences, activations exclues et **propose des réserves** (cochées par défaut ;
  une catégorie déjà couverte par une réserve ouverte n'est pas reproposée, elle est « reprise »).
  `generate_marketing_report` construit l'instantané **en SQL** depuis les tables (jamais envoyé par
  le navigateur), le numérote, calcule son **empreinte SHA-256** et remplace les versions encore en
  attente ; une version approuvée le reste. Le budget de la version est dans
  `marketing_report_budgets`, lu seulement par qui lit le budget. Un rapport n'est jamais réécrit
  (`report_frozen`). Comparaison avec une autre version (`?compare=`), export PDF
  (`/api/projects/[id]/marketing-reports/[reportId]`) portant numéro, identifiant et empreinte.
- **Lot 4 — bilan provisoire** (`20261011000801_marketing_report_approvals.sql`) : le responsable
  soumet la version courante (validateur obligatoire : `no_validator`) ; le DG décide **sur cette
  version** (`p_expected_version`, sinon `report_superseded`) : « Approuver le bilan provisoire
  (avec réserves) », « Demander des corrections », « Reporter » (commentaire obligatoire pour les
  deux derniers). Les réserves de la version sont stockées avec la décision. Séparation des rôles :
  qui a généré ou soumis ne décide pas (`self_approval`). Approuver ne vérifie aucune donnée, ne lève
  aucune réserve, ne clôt rien.
- **Lot 5 — réserves et préparation** (`20261011000901_marketing_reserve_arbitration.sql`,
  `/review/closure`) : statut À arbitrer → arbitrée → levée / fermée. Arbitrages : à lever avant
  clôture (bloque), à suivre après clôture (qui — un membre —, échéance, canal), limite acceptée
  (motif, **direction seule**), non applicable (motif), doublon (réserve gardée, fermée sans perdre
  l'historique). Le responsable arbitre et lève ; la personne qui suit note et lève, jamais la
  décision. Aucune tâche automatique : rattacher une tâche du projet ou en créer une dans Travail,
  volontairement. La page montre le rapport de référence, ce qui bloque (calculé par
  `lib/marketing/closure/readiness.ts`), les activations non terminées, les paiements
  administratifs (engagé / payé), le Juridique, les preuves.
- **Lot 6 — clôture du Marketing** (`20261011001001_marketing_closure.sql`) : le responsable demande
  (rapport de référence = dernier bilan provisoire approuvé, ou finalisé par une clôture rouverte ;
  aucune réserve à arbitrer ni bloquante) ; le DG — jamais le demandeur — clôture **sans réserve**
  (rien ne reste), **avec réserves** (suivis ou limites restent), demande des corrections ou
  reporte. Effets : rapport finalisé, réserves stockées avec la décision, volet en **lecture
  contrôlée** (trigger `marketing_closed` : plus d'activation ni de réserve nouvelle, arbitrages
  figés ; suivis, preuves complémentaires et nouvelles versions acceptés). Réouverture par la
  direction avec motif ; la décision passée reste. Statut du volet calculé
  (`lib/marketing/closure/status.ts`) : Non démarré → En cours → Bilan en préparation → Bilan
  provisoire approuvé → Clôture en préparation → Clôturé avec / sans réserve → Réouvert. Le chevron
  « Suivi & bilan » et la carte Marketing suivent cette clôture, plus l'étape `review`.
  **ProjectClosureLink** : encart « Volet Marketing » sur `/closure` (statut, suivis encore ouverts,
  écart visible si le projet est clos avec des suivis ouverts).
- **Décisions prises faute de règle dans le ticket** :
  - un « contributeur Marketing » = le responsable du projet et ses directeurs créatifs ; ils
    préparent rapports et réserves ; seul le responsable soumet et demande la clôture ; le
    « validateur Marketing » = le titulaire de `validate` (le DG) ; « Direction » pour les limites et
    la réouverture = `validate` aussi ;
  - activation = celle du ticket « Activations » (§ 8 duodecies), lue par les vues du lot 1 ; la
    saisie des activations, preuves et statistiques se fait sur leurs pages, jamais ici ;
  - « Déclarée » et « À vérifier » viennent du dernier contrôle de la preuve (Activations) ; la
    vérification reste une action à part, confirmée et tracée ;
  - le volet Marketing clôturé fige aussi les activations (trigger `marketing_closed` sur
    `marketing_activations`) : plus de création ni de modification, preuves et relevés acceptés ;
  - une statistique sans période est signalée « donnée manquante », pas bloquante ;
  - un rapport généré après la clôture est accepté (le ticket le permet) ; il ne touche pas à la
    clôture en vigueur ;
  - pas de notification propre ni d'export multi-format (après MVP selon le ticket) ;
  - la clôture du projet (`review`) ne regarde toujours pas la clôture Marketing : elle l'affiche.
- **Fixture** : les noms Piégée / Dioo / Alka n'existent que dans le test pgTAP (tout est annulé à la
  fin) ; jamais dans le code, le seed ni comme valeur par défaut.

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

### 10 bis. Labo de l'app (`/app/labo`) : artistes depuis des captures TikTok

Demande d'Ibé (10/10/2026) : retrouver les artistes qu'il repère sur TikTok. Page de la
navigation principale, **pour tout membre approuvé, en production aussi** (contrairement à
`/labo`), où l'on essaie une fonction avant de la mettre dans l'app. Rien n'est enregistré
sans un clic : « Ajouter au Réseau » (ci-dessous).

- **Pourquoi pas TikTok** : l'API officielle ne lit que le compte connecté (Display API) ;
  la Research API est réservée aux chercheurs, sans usage commercial ; les scrapers violent
  les conditions de TikTok. Une capture ne porte de toute façon aucun identifiant. Piste
  gardée pour plus tard : un **lien** de vidéo collé → oEmbed public
  (`tiktok.com/oembed?url=…`, sans clé) donne le compte.
- **Lecture** (`lib/catalog/capture-artists.ts`, route `POST /api/catalog/capture-artists`) :
  l'image part seule au modèle (`extractFromImage` de `lib/ai/llm.ts`, ministral-14b lit les
  images), donnée jamais consigne. Le modèle **regroupe les noms d'une même personne** (nom
  affiché + pseudo + « son original - X ») et propose un nom d'artiste avec son raisonnement.
  Le code ne garde que les noms présents dans le texte que le modèle a lu (`visibleText`).
- **Noms déduits par PO** (`searchNames`) : le nom d'artiste caché dans un pseudo
  (« theodorabossladyy » → « Theodora ») ; seulement cherché, et gardé seulement s'il est
  un morceau d'un nom écrit (PO ne peut rien inventer).
- **Compte Deezer décidé par le code** (`lib/catalog/capture-deezer.ts`) : candidats = homonymes
  exacts d'un nom écrit ou déduit (sans casse, accents ni ponctuation), plus les artistes d'un
  son dont le titre est exactement un nom écrit (le nom affiché est souvent un titre :
  « Miss KITOKO ») ; **« Compte trouvé »** quand une sortie du candidat correspond à un
  **autre** indice de la capture que celui qui l'a fait trouver : un nom écrit, ou un mot du
  lien de la bio (`linkClues` : « bemyvalentinemrdj.lnk.to/Th… » → « Be my Valentine ? /
  MR. DJ » ; un morceau coupé par « … » est ignoré). Straat / huntrill → Huntrill
  (« BigSTRaat ») et non Hef, dont un son s'appelle « Straat » ;
  **« À vérifier »** quand un seul homonyme a un public (un homonyme sous 1 % des fans du
  plus suivi ne compte pas) ; **« Plusieurs comptes »** sinon, l'humain choisit ;
  « Déjà au catalogue » par `deezer_id`. Le nom affiché est celui du compte Deezer trouvé.
- **TikTok et Instagram** (`lib/catalog/capture-socials.ts`, `lib/integrations/artist-socials.ts`),
  sources publiques sans clé ni scraping, ordre décidé par le code : le pseudo lu sur la
  capture est **confirmé par l'oEmbed officiel de TikTok** avant la recherche Deezer (un
  pseudo inconnu de TikTok est écarté, le nom affiché qu'il renvoie rejoint les noms) ;
  un Instagram écrit sur la capture (bio) est repris tel quel (une faute de lecture reste
  possible : source « lu sur la capture ») ; un **Linktree** écrit en entier est lu
  (`lib/integrations/linktree.ts`, JSON `__NEXT_DATA__` de la page publique, format non
  documenté) ; sinon, **MusicBrainz** puis **Wikidata** (P2003 Instagram, P7085 TikTok,
  P1902 Spotify) relient le compte Deezer trouvé à ses réseaux, **Spotify** compris,
  toujours par l'id Deezer, jamais par le nom, et seulement pour « Compte trouvé » ou « À
  vérifier ». MusicBrainz : une requête par seconde (file dans le module). Chaque lien dit
  sa source ; une source en panne est sautée, jamais bloquante. Huntrill → TikTok @huntrill
  (confirmé par TikTok), Instagram @huntrillion (MusicBrainz).
- **Profil TikTok** (`lib/integrations/tiktok-profile.ts`, 10/10/2026, demande de Sacha :
  « toutes les informations qu'on a grâce au lien TikTok ») : la page publique du profil
  embarque ses données en JSON (`__UNIVERSAL_DATA_FOR_REHYDRATION__`, format non documenté) :
  nom affiché, **bio**, **lien de la bio**, abonnés, vidéos, certification. Une page lue par
  pseudo confirmé, sur clic d'un humain (dépôt d'une capture) ; illisible → repli sur l'oEmbed
  officiel, rien n'est bloquant. **Point à trancher** : c'est une lecture de page HTML, ce que
  les conditions de TikTok interdisent en principe (voir « Pourquoi pas TikTok ») ; à couper
  (appel unique dans `confirmTikTok`) si PDS préfère s'en tenir à l'oEmbed. La bio est une
  donnée lue par le code seul, jamais envoyée au modèle. Le lien de la bio devient un indice
  Deezer de plus (`linkClues`) et un Linktree à lire.
- **Départager les homonymes** (`lib/catalog/capture-proofs.ts`, Sacha 10/10/2026 : « comparer
  les bios Deezer avec Insta et TikTok […] et si à la fin il n'est toujours pas sûr, choisir le
  bon lien Deezer ») : pour « Plusieurs comptes » (4 candidats au plus) et « À vérifier », le code
  cherche deux preuves de plus par candidat : le profil Deezer relié par **MusicBrainz / Wikidata
  au même TikTok ou Instagram** que la capture (la plus forte, `accountMatch`, 3 candidats au
  plus les plus suivis : MusicBrainz = une requête par seconde, réponses gardées 10 min), et sa
  **bio Deezer** (API interne, § 2) qui cite un pseudo ou un nom de la capture (`bioMatch`). Une
  seule preuve → « Compte trouvé », chaque preuve dite en une phrase. Toujours plusieurs :
  **PO compare** (`extract`, `lib/ai/schemas/capture-choice.ts`) la bio TikTok, le lien de la
  bio et l'Instagram avec les bios Deezer, quelques titres et les fans, et **penche** pour un
  compte ou ne tranche pas, en deux phrases ; jamais un état : le statut reste « Plusieurs
  comptes ». La personne **choisit** dans le Labo (`DeezerChooser`) : les homonymes avec leur
  bio et leurs preuves, celui de PO en tête, ou **un autre lien Deezer collé** (page artiste ou
  lien de partage `link.deezer.com`), relu sur Deezer par le serveur (`chooseCaptureDeezer`,
  seul l'id vient du navigateur, rien n'est enregistré) → « Choisi par vous », réseaux du compte
  repris (ceux trouvés via l'ancien compte retirés), et c'est ce compte qui part dans « Ajouter
  au Réseau ». « Pas le bon compte Deezer ? » rouvre le choix sur toute ligne.
- **E-mail** (`emailsIn`, `lib/utils/email.ts`, lu par le code, jamais deviné) : le premier écrit
  sur la capture (compte qui publie), sinon dans la bio TikTok, sinon un `mailto:` du Linktree ;
  sa source est affichée. **Instagram** écrit dans la bio (« Ig: … », « insta @… ») : source
  « dans sa bio TikTok ».
- **Artiste ou beatmaker** (`activityOf`, `capture-socials.ts`) : un mot lu par le code dans la
  bio ou sur la capture du compte (« beatmaker », « type beat », « prod », « instrus », « FL
  Studio »…) propose Beatmaker, avec le mot cité ; sinon la lecture de PO (`activity` du schéma :
  logiciel de production à l'écran…). Une proposition : rôles pré-remplis dans le formulaire.
- **« Ajouter au Réseau »** (`CaptureNetworkAction`, `lib/catalog/capture-contact.ts`) : le
  **vrai formulaire de contact** pré-rempli (nom du compte Deezer s'il est sûr, rôles Artiste /
  Beatmaker, e-mail, lien de la bio en site web, TikTok, Instagram, Spotify, Deezer si « Compte
  trouvé » ou « À vérifier », fiche du catalogue si ce compte Deezer y est déjà) et des notes
  écrites par le code (date du repérage, place sur la capture, abonnés TikTok, fans Deezer, bio
  citée) ; une personne relit et enregistre (`manage_network`), on reste sur le Labo et le
  bouton devient « Ajouté au Réseau ». Déjà dans le Réseau = même compte TikTok, Instagram ou
  Deezer (`findContactsByAccounts`), **jamais par le nom** : « Dans le Réseau » mène au contact.
  Le contact rejoint l'onglet **Artistes repérés** du Réseau (§ 8 quinquies).
- Deux captures lues à la fois (palier gratuit Mistral, Deezer 50 requêtes / 5 s), 8 Mo
  au plus, PNG / JPEG / WebP, collées (⌘V) ou déposées. Un artefact claude.ai ne peut pas
  servir de banc : il n'atteint ni Mistral ni l'API Deezer (réseau bloqué).

---

## 11. Variables d'environnement

Voir `.env.example` (commenté). Schémas zod : `lib/env.ts` (serveur) et
`lib/env-public.ts` (`NEXT_PUBLIC_*`). Clés requises : Supabase (URL, anon), clé du
fournisseur LLM choisi, clé Groq ; optionnelles : `LLM_MODEL`, `TRANSCRIPTION_MODEL`,
`ODESLI_API_KEY`, `CRON_SECRET` (≥ 32 car.), `SUPABASE_SERVICE_ROLE_KEY` (cron),
clés VAPID et `PUSH_CLAIM_SECRET` (≥ 32 car., même valeur que le secret Vault, § 8 bis),
`GOOGLE_CALENDAR_CLIENT_ID` / `_CLIENT_SECRET` / `_REFRESH_TOKEN` / `_ID` (lien Meet, § 4 bis).

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
- **Nouvelle table = `revoke all` d'abord** : les privilèges par défaut de Supabase donnent
  `insert/update/delete` sur toute table créée dans `public` à `anon` et `authenticated` ; un
  `grant update (col…)` seul ne retire rien. Écrire `revoke all on table public.x from anon,
  authenticated;` juste après `force row level security`, puis les droits voulus (repéré par le test
  « a sheet is written by its functions only », 10/10/2026).
- **Types de la base sans la CLI** (Windows) : le générateur du conteneur `pg_meta` est plus
  ancien que celui de la CLI et omet `isOneToOne` dans les relations (le typage des jointures
  casse). Ne pas remplacer `database.types.ts` par sa sortie : n'y reporter que les tables,
  colonnes et fonctions nouvelles.
- **Lien « affiché une seule fois » perdu** (test UX du 09/10/2026) : une action serveur qui
  `revalidatePath` re-rend la page, la ligne change d'état et le composant qui gardait le lien dans
  son `useState` est démonté avec lui. Tout lien à usage unique passe par `useShowLinks()`
  (`components/ui/one-time-links.tsx`, fournisseur monté dans `app/(app)/layout.tsx`), dont la
  fenêtre survit au rafraîchissement.
- **Une lecture qui échoue n'est jamais un état** (test UX du 09/10/2026, § 2) : `getProject`,
  `getArtist`, `getMaster` lèvent une erreur au lieu de renvoyer `null` (sinon une base lente donne
  une 404), rattrapée par `app/(app)/app/error.tsx` (« Réessayer ») ; `app/(app)/app/not-found.tsx`
  et `app/not-found.tsx` disent la 404 en français. Les cartes de l'accueil reçoivent `error` (prop
  `error` de `ListCard`) : jamais « Aucun projet » sur un timeout ; `loadMyTodo` renvoie `error`,
  `loadRecentActivity` et `loadReleasesOverview` lèvent. `AccessWatcher` ne quitte la page qu'après
  deux « unavailable » de suite et passe la page d'origine à `/unavailable?next=` (`safeReturnPath`),
  où « Réessayer » ramène.
- **Refuser un projet transmis, ou demander une précision** retire sa visibilité au chef de projet
  (RLS) : `respondToAssignment` le renvoie sur son Travail (`?responded=`) qui dit où sa réponse est
  partie, au lieu de laisser la page du projet finir en 404.
- **Activité** (`lib/insights/activity.ts`) : seules les réponses du Cadrage (`deliverable = brief`,
  clés de `QUESTION_KEYS`), une ligne par projet, jour et sorte (« Cadrage : réponses confirmées »
  et les libellés des questions), plus les versions du Brief (créée, envoyée) ; jamais les clés
  techniques, ni `<clé>_suggestions` lues comme « Brief rejeté ».
- **Plan d'action juridique** : les actions retirées au lancement et celles retirées depuis
  (accord décoché dans la cartographie : `retire_legal_plan_items`, action obsolète et tâche
  supprimée) sont gardées dans `legal_plans.dismissed_keys` : jamais « apparues depuis le
  lancement », jamais recréées par « Ajouter au plan ». « Prêt pour la sortie » : « Atteint »
  seulement sans emprunt ouvert **ni** démarche ouverte (sinon « Démarches ouvertes » avec la
  liste) ; ces démarches sont aussi « à suivre » sur la livraison au distributeur.
- **Silence transcrit en texte** (test UX du 09/10/2026) : Whisper invente sur le silence
  (« Sous-titrage Société Radio-Canada »). L'adaptateur Groq (`lib/ai/groq-tolerant-fetch.ts`)
  retire d'abord les segments que Whisper marque comme silence (probabilité « pas de
  parole » ≥ 0,6 et confiance < −1, ou métadonnées nulles) et les phrases inventées connues
  (`lib/ai/silence.ts`) : un enregistrement muet arrive vide, l'appel finit en
  `transcript_empty` (« Rien d'exploitable »), la dictée en `nothing_heard`, rien ne part à
  PO. Côté navigateur, l'enregistreur compte les secondes avec du son (micro et onglet) :
  alerte après 30 s sans rien, « semble muet » avant l'envoi, dictée muette jamais envoyée.
- **Erreur d'une action ouverte en modale** : un toast passe inaperçu sous une fenêtre ;
  `useFramingAction({ inline: true })` rend l'erreur dans la fenêtre (`FormMessage`, `ConfirmDialog
  error`).
- **`\d` dans un gabarit** : `` new RegExp(`\d…`) `` perd la barre oblique (une séquence
  inconnue d'un gabarit vaut la lettre seule) ; écrire `String.raw` (`lib/framing/said.ts`).
- Données de test locales : `admin@pds.test` / `Framing-test-2026!` (admin), projet
  « Lueur » ; `cp-conception@pds.test` / `Conception-test-2026!` (chef de projet, responsable
  de « Soleil noir — conception (test) »). Fictives uniquement : les paliers gratuits peuvent entraîner leurs modèles.
