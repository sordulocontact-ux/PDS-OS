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

Outillage ajouté : zod, server-only, web-push (notifications navigateur), nucleo-sharp-essential (icônes, `docs/DESIGN.md` § 1), Prettier + plugin Tailwind, lint-staged +
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
puis le CSS). Ton d'un état : `lib/ui/state-tones.ts`, jamais choisi au cas par cas.

**Tokens** (`app/globals.css`) : palette `--po-*` · surfaces `--surface-*`, `--overlay-*` ·
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
| `FilterChip` | `ui/filter-chip.tsx` | pastille de filtre (repos / survol / actif), prop `pressed` |
| `SearchField` | `ui/search-field.tsx` | champ de recherche arrondi, libellé fourni par l'appelant |
| `Card`, `Dialog`, `Sheet`, `Popover`, `Select`, `Table` | `ui/` | shadcn |
| `Input`, `Textarea`, `Label`, `Separator`, `Toaster` | `ui/` | shadcn |
| `PageContainer`, `PageHeader` | `shell/` | cadre et en-tête de chaque page (titre, description, action) |
| `PageSection` | `shell/page-section.tsx` | bloc titré d'une page de détail (h2 + contenu, action facultative) |
| `EmptyState` | `shell/empty-state.tsx` | état vide : icône, titre, une consigne |
| `NavLinks`, `MobileNav`, `UserPanel` | `shell/` | navigation de la barre latérale blanche et du tiroir mobile (`docs/DESIGN.md` § 4) |
| `HomeCard`, `CardRow` | `home/home-card.tsx` | carte de l'accueil (libellé gris, liste de lignes liées) |
| `Field`, `TextareaField`, `SubmitButton`, `FormMessage`, `FieldError` | `auth/` | champs et retours de formulaire |
| `SearchPicker` | `catalog/search-picker.tsx` | sélecteur avec recherche et création en modale |
| `ReleaseCover`, `ReleaseCard`, `ExternalLink` | `catalog/artist-profile/` | pochette carrée (repli disque), carte de sortie mise en avant, lien vers Deezer/Wikipédia en nouvel onglet (`cover` : toute la ligne cliquable) |
| `Icon*` | `icons/index.ts` | icônes dessinées maison ; le reste vient de `nucleo-sharp-essential` (`docs/DESIGN.md` § 1) |

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
- **Identité** : fondation d'Ibé importée (`supabase/migrations/*identity*`, `lib/auth/`).
  Premier admin local : `admin@pds.test`, confirmation via Mailpit (http://127.0.0.1:54324).
  Postes ≠ permissions : Directeur général, Chef de projet, Directeur créatif ; seule
  `role_permissions` (SQL) donne les droits, le code teste `can(access, "…")`.
  **Dans un projet lancé, seul son responsable écrit** (cadrage, calls, sortie) ; le DG lit
  et valide (`is_project_owner` en SQL, `canEditProject` / `useCanEditProject` à l'écran).
  Une étape validée est **définitive** (jamais rouverte).
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
- **Audio** : enregistreur dans l'app (onglet Meet/Zoom + micro, ou micro seul) ;
  `AudioContext.resume()` obligatoire ; alerte après 2 min de silence de l'onglet.
  Groq : `groq-tolerant-fetch.ts` évite « Invalid JSON response » sur de vrais audios.
- **Dictée** : bouton « Dicter » sur le Cadrage et la Stratégie (textes + leviers, jamais de
  date ni de temps fort), prévu sur tout le parcours.
  Moteur commun `lib/voice/`, un adaptateur par étape ; propositions relues avant écriture,
  rien en base avant « Appliquer », audio jamais stocké (`docs/ARCHITECTURE.md` § 6).
  Micro de l'assistant : transcription seule, texte inséré dans la saisie, jamais envoyé seul.
- **Catalogue** : artistes, masters (crédits ordonnés), projets rattachés à 0..n masters
  (`lib/catalog/`, `/app/catalog/*`). Sortie musicale ⇒ au moins un master (vérifié au
  commit). Un projet naît **non transmis, sans étape ni responsable** ; Cadrage, Calls et
  Sortie n'existent qu'après lancement, c.-à-d. après acceptation par un chef de projet
  (`transmit_project` / `respond_to_assignment`, statut calculé par `projectStatusOf`).
  Nouvel artiste : recherche Deezer d'abord (photo, lien), saisie manuelle en repli ; le
  serveur relit Deezer, seul l'id vient du client. Sélecteurs :
  `components/catalog/search-picker.tsx` (commun), création en modale sans perte de saisie
  (`docs/ARCHITECTURE.md` § 2).
  Fiche artiste : fans, discographie, dernière sortie, top titres, similaires lus en direct
  sur Deezer (cache 1 h, rien en base) ; bio par l'API **interne** Deezer, repli Wikipédia
  via Wikidata P2722 (`lib/catalog/artist-profile.ts`, `docs/ARCHITECTURE.md` § 2).
- **Notifications** : table `notifications` écrite par triggers (jamais par le code),
  cloche + toast + rafraîchissement via Realtime, Web Push (`public/sw.js`, `web-push`,
  clés VAPID facultatives). Envoi push : `schedulePendingPushes()` après toute action qui
  notifie, sans service role (`docs/ARCHITECTURE.md` § 8 bis).
- **Stratégie** : `/strategy`, `lib/strategy/` ; démarre après validation du Brief, écrite
  par le responsable **seulement en cours** (`strategy_is_editable`), figée une fois soumise.
  Réutilise les briques du Cadrage ; calendrier saisi à la main, décompte calculé par le
  code. Questions à choix fermé (`lib/strategy/choices.ts`) : cocher **compose la réponse**
  (code, `lib/strategy/compose.ts`), retouchable. IA : dictée, et « Proposer des réponses »
  qui **pré-coche** des choix fermés sourcés Brief validé + calls (citation vérifiée par le
  code), jamais de texte libre ni de date (`docs/ARCHITECTURE.md` § 6 bis).
- **Sortie** : iTunes ne cherche pas par ISRC (passe par l'UPC) ; Odesli fermé sans clé.
- **Design** : `docs/DESIGN.md` fait foi. Typo Google Sans Flex partout ; états →
  `lib/ui/state-tones.ts` (5 tons sémantiques) + `StatusBadge tone=…`. Coquille et
  accueil d'après le Figma « Desktop - 11 » : barre latérale blanche flottante, accueil
  centré (salutation, PO, cartes), `docs/DESIGN.md` § 4.
- **Icônes** : Nucleo Sharp uniquement (`nucleo-sharp-essential`), icônes manquantes
  dessinées dans `components/icons/` ; pas de Lucide (`docs/DESIGN.md` § 1).
- **Textes** : `lib/i18n/fr/<domaine>.ts`. **`cn()`** : `lib/utils/index.ts`.
- **`AGENTS.md`** est réécrit par `next dev` : ne pas le supprimer. Doc Next 16 :
  `node_modules/next/dist/docs/`.
- **Labo** `/labo` : banc de test local (404 en production), faux call `docs/labo/`.

---

## Méthode de travail attendue

- **Une étape à la fois.** Ne code pas la suivante sans qu'on te la demande.
- **Pas de fonctionnalité non demandée.** Pas de page bonus, pas de composant
  « qui pourrait servir ».
- **Annonce avant d'agir** quand la tâche touche plus de trois fichiers : liste ce que
  tu vas faire, attends le feu vert.
- **Si une information manque, demande.** Ne devine pas une règle métier.
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
- [x] Étape 2 — modèle de données et RLS (43 tests pgTAP ; 183 au total aujourd'hui)
- [x] Étape 3 — authentification et coquille de navigation (fondation d'Ibé transposée)
- [x] Étape 4 — chaîne audio → transcription → compte rendu structuré, persistée
- [x] Étape 5 — étape Cadrage de bout en bout (propositions, provenance, validation)
- [x] Étape 6 — détection de sortie par ISRC, cron quotidien, smartlink public

Au-delà des six étapes :

- [x] Labo IA local (`/labo`), préparation du prochain call
- [x] Assistant PO sur l'accueil + cartes (lecture seule, faits rédigés par le code)
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
- [ ] À tester par l'équipe dans un vrai Chrome : enregistrement d'un vrai Meet (deux voix
      dans la transcription, alerte après avoir raccroché)

À faire ensuite (proposé, non commencé) :

- [ ] Modifier un projet avant transmission (titre, masters, budget…)
- [ ] Directeur créatif : dépôt de versions des livrables (il lit seulement pour l'instant)
- [ ] Export **Plan de sortie** (PDF, Playwright) et partage par lien de la Stratégie
- [ ] Dictée sur les autres étapes (Sortie…) : un adaptateur chacune
- [ ] Politique de suppression Storage (remplacer un audio, fichiers orphelins)

Décisions en attente (avec Ibé / le client) :

- Quel projet fait foi : `po` d'Ibé (7 briques, sans IA) ou PDS OS ; qui s'appelle « PO »
- § 10 du contexte : contenu de « Défense », qui valide quoi, 7 ou 5 étapes
- Offre payante Mistral / Groq avant toute donnée réelle ; clé Odesli ou smartlink maison
- Mise en production : réactiver la confirmation d'email, SMTP réel, `CRON_SECRET` et service role sur Vercel, durée max
  des fonctions (300 s) selon l'offre Vercel
