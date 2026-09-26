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
| `…260926000201_team_roles_invitations` | Postes (renommés en `…000401`), statut `invited`, `invite_member(...)`, T10 réécrit pour ouvrir une invitation à la confirmation d'email. |

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
  Photo = URL du CDN Deezer (pas de copie Storage) ; `ArtistAvatar` retombe sur les
  initiales si elle ne charge plus.
- Projet créé = « Non transmis » : ni étape, ni responsable (`owner_person_id` posé
  uniquement par `respond_to_assignment` à l'acceptation). Statut du projet **calculé par
  le code** (`projectStatusOf`) : étapes présentes → lancé, sinon dernière transmission
  (en attente, refusé, précision demandée), sinon non transmis. Les sections Cadrage / Calls / Sortie répondent 404 tant que le projet n'a
  pas d'étape (`requireLaunchedProject`).

Tests : `supabase test db` (pgTAP, `supabase/tests/*.test.sql`, 181 tests). Fixtures uniques par exécution (tag aléatoire) : passent sans reset.

Premier admin : `supabase/seed.sql` pose `admin@pds.test` en local. En production, poser
`bootstrap_admin_email` par une requête SQL explicite ; le verrou se ferme après usage.

---

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
- Coquille : `app/(app)/layout.tsx` (barre latérale noire, tiroir mobile), projets
  (`lib/projects/*`, étape actuelle calculée par le code), onglets projet : Vue d'ensemble,
  Cadrage, Calls, Sortie.

---

## 4. Calls, audio, transcription (étape 4 + enregistreur)

- Page d'un call : consentement (`pending` / `granted` / `refused`, aucun audio sans
  `granted`), enregistrement, transcription, compte rendu.
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
  le navigateur (RLS) → `attachAudio` (vérifie chemin, type, taille, consentement).
- Pipeline (`lib/calls/pipeline.ts`, routes `app/api/calls/[callId]/{transcribe,extract}`) :
  statut du call = verrou (un traitement à la fois), erreurs traduites (`audio_too_large`,
  `provider_quota`…), compte rendu via `save_call_report`.
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
Import d'un compte rendu → propositions « proposé · à confirmer » (Brief, besoins, équipe,
points ouverts), provenance cliquable (call + minutage + citation), confirmer / rejeter /
modifier, besoins identifié → engagé, actions proposées → tâches (responsable + échéance
choisis par une personne), circuit de validation.

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

---

## 8 bis. Notifications et mise à jour en direct

- Source unique : la table `notifications`, écrite par la base. Le texte est rédigé par le
  code (`lib/notifications/types.ts`), la base ne stocke que des identifiants.
- **Cloche** (`components/notifications/notification-bell.tsx`) dans le rail et l'en-tête
  mobile, données chargées par `app/(app)/layout.tsx`.
- **Realtime** (`notification-listener.tsx`) : à chaque insertion pour la personne
  connectée → `router.refresh()` (la page se met à jour sans recharger) + toast `sonner`
  (écart au design system, à valider avec Ibé). `supabase.realtime.setAuth()` **avant**
  `subscribe()`, sinon la socket est anonyme et la RLS ne laisse rien passer.
- **Web Push** : `public/sw.js` (écrit à la main, sans next-pwa), bouton d'activation
  dans la cloche, dépendance `web-push`. Envoi : `schedulePendingPushes()` après chaque
  action qui notifie (transmission, réponse, validation, tâche), exécuté dans `after()`
  avec la session de l'auteur. Clés VAPID facultatives : sans elles, la cloche marche,
  seules les notifications système sont coupées. iPhone : seulement app installée (PWA).
- Son : onglet visible → carillon synthétisé (`lib/notifications/chime.ts`, muet tant que
  la page n'a reçu aucun clic) ; onglet caché → notification système, son géré par l'OS
  (macOS : Réglages → Notifications → Google Chrome). Un push accepté (`201`) mais
  invisible vient presque toujours de ce réglage ou du mode Concentration.
- Une modification qui ne notifie personne ne rafraîchit pas les autres écrans.

## 9. Design (`docs/DESIGN.md`)

- Design system : tokens et pont shadcn dans `app/globals.css`, polices
  Geist / Inter / Geist Mono, boutons pilule noire, barre latérale noire.
- États métier → trois traitements (`blocked` noir plein, `normal` gris doux, `pending`
  contour) dans `lib/ui/state-treatments.ts`, affichés par `components/ui/status-badge.tsx`.
- Liens soulignés seulement s'ils n'ont pas de classe (adaptation assumée).
- **Piège `cn()`** : il confond les tailles de texte du système (`text-body-md`…) avec des
  couleurs ; dans une classe passée à `cn`, écrire `text-[length:var(--type-body-md)]`.
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
`ODESLI_API_KEY`, `CRON_SECRET` (≥ 32 car.), `SUPABASE_SERVICE_ROLE_KEY` (cron).

---

## 12. Pièges rencontrés (à ne pas redécouvrir)

- Docker Desktop est installé mais son CLI n'est pas dans le PATH : préfixer
  `PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"` pour `supabase`.
- Une seule stack Supabase à la fois (le repo `po` d'Ibé utilise les mêmes ports).
- `AGENTS.md` est réécrit par `next dev` : ne pas le supprimer (sinon il écrase `CLAUDE.md`).
- Next 16 : `proxy.ts` remplace le middleware ; sa doc est dans `node_modules/next/dist/docs/`.
- zsh : ne jamais nommer une variable de boucle `path` (elle écrase `PATH`).
- Chrome headless : `--use-fake-device-for-media-stream` fournit un bip (micro et onglet),
  `--use-file-for-fake-audio-capture` reste muet sur macOS ; un vrai silence d'onglet ne
  se simule pas.
- **Numéros de migration en parallèle** : deux sessions ont créé chacune un `…000801`. Avant
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
