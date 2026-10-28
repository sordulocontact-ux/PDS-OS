# Pré-prod

Une copie de PDS OS où l'équipe (Ibé d'abord) teste **tout ce qui n'est pas encore en production**,
et s'y déplace comme dans un proto : une barre en bas de l'écran pour **changer de personne** (« Voir
comme ») et **sauter à un moment du parcours** (« Aller à »). Décision du 26/10/2026.

---

## 1. Ce qui tourne où

| | Production | Pré-prod |
| --- | --- | --- |
| Branche | `main` | `pre-prod` |
| Vercel | déploiement Production | déploiement Preview de la branche `pre-prod`, adresse fixe `…-git-pre-prod-….vercel.app` |
| Base | projet Supabase de prod | projet Supabase **dédié** « PDS OS pré-prod », jamais la base de prod |
| Comptes | les vrais | quatre comptes de test, un seul mot de passe (`lib/preprod/accounts.ts`) |
| Barre « Voir comme / Aller à » | jamais | oui (`PREPROD_TOOLS=1`) |
| Données de test de PO (« remplis la page ») | jamais | oui |

**Deux branches seulement** (décision du 26/10/2026, toutes les autres supprimées) : on travaille sur
`pre-prod`, testée sur sa base ; quand c'est validé, `pre-prod` est fusionnée dans `main`, qui part en
production (et ses migrations sont poussées sur la base de prod, avec accord). Au 26/10, `pre-prod` a
d'avance sur `main` : la recette Juridique V1, les lots 3 à 7 des retours, l'outillage de la pré-prod et
`visible_project_ids()`.

Pousser avec l'adresse `sordulo.contact@gmail.com` en auteur du dernier commit : Vercel bloque sinon le
déploiement.

Le cron de `vercel.json` ne tourne que sur la Production : la pré-prod ne détecte pas de sorties.

## 2. Mise en place (une fois)

1. **Supabase** : créer le projet « PDS OS pré-prod » dans l'organisation payante de la prod, même
   région. Noter l'URL de la base (Settings › Database › Connection string, mode *session*), l'URL du
   projet et la clé `anon`. Authentication › URL Configuration : *Site URL* = l'adresse de la pré-prod.
2. **Jeu de données** : dans `.env.preprod.local` (ignoré par git) :

   ```
   PREPROD_DB_URL=postgresql://…
   PREPROD_PASSWORD=<le mot de passe commun des comptes de test : 4 caractères au moins, sans apostrophe>
   ```

   puis `pnpm preprod:reset` (§ 4). Les migrations sont toutes rejouées : pas de `db push` à part.
3. **Vercel** › Settings › Environment Variables, chacune en **Preview** limitée à la branche
   `pre-prod` (« Select a custom Preview branch ») :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` : ceux du projet pré-prod ;
   - `NEXT_PUBLIC_SITE_URL` : l'adresse de la pré-prod ;
   - `PREPROD_TOOLS=1`, `PREPROD_PASSWORD` : le même mot de passe qu'au point 2 ;
   - le fournisseur du modèle et sa clé (`LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`…) : le
     schéma de `lib/env.ts` les exige ;
   - **pas** de `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, clés VAPID ni Google Calendar.
4. **Accès d'Ibé** : Vercel protège les Preview par défaut (Settings › Deployment Protection ›
   Vercel Authentication). Soit l'enlever pour les Preview, soit rattacher un domaine
   `preprod.<domaine>` à la branche `pre-prod` (Settings › Domains › Git Branch) et l'exclure. La
   connexion de l'app protège le reste : la barre n'apparaît qu'une fois connecté.
5. Pousser la branche `pre-prod` : Vercel la déploie à chaque push.

## 3. S'en servir

Se connecter avec `claire.morel@preprod.pds` (ou un autre compte de la barre) et `PREPROD_PASSWORD`.
**Changer ce mot de passe** = le changer partout à la fois : `.env.preprod.local`, `.env.local`, la variable
Vercel de la branche, **et** les comptes en base (`pnpm preprod:reset`, ou la mise à jour de
`auth.users.encrypted_password` du § 6). Le 26/10, un mot de passe changé dans le fichier après la remise
à zéro a donné « Email ou mot de passe incorrect ».

- **Voir comme** : vraie connexion à un autre compte, retour sur la même page. Ce que chacun voit
  reste décidé par le RLS. Comptes : Claire Morel (directrice générale, seule validatrice), Lina
  Haddad (cheffe de projet, responsable des projets), Tom Mercier (chef de projet, pour sentir « seul
  le responsable écrit »), Nadia Benali (directrice créative). Sans déconnexion préalable : la
  nouvelle session remplace les cookies. Compter 2 à 4 s : le nouveau compte n'a encore rien en cache
  (les vues sont gardées par lecteur).
- **Aller à** : un projet par moment, ouvert sur sa page ; le libellé dit qui agit. Seuls les projets
  que le compte connecté peut ouvrir sont listés.

| Moment | Projet | Qui agit |
| --- | --- | --- |
| Projet transmis, à accepter | Velours | Lina |
| Cadrage en cours (objectif seul répondu) | Néons | Lina |
| Brief envoyé, à valider | Marée basse | Claire |
| Brief validé, Plan du projet à lancer | Ciel ouvert | Lina |
| Plan lancé : les huit workflows ouverts, Stratégie à démarrer | Minuit pile | Lina |

## 4. Recommencer

`pnpm preprod:reset` (`scripts/preprod-reset.sh`) : rejoue toutes les migrations sur la base de
pré-prod puis `supabase/preprod/seed.sql`. **Tout ce qui a été fait en pré-prod est effacé.** Le
script refuse une base qui a un compte hors `@preprod.pds` : il ne peut pas toucher la prod. Le mot de
passe passe par l'entrée de `psql`, jamais en argument.

Ce n'est pas un bouton de l'app : remettre une base à zéro demande la clé de service, interdite dans
un chemin déclenché par un utilisateur (règle 3).

## 5. Ajouter un moment

1. Dans `supabase/preprod/seed.sql`, un nouveau projet (`pg_temp.new_project`) amené à son moment par
   les **vrais gestes** (les fonctions SQL de l'app, jouées en tant que la bonne personne avec
   `pg_temp.act_as`). Les tests pgTAP (`supabase/tests/`) donnent chaque geste avec ses arguments.
2. Le moment dans `lib/preprod/moments.ts` (titre du projet, page) et son libellé dans
   `lib/i18n/fr/preprod.ts`.
3. Le tester sur la base locale **sans rien écrire** :

   ```bash
   { printf "\\set pw '%s'\n" test-preprod-123; sed 's/^commit;$/rollback;/' supabase/preprod/seed.sql; } \
     | docker exec -i supabase_db_PDS_OS psql -U postgres -q -v ON_ERROR_STOP=1
   ```

Limites : pas de fichier Storage (écoute d'un mix, pochette), pas d'appel à l'IA ni de transcription
dans le jeu de données ; les dates sont relatives au jour de la remise à zéro (pas de voyage dans le
temps : un retard se prépare avec des dates passées). Moments à ajouter ensuite : Stratégie à valider,
Master (mix V1 à valider), Juridique (fiches, SACEM), Conception, Distribution.

## 6. Développer sur la base de pré-prod (sans Docker)

Décision du 26/10/2026 : la stack Supabase locale prend trop de mémoire, et personne d'autre que nous ne
teste encore en pré-prod. `pnpm dev` tourne donc sur la base de pré-prod.

- `.env.local` : bloc « Dev sur la base de pré-prod » en fin de fichier (adresse et clé anon de
  `xluuruuzfohfixzaoxmu`, `PREPROD_TOOLS=1`, `PREPROD_PASSWORD`) ; les lignes de la base locale restent en
  commentaire « LOCAL (Docker) » pour revenir en arrière. La barre « Voir comme » marche aussi en local.
- **Nouvelle migration** : `supabase db push --db-url "$PREPROD_DB_URL"` (variable de `.env.preprod.local`).
  Une migration ratée se répare par une migration suivante, ou par `pnpm preprod:reset`, qui rejoue les
  migrations **de la branche en cours** et efface les données.
- **Types** : `pnpm db:types:preprod` (par l'API, sans Docker), avec les précautions habituelles sur les
  `| null` ajoutés à la main dans `lib/supabase/database.types.ts`.
- **Tests SQL** : `supabase test db` exige Docker. Sans lui, un fichier se joue avec
  `psql "$PREPROD_DB_URL" -f supabase/tests/<fichier>.test.sql` (chaque test finit par `rollback` : rien ne
  reste ; l'extension `pgtap` doit être activée sur la base).
- **E-mails** : pas de Mailpit ; les comptes de test sont déjà confirmés, le peu d'e-mails d'auth passe par
  le SMTP par défaut de Supabase (limité).
- Le jour où l'équipe teste en pré-prod, revenir à une base de dev séparée : nos essais et nos remises à
  zéro arriveraient chez elle.
