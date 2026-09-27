# CLAUDE.md

Fichier lu à chaque session. Reste court. Le contexte long est dans `docs/`.

---

## Le projet en trois lignes

**PDS OS** est un outil interne de gestion du cycle de vie des sorties musicales, pour un
label/créateur. L'assistant intégré s'appelle **PO**. Application web **desktop-first**,
responsive, installable en PWA. Utilisateurs cibles en V1 : 3 à 5 personnes, en interne.

---

## Quand lire quoi

| Situation                                            | Fichier à ouvrir                                |
| ---------------------------------------------------- | ----------------------------------------------- |
| Comprendre le métier, les 7 étapes, le vocabulaire   | `docs/CONTEXTE-PROJET.md`                       |
| Savoir ce qui est faisable techniquement, quelle API | `docs/CONTEXTE-PROJET.md` § 5 et § 6            |
| Savoir ce que l'IA doit faire ou ne pas faire        | `docs/CONTEXTE-PROJET.md` § 7                   |
| Savoir ce qui est hors périmètre                     | `docs/CONTEXTE-PROJET.md` § 9                   |
| Apparence de l'interface (icônes, typo, couleurs d'état, coquille) | `docs/DESIGN.md`                  |
| Où est quoi dans le code, pièges déjà rencontrés     | `docs/ARCHITECTURE.md`                          |
| Comportement de l'assistant PO                       | `docs/ASSISTANT.md`                             |

Ne relis pas `docs/CONTEXTE-PROJET.md` à chaque tour. Une fois par session suffit,
et seulement si la tâche touche au métier.

---

## Stack imposée

```
Next.js (App Router) + TypeScript strict
Tailwind + shadcn/ui
Supabase (Postgres, Auth, Storage, RLS, Realtime)
Vercel AI SDK          → couche unique sur les fournisseurs de LLM
                         (@ai-sdk/mistral · groq · google · react)
Playwright             → export PDF des documents (pas encore installé)
next-pwa               → installation sur mobile (phase ultérieure)
```

Outillage ajouté : zod, server-only, web-push (notifications navigateur), nucleo-sharp-essential (icônes, `docs/DESIGN.md` § 1), modern-screenshot (capture d'une zone de la page pour un retour, chargé à la demande), Prettier + plugin Tailwind, lint-staged +
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
6. **L'IA ne produit jamais un état, un compteur, une date ou un calcul.** Voir
   `docs/CONTEXTE-PROJET.md` § 7. En cas de doute : c'est du code.
7. **Pas de `localStorage` pour des données métier.** Tout passe par Supabase.

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

1. **Chercher avant de créer.** Partir de l'inventaire « Design system » ci-dessous, puis
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
7. **Léger côté client.** `"use client"` le plus bas possible dans l'arbre (sur la feuille
   interactive, pas sur la page) ; composant client lourd et rarement affiché (modale,
   éditeur) → `next/dynamic`.

---

## Design system

> **Section tenue à jour par Claude, sans qu'on le demande.** Dès qu'un composant commun,
> une variante, un token ou une icône est ajouté, modifié ou supprimé, mettre à jour cet
> inventaire **dans la même tâche** (un hook local, `.claude/hooks/design-system-reminder.mjs`,
> le rappelle s'il est installé). Une ligne par élément, pas de détail d'implémentation.

**Sources.** Règles : `docs/DESIGN.md` → valeurs : `app/globals.css` (DESIGN.md d'abord,
puis le CSS). Ton d'un état : `lib/ui/state-tones.ts`, jamais choisi au cas par cas (dont `workStatusTone`,
`deliverableStateTone`, `budgetStatusTone`, `validationTone`).

**Tokens** (`app/globals.css`) : palette `--po-*` · surfaces `--surface-*` (dont `--surface-glass`), `--overlay-*`, flous `--glass-blur` (page) et `--glass-panel-blur` (panneau) ·
texte `--text-*` · bordures `--border-*`, `--hairline-*` · tons d'état `--tone-*` ·
contrôles `--control-*` · typo `--type-*`, `--fw-*`, `--font-*` · espacement `--space-*`,
`--stack-*`, `--section-*`, `--page-*` · densité `--density-*` · rayons `--radius-*` ·
élévation `--elevation-*`, `--shadow-*` · mouvement `--duration-*`, `--ease-*`,
`--transition-*` · coquille `--nav-*`, `--shell-inset` · jauges `--meter-*`.

**Composants communs**

| Composant | Fichier | Variantes / usage |
| --- | --- | --- |
| `Button` | `ui/button.tsx` | variant : default, outline, secondary, ghost, destructive, link · size : default, xs, sm, lg (pilule), icon, icon-xs, icon-sm, icon-lg (carré arrondi 8 px) |
| `Badge` | `ui/badge.tsx` | variant : default, secondary, destructive, outline, ghost, link |
| `StatusBadge` | `ui/status-badge.tsx` | tone : neutral, info, warning, success, danger · size : sm, md |
| `FilterChip`, `FilterChipLink` | `ui/filter-chip.tsx` | pastille de filtre (repos / survol / actif), prop `pressed` ; en lien quand le filtre est dans l'URL (`current`) |
| `SearchField` | `ui/search-field.tsx` | champ de recherche arrondi, libellé fourni par l'appelant |
| `ConfirmDialog` | `ui/confirm-dialog.tsx` | confirmation d'une action (`destructive` si définitive, `error` si elle a échoué) ; sans `onConfirm`, explique seulement pourquoi c'est impossible |
| `DropdownMenu` (+ `Trigger`, `Content`, `Item`) | `ui/dropdown-menu.tsx` | menu Base UI, surface du Popover, sans animation |
| `RowActions` | `ui/row-actions.tsx` | « ⋯ » d'une ligne ou d'un en-tête (`size` icon-sm / icon-lg), rien si aucune action |
| `FormDialog` | `ui/form-dialog.tsx` | formulaire dans la modale `Dialog` (en bas sur mobile), corps monté à chaque ouverture ; toute modification (« ⋯ » Modifier, fiche artiste) |
| `Loaded`, `useLoaded` | `ui/loaded.tsx`, `ui/use-loaded.ts` | chargement / échec / prêt d'une modale ou d'un panneau (action serveur appelée à l'ouverture) |
| `Dialog` | `ui/dialog.tsx` | **la seule modale du site**, « verre » : page floutée sans voile + panneau sombre translucide (Espace Espace, Modifier, confirmations) ; tokens inversés par `.surface-glass` (`docs/DESIGN.md` § 4) |
| `Card`, `Sheet`, `Popover`, `Select`, `Table` | `ui/` | shadcn |
| `DataTable` (+ `Header`, `Head`, `Body`, `Row`, `Cell`, `Link`, `Media`, `Icon`, `Views`) | `ui/data-table.tsx` | **tout tableau de liste** ; **tout filtre de tableau en onglets** avec nombre via `DataTableViews` (au-dessus du tableau ou de son état vide, URL avec `viewHref` de `lib/ui/view-href.ts` ou `onSelect`), design de la page Masters : filet sous l'en-tête, lignes aérées, colonnes 192 px, `fill` pour la dernière, `hideBelow` sm/md/lg, `align="end"`, ligne cliquable via `DataTableLink` (`href` null = texte seul), colonne « ⋯ » `DataTableActionsHead` / `DataTableActionsCell` (Masters, Artistes, fiche artiste, Projets, Membres) |
| `Input`, `Textarea`, `Label`, `Separator`, `Toaster` | `ui/` | shadcn |
| `PageContainer`, `PageHeader` | `shell/` | cadre et en-tête de chaque page (titre, description, action) |
| `PageSection` | `shell/page-section.tsx` | bloc titré d'une page de détail (h2, `description` d'une ligne et action facultatives, contenu) |
| `SectionTabs` | `shell/section-tabs.tsx` | onglets-liens d'une page de détail (projet, artiste), `aria-current`, sur `TabBar` |
| `FactList` | `ui/fact-list.tsx` | liste libellé / valeur dans une carte (faits d'un master, d'un projet, identité) |
| `StatTiles` | `ui/stat-tiles.tsx` | chiffres clés en tuiles (+ squelette) ; `href` facultatif = tuile entière cliquable (lien étiré) ; `columns` 4 (défaut) ou 5 |
| `EmptyState`, `EmptyNote` | `shell/empty-state.tsx` | état vide : icône, titre, une consigne ; `EmptyNote` = liste vide dans une section (une ligne en pointillés) |
| `Skeleton`, `SkeletonRows`, `LoadingRegion` | `ui/skeleton.tsx` | bloc qui pulse (immobile si mouvement réduit), lignes de liste, zone annoncée « Chargement… » ; **tout** squelette en part |
| `PageLoading` | `shell/page-loading.tsx` | `loading.tsx` d'une page : cadre, vrai titre s'il est connu, lignes ou forme fournie |
| `ViewLink` | `ui/view-link.tsx` | lien vers une autre vue de la même page (section, onglet, étape, filtre), préchargé en entier : changement de vue sans chargement (`docs/ARCHITECTURE.md` § 3 bis) |
| `Tooltip` | `ui/tooltip.tsx` | shadcn, base sur `@base-ui/react/tooltip` (bulle au survol/focus, ex. sidebar repliée) |
| `NavLinks`, `MobileNav`, `UserPanel`, `Sidebar` | `shell/` | navigation de la barre latérale blanche (pleine largeur ou repliée, contexte partagé `use-collapsed-nav.tsx`) et du tiroir mobile (`docs/DESIGN.md` § 4) ; classes d'un élément de navigation dans `nav-item.ts` |
| `FeedbackProvider`, `useOpenFeedback` | `feedback/feedback-provider.tsx` | fenêtre de retour unique de l'app : ouverte par un bouton, la touche Impr. écran ou une capture collée |
| `FeedbackNavButton` | `shell/feedback-nav-button.tsx` | « Envoyer un retour » du bas de la navigation (ferme le tiroir mobile, `data-close-nav`) |
| `FeedbackForm`, `ScreenshotField` | `feedback/` | formulaire de la fenêtre de retour, captures jointes (5 au plus : aperçus avec ✕, zone de dépôt) |
| `ZoneCapture`, `useCaptureShortcut` | `feedback/` | touche **C** : curseur « retour », deux coins (ou glisser) → capture de la zone, fenêtre de retour ouverte avec |
| `useObjectUrl` | `ui/use-object-url.ts` | URL locale d'un fichier (aperçu avant envoi), révoquée proprement même en mode strict |
| `FileDropZone` | `ui/file-drop-zone.tsx` | zone où glisser des fichiers, ou cliquer pour les choisir (input natif dans un label, `multiple`, état « au-dessus ») |
| `FeedbackList`, `FeedbackItems`, `FeedbackCard`, `FeedbackTopics`, `TopicActions`, `FeedbackTriage`, `FeedbackViewToggle` | `feedback/` | page Retours : retours envoyés ; boîte du DG (sujets de PO, transmettre avec priorité, écarter, onglets) |
| `TopicEditForm` | `feedback/topic-edit-form.tsx` | modale « Modifier le retour » du DG avant transmission (titre, résumé, type), réécriture proposée par PO |
| `TopicReviewForm` | `feedback/topic-review-form.tsx` | confirmation d'une décision sur un sujet préparée par PO (priorité à choisir ou corriger) |
| `FeedbackTopicDraftForm`, `FeedbackReviewDraftForm` | `assistant/feedback-draft-forms.tsx` | formulaires du DG ouverts depuis une proposition de PO (modifier, décider) |
| `FeedbackDraftActions` | `assistant/feedback-draft-actions.tsx` | carte d'un retour préparé par PO : « Envoyer » tel quel ou « Modifier » dans la fenêtre de retour |
| `ViewToggle` | `ui/view-toggle.tsx` | pastilles de vue dans l'URL (`?view=`), base de `ArchiveViewToggle` et `FeedbackViewToggle` |
| `ProjectSidebar`, `ProjectSidebarMobile`, `WorkflowBreadcrumb` | `projects/` | sidebar contextuelle d'un projet lancé (12 sections) et son tiroir mobile ; fil d'Ariane des 7 étapes du métier, habillage seul (`docs/DESIGN.md` § 4) |
| `ListCard`, `CardRow` | `ui/list-card.tsx` | carte de lignes liées (libellé gris, `count` facultatif), accueil et Travail ; `leading` = case à cocher hors du lien |
| `CardGrid`, `CardGridSkeleton` | `ui/card-grid.tsx` | grille de `ListCard` (1 → 2 → 3 colonnes), accueil, Travail, travail d'un projet ; squelette annoncé |
| `TasksCard`, `ValidationsCard`, `ProposalsCard`, `HandoverCard`… | `home/home-cards.tsx` | cartes de l'accueil ; `all` = toutes les lignes + nombre (page Travail) |
| `HomeFrame`, `HomeFeed` | `home/home-frame.tsx`, `home/home-feed.tsx` | cadre de l'accueil (salutation, PO) partagé avec son `loading.tsx` ; cartes chargées en streaming |
| `OwnedProjectsCard`, `DeliverablesCard`, `CreativeProjectsCard` | `work/work-cards.tsx` | cartes propres à la page Travail |
| `MyWorkCards` | `work/my-work-cards.tsx` | cartes de la page Travail, chargées en streaming sous l'en-tête |
| `AssistantProvider`, `useAssistant` | `assistant/assistant-provider.tsx` | conversation PO de l'accueil, fenêtre Espace Espace (sa propre conversation), panneau de relecture des brouillons |
| `AssistantComposer`, `AssistantThread`, `AssistantSuggestions`, `AssistantConversation` | `assistant/` | saisie de PO (micro, envoi/arrêt, `compact`, `voiceFirst`), fil des messages, pilules de suggestions ; page de conversation `/app/assistant` (retour, titre, « + ») |
| `DraftCard` | `assistant/draft-card.tsx` | proposition de PO dans le fil (avant barré → après, avertissements, « Relire et enregistrer ») |
| `RecordActions`, `ArchiveViewToggle`, `archiveViews`, `EditPanel` | `archive/` | « ⋯ » Modifier / Archiver / Restaurer d'un artiste, master ou projet ; `archiveViews` = onglets Actifs / Archivés (DG, nombres par `countRecords`), `ArchiveViewToggle` = mêmes vues en pastilles quand les onglets sont un autre axe ; corps chargé de la modale Modifier |
| `ArtistActions`, `MasterActions`, `ProjectActions` | `catalog/`, `projects/project-actions.tsx` | `RecordActions` branché sur le vrai formulaire de chaque type (`rights`, raison de blocage connue d'avance) |
| `ProjectPageHeader` | `projects/project-page-header.tsx` | en-tête d'une section de projet (h2, une phrase, action) : Calls et les 9 pages ci-dessous |
| `ProjectSectionLoading` | `projects/project-section-loading.tsx` | squelette d'une section de projet (forme de `ProjectPageHeader`, puis lignes ou forme fournie) |
| `WorkBoard`, `PersonWorkCard`, `WorkRow`, `AddTaskForm`, `TeamWorkloadTable`, `ExternalTeamTable` | `project-work/` | Travail d'un projet par personne (filtre `FilterChip`, case « fait », ajout de tâche), charge de l'équipe |
| `DeliverablesTable`, `LeverList`, `PlanningTimeline`, `EditInStrategy` | `project-plan/` | livrables, leviers par famille, frise datée par mois (repère Aujourd'hui), lien vers la Stratégie pour le responsable |
| `BudgetSummary`, `BudgetLines`, `BudgetTable`, `BudgetLineSheet`, `DeleteBudgetLineDialog` | `budget/` | page Budget : tuiles et dépassement, lignes filtrables par statut, formulaire en `Sheet`, suppression confirmée |
| `FilesTable`, `ValidationItem`, `ActivityTimeline` | `project-history/` | fichiers du projet (audio des calls, téléchargement signé), demande de validation, journal groupé par jour |
| `ProjectTeamFields` | `projects/project-team-fields.tsx` | bloc « Équipe » du formulaire projet (création seule) |
| `Field`, `TextareaField`, `SubmitButton`, `FormMessage`, `FieldError` | `auth/` | champs et retours de formulaire |
| `SearchPicker` | `catalog/search-picker.tsx` | sélecteur avec recherche et création en modale |
| `TabBar` | `ui/tab-bar.tsx` | barre d'onglets (liens ou boutons) sans filet, trait de 2 px qui glisse sous l'onglet actif ; base de `SectionTabs` et `DataTableViews` |
| `ChoiceCards` | `ui/choice-cards.tsx` | radios natifs avec la conséquence sous chaque choix (call, retours, membres, artiste) |
| `ArtistRelationField`, `ArtistListViews` | `catalog/` | choix Signé / Collaboration des formulaires artiste ; vues de la liste Artistes (onglets Tous / Signés / Collaborations, + Archivés du DG en pastilles) |
| `CreativePicker` | `projects/creative-picker.tsx` | choix multiple de personnes en `FilterChip`, envoyé en un champ JSON |
| `AudioMeter`, `useAudioMeter` | `ui/audio-meter.tsx`, `ui/use-audio-meter.ts` | onde du micro qui défile de droite à gauche (façon Claude), size : sm, md ; dictée, saisie vocale de PO, enregistrement de call |
| `VoiceInputButton`, `VoiceInputBar`, `VoiceInputStatus` | `voice/voice-input.tsx` | saisie vocale d'un champ : micro ; pendant l'écoute, onde + ✕ annuler + ✓ valider à la place du micro et d'Envoyer |
| `ProcessingSteps` | `calls/processing-steps.tsx` | suivi d'étapes (fait / en cours / à venir) du traitement d'un call |
| `FramingStart` | `framing/framing-start.tsx` | état « cadrage pas encore ouvert » (Cadrage verrouillé, vue d'ensemble) : deux options, préparer un call ou commencer en amont |
| `CallAgenda` | `calls/call-agenda.tsx` | ordre du jour préparé d'un call (points à aborder, temps approximatif), affiché avant l'enregistrement |
| `StrategyNeedsFraming` | `strategy/strategy-needs-framing.tsx` | état « la stratégie suit le cadrage » (Stratégie verrouillée tant que le Cadrage n'est pas validé) |
| `ArtistEditDialog`, `ArtistEditBody`, `ArtistContacts`, `ContactForm` | `catalog/artist-page/` | modale « Modifier » (photo, identité, bio ; corps réutilisé depuis la liste), contacts de l'artiste |
| `FileUpload`, `FilesTable`, `FileActions` | `catalog/files/` | fichiers d'un artiste ou d'un master (`owner: FileOwner`) : catégorie + envoi, tableau, télécharger / supprimer |
| `ActivityLog` | `catalog/activity/activity-log.tsx` | journal par jour d'un artiste ou d'un master (phrases déjà écrites par le code) |
| `MasterTabs`, `MasterArtists`, `MasterChecklist`, `DistributionList` | `catalog/master-page/` | onglets de la fiche master (Splits pour `manage_catalog`), artistes interprètes, dossier du master, sorties des projets |
| `SessionsSection`, `TracksSection`, `ContributorsSection`, `SplitsSection`, `RightsSection`, `DeclarationsSection` (+ leurs `*Form`) | `catalog/master-page/` | listes modifiables de la fiche master, formulaire en `FormDialog` |
| `MasterForm`, `useItemDialogs`, `ItemRowActions`, `AddItemButton`, `DeleteItemDialog` | `catalog/master-page/` | socle des listes du master : formulaire (valeurs rendues après refus), ligne en cours de modification, « ⋯ » Modifier / Supprimer, suppression confirmée |
| `ReleaseCover`, `ReleaseCard`, `ExternalLink` | `catalog/artist-profile/` | pochette carrée (repli disque), carte de sortie mise en avant, lien vers Deezer/Wikipédia en nouvel onglet (`cover` : toute la ligne cliquable) |
| `Icon*` | `icons/index.ts` | icônes dessinées maison (dont `IconDots`, le « ⋯ ») ; le reste vient de `nucleo-sharp-essential` (`docs/DESIGN.md` § 1) |

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
  i18n/fr/              textes d'interface, un fichier par domaine
  supabase/             clients serveur, navigateur, admin (cron seul), types générés
supabase/
  migrations/           SQL versionné, source de vérité du schéma
  tests/                pgTAP (supabase test db)
docs/                   contexte, assistant, architecture
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
supabase start      # stack locale (Docker : voir docs/ARCHITECTURE.md § 12)
supabase db reset   # rejoue les migrations + seed
supabase test db    # tests de sécurité SQL (pgTAP)
```

---

## Repères dans le code

Le détail est dans `docs/ARCHITECTURE.md`. L'essentiel :

- **Sécurité** : toutes les écritures passent par la session utilisateur (RLS forcé,
  droits colonne par colonne, clés composites par organisation). Service role : cron seul
  (`lib/supabase/admin.ts`). États (étapes, validations) : fonctions SQL uniquement.
- **Navigation fluide** (`docs/ARCHITECTURE.md` § 3 bis) : vues d'une page en `ViewLink`
  (préchargées), `staleTimes` 30 s / 60 s, `loading.tsx` partout (groupes `(list)` et `(home)`
  pour qu'un squelette n'enveloppe pas les pages enfants), accès + données en un aller-retour
  (`allInOrder`, accès d'abord), `getClaims()` au lieu de `getUser()`. Juger en `pnpm start`,
  jamais en `pnpm dev` (aucun préchargement).
- **Identité** : fondation d'Ibé importée (`supabase/migrations/*identity*`, `lib/auth/`).
  Premier admin local : `admin@pds.test`, confirmation via Mailpit (http://127.0.0.1:54324).
  Postes ≠ permissions : Directeur général, Chef de projet, Directeur créatif ; seule
  `role_permissions` (SQL) donne les droits, le code teste `can(access, "…")`.
  **Dans un projet lancé, seul son responsable écrit** (cadrage, calls, sortie) ; le DG lit
  et valide (`is_project_owner` en SQL, `canEditProject` / `useCanEditProject` à l'écran).
  Une étape validée est **définitive** (jamais rouverte) ; un Cadrage soumis ou validé est
  figé en RLS (`framing_is_editable`), pas seulement dans le code.
  **Visibilité** : DG tous les projets, chef de projet les siens (+ transmis en attente),
  directeur créatif ceux de son équipe créative (`can_see_project`, `project_creatives`).
  Le DG crée un compte (email, mot de passe, poste) sur `/app/members/new`, sans service
  role. Confirmation d'email **coupée en local** (`config.toml`), à remettre
  en production (`docs/ARCHITECTURE.md` § 3).
- **Env** : `lib/env.ts` (serveur) et `lib/env-public.ts` ; toute variable s'ajoute au
  schéma zod **et** à `.env.example`.
- **IA** : `lib/ai/llm.ts` et `lib/ai/transcribe.ts` seuls points d'entrée. Mistral gratuit
  → `ministral-14b-latest`. Provenance calculée par le code (`lib/ai/provenance.ts`).
  Assistant : faits rédigés par le code et affichés sous la réponse, **jamais la date du
  jour dans le contexte du modèle** (`docs/ASSISTANT.md`).
- **PO écrit avec validation humaine** : `propose_artist|master|project`
  (`lib/assistant/propose/`) renvoient un brouillon, jamais une écriture ; la carte ouvre le
  **vrai formulaire** pré-rempli dans un panneau latéral, l'humain enregistre avec sa
  session. Chiffres, dates, ISRC, emails : recopiés de ce que l'utilisateur a écrit, vérifiés
  et lus par le code (`lib/assistant/verbatim.ts`). Projet modifiable tant qu'il n'est pas
  lancé (`update_project`), master par `update_master` (`docs/ASSISTANT.md` § 3 bis).
  Retours : `propose_feedback` (tout membre) ; pour le DG `find_feedback`,
  `propose_feedback_edit`, `propose_feedback_review` : PO prépare, le DG confirme.
- **Conversation PO** : une question de l'accueil ouvre `/app/assistant` (conversation de
  l'onglet, titre = première question, « + » = nouvelle), `docs/ASSISTANT.md` § 2.
- **Espace Espace** : ouvre PO depuis toute page de l'app dans une **nouvelle
  conversation**, dictée à l'écoute et envoyée dès qu'on a fini de parler ; la page
  d'ouverture est un indice de contexte lu par le serveur (`lib/assistant/page-context.ts`),
  jamais une limite (`assistant-launcher.tsx`, `docs/ASSISTANT.md` § 2 bis).
- **Audio** : enregistreur dans l'app (onglet Meet/Zoom + micro, ou micro seul) ;
  `AudioContext.resume()` obligatoire ; alerte après 2 min de silence de l'onglet.
  Consentement **donné par contrat** (aucun écran). Après l'envoi, tout est automatique :
  transcription → compte rendu → Brief pré-rempli (`fillBriefFromCall`) → redirection
  vers le Cadrage ; plus d'import manuel sur le Cadrage.
  Groq : `groq-tolerant-fetch.ts` évite « Invalid JSON response » sur de vrais audios.
- **Dictée** : bouton « Dicter » sur le Cadrage et la Stratégie (textes + leviers, jamais de
  date ni de temps fort), prévu sur tout le parcours.
  Moteur commun `lib/voice/`, un adaptateur par étape ; propositions relues avant écriture,
  rien en base avant « Appliquer », audio jamais stocké (`docs/ARCHITECTURE.md` § 6).
  Micro de l'assistant sur l'accueil : texte inséré dans la saisie, relu puis envoyé ; dans
  la fenêtre Espace Espace, envoyé dès la fin de la dictée (demande de Sacha).
- **Catalogue** : artistes, masters (crédits ordonnés), projets rattachés à 0..n masters
  (`lib/catalog/`, `/app/catalog/*`). Sortie musicale ⇒ au moins un master (vérifié au
  commit). Types : sortie musicale, contenu, partenariat, événement. Un projet naît **avec
  son équipe** : chef de projet obligatoire (transmis d'office) + directeurs créatifs, dans
  `create_project` ; sans étape ni responsable jusqu'à l'acceptation. Cadrage, Calls et
  Sortie n'existent qu'après lancement (`transmit_project` / `respond_to_assignment`,
  statut calculé par `projectStatusOf`). **Le cadrage part d'un call, ou du Brief en amont**
  (`framing_is_open` en SQL, `FramingStart` à l'écran : préparer un call avec ordre du jour,
  ou commencer en amont sans pré-remplissage) ; onglet Calls avant Cadrage.
  Nouvel artiste : recherche Deezer d'abord (nom **ou lien Deezer collé**, pour les petits
  artistes), saisie manuelle en repli ; le serveur relit Deezer, seul l'id vient du
  client ; créé depuis la page Artistes, sa fiche s'ouvre. **Relation avec PDS** (Signé /
  Collaboration, `artists.relation`) choisie à la création, modifiable, indépendante
  d'Actif / Archivé ; filtre Tous / Signés / Collaborations (`docs/ARCHITECTURE.md`
  § 2 quinquies). Sélecteurs :
  `components/catalog/search-picker.tsx` (commun), création en modale sans perte de saisie
  (`docs/ARCHITECTURE.md` § 2).
  Fiche artiste à onglets (`/app/catalog/artists/[id]` + `/masters`, `/projects`, `/files`,
  `/activity`, `/discography`, layout commun ; tuiles Masters/Projets cliquables, mêmes
  tableaux que les pages de liste via `listMasters({ ids })` / `listProjects({ ids })`) ;
  fichiers `artist_files` (bucket privé `artist-files`, contrats réservés à `manage_catalog`),
  journal `activity_events` **écrit par triggers seuls** (`docs/ARCHITECTURE.md` § 2) :
  identité (nom civil, pays ISO), contacts (`artist_contacts`, **lus et écrits seulement avec
  `manage_catalog`**, un principal tenu par trigger), bio saisie qui prime sur l'auto, photo
  téléversée (bucket privé `artist-pictures`, URL signées) qui prime sur celle de Deezer.
  Deezer en direct (cache 1 h) ; bio auto par l'API **interne** Deezer, repli Wikipédia via
  Wikidata P2722 (`lib/catalog/artist-*.ts`, `docs/ARCHITECTURE.md` § 2).
  **Fiche master à 10 onglets** (`/app/catalog/masters/[id]` + `/sessions`, `/versions`,
  `/credits`, `/splits`, `/rights`, `/distribution`, `/projects`, `/files`, `/activity`) :
  dossier du master calculé par le code, sessions et pistes, versions (même titre + même
  artiste principal, décidé par le code), contributeurs, splits master / édition (≤ 100 %
  vérifié en SQL, **`manage_catalog` seul**), ISWC et ℗, déclarations SACEM / SCPP / SPPF /
  ADAMI / SPEDIDAM, sorties des projets en lecture, fichiers `master-files`, journal
  (`activity_events.master_id`) ; écriture `manage_catalog` sur master actif
  (`lib/catalog/master/`, `docs/ARCHITECTURE.md` § 2 sexies).
- **Notifications** : table `notifications` écrite par triggers (jamais par le code),
  cloche + toast + rafraîchissement via Realtime, Web Push (`public/sw.js`, `web-push`,
  clés VAPID facultatives). Envoi push : `schedulePendingPushes()` après toute action qui
  notifie, sans service role ; la réclamation exige `PUSH_CLAIM_SECRET` (= secret Vault
  `push_claim_secret`), endpoints limités aux services de push connus (`docs/ARCHITECTURE.md` § 8 bis).
- **Stratégie** : `/strategy`, `lib/strategy/` ; **inaccessible avant validation du Cadrage**
  (`isFramingValidated`, `StrategyNeedsFraming`, grisée dans le fil d'Ariane) ; démarre après validation du Brief, écrite
  par le responsable **seulement en cours** (`strategy_is_editable`), figée une fois soumise.
  Réutilise les briques du Cadrage ; calendrier saisi à la main, décompte calculé par le
  code. Questions à choix fermé (`lib/strategy/choices.ts`) : cocher **compose la réponse**
  (code, `lib/strategy/compose.ts`), retouchable. IA : dictée, et « Proposer des réponses »
  qui **pré-coche** des choix fermés sourcés Brief validé + calls (citation vérifiée par le
  code), jamais de texte libre ni de date (`docs/ARCHITECTURE.md` § 6 bis).
- **Travail** `/app/work` : ce qui attend chacun, un bloc par permission (valider,
  attribuer, piloter, concevoir) ; prochaine action de chaque projet décidée par le code
  (`lib/work/`, `docs/ARCHITECTURE.md` § 8).
- **Pages d'un projet lancé** : les 12 sections de la sidebar ont chacune leur page
  (`/work`, `/team`, `/deliverables`, `/activations`, `/planning`, `/files`, `/budget`,
  `/validations`, `/activity`), en lecture, sauf Travail (ajout de tâche, case « fait ») et
  Budget. États (en retard, à attribuer…), décomptes et totaux calculés par le code
  (`lib/project-work/`, `lib/project-plan/`, `lib/project-history/`) ; on modifie dans la
  Stratégie. **Budget** : `budget_lines` (prévu / engagé / payé, famille et levier
  facultatifs), écrit par le responsable seul, reste = enveloppe − engagé (`budgetTotals`),
  jamais lu par PO (`docs/ARCHITECTURE.md` § 8 ter).
- **Sortie** : iTunes ne cherche pas par ISRC (passe par l'UPC) ; Odesli fermé sans clé.
- **Design** : `docs/DESIGN.md` fait foi. Typo Google Sans Flex partout, **medium minimum**
  (jamais de regular), texte courant 16 px, 14 px au plus petit (`docs/DESIGN.md` § 2) ; états →
  `lib/ui/state-tones.ts` (5 tons sémantiques) + `StatusBadge tone=…`. Coquille et
  accueil d'après le Figma « Desktop - 11 » : barre latérale blanche flottante, accueil
  centré (salutation, PO, cartes), `docs/DESIGN.md` § 4. **Une seule modale, la
  fenêtre « verre » d'Espace Espace**, partout (`Dialog`, `FormDialog`,
  `ConfirmDialog`) ; un token lu dans une modale doit exister dans `.surface-glass`
  (`docs/DESIGN.md` § 4, « Modale »).
- **Icônes** : Nucleo Sharp uniquement (`nucleo-sharp-essential`), icônes manquantes
  dessinées dans `components/icons/` ; pas de Lucide (`docs/DESIGN.md` § 1).
- **Textes** : `lib/i18n/fr/<domaine>.ts`. **`cn()`** : `lib/utils/index.ts`.
- **`AGENTS.md`** est réécrit par `next dev` : ne pas le supprimer. Doc Next 16 :
  `node_modules/next/dist/docs/`.
- **Archivage** : artistes, masters, projets **archivés, jamais supprimés**, par le DG seul
  (`archive_records`), refusé si encore utilisé (projet lancé, master d'un projet actif,
  artiste d'un master actif) ; restauration depuis « Archivés » des listes. `archived_at`
  écrit par `set_*_archived` (SQL) uniquement ; menu « ⋯ » Modifier / Archiver sur chaque
  ligne et en-tête de fiche (`docs/ARCHITECTURE.md` § 2 quater). Membres : « Suspendre », « Modifier » (nom et poste) dans la modale.
- **Retours** `/app/feedback` : l'équipe écrit au DG depuis la fenêtre de retour (bouton,
  touche Impr. écran ou capture collée ⌘V, touche **C** pour capturer une zone de la page, jusqu'à 5 captures glissées ou choisies dans une zone de dépôt, dans `feedback-screenshots`) ;
  PO regroupe les doublons en sujets à l'ouverture de la page par le DG ; le DG seul
  (`read_feedback`) transmet un sujet avec une priorité ou l'écarte
  (`review_feedback_topic`), après l'avoir modifié s'il veut, seul ou avec PO qui propose
  (`edit_feedback_topic`) ; un sujet transmis part sur **Notion** (`lib/integrations/notion.ts`,
  `NOTION_TOKEN` + `NOTION_FEEDBACK_DATABASE_ID`, facultatifs) ; les retours d'origine restent consultables
  (`docs/ARCHITECTURE.md` § 8 quater).
- **Labo** `/labo` : banc de test local (404 en production), faux call `docs/labo/`.

---

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
éphémères. Le fichier doit rester court : un contexte long ou une décision métier va dans
`docs/`, avec un simple renvoi ici.

---

## État d'avancement

> Tenir cette section à jour à chaque fin d'étape.

- [x] Étape 1 — amorçage (stack, env validé, qualité, page de vérification)
- [x] Étape 2 — modèle de données et RLS (43 tests pgTAP ; 408 au total aujourd'hui)
- [x] Étape 3 — authentification et coquille de navigation (fondation d'Ibé transposée)
- [x] Étape 4 — chaîne audio → transcription → compte rendu structuré, persistée
- [x] Étape 5 — étape Cadrage de bout en bout (propositions, provenance, validation)
- [x] Étape 6 — détection de sortie par ISRC, cron quotidien, smartlink public

Au-delà des six étapes :

- [x] Labo IA local (`/labo`), préparation du prochain call
- [x] Assistant PO sur l'accueil + cartes (faits rédigés par le code)
- [x] Accueil et barre latérale refaits d'après le Figma « Desktop - 11 » (barre blanche
      flottante, salutation centrée, saisie teintée, cartes à contour)
- [x] Enregistrement des calls dans l'app (onglet + micro, alerte de silence)
- [x] Dictée à la voix sur le Cadrage (moteur commun, prêt pour les autres étapes)
- [x] Postes (DG, chef de projet, directeur créatif) séparés des permissions, création de
      compte par le DG
- [x] Parcours 01 : artiste → master → projet (non transmis, sans étape), permissions
      `manage_catalog` / `create_projects`
- [x] Transmission : le DG transmet à un chef de projet, qui accepte (lancement : étapes +
      responsable), refuse ou demande une précision (retour au DG, retransmission)
- [x] Notifications : cloche, toast, notifications navigateur, pages à jour sans recharger
- [x] Seul le chef de projet responsable écrit dans un projet ; le DG lit et valide
- [x] Visibilité : chacun ne voit que ses projets (DG tous) ; équipe créative par projet
- [x] Page **Stratégie de lancement** : positionnement, publics, narratif, leviers par
      famille, livrables engagés, calendrier manuel, import depuis un call, validation DG
- [x] Dictée sur la Stratégie (positionnement, publics, narratif, leviers)
- [x] Stratégie : questions à choix fermé qui composent la réponse, « Proposer des
      réponses » (PO pré-coche, sourcé)
- [x] Fiche artiste enrichie depuis Deezer : chiffres, dernière sortie / dernier album,
      bio (Deezer, repli Wikipédia), discographie filtrable, top titres, similaires
- [x] Fiche artiste, étape 1 : onglets, identité, contacts, photo et bio modifiables
- [x] Fiche artiste : onglets Masters, Projets (tuiles cliquables), Fichiers, Activité
      (journal écrit par triggers)
- [x] Création avec l'équipe (chef de projet transmis d'office, directeurs créatifs), type
      Événement, pas de cadrage sans compte rendu de call, calls « À venir »
- [x] Call sans consentement (contrat), traitement automatique et Brief pré-rempli dès la
      fin du call
- [x] PO en écriture avec validation humaine : il prépare artiste (fiche + contacts),
      master, projet (création ou modification avant lancement), l'humain relit le vrai
      formulaire et enregistre ; fenêtre PO sur Espace Espace, dictée à l'écoute
- [x] Navigation refaite d'après le Figma « Devis Sordulo » (120:47 / 120:74) : barre
      latérale principale repliable en icônes (`Tooltip`, repliée par défaut dans un
      projet) ; sidebar contextuelle du projet à 12 sections (3 avec une page, le reste
      grisé) qui remplace l'ancienne double navigation horizontale ; fil d'Ariane des
      7 étapes du métier en habillage sur Cadrage/Stratégie/Sortie, sans nouvel état
- [x] Page **Travail** : DG (validations, projets à retransmettre / en attente), chef de
      projet (projets à accepter, prochaine action par projet, livrables à attribuer,
      propositions de PO), directeur créatif (livrables à concevoir, projets de son équipe)
- [x] Pages d'un projet : Travail (par personne, en retard / à faire / en attente, ajout de
      tâche), Équipe, Livrables, Activations, Planning, Fichiers, Budget, Validations,
      Activité
- [x] Menu « ⋯ » par ligne (artistes, masters, projets, membres) : modifier dans la
      modale, archiver / restaurer (DG, refusé si utilisé), filtre « Archivés »
- [x] **Retours** : fenêtre de retour partout (capture collée, Impr. écran), dédoublonnage
      par PO, le DG modifie (seul ou avec PO), transmet avec une priorité ou écarte
- [x] Artistes **Signés / Collaborations** (relation avec PDS, un seul objet Artiste,
      filtre de la liste) ; « Créer l'artiste » ouvre sa fiche
- [x] **Fiche master à onglets** : vue d'ensemble (dossier à compléter), sessions & pistes,
      versions, contributeurs & crédits, splits, droits & déclarations, distribution,
      projets, fichiers, activité
- [ ] À tester par l'équipe dans un vrai Chrome : enregistrement d'un vrai Meet (deux voix
      dans la transcription, alerte après avoir raccroché)

À faire ensuite (proposé, non commencé) :

- [ ] Directeur créatif : dépôt de versions des livrables (il lit seulement pour l'instant)
- [ ] Export **Plan de sortie** (PDF, Playwright) et partage par lien de la Stratégie
- [ ] Dictée sur les autres étapes (Sortie…) : un adaptateur chacune
- [ ] Politique de suppression Storage (remplacer un audio, fichiers orphelins)

Décisions en attente (avec Ibé / le client) :

- Quel projet fait foi : `po` d'Ibé (7 briques, sans IA) ou PDS OS ; qui s'appelle « PO »
- § 10 du contexte : contenu de « Défense », qui valide quoi, 7 ou 5 étapes
- Offre payante Mistral / Groq avant toute donnée réelle ; clé Odesli ou smartlink maison
- Mise en production : réactiver la confirmation d'email, SMTP réel, `CRON_SECRET` et service role sur Vercel,
  `PUSH_CLAIM_SECRET` + secret Vault `push_claim_secret` (même valeur), durée max
  des fonctions (300 s) selon l'offre Vercel
