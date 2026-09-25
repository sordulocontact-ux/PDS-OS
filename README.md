# PDS OS

Outil interne de gestion du cycle de vie des sorties musicales. Contexte métier :
[`docs/CONTEXTE-PROJET.md`](docs/CONTEXTE-PROJET.md). Conventions : [`CLAUDE.md`](CLAUDE.md).

## Prérequis

- Node.js ≥ 20 et pnpm 11 (`corepack enable`)
- Supabase CLI
- Docker Desktop (ou OrbStack), démarré — requis par `supabase start`

## Installation

```bash
pnpm install          # installe aussi le hook de pre-commit
supabase start        # stack locale : Postgres, Auth, Storage, Studio
cp .env.example .env.local
supabase status -o env   # donne API_URL, ANON_KEY, SERVICE_ROLE_KEY à reporter
pnpm dev              # http://localhost:3000
```

La page d'accueil indique si la configuration est valide et, sinon, quelles variables
manquent.

## Variables d'environnement

Toutes sont décrites dans [`.env.example`](.env.example) et validées au démarrage
(`lib/env.ts`).

| Variable                        | Source                                        | Requise                          |
| ------------------------------- | --------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `supabase status -o env` → `API_URL`          | oui                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase status -o env` → `ANON_KEY`         | oui                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | `supabase status -o env` → `SERVICE_ROLE_KEY` | non (serveur uniquement)         |
| `LLM_PROVIDER`                  | `mistral` (défaut) ou `google`                | non                              |
| `MISTRAL_API_KEY`               | console.mistral.ai                            | si `LLM_PROVIDER=mistral`        |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | aistudio.google.com                           | si `LLM_PROVIDER=google`         |
| `TRANSCRIPTION_PROVIDER`        | `groq` (défaut)                               | non                              |
| `GROQ_API_KEY`                  | console.groq.com                              | si `TRANSCRIPTION_PROVIDER=groq` |

Les paliers gratuits de ces fournisseurs peuvent entraîner leurs modèles sur les
requêtes : aucune donnée réelle du client ne doit y transiter.

## Commandes

```bash
pnpm dev            # serveur de développement
pnpm build          # build de production — doit passer avant tout commit
pnpm lint           # ESLint
pnpm typecheck      # types des routes + tsc
pnpm format         # Prettier (avec tri des classes Tailwind)
pnpm db:types       # régénère lib/supabase/database.types.ts depuis la base locale
supabase start      # démarre la stack locale
supabase db reset   # rejoue les migrations
```
