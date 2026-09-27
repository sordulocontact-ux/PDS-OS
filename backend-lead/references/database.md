# Base de données — Postgres 18/19, Supabase, Drizzle/Prisma

Sommaire : 1. Modélisation · 2. Index · 3. Requêtes : N+1, EXPLAIN, patterns · 4. RLS (Supabase)
· 5. Pooling de connexions · 6. Migrations zéro-downtime · 7. Drizzle vs Prisma · 8. Nouveautés
Postgres 18 et 19 · 9. Sauvegardes et hygiène · 10. Diagnostic (`scripts/pg_health.sql`).

Postgres est le défaut pour tout : relationnel, JSON (`jsonb`), full-text (`tsvector`), vecteurs
(`pgvector`), files d'attente (pg-boss), cache léger. N'ajoute une autre base que quand un
besoin mesuré le justifie.

---

## 1. Modélisation

- **Clés primaires** : `uuid` généré par `uuidv7()` (natif PG 18 ; sinon extension ou génération
  applicative) — triable dans le temps, donc index B-tree compact et insertions localisées,
  contrairement à `uuid v4` qui fragmente. Alternative : `bigint generated always as identity`
  pour des tables internes jamais exposées.
- **Horodatage** : `created_at timestamptz not null default now()`, `updated_at timestamptz not
null default now()` maintenu par trigger ou par l'ORM. Jamais `timestamp` sans fuseau.
- **Multi-tenant** : colonne `org_id` (ou `tenant_id`) sur **chaque** table métier, même quand
  elle est déductible par jointure — c'est ce qui rend RLS et les index composites simples.
- **Contraintes en base** : `not null` partout où un null n'a pas de sens, `check` pour les
  domaines (`amount_cents >= 0`, `status in (...)` ou un `enum`), `unique` pour les invariants
  métier, FK avec `on delete` explicite (`restrict` par défaut, `cascade` seulement pour des
  enfants purs comme des lignes de facture). Le code applicatif peut avoir un bug ; la base est
  la dernière ligne de défense.
- **Statuts** : `text` + `check` ou `enum` ; une machine à états documentée (transitions
  autorisées) implémentée dans la couche service, pas dans le client.
- **Soft delete** (`deleted_at timestamptz`) uniquement si un écran « corbeille » ou une
  obligation légale existe ; sinon supprime et audite. Si soft delete : index partiel
  `where deleted_at is null` sur les colonnes de recherche, et les contraintes `unique`
  deviennent partielles aussi.
- **`jsonb`** pour des données réellement semi-structurées (préférences, payload de webhook,
  métadonnées libres). Pas pour éviter de faire une table. Index GIN si tu filtres dedans.
- **Montants** : `bigint` en centimes ou `numeric(14,2)` ; jamais `float`.
- **Audit** : table `audit_log(id, org_id, actor_id, action, entity, entity_id, before, after,
at)` alimentée par la couche service (ou trigger) pour toute mutation sensible.
- **Générated columns** : PG 18 les rend _virtuelles_ par défaut (calculées à la lecture, pas
  stockées) ; utilise `stored` si tu indexes dessus.
- **Contraintes temporelles** (PG 18) : `primary key (room_id, during without overlaps)` pour
  des réservations / plages sans chevauchement, à la place d'un check applicatif fragile.

Nommage : `snake_case`, tables au pluriel (`projects`), FK `<table_singulier>_id`, index
`idx_<table>_<cols>`, contraintes `<table>_<col>_check`. Un schéma `private` (non exposé par
PostgREST) pour les fonctions internes et les tables techniques (outbox, idempotency).

---

## 2. Index

Règle : **chaque FK a un index, chaque colonne utilisée dans un `where`/`join`/`order by` d'une
requête chaude a un index qui suit l'ordre de la requête.** Postgres n'indexe pas les FK tout seul.

- **Composite** dans l'ordre : égalité d'abord, puis plage/tri : `(org_id, status, created_at
desc)`. Depuis PG 18, le **skip scan** permet d'utiliser un index composite même sans filtre
  sur la première colonne (utile pour `(tenant_id, created_at)` filtré par `created_at` seul) —
  mais reste efficace surtout si la première colonne a peu de valeurs distinctes ; ne compte pas
  dessus pour remplacer un index dédié sur une requête chaude.
- **Partiel** : `create index … where status = 'active'` ou `where deleted_at is null` — plus
  petit, plus rapide, exactement ce que l'écran demande.
- **Couvrant** : `include (title, updated_at)` pour servir une liste depuis l'index seul
  (index-only scan).
- **GIN** pour `jsonb`, tableaux, full-text (`to_tsvector`) ; **HNSW** (pgvector) pour les
  embeddings ; **BRIN** pour d'énormes tables append-only triées par temps.
- **Unicité insensible à la casse** : `unique (lower(email))` ou type `citext`.
- Un index coûte à chaque écriture : supprime ceux que `pg_stat_user_indexes.idx_scan = 0`
  montre inutilisés depuis des semaines (`scripts/pg_health.sql`).
- Toujours `create index concurrently` en prod (§6).

---

## 3. Requêtes

### N+1

Le tueur de perf n°1 des apps Next/Supabase : une liste de 50 projets qui fait 50 requêtes pour
les propriétaires. Détecte-le en comptant les requêtes par page (logs ORM, `pg_stat_statements`
avec un `calls` anormalement haut). Corrige par une jointure, un `where id = any($1)` en une
requête, ou les relations de l'ORM (`with: { owner: true }` en Drizzle, `include` en Prisma).
En GraphQL, DataLoader. Jamais une boucle `for … await db.query`.

### EXPLAIN

Avant d'optimiser, mesure : `explain (analyze, buffers, format text) <requête>`. Cherche
`Seq Scan` sur une grosse table, `Rows Removed by Filter` élevé, `Sort` avec `external merge`
(= `work_mem` trop petit ou index manquant), un `Nested Loop` sur des milliers de lignes. La
requête doit être `Index Scan` / `Index Only Scan` sur les colonnes attendues.

### Patterns

- **Sélection explicite** : jamais `select *` dans une liste — le VM décide des colonnes.
- **Agrégats dans la requête** : `count(*) filter (where status = 'done')`, `jsonb_agg` pour
  emballer des enfants dans le parent en une requête.
- **Upsert** : `insert … on conflict (org_id, slug) do update set …` ; PG 19 : `do select` pour
  get-or-create.
- **`returning`** pour renvoyer le VM après écriture sans re-lecture ; PG 18 permet `returning
old.*, new.*` pour un audit avant/après.
- **Transactions courtes** : ouvre tard, ferme tôt, jamais d'appel HTTP ou d'attente dans une
  transaction. `set local statement_timeout = '5s'` pour les requêtes web.
- **Verrous ciblés** : `select … for update skip locked` pour des files/workers ; jamais un
  `lock table`.
- **Recherche** : `ilike '%x%'` ne peut pas utiliser un B-tree → `pg_trgm` + index GIN, ou
  full-text `tsvector` avec un index GIN et une colonne générée stockée.
- **Vues / fonctions SQL** pour encapsuler un VM complexe réutilisé ; `security_invoker = true`
  sur les vues exposées via Supabase pour que RLS s'applique.

---

## 4. RLS — Row Level Security (Supabase et Postgres exposé)

Sur Supabase, la clé `anon` est publique : **sans RLS, toute table du schéma `public` est lisible
et modifiable par n'importe qui** (CVE-2025-48757 : ~10 % des apps « vibe-codées » auditées
exposaient des tables). RLS est donc obligatoire, pas optionnelle.

Règles qui marchent en prod :

```sql
alter table public.projects enable row level security;

-- Lecture : membres de l'org
create policy "projects_select_members" on public.projects
  for select to authenticated
  using (org_id in (select private.user_org_ids()));

-- Écriture : rôle owner/admin de l'org, et on ne peut pas réassigner à une autre org
create policy "projects_update_admins" on public.projects
  for update to authenticated
  using  (private.has_org_role(org_id, array['owner','admin']))
  with check (private.has_org_role(org_id, array['owner','admin']));
```

- **Active RLS sur chaque table** du schéma exposé, et ajoute immédiatement au moins une policy
  `select` : RLS sans policy bloque tout, et le réflexe « je désactive RLS pour débloquer » rouvre
  la porte. Requête de contrôle dans `scripts/pg_health.sql`.
- **`to authenticated` (ou `to anon` volontairement)** — `auth.role()` est déprécié. `to
authenticated` vérifie le rôle, pas l'identité : combine toujours avec un prédicat de
  propriété/appartenance (sinon BOLA).
- **`(select auth.uid())`** au lieu de `auth.uid()` nu : Postgres met en cache le résultat par
  requête au lieu de l'appeler par ligne — des gains ×10 à ×100 sur de grosses tables.
- **Indexe les colonnes des policies** (`user_id`, `org_id`) : une policy est un `where` ajouté
  à chaque requête ; sans index, c'est un seq scan par requête.
- **`update` exige `using` ET `with check`** ; sans `with check`, un utilisateur peut réassigner
  une ligne à quelqu'un d'autre. Et un `update` sans policy `select` correspondante renvoie
  silencieusement 0 ligne.
- **Fonctions `security definer`** pour les vérifications qui joignent 3+ tables (membership,
  rôles) : dans un schéma `private` non exposé, avec `set search_path = ''`, `stable`, et un
  contrôle sur `auth.uid()` dedans. Elles contournent RLS : ne les utilise jamais pour « faire
  passer » une erreur de permission.
- **Vues** : `create view … with (security_invoker = true)` sinon la vue s'exécute avec les
  droits du créateur et ignore RLS.
- **`service_role`** contourne tout : uniquement côté serveur (jobs, admin), jamais dans un
  client, jamais en variable `NEXT_PUBLIC_`. Sur Supabase, préfère les nouvelles clés
  `publishable`/`secret` si ton projet les propose.
- **Teste les policies depuis le SDK client** (ou `set role authenticated; set request.jwt.claims
= …` en SQL), pas depuis l'éditeur SQL qui bypass RLS. Un test d'intégration par policy
  sensible : « l'utilisateur B ne voit pas la ressource de A ».
- Storage : mêmes règles sur `storage.objects` (policies par bucket + préfixe de chemin).
- Coût : chaîne rapide → lent : égalité de colonne (`user_id = (select auth.uid())`) < claim JWT
  (`org_id = (auth.jwt()->>'org_id')::uuid`) < `exists` indexé < `in (subquery)` < fonction <
  jointures multiples. Mesure avec `explain analyze` en te faisant passer pour un utilisateur.

Sans Supabase (API classique), RLS reste un excellent **deuxième filet** : `set local
app.current_org = …` en début de transaction + policies dessus ; l'appli filtre déjà, RLS
attrape l'oubli.

---

## 5. Pooling de connexions

Chaque connexion Postgres est un processus (~5–10 Mo). Serverless/edge + 200 lambdas = base
saturée. Donc :

- **Toujours un pooler en mode transaction** devant la base pour le trafic web : PgBouncer
  (≥ 1.21 supporte les prepared statements protocolaires, à configurer `max_prepared_statements`),
  Supavisor (Supabase, port 6543 = transaction, 5432 = session), le pooler intégré de Neon
  (`-pooler` dans l'hôte, PgBouncer 1.22+).
- En mode transaction, **pas** de : `set` de session (utilise `set local`), `listen/notify`,
  `prepare` SQL, tables temporaires persistantes, advisory locks de session. Les ORMs qui
  préparent des statements nommés (Prisma, certains drivers) → active le support côté pooler ou
  `?pgbouncer=true` / `prepare: false` côté driver.
- **Pool applicatif petit** derrière le pooler : 5–10 connexions par instance ; le pooler fait le
  multiplexage.
- **Connexion directe** (port 5432, hors pooler) pour : migrations, `pg_dump`, réplication
  logique, longues analyses.
- Timeouts partout : `connect_timeout`, `statement_timeout` (5–15 s web), `idle_in_transaction_session_timeout` (30 s) pour tuer les transactions oubliées.
- Serverless sans pooler possible → driver HTTP (Neon serverless, Supabase Data API) ou Data Proxy.

---

## 6. Migrations zéro-downtime

Un déploiement progressif fait tourner l'ancien **et** le nouveau code contre la même base. Une
migration doit être compatible avec les deux. Et un `alter table` qui attend un verrou `access
exclusive` bloque tout le trafic derrière lui, même si le DDL lui-même est instantané.

Toujours :

```sql
set lock_timeout = '3s';           -- échoue vite au lieu de faire la queue
set statement_timeout = '30s';
```

avec un **retry** (3–5 tentatives, backoff) côté outil de migration. Et un `pg_advisory_lock`
global pour empêcher deux runners CI de migrer en même temps.

| Opération                                                     | Risque                                       | À faire                                                                                                                                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add column` nullable ou avec `default` constant              | Catalogue seulement (PG 11+), instantané     | OK avec `lock_timeout`                                                                                                                                                                                     |
| `add column … default now()` / `gen_random_uuid()` (volatile) | Réécrit toute la table                       | Ajoute nullable, backfill par lots, puis `set default`                                                                                                                                                     |
| `add column not null` sans default                            | Full scan sous verrou                        | `add column` nullable → backfill → `add check (col is not null) not valid` → `validate constraint` → `set not null` (PG 12+ utilise le check validé)                                                       |
| `create index`                                                | Bloque les écritures pendant la construction | `create index concurrently`, **hors transaction** (annotation `-- +goose NO TRANSACTION`, `executeInTransaction=false`, `--no-transaction`), puis vérifier `pg_index.indisvalid` et drop/retry si invalide |
| `add foreign key`                                             | Scan + verrou                                | `… not valid` puis `validate constraint` séparément                                                                                                                                                        |
| `rename column/table`                                         | Casse l'ancien code instantanément           | **Expand/contract** (3 déploiements)                                                                                                                                                                       |
| `alter column type`                                           | Réécriture + verrou                          | Nouvelle colonne + dual write + backfill + bascule                                                                                                                                                         |
| `drop column`                                                 | Verrou bref mais casse l'ancien code         | Contract seulement après que plus aucun déploiement ne lit la colonne                                                                                                                                      |

**Expand / contract** :

1. _Expand_ : ajoute la nouvelle structure à côté de l'ancienne. Déploie du code qui écrit dans
   les deux et lit l'ancienne.
2. _Migrate_ : backfill par lots (`update … where id in (select … limit 5000)` en boucle,
   avec pause), puis déploie du code qui lit la nouvelle.
3. _Contract_ : quand plus rien ne lit l'ancienne, supprime-la (jours ou semaines plus tard).

Outils : Drizzle Kit / Prisma Migrate / Alembic / goose génèrent le SQL — **relis-le** ; ils ne
connaissent pas ton trafic. Pour aller plus loin : `pgroll`, `pg-osc`, `safe-pg-migrations`
(Doctolib), `pg-schema-diff` (ajoute `lock_timeout` et `not valid` tout seul). Pas de `drizzle
push` / `prisma db push` en prod : ce sont des outils de dev.

Une migration = un fichier idempotent, commité, exécuté par la CI **avant** le déploiement du
code (étape séparée), avec la connexion directe (pas le pooler).

---

## 7. Drizzle vs Prisma (2026)

|            | Drizzle                                                                                      | Prisma 7                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Schéma     | TypeScript (`pgTable`), types inférés, pas de codegen                                        | DSL `.prisma` + `prisma generate`                                                                           |
| Requêtes   | SQL-proche (`select().from().where()`) + API relationnelle (`db.query.x.findMany({ with })`) | Client objet (`findMany({ include })`), TypedSQL pour le SQL                                                |
| Poids      | Minuscule, zéro dépendance, idéal serverless/edge                                            | Moteur Rust remplacé par un moteur TS/WASM en v7 : ~85–90 % plus léger qu'avant, cold starts bien meilleurs |
| SQL brut   | Première classe (`sql\`…\``), typé                                                           | Possible mais secondaire                                                                                    |
| Migrations | Drizzle Kit → fichiers SQL éditables                                                         | Prisma Migrate → dossiers SQL                                                                               |
| Bases      | Postgres, MySQL, SQLite, MSSQL, libSQL                                                       | + MongoDB, CockroachDB, plus large                                                                          |
| Studio     | Drizzle Studio (correct)                                                                     | Prisma Studio (plus mûr)                                                                                    |

Défaut greenfield Next + Postgres : **Drizzle** (tu vois le SQL, tu contrôles les index, les
types sont toujours à jour). **Prisma** si l'équipe ne veut pas de SQL, si tu as une base Prisma
existante, ou pour MongoDB/MSSQL. Dans les deux cas : l'ORM n'exempte pas de lire l'`explain`.

Avec Drizzle, définis les **index et contraintes dans le schéma** (`index()`, `uniqueIndex()`,
`check()`), utilise `pgPolicy()` pour versionner les policies RLS avec le schéma, et
`.$inferSelect` pour les types.

---

## 8. Nouveautés Postgres 18 (sept. 2025) et 19 (GA attendue fin sept./oct. 2026)

**PG 18** — à exploiter : sous-système **I/O asynchrone** (`io_method = worker` par défaut ;
gains ×2–3 sur seq scans, bitmap heap scans, vacuum sous charge — mesure sur ton workload
p95/p99, et vérifie que ton hébergeur l'a activé, Neon tournait en `sync` au début) ;
**skip scan** sur B-tree composites ; `uuidv7()` natif ; colonnes générées **virtuelles** par
défaut ; `returning old/new` ; contraintes temporelles `without overlaps` ; auth OAuth ;
`pg_upgrade` conserve les statistiques ; `pg_stat_io` en octets ; mots de passe MD5 dépréciés
(passe en `scram-sha-256`).

**PG 19** (beta 3 en août 2026) — à surveiller : `insert … on conflict do select` ;
`repack` / `repack concurrently` natif (fini `pg_repack` externe) ; autovacuum parallèle ;
`pg_plan_advice` (stabiliser un plan) ; `group by all` ; SQL/PGQ (requêtes graphe sur tables
relationnelles) ; `copy … to` en JSON ; réplication des séquences ; meilleures vues de
verrous. **Ruptures** : JIT désactivé par défaut, auth RADIUS supprimée, compression TOAST
`lz4` par défaut, `max_locks_per_transaction` doublé, certains opclass GiST inet/cidr à
`reindex`. Ne bascule un projet existant qu'après les notes de version finales.

---

## 9. Sauvegardes et hygiène

- Backups automatiques **testés** (restaure vraiment une fois par trimestre) ; PITR si les
  données valent quelque chose. Sur Supabase/Neon : vérifie la rétention du plan.
- `autovacuum` actif ; surveille le bloat des tables très mises à jour.
- Un rôle applicatif par service avec le minimum de privilèges (`grant select, insert, update
on …`), jamais `postgres`/superuser pour l'app.
- Extensions minimales, versionnées dans les migrations.
- Chiffrement au repos (fourni par l'hébergeur) et TLS obligatoire en transit (`sslmode=require`).

## 10. Diagnostic

`scripts/pg_health.sql` : tables sans RLS, FK sans index, index inutilisés ou invalides, top
requêtes par temps total (`pg_stat_statements`), tables les plus volumineuses/bloatées,
connexions par état, transactions idle. Lance-le avant tout audit de perf ou de sécurité.
