# Sécurité — OWASP Top 10:2025 appliqué, auth, Next.js, supply chain

Sommaire : 1. OWASP Top 10:2025 → actions · 2. Authentification · 3. Autorisation et Next.js
(DAL, CVE-2025-29927) · 4. Validation et injection · 5. Secrets et configuration · 6. Headers,
CORS, cookies · 7. Uploads · 8. Webhooks entrants · 9. Supply chain npm/PyPI 2026 · 10. Logs
et alerting · 11. Checklist pré-prod.

La sécurité n'est pas une passe finale : chaque endpoint naît avec sa validation, son check
d'autorisation et son format d'erreur. Le coût d'un oubli se mesure en données clients exposées.

---

## 1. OWASP Top 10:2025 → ce que tu fais concrètement

Première révision majeure depuis 2021 (données de 175 000+ CVE, 589 CWE). Deux nouvelles
catégories, SSRF fusionnée dans A01, misconfiguration remontée en #2.

| #   | Catégorie 2025                                                                       | Ce que ça veut dire pour ton code                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | **Broken Access Control** (inclut BOLA/IDOR, BFLA et désormais SSRF)                 | Vérifie le droit sur _chaque_ objet (`where id = $1 and org_id = $2`), sur _chaque_ fonction (un membre n'appelle pas `deleteOrg`). Toute URL fournie par l'utilisateur et fetchée par le serveur (import d'image, webhook de test) → liste blanche de domaines, résolution DNS contrôlée, blocage des IP privées/metadata (169.254.169.254). |
| A02 | **Security Misconfiguration** (#5 → #2 ; 100 % des apps testées en ont)              | Pas de valeurs par défaut en prod : debug off, stack traces off, CORS explicite, buckets privés par défaut, headers de sécurité, RLS activée, comptes/clés de démo supprimés, ports/dashboards internes non exposés. Audit automatisé à chaque déploiement (`scripts/audit_backend.py` + scanner).                                            |
| A03 | **Software Supply Chain Failures** (nouveau ; impact/exploitabilité les plus élevés) | §9 : lockfile, `min-release-age`, `ignore-scripts`, provenance, SHA-pin des actions CI, audit des dépendances.                                                                                                                                                                                                                                |
| A04 | Cryptographic Failures                                                               | Argon2id (ou bcrypt coût ≥ 12) pour les mots de passe, TLS 1.3, secrets de 256 bits générés aléatoirement, `crypto.timingSafeEqual` pour comparer des secrets, pas de crypto maison, pas de MD5/SHA-1 pour la sécurité. Données sensibles chiffrées côté colonne si nécessaire (`pgcrypto`, clé hors base).                                   |
| A05 | Injection                                                                            | Requêtes paramétrées partout (SQL, `jsonb`, LDAP, shell — pas de `exec` avec entrée utilisateur), liste blanche pour `order by`/noms de colonnes, échappement contextuel en sortie (le templating React le fait, `dangerouslySetInnerHTML` non).                                                                                              |
| A06 | Insecure Design                                                                      | Modélise les menaces avant de coder un flux sensible (paiement, invitation, reset de mot de passe, export). Limites métier (max 50 invitations/jour), machine à états côté serveur.                                                                                                                                                           |
| A07 | **Authentication Failures** (renommé)                                                | §2 : sessions révocables, rotation, MFA/passkeys, rate limit login, pas d'énumération de comptes, reset par lien à usage unique et expiration courte.                                                                                                                                                                                         |
| A08 | Software or Data Integrity Failures                                                  | Vérifie les signatures des webhooks (HMAC), des packages (provenance), pas de désérialisation d'objets non fiables, CI qui ne fait confiance à rien venant d'une PR externe.                                                                                                                                                                  |
| A09 | **Security Logging and Alerting Failures** (renommé : l'alerte compte)               | Logs des événements de sécurité (login échoué/réussi, changement de mot de passe, élévation de rôle, export, accès refusé) avec `userId`, `ip`, `requestId` ; **alertes** sur les rafales (10 login échoués/min, 403 en série).                                                                                                               |
| A10 | **Mishandling of Exceptional Conditions** (nouveau)                                  | Pas de _fail open_ : une erreur dans le check d'auth ⇒ refus. Pas d'exception non gérée qui expose une stack. Race conditions gérées par contraintes/verrous (`unique`, `for update`, idempotency). Timeouts et circuit breakers sur les appels tiers. Gestion explicite de chaque cas attendu (404/409/422).                                 |

---

## 2. Authentification

**Choix par défaut (2026)** : **sessions côté serveur** pour une app web (cookie `httpOnly`
contenant un ID de session opaque, session en base/Redis avec expiration, rotation à la
connexion, révocation instantanée, liste des appareils). Les « JWT sont plus scalables » ne
s'applique qu'à des architectures multi-services ; pour ton front, une lecture de session
indexée coûte < 1 ms.

- **Better Auth** (TypeScript, agnostique) : sessions en base avec rotation, plugins `passkey`,
  `twoFactor`, `organization`, `magicLink`, `apiKey`, `rateLimit`, typés bout-en-bout ; tu
  gardes ta table `users`. Ou **Supabase Auth** si tu es déjà sur Supabase (RLS via `auth.uid()`).
  Auth.js/NextAuth reste correct pour du social login simple. Clerk/WorkOS si tu veux du managé.
- **JWT** uniquement pour : API consommée par un mobile/un tiers, ou communication
  service-à-service. Alors : access token **5–15 min**, refresh token **rotatif** à usage unique
  (détection de réutilisation ⇒ révoque la famille), `RS256`/`EdDSA` (clé publique vérifiable
  partout, jamais `HS256` partagé entre services), claims `iss`, `aud`, `exp`, `sub` vérifiés,
  `token_version` sur l'utilisateur pour un « déconnecter partout ». Stocke le token dans un
  cookie `httpOnly`, pas en `localStorage`.
- **Mots de passe** : Argon2id (ou bcrypt ≥ 12), longueur min 12, vérification contre les
  fuites connues (k-anonymity HIBP) au moins à l'inscription, pas de règles de complexité
  absurdes. Comparaison en temps constant.
- **Passkeys (WebAuthn/FIDO2)** : propose-les comme méthode principale ou seconde ; résistants
  au phishing, plus de mot de passe à fuiter. Garde un fallback (email OTP/magic link).
- **MFA** : TOTP + codes de secours ; obligatoire pour les rôles admin.
- **Login** : même message et même temps de réponse que le compte existe ou non ; rate limit
  par compte et par IP ; verrouillage progressif ; log de chaque tentative.
- **Reset / invitation** : token aléatoire ≥ 128 bits, hashé en base, usage unique, expiration
  15–60 min, invalidation des sessions existantes après changement de mot de passe.
- **Cookies** : `HttpOnly; Secure; SameSite=Lax` (Strict si pas de navigation cross-site),
  préfixe `__Host-` quand possible, `Path=/`, durée alignée sur la session.
- **CSRF** : Server Actions Next comparent `Origin`/`Host` ; pour tes Route Handlers à cookies :
  vérifie `Origin` (ou token CSRF) sur toute mutation. `SameSite` est une couche en plus, pas un
  remplacement.

---

## 3. Autorisation — au plus près de la donnée

### La leçon CVE-2025-29927 (Next.js, mars 2025, CVSS 9.1)

Un header interne (`x-middleware-subrequest`) permettait de **sauter entièrement le middleware**.
Toute app dont l'auth vivait _uniquement_ dans `middleware.ts` était ouverte. Corrigé (15.2.3,
14.2.25, 13.5.9, 12.3.5), mais la leçon architecturale reste : **`proxy.ts`/middleware = porte
d'entrée pratique (redirection vers /login), jamais l'unique serrure.** Chaque pièce a la
sienne.

### Le pattern : Data Access Layer (DAL)

```ts
// src/server/auth/context.ts
import "server-only";
import { cache } from "react";

export const getAuthContext = cache(async (): Promise<AuthedCtx> => {
  const session = await auth.api.getSession({ headers: await headers() }); // Better Auth
  if (!session) throw new Unauthorized();
  return {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!,
    role: session.role,
  };
});

// src/server/dal/projects.ts — l'UNIQUE endroit qui touche la table
export async function getProjectForEdit(ctx: AuthedCtx, id: string) {
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.orgId, ctx.orgId)), // filtre par tenant, toujours
    columns: { id: true, title: true, budgetCents: true, status: true },
  });
  if (!row) throw new NotFound("project"); // pas 403 : ne révèle pas l'existence
  return { ...row, can: computeProjectPermissions(ctx, row) };
}

// src/server/actions/projects.ts
("use server");
export async function archiveProject(input: unknown) {
  const { id } = ArchiveProjectInput.parse(input); // 1. valider
  const ctx = await getAuthContext(); // 2. qui ?
  const project = await getProjectForEdit(ctx, id); // 3. droit sur l'objet (tenant)
  if (!project.can.archive) throw new Forbidden(); // 4. droit sur l'action (rôle)
  await archiveProjectTx(ctx, id); // 5. mutation + audit
  updateTag(`org-${ctx.orgId}-projects`); // 6. cache
  return { ok: true, data: await getProjectCardVM(ctx, id) };
}
```

- **Chaque** Server Action, Route Handler, Server Component qui lit des données d'utilisateur
  passe par `getAuthContext()` puis la DAL. Pas d'accès ORM direct dans un composant.
- Les Server Actions sont des **endpoints POST publics** même si aucun bouton ne les appelle :
  n'exporte que des actions qui vérifient l'auth et valident. Ne mets pas de logique de
  permission dans un `if (user.isAdmin)` côté client — c'est cosmétique.
- Les données passées de serveur à client (props des composants) sont **sérialisées dans le
  HTML** : ne passe jamais un objet entier (`user` avec `passwordHash`, `stripeCustomerId`),
  passe le VM. Utilise `experimental_taintObjectReference` / `taintUniqueValue` de React pour
  interdire le passage d'objets sensibles au client.
- **RLS comme deuxième filet** (→ `database.md` §4) : même si un chemin oublie le filtre, la
  base refuse.
- **Rôles** : un enum simple (`owner | admin | member | viewer`) + une fonction pure
  `can(ctx, action, resource)` testée unitairement, plutôt qu'un système RBAC générique
  improvisé. Passe à des permissions fines (CASL, Permit, policies) seulement quand le produit
  l'exige.
- **Tenants** : `org_id` en base sur chaque ligne, dans le contexte auth, dans chaque `where`,
  dans chaque clé de cache.

---

## 4. Validation et injection

- Un schéma par entrée (`zod` / `valibot` / Pydantic v2), `.strict()` pour refuser les champs
  inconnus (mass assignment), bornes explicites (`.max(200)` sur les strings, `.int().min(1).max(100)` sur les limites, taille max de tableau).
- Valide **le type et le domaine**, pas seulement la forme : un `orgId` reçu du client n'est
  jamais utilisé tel quel — il est comparé au contexte auth.
- Normalise avant de valider : `trim`, `toLowerCase` sur l'email, NFC sur les chaînes.
- Corps JSON : limite de taille (1 Mo par défaut, moins pour les routes publiques). Uploads :
  §7.
- SQL : paramètres liés (`$1`), jamais de template string ; en Drizzle `sql\`…\``paramètre
automatiquement mais`sql.raw()` non. Colonnes/ordres dynamiques via un map de valeurs
  autorisées.
- Commandes système : évite ; sinon `execFile` avec tableau d'arguments, jamais `exec` avec
  chaîne.
- Sortie : React échappe ; Markdown/HTML utilisateur → sanitize (`rehype-sanitize`, DOMPurify
  côté serveur avec jsdom) + CSP.
- Redirections : `returnTo` doit commencer par `/` et pas `//`, sinon `/`.

---

## 5. Secrets et configuration

- Secrets **uniquement** en variables d'environnement serveur ou un gestionnaire (Vault, AWS
  Secrets Manager, Doppler, Infisical, secrets Vercel/Fly). Jamais commités, jamais préfixés
  `NEXT_PUBLIC_` / `VITE_` / `EXPO_PUBLIC_`. `.env` dans `.gitignore`, `.env.example` sans valeurs.
- Valide l'environnement au démarrage avec un schéma (`@t3-oss/env-nextjs`, Zod, Pydantic
  Settings) : l'app refuse de démarrer si `DATABASE_URL` manque, plutôt que de planter à la
  première requête.
- `service_role` / clés `secret` Supabase, clés Stripe `sk_`, tokens d'API : serveur seulement,
  rotation planifiée, une clé par environnement, révocation immédiate en cas de doute.
- Différencie **staging** et **prod** (bases, clés, buckets). Pas de données de prod en dev.
- Scan de secrets en pre-commit (`gitleaks`, `trufflehog`) et en CI.
- Logs : jamais de token, mot de passe, cookie, corps de requête d'auth. Redaction pino
  (`redact: ['req.headers.authorization', 'req.headers.cookie', '*.password']`).

---

## 6. Headers, CORS, cookies

Headers à poser (Next : `headers()` dans `next.config.ts` ; Hono : `secureHeaders()` ; Fastify :
`@fastify/helmet`) :

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-…'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY   (redondant avec frame-ancestors, garde pour les vieux navigateurs)
```

- CSP avec nonce par requête en Next (générée dans `proxy.ts`) ; commence en `Report-Only`,
  corrige, puis applique.
- **CORS** : liste explicite d'origines (jamais `*` avec credentials), méthodes/headers minimaux,
  `Vary: Origin`. Une API consommée uniquement par ton front same-origin n'a pas besoin de CORS.
- Réponses d'API : `Cache-Control: no-store` par défaut sur tout ce qui est personnalisé (→
  `performance.md` pour ce qui peut être caché).

---

## 7. Uploads

- Ne fais pas transiter les fichiers par ton serveur : **URL pré-signée** (S3/R2/Supabase
  Storage) générée côté serveur après vérification des droits, avec taille max, type MIME
  attendu et expiration courte.
- Valide le type par le **contenu** (magic bytes, `file-type`), pas par l'extension ni le
  `Content-Type` déclaré. Renomme en UUID, stocke le nom d'origine en base.
- Images : re-encode (sharp) pour supprimer métadonnées et payloads ; génère les variantes en job.
- Sert depuis un domaine/bucket séparé (pas de HTML exécutable sous ton origine), `Content-Disposition: attachment` pour tout ce qui n'est pas une image.
- Antivirus (ClamAV) en job si les fichiers sont partagés entre utilisateurs.
- Quotas par utilisateur/org ; nettoyage des orphelins.

---

## 8. Webhooks entrants (Stripe, Instagram, etc.)

- Vérifie la **signature HMAC** avec le corps brut (avant tout parsing) et un secret par
  fournisseur ; rejette si l'horodatage est vieux de > 5 min (replay).
- Réponds `200` vite, traite en job : le fournisseur réessaie sinon.
- **Idempotence** : stocke `event_id` (unique) ; un événement déjà vu est ignoré.
- Ne fais jamais confiance au contenu pour l'autorisation : recharge la ressource depuis le
  fournisseur ou ta base.
- Endpoint dédié, hors auth cookie, hors CSRF, avec rate limit.

---

## 9. Supply chain npm / PyPI — état 2026

L'année a été marquée par des vers auto-propagés : axios détourné (mars 2026, RAT en 2 s après
`npm install`), « Mini Shai-Hulud » (mai 2026 : TanStack, SDK OpenAI/Mistral, Grafana…),
ChainDrop (août 2026 : `keyv`/`cacheable`, 444 paquets, C2 sur Ethereum), campagnes PyPI
équivalentes. Le vecteur est presque toujours **un script d'installation** exécuté à
l'installation, dans les minutes suivant la publication. Les défenses sont côté consommateur :

1. **Lockfile commité + installation gelée** : `npm ci`, `pnpm install --frozen-lockfile`,
   `yarn --immutable`, `uv sync --locked`. Pas de `^`/`latest` résolu en CI.
2. **Quarantaine des versions fraîches** : `min-release-age=7` (npm ≥ 11.10), `minimumReleaseAge:
10080` (pnpm ≥ 10.16 ; v11 met 1 jour par défaut — monte à 7), `npmMinimalAgeGate` (Yarn 4.10+),
   `minimumReleaseAge` (Bun 1.3+), cooldown Dependabot/Renovate. Presque toutes les versions
   malveillantes ont été retirées en < 7 jours.
3. **Scripts d'installation bloqués** : `ignore-scripts=true` + liste blanche des paquets qui
   en ont réellement besoin (`sharp`, `esbuild`, `prisma`…) ; pnpm v11 `strictDepBuilds` par
   défaut.
4. **Sources exotiques bloquées** : `allow-git=false`, `allow-file=none`, `allow-remote=none`
   (npm ≥ 11.15).
5. **CI** : actions GitHub épinglées par **SHA** (pas par tag), secrets inaccessibles aux PR de
   forks, `dependency-review-action` sur les PR, `npm audit signatures` / provenance vérifiée.
6. **Publication** (si tu maintiens des paquets) : Trusted Publisher OIDC (plus de token
   longue durée), 2FA, staged publishing.
7. **Scan continu** : `pnpm audit` / `npm audit`, Socket.dev ou OSV-Scanner, `pip-audit`.
8. **Hygiène** : peu de dépendances, préfère la stdlib (Node 24 a `fetch`, `URLPattern`, test
   runner, `crypto.randomUUID`, `Temporal` en 26), supprime ce qui n'est pas utilisé.

Fichier de référence : `assets/npmrc-hardened`. Applique-le à chaque nouveau projet.

---

## 10. Logs et alerting de sécurité

Événements à loguer (niveau `info`/`warn`, jamais `debug`) : login réussi/échoué (+ méthode),
logout, MFA, reset de mot de passe, changement d'email, élévation/changement de rôle, accès
refusé (403), 429, export de données, suppression massive, appel avec clé API. Champs : `event`,
`userId`, `orgId`, `ip`, `userAgent`, `requestId`, `outcome`. Alertes sur : pics de 401/403,
tentatives de login en rafale, 5xx en série, appels à des routes admin depuis une IP inconnue.

---

## 11. Checklist pré-prod

- [ ] RLS activée + policies testées sur toute table exposée ; aucune table `public` sans RLS
- [ ] Aucune clé secrète côté client (`scripts/audit_backend.py` passe) ; env validé au démarrage
- [ ] Auth vérifiée dans la DAL/actions/handlers, pas seulement dans `proxy.ts`
- [ ] Validation Zod/Pydantic `.strict()` sur chaque entrée, limites de taille
- [ ] Erreurs RFC 9457 sans stack ; `fail closed` partout
- [ ] Cookies `HttpOnly/Secure/SameSite`, CSRF géré sur les mutations à cookie
- [ ] Headers de sécurité + CSP ; CORS explicite
- [ ] Rate limiting sur login/reset/envois/exports
- [ ] Webhooks signés + idempotents
- [ ] Lockfile gelé, `min-release-age`, `ignore-scripts`, actions CI SHA-pinnées, audit deps vert
- [ ] Logs de sécurité + alertes ; backups testés
- [ ] Dépendances critiques à jour (Next ≥ 15.2.3 / 16.x, Node 24 LTS, drivers Postgres)
