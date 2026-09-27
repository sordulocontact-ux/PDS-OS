# Asynchrone — jobs, files d'attente, outbox, webhooks, cron

Sommaire : 1. Quand sortir de la requête · 2. Choisir l'outil · 3. Livraison at-least-once ⇒
idempotence · 4. Outbox transactionnel · 5. Retries, backoff, DLQ · 6. Contrat d'un job · 7. Suivi côté écran (202 + statut) · 8. Webhooks sortants · 9. Cron et planification · 10. Workers : arrêt propre, concurrence, timeouts.

---

## 1. Quand sortir de la requête

Tout ce qui est **> ~200 ms, dépend d'un tiers, ou peut échouer sans que l'utilisateur doive
attendre** : email, SMS, PDF, redimensionnement d'image, appel à une API externe (Stripe,
Instagram Graph, OpenAI), import/export CSV, envoi de webhook, recalcul d'agrégats, nettoyage.
Le handler valide, écrit l'intention en base, met en file, répond `202 Accepted` (ou `200` avec
`status: "processing"`), et l'écran affiche l'état en attendant.

Bénéfices concrets : TTFB stable, une panne du tiers ne casse pas l'UX, retries automatiques,
visibilité sur ce qui a échoué.

---

## 2. Choisir l'outil (2026)

| Outil                            | Infra                           | Force                                                                                                                                 | Choisis si…                                                                         |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **pg-boss** / graphile-worker    | Postgres (aucune infra en plus) | Enqueue **dans la transaction métier** (pas de dual-write), `skip locked`, cron intégré                                               | Défaut pour une app Postgres à volume raisonnable (< quelques milliers de jobs/min) |
| **BullMQ 5**                     | Redis/Valkey                    | Débit, priorités, rate limit, flows (DAG), dashboard Bull Board, OTel intégré (5.71+)                                                 | Volume élevé, besoins avancés, Redis déjà présent                                   |
| **Inngest** / **Trigger.dev v3** | Serverless (cloud ou self-host) | Exécution _durable_ par étapes (`step.run` rejoué sans refaire les étapes finies), replays, attentes longues (`sleep` de jours), cron | Workflows multi-étapes, agents IA, équipe qui ne veut pas opérer de workers         |
| Upstash QStash / Vercel Queues   | HTTP                            | Livraison HTTP simple avec retries                                                                                                    | Serverless pur, fan-out de webhooks                                                 |
| Temporal / Hatchet               | Lourd                           | Orchestration d'entreprise, garanties fortes                                                                                          | Processus métier longs et critiques                                                 |

Avec Supabase : pg-boss/graphile-worker sur la base (connexion directe, pas via le pooler), ou
Edge Functions + `pg_cron`/`pg_net` pour du léger, ou Inngest/Trigger.dev.

---

## 3. Livraison at-least-once ⇒ consommateurs idempotents

Tout système de file livre **au moins une fois** : un worker peut crasher après avoir envoyé
l'email mais avant d'acquitter ; le job sera rejoué. Donc **chaque job doit pouvoir s'exécuter
deux fois sans effet double** :

- **Clé d'idempotence par job** (`jobId` déterministe : `send-invoice-{invoiceId}-v1`, ou
  `eventId` du webhook) stockée dans une table `processed_jobs(key unique, processed_at)` ;
  `insert … on conflict do nothing` au début ⇒ 0 ligne insérée = déjà fait, on sort.
- **Garde d'état en base** : `update invoices set sent_at = now() where id = $1 and sent_at is
null returning id` ⇒ 0 ligne = déjà envoyé.
- **Effets externes** : passe l'`Idempotency-Key` au tiers (Stripe, Resend, etc. la supportent).
- **Ordre non garanti** : n'écris jamais un job qui suppose que le précédent est passé ; relis
  l'état courant en base.
- **Payload minimal** : des IDs, pas des objets — le worker recharge la version fraîche.

---

## 4. Outbox transactionnel (le pattern anti « dual write »)

Problème : « écrire en base **puis** publier dans la file » n'est pas atomique. Crash entre les
deux ⇒ commande créée mais jamais traitée (ou l'inverse).

Solution : écrire l'événement **dans la même transaction** que la donnée :

```sql
begin;
insert into orders (...) values (...);
insert into private.outbox (id, topic, payload, created_at)
  values (uuidv7(), 'order.created', jsonb_build_object('orderId', $1), now());
commit;
```

Un **relais** (worker ou pg-boss lui-même) lit l'outbox (`select … for update skip locked`),
publie/traite, marque `processed_at`. Avec pg-boss/graphile-worker, l'enqueue _est_ déjà
transactionnel : `await boss.send(..., { db: tx })` dans la même transaction — c'est la raison
n°1 de les préférer quand la base est Postgres. Avec BullMQ, garde une outbox + relais.

Le même pattern sert aux **webhooks sortants** et aux **événements de domaine** (audit,
notifications, projections).

---

## 5. Retries, backoff, DLQ

- **Backoff exponentiel avec jitter** : 1 s, 4 s, 16 s, 1 min, 5 min… ± aléatoire, pour ne pas
  synchroniser les retries et amplifier une panne (3 retries × 3 couches = ×243 de charge).
- **Nombre borné** (5–8), puis **dead-letter queue** : le job échoué est conservé avec sa
  dernière erreur, visible dans un écran admin, rejouable à la main. Une DLQ qui grossit est une
  alerte.
- **Distingue les erreurs** : `retryable` (timeout, 429, 5xx tiers, deadlock) vs `fatal`
  (validation, 4xx tiers, ressource supprimée) — un fatal va directement en DLQ sans 8 tentatives.
- **Timeout par job** (30 s par défaut, plus pour un export) ; un job qui dépasse est tué et
  rejoué, pas laissé zombie.
- **Circuit breaker** sur un tiers qui échoue en rafale : ouvre le circuit 30–60 s, les jobs
  attendent au lieu de brûler les retries.
- Respecte `Retry-After` du tiers sur 429/503.

---

## 6. Contrat d'un job

```ts
// jobs/send-invoice-email.ts
export const SendInvoiceEmail = defineJob({
  name: 'send-invoice-email',
  schema: z.object({ invoiceId: z.string().uuid(), orgId: z.string().uuid() }),
  key: (p) => `send-invoice-email:${p.invoiceId}`,        // idempotence / dédoublonnage
  retry: { attempts: 6, backoff: 'exponential', base: 2000, jitter: true },
  timeoutMs: 30_000,
  async run(p, ctx) {
    const inv = await dal.invoices.getForEmail(ctx.system(p.orgId), p.invoiceId);
    if (!inv || inv.sentAt) return;                           // garde d'état
    await mailer.send({ ..., idempotencyKey: `inv-${inv.id}` });
    await dal.invoices.markSent(p.invoiceId);
    ctx.log.info({ invoiceId: p.invoiceId }, 'invoice email sent');
  },
});
```

- **Schéma du payload** validé au dequeue (le producteur peut être une vieille version).
- **Contexte système** avec `orgId` : un job n'a pas de session utilisateur mais reste scopé
  au tenant ; ne bypass pas les contrôles métier avec un accès « root ».
- **Nom versionné** si le payload change de forme (`send-invoice-email-v2`) et l'ancien
  handler reste jusqu'à drain de la file.
- Logs avec `jobId`, `attempt`, `durationMs`, `traceId` propagé depuis la requête d'origine.

---

## 7. Suivi côté écran

L'écran doit pouvoir afficher « en cours / terminé / échoué » sans deviner :

- Table `tasks` (ou état sur l'entité : `export_status`, `export_url`, `export_error`) mise à
  jour par le worker ; VM qui l'expose (`{ status: 'processing' | 'done' | 'failed', progress?: 0–100, resultUrl?, errorMessage? }`).
- `202` + `Location: /tasks/{id}` ; le front **polle** (2–5 s, backoff) ou reçoit un push
  (Supabase Realtime, SSE) — polling d'abord, c'est plus simple et suffisant pour la plupart.
- Prévois l'état « échoué avec action » (« réessayer », « contacter le support ») : l'UX
  (`ux-design-lead`) l'a conçu, ton contrat doit le porter.

---

## 8. Webhooks sortants (tu notifies un tiers ou un client)

- Événements écrits en outbox, envoyés par worker, **signés HMAC-SHA256** (`X-Signature: t=…,
v1=…`) avec un secret par destinataire, horodatage inclus.
- Retries avec backoff sur non-2xx pendant 24–72 h, puis désactivation de l'endpoint +
  notification.
- Payload versionné (`{ "version": "2026-09-01", "type": "invoice.paid", "data": {...} }`) et
  **léger** (IDs + champs clés) ; le destinataire re-fetch s'il veut tout.
- Journal des livraisons consultable (statut, code réponse, tentatives) — c'est ce que le
  client demande en premier quand « le webhook ne marche pas ».

---

## 9. Cron et planification

- Planification **dans le système de jobs** (pg-boss `schedule`, BullMQ `upsertJobScheduler`,
  Inngest `cron`), pas un `setInterval` dans le serveur web (multi-instances = exécutions
  multiples ; redémarrage = perte).
- Chaque exécution planifiée est un job idempotent avec une clé par fenêtre
  (`daily-report:2026-09-27`) ; un rattrapage ne double pas.
- Jobs de ménage à prévoir dès le départ : purge des `idempotency_keys` et sessions expirées,
  fichiers orphelins, outbox traitée > 7 jours, `refresh materialized view concurrently`.
- Sur Supabase, `pg_cron` peut porter le SQL pur ; pour du code, un worker ou Inngest.

---

## 10. Workers

- **Processus séparé** du serveur web (`worker.ts`, container distinct) : la charge des jobs
  ne dégrade pas le TTFB, et tu scales indépendamment.
- **Arrêt propre** : sur `SIGTERM`, arrête de prendre des jobs, termine ceux en cours (délai
  30 s), ferme les connexions. Sinon un déploiement = jobs coupés en plein milieu.
- **Concurrence** bornée par worker (ex. 5) et par type (1 seul export lourd à la fois),
  rate limit vers les tiers (BullMQ `limiter`, ou token bucket maison).
- **Connexions** : un pool dédié, petit, **hors pooler transaction** si tu utilises
  `listen/notify` ou des advisory locks de session.
- **Observabilité** : métriques `jobs_processed_total{name,status}`, `job_duration_seconds`,
  taille des files, âge du plus vieux job en attente (le meilleur signal de saturation),
  taille de la DLQ. Alerte si l'âge > 5 min ou DLQ > 0 pendant 10 min.
