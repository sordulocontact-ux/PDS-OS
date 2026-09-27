# Contrats d'API — écran-prêt, REST 2026, Next.js

Sommaire : 1. View models écran-prêts · 2. Choisir le transport (Server Actions / Route Handlers /
API dédiée / tRPC) · 3. Conventions REST · 4. Erreurs RFC 9457 · 5. Pagination par curseur · 6. Idempotency keys · 7. Concurrence optimiste · 8. Rate limiting · 9. Versioning et dépréciation · 10. OpenAPI et typage bout-en-bout · 11. Anti-patterns.

---

## 1. View models écran-prêts

Le principe : **le serveur renvoie ce que l'écran affiche.** Pas ce que la table contient.

```ts
// ❌ Forme "table" : le front doit joindre, formater, décider
{ id, owner_id, status: "in_progress", budget_cents: 125000, updated_at: "..." }

// ✅ Forme "écran" : le composant mappe et affiche
type ProjectCardVM = {
  id: string;
  title: string;
  owner: { id: string; name: string; avatarUrl: string | null };
  status: { code: "in_progress"; label: "En cours"; tone: "info" | "success" | "warning" | "danger" | "neutral" };
  budget: { amount: 1250, currency: "EUR", formatted: "1 250,00 €" };
  updatedAt: string;          // ISO 8601, le front affiche "il y a 2 h" avec une lib
  can: { edit: boolean; archive: boolean; invite: boolean };
};

type ProjectListVM = {
  items: ProjectCardVM[];
  nextCursor: string | null;
  emptyReason: null | "no_projects_yet" | "no_match_for_filters";
  summary: { active: number; archived: number };   // seulement si l'écran l'affiche
  partial?: { unavailable: ("summary")[] };         // dégradation gracieuse
};
```

Règles :

- **Nomme les VM par écran** (`ProjectListVM`, `InvoiceDetailVM`), pas par table. Deux écrans
  peuvent avoir deux VM différents sur la même table — c'est normal.
- **Calcule côté serveur** tout ce qui est déterministe et partagé : permissions, formats
  monétaires (locale + devise connues serveur), labels de statut, compteurs, tri.
- **Laisse au front** ce qui dépend de l'instant ou de l'appareil : temps relatif, largeur,
  animations, mise en cache locale d'UI.
- **Emets les états** : `emptyReason` distingue le premier usage (« créez votre premier projet »)
  du filtre sans résultat (« aucun projet ne correspond »). `partial` permet d'afficher la liste
  même si les stats ont échoué (timeout) au lieu d'une page d'erreur.
- **Construis le VM par un `select` explicite** et des jointures — jamais en chargeant l'entité
  complète puis en filtrant en JS (fuite de champs + surcoût).
- **Le type du VM est la source de vérité partagée** : exporté depuis `packages/contracts` ou
  `src/server/contracts`, inféré de Zod/Drizzle, importé tel quel par le front.

Pattern d'agrégation serveur (une requête par sous-bloc, en parallèle, chacune protégée) :

```ts
export async function getDashboardVM(ctx: AuthedCtx): Promise<DashboardVM> {
  const [projects, invoices, stats] = await Promise.allSettled([
    listRecentProjects(ctx, 5),
    listOverdueInvoices(ctx),
    computeStats(ctx), // la plus lente / la plus fragile
  ]);
  const ok = <T>(r: PromiseSettledResult<T>) =>
    r.status === "fulfilled" ? r.value : null;
  const unavailable = [projects, invoices, stats]
    .map(ok)
    .flatMap((v, i) =>
      v === null ? [["projects", "invoices", "stats"][i]] : [],
    );
  return {
    projects: ok(projects) ?? [],
    invoices: ok(invoices) ?? [],
    stats: ok(stats),
    partial: unavailable.length ? { unavailable } : undefined,
  };
}
```

---

## 2. Choisir le transport

| Contexte                                                         | Choix                                                                                                     | Pourquoi                                                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Lecture pour une page Next.js                                    | **Server Component** qui appelle la couche d'accès aux données (DAL) directement                          | Zéro endpoint public, pas de waterfall client, typage direct                                                      |
| Mutation depuis une page Next.js                                 | **Server Action** (`'use server'`) nommée par intention, validée par Zod, auth vérifiée **dans** l'action | Les actions vérifient l'`Origin` ≈ Host (anti-CSRF), mais une action est un endpoint public : traite-la comme tel |
| Données pour un client externe, mobile, webhook entrant, polling | **Route Handler** (`app/api/.../route.ts`) ou API dédiée                                                  | Contrat HTTP stable, cache HTTP possible, testable avec curl                                                      |
| Plusieurs clients (web + mobile + partenaires)                   | **API dédiée** (Hono / Fastify / FastAPI) + éventuellement un BFF par client                              | Un seul backend « générique » finit criblé de `if (client === 'mobile')`                                          |
| Monorepo TS full-stack, zéro client externe                      | tRPC ou Hono RPC (`hc<AppType>`)                                                                          | Typage bout-en-bout sans OpenAPI ; à éviter si un client non-TS arrive                                            |

Règles Next.js 16 :

- `proxy.ts` (ex-`middleware.ts`) sert au routage, redirections, headers. **Pas** de décision
  d'autorisation finale dedans (→ `security.md` §3).
- La **DAL** (`src/server/dal/*.ts`) est l'unique porte vers la base : chaque fonction prend un
  contexte authentifié (`ctx.userId`, `ctx.orgId`, `ctx.role`) et filtre par lui. Server
  Components, Server Actions et Route Handlers appellent la DAL, jamais l'ORM directement.
- Marque les modules serveur avec `import 'server-only'` pour qu'ils ne fuient jamais dans le
  bundle client.
- Une Server Action retourne un résultat discriminé, pas une exception :
  `{ ok: true, data } | { ok: false, error: ProblemDetails }` — le front affiche sans try/catch.

---

## 3. Conventions REST (quand tu exposes du HTTP)

- Noms pluriels, pas de verbes : `GET /projects`, `GET /projects/{id}`, `POST /projects`.
- Les actions non-CRUD sont des **sous-ressources d'intention** : `POST /projects/{id}/archive`,
  `POST /invoices/{id}/send`. C'est plus clair qu'un `PATCH {status}` qui encode une machine à états dans le client.
- Codes : `200` lecture/màj, `201` + `Location` création, `202` travail asynchrone accepté (avec
  URL de statut), `204` suppression, `400` syntaxe, `401` non authentifié, `403` interdit,
  `404` (aussi pour « existe mais pas à toi » si tu ne veux pas révéler l'existence), `409`
  conflit d'état, `412` précondition (ETag), `422` validation métier, `429` rate limit + `Retry-After`.
- JSON : `camelCase` côté TS (ou `snake_case` uniformément côté Python) — choisis et documente.
  Dates ISO 8601 UTC avec `Z`. Montants en entiers de la plus petite unité (`amountCents`) **et**
  format prêt à afficher si l'écran l'affiche.
- Identifiants : `uuidv7` (triable dans le temps, index B-tree heureux). Jamais d'ID séquentiel
  exposé publiquement si l'énumération est un risque.
- Filtrage : query params explicites (`?status=active&ownerId=…`), liste blanche des champs
  triables (`?sort=-updatedAt`), jamais un `where` libre venu du client.
- Sélection de champs (`?fields=id,title`) seulement si plusieurs clients en ont besoin ; sinon
  c'est le VM qui décide.

---

## 4. Erreurs — RFC 9457 Problem Details

Un seul format d'erreur pour toute l'API, `Content-Type: application/problem+json` :

```json
{
  "type": "https://api.example.com/problems/validation",
  "title": "Données invalides",
  "status": 422,
  "detail": "Le budget doit être positif.",
  "instance": "/projects/01926f…",
  "requestId": "req_7f3a…",
  "errors": [{ "field": "budget", "message": "doit être > 0", "code": "min" }]
}
```

- `type` est une URI **stable par classe d'erreur** — le front branche dessus, pas sur le texte.
- `detail` est humain et affichable tel quel ; `errors[]` porte le champ pour l'erreur inline.
- Jamais de stack trace, de requête SQL, de nom de table, de version de lib en réponse. Ça part
  dans les logs avec le `requestId`.
- Un handler d'erreur global mappe : erreur de validation → 422, `NotFound` → 404, `Forbidden` →
  403, violation d'unicité Postgres (`23505`) → 409, timeout tiers → 503 + `Retry-After`,
  inconnu → 500 générique **logué avec la stack**. Ne laisse jamais un « fail open » (erreur
  dans le check de permission ⇒ accès refusé, pas accordé).
- Helper prêt à l'emploi : `assets/problem-details.ts`.

---

## 5. Pagination par curseur

L'`OFFSET` lit et jette toutes les lignes précédentes (`OFFSET 100000` = 100 000 lignes
scannées) et rate/duplique des éléments quand la liste bouge. Curseur par défaut sur toute liste.

```sql
-- Tri stable : colonne triée + clé unique en départage
SELECT ... FROM projects
WHERE org_id = $1
  AND (updated_at, id) < ($2::timestamptz, $3::uuid)   -- le curseur décodé
ORDER BY updated_at DESC, id DESC
LIMIT $4 + 1;                                           -- +1 pour savoir s'il y a une suite
```

- Curseur = base64url de `{ updatedAt, id }` (opaque pour le client), signé si tu ne veux pas
  qu'il soit forgé.
- `limit` par défaut 25, **max serveur 100** (clamp, ne renvoie pas 400 pour ça).
- Réponse : `{ items, nextCursor: string | null }`. `null` = fin.
- Index composite qui suit exactement l'ordre : `(org_id, updated_at DESC, id DESC)`.
- Offset acceptable uniquement pour un tableau admin < 10 k lignes où l'utilisateur veut sauter à
  la page N.
- Ne renvoie `total` que si l'écran l'affiche ; sinon `COUNT(*)` sur une grosse table coûte plus
  que la page elle-même. Pour un ordre de grandeur, `reltuples` de `pg_class` suffit.

---

## 6. Idempotency keys (mutations rejouables)

Un client (ou un agent) qui ne sait pas si son `POST` est passé va **rejouer**. Sans clé, tu
crées deux commandes / envoies deux emails.

- Header `Idempotency-Key: <uuid v4>` sur `POST`/`PATCH` à effet de bord (paiement, création,
  envoi). Max 255 caractères.
- Stockage : table `idempotency_keys(key, user_id, request_hash, response_status, response_body,
created_at)` avec unicité `(user_id, key)`, TTL 24 h (job de purge).
- Flux : clé connue + même `request_hash` → rejoue la réponse stockée ; clé connue + hash
  différent → `422` (ou `409`) « clé réutilisée avec un autre payload » ; clé en cours de
  traitement → `409` « en cours ».
- Scope la clé par utilisateur/tenant : deux clients ne doivent pas collisionner.
- En base, préfère aussi les écritures naturellement idempotentes : `INSERT … ON CONFLICT DO
NOTHING/UPDATE`, `UPDATE … WHERE status = 'draft'` (garde d'état). PG 19 ajoute
  `ON CONFLICT DO SELECT` (get-or-create atomique).

---

## 7. Concurrence optimiste

Deux personnes éditent la même fiche : le dernier écrase l'autre en silence. Évite-le avec une
version :

- Colonne `version int` (ou `updated_at`) incrémentée à chaque écriture ;
  `UPDATE … WHERE id = $1 AND version = $2` → 0 ligne = conflit → `409` avec le VM actuel pour que
  l'UI propose « recharger / écraser ».
- En HTTP pur : `ETag` sur le `GET`, `If-Match` sur le `PUT/PATCH`, `412` si différent.

---

## 8. Rate limiting

- Deux niveaux : global par IP (protection DDoS basique, souvent au CDN/proxy) et **par
  utilisateur/clé API par route sensible** (login, envoi d'email, export, recherche).
- Algorithme token bucket ou sliding window ; stockage Redis/Valkey (ou en mémoire si une seule
  instance et que tu l'assumes). Sur Supabase, Postgres peut porter un compteur pour des routes
  peu fréquentes.
- Réponse `429` + `Retry-After` + headers IETF `RateLimit-Policy` / `RateLimit` (draft standard,
  déjà utilisé) ou `X-RateLimit-*` si ton écosystème l'attend.
- Login : limite par compte **et** par IP, avec backoff progressif, et ne révèle pas si le compte
  existe.

---

## 9. Versioning et dépréciation

- Ajouter un champ n'est pas une rupture ; renommer, supprimer, changer un type ou une sémantique
  l'est.
- Pour une API interne (ton propre front) : pas de `/v1/`, tu déploies front et back ensemble,
  et tu utilises expand/contract sur les contrats comme sur le schéma (ajoute le nouveau champ,
  migre le front, retire l'ancien).
- Pour une API publique : version dans le chemin (`/v1/`) ou en header (`API-Version: 2026-09-01`
  style Stripe). Annonce une dépréciation avec `Deprecation` + `Sunset` headers et 6–12 mois de
  préavis.

---

## 10. OpenAPI et typage bout-en-bout

- Si l'API a un consommateur qui n'est pas ton code TS : **OpenAPI 3.1/3.2** générée depuis les
  schémas (Hono → `@hono/zod-openapi`, Fastify → JSON Schema + `@fastify/swagger`, FastAPI →
  natif). Le fichier généré est commité et diffé en PR : un changement de contrat se voit.
- Si tout est TS dans le même repo : exporte les types depuis un package `contracts` ; le
  serveur valide avec Zod, le client infère `z.infer<typeof ProjectListVM>`.
- Les webhooks sortants ont aussi un contrat (schéma + version + signature HMAC), voir
  `async-jobs.md`.

---

## 11. Anti-patterns à refuser

- Un endpoint `GET /projects/{id}` qui renvoie l'entité entière (40 champs) pour un écran qui en
  affiche 6 → fuite de données + payload lourd + front qui filtre.
- `?include=owner,tasks,comments` empilé au fil des demandes → écran-VM dédié.
- Le front qui appelle `/projects` puis `/users/{ownerId}` en boucle → jointure serveur.
- Un `PATCH` générique qui accepte n'importe quel champ (mass assignment) → commandes typées avec
  schéma strict (`z.object({...}).strict()`).
- Une action serveur `deleteProject(id)` qui ne re-vérifie pas que `id` appartient à l'appelant.
- Une liste sans `limit` max, ou un `total` calculé par `COUNT(*)` sur chaque page.
- `try { … } catch { return null }` qui avale une erreur et renvoie un écran vide au lieu d'un
  `partial` ou d'une erreur 5xx loguée.
