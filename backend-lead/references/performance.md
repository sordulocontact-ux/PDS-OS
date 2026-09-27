# Performance — chargement des pages vu depuis le serveur

Sommaire : 1. Budget et mesure · 2. Les couches de cache · 3. Next.js 16 : Cache Components · 4. Cache HTTP / CDN · 5. Cache applicatif (Redis/Valkey, mémoire) · 6. La requête elle-même · 7. Payload et transport · 8. Rendu et streaming · 9. Anti-patterns.

Le front ne peut rien afficher avant le premier octet : **le TTFB est le plancher du LCP**. Une
page avec 800 ms de TTFB ne passera jamais Core Web Vitals, quel que soit le poids de l'image.
Et un écran qui attend 4 requêtes séquentielles au front se charge en 4 × latence. La perf
perçue est d'abord un sujet backend.

---

## 1. Budget et mesure

Cibles par défaut (p75 utilisateurs réels, pas lab) :

- **TTFB < 200 ms** sur les pages clés (< 800 ms = « bon » selon Google, mais vise 200 pour
  laisser de la marge au LCP < 2,5 s).
- **Endpoints de VM : p95 < 300 ms**, p99 < 800 ms. Mutations : p95 < 500 ms.
- **Requêtes SQL** : < 20 ms unitaire pour une liste, 0 N+1, < 10 requêtes par page.
- Payload JSON d'un écran : < 100 Ko (gzip/brotli) ; au-delà, pagine ou sépare.

Mesure avant d'optimiser :

- **`Server-Timing`** dans chaque réponse : `Server-Timing: auth;dur=3, db;dur=42, render;dur=18,
cache;desc=miss`. Visible dans les DevTools et par les RUM. Wrappe tes appels DAL dans un
  chrono qui alimente ce header.
- Logs avec `durationMs` par requête et par requête SQL (pino + instrumentation OTel de `pg`).
- `explain (analyze, buffers)` sur toute requête > 20 ms (→ `database.md` §3).
- RUM (Vercel Speed Insights, web-vitals + endpoint) pour TTFB/LCP/INP terrain ; Lighthouse pour
  le lab.
- Un test de charge (k6, autocannon) sur les 3 endpoints les plus chauds avant une mise en prod
  significative (→ `observability-testing.md`).

---

## 2. Les couches de cache (du plus proche de l'utilisateur au plus profond)

Chaque couche a une question : **qui peut voir cette donnée, et pendant combien de temps une
version périmée est acceptable ?** Une donnée personnalisée ne va jamais dans un cache partagé
sans clé utilisateur.

| Couche             | Outil                                                           | Quoi mettre                                                                                       | Invalidation                                               |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Navigateur         | `Cache-Control: max-age`, `immutable`                           | Assets hashés (1 an), petites réponses publiques                                                  | Par nom de fichier / URL                                   |
| CDN / edge         | `s-maxage`, `stale-while-revalidate`, `stale-if-error`          | Pages et API **publiques** ou anonymes                                                            | Purge par tag/URL, ou expiration courte                    |
| Framework          | Next 16 `use cache` + `cacheTag` / `cacheLife`                  | Résultats de fonctions/composants serveur, y compris personnalisés si la clé inclut l'utilisateur | `updateTag` (immédiat, read-your-writes) / `revalidateTag` |
| Applicatif partagé | Redis / Valkey                                                  | VM coûteux, agrégats, sessions, rate limit, verrous                                               | Suppression de clé sur mutation, TTL de sécurité           |
| Requête            | `React.cache()` (dédup par requête), memo en mémoire de process | Dédoublonner les appels dans un même rendu                                                        | Fin de la requête                                          |
| Base               | Index, vues matérialisées, `pg` buffers                         | Ce qui ne peut pas être caché plus haut                                                           | `refresh materialized view concurrently` en job            |

Principe : cache **au plus haut** possible (moins de travail), invalide **au plus fin** possible
(par entité), et donne **toujours un TTL** même avec invalidation par tag (filet de sécurité).

---

## 3. Next.js 16 — Cache Components

Next 16 a inversé la logique : **rien n'est caché par défaut** (plus de cache implicite de
`fetch`, plus de surprise de page statique qui affiche l'utilisateur précédent). Tu actives
`cacheComponents: true` et tu marques explicitement ce qui est cacheable.

```ts
// src/server/dal/projects.ts
import { cacheTag, cacheLife } from 'next/cache';

export async function getPublicProjectPage(slug: string) {
  'use cache';
  cacheTag(`project-${slug}`);
  cacheLife('hours');                 // profil : stale / revalidate / expire
  return db.query.projects.findFirst({ where: eq(projects.slug, slug), columns: {...} });
}

export async function getOrgDashboard(orgId: string, userId: string) {
  'use cache';                        // la clé inclut les ARGUMENTS : orgId + userId ⇒ scopé
  cacheTag(`org-${orgId}-dashboard`);
  cacheLife('minutes');
  return buildDashboardVM(orgId, userId);
}
```

Règles :

- **`'use cache'` au plus près de la donnée** (fonction DAL, composant serveur feuille), pas sur
  une page ou un layout entier. Les pages orchestrent ; les feuilles cachent.
- **`cookies()`, `headers()`, `searchParams` sont interdits dans une portée `use cache`** : passe
  ce dont tu as besoin en argument (l'`userId`), qui devient partie de la clé. Pour du contenu
  strictement par utilisateur, `'use cache: private'` (cache navigateur, jamais serveur).
- **Toujours une clé scopée** pour du personnalisé : un `use cache` sans `userId`/`orgId` en
  argument = fuite de données entre utilisateurs. C'est _le_ piège.
- **Tags** : un registre central (`src/server/cache-tags.ts`) avec des helpers
  (`tags.orgProjects(orgId)`), scopés à l'entité qui change, jamais un tag global `"projects"`.
- **Après mutation** : `updateTag(tag)` dans la Server Action pour un read-your-writes immédiat
  (l'utilisateur voit sa modification) ; `revalidateTag` pour une invalidation en arrière-plan.
- **PPR (Partial Prerendering)** : la coquille statique est pré-rendue, les trous dynamiques
  (`<Suspense>`) streamés. Mets `use cache` sur le cacheable, `Suspense` autour du personnalisé.
- **Self-host multi-instances** : le cache `use cache` est en mémoire par instance → `'use
cache: remote'` avec un `cacheHandler` Redis pour partager. Sur Vercel c'est géré.
- Migration : le codemod `unstable_cache` → `use cache` couvre le gros ; relis les fermetures
  sur des données de requête et les clés dérivées de headers.

---

## 4. Cache HTTP / CDN

Pour tout ce qui est **anonyme ou public** (pages marketing, catalogue, API publique, images
générées) :

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400
```

- `s-maxage` : fraîcheur au CDN (5 min ici) ; le navigateur suit `max-age` (mets-le court ou 0
  pour du HTML).
- `stale-while-revalidate` : sert la version périmée **instantanément** et régénère en fond —
  l'utilisateur ne voit jamais un cache miss.
- `stale-if-error` : si l'origine tombe, le CDN sert l'ancien contenu au lieu d'une 500.
- Assets buildés : `public, max-age=31536000, immutable` avec nom de fichier hashé.
- `Vary` correct (`Accept-Encoding`, `Accept-Language` si tu localises), jamais `Vary: Cookie` sur
  du public (ça annule le cache).
- Purge par tag (`Cache-Tag` / `Surrogate-Key` selon le CDN) sur publication.
- **`ETag` + `If-None-Match`** → `304` sur les API lues souvent par le même client.
- **Personnalisé** : `Cache-Control: private, no-store` et un `Vary: Cookie` si jamais tu
  caches quand même. Vérifie qu'aucun proxy ne cache une réponse authentifiée (`Set-Cookie` +
  `public` = incident).
- **103 Early Hints** (RFC 8297) : sur une page dynamique dont le HTML met 200–500 ms, envoie
  `Link: </fonts/x.woff2>; rel=preload` avant la réponse finale — le navigateur charge CSS/
  polices pendant que le serveur réfléchit. Gain réel sur LCP, quasi nul sur du statique.
- Compression : brotli (≈15–20 % mieux que gzip) ou zstd si supporté ; HTTP/2 ou 3 au CDN.

---

## 5. Cache applicatif — Redis / Valkey

Quand tu n'es pas en Next 16, ou pour ce que `use cache` ne couvre pas (sessions, rate limit,
verrous, compteurs, pub/sub) :

- Clés nommées et **scopées** : `org:{orgId}:dashboard:v2`, `user:{userId}:session`. Le
  suffixe de version permet d'invalider en changeant le format.
- **TTL toujours** (défaut 5 min, max 1 h pour du métier). Cache-aside : lis → miss → calcule →
  écris avec TTL. Invalidation explicite (`del`) sur mutation en plus du TTL.
- **Stampede** : sur une clé chaude, un seul calcul à la fois (verrou `SET key NX PX 5000`) ou
  `stale-while-revalidate` applicatif (renvoie l'ancien, régénère en fond).
- Sérialise en JSON compact ; pas d'objet > 500 Ko en cache (pagine).
- Ne cache pas ce qui est déjà rapide (< 5 ms indexé) — le round-trip Redis coûte 1 ms.
- Valkey est le fork open-source de Redis 7 (licence BSD) ; API identique (`ioredis`,
  `redis-py`). Managed : Upstash (HTTP, serverless-friendly), ElastiCache, Railway.
- Ne fais **jamais** de Redis la source de vérité d'une donnée métier.

Sans Redis : `React.cache()` pour dédupliquer dans une requête, un LRU en mémoire
(`lru-cache`) avec TTL court si mono-instance et que tu l'assumes, ou Postgres lui-même (table
`cache` `unlogged` avec `expires_at`).

---

## 6. La requête elle-même

(Détail dans `database.md` §2–3.) Les gains les plus fréquents, dans l'ordre :

1. **N+1 supprimé** (une liste = 1–2 requêtes, pas 50).
2. **Index manquant** sur la colonne filtrée/triée (`explain` montre un `Seq Scan`).
3. **`select` explicite** : ne charge pas 40 colonnes et un `jsonb` de 200 Ko pour afficher un titre.
4. **Requêtes parallèles** : `Promise.all` sur des lectures indépendantes (dashboard = 4 blocs
   en parallèle, pas en série).
5. **`COUNT(*)` évité** ou estimé ; pagination par curseur.
6. **Pooling en mode transaction** (évite 30–80 ms de handshake TLS par requête en serverless).
7. **Base proche du serveur** : une base à 100 ms de RTT tue tout ; colocalise (même région)
   ou utilise un read replica proche.
8. Vue matérialisée rafraîchie par job pour les agrégats lourds (stats, classements).

---

## 7. Payload et transport

- Le VM ne contient que ce que l'écran affiche. Pas de `description` de 5 Ko dans une liste de
  cartes qui montre 120 caractères — tronque serveur (`excerpt`).
- Images : URLs vers un CDN d'images (Cloudinary, imgix, Supabase transforms, `next/image`)
  avec taille demandée, jamais des base64 dans le JSON.
- JSON : `camelCase` court, pas de champs `null` inutiles répétés ×100 (omet ou groupe).
- Compression activée sur les réponses API (brotli/gzip, seuil 1 Ko).
- Une réponse > 1 Mo est un signal : pagine, filtre, ou passe en export asynchrone.
- Server Components Next : le RSC payload transporte les props — passe des VM compacts, pas des
  entités.

---

## 8. Rendu et streaming

- **Streaming** : `<Suspense>` autour de chaque bloc lent avec un skeleton ; la coquille et le
  contenu rapide partent tout de suite, le lent arrive après. L'utilisateur voit la page à
  TTFB + quelques ms. Un seul `await` bloquant dans la page = tout attend le plus lent.
- **Lectures parallèles** dans un Server Component : lance les promesses d'abord, `await`
  ensuite (ou `Promise.all`), pas un `await` par ligne.
- **Préchargement** : `preload()` (React) pour déclencher une lecture DAL avant que le composant
  qui l'utilise soit rendu.
- **Mutations optimistes** côté client (`useOptimistic`) avec la réponse serveur qui confirme :
  la perf perçue d'une mutation est instantanée.
- **Statique quand c'est possible** : une page publique qui change 3 fois par jour est
  pré-rendue et revalidée par tag, pas rendue à chaque visite.

---

## 9. Anti-patterns

- Cacher une réponse personnalisée sans clé utilisateur (fuite) — ou ne rien cacher « par
  sécurité » et payer 300 ms par visite.
- `revalidatePath('/')` ou un tag global qui invalide tout à chaque écriture.
- `await` en cascade dans un composant serveur (waterfall) ; `useEffect` + `fetch` côté client
  pour des données qui pouvaient être rendues serveur.
- Optimiser sans mesurer (index « au cas où », Redis devant une requête de 2 ms).
- Un `COUNT(*)` par page de liste ; `OFFSET 50000`.
- Ajouter un CDN devant une origine qui met 900 ms : le cache miss reste à 900 ms. Corrige
  l'origine d'abord (requête, N+1, région), le CDN ensuite.
