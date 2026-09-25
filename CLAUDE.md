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
| Étape de travail en cours                            | `docs/PROMPT-01-BOOTSTRAP.md` puis les suivants |

Ne relis pas `docs/CONTEXTE-PROJET.md` à chaque tour. Une fois par session suffit,
et seulement si la tâche touche au métier.

---

## Stack imposée

```
Next.js (App Router) + TypeScript strict
Tailwind + shadcn/ui
Supabase (Postgres, Auth, Storage, RLS, Realtime)
Vercel AI SDK          → couche unique sur les fournisseurs de LLM
Playwright             → export PDF des documents
next-pwa               → installation sur mobile (phase ultérieure)
```

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

---

## Arborescence

```
app/                    routes (App Router)
  (app)/                interface authentifiée
  (public)/             pages partagées par lien à jeton
  api/                  route handlers — tout ce qui touche un secret
components/
  ui/                   shadcn, non modifié à la main
  <domaine>/            composants métier
lib/
  ai/                   llm.ts, transcribe.ts, schemas/
  supabase/             clients serveur et navigateur
  utils/
supabase/
  migrations/           SQL versionné, source de vérité du schéma
docs/                   contexte et prompts d'étape
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
supabase start      # stack locale
supabase db reset   # rejoue les migrations
```

---

## Repères dans le code

- **Variables d'environnement** : `lib/env.ts` (serveur, `server-only`, secrets) et
  `lib/env-public.ts` (`NEXT_PUBLIC_*`, importable côté client). Toute nouvelle variable
  s'ajoute au schéma zod **et** à `.env.example`. Validation au démarrage dans
  `instrumentation.ts` (avertit, ne plante pas).
- **Fournisseurs IA** : liste, modèle par défaut et clé associée dans `lib/ai/providers.ts`.
  Palier gratuit Mistral : quota **nul** sur `mistral-small`/`medium` (en-tête
  `x-ratelimit-limit-req-minute: 0`) → défaut `ministral-14b-latest`, surcharge via `LLM_MODEL`.
- **Labo IA** (`/labo`, `app/api/labo/*`, `components/labo/`, `lib/labo/`) : banc de test
  local de la chaîne audio → transcription → compte rendu, **en avance sur l'étape 4**.
  Sans authentification, donc 404 en production (`lib/labo/guard.ts`). La logique
  réutilisable est dans `lib/ai/` (`call-report.ts`, `provenance.ts`) ; le labo n'est
  qu'une interface jetable. Faux call de test : `docs/labo/faux-call.m4a`.
- **Détection de sortie** (`lib/release/detect.ts`, connecteurs dans `lib/integrations/`) :
  Deezer par ISRC → iTunes par **UPC** de l'album puis numéro de piste (iTunes ne cherche
  **pas** par ISRC) → MusicBrainz par ISRC (liens Spotify/YouTube/Tidal, communautaires,
  souvent vides le jour J) → Odesli **seulement avec `ODESLI_API_KEY`** : son API publique
  renvoie `401 PUBLIC_API_ACCESS_DEPRECATED` sans clé (vérifié le 25/09/2026, contrairement
  à `docs/CONTEXTE-PROJET.md` § 5).
- **Provenance** : chaque élément extrait porte une citation mot pour mot ; c'est le code
  (`lib/ai/provenance.ts`) qui la retrouve et donne le minutage, jamais le modèle. Une
  citation introuvable signale un élément inventé.
- **Textes d'interface** : `lib/i18n/fr.ts`.
- **`cn()`** : `lib/utils/index.ts` (alias shadcn `@/lib/utils`).
- **`AGENTS.md`** est géré par Next.js (réécrit par `next dev`) : il rappelle que Next 16
  diffère des connaissances d'entraînement et que sa doc est dans
  `node_modules/next/dist/docs/`. Ne pas le supprimer, sinon `next dev` écrase `CLAUDE.md`.

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

## État d'avancement

> Tenir cette section à jour à chaque fin d'étape.

- [x] Étape 1 — amorçage du projet, aucune fonctionnalité (`docs/PROMPT-01-BOOTSTRAP.md`)
- [ ] Étape 2 — modèle de données et RLS
- [ ] Étape 3 — authentification et coquille de navigation
- [ ] Étape 4 — chaîne audio → transcription → compte rendu structuré
- [ ] Étape 5 — étape Cadrage de bout en bout
- [ ] Étape 6 — détection de sortie par ISRC et smartlink
