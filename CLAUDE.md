# CLAUDE.md

Fichier lu à chaque session. Reste court. Le contexte long est dans `docs/`.

---

## Le projet en trois lignes

**PDS OS** est un outil interne de gestion du cycle de vie des sorties musicales, pour un
label/créateur. L'assistant intégré s'appelle **PO**. Application web **desktop-first**,
responsive, installable en PWA. Utilisateurs cibles en V1 : 3 à 5 personnes, en interne.

-----

## Quand lire quoi

| Situation                                            | Fichier à ouvrir                                |
| ---------------------------------------------------- | ----------------------------------------------- |
| **Toute UX, tout parcours, tout proto** : vision produit, patron d'écran, règles | `docs/VISION-UX.md` |
| Faire un proto cliquable (méthode, moteur, tests, protos de référence) | `docs/PROTOS.md`, `docs/protos/` |
| Apparence de l'interface (icônes, typo, couleurs d'état, coquille) | `docs/DESIGN.md`                  |
| Design system : couches, tokens (`tokens.json`), contrat des composants, changer de DS, Figma | `design-system/README.md` |
| Où est quoi dans le code, pièges déjà rencontrés     | `docs/ARCHITECTURE.md`                          |
| Comportement de l'assistant PO                       | `docs/ASSISTANT.md`                             |
| Avant de créer un composant : ce qui existe déjà     | `docs/COMPOSANTS.md`                            |
| Règles métier, vocabulaire, points à trancher        | `docs/CONTEXTE-PROJET.md`                       |
| Ce qui a déjà été livré (lots, migrations, tests)    | `docs/AVANCEMENT.md`                            |
| Production : rôles d'un tournage, interne/externe, écarts | `docs/PRODUCTION-METIER.md`                |
| Marketing : ce qu'Ibé demande par module, ce qui reste | `docs/MARKETING-METIER.md`              |
| Pré-prod : branche `pre-prod`, barre « Voir comme / Aller à », jeu de données | `docs/PREPROD.md` |
| Patterns de Midday (listes, fiches, justificatifs, IA) et leur application ici | `docs/ANALYSE-MIDDAY.md` |
| Finance, nouveau style d'après Midday : thème `.finance-scope`, lots et état | `docs/FINANCE-V2.md` |
| **Étendre le style de Finance à toute l'app** (tokens cibles, densité, patterns, plan de migration) | `docs/STYLE-FINANCE-PARTOUT.md` |
| **Retours design de Sacha et bonnes pratiques** (matière d’un futur skill) : y noter chaque retour, les relire avant de toucher un écran | `docs/bonnes-pratiques/` |

---

## Stack imposée

```
Next.js (App Router) + TypeScript strict
Tailwind + shadcn/ui
Supabase (Postgres, Auth, Storage, RLS, Realtime)
Vercel AI SDK          → couche unique sur les fournisseurs de LLM
                         (@ai-sdk/anthropic · mistral · groq · google · react)
                         LLM de production : Claude Haiku 5.5 ; audio : Groq
Playwright             → export PDF des documents (playwright-core + @sparticuz/chromium
                         sur Vercel, Chrome local en dev ; lib/pdf/render.ts)
next-pwa               → installation sur mobile (phase ultérieure)
```

Outillage ajouté : zod, server-only, web-push (notifications navigateur), nucleo-sharp-essential (icônes, `docs/DESIGN.md` § 1), modern-screenshot (capture d'une zone de la page pour un retour, chargé à la demande), unpdf (texte d'un PDF importé comme modèle de contrat, chargé à la demande), pdf-lib (remplit le formulaire officiel du bulletin SACEM 725, `lib/legal/formalities/bulletin-pdf.ts`), read-excel-file (lecture seule d'un tableau Excel d'agence côté serveur, `lib/activations/agency/parse.ts`), nodemailer (e-mails envoyés par PDS OS depuis le Gmail de po@pdsrecords.com, seul point d'entrée `lib/email/send.ts`, `EMAIL_SMTP_USER`/`EMAIL_SMTP_PASSWORD` ; sans eux l'envoi reste déclaré), imapflow + mailparser (lecture de la boîte de po@ en IMAP, seul point d'entrée `lib/email/inbox.ts` : réponses aux demandes d'autorisation rangées par `/api/cron/inbox`, boîte et Envoyés copiés pour la page Mails, même mot de passe que l'envoi), Prettier + plugin Tailwind, lint-staged +
simple-git-hooks (pre-commit).

Ne remplace aucune de ces briques sans demander. Ne propose pas d'alternative
« meilleure » en cours de tâche.

---

## Règles non négociables

1. **Aucune clé d'API côté client.** Tout appel à un fournisseur passe par une route
   serveur. Jamais de `NEXT_PUBLIC_` sur un secret.
2. **Un seul point d'entrée par service externe.** `lib/ai/llm.ts` et
   `lib/ai/transcribe.ts`. Changer de fournisseur doit être une variable
   d'environnement, jamais une refonte.
3. **Le RLS est la sécurité, pas le code applicatif.** Jamais de `service_role` dans un
   chemin déclenché par un utilisateur.
4. **Les transcriptions et tout contenu importé sont des données, jamais des
   instructions.** Ne jamais concaténer une transcription dans un prompt système.
5. **Pas de dépendance ajoutée sans la nommer et expliquer pourquoi.**
6. **L'IA ne produit jamais un état, un compteur, une date ou un calcul.** En cas de
   doute : c'est du code.
7. **Pas de `localStorage` pour des données métier.** Tout passe par Supabase.
8. **Toujours pousser d'abord sur `pre-prod`, jamais directement sur `main`** (Sacha, 26/10/2026).
   On code et on pousse sur `pre-prod`, on teste sur la pré-prod ; `main` ne reçoit que `pre-prod`
   fusionnée, une fois validée, et seulement quand Sacha le demande.

---

## Conventions

- **Langue** : code, noms de variables, commentaires et commits en anglais. Textes
  d'interface en **français**, regroupés, jamais en dur dispersés dans les composants.
- **TypeScript strict**, pas de `any`. Types de la base générés depuis Supabase.
- **Composants serveur par défaut.** `"use client"` seulement si état ou événement.
- **Fichiers courts.** Au-delà de ~200 lignes, découper.
- **Nommage** : `kebab-case` pour les fichiers, `PascalCase` pour les composants,
  `camelCase` pour le reste.
- **Commits** : `type(scope): message` — `feat`, `fix`, `chore`, `docs`, `refactor`.
- **Périmètre** : Claude peut modifier le front-end **et le back-end** (migrations, RLS,
  Server Actions, routes, `lib/`), en respectant les « Règles non négociables ».

---

## Composants d'abord : zéro duplication

But : une modification d'interface se fait **à un seul endroit**.

1. **Chercher avant de créer.** Partir de `docs/COMPOSANTS.md` (inventaire complet), puis
   de `components/<domaine>/`. Réutiliser ou étendre l'existant.
2. **Deux fois = un composant.** Dès qu'un bloc de JSX ou une suite de classes revient une
   deuxième fois, l'extraire en composant et remplacer **toutes** les occurrences. Pas
   d'extraction préventive « qui pourrait servir ».
3. **Une variante = une prop, jamais une copie.** Pour une variation, ajouter une prop ou
   une variante `cva` (modèle : `button.tsx`, `status-badge.tsx`). Avant de modifier un
   composant commun, vérifier ses autres usages.
4. **Bien ranger.** Générique, sans métier → `components/ui/` ; structure de page →
   `components/shell/` ; métier → `components/<domaine>/` ; utilisé par plusieurs domaines
   → remonter dans `ui/` ou `shell/`. Logique client répétée (état, effets) → hook
   `use-*.ts` à côté des composants.
5. **Aucune valeur en dur.** Couleurs, rayons, ombres, espacements : tokens de
   `app/globals.css` et classes Tailwind, jamais de hex ni de `style={{…}}` ponctuel.
   Classes conditionnelles avec `cn()`. Textes dans `lib/i18n/fr/`.
6. **Un composant = un rôle**, props typées explicitement, ~200 lignes au plus.
7. **Un pattern modifié l'est partout** (Sacha, 06/11/2026) : le changement va dans le composant
   ou la fonction commune et **chaque** écran qui l'utilise est vérifié ; jamais une option
   activée sur un seul écran. Un écart voulu se justifie dans `docs/DESIGN.md`.
8. **Léger côté client.** `"use client"` le plus bas possible dans l'arbre (sur la feuille
   interactive, pas sur la page) ; composant client lourd et rarement affiché (modale,
   éditeur) → `next/dynamic`.

## Formulaires : ne jamais faire retaper

Règles de Sacha (07 et 08/10/2026), partout dans l'app (`docs/DESIGN.md` § 4, « Personnes et
pré-remplissage », « Champs obligatoires », « Manques à la validation ») :

1. **Désigner une personne ou une structure = `PersonPickerField`** (Réseau, personnes déjà
   liées à l'objet en tête, création en modale, « Garder seulement le nom » en dernier
   recours), jamais un champ texte libre ; on enregistre l'id, jamais un lien par le nom.
   Les comptes de l'app (responsable, assigné, validateur) restent choisis parmi les membres.
2. **Tout ce que PDS OS sait est pré-rempli** (fiche de renseignements, coordonnées, rôle,
   crédits, montants, dates connues ailleurs), corrigeable, avec sa source si le formulaire
   en montre une. Choisir une personne remplit ce qu'on sait d'elle (`onPick`). Seule
   exception : ce qu'une règle interdit de déduire.
3. **Obligatoire = « * » après le libellé, facultatif = rien** : jamais le mot
   « facultatif » sur un champ (`required` sur le champ, `RequiredMark`, `docs/DESIGN.md` § 4,
   « Champs obligatoires », décision du 08/10/2026).
4. **À la validation, chaque champ manquant passe en rouge avec sa raison** (`error` du
   champ, `FieldError`), un `FormMessage` compte les manques, focus sur le premier ; jamais
   avant le premier essai, jamais de bouton désactivé pour ça.

---

## Design system

`docs/DESIGN.md` fait foi → valeurs dans `app/globals.css` (tokens `--po-*`, `--selection-*`,
`--surface-*`, `--text-*`, `--tone-*`, `--space-*`, `--radius-*`… ; thème sombre = bloc
`:root.dark` qui redéfinit les tokens, jamais un composant). Ton d'un état :
`lib/ui/state-tones.ts` (`StatusBadge tone=…`), jamais choisi au cas par cas ; teinte d'une
catégorie : `lib/ui/category-hues.ts`. **Style de Finance partout depuis le 16/11/2026**
(`docs/STYLE-FINANCE-PARTOUT.md`, fait foi) : Google Sans Flex 15 px courant en 450, 550 pour ce qui ressort,
cartes 8, boutons et champs 6. **Nouveau style validé par Ibé le 24/11/2026** : on ne code plus pour l'ancien (`classic:`,
`useDesignStyle()`), qui reste derrière Réglages › Style de l'interface jusqu'au nettoyage (§ 13). Icônes : Nucleo Sharp (`nucleo-sharp-essential`) + `components/icons/`,
**jamais Lucide**. **Modales** : `Dialog` (`FormDialog`, `ConfirmDialog`), en panneau à droite en nouveau style,
« verre » centré en classique ; détail d'une ligne en `SideSheet`. **Boutons** : un secondaire est en contour
(`outline`) ; un bouton texte sans contour (`ghost`) seulement à côté d'un secondaire en contour, jamais une
rangée de `ghost` seuls (Sacha, 06-07/11/2026, `docs/DESIGN.md` « Bouton secondaire »).

**Inventaire complet : `docs/COMPOSANTS.md`**, tenu à jour par Claude dans la même tâche dès
qu'un composant commun, une variante, un token ou une icône change. Les briques à connaître :

- **Actions** : `Button` (cva, modèle des variantes), `RowActions` / `RecordMenu` (« ⋯ »),
  `ConfirmButton`, `ConfirmDialog`, `DialogButton`, `LoadedFormButton`, `CopyButton`, `toast`
  (maison, `ui/toast.ts`, plus de sonner),
  `PdfExportButton`, `useWriteSubmit` (**toute** écriture : attente, erreur, toast ; résultat
  `WriteResult`).
- **Formulaires** : `Field`, `TextareaField`, `SubmitButton`, `FormMessage`, `FieldError`
  (`components/auth/`), `RequiredMark`, `FormDialog`, `DialogFormActions`, `ReasonForm`,
  `FormSection`, `CheckboxField`, `Checkbox`, `ChoiceCards`, `ChipChoice`, `OptionSelect`,
  `PersonPickerField` (**toute** désignation d'une personne), `SearchPicker`, `FilePickField`,
  `FileDropZone`, `useFormDirty`.
- **Listes et données** : `DataTable` (**tout** tableau, onglets `DataTableViews`, tri par en-tête intégré `ui/table-sort.tsx`),
  `SearchableList` + `ListToolbar` / `FilterBar` (**toute** ligne recherche + filtres), `FilterChip`,
  `UrlFilters`, `RowSelection`, `FactRows` / `FactRow` (**tout** fait avec sa source : Brief
  du Master, État des lieux, Réponses du Cadrage juridique), `FactList`, `StatTiles`, `ListCard`, `StatusBadge`, `StatusDot`,
  `ProgressBar`, `Timestamp` (**tout** instant), `DayGroups`, `AudioFile`.
- **Page** : `PageContainer`, `PageHeader`, `PageSection`, `SectionTabs` / `TabBar`,
  `ProcessSteps`, `BackLink`, `ViewLink` (vues préchargées), `EmptyState` / `EmptyNote`,
  `Skeleton` / `PageLoading`, `Loaded` / `useLoaded`, `ToneCallout`, `OneTimeLinksProvider`
  (**tout** lien à usage unique), `ProjectPageTitle` (titre de toute page de projet).

---

## Arborescence

```
app/                    routes (App Router)
  (app)/                interface authentifiée
  (public)/             pages partagées par lien à jeton
  api/                  route handlers — tout ce qui touche un secret
components/
  ui/                   shadcn
  <domaine>/            composants métier
lib/
  ai/                   llm.ts, transcribe.ts, schemas/, instructions/
  assistant/ insights/  assistant PO et requêtes partagées avec l'accueil
  auth/ calls/ framing/ projects/ release/ integrations/ labo/
  facts/                faits partagés des workflows spécialisés (Juridique, Master)
  legal/ master-workflow/  workflows spécialisés Juridique et Master
  i18n/fr/              textes d'interface, un fichier par domaine
  supabase/             clients serveur, navigateur, admin (cron seul), types générés
supabase/
  migrations/           SQL versionné, source de vérité du schéma
  tests/                pgTAP (supabase test db)
docs/                   design, assistant, architecture
```

---

## Commandes

```bash
pnpm dev            # serveur de développement
pnpm build          # build de production — doit passer avant tout commit
pnpm lint
pnpm typecheck      # next typegen + tsc
pnpm format         # Prettier + tri des classes Tailwind
pnpm db:types       # régénère lib/supabase/database.types.ts (base locale)
pnpm ds:tokens      # régénère design-system/tokens.json depuis app/globals.css (ds:tokens:check en CI)
supabase start      # stack locale (Docker : voir docs/ARCHITECTURE.md § 12)
supabase db reset   # rejoue les migrations + seed
supabase test db    # tests de sécurité SQL (pgTAP)
pnpm preprod:reset  # pré-prod : migrations + supabase/preprod/seed.sql (docs/PREPROD.md)
pnpm db:types:preprod  # types depuis la base de pré-prod (dev sans Docker, docs/PREPROD.md § 6)
pnpm email:templates  # régénère les e-mails Supabase Auth (supabase/templates) depuis lib/email/layout.ts, puis les recoller dans Supabase
pnpm eval:po        # questions tests de PO contre l'app qui tourne (EVAL_EMAIL/EVAL_PASSWORD, docs/ASSISTANT.md § 5)
# Production : Vercel déploie le code, JAMAIS les migrations. Après toute migration,
# vérifier puis pousser (avec accord), URL = ligne « EN LIGNE — SUPABASE_DB_URL » de .env.local :
supabase migration list --db-url "$PROD_DB_URL"              # lecture seule
supabase db push --db-url "$PROD_DB_URL" --include-all --dry-run
```

---

## Repères dans le code

Le détail (et les pièges déjà rencontrés, § 12) est dans `docs/ARCHITECTURE.md`. Ce qui vaut
partout :

- **Sécurité** : toutes les écritures passent par la session utilisateur (RLS forcé, droits
  colonne par colonne, clés composites par organisation). Service role : cron seul
  (`lib/supabase/admin.ts`). États (étapes, validations) : fonctions SQL uniquement.
- **Permissions** : postes (DG, chef de projet, directeur créatif) ≠ permissions ; seule
  `role_permissions` (SQL) donne les droits, le code teste `can(access, "…")`. **Dans un projet
  lancé, seul son responsable écrit** ; le DG lit et valide (`is_project_owner`,
  `canEditProject`) ; exception : ses dépenses, écrites aussi par la Finance (`manage_finance`, 24/11). Une étape validée est définitive ; un Cadrage soumis est figé en RLS.
  Visibilité : `can_see_project`. Premier admin local : `admin@pds.test` (Mailpit
  http://127.0.0.1:54324).
- **Navigation fluide** (§ 3 bis) : `ViewLink`, `loading.tsx` partout, accès + données en un
  aller-retour (`allInOrder`), `getClaims()` plutôt que `getUser()`. Juger en `pnpm start`,
  jamais en `pnpm dev`.
- **Env** : `lib/env.ts` / `lib/env-public.ts` ; toute variable s'ajoute au schéma zod **et** à
  `.env.example`.
- **IA** : `lib/ai/llm.ts` et `lib/ai/transcribe.ts` seuls points d'entrée (`LLM_PROVIDER` :
  Claude Haiku 5.5 en production, sans `temperature`, effort `low`, règles de PO en cache ;
  Mistral `ministral-14b-latest` en local ; Groq pour l'audio). Provenance calculée par le code
  (`lib/ai/provenance.ts`). Jamais la date du jour dans le contexte du modèle. **PO = assistant de travail**
  (18/11, `IA microsoft/ETUDE-USAGES-IA.md`) : écrit, traduit, explique sans fonction ; graphiques et fichiers
  (CSV, PDF) sous la réponse par `show_chart` / `export_list` / `make_pdf`, calculés par le code
  (`docs/ASSISTANT.md` § 3 sexies) ; ce qu'il ne sait pas faire → `report_gap` (§ 4 bis).
- **Quota de PO** (`docs/ARCHITECTURE.md` § 5 bis) : chaque appel au modèle prend une requête
  du membre (`takeAiRequest`, SQL `consume_ai_request`, journée de Paris) ; limite par membre
  changée par le DG dans Équipe, utilisation dans `/app/settings`. Un nouvel appelant affiche
  `aiQuotaMessage(error)` avant son erreur générique.
- **PO écrit avec validation humaine** (`docs/ASSISTANT.md`) : les outils `propose_*`
  (`lib/assistant/propose/`) renvoient un brouillon qui ouvre le **vrai formulaire** pré-rempli,
  l'humain enregistre. Chiffres, dates, e-mails recopiés et vérifiés par le code
  (`verbatim.ts`, `said-date.ts`). Jamais de décision (valider, transmettre, signer) ni de clause
  écrite par PO. **Un nouveau formulaire = un `initial`/`defaults` et `stay`** pour être ouvert
  par PO. Données de test (hors prod) : `fill_page_test_data`, `create_test_data`.
- **Guide de PDS OS pour PO** (`docs/ASSISTANT.md` § 3 quater à 4 bis, `lib/assistant/guide/`, `read/`) : PO répond sur
  l'app et sur lui-même (`app_guide`), les droits (`explain_access`), les notions du métier (`explain_notion`) et lit
  chaque domaine (`lib/assistant/read/`) ; questions sans réponse comptées sans texte dans Notion (`gaps.ts`). **Un parcours, une page ou
  une règle de droits modifiés mettent à jour leur sujet du guide dans la même tâche** ; ce que PO lit ou
  prépare de nouveau met à jour `topics/po.ts`. Liens, libellés et droits sont lus du code, pas écrits.
- **Historique de PO** (`docs/ASSISTANT.md` § 2 ter) : enregistré sous l'id du `Chat` ; nouvelle
  conversation = nouveau `Chat` (`startSharedChat`), jamais `setMessages([])`.
- **Audio** : enregistreur dans l'app, sauvegarde toutes les 20 s en parties
  (`call_recording_takes` / `_pieces`), `AudioContext.resume()` obligatoire, puis transcription
  → compte rendu → Brief automatiques (§ 4).
- **Notifications** : table `notifications` écrite par triggers seuls (une migration ajoute ses types
  par `select add_notification_kinds(array['…'])`, jamais en réécrivant `notifications_kind_check`) ; push par
  `schedulePendingPushes()` après toute action qui notifie (§ 8 bis). Pages d'un projet relues
  après un changement par `ProjectLive` (`project_live`, Realtime).
- **Archivage / suppression** (§ 2 quater) : DG seul, `archive_records` / `delete_records`
  (SQL), refusés si encore utilisé. **Toute nouvelle table liée à un projet doit entrer dans
  `delete_project_row` et appeler `select public.attach_project_live();`** dans sa migration
  (version du projet, cache des parcours : `docs/ARCHITECTURE.md` § 3 bis).
- **Chargement des pages** (§ 3 bis, audits 26-28/10) : `ViewLink` précharge au survol ; vues et
  réponses gardées par **table du projet** (`project_live.tables`, `byProjectVersion`, cache par
  requête) : dans `lib/`, `trackedCache` et jamais `cache` de React ; `PERF_TRACE=1` pour mesurer. Vues aussi gardées
  **en base** (`project_view_cache`, instance neuve), tables des fonctions par `live_function_map`, 16 requêtes en vol au plus
  (`request-gate.ts`) : audit du 07/11, § 3 bis.
- **Workflows** : statut commun (Non démarré / En cours / En attente / Bloqué / Terminé)
  calculé à chaque lecture par `loadWorkflowStates` (`lib/workflow-status/`), jamais stocké. Branche
  `feat/projet-complet` : un parcours par workflow (`lib/journey/<zone>.ts`, réunis par
  `loadProjectJourneys`), source unique de « Maintenant », Travail, Validations et pastilles ; patron
  d'écran `JourneyLayout` : `JourneySpine` toute la hauteur à gauche, `ProjectHeader head={step}` (h1 =
  titre de l'étape) puis `StepPanel` sans carte, pas de `NowCard` dans un module (10/11/2026,
  `docs/ARCHITECTURE.md` § 3 ter). Le geste du lecteur passe en tête (`StepPanel lead`, `#a-vous`, sans
  ligne « À vous · … ») et tout lien vers une action suit `actionHref(step)`, jamais `step.href` seul.
- **Textes** : `lib/i18n/fr/<domaine>.ts`. Côté client, importer le domaine lu et faire un `fr` local (`const fr = { calls };`), jamais tout `@/lib/i18n/fr` (921 Ko, règle ESLint, § 3 bis). `cn()` : `lib/utils/index.ts`.
- **Branches** : `main` (prod) et `pre-prod` seulement (26/10/2026). On travaille sur `pre-prod`, puis on la
  fusionne dans `main`. **Pré-prod** (`docs/PREPROD.md`) : base Supabase dédiée ; `PREPROD_TOOLS=1` affiche la barre « Voir comme /
  Aller à » (`lib/preprod/`). Un moment de plus = un bloc de `supabase/preprod/seed.sql` joué par les vrais gestes.
  **`pnpm dev` tourne de nouveau sur Docker** depuis le 07/11 (la pré-prod gratuite swappait : Auth 120 s,
  pages bloquées) : `supabase migration up --local` ; Docker hors PATH (`/Applications/Docker.app/Contents/Resources/bin`).
  Revenir à la pré-prod : lignes « PRÉ-PROD — » de `.env.local`, `docs/PREPROD.md` § 6.
- **`AGENTS.md`** est réécrit par `next dev` : ne pas le supprimer. Doc Next 16 :
  `node_modules/next/dist/docs/`.

**Où est chaque domaine** (code → `docs/ARCHITECTURE.md`) :

| Domaine | Code | § |
| --- | --- | --- |
| Catalogue (artistes, titres, versions audio, fichiers) | `lib/catalog/`, `components/catalog/` | 2 à 2 nonies |
| Sessions studio (état calculé, page, compte rendu guidé, rushs en liens) et Maquettes (`demo_status`, « Passer au catalogue des masters ») | `lib/sessions/`, `components/sessions/`, `lib/catalog/demo-*` | 2 sexies bis |
| Projets (création par type, brouillons, liste, pochette : `lib/projects/covers.ts`, `set_project_cover`) | `lib/projects/`, `components/projects/` | 2 septies bis, 2 octies, 8 ter |
| Calls (deux portes : Calls et Calls du projet, `lib/calls/door.ts` ; liste, calendrier Teams repris par la semaine du Calendrier, enregistrement, compte rendu) | `lib/calls/`, `components/calls/` | 4, 4 bis |
| Cadrage (relecture guidée, Brief, dictée) | `lib/framing/`, `lib/voice/` | 6 |
| Stratégie | `lib/strategy/` | 6 bis |
| Plan du projet, Vue d'ensemble | `lib/project-plan/`, `components/overview/` | 6 ter |
| Accueil, PO, Travail, Calendrier | `lib/assistant/`, `lib/work/`, `lib/calendar/` | 8 |
| Pages d'un projet, Budget | `lib/project-work/`, `components/budget/` | 8 ter |
| Retours (`/app/feedback`, Notion) | `lib/feedback/` | 8 quater |
| Mails (`/app/mail` : boîte de po@ copiée par le cron, chacun les siens, la direction tout par `read_mailbox`, écrire / répondre, outil `mailbox` de PO ; « Mon Gmail » lu en direct, privé) | `lib/mailbox/`, `components/mailbox/` | 8 quindecies |
| Réseau, Contrats, bibliothèque | `lib/network/`, `components/contracts/` | 8 quinquies |
| Finance (`/app/finance`, 10 sections (ticket « Cockpit Finance » d'Ibé du 13/11) : vue d'ensemble, trésorerie, rapprochement, justificatifs, dépenses, budgets, factures, financements, alertes, exports ; nouveau style d'après Midday : `docs/FINANCE-V2.md` ; `read_finance` / `manage_finance` : direction et « la Finance » = business managers, business ; moteurs calculés, jamais stockés) | `lib/finance/` (justificatifs : `proof*.ts`), `components/finance/` (`receipts/`) | 8 ter ter |
| Business : deals (`/app/deals`, étapes, termes, relances, calls d'un deal, deal memo et contrat, contacts privés, onglet « Business » de la fiche artiste ; postes `business_manager`, `business`) | `lib/deals/`, `components/deals/` | 8 quaterdecies |
| Juridique (État des lieux, Plan, fiches, contrats, répartitions, emprunts, SACEM) | `lib/legal/` | 8 sexies |
| Master (Source, Brief, Mixage, Mastering, Master final, lien `/m/…`) | `lib/master-workflow/` | 8 septies |
| Distribution (The Orchard, dépôt manuel) | `lib/distribution/` | 8 octies |
| Marketing : Production, Conception, Activations, Suivi & bilan | `lib/design/`, `lib/activations/`, `lib/marketing/` | 8 nonies à 8 terdecies |
| Labo IA (`/labo` local), Repérage (`/app/labo`, captures TikTok et liens, raccourci iPhone : `docs/RACCOURCI-REPERAGE.md`) | `lib/labo/`, `lib/catalog/` | 10, 10 bis |

---

## Retours des tests à coder (Notion « Retours »)

Les retours des tests de l'équipe arrivent en Google Docs dans le **dossier Drive public des retours**
(`1pA4sFFNcryheseimz47npk8KtdtoetJO`, un sous-dossier par domaine) et sont repris **automatiquement**,
toutes les 2 h, en pages de la base Notion **Retours** (PDS OS › Retours,
`collection://39885a02-74d4-4985-8520-75a921811b9b`) par `~/.local/bin/pds-retours-sync.py`
(détails dans `~/CLAUDE.md`). Ne pas confondre avec la fonction « Retours » de l'app (`/app/feedback`).

- Chaque retour porte une **Partie** (Cadrage, Master, Sessions studio…, plusieurs possibles ;
  Transverse = toute l'app) : vue « À faire par partie » pour traiter une partie d'un coup.
- **Avant de coder** un retour : lire sa page Notion (résumé, « Où on en est ») **et** le doc Drive
  complet (lien dans « Lien », lisible par `curl …/export?format=txt`).
- **États** (07/11/2026) : Pas commencé → **Besoin de précision** (retour trop vague : écrire en fin de
  page ce qui manque, écran, geste) → En cours → **À tester** → Terminé.
- **Dès qu'il est codé et que le build passe** (sans attendre le push), passer la page en
  **« À tester »**, jamais « Terminé » ; c'est la personne qui a signalé le retour (ou Sacha) qui le passe en Terminé après
  l'avoir vérifié en pré-prod. Si une partie reste (point à trancher, ticket séparé), l'ajouter en fin
  de page (« Lot … du JJ/MM : fait / reste »).
- Bilan de tout ce qui est terminé et de ce que ça change : page « Bilan des retours terminés » sous
  Retours.

## Méthode de travail attendue

- **Construire en autonomie.** Quand Sacha demande quelque chose, le construire de bout
  en bout **sans demander de vérification ni de feu vert** : pas de liste « j'attends ton
  accord », pas de question de confirmation. Une règle métier manque → prendre la
  décision la plus cohérente avec `docs/` et les règles non négociables, l'écrire dans
  `docs/`, et la signaler dans le bilan de fin.
- **Une étape à la fois.** Ne code pas la suivante sans qu'on te la demande.
- **Pas de fonctionnalité non demandée.** Pas de page bonus, pas de composant
  « qui pourrait servir ».
- **À la fin de chaque étape**, `pnpm build` doit passer, et tu listes ce qui a été fait
  et ce qui reste.

---

## Maintenance de ce fichier

Garde ce CLAUDE.md à jour, sans attendre qu'on le demande. Dès qu'une fonctionnalité,
une dépendance, une partie d'architecture, une convention ou une commande importante
apparaît ou change, mets à jour la section concernée (en général « Repères dans le code »
ou « Commandes »). N'ajoute que des informations utiles et durables, jamais de détails
éphémères. **Le fichier doit rester sous ~25 000 caractères** : un détail de fonctionnalité va
dans `docs/ARCHITECTURE.md`, un composant dans `docs/COMPOSANTS.md`, un lot livré dans
`docs/AVANCEMENT.md`, avec au plus une ligne de renvoi ici.

---

---

## État d'avancement

Historique des lots livrés : `docs/AVANCEMENT.md` (y ajouter chaque lot terminé).

À faire ensuite (proposé, non commencé) :

- [ ] À tester par l'équipe dans un vrai Chrome : enregistrement d'un vrai Meet (deux voix
      dans la transcription, alerte après avoir raccroché)
- [ ] Repartir des tickets du 30/09 (dossier Drive « Tickets ») : **Cadrage intelligent**
      (6 dimensions, Plan du projet), puis **Juridique 08** (Récap Sortie, Release Readiness).
      Points à trancher : `docs/CONTEXTE-PROJET.md` § 2
- [ ] **Prod à jour le 26/11/2026** : `main` = `e34fb871` (= `pre-prod` : « Nouveau contrat » refait, contrat déposé lu à côté de ses champs, dates lues et « Déjà signé », modèle en deux colonnes, menus sous leur champ) ; migrations jusqu'à `20261126170101` appliquées en prod et en pré-prod le 26/11 (à la demande de Sacha). **Toute fusion dans `main` = vérifier la liste des migrations de prod** (`db push --dry-run`) : le 16/11, `main` déployée sans elles avait cassé la page Master. Reste (`LEGAL_LINK_KEY` et SMTP en place sur Vercel) : passages navigateur de
      l'équipe, question ACT-002 posée à Ibé, signature de PDS Éditions sur le bulletin SACEM
- [ ] **Claude en prod** : `ANTHROPIC_API_KEY` + `LLM_PROVIDER=anthropic` posés sur Vercel le 10/11 (prod et
      préversions, sans `LLM_MODEL` → Haiku 5.5 par défaut) ; reste : mesurer durée, jetons, cache
- [ ] **Pré-prod** (`docs/PREPROD.md`, en ligne le 26/10) : limiter `NEXT_PUBLIC_SITE_URL`, `PREPROD_TOOLS`,
      `PREPROD_PASSWORD` à la branche `pre-prod` dans Vercel ; protection avant d'ouvrir à Ibé ; moments
      suivants du jeu de données
- [ ] **Lenteur (audits 27-28/10)** : reste les gestes d'écriture (optimiste) et l'instance Vercel froide
      (lot 4)
- [ ] Directeur créatif : dépôt de versions des livrables (il lit seulement pour l'instant)
- [ ] Export **Plan de sortie** (PDF, `lib/pdf/render.ts`) et partage par lien de la Stratégie
- [ ] Dictée sur les autres étapes (Sortie…) : un adaptateur chacune
- [ ] Politique de suppression Storage (remplacer un audio, fichiers orphelins)

Décisions en attente (avec Ibé / le client) :

- Quel projet fait foi : `po` d'Ibé (7 briques, sans IA) ou PDS OS ; qui s'appelle « PO »
- Contenu de « Défense », qui valide quoi, 7 ou 5 étapes
- **Démarrage avec l'équipe : lundi 19/10/2026** (Ibé, 14/10), progressif, en conditions réelles
- Clé Odesli ou smartlink maison
- **Comptes payés par Ibé, configurés le 30/10/2026** : organisation Anthropic « PDS » (crédits,
  invitation Developer à sordulo.contact@gmail.com), Groq plan Developer (invitation), projet
  Google Cloud « PDS OS » (sordulo.contact@ Éditeur), adresse **po@pdsrecords.com** (2FA), SMTP
  Gmail saisi par Ibé dans Supabase (mot de passe d'application). **Reste côté Sacha** : accepter
  les invitations, créer les clés de l'org PDS (`ANTHROPIC_API_KEY` + `LLM_PROVIDER=anthropic`,
  `GROQ_API_KEY`) sur Vercel et en local ; vérifier sur quel projet Supabase est le SMTP et envoyer
  un e-mail test. **Google (06/11)** : API Calendar, Drive et Meet activées ; le jeton en place
  (po@, client « PDS-OS » du 30/10) n'a que `calendar.events`. Nouveau jeton (client « PDS OS
  Jeton », Calendar + Drive + Meet) à faire avec Ibé, qui seul ouvre po@ (`docs/ARCHITECTURE.md`
  § 4 bis), puis remplacer les 3 `GOOGLE_CALENDAR_*` en local et sur Vercel et supprimer l'ancien
  client. D'ici là la transcription automatique des Meet est refusée (403 journalisé). **21/11/2026 : le jeton local est refusé (`invalid_grant`)**, plus aucun Meet n'est créé ; « Caler le call » le dit par un toast.
  **Workspace = Business Starter, 7 comptes (Ibé, 06/11)** : Meet n'y transcrit pas ; la reprise de
  la transcription Meet (page du call) ne sert qu'en Business Standard ou plus, sinon enregistreur de l'app
- Mise en production : réactiver la confirmation d'email, durée max des fonctions (300 s) selon
  l'offre Vercel. Fait le 10/11 : `PUSH_CLAIM_SECRET` (une valeur par base, = Vault `push_claim_secret`
  de la prod et de la pré-prod), toutes les clés de service testées ; reste la `service_role` de la
  pré-prod sur Vercel (c'est celle de la prod, 401)
