# Recette d'ensemble — app PDS OS contre le proto « Projet complet »

Date : 19/10/2026. Branche `pc/recette` (lots 1 à 10 fusionnés ; lot 11 non fusionné, voir § 6).
Référence : `docs/protos/projet.html` et ses protos par module, captures du proto
(`scratchpad/shots/`, `scratchpad/shell-shots/`).

## 1. Méthode

- Un build (`pnpm build`), puis `pnpm start -p 3200` pour la fluidité ; les corrections ont été
  revérifiées en `pnpm dev -p 3200` (pas de second build).
- Pas de projet « Néons (recette) » créé : la recette réutilise les projets de test des lots, qui
  couvrent chaque moment du proto :

  | Moment du proto | Projet local |
  | --- | --- |
  | `start` / `brief` (Cadrage) | « Cadrage à démarrer (test lot 2) », « Brief à valider (test lot 2) » |
  | `plan` (Plan à lancer) | « Plan à lancer (test lot 2) », « Plan à lancer bis (test lot 2) » |
  | `launched` / `mid` | « Néons (test Master) », « Néons (test Stratégie) » |
  | Conception, Production | « Néons (test Conception) », « Néons (lot 5) » |
  | Activations, Suivi & bilan | « Néons (test Activations) », « Néons (test Suivi & bilan) » |
  | `release` / `after` | « Distribution (test) », « Néons », « Ressac » (Juridique complet) |

- Rôles : cheffe de projet `cp-conception@pds.test`, DG `admin@pds.test`, directeur créatif
  `dc-conception@pds.test` (**même mot de passe que la cheffe de projet : il fonctionne**, aucun
  contournement SQL). Le directeur créatif est « Dario Test », validateur du Mix V1 de « Néons
  (test Master) ».
- Robot Playwright (`scratchpad/rec/crawl.cjs`) : chaque section de la barre du projet, les pilules
  Marketing et les liens d'étape (jusqu'à 70 pages par projet), en navigation client ; il note les
  erreurs JavaScript, les réponses ≥ 400, les pages vides, les squelettes, le défilement horizontal
  et le temps jusqu'à une page stable. Passages : cheffe de projet 1440 clair (10 projets, ≈ 330
  pages), cheffe de projet 390 sombre (6 projets, ≈ 260 pages), DG 1440 (« Néons », « Ressac »).
  Gestes rejoués un par un (`scratchpad/rec/gesture.cjs`), avec contrôle en base et de la cloche.

## 2. Gestes rejoués sur l'app (écrire, notifier, débloquer)

| Geste | Rôle | Écrit en base | Notifie | Débloque | Verdict |
| --- | --- | --- | --- | --- | --- |
| Cadrage › Plan du projet › « Lancer le plan » (modale de relecture puis confirmation) | CP | `project_plans.launched_at` + éléments du plan | — (l'acteur suivant est la CP elle-même) | « Démarrer la stratégie », bandeau « Plan lancé · Ensuite · Débloqué », toast « Plan lancé. » | OK |
| Stratégie › Départ › « Commencer la stratégie » | CP | `launch_strategy` en cours | — | « Les 8 dimensions » (« Compléter : positionnement ») | OK |
| Distribution › « Confirmer les paramètres » sans rien remplir | CP | rien (refus) | — | — | OK : « 3 informations manquent : elles sont en rouge », raison sous chaque champ |
| Master › Mix V1 › « Demander une modification » (vide, puis rempli) | DC | décision du mix | CP (`master_mix_changes_requested`, vue dans la cloche) | Mixage « En attente de Karim · déposer le Mix V2 » | OK : erreur « Écrivez ce qu'il faut changer… » au premier essai |
| Production › Devis › « Soumettre à admin pds » (sans cases, puis cochées) | CP | vérification du devis | DG (`production_quote_submitted`) | Validations de la DG : « Valider le devis V1 » | OK |
| Production › Devis › « Valider le devis V1 » | DG | décision du devis | CP (`production_quote_decided`) | « Proposition de réalisation », « Préproduction » | OK |
| Cloche | CP | — | — | — | OK : la notification du Mix arrive en tête |

## 3. Par écran et par rôle

Légende : **OK** conforme au proto ; **corrigé** (commit) ; **reste** (gravité : haute / moyenne /
faible).

### Coquille, Vue d'ensemble, Travail, Validations, Activité

| Écran | CP | DG | DC | Verdict |
| --- | --- | --- | --- | --- |
| Barre du projet (Vue d'ensemble, Cadrage, Workflows, Pilotage + Budget), points de statut, pastilles « À vous » | ✓ | ✓ | ✓ (Juridique « Réservé à la direction et aux chefs de projet ») | OK |
| Pastilles « À vous » du Juridique avant son lancement (« répondre aux 3 questions » sur une page verrouillée) | | | | **corrigé** `9e6a82a` |
| Actions de Distribution (Maintenant, Travail, bandeau « Ensuite ») sur un projet de contenu, pages `/release/*` sans fil d'Ariane | | | | **corrigé** `9e6a82a` (plus d'action, pages en 404) |
| Vue d'ensemble avant le plan : « Maintenant », « Avant les workflows », 4 étapes du Cadrage | ✓ | ✓ | | OK |
| « Ouvrir le Cadrage » (et 86 liens-boutons « outline ») sans contour | | | | **corrigé** `2b3378e` |
| Vue d'ensemble après le plan : « Maintenant », « Les workflows » (4 cartes), « Ce qui dépend d'un autre workflow » | ✓ | ✓ | ✓ | OK |
| Pastille de statut du titre collée au h1 (proto : à droite de la ligne) ; lien « Bilan & clôture du projet » en plus | | | | reste, faible |
| Carte d'un workflow non démarré sans parcours : « Étape 1 sur 2 · État des lieux » (repli sur les chevrons) au lieu d'un simple « Non démarré » | | | | reste, faible |
| Carte Distribution « Terminé » mais « Étape 6 sur 7 · Plateformes » après une clôture avec réserves (l'étape Plateformes reste « En cours » et propose encore « Déclarer la disponibilité publique ») | | | | reste, moyenne (`lib/distribution/journey.ts`, `platformsOutcome`) |
| Travail du projet : mes actions, Cadrage d'abord, « Rien ne vous attend pour l'instant. » | ✓ | ✓ | ✓ (« Valider le Mix V1 ») | OK |
| Validations du projet : « Valider le devis V1 » (DG), « Valider le Mix V1 » (DC), « Aucune validation ne vous attend. » | ✓ | ✓ | ✓ | OK |
| Bandeau « Lecture seule » au-dessus de la décision de la DG ou du DC (Validations, Mix V1, Brief) | | | | **corrigé** `e9b09e0` (gardé seulement sur Budget, Équipe, Calls, Planning, Livrables, Fichiers) |
| Activité : journaux des workflows, par jour | ✓ | ✓ | | OK ; libellé brut « dossier.parameters_confirmed » **corrigé** `860e6c3` |
| « Travail » de la barre principale : pastille du projet mais lien vers le Travail global, qui ne liste pas ces actions | | | | **corrigé** `bcb466f` (ouvre le Travail du projet, comme le proto) |
| Mobile 390 : puces de navigation, aucune page en défilement horizontal | ✓ | | | OK sauf Budget (651 px) **corrigé** `c91ec3b` |
| Sombre : tokens, cartes, pastilles lisibles | ✓ | | | OK |

### Workflows

| Écran | Verdict |
| --- | --- |
| Cadrage (Départ, Les 6 dimensions, Brief de cadrage, Plan du projet) | OK. Brief « Modification demandée » : l'étape reste « En cours » alors que son prérequis est rouvert (choix des lots). |
| Lancer le plan d'un **projet de contenu** : seul le Marketing démarre ; Juridique et Master sont « Hors du plan · Lancer » | reste, moyenne : le proto lance les quatre workflows ; « Master · Lancer » est proposé sur un projet sans master |
| Verrou d'un workflow (« Ce workflow démarre au lancement du plan du projet, après le Cadrage. ») | OK ; même texte quand le plan est lancé **sans** ce workflow (cas `absent` de `workflowGate`) : reste, faible |
| Stratégie (4 étapes, choix du départ, bandeau, « Ajouter une dépense ») | OK. Avant le plan, étapes verrouillées visibles au lieu de l'écran verrouillé (décision du lot Stratégie). |
| Conception, Production (par livrable, Devis → Proposition → Préproduction…), Activations, Suivi & bilan | OK, très proches des captures. Pilules Marketing **sans le compteur bleu** de mes actions (le composant `SubModuleTabs` le sait afficher, `projectHeaderData` ne le calcule pas) : reste, faible |
| Master (Source, Brief, Mixage, Mastering, Master final, Historique) | OK. Date du fil avec l'ingénieur « 19 oct. 2026 à 17:44 » **corrigé** `eeaca7d` (« 19/10, 17:44 »). |
| Juridique (Dossier, démarches du Suivi, Prêt pour la sortie, Historique) | OK (« Ressac », « Néons »). |
| Distribution (7 étapes, Anomalies, Historique) | OK ; voir la clôture avec réserves ci-dessus. |
| Pages introuvables : « Page introuvable » rendue avec un statut HTTP 200 (le `notFound()` arrive après l'envoi de l'en-tête du projet) | reste, faible |

### Page privée par personne (`/c/[token]`, lot 11)

Non recettée : la fusion de `feat/projet-complet` dans `pc/recette` a été **refusée par le contrôle
des permissions** de la session ; le build recetté ne contient donc pas la route `/c/`. Les liens
privés existants (`/m/…` de Karim) s'affichent dans le Mixage (Créé, Ouvert, Pris en charge…).

## 4. Temps de navigation mesurés (`pnpm start`, Chrome sans tête)

| Navigation | Mesure | Commentaire |
| --- | --- | --- |
| Entre sections déjà préchargées (Vue d'ensemble, Travail, Validations, Activité, Budget, étapes d'un parcours) | **30 à 200 ms** | sans chargement visible (`ViewLink`) |
| Entrée d'un module qui redirige vers son étape (Cadrage, Master, Juridique) | 0,2 à 0,9 s | en-tête affiché, corps vide pendant la redirection |
| Entrée de la Distribution (`/release`) | 0,8 à 2,8 s | squelette (`release/loading.tsx`) |
| Première ouverture d'un sous-module Marketing non préchargé (Conception, Production, Suivi & bilan) | 1 à 5 s, jusqu'à 10–12 s sous charge | squelette ; machine partagée avec d'autres agents |
| HTML d'une page, serveur au repos (curl authentifié) | 0,1 à 0,5 s (TTFB) | |

Sous charge (robot + autres worktrees), le serveur a journalisé ≈ 1 500 « fetch failed » vers Supabase
et 4 navigations ont atterri sur l'Accueil (`/app`) au lieu de la page demandée (Activité,
Activations, Cadrage › Départ, Distribution › Clôture), **non reproductibles en accès direct**.
Hypothèse : préchargement de toutes les entrées de la barre (`ViewLink`) + `get_my_access` en échec
traité comme « indisponible », réponse gardée 30 s par le cache du routeur (`staleTimes.dynamic`).
Reste, moyenne : à surveiller au démarrage de l'équipe.

## 5. Fonctions du proto encore absentes de l'app (non codées ici)

1. **Validations et actions des parcours dans l'Accueil et le Travail global** (haute) : la DG lit
   « Validations qui m'attendent · Rien à valider » sur `/app` et `/app/work` alors que « Valider le
   devis V1 » l'attend dans le projet (elle reçoit bien la notification). Le Travail global ne lit pas
   `loadProjectJourneys` ; il faut une lecture de « mes » actions sur tous mes projets ouverts.
2. **Lancement des quatre workflows au « Lancer le plan »** pour tout projet (moyenne) : le plan
   proposé pour un projet de contenu omet le Juridique.
3. **Compteur de mes actions sur les pilules Marketing** (faible).
4. **Page privée réunie par personne** : codée par le lot 11, à recetter après fusion (§ 3).

## 6. Commits de la recette

| Commit | Correction |
| --- | --- |
| `9e6a82a` | Juridique sans étape avant son lancement ; pas de Distribution sur un projet qui n'en a pas |
| `2b3378e` | Les liens-boutons « outline » gardent leur contour |
| `e9b09e0` | Plus de bandeau « Lecture seule » sur les parcours, Travail, Validations, Activité |
| `eeaca7d` | Fil avec l'ingénieur daté « 19/10, 17:44 » (`Timestamp show="short"`) |
| `c91ec3b` | Budget sans défilement horizontal à 390 px |
| `860e6c3` | Historique Distribution : « Paramètres de distribution confirmés », « Preuve ajoutée » |
| `bcb466f` | « Travail » de la barre principale ouvre le Travail du projet dans un projet |

Aucune migration. Composants communs modifiés : `Button` (couleur de bordure par variante),
`Timestamp` (variante `short`), `ReadOnlyNotice`, `NavLinks`, `WorkflowGate`.

## 7. Finitions (19/10/2026, branche `pc/finitions`)

Ce que la recette avait laissé, corrigé dans l'ordre (un build, mesures en `pnpm start -p 3201`,
machine partagée chargée, charge moyenne 7 à 14).

| Gravité | Point de la recette | Correction | Commit |
| --- | --- | --- | --- |
| haute | Accueil et Travail global ne lisent pas les parcours (« Rien à valider » pour la DG) | **corrigé** : `loadMyJourneyWork` (`lib/work/journeys.ts`) lit les parcours de chaque projet lancé visible ; Travail = une carte « À vous » par projet ; Accueil = « Validations qui m'attendent » (acteur `kind: "validate"`) et « À vous » ; compteur de « Travail » hors d'un projet = somme des projets. Listes en double retirées (validations d'étape, mes projets, livrables, conception) ; « Mes tâches » ne garde que les tâches libres. Vérifié : la DG lit « Clôturer le Marketing · À valider » (Néons (test Suivi & bilan)) sur l'Accueil, le Travail et le compteur 1 ; la cheffe de projet 29 actions sur 11 projets | `5f1ee44` |
| moyenne | « Lancer le plan » d'un projet de contenu sans Juridique, « Master · Lancer » sans titre | **corrigé** : le plan suit `applicableWorkflows` (Master avec un titre, Distribution pour un projet musical, Juridique et Marketing toujours) ; « Hors du plan » sans Master pour un projet sans titre | `e844385` |
| moyenne | Plateformes « En cours » après une clôture avec réserves | **corrigé** : étape « Fait » avec la marque de réserve, lecture seule, bandeau « rouvrir la clôture relance les vérifications » ; carte « Étape 7 sur 7 · Clôture » | `8666aa0` |
| moyenne | Première ouverture d'un sous-module Marketing : 1 à 5 s | **corrigé** : plus de cascade layout → page (états des workflows lus avec le projet, `WorkflowGate` et layouts Master/Juridique sans tour propre une fois lancés), fiche de production en 2 tours au lieu de 4, préproduction en 2 au lieu de 3, lectures du parcours de production préchargées. Après : page complète 0,6 à 1,4 s (2,3 s au pire sous charge), pilule à pilule 0,1 à 0,2 s | `c94dd26` |
| faible | Pastille de statut collée au h1 | **corrigé** : à droite de la ligne de titre, avant les actions (proto `.headrow`) | `27c14e2` |
| faible | Pas de compteur bleu sur les pilules du Marketing | **corrigé** : mes actions par sous-module, déclarées par la navigation du projet (aucune attente de l'en-tête) ; ex. Conception 1, Activations 10 | `27c14e2` |
| faible | Texte du verrou d'un workflow laissé hors du plan | **corrigé** : « n'est pas dans le plan du projet… » + « Ouvrir le Plan du projet » | `e844385` |
| faible | Pages introuvables en HTTP 200 | **non corrigé, décision** : `app/(app)/app/loading.tsx` enveloppe toute l'app, donc tout `notFound()` arrive après le début du flux ; Next garde 200 et injecte `noindex` (contrat documenté de Next). Rendre un vrai 404 imposerait de retirer les `loading.tsx` (fluidité) ou une requête en base dans le proxy à chaque page : écarté pour une app interne sans robot. L'écran « Page introuvable » reste juste | — |

**Temps de l'Accueil et du Travail global** (`pnpm start`) : les autres cartes s'affichent d'abord ; les
cartes des parcours arrivent après **3 à 3,5 s pour la cheffe de projet (12 projets)** et **5 à 7 s pour
la DG (21 projets de test)**, six projets à la fois (au-delà, la passerelle locale répondait « fetch
failed »). Chaque projet lit tout son parcours (environ 250 requêtes) : reste, moyenne, à suivre avec le
vrai nombre de projets ; la piste suivante est un chargeur « actions seules » par workflow plutôt que les
contextes complets des étapes. Lectures partagées une fois par requête ajoutées en chemin :
`loadMembers`, `listValidatorRows`, `isWorkflowLaunched`, `readInventoryRows`, `loadIntake`
(`memoPerRequest`).

Reste aussi : le point de la barre du projet d'un workflow hors du plan garde l'infobulle « démarre au
lancement du plan » (`workflowStatus.notStartedHint`) ; l'assistant (`my_todo`) lit encore
`loadMyTodo`, pas les parcours.
