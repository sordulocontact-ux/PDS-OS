# Observabilité et tests — savoir ce qui se passe, prouver que ça marche

Sommaire : 1. Logs structurés · 2. Traces (OpenTelemetry) · 3. Métriques et alertes · 4. Health
checks · 5. Stratégie de test · 6. Tests d'intégration avec vraie base · 7. Tests de contrat et
de sécurité · 8. Tests de charge · 9. CI et déploiement · 10. Checklist mise en prod.

---

## 1. Logs structurés

`console.log("user " + id + " logged in")` est inutilisable en prod : pas de niveau, pas de
contexte, pas de corrélation. Standard 2026 : **JSON, un événement par ligne, corrélé à la
trace.**

- **pino** (Node : 5–10× plus rapide que winston) ; `structlog` ou `logging` JSON en Python.
- Un **logger enfant par requête** avec `requestId` (généré ou repris de `X-Request-Id`),
  `userId`, `orgId`, `route`, `method` ; chaque log de la requête les porte sans les répéter.
- Niveaux : `error` (action humaine requise ou bug), `warn` (anormal mais géré : 429, retry,
  fallback), `info` (événements métier : création, paiement, login, job terminé), `debug` (dev
  uniquement). Pas de `info` par requête HTTP réussie sur les routes chaudes si tu paies au
  volume — les métriques suffisent ; garde un log d'accès sur les 4xx/5xx et les lents.
- **Redaction** : `redact: ['req.headers.authorization', 'req.headers.cookie', '*.password',
'*.token', '*.secret']` ; jamais de corps de requête complet en prod.
- Messages en anglais courts + champs : `log.info({ invoiceId, amountCents }, 'invoice sent')`
  — pas d'interpolation dans le message.
- Erreurs : `log.error({ err, requestId }, 'unhandled')` avec l'objet `err` (pino sérialise
  stack, cause, code) ; le client reçoit un Problem Details avec le même `requestId`.
- Sortie sur stdout ; la plateforme (Vercel, Fly, Railway, K8s) collecte. En dev,
  `pino-pretty`.

---

## 2. Traces — OpenTelemetry

Une trace suit une requête à travers auth → DAL → Postgres → Redis → job. C'est ce qui répond à
« pourquoi cette page met 1,2 s » en 30 secondes.

- `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` (HTTP, `pg`,
  `ioredis`, fetch/undici) chargé **avant** tout le reste (`--import ./otel.ts` ou
  `instrumentation.ts` en Next.js). Python : `opentelemetry-instrument`.
- `@opentelemetry/instrumentation-pino` injecte `trace_id`/`span_id` dans chaque log → clic du
  log vers la trace.
- Spans manuels autour des blocs métier (`buildDashboardVM`, `sendInvoiceEmail`) avec
  attributs `org.id`, `job.name` ; **pas** de PII dans les attributs.
- Exporter OTLP vers un backend (Grafana Tempo/Loki, Honeycomb, Dash0, SigNoz, Datadog, Axiom,
  Sentry pour les erreurs) ; en dev, console ou Jaeger local.
- Échantillonnage : 100 % des erreurs et des requêtes lentes, 10 % du reste si le volume coûte.
- Propagation W3C `traceparent` vers les jobs et les webhooks sortants pour une trace de bout en bout.
- `Server-Timing` (→ `performance.md` §1) est la version « visible dans le navigateur » de la
  même information ; alimente-le depuis les mêmes chronos.

---

## 3. Métriques et alertes

Les quatre signaux par service (RED/USE) :

- **Trafic** : requêtes/s par route.
- **Erreurs** : taux de 5xx (alerte > 1 % sur 5 min), taux de 4xx anormal (429, 401 en rafale).
- **Latence** : p50/p95/p99 par route (alerte p95 > budget pendant 10 min).
- **Saturation** : connexions Postgres utilisées / max, taille des pools, âge du plus vieux
  job en file, mémoire/CPU, taille de la DLQ.

Côté base : `pg_stat_statements` (top requêtes par temps total), `pg_stat_activity` (idle in
transaction), taux de cache hit (`pg_statio` > 99 % attendu), lag de réplication, croissance
des tables. Supabase/Neon les exposent dans leur dashboard.

Alertes actionnables uniquement (chaque alerte a un runbook d'une ligne) ; une alerte qui sonne
sans action est désactivée. Erreurs applicatives → Sentry (ou équivalent) avec `requestId` et
release taggée.

---

## 4. Health checks

- `GET /health` (liveness) : répond `200 {"status":"ok"}` si le processus tourne — **sans**
  toucher la base (sinon un incident base fait redémarrer les pods en boucle).
- `GET /ready` (readiness) : vérifie base (`select 1` avec timeout 1 s), cache, et tout ce sans
  quoi servir du trafic est inutile ; `503` sinon. Le load balancer route dessus.
- Format IETF health check (`application/health+json`) si tu veux détailler par composant.
- Non authentifié mais **non listé**, sans détail d'infra dans la réponse publique (versions,
  hôtes).
- Un endpoint `/version` (SHA du build) aide à savoir ce qui tourne.

---

## 5. Stratégie de test

Pyramide pragmatique pour un backend :

1. **Unitaires** (rapides, nombreux) : fonctions pures — règles métier, `can()`, machines à
   états, formatage de VM, parsing/validation. Vitest / pytest. Zéro base, zéro réseau.
2. **Intégration** (le cœur) : chaque endpoint/action/DAL contre une **vraie base Postgres**
   (§6). C'est là que vivent les bugs de SQL, de RLS, de transactions, de N+1.
3. **Contrat** : le VM renvoyé correspond au type/schéma exporté (snapshot des schémas
   Zod/OpenAPI, test de non-régression sur le JSON).
4. **E2E** (quelques-uns) : Playwright sur 3–5 parcours critiques (inscription, action
   principale, paiement).

Mocke les **tiers externes** (Stripe, email, Instagram) avec des doubles enregistrés (msw,
`nock`, `respx`), jamais la base ni ton ORM.

---

## 6. Tests d'intégration avec vraie base

- **Testcontainers** (`@testcontainers/postgresql`, `testcontainers` Python) démarre un Postgres
  18 jetable par run de tests ; ou `assets/docker-compose.dev.yml` en CI. Même version majeure
  que la prod.
- Migrations appliquées une fois par run ; **chaque test dans une transaction rollbackée** ou
  `truncate … cascade` entre tests pour l'isolation. Pas de base partagée mutable.
- Fixtures/factories typées (`createOrg()`, `createUser({ role })`, `createProject({ org })`)
  plutôt que des dumps SQL.
- Tests **d'autorisation systématiques** : pour chaque ressource, « l'utilisateur B (autre org)
  ne voit pas / ne modifie pas la ressource de A » et « un `member` ne peut pas faire une action
  `admin` ». Sur Supabase, exécute la requête via le client avec le JWT de B (ou `set role
authenticated` + claims) pour tester RLS, pas en `service_role`.
- Tests de **N+1** : compte les requêtes émises (hook sur le driver / `pg_stat_statements`
  delta) et assert `≤ N`.
- Tests d'**idempotence** : rejoue la même mutation avec la même clé → même résultat, un seul
  effet.
- Tests de **migration** : la suite tourne sur un schéma migré depuis zéro **et** un test
  vérifie que les migrations `up` s'appliquent sur un dump de prod anonymisé (ou au moins sur la
  version N-1).
- Vitest : `--pool=forks` pour isoler ; timeouts 10 s ; `globalSetup` pour le container.

---

## 7. Tests de contrat et de sécurité

- **Schémas en snapshot** : le JSON Schema/OpenAPI généré est commité ; un test échoue si le
  contrat change sans mise à jour volontaire (revue en PR).
- **Validation** : pour chaque endpoint, un test avec payload invalide → `422` Problem Details
  avec `errors[].field`, un test avec champ inconnu → rejeté (`.strict()`), un test avec
  `limit=100000` → clampé.
- **Auth** : sans session → `401` ; mauvais rôle → `403` ; ressource d'un autre tenant → `404`.
- **Sécurité automatisée en CI** : `scripts/audit_backend.py`, audit des dépendances, scan de
  secrets (gitleaks), `pg_health.sql` sur staging pour les tables sans RLS. Optionnel : ZAP
  baseline sur staging, Semgrep avec les règles OWASP/Next.
- **Fuzz léger** sur les parsers (zod-fast-check, Hypothesis) pour les routes publiques.

---

## 8. Tests de charge

Avant une mise en prod significative ou une campagne :

- **k6** (ou autocannon pour du rapide) sur les 3–5 endpoints les plus chauds et le parcours
  principal, avec des données réalistes (10× le volume actuel).
- Scénarios : montée progressive jusqu'à 2× la pointe attendue, palier 10 min, pic soudain.
- Regarde : p95/p99 vs budget, taux d'erreur, connexions Postgres (saturation du pool = premier
  goulot habituel), CPU/mémoire, âge des files.
- Sur staging avec la même taille de base et le même pooler que la prod, jamais sur la prod.

---

## 9. CI et déploiement

Pipeline minimal : install gelé → lint + typecheck → unit → intégration (container Postgres) →
build → audit deps/secrets → **migrations** (étape séparée, connexion directe, `lock_timeout` +
retry) → déploiement progressif → smoke test (`/ready`, un parcours) → rollback automatique si
`/ready` ou le taux de 5xx dégrade.

- Un seul artefact buildé, promu de staging à prod (pas de rebuild).
- Variables d'environnement validées au démarrage ; un déploiement avec une variable manquante
  échoue au boot, pas en prod à 3 h du matin.
- Feature flags pour découpler déploiement et activation (expand/contract côté fonctionnel).
- Blue/green ou rolling avec `SIGTERM` géré (serveur : arrête d'accepter, termine les requêtes
  en cours ≤ 30 s ; workers : idem pour les jobs).

---

## 10. Checklist mise en prod

- [ ] Logs JSON avec `requestId`, redaction, niveau `info` en prod
- [ ] OTel actif, traces corrélées aux logs, erreurs vers Sentry (ou équivalent) avec release
- [ ] `/health` et `/ready` branchés sur le load balancer
- [ ] Alertes : 5xx > 1 %, p95 > budget, pool Postgres > 80 %, DLQ > 0, âge file > 5 min
- [ ] Tests d'intégration verts contre Postgres 18, y compris autorisation cross-tenant et RLS
- [ ] Test de charge passé sur les endpoints chauds
- [ ] Migrations appliquées avant le déploiement, compatibles N-1, avec `lock_timeout`
- [ ] Backups vérifiés par une restauration réelle
- [ ] Runbook : où sont les logs, comment rejouer un job, comment rollback, qui appeler
