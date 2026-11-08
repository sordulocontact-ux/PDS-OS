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
| `…20261105170101_project_master_validator` (**non appliquée**) | Qui fait les retours sur le mix, choisi à la création (retour d'Ibé, 02/11/2026, § 8 septies) : `projects.master_validator_person_id` (droits insert/update comme les autres colonnes, RLS « avant lancement »), `create_project(…, p_master_validator_person_id)` (sortie musicale seulement). Règle du Brief vérifiée **au commit** (`z_check_master_validator`, différé : les directeurs créatifs sont ajoutés après l'insert) : responsable, personne à qui le projet est transmis (en attente) ou directeur créatif, sinon `invalid_master_validator`. Trigger `a_default_validator` (before insert de `master_briefs`) : un Brief créé sans validateur prend celui du projet s'il est encore responsable ou directeur créatif, sinon le responsable ; `apply_master_question` ne pose plus le responsable lui-même. |
| `…20261105110101_delete_call` (**non appliquée**) | Suppression d'une réunion / d'un call (retour d'Ibé, 02/11/2026) : `delete_call(p_call_id)` (SECURITY DEFINER, `archive_records` = DG, `can_see_call`) supprime l'appel avec ses invités, prises d'enregistrement, transcriptions et comptes rendus ; refus `call_in_use` si une tâche, un besoin ou un Brief Master en dépend. UI : « Supprimer la réunion » dans le « ⋯ » de la page (`CallSheetMenu`), action `lib/calls/delete-actions.ts`. Les objets audio du bucket restent à nettoyer. |
| `…20261107180101_call_owner_deletes` | Suppression d'un call ouverte à **son responsable** (retour d'Akili, 07/11/2026) : `delete_call` accepte la direction (`archive_records`) **ou** `is_call_owner` (responsable du projet, créateur d'une réunion) ; le reste inchangé. L'écran suit `lib/calls/delete-rule.ts` (`canDeleteCall`, ligne par ligne dans les listes) ; `deleteCall` annule aussi l'événement Google d'un call à venir. Test : `call-delete.test.sql`. |
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
  nouvelle ligne avant qu'un `select` sur `projects` puisse la voir. Depuis `…261026000101`, la
  même règle existe sous forme d'ensemble, `visible_project_ids()` (calculée une fois par requête) :
  les deux doivent rester identiques, `visible-project-ids.test.sql` le vérifie pour chaque profil.
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
- **Onglets de la fiche artiste** : Vue d'ensemble, Titres, Projets, Identité, Fichiers,
  Activité, Discographie (Deezer seul). Titres et Projets réutilisent les tableaux des pages
  de liste (`listMasters({ ids })`, `listProjects({ ids })` ; `ArtistDetail.projectIds` =
  projets vivants des masters de l'artiste **et** projets de contenu qui le nomment
  (`projects.artist_id`), RLS de visibilité). **Refonte du 29/10** (proto
  `docs/protos/pages.html`, « Artistes ») : la **liste** n'est qu'une liste — Nom, Relation,
  Titres, **En cours** (chaque projet lancé et l'endroit de son étape ouverte), **Prochaine
  sortie** (date la plus proche à venir d'un projet musical lancé, « dans N jours ») ; où en
  est chaque projet vient de `loadLaunchedJourneys` (une lecture pour tous les artistes,
  `loadRosterProgress`, `lib/catalog/artist-progress*.ts`), jamais une lecture par artiste.
  La **fiche** n'a pas de ligne de faits : « Maintenant » au-dessus des onglets seulement
  quand la direction a une proposition d'identité à trancher (`identityToDecide`, Approuver /
  Refuser avec motif obligatoire sur place) ; la Vue d'ensemble montre d'abord l'artiste
  (Sacha, 29/10 : « c'est pas ça qu'on vient voir en prio ») — chiffres (`ArtistHighlights` :
  titres, projets, fans et sorties Deezer) et dernières sorties —, puis Bio, Titres, « En
  cours » (projet, où il en est, qui est attendu, `loadArtistProgress` sur les seuls projets
  de l'artiste), Notes | Identité, Contacts. **Fichiers** (`artist_files`, bucket privé `artist-files`,
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
  (§ 8 ter), prête pour un call ou une activation (`FileOwner`). **Pochette d'un titre**
  (retour d'Ibé du 01/11/2026, `lib/catalog/cover-rules.ts`, `covers.ts`) : pas de table, c'est la
  dernière image (JPG, PNG, WebP, GIF, AVIF) de catégorie « Pochette » (`artwork`) de ses fichiers ;
  « Nouvelle version » sur la pochette = nouvelle version de ce fichier, les anciennes restent dans
  l'onglet Fichiers. Au dépôt, le navigateur envoie à côté une copie JPEG de 320 px
  (`<path>.thumb.jpg`, `cover-thumb.ts`) que montrent la liste des titres, l'onglet Titres d'un artiste
  et l'en-tête du titre (`TitleCover`) ; une pochette déposée avant n'en a pas, l'original est montré.
  La copie est lisible par qui lit le fichier (migration `20261105190101`) et supprimée avec lui.
  **Tableaux de fichiers** (Sacha, 05/11) : l'onglet Fichiers (`FilesList`, recherche comme partout) et
  la page Fichiers partagent leurs cellules (`file-cells.tsx`) ; une image que le navigateur montre est
  sa propre miniature (`previewUrl` : la copie de 320 px d'une pochette, sinon l'image signée).
  **Activité**
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
- **Matrice des actions d'un projet** (PROJ-TEST-01, vérifiée par `project-actions`,
  `archive`, `delete-records` et `project-drafts.test.sql`) : aucune action n'est ajoutée,
  chacune a ses conditions.

  | Statut | Modifier | Archiver | Supprimer | Reprendre |
  | --- | --- | --- | --- | --- |
  | Brouillon (`project_drafts`) | — (pas encore un projet) | — | son auteur seul, confirmé, la saisie est perdue | « Reprendre la création » (son auteur) |
  | Transmis, à accepter | `create_projects` (`update_project`) | DG, confirmé ; rien n'est effacé, la transmission est gelée | DG, confirmé, avec tout son contenu | — |
  | En cours (lancé) | non (`project_not_editable`) : son contenu se modifie dans ses étapes | refusé (`project_launched`), raison dite | DG, confirmé, avec tout son contenu | — |
  | Archivé (vue Archivés, DG) | non (`project_not_editable`) | « Restaurer », après son master et son artiste | DG, confirmé | — |

  Un chef de projet ne voit ni Archiver ni Supprimer (permission `archive_records`, refus
  `not_allowed_to_archive` / `forbidden` en SQL même s'il appelait la fonction).

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
  splits à 100 %, déclarations déposées, Master final validé) calculé par le code (`loadTitleDossier`), faits,
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
- **Variantes** (retour Catalogue 08, migration `…20261012101001`) : Original, Acoustique,
  Instrumental, Remix, Radio Edit, Live, Acapella, Autre. **Lien explicite** : une variante
  nomme son original (`masters.source_master_id`, posé à la création par « Nouvelle
  variante » → `/masters/new?variantOf=<id>`, nom et crédits repris, la variante à choisir,
  jamais « Original ») ; l'original est lui-même un original, sans chaîne (trigger), et un
  titre repassé en Original perd sa source. La famille = l'original + les titres qui le
  nomment (`listMasterVariantIds`), l'original nommé dans le tableau. Les variantes
  existantes ont été reliées à l'original de même nom et de même artiste principal quand il
  était unique. Chaque variante garde ses fichiers, crédits et ISRC.
- **Contributeurs & crédits** : les artistes interprètes restent `master_artists`
  (modifiés par « Modifier ») ; `master_contributors` porte tous les autres crédits (rôle
  fermé, précision libre), **une ligne par rôle en base, une ligne par personne à l'écran**
  avec tous ses rôles (`groupContributors`, § 2 nonies), triés dans l'ordre des rôles.
- **Splits** : `master_splits`, deux types (master, édition), parts en % à deux décimales.
  **Total ≤ 100 % par type, vérifié au commit** (`split_total_over_100`, trigger différé) ;
  total, reste et statut calculés par le code (`splitTotal`, en centièmes). **Lus et écrits
  avec `manage_catalog` seulement** (comme les contrats) : le bloc est masqué aux autres,
  leurs événements de journal sont `catalog_only`. Retours Catalogue 15, 40, 43 à 53 :
  - **Le type n'est plus demandé** : la section d'où l'on ajoute le fixe ; **rôles par
    type** (`SPLIT_ROLES_OF_KIND`, contrainte SQL `master_splits_role_kind_check`, non
    validée sur l'existant) : Master = label, artiste, producteur, coproducteur
    phonographiques, autre ; Édition = auteur, compositeur, éditeur, autre.
  - **« Complet » = total à 100 %, rien de plus.** La validation est à part
    (`splitReviewState`) : En préparation / À vérifier / Validée / Modifiée depuis la
    validation. « Valider la répartition » (`validate_master_split`, `manage_legal`, à
    100 % tout juste) prend un **instantané** des lignes (`master_split_validations`, jamais
    réécrit) : une modification ultérieure laisse cet instantané comme version validée,
    affichée, jusqu'à une nouvelle validation.
  - **Historique** de chaque changement (`master_split_events`, trigger : avant / après,
    qui, quand, et les validations), replié sous chaque section.
  - **Écarts crédits / répartitions** (`publishingGaps`) : un compositeur, auteur ou
    arrangeur crédité sans part d'édition visible (par son contact, sinon son nom) est
    signalé « à vérifier », sans jamais proposer ni ajouter de part.
  - **Source de vérité** (retours 03 et 41) : le titre porte la donnée source (crédits,
    parts, audio, identifiants, ℗) que Projets, Master, Juridique et Distribution relisent ;
    une décision validée est un objet à part qui ne se réécrit pas en silence : instantané
    de répartition, ℗ confirmé (repris si l'année ou le titulaire change), version audio
    validée (§ 2 septies), répartition confirmée du Juridique (feuille versionnée).
- **Droits & déclarations** : colonnes `masters.iswc` (normalisé `T` + 10 chiffres),
  `rights_holder`, `rights_year` (mention ℗ composée par le code) ; `master_declarations` une
  ligne par organisme (SACEM, SCPP, SPPF, ADAMI, SPEDIDAM) une fois déposée : Déposée,
  Confirmée, Refusée ; pas de ligne = « À déposer ».
- **Distribution** : lecture seule, les sorties (`releases`) des projets actifs qui portent
  le master, avec UPC, date, statut (`releaseStatusOf`) et liens détectés ; on modifie dans
  la Sortie du projet.
- **Projets & sorties** (retours 16, 64 à 72) : « Créer un projet » et **« Rattacher à un
  projet existant »** (`link_master_to_project`, security invoker : RLS de `project_masters`
  = direction avant le lancement ; forme vérifiée comme à la création, un single garde un
  titre, un contenu n'en prend pas) ; **trois dates de sortie séparées** par projet
  (`ReleaseDatesSection`) : visée (`projects.due_date`), confirmée
  (`releases.planned_release_date`), effective (`online_detected_at`) — la confirmée ne
  remplace jamais la visée. Au formulaire « Nouveau projet », le chef de projet (pilotage
  opérationnel) et la direction créative (responsabilité créative) disent leur rôle, et les
  directeurs créatifs choisis sont écrits en toutes lettres sous les pastilles.
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

#### Sessions partagées et fichiers de travail (retours Catalogue 17, 21, 27 à 38, lot 10)

Migration `…20261012101601_sessions_work_files`.

- **Une session, plusieurs titres** (retours 27, 29, 32) : `master_session_titles` relie une session à
  chaque titre qu'elle a servi ; `master_sessions.master_id` reste son titre d'origine. Lue depuis
  l'onglet Audio de chacun (« Aussi sur … »), modifiée depuis n'importe lequel
  (`master_session_writable`), **jamais copiée** : « Rattacher une session » propose celles du
  Catalogue avec les titres qu'elles servent (`listAttachableSessions`).
- **Formulaire** (retour 28) : statut Prévue / Réalisée / Annulée, début et fin facultatifs (fin
  après début, vérifié en SQL), l'ingénieur choisi dans le Réseau gardé par son contact
  (`engineer_contact_id`) à côté du nom (retour 31 : un nom seul reste un nom, reliable plus tard) ;
  le sélecteur du Réseau écrit « Organisation » devant une structure (retour 30, `rankedNetwork`).
- **Détacher ≠ supprimer** (retour 35) : « Détacher de ce titre » laisse la session sur ses autres
  titres (le titre d'origine passe au suivant, les fichiers de travail de ce titre gardent leur
  fichier sans le lien) ; « Supprimer » n'existe que pour une session d'un seul titre (refus
  `session_shared` en SQL sinon, la fenêtre l'explique), avec les fichiers rattachés dits ; détacher
  le dernier titre est refusé (`session_last_title`). Un titre supprimé passe ses sessions
  partagées au titre suivant (`masters_hand_over_sessions`).
- **Fichiers de travail à la place des Pistes** (retours 36 à 38) : la catégorie « stems » des
  fichiers du titre s'appelle « Fichiers de travail » (dossiers de session, ZIP, projets Pro Tools
  ou Logic, multipistes, stems), avec une session facultative (du titre, trigger
  `master_work_session_check`) et un statut Provisoire / Définitif (`master_files.session_id`,
  `work_status`, sur toutes les versions) ; **stockés une fois** : l'onglet Fichiers, l'onglet
  Audio (`WorkFilesSection`) et la session lisent les mêmes lignes. Les pistes saisies une par une
  restent visibles, repliées et en lecture seule (« Anciennes pistes ») ; rien ne les crée plus.
- **Limite** (retour 21) : 50 Mo par fichier, la limite réelle du stockage (bucket `master-files`
  et offre Supabase), dite avant le dépôt ; au-delà, un **lien** vers l'endroit où le fichier est
  partagé (`master_work_links`, https), jamais une copie.
- **Hors périmètre, à cadrer** (retours 27, 28, 34) : fiche Session unique, participants, artistes
  et projets d'une session, lien au Calendrier : ticket Sessions Studio séparé. **Fait** le
  05/11/2026, § 2 sexies bis.

### 2 sexies bis. Sessions studio et Maquettes (retours d'Ibé du 01/11/2026)

Retours « Sessions studio accessibles depuis la barre de menu, jusqu'au master » et « Importer et
stocker des fichiers rattachés aux sessions, artistes et projets », réponses d'Ibé du 05/11/2026.
Migration `20261105220101_studio_sessions.sql`, test `supabase/tests/studio-sessions.test.sql`.
Refonte du 07/11 (retour d'Ibé « Refonte du module Sessions studio », 06/11) : migration
`20261107110101_session_report_parts.sql`.

- **Une session sans titre.** `master_sessions.master_id` (le titre d'origine) devient facultatif ;
  une session est liée à des artistes (`master_session_artists`), des projets
  (`master_session_projects`, dans `project_live`, cascade à la suppression du projet) et des
  titres (`master_session_titles`, existant). Une seule ligne vue de partout : page
  `/app/sessions/[id]`, entrée « Sessions studio » du menu (`/app/sessions`, onglets À venir /
  À compléter / Terminées / Toutes en `?vue=`, « À venir » la plus proche d'abord), onglet « Sessions » de l'artiste, section « Sessions studio » du
  Pilotage d'un projet, bloc Sessions de l'onglet Audio d'un titre (lien vers la page). Une liste
  d'artiste ou de projet reprend aussi les sessions de **ses titres** (`sessionIdsOf`).
  **Portes** (`lib/sessions/door.ts`, comme `lib/calls/door.ts`, Sacha 06/11) : depuis un projet, la
  session s'ouvre **dans le projet** (`/app/projects/[id]/sessions/[sessionId]`, en-tête et fil
  d'Ariane du projet) ; depuis un artiste ou un titre, sur sa page avec `?depuis=a.<id>` /
  `t.<id>` pour le retour (« ← Retour à J4y ») : pas de troisième cadre, une fiche artiste ou titre
  n'a pas de navigation à garder. Même composant de page (`SessionPageView`). La **Vue
  d'ensemble d'un titre** liste ses sessions (`TitleSessionsSection`), l'onglet Audio les modifie.
  Détacher le dernier titre d'une session encore liée à un artiste ou un projet la garde
  (`master_session_anchored`) ; un titre supprimé lui laisse la vie de même.
- **Permission `manage_sessions`** (DG et chefs de projet, `role_permissions`) : créer, modifier,
  supprimer une session et ses liens (RLS de toutes ces tables). « Gérer dans les rôles qui crée
  des sessions » (Ibé) = le poste : il n'existe pas d'écran pour donner une permission à la
  carte. Une session n'appartient pas à un projet : « seul le responsable écrit » ne s'y applique
  pas (comme le Catalogue).
- **Participants** (`master_session_attendees`) : membres (`person_id`) et contacts du Réseau
  (`contact_id`), choisis avec `AttendeeChips` ; une adresse tapée n'est pas gardée.
- **État calculé, jamais saisi** (refonte du 07/11, `lib/sessions/state.ts`, `sessionStateOf`) :
  Prévue avant le début, En cours pendant (toute la journée sans horaires), Compte rendu à
  compléter une fois finie, Terminée dès que le compte rendu est écrit, d'après la date, les
  horaires (heure de Paris, `timeInParis`) et `report_notes`. Seule « Annulée » est stockée
  (`status = 'cancelled'`, « ⋯ › Annuler la séance » / « Rétablir la séance »,
  `setSessionCancelled`) ; plus de champ Statut dans aucun formulaire (le bloc Sessions d'un titre
  lit le même état). Une session sans date racontée depuis un titre (`status` 'done' par défaut)
  attend son compte rendu, une session studio sans date reste Prévue.
- **Création en trois parties** (`StudioSessionForm`, `FormSection plain`) : La séance (type, date,
  horaires, lieu), Avec qui (**artistes obligatoires** : une séance peut précéder tout projet ;
  ingénieur choisi dans le Réseau ou nom gardé tel quel ; participants), Ce qu'on travaille (titres
  ou maquettes **à la création seulement**, ensuite depuis la page ; projets ; notes de
  préparation). Ouverte depuis un projet, son artiste est déjà choisi (`projectArtists`). Le
  **projet d'un titre vient tout seul** : les projets affichés d'une session = ceux qu'elle nomme
  puis ceux de ses titres (`projectsOf`, `project_masters`), le formulaire ne modifie que les
  premiers (`linkedProjectIds`). Type « Production » affiché « Composition » (valeur
  `production` inchangée), en tête de la liste.
- **Compte rendu** : un **résumé** libre (`report_notes`, obligatoire) et deux repères courts,
  **À retenir** (`report_takeaways`) et **Prochaine étape** (`report_next_step`), 2 000 caractères
  chacun ; `reported_at` / `reported_by` posés par trigger dès qu'une des trois parties change,
  effacés sans résumé. L'enregistrer rend la session Terminée et confirme les présents (les
  participants, pré-remplis). La section n'existe qu'à partir du début de la séance ; avant, la
  page commence par sa **Préparation** (les faits et les notes), puis titres et fichiers. Terminée,
  la page devient la fiche à lire : résumé, À retenir / Prochaine étape côte à côte, présents,
  « Rédigé par … », puis titres, fichiers, informations. **Responsable calculé** (Ibé) : le chef de
  projet du premier projet (nommé, sinon d'un titre), sinon qui a créé la session ; il voit le geste
  en tête de la section, les autres « À rédiger par … ».
- **Liste** : Date, Séance (type · lieu, ingénieur · durée), Artistes, Projets (en secondaire),
  État (« Compte rendu à compléter » en ton action, peu de couleurs). Pas de bouton par ligne : la
  ligne entière ouvre la session, l'état dit le geste.
- **Rushs et gros fichiers : des liens** (`master_session_links`, https), décision d'Ibé du
  05/11 (coût du stockage vidéo) ; l'import direct depuis PO vers Google Drive reste à faire
  (connexion Google de po@pdsrecords.com).
- **Calendrier** : type `session` (`lib/calendar/queries.ts`), annulées exclues, « mine » pour un
  participant. L'invitation Google Agenda de l'équipe interne n'est **pas encore** faite (même
  connexion Google à finir ; il faudra garder `google_event_id` sur la session).
- **Maquettes** : `masters.demo_status` (Brouillon, En développement, Validée, Abandonnée ; null =
  master officiel). Validée = **validation artistique** (`set_demo_status` : DG ou directeur
  créatif ; les autres statuts aussi avec `manage_catalog`), **pas** une décision de sortie.
  « Passer au catalogue des masters » (`promote_demo`, DG seul, maquette validée) renomme si
  besoin et fait de la **même ligne** un master (`promoted_at`, `promoted_by`) : sessions,
  fichiers, crédits, journal restent. Aucune mise à jour directe de `demo_status` (pas de droit
  de colonne). Une maquette se crée par « Nouvelle maquette » (Catalogue, `?maquette=1` sur la
  page Nouveau titre ; `create_master(p_demo_status => 'draft')`) ou depuis une session
  (`createSessionDemo`, artiste principal, état audio Maquette). `listMasters` les écarte par
  défaut (`demos: true` pour elles) : ni dans le Catalogue des masters, ni dans les sélecteurs
  d'un projet, ni dans les titres d'un artiste. Dernier onglet du Catalogue « Maquettes »
  (`/app/catalog/demos`, filtre Statut, « En cours » sans les abandonnées).

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
- **Catalogue** (liste des titres, retours Catalogue 01, 02 et 04 du 11/10/2026) : quatre
  onglets dans l'URL (`?state=`, `lib/catalog/title-views.ts`) : **Tous** (défaut), **En
  création** (sans audio ou maquette), **En production** (de la mise à plat au master final
  non validé), **Finalisés** (`masters.final_validated_at` : un master final **validé**, jamais
  seulement déposé). Les étapes audio deviennent un filtre (`?audio=`, « Non renseigné »
  compris), avec l'artiste (`?artist=`) et le projet associé (`?project=`) : bouton
  « Filtres » commun (`UrlFilters`, aussi au Réseau), combinable avec la recherche ; les
  onglets comptent ce que les filtres gardent. Colonnes Titre · Artiste · État audio
  (« Validé » à côté, `TitleAudioState`) · Projet associé · Dernière modification (le titre
  ou le dernier événement de son journal) · Sortie. État vide : « Tous vos morceaux, de la
  première maquette au master final. » Pas d'onglet « Distribués ».
- **Versions et validation** (retours Catalogue 07, 10, 13, 18 à 26 ; migration
  `…20261012100901_master_audio_review.sql`, `lib/catalog/audio-versions.ts`,
  `components/catalog/master-page/audio/`) :
  - **Déposer n'est pas valider.** Chaque fichier audio porte sa décision
    (`master_files.review_status` : null = pas examinée, `changes_requested` avec la note de
    ce qu'il faut corriger, `approved` ; qui et quand), prise par `review_master_audio`
    (`manage_catalog`, titre actif) **une seule fois** : pour changer d'avis, on dépose une
    nouvelle version. Une décision du workflow Master d'un projet (`decide_mix_version`) est
    recopiée sur le fichier (trigger `z_mirror_review`). Un master final approuvé pose
    `masters.final_validated_at` (trigger) : le titre passe dans « Finalisés ».
  - **Numéro de version** (Mix V2) : rang du fichier parmi ceux de la même étape, du plus
    ancien au plus récent, calculé par le code (`numberAudioVersions`), jamais lu dans le nom ;
    « Suit Mix V1 ». Sans décision : « En attente de validation » pour la dernière de son
    étape, « Non examinée » pour une plus ancienne (`audioValidationTone`). En tête de
    l'onglet : étape atteinte, dernière version déposée, dernière version validée (elles
    peuvent différer) ; version de référence = la validée de l'étape la plus avancée.
  - **Corriger l'étape** d'une version déposée au mauvais endroit (`reclassify_master_audio`)
    tant que personne ne l'a examinée ni utilisée ; le titre suit ses fichiers.
  - **Suppression protégée** : jamais une version validée ni une version qu'un workflow de
    projet utilise (version du mix, source confirmée : `master_file_in_use`) — politique RLS
    et message clair (`audioDeleteBlock`) ; sinon confirmée avec son impact.
  - **Écoute et retours** : lecteur dans la fiche (plus d'onglet du navigateur), retours
    d'écoute horodatés `master_file_comments` (moment en secondes ou toute la version, clic sur
    un moment = le lecteur y va), écrits par tout membre, jamais réécrits. **Retour ≠ décision**
    (Sacha, 12/10/2026) : un retour est un avis, sans effet sur la version ; « Demander des
    corrections » est la décision unique de la version (`manage_catalog`), qui attend une
    nouvelle version. À l'écran, sous chaque version : les deux derniers retours écrits (dans
    l'ordre du morceau), « Voir les n autres retours », puis un seul rang de boutons : « Ajouter
    un retour » en modale (moment repris de la position du lecteur), « Demander des
    corrections » (note pré-remplie avec les retours de la version, `commentsAsNote`,
    modifiable) et « Valider cette version ». Jamais de formulaire répété sous chaque version. Journal : « Version Mix … validée », « Corrections
    demandées… », « … reclassé de … en … » (`audio_reviewed`).
  - **Formats** : une seule liste (`AUDIO_FORMATS` : WAV, AIFF, FLAC, MP3, M4A, AAC, OGG) pour
    le sélecteur, le contrôle avant envoi, le serveur (`recordCatalogFile`) et l'aide ; 50 Mo
    par fichier (limite du bucket), dit avant le dépôt et en cas de dépassement. Les gros
    fichiers de travail (ZIP, stems) relèvent des fichiers de travail (à venir).
- **Vue d'ensemble d'un titre** (retours 01, 11, 12 ; refaite le 29/10/2026 d'après le proto
  `docs/protos/titre.html`) : d'abord la ligne de faits (`ModuleFacts` : état audio, version de
  référence, projet, **distribution
  séparée de l'audio** — Non préparée / En préparation / Livrée / Disponible,
  `loadDistributionState` : sortie en ligne, dépôt déclaré à The Orchard, dossier ou date de
  sortie), puis **« Maintenant »** (`TitleNow`, le cadre de `NowFrame`) : la prochaine action
  décidée par le code, `titleNextAction` (première version, version à examiner, version
  corrigée à déposer, étape suivante, projet à rattacher, pièce manquante), son pourquoi et ce
  qui suit. Puis le **« Dossier du titre »** (`loadTitleDossier`, `lib/catalog/master/dossier.ts`,
  seule source, la prochaine action lit ses manques via `missingOf`) : une ligne par pièce avec
  sa valeur (ISRC, ℗, parts, contributeurs, résumé des déclarations), « Pour la sortie » puis
  « Ensuite », seulement les déclarations applicables, « Master final » verrouillé jusqu'à sa
  validation dans Audio ; chaque manque se remplit **sur place** (`DossierAction` ouvre la
  fenêtre de l'onglet : `MasterEditForm`, `RightsForm`, `ContributorForm`, `SplitForm`), les
  déclarations et l'audio mènent à leur onglet. Les identifiants ne sont plus répétés dans
  « Informations » (variante, durée, artistes). « Créer un projet » est secondaire dans l'en-tête.
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

### 2 septies bis. Liste des projets pilotable (retours du 11/10/2026, PROJ-UX-01)

- Colonnes **Projet** (artiste en sous-ligne pour un projet musical) | **Responsable** (le
  responsable du projet lancé, sinon la personne à qui il est transmis) | **Type** | **Échéance**
  (`due_date`, « Non définie ») | **Statut** (administratif : Brouillon, Non transmis, Transmis à
  accepter, Précision demandée, Refusé, En cours, Terminé, `adminStatus`) | **Phase** (où il en est
  dans ses workflows, `phaseLabel` : jamais le vocabulaire musical pour un Contenu).
- Onglets **Tous | Brouillons | Actifs | Archivés** (`ProjectsBrowser`) : Tous exclut les archives,
  Brouillons = brouillons du formulaire + projets non transmis, Actifs = transmis, à accepter ou en
  cours ; les compteurs sont **les lignes affichées**, filtres compris. Recherche sur projet,
  artiste, responsable ; filtres **combinables** Type, Responsable, Statut, Échéance (dans les
  30 jours, dépassée, non définie) ; onglet et filtres dans l'URL (`?vue=`, `?q=`, `?type=`,
  `?responsable=`, `?statut=`, `?echeance=`), la liste étant déjà chargée (pas de requête de plus).
  Décision prise sans le ticket : un projet refusé ou en précision demandée est « Actif » (il est
  dans le circuit de transmission).

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

### Déclarations et droits ℗ (retours Catalogue du 11/10/2026, lot 6)

- **Statuts définitifs (retour 63)** : À vérifier, À effectuer, Déposée, Confirmée, À corriger,
  Refusée, Non applicable (`DECLARATION_STATUSES`, contrainte SQL). Un organisme sans déclaration
  notée se lit « À vérifier » (plus « À déposer »).
- **Applicabilité (retours 14 et 61)** : le dossier du titre ne compte que les démarches
  applicables (`declarationsSummary` : faites sur applicables, et organismes encore à qualifier) ;
  « Non applicable » sort du dossier ; une démarche peut être suivie par un tiers (`third_party`).
- **Justificatif (retours 59 et 60)** : choisi parmi les fichiers du titre (`proof_file_id`, même
  titre vérifié par trigger, jamais déposé deux fois) ; « Confirmée » avec justificatif = vérifiée,
  sans = confirmation seulement déclarée (`declarationVerified`).
- **Historique (retour 62)** : `master_declaration_events` en ajout seul, écrit par trigger (auteur,
  instant `clock_timestamp`, ancienne et nouvelle valeur de statut, référence, date, tiers,
  justificatif), affiché sous les déclarations.
- **Titulaire du ℗ (retours 54 à 58)** : la valeur proposée d'après la répartition master reste
  « proposée » tant qu'une personne ne la confirme pas (`confirm_master_rights`, `manage_catalog`,
  qui et quand) ; changer le titulaire ou l'année reprend la confirmation (trigger) ; une
  confirmation qui ne correspond plus à ce que propose la répartition est dite « À revoir ».
  Aides : ISWC facultatif et distinct de l'ISRC, année du ℗ distincte des dates de sortie.
  Migration `20261012100801`.

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

## 3 ter. Cadre d'écran commun (patron de module, proto « Projet complet », 18/10/2026)

**Titre de l'onglet** *(Sacha 05/11/2026)* : « Projet · Module · PDS OS » (« Piégé · Cadrage · PDS OS »).
Le layout du projet (`projects/[projectId]/layout.tsx`, `generateMetadata`) pose le modèle ; chaque
module donne son nom dans son layout (`metadata.title`, layouts `framing/` et `strategy/` créés pour
ça) et ses pages n'en déclarent pas ; une page hors module (Budget, Travail, Calls…) donne le sien,
**sans** « · PDS OS ». Même modèle pour un titre et un artiste du Catalogue (« Nuit blanche · Fichiers ·
PDS OS », `generateMetadata` de leur layout, onglets sans « · PDS OS ») ; toute autre page déclare
`metadata.title` complet (« Catalogue · PDS OS », « Connexion · PDS OS »). **Une nouvelle page déclare
son titre** : sans lui l'onglet n'affiche que « PDS OS ».

Socle de toutes les zones (sous-lots C0 à C5 de `docs/projet-complet/commons.md` § 13). Rendu :
`docs/DESIGN.md` § 4 ; composants : `docs/COMPOSANTS.md`.

- **En-tête** (`ModuleHeader`, `components/shell/module/`). Le layout du projet rend
  `<ProjectHeader isDefault />` (fil, h1 et pilules lus de l'URL par `moduleTrail`,
  `lib/ui/project-sections.ts` ; faits du projet par `projectHeaderData`, `lib/projects/header.ts`,
  `cache()`), suivi du `ReadOnlyNotice`. **Mécanisme choisi** : une page ou un layout de section
  qui sait plus que son URL (son étape, ses faits, « Qui fait quoi ») rend **son propre**
  `<ProjectHeader steps={…} facts={…} actions={…} />` en tête ; celui du layout s'efface en CSS
  (`group/project` sur la colonne, `group-has-[[data-project-header=page]]/project:hidden` sur le
  défaut). Pas de route parallèle (`@header` garderait l'ancien en-tête à la navigation client sans
  route attrape-tout), pas de contexte client (l'en-tête apparaîtrait après l'hydratation). Le
  Juridique (`LegalStepFrame`) et la Production (layout du livrable) le font déjà. Le Master et la
  Distribution n'ont **plus de chevrons** (décision C0) : leur étape finit le fil (`steps` par
  défaut de `projectHeaderData`) en attendant leur parcours. `ProjectPageTitle`, `SectionSteps`
  et `ProcessSteps` sont supprimés ; `masterSteps` / `distributionSteps` restent (listes d'étapes).
  **Barre du haut** (Figma PDS OS 304:20801, Sacha 29/10/2026) : `ProjectFrame` dessine une barre vide de
  `--project-bar-height` avec son filet au-dessus de la colonne, et `ModuleHeader` pose son fil en
  `absolute` dedans, la colonne (`relative`) étant la boîte positionnée la plus proche. Ainsi le fil reste
  rendu au serveur avec l'en-tête qui le porte, et s'efface avec lui quand une page rend le sien (ni
  portail ni contexte, qui ne l'afficheraient qu'après l'hydratation). **Piège** : aucune boîte
  positionnée (`relative`, `sticky`, `transform`…) entre la colonne et `ModuleHeader`, sinon le fil
  quitte la barre. Le fil commence au module (plus de segment projet, `moduleTrail`) ; la ligne de
  faits du projet n'est plus affichée par défaut, seulement les `facts` qu'un module donne.
- **Parcours** (`lib/ui/journey.ts`). `JourneyStep` : statuts `done | current | waiting | rework |
  blocked | upcoming | obsolete` (calculés, jamais stockés), `roles` (`exec`/`coord`/`valid`/`owner`
  → grille 5 ou 4 colonnes), `prereq` (clés du même parcours) + `external` (`{key, label, done,
  module?, source?}` d'un autre module, résolus par le loader), `next` + `nextExternal`, `group`,
  `alert` (`overdue`/`decision`), `due`, `blocked` (blocage signalé, ≠ statut verrouillé),
  `actor.kind` (`do`/`validate`). Une étape verrouillée (`blocked`/`upcoming`) est **en lecture
  seule** : `StepPanel` rend son contenu `inert` (la Production perd « Vous pouvez déjà préparer » :
  à rouvrir par son loader si une étape doit rester préparable, en la rendant `current`).
- **Un seul « Maintenant »** (`lib/journey/`). `loadProjectJourneys(projectId)` (`cache()`, un
  aller-retour `allInOrder`) réunit un loader par workflow (`JOURNEY_LOADERS`, `sources.ts`) :
  Juridique (`legalJourneyContext`, `manage_legal` seulement), Marketing = la Conception
  (`conception.ts`, pont depuis `lib/design/journey.ts`) + la Production de chaque livrable ouvert ;
  Cadrage, Master, Distribution, Stratégie, Activations, Suivi & bilan : **loaders vides typés**, à
  remplir par leur zone. Sortie : `journeys`, `mine` (ordre Cadrage, Marketing, Master, Juridique,
  Distribution), `waiting`, `validations` (`actor.kind === "validate"`). `elsewhereOf(all, steps)`
  = « À vous, ailleurs ». Une zone qui branche son parcours ajoute son loader ici, jamais une liste
  à part.
  Tous projets confondus (Accueil, Travail global, compteur de la barre, `my_todo` de PO,
  `project_status`) : `loadMyJourneyWork` / `loadShellActions`, lectures groupées (§ 3 bis).
  Point d'un workflow non démarré dans la barre : son infobulle dit pourquoi (`NavDot reason`,
  `planWorkflows`) — avant le plan, hors du plan lancé, ou dans le plan sans être lancé.
- **Résultat d'un geste** (règle 7). `WriteResult` (`lib/utils/write-result.ts`) accepte en plus
  `done`, `next[]`, `unlocked[]`, rétrocompatible. Une Server Action enveloppe son écriture dans
  `withOutcome(projectId, modules, done, write)` (`lib/journey/outcome.ts`) : parcours lus avant et
  après par `loadProjectJourneys` (gardés par version : l'avant est déjà en cache, l'après est
  réutilisé tel quel par la page que Next rejoue dans la réponse ; relu sans cache seulement si la
  version n'a pas bougé), comparés sur `modules`, `outcomeOf` dit qui agit désormais et ce qui
  s'est ouvert. Côté client, `useWriteSubmit` / `usePublishResult` font le toast (`done` + « . »)
  et posent le bandeau dans l'étape (`StepResultProvider` de `StepPanel`). Branché : confirmation
  du Juridique (`confirmLegalIntake`), lancement du plan (`launchLegalPlan`), soumission et décision
  d'un devis de Production (`submitQuote`, `decideQuote`). Coût : deux lectures des parcours des
  `modules` donnés, à limiter au module concerné.
  **Passage à la suite** (lot 3 des retours d'Ibé, 22/10/2026) : `next[]` porte `viewer` — le bandeau
  dit « À vous : … » ou « En attente de **X** : … ». `withOutcome` ajoute **toujours** (06/11/2026, Sacha :
  « Commencer la stratégie » laissait sur la page de départ ; `openNext: false` = rester sur place, à justifier)
  `open` (`{href, step}`, la première action **nouvelle** du lecteur) : `usePublishResult` l'ouvre
  (`router.push`) si elle est sur une autre page, et le résultat la suit (variable de module
  `carried`, lue par le `StepResultProvider` de la page d'arrivée) → « Étape ouverte pour vous :
  Cadrage › Brief de cadrage ». D'abord activé geste par geste (Cadrage, plan, Juridique, Master),
  c'est le comportement de **tous** les gestes passés par `withOutcome` depuis le 06/11/2026 : un geste
  qui n'en passe pas par lui (`write()` seul, ex. « Préparer un échange » qui reste dans l'étape) ne
  navigue pas. Les
  réponses aux 6 dimensions n'ont pas de toast (des dizaines par Cadrage) : « Réponse confirmée ·
  Date cible » dans le bandeau, au-dessus de la question suivante. Pendant le geste, le bouton dit
  ce qui se passe (« Envoi en validation… », « Validation en cours… » sur l'issue cliquée de
  `DecisionPanel`, carte occupée de `StartChoices pending`). L'attente d'un autre est `StepWaiting`
  (avatar + « En attente de **X** : … », pris sur l'acteur de l'étape), jamais une ligne grise.
  **Action en tête, lien direct** (lot 4 des retours d'Ibé, 22/10/2026) : `StepPanel` a un slot
  `lead` — le geste du lecteur, juste sous le « pourquoi », dans un encadré « À vous · *action de
  l'étape* » ancré `#a-vous` (`LEAD_ANCHOR`) ; le bandeau de résultat passe au-dessus. La grille
  `StepMeta` et la ligne « À vous : … » sous le pourquoi ont été retirées le 03/11/2026 (Ibé : trop
  de bruit) ; le Parcours et « Qui fait quoi » disent qui agit. Le parcours qui donne un
  `lead` met sur l'acteur `href` = `leadHref(page de l'étape)` ; Travail (global et du projet),
  l'Accueil, « Maintenant », la Vue d'ensemble, les sources de PO et `open` de `withOutcome` lisent
  `actionHref(step)` (= `actor.href ?? step.href`) : un clic ouvre la section, jamais le haut de
  la page. `step.href` reste le chemin seul (comparé au `pathname`). Branché sur le Master : la
  décision d'une version (Mixage, Mastering : `RoundLead`, la version, ses retours et la décision ;
  versions précédentes, tarif, lien privé et échanges repliés) et la question posée à une personne
  au Brief (`QuestionList` ; le Brief replié sous « Le Brief en cours »).
- **Piège `cn()`** : le paquet `cn` (tailwind-merge) ne connaît pas les tailles maison
  (`text-caption`, `text-micro`, `text-body-sm`…) et les **retire** dès qu'une couleur
  `text-[color:…]` suit dans le même `cn()`/`cva`. Dans un composant fusionné, écrire la taille en
  longueur explicite : `text-[length:var(--type-micro)] leading-[var(--type-micro-lh)]`.

---

## 3 bis. Fluidité de la navigation

Un clic ne doit jamais laisser l'écran figé, et changer de vue dans une même page (section
d'un projet, onglet d'artiste, étape du fil d'Ariane, filtre Actifs / Archivés) doit
s'afficher sans chargement.

- **Vues préchargées** : ces liens passent par `ViewLink` (`components/ui/view-link.tsx`),
  un `Link` en `prefetch` complet : la page **et ses données** sont rendues en arrière-plan
  **dès que la personne montre son intention** (pointeur **posé 150 ms**, focus clavier, doigt posé),
  plus à l'entrée dans l'écran ni au simple passage du pointeur (audit des chargements, 26/10 : en
  descendant la barre d'un projet, cinq pages se rendaient en même temps, 5 à 10 s chacune). Avant, une page de projet affichait 15 à
  20 `ViewLink` et chacun rendait sa cible en fond (40 à 250 requêtes) : la base mettait en file la
  page réellement ouverte derrière ces rendus. Un survol laisse 100 à 300 ms d'avance au rendu ;
  ne pas revenir au préchargement à l'écran tant qu'une page coûte plus de quelques requêtes.
  **Même règle pour un enregistrement ouvert depuis une liste** (audit du 27/10) : ligne de tableau
  (`DataTableLink`), ligne de carte (`CardRow`), projets du sélecteur (`ProjectSwitcher`). Avant, un
  `Link` simple préchargeait à l'écran toute fiche visible : afficher la liste Projets rendait trois
  projets à la fois (158 requêtes et 5,7 s chacun, base saturée) ; après, 2 requêtes.
- **Rien n'attend le projet entier** (audit du 27/10, `ProjectFresh`,
  `components/projects/project-fresh.tsx`) : après une Server Action, Next rend la page à nouveau
  **depuis la racine** (dès qu'un `revalidatePath`, n'importe lequel, a été appelé) et une frontière
  `Suspense` déjà affichée **retient toute l'action** jusqu'à ce que son contenu soit prêt. Chaque
  bouton du Cadrage attendait ainsi les états de tous les workflows et les parcours de tout le projet
  (110 à 230 requêtes, 3 à 6 s pour un geste qui en coûte 2 à 5). Les zones lues du projet entier
  passent donc sous `ProjectFresh` : barre du projet (entrées et pastilles, puis compteurs),
  en-tête (`ProjectHeader`, ses faits viennent des états des workflows ; un module peut lui passer
  la **promesse** de ses faits, `masterFacts`), « Maintenant » (`ProjectNowCard`, les actions
  « ailleurs » viennent de tous les parcours) et la barre des livrables de la Production. La
  frontière a pour clé la version du projet : après une écriture c'est une **nouvelle** frontière,
  l'action se termine dès que la page elle-même est prête, et le dernier rendu de la zone reste à
  l'écran (`KeptView` / `KeptFallback`, `components/shell/kept-view.tsx`, en mémoire de l'onglet,
  par zone et par URL) jusqu'à ce que le nouveau arrive ; à la première visite, un squelette de même
  forme. Un cadre de module ne lit plus que **son** parcours sur le chemin du clic (le contexte du
  module ; les Activations, `activationsJourneys`). **Règle** : une zone lue du projet entier dans
  une page de projet passe par `ProjectFresh`, jamais par un `await` dans le cadre.
- **`router.refresh()` après une action** (audit du 27/10) : inutile et coûteux (un second rendu
  complet) dès que l'action a appelé `revalidatePath` / `revalidateTag` / `refresh()` : la réponse de
  l'action porte déjà la page rendue à nouveau. On ne le garde qu'après une écriture qui ne passe pas
  par une action qui revalide (client Supabase du navigateur, `fetch` vers une route), sur un
  événement Realtime ou une attente (`call-processing.tsx`, seulement onglet visible).
- **Coquille de l'app en parallèle de la page** (`app/(app)/layout.tsx`) : la cloche
  (`loadNotifications`, deux allers-retours) et le compteur des demandes d'accès sont lus **pendant**
  que la page se rend (composants asynchrones `AppBell`, `CountedSidebar`, `CountedMobileNav`), plus
  avant elle.
- **Lien en attente** (`components/ui/navigation-progress.tsx`) : chaque `ViewLink` et chaque entrée
  de la navigation principale signale sa navigation en cours (`useLinkStatus`) ; une barre fine en
  haut de la fenêtre l'indique **après 150 ms** seulement (jamais pour une vue prête), sans rien
  changer au lien (pas de décalage). Un écran ne reste plus figé sans signe.
- **Bouton en cours** (28/10, même fichier) : un bouton qui se désactive dans les 400 ms suivant son
  clic (ou l'envoi de son formulaire) est pris pour une écriture en cours ; lui seul passe en
  `data-busy` (anneau qui tourne à la place de son icône après 120 ms, pas pâli, `app/globals.css`)
  et la barre court, jusqu'à ce qu'il redevienne actif ou quitte la page (30 s au plus). Aucun des
  366 boutons `disabled={pending}` n'a changé ; ses voisins désactivés en même temps pâlissent
  seulement. Avant, un clic ne faisait que griser le bouton (« on sait pas si on a cliqué »).
- **Base froide et saturée** (mesure du 28/10, `pg_stat_statements` de la pré-prod) : une lecture
  d'une ligne prend ~1 ms seule mais 20 à 70 ms en moyenne, `get_my_access()` 70 ms,
  `workflow_is_launched` 201 ms : PostgREST n'a que ~10 connexions, une page en lance des centaines,
  et il **ferme ses connexions après ~35 s sans requête** ; la session neuve paie 100 à 400 ms au
  premier appel de chaque fonction (catalogue à recharger). Chaque lecture évitée compte donc
  double après une pause.
- **Carte des fonctions** (audit du 07/11, `20261107230101_live_function_map.sql`,
  `lib/projects/function-map.ts`) : ce que lit chaque fonction SQL (tables et vues nommées, fonctions
  appelées, lecture seule) et les tables de chaque vue (`pg_depend`) arrivent en **une lecture pour tout le
  schéma**, chargée une fois par instance, revérifiée toutes les 5 min par sa signature (nombre de fonctions
  + version de ligne la plus récente de `pg_proc` : une migration qui touche une fonction la fait recalculer,
  une fois, sous verrou). Le serveur suit lui-même les appels. Avant, `live_rpc_reads` relisait et passait
  aux expressions régulières le corps de toutes les fonctions à chaque appel : 6 à 12 s au premier appel
  d'une connexion, requête n°1 de la base, et rien n'était servi du cache tant qu'elle tournait. Une
  fonction absente de la carte compte pour toutes les tables.
- **Cache des vues en base** (audit du 07/11, `20261107230201_project_view_cache.sql`,
  `lib/projects/view-store.ts`) : le cache de `byProjectVersion` ne vivait que dans la mémoire d'une
  instance ; chaque instance neuve (Vercel en démarre sans cesse, un `pnpm dev` relancé) recalculait tous
  les projets (Accueil : 1 688 lectures, 20 s ; Projets : 1 012). Chaque vue calculée est aussi écrite en
  base **après la réponse** (une ligne par lecteur, vue et projet ; JSON pur seulement, 1 Mo au plus), et
  une instance qui ne l'a pas en mémoire lit **en une requête** les lignes de toutes les vues et projets
  demandés dans le même instant, puis les sert sous les règles de la mémoire (version lue d'abord, aucune
  table lue changée, 5 min puis servie une fois et recalculée en arrière-plan, 72 h au plus). `reader` =
  hachage du lecteur (compte, poste, permissions) ; **le jour n'est plus dans la clé** : une vue d'un autre
  jour (étapes en retard) est servie une fois puis recalculée juste après la réponse, au lieu de tout
  recalculer, bloquant, au premier passage de chaque matinée. RLS : chacun ne lit et n'écrit que ses
  lignes. La table n'a **pas** de `project_id` (colonne `project`) et `attach_project_live` l'exclut : l'écrire
  ne doit jamais faire changer la version du projet.
- **Concurrence bornée** (audit des chargements, 07/11, `lib/supabase/request-gate.ts`) : toute requête serveur
  vers Supabase passe par `sentFetch`, qui n'en laisse partir que **16 à la fois** par processus ; les autres
  attendent leur tour (une requête annulée en attente sort de la file). Avant, un rendu envoyait tout d'un coup :
  la liste Projets, ~1 475 requêtes en 12 s (jusqu'à 289/s), et Kong local (512 connexions) en coupait,
  d'où des `fetch failed` ; sur la pré-prod, 137 à 1 118 requêtes attendaient ensemble la dizaine de connexions
  de PostgREST (0,8 à 129 s pour une lecture d'une ligne). Au-delà de ~10, une requête de plus ne fait
  qu'attendre plus longtemps dans PostgREST. `PERF_TRACE` ne compte pas l'attente d'une place dans la durée
  d'une requête envoyée. Reste à réduire le nombre de lectures lui-même (Accueil, parcours de tous les projets).
- **Temps réel par diffusion** (`20261027000401_live_broadcast.sql`) : la base envoie elle-même les
  signaux (`realtime.send`) sur des canaux privés, `project:<id>` (`changed`, depuis
  `project_live_bump`) et `notifications:<personne>` (`inserted`) ; qui peut écouter est décidé par
  le RLS de `realtime.messages` (le projet pour qui le voit, ses notifications pour la personne),
  personne ne peut y écrire. Avant, `postgres_changes` faisait relire le journal des changements par
  Realtime en continu (33 400 appels de `realtime.list_changes` en 24 h, ≈ 277 s de base).
  `ProjectLive` et `NotificationListener` s'abonnent avec `{ config: { private: true } }`.
- **Poids des pages** : le SDK d'IA (`ai`, `@ai-sdk/react`, ≈ 250 Ko) ne se charge plus sur chaque
  page : la conversation de l'onglet est créée au premier usage (`sharedChat()`,
  `components/assistant/shared-chat.ts`, gardée dans `chat-registry.ts` que le fournisseur lit sans
  le SDK) et la fenêtre Espace Espace charge la sienne à l'ouverture (`launcher-conversation.tsx`,
  `next/dynamic`). **Le dictionnaire français** (921 Ko, 271 Ko compressés) partait en entier dans un
  morceau de 700 Ko chargé par toutes les pages : un composant (et tout module de `lib/` qui n'est ni
  `server-only` ni `"use server"`) importe **seulement les domaines qu'il lit**
  (`import { calls } from "@/lib/i18n/fr/calls"`) et se fait un `fr` local
  (`const fr = { calls };`, les appels `fr.calls.…` ne changent pas ; une clé du tronc commun :
  `app: core.app`) ; si un nom de domaine est déjà pris dans le fichier, l'import est renommé
  (`designJourney as frDesignJourney`). Règle ESLint `no-restricted-imports` sur `components/**` ;
  le code serveur peut garder `import { fr } from "@/lib/i18n/fr"`.
- **Cache du routeur** (`next.config.ts`, `experimental.staleTimes`) : `dynamic: 30` (page
  revisitée en moins de 30 s), `static: 60` (vue préchargée, re-préchargée au survol une
  fois expirée). Jamais périmé après une écriture : tout `revalidatePath` d'une Server
  Action vide ce cache, les notifications Realtime font `router.refresh()`. Une écriture
  d'un collègue **sans** notification peut rester invisible 60 s au plus.
- **Rafraîchissement d'un projet** (audit des chargements, 26/10) : un rafraîchissement de
  `ProjectLive` relit tout le projet (200 à 300 requêtes) **et vide le cache du routeur**, donc les
  vues préchargées. Il ne part plus que pour un changement que l'onglet n'a pas encore montré :
  `project_live.changed_by` (= `auth.uid()`, nul pour un lien public ou un cron) fait ignorer à
  l'onglet visible ses propres écritures (l'action a déjà fait son `revalidatePath`) ; au retour sur
  l'onglet, après une coupure réseau ou une reconnexion Realtime, la version est relue d'abord (une
  petite lecture) et rien ne part si elle n'a pas bougé ; un onglet caché attend d'être montré.
  `NotificationListener` regroupe une rafale de notifications en un seul `router.refresh()` et
  l'onglet caché attend aussi. Mesure de départ (pré-prod, `pg_stat_statements`) : 10 215 requêtes
  en 44 min pour deux personnes ; `get_my_access` 0,4 ms seul, 140 ms en moyenne sous cette charge.
- **Une lecture par requête** (audit, 26/10) : ce que les états des workflows (layout du projet) et
  les parcours ou pages relisent passe par `cache()` ou `memoPerRequest(argsKey, …)`
  (`lib/utils/request-memo.ts`, clé = tous les arguments) : `listLegalPeople`
  (`lib/legal/legal-people.ts`, était lue 4 fois), `distributionCover` / `distributionLegalBlockers`
  (`lib/distribution/shared-reads.ts`), `loadTracking`, `loadStepView`, `loadMixVersions`,
  `loadFinalView`, `listCreativePeople`. Une Server Action relit toujours (le cache ne vaut qu'au
  rendu). Un nouveau lecteur partagé par deux loaders d'un même rendu prend le même chemin.
  **Lignes partagées** (audit du 27/10) : une table lue par plusieurs loaders d'un même rendu passe
  par un accesseur `cache()` qui lit l'**union des colonnes**, même filtre de projet et même ordre,
  chaque appelant filtrant en mémoire (`whereRows`) : `listProjectCreatives`, `projectPlanRow`
  (`lib/plan/queries.ts`), `projectDesignVersions` (`lib/design/versions.ts`, fichiers signés une
  fois), `lib/legal/shared-rows.ts` (`legal_clearances`, `legal_plans`, `legal_intakes`),
  `lib/master-workflow/shared-rows.ts` (`master_briefs`, `master_mix_versions`,
  `master_transmissions`) ; la fiche de production lit son projet une fois pour tous ses livrables
  (`sheetProjectRows`). Piège : une table à droits **colonne par colonne** (`grant select (…)`) ne
  se prête pas à l'union (une colonne refusée fait échouer toute la lecture). La provenance d'un
  élément (`resolveProvenance`) se lit en une requête imbriquée au lieu de trois.
- **Mesurer une page** : `PERF_TRACE=1` (local ou Vercel) fait écrire, après chaque rendu, une ligne
  `[perf]` dans les journaux du serveur (`lib/supabase/query-trace.ts`, branché sur le `fetch` de
  `createClient`) : chemin, type (`render` = page, navigation ou préchargement, que Next ne
  distingue pas pour l'app ; `action` = une Server Action et la page qu'elle rend à nouveau, une
  seule ligne par requête), nombre de
  lectures demandées (avant le regroupement de `withQueryBatching`) et combien sont distinctes
  (même URL comptée une fois), combien **partent réellement** vers la base (`sent`, après le
  regroupement : `sentFetch`, `lib/supabase/batch.ts`), durée de bout en bout,
  **profondeur** (la plus longue chaîne de requêtes faites l'une après l'autre = les allers-retours
  attendus en série) et les 5 plus lentes. Cible d'une page : quelques requêtes, profondeur ≤ 3,
  moins de 200 ms. Juger en `pnpm build && pnpm start`.
- **Workflows lancés en une lecture** (audit, 26/10) : `launchedWorkflows(projectId)`
  (`lib/plan/queries.ts`, RPC `launched_workflows`, même règle que `workflow_is_launched`) ;
  `isWorkflowLaunched` la lit. Mesure du 26/10 sur la pré-prod : `workflow_is_launched` était l'appel le
  plus coûteux d'un rendu (460 appels, 200 ms en moyenne sous charge).
- **Cache des parcours** (audit, 26/10, `lib/projects/version-cache.ts`) : `loadWorkflowStates`,
  `loadProjectJourneys` et les contextes de parcours (Cadrage, Conception, Master, Juridique, Suivi &
  bilan) sont gardés **d'une requête à l'autre** par `byProjectVersion(nom, lecteur)` (toujours sous
  `cache()`), pour une clé = projet + `project_live.version` + lecteur (tout l'`Access` : compte,
  poste, permissions) + jour à Paris, 5 min au plus, 300 entrées par instance. **La version est lue
  avant les données** : une entrée n'est jamais plus ancienne que sa version. `project_live.version`
  est désormais la version de **tout le projet** (`20261026100201_project_live_everywhere.sql`) : un
  déclencheur `zz_project_live` sur chaque table qui mène à un projet (`project_id`, ou par
  `project_stage_id`, `call_id`, `master_id` via `project_masters`, le projet et ses titres), une
  incrémentation par projet et par transaction ; exclus : `project_live`, `notifications`, les parties
  de l'enregistreur. **Toute nouvelle table liée à un projet** : `select public.attach_project_live();`
  dans sa migration. Ce qui ne mène à aucun projet (un nom dans le Réseau) est relu après 5 min ;
  les liens signés durent 15 min au moins. **Après 5 min** (retour sur un projet après une pause), une
  vue dont les tables n'ont pas changé est encore servie, au plus 8 h, et **recalculée en arrière-plan
  une fois la réponse envoyée** (`after`) : on n'attend plus les ~260 requêtes du projet (1,3 s au lieu
  de 4,8 s mesurés), seul ce qui n'est pas une table du projet peut montrer son état d'avant la pause
  jusqu'à la page suivante. Jamais pour une vue qui contient un lien signé (`plain-data.ts`), ni
  quand la session expire dans moins de 10 min. Piège : Next refuse `cookies()` à un Server Component
  dès que `after` a commencé (pour toute la requête, pas seulement dans le rappel) ; le recalcul lit
  donc la session dans les cookies relevés pendant le rendu (`withCookies`, `lib/supabase/server.ts`),
  sans pouvoir réécrire une session renouvelée, d'où la marge de 10 min. Pas de ligne de version (projet invisible pour le
  lecteur) = jamais servi du cache ; un résultat qui n'est pas de la donnée pure (fonction, instance
  de classe) n'est jamais gardé : on garde la donnée et on rajoute la fonction à chaque lecture
  (`designJourneyContext`, `distributionContext` et leur `nameOf`) ; chaque requête reçoit sa
  copie. Gardés aussi depuis le 27/10 : `strategyStepData`, `distributionContext`. Deux requêtes simultanées (préchargement au survol puis clic) partagent un seul calcul.
- **Cache par table** (audit du 28/10, `20261028000101`/`000201`, `lib/projects/live-deps.ts`,
  `request-cache.ts`) : une écriture ne recalcule plus tout le projet (263 requêtes après une
  contrainte du Cadrage, 4 s sur une base chargée). `project_live.tables` donne, par projet, la
  version à laquelle **chaque table** a changé (même déclencheur `zz_project_live` : une version et un
  signal par transaction, chaque table écrite tamponnée). Le serveur **note ce que chaque vue lit**
  (le `fetch` du client Supabase : la table, les tables imbriquées par son `select`, et pour une
  fonction ses tables d'après la base, `live_function_map`, avec les tables de visibilité RLS) et la
  ressert tant qu'**aucune de ses tables** n'a changé. Les lectures partagées par `cache()` notent
  leurs tables chez chaque appelant : **`trackedCache` remplace `cache` de React** dans `lib/`
  (même comportement), `memoPerRequest` aussi. Parcours (`journey-<module>`) et faits des états
  (`wf-master`, `wf-legal`, `wf-distribution`, `wf-marketing`) sont gardés **par workflow**. En
  plus, **chaque réponse** lue pendant le calcul d'une vue, ou lue par une page sur un projet
  (`project_id=eq.`, la ligne du projet, une fonction avec `p_project_id`), est gardée par lecteur,
  projet et requête exacte, et resservie tant que ses tables n'ont pas changé : une vue recalculée ne
  renvoie à la base que les lectures de ce qui a changé. Lectures seules (table, fonction `STABLE`),
  réponses 2xx, 5 min au plus ; pas dans une Server Action pour les lectures de page (tampons relus
  au rendu, donc après l'écriture). Mesure (pré-prod, depuis Paris) : après une contrainte, **22
  requêtes au lieu de 263** ; une page déjà vue, **9 en moyenne** (22 au plus) au lieu de 13 à 57.
  `PERF_TRACE=1` ajoute une ligne `[cache] <vue> computed again: changed: <tables>` par vue refaite.
  Une fonction lue par une vue doit rester `STABLE` si elle ne fait que lire (sinon jamais gardée).
  **Une vue SQL lue par l'API** (`current_field_values`, `library_files`, `marketing_review_*`) n'est
  jamais tamponnée : `VIEW_TABLES` (`live-deps.ts`) la traduit en ses tables. Toute nouvelle vue y
  entre, sinon la page reste sur son état d'avant (07/11 : « Confirmer » la date cible refusé en
  `invalid_transition`, le Cadrage resservi sans la réponse confirmée).
  Une Server Action relit sans cache (`readProjectJourneys`). Conséquence pour `ProjectLive` : la
  page ouverte se met à jour pour un changement d'un collègue dans **n'importe quel** workflow.
- **Entrée d'un module** (28/10, `lib/journey/landing.ts`) : `/framing`, `/strategy`, `/master`,
  `/legal`, `/release`, `/design`, `/production`, `/review`, `/activations` ne font que rediriger vers
  l'étape qui attend le lecteur. Une redirection lancée après le début de la réponse (sous un
  `loading.tsx`) affiche **une page vide** (`HandleRedirect` de Next rend `null`) le temps de
  redemander l'étape, puis un second squelette (mesuré : squelette, vide, squelette, contenu). La barre
  du projet, ses puces mobiles, les pilules du Marketing et le fil d'Ariane lient donc **directement**
  l'étape d'arrivée, calculée par `moduleEntries` sur les parcours que la barre lit déjà pour ses
  compteurs (aucune requête de plus), transmise aux pilules et au fil par `SubModuleCountsReporter` /
  `useModuleEntries`. Les pages d'entrée restent pour les anciens liens (notifications, e-mails) et
  suivent la même règle (`masterEntry`, `reviewEntry`, `distributionEntry`, `productionEntry`, qui va
  aussi droit à l'étape du livrable). Un module sans parcours pour ce lecteur (Conception avant la
  Stratégie validée, Activations sans action à soi) garde le lien vers sa page.
- **Squelettes** (`loading.tsx`) pour ce qui n'est pas préchargé (première entrée dans une
  page) : une page de premier niveau a le sien (`PageLoading`), listes avec leur vrai titre,
  sections d'un projet (`ProjectSectionLoading`, sous l'en-tête et les barres qui restent),
  onglets d'artiste, accueil (`HomeFrame` : PO utilisable avant les cartes). Piège : un
  `loading.tsx` enveloppe **aussi les segments enfants**, et le layout asynchrone d'un
  enfant s'attend sous le `loading.tsx` du parent. D'où les groupes `(list)` et `(home)` :
  sans eux, ouvrir une fiche artiste montrait le squelette de la liste des artistes.
  **Règle** (21/10) : pendant une navigation, Next n'affiche que le `loading.tsx` du segment
  **dont l'enfant change** (la frontière est recréée pour le nouvel enfant) ; plus haut, la
  transition garde l'ancienne page figée à l'écran, sans squelette. Donc tout dossier d'un
  projet qui a plusieurs enfants (une page + des sous-pages) ou un enfant dynamique (`[id]`)
  a son `loading.tsx` : Stratégie, Cadrage, Conception (et ses fiches, versions, décisions),
  Master, Juridique, Suivi & bilan (et ses rapports), Activations (et une activation, ses
  cibles), Calls, Production (et un livrable). Une ligne suffit
  (`export { ProjectSectionLoading as default } …`) ; un changement de `?param=` ne recrée
  pas la frontière (la vue reste, rafraîchie sur place). Exception voulue : l'entrée dans une
  fiche (`[projectId]`, `[artistId]`, `[masterId]`…) lit l'enregistrement **avant** tout
  squelette, pour un vrai 404 ; le préchargement des liens la rend d'ordinaire immédiate.
- **Streaming** : accueil et Travail affichent l'en-tête tout de suite, le contenu arrive
  derrière un `<Suspense>` (`HomeFeed`, `WorkList`).
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
- **Région des fonctions** (`vercel.json`, `regions: ["dub1"]`) : les fonctions Vercel tournent à
  Dublin, à côté de la base Supabase (`eu-west-1`, Irlande). Sans ce réglage, Vercel les place à
  Washington (`iad1`) et chaque requête à la base traverse l'Atlantique (~80 ms aller-retour,
  multiplié par les lectures en série d'une page). Changer la région de la base = changer celle-ci.
- **À savoir** : `next dev` ne précharge jamais et compile chaque page à sa première visite.
  La fluidité se juge avec `pnpm build && pnpm start`.
- **Pas de cascade entre un layout et sa page** (finitions du 19/10) : une page ne commence à lire
  qu'une fois son layout répondu. Le layout du projet lance `loadWorkflowStates` et `planLaunchedAt`
  **avec** le projet, sans les attendre (ils servent les zones sous `ProjectFresh`) ; `WorkflowGate` et les layouts Master / Juridique lisent `isWorkflowLaunched`
  avec l'accès et, lancé (le cas courant), rendent la page sans autre requête ; la fiche de
  production (`loadSheet`) lit en deux tours au lieu de quatre (hand-offs avec le premier,
  `readHandoffs`), la préproduction en deux au lieu de trois, et `journeyContext` lance les
  lectures du parcours dès que la fiche est connue (`preloadJourney`), pendant la phase et la
  prochaine action. Outil : un `fetch` instrumenté dans `createClient` (non committé) et le
  regroupement des requêtes par vague donnent la profondeur de la chaîne ; en `next dev`, le
  suivi asynchrone de React (développement seulement) prend l'essentiel du CPU : ne juger qu'en
  `pnpm start`.
- **Lectures groupées des vues multi-projets** (20/10, `lib/supabase/batch.ts`) : l'Accueil, le
  Travail global, le compteur de la barre et `my_todo` lisent les parcours de **chaque** projet
  lancé (`loadMyJourneyWork`, `lib/work/journeys.ts`) avec les loaders mêmes des pages du projet
  (une seule source de vérité, rien de réécrit). Sous `withQueryBatching`, le `fetch` du client
  serveur (`batchingFetch`) retient chaque lecture 2 ms : les lectures identiques à un id près
  (`project_id=eq.A`, `master_id=in.(a,b)`, une condition `calls.project_id` sous `!inner`)
  partent **en une requête** (`in.(A,B…)`) et chaque appelant reçoit ses lignes, filtrées sur
  toutes ses conditions d'id, ordre gardé (`batch-plan.ts`) ; un compte sans lignes (`head`,
  `count=exact`) se fusionne de même, chacun comptant ses lignes ; les lectures et RPC strictement
  identiques partent une fois. **10 requêtes en vol au plus** : une lecture qui attend son tour
  continue d'agréger la même lecture des autres projets (une base chargée fusionne plus au lieu
  d'empiler). Une lecture identique **déjà répondue** dans le même périmètre est servie de sa réponse
  (un périmètre est un seul moment de lecture, sans écriture dedans ; une réponse en erreur n'est pas
  gardée). **Server Actions** (27/10) : `withOutcome` lit les parcours d'avant et d'après chacun dans
  son périmètre, puisque `cache()` de React ne fait rien dans une action (le lancement du plan
  demandait 829 lectures pour 271 distinctes). Une lecture avec `offset`, un `limit` > 1 000, une écriture, un `single()` partent
  tels quels ; une réponse fusionnée coupée (1 000 lignes) ou une ligne impossible à replacer →
  chaque lecture repart seule. Hors de ce périmètre, le `fetch` est inchangé. Les projets se lisent
  tous ensemble (40 au plus). Piège : une requête sans `order` (ou des égalités sur la colonne
  d'ordre) peut rendre ses lignes dans un autre ordre fusionnée que seule, comme le permet SQL ;
  un ordre qui compte se dit dans la requête (`created_at` puis `id`). Mesures :
  `docs/projet-complet/RECETTE.md` § 8.
  Écarté : un chargeur « actions seules » par workflow ou une fonction SQL des actions, qui
  recopieraient les règles des parcours (deux logiques qui divergent).
- **Vrais 404** (20/10) : **aucun `loading.tsx` au-dessus du cadre d'un enregistrement**. Un
  `notFound()` levé sous une frontière `Suspense` arrive après le début du flux : Next garde 200
  et ajoute `noindex`. `app/(app)/app/loading.tsx` est donc supprimé ; chaque segment a le sien
  (`work`, `assistant`, `feedback`, `labo`, `…/new`, `contracts/templates/(list)`), et un
  enregistrement est lu **dans le layout de son segment dynamique, avant** son `loading.tsx` :
  projet (`ProjectLayout` ne lit que l'accès et le projet, puis rend `ProjectFrame` sous un
  `Suspense` à repli `PageLoading` ; les autres lectures du cadre partent en même temps), artiste et
  master du catalogue (layouts existants), call interne (`getMeeting`), contact (`getNetworkContact`
  en `cache`), contrat (`findContract`), modèle de contrat (`findTemplateSeries`), toujours la
  lecture même de la page (`cache()`, aucune requête de plus). Coût : le premier octet attend cette
  lecture (une requête, déjà sur le chemin critique). **Reste 200 + `noindex`** : un id inconnu
  **sous** un projet existant (livrable, activation, version, compte rendu…), car le
  `loading.tsx` du projet (squelette de section sous la barre et l'en-tête) l'enveloppe ;
  l'éviter demanderait une lecture avant le squelette de chaque section : écarté.
  **Corrigé (20/10, `pc/f2-signatures`)** : le proxy transmet le chemin servi (`x-pds-path`, toujours
  réécrit par lui) et `ProjectLayout`, au-dessus du squelette, demande à
  `lib/projects/record-guard.ts` (`missingProjectRecord`) si l'enregistrement nommé existe : livrable
  de Production (`strategy_deliverables`), activation, call, compte rendu de Suivi & bilan, document
  de Stratégie (une lecture `id + project_id` sous RLS, en parallèle de celle du projet), route du
  Juridique (`legalRouteOf`, pure). Absent → `notFound()` avant le flux : **404**. Le layout ne se
  rejoue pas d'une page à l'autre du projet : la lecture n'a lieu qu'au chargement complet ou à
  l'entrée dans le projet, jamais en navigation interne (où la page dit toujours « Page
  introuvable »). Reste 200 : une démarche juridique inconnue (`/legal/person/<inconnu>`), qui
  demanderait tout le contexte du Juridique avant le premier octet.

---

## 4. Calls, audio, transcription (étape 4 + enregistreur)

- **Deux portes vers les mêmes calls** (Sacha, 05/11/2026 ; `lib/calls/door.ts`, `CallDoor`), comme
  Travail : **Calls** de la barre principale (`/app/calls`, tous les calls visibles) et **Calls**
  du projet, dans Pilotage à côté de Travail (`/app/projects/<p>/calls`, plus caché). Un call
  s'ouvre **dans la porte d'où on vient** : depuis Calls, `/app/calls/<id>` (`routes.call`, ex-
  `routes.meeting`) sert désormais **tout call visible**, réunion interne ou call de projet
  (`getVisibleCall` = `getCall(…, "any", …)`, la barre reste sur Calls, « Projet : X › » mène au
  projet) ; depuis le projet, `/app/projects/<p>/calls/<id>` (dans le cadre du projet, fil
  « Calls / titre », le titre du call en h1 de l'en-tête de module). Les URLs existantes ne
  changent pas, rien à rediriger ; le calendrier des Calls ouvre aussi dans Calls, le Calendrier
  (« là où ça se décide ») garde le lien du projet (`CallListItem.href`). **Un composant par
  pièce** : la liste (`CallsListView` → `CallsList` → `CallsTable`, lignes de `listAllCalls`,
  filtré par `projectId` pour un projet) et la page (`CallPage` : lectures, droits, module,
  projets des tâches, puis `CallWorkspace` ; `CallHeader` dessiné selon la porte) ; seuls le
  retour, le fil et la navigation allumée diffèrent. `CallPage` met l'`EditAccessProvider` hors
  d'un projet (le cadre du projet le fait dedans). Le compte rendu partagé
  (`/app/calls/<id>/report`) reste hors du garde 404 du call (`[callId]/(call)/layout.tsx`) : un
  membre à qui il est partagé le lit sans voir le call.
- **Participants d'un call planifié** (retour d'Ibé, 05/11/2026) : « Modifier les participants »
  dans la carte Participants (`CallParticipantsButton`, responsable du call seul), le même champ
  `AttendeeChips` que « Nouveau call », rempli de qui participe (`readParticipantsForm`,
  `lib/calls/participants.ts` ; un membre sorti de l'équipe du projet reste affiché). À
  l'enregistrement (`saveCallParticipants`) : membres et invités ajoutés / retirés par la session
  (RLS `is_call_owner`), un membre ajouté est notifié (`call_invited`), et l'événement Google d'un
  call à venir reçoit la nouvelle liste (`setMeetEventGuests`, Google envoie les invitations).
- **Liste des calls** (les deux portes) : onglets Tous / À venir / Passés, recherche, filtre Projet
  (Calls seul) ; les prochains d'abord, le plus proche en haut, puis les passés, titrés « À venir »
  / « Passés » sous « Tous » ; Projet à la teinte du projet (comme Travail), « Rejoindre » et « ⋯ »
  en bout de ligne. Le « ⋯ » d'une ligne est **le même menu** que celui de la page
  (`CallSheetMenu` : lien de la visio, fiche copiée ou écrite en e-mail, « Supprimer la réunion »
  pour la direction et le responsable du call, `canDeleteCall`, `delete_call`), visible au survol à la souris (`RowActions reveal`), toujours
  sur écran tactile ; la fiche s'écrit au clic depuis la ligne (`agenda`, `guestEmails` lus par
  `listAllCalls`). « Nouveau call » d'un projet : bouton de l'en-tête (modale, comme « Nouvelle
  réunion ») ; formulaire sur place quand le projet n'a aucun call.
- **E-mails d'un call** (`lib/email/`) : `CallPageData.emailEnabled` (= `emailEnabled()`, calculé au
  serveur) décide de l'écran. Résumé aux participants : les invités extérieurs avec adresse (et sans
  lien privé) le reçoivent de PDS OS, nommés avant l'envoi et dans le toast (« … et par e-mail à X,
  Y ») ; « Écrire l'e-mail aux invités » (`mailto:`) ne reste que pour les autres, ou pour tous
  quand l'e-mail est coupé. Partage du compte rendu : `shareCallReport` rend `unreached` (adresses
  non atteintes : e-mail coupé, erreur) ; le toast dit à qui il est parti, le `mailto:` ne vise que
  `unreached`.
- Page d'un call, **une étape à la fois** : enregistrer (fichier en repli, replié) →
  traitement **automatique** dès l'envoi (`CallProcessing` : transcription puis compte
  rendu, suivi `ProcessingSteps`, « Réessayer » seulement en cas d'échec, relecture de
  l'état toutes les 5 s si un traitement tourne ailleurs) → redirection vers la relecture
  de l'échange dans le Cadrage (`?step=review&call=…`, § 6).
  Consentement **accordé par contrat** (défaut `granted`, `…260926002301`) : plus d'écran.
- **Enregistrer sans ouvrir la page du call** (Cadrage, Sacha 28/10/2026 ; **tous les modules**
  depuis le 07/11/2026 : Stratégie, Conception, Production, Master) : dans la carte de l'échange
  prévu, « Enregistrer l'échange » / « le call » est l'enregistreur lui-même (`PlannedCallInPlace`,
  `components/calls/prep/` : `PlannedCallFacts` + `CallRecorder compact` + dépôt d'un fichier) : au
  clic, Chrome demande l'onglet du Meet (le clic est le geste utilisateur qu'exige
  `getDisplayMedia`), l'enregistrement se fait dans la carte, puis `CallProcessing` y lance
  transcription et compte rendu et mène là où PO propose (Les 6 dimensions, la Stratégie, les
  Intentions, l'étape du call de production ; le Master reste sur le Brief, « Proposer pour le
  Brief » dans le tableau des échanges). Un geste du module se pose à côté (`beside` : « Annuler
  l'échange » du Cadrage). La page du call reste l'archive (Calls, Calendrier), plus un détour. Garder l'onglet PDS OS
  ouvert : quitter la page arrête l'enregistrement (ce qui est sauvé reste repris).
- **Enregistreur dans l'app** (`components/calls/call-recorder.tsx`, `use-recorder.ts`,
  `recorder-media.ts`, `recording-live.tsx`, `recording-review.tsx`) :
  - source « onglet » (Meet, Zoom… + micro mixés) ou « micro seul » ; l'onglet n'est proposé que
    dans Chrome / Edge (seuls à partager le son d'un onglet, `userAgentData`) ; **l'onglet est
    demandé avant le micro**, encore dans le clic : sinon l'invite du micro consomme le geste
    utilisateur et `getDisplayMedia` échoue comme une annulation (retour « Échec de
    l'enregistrement », 05/11/2026). Annulé (`tab_cancelled`), refusé par le navigateur
    (`tab_failed`) ou sans son (`no_tab_audio`) : le choix « Une réunion sur place » (micro seul)
    réapparaît, même pour un call en visio ;
  - Opus 32 kbit/s ≈ 14 Mo/h ; chrono, jauge, pause, réécoute, confirmation avant
    suppression, garde `beforeunload` ;
  - arrêt auto si le partage d'onglet est coupé ; **raccrocher ne suffit pas** (l'onglet
    reste partagé) → rappel affiché + **alerte après 2 min de silence de l'onglet**
    (`TAB_SILENCE_MS`), mesurée sur l'onglet seul, par minuteur (les animations sont
    suspendues dans un onglet caché) ; titre de l'onglet = état de l'enregistrement.
  - Pièges : `AudioContext` souvent suspendu après l'autorisation → `resume()` ;
    Chrome ne partage le son d'un onglet que si la vidéo est demandée (elle est coupée).
- **Sauvegarde au fil de l'eau** (PROJ-BUG-01, 11/10/2026, `…20261011400101`) : avant, tout
  l'enregistrement restait en mémoire jusqu'à « Envoyer » (un rechargement le perdait) et un
  micro débranché ou retiré laissait « Enregistrement en cours » sur du silence. Désormais :
  - une **partie** (`call_recording_takes`, numérotée en SQL par `begin_recording_take`) par
    session d'enregistrement, ouverte avant le premier son ; ses **morceaux** de 20 s
    (`call_recording_pieces`, `PIECE_MS`) sont envoyés **dans l'ordre** par le navigateur
    (`use-recording-saver.ts` : Storage `org/call/takes/<take>/<seq>.webm` puis ligne en
    `on conflict do nothing`, réessayés sans fin) ; un morceau n'est « sauvegardé » qu'une
    fois sa ligne écrite, le reste est affiché « en attente » ;
  - « Enregistrement en cours » seulement quand des données sonores arrivent (micro `live`,
    `AudioContext` `running`), sinon arrêt après 5 s ; micro `ended` → interruption
    (`permission_revoked` si la permission est passée à `denied`, sinon `device_lost`) ;
  - diagnostics distincts (`lib/i18n/fr/microphone.ts`, partagés avec la dictée) :
    autorisation refusée / bloquée pour le site / bloquée par le système, aucun micro, micro
    occupé, partage d'onglet annulé ; avant tout clic, lecture **sans demande**
    (`permissions.query`, `enumerateDevices`, `use-mic-diagnosis.ts`) ;
  - après un rechargement ou une interruption, `RecordingRecovery` : durée sauvegardée et
    jusqu'à quelle heure, **audio manquant entre deux parties** (`recordingGaps`), puis
    « Reprendre l'enregistrement » (nouvelle partie), « Envoyer la partie sauvegardée »,
    déposer un fichier, ou « Supprimer » (`discarded_at`, rien n'est effacé) ;
  - « Envoyer » (`sendRecording`) attend la fin des envois, assemble chaque partie en un
    fichier (ses morceaux bout à bout = la sortie du MediaRecorder), idempotent ; la première
    partie devient `calls.audio_path`, la transcription lit **toutes** les parties dans
    l'ordre (`joinTranscripts`, temps décalés, aucun texte ajouté) et le lecteur les montre
    l'une après l'autre. Pas de « Continuer sans enregistrement » : un call sans audio n'a
    pas d'état métier (point à trancher).
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
- **Page commune** `CallWorkspace` (`components/calls/call-workspace.tsx`, refaite selon le proto
  `docs/protos/pages.html` le 29/10/2026), pour le call d'un projet et la réunion interne :
  en-tête (retour, titre et état à côté, « projet · quand · organisé par X », « Rejoindre » tant
  qu'il est à venir, « ⋯ » = fiche du call), puis **« Maintenant »** calculé par le code
  (`lib/calls/now.ts`) selon l'état et le rôle, dans l'ordre : enregistrer le call (le jour même ou
  15 min avant, enregistreur `compact` en place, ancre `#call-recording`) → déposer un
  enregistrement manquant (créneau passé) → traitement (pour tous) → trancher les propositions
  (lien vers le module : Cadrage, Stratégie, Conception, Production) → créer les tâches (ancre
  `#call-actions`) → envoyer le résumé → clôturer ; « Ensuite » liste la suite ; un autre lit
  « En attente de X » ; un call clôturé dit « Clôturé le … » avec partage, PDF, correction et
  historique. Ensuite Décisions et actions, Compte rendu (lignes du rapport, citations, état donné
  par la clôture), Ordre du jour, Transcription repliée (`<details>` : un lien `#t-…` l'ouvre) ; à
  côté Participants, préparation, Enregistrement, Visio. Données lues par `loadCallPage`
  (`lib/calls/page-data.ts`). Un call d'un autre jour garde son enregistreur replié
  (« Enregistrer le call ») pour le « Enregistrer l'échange » des modules. **Résumé avant la
  clôture** (proto) : sur la page du call, son brouillon (`summaryDraft`) reprend ce que la clôture
  a gardé, sinon les décisions telles que dites et les actions devenues tâches (qui, échéance),
  jamais les points à arbitrer ; relu par le responsable avant l'envoi ; les invités extérieurs
  reçoivent le même texte en `mailto:` depuis la messagerie de l'utilisateur.
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
  chacune avec sa phrase et la tâche qui en est née (`tasks.source_report_item_id`) ou
  « Créer la tâche » (`ActionTaskButton`, fenêtre : responsable et échéance obligatoires, choisis
  par une personne, jamais par PO ; rouges avec leur raison au premier essai). Call de projet : son responsable crée la tâche dans le projet. Réunion
  interne : la tâche va dans un projet lancé **dont le lecteur est responsable**
  (`listOwnedProjects`) — la RLS de `tasks` ne laisse créer que le responsable.
- **Clôture et partage d'un call** (PROJ-AMEL-01, lot 10, migration `…20261012101701`) : depuis le
  proto du 29/10, dans « Maintenant » (dernier geste, puis « Clôturé le … » ; la carte des cinq
  sorties a disparu, ce qui reste à revoir est dit dans la fenêtre). « Clôturer le call » fige le compte rendu en une **version**
  (`call_closures` : résumé, décisions, actions avec responsable et échéance de leur tâche, points
  ouverts, titre et date du call, et ce qui restait à revoir), écrit par le code (`lib/calls/closure.ts`) ;
  « Corriger le compte rendu » en fait la suivante, les précédentes restent. Seul le propriétaire du
  call clôture et partage (`is_call_owner`). « Partager le compte rendu » : complet ou synthèse
  (résumé et décisions), **jamais la transcription ni l'audio** ; les membres choisis sont notifiés
  (`call_report_shared`) et lisent cette version seulement (`/app/calls/[id]/report`, RLS
  `call_report_shared_with_me`, dans le périmètre partagé) ; les adresses extérieures reçoivent
  l'e-mail écrit depuis la messagerie de l'utilisateur (`mailto:`), PDF à côté
  (`/api/calls/[id]/report`). Chaque partage garde qui, quand, quel périmètre et à qui
  (`call_report_shares`). **Point à trancher** : le ticket demande une information et une
  confirmation explicites avant tout enregistrement ; le consentement reste donné par contrat
  (décision de Sacha, aucun écran) tant qu'elle n'est pas revue.

## 4 bis. Calls planifiés comme sur Teams (10/10/2026)

Demande de Sacha : « un call comme sur Teams ». Deux vues de la page Calls, la même grille dans
la semaine du Calendrier, et une création de call qui donne un lien Google Meet.

- **Deux vues** de `/app/calls`, choisies dans l'URL (`ViewToggle` dans l'en-tête) : **Liste par
  défaut** (Sacha, 01/11/2026 ; Tous / À venir / Passés, filtre Projet) et **Calendrier**
  (`?display=calendar`, défaut du 10/10 au 01/11). Le même calendrier (`CallsCalendar`, avec
  `items`) fait la **semaine du Calendrier** (`/app/calendar?mode=week`), les autres dates autour.
  Pas de ligne d'aide ni de légende des couleurs au-dessus (retirées le 01/11). Le calendrier
  (`components/calls/calendar/`, places calculées par le serveur sur l'heure de Paris,
  `lib/calls/calendar.ts`) reprend Teams :
  - périodes **Semaine (défaut) et Mois** (`?mode=month&date=AAAA-MM-JJ`, sans `date` =
    aujourd'hui ; Jour et Semaine de travail retirés à la demande de Sacha, 10/10), « Aujourd'hui »,
    période précédente / suivante ; dans le mois, le numéro d'un jour et « n autres » ouvrent sa
    semaine ;
  - grille de 24 h défilante, arrivée sur 7 h 30 (ou la première date), trait de l'heure actuelle,
    calls et dates à l'heure côte à côte quand ils se chevauchent (`dayEvents`, générique), teinte
    de l'état depuis le proto du 29/10 (`callCalendarTone` : compte rendu prêt, à venir, à
    enregistrer) ;
  - **clic ou glisser sur une plage libre** → « Nouvelle réunion » sur ce créneau (pas de 30 min,
    un clic = 30 min ; Mois : un clic sur un jour = 9 h) ; un seul formulaire pour le bouton et la grille
    (`MeetingComposerProvider`, données `loadMeetingFormData`, `lib/calls/invite.ts`) ;
  - **glisser un de ses calls** pour le déplacer (autre jour compris, pas de 15 min), **son bord
    bas** pour le rallonger, Échap annule ; affiché aussitôt puis enregistré
    (`rescheduleCall`, remis en place si refusé) ; Mois : glisser vers un autre jour, même heure ;
  - **clic sur un call** → sa fiche (`EventPeek`) : quand, projet, état, « Rejoindre »,
    « Ouvrir le call », « Modifier l'horaire » (le même déplacement au clavier, WCAG 2.5.7) ;
  - seul qui travaille sur le call le déplace (responsable du projet ou créateur de la réunion,
    RLS `is_call_owner`), et seulement avant tout enregistrement (`audio_path` nul) ; s'il a un
    événement Google, il suit (`moveMeetEvent`, Google prévient les invités) ; un refus de Google
    n'annule pas le déplacement, il est dit ;
  - sur téléphone, la période se lit en agenda de jours (`AgendaList` ; `CalendarAgenda` dans le
    Calendrier), sans geste.
  - **« Annuler l'échange »** (Cadrage seulement, Sacha 28/10) : à côté de « Enregistrer l'échange »
    tant que l'échange de cadrage est seulement prévu ; `cancel_framing_call` (SQL, responsable du
    projet, rien d'enregistré : ni audio, ni prise, ni transcription, ni compte rendu) supprime le
    call et ses invitations dans l'app, puis `cancelMeetEvent` annule l'événement Google (Google
    prévient les invités ; un refus est dit, le call ne revient pas). Le Cadrage revient au choix
    « Commencer le cadrage » / « Préparer un échange ».
  Non construit : annuler / supprimer un call depuis le calendrier, réunions récurrentes,
  disponibilités des participants, créer un call **de projet** depuis la grille (on crée une
  réunion interne).
- **Page d'un call = ses détails d'abord** (retour de Sacha, 10/10 : « quand je clique sur le
  call, les informations avec le lien Google Meet ») : depuis le proto du 29/10, quand et
  rattachement dans la ligne sous le titre, **lien de visio écrit en clair** dans la carte
  « Visio » (« Rejoindre », « Copier le lien »), participants dans leur carte (`CallSide`) ; un
  call qui a un lien de visio ne
  demande plus « visio ou sur place » (`videoCall` de `CallRecorder`). La fiche du calendrier
  (`EventPeek`) montre aussi le lien et « Copier le lien ».
- **Fiche du call pour l'extérieur** (retour du 10/10 : « partager le call à des personnes
  extérieures… heure, plan du call, durée et le lien ») : dans « ⋯ » de l'en-tête, « Copier la
  fiche du call » et « Envoyer la fiche par e-mail » (`mailto:` adressé aux invités, rien
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
  Portées demandées (06/11/2026), en une seule connexion : `calendar.events`, `drive.file` (fichiers
  que PDS OS dépose lui-même dans le Drive du compte, pour l'import des rushs à venir ; jamais le
  reste du Drive), `meetings.space.settings` (transcription automatique, ci-dessous) et
  `meetings.space.readonly` (relire la transcription d'un Meet, lot à venir) : activer aussi les
  API Google Drive et Google Meet REST. Compte organisateur :
  **po@pdsrecords.com**, que seul Ibé ouvre : le lien du script peut être ouvert sur son
  ordinateur, il renvoie alors l'adresse `http://127.0.0.1:<port>/?code=…` (page inaccessible)
  à coller ici pendant que le script tourne. Écran de consentement « Externe » : publier
  l'application, sinon Google invalide le jeton au bout de 7 jours. La variable garde son nom
  `GOOGLE_CALENDAR_REFRESH_TOKEN`.
- **Transcription automatique du Meet** (06/11/2026, `lib/integrations/google-meet.ts`) : juste après
  la création du lien (`attachGoogleMeet`), PDS OS retrouve l'espace Meet par son code
  (`GET spaces/{code}`) puis active `config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration
  = ON` (`PATCH spaces/{id}`) : Meet transcrit seul dès qu'une personne autorisée rejoint, la
  transcription arrive en Google Doc dans le Drive de po@ et sur l'événement. Possible parce que po@
  organise le Meet (Calendar le crée en son nom). Exige la portée `meetings.space.settings` et une
  offre Workspace qui transcrit (Business Standard ou plus) : sinon Google répond 403, journalisé
  (`[calls] meet auto transcription not turned on`), le call garde son lien. Jeton partagé
  Calendar / Meet : `lib/integrations/google-oauth.ts`.
- **Transcription du Meet reprise dans la page du call** (06/11/2026) : un call dont PDS OS a créé le
  Meet (`CallDetail.ownMeet` = `google_event_id` + lien meet.google.com + jeton qui a la portée
  `meetings.space.readonly`, lue dans la réponse de rafraîchissement, `googleHasScope`,
  `lib/calls/own-meet.ts` ; un jeton plus ancien laisse le call demander son enregistrement comme avant) et sans enregistrement passe, une fois fini, par le geste `meet` de
  « Maintenant » (`callTodos`, avant `upload`) : `MeetTranscriptFetch` appelle seul
  `POST /api/calls/[id]/meet-transcript` (`runMeetTranscription`, session de l'utilisateur, RLS ;
  `claim(…, { needsAudio: false })`). `fetchMeetTranscript` (`google-meet-transcript.ts`, portée
  `meetings.space.readonly`) lit toutes les conférences de l'espace (`conferenceRecords?filter=space.name`),
  leurs transcriptions, leurs entrées et le nom des participants ; segments en secondes depuis le début
  de la première conférence, avec `speaker` (champ facultatif du schéma `Transcript`, affiché par
  `TranscriptPanel`), texte « Nom : phrase » par ligne pour que le compte rendu sache qui a dit quoi.
  Enregistrée dans `transcripts` (`provider = google_meet`) ; `callStage` compte une transcription sans
  audio comme enregistrée, puis `CallProcessing fromMeet` lance le compte rendu (`runExtraction`, qui ne
  demande plus d'audio). Erreurs : `meet_pending` (réunion en cours ou fichier pas encore écrit :
  « Réessayer », le dépôt reste replié), `meet_no_conference`, `meet_no_transcript`, `meet_unavailable`
  (403 : jeton sans portée, offre sans transcription) → le dépôt de l'enregistrement devient le geste.

---

## 4 ter. Formulaire de call commun, compte rendu par point, résumé aux participants (18/10/2026)

Sous-lots C8 et C10 de `docs/projet-complet/commons.md` (§ 4 et § 5), proto « Projet complet »
(`docs/protos/src/mk.js` : `prepGate`, `whoChips`, `agendaRow`, `moveAgenda`, `newPersonModal`, `crLine`,
`crModal`, `sumDraft`, `summaryBlock`, `summaryFor`).

**Un seul formulaire de call** (`components/calls/prep/`) pour le Cadrage, la Stratégie, la Conception,
la Production (call de production et call technique) et le Master. Il remplace `ParticipantsField`,
`AttendeesField`, `AgendaEditor`, `AgendaTopicsField`, `CallRecap`, `PrepareCallSheet`,
`PrepareExchangeButton` et les cinq formulaires de module (supprimés).

- **Ce que le module calcule** (serveur) : `callPrepDefaults` (`lib/calls/prep/defaults.ts`) reçoit les
  points de PO (`PreparedPoint` : clé, mots, durée estimée, questions), les participants proposés (ids de
  personnes ou de contacts, sinon les noms que le module calcule, rapprochés de l'équipe puis du Réseau
  côté serveur), l'objectif, les faits « Envoyé avec l'invitation », la note. Builders :
  `lib/framing/call-sheet-data.ts`, `lib/strategy/call-sheet-data.ts`, `lib/design/call-sheet-data.ts`,
  `lib/production/call-prep-defaults.ts`, `lib/master-workflow/exchange-defaults.ts`.
- **Participants** : des clés `m:<personId>` (membres admis par `call_attendees_check`, listés par
  `list_project_call_people` / `loadCallMembers` : responsable, équipe créative, direction, puis tout
  directeur créatif, ajouté à `project_creatives` par l'invitation, comme `design_person_check`), `c:<contactId>` (Réseau), `e:<adresse>` (tapée). Un contact sans
  e-mail ne peut pas être invité (même règle que `call_guests`) ; une adresse tapée devient une fiche du
  Réseau à la confirmation (`fileTypedGuests`). Au moins deux personnes.
- **Ordre du jour** : la personne ordonne, reformule, retire, ajoute ; les points de PO gardent leur `key`
  (stockée dans `calls.agenda`), le serveur recalcule les points de PO et n'en reprend que la durée et les
  questions (`buildPreparedAgenda`, `lib/calls/prepare-schema.ts`) ; une durée absente = l'estimation de PO
  (5 min pour un point ajouté). Durée de chaque point toujours visible et modifiable (PROJ-UX-03), total au-dessus ; plus de « Préparer en détail » (Sacha, 28/10/2026) : les questions de PO restent sur leur point, toujours enregistrées, et se lisent sous l'ordre du jour de la carte de l'échange prévu (`PlannedCallFacts`, aide-mémoire pendant le call).
- **Action unique** `createPreparedCall(kind, …)` (`lib/calls/prep/actions.ts`) : vérifie le formulaire,
  recalcule les points (`lib/calls/prep/adapters/<kind>.ts`), résout les participants contre l'équipe et le
  Réseau lus avec la session, appelle la fonction SQL du module (`create_framing_call`,
  `create_strategy_call`, `create_design_call`, `create_production_call`, `create_master_exchange`),
  invite l'équipe (`call_attendees`, notification par trigger), écrit les invités (`call_guests`), crée le
  lien Meet par Google Agenda quand il est branché (Google envoie alors l'e-mail), sinon rien ne part
  encore par e-mail et le lien de visio se colle. La **description de l'invitation Google** reprend
  « Envoyé avec l'invitation » (`invitationText`, `lib/calls/prep/invitation.ts`, Sacha 28/10/2026) :
  objectif, ordre du jour avec durées et total, documents cochés par nom, lignes du module (Sujets,
  Points ouverts…). Les questions de PO n'y sont pas (notes de l'organisateur). Un ordre du jour modifié
  ensuite sur la page du call ne met pas la description à jour. `stay` : la page reste (l'étape montre
  `PlannedCallFacts`) ; sinon la page du call s'ouvre.
- **Conteneur** : tant que l'étape d'une zone ne porte pas le formulaire, `CallPrepLauncher` le pose sous son
  bouton (`inline`, cartes d'entrée) ou dans la modale commune (`dialog`, barres d'outils). Les zones le
  placent ensuite directement dans l'étape (`<CallPrepForm defaults stay />`).

**Compte rendu rangé par point** : `report_items.agenda_topic` (migration `20261018200101`). L'extraction
reçoit l'ordre du jour du call avec la transcription (« p1 : … », données, jamais consignes) ; chaque
décision, question ouverte et action nomme sa clé, le code la vérifie et recopie les mots du point
(`toReportItemRows`) ; une clé inconnue = « dit en dehors de l'ordre du jour ». `loadMeeting`
(`lib/calls/meeting/queries.ts`) lit le call et son dernier compte rendu ; **l'état de chaque ligne vient
du module** (`states`, par id de ligne), jamais du compte rendu. Sur la page du call (`CallReportCard`),
faute d'étape, ce que la clôture a gardé se lit « Confirmé par » qui a clôturé.

**Résumé aux participants** : table `call_summaries` (version, texte, destinataires, `recipient_person_ids`,
`sent_by`, `sent_at`), plutôt qu'une colonne de `call_report_shares` : un résumé n'est pas un partage du
compte rendu figé et existe sans clôture. Écriture par `send_call_summary` seule (responsable du call ;
les membres destinataires doivent être participants ou de l'équipe du projet ; version suivante calculée
en SQL, les précédentes gardées) ; lecture par qui voit le call ou par les membres destinataires ;
notification `call_summary_sent` par trigger ; supprimée avec le call (cascade, `delete_project_row`
supprime les calls). Le brouillon est **écrit par le code** (`summaryDraft`, `lib/calls/meeting/draft.ts`)
depuis les lignes confirmées ou corrigées : décisions, « À confirmer » (hypothèses), prochaines étapes
avec qui et quand ; jamais de citation, d'écarté, de point à arbitrer ni de ligne `internal` (budget
interne). Les destinataires sont relus côté serveur (`sendMeetingSummary`) ; l'e-mail aux externes n'est
pas branché : l'app le dit (avertissement) sans bloquer.

**Piège** : la contrainte `notifications_kind_check` est réécrite par plusieurs lots en parallèle ; la
migration y **ajoute** `call_summary_sent` en relisant la liste en place (deux formes possibles de
`pg_get_constraintdef`). Une migration ultérieure qui réécrit la liste à la main doit garder ce type.

## 5. IA (`lib/ai/`)

- Points d'entrée uniques : `llm.ts` (`extract`, `getChatModel`) et `transcribe.ts`.
  Fournisseurs et modèles par défaut : `providers.ts` (`mistral` | `google` | `anthropic`,
  choisi par `LLM_PROVIDER`, surcharge `LLM_MODEL`). Mistral gratuit : quota nul sur
  `small`/`medium` → `ministral-14b-latest` (défaut des tests locaux). **Production : Claude
  Haiku 5.5** (`LLM_PROVIDER=anthropic`, `claude-haiku-5-5`, `ANTHROPIC_API_KEY`), choisi le
  14/10/2026 (rapport intelligence / prix / vitesse, requêtes non utilisées pour
  l'entraînement). L'audio reste chez Groq.
- **Réglages par fournisseur** (`providerSettings` dans `llm.ts`, appliqués aux extractions
  et à PO) : Haiku 5.5 renvoie 400 sur toute `temperature` / `top_p` / `top_k` → rien n'est
  envoyé ; sa réflexion adaptative passe de `medium` (défaut) à `effort: "low"`
  (`providerOptions.anthropic`). Mistral et Google gardent `temperature: 0`.
  `@ai-sdk/anthropic` est épinglé à **4.0.75**, première version qui connaît
  `claude-haiku-5-5` (avant, modèle « inconnu » : température transmise → 400).
- **Cache des prompts de PO** : `assistantInstructions` rend des parties (`InstructionPart`,
  `stable` ou non) ; avec Anthropic, `systemPrompt` envoie les parties stables (qui PO est,
  règles) avec un `cacheControl` puis le contexte variable (prénom, poste, page ouverte) sans
  cache. Les outils passent avant le prompt système : ils sont dans le préfixe en cache. Rien
  de variable (date, identifiant, nom) ne doit entrer dans une partie `stable`. Ailleurs, les
  parties sont jointes dans leur ordre (prompt de ministral inchangé).
- **Sortie structurée** : Haiku 5.5 a la sortie structurée native (`output_config.format`
  JSON Schema, vérifié sur la requête émise) ; les `min`/`max` de zod n'y sont qu'en
  description et zod les revérifie à l'arrivée. `repairedOutput` (`lib/ai/output-repair.ts`) reste :
  propre à ministral, sans effet ailleurs — réponse enveloppée dans l'écho du schéma, et depuis le
  07/11/2026 éléments de liste qui ne suivent pas le schéma écartés (cinq leviers sans citation
  faisaient échouer tout un compte rendu ; un élément sans citation ne peut pas être cité de toute
  façon) ; tout autre écart reste une erreur. Images (`extractFromImage(s)`) : PNG, JPEG, WebP, GIF en base64.

### 5 bis. Quota quotidien de requêtes (`lib/ai/quota.ts`, 14/10/2026)

Demande de Sacha : chaque membre a une limite de requêtes par jour, que le directeur général
change dans Équipe, et voit son utilisation dans ses paramètres, comme dans Claude.

- **Une requête = un appel au modèle** : un message à PO (une seule, quel que soit le nombre
  d'étapes d'outils), une analyse, une extraction, une lecture d'image. La transcription
  (Groq) ne compte pas.
- **SQL** (`…20261014100101_ai_request_quota.sql`, tests `supabase/tests/ai-quota.test.sql`) :
  `memberships.ai_daily_limit` (200 par défaut, 0 à 10 000, colonne accordée en écriture, la
  policy existante la réserve aux administrateurs), table `ai_requests` (une ligne par
  requête, lecture : soi ou administrateur, aucune écriture client).
  `consume_ai_request(org)` verrouille le membership, compte la journée **de Paris**
  (`ai_quota_day_start` / `ai_quota_resets_at`, minuit), refuse au-delà sans rien écrire,
  sinon enregistre. `ai_usage_today(org)` (security invoker) : sa ligne pour un membre, toutes
  pour le DG.
- **Contrôle** : `takeAiRequest()` avant chaque appel — dans `generate` (`llm.ts`) pour les
  extractions, dans `app/api/assistant/route.ts` pour un message de PO (réponse **429**
  `{"error":"quota","limit":n}`, lue par `AssistantThread`). Sans session de membre : refus,
  sauf le labo local (`isLaboEnabled`). Limite atteinte → `AiQuotaExceededError` ; les
  appelants affichent `aiQuotaMessage(error)` (« Limite du jour atteinte… ») au lieu de leur
  erreur générique ; ceux qui renvoient un code passent par `providerFailure(error)`
  (`lib/ai/provider-failure.ts` : `"provider"` ou `"quota"` + message) ; calls, dictée,
  captures TikTok et labo ont un code `ai_quota` (HTTP 429, `calls.error_code` est du texte
  libre). Restent silencieux, volontairement, les appels qui retombent déjà sans message :
  titre de PO d'un retour direct, suggestion entre homonymes, analyse du Cadrage, remplissages
  lancés après le compte rendu d'un call (le compte rendu est enregistré, seules les
  propositions de PO manquent).
- **Écrans** : `/app/settings` (« Paramètres », menu du compte et panneau mobile) →
  `AiUsageMeter` : part utilisée, barre (`ProgressBar tone="error"` à la limite), « 74 sur
  200 », remise à zéro à minuit, qui fixe la limite ; avertissement à 80 %. Équipe : colonne
  « PO aujourd'hui » (`listMemberships` lit `ai_usage_today`) et champ « Requêtes à PO par
  jour » dans « Modifier » (`membershipAiLimitSchema`, champ vide = erreur, jamais 0).
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
  **Parties impliquées** (PROJ-BUG-03, 11/10/2026, `lib/framing/legal-parties.ts`,
  `…20261011400201`) : les candidats sont lus par le code (crédits des titres, équipe
  confirmée tenue par un contact du Réseau ou un nom, jamais un membre de l'app, intervenants
  du Juridique ; une ligne par nom, rôles fusionnés) ; **chaque partie est qualifiée par une
  personne** (`framing_legal_parties` : relation avec PDS, document existant / à vérifier /
  à préparer / non nécessaire / non applicable, contrat qui le prouve, qui suit, raison) ;
  « Existant » exige un contrat **signé** de Contrats dont la personne est partie (SQL),
  « Non nécessaire » / « Non applicable » une raison ; le code n'indique un statut que sur
  preuve (« Contrat trouvé dans Contrats »), jamais d'après le rôle ; un rôle non attribué
  n'est pas une partie. La question est « connue » quand toutes les parties sont qualifiées,
  jamais confirmée en bloc. **Contrats et droits à prévoir** n'est plus proposé par le code
  (fini « Un accord avec chaque partie ») : il garde les autres besoins (autorisations…).
  Le Juridique lit ces qualifications : drapeaux de l'État des lieux, et pas de « Faire
  signer un contrat » pour une partie existante, non nécessaire ou non applicable
  (`InventoryRows.settledParties`). PO ne lit plus `legal_parties` dans un texte ; la
  consigne lui interdit de prendre un arrangement de production pour un accord juridique.
- **Provenance** (PROJ-BUG-02, `components/framing/source-line.tsx`) : toute valeur dit son
  état (« Suggestion de PO · à confirmer », « Repris de … · à vérifier », « Confirmé par X
  le … ») et sa source ; une source de call ouvre **le passage** de la transcription
  (`/calls/<id>#t-<seconde>`, segments ancrés dans `TranscriptPanel`), ou dit « Source
  introuvable ». Sous une question de liste, « Sources des propositions » (`LineSources`).
  Un élément du compte rendu dont la citation est introuvable n'est plus proposé au Cadrage
  (`import-report.ts`, même règle que la lecture par PO) ; besoins, équipe et contraintes
  déjà listés ne sont pas importés deux fois. Une valeur
  confirmée telle que le projet l'enregistrait (importée, avec `source_label`, sans
  citation) est **reproposée** si l'enregistrement a changé depuis, tant que le Cadrage est
  ouvert (une personne ajoutée à l'équipe après coup) ; une valeur écrite à la main, jamais.
- **Transmission** (PROJ-UX-02, 11/10/2026, `…20261011400401`) : avant d'accepter,
  « Ce que vous acceptez » (Sacha 30/10/2026 : `UnlaunchedOverview` = `ModuleHeader`, puis un bloc de
  faits `HandoverFacts` où un manque se dit sur sa ligne, calculé par le code, et le geste dessous ; pas
  de ligne « À vous ») ;
  une demande de précision porte un **sujet** (`project_assignments.clarification_subject`,
  `respond_to_assignment(…, p_subject)`) et l'historique la montre structurée (auteur, date,
  sujet, question, réponse de la direction, statut : `clarificationsOf`, `ClarificationList`),
  y compris après l'acceptation. Les **réponses de la direction** sont lues par PO avec le
  contexte initial au démarrage du Cadrage (`startFramingWithPo`, `clarificationsOf`, données
  jamais consignes) : ses propositions portent la provenance « Contexte initial et précisions
  de la direction ». **Les deux entrées** (`FramingEntry`) disent ce qu'elles font ; la
  recommandée vient en tête, choisie par le code (plus d'informations manquantes que
  connues ou à confirmer → un échange ; sinon PO). Préparer un échange crée seulement le
  call (`create_framing_call`), sans démarrer ni valider le Cadrage.
- **Ordre du jour d'un call** (PROJ-UX-03, `…20261011400501`) : un seul éditeur
  (`AgendaEditor`) avant la création (« Préparer un échange » : le brouillon de PO, sujets
  et questions, relu et modifié, envoyé tel quel ; chaque point garde la dimension du Cadrage
  qu'il alimente, `AgendaItem.dimension`) et après (page du call, jusqu'à l'enregistrement) :
  titres, durées, questions ajoutées, modifiées, retirées, remises dans l'ordre (boutons
  monter / descendre, accessibles au clavier, à la place d'un glisser-déposer), total
  recalculé à chaque changement ; dernière modification « par qui, quand » écrite par un
  trigger (`calls.agenda_edited_at` / `_by`). Les autres formulaires de préparation
  (Stratégie, Conception, Production) gardent `AgendaTopicsField`.
- **Entrée** (`FramingEntry`, Vue d'ensemble et Cadrage) : « ✓ Prise en charge acceptée »,
  l'analyse par dimension, « Commencer le cadrage » (`startFramingWithPo` : ouvre le Cadrage
  sans call, démarre l'étape, PO lit **une fois** le contexte initial, marqueur
  `context_analysis`) et « Préparer un échange ». « Démarrer le cadrage » est fait dès que
  l'étape est démarrée (`framingStarted`), **même si la lecture du contexte a échoué** (modèle
  indisponible, quota) : sinon « Les 6 dimensions » restait verrouillée (01/11/2026). Dans ce
  cas les dimensions affichent « Relire le contexte » (`ContextReread`,
  `rereadFramingContext`, `contextUnread`). Une fois commencé avec PO, « Démarrer le cadrage »
  garde les deux cartes (« Reprendre avec PO », « Préparer un échange ») : le départ peut
  toujours changer (`StartWays started`, 01/11/2026) ; un échange prévu s'annule par
  « Annuler l'échange ».
- **Parcours direct** (`?step=<dimension>&q=<question>`) : une question à la fois, la
  suivante calculée par le code (`nextAfter`) **au moment où on y va** (`?after=<question>`,
  `routes.projectFramingAfter`) : une page préchargée au survol, rendue avant les dernières
  réponses, renvoyait sur une question déjà répondue (boucle du 01/11/2026), la question adaptée (« La date cible est-elle
  toujours le 20 novembre 2026 ? »), « M'aider à définir » (`lib/framing/help.ts` : jusqu'à
  trois formulations, chacune citée mot pour mot d'une source et vérifiée par le code, gardées
  dans `<clé>_suggestions` ; **aussi stricte que la lecture après un call** depuis le 28/10/2026 :
  même définition de la réponse (description du champ de `framing-facts`), même contrôle par le code
  (`answerHolds`, `lib/framing/answer-holds.ts` : chiffres repris de la citation, dépense dite engagée
  ou payée), et rien d'ajouté à ce que dit le passage), « Écrire moi-même », « Déjà connu » sous la carte. Les listes
  reprennent les écrans d'avant (pastilles de besoins, lignes de contraintes, cartes de rôles)
  plus les échéances. `?step=brief` : ce qui reste avant le Brief, ou son envoi en validation.
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
- **Réponses structurées et états** (PROJ-UX-04 et UX-05, 11/10/2026) :
  - **objectif mesurable** (`success_criteria`, `shape: "measure"`) : **une à six mesures**
    (Ibé 01/11/2026 : streams, vues, abonnés…), chacune métrique, cible, période, source
    (`{ measures: [...] }` dans `field_values.value` ; l'ancien `{ measure }` se lit encore comme
    une liste d'une mesure), tout obligatoire sauf la source ; une mesure par ligne à l'affichage ;
    la cible est lue par le code dans la phrase dite, jamais par PO ; la Stratégie propose chaque
    mesure comme KPI (« Préparer ce KPI »), sauf celle dont le chiffre est déjà un KPI ;
  - **éléments à états** (`prerequisites`, `existing_elements`, `work_started`,
    `shape: "items"`) : plusieurs éléments, chacun Existe / En cours / Terminé / Décidé /
    Prévu (`{ items }`), suggestions en un clic, pré-remplis depuis le Catalogue (étape audio
    de chaque titre : « mix reçu, pas encore validé » = en cours, seul le master final est
    terminé) et les fichiers ; une phrase proposée (call, contexte) se « précise » avant
    d'être confirmée, sa source gardée (`answerItems` / `answerMeasure`, `keepSource`) ;
  - **« Non applicable »** (raison obligatoire) et **« À définir plus tard »** (date + tâche de
    suivi pour qui répond, dimension vérifiée ouverte avant de créer la tâche) sur toute
    question sauf les parties ; réponses comptées, listées « restent ouverts » avant le
    Brief et dans sa synthèse (`lib/framing/actions/answers.ts`) ;
  - **« M'aider à définir »** : la formulation choisie ouvre la réponse, modifiable ; rien
    n'est enregistré sans « Enregistrer » (`chooseHelp(…, edited)`, source gardée) ;
  - **enveloppe confirmée ou estimée** (`{ cents, certainty }`), « Pas d'enveloppe dédiée »
    pour non définie ; **dépenses** du projet listées sous « Engagements existants » et
    ajoutées avec le formulaire du Budget (`ExpenseLines`) ;
  - **équipe** : « Rôles tenus » et « Rôles à attribuer » séparés, un rôle vacant est une
    action ; **échéances** : Ferme / Estimée (`framing_deadlines.confidence`,
    `…20261011400301`) et le workflow alimenté, dit par le code (`deadlineWorkflows`) ;
  - progression : ce qui bloque encore le Brief, toujours affiché.
- **Cohérence du Brief** (PROJ-BUG-04, 11/10/2026) : une seule valeur courante par champ
  (plus d'« Échéance / Enveloppe à la création » à côté de la réponse confirmée ; « Modifié ·
  initial (fiche projet) : … » quand elles diffèrent) ; **contradictions** trouvées par le
  code (`lib/framing/conflicts.ts` : jalon de production après la date cible, échéance de
  sortie ≠ date cible, dépenses engagées au-delà de l'enveloppe, « Existant » dont le contrat
  n'est plus signé) listées dans « À résoudre avant le Brief » et bloquantes
  (`assessment.ready`), jamais résolues en remplaçant une valeur ; **synthèse** du Brief
  écrite par le code (décisions, points ouverts, risques, prérequis, responsables :
  `summaryOf`, instantané `schema: 2`) en tête du document et du PDF ; le **plan** dit quand
  le Brief validé ne correspond plus au Cadrage (`briefDrift`, `BriefDrift` au-dessus du
  plan, versions `schema: 2` seulement), sans rien recalculer.
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

### Demandes de correction du Brief et versions (retours du 11/10/2026, PROJ-UX-06 et PROJ-BUG-05)

Migration `…20261011500101_brief_requests_plan_steps.sql`, tests
`brief-requests-plan-steps.test.sql`.

- **Une demande = une ligne** (`framing_brief_requests`) : « Demander une modification » n'est plus
  un commentaire et des dimensions cochées mais une liste (`BriefRequestForm`), chaque demande
  ancrée à une dimension et, si elle en nomme une, une question (même dimension, vérifié en SQL),
  obligatoire ou facultative. Les dimensions rouvertes en découlent ; le commentaire de la
  validation reprend les demandes (historique inchangé). L'ancien appel (commentaire +
  dimensions) marche toujours.
- **Résoudre exige une modification ou une justification** : `resolve_framing_brief_request`
  (responsable seul) compare la dernière version à celle de la demande sur ce qu'elle vise
  (`framing_brief_answers`, mots et lignes, jamais les sources) : changé = « Corrigée » (la
  version qui porte le changement est gardée), sinon justification écrite obligatoire
  (« Justifiée »). Le valideur qui a demandé peut **lever** une demande avec sa raison
  (« Levée », `withdraw_framing_brief_request`) : c'est la seule dérogation. Rien n'est effacé.
- **Blocages** : `send_framing_brief` refuse tant qu'une demande obligatoire est ouverte
  (`requests_open`) et refuse une version qui dit exactement ce que disait la dernière version
  envoyée sans **dérogation écrite**, gardée sur la version (`unchanged_reason`, affichée dans
  l'historique) ; `decide_framing_brief` refuse de valider avec une demande obligatoire ouverte.
  Décision prise sans le ticket : une demande facultative ne bloque rien.
- **Écrans** : page du Brief = demandes (onglets Ouvertes / Toutes, `?demandes=toutes`), chaque
  demande avec son ancre (lien qui ouvre la question), auteur, date, version, statut, résolution ;
  ce qui a changé se lit en tête du document (« Changé depuis la version n », 29/10/2026). Page du Cadrage : les demandes ouvertes en tête,
  et sur la question visée. Les deux comptes lisent la même table (RLS : le projet ou le valideur).
- **Export PDF** (PROJ-BUG-05, cause trouvée et vérifiée sur la trace du build) : les clés de
  `outputFileTracingIncludes` sont des globs **picomatch** : `/api/projects/[projectId]/…` non
  échappé y est une classe de caractères et ne correspondait à **aucune route**, si bien que le
  binaire de `@sparticuz/chromium` n'a jamais été embarqué dans la fonction Vercel (et le
  formulaire SACEM 725 non plus) ; avec pnpm, le chemin des fichiers doit en plus viser le dossier
  réel `.pnpm/@sparticuz+chromium@*/…/bin/**`, pas le lien symbolique. `next.config.ts` échappe
  les crochets (`routeGlob`) pour les cinq routes : le `.nft.json` de chaque route PDF contient
  maintenant `bin/`. L'export suit la version affichée (`?version=n`, 404 si elle n'existe pas),
  un PDF vide lève une erreur journalisée avec le projet et la version ; `PdfExportButton`
  distingue génération (statut, session expirée) et téléchargement, ne sauvegarde rien qui ne
  commence pas par `%PDF-` et ne révoque l'URL qu'après une minute (Safari annulait le
  téléchargement).

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

### Parcours du Cadrage en 4 étapes (lot 2 « Projet complet », 19/10/2026)

Proto `docs/protos/src/mk.js` (FR_STEPS, frEntry, frDims, frBrief, frPlanView), cahier des charges
`docs/projet-complet/framing.md`. Le Cadrage suit le patron commun (§ 3 ter) : une URL par étape,
`/framing/start`, `/framing/dimensions`, `/framing/brief`, `/framing/plan` ; `/framing` redirige vers
l'étape qui attend la personne (`framingLanding`) et les anciennes URL (`?step=<dimension>&q=`,
`?step=review&call=`, `?step=brief`) vers leur étape. `routes.projectFramingStep` /
`projectFramingQuestion` / `projectFramingReview` / `projectPlan` suivent.

- **Parcours** : `lib/framing/journey.ts` (pur : statuts, acteurs, résumés, prérequis, « Ensuite :
  Stratégie › Démarrer la stratégie ») ; données lues une fois par requête dans
  `lib/framing/journey-context.ts` (`framingJourneyContext`, `cache()` : connaissance, évaluation, call
  de cadrage `framing_calls`, plan) ; loader `lib/journey/framing.ts` branché dans `JOURNEY_LOADERS`
  (le relais de la Vue d'ensemble s'efface). La 1re étape s'appelle toujours « Démarrer le cadrage », quel
  que soit le chemin (Sacha 29/10/2026 : un nom qui change perd le repère) ; le chemin se lit dans sa ligne.
  Acteurs : le responsable du projet (« Choisir comment démarrer », « Tenir l'échange du JJ/MM », « Répondre à n questions de PO et vérifier m informations proposées », « Envoyer le Brief en validation »
  (un seul geste depuis le 28/10/2026), « Lancer le plan du projet ») ;
  la direction `kind: "validate"` sur « Valider le Brief de cadrage » (Validations du projet).
  Le Brief garde ses versions lisibles après une demande de modification (défaut du proto non recopié).
- **Cadre** : `FramingStepFrame` (en-tête avec « Qui fait quoi » = responsable et validation,
  `NowCard` aux mots du Cadrage, `ModuleAttention`, `JourneySpine`, `StepPanel` 5 colonnes, blocages et
  informations notées `StepBlockers` / `StepToolsBlock`).
- **Démarrer** : faits « Prise en charge » / « Projet », « Ce que le projet sait déjà » (comptes du code,
  « Voir le détail » = une ligne par information, `FramingLine`), `StartWays` = `StartChoices`
  (« Recommandé » à gauche) ; **règle retenue** (proto) : échange recommandé quand
  manquant + à confirmer > connu (`recommendedStart`, `lib/framing/lines.ts`), raison dite seulement
  dans ce cas. « Préparer un échange » ouvre `CallPrepForm` dans l'étape (`callSheetData` : un point par
  dimension qui a un manque ou un « à confirmer »), « Changer » revient au choix. Après création :
  `PlannedCallInPlace` (enregistrement, transcription et compte rendu dans la carte) ; compte rendu reçu : `MeetingFacts`
  avec, pour lignes, **ce que PO a proposé de l'échange par dimension** et son état dans le Cadrage
  (confirmé, écarté, à confirmer ; budget interne), puis le résumé aux participants quand tout est
  tranché (`MeetingSummaryBlock`, prochaine étape « Le Brief de cadrage part en validation »).
  L'écran `?step=review` est supprimé : les propositions de l'échange sont dans « Les 6 dimensions ».
- **Les 6 dimensions** (proto `docs/protos/cadrage-suite.html`, Sacha 29/10/2026) : pour qui répond,
  la question d'abord (`QuestionScreen` dans `PoQuestion`) : **le domaine seul** au-dessus (« Temporalité »),
  flèches vers la question d'avant et d'après (celles que la personne peut ouvrir, dans l'ordre, sauf
  les propositions vérifiées dans la liste, `?q=`), champ « Votre réponse * » ouvert d'emblée pour une information manquante, « M'aider à
  définir », Confirmer / Modifier ; « Non applicable », « À définir plus tard », « Rien à signaler »,
  « Écarter », « Passer » repliés sous « Autre réponse ». Une réponse confirmée **se modifie** tant que
  l'étape est en cours (un clic sur sa ligne, ou les flèches). **Vérifier en bloc** (Sacha 29/10/2026,
  `lib/framing/verify.ts`) : la boîte ne pose que ce qui manque ; une proposition de PO (échange, dictée,
  valeur enregistrée ailleurs) se lit « À vérifier » dans la liste et se confirme **par dimension**
  (« Confirmer les n » sous la dimension, `ConfirmDimension` → `confirmDimension`, chaque ligne
  confirmée comme son propre « Confirmer », relue côté serveur, source gardée). Restent des questions :
  les parties juridiques (qualifiées une par une), une phrase à structurer (`shape`), une question prise
  dans une contradiction, les échéances tant qu'une proposée n'a pas de date. La première dimension à
  vérifier est ouverte ; confirmer la dernière chose qui reste ouvre le Brief. Une ligne s'ouvre dans la
  boîte d'**un clic sur toute la ligne** (`FactRow href`), sans « Répondre » ni « Modifier » à côté.
  Version de base (tout confirmer une à une) : commit `df67b396`. Dessous, « Les 6 dimensions » et la
  dictée à côté, puis **une ligne par dimension dans un seul cadre** (`DimensionRows`, `<details>`),
  repliées sauf celle de la question : une ligne par information avec sa pastille (les parties
  juridiques une par ligne sous leur ligne, `PartyLines` ; tons de `framingLineTone`), « Question en
  cours » à la place de la valeur de la question posée. Plus de ligne « Confirmation humaine » : ce
  qui reste se dit une fois, dans « À vous : répondre à n questions de PO et vérifier m informations
  proposées ». Les autres comptes ne
  voient pas l'encadré (la ligne de l'acteur dit qui on attend). Figé pendant la relecture (callout
  cadenas) ; après une demande de modification, seules les dimensions rouvertes s'ouvrent.
  **`QuestionScreen` est la référence** d'une question « une à la fois » (Cadrage juridique, lot 9).
- **Brief de cadrage** (proto « Suite du Cadrage », Sacha 29/10/2026) : **un seul document**
  (`BriefDocument` = la `DocumentCard` commune au Master et au Juridique, Sacha 05/11/2026 « c'est un
  document » ; corps `BriefVersionDoc` : une section par dimension, « libellé | valeur », source dessous,
  « À revoir » sur les dimensions renvoyées) : la version à envoyer, sinon la dernière envoyée ; dans la
  tête l'état, « Copier le lien » et « Télécharger le PDF », puis « Changé depuis la version n : … » sur
  le bandeau d'info (`briefChanges`) ; « Créée par … · validée par … » en petit sous la carte (Sacha
  05/11, secondaire), puis le geste (envoyer, décider). **Un seul
  geste** (Sacha, 28/10/2026) : quand tout est complet, la prochaine version s'affiche telle qu'elle
  partira et « Envoyer en validation à X » (`sendFramingBrief`) la fige (`create_framing_brief`, ou le
  brouillon d'avant s'il dit la même chose) et l'envoie (`send_framing_brief`) ; raison écrite si rien n'a
  changé depuis la dernière envoyée (PROJ-BUG-05). La direction décide **sous le document**
  (`BriefReview`) : « Valider le Brief » ou « Demander une modification », qui fait **marquer les
  dimensions dans le document** et dire ce qui doit changer (`decideFramingBrief` →
  `decide_framing_brief` : seules les dimensions marquées rouvrent) ; « Demander des corrections
  détaillées » reste replié dessous. Les versions d'avant sont repliées (« Versions précédentes »),
  avec le retour de la direction ; les demandes de correction (`BriefRequestsSection`) ne s'affichent
  que s'il y en a. Comparaison, document complet, historique et complétude ne sont plus affichés
  (doublons du document, retirés le 29/10). **PDF gardé** (bucket
  `framing-brief-pdfs`, `lib/framing/brief-pdf-file.ts`, migration `20261028000701`) : une version
  envoyée est imprimée une fois par état (`<id>-<state>.pdf`, « Validée » s'imprime), juste après l'envoi
  et la validation (`after`), ou au premier téléchargement ; ensuite le fichier est relu sans navigateur.
  Écrit seulement par le responsable ou la direction (RLS, une fois, jamais remplacé), lu par qui voit le
  projet. La route ne lit plus tout le Cadrage pour une version (seulement s'il n'y en a pas). Police
  Google Sans Flex intégrée au HTML (`lib/pdf/fonts/google-sans-flex.ts`, OFL) : plus d'attente de
  Google Fonts pour ce PDF.
  **Mise en page du PDF** (retour d'Ibé du 02/11, `lib/framing/brief-pdf.ts` + `brief-pdf-style.ts`) :
  bandeau PDS OS, titre du projet, bande Version / État / Envoyée le / Validée le, Synthèse en encadré,
  dimensions numérotées (libellé à gauche, valeur à droite, source dessous), sources en pied, numéros de
  page. Les fichiers gardés portent la mise en page dans leur nom (`<id>-<state>-l2.pdf`, migration
  `20261105180201`, l'ancien nom reste lisible) : changer la mise en page = changer `LAYOUT`.
  **Lien de partage** (Sacha 05/11 : « toujours vers la dernière version ») : « Copier le lien »
  (`shareFramingBrief` → `share_framing_brief`, responsable ou direction, une version envoyée) copie
  `/b/<jeton>`, un lien par projet (`share_links`, scope `framing_brief`), créé une fois puis redonné ;
  la page publique (`app/(public)/b/[token]/route.ts`, sans session, `get_shared_framing_brief` pour
  anon) imprime à chaque ouverture le PDF de la **dernière version envoyée**, quel que soit son état,
  affiché dans le navigateur. Le Brief contient l'enveloppe budgétaire : le lien la montre. Pas encore de
  révocation dans l'interface (`revoked_at` est lu). Migration `20261105180101`, tests
  `framing-brief-share.test.sql`.
  Gestes en `WriteResult` avec `withOutcome` (`lib/framing/actions/brief-step.ts`).
- **Après le plan** : tout le Cadrage se lit (étapes faites, rien de modifiable), le Brief validé reste
  consultable dans son étape.

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
    la dimension Calendrier passe alors **À arbitrer**. **MKT-S1-04** (retours du 11/10,
    migration `20261012100101`) : chaque étape affiche son délai (« 21 j avant le temps fort »)
    et sa marge depuis aujourd'hui (« dans 5 j », « dépassée de 3 j »), dates sans heure
    comparées en jours de Paris ; l'arbitrage du Brief donne tout le calcul. Une échéance
    vraiment passée propose trois sorties au responsable (`UpstreamArbitration`) :
    **déplacer le temps fort** (sa modale), **ajuster les délais** du livrable
    (`strategy_deliverables.*_lead_days`, vide = défaut, décroissants vérifiés par le code,
    0 à 365 j en SQL) ou **accepter le risque** pour la date du temps fort
    (`upstream_risk_accepted_for`, auteur et date par trigger) : l'échéance n'est plus à
    arbitrer (`late` ≠ `passed`), et la question revient si le temps fort change de date.
  - **Propagées vers le Planning** : type `upstream` de `lib/project-plan/timeline.ts`, avec le
    canal des temps forts ; un clic ouvre `/strategy?d=calendar`.
- **Budget stratégie** (étape 6) : lecture stratégie des `budget_lines` (`lib/strategy/budget.ts`,
  `strategyBudget`) : **proposé** = toutes les lignes, **validé** = engagé ou payé, **à arbitrer**
  = estimé ou devis, reste = enveloppe − validé ; **répartition par levier** (chaque levier
  retenu, même à 0 €, puis les autres leviers qui portent des lignes, puis « Hors levier »).
  Panneau : tuiles, tableau par levier, puis l'éditeur de lignes de la page Budget. La dimension
  est « À arbitrer » s'il reste un montant à arbitrer ou si l'enveloppe est dépassée.
  **MKT-S1-02** (retours du 11/10) : jamais besoin d'une dépense pour établir le Brief. Sans
  ligne, l'enveloppe dit le budget en quatre états (`envelopeState`) : **non défini** (aucune
  enveloppe, « À arbitrer »), **0 €** (complet), **enveloppe seule** (commencée, « pas encore
  ventilée ») et **à confirmer** (le Cadrage l'a laissée « à définir plus tard », estimée, ou
  proposée sans confirmation : `envelopeToConfirm` de `loadStrategy`, « À arbitrer ») ; les deux
  derniers cas incertains vont dans « Restant à arbitrer », sans bloquer. La dimension Budget
  n'est donc jamais « À compléter ».
  **Strictement interne** : dans le Brief de sortie, jamais dans le Plan de sortie ni le Dossier
  de presse (règle pour les générateurs à venir).
- **Objectifs & KPIs** (étape 7 ; migration `20261010000701_strategy_kpis`) : l'**objectif
  stratégique** est un champ texte (`strategic_objective`) ; chaque KPI est **quantitatif**
  (cible, unité, échéance) ou **qualitatif** (le signal attendu, sans chiffre : vérifié en SQL).
  Un KPI quantitatif peut être alimenté automatiquement par les **fans Deezer de l'artiste**
  (`source = 'deezer_fans'`, `lib/strategy/kpi-actuals.ts`), lus par le code **après la
  date de sortie** ; sans donnée : « Donnée indisponible ». Aucune valeur inventée, jamais par PO.
  **MKT-S1-03** (migration `20261012100101`) : un KPI chiffré dit sa **métrique**
  (`metric` : streams, fans, vues, ajouts en playlist, autre ; aucune pour un qualitatif) ; la
  source Deezer ne va qu'avec une métrique « fans » (`sourceFits`, contrainte
  `strategy_objectives_source_metric_check`), la case n'apparaît que pour elle. Le KPI et le
  Brief disent le suivi (`kpiTracking`) : Deezer (artiste principal, relevé à chaque ouverture
  après la sortie), suivi manuel, ou « source à connecter » pour streams, vues et playlists.
  Les KPI existants ont reçu la métrique lue dans leur libellé ; une source Deezer posée sur
  autre chose que des fans est redevenue manuelle.
- **Réponses à choix (MKT-S1-01)** : Positionnement, Publics et Angle se lisent partout par
  `answerWithChoices` (`lib/strategy/compose.ts`, appliqué dans `loadStrategy`) : le texte
  enregistré, sinon la phrase composée par le code depuis les **choix confirmés**. Avant, accepter
  les pré-cochages de PO n'enregistrait que les choix : la carte restait « En cours » et le Brief
  disait « Non renseigné » malgré des réponses données.
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
  - **Recommandations** fondées uniquement sur des données réelles (`recommendations.ts`) :
    KPI sous 80 % du prorata linéaire de sa cible, KPI manqué à l'échéance, échéance amont
    dépassée, temps fort passé sans livraison. **Créer la tâche** (pré-remplie, corrigeable),
    **Ignorer** avec motif, **Parler à PO** (`AskPoButton`, question écrite par le code citant la
    donnée) ; `strategy_recommendations` empêche de reproposer. Niveaux, échéance proposée, lien
    tâche ↔ recommandation : lot du 13/10 ci-dessous (MKT-C2-01, 02).
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

### Lot 3 du proto « Projet complet » : la Stratégie en parcours (19/10/2026)

Cahier des charges `docs/projet-complet/strategy.md`. **Ce qui suit remplace, à l'écran, le pilotage
en accordéon, la grille de choix, « Tout accepter », la page `/strategy/brief` et le plan
d'exécution décrits plus haut** (tables et fonctions gardées).

- **Parcours** (`lib/strategy/journey.ts`, pur ; contexte `lib/strategy/step-data.ts`, `cache()`) :
  `start` Démarrer la stratégie (nom fixe, Sacha 29/10/2026 ; « Tenir l'échange du JJ/MM » dans sa ligne) · `dimensions` Les 8
  dimensions · `validation` Validation du Brief de sortie · `validated` Stratégie validée. Prérequis
  externe « Cadrage › Plan du projet » (`isWorkflowLaunched`), statuts et acteurs calculés (« Confirmer
  ou écarter n propositions de PO », « Arbitrer : … », « Compléter : … », « Valider le Brief de sortie »
  par valideur, `kind: "validate"`). Loader `lib/journey/strategy.ts`, branché dans le loader
  `marketing` (`part.key = "strategy"`). Routes `/strategy/<étape>` (`routes.projectStrategyStep`),
  `/strategy` redirige vers l'étape de la personne (`strategyLanding`), `?d=x` vers
  `/strategy/dimensions#dim-x`, `/strategy/brief` vers `/strategy/validation` (`?v=n` gardé). Cadre :
  `StrategyStepFrame`.
- **Démarrer** : `StartChoices` « Commencer la stratégie » (`startStrategyDirect`, `withOutcome`) /
  « Préparer un échange » (`CallPrepForm` dans l'étape, « Changer »). **Recommandé** : même règle que le
  Cadrage — l'échange quand ce qui reste à décider dépasse ce que PDS OS sait déjà ; connu = besoins du
  Brief à transformer en leviers, date de sortie, enveloppe, objectif du Cadrage (`knownAtStart`,
  `lib/strategy/start-reco.ts`). Ordre du jour de l'échange = **les 8 dimensions** (proto), les questions
  de ce qui manque repliées sous chaque point (`strategyCallTopics`) ; objectif du proto. Puis
  `PlannedCallInPlace` (enregistré et traité sur place), et une fois le compte rendu rangé : `MeetingFacts` + `MeetingSummaryBlock`, les
  lignes du compte rendu étant **les propositions de la Stratégie** (`strategyMeetingLines`), la
  prochaine étape nommant direction **et** directions créatives (incohérence du proto corrigée).
- **Les 8 dimensions** (`lib/strategy/dimension-model.ts`, `-items.ts`, `-levers.ts`, `-budget.ts`) :
  chaque réponse, levier, livrable, temps fort et objectif est une ligne `ProposalRow` (Confirmer /
  Modifier / Écarter, citation · « Échange stratégique du 05/10 », « Saisi par », « Modifié par »),
  **un écarté reste visible barré**, rien n'est pré-coché (règle 21 : plus de `proposeStrategyChoices`
  après un call, plus de « Tout accepter »). **Depuis le 06/11/2026** (Sacha, cadre commun avec le
  Cadrage, `DimensionList`) : une dimension repliée par ligne, une seule ouverte (le détail du ticket
  sous son titre, plus de pli dans le pli) ; ses propositions se
  confirment ensemble après lecture (« Confirmer les n » au pied, `confirmStrategyDimension`, les lignes
  affichées seulement), chaque ligne garde « Modifier » / « Écarter » (`ProposalRow confirmInGroup`).
  **La question de PO** (06/11/2026, Sacha : « pourquoi il n'y a pas de question comme au Cadrage ? ») :
  au-dessus des dimensions, l'encadré commun `PoQuestion` pose une question à la fois, choisie par le
  code (`lib/strategy/questions.ts`) : les points rédigés sans valeur (positionnement et ses 4 points,
  publics, angle et les 4 parties du récit, objectif stratégique ; pas ceux d'une dimension complète),
  puis les leviers à arbitrer. Une proposition de PO n'est pas posée en question : elle se confirme dans
  sa dimension. Les listes (publics détaillés, livrables, temps forts, budget, KPI) restent dans leur
  dimension. Écritures : `saveField` / `confirmField` / `rejectField` (deliverable `strategy`),
  `prepareStrategyDraft(…, champ)` pour « M'aider à définir », `arbitrateLever`. États : À compléter / En cours / À arbitrer / Complété
  (mots du ticket, le proto disait « À trancher ») ; l'étape est faite quand plus rien n'est à arbitrer
  ni à compléter (proto ; « En cours » ne bloque pas et part dans « Restant à arbitrer »). Positionnement
  et Angle : une réponse (« Ajouter » tant qu'aucune n'est gardée) ; Publics : la réponse + une ligne
  par public (`strategy_audiences`, « Écarter » le retire). **Dispositif** : propositions de PO
  d'abord, « Confirmer les n » juste dessous, puis les leviers Retenu, À arbitrer (aussi un besoin
  confirmé du Brief sans levier, jamais retenu d'avance) et Non retenu par quelqu'un ; un levier courant
  que personne n'a choisi n'est pas listé (`preset`), « Ajouter un levier » le propose (ou « Autre
  levier ») (Sacha 07/11/2026). « Retenir » / « Ne pas retenir » ne sont que dans la question de PO
  au-dessus quand elle pose les leviers (`decideAbove`), la ligne dit seulement l'état. Une pastille par
  dimension : « n à confirmer », sinon l'état (plus de « rien de dit »). **Budget**, règle tranchée (point 5) :
  Proposé = lignes des leviers retenus et « Hors levier », À arbitrer = lignes d'un levier à arbitrer,
  Écartée = levier non retenu, Validé = engagé, facturé ou payé parmi le proposé, Reste = enveloppe −
  proposé − à arbitrer ; enveloppe non définie ou à confirmer = « En cours », listée sans bloquer.
  **Replié** sous chaque dimension (`Fold`, `DimensionWork`) ce que le ticket ou Ibé demandent et que
  le proto n'a pas : quatre points du positionnement (MKT-S1-05), publics détaillés, narratif en
  5 parties et synthèse (ticket § 2, MKT-S1-06), prérequis juridiques (MKT-S1-07), quantité / levier /
  délais des livrables (MKT-S1-08), temps forts modifiables et vue par canal (ticket § 5), répartition
  par levier et lignes du budget (§ 6), objectif stratégique et KPI chiffrés (§ 7) ; « Avec PO »
  (brouillon MKT-S1-09 et dictée). **Retiré** : la grille de choix fermés (code seul : MKT-S1-01 ne la
  demandait pas, il corrigeait la lecture des choix ; le ticket refuse le « formulaire rigide »),
  « Proposer des réponses », `ImportPanel`, `BriefReminder`, le pilotage en accordéon.
- **PO propose livrables, temps forts et objectifs** (migration `20261019030101`) : `report_items.kind`
  `deliverable` / `milestone` / `kpi` (schéma d'extraction, citation obligatoire) ; l'import ne les
  propose que si la citation est **retrouvée mot pour mot** (`located ≠ missing`) et un temps fort
  seulement si le code lit son jour dans les mots (`saidOffsetDays` : « J-14 », « une semaine après »,
  « la veille »…) — sinon pas de temps fort proposé (point 6). **Table `strategy_proposals`** plutôt
  qu'un statut sur `strategy_deliverables` / `milestones` / `strategy_objectives` : un livrable inséré est
  aussitôt reflété en Conception (`z_design_mirror`) et lu par une dizaine de listes d'autres modules ;
  une proposition n'atteint rien avant d'être gardée. `decide_strategy_proposal` (garder = crée la ligne
  réelle : livrable « Hors levier », temps fort au jour J+n de `strategy_reference_date`, objectif
  qualitatif ; reformuler = renomme ; écarter = retire la ligne et garde la proposition barrée),
  `add_strategy_item` (« Ajouter », gardé d'office), `discard_strategy_item` (une ligne saisie avant :
  retirée, gardée barrée). RLS : lecture `can_see_project`, insertion directe seulement par l'import
  (responsable, stratégie ouverte, `state = proposed`). Cascade avec le projet et l'item de compte rendu
  (`delete_project_row` inchangé). `strategy_deliverables.lever_id` **facultatif** (« Hors levier »,
  `check_strategy_links`). `levers.decided_by / decided_at` (trigger) et `proposed_label` (mots de PO).
- **Validation dans l'étape** : le Brief en **4 blocs** (Pour qui et pourquoi, Comment, Quand, Objectif
  et budget, `lib/strategy/brief-out.ts`) écrit par le serveur dans chaque version (`content.out`) avec
  « Restant à arbitrer » (`toDecide` = les points « En cours », jamais critiques) ; les versions
  antérieures gardent leur rendu (`BriefSnapshotView`). `sendBriefOut` (refusé tant que l'étape 2 n'est
  pas faite ; direction toujours, directions créatives cochées par défaut), `decideBriefOut`
  (`DecisionPanel` : Valider le Brief de sortie / Valider avec réserves / Demander une modification ;
  valider accepte les alertes critiques d'une ancienne version, montrées sur la pièce),
  `ReturnCallout` + `ResubmitForm` (« Répondre et transmettre à nouveau » = version suivante, même
  valideurs, réponse en note), « Relancer <Nom> » (`remind_strategy_review`). **Réserve** (migration
  `20261019030201`, point 3 tranché comme le proto) : le commentaire devient la réserve et une tâche du
  responsable du projet ; sans date donnée, échéance = date de sortie si elle est à venir, sinon dans 7
  jours (une tâche exige une date, `tasks_due_date_required`). « Modifier avec PO » (ticket § 8) = la
  dictée, tant que la Stratégie est ouverte.
- **Stratégie validée** : encadré, Documents (Brief Vn · Voir (PDF) · Partager (lien interne copié) ;
  Plan de sortie et Dossier de presse avec leur état réel, « Générer » → générateurs gardés, ticket
  § 11–12), « Ce que la Stratégie alimente » à égalité (Conception, Activations, Planning chiffré, Suivi
  § 14) — « Passer à la conception » n'est plus l'action principale (point 8, proto du 18/10) —,
  réserves à lever, « Réviser la stratégie » (§ 9). **Retiré** : plan d'exécution (`ExecutionPlanCard`,
  « Pas demandé » au 18/10 ; les Activations créeront leurs activations depuis « Leviers à préparer »),
  les 8 rubriques repliées. Notification `strategy_validated` (trigger sur `strategy_documents`) au
  responsable et aux directions créatives, ouvrant `/strategy/validated`.

### Retours Marketing du 12/10/2026, lot C1 (MKT-C2-01, MKT-C2-02)

Migration `…20261013100001_strategy_recommendation_actions`.

- **Stratégie validée** (MKT-C2-01, `ValidatedStrategyHome`) : l'état, puis **une seule action
  principale** au-dessus des documents, « Passer à la conception » (`ConceptionNextStep`) : elle
  dit avec quoi la Conception s'ouvre (les livrables engagés, commencer directement ou préparer
  un échange créatif) et que le Brief V*n* reste tel quel ; elle ouvre l'**accueil de la
  Conception** (étape d'entrée avec le contexte du projet), rien ne démarre avant le choix du chef
  de projet (`start_design`). Libellé selon l'étape `design` : Passer / Reprendre / Voir ; un
  lecteur voit « Voir la conception » en contour. Chaque document dit son public **et son
  usage** (`strategyDocuments.usage`), le Dossier de presse « Facultatif ». Les **réserves
  ouvertes** de la validation s'affichent tant qu'une reste à lever (`ReservesList`, réutilisé du
  Brief). Les **8 rubriques** passent dans un bloc repliable « Consulter la stratégie validée »,
  replié par défaut (ouvert si `?d=`), résumé par état (« 5 rubriques complétées · 2 à compléter
  : validées avec ces manques, elles restent signalées ») : un manque ne se lit jamais comme une
  décision. Ensuite : Activations et Planning.
- **Recommandations du suivi** (MKT-C2-02, `lib/strategy/recommendations.ts`, séparé des KPI
  `follow-up-results.ts`) : chaque règle a un **niveau** fixé par le code — KPI manqué =
  Information, KPI sous le rythme = Recommandation, étape amont en retard = Risque, temps fort
  passé sans livraison = Blocage (ton `recommendationLevelTone`) — et la carte dit sa source, la
  donnée, **pourquoi** elle apparaît, son **effet** sur le projet (aucune ne remet en cause la
  validation) et l'action proposée. **Tâche proposée par le code** : responsable du livrable
  sinon chef de projet, échéance à J+7 ou le jour du temps fort menacé s'il vient avant, base de
  calcul et fuseau (Paris) écrits. « Créer la tâche » ouvre le formulaire pré-rempli
  (`RecommendationTaskForm`) ; **`apply_strategy_recommendation`** (security definer, chef de
  projet seul) écrit la recommandation et sa tâche ensemble : rejouer rend la même tâche (avant,
  la tâche était insérée avant la recommandation, hors transaction → doublon possible).
  « Ignorer » demande un **motif** (contrainte `not valid` : les anciennes lignes n'en ont pas).
  La recommandation garde à l'enregistrement son niveau et son texte (`level`, `summary`), car la
  règle peut cesser de s'appliquer ; « Déjà traitées » liste tâche (état, responsable, échéance)
  ou motif. **Lien inverse** : une tâche issue d'une recommandation mène à elle (`taskHref`,
  `routes.projectStrategyRecommendation`, ancre `reco-<id>`). Un lecteur lit « Seul le chef de
  projet… » au lieu de boutons absents.
- **Retour depuis PO** : `AskPoButton origin` (page + fil projet › Stratégie › Suivi ›
  recommandation) gardé dans `AssistantProvider` (onglet, jamais stocké) ; la conversation montre
  le fil sous son titre et « Retour au projet » ramène à la recommandation (ancre `rec-<règle>`).
  Effacé par « Nouvelle conversation ».
- Corrigé au passage : `ReservesList` (client) recevait une **fonction** `versionOf` depuis un
  composant serveur (page Brief) — refusé par Next dès qu'une réserve existe ; remplacé par un
  objet `versions`. Conversion d'erreur `ActionResult → WriteResult` unique : `lib/framing/written.ts`.
- Tests : `strategy-follow-up.test.sql` (20) — motif obligatoire, une seule tâche par appel
  rejoué, recommandation ignorée non transformable, responsable membre, autre chef de projet et
  DG refusés, le responsable de la tâche la voit.

### Retours Marketing du 11/10/2026, lot 9e (MKT-S1-16)

Migration `…20261012101501_strategy_reserves_execution`.

- **Avant l'envoi** : la fenêtre « Demander la validation » dit ce qui part (V suivante, figée
  à l'envoi, en attente) et combien d'alertes critiques devront être acceptées ; chaque
  valideur avec son rôle, le message.
- **Alertes critiques** : le code marque `critical` dans le Brief une étape amont déjà passée
  et un budget au-delà de l'enveloppe (`arbitrations`, champ `toDecide[].critical` de
  l'instantané). Valider exige de les accepter **une par une** (cases du formulaire,
  `strategy_critical_alerts` relu en SQL dans `decide_strategy_document`, sinon
  `critical_alert_unaccepted`) ; sinon on demande une modification. L'avis garde les alertes
  acceptées (`accepted_alerts`).
- **« Valider avec réserves »** : chaque réserve a un texte, un responsable (membre de PDS) et
  une échéance à venir, vérifiés en SQL (`strategy_document_reserves`, `with_reserves` sur
  l'avis) ; elle devient une **tâche** de son responsable (`tasks.strategy_reserve_id`),
  cochée quand elle est levée (`lift_strategy_reserve`, par son responsable ou le chef de
  projet, avec une note). Listées à côté du Brief, ouvertes d'abord.
- **Révisions** : chaque version reste figée ; « Changements depuis la V… » compare la version
  affichée (ou le Brief en cours d'une révision) à la version validée précédente, élément par
  élément (`briefChanges`, ajouté / retiré / modifié, avant barré → après). Auteur, dates et
  commentaires restent dans l'historique.
- **Plan d'exécution** (`executionPlan`, code) : une fois le Brief validé, une activation par
  levier retenu qui n'en a pas (genre lu dans le levier, `kindOfLever`, mode interne pour
  l'influence et la presse) et une tâche « Livrer : … » par livrable qui a responsable et
  échéance ; les livrables sans eux sont à planifier d'abord ; la Conception a déjà chaque
  livrable engagé (miroir), la Production les y lit. Le chef de projet coche ce qu'il garde et
  **confirme** avant toute création (`apply_strategy_execution`, security invoker : les
  politiques des activations et des tâches décident ; plan recalculé côté serveur). Chaque
  élément est d'abord inscrit par sa source (`strategy_execution_items`, unique
  `(project_id, item_key)`) : rejouer ne crée jamais deux fois. Lien dans les deux sens : le
  Brief liste ce qui a été créé avec sa version, l'activation affiche « Plan d'exécution du
  Brief V… » vers cette version, la tâche mène à son livrable.

### Retours Marketing du 11/10/2026, lot 9d (MKT-S1-06, 09)

Migration `…20261012101401_strategy_generated_drafts`.

- **Brouillon de stratégie** (« Préparer un brouillon », MKT-S1-09, `lib/strategy/draft.ts`,
  `draft-plan.ts`) : PO lit les réponses texte confirmées du Cadrage (sauf juridiques), le
  contexte initial et les comptes rendus de calls (session de l'utilisateur, données jamais
  consignes) et rédige les champs encore non confirmés : réponses Positionnement / Publics /
  Angle, quatre points du positionnement, quatre parties du récit. Le code ne garde qu'un
  champ demandé, une fois, appuyé sur une source connue et une citation d'au moins trois mots
  trouvée mot pour mot. Chaque proposition est une ligne `field_values` de type
  **`generated`**, **toujours `proposed`** (contrainte SQL), avec `source_label`,
  `source_quote` et une **confiance calculée par le code** (`draft-confidence.ts` : part des
  mots du texte présents dans la source, un champ du Cadrage compte un peu plus ; haute,
  moyenne, faible « à relire »), jamais par le modèle (règle 6). L'objectif stratégique est
  repris tel quel de l'objectif confirmé du Cadrage (code, sans IA). **Rien de confirmé n'est
  remplacé.** Ce que les sources ne fondent pas revient en **questions prioritaires** par
  dimension (`priorityQuestions`), chacune un lien vers sa réponse. Confirmer un brouillon tel
  quel garde sa source (ligne `import` avec le même libellé et la même citation) ;
  l'historique distingue importé, généré et saisi. Un compte rendu de call n'est pas cité par
  son id (`field_values_call_source` le réserve au type `call`) : son titre est dans le libellé.
- **Synthèse du récit** (MKT-S1-06, champ `narrative_summary`) : « Rédiger la synthèse » à
  partir des parties écrites et de l'angle, ton (sobre, chaleureux, percutant) et longueur
  (courte, développée) choisis, proposition à confirmer ; une synthèse confirmée ne se
  réécrit qu'à la main. **À arbitrer** : les répétitions entre parties (cinq mots de suite,
  trouvées par le code à chaque affichage) et les contradictions signalées par PO, gardées
  seulement si chaque citation est dans sa partie (`narrative-review.ts`). Chaque partie non
  confirmée (récit et positionnement) a « Proposer à nouveau » (ce seul champ). Le Brief
  montre la synthèse en tête du récit.

### Retours Marketing du 11/10/2026, lot 9c (MKT-S1-08, 10)

Migration `…20261012101301_deliverables_calendar`.

- **Livrables par lots** : sous chaque levier retenu, « Proposer un lot » (`lotForLever`,
  règles du code selon les mots du levier : clip, réseaux, influence, presse, playlists,
  publicité, radio, live, partenariat ; titres déjà présents écartés), cochés, quantités
  ajustées, responsable et échéance communs, créés en une fois (`addDeliverableLot`) ;
  cases à cocher sur les livrables et barre « Appliquer à la sélection » (`updateDeliverables`,
  un champ vide ne change rien) ; **format** d'un livrable ; jalons liés écrits sous lui.
- **« Aucun livrable requis »** (`levers.no_deliverables`) : une décision, plus compté
  « levier sans livrable » ; un livrable ajouté ensuite la reprend (trigger).
- **Calendrier** : types Livraison, Validation, Publication à part de l'annonce, du teaser
  et de la sortie (canal « autre » pour les étapes internes) ; pour un livrable sur un temps
  fort, « Proposer les jalons amont » (livraison en fin de production, validation avant la
  sortie, datés par ses délais, jamais en double ni dans le passé, `upstreamMilestones`) ; une
  échéance passée dit la **première date tenable** avec son décalage (`firstFeasibleDate`) et
  propose « Déplacer au … », confirmé avec son impact (`moveMilestone`), les échéances amont
  suivant la nouvelle date. Délais configurables par livrable (lot 1).

### Retours Marketing du 11/10/2026, lot 9b (MKT-S1-05, 07, 13, 14)

Migration `…20261012101201_strategy_audiences_kpi_owner`.

- **Cartes du pilotage** : chaque dimension « réponse » compte ses éléments confirmés, à
  arbitrer et à renseigner (`DimensionStatus.counts`), et la carte mène au **premier
  manque** (`anchor` : la question, une partie, un public), calculé par le code.
- **Positionnement en quatre points** (champs `positioning_promise`, `_difference`,
  `_proof`, `_tone` de `field_values`, comme les parties du narratif) sous la réponse à choix ;
  **publics un par un** (`strategy_audiences` : segment, priorité cœur de cible / à
  conquérir, besoin ou insight, canal pressenti ; écrit par le responsable tant que la
  stratégie est ouverte), les choix cochés proposés comme publics à décrire.
- **Juridique ≠ levier** (`lib/strategy/legal-items.ts`) : un libellé de contrat, droits,
  cession, licence, autorisation, SACEM… est refusé comme levier (`legal_not_lever`), un
  besoin juridique du Cadrage n'est plus proposé comme levier ; un ancien levier juridique
  est signalé avec « Retirer du Dispositif ». Le Dispositif montre en dessous les
  **prérequis et dépendances** lus dans le Juridique (actions ouvertes du plan, responsable,
  date, source), et le Brief les sépare du dispositif retenu.
- **Objectifs & KPI** : l'objectif du Cadrage est proposé (« Reprendre comme objectif
  stratégique ») et son objectif mesurable prépare un KPI (`kpiFromFraming` : cible,
  métrique, unité, date de sortie à vérifier) ; l'unité suit la métrique (`METRIC_UNITS`) ;
  chaque KPI dit définition, calcul, source et fréquence (manuel, Deezer, source à
  connecter), période et **responsable** (`owner_person_id`).
- **Brief de sortie** : **« L'essentiel »** d'abord (`briefSummary` : objectif, publics, angle,
  dispositif, jalons clés, budget, KPI, risques et manques, date d'établissement), tiré des
  sections du même instantané ; le détail des huit dimensions est replié à l'écran, déplié
  dans le PDF qui garde le même ordre.

## 6 ter. Plan du Projet

Cadrage › Plan du projet `app/(app)/app/projects/[projectId]/framing/plan`, `lib/plan/*`, `components/plan/*`, migration
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
  `project_plan_items`). Tous les workflows du plan démarrent (la Stratégie passe en cours ;
  avant le 19/10, ceux d'Ensuite attendaient « Lancer maintenant », `launch_plan_workflow`).
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
- **Le plan est l'étape 4 du Cadrage** (lot 2 « Projet complet », 19/10/2026, remplace la décision du
  07/10) : `/framing/plan` (`routes.projectPlan`), plus rien sur la Vue d'ensemble. Avant lancement
  (proto « Suite du Cadrage », 29/10/2026) : une `SunkCard` « Organisation du projet », sa source en tête
  (« Proposée par PO à partir du Brief de cadrage · version n », plus d'encadré PO), « Ajouter une étape »
  dans l'en-tête, les 4 groupes l'un sous l'autre (`PlanColumns`), une ligne par étape (`PlanStepCard` :
  « **Stratégie** · Marketing », raison, pilote et échéance), son « Modifier » ouvre la ligne
  (`PlanRowEditor` : Colonne, Pilote, « Autres réglages » = la modale détaillée, monter / descendre,
  retirer) ; rien n'est enregistré avant « Lancer le plan », qui dit à côté ce qu'il démarre et passe par
  `launchProjectPlan` (`withOutcome`, tous les parcours ; plus de modale de revue). Lancé : la même carte,
  « Lancée par X le … », lignes en lecture avec leur statut réel, « Lancer » d'un workflow resté en attente (plans lancés
  avant ce lot) et « Hors du plan », puis `PlanStepsSection` et l'historique repliés.
- **Huit workflows** (migration `20261019020101_plan_all_workflows.sql`, tests
  `plan-all-workflows.test.sql`) : `strategy`, `design`, `production`, `activations`, `review` (le
  Marketing), `master`, `legal`, `distribution` (ex-`delivery`, repris). Proposition (`proposePlan`) :
  Stratégie en Focus, puis **les workflows que le projet a** (`applicableWorkflows`, la règle de la
  navigation, finitions du 19/10) : Master dès qu'il a un titre (Focus si la date cible est proche,
  sinon Pendant ce temps, « master final déjà là » s'il ne reste rien à mixer), **Juridique toujours**
  (Focus s'il y a un blocage de droits, sinon Pendant ce temps — y compris pour un projet de contenu),
  Conception (pilote = direction créative), Production et Activations en Ensuite, Distribution
  (projet musical) et Suivi & bilan en À anticiper. « Hors du plan » ne propose jamais un Master à
  un projet sans titre ; les lignes-notes d'anticipation ne sont plus proposées. **« Lancer le plan » démarre
  tous les workflows du plan, quelle que soit leur colonne** (la colonne dit l'ordre) ;
  `launch_plan_workflow` garde sa signature (ajout d'un workflow oublié). **Verrou** :
  `workflow_is_launched` couvre les huit ; Conception, Production, Activations, Suivi & bilan et
  Distribution s'ouvrent au lancement du plan (ou s'ils avaient commencé avant : Stratégie entamée,
  fiche de production, activation, dossier de distribution, étape avancée) ; layouts `design/`,
  `production/`, `activations/`, `review/`, `release/` derrière `WorkflowGate` (`WorkflowLocked` :
  verrou commun du lot 1). Le relais `lib/overview/framing-steps.ts` de la Vue d'ensemble ne sert plus : le
  loader du Cadrage est branché.
- **Plan pilotable** (retours du 11/10/2026, PROJ-UX-07) : chaque étape a un **pilote**
  (`owner_person_id`) et un **exécutant** distinct (`executor_person_id`, « le pilote » par
  défaut), une **échéance** (proposée depuis l'échéance du Cadrage de son type :
  master final → Master, livraison et sortie → Livraison, temps fort → Stratégie,
  `framingDueDate`) et ses **dépendances** (liens vers ces étapes). Le **statut réel** est lu
  dans le workflow (`stepStatus`, `lib/plan/steps.ts` ; Stratégie et Conception = chevrons du
  Marketing), jamais stocké. Les **incohérences** sont dites sur l'étape (`stepIssues`) :
  colonne qui contredit l'avancement, dépendance placée plus tard ou retirée, échéance après la
  date cible ou avant celle d'une dépendance, blocage (dépendance des workflows, lien),
  **« À revoir »** quand le Cadrage a changé depuis le Brief validé (dimensions → workflows
  nourris, `workflowsToReview`). Avant le lancement : modifier (`PlanStepForm`), monter /
  descendre, retirer, **ajouter une étape** (sans workflow, rien n'est lancé par elle), puis
  « Lancer le plan », ce qu'il démarre et le nombre d'incohérences écrits à côté (la modale de revue
  `PlanLaunchReview` est retirée le 29/10/2026). Après : « Étapes du plan »
  sous la Vue d'ensemble (`PlanStepsSection`, onglets par statut), modifier / ajouter / déplacer
  / marquer faite une étape ajoutée (`update_project_plan_item`, `add_project_plan_item`,
  `move_project_plan_item`, `set_project_plan_item_done`, responsable seul), **historique du
  plan** (`project_plan_events` : lancement, lancement d'un workflow, ajout, modification avec
  avant / après, déplacement). « Lancer » d'une carte de workflow est confirmé (ce qui démarre,
  le pilote) ; qui a lancé le plan est dit sous le titre. `LaunchedPlan` (jamais affiché depuis
  le lot 4) supprimé. Déplacer une étape ne lance jamais rien.
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
- Accueil : `AssistantPanel` puis le fil de `lib/home/feed.ts` (même source que Travail,
  ci-dessous).

### Page Travail (`/app/work`) et accueil : une seule source (finitions, 19/10/2026)

Ce qui attend la personne vient **des parcours de chaque projet** (`docs/VISION-UX.md` § 3,
« Une seule source »), jamais d'une liste à part :

- `loadMyJourneyWork` (`lib/work/journeys.ts`, `cache()`) : pour chaque projet lancé que la
  personne voit (RLS), `loadShellActions` (`lib/overview/journeys.ts`) = `loadShellJourneys`
  (la source du Travail, des Validations et des pastilles d'un projet) une fois le plan lancé ;
  avant, le seul parcours du Cadrage (les autres chargeurs ne sont pas lus). Six projets à la
  fois (`settleWithLimit`, `lib/utils/parallel.ts`) : tous ensemble, des milliers de requêtes
  partaient d'un coup et la passerelle répondait « fetch failed ». Un projet en échec est
  écarté et dit (`error`), jamais lu « rien ».
- **Travail global** (refonte du 27/10/2026, `docs/VISION-UX.md` § 2) : **« Maintenant »** en
  tête (`WorkLead`, cadre `NowFrame` partagé avec `NowCard`) = l'action la plus pressée de la
  personne avec ses cinq réponses (l'action, « Projet · Module › Étape · avant le … », le
  **pourquoi** de l'étape, **Validation** et **Ensuite** lus dans le parcours par `nextOf`,
  « Ouvrir » sur le geste) ; puis toutes les autres, **jamais elle-même répétée**, en
  **groupes par échéance** (En retard, Cette semaine jusqu'au dimanche, Plus tard, Sans
  échéance, En attente d'un autre), titres repliables d'**un seul tableau** (`WorkTable` sur
  `DataTable`, 28/10 : Action, Projet, Module, Échéance, Validation, État ; le module vient de
  `ProjectAction.module`, l'endroit de `partLabel` + titre de l'étape). Onglets Tout / À faire / À valider (le retard est un
  groupe, plus un onglet). Lignes et groupes calculés par le code (`workRowsOf(work, journeys,
  today)`, `lib/work/rows.ts`) : un projet à accepter, les actions des parcours (liées par
  `actionHref`, la section du geste), décisions marquées « À valider » (acteur `kind:
  "validate"`) ; À retransmettre / En attente d'un chef de projet (`assign_projects`,
  `handoverOf`), propositions de PO des projets dont on est responsable, et les **tâches libres**
  (rattachées à aucun workflow, `free` de `loadMyTodo`). Une ligne sans étape derrière (projet à
  accepter, tâche) dit son pourquoi par `work.lead.why`. Retirés : « Mes projets » et sa
  prochaine action, livrables à attribuer / à concevoir, conception, décisions de conception,
  validations d'étape (`validations`) — tous doublaient les parcours. En-tête : « Voir le
  calendrier ».
- `loadLaunchedJourneys` (`lib/work/journeys.ts`, `cache()`) lit une fois par requête les
  parcours de tous les projets lancés ; `loadMyJourneyWork` (Travail, accueil, compteur) et le
  Calendrier en partent.
- **Accueil** (refonte du 29/10/2026, proto `docs/protos/accueil.html`) : `loadHomeFeed`
  (`lib/home/feed.ts`, une fois par requête) reprend **les lignes du Travail** (`workRowsOf`) :
  « Maintenant » = `leadOf` (le même que Travail : projet à accepter ou à retransmettre d'abord,
  puis la première action), « Aussi à vous » = les suivantes. « Ce que vous attendez » = le
  `waiting` des parcours (`loadLaunchedJourneys`) : tous les projets pour la direction
  (`assign_projects`), sinon ceux qu'on mène et les étapes qu'on valide (nom du valideur égal au
  nom du compte : les étapes ne portent pas d'id de personne), plus les projets en attente
  d'acceptation. « Vos projets » : tout pour la direction, sinon ceux qu'on porte, où l'on a une
  action ou que l'on attend ; triés par échéance. `HomeSummary` (sous la salutation) relit le même
  cache. Plus d'activité, de sorties ni de cartes séparées (`home-cards`, `CardGrid` retirés).
- **Compteur de « Travail »** dans la barre principale (`components/shell/work-count.tsx`) :
  dans un projet, celui du projet (son layout) ; hors d'un projet, la **somme des projets**,
  déclarée projet par projet par l'accueil et le Travail, puis tenue à jour par chaque projet
  visité. Rien avant le premier passage sur l'accueil ou le Travail (pas de route d'API : le
  `cache()` de React ne joue pas dans un route handler, la lecture y coûtait deux fois plus).
- Lectures partagées une fois par requête pour tenir plusieurs projets : `loadMembers`,
  `listValidatorRows` (`lib/framing/related.ts`), `isWorkflowLaunched`, `readInventoryRows`,
  `loadIntake` (`memoPerRequest`, `lib/utils/request-memo.ts`, clé explicite pour des
  arguments objets). Comme `cache()`, ces mémos ne jouent qu'au rendu : une Server Action
  relit tout (l'avant/après de `withOutcome` reste juste).
- `lib/work/next-action.ts` ne sert plus qu'à `stageHref`. L'assistant (`my_todo`) lit encore
  `loadMyTodo` : à rebrancher sur les parcours (non fait ici).

### Calendrier (`/app/calendar`, 27/10/2026)

Les dates que PDS OS **connaît déjà**, dans tous les projets que la personne voit, en un
calendrier : rien ne s'y saisit, **chaque date s'ouvre là où elle se décide** (règle 1 de
`docs/VISION-UX.md` : une seule source). Lecture `loadCalendar(period, access)`
(`lib/calendar/queries.ts`), session de l'utilisateur (RLS), bornée à la période :

| Date | Source | S'ouvre sur |
| --- | --- | --- |
| Sortie (musique) ou Échéance du projet | `projects.due_date` (`listProjects`, archives exclues) | le projet |
| Mix V1 / Mix final / Mastering / Master final attendu | `master_briefs` (les quatre colonnes) | Master › Brief |
| Tournage · livrable | `production_schedule_decisions` en vigueur, sinon `production_sheets.shoot_date` | la Production du livrable |
| Temps fort | `milestones` (Calendrier de lancement de la Stratégie) | Stratégie › Calendrier |
| Call ou réunion (avec l'heure) | `listAllCalls({ range })` | le call (dans son projet) |
| Étape ouverte datée | `step.due` des parcours (`loadLaunchedJourneys`, `mine` et `waiting`) : « Valider … » si c'est à soi, « Nadia Benali : valider … » sinon | `actionHref` |
| Tâche libre datée | `freeTasksOf(loadMyTodo)` | la tâche |

- Une date d'un projet absent de la liste (archivé) est écartée. Une source en échec est dite
  (`error`), jamais lue « rien ».
- **Mois** par défaut (`?mode=week` pour la semaine, `?date=AAAA-MM-JJ` pour se déplacer),
  **Tout / À vous** (`?voir=mine` : ce qui demande un geste à la personne — ses étapes, ses
  tâches, ses calls). Téléphone : agenda par jour. Le mois est rendu côté serveur, des liens
  (`ViewLink`).
- **Semaine = les heures** (Sacha, 01/11/2026 : « sur la semaine on voit les heures, le même
  calendrier que dans Call ») : le calendrier des Calls (`CallsCalendar` en semaine, avec
  `items`, § 4 bis) ; les calls sur leur créneau (création, déplacement, fiche), une date à l'heure sans
  fin (tournage) sur une heure, les dates sans heure dans la rangée sous les jours (`allDay`).
  `loadCalendar` rend aussi les calls bruts (`calls`), réduits à ceux que les dates gardent
  (archives, « À vous ») ; le formulaire de réunion est lu en même temps (`loadMeetingFormData`).
- Couleur = **le projet** (`projectHue`, la même que dans les Calls) ; la nature de la date est
  dans son libellé (« Mix V1 attendu », « Sortie » en semi-gras). Point bleu = à vous, rouge = en
  retard ; un jour passé est atténué.
- Jours et périodes : `lib/utils/calendar-period.ts` (sorti de `lib/calls/calendar.ts`, partagé
  avec les Calls), barre `CalendarToolbar` (`components/ui/`), textes `lib/i18n/fr/calendar.ts`.

---

## 8 bis. Notifications et mise à jour en direct

- Source unique : la table `notifications`, écrite par la base. Le texte est rédigé par le
  code (`lib/notifications/types.ts`), la base ne stocke que des identifiants.
- **Cloche** (`components/notifications/notification-bell.tsx`) dans la barre latérale
  (panneau ouvert à droite) et l'en-tête mobile (dessous), données chargées par
  `app/(app)/layout.tsx`.
- **Realtime** (`notification-listener.tsx`) : à chaque insertion pour la personne
  connectée → `router.refresh()` (la page se met à jour sans recharger) + toast
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

**Coquille du proto « Projet complet » (lot 1, 19/10/2026 ; cahier `docs/projet-complet/shell.md`).** Remplace,
pour l'écran, les lots 1 et 4 ci-dessous (la logique `lib/workflow-status/` reste).

- **Navigation** (`components/projects/project-sidebar.tsx`, `project-nav-list.tsx`, `project-nav-chips.tsx`) :
  Vue d'ensemble, Cadrage, Workflows, Pilotage (Travail, Validations, Activité, Budget). Équipe, Planning, Calls,
  Livrables, Fichiers ont `hidden` dans `projectSections` : route et fil d'Ariane gardés, plus d'entrée (Équipe
  n'est plus liée de nulle part : à rattacher à « Qui fait quoi »). Point du Cadrage : `in_progress` jusqu'à
  `planLaunchedAt` (`lib/plan/queries.ts`, `cache`), `done` après. Pastilles « À vous » : `countMine` de
  `loadShellJourneys` dans `CountedProjectSidebar` sous `Suspense` (repli = la barre sans compteurs : la page
  n'attend jamais les parcours) ; le total va sur « Travail » de la barre principale par `WorkCountReporter`
  (magasin client, `components/shell/work-count.tsx`, remis à 0 en quittant le projet). Mobile : puces.
- **`loadShellJourneys`** (`lib/overview/journeys.ts`, `cache`) = `loadProjectJourneys` + les quatre étapes du
  Cadrage lues de ses états tant que la zone Cadrage n'a pas de loader (`framingFallback`,
  `lib/overview/framing-steps.ts` : étape `framing` de `project_stages`, validation en attente, `project_plans`) ;
  **avant « Lancer le plan », seules les actions du Cadrage comptent** (un workflow commencé avant le plan garde sa
  page mais ses actions attendent le plan). Lu par la navigation, la Vue d'ensemble, Travail, Validations.
- **Vue d'ensemble** (`app/(app)/app/projects/[projectId]/page.tsx`) : `ProjectHeader` avec le nom du projet seul
  (Figma PDS OS 304:20801, Sacha 29/10/2026 : plus d'état ni de ligne de faits, `overviewHead` supprimé) ; « Bilan &
  clôture du projet » (page `closure`, hors proto) en action
  `ghost` de la tête. `NowCard variant="overview"` (toutes mes actions, deux nommées). Avant le plan :
  `BeforeWorkflows` seul (le Plan du projet est l'étape 4 du Cadrage depuis le lot 2, `/framing/plan`, § 6 ter). Après : `WorkflowCards` (`lib/overview/cards.ts` : parcours du workflow s'il
  en a un, sinon ses chevrons ; « À vous · » / « Nom · » depuis `mine` / `waiting`) et `DependencyRows`
  (`lib/overview/dependencies.ts` : Master final = dépendance `master-online` ; Pochette livrée = un livrable dont
  le titre correspond à `COVER` livré (`deliverable_deliveries.delivered_at`) ; Prêt pour la sortie = étape `ready`
  du parcours du Juridique s'il en a une, sinon Juridique Terminé ; Durée du master final = chaque titre a un fichier
  `final_master` avec `duration_seconds`). Supprimés : `ProjectBoard`, À faire ensuite, Blocages, Échéances,
  `DependenciesTable`, « Lancer » des cartes, `PlanStepsSection` et `BriefDrift` après lancement (à loger dans
  l'étape Plan du projet du Cadrage), équipe créative (page Équipe), historique d'assignation (page Équipe), faits en
  colonne, `lib/workflow-status/board.ts` (l'assistant ne s'en servait pas). `FramingEntry` n'est plus que sur
  `/framing`.
- **Verrou** (`WorkflowLocked`) : même écran pour Master, Juridique, Marketing (Stratégie, sans l'ancien état
  « la stratégie suit le cadrage ») et **Distribution** (`release/layout.tsx`, `distributionLocked` : pas de plan
  et aucune sortie enregistrée). « Ouvrir le Cadrage » mène à `/framing`. Les variantes « Ensuite » / « hors du
  plan » n'ont plus de texte propre (proto) ; `launch_plan_workflow` reste en SQL pour l'étape Plan du Cadrage. La
  Distribution est `not_started` dans `loadWorkflowStates` dans le même cas.
- **Travail / Validations** : `MyActions` sur `mine` / `validations` (`actor.kind === "validate"`). Les tâches
  libres (`tasks`) restent en base et dans le Travail global, plus dans le Travail du projet (VISION-UX § 3 : pas de
  liste à part). L'historique des validations décidées est dans l'Activité (`loadRecentActivity`).
- **Activité** (`loadProjectActivity`, `lib/overview/activity.ts`) : journal du projet (`loadRecentActivity`),
  `marketing_events`, `production_events` (lien vers le livrable ; un contact du Réseau est dit « Quelqu'un »),
  Juridique (`loadLegalHistory`, seulement avec `manage_legal`), `distribution_events` (`eventText`) ; triés par
  date, 200 au plus. Le Master n'a pas encore de journal.

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
Bloqué, emprunts non sécurisés ; un clic ouvre une modale : cause, impact, source,
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
  dépassement écrit en toutes lettres. Le responsable seul écrit ; PO ne lit pas la table.
  Retours Marketing du 11/10/2026 (MKT-S1-11, 12, 15 ; migration `…20261012101101_budget_model`) :
  - **Statuts** : Estimé → Proposé → Engagé → **Facturé** → Payé. **Trois montants, trois
    restes** (`budgetTotals`) : prévisionnel (toutes les lignes), engagé (engagé, facturé,
    payé), réel (facturé, payé), chacun retiré de l'enveloppe ; un budget nul, inconnu ou non
    ventilé reste valable.
  - **Familles** de dépense distinctes des familles de leviers : Production de contenus,
    Publicité & promotion, Événements & activations, Prestations, Déplacements, Frais divers,
    Autre (`family_detail` obligatoire, contrainte non validée sur l'existant) ; anciennes
    valeurs reprises par la migration (création → production, promotion → publicité,
    expériences → événements). Chaque famille a sa définition et ses exemples ; le **code**
    propose une famille depuis le libellé (`suggestBudgetFamily`, avec le mot qui la
    suggère) et un livrable dont le titre partage un mot (`suggestBudgetLink`) : « Utiliser »,
    jamais un choix silencieux.
  - Une ligne peut payer un **livrable** (`deliverable_id`, même projet) et porter sa
    **pièce** (`attachment_file_id`) : un fichier des Fichiers du projet (catégorie Autres),
    jamais un second stockage.
  - **« Ajouter une dépense » partout dans le Marketing** (`AddExpenseButton` dans le layout
    du projet, pages Stratégie, Conception, Production, Activations, Suivi & bilan) : même
    formulaire, même ligne que la page Budget ; libellé, montant et statut suffisent.
  - **Brief de stratégie** : prévisionnel, engagé, réel et à arbitrer, un reste par type ;
    les leviers sans dépense n'y sont plus listés (comptés en une ligne).

### Blocages et informations notées d'une étape (C6, 18/10/2026)

- Tables `step_blockers` et `step_notes` (migration `20261018400201`, tests `step-tools.test.sql`) :
  projet, module (`framing` … `distribution`, sous-modules du Marketing compris), clé d'étape
  (`JourneyStep.key`), objet facultatif (livrable, activation). Lecture : `can_see_project` ;
  aucune écriture directe, tout passe par `report_step_blocker`, `lift_step_blocker`,
  `note_step_information`, `decide_step_note` (sécurité définie, RLS forcée).
- **Qui écrit** (décision du 18/10/2026, proto `isMember(me())`) : signaler un blocage et noter
  une information sont ouverts à **toute l'équipe PDS du projet** (qui voit le projet lancé,
  `step_tools_can_write`), pas seulement au responsable — ce ne sont pas des écritures d'état,
  une information ne fait jamais avancer une étape. Lever : la personne qui débloque (membre) ou
  le responsable, avec une explication obligatoire, jamais supprimé. Décider une information
  (Confirmer, Décider, Écarter, « Fait foi ») : le responsable seul.
- Qui débloque : un membre, un contact du Réseau (`PersonPickerField`, contacts de l'équipe du
  projet en tête) ou un nom seul ; le nom est gardé (`unblocker_name`) si le contact est supprimé.
- Contradiction : une note qui en contredit une autre partage son `contradiction_group` ; tant
  qu'aucune ne fait foi, c'est un blocage (compté, callout dans l'étape). « Fait foi » décide
  celle-ci et écarte les autres (`replaced_by_id`), rien ne s'efface.
- Notifications par trigger : `step_blocker_reported` (qui débloque + responsable),
  `step_blocker_lifted` (qui l'a signalé + responsable), `step_note_to_decide` (responsable, si
  à confirmer, en attente de décision ou contradictoire) ; la cloche ouvre l'étape
  (`lib/step-tools/href.ts`). Le contrôle des genres de notification est **étendu sans être
  réécrit** (lecture de la contrainte en place), pour ne pas effacer ceux d'une migration voisine.
- Suppression d'un projet : les deux tables partent en cascade (comme le reste après
  `delete_project_row`), vérifié par le test. `ProjectLive` : trigger `zz_project_live`.
- **Activations** : `activation_blockers` reste la table des blocages d'une activation (catégorie,
  gravité, impact, date de résolution, journal et statut de l'activation) ; non migrée, elle est
  **lue avec** les blocages communs pour les pastilles (`loadStepTools().activationBlockers`).
- Code : `lib/step-tools/` (`model.ts`, `queries.ts` `loadStepTools` une lecture par requête,
  `actions.ts`), composants `components/shell/module/` (`docs/COMPOSANTS.md`). Branché sur le
  Juridique (`LegalStepFrame`) ; les autres modules s'y branchent avec leur `StepPanel`.

### « Qui fait quoi » commun (C7, 18/10/2026)

- Un seul rendu, `RolesPanel` (`components/shell/module/`), en ligne dans une étape ou dans la
  modale `RolesDialog` ouverte par `WhoDoesWhatButton` (bouton autonome destiné à `ModuleHeader`).
  Chaque module construit ses rôles : Production (`WhoDoesWhat` / `ProductionWhoDoesWhatButton` :
  responsable du projet et de production = Coordonne, société / réalisation / image = Exécute,
  validation budgétaire = Valide ; historique = organisation et liens, `loadProductionHistory(…,
  only)` ; le changement passe toujours par « Modifier l'organisation »), Conception
  (`DesignRoles` / `DesignWhoDoesWhatButton` : responsable du projet, responsable, validateurs, avec
  « Changer » = les sélecteurs existants en `compact` ; délégations et gouvernance restent dessous).
- **Liens privés** : n° du lien (compte des liens du contact sur la fiche), créé le … par …
  (`created_by`), ouvert, expiration ; « Nouveau lien » remplace l'ancien (déjà le cas en SQL).
  « Copier le lien » n'apparaît que si le module sait redonner le lien : aujourd'hui aucun (jeton
  gardé en empreinte seule, règle 19) — le lien s'affiche une fois à sa création. « Relancer »
  demande un `remindHref` (mailto) : non branché tant que l'e-mail réel ne l'est pas.

### Habillage commun des pages privées (C13 A, 18/10/2026)

- `/m`, `/p`, `/f`, `/s`, `/i` gardent chacune leur jeton et leurs fonctions SQL ; elles partagent
  le cadre `PortalShell` + `PortalSections` (`components/portal/`, `docs/COMPOSANTS.md`). Le cadre
  (projet, artiste, format, nom de la personne, responsable du projet et son poste) vient d'une
  seule fonction `get_private_link_frame(kind, token)` (migration `20261018400301`, anon), qui ne
  rend **que des noms** — jamais un montant, un statut interne ni un échange (test
  `production-link-confidential.test.sql`). Un lien expiré, remplacé ou révoqué garde le cadre avec
  « Ce lien n'est plus valable » et la phrase de la page.
- Chaque page dit ses cartes (`PortalCardItem` : état `todo` / `waiting` / `done`, action et
  échéance, place dans le parcours) : une carte pour la fiche, la répartition, l'accord, le dossier
  du mixeur ; les parts du lien prestataire (`linkJourneyCards` : devis, proposition, avancement,
  lieux, matériel, tâches), la postproduction restant dessous (`ProviderSpaceView`).
- **Confidentialité** : le lien de la société de production ne reçoit plus l'enveloppe interne
  (`get_production_link_journey` remplacée, migration `20261018400101`). Revue des autres liens
  (18/10/2026) : `/m` (dossier sans tarif du Brief), `/f`, `/s` (parts), `/i` (le cachet du créateur,
  qui est son propre tarif), `/fs`, `/d` (`assertNoBudget`) ne portent aucun montant interne.
- Lot 11 (ci-dessous) : un lien par personne et par projet réunit les cartes de chaque workflow.

### Une page privée par personne et par projet (lot 11, 19/10/2026)

- **Table** `project_contact_links` (migration `20261019110101`) : projet, contact, n° du lien, empreinte
  SHA-256 du jeton **et** jeton chiffré avec le mécanisme du Master (pgcrypto, clé Vault
  `master_link_key`, pas de troisième mécanisme) pour que le responsable le recopie
  (`contact_link_token`, responsable seul). Un seul lien actif par (projet, contact) (index unique
  partiel) ; `issue_contact_link` (responsable du projet, révoque l'ancien « replaced »),
  `revoke_contact_link` (motif obligatoire), `mark_contact_link_sent` (l'e-mail n'est pas envoyé par
  PDS OS), `note_contact_link_opened` (ouvertures comptées). RLS forcée, lecture `can_see_project` sans
  les colonnes du jeton, `anon` ne lit jamais la table. Dans `delete_project_row`.
- **Objets de la personne** : `contact_page_items(project, contact)` (interne) liste, avec état calculé
  (`todo` / `waiting` / `done`), échéance et étape : envois du Master (le dernier d'une suite), fiches et
  confirmations de répartition du Juridique, liens prestataire de la Production, accords d'influence,
  invitations aux calls (`call_guests`) avec le dernier résumé reçu (`call_summaries` dont les
  destinataires portent son `contact_id`). Un call de production est déjà sur les cartes du lien
  prestataire : il n'est pas répété. Le workflow d'un call : `call_workflow` (Master par
  `master_brief_calls`, Marketing par production / conception / stratégie, sinon Cadrage).
  `get_contact_page(token)` (anon) rend le cadre (projet, artiste, format, personne, ses rôles,
  responsable) et cette liste ; un lien révoqué ou expiré ne rend que son état.
  `project_link_contacts(project)` sert « Liens privés » (personnes, nombre d'objets, à faire hors
  invitations).
- **Surcharges** (migration `20261019110201`, générée depuis les définitions en vigueur) : chaque
  fonction publique d'un lien privé `F(p_token, …)` (Master, fiche, répartition, influence,
  prestataire : 37 fonctions et 5 aides) devient `_F_h(p_link_hash, …)` (corps inchangé, interne),
  `F(p_token, …)` (même signature, les liens déjà envoyés marchent) et
  `F(p_contact_token, p_item_id, …)` : `contact_item_hash` vérifie le lien de la personne et que l'objet
  est à ce contact, dans ce projet, puis le même corps s'exécute. Les surcharges n'ont aucun défaut
  (toujours un argument de plus que l'original : jamais d'ambiguïté). **Toute modification future
  d'une de ces fonctions se fait dans son `_F_h`.**
- **Côté code** : une vue publique reçoit une **clé de lien** (`lib/portal/link-key.ts`) : le jeton de
  l'objet, ou `<jeton de la personne>~<id de l'objet>` ; `linkKeyArgs` donne les arguments RPC,
  `linkKeyPath` la page à revalider (`/m/…` ou `/c/…`). Les cartes de chaque page sont construites une
  fois (`masterPortalCards`, `formPortalCard`, `splitPortalCard`, `influencePortalCards`,
  `providerPortalCards`) et posées par leur lien et par `/c/[token]` (`loadContactCards`), qui ajoute
  `callPortalCard`. Ouvrir la page marque chaque objet ouvert, comme son lien.
- **Côté app** : « Qui fait quoi » du Master et de la Production, section « Liens privés »
  (`ContactLinksSection`, « Une page par personne » sous les liens du module) ; à côté du lien du
  Master et de la fiche de renseignements, `ContactLinkOffer`. Gestes (responsable) : « Créer le
  lien », « Copier le lien », « Marquer comme envoyé », « Nouveau lien », « Révoquer » avec motif.
- **Après un call** (20/10, `get_contact_call_requests`, anon) : « Ce qui vous a été demandé » —
  les actions du plan de production planifiées depuis une action du call pour ce contact
  (`production_plan_actions.item_id` → `production_call_items.call_id`), « À faire » / « Fait », source
  « Confirmé par PDS après le call » ; tant que PDS n'a pas confirmé les suites (résumé envoyé à la
  personne, ou call de production avec compte rendu sans action proposée restante) : « PDS confirme les
  suites du call ; ce qui vous concerne apparaîtra ici. » ; sinon « Rien ne vous a été demandé pendant ce
  call. ». Jamais le compte rendu (règle 21). Fonction à part : `contact_page_items` inchangée.
- **Décisions** : expiration 180 jours (1 à 365) ; un objet dont le propre lien est fermé (expiré,
  remplacé) n'apparaît pas sur la page de la personne (mêmes règles que son lien) ; une invitation à
  un call à venir trie avec « À vous » mais n'est pas une action (pastille « Invité », h1 « Votre
  prochain rendez-vous avec PDS » s'il n'y a rien d'autre) ; les calls du Cadrage ont leur intertitre
  « Cadrage » avant Master, Juridique, Marketing, Distribution (seul ordre que le proto ne dit pas).

## 8 ter bis. Factures des externes et « À payer » : un seul système (20/10/2026, `lib/invoices/`)

Les deux gestions codées en parallèle (facture de l'ingénieur au Master final, `20261020010101` ;
facture d'un contrat payé du Juridique, `20261020030301`) n'en font plus qu'une
(`20261020060101_project_invoices`, `20261020060201_invoice_former_signatures`).

- **Table `project_invoices`** : une ligne par facture demandée à une personne externe sur un projet,
  `origin` `master` (rôles de l'ingénieur, unique par projet et contact) ou `contract` (un
  `financial_needs`, donc un contrat signé avec rémunération ; trigger `z_request_invoice` sur
  `financial_needs`). Reçue (`received_at`, `received_on`, `due_on` = +30 jours, `received_via`
  `link` / `team`), montant comparé à ce qui était convenu (`project_invoice_expected` : tarifs engagés
  du Master, ou montant du contrat ; motif obligatoire si écart), payée (`paid_on`, preuve
  `proof_*`). Lue par le responsable et la direction comme le budget (RLS
  `can_read_project_budget`) ; ce que sait le Juridique sans la lire : `project_invoice_states`
  (`asked` / `rib` / `to_pay` / `paid`). Fichiers : bucket privé `project-invoices` par créneaux à usage
  unique (`project_invoice_slots`) ; les fichiers migrés restent dans `master-finance` /
  `legal-invoices`, lisibles par la ligne (`file_bucket`, `proof_bucket`, `project_invoice_file_readable`).
- **Fonctions** : lien privé (sans compte) `get_person_invoices`, `open_person_invoice_slot`,
  `submit_person_invoice` — le jeton est celui de la page de la personne (`/c`) **ou** du lien Master
  de l'ingénieur (`/m`) (`invoice_person_of_token`) ; équipe : `open_invoice_slot`,
  `add_received_invoice` (responsable **ou** direction, « Reçue le »), `confirm_contact_bank_account`,
  `pay_invoice` (direction seule, RIB confirmé, jour ≥ réception, preuve). Cœur commun :
  `record_project_invoice`. Les anciennes signatures (`get_master_invoice`, `submit_master_invoice`,
  `get_contact_invoices`, `submit_legal_invoice`, `pay_master_invoice`, `mark_legal_invoice_paid`,
  `legal_invoice_states`…) sont gardées et écrivent la même table. `master_invoices`,
  `legal_invoices`, `master_payment_proofs` : gardées avec leurs données, plus écrites.
- **RIB** : un seul, `contact_bank_accounts` (direction seule) — le premier donné par la personne sur
  son lien est gardé, un RIB changé ou saisi par un membre attend la vérification par téléphone
  (notification `master_bank_details_changed` ou `legal_invoice_bank_changed`). Requis à la première
  facture, quelle qu'elle soit.
- **Budget sans double compte** : `budget_lines.invoice_id` ; les lignes des rôles de l'ingénieur sont
  liées à sa facture, un contrat signé crée sa ligne `Engagé` (libellé du contrat). À la réception, les
  lignes prennent le montant facturé (réparti au prorata, le convenu gardé dans `committed_cents`,
  « Engagé 250 € HT » sous la ligne) et passent `Facturé`, puis `Payé`. Une ligne qui suit une facture :
  ni montant, ni état, ni suppression par l'équipe (trigger `budget_line_follows_invoice`,
  `line_follows_invoice` ; formulaire en lecture seule sur ces champs).
- **Code** : `lib/invoices/` (`queries.ts` `loadProjectInvoices`, `actions.ts`, `public.ts`,
  `public-actions.ts`, `states.ts`, `rules.ts`, `href.ts`, `billing*.ts` « Facturation de PDS »),
  `components/invoices/` (`InvoiceCard`, `InvoicePanel`, `InvoiceForm`, `PayForm`, `RibConfirmForm`,
  `ContractInvoice`, `invoicePortalCards`, `PayList`). Master final : `components/master-workflow/
  invoice-block.tsx` (panneau commun + budget du Master) ; étape d'une personne du Juridique :
  `ContractInvoice` ; `/m` et `/c` : `invoicePortalCards` (une carte par facture, lues une fois par le
  jeton de la page).
- **« À payer »** (`PayList`) : sur le **Budget** du projet, pour la direction seule, chaque facture
  reçue non payée (échéance la plus proche d'abord, « En retard »), payable sur place (« Voir et
  payer » : le panneau commun), « Ouvrir » vers le Master final pour l'ingénieur. Tous projets : les
  actions « Payer la facture de X » / « Confirmer le nouveau RIB de X » des parcours Master et Juridique
  dans le Travail de la direction.
- **La page s'ouvre sur la facture** (lot 5 des retours d'Ibé, retour 09, 22/10/2026) : l'action
  de facture du parcours Master a `lead` → depuis Travail, `…/master/final#a-vous` ; pour la
  direction, le Master final met en tête (`InvoiceLead`, `leadInvoicesOf`) chaque facture reçue non
  payée — PDF, montant contre le tarif, échéance, RIB, puis « Confirmer le RIB » ou la date et le
  justificatif du virement — et replie le reste sous « Le Master final et le budget ». Le geste
  reste possible si l'étape est encore verrouillée (une facture n'attend pas le mastering :
  `StepPanel` garde le `lead` d'un acteur lecteur). Une fois payée, l'action sort du parcours, donc
  de Travail. Chaque panneau a l'ancre `#facture-<id>` (`invoiceAnchor`) : « Ouvrir » de « À payer »
  et « Prêt pour la sortie » y mènent (`invoiceHref`).
- **Où est rangé le justificatif** (vérifié le 22/10) : dans le bucket privé `project-invoices`, à
  côté du PDF de la facture (`<organisation>/<projet>/<facture>/<uuid>.<ext>`, emplacement à usage
  unique `open_invoice_slot` « proof », PDF / PNG / JPG), inscrit sur la facture (`proof_path`,
  `proof_name`, `paid_on`, `paid_by` par `pay_invoice`). Lu par la direction seule : « Voir le
  justificatif » sur la carte de la facture (Master final, « À payer » du Budget, étape d'une
  personne du Juridique) ; le responsable voit « Payée le … » et le nom du fichier, jamais le fichier.
- **« Prêt pour la sortie »** : un contrôle « Facture de X » par facture **reçue**, jamais bloquant
  (ouvert tant qu'elle n'est pas payée → « À risque », fait une fois payée), source « Budget du
  projet » ; une facture encore attendue n'y est pas (sa démarche le dit).
- **Montants** : un seul formateur, `formatAmount` (`lib/utils/money.ts`, « 1 100 € HT ») ;
  `formatEuros` (budget) et `formatFee` (contrats) en sont des alias.
- pgTAP : `project-invoices.test.sql` (24), `master-invoices`, `legal-reste`, `master-deliverables`
  adaptés (même table ; le responsable lit désormais la facture d'un contrat, jamais le RIB).

## 8 quater. Retours sur l'application (`/app/feedback`)

Circuit : l'équipe écrit au **DG**, chaque retour devient un sujet « À examiner », le DG
choisit ce qui est utile et le **transmet** avec une priorité à l'équipe qui construit l'outil.

- **Regroupement par PO coupé** (Sacha, 07/11/2026, `FEEDBACK_GROUPED_BY_PO = false` dans
  `lib/feedback/types.ts`) : PO rangeait des retours dans des sujets déjà transmis, que
  personne ne revoyait. Chaque retour ouvre donc son propre sujet, par le code
  (`fileEachAlone` : titre = ses premiers mots, résumé = son message, aucun appel au modèle) ;
  le DG le retouche (« Modifier », « Demander à PO de réécrire ») avant de le transmettre.
  Remettre la constante à `true` rétablit le tri ci-dessous.
  Les retours que PO avait rangés dans un sujet déjà publié sur Notion, après sa publication,
  en ont été détachés (migration `20261107140101_feedback_detach_unpublished`) : la page
  Notion de ces sujets était déjà « Terminé », ils y auraient été perdus. Ils redeviennent
  chacun un sujet « À examiner ». Pour un sujet publié qui garde un retour en retard (retour
  modifié depuis, échec), le bouton dit « Ajouter les N retours à la page Notion ».

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
  vérifié par contrainte et par le code). Affichées par URL signée (1 h). Un clic ouvre
  la capture en grand dans la page (`ImageGallery`, jamais un nouvel onglet), ← → ou les
  flèches pour passer d'une capture à l'autre.
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
- **Tri par PO** (`lib/feedback/triage.ts`, coupé, voir plus haut) : à l'ouverture de la page par le DG, s'il y a
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
  (calculé par le code). **Un sujet transmis dont la page Notion est en retard** (retour
  arrivé ou modifié depuis, jamais publié, échec : `awaitsNotion`) revient aussi dans
  « À examiner », avec « Mettre à jour sur Notion » en action principale : PO range un
  nouveau retour dans un sujet déjà transmis, que personne ne revoyait (07/11/2026 : 12
  retours d'un chef de projet restés hors de Notion). La consigne de tri demande un seul
  problème précis par sujet (même écran ne suffit pas) et un résumé jamais élargi.
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
  médias), remplie seulement si la base l'a (schéma lu à chaque envoi), et **Partie**
  (sélection multiple, 07/11/2026) : les parties de l'app où les retours du sujet ont été
  écrits, déduites de leur `page_path` par le code (`lib/feedback/app-part.ts`, noms des
  options dans `fr.feedback.notion.parts`, mot pour mot ceux de Notion), écrite **à la
  création seulement** pour ne jamais défaire une correction faite dans Notion ; une page
  sans partie (réglages) la laisse vide. Les retours repris du Drive la reçoivent du script
  `~/.local/bin/pds-retours-sync.py` (liste `PARTS`, même ordre). Les captures sont
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

**Proto des pages (29/10/2026, `docs/protos/pages.html`)** : la liste reste une liste (pas de
« Maintenant » ni de « Ce que vous attendez »), avec une colonne **« Avec PDS »** : les projets du
contact (`network_contact_projects()`). La fiche ouvre sur **« Ce qu'on attend de X »** (ses
éléments à faire, avec « Relancer », un e-mail prêt en `mailto:`) et **« Dans les projets »** (ce
qu'il y fait), puis contrats, **Crédits** (`master_contributors`) et **Calls** (`call_guests`),
`lib/network/contact-projects.ts` et `contact-history.ts`. `contact_projects(p_contact_id)`
rend, projet par projet, ses rôles d'équipe, les éléments de sa page privée
(`contact_page_items`) et son lien ; les deux fonctions lisent les mêmes sources que
`project_link_contacts` (lot 11) plus `project_team_members`, par `contact_project_pairs()`
(interne, `security definer`, refusée aux rôles) et ne gardent que les projets que l'on voit
(`can_see_project`). Migration `20261029100101_contact_projects.sql`.

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
  (ceux-là sont au Catalogue), repérés sur TikTok depuis le Repérage (§ 10 bis) ou ajoutés à la
  main ; « Musique » garde musicien·ne, auteur·rice, ingé son, réalisateur·rice. **Réseaux**
  (`…20261010008001_network_socials.sql`, `lib/network/socials.ts`, test
  `network-socials.test.sql`) : pseudo TikTok et Instagram (minuscules), id d'artiste Spotify et
  Deezer, gardés comme identifiants (contraintes SQL), jamais comme URL libres ; le formulaire
  accepte « @pseudo » ou le lien collé, la fiche affiche les liens, la liste montre le TikTok
  quand il n'y a ni e-mail ni téléphone. Les contacts d'artiste (`artist_contacts`) et
  les intervenants cités restent à part : pas de fusion automatique en V1.
- **Photo d'un contact** (retour d'Ibé du 01/11/2026, `…20261105200101_network_contact_pictures.sql`,
  `lib/network/pictures.ts`, `lib/integrations/social-picture.ts`) : `picture_path` dans le bucket privé
  `network-pictures` (`<org>/<contact>/<uuid>.<ext>`, lecture membres, écriture `manage_network`, URL
  signée 1 h) et `picture_source` (`upload`, `spotify`, `deezer`, `tiktok`, `instagram`, `none` = retirée
  à la main ; `spotify`/`deezer` ajoutés par `…20261106120101_network_picture_artist_sources.sql`). Une image
  choisie est recadrée en carré de 512 px dans le navigateur et part avec le formulaire (champ `picture`,
  `pictureRemove`) ; elle prime toujours. Sinon, à l'enregistrement, le serveur copie la photo du premier
  profil qui en a une, dans l'ordre `PROFILE_PICTURE_SOURCES` (Sacha, 06/11/2026 : « vu que c'est une
  artiste, récupère la photo de Spotify, sinon Deezer ») : **Spotify** (oEmbed public, sans clé, 320 px),
  **Deezer** (API, 500 px), puis TikTok (données de la page, `avatarMedium`), Instagram (`og:image`,
  150 px) : quand le
  contact n'en a pas encore, quand le compte d'origine change, ou après un retrait si un compte change.
  Lue comme un visiteur avec le client identifié de l'app (`fetchText`), téléchargée seulement depuis les
  CDN des deux plateformes (sans redirection), copiée chez nous car leurs liens expirent en quelques
  jours. Profil privé, absent ou refus de la plateforme : pas de photo, jamais une erreur. Un contact
  existant prend la sienne au prochain « Modifier › Enregistrer ». Fichiers d'un contact supprimé non
  effacés (politique Storage à faire).
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

- **Modifier comme au Master (Sacha, 05/11/2026)** : « quand on clique sur quelque chose, on puisse la
  modifier directement », sans passer par le catalogue. *État des lieux* : une action de ligne de
  `ROW_EDIT_KINDS` (`lib/legal/types.ts` : `edit_title` pour l'ISRC, `edit_rights` pour l'ISWC et le ℗,
  `edit_credit`, `edit_splits`, `declare`, `edit_declaration`) rend toute la ligne cliquable
  (`InventoryEditRow` → `FactRowDialog`) et ouvre le formulaire de la fiche du titre dans une modale de la
  page (`MasterEditForm`, `RightsForm`, `ContributorForm`, `SplitsEditorDialog`, `DeclareDialog`,
  `DeclarationDialog` avec « Supprimer la déclaration ») ; seuls « Ajouter au Réseau » / « Lier » restent un
  bouton à côté de la ligne (`FactAction`). Le rôle d'un intervenant non crédité se change sur sa ligne
  (`FactRow edit`, `set_legal_project_contact_role`, migration `20261105140101`, refusé comme le retrait si
  un contrat est déjà prévu pour lui). *Démarche* : « Responsable et échéance » est une ligne `FactRow
  change` (`DemarcheOwner`) qui ouvre `DelegateForm` sous elle, avec « Modifié par … » lu du journal du plan
  (`legal_plan_events`) ; la modale `DelegateButton` ne reste que dans la liste du plan lancé. *Bulletin
  SACEM* : chaque valeur est une ligne de faits (`BulletinRow`, `FactRowFrame control`) mais le bulletin
  s'enregistre toujours en bloc (une version annule les signatures, JUR-03). *Après un geste* (fin de
  JUR-04) : tous les gestes d'équipe qui font avancer une démarche passent par `legalOutcome` (plan, dossier,
  contrats, répartitions, SACEM, autorisations, Prêt pour la sortie, délégation) ; `withOutcome` et
  `legalOutcome` sont génériques et gardent le `data` d'un résultat ; `advanceContract` et
  `sendContractForSignature` n'enveloppent qu'un contrat rattaché à un projet.
  *Règle des lignes (Sacha, 05/11)* : comme au Master, **aucun « Voir » / « Compléter » / « Modifier »
  écrit** sur une ligne qui ouvre quelque chose : toute la ligne est cliquable ; elle ouvre son formulaire
  si on peut écrire, sinon un **aperçu** de la fiche (`Fact.peek` → `RecordPeekDialog` : artiste interprète,
  personne du Réseau d'un crédit lié, contrat ; « Voir la fiche » pour la page), sinon sa page. Un bouton
  reste pour l'édition sur place (« Modifier » d'un rôle, « Changer ») et les vrais gestes (« Ajouter au
  Réseau », « Lier », « Retirer ») ; une ligne qui en porte un n'est pas cliquable elle-même.

- **Audit des retours écrits d'Ibé (28/10/2026, migration `20261028000601_recette_p0_guards`)** : ce
  que seuls les écrans tenaient passe en base. *Contre-signature par version* (JUR-11) :
  `contracts.pds_signed_version` ; `revise_contract_document` (donc `revise_contract_clause`) l'efface
  et journalise `contract.countersign_voided` ; `sign` exige la signature de PDS sur la dernière version.
  *Signatures du bulletin remplacées* (JUR-03) : `legal_formality_signatures.superseded_at`, posé par
  `supersede_formality_signatures` à toute modification d'un bulletin généré et à chaque nouvelle version
  (événement `signatures.superseded`) ; l'écran les dit « Ne vaut plus » et replie les « Versions
  remplacées ». *PDS Éditions sur le bulletin* : l'éditeur sans contact du Réseau, quand la répartition
  confirmée a la ligne maison, porte `house` (préremplissage) ; sa ligne de signature (`house`) est signée
  par la direction dans PDS OS (`sign_formality_for_house`, `via = 'house'`), jamais par un lien.
  *Fiche* (JUR-06) : `review_legal_form` refuse `legal_form_incomplete` selon `legal_form_missing` (même
  liste que `ficheMissing`). *« Déjà payé »* (JUR-12) : `approve_contract_mapping` refuse
  `mapping_reason_only_paid` selon `reason_only_paid` (même règle que `isOnlyPaid`, « pas de contrat »
  ne nomme aucun accord). Au passage, le schéma zod des éditeurs du bulletin garde `represents` et
  `contract_id` (ils étaient retirés à l'enregistrement, d'où un `publisher_link` toujours manquant).
- **Recette Juridique V1 d'Ibé (21/10/2026, JUR-01 à JUR-12, numérotation propre à cette
  recette ; proto `docs/protos/juridique-v3.html`)**, branche `retours/juridique-v1`, par lots :
  - *Lot 1, transverse* : sections d'étape (`StepSection`, règle `docs/DESIGN.md` « Sections
    d'une étape ») ; carte « Lien privé » d'après la maquette Figma (`PrivateLinkCard`, sans
    ligne de dates) ; « À vous » (JUR-08) : `legalJourney` donne à tout geste du lecteur un
    lien vers l'encadré de son étape (`leadHref`), et `LegalStepFrame` met le contenu de
    l'étape dans le `lead` de `StepPanel` quand l'étape attend le lecteur ; JUR-04 :
    `legalOutcome` (`lib/legal/outcome.ts`, `withOutcome`) et `useLegalAction`
    qui publie le bandeau de résultat, branchés geste par geste dans les lots suivants.
  - *Lot 2, Plan d'action* (JUR-05, JUR-12) : avant lancement, « Démarches immédiates » (aucun
    prérequis gardé dans le plan) / « Démarches dépendantes » (`PlanForm`), « Prérequis : … » au
    lieu de « Après : … », un seul repli « Ce que le lancement crée » (`fr.legal.plan.creates`) ;
    après lancement, `LaunchedDemarches` lit les prérequis du parcours (`prereqsOf`, hors
    « plan ») ; « Contrats des intervenants » : libellés d'état de la recette
    (`agreements.states`), pastille par personne dans `MappingRow`, motif « déjà payé » refusé
    par `isOnlyPaid` dans le formulaire et dans `approveContractMapping`.
  - *Lot 3, fiche* (JUR-06, migration `20261024000101_legal_form_validation`, test pgTAP
    `legal-form-validation`) : une fiche reçue reste `action_required` (« à vérifier »), seule
    la validation (`review_legal_form`, `validated_by`) la passe à `complete`, qui reste « c'est
    fait » pour le contrat, la répartition, la coche du plan et l'État des lieux. Règle de
    complétude du code (`ficheMissing`, `lib/legal/forms/completeness.ts` : état civil, e-mail,
    adresse ou raison sociale + SIREN/SIRET + facturation, IPI/COAD d'un auteur, compositeur ou
    arrangeur ; pas d'IBAN, la facture le porte) : une fiche incomplète ne se valide pas
    (`reviewLegalForm` refuse) ; « Redemander ce qui manque » (`request_legal_form_complement`,
    champs manquants + message) rouvre le lien privé sur ces seuls champs (`get_legal_form`
    état `complement`, `ComplementForm`, `submit_legal_form_complement`, deux surcharges) ;
    le lien reste visible et « Relancer » prépare l'e-mail du complément. Pastille de la
    fiche en un seul endroit (`ficheBadge`, `lib/legal/forms/state.ts`) : À créer, À envoyer,
    Envoyée, En attente · ouverte, En attente · complément demandé, À vérifier · incomplète /
    corrections, Complète · à valider, Validée. Validation et complément passent par
    `legalOutcome` : le bandeau dit la prochaine action réelle et l'étape débloquée. L'étape
    d'un intervenant ne montre qu'un titre à la fois (`DemarcheBody`).
  - *Lot 4, signature d'un contrat* (JUR-11, migration `20261024000201_contract_countersign`,
    tests `legal-contracts` et `signed-returns`) : `advance_contract` gagne `countersign` (la
    direction, permission `validate`, signe pour PDS : `pds_signed_by` / `pds_signed_at`,
    évènement `contract.countersigned`) et `p_checked` ; un contrat **généré** ne passe à `signed`
    qu'avec cette signature (`contract_countersign_missing`) et la vérification de l'équipe
    (`contract_signature_unchecked`, `signature_checked_by` / `_at`) ; un contrat déposé à la
    main ne change pas. `InventoryContract.returned` (copie signée revenue par le lien) et
    `countersigned` alimentent le suivi (« la direction doit signer pour PDS », puis « vérifier
    la signature »), le geste attendu (`expectedOf` : la direction, puis le responsable) et
    `AgreementRow.contract`. Écran : « Vérification de la signature » (version, signataire,
    signature pour PDS, dispositifs) dans `ContractReceived`, et `SignatureGate` (signer pour
    PDS, case « J'ai vérifié… », « Marquer comme signé ») partagé avec `ContractSign`.
  - *Lot 5, répartition* (JUR-01, migration `20261024000301_split_publishers`, test pgTAP
    `legal-split-publishers`) : trois sections distinctes dans l'éditeur (`SplitEditor`) —
    « Qui a créé quoi » (créateurs, rôle `author_composer` pour paroles et musique),
    « Qui édite la part de chaque créateur » (`SplitPublishingRow` : PDS Éditions, un autre
    éditeur **choisi dans le Réseau**, coédition par PDS Éditions, ou aucun éditeur), puis
    « Parts de l'œuvre » (`SplitParts` : une part par créateur et par éditeur, vide à « 0 % »,
    jamais proposée ; manques et total signalés à l'enregistrement seulement). Les éditeurs ne
    se saisissent pas : ils découlent des choix (`publishersOf`, `lib/legal/splits/draft.ts`).
    En base, une ligne d'éditeur porte `represents` (positions des créateurs qu'il représente :
    un éditeur peut n'en représenter qu'un) et `house` (PDS Éditions : l'équipe, **sans lien de
    confirmation**, hors du compte des réponses de `consolidate_split_version`) ;
    `save_split_draft` refuse un éditeur sans créateur représenté (`split_publisher_unlinked`)
    ou hors Réseau (`split_publisher_contact_required`). Le contenu confirmé
    (`split_version_content`) dit qui chaque éditeur représente ; une version sans éditeur garde
    la même empreinte. Pré-remplissage avec sa source (`loadPublishingHints`) : l'éditeur nommé
    dans la fiche, le contrat d'édition prévu au plan, « Pas d'accord nécessaire » ; sinon
    « À choisir ». Une répartition de la fiche du titre qui a un éditeur passe par l'éditeur
    (on ne sait pas qui il représente).
  - *Lot 6a, bulletin SACEM* (JUR-02, JUR-03, migration `20261024000401_sacem_checks`, test
    `legal-formalities`) : cinq sections numérotées (`FORMALITY_SECTIONS` : 1. Œuvre,
    2. Créateurs, 3. Éditeurs, 4. Répartition, 5. Exploitation ; plus de section
    « Vérification ») ; chaque ligne dit son état (`fieldStates` + `FieldStateLine` :
    « Confirmé », « Proposé » avec sa source et « Confirmer », « Manquant » avec pourquoi), le
    bouton « Générer la version à signer » compte les manques ; genre en liste
    (`SACEM_GENRES`) ; « Œuvre préexistante » dans l'Œuvre (`BorrowingLine`) ; total Phono en
    tête de la Répartition (`PhonoTotal`), DEP / DR expliqués, calculés par le code et
    « J'ai vérifié les parts DEP et DR » (`DepDrField`, `dep_dr.checked`) ; première
    exploitation **obligatoire**, proposée depuis la date de sortie prévue
    (`releases.planned_release_date`, « Proposé » jusqu'à « Confirmer ») — ce qui remplace la
    règle « jamais déduite » du ticket 06. `formality_missing` (renommée
    `formality_missing_base` et enveloppée) ajoute `first_exploitation` et `dep_dr_check`.
    Plus de frise ni de liste « Il manque » en tête ; brouillon « BROUILLON — ne pas signer ».
  - *Lot 6b, dépôt et réponse de la SACEM* (JUR-03, JUR-10, migration
    `20261024000501_sacem_outcomes`, test `legal-formalities`) : les preuves sont des **PDF**
    déposés par l'équipe dans le bucket privé `formality-signatures`, sous
    `<org>/proofs/<formalité>/<uuid>.pdf` (`openFormalityProof` donne le chemin, le navigateur
    envoie avec la session, politiques `formality_proofs_objects_*` via
    `formality_proof_allowed`) ; `submit_formality` exige l'accusé de dépôt
    (`formality_proof_file_required`), `complete_formality` la preuve de l'enregistrement **et**
    l'identifiant SACEM de l'œuvre (`formality_external_id_required`) : jamais « Enregistrée »
    sans eux. Réponse « Rejetée » (`reject_formality`, motif, statut `rejected`, déclaration du
    titre `rejected`) puis « Préparer une nouvelle déclaration » (`restart_formality`, valeurs
    gardées, historique intact). Écran : « Enregistrer le dépôt » (`DepositForm`) et
    « Enregistrer la réponse de la SACEM » (`SacemAnswerForm` : Enregistrée / À corriger /
    Rejetée) en modale, « Voir l'accusé de dépôt » / « Voir la preuve de l'enregistrement » ;
    modifier le bulletin généré avertit que les signatures recueillies ne vaudront plus (une
    nouvelle version est signée de nouveau, déjà en base). Reste : la signature de PDS Éditions
    par la direction dans l'app (le bulletin ne sait pas encore quelle ligne d'éditeur est la
    maison).
  - *Lot 7, autorisation d'utilisation* (JUR-09, JUR-10) : « Emprunt » renommé partout à
    l'écran (« Autorisation d'utilisation « X » », « Autorisations d'œuvres existantes »,
    « œuvre existante non autorisée » ; les paramètres d'URL `?emprunt=` restent). Le panneau
    montre « La demande » (ce qui est repris, l'œuvre, l'ayant droit de chaque droit) puis
    « Deux autorisations distinctes », un état par droit calculé par le code
    (`lib/legal/clearance/right-states.ts` : ayant droit à identifier, demande envoyée,
    conditions proposées, **conditions acceptées · pas encore autorisée**, licence à signer,
    autorisée · licence signée, refusée), puis le seul temps en cours sous son titre
    (`ClearanceStages` sans frise). Pas de migration : ayants droit, conditions et contrats
    étaient déjà par droit.
  - *Lot 8, Prêt pour la sortie* (JUR-07) : en tête, un bandeau dit où en est la sortie —
    « Non prête », « Prête à être validée », « Sortie validée », « Livrée au distributeur »
    (`releases.delivered_on`, `LegalReadiness.deliveredOn`) —, la décision de la direction et
    la prochaine action (tue quand c'est le geste du lecteur : « À vous » le dit) ; puis trois
    tuiles (`StatTiles` : contrôles validés hors validation finale, `LegalReadiness.counted` ;
    blocages ; points à suivre) ; « Blocages » et « Points à suivre » seulement s'il y en a ;
    le détail par domaine et la politique du label repliés (`Fold`). Le résumé de l'étape dans
    le parcours suit les mêmes mots.
  - *Lot 9, gestes en modale* (règle `docs/DESIGN.md` « Modale saisie », migration
    `20261024000601_signed_otherwise_scan`, test `signed-returns`) : « A signé autrement » sur le
    bulletin (`SignedOtherwiseForm` : la date **et le bulletin signé scanné**, exigé par
    `note_formality_signature`, rangé avec les preuves de la formalité), « Je l'ai remis
    autrement » d'un contrat, « Ajouter une facture reçue autrement » et « Marquer comme payée »
    (`InvoicePanel`, devenu composant client), « Je conteste » sur la page publique d'une
    répartition (motif obligatoire, dit à l'envoi). Les gestes sans saisie (Relancer, Nouveau
    lien, Envoyer à …) restent des boutons ; la correction d'une valeur reste la ligne qui se
    change en champ (`FactRow edit`).

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
  - **Parcours du 16/10/2026** (remplace « Deux étapes à l'écran » ci-dessous, `docs/VISION-UX.md` § 4) :
    le Juridique reprend le patron d'écran unique de la Production, en **5 étapes** (`inventory`,
    `framing`, `confirmation`, `plan`, `tracking`), chacune sa page `/legal/<étape>`. `/legal` sans
    segment **redirige** vers l'étape qui attend la personne (sinon l'étape en cours, sinon l'État
    des lieux), en gardant `?question=` (→ `/framing`) et `?state=` (→ `/inventory`). Modèle pur
    `lib/legal/journey.ts` (`legalJourney`, états calculés depuis ce qui est enregistré, jamais par
    PO ; responsable de chaque étape = le chef de projet du projet ; l'étape en cours est « À vous »
    pour **toute personne qui voit le Juridique**, puisque la direction et les chefs de projet y
    agissent même sans être responsables, `ReadOnlyNotice`), données lues une fois par
    requête dans `lib/legal/journey-context.ts` (`legalJourneyContext`, `cache()`), cadre
    `LegalStepFrame` (« Maintenant » + Parcours + étape ouverte) autour d'une petite page par étape
    (`components/legal/steps/`). Les briques du parcours sont **communes** (`components/shell/journey/` :
    `JourneySpine`, `NowCard`, `StepPanel`, types dans `lib/ui/journey.ts`, textes `fr.journey`) et
    servent aussi la Production. Pas de barre de chevrons au-dessus : elle répétait le Parcours (retour du 16/10), `LegalSteps` est supprimé. Les
    pages de branche (fiches, contrats, répartitions, emprunts, SACEM, historique) gardent leur pleine
    largeur ; le pied du Parcours porte le lien « Historique ». Le plan lancé n'est plus suivi sur
    `/plan` mais sur `/tracking`.
  - ~~**Deux étapes à l'écran**~~ (07/10, remplacé par le parcours ci-dessus ; `LEGAL_TABS` supprimé) : **État des lieux** (`/legal`), qui
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
    - **Demander** (`AskMoment`, refait le 07/11/2026 : trois `StepSection` sans numéro ni titre
      « Demander » au-dessus, l'écart entre elles fait la hiérarchie, sans paragraphe d'aide ; avant toute demande, « La demande » est remplacée par une ligne
      « Topline de « X » (auteur) » et le journal vide est masqué) : ce qui est repris (proposé par le code selon
      l'élément : un sample = l'œuvre et l'enregistrement, une topline, une interpolation ou une
      reprise = l'œuvre ; à corriger, rien d'appliqué avant le clic), un ayant droit par droit
      choisi dans le Réseau (`PersonPickerField`, rôle repris du Réseau, sinon éditeur pour
      l'œuvre, label pour l'enregistrement ; libellés « Qui détient l'œuvre « X » ? » et « Qui
      détient l'enregistrement original de « X » ? » avec où trouver : répertoire SACEM, mention
      ℗ ; « Ajouter au Réseau » crée une structure Éditeur ou Label sans quitter le panneau ; ce
      qui est repris en `SegmentedControl` (choix unique, comme Personne / Organisation du Réseau ;
      jamais `FilterChip`, réservé aux filtres), « · proposé » sur la proposition ; sous l'œuvre,
      lien vers le répertoire en ligne de la SACEM), puis la demande en e-mail (`RequestSend` =
      `MailCard`, adresse dans la ligne « À » de la carte (`toControl`) : celle du Réseau
      pré-remplie et modifiable, sinon à écrire ; message modifiable, objet « Demande
      d'autorisation · … ») : « Envoyer à X » l'envoie par PDS OS (`emailMessage`, un e-mail par
      ayant droit, adresse écrite gardée dans sa fiche si elle n'en avait pas, `lib/legal/clearance/request-email.ts`)
      et garde le texte envoyé dans le journal comme preuve (JUR-10) ; **réponses rangées seules**
      (08/11/2026) : la demande part avec une deuxième adresse de réponse, celle de PO propre à
      la demande (`po+aut-<id>@…`, `lib/email/reply-address.ts`) ; toutes les 10 min, pg_cron
      (`public.poll_inbox`, secrets Vault `inbox_poll_url` et `cron_secret`) appelle
      `/api/cron/inbox`, qui lit les enveloppes des 14 derniers jours de po@ en IMAP
      (`lib/email/inbox.ts`, BODY.PEEK : rien n'est marqué lu) et range par le code seul
      (`lib/legal/clearance/inbox-replies.ts`) : adressée à `po+aut-<id>` → cette demande ;
      sinon venue de l'adresse d'un ayant droit d'une seule demande envoyée → celle-là ;
      plusieurs → celle dont l'œuvre est nommée dans l'objet ou le texte, si une seule ;
      sinon laissée dans po@. Texte sans l'historique cité (`lib/email/reply-text.ts`), pièces
      jointes nommées seulement ; `receive_clearance_reply` (service role seul, une fois par
      Message-ID, jamais sur une demande close, état inchangé) et notification
      `clearance_reply_received` au responsable. « Négocier » pré-remplit « Leur réponse »
      avec elle (source dessous) ; gardée telle quelle, elle n'est pas copiée deux fois au
      journal (`receivedId`). Aucune IA ne décide du rattachement ; aucun e-mail parti = rien
      d'enregistré ; « Je l'ai envoyée autrement » déclare seulement ; sans SMTP, « Ouvrir dans ma
      messagerie » et « J'ai envoyé la demande » (`requestClearance` :
      qualification avec l'usage écrit par le code depuis le dossier, ayants droit, identifiés,
      envoi consigné, contactés). « Rien à sécuriser » n'est plus une pastille : c'est une
      « Autre issue » à côté de « Retirer l'élément du titre » (`NothingToSecureButton`, raison
      demandée en modale, puis clôt).
    - **Négocier** (`NegotiateMoment`) : leur réponse collée, lue par PO
      (`readClearanceMessage`), les conditions affichées dans des champs à corriger, « Envoyer à
      la direction » (`submitClearanceReply` : réponse au journal, conditions proposées, en
      négociation) ou « Enregistrer le refus ». La direction voit « Valider les conditions » ou
      « Demander une contre-proposition » (contour) ; le responsable voit en tête `StepWaiting` « En attente de Claire Morel : valider les conditions » (nom de qui valide, sinon « La direction »), les conditions envoyées dessous (08/11/2026).
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
  - **Enchaînement** (Sacha, 05/11/2026) : la dernière question ouverte enregistrée (ou une
    correction quand aucune ne reste) ouvre la Confirmation (`IntakeWorkspace`, `router.push`) ;
    à la Confirmation, « Corriger » / « Répondre » d'une ligne ouvre sa question dans une
    `FormDialog` (`SynthesisAction` + `QuestionCard`) sans quitter le dossier, qui se relit
    après l'enregistrement. Le dossier, lui, ne se confirme jamais seul (geste du responsable).
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
  - **Une ligne par démarche** (Sacha, 06/11/2026, remplace la « lecture groupée » par nature
    du 05/10) : avant le lancement, le Plan montre chaque démarche sous le nom qu'elle aura dans
    le Parcours (`demarcheOfItem`, `lib/legal/demarches/build.ts`) : une personne = son item
    « contrat » (fiche puis contrat), l'item « fiches » commun n'a pas de ligne et reste gardé
    tant qu'une démarche qui en dépend l'est. Responsable et échéance se lisent ; un clic les
    change. Les contrats à prévoir sont un tableau, une ligne par personne (`ContractTable`).
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
    `lib/legal/splits/shares.ts`) ; `propose_split_version` refuse tout total autre que 100 ;
    l'écran arrondit à 2 décimales. Plus de « Parts égales » depuis la recette Juridique V1
    (JUR-01) : aucune part n'est proposée par le code.
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


### Ce qui revient signé par la page privée (20/10/2026, branche `pc/f2-signatures`)

Règle 19 de `docs/VISION-UX.md` : le contrat et le bulletin SACEM 725 signés reviennent par la page de
la personne (`/c/`). Migration `20261020070101_signed_returns.sql`, pgTAP `signed-returns.test.sql` (30).

- **Envoi** (étape « Envoyer en signature » de la démarche « fiche et contrat ») : « Envoyer à X » met
  la version validée sur sa page (`send_contract(contrat, 'link')`, exige un lien actif ;
  « Créer son lien privé » s'il n'en a pas, `issue_contact_link`) ; PDS OS n'envoie pas l'e-mail :
  le lien se copie dans la carte « Sa page du projet » (`ContactLinkOffer`) sous l'étape. Recours
  « Je l'ai remis autrement » : comment (Remis en main propre / outil de signature / messagerie) et
  le jour (`send_contract(…, 'other', how, on)`, jamais dans le futur ni plus d'un an avant).
  `contracts.sent_via / sent_how / sent_on` ; l'événement reste `signature.requested` (avec la façon).
- **Page de la personne** (`components/legal/signed-returns/signed-portal-cards.tsx`,
  `get_contact_signatures`) : « Votre contrat » (en préparation → approuvé → à signer → reçu, PDS le
  vérifie → signé) et « Le bulletin SACEM de « … » » (sa ligne de la version en cours). « Télécharger »
  : `/c/[token]/contrat/[contractId]` (PDF imprimé comme `/api/contracts/…/document`, seulement une fois
  envoyé) et `/c/[token]/bulletin/[signatureId]` (725 rempli). Dépôt : `SignedUploadForm` vérifie les
  premiers octets (`%PDF-`) et 20 Mo dans le navigateur, refus en rouge avec sa raison ; chemin à usage
  unique (`open_signed_return_slot`, table `signed_return_slots`, 30 min), envoi direct au bucket
  (`contract-files` pour un contrat, `formality-signatures` — PDF seul — pour un bulletin), puis
  `submit_signed_contract` / `submit_signed_bulletin` qui revérifient l'objet (présent, `mimetype` PDF).
- **Contrat** : le signé devient un fichier du contrat (`contract_files` catégorie `signed`,
  `via_contact_id`), événement `signature.received` (« Contrat signé reçu par son lien privé », par la
  personne), le responsable du contrat notifié (`legal_contract_signed_received`, ouvre la démarche
  de la personne). Dans l'étape : « Reçu de X par son lien privé » (fichier, « Voir le PDF » signé une
  heure, « Preuve de signature · Dépôt par son lien privé, horodaté ») + « Vérifiez… » + « Marquer comme
  signé » daté du dépôt. **Décision** (proto) : le contrat ne passe pas « Signé » seul au dépôt,
  l'équipe vérifie ; `advance_contract('sign')` accepte ce dépôt à la place du fichier de preuve. Sans
  dépôt : « En attente de X (lien privé) » et, replié, « Le signé vous est parvenu autrement ? » (signé +
  preuve, comme avant).
- **Bulletin** : chaque signataire porte son contact (`legal_formality_signatures.contact_id`, lu des
  créateurs et éditeurs du dossier à la génération ; repris pour les versions existantes). Le dépôt par
  le lien enregistre la signature (`via = 'link'`, fichier, jour) ; tout signé → `ready_to_submit`
  (`settle_formality_signature`, commun avec l'équipe) ; responsable de la démarche (sinon du projet)
  notifié (`legal_bulletin_signed`). Équipe : « A signé autrement » + « Signé le * »
  (`note_formality_signature`), la saisie libre « Comment X a signé » est retirée de l'écran.
- **Sécurité** : toutes les fonctions partent de `contact_link_of(token)` ; un jeton ne lit, ne
  télécharge et ne dépose que les contrats (`legal_agreement_needs`) et les lignes de bulletin de **son**
  contact dans **son** projet (`contact_contract`, `contact_bulletin_signature`).

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
  copier (fiche, répartition, dossier du mixeur), adressé au contact du Réseau. **Envoi par PDS OS**
  (04/11/2026, choix de Sacha : pas de domaine, donc le Gmail de PO plutôt que Resend) : un seul point
  d'entrée `lib/email/send.ts` (nodemailer, `smtp.gmail.com`, `EMAIL_SMTP_USER` = po@pdsrecords.com,
  `EMAIL_SMTP_PASSWORD` = mot de passe d'application), expéditeur « <membre> · PDS », réponses au
  membre, texte seul. Branché d'abord sur l'envoi du dossier du Mixage/Mastering
  (`transmission-email.ts` : message écrit dans l'étape, gardé comme note du dossier, lien à la fin,
  puis `mark_master_transmission_sent` et `mark_contact_link_sent`). **Le lien envoyé est la page par
  personne** (Sacha, 04/11/2026, Figma 378-6581) : `sendRound` la crée au besoin
  (`lib/portal/ensure-contact-link.ts`), le lien s'ouvre sur la carte du dossier (`/c/<jeton>#ps-package`) ;
  le lien `/m/` ne sert plus que de repli et pour les envois antérieurs. Dans l'étape, la carte « Lien de
  Karim Haddou » (`LinkPanel`) : état (Pas encore envoyé, Envoyé, Ouvert), copier, Relancer, Nouveau lien,
  « ⋯ » Retirer le dossier de mixage (`revoke_master_transmission`, la page reste) ou Révoquer le lien
  (`revoke_contact_link`, toute la page), dates du dossier et du lien ; le tarif au-dessus en carte document
  (`RateBlock`). Sans les variables, ou sans adresse au Réseau, l'envoi
  reste déclaré (« Marquer comme envoyé ») ; un e-mail refusé laisse le dossier créé et le lien à copier.
  **Lot 2 (05/11/2026), même schéma partout** (`emailContact`, un e-mail par personne et par geste, jamais
  d'échec du geste) : page par personne (« Créer le lien » / « Nouveau lien » l'envoient, « Relancer »
  `remindContactLink`), fiche de renseignements (`prepareLegalForm` l'envoie et la marque envoyée, le
  complément demandé part avec son message), confirmations de répartition (`emailConfirmations`),
  contrat sur le lien privé (`lib/contracts/signer-email.ts`, envoi et relance), demande de facture
  (`lib/email/invoice-email.ts` : fusionnée au « validé » de l'ingénieur au dernier Master final, ou
  envoyée à la signature d'un contrat payant). Résultat `emailOutcome` (`lib/email/outcome.ts`) : envoyé =
  toast, échec = avertissement, désactivé = voie manuelle inchangée ; `canEmail` (SMTP + adresse) vient du serveur.
  **Lot 3 (05/11/2026)** : `emailMessage` (`lib/email/link-email.ts`) envoie un message sans lien ; `emailProviderLink`
  (`lib/email/provider-email.ts`) envoie l'espace `/p` pendant que le jeton est en main. Production : lien
  prestataire et réalisateur retenu (envoyés à la création), demande de corrections (`sendCorrections`, texte
  envoyé au contact du Réseau), feuille de service (`createCallSheetLink` : un e-mail par adresse de l'équipe, les
  adresses non atteintes gardent le mailto). Activations : lien d'accord (`prepareAgreement` l'envoie et déclare
  l'envoi « e-mail »), brief et récap agence (e-mail **avant** la déclaration ; s'il ne part pas rien n'est marqué
  et le formulaire propose « Je l'ai envoyé moi-même », `manual`), messages validés (`emailActivationMessage`,
  seulement sans dossier de presse joint). Calls : résumé aux invités extérieurs (`sendMeetingSummary`) et compte rendu
  partagé (`shareCallReport`) envoyés par le serveur à l'envoi.

### Synchronisation, horodatage et historique (retours Juridique du 11/10/2026, lot 2)

- **Pages à jour sans recharger (JUR-12, JUR-28)** : table `project_live` (une ligne par projet,
  `version` + `changed_at`, migration `20261012100201`), incrémentée par le trigger
  `project_live_tick` sur toutes les tables du Juridique, les contrats et les tâches (ligne
  rattachée au projet par son `project_id` ou par son emprunt, sa formalité, sa répartition ou
  son contrat), y compris quand l'écriture vient d'une page publique (fiche, confirmation de
  répartition). `ProjectLive` (monté dans le layout du projet) l'écoute en **Realtime** (RLS :
  seul qui voit le projet l'entend), puis appelle `refreshProjectData` qui fait
  `revalidatePath` sur tout le projet : la page ouverte est relue aussitôt, les autres à leur
  prochaine visite (jamais un cache client périmé), avec « Mise à jour… » pendant la relecture.
  Aussi au retour sur l'onglet, au retour du réseau et à la reconnexion du canal. Le signal ne
  porte aucune donnée : tout est relu avec la session de la personne. Pour un autre module,
  ajouter un trigger `zz_project_live` sur ses tables suffit. Les attentes du Suivi disent qui
  ou quoi est attendu et quelle action débloque la suite (« Déposée : en attente de la réponse
  de la SACEM, à saisir avec « Enregistrer le résultat » »).
- **Date et heure (JUR-20)** : tout instant enregistré s'affiche « 11 oct. 2026 à 16:42 », heure
  de Paris (`formatInstant`, `lib/utils/instant.ts` ; `Timestamp` pour un `<time>` avec le
  détail au survol). Une échéance sans heure reste une date (`formatDate`), jamais une heure
  inventée. Appliqué aux signatures, dépôts, résultats, réponses de répartition, envois de
  fiches, validations, journaux des contrats, des emprunts et du plan.
- **Historique du Juridique (JUR-29)** : `/legal/history`, lien « Historique du dossier » en tête
  de chaque page du Juridique. Il **lit** les journaux existants (append-only), sans rien
  dupliquer : `legal_plan_events`, lancement et validation du plan, confirmation du dossier,
  instants des fiches, `contract_events`, `legal_clearance_events`, `legal_split_events`,
  `legal_formality_events` et les signatures (`loadLegalHistory`, traduits par
  `buildLegalEvents`, pur). Chaque ligne : heure, action, objet (titre, version, personne),
  auteur (« par la personne, via son lien » pour une réponse extérieure, « automatiquement »
  pour la base), note ; une preuve saisie à la main est dite « Déclaration manuelle non
  vérifiée ». Filtres par partie du dossier (`?branche=`), groupes par jour (`DayGroups`, commun
  avec l'Activité du projet). Un journal illisible est dit, jamais montré comme un historique
  complet. Une démarche terminée quitte les listes actives du Suivi mais reste ici. Pas encore :
  export CSV / PDF, comparateur de versions.
- **Historique, suite (JUR-29, 13/10/2026)** : chaque évènement porte son `kind` et son objet ;
  la **chaîne causale** est calculée par règle (`lib/legal/history/causes.ts`, `FOLLOWS` : un
  évènement suit le dernier évènement antérieur du même objet d'un type qui peut y mener —
  demande de modification → révision → soumission → approbation → signature…), dite « Suite à … »
  sur la ligne ; un bulletin SACEM **regénéré** dit qu'il rend caduques les signatures de la
  version précédente. Filtres **par personne** (`?par=`) et **par mois** (`?mois=AAAA-MM`, Paris),
  seulement ceux que l'historique contient (`UrlFilters`, `lib/legal/history/filter.ts`) ; l'export
  CSV suit les filtres et ajoute la cause et la conséquence. **Comparateur de versions** des
  répartitions (`splitChanges`, `SplitVersionChanges`) : chaque version contre la précédente —
  personne ajoutée, retirée, rôle ou part changés. Sans migration.

### Finitions par branche (retours Juridique du 11/10/2026, lot 3)

- **Suivi (JUR-07, JUR-08)** : chaque tuile dit ce qu'elle compte (`StatTiles` `hint`), le filtre
  actif est écrit avec « Retirer le filtre » ; chaque démarche dit quand elle est terminée
  (`fr.legal.board.doneWhen`, les mêmes règles que `lib/legal/tracking/sources.ts`).
- **Contrat bloqué par une fiche (JUR-10)** : le panneau nomme la personne et les valeurs qui
  viennent de sa fiche (« Il manque les renseignements de X pour préparer son contrat… », la fiche
  est l'étape 1 du même panneau) ; une valeur manquante d'ailleurs a « Compléter » (fiche Réseau
  avec `?retour=` qui rouvre le panneau, contrats à prévoir, État des lieux). `safeReturn` accepte
  désormais une requête simple (`?ligne=…`) après un chemin de projet.
- **Complétude d'un contrat (JUR-16, lot 10)** : chaque valeur d'un modèle a un état calculé par
  le code (`lib/legal/contracts/completeness.ts`) : Rempli, À vérifier (repris du Réseau, la fiche
  ne l'a pas confirmé, ne bloque pas), Sans objet (SIREN et raison sociale d'une personne qui agit
  en personne physique, IPI sans société de gestion : d'après sa fiche, jamais supposé ; le contrat
  écrit « Sans objet »), En attente de la fiche (envoyée, pas revenue), Invalide (e-mail, SIREN /
  SIRET, IPI, téléphone hors format), Manquant. Les trois derniers **bloquent** la génération
  (`agreementRows`, `ready`) ; chacun dit s'il est obligatoire, qui le fournit (la personne par sa
  fiche, le chef de projet, la direction) et mène à l'écran de correction (fiche → Fiches de
  renseignements). Même liste dans le panneau du plan et la fenêtre « Générer »
  (`ContractValueList`) ; recalculée par le serveur à chaque changement (`ProjectLive`).
- **DEP / DR (JUR-23, lot 10)** : sous la rubrique D du dossier SACEM, un aperçu calculé par le code
  (`lib/legal/formalities/sharing-rule.ts`, `DepDrPreview`) : Phono, DEP et DR montrés côte à côte,
  jamais additionnés ; DEP et DR répartis d'abord entre catégories par une **règle versionnée**
  (`SACEM_725_V1` : DEP un tiers auteurs / compositeurs / éditeurs, DR moitié éditeurs, un quart
  par catégorie de créateurs ; sans éditeur, moitié / moitié), puis au sein de chaque catégorie à
  parts égales (D vide) ou selon les parts Phono (D cochée), en unités exactes (plus grand reste,
  total toujours 100 %). L'effet de l'autre choix est dit ligne par ligne ; alertes : total Phono
  différent de 100 %, catégorie sans ayant droit, arrangeur ou adaptateur non calculé par V1, règle
  inconnue. La règle utilisée est **gardée avec le dossier** (`dep_dr.rule`) : une V2 ne change
  pas un dossier ni un bulletin déjà fait. **Point à trancher** : fractions de V1 et part des
  arrangeurs / adaptateurs, à confirmer par le référent juridique avant production (ticket).
- **Fiches (JUR-11, JUR-13, JUR-14)** : `legal_forms.opened_at`, noté une fois par
  `note_legal_form_opened` (anon) à l'ouverture de `/f/…` (« lien ouvert le … » dans la liste) ;
  une fiche reçue notifie qui l'a préparée et le responsable du projet (`legal_form_received`,
  trigger `legal_forms_notify_received`), migration `20261012100301`. Le champ de part s'appelle
  « Votre part d'auteur ou de compositeur, à votre avis », avec son aide (indicatif, n'engage
  personne). La fiche publique passe par **Vérifier** (récapitulatif par bloc, `FormReview`),
  **Consentir** (case distincte, jamais un bouton désactivé) puis **Envoyer**, et finit par un
  reçu daté.
- **Contrats (JUR-17, JUR-19)** : la page d'un contrat dit son origine juridique (contrats à
  prévoir d'un projet, ou autorisation d'un emprunt : `legalOriginOf`) et y ramène. Un modèle a sa
  page `/app/contracts/templates/[seriesId]` (ligne cliquable) avec « Valider » pour le DG et, pour
  les autres, qui valide. Pas encore : refus motivé d'un modèle.
- **SACEM (JUR-24, JUR-26)** : `formality_missing` exige aussi le genre, un prénom ou un
  pseudonyme par créateur et la dénomination de chaque éditeur (migration `20261012100401`,
  dossiers non générés rejugés) ; l'IPI / COAD reste facultatif (un créateur non membre n'en a
  pas). La frise de la déclaration (`formalityTimeline`) a été retirée par la recette
  Juridique V1 (lot 6) ; chaque signature
  s'enregistre par « Enregistrer la signature de X » avec « Comment X a signé » expliqué.
### Le reste du Juridique (retours du 11/10/2026, lot 4)

- **Droits (JUR-01)** : une répartition à 100 % est « Répartition renseignée » ; quand elle est
  complète, un second fait dit si les droits sont sécurisés (`securedFact`) : master = un contrat
  signé et en vigueur avec chaque partie qui a une part (sinon « Contrat signé manquant : … »),
  édition = la répartition confirmée par chaque personne dans le Juridique.
- **Déclarations (JUR-02)** : chaque dépôt montre sa référence et sa date ; la section explique
  déclaration / ISWC / ISRC.
- **Alertes du Cadrage (JUR-03)** : une contrainte proposée se confirme au Cadrage ; confirmée,
  elle se traite dans les Emprunts (« À traiter… », ou « Suivi dans les n emprunts du projet »).
- **Droits d'agir (JUR-04)** : sur le Juridique, un titulaire de `manage_legal` qui n'est pas
  responsable du projet ne voit plus « Lecture seule » mais « la direction et les chefs de
  projet y agissent ».
- **Cadrage juridique (JUR-05)** : compteur en trois parts (confirmées · reprises du Cadrage, à
  confirmer · sans réponse).
- **Confirmation (JUR-06)** : « Confirmer et générer le plan d'action », avec avant la liste des
  démarches qui seront créées (`proposeLegalPlan`, la même proposition que le lancement).
- **Contrats nécessaires (JUR-09, JUR-15)** : « Confirmer les contrats nécessaires » (ce n'est ni
  valider leur contenu ni les générer) et l'étape suivante dite ; le panneau d'un contrat montre
  les conditions financières (montant, source : fiche ou contrats nécessaires).
- **Modèles (JUR-19)** : le DG refuse un brouillon avec sa raison
  (`set_contract_template_status(id, status, reason)`, `retired_reason` / `retired_by`, migration
  `20261012100501`), visible sur la page du modèle ; retirer peut dire pourquoi.
- **Liens stables (JUR-27)** : une nouvelle version d'une répartition garde le lien déjà envoyé
  à chaque personne (même contact, sinon même nom) : il ouvre la nouvelle version, les réponses
  aux versions précédentes restent avec leur preuve ; seul un nouveau venu reçoit un lien
  (`propose_split_version`, migration `20261012100601`, « Même lien qu'avant » dans la fenêtre).
- **Transitions et journal (JUR-14, JUR-28, JUR-29)** : chaque action SACEM dit ce qu'elle a
  changé (`useLegalAction` `done`) ; l'Historique s'exporte en CSV (UTC et Paris) ; les champs
  corrigés d'une fiche ne sont plus répétés dans ses réponses.

- **SACEM et contrats avancés (lot 5)** : un éditeur du bulletin dit quels créateurs il publie
  (`Publisher.represents`, positions 1 à 5, plusieurs éditeurs pour un créateur = coédition ;
  manque `publisher_link:i`) et le contrat d'édition du projet qui fonde le lien, ou « À obtenir »
  (`Publisher.contract_id`, `listPublishingContracts`). « Copie jointe » n'est plus une case : elle
  se déduit des contrats rattachés, et `formality_missing` ne la croit qu'avec une pièce (chaque
  contrat choisi, ou un contrat d'édition signé du projet), sinon la rubrique G (migration
  `20261012100701`). Totaux Créateurs / Éditeurs sous le Phono (JUR-23). Le dossier se remplit
  pas à pas (`DossierStepChips`, `DossierStepButtons` : une section à la fois) jusqu'au
  **Récapitulatif** (`DossierRecap` : confirmé, proposé à vérifier, manquant) où l'on valide ;
  après un essai, toutes les sections s'affichent pour atteindre chaque champ en rouge (JUR-21).
  « Nouveau contrat » demande d'abord le cas (`ContractCreation`) : enregistrer un contrat
  existant (avec les étapes suivantes), le générer depuis un modèle (Juridique du projet) ou
  créer un modèle (JUR-18). Pas encore : aperçu chiffré du partage statutaire des DEP / DR.

### Parcours du proto « Projet complet » (lot 9, J1, 19/10/2026)

Remplace l'étape « Suivi » et les pages de branche (`docs/projet-complet/legal.md` § 5, J1).

- **Une étape par démarche** dans le Parcours, en trois intertitres : **Dossier** (État des lieux,
  Cadrage juridique, Confirmation, Plan d'action), **Suivi** (« Sami Kader · fiche et contrat »,
  « Emprunt « Night Lights » », « Répartition de l'édition « Néons » », « Déclaration SACEM
  « Néons » » ; « Suivi · démarches proposées » tant que le plan n'est pas lancé, verrouillées
  « Après : Plan d'action » avec « Ce qui viendra »), **Sortie** (« Prêt pour la sortie »).
  URL : `/legal/person/<ref>`, `/legal/clearance/<id>`, `/legal/split/<masterId>`,
  `/legal/sacem/<masterId>`, `/legal/ready` (`legalRouteOf`, `legalDemarcheHref`,
  `legalRefSlug` : la clé d'une personne `contact:<id>` / `artist:<id>` / nom normalisé devient
  `c-…` / `a-…` / `n-…`).
- **Calcul** : `lib/legal/demarches/build.ts` lit le tableau du plan lancé
  (`lib/legal/plan/board.ts`, inchangé : chaque temps lu à sa source) et en fait des
  `JourneyStep` (`launchedDemarches`) ; avant le lancement, `proposedDemarches` part de la
  proposition (`proposeLegalPlan`, calculée même avant la Confirmation). Ce qui est attendu et
  de qui : `lib/legal/demarches/todo.ts` (`expectedOf`). **Acteurs** : le responsable de la
  démarche (`legal_plan_items.responsible_person_id`, sinon le responsable du projet) fait les
  gestes ; la direction n'a « À vous » que sur ses décisions (Valider le document, Valider les
  conditions : `kind: "validate"`, alerte « Décision requise ») ; une personne extérieure ou des
  ayants droit mettent l'étape « En attente de … ». Le Dossier est au responsable du projet
  (plus « à toute personne qui voit le Juridique »).
- **Chargeur** : `lib/journey/legal.ts` (`legalJourneys`, ligne `legal` de `JOURNEY_LOADERS`)
  lit `legalJourneyContext` (`lib/legal/journey-context.ts`, mis en cache par requête), qui lit
  désormais fiches, accords (**sans génération** : `loadAgreements`), répartitions, emprunts et
  bulletins. La génération automatique des contrats prêts se fait à l'ouverture de l'étape
  d'une personne (`DemarcheStep`, puis relecture).
- **Corps d'une démarche** (`components/legal/demarches/`) : les panneaux d'avant
  (`FichePanel`, `ContractPanel`, `SplitPanel` avec le comparateur de versions repris de la
  carte de répartition, `ClearanceBody`, `FormalityCard`) deviennent le corps de l'étape
  (`DemarchePart`) ; une personne garde ses deux temps (fiche puis contrat, l'autre replié) ;
  « Responsable et échéance » (`DelegateButton`) en bas ; « Déjà fait » = l'Historique du
  dossier filtré sur les objets de la démarche (`lib/legal/demarches/history.ts`).
- **Plan d'action lancé** : « Contrats à prévoir » (`MappingPanel`), « Ajouter au plan »
  (`AddedActions`) et la liste des démarches avec « Ouvrir ».
- **Redirections** (`lib/legal/demarches/where.ts`) : `/legal/tracking` (et `?ligne=`),
  `/legal/forms`, `/contracts`, `/splits`, `/clearances` (`?emprunt=`), `/formalities` ouvrent
  la démarche qu'elles nommaient, sinon la première de leur genre qui attend. Les `sourceHref`
  du Suivi (`lib/legal/tracking/sources.ts`, lus par la Distribution et l'état des workflows)
  pointent sur l'étape de la démarche. Retirés : `TrackingView`, `PlanRowSheet`,
  `NextLineButton`, tuiles des 4 groupes, `FormsView`, `AgreementsView`, `SplitsView`,
  `ClearancesView`, `FormalitiesView`, `FormRowActions`, `SubmissionDialog`, `SplitCard` (aucune
  table ni donnée touchée).

- **Cadrage juridique comme le Cadrage (J2)** : la question vit dans `PoQuestion`
  (`components/ui/po-question.tsx`, surtitre du domaine seul depuis le 29/10/2026, rang) et
  la lecture de PO dans `PoReading` (« ✦ Ce que PO a compris », citations, « Retirer ») — deux
  briques communes prévues pour être reprises par le Cadrage (lot 2), qui garde ses propres
  issues (Confirmer / Modifier, Non applicable, À définir plus tard). Les faits gardés portent
  leur citation (`legal_facts.source_quote`, lue par `loadIntake`) ; `notAskedQuestions`
  (`lib/legal/intake/questions.ts`) expose les questions qu'une donnée fiable règle (crédits du
  titre, contrats du projet, splits du titre) : « Questions que PO ne pose pas ». « Corriger »
  n'apparaît qu'une fois toutes les questions répondues (proto).

- **Contrats à prévoir avant le lancement (J3)** : section « Contrats à prévoir » de l'étape Plan
  d'action, avant et après le lancement (`MappingPanel` → `MappingForm` / `MappingRow`) : par
  personne, le contrat (modèles validés compatibles avec ses rôles) ou « Pas d'accord nécessaire »
  avec « Pourquoi aucun accord n'est nécessaire * » (table `legal_no_agreement_reasons`, écrite
  par `approve_contract_mapping`, qui refuse `mapping_reason_required` ; lue par `manage_legal`),
  la source de la proposition, et « Nouveau modèle de contrat » (`NewTemplateButton` : le
  formulaire du modèle en modale verre, rôles de la personne cochés ; il entre dans la
  bibliothèque une fois validé par la direction). Erreurs en rouge par personne. **Lancer le plan
  est refusé** tant qu'une personne qui a un contact n'a pas de décision (`launchLegalPlan`, code
  serveur : « Confirmez d'abord les contrats à prévoir. ») ; une personne **sans contact** reste
  « Fiche à préparer d'abord » et se décide après sa fiche (décision : le besoin reste clé par
  contact, `legal_agreement_needs`). Le Plan d'action affiche « À vous · Confirmer les contrats
  nécessaires » tant que c'est à faire. **Changer** le responsable ou l'échéance d'une démarche
  demande « Pourquoi * » (`change_legal_plan_item`, colonne `legal_plan_events.reason`, montrée
  dans l'Historique). Migration `20261019090101`, tests `legal-contracts-before-launch.test.sql`.
  Validation du modèle dans l'étape et « document en tête » : voir « Le reste du Juridique »
  ci-dessous.

- **« Prêt pour la sortie » (J11), un seul calcul** — contrat pour la Distribution et la Vue
  d'ensemble : **`loadLegalReadiness(projectId)`** (`lib/legal/readiness/load.ts`, serveur) rend
  `{ allowed: true, readiness: LegalReadiness | null }` avec `manage_legal` (null avant le
  lancement du plan), sinon `{ allowed: false, validated: { by, at } | null }` (la validation
  finale seule, lue en RLS `can_see_project`). `LegalReadiness`
  (`lib/legal/readiness/controls.ts`, pur) : `verdict` (`"no"` Non prête · `"risk"` À risque ·
  `"ok"` Prête à sortir), `controls` (clé, domaine `master | rights | metadata | assets |
  distribution`, libellé, `blocking`, `status` `ok | open | waived`, raison, prochaine action,
  responsable, source, `href`, dérogation ; le dernier est `final`, la validation finale),
  `blocking` (« À résoudre avant sortie »), `toFollow` (« Reste à suivre »), `done`/`total`,
  `sacemBlocks`, `validated`. **Sources** : Master, Catalogue, Conception et sortie viennent de
  la lecture de la Distribution (`loadDistributionSources` + `distributionReadiness`, items hors
  module `legal`) ; les droits viennent des démarches (emprunt bloquant ; contrat, répartition,
  SACEM « à suivre », la SACEM bloquante si la politique le dit, et « faite » dès le dépôt).
  Ne jamais recalculer ailleurs : la Distribution lit ce résultat pour son prérequis
  « Juridique › Prêt pour la sortie ». **Décisions de la direction** (permission `validate`),
  par fonctions : `grant_release_waiver` (motif obligatoire, table
  `release_readiness_waivers`), `set_release_policy` (`release_readiness_policies`, par
  organisation, « SACEM bloquante », défaut non), `validate_release` (`release_validations`,
  une par projet, avec l'instantané des contrôles ; refusée côté serveur tant qu'un contrôle
  bloquant est ouvert, `validateRelease`). Étape `ready` du Parcours : « À vous · Valider la
  sortie avant The Orchard » pour la direction quand rien ne bloque (`kind: "validate"`),
  faite quand validée ; Ensuite : Distribution. Migration `20261019090201`, tests
  `legal-links-readiness.test.sql`. Pas de notification (aucun type ajouté).
- **Liens privés visibles (J4, fiches)** : le jeton reste connu de la base par son empreinte
  seulement ; le serveur le garde **scellé** (`legal_forms.link_sealed`, AES-256-GCM,
  `lib/legal/forms/link-seal.ts`, clé `LEGAL_LINK_KEY` de l'environnement, jamais en base ni
  au navigateur) via `seal_legal_form_link` à la préparation. La démarche montre alors le lien
  tant qu'il est ouvert (`FicheLinkCard` : Copier le lien, Relancer = e-mail prêt `mailto:`,
  Nouveau lien, « Révoquer l'accès » avec « Pourquoi * » = `revoke_legal_form`), « valable
  jusqu'au … · créé le … · Envoyé par … le … · Ouvert le … » (`legal_forms.sent_by`,
  `revoked_by`, `revoked_reason`). Sans la clé, ou pour un lien préparé avant, l'URL n'est pas
  réaffichable : l'état reste, « Nouveau lien » en donne un. Migration `20261019090301`.
  Les liens de répartition suivent la même méthode (« Le reste du Juridique » ci-dessous).
  **Pas encore** : l'envoi par PDS OS (pas de fournisseur d'e-mail : `mailto:` + « Marquer
  comme envoyée »).

- **Refus d'un emprunt (J8)** : « Décider de la suite » sous le refus (`RefusalDecision`) :
  « Retirer l'élément du titre » avec « Pourquoi * » (`withdraw_clearance` : emprunt abandonné,
  `legal_clearances.withdrawn_reason`, notification `legal_element_withdrawn` au responsable du
  projet par trigger : refaire le passage dans le Master) ou « Le remplacer » / « Par quoi * »
  (`replace_clearance` : nouvel emprunt `to_investigate`, l'œuvre seule, `replaces_id`, l'ancien
  abandonné, puis ajouté au plan par `addLegalPlanItems`). « Retirer l'élément » hors refus passe
  aussi par le motif. Migration `20261019090401`, tests `legal-clearance-refusal.test.sql`.
  Les notifications d'emprunt ouvrent la démarche (`/legal/clearance/<id>`).

### Le reste du Juridique (20/10/2026, branche `pc/r3-legal`)

- **Modèle de contrat décidé dans l'étape (règle 18)** : « Nouveau modèle de contrat » des
  contrats à prévoir crée le modèle puis le **demande** à la direction pour cette personne
  (`request_contract_template` : `contract_templates.requested_project_id`, `requested_key` =
  clé de la ligne, `requested_for` = nom ; auteur seulement, brouillon seulement ;
  notification `legal_template_to_validate` à chaque membre `validate`). La direction le
  voit en tête du Plan d'action (`TemplateRequestCard` : `DocumentCard` du modèle, « S'applique
  à », valeurs repérées, `DecisionPanel` « Valider le modèle » / « Refuser le modèle » avec
  « Ce qui ne va pas * », `decideTemplateRequest` → `set_contract_template_status`) ; son
  « À vous » est sur l'étape Plan d'action (`kind: "validate"`, même plan lancé). Chez
  l'auteur : « Modèle « X » envoyé à … : en attente de sa validation », puis le refus signé
  (`ReturnCallout`) et « Nouveau modèle de contrat » à nouveau ; notifications
  `legal_template_validated` / `legal_template_refused` (trigger). Lecture :
  `lib/legal/contracts/template-requests.ts`.
- **Document en tête de la carte du contrat** : dès la génération, chaque étape qui suit
  (soumettre, valider, envoyer, signer, signé) montre `ContractDocumentCard`
  (« Contrat_Kader_Neons_v2.pdf », « Généré depuis les valeurs ci-dessous · n bloquantes sur
  m », « Voir le PDF » = `/api/contracts/[id]/document`, valeurs avec leur source corrigées à
  leur source). « Modifier une clause » est dans l'étape (`ClauseForm` : clause, nouvelle
  rédaction dans le texte, « Pourquoi * » → `revise_contract_clause`, colonne
  `contract_documents.clause`) ; « Changé depuis la v1 : clause « Crédit » (Lina Haddad, v2) :
  « … » » lit le paragraphe changé entre deux versions (`lib/legal/contracts/document-card.ts`,
  `changedParagraph`). Le retour de la direction est en tête (`ReturnCallout`) et le bouton
  devient « Répondre et transmettre à nouveau » ; la décision passe par `DecisionPanel`.
- **Liens des confirmations de répartition** : même méthode que les fiches — jeton scellé par
  le serveur (`LEGAL_LINK_KEY`, `legal_split_confirmations.link_sealed`,
  `seal_split_confirmation_link`, `lib/legal/splits/link-seal.ts`), montré dans l'étape par
  `SplitLinks` / `PrivateLinkCard` (Copier le lien, « Marquer comme envoyé »
  `mark_split_confirmation_sent`, Relancer = `mailto:`, Nouveau lien, « Révoquer l'accès » avec
  « Pourquoi * » `revoke_split_confirmation`). Un lien reporté sur une nouvelle version (JUR-27)
  garde son sceau et son envoi (trigger `a_carry_link`). Sans clé, le lien s'affiche une fois
  comme avant. La carte de la confirmation est déjà sur la page de la personne (`/c/`, lot 11).
- **SACEM sur une page** : sections en place (`DossierSection`) ; depuis la recette Juridique
  V1 (lot 6), plus de « Avant de générer » à part : chaque ligne dit son état
  (`lib/legal/formalities/field-states.ts`), « Générer la version à signer » (enregistre puis
  génère ; refusé avec le compte des manques) et « Générer un brouillon »
  (`/api/legal/formalities/[id]/draft` : le 725 rempli des valeurs enregistrées,
  « BROUILLON — ne pas signer » en travers, aucune version gardée). Une fois généré,
  `BulletinCard` (« Bulletin_725_Neons_v1.pdf · Généré le … · signatures : n sur m »,
  « Télécharger ») est en tête à chaque étape qui suit, le dossier replié sous « Les valeurs du
  bulletin ». Retirés : étapes du dossier (`DossierStepChips`), récapitulatif (`DossierRecap`).
- **Factures (J10)** : table `legal_invoices` (une par `financial_needs`, cascade avec lui ;
  numéro, montant HT, `gap_reason` obligatoire si le montant n'est pas la rémunération
  convenue, fichier du bucket privé `legal-invoices`, reçue le, échéance = +30 jours, `link` ou
  `team`, payée le / par / preuve). **Lecture : direction seule** (RLS `validate`) ; le
  Juridique ne voit que l'état (`legal_invoice_states` : `asked` / `to_pay` / `paid`). Dépôt par
  la page de la personne (`/c/`, carte « Votre facture » : « Facturer à », « Montant attendu »,
  PDF, « Numéro de facture * », « Montant HT (€) * », « Explication de l'écart * » →
  `open_legal_invoice_slot` puis `submit_legal_invoice`, fonctions `anon` vérifiées par le
  jeton de la personne, le projet et le contrat signé) ; la direction peut « Ajouter une facture
  reçue autrement » et « Marquer comme payée » (« Payée le * », « Preuve du virement * »,
  `mark_legal_invoice_paid`). `financial_needs.status` : `waiting_for_invoice` → `invoiced` →
  `paid`. Journal du contrat `invoice.received` / `invoice.paid` (sans le numéro).
  Notifications `legal_invoice_received` (direction), `legal_invoice_paid` (responsable).
  Parcours (`lib/legal/invoices/journey.ts`) : la démarche signée dit « Contrat signé · facture
  attendue / à payer / payée », la personne « Déposer la facture » (lien), la direction « Payer
  la facture de X ». *(Remplacé le 20/10/2026 par § 8 ter bis : une seule table `project_invoices`,
  RIB commun.)* **PDS OS ne fait jamais de virement** ; ~~ne garde aucun IBAN~~ : décision
  remplacée le 20/10/2026, **le RIB est demandé** avec la première facture (confirmé par Sacha), lu par
  la direction seule, un RIB qui change se vérifie au téléphone ; « Facturer
  à » montre le nom de l'organisation (raison sociale, adresse, SIRET pas encore en base).
- Migrations `20261020030101` (modèle demandé, clause), `20261020030201` (liens de
  répartition), `20261020030301` (factures) ; tests `supabase/tests/legal-reste.test.sql` (31).
- **Pas encore** : envoi d'e-mails par PDS OS (fiche, contrat, demande, bulletin), dépôt du
  contrat signé et du bulletin signé par la page de la personne, contrôle « Facture de X » dans
  Prêt pour la sortie, liste « À payer » sous le Maintenant de la direction, reflet des
  factures dans le Budget (`budget_lines`).

## 8 septies. Master (`/master`, `lib/master-workflow/`, `components/master-workflow/`)

### Parcours du Master sur le patron commun (lot 8 du proto « Projet complet », 19/10/2026)

**Fait foi sur ce qui suit dans cette section** quand ils divergent (chevrons, État du master, « Où en
est la préparation », modale de transmission, `BriefForm` : retirés de l'écran, tables gardées).

- **Parcours** : `lib/master-workflow/journey.ts` (pur, 5 étapes `source|brief|mix|mastering|final`,
  statuts calculés, multi-titre : une étape est faite quand tous les titres du tour le sont, le premier
  titre en attente nomme l'action), faits lus en un aller-retour par `journey-facts.ts`, contexte
  `journey-context.ts` (`cache`), loader du « Maintenant » `lib/journey/master.ts` (après lancement par
  le Plan). Cadre : `components/master-workflow/master-step-frame.tsx` (en-tête + faits « Master final
  attendu le », `NowCard`, `JourneySpine` + « Historique du master », `StepPanel`, blocages et
  informations notées, « Qui fait quoi » `lib/master-workflow/roles.ts`, « Déjà fait »). Routes :
  `/master` redirige vers l'étape qui attend la personne ; `/master/source`, `/brief`, `/mix`,
  `/mastering`, `/final`, `/history` (filtre `?par=`, CSV). Historique reconstruit des tables
  (`lib/master-workflow/history.ts`), sans journal à part.
- **Source** (`source-step.ts`, `components/master-workflow/source/`, migration `20261019080101`) :
  versions candidates = maquettes et mises à plat, **la plus récente détectée** (proto, ticket § 1) ; un
  mix trouvé au Catalogue se propose comme mix final avec motif **obligatoire** (`declare_mix_final`
  `reason_required`). **« Voix définitives » est déclaré par le responsable à la confirmation**
  (`master_flow_sources.vocals_final`, `vocals_pending`, `plan` `wait|anticipate`) : aucun champ du
  Cadrage ne le porte. « Attendre » verrouille le Mixage (prérequis « Arrivée des voix définitives »,
  `create_master_transmission` refuse `vocals_awaited`) ; « Anticiper » ouvre le Brief, chaque version
  de mix garde sa source (`master_mix_versions.source_file_id`, trigger) et `decide_mix_version` refuse
  `working_source`. Une maquette arrivée ensuite notifie le responsable (`master_source_newer`) ;
  « Remplacer la source et prévenir … » confirme la nouvelle version et met à jour le lien vivant
  (`refresh_master_transmission_source`, `sourceUpdatedAt` dans le paquet, « Nouvelle source le … »).
- **Brief en document** (`brief-step.ts`, `brief-fact-actions.ts`, `components/master-workflow/brief/`,
  migration `20261019080201`) : `StartChoices` (« Préparer un échange » recommandé si ≥ 2 manques) ;
  « Commencer directement » pose la question de la direction à la validatrice ; « Préparer un échange »
  = `CallPrepForm stay` dans l'étape. Chaque fait se change sur place (`FactRow` `change`/`edit`,
  `saveBriefFact`) ; la première modification écrit tout le Brief pré-rempli (ingénieur du Cadrage
  avec sa citation, même ingénieur pour le mastering par défaut, validatrice = direction créative du
  Cadrage › Équipe sinon du projet sinon le responsable, dates proposées 6/3/1 jours avant le master
  final). Ordre des dates refusé par le code. « Enregistrer le Brief » (`record_master_brief`) : jamais
  désactivé, dit les manques ; `content_changed_at` > `recorded_at` = « Modifications à enregistrer »,
  et l'envoi est bloqué tant que le Brief n'est pas enregistré tel quel (blocage côté code). « Modifié
  par … » : `changed_by` écrit par trigger.
- **Mixage / Mastering** (`round-step.ts`, `round-actions.ts`, `components/master-workflow/round/`,
  migrations `20261019080301` et `080401`) : avant l'envoi, comme le proto (Sacha, 04/11/2026) : ce qui
  bloque, puis « Dossier pour le mixeur » ouvert (`PackagePreview`, `DocumentCard` : chaque titre, sa
  source, ses pistes — ligne cliquable si elles manquent —, direction, livrables, formats, échéances et
  sortie, révisions, message, chacun avec sa source), « Les tarifs restent internes », la carte de
  l'e-mail (À, Objet, message modifiable gardé comme note du dossier, lien ajouté à la fin et sa
  validité) envoyé par PDS OS si `EMAIL_SMTP_*`, sinon déclaré (« Marquer comme envoyé »), dérogation sans
  pistes **écrite** (`withoutStemsReason`, refusée sans) ; le jeton est gardé **chiffré**
  (`token_secret`, clé Vault `master_link_key`) et relu par le responsable seul
  (`master_transmission_link`) : lien visible, « Relancer » (mailto), « Renouveler », « Révoquer » avec
  motif. Sur `/m/` « Prendre en charge le dossier » avec le tarif confirmé ou proposé
  (`take_master_transmission` : ligne de budget `proposed`, notification `master_rate_proposed`) puis
  « Accepter le tarif » (`accept_master_rate` → `committed`) ou **« Refuser »** avec motif (04/11/2026,
  `20261104120101`, `refuse_master_rate` : la ligne revient à l'estimation, `refused_cents`,
  `refusal_reason`, `refused_at`, `refused_by` gardés) ; l'ingénieur lit le motif sur son lien
  (`master_rate_refusals`) et « Proposer ce montant » (`propose_master_rate`, de nouveau `proposed`,
  notification `master_rate_proposed`). Le travail continue pendant ce temps (choix de Sacha). Versions en `VersionCard`, retours minutés
  (équipe seulement), « Transmettre les retours sans décider » (texte écrit par le code, chaque ligne
  avec son auteur), décision `DecisionPanel` (motif **toujours** obligatoire pour une modification),
  « Rouvrir le mix » (responsable, motif, refusé dès qu'une version masterisée est revenue sur le titre :
  décision `reopened`).
- **Master final** (`components/master-workflow/final/`) : fichier au Catalogue, ISRC, filiation, « Ce
  que ça débloque » (durée lue sur le titre), livrables attendus / reçus (notés par le responsable).
- **Page privée `/m/`** : `PortalShell`, cartes « Votre dossier », « Mix » / « Mastering » (versions et
  dépôt), « Échanges avec le label », triées par `PortalSections`.
- **Le reste du Master (20/10/2026, branche `pc/r1-master`, migrations `20261020010101` à `010601`)** :
  - *(Unifié le 20/10/2026 : § 8 ter bis.)* **Facture, RIB, paiement** (`20261020010101`, `lib/master-workflow/invoices.ts`, `invoice-*.ts`,
    `components/master-workflow/invoice/`) : quand chaque titre du tour a son Master final, un trigger
    demande la facture à chaque ingénieur **externe** (celui qui a reçu un lien) : `master_invoices`, une
    par ingénieur et projet. Carte « Votre facture » sur `/m/` et `/c/` : « Facturer à » (table
    `organization_billing`, saisie par l'administration dans `/app/settings`), montant attendu = lignes du
    budget engagées de ses rôles, PDF (bucket privé `master-finance`, emplacements à usage unique
    `master_finance_slots`), n°, montant HT (motif **obligatoire** s'il diffère, `check_master_invoice_amount`),
    RIB. Les lignes du budget passent `invoiced`. **RIB** (`contact_bank_accounts`) : lu par la **direction
    seule** (RLS `is_direction` = permission `validate`), l'ingénieur ne voit que les 4 derniers chiffres,
    l'équipe que l'état (`contact_bank_state` : aucun / à confirmer / vérifié). Le premier RIB donné par
    l'ingénieur sur son lien est gardé (proto) ; un RIB **changé**, ou saisi par un membre d'après un
    e-mail, attend que la direction coche « J'ai vérifié ce RIB par téléphone » (`confirm_contact_bank_account`).
    « Marquer comme payée » (`pay_master_invoice`, direction, RIB confirmé, date ≤ aujourd'hui, preuve
    lue par la direction seule `master_payment_proofs`) : lignes `paid`. **PDS OS ne fait jamais le
    virement.** Échéance = réception + 30 jours, calculée par le code (`invoiceDueOn`). Facture et PDF lus
    par le responsable et la direction (`can_read_project_budget`, comme le budget) ; jamais bloquante :
    le Master final reste « Fait », la direction a l'action « Confirmer le nouveau RIB de … » puis « Payer
    la facture de … avant le … » dans son Maintenant. Notifications `master_invoice_received`,
    `master_bank_details_changed`, `master_invoice_paid`.
  - **Écoute de l'artiste** (`20261020010201`, `lib/master-workflow/listen-*.ts`,
    `components/master-workflow/listen/`) : l'artiste (contact du Réseau lié à l'artiste du projet ou d'un
    titre, `master_listener_contacts`) a l'objet « listen » sur sa **page par personne** `/c/`
    (`contact_page_items` et `project_link_contacts` redéfinies, corps gardés mot pour mot) : chaque
    version en écoute (la plus récente non décidée de chaque titre), lecteur (fichier signé par la page :
    politique storage anon tant que la version est en écoute et l'artiste a un lien ouvert), « Minutage »
    + « Votre retour ». Le retour est un commentaire de la version (`master_mix_comments.contact_id`), lu
    par l'équipe « Mona Lys (lien privé) » ; **l'ingénieur ne reçoit que ce que la validatrice transmet ou
    décide** (règle 21). La validatrice est notifiée (`master_listen_feedback`). Le lien se crée dans
    « Qui fait quoi › Liens privés » (retiré de l'étape Mixage le 04/11/2026, Sacha).
  - **Escalade d'un retard** (`20261020010301`) : statut `escalated` (« Chez la direction »), `outcome`
    (`applied` / `kept` / `refused`). Le responsable : « Appliquer ces dates », « Garder les dates »
    (réponse obligatoire, lue sur le lien), ou « Envoyer à la direction » quand le master final passerait
    après la sortie ; la direction (notifiée, action « Arbitrer le retard de … ») : « Appliquer ces dates
    (la sortie est à revoir) » ou « Refuser le retard ». Les dates sont calculées par le code
    (`delayImpact`) et écrites par `apply_master_delay` (l'ordre du Brief vérifié par sa contrainte).
  - **Réponse de la directrice créative lue par PO** (`20261020010401`, `answer-reading.ts`) : « Lire ma
    réponse » → `extract` (schéma `answer-reading`), chaque élément gardé **seulement si sa citation se
    retrouve mot pour mot** (`verbatimFrom` côté code, `fold_words` côté SQL dans
    `answer_master_question_read`) ; « Retirer », « Envoyer la réponse » ; le responsable « Ajouter au
    Brief » range chaque élément dans Direction / Références / Contraintes (`apply_master_question`).
  - **Livrables déposés par l'ingénieur** (`20261020010501`) : carte « Autres livrables » sur le lien de
    l'ingénieur du mastering quand un titre a son Master final (`get_master_deliverables`), dépôt par
    emplacement (`master_deliverable_slots`, ZIP pour les stems), fichier rangé dans le titre (jamais une
    version), `master_deliverables_received.file_id` / `via_link` ; « Noter comme reçu » reste le recours.
    **Rouvrir le master** : `reopen_mix_version` accepte le mastering (motif, responsable), refusé quand la
    Distribution a livré (`releases.delivered_on`) ; le fichier et le titre repassent « Master ».
  - **PDF du Brief** : `/api/projects/[projectId]/master-brief` (`brief-html.ts`, `htmlToPdf`), sans les
    tarifs internes ; bouton sur la ligne « Brief » une fois enregistré.
  - **Ingénieur maison** (`20261020010601`, `inhouse-actions.ts`) : `master_briefs.mix_person_id` /
    `mastering_person_id` (un membre, exclusif avec le contact), choisi dans le Brief (groupe « Membres de
    PDS »). Il voit le projet (`can_see_project_row` redéfinie, clause de la Production gardée). « Assigner
    à … » (`assign_master_round`, responsable, notification `master_round_assigned`) ; son action « Déposer
    le Mix V1 » est dans son Maintenant et son Travail (parcours) ; il dépose dans l'app
    (`open_` / `record_master_member_delivery`, sans `manage_catalog`) ; pas de lien, pas de tarif, pas de
    facture (« Ingénieur maison · Pas de facture : interne »).
  - **Assignation automatique et rôles corrigés par le DG** (retours d'Ibé du 04/11, `20261105160101`) :
    l'ingénieur maison reçoit son tour **sans clic** (`_master_auto_assign`, triggers sur `master_briefs`,
    `master_flow_sources`, `master_mix_versions`) : le mix dès que le Brief est enregistré (voix non
    attendues en « Attendre »), le mastering dès qu'un mix est validé ; « Assigner à … » ne reste qu'en
    secours. Ingénieur **externe** qui masterise aussi : à chaque mix validé, `decideRound` envoie seul le
    dossier du mastering sur son lien (`continueToMastering`, e-mail `notify.approvedNext`, à la place du
    « validé ») ; refusé tant qu'un titre attend son mix final, ou si le valideur n'est pas le responsable
    (le geste « Transmettre au mastering » reste alors). Le **DG** corrige l'ingénieur du mix, du mastering
    et le valideur depuis le bloc « Personnes » du Brief (`setMasterPerson` →
    `direction_set_master_person`, permission `validate`), tant qu'aucune version de ce tour n'est validée.
    « Rouvrir le mix » n'est plus fermé par le dossier du mastering envoyé, seulement par une version
    masterisée déposée sur le titre (`20261105160201`). Un tour validé ne montre que la version finale
    (« Validée par … », « Rouvrir » dans son « ⋯ », `ReopenMenu`) ; tarif, lien, fil et ingénieur sont repliés
    sous « Détails du mixage / mastering ».


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
  « même ingénieur » s'il fait les deux), comme validateur la personne choisie à la création du
  projet (« Qui valide les versions du master », `projects.master_validator_person_id`, retour
  d'Ibé du 02/11/2026) si elle est encore responsable ou directeur créatif, sinon le chef de projet
  (`loadMasterBrief` ; en base, `default_master_brief_validator` pour un Brief créé ailleurs,
  dictée ou réponse appliquée), Mix final et Master final comme livrables. Enregistrement : mise à jour, sinon création
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
  - **La page suit l'avancement** (lot 6 des retours d'Ibé, 22/10/2026, `masterPortalCards`) : le
    geste du moment est la carte « À vous », encadrée comme le `lead` d'une étape
    (`PortalCardItem.lead`, bordure de sélection) et **en tête de sa carte** : « Prendre en charge
    le dossier » (`PackageTakeCharge`) avant le message, les fichiers et le Brief ; puis « Déposer
    votre version » pour chaque titre qui en attend une (aucune, ou modification demandée) avant
    « Vos versions » et le lien « Revoir le dossier : fichiers et Brief » (`#ps-package`, la carte
    du dossier étant passée dans « Fait ») ; un dépôt que personne n'attend reste possible, replié
    (« Envoyer une autre version »). « Échanges avec le label » passe « À vous · Répondre au
    label » quand le label a écrit en dernier, sauf pour répondre à une question ou un signal de
    l'ingénieur (règle du code, pas un statut stocké). Même cartes sur la page de la personne `/c`.
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
  - **Retours rangés par version** (lot 7 des retours d'Ibé, 22/10/2026, sans migration) : chaque
    carte de version (`RoundVersionCard`) porte, dans l'ordre, « Corrections reçues : répond à la
    demande sur le Mix V*n* du … » avec les mots de cette demande (version précédente, `sentOf`),
    le fichier, ce que l'ingénieur a reçu (`SentRequest` : « Demande de modification envoyée à
    Karim » = décision `changes_requested`, texte `feedback_summary` sinon la note de décision ;
    « Retours transmis à Karim, sans décision » = `feedback_sent_at`), puis les retours de
    l'équipe (`VersionComments` : minutage, contenu, auteur, quand, « Interne · jamais envoyés tels
    quels »). La version en écoute garde ses retours et leur formulaire sous elle
    (`VersionFeedback`, même liste). Sur `/m`, la demande du label est au-dessus de la zone de
    dépôt de la version suivante (« Ce que le label demande pour la V2 »).
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
  - **06/11/2026** (`…20261106130101_master_direction_question_to_creatives`) : la question de la
    direction est posée **par la base** (`_master_ask_direction`, triggers `z_master_ask_direction_brief`
    sur `start_mode = 'direct'` et `z_master_ask_direction_creative` sur `project_creatives`, rattrapage des
    Briefs déjà commencés) à chaque DC du projet, plus seulement au valideur s'il est DC. `startBrief`
    n'enregistre plus que le choix. Ligne « Direction » du Brief : `directionState` (« Demandée à … »,
    « Réponse de … à ajouter »).
  - **Formats de livraison lus dans la Distribution** (`…130201_distribution_audio_requirements`) :
    `organization_distribution.audio_formats` (administration, Réglages › Distribution,
    `DistributionForm`, `lib/distribution/requirements.ts`). `BriefView.distributionFormats` ; le dossier
    (`transmission.ts`) et le PDF prennent `brief.formats ?? distributionFormats`.
  - **Tarif habituel** (`…130301_network_engineer_usual_rates`) : `network_engineer_rates` (une ligne par
    contact, RLS `view_all_projects` ou `pilot_projects`), écrite par le trigger `z_learn_engineer_rate` quand
    une ligne de budget du Master passe `committed` (+ rattrapage). `BriefView.usualRates` ; Brief jamais
    enregistré et `saveBriefFact` au choix d'un ingénieur : le tarif vient de là s'il est vide ou était celui
    de l'ingénieur précédent.
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
  crédit dans le Réseau, filtres par état), les lignes `FactRows` / `FactRow`
  (`components/ui/fact-row.tsx`, comme le Brief du Master), `factTone`, textes `fr.facts`, action `linkContributorContact`
  (`lib/catalog/master/contact-link-actions.ts`).
- **Depuis le Cadrage intelligent** (§ 6, 06/10/2026) : avant son premier enregistrement,
  le Brief Mix/Master part de l'ingénieur du mix et du mastering choisis au Cadrage (rôles
  tenus par un contact du Réseau) quand les crédits des titres ne le disent pas, et de la
  date du master final (échéance confirmée) (`framing-defaults.ts`). Le Master **se lance
  depuis le Plan du Projet** (§ 6 ter) : layout `master/` verrouillé tant que le plan ne l'a
  pas lancé, sauf s'il avait déjà commencé (Brief ou source confirmée).
- **Un seul fil de retours avec l'ingénieur** (retours du 11/10/2026, PROJ-BUG-08, migration
  `…20261011500201_mix_feedback_flow.sql`) : « Demander une modification » gardait une note que
  l'ingénieur ne lisait jamais (sa page ne montrait que les synthèses envoyées) et obligeait à
  écrire deux fois la même remarque. Désormais, pour une version sans rien de transmis, la
  demande **envoie** la synthèse enregistrée ou, à défaut, sa note, qui **devient** le retour de
  la version (écrite une fois, montrée une fois ; `note_required` si les deux manquent) ; si les
  retours sont déjà partis, la note les **complète**. La page `/m/…` liste **chaque version** de
  l'étape de l'ingénieur (`get_master_transmission` → `versions`) : état (En écoute, Retours
  envoyés, Modification demandée, Mix / Master validé), retours, décision avec date et auteur,
  étape suivante ; le Mix validé ne valide jamais le Master. Elle se **met à jour seule** toutes
  les 30 s quand elle est au premier plan et le dit (`PublicRefresh` : page sans compte, donc
  sans canal Realtime). Un retour de l'équipe porte son **minutage** et sa clé d'idempotence
  (`client_key`, un envoi répété l'ajoute une fois) et dit s'il est parti dans les retours
  transmis ; chaque version reste **écoutable et téléchargeable** (URL signées avec la session,
  les règles du stockage décident). Le **dépôt** de l'ingénieur refuse un fichier dont le format
  ou le nom n'est pas celui d'un fichier audio, avec un message précis
  (`lib/master-workflow/delivery-rules.ts`, mêmes règles en SQL : `master_delivery_name_ok`).
- **Ingénieur du Brief choisi dans tout le Réseau, ou créé sur place** (Sacha, 02/11/2026) :
  « Changer » sur l'ingénieur du mix ou du mastering ouvre `EngineerPickList` : les contacts au
  rôle Ingénieur d'abord (avec ce que PDS a fait avec eux), les membres de PDS (ingénieur maison),
  puis, **dès qu'un nom est tapé**, le reste du Réseau (`networkOthers`, groupe `searchOnly` de
  `PickList`). Un contact choisi pour mixer ou masteriser **reçoit le rôle Ingénieur**
  (`lib/network/add-role.ts`, appelé par `saveBriefFact` avec la session : RLS `manage_network`).
  « Ajouter « X » au Réseau » ouvre la fiche Réseau (`CreateContactDialog`, rôle Ingénieur coché,
  nom tapé repris) puis choisit le nouveau contact. Pas de « Garder seulement le nom » : le
  dossier part vers une fiche avec ses coordonnées.
- **Brief et transmission lisibles** (retours du 11/10/2026, PROJ-UX-08 et PROJ-UX-09, migration
  `…20261011500301_brief_transmission_ux.sql`) : la page du Brief dit **à quoi il sert et ce qu'il
  produit** (le dossier de l'ingénieur), puis cinq sections : **Conditions de prestation**
  (ingénieurs, tarifs, révisions, validateur), **Direction artistique**, **Livrables et formats**
  (`delivery_formats`), **Dates**, **Message** (`engineer_message`, repris dans « Message pour le
  mixeur » / « … l'ingénieur mastering » à la transmission, modifiable). « Enregistrer le Brief »
  n'est actif qu'après une modification (`useFormDirty` compare le formulaire à ce qu'il montrait),
  la dernière mise à jour (date, heure, auteur) est dite à côté, et un bloc **« Étape suivante :
  transmettre le dossier »** dit ce qui manque encore (mêmes blocages que Mixage) et mène à Mixage ;
  une fois le dossier parti, il prévient qu'une modification n'atteint l'ingénieur qu'avec un
  nouvel envoi (décision : le Brief reste modifiable après la transmission, point à confirmer).
  **Transmission** : une **revue avant l'envoi** (`TransmitReview` : destinataire et e-mail, sources
  ou mix finals, stems, dates qui partent, ce que le lien ouvre, pour qui, jusqu'à quand, et que le
  suivant désactive l'ancien) ; un titre sans stems ne part **qu'avec « Envoyer sans stems »**,
  gardé sur l'envoi (`derogations.withoutStems`, vérifié en SQL : `stems_missing`). Le **suivi**
  donne chaque étape du lien à part et datée : **créé**, **envoyé** (« J'ai envoyé le lien » :
  PDS OS n'envoie aucun e-mail), **ouvert** (noté par la page `/m/…`, jamais pris pour une prise en
  charge), **prise en charge confirmée** (action de l'ingénieur, inchangée), **fichier reçu**
  (premier dépôt, `delivered_at` par trigger) ; l'expiration est dite, en alerte à 3 jours ;
  **« Révoquer le lien »** avec sa raison (l'ingénieur lit « désactivé par le label ») ;
  « Relancer » s'appelle **« Renouveler le lien »** (nouveau lien, l'ancien désactivé). Le lien
  n'étant affiché qu'une fois (seul son empreinte est gardée), « Copier » n'existe qu'à la création.
- **Dossier daté et continuité Mixage → Mastering** (retours du 11/10/2026, PROJ-BUG-07 et
  PROJ-BUG-09, migration `…20261011500401_master_link_continuity.sql`) : le dossier de l'ingénieur
  porte **toutes les dates du Brief** (Mix V1, Mix final, Mastering, Master final), la **sortie
  prévue** du projet (`releaseDue`) et les formats, chacune avec son sens, jamais fusionnées ; la
  revue avant l'envoi signale une date déjà passée ou postérieure à la sortie (`dateWarnings`). Une
  date hors d'ordre est dite **sur le champ** qui casse l'ordre, dans le formulaire et au retour du
  serveur (même règle : `calendarOrderErrors`), la saisie gardée. Le nom d'un contact du Réseau est
  « Nom ou nom professionnel » : les nom et prénom civils restent demandés par la fiche de
  renseignements seulement. **Même ingénieur** pour le mix et le mastering (même contact du Réseau,
  jamais un nom semblable) et lien du mix vivant : « Transmettre au mastering » **ajoute le dossier
  au même lien** (`continues_id`, aucun nouveau jeton, durée du lien prolongée), la page montre le
  dossier de mastering et les versions des deux étapes ; un ingénieur **différent** reçoit son propre
  lien, qui ne montre que les versions du mastering. Les dépôts et l'accusé de réception visent
  l'envoi en cours du lien (`master_transmission_current`). « Message pour le mixeur » devient
  « Message pour l'ingénieur mastering » au mastering. La revue liste **les fichiers qui partent**
  (écoute, « Changer »). Côté ingénieur, **choisir n'est pas envoyer** : le fichier attend dans un
  sas (nom, taille, format, écoute, « Remplacer »), « Confirmer l'envoi » le dépose, la base vérifie
  que le fichier stocké a la taille confirmée (`file_mismatch`), et la page dit ce qui est arrivé et
  quand.
- **Partir de la source réelle, master final accessible** (retours du 11/10/2026, PROJ-BUG-06 et
  PROJ-BUG-10, migration `…20261011500501_master_existing_mix_final.sql`, tests
  `master-existing-mix.test.sql`) : l'étape Source commence par **« Où en est le mix de chaque
  titre »** (`MixDiagnosis`, calculé dans `loadStepView`) : Mix à faire, Mix en cours, Mix terminé,
  Master final déjà là ; un **mix déjà au Catalogue** (fichier « Mix » sans version du mixage)
  peut être déclaré mix final par le responsable (`declare_mix_final` : une version du mixage
  validée, même fichier, raison gardée), le titre passe alors au mastering **sans nouveau mixage
  ni stems** ; un titre qui a son mix final ne repart plus dans le dossier du mixeur ; une
  divergence Brief / crédits sur l'ingénieur du mix est signalée, jamais écrasée. **Master final** :
  le fichier est **écoutable et téléchargeable** (URL signées, `AudioFile`), sa **filiation** est
  dite (source confirmée → mix final V… → master final V…), « Rattaché au titre du Catalogue »
  seulement quand le titre est réellement à l'état Master final, puis « Aller à la Distribution ».
  La **Distribution** lit le même `loadFinalView` : le prérequis « Master final » porte le même
  fichier à écouter et télécharger, sans import. Un prérequis du Catalogue (ISRC, crédits, ℗)
  s'ouvre avec `?retour=` (`lib/ui/return-to.ts`, chemin de projet seulement) : la fiche du titre
  affiche « Revenir au projet » (`ReturnBanner`, gardé pour l'onglet en `sessionStorage`, aide de
  navigation, jamais une donnée métier) et « Modifier » ramène à la Préparation une fois enregistré.
- **Pas encore là** : la brique Distribution n'existe pas, ses exigences ne sont pas codées
  en dur (ticket § 14). Le
  Budget à quatre états (Estimé / Proposé / Engagé / Payé) étendra `budget_lines` au lot
  suivant ; le Brief n'en garde que les tarifs estimés.

### Fil avec l'ingénieur (PROJ-AMEL-02, lot 10)

Migration `…20261012101801_engineer_messages`.

- Sur sa page `/m/…` (sans compte), l'ingénieur a un **fil avec le label** et trois actions
  rapides : « Poser une question », « Signaler un retard » (nombre de jours, 1 à 90), « Signaler un
  fichier manquant », ou un message simple (`post_master_engineer_message`, anon, jeton vérifié
  par `open_transmission_of`). Chaque message est daté et rattaché à l'envoi et à son étape
  (Mixage / Mastering) ; l'historique **suit le lien** quand le même ingénieur passe au mastering
  (`master_link_chain`, `get_master_engineer_messages`). Les blocs « Fichiers » et « Brief » de sa
  page se replient avec un résumé (titres, dates), l'état est gardé au rafraîchissement.
- Le chef de projet est notifié (`master_engineer_signal`) **une fois tant qu'il n'a pas lu** :
  pas de rafale. Sous Mixage et Mastering, « Fil avec l'ingénieur » (`EngineerThreadPanel`) :
  répondre (lu par l'ingénieur sur sa page), marquer un signalement traité ou le rouvrir (qui et
  quand gardés). Pour un retard, le code propose les **échéances touchées** du Brief (étape en cours
  et suivantes encore à venir, décalées du retard, `delayImpact`) et dit si le master final passe
  après la sortie ; **rien ne bouge sans « Appliquer ces dates »** (recalculé côté serveur, ordre
  du calendrier vérifié en SQL).

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
  contrôle est non conforme ; les contrôles non vérifiés sont dits, pas bloquants (règle remplacée par la
  recette V1 du 23/10 : voir « Recette Distribution V1 » plus bas).
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
- **Plateformes après une clôture avec réserves** (finitions du 19/10) : l'étape est « Fait » avec la
  marque de réserve, comme le workflow « Terminé » (elle restait « En cours » et proposait encore
  « Déclarer la disponibilité publique ») ; la page est en lecture seule, un bandeau dit que rouvrir
  la clôture relance les vérifications.
- **Statut commun** (`distributionState`, `rules.ts`) : Préparation → Dossier (à soumettre, en
  attente, refusée) → Suivi (dépôt à déclarer — Bloqué si une dépendance manque —, en attente du
  distributeur, corrections) → Plateformes (n sur 5 vérifiées) → Clôture (en attente) → Terminé
  (« Clôturée normalement » ou « Clôturée avec réserves (n) »). Coches : prepare, dossier (version
  validée), tracking (accepté et livré déclarés), online (5 vérifiées), closure.
- Migrations `20261011100101_distribution_dossier` à `…100601_distribution_closure` (7 lots) ;
  tests `supabase/tests/distribution.test.sql` (103, fixture Piégée simulée).

### Distribution sur le patron commun (proto « Projet complet », lot 10, 19/10/2026)

Remplace les cinq onglets ci-dessus (leurs données et fonctions SQL restent). Cahier des charges :
`docs/projet-complet/distribution.md`.

- **Parcours en 7 étapes, 4 sections** (`lib/distribution/journey.ts`, pur ; clés
  `lib/ui/distribution-steps.ts`) : Préparation, Paramètres de distribution, Dossier de livraison
  (Dossier) · Dépôt dans The Orchard, Réponse de The Orchard (Dépôt) · Plateformes (En ligne) ·
  Clôture. Une page par étape sous `/release/<slug>` (`preparation`, `params`, `dossier`,
  `deposit`, `orchard`, `online`, `closure`) + deux vues du pied du parcours (`anomalies`,
  `history`) ; `/release` redirige vers l'étape de la personne, `/release/tracking` vers Dépôt ou
  Réponse. Cadre : `DistributionFrame` (en-tête « Distribution » + statut calculé
  `distributionStatus`, faits « « Projet » · artiste · format · Master final · Sortie ·
  Distributeur », « Qui fait quoi », `NowCard`, `ModuleAttention`) et `DistributionStep`
  (`StepPanel`, « Ce qui viendra » d'une étape verrouillée, blocages et informations notées,
  « Déjà fait » filtré de `distribution_events` par `lib/distribution/step-history.ts`).
  Données d'une requête : `distributionContext` (`lib/distribution/journey-context.ts`, `cache`),
  qui sert aussi le loader `lib/journey/distribution.ts` (`JOURNEY_LOADERS.distribution`) :
  Maintenant, Travail et Validations (acteur `kind: "validate"` pour « Valider la Vn » et
  « Valider la clôture »). Avant « Lancer le plan » : rien (`WorkflowLocked`, statut Non démarré).
  Statuts : Bloqué tant qu'une source manque (Préparation non faite), En attente quand seuls The
  Orchard, la détection ou une validation sont attendus. Les acteurs non-personnes (The Orchard,
  « la détection automatique ») sont des acteurs `viewer: false` d'une étape `waiting`.
- **Sources réelles (D0)** : master final validé dans le Master (`loadFinalView`) ; pochette =
  **livrée par la Production** (`distribution_cover`, SQL invoker : fiche choisie dans les
  paramètres, sinon trouvée par son titre, et `deliverable_deliveries.delivered_at` + n° de version,
  porté dans le dossier pour que « v2 → v3 » se voie dans les écarts) ; emprunts non sécurisés
  (`distribution_legal_blockers`, `security definer`, lisible sans `manage_legal`, ne rend que
  titre et état). **« Prêt pour la sortie » n'est pas recalculé** : la Préparation et le prérequis
  externe de l'étape Dépôt lisent `loadLegalReadiness` (§ 8 sexies) — verdict et validation de la
  direction ; sans `manage_legal`, seule la validation se lit, d'où la fonction des emprunts gardée
  pour le blocage (la readiness juridique lit elle-même `loadDistributionSources`, donc pas
  d'appel inverse dans les sources : il serait circulaire). `submit_distribution_version` refuse
  désormais aussi en SQL un emprunt à sécuriser (`legal_blockers`) et des paramètres non confirmés.
- **Dates** (`lib/projects/dates.ts`, `loadProjectDates`) : la **sortie** = `projects.due_date`
  (saisie au Lancement, confirmée au Cadrage, validée avec son Brief ; source « Projet · Lancement,
  validé par X le jj/mm ») ; `releases.planned_release_date` la suit par déclencheur et n'est plus
  saisie nulle part (le formulaire « Sortie » est retiré). La ligne `releases` est créée **au
  lancement du plan** (déclencheur sur `project_plans`, rattrapage des projets lancés). Le
  **master final** = date du Brief Mix et Master, sinon échéance `master_final` confirmée du
  Cadrage. Seule règle existante entre les deux : une échéance du Cadrage ne peut pas suivre la
  date visée (`lib/framing/conflicts.ts`) ; l'écart « −14 j » du proto n'est pas une règle
  (point à trancher, `docs/CONTEXTE-PROJET.md`). La détection lit l'ISRC du **Catalogue**
  (`lib/release/isrc.ts`), plus celui de la sortie.
- **Gestes groupés** (migrations `20261019100201`, `…100301`) : `confirm_distribution_params`
  (« Confirmer les paramètres » écrit avec la confirmation ce que PDS OS proposait et que personne
  n'a changé : validateur = la direction, jamais le responsable ; précommande = temps fort de la
  Stratégie dont le titre dit pré-save / précommande, sinon « À renseigner » ; refuse un manque ou
  une date ≥ sortie) ; `declare_distribution_answers` (frise de The Orchard en un seul geste, une
  preuve partagée par plusieurs états) ; `attach_distribution_declaration_proof` (preuve ajoutée
  après, jamais remplacée) ; `declare_distribution_corrections` (déclaration + anomalie
  `from_distributor` + version suivante, une transaction) ; `confirm_distribution_platform`
  (« Tout est bon » : lien proposé par la détection ou saisi, disponible et conforme) ;
  `report_distribution_platform_problem` (« Il y a un problème » + anomalie). Chaque Server Action
  passe par `withOutcome` (bandeau « Ensuite / Débloqué » dans l'étape).
- **Notifications** (triggers) : version soumise → validateur, décidée → qui l'a soumise ;
  clôture proposée → validateur, décidée → qui l'a proposée (`distribution_version_*`,
  `distribution_closure_*`, ajoutés par `add_notification_kinds`), ouvertes sur l'étape Dossier
  ou Clôture. « Exporter en PDF » du dossier : `/api/projects/[id]/distribution-dossier`
  (`lib/distribution/dossier-html.ts`, la version décidée ou celle en préparation).
- **Retiré de l'écran** (routes et données gardées) : formulaire « Sortie », carte smartlink (la
  route publique `/l/` reste), rappel « dépôt manuel » répété (seulement à l'étape Dépôt), modales
  par geste. « Lancer la détection maintenant » reste en recours dans l'attente de la détection.
- **UPC** (20/10, `pc/f2-signatures`) : le ticket « Ticket PO — Distribution » ne le place pas ; il est
  donc une ligne des Paramètres de distribution (`UpcField`, `releases.upc`), « Pas encore connu ·
  Attribué par The Orchard au dépôt · ne bloque pas » tant qu'il n'est pas tapé. Contrôlé par le code
  (`lib/distribution/upc.ts` : 12 chiffres UPC-A ou 13 EAN-13, clé de contrôle GS1 ; espaces et tirets
  ignorés), refus en rouge avec sa raison, écrit par le responsable même après la soumission
  (`setReleaseUpc`, RLS `releases_update_owner`), lu par le dossier de livraison (`delivery-file.ts`).
  Un UPC qui arrive après une version validée (« Attribué au dépôt ») n'est pas un écart à la source
  (`snapshotDrift`) ; un UPC changé l'est. Le point « UPC » de la préparation mène aux paramètres.
- Tests : `supabase/tests/distribution.test.sql` (105) et `distribution-journey.test.sql` (35).

### Recette Distribution V1 d'Ibé (23/10/2026, DIST-001 à DIST-007)

Le dernier retour d'Ibé fait foi sur ses tickets précédents. Migrations `20261026200101` à
`…200401`, tests `supabase/tests/distribution-recette.test.sql` (47) ; `distribution.test.sql` (110) et
`distribution-journey.test.sql` (38) adaptés.

- **Garde-fous du dossier (DIST-001)**. *Avant* : « les contrôles non vérifiés sont dits, pas
  bloquants » (ci-dessus), un refus était une note libre, une V(n+1) passait sans la correction
  demandée par The Orchard. *Maintenant* (`submit_distribution_version`, `distribution_submit_blockers`) :
  les six contrôles enregistrés (« Non applicable » compte) ; un **refus nomme ses modules**
  (`distribution_versions.refusal_modules`, « À corriger dans ») et la version suivante est refusée tant
  que les champs de ces modules sont identiques à ceux de la version refusée
  (`distribution_snapshot_fields`, mêmes règles en TS `moduleFields`, l'UPC exclu) ; une **anomalie
  ouverte** (hors « côté distributeur ») bloque tant que son module n'a pas changé depuis la version où
  elle a été trouvée, et passe « en correction » à la soumission qui la corrige. Exception : une
  **dérogation de la direction** (`administer`, `distribution_derogations` : ce qu'elle laisse passer —
  contrôles, refus, anomalies —, risque, motif, échéance ; une seule en attente, la suivante remplace),
  consommée par la soumission et lue par le validateur sur la version (`derogation_id`). La **validation
  revérifie** les six contrôles (sauf dérogation « contrôles »). Le validateur enregistre les contrôles
  restants pendant que la version attend. L'instantané reste construit par le serveur (action) : la RPC
  est appelable par le responsable avec un autre instantané, il ne tromperait que son propre audit.
- **Contrôles par version (DIST-006)** : `distribution_checks.version_number` (« pour la V2 ») ; un
  refus ou une correction ne remet à « non vérifié » que les contrôles des modules concernés
  (`distribution_module_checks` : Catalogue → identité, identifiants ; Master → audio ; Juridique →
  droits ; Conception → visuel ; Projet → calendrier ; paramètres → droits, calendrier), avec l'ancien
  résultat dans l'historique (`checks.reset`). Écart à la version refusée affiché comme à la version
  remplacée.
- **Clôture (DIST-003)**. *Avant* (ticket § 10, exemple Piégée) : avec réserves dès le dépôt, décidée
  par le validateur. *Maintenant* : avec réserves seulement une fois **acceptée** par The Orchard
  (`distribution_accepted`) ; avant, **décision de la direction** pour une raison typée
  (`reason_kind` : sortie annulée, retrait de l'artiste, droits, refus du distributeur, décision
  exceptionnelle, autre) : clôture anticipée avec réserves (`early`), **Annulée** ou **Abandonnée**
  (genres distincts), décidées par un détenteur d'`administer`. Avant le dépôt, arrêter une sortie reste
  l'affaire du projet (archivage).
- **Réserves suivies (DIST-007)** : chaque réserve proposée porte criticité (proposée par le code selon
  sa cause, modifiable), responsable (un membre, le responsable du projet proposé), échéance à venir,
  preuve attendue (proposée selon la cause) ; à la décision elles deviennent `distribution_reserves`
  (ouverte → levée demandée → levée). Lever = une preuve (fichier ou lien) par le responsable de la
  réserve ou du projet, **confirmée par une autre personne** (responsable, validateur ou direction).
  Réserve échue : `flag_overdue_distribution_reserves` (service role, appelé par le cron quotidien
  `detect-releases`) la marque, un déclencheur prévient son responsable et le décideur. Tant qu'une
  réserve est ouverte, l'étape Clôture est « à reprendre » (ambre) et le workflow « En cours », jamais
  « Terminé » en vert.
- **Déclarations (DIST-004)** : pas de badge « Simulation » — ce sont les déclarations manuelles
  voulues (§ 7, CA07) ; chacune porte sa **source** (portail The Orchard, e-mail de The Orchard, autre
  e-mail, appel, autre ; portail proposé pour le dépôt) et les dates suivent la frise (dépôt pas avant
  la validation, réception ≤ acceptation ≤ livraison ≤ disponibilité ; `date_order`).
- **Plateformes (DIST-005)** : « Tout est bon » exige le **territoire constaté**, le **jour** et une
  **preuve** (capture dans `distribution-proofs` ou lien) ; une **indisponibilité** dit l'action, le
  responsable et l'échéance (sur l'anomalie). Une plateforme non conforme ne compte plus comme vérifiée
  (`availabilityOf`). `verify_distribution_platform` (sans preuve) n'est plus appelable. Le validateur
  et le responsable d'une réserve peuvent déposer une preuve (`can_write_distribution_proof`).
- **Disponibilité publique (DIST-002)** : informative, la vérification plateforme par plateforme fait
  foi ; le texte ne dit plus « pas encore déclarée » quand les cinq sont vérifiées.

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

### Production du proto « Projet complet » (lot 5, 19/10/2026)

Cahier des charges : `docs/projet-complet/production.md` (sous-lots PR-0 à PR-13).

- **Entrée** : plus de liste ni d'étape `production` à démarrer ou faire valider par le DG. Un livrable est
  en Production dès le transfert de sa fiche (`design_handoffs`, lot 4 ; projets d'avant : version validée).
  `/production` ouvre le livrable où le visiteur a une action, sinon le premier ; chaque page de livrable a la
  **barre des livrables** (`DeliverableBar` → `PickBar`), à part du parcours. `lib/journey/production.ts`
  (`productionDeliverables`, `productionJourneys`) remplit la part Production du loader Marketing.
- **Parcours** (`lib/production/journey/steps.ts`) : « Qui produit ? » seul tant qu'il n'est pas répondu ;
  externe = Qui produit ? → Call de production (ou Préparation avec PO / Organisation importée, selon
  `production_sheets.mode`) → Devis → Proposition de réalisation → Préproduction (après le devis, en
  parallèle) → Lieux → Contrôle avant tournage (devis + proposition + lieux) → Tournage → **Rushes** →
  Montage et retours → Livraison et clôture. Interne : l'app riche des tickets PROD-001 à 040, titres alignés
  (Brief réalisateur, Équipes et matériel, Devis et budget, Versions). Rôles en `roles` (Exécute / Coordonne
  / Valide). « À revoir » (`rework`) calculé : révision du devis, nouvelle version de proposition demandée,
  tâche de checklist « À revoir » ouverte. Chaque étape passe par `ProductionStepPanel` (blocages,
  informations notées, « Signaler un blocage » / « Noter une information »).
- **Qui produit ?** (`WhoProducesForm`, `chooseProducer`) : externe / interne (`ChoiceCards variant="list"`),
  sociétés du Réseau classées par le code (`companyOptions` : a produit pour le même artiste, sinon le plus
  de livrables, sinon sa note, sinon « n'a jamais travaillé avec PDS »), « Créer la fiche d'une société »,
  mode de préparation ; ouvre la fiche (`open_production_sheet`, qui démarre l'étape Production) et garde
  les rôles déjà donnés (validation budgétaire par défaut : le premier validateur). **Changer qui produit**
  (`change_production_producer`, table `production_organization_changes`) : motif obligatoire, déjà fait
  et repris gardés, lien de l'ancienne société révocable ; rien n'est supprimé.
- **Qui fait quoi** (`ProductionWhoDoesWhatButton` dans l'en-tête) : rôles du proto, « Changer » (le
  responsable du projet, `changeProductionRole`), « Révoquer » un lien (`revoke_production_provider_link`).
- **Call de production** : formulaire commun dans l'étape (externe : quatre points fixes, la société invitée
  sur son lien privé), call prévu, compte rendu par point (`MeetingFacts`, états des lignes lus des
  `production_call_items`), propositions puis tâches, résumé aux participants (la société le lit sur son
  lien, `get_production_link_journey.calls`).
- **Réalisateur** : proposé par la société sur son lien (`production_director_proposals`,
  `propose_production_director_by_link`), « Retenir » (`retain_production_director` : fiche Réseau, rôle
  Réalisation, lien privé montré une fois), les autres « Non retenu ».
- **Devis en versions** (`production_quotes.number`, `loc_budget_cents`, statuts `changes` / `replaced`) :
  « Demander une modification » (vérification ou décision, `request_production_quote_changes`), référence
  active = dernière version validée, « Demander une révision du devis » (`request_production_quote_revision`,
  colonnes `quote_revision_*`). Échéance du dépôt lue de la tâche « devis » de la société.
- **Préproduction** : checklist (`production_plan_actions` + `origin`, `done_at`, `review`) amorcée par la
  validation du devis (`production_seed_checklist`, échéances depuis le jour de tournage), tâches ajoutées
  (`add_production_checklist_task`, « Saisie par … »), « Fait » dans l'étape (`finish_production_action`,
  la tâche de Travail suit) et sur le lien (`finish_production_action_by_link`). `company_progress` repris.
- **Lieux** : tarif × jours de tournage comparé au « dont lieux » du devis actif (`placeFit`) ; « Remplacer le
  lieu retenu » (`replace_production_location`, `production_location_decisions`) : motif, informations liées
  décidées, « Ce qu'il faut revoir » → tâches d'origine « Changement de lieu du … », révision du devis et
  nouvelle version de proposition demandées. « Retenir ce lieu » garde son comportement (PROD-013).
- **Contrôle avant tournage (externe)** : synthèse calculée côté serveur (`readySynthesis`), confirmation
  avec motif si des lignes ne sont pas prêtes (`confirm_production_ready`), synthèse figée
  (`ready_snapshot`), lue « Préparation validée » sur le lien. L'interne garde ses contrôles sur preuves.
- **Après tournage (externe)** : « Confirmer que le tournage a eu lieu » ; étape Rushes : lien déposé par la
  société (`set_production_rushes_by_link`), réception et sauvegarde déclarées à part.
- Migrations `20261019050101` à `20261019050801`, tests `production-projet-complet.test.sql`.

### Ce qui restait de la Production (20/10/2026, branche `pc/r2-production`)

Décisions métier : `docs/PRODUCTION-METIER.md` § 12. Migrations `20261020020101` à `20261020020501`,
pgTAP `production-reste.test.sql`.

- **Proposition en versions** (`production_direction_versions`, `lib/production/proposal/`,
  `components/production/proposal/`) : `deposit_production_direction_version` (app) et
  `deposit_production_direction_by_link` (réalisateur), `decide_production_direction_version` (interne) et
  `decide_production_direction_by_link` (externe), `request_production_direction_version` ; la retenue =
  la dernière validée des deux côtés (`production_direction_retained`), `direction_status` de la fiche suit
  (`production_direction_sync`) pour les lecteurs d'avant. Parcours : `proposalState` (dépôt ouvert, attente
  interne / externe, « À revoir »).
- **Validation créative externe** : `production_sheets.creative_ext_contact_id`, rôle `creativeExt` de
  `production_link_roles` (lien privé), `set_production_creative_ext` (« Qui fait quoi », `RoleChangeButton`
  role `creativeExt`). Versions du montage : `int_approved_*`, `ext_status` sur `production_versions`
  (ouvert à la soumission par `production_version_ext_open`), `decide_production_version` ne fait plus que
  la moitié interne quand l'externe est attendue, `production_version_finalize` approuve quand les deux y
  sont ; `decide_production_version_by_link`.
- **Parcours légers** (`lib/production/track.ts` `trackOf`, `lib/production/light/`,
  `components/production/light/`) : étapes `post` (Versions), `control` (nouvelle route), `delivery` ;
  `production_sheets.derived_from_sheet_id` + `set_production_derived` (les teasers suivent le clip,
  trigger `production_derived_follow`), `deposit_production_light_version(_by_link)` (dimensions
  `image_width/height`), `decide_production_light_version`, `confirm_production_light_check`
  (`production_cover_conforms`), `coverChecks` côté code.
- **Montage et livraison externes** : dépôt par le lien sans étape de post (le lien de la seule validation
  externe ne dépose rien), `set_production_final_by_link`, `production_link_cut` (versions, fichier final,
  livraison lus sur le lien : `linkCutCards`) ; `deliver_production` + `production_delivery_recipients`
  (`DeliverForm`, `recipientOptions`) pour tout livrable.
- **Date et horaires** : `production_schedule_decisions`, `decide_production_schedule` (tâche « À revoir »,
  `schedule_changed_at`), `confirm_production_ready` accepte une nouvelle confirmation après un changement
  de date ; `ScheduleButton` sur la ligne « Date et horaires » de la synthèse (`ReadySynthesisTable actions`).
- **Piège corrigé** : `production_recheck` (déclenché par toute écriture sur `production_sheets`) effaçait
  `ready_at` d'une production externe, dont les contrôles sur preuves ne sont jamais confirmés ; il ne
  vise plus que l'interne (`20261020020501`).
- Notifications ajoutées : `production_version_decided`, `production_final_deposited`,
  `production_delivered`, `production_schedule_changed`.
- **Rejoué dans l'app (20/10, `pc/f2-signatures`)** : contrôle point par point des exports (PROD-037,
  « Revérifier » → un point « Non conforme » sans raison refusé en rouge, avec raison : la ligne passe
  « Non conforme », contrôle et livraison défaits par `b_stamp` ; « Conforme » → « Exports contrôlés »
  → « Confirmer la livraison » → transmission → clôture) ; « Signaler un blocage » dans une étape
  (Contrôle technique des teasers : trois champs obligatoires en rouge, « Dario Test » choisi, notifié
  `step_blocker_reported`, pastille « 1 blocage », icône sur l'étape, « Lever le blocage » avec ce qui
  l'a réglé). Lieu non vérifié (PROD-013) : « À vérifier avant de le retenir » sur la carte du
  candidat, « Retenir ce lieu » refusé en rouge avec comment le vérifier (la base le refuse aussi).

### Recette Marketing V1 du 23/10/2026 : Production et Stratégie (MKT-PROD-001/002, PROD-001, CONC-001, MKT-STR-*)

Règles métier : `docs/PRODUCTION-METIER.md` § 8 bis (fin) et `docs/VISION-UX.md` règle 14. Migration
`20261026300101_production_ready_reopen_derogation.sql`, pgTAP `production-ready-recette.test.sql`
(`production-projet-complet` et `production-reste` adaptés : un point critique ne se force plus seul, un
changement de date rouvre la préparation).

- **Réouverture** (MKT-PROD-001) : trigger `e_ready_reopen` (`production_ready_reopen`) sur
  `production_sheets` : `location_name`, `schedule_changed_at`, `quote_revision_at` ou
  `direction_revision_at` changés alors que `ready_at` (ou une demande) est posé et que le tournage n'a
  pas commencé → `ready_at` et la demande effacés, `ready_reopened_at` / `ready_reopened_because`
  (`place`, `date`, `quote`, `direction`). Le tournage, gardé sur `ready_at` (`production_shoots_check`),
  attend donc un nouveau contrôle. L'ancien « date changée après la confirmation = à revoir » calculé
  (`scheduleChangedAt >= readyAt`, parcours et page) est retiré. Piège de test : dans une transaction,
  `now()` est constant ; deux changements de date successifs ont la même valeur et ne se voient pas
  (le test recule le premier d'une heure).
- **Dérogation** (MKT-PROD-002) : `confirm_production_ready(p_sheet_id, p_snapshot, p_force_reason,
  p_plan default null)` renvoie `ready` ou `requested` ; la gravité vient de la clé
  (`production_ready_critical`, même liste que `isCriticalReadyKey` de `lib/production/ready-rows.ts`) ;
  une ligne critique pas prête demande `p_plan` (`plan_required`, `plan_due_past`,
  `plan_person_invalid`) et range la demande (`ready_request_*`). `decide_production_ready(p_sheet_id,
  p_approve, p_reason)` : direction (`administer`) ou `quote_validator_person_id`, jamais le demandeur
  (`same_person`), refus motivé ; validée : `ready_*` posés, `ready_approved_by/at`, une tâche
  `production_plan_actions` par ligne du plan (`review`, `due_date`, origine « Dérogation du … »).
- **Synthèse revérifiée en base** (audit du 28/10, migration `20261028000601`) : `confirm_production_ready`
  exige les sept lignes critiques dans `p_snapshot` et refuse (`ready_snapshot_stale`) toute ligne dite
  prête que `production_ready_unmet(sheet)` sait non prête : lieu choisi, date décidée en vigueur,
  check-list `checklist_crew|schedule|gear` faite (ou sa tâche), devis approuvé le plus récent sans
  révision, proposition retenue la plus récente (ou direction approuvée) sans révision, aucun blocage
  Production ouvert. Jamais plus sévère que `readySynthesis` (notes et adéquation lieu/devis restent au
  code). Message « rechargez la page ». Tests : fixture `pg_temp.make_ready` + `pg_temp.ready_rows`.
  Notifications `production_ready_requested` (direction et validateur des devis) et
  `production_ready_decided`. Écran : `ReadyConfirmForm` + `ReadyPlanFields`, `ReadyRequestView` +
  `ReadyDecision`, gravité dans `ReadySynthesisTable` ; parcours : l'étape « Contrôle avant tournage »
  attend le validateur des devis (`readyRequested`, geste « validate », donc dans Validations).
- **CONC-001** : `components/ui/input.tsx` pose `data-empty` sur un champ date ou heure vide ;
  `app/globals.css` cache son dessin hors focus (`::-webkit-datetime-edit { opacity: 0 }` — la couleur
  transparente ne suffit pas sous WebKit, vérifié en Playwright WebKit). **PROD-001** : `required` sur les
  deux `ChoiceCards` de `WhoProducesForm`.
- **Stratégie (reliquats)** : `fieldItem` retombe sur `choicesItem` (réponse seulement cochée →
  phrase de `composeAnswer`, gardée ; `loadDimensionSources` lit aussi les `*_choices`) ; Brief V1 :
  `budget.lines` / `budget.envelopeToConfirm` (facultatifs, versions anciennes sans) → « Aucune dépense
  estimée », « sur … à confirmer » ; `StrategyBudget.restCents` = enveloppe − proposé − à arbitrer (lignes
  d'un levier écarté exclues), utilisé pour le dépassement par `arbitrations`, `dimensions.ts` et le
  Brief figé ; `arbitrations` et `strategyModel.openPoints` disent un temps fort déjà passé et une
  dépendance juridique bloquée (critique) ou sans échéance ; parties vides du récit non imprimées ;
  exemple unique du champ KPI.

### Retours d'Ibé du 13/10/2026 sur la Production (PROD-001 à PROD-040)

Référence métier et questions ouvertes : `docs/PRODUCTION-METIER.md`. Branche `feat/production-ibe`.

- **Prochaine action d'une fiche** (PROD-001, PROD-007 ; `lib/production/next/`,
  `ProductionNextStep`) : sous l'en-tête de chaque onglet, une seule action — titre, pourquoi, qui
  est attendu (« C'est à vous » ou « Attendu : Maël (chef de projet) »), ce qui manque encore, un
  lien vers l'endroit où elle se fait (« Ouvre : … ») et la dernière étape franchie. Calculée par le
  code dans l'ordre du workflow (`compute.ts` → `preproduction.ts`, `shoot-post.ts`,
  `delivery.ts`) : brief du réalisateur, call technique (tant qu'il n'y a ni call ni matériel), puis
  le travail derrière chaque contrôle avant tournage dans l'ordre (un contrôle dont le travail
  existe est à confirmer par une personne), « prête », lancer puis finir le tournage, rushes,
  incidents bloquants, étapes de post confiées, une décision par version, fichiers attendus,
  contrôle, livraison, transmission. Une action d'un autre se lit « En attente » avec qui et
  pourquoi. Seules les données de la phase atteinte sont lues, **une fois par requête** pour la mise
  en page et l'onglet (`lib/production/tab-data.ts`, `cache`). Décision faute de règle : le call
  technique n'est demandé que si aucun matériel n'est encore saisi (une petite production s'en
  passe) ; « Feuille de service » compte comme travaillée dès que l'heure de convocation est écrite.
  L'échéance affichée est la date du rétroplanning de l'étape (en rouge si elle est passée).

- **Cycle de version** (PROD-029 à PROD-033, migration `20261014000101_production_version_cycle.sql`,
  tests `production-version-cycle.test.sql`) : numéro donné par la base seule (le champ libellé
  a disparu du formulaire, un ancien libellé reste affiché), chaque version **suit** la précédente
  (`previous_version_id`, jamais déplacée). **Une seule soumission** (« Soumettre aux retours »,
  les validateurs — responsable et directeurs créatifs — sont notifiés
  `production_version_submitted`), puis **une seule décision** sur la version en revue, nommant
  qui décide : valider (ouvre la livraison), demander des corrections, refuser (motif).
  `final_review` n'est plus produit (lu comme « En revue »). **Demande de corrections**
  (`production_correction_requests`, une par version, `request_production_corrections`) : les
  retours ouverts gardés (tous cochés, un doublon décoché reste sur la version), **un destinataire**
  (membre ou contact du Réseau), **une échéance** (pas dans le passé), un message ; états
  brouillon → transmise → consultée → traitée. PDS OS n'envoie pas d'e-mail : « Copier et marquer
  transmise » copie le texte (`requestText`) puis `send_production_corrections` (un membre est
  notifié `production_corrections_sent`) ; « Relancer » compte une relance sur la même demande ;
  « Réaffecter » (`update_production_corrections`) ne la duplique jamais. Soumettre la version
  suivante marque traitées les demandes des versions précédentes ; la nouvelle carte affiche les
  corrections demandées sur la précédente, à vérifier une à une. Les versions précédentes sont
  repliées sous la version en cours. Proposé par le code : l'intervenant de l'étape « Montage »
  comme auteur et destinataire, sa date de fin comme échéance. « Consultée » sera écrit par la page
  du prestataire (lot 3).

- **Espace du prestataire** (PROD-026, 028, 031, 032, 036 ; migration
  `20261014000201_production_provider_links.sql`, tests `production-provider-space.test.sql`) : un
  intervenant du Réseau (sans compte, `docs/PRODUCTION-METIER.md` § 2 bis) reçoit un **lien privé**
  `/p/[token]` (hors session, `SESSIONLESS_PREFIXES`, jamais indexé), créé par le responsable depuis
  son étape de postproduction ou sa demande de corrections (`create_production_provider_link` : il
  doit tenir une étape ou une demande du livrable ; seul le SHA-256 est gardé, lien montré une fois
  par `OneTimeLinksProvider`, un nouveau lien remplace l'ancien, durée 60 jours après la fin de ses
  étapes, entre 30 et 180). Sa page (`get_production_provider_space`) : sa mission (ses étapes,
  dates, attendus, accès), les corrections qui lui sont adressées (les demandes transmises), le dépôt
  d'une version, les versions soumises, les **fichiers attendus** et les références — jamais le
  budget, les contacts ni les demandes d'un autre. L'ouvrir passe ses demandes « Consultée »
  (`note_production_provider_opened`). **Dépôt d'une version** (`deposit_production_version`) : un lien
  https ou un fichier envoyé par le navigateur sur un emplacement à usage unique du bucket
  `production-files` (`open_production_provider_slot`, une heure, 20 par heure, politique Storage
  `is_open_production_slot`, comme le mixeur) ; la version est numérotée, signée de lui et **soumise
  aussitôt** (validateurs notifiés, demandes traitées). **Dépôt d'un export attendu**
  (`deposit_production_export`) : le lien de la ligne, son contrôle remis à zéro, le responsable
  notifié (`production_export_deposited`). Tout dépôt est refusé hors de l'étape Production en cours.
  La prochaine action propose « Envoyer à X son lien de prestataire » quand l'intervenant du montage
  n'en a pas.

- **Call technique fiable et compte rendu en actions** (PROD-004, PROD-005, migration
  `20261014000301_production_call_reliability.sql`) : le call créé depuis la Préparation ou la
  Préproduction a une **heure de fin** (minutes de l'ordre du jour, une heure sinon) comme tout call
  planifié, et les **membres de l'équipe gardés comme participants sont invités** (notifiés,
  `inviteProjectTeam`, comme la Stratégie) ; une erreur d'enregistrement est journalisée et montrée,
  jamais un faux succès. Sur chaque action du compte rendu : **« Planifier »** (« Confirmer et
  planifier » pour une proposition de PO) — qui (membre ou contact du Réseau, requis) et pour quand
  (requis) ; l'action entre au plan **approuvée** et, confiée à un membre, devient **une tâche du
  Travail** (`planCallAction` : une action par point, une tâche par action, jamais en double). La
  prochaine action de la fiche demande d'abord de relire les propositions du compte rendu, puis de
  planifier ses actions. Décision faute de règle : PO ne devine ni le responsable ni l'échéance d'une
  action (une personne les choisit) ; la cause exacte de l'échec vécu par Ibé n'a pas pu être rejouée
  (pas de session navigateur la nuit du 14/10) : à revérifier par l'équipe.

- **Historique de la fiche** (PROD-002, PROD-008 ; migration `20261014000401_production_events.sql`,
  tests `production-events.test.sql`) : `production_events`, écrit par **déclencheurs seuls**
  (`production_log`), jamais modifié ni supprimé : versions (dépôt, statut), demandes de corrections
  (destinataire, échéance, statut, relance), actions du plan (statut, responsable, échéance),
  contrôles avant tournage (confirmé, requis), fiche (dates et enveloppe, lieu, « prête »), état du
  tournage, exports (lien, contrôle), étapes de post (intervenant, statut), liens prestataires,
  décisions de livraison — avec l'avant, l'après et la personne (aucune = le prestataire par son
  lien, ou la base). Onglet **Historique** (`/history`) : une phrase par événement écrite par le
  code (`lib/production/history-text.ts`), groupée par jour (`DayGroups`).
- **Dates et enveloppe** (PROD-009) : chaque valeur dit son statut — « Proposée par la Fiche
  Livrable, à confirmer », « Confirmée en Production », « À renseigner » — et qui la confirme (le
  chef de projet, nommé) ; le formulaire **reprend les valeurs de la Fiche** (enregistrer les
  confirme), un changement sur une fiche prête pour tournage avertit de son impact, et l'Historique
  garde chaque modification.
- **Formulaire d'étape** (PROD-027) : « Ce qui est attendu » proposé selon l'étape (modifiable,
  remplacé si l'étape change tant qu'il n'a pas été touché), « Accès aux fichiers » expliqué, le
  statut n'est demandé qu'une fois l'étape créée.

- **Plan proposé et rétroplanning recalculé** (PROD-006, PROD-010 ; migration
  `20261014000501_production_plan_template.sql`) : « Proposer un plan » crée en **brouillon** les étapes
  habituelles d'un tournage (`lib/production/preprod/plan-template.ts` : brief du réalisateur, call
  technique, lieu, autorisations, équipe, prise de son directe si le brief la prévoit, devis,
  location, feuille de service, contrôle avant tournage, sauvegarde des rushes), chacune avec son
  **échéance du rétroplanning** (`dueByStep`), ses **dépendances** et un responsable proposé (le
  réalisateur pour son brief, sinon le chef de projet). Une date déjà passée n'est jamais posée en
  silence : l'action arrive sans échéance, avec une note. `template_key` (unique par fiche) empêche de
  proposer deux fois la même étape. Quand les dates de tournage ou de livraison changent,
  « Recalculer N échéances » montre chaque échéance qui bouge (avant → après) et n'applique qu'après
  confirmation ; une action retirée ou dont la tâche est faite ne bouge pas, une tâche déjà créée
  garde sa date dans le Travail. La prochaine action propose le plan s'il n'existe pas, puis
  l'approbation de ses brouillons.

- **Contrôles qui ne mentent pas, lancement du tournage** (PROD-008, PROD-017, PROD-018 ; migration
  `20261014000601_production_readiness_evidence.sql`, tests `production-readiness.test.sql`).
  Prérequis de chaque contrôle (`production_check_evidence`, documentés ici) : **Lieu** = lieu
  « Confirmé » ; **Équipe** = au moins un poste, chaque poste tenu autant de fois que son nombre et
  aucune disponibilité « à confirmer » ; **Matériel** = au moins une ligne et toutes réservées ou
  au-delà ; **Planning** = date de tournage saisie en Production ; **Budget** = enveloppe, aucun
  poste à arbitrer, somme des montants dans l'enveloppe ; **Feuille de service** = heure de
  convocation écrite ; **Autorisations** et **Sauvegarde prévue** (nouveau contrôle, requis) = une
  preuve écrite. Confirmer sans ces prérequis est refusé (`evidence_missing`, `proof_required`) :
  il reste **« Déroger »** (`derogate_production_check`, motif obligatoire, auteur et date gardés et
  affichés en orange, dans l'Historique). Chaque contrôle a son **responsable**
  (`assign_production_check`, chef de projet par défaut). Quand les données d'un contrôle changent
  (lieu, date, enveloppe, postes, affectations, matériel, budget, feuille de service), les déclencheurs
  `z_recheck` le **rouvrent** (sauf dérogation) et retirent « Prête pour tournage » si un contrôle
  requis s'ouvre. **« Lancer le tournage »** n'apparaît que sur une fiche prête : le tournage passe
  « En cours » (qui et quand dans l'Historique), les membres qui tiennent un poste sont notifiés
  (`production_shoot_started`), et l'onglet Tournage montre **« Le jour du tournage »** (convocation,
  horaires, lieu, accès, contacts, urgences, équipe, actions bloquantes ouvertes, incidents), tout lu
  dans la préparation.

- **Recherche de lieux** (PROD-011, 012, 013 ; migration `20261014000701_production_locations.sql`,
  tests `production-locations.test.sql` ; `lib/production/locations/`, `components/production/locations/`) :
  sous « Lieu » (le lieu retenu, sur la fiche), **plusieurs lieux candidats**
  (`production_location_options` : adresse, lien, contact, tarif, disponibilités, contraintes,
  **vérification distincte de la décision**) avec leurs **médias** (fichier `production-files` de type
  `location` ou lien), le **tableau** de cartes (photo, faits, ce qui manque) et un tableau de
  **comparaison**. **Personnes consultées** (`production_location_consults`, membre ou contact du
  Réseau, rôle : avis artistique / technique / faisabilité-coût-autorisations), qui a répondu et qui
  est attendu. Un **avis** (`review_production_location`, ou `…_by_link` depuis la page du prestataire
  `/p/…`, qui reçoit aussi « Lieux à comparer ») — favorable, avec réserves ou défavorable, motivé
  sinon — est rattaché au lieu et à son auteur, sans jamais modifier le lieu. **Décision** du chef de
  projet : « Retenir ce lieu » (vérifié d'abord, motif facultatif ; le lieu passe sur la fiche
  « Confirmé », un ancien choix revient candidat et le contrôle « Lieu » se rouvre — la feuille de
  service lit le lieu de la fiche) ou « Écarter » (motif obligatoire, gardé avec ses avis,
  « Remettre en candidat »). Tout est dans l'Historique.

- **Devis lus par PO, matériel suivi jusqu'au retour** (PROD-014, 015, 022 ; migration
  `20261014000801_production_equipment_tracking.sql`, tests `production-equipment.test.sql`).
  **« Lire avec PO »** sur un devis de « Devis et captures » (`actions-quote-import.ts`) : un PDF est lu
  comme texte (`sourceText`, unpdf), une image comme image ; le modèle (`lib/ai/llm.ts`, consignes
  `production-quote.ts`, le devis en message utilisateur, jamais en consigne) relève loueur, caution,
  conditions, taxes et lignes avec leur passage ; **le code** (`quote-verify.ts`) ne garde une ligne
  que si son passage est dans le devis et un montant ou une quantité que si ses chiffres y figurent ;
  lu sur une image, rien n'est vérifiable : chaque ligne est « à vérifier ». La personne corrige,
  décoche, puis « Ajouter au matériel » : lignes « À vérifier », reliées au devis, une ligne existante
  (même catégorie et libellé) **mise à jour, jamais doublée**, la caution sur la première ligne. Le
  matériel gagne **« Sur place »** (Réservé → Récupéré → Sur place → À rendre → Rendu), une
  **provenance** (loué, prêté, possédé : un article possédé n'entre ni au contrôle « Matériel » ni au
  retour) et la **quantité reçue** (écart signalé) ; un incident de retour dit **manquant ou
  endommagé**. Décision faute de règle : PO ne pose aucune date de location (les dates restent à
  saisir), et le total du devis n'est jamais recalculé.

- **Feuille de service diffusée** (PROD-016 ; migration `20261014000901_production_call_sheet_versions.sql`,
  tests `production-call-sheet.test.sql`) : la feuille est **composée par le code**
  (`call-sheet-snapshot.ts` : projet, livrable, chef de projet, date de tournage, lieu et accès,
  équipe avec téléphone et e-mail du Réseau, matériel réservé, horaires, séquences, consignes,
  contacts, urgences, documents) ; **ce qui manque** est dit avant de diffuser (date, lieu confirmé,
  convocation, équipe, disponibilités, urgences) sans bloquer. **« Diffuser la Vn »**
  (`publish_production_call_sheet`) fige une **version datée et numérotée** (gardée), notifie les
  membres qui tiennent un poste (`production_call_sheet_published`) et entre à l'Historique ;
  « Modifiée depuis la dernière diffusion » s'affiche quand le contenu actuel diffère de la dernière
  version (comparaison canonique, `sameContent`). **« Lien de la feuille »** : un lien stable par fiche
  (`/fs/[token]`, hors session, seul le hash gardé, un nouveau lien remplace l'ancien), qui montre
  toujours la dernière version et dit laquelle ; l'e-mail prêt vise les adresses connues de l'équipe.

- **Tournage suivi** (PROD-019 à PROD-024 ; migration `20261014001001_production_shoot_followup.sql`,
  tests `production-shoot-followup.test.sql`) : début et fin du tournage **horodatés par la base**
  (`started_at`, `ended_at`) ; « Reporté » exige la **nouvelle date**, écrite sur la fiche (les
  contrôles qui en dépendent se rouvrent). Rushes : **qui les récupère**, **qui vérifie la
  sauvegarde**, emplacement principal et **emplacement de sauvegarde**, **autres médias** déclarés à
  part (qui et quand). Incidents : **catégorie** (matériel, équipe, lieu, météo, technique, autre) et
  **domaines touchés** (sécurité, planning, budget, qualité, livrables) ; sans domaine coché, c'est un
  « simple fait » que « Clore sans suite » clôt sans tâche. Le compte rendu montre début et fin et est
  **figé à sa validation** (`report_snapshot`, effacé si la validation est retirée). Postproduction :
  **« Créer les N étapes proposées »** crée d'un coup les étapes adaptées au brief et à la Fiche, avec
  « ce qui est attendu » prérempli, personne affecté par défaut ; la prochaine action y mène quand les
  rushes sont déclarés et qu'aucun incident ne bloque.

- **Missions de postproduction et références** (PROD-025, 026, 034 ; migration
  `20261014001101_production_post_missions.sql`, tests `production-post-missions.test.sql`) : chaque
  étape affiche ses **entrées**, ce qu'elle **attend** (« Après : Montage », `STEP_AFTER`) et ce qui est
  attendu d'elle ; elle **ne démarre pas sans intervenant** (`step_without_holder`) ; ajout et retrait
  d'étape entrent à l'Historique (pas lors de la suppression d'une fiche entière). Sur son lien,
  l'intervenant déclare **« Mission terminée »** (`finish_production_step_by_link`, son étape seulement),
  le chef de projet est notifié (`production_step_done`). Les références de la postproduction
  reprennent celles de la Fiche **et du Brief créatif** (liens de la Conception, dédoublonnés), chacune
  avec son **origine** ; une référence ajoutée dit qui l'a ajoutée et quand ; retirer une référence de
  travail ne touche jamais la source.
- **Livraison et clôture** (PROD-035 à PROD-040 ; migration
  `20261014001201_production_delivery_closure.sql`, tests `production-delivery-closure.test.sql`) :
  chaque fichier attendu dit **ce qui est attendu** (`spec` : ratio, durée, sous-titres, langue repris
  de la Fiche, « à confirmer » quand elle ne dit rien, `expectedLines`) ; « Ajouter ces fichiers »
  propose ce que la Fiche attend et que la checklist n'a pas, sans jamais doubler une ligne ; ajout,
  retrait et précision entrent à l'Historique. **Chaque dépôt est gardé** (`production_export_files`,
  par déclencheur : qui — un membre, ou le prestataire par son lien — et quand), replié sous la ligne.
  **Contrôle point par point** (`check_production_export`, liste `production_export_points(kind)` =
  `EXPORT_POINTS`) : export = format, codec, ratio, résolution, durée, audio ; sous-titres =
  synchronisation, orthographe, langue ; contrôle qualité = image, son, génériques ; autre =
  conformité. Un point non conforme dit pourquoi ; la ligne n'est conforme que quand tous ses points
  le sont, non conforme dès qu'un point échoue (sa note liste les points), et le prestataire voit les
  points en échec sur son lien ; un nouveau fichier remet les points à contrôler. Les anciens boutons
  « Conforme / Non conforme » ont disparu. **Transmission** (`transmit_production_to_activations`) :
  refusée tant qu'un fichier n'est pas validé et conforme ; elle garde les fichiers et leur `spec`
  (`exports`), et **un responsable Activations** (membre, requis, pré-rempli avec la personne à qui le
  livrable est confié) est notifié `production_handed_off`. **Clôture** (`close_production_sheet`) :
  récapitulatif (validations, contrôle, livraison, fichiers conformes, transmissions), ce qui reste
  ouvert (pas transmis, transmission dépassée, matériel loué ou prêté non rendu, incident bloquant)
  empêche la clôture, en base comme à l'écran ; qui et quand gardés ; ensuite la fiche est **en
  lecture seule dans l'app** (`canOrganize`, `canWriteBrief`) et la prochaine action dit « Production
  terminée ». Décision faute de règle : la clôture fige l'app mais pas les droits SQL (ils sont par
  projet, `production_can_organize`) ; le bouton mène à l'activation créée depuis ce livrable, sinon à
  « Rattacher » des Activations (`#attach`).
- **Préremplissage** (PROD-003, sans migration) : chaque formulaire de la Production part de ce que la
  fiche sait déjà, dit d'où vient la valeur dans l'aide du champ, et reste corrigeable. Étape de
  postproduction neuve : dates de postproduction de la fiche (ou de la Fiche Livrable, « à
  confirmer ») et accès aux fichiers repris de l'emplacement des rushes (`PostScope.stepDefaults`).
  Ligne de budget : choisir d'abord le matériel reprend son libellé, la catégorie Matériel et le prix
  du devis (« Repris du devis de … »). Incident signalé depuis un retour de matériel : catégorie
  Matériel et responsable du retour. Relances du tournage : rushes et sons à la personne responsable
  des rushes, sauvegarde à celle de la sauvegarde, séquences à retourner au réalisateur (membre).
  Feuille de service : une rubrique vide reprend le déroulé et les contraintes du brief de tournage,
  les séquences de la Fiche (`callSheetDefaults`). Fichier final : le lien de la version validée.
  Les dates de la fiche ne sont pas réécrites quand la Fiche change : enregistrer les confirme
  (PROD-009) et un écart est signalé, jamais écrasé. Décisions faute de règle : pas d'intervenant
  proposé pour une étape de post (règle du lot « personne par défaut »), pas d'effectif deviné, pas
  de brief recopié de la Conception (le brief ne la répète pas).
- **Production en parcours** (message d'Ibé du 14/10, `docs/PRODUCTION-METIER.md` § 0 ; migration
  `20261014001401_production_journey.sql`, tests `production-journey.test.sql`) : la fiche d'un
  livrable n'a plus d'onglets mais un **parcours** (`lib/production/journey/` : `steps.ts` pur,
  `load.ts`, `context.ts` mis en cache par requête). Première étape : **interne ou externe** et les
  rôles (`set_production_organization`, propriétaire seul : société, chargé de production,
  validation des devis, réalisateur, chef op ; les fiches ouvertes avant valent interne). Étapes en
  externe : Organisation, Call de présentation, Devis de la société, Proposition de réalisation,
  Préproduction par la société, Lieux, Contrôle avant tournage ; en interne : Organisation,
  Proposition, Call technique, Équipe et matériel, Lieux, Devis et budget, Planning et feuille de
  service, Contrôle ; puis Tournage, Postproduction, Livraison (pages existantes). **Une page par
  étape** (`/production/[id]/<étape>`, pas d'attrape-tout) qui réutilise les sections existantes ;
  `/production/[id]` et l'ancien `/preproduction` redirigent vers l'étape de la personne
  (`landingStep`). États calculés par le code à chaque lecture ; une étape « plus tard » reste
  préparable. **Le chargé de production désigné** organise la Production du projet comme son
  responsable (`production_can_organize`) et, comme le validateur des devis et un chef op membre,
  **voit le projet** (`can_see_project_row`). **Devis** (`production_quotes`) : déposés par la
  société sur son lien ou dans l'app, vérifiés point par point par le chargé de production (montant
  et enveloppe, délai, périmètre : `quoteChecks`), soumis, validés ou refusés avec motif par leur
  validateur seul. **Proposition de réalisation** : envoyée (`submit_production_direction`, ou par
  le lien du réalisateur), validée ou renvoyée par le responsable ou un directeur créatif ; la
  modifier ensuite la remet en brouillon. **Liens privés** : la société dépose son devis, coche
  l'avancement de sa préproduction, propose des lieux ; le réalisateur écrit et envoie sa
  proposition ; le chef op envoie sa liste matériel (lignes « Besoin ») ; chacun voit ses tâches
  (`get_production_link_journey`, **jamais l'enveloppe interne** : retirée le 18/10/2026, migration
  `20261018400101`, test `production-link-confidential.test.sql`, règle 21). Notifications `production_organized`, `production_quote_*`,
  `production_direction_*`. Décisions faute de règle (questions à Ibé) : le validateur des devis est
  proposé à la direction générale ; un chargé de production peut organiser toutes les productions du
  projet (droits par projet, pas par livrable).
- **Bugs du test du 13/10** (BUG-001 à BUG-007 ; migration `20261014001301_production_bug_fixes.sql`,
  tests `production-bug-fixes.test.sql`) : le contrôle « Feuille de service » ne se confirme plus sur
  la seule heure de convocation — il faut aussi les urgences et **une version diffusée** à l'équipe
  (un contrôle déjà confirmé sous l'ancienne règle se rouvre), la ligne dit ce qui manque
  (`callSheetEvidence`) ; « Restent à confirmer : … » nomme les contrôles ouverts. La section Lieu dit
  comment confirmer le lieu et signale une dérogation du contrôle « Lieu » quand le lieu ne l'est pas.
  Devis : l'ancien « Saisir depuis ce devis » (une saisie manuelle qui semblait extraire) devient
  « Saisir à la main » ; « Lire avec PO » ne part qu'une fois par clic, propose « Réessayer » après
  une erreur, et refuse d'emblée un format qu'il ne lit pas (seuls PDF, texte, JPG, PNG, WebP, GIF).
  BUG-005, 006 et 007 étaient déjà couverts (références du Brief, destinataire des corrections,
  prochaine action). BUG-001 (call technique) : création, rattachement et durée vérifiés en base ; le
  parcours dans l'écran n'a pas pu être rejoué (Chrome ne charge pas l'app connectée).

## 8 decies. Marketing : Conception (`/design`, `lib/design/`, `components/design/`)

> **Lot 4 « Projet complet » (19/10/2026) — ce qui suit remplace l'écran décrit plus bas.** La
> Conception est le parcours du proto en six étapes (`lib/design/journey.ts`, `DESIGN_STEPS`) :
> Accueil (`/design/home`), Intentions (`/design/intentions`), Références, Direction artistique,
> Brief créatif, Fiches Livrables — le Brief **avant** les fiches. `/design` envoie à l'étape de la
> personne (`designLanding`) ; `/design/work`, `/design/sheets/[id]`, `/design/decisions/[id]` et
> `/design/versions/[id]` redirigent vers leur étape (ancres `#target-…`, `#sheet-…`,
> `#deliverable-…`). Les onglets (`ConceptionTabs`), le parcours maison (`journey-next`,
> `ConceptionJourney`) et les composants de l'ancien écran sont supprimés.
>
> - **Données d'une requête** : `designJourneyContext` (`lib/design/journey-context.ts`, `cache`) lit
>   `loadConception`, les personnes (`loadDesignPeople`), le départ (`design_workspaces.start_path*`),
>   l'échange créatif (`design_calls` + `call_reports`), les briefs, les fiches (`loadFacts`) et leur
>   état (`phaseOf` → `lib/design/sheet-phase.ts` : Brouillon / En attente de validation /
>   Modifications demandées / Refusée / Validée · Prête pour Production / Transférée, et la version) ;
>   le loader du projet `lib/journey/design.ts` le rend sous le Marketing. Cadre : `DesignStepFrame`.
> - **Statuts** (code, jamais stockés) : Accueil fait = responsable créatif désigné **et** départ
>   direct ou échange tenu ; Intentions = aucune à confirmer et ≥ 1 confirmée (plus de « Confirmer
>   l'ensemble » par le chef de projet ; `design_intent_confirmations` gardée) ; Références = ≥ 1 et
>   aucune à rattacher ; Direction = dernière version validée ; Brief = une version ; Fiches = toutes
>   transférées. L'acteur des Fiches est le premier geste de la personne qui regarde (une fiche
>   chacun), les autres sont listés dans l'étape (`DesignWaits`).
> - **Départ** : `choose_design_start(project, 'direct'|'call'|null)` (propriétaire ; ouvre la
>   Conception ; « Changer » tant qu'aucun échange n'existe ; plus de motif exigé). Désigner le
>   responsable créatif ouvre aussi la Conception (`start_design` puis `assign_design_responsible`).
>   Un livrable ajouté porte `format` et un motif obligatoire (`design_deliverables_reason_check`).
> - **Validation** : la direction du label (titulaires de `validate`) est valideur **par défaut** de la
>   direction et de chaque fiche (`design_default_validators`, appelée par `start_design` et à la
>   création d'une fiche), changeable dans « Qui fait quoi » ; mode `global` par défaut. Une version
>   envoyée « par section » est décidée d'un coup sur toutes ses sections (`decideDesignStep`).
>   Délégations, auto-approbation, réserves, message / échéance : hors écran (tables et fonctions
>   gardées).
> - **Fiches créées par la base** : `design_ensure_sheets` crée une fiche par livrable (série si la
>   quantité > 1, autant d'éléments) à la validation de la Stratégie et à chaque ajout ensuite.
>   Les valeurs sont **proposées par le code** à la lecture (`lib/design/sheet-proposals.ts` :
>   concept ← intention « Ce qu'il raconte » du livrable, sinon la direction ; ton ← direction ;
>   ratios / durée / format ← format écrit en Stratégie ; livraison ← échéance de la Stratégie ou
>   échéance amont « Production terminée » ; montant ← lignes de Budget du livrable, non engagé ;
>   début / fin de postproduction calculés ; « Publié le » ← jalons du livrable) et **écrites avec
>   leur source** (`provenance.<champ>.detail`) quand le responsable soumet (`submitSheetStep`).
>   Champs par format : `lib/design/sheet-model.ts`. Un champ se modifie seul (`saveSheetField`,
>   « Modifié par … ») ; le code refuse des dates qui ne se suivent pas ou une livraison après
>   l'échéance amont (`lib/design/sheet-patch.ts`). Nouvelles colonnes : `design_sheets.file_format`,
>   `new_version_at` (« Modifier (nouvelle version) »), `design_sheet_items.publish_date`.
> - **Transfert** : `handoff_design_sheet` démarre l'étape Production au premier transfert ; un
>   transfert d'une version suivante notifie (`design_sheet_new_version`) le propriétaire, le chargé
>   de production et le réalisateur du livrable. La Conception est **faite quand toutes les fiches sont
>   transférées** (`design_is_done`, lu par `loadWorkflowStates` et les pilules) : son étape n'est
>   plus validée en bloc, « Valider la conception », la clôture, « Passer en Production » et la
>   réouverture quittent l'écran (fonctions gardées). La page Production ne propose plus « Démarrer ».
> - **Références** : sortes et droits du proto (`proposal`, `work_version`, `internal`, `to_check`
>   ajoutés, anciennes valeurs gardées) ; ajout et rattachement en place ; « Chercher des
>   références semblables » gardé en action secondaire.
> - Migrations `20261019040101` à `20261019040701` ; tests `conception-journey.test.sql` (et les
>   anciens adaptés : ils bâtissent leurs propres fiches).


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

### Retours Marketing du 12/10/2026, lot C2 (MKT-C2-03, parcours global)

Sans migration : tout est calculé à la lecture depuis les faits existants, donc les dossiers
déjà commencés gardent leurs données et leur avancement (rien à migrer, rien de stocké).

- **Un accueil unique** (`ConceptionEntry`) : le but de la Conception et le dossier final en
  deux phrases (`fr.conceptionJourney`), le contexte ; avant le démarrage, **l'échange créatif est
  l'action principale** (« Préparer l'échange créatif »), « Commencer sans échange » en contour
  (l'étape 2 est alors « Passée », explicitement).
- **Parcours en six étapes** (`lib/design/journey.ts`, pur ; faits lus par
  `lib/design/journey-data.ts`) : Préparer la sortie (démarrée) · Organiser l'échange créatif
  (compte rendu utilisé comme source, échange préparé, ou passé) · Développer les livrables
  (direction validée et toutes les fiches validées) · Consolider le dossier (brief créatif créé et
  **à jour**, `sameBrief` sur ce que le code construirait maintenant) · Valider la conception
  (étape `design`) · Passer en Production (fiches transférées). Une étape n'est faite que si sa
  sortie minimale existe ou a été passée ; la progression du dossier est distincte de celle de
  chaque livrable (`ConceptionJourney`, ton `journeyStepTone`).
- **Une seule prochaine action** (`lib/design/journey-next.ts`), dans l'ordre du parcours :
  propositions de PO (sur la cible qui en a), responsable de la direction, direction à reprendre /
  à répondre / à soumettre, puis par livrable : questions, fiche à créer, compléter, soumettre ;
  puis brief à créer ou à mettre à jour, « Demander la validation du dossier »
  (`#conception-validation`), puis transfert de chaque fiche et « Ouvrir la Production ». **Sa
  destination est écrite avant le clic** (« Ouvre : Intentions › Cover »). Rien pour cette
  personne : ce qu'on attend (direction, fiche, dossier) ; lecteur : il le lit.
  « Reprendre le travail » disparaît.
- **Ce qui bloque** : propositions en attente, direction sans responsable / à reprendre / refusée,
  fiche refusée, livrables sans fiche, références à rattacher, besoins à qualifier, brief plus à
  jour — chacun mène à son objet.
- **Direction de la sortie séparée des livrables** : carte `ConceptionDirectionCard` sur
  l'accueil, puis « Conception par livrable » ; dans le travail direct, la pastille de la
  direction est seule, les livrables dessous sous leur titre (`WorkTargets`).
- **Validation du dossier** : `ValidationPanel` sous « Valider la conception », ancre
  `#conception-validation` visée par la prochaine action. Onglets dans l'ordre du parcours :
  Accueil, Intentions, Références, Direction artistique, Fiches Livrables, Brief créatif.
- Reste au-delà de ce ticket : direction créative propre (C2-06), échanges sur l'accueil (C2-05),
  demande de validation depuis le brief (C2-12), clôture guidée (C2-13).

### Retours Marketing du 12/10/2026, lot C3 (MKT-C2-04, identité artistique)

Migration `…20261013100101_artist_identity`, tests `supabase/tests/artist-identity.test.sql` (17).

- **L'identité appartient à l'artiste** (`artist_identity_versions`) : manifeste, tonalité,
  palette, typographies, symboles, liens https par type (références, contre-références,
  moodboards, `refs` jsonb). Versions numérotées ; l'identité **en vigueur** est la dernière
  approuvée (`current_artist_identity`), en vigueur de son approbation à la suivante. Lue par tout
  membre (comme l'artiste), écrite seulement par fonctions :
  `propose_artist_identity` (gestion du catalogue ou travail créatif depuis la fiche ; depuis une
  sortie, son chef de projet ou son équipe créative pour l'artiste de cette sortie) — **approuvée
  d'emblée si l'auteur valide** (DG), sinon proposée ; `decide_artist_identity` (valideur, jamais
  sur sa propre proposition, refus motivé). Une proposition ne change jamais l'identité en vigueur.
  **Décision prise ici** : le « DA habilité » = poste avec `creative_work`.
- **Fiche Artiste › Identité** (`/app/catalog/artists/[id]/identity`, `IdentityView`,
  `IdentityForm` pré-rempli avec la version en vigueur, `IdentityHistory`, `IdentityDecision`).
- **La sortie garde sa version** : `design_workspaces.identity_version_id`, posée à l'ouverture du
  travail (trigger, version en vigueur) et jamais réécrite par une version suivante ; le chef de
  projet peut passer volontairement à une plus récente tant que la Conception est ouverte
  (`use_artist_identity_version`). L'artiste d'un projet : `project_artist_id` (premier artiste
  du premier titre, sinon l'artiste d'un projet de contenu).
- **Dans la Conception** (`ConceptionIdentityCard`, `lib/design/release-identity.ts`) : la version
  utilisée en lecture seule ; « Ajouter aux références de la sortie » copie un lien en **référence
  liée** (`design_references.identity_version_id`, vérifié contre l'artiste du projet par trigger),
  rattachée à la direction ; **dérogation** en mots (`set_design_identity_deviation`, qui écrit dans
  la Conception) ; « Proposer une évolution de l'identité » ouvre le formulaire de version avec la
  sortie d'origine ; jamais d'édition directe de l'identité depuis une sortie.
- **Brief créatif** : partie « Identité de l'artiste » (version utilisée, manifeste, tonalité,
  dérogation dite même absente, `lib/design/brief-identity.ts`) ; absente quand il n'y a ni
  version ni dérogation, pour qu'un brief sans identité garde le même contenu.

### Retours Marketing du 12/10/2026, lot C4 (MKT-C2-05, échanges créatifs)

Migration `…20261013100201_conception_exchanges`, tests `supabase/tests/conception-exchanges.test.sql` (7).

- **Échanges sur l'accueil** (`ConceptionExchanges`, `lib/design/exchanges.ts`) : chaque call de la
  Conception (`design_calls`), à venir ou passé, sa **portée** (toute la sortie, ou les livrables
  nommés), et une fois son compte rendu traité : décisions, questions ouvertes, actions
  (`report_items` `decided` / `open` / `next_action`), **à part** les idées de PO à confirmer et
  celles confirmées (intentions de la source du call). Rien n'est confirmé sans une personne.
- **Rattacher un call existant** (`attachDesignCall`, chef de projet, RLS de `design_calls`) : un
  call du projet devient un échange, pour la sortie ou des livrables ; son compte rendu déjà traité
  est lu aussitôt (`fillDesignFromCall`). « Préparer l'échange créatif » reste à côté.
- **Ordre du jour** préparé par le code (`designCallContext`, même lecture côté panneau et côté
  action) : en plus des intentions manquantes, la question de l'identité (« la sortie reste-t-elle
  dans l'identité Vn ? ») et les **points ouverts** du projet (5 au plus, `open_points`).
- **Sans échange, avec justification** : « Commencer sans échange » demande la raison
  (`start_design_without_exchange`, chef de projet), gardée dans
  `design_workspaces.no_exchange_reason` et montrée sur l'étape passée du parcours.
- **Tâches de suivi** : une action de compte rendu devient **une tâche au plus**
  (`tasks_source_report_item_key`, message `task_exists`) ; celle d'un échange qui porte sur un seul
  livrable est rattachée à ce livrable (`CallOutcomes deliverableId`).
- **Du brief au call** : dans le Brief créatif, une source de type call ouvre la page du call
  (`CreativeBriefView callLinks`, par titre de la source ; le contenu enregistré ne change pas).
- Décision prise ici : « idées » = propositions de PO tirées du call, « décisions » = ce que le
  compte rendu dit décidé et ce qu'une personne a confirmé ; « désaccords » sont des questions
  ouvertes (pas de catégorie à part dans le compte rendu).

### Retours Marketing du 12/10/2026, lot C5 (MKT-C2-06, direction de la sortie)

Sans migration : les quatre sujets stockés (`story`, `look`, `tone`, `musts`) restent, leur sens
change selon la cible.

- **La direction de la sortie est une décision, pas un livrable** : ses sujets deviennent
  « Concept central et message », « Codes communs », « Ton », « Contraintes et lignes rouges »
  (`fr.conception.directionTopics`, questions et objectifs propres) ; états Brouillon, À arbitrer,
  Confirmée, Révisée (`directionIntentionsStates`) ; **plus de dépôt de versions** pour elle dans le
  travail direct (les anciennes restent lisibles dans l'historique du projet). Nommée « Direction de
  la sortie » partout.
- **Héritage** : un sujet que la direction confirmée répond est **hérité** par chaque livrable qui
  n'y répond pas lui-même — montré (« Hérité de la direction : … »), compté comme répondu
  (`ConceptionDeliverable.inherited`, pastilles, parcours, Travail direct), jamais redemandé
  (ordre du jour de l'échange créatif). La réponse propre d'un livrable sur un sujet hérité est
  affichée comme **écart ou précision**, la note invite à dire pourquoi. Une fiche créée prend la
  direction confirmée à ce moment-là pour ce que le livrable ne dit pas (« … (hérité de la
  direction) »).
- **Questions selon le format** (`lib/design/formats.ts`, par le code depuis titre et levier :
  vidéo courte, pochette, clip, campagne, sinon générique ; `questions.formats`).
- **Révision** : avant de reconfirmer une direction révisée, le panneau dit les sujets changés
  depuis la dernière confirmation et les livrables qui en héritent, fiche déjà validée signalée
  (`lib/design/direction-impacts.ts`) ; confirmations précédentes listées
  (`Consolidation.directionHistory`).
- **Brief créatif** : parties « Direction de la sortie · … » et « Concepts des livrables », chaque
  livrable dit ce qu'il hérite (`deliverables[].inherits`) — l'identité de l'artiste est déjà à part
  (C2-04). Un brief enregistré avant ce lot paraît « à mettre à jour » : son contenu gagne ce champ.
- **Décision prise ici** : le format est déduit des mots du titre et du levier (pas de champ « type
  de livrable » dans la Stratégie) ; un livrable mal classé garde les questions génériques
  (`other`).

### Retours Marketing du 12/10/2026, lot C6 (MKT-C2-07, livrables et séries)

Migration `…20261013100301_series_items`, tests `supabase/tests/conception-series.test.sql` (7).

- **Contrôles selon le format** (`sheetChecks` reçoit le format, `SheetFacts.format` lu dans
  `loadFacts`) : clip et vidéo courte exigent ratios, durée et sous-titres (date de tournage
  rappelée) ; pochette et campagne, les ratios seulement ; « autre », seulement ce que tout livrable
  exige (responsable, validateurs, livraison, dates dans l'ordre). Plus de questionnaire universel.
- **Un élément de série = un contenu à part entière** : `design_sheet_items.responsible_person_id`
  (membre approuvé, trigger), `concept`, `reference_url` (https), en plus de l'objectif, de la date et
  des notes ; repris dans l'instantané de soumission (`to_jsonb`).
- **Série en bloc ou contenu par contenu** (`design_sheets.tracking`, `SeriesTracking`) : en bloc =
  une décision pour la série (`mode global`), contenu par contenu = une décision par élément
  (`per_section`), sinon le mode du projet ; `submit_design_sheet` suit ce choix. Regrouper n'efface
  rien : les décisions déjà prises restent sur leurs versions. La règle du statut agrégé est écrite
  sur la fiche (le contenu le moins avancé l'emporte). **Décision prise ici** : pas de niveau
  « sous-ensemble » (en bloc ou par contenu suffit au cas des cinq TikTok).
- **Vue d'ensemble** : chaque livrable de l'accueil dit ses manques et sa prochaine étape
  (`deliverableNext`, `SheetSummary.blockers`) ; les livrables avancent en parallèle.
- La fiche montre aussi ce que le livrable hérite de la direction (C2-06).
- Reste pour C2-12 : le PDF du dossier restitue série, cadre commun et contenus.

### Retours Marketing du 12/10/2026, lot C7 (MKT-C2-08, rôles et délégations)

Migration `…20261013100401_design_roles`, tests `supabase/tests/conception-roles.test.sql` (11,
quatre comptes : DG, chef de projet, DA responsable, directeur créatif hors projet).

- **Approbation séparée de la création** : `decide_design_submission` refuse à qui a soumis la
  version (`self_approval`), `review_design_version` au chef de projet sur une version qu'il a
  déposée — sauf si la **gouvernance** du projet l'autorise explicitement
  (`design_workspaces.allow_self_approval`, posée par un valideur avec raison,
  `set_design_self_approval`, tracée `governance.*`). L'interface remplace alors les boutons par la
  phrase qui dit pourquoi (`selfSubmitted`, `blockedSelf`, `VersionItem`).
- **Délégations** (`design_delegations`, `delegate_design_role`, `revoke_design_delegation`) : le chef
  de projet confie le rôle de responsable ou de valideur qu'une personne **tient** sur un périmètre
  (direction ou fiche) à un autre membre, avec raison, début et fin ; même règle de visibilité qu'une
  désignation (`design_person_check`). Active aujourd'hui (Paris) et non révoquée, elle agit comme le
  rôle : `design_delegated` est lu par `design_is_responsible`, `design_sheet_can_edit`,
  `submit_design_sheet`, `submit_design_direction`, `decide_design_submission`. Révoquée, jamais
  effacée. `DelegationsPanel` sur la Direction artistique et chaque fiche.
- **Audit** : délégations données / révoquées et anciennes versions déposées / décidées entrent dans
  `design_events` (`design_audit_extra`), à côté des soumissions et décisions.
- **Chef de projet à la place du responsable** : autorisé (il reste propriétaire du projet), mais dit
  comme exceptionnel et tracé (bandeau `conceptionRoles.substitution` sur la direction et la fiche).
- **Matrice des droits** (« Qui fait quoi », `RightsMatrix`, Direction artistique) : chef de projet,
  responsable créatif, valideur, délégué, équipe créative, observateur.
- **Travail** : carte « Ma conception » pour quiconque est responsable (désigné ou délégué) de la
  direction ou d'une fiche, ou valideur délégué (`MyWork.myConception`).
- **Décisions prises ici** : pas de compte « artiste » dans l'app (l'artiste reste au Réseau) ; la
  gouvernance d'exception est posée par un valideur (DG), pas par le chef de projet.

### Retours Marketing du 12/10/2026, lot C8 (MKT-C2-09, références et propositions)

Migration `…20261013100501_reference_types`, tests `supabase/tests/reference-types.test.sql` (5).

- **Taxonomie** (`lib/design/reference-kinds.ts`, `fr.conceptionKinds`) : une **référence** est une
  source d'inspiration, un **moodboard** une sélection organisée avec son intention
  (`design_references.type`), une **proposition créative** concrétise un concept (les
  `design_versions` de la Conception, « Soumettre une proposition créative »), une **version de
  travail** matérialise le livrable en cours (Production, « Déposer une version de travail »). Les
  éléments ajoutés avant ce classement sont **« À qualifier »** (défaut de la colonne). Guide replié
  « Ce que l'on range ici » sur la page Références.
- **Droits et usage** (`design_references.usage`, liste fermée) et **moodboard** d'appartenance
  (`moodboard_id`, même projet, jamais un moodboard dans un autre, trigger) ; saisis à l'ajout et à
  la modification (`ReferenceKindFields`), montrés sur chaque carte avec le type.
- **Un seul dialogue d'ajout** (fichiers ou lien, `AddReferencesDialog`) sur la page Références et
  dans les Intentions (pré-réglé sur la cible ouverte, exemples selon le format du livrable) ;
  l'ancien `ReferenceDialog` (liens seuls) et `addDesignReference` sont supprimés. Après l'ajout,
  le toast dit **à quoi l'élément est rattaché** ; le dialogue dit qu'une référence n'est relue par
  personne seule (elle entre dans la direction validée). Le dépôt d'une proposition dit qui la relit
  (le chef de projet) et la décision attendue.
- La recherche de semblables garde sa provenance (source et recherche, auteur, licence) et n'ajoute
  rien sans clic (déjà en place) ; une image gardée est une « Référence ». **Décision prise ici** : la
  référence d'origine d'une recherche n'est pas enregistrée (la recherche part d'une cible ou de
  toutes les images, pas d'une seule référence).

### Retours Marketing du 12/10/2026, lot C9 (MKT-C2-10, propositions et retouches)

Migration `…20261013100601_proposal_retouches`, tests ajoutés à `supabase/tests/design.test.sql` (29).

- **États d'une proposition créative** (`design_versions`, `VersionStatus`) : soumise · en relecture,
  retouches demandées, **concept approuvé**, **écartée** (nouvelle : avec raison, par le chef de
  projet, jamais supprimée). Un concept approuvé n'est jamais « produit » ni « livré » (états de
  Production) : le suivi de la Stratégie dit « Concept approuvé, production pas encore commencée ».
  Une proposition écartée laisse le livrable « À concevoir ». **Décision prise ici** : pas d'état
  « brouillon » (une proposition existe quand elle est soumise ; l'auteur la retire avant relecture).
- **Décision** : `review_design_version(p_version_id, p_decision, p_comment, p_scope)` (nouvelle
  signature) garde l'auteur, le **rôle** (`reviewed_role`), la date, le motif et le **périmètre**
  (`review_scope` : toute la proposition, ou une zone précise).
- **Retouche → tâche** : demander des retouches crée la tâche de l'auteur dans son Travail, une seule
  fois (`tasks.design_version_id`, index unique) ; la proposition suivante du même livrable **ferme**
  les tâches de retouche ouvertes des précédentes (`design_versions_close_retouches`). La tâche mène à
  la proposition (`taskHref`), la carte de la version dit si la retouche est ouverte ou faite.
- **Historique** : V1 reste consultable après V2 (inchangé) ; chaque carte montre auteur, date,
  note, zone, commentaire, décision et retouche.
- **Notifications** : elles mènent à la proposition elle-même (`/design/versions/[versionId]`, qui
  redirige vers le travail du livrable à l'ancre `#version-<id>`) ; nouvelle notification
  `design_version_discarded`.
- **Brief créatif** : chaque livrable dit sa **proposition retenue** (dernier concept approuvé) et
  combien son historique en compte (`deliverables[].retained`, `lib/design/brief-proposals.ts`).

### Retours Marketing du 12/10/2026, lot C10 (MKT-C2-11, demandes de validation)

Migration `…20261013100701_design_requests`, tests `supabase/tests/conception-requests.test.sql` (10).

- **Avant l'envoi** (`RequestReviewDialog`, direction et fiches) : objet, numéro de la version, **chaque
  section incluse** (direction et livrables, ou la fiche et ses contenus), qui décide et comment, un
  **message** et la **date de décision attendue** (`design_submissions.message`, `due_on`), puis ce
  qui suit (version figée, valideurs notifiés, contenu changé = à renvoyer). Le bouton dit à qui
  (« Soumettre à … »). `submit_design_direction` / `submit_design_sheet` prennent ces deux
  paramètres (nouvelles signatures).
- **Périmètre immuable** : `decide_design_submission` refuse une demande dont le contenu a changé
  depuis l'envoi (`submission_outdated`, comparaison de l'instantané) — jamais d'approbation
  silencieuse ; `design_submission_is_current` le dit sur la page de décision. Le demandeur (ou le
  chef de projet) la **retire** (`withdraw_design_submission`, état « Retirée », gardée) et renvoie
  une version. Une demande retirée compte comme aucune (`states.ts`).
- **Décider** : valider, **valider avec réserves** (`design_decisions.reserves`, avec une approbation
  seulement), demander des modifications, refuser ; la décision garde son rôle (`decided_role` :
  valideur ou délégué). Personne ne décide ce qu'il a soumis (C2-08).
- **Notifications et file** : les valideurs du périmètre (et délégués actifs) reçoivent
  `design_submission_requested`, l'auteur `design_submission_decided` ; les deux mènent à la **page
  de décision** `/design/decisions/[submissionId]` (demande figée, message, échéance, valideurs,
  contrôles, retrait), comme la carte « Mes décisions de conception » du Travail.
- **Validation globale** : sur l'accueil, au-dessus de la demande de validation du dossier, les
  décisions déjà prises (direction, fiches validées) restent dites : la validation globale s'y
  ajoute sans les masquer.

### Retours Marketing du 12/10/2026, lot C11 (MKT-C2-12, Brief créatif en document)

Pas de migration : le contenu d'une version (`design_briefs.content`) s'enrichit.

- **Contrôles avant la version** (`lib/design/brief-checks.ts`, calculés par le code, dits avant
  « Créer la V1 » par `BriefChecksList`) : **bloquant** = aucune réponse confirmée de la direction de
  la sortie (`createCreativeBrief` refuse) ; **avec réserve** = direction pas validée dans son
  ensemble (dernière demande non approuvée), livrable sans ses quatre réponses (propres ou
  héritées), proposition de PO en attente, livrable sans fiche validée ; **exclu** = besoin encore
  « à qualifier », hors du dossier (`content.excluded`).
- **Contenu** : chaque livrable porte sa fiche (`sheet` : responsable, valideurs, date, contenus
  d'une série avec concept, responsable et date — `brief-sheets.ts`), les références leur type,
  légende et droits d'usage, les décisions leurs réserves. Une seule formulation pour la page et le
  PDF : `lib/design/brief-text.ts`. `liveCreativeBrief` (`brief-live.ts`) construit le brief en
  direct + ses contrôles pour l'action, la page et le PDF.
- **Document** (`BriefDocumentCard`) : Vn, auteur, date, **statut calculé** (`brief-status.ts` :
  en vigueur à jour / plus à jour, remplacée, en validation, validé — depuis l'étape Conception),
  ce qui a changé (`brief-diff.ts`, par partie : depuis la version précédente, ou depuis la dernière
  version quand le projet a bougé) et « Télécharger le PDF ».
- **PDF** : `GET /api/projects/[id]/creative-briefs/[n]` (`creativeBriefHtml`, session de
  l'utilisateur, RLS), tiré du contenu figé de la version : en-tête version · statut, auteur et
  date, mention « interne », sommaire, parties dans l'ordre de la page, **numéros de page**
  (`htmlToPdf(html, { pageNumbers: true })`).
- **Validation du dossier** : sur la page du brief (et toujours sur l'accueil), `ValidationPanel`
  avec `requestBlocked` tant qu'il n'y a pas de brief ou que la dernière version n'est plus à jour
  (`briefRequestBlock`) : la demande porte sur une version figée. Les notifications `validation_*`
  de l'étape Conception mènent à la page du brief. Blocage côté interface seulement, comme la
  Stratégie (la fonction SQL de demande est commune aux étapes).
- **Décisions prises** : le brief ne contient ni budget ni conditions de contrat (document interne
  à l'équipe, dit dans le PDF). Dépendances, droits et risques sont couverts par les contraintes
  communes, les droits d'usage des références et les points encore ouverts ; pas de section
  « risques » séparée.

### Retours Marketing du 12/10/2026, lot C12 (MKT-C2-13, clôture et passage en Production)

Migration `…20261013100801_conception_handoff`, tests `supabase/tests/conception-handoff.test.sql` (15).

- **Clôture** : quand l'étape Conception passe à « Validée », un trigger (`design_stage_closed`)
  inscrit le **brief créatif de référence** (`design_workspaces.closed_brief_id`, `closed_at`).
  L'accueil affiche alors `ConceptionClosureSection` : date, validateur, commentaire, brief de
  référence (lien), nombre de réserves, « n livrables sur m en Production », réouvertures passées.
- **« Passer en Production »** (chef de projet, `pass_to_production(p_project_id, p_exclusions)`) :
  le plan est **prévisualisé** (`HandoffPlanForm`, `lib/design/handoff-plan.ts`) — par livrable : fiche
  validée Vn, responsable, date, dépendances, réserves ; décoché, il **reste en Conception avec un
  motif** obligatoire (`design_handoff_exclusions`). À la confirmation : un transfert par fiche validée
  encore à jour (`design_submission_is_current`) et non exclue, contre le brief de référence ; chaque
  **réserve d'approbation devient une tâche** (responsable de la fiche, sinon le chef de projet ; date
  de livraison de la fiche, sinon J+7 ; `tasks.design_decision_id` unique) ; l'étape Production démarre
  si besoin. **Idempotent** : relancer ne crée ni transfert, ni tâche, ni démarrage en double.
- **Bloquant / non bloquant** : une fiche avec des modifications demandées, refusée ou non soumise
  n'est pas transférée (elle reste en Conception, avec son statut). Une réserve d'approbation ne
  bloque jamais (valider avec réserves = valider, C2-11) : elle suit en tâche.
- **Production** : chaque livrable dit d'où il vient (`lib/production/conception-links.ts` : « Fiche Vn
  · Brief créatif Vm », « Resté en Conception : motif », « Pas encore transféré ») ; tant qu'un
  livrable n'est pas transféré, ses actions de Production sont fermées (seulement si la Conception a
  transféré quelque chose : un projet sans Conception fonctionne comme avant). « Commencer la
  production » est remplacé par le passage depuis la Conception validée (`startBlocked`).
- **Réouverture** (direction seule, `has_permission('validate')`, `reopen_design`) : motif obligatoire,
  **analyse d'impact** enregistrée (`design_reopenings.impact` : livrables déjà en Production, version,
  livré ou non), l'étape repasse « En cours » et devra être revalidée. Rien d'approuvé n'est réécrit :
  briefs, décisions et transferts restent. Exception assumée à « une étape validée est définitive »,
  demandée par le ticket, sur le modèle de `reopen_marketing_closure`.
- La prochaine action du parcours, Conception validée, est « Passer en Production » (ancre
  `#conception-closure`) ; le transfert fiche par fiche (`HandoffButton`) reste possible.

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
  responsable parmi l'équipe du projet, la direction et les directeurs créatifs (un DC hors du
  projet le rejoint, `design_person_check` ; migration `20261028000501`) : « Nouveau call » coche
  l'équipe et propose les autres ; un échange préparé (Cadrage,
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
- **Recrue** : présentation de la première connexion (`components/onboarding/`, `docs/DESIGN.md` § 4)
  pour un membre approuvé depuis moins de 30 jours, texte choisi **par permission**
  (`welcomeVariantOf`), fermée en base (`member_welcomes`). PO : `my_todo` commence par les projets à accepter et liste les livrables,
  `find_projects` dit `status` et `waitingForYourAnswer`, `project_status` présente un projet non
  lancé (contexte initial, échéance). (La suggestion « Présente-moi le projet « X » » de l'accueil
  est partie avec les pilules de suggestions, retirées le 29/10.)
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
- **Trois axes, jamais fusionnés** : le **statut opérationnel** (À préparer → En cours →
  Réalisée déclarée → Clôturée, + Annulée / Bloquée avec raison ; voir « Statuts » ci-dessous), posé
  par une personne ; la **preuve** (`activation_evidence` : lien, fichier ou source de la déclaration ;
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
- **Statuts (Sacha, 11/10/2026, migration `20261011300101`)** : le ticket liste Brouillon → À
  préparer → Prête → En cours → Réalisée déclarée → Clôturée, + Annulée / Suspendue / Bloquée ; à
  l'écran, les trois premiers ne servaient qu'à trier la liste et Suspendue avait l'effet de Bloquée.
  Ils sont fusionnés en **À préparer** (anciennes lignes reprises, Suspendue → Bloquée avec sa
  raison) et **« Prête » est calculée**, comme le dit le flux du ticket (« Préparation : […] les
  contrôles n'empêchent pas une préparation partielle, mais signalent ce qui bloque le passage à
  l'état suivant ») : **lancer** une activation (de À préparer ou Bloquée vers En cours ou Réalisée
  déclarée) exige un responsable, une échéance (« calendrier »), aucun blocage ouvert et aucune
  dépendance bloquante non résolue. Vérifié en SQL (`marketing_activations_check`,
  `activation_launch_gaps`, refus `activation_not_ready:<manques>`), dit à l'écran par le code
  (`launchGaps`, ligne « Pour lancer » de l'identité, refus du formulaire de statut, règles
  `due_missing` puis `launch` de la prochaine action). Ce que chaque statut change : À préparer =
  vue « À lancer » ; En cours = vue « En cours » ; Réalisée déclarée = ouvre preuve, statistiques,
  « Prête pour bilan » et la clôture, arrête l'alerte de retard ; Bloquée = vue et compteur ;
  Annulée = sort des alertes, compteurs et bilan. Une nouvelle activation propose le responsable du
  projet comme responsable (modifiable, « Personne pour l'instant » possible). Non fait : condition
  propre aux modules (cadrage validé avant de lancer une Influence) — à trancher.
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
### Lot 6 — Activations sur une seule page (proto « Projet complet », 19/10/2026)

Migrations `20261019060101_activation_journey.sql` et `20261019060201_influence_creator_link.sql`,
pgTAP `marketing-activations.test.sql` (65) et `activation-creator-link.test.sql` (11).

- **Une page** (`ActivationsFrame`, `components/activations/journey/`) : en-tête du Marketing (pilules,
  fil « Projet › Marketing › Activations › <activation> »), `NowCard`, bandeau **« Leviers à préparer »**
  (`LeversBanner`), puis la **liste** à gauche (`ActivationList` : filtres « À moi / En cours / À mesurer /
  Terminées » en `?vue=`, ligne = type · mode · responsable · échéance, frise `PhaseStrip`, phrase « À vous ·
  … ») et l'**activation ouverte** à droite (`ActivationDetail` : grande frise, « Maintenant » `NowBox`, module,
  relevés, « Informations » repliées, « Suspendre » / « Annuler l'activation »). `/activations` ouvre la
  première activation de la personne ; les anciens onglets (`framing`, `concepts`, `targets`, `agency`,
  `report`) et `targets/<id>` **redirigent** vers les ancres (`#framing`, `#module`, `#agency`, `#report`,
  `#collab-<id>`, `#media-<id>`). Le tableau à tuiles et ses 7 vues ont quitté l'écran (`viewsOf` reste pour
  Suivi & bilan).
- **Calculs** (purs, `lib/activations/journey.ts` ; la frise dans `lib/activations/phase.ts`) : `phaseOf`
  (Préparer → Réaliser → Prouver → Mesurer → Clôturer), `trunkAction` (le geste du tronc et sa personne : désigner, échéance, lancer, déclarer réalisée,
  preuve, vérifier, relevé, clôturer, reprendre), `activationSentence`, `filtersOf`. Lignes du module
  (`lib/activations/actors.ts`) : une par collaboration (la créatrice agit par son lien), l'agence (relier,
  correspondance, aperçu, décider, récapitulatif, bilan, transmission), la presse (cadrage, dossier, modèle,
  messages, interviews, retombées). Personnes (`lib/activations/people.ts`) : responsable, direction (seul
  validateur nommé, sinon « La direction »), directrice créative du projet pour les contenus ; `viewer` vrai sur
  les décisions pour qui valide. `ActivationSummary.actions` les porte, la personne d'abord.
- **Parcours** (`lib/journey/activations.ts`, part `activations` du Marketing) : « Leviers à préparer » puis une
  étape par activation (sa première ligne), plus une étape par autre ligne **de la personne** (Travail,
  Validations) ; `kind: "validate"` pour la direction.
- **Preuve calculée** (`lib/activations/campaign.ts`, `derivedProof`) pour Influence et RP en interne :
  « N publications vérifiées sur M créateurs engagés » (engagé = pas sorti et conditions acceptées, accord, droits
  acceptés, contenu ou publication), « N retombées vérifiées sur M déclarées » ; aucun lien unique. La base refuse
  « Déclarer réalisée » sans première publication (influence) ou premier message envoyé (RP)
  (`activation_not_done:*`).
- **Statuts** : « Suspendue » revient (`status_before_suspension`, « Reprendre » y retourne, motif obligatoire,
  annulable) ; « Bloquée » reste pour les lignes existantes. « Preuve indisponible » = preuve déclarée + contrôle
  « indisponible » avec le motif. « Sans objet » = preuve / statistiques non attendues + motif gardé
  (`activation_next_actions` `not_applicable`).
- **Leviers** : retenus du Brief de sortie validé (`levers` sélectionnés et confirmés), état calculé Créée / Plus
  tard (`activation_lever_choices`) / À préparer ; « Créer l'activation » (responsable du projet, type lu dans les
  mots du levier, mode sur la ligne) ; **un contenu attend les livrables de son levier** (dépendance bloquante
  créée à la création, levée par la livraison). « Nouvelle activation » hors levier en pied de liste.
- **Influence** : concept de campagne lu dans la Stratégie (Narratif, `campaignConcept`), plus de cadrage Influence
  ni de concept générique à valider à l'écran (tables gardées) ; une carte par créateur (`VersionCard`), ouverte
  quand un geste attend la personne, la partie de l'étape ouverte (`collabFocus`), le reste sous « Toute la
  collaboration ».
- **Lien de la créatrice** (`/i/<jeton>`) : après « Bon pour accord », le même lien sert toute la collaboration
  (`get_influence_collaboration`) jusqu'à son issue : déposer le contenu, déclarer la publication, envoyer la
  facture (chemin à usage unique `influence_upload_slots`, fichier restreint, paiement « À valider »). Chaque geste
  notifie le responsable (`activation_creator_acted`).
- **Presse** : cartes « Cadrage RP » et « Dossier de presse » (celui de la **Stratégie**, source unique — décision
  du 19/10), modèle commun, une carte par média, « Retombées », « Bilan RP » (tuiles calculées). Agence : même
  cadrage + dossier, **« Marquer comme transmis »** (`declare_activation_transmission`, journal
  `agency.transmitted`, cadrage validé et, pour la RP, dossier validé), puis tableau, aperçu, galerie,
  récapitulatif et bilan d'agence dans la page.
- **Notifications** : `activation_owner_assigned`, `activation_suspended`, `activation_creator_acted` (vers
  l'activation).

### Reste des Activations (20/10/2026, branche `pc/r4-activations`)

Migrations `20261020040101_activation_stats_states.sql`, `20261020040201_activation_direct_sends.sql`,
`20261020040301_contact_call_requests.sql` ; pgTAP `activations-remaining.test.sql` (23).

- **Une seule frise** : `lib/activations/phase.ts` (`phaseOf`, `liveStatus`, `isGated`, `phaseLabel`,
  `isRealised`, `PHASES`), lue par la liste, l'activation ouverte, le parcours et le Suivi & bilan
  (`lib/marketing/review/activations.ts` reprend les résumés de `loadActivationsBoard`, déjà lus par le
  parcours du projet : même phase, même preuve, mêmes statistiques). `lib/marketing/review/phase.ts`
  supprimé ; `ReviewActivation` porte sa `phase` (`review-activation.ts`).
- **Statistiques partielles / indisponibles** : `activation_metrics.partial` (« Relevé partiel », relevé
  repris du tableau d'une agence ; l'ancien `method = 'Relevé partiel'` repris) et
  `marketing_activations.metrics_unavailable` (« Donnée indisponible : la plateforme ne la fournit pas »,
  distinct de « Non attendues » = Sans objet ; levé par le relevé suivant). `measureState` :
  non attendues → indisponibles → à collecter → partielles (dernier relevé partiel ou une cible sans
  relevé) → disponibles. La vue `marketing_review_evidence` donne `availability = 'partial'`. Suivi &
  bilan : tuiles Partielles / Indisponibles listées par activation, phrase « Statistiques : N relevées,
  M manquantes, K indisponibles », « Ce qui manque » ajoute « … : statistiques indisponibles » ; réserve
  de clôture `metrics_unavailable`.
- **« Brief et proposition »** (carte d'une créatrice à « Validée en interne ») : un formulaire
  (`BriefProposalForm`) — Rémunération proposée *, Livrables (format du concept), Droits organiques
  (« Sur son compte TikTok · republication par <artiste> »), Droits publicitaires (Non demandés / Spark
  Ads · 30 jours · inclus / en supplément + montant), Message écrit par le code depuis le concept validé
  (`brief-message.ts`), Canal (E-mail / Message <plateforme> / WhatsApp) → « Marquer le brief comme
  envoyé » / « Copier le message ». `send_influence_brief` écrit la position de PDS et le brief déclaré
  envoyé en une transaction (concept validé exigé, première position seulement). Rémunération
  pré-remplie seulement par un tarif noté au Réseau (`network_observations` `rate`), jamais estimée.
- **Récapitulatif d'agence envoyé directement** : `RecapForm` (« Récapitulatif pour <agence> », texte
  écrit par le code depuis les décisions, sans notes internes, `agency/recap.ts`) dès qu'une décision est
  plus récente que le dernier envoi ; « Marquer comme envoyé » (`send_agency_recap`) ; fait
  « Récapitulatifs envoyés : 17/11, 11:30 par … ». Plus de brouillon à valider (`prepareAgencyRecap`
  retiré). Les deux envois directs passent par `_send_activation_message` (validé et déclaré par la même
  personne, journal `message.declare_sent`) ; les messages presse gardent leur validation par la
  direction. Canal `whatsapp` ajouté à la liste fermée.
- **« Doublon probable »** des cibles presse (`lib/activations/duplicates.ts`, `warningsFor` avec
  `press`) : même média sous une autre fiche (nom normalisé sans « Le », « Magazine »… ou même domaine
  d'adresse non partagé) → « Doublon probable de « Le Contrechamp » » ; même journaliste déjà ciblé
  sous un autre média → « Doublon probable : … est déjà ciblé sous « … » ». Alerte à confirmer, jamais
  un refus ; recalculée quand le journaliste est choisi.
- **Lien de la personne** : `ContactLinkOffer` sur la carte d'une créatrice dès qu'elle a un lien
  d'accord ; `ContactLinksSection` dans « Qui fait quoi » de la Conception et de la Distribution.

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

### Lot 7 — Suivi & bilan en parcours (19/10/2026, proto « Projet complet »)

- **Parcours** `lib/marketing/review/journey.ts` (pur) : Bilan provisoire (`/review/bilan`), Réserves
  (`/review/reserves`), Clôture du Marketing (`/review/closure`) ; `/review` ouvre l'étape qui attend la
  personne, `/review/history` = l'audit `marketing_events` ; `/review/reports` et `/reports/new`
  redirigent vers l'étape 1, `/reports/<id>` reste le lien direct (comparaison, PDF). Contexte par
  requête `reviewJourneyContext` (`context.ts`), loader `lib/journey/review.ts` **dans le loader
  `marketing`** de `lib/journey/sources.ts` (partie `review`) : « Maintenant », Travail, Validations
  (`actor.kind = "validate"` pour approuver le bilan et clôturer). Cadre `ReviewStepFrame` sur le modèle
  du Juridique ; « Déjà fait » par étape (`history.ts`).
- **États** : Bilan fait = une version approuvée (ou finalisée) et aucune version en cours ; verrouillé
  sans activation ni rapport (prérequis externe « Activations › Leviers à préparer » = au moins une
  activation). Réserves ouvertes une fois une version approuvée, faites quand aucune n'est à arbitrer ni
  « à lever » non levée. Clôture ouverte après les Réserves, faite quand le Marketing est clôturé
  (`reserve` si avec réserves). Préparer n'est proposé qu'à partir du jour de sortie (date de la
  Distribution, sinon `projects.due_date`).
- **« Où on en est »** (`standing.ts`, `standing-data.ts`) : 4 phrases calculées sur toutes les
  activations, détail replié avec les filtres du ticket ; chaque chiffre ouvre sa liste et sa règle
  (modale verre) ; statistiques « Partielles » / « Indisponibles » = activations dont l'état des
  statistiques l'est (20/10, ci-dessous « Reste des Activations »). **Frise, preuve et statistiques lues
  dans les Activations** (`activations.ts` lit `loadActivationsBoard` ; une seule frise,
  `lib/activations/phase.ts`) : plus de second calcul ici.
- **« Ce qui manque »** (`issues.ts`) : une ligne par activation annulée (motif), pas clôturée (état),
  clôturée à preuve non vérifiée ou à statistiques indisponibles ; une ligne par objectif de la Stratégie (`strategy_objectives.due_on`)
  lu après aujourd'hui (« Streams à 4 semaines : lus après le … »). Cochées dans « Réserves à
  inclure », elles deviennent les réserves de la version (une par ligne, catégorie Activations / Preuves
  / Statistiques) ; celles déjà ouvertes sont reprises telles quelles.
- **Actions** : `generateReport` (période et résumé obligatoires), `submitReport`, `decideReport`,
  `arbitrateReserve`, `liftReserve`, `requestClosure`, `decideClosure`, `reopenClosure` enveloppées dans
  `withOutcome` (bandeau « Ensuite / Débloqué ») et `schedulePendingPushes`. Aucun SQL métier changé.
- **Notifications** (migration `20261019070101`) : version soumise → la direction ; décision → qui l'a
  soumise ; clôture demandée → la direction ; décidée → qui l'a demandée ; rouverte → le responsable.
  Test `supabase/tests/marketing-review-notifications.test.sql`.

### Recette Marketing V1 d'Ibé (23/10/2026) : Activations et Suivi & bilan

Migrations `20261026400101_activation_recette_guards.sql`, `20261026400201_marketing_bilan_recette.sql`,
`20261026400301_influence_agreement_sent.sql` ; pgTAP `marketing-recette-v1.test.sql` (30). Règles métier :
`docs/MARKETING-METIER.md` (le dernier retour d'Ibé fait foi sur les règles du 11/10).

- **Gestes avec un créateur** : trigger `a_live` (`influence_gesture_guard`) sur les tables Influence
  (propositions, accords, droits, contenus, retours, paiements), `activation_targets` (issue seulement),
  `activation_evidence` / `activation_sheets` (ligne d'un créateur) : refus
  `collaboration_frozen:not_launched|suspended|closed` hors activation lancée (`activation_is_live` ;
  côté code `collaborationGate`, `lib/activations/phase.ts`). Révoquer un accord et ouvrir la page
  restent permis. À l'écran : plus de ligne de module ni de geste dans les cartes (`InfluenceBlock`), un
  encart dit pourquoi ; la page du créateur dit « La campagne est en pause ».
- **Clôture d'une Influence** : `close_activation` refuse `creators_open:<noms>` tant qu'un créateur
  engagé (conditions acceptées, contenu, publication) n'a pas d'issue (`activation_open_creators`).
- **Agence « réalisée »** : `agency_done_gaps` (`agency_review`, `agency_errors` = ligne du dernier
  aperçu en erreur et non refusée, `no_coverage`), refus `activation_not_done:<manques>` ; exception
  `declare_activation_done_with_reserve` (réserve `coverage` ouverte du bilan, qui et quand pré-remplis),
  formulaire `AgencyDoneForm` sous « Maintenant ».
- **Échéance** : `due_in_past`, `due_after_campaign:<date>` dans `marketing_activations_check`, fin de
  campagne `marketing_campaign_end` = `projects.due_date + 28` ; `DueForm` borne le champ
  (`lib/activations/due-bounds.ts`). Les tests pgTAP datent leurs échéances depuis aujourd'hui.
- **Accord envoyé** : `influence_agreements.sent_at / sent_by / sent_channel`,
  `declare_influence_agreement_sent` (une fois, accord en attente) ; prochaine action « Envoyer l'accord »
  avant « Bon pour accord » (`CollabView.agreementSent`) ; `AgreementSendForm`, aperçu `AgreementTerms`
  (commun avec la page publique, schéma `lib/activations/influence/agreement-content.ts`).
- **Mesures** : `lib/activations/measure-sources.ts` (`measureChoices` d'après le type et le titre).
- **Réserves et clôture** : `arbitrate_marketing_reserve` refuse `activation_reserve_kept` (Non applicable
  ou Doublon pour une activation ouverte) et un doublon d'une réserve déjà gardée ;
  `request_marketing_closure` et `decide_marketing_closure` refusent `activations_uncovered:<titres>`
  (`marketing_uncovered_activations`). Code : `BilanIssue.locked`, `reserveDecisionsFor`
  (`lib/marketing/closure/reserves.ts`), ligne « Avant la clôture » non prête.
- **Budget et objectifs** : `budget_lines.activation_id` (même projet, `check_budget_line_activation`),
  `marketing_report_budgets.invoiced_cents` ; `lib/marketing/review/budget-breakdown.ts` et
  `objectives.ts` (purs), `StandingGoals` sous « Voir le détail » ; figure `budget_invoiced` du tableau de
  bord. Le formulaire d'une ligne de budget ne propose pas encore l'activation : la ligne est lue sur son
  livrable ou son levier.

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

### 10 bis. Repérage (`/app/labo`) : artistes depuis des captures TikTok

Appelée **Repérage** à l'écran depuis le 03/11/2026 (Sacha), icône `IconUserSearch` ; la route et le
code gardent `labo`. Le Labo IA local (`/labo`, § 10) ne change pas.

Demande d'Ibé (10/10/2026) : retrouver les artistes qu'il repère sur TikTok. Page de la
navigation principale, **pour tout membre approuvé, en production aussi** (contrairement à
`/labo`), où l'on essaie une fonction avant de la mettre dans l'app. Rien n'est enregistré
sans un clic : « Ajouter au Réseau » (ci-dessous).

- **Pourquoi pas TikTok** : l'API officielle ne lit que le compte connecté (Display API) ;
  la Research API est réservée aux chercheurs, sans usage commercial ; les scrapers violent
  les conditions de TikTok. Une capture ne porte de toute façon aucun identifiant. Piste
  gardée pour plus tard : un **lien** de vidéo collé → oEmbed public
  (`tiktok.com/oembed?url=…`, sans clé) donne le compte (fait le 05/11 : « Liens » ci-dessous).
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
  comptes ». La personne **choisit** dans le Repérage (`DeezerChooser`) : les homonymes avec leur
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
  citée) ; une personne relit et enregistre (`manage_network`), on reste sur le Repérage et le
  bouton devient « Ajouté au Réseau ». Déjà dans le Réseau = même compte TikTok, Instagram ou
  Deezer (`findContactsByAccounts`), **jamais par le nom** : « Dans le Réseau » mène au contact.
  Le contact rejoint l'onglet **Artistes repérés** du Réseau (§ 8 quinquies).
- Deux captures lues à la fois (palier gratuit Mistral, Deezer 50 requêtes / 5 s), PNG / JPEG /
  WebP, collées (⌘V, rappel affiché seulement avec une souris) ou déposées. **Réduites par le
  navigateur avant l'envoi** (`lib/images/shrink-image.ts`, 05/11/2026) : 2 000 px au plus sur le
  grand côté, en JPEG, quelques centaines de Ko. Vercel refuse un envoi de plus de 4,5 Mo avant
  même d'exécuter la route (413 sans JSON ni journal), et une capture PNG d'iPhone pèse 3 à 6 Mo :
  c'était l'échec d'Ibé du 05/11, affiché comme une erreur du modèle. L'original reste pour la
  vignette et « Relire ». Au-delà de 4 Mo une fois réduite, rien n'est envoyé. Une réponse sans
  JSON est traduite par son code (413 trop lourde, 504 trop longue) ; les messages ne nomment
  plus de fournisseur. Un artefact claude.ai ne peut pas
  servir de banc : il n'atteint ni Mistral ni l'API Deezer (réseau bloqué).
- **Liens** (05/11/2026, demande de Sacha : partager au Repérage depuis le téléphone,
  `lib/catalog/link-artist.ts`, route `POST /api/catalog/link-artist`, champ `CaptureLinkForm`) :
  un lien TikTok ou Instagram donne directement le compte, **sans modèle** (PO ne sert ensuite
  qu'au nom d'artiste caché dans le pseudo et au départage des homonymes, voir plus bas) : `tiktok.com/@x` et ses vidéos ; un lien court
  (`vm.tiktok.com`, `vt.tiktok.com`, `tiktok.com/t/`) suivi par ses redirections, vers TikTok
  seulement ; une vidéo sans pseudo (`/@/video/<id>`) demandée à l'oEmbed ; `instagram.com/<x>`
  et ses stories. Un reel ou une publication Instagram ne dit pas qui l'a publié (l'oEmbed
  d'Instagram exige une application Meta et un jeton) : message clair, capture conseillée. Le
  compte suit ensuite la même chaîne qu'une capture (`findArtists`), source « dans le lien
  partagé » ; « Ajouter au Réseau » note « Repéré sur
  Instagram » pour un lien Instagram. Un lien collé hors d'un champ (⌘V) est lu aussi.
  `?url=<lien>` lit le lien à l'ouverture et `?coller=1` met en tête `ClipboardPasteButton`
  (lecture du presse-papiers sur un geste, seule voie sur iPhone) : c'est ce qu'ouvre le
  **raccourci iPhone** (`docs/RACCOURCI-REPERAGE.md`). Sur téléphone, ce bouton remplace le
  rappel ⌘ V. La connexion garde la page demandée (`?next=` posé par le proxy,
  `safeReturnPath`, pages `/app/…` seulement) : un partage reçu déconnecté ne se perd pas.
- **Nom d'artiste et photo d'un lien** (06/11/2026, Sacha : « theodora est quand même ultra
  connue », lien `instagram.com/theodorabosslady` resté « Pas sur Deezer ») : le pseudo seul ne
  porte pas le nom d'artiste. Trois ajouts, dans cet ordre :
  1. `confirmAccounts` = `confirmTikTok` puis `confirmInstagram` (`lib/catalog/capture-socials.ts`) :
     sans photo TikTok, la page publique Instagram (`lib/integrations/instagram-profile.ts`, balises
     Open Graph, parseurs purs `lib/integrations/social-page.ts` partagés avec `social-picture.ts`)
     donne le **nom affiché** (« Theodora Miss KITOKO », ajouté aux noms) et la **photo de profil**.
     `CaptureArtist.picture` (`lib/catalog/capture-picture.ts`) suit l'ordre du Réseau : Spotify de
     l'artiste, sinon le Deezer retenu (`linked`/`single`, ou choisi : `ChosenDeezer.picture`), sinon
     l'avatar TikTok, sinon Instagram ; lien de l'hébergeur d'images de la plateforme (liste fermée,
     `socialImageUrl`), affiché, jamais enregistré. « Ajouter au Réseau » l'affiche déjà dans la modale
     (`initial.pictureUrl` / `pictureSource`, « Reprise du profil Spotify ») ; le serveur la reprend
     des mêmes comptes à l'enregistrement. Modale `medium` comme les autres fiches du Réseau. Carte d'un lien : la photo remplace l'icône de
     lien (initiales sans photo) ; personnes d'une capture : avatar 40 px devant le nom.
  2. **PO propose le nom d'artiste** d'un lien (`lib/ai/instructions/link-names.ts`, schéma
     `link-names.ts`, une requête du quota) à partir du pseudo et des noms affichés, passés en
     données ; le code ne garde qu'un **morceau d'un nom reçu** (`piecesOf`, même règle que les
     `searchNames` d'une capture). Sans PO (quota, fournisseur), la recherche continue sur les noms
     lus. La personne s'affiche sous ce nom, sinon le nom affiché, sinon le pseudo.
  3. **Recherche inverse Wikidata** (`deezerIdOfAccount`, `lib/integrations/artist-socials.ts`) dans
     `matchOnDeezer`, pour une capture comme pour un lien : le compte Deezer (P2722) de l'élément qui
     porte ce TikTok (P7085) ou cet Instagram (P2003). Candidat prouvé d'emblée (`accountMatch`,
     « Compte trouvé »), jamais coupé par le tri aux fans, quel que soit son nom.
  Boutons de la carte : « Ajouter au Réseau » est l'action principale (noir), « Pas le bon compte
  Deezer ? » secondaire (gris) ; sans compte trouvé il devient « Indiquer son compte Deezer » (et
  « Fermer » au lieu de « Garder ce compte »).

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

- **Une policy par ligne qui appelle une fonction de visibilité coûte une requête par ligne lue.**
  Une fonction `SECURITY DEFINER` avec son `search_path` n'est jamais intégrée au plan :
  `can_see_project(project_id)` relançait 5 à 7 sous-requêtes pour chaque ligne, environ 1,5 ms la
  ligne, 45 ms pour 28 étapes, des secondes par page (mesuré sur la pré-prod le 26/10/2026).
  Une policy de lecture d'une table de projet s'écrit donc
  `project_id = any ((select public.visible_project_ids())::uuid[])` : la liste est calculée une
  fois par requête (InitPlan), 1 ms au lieu de 45. Le `::uuid[]` est obligatoire (sans lui,
  `= any ((select …))` compare à chaque ligne de la sous-requête). Une nouvelle façon de voir un
  projet s'ajoute **à la fois** à `can_see_project_row` et à `visible_project_ids`.
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
- **Types de notification** (18/10/2026) : `notifications_kind_check` ne se réécrit plus à la main ni par
  une relecture en expression régulière (Postgres affiche la contrainte sous deux formes, une migration en
  avait reconstruit la liste avec ses seuls quatre types et cassé tous les autres déclencheurs). Toute
  migration ajoute ses types par `select public.add_notification_kinds(array['…'])`
  (`20261018000101`), qui relit tous les noms quelle que soit la forme et les réunit.
