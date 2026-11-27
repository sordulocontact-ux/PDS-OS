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
| Comptes | les vrais | six comptes de test dans la barre, un seul mot de passe (`lib/preprod/accounts.ts`) |
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
  le responsable écrit »), Nadia Benali (directrice créative), Malik Durand (business manager) et
  Élise Fabre (business), ces deux-là créés par le jeu Business (§ 5 ter). Sans déconnexion préalable : la
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

## 5 bis. Le jeu de démonstration

`supabase/preprod/showcase.sql` (Sacha, 30/10/2026) remplit les pages hors parcours, liées aux
projets et titres du jeu de données : trois membres de plus (Inès Garnier et Yanis Belkacem, chefs
de projet ; Chloé Martin, directrice créative ; même mot de passe) et une demande en attente
(Hugo Lefèvre) ; 18 contacts du Réseau (studio, production, éditeur, distributeur, agence, média,
label, et leurs personnes) ; un premier titre pour chaque artiste qui n'en a pas ; des crédits ;
« Qui fait quoi » ; des fiches de renseignements envoyées ou rendues ; des liens privés (par
`issue_contact_link`) envoyés, ouverts ou non ; neuf contrats dans tous les états avec leurs
parties ; des fichiers d'artiste, de projet et de contrat ; des invités du Réseau sur un call et
deux calls à venir. Il **ajoute seulement** et ne se joue qu'une fois (il s'arrête si « Studio
Ressac » existe). `pnpm preprod:reset` le joue après le seed ; sur une base déjà utilisée :

```bash
{ printf "\\set pw '%s'\n" "$PREPROD_PASSWORD"; cat supabase/preprod/showcase.sql; } \
  | /opt/homebrew/opt/libpq/bin/psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1
```

Les fichiers n'ont pas de contenu (pas de Storage dans le jeu de données) : la liste et les fiches
les montrent, les ouvrir échoue.

`supabase/preprod/showcase-contracts.sql` (joué après, une fois) ajoute ce que seule la section
« Document » d'un contrat montre : cinq modèles (prestation technique, co-édition en v2, droit à
l'image, et un brouillon « réalisation de clip » à valider) écrits et validés par Claire, quatre
contrats **générés** depuis eux par les vrais gestes (`legal_agreement_needs`,
`generate_legal_contract`, chaque valeur avec sa source ; `revise_contract_document` pour une v2 ;
`advance_contract`) : à valider (Sami, v2), modifications demandées (Julie), validé à envoyer
(Maxime), en préparation (Bastien). Il remplace les deux contrats écrits à la main de Sami et Julie.

## 5 ter. Le jeu Business

`supabase/preprod/showcase-business.sql` (Sacha, 12/11/2026 : « des nouveaux rôles pour tester les
nouvelles pages ») ajoute les deux postes du module Business à la barre « Voir comme » et de quoi
remplir Deals, la page d'un deal, Dépenses et l'onglet « Business » de la fiche artiste, tout par les
vraies fonctions de l'app :

| Deal | Négocie | Moment |
| --- | --- | --- |
| Mona Lys, Minuit pile | Malik | En négociation, termes dans tous les états, relance en retard, Camille Petit en contact |
| Lila Vega | Malik | Call prévu (un call de deal dans trois jours), Yasmine Ould en contact **privé** de Malik |
| Nahel Nuit | Élise | Accord de principe proposé : à valider par Claire |
| Mako Rouge | Malik | Signé |
| Rivo Blanc | Élise | Abandonné, avec sa raison |

Plus l'enveloppe 2026 de Mona Lys (60 000 €, trois postes : elle couvre aussi les dépenses de « Minuit pile ») ouverte par Claire et deux dépenses directes
saisies par Lina. Joué par `pnpm preprod:reset` après les deux autres jeux, ou seul, une fois (il
s'arrête si `malik.durand@preprod.pds` existe) :

```bash
{ printf "\\set pw '%s'\n" "$PREPROD_PASSWORD"; cat supabase/preprod/showcase-business.sql; } \
  | /opt/homebrew/opt/libpq/bin/psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1
```

Joué sur la pré-prod le 12/11/2026, après ses 15 migrations du 10 au 12/11.

## 5 quater. Les justificatifs de Finance (15/11/2026)

`supabase/preprod/showcase-finance-proofs.sql` (Sacha : « rajoute les données ») ajoute trois dépenses hors budget
(Ingé son, Réparation enceinte, Location plateau) et sept justificatifs, un par état de la boîte : proposés (SNCF reçu
par e-mail de Claire, Studio Ombre, SonoFix), photo G7 à vérifier, Adobe en attente, Loca Plateau rattaché, devis
écarté. Leurs fichiers (chemins fixes `<organisation>/seed-proof-*`) sont faits et déposés par
`scripts/preprod-proof-files.mjs`, connecté comme Malik (business manager) avec `PREPROD_PASSWORD` : jamais une clé de
service. La photo est gardée dans `supabase/preprod/files/`. `pnpm preprod:reset` joue les deux ; sur une base déjà en
service :

```bash
psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1 -f supabase/preprod/showcase-finance-proofs.sql
node scripts/preprod-proof-files.mjs
```

Il faut `PREPROD_SUPABASE_URL` et `PREPROD_ANON_KEY` dans `.env.preprod.local` (les valeurs « PRÉ-PROD — » de
`.env.local`). Ajoute seulement, une fois (garde en tête du SQL) ; un fichier déjà déposé est gardé.

## 5 quinquies. Les sessions studio (27/11/2026)

`supabase/preprod/showcase-sessions.sql` (Sacha : « rajoute des données dans les sessions studio ») ajoute douze
sessions, une par état de `lib/sessions/state.ts`, écrites par Lina et Tom (chefs de projet, `manage_sessions`) à
travers le RLS, comme `saveStudioSession` et `saveSessionReport` : à venir (Minuit pile, Mirage, Sable chaud sans
projet, une session d'écriture sans titre pour Assurance 30, Rive gauche sans date), en cours aujourd'hui (Ciel bas,
journée entière), compte rendu à compléter (Néons avec ses rushs, Feu de camp), terminées avec compte rendu (Velours,
Aube, Marée haute), annulée (Ciel ouvert). Studios et ingénieurs du Réseau (Studio Ressac, Bastien Coll, Karim
Haddou), participants membres et contacts, liens vers les rushs. Il écrit aussi le compte rendu des anciennes
sessions de « Néons » et « Velours », et donne aux séances d'avant leurs horaires, les artistes de leurs titres et Lina en
participante (le tableau montre un fait par colonne). Dates relatives au jour où il est joué. Une fois (il s'arrête si la session
« Prises voix lead et chœurs du refrain. » existe), après les autres jeux :

```bash
psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1 -f supabase/preprod/showcase-sessions.sql
# en local (Docker)
docker exec -i supabase_db_PDS_OS psql -U postgres -q -v ON_ERROR_STOP=1 < supabase/preprod/showcase-sessions.sql
```

Joué sur la base locale le 27/11/2026.

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
