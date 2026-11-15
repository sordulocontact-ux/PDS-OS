# Test UX — second passage — PDS MIC, deals, budget (12/11/2026)

> Participants simulés (4 personas IA), **build de production** (`pnpm start`, port 3001) sur la base
> locale, après le commit `79b0c855`. Corrections de ce passage : commit `e8f9adbd`.
> Hypothèses fortes, à confirmer avec Glen, Thibault, Lina et Ibé.

## En 30 secondes

**Verdict.** Le cœur du Business est fluide : noter un appel, proposer l'accord en un geste, le valider avec
les termes sous les yeux, comprendre les règles de droits. Deux points cassaient encore le parcours :

- **Le PDS MIC se crée sans ses invités.** Le deal d'une invitée part alors sans lien avec sa participation, et
  rien ne le signale. C'est le lot 5 de Maël.
- **Au clavier, aucun bouton n'avait de contour de focus.** Toute l'app était concernée. C'est corrigé.

| Gravité | Problème                                                                                             | État                                         |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 3,5     | Q1 — Un PDS MIC se crée sans ses invités ; le deal de l'invitée part sans participation, sans alerte | **À faire (Maël, lot 5)**                    |
| 3,5     | Q4 — Aucun bouton n'avait de contour de focus (`outline-none` sur `Button`)                          | Corrigé                                      |
| 3       | Q2 — « Nouveau projet » : l'erreur restait en haut, hors de l'écran                                  | Corrigé                                      |
| 2,5     | Q3 — « Créer sans Deezer » a affiché le profil d'un autre artiste                                    | À vérifier (non reproduit)                   |
| 2,5     | Q6 — La validation nommait le titulaire actuel, pas l'auteur de la proposition                       | Corrigé                                      |
| 2,5     | Q9 — Deux totaux différents pour le budget d'un artiste (estimations comprises ou non)               | À faire                                      |
| 2       | Q5 — Après « Utiliser », le focus repartait en haut de la fenêtre                                    | Corrigé                                      |
| 2       | Q7 — Dans Dépenses, le nom de l'artiste ne menait nulle part                                         | Corrigé                                      |
| 2       | Q10 — Avant les termes, le bouton principal propose « Le call est prévu »                            | À faire                                      |
| 1       | Q8 — Fiche d'un deal titrée « PDS OS » dans l'onglet                                                 | Corrigé                                      |
| 1       | Q11 — Premiers affichages de 3 à 4 s (Nouveau projet, Projets vide)                                  | À mesurer en pré-prod (évaluateurs à 0 et 2) |

## Ce que confirment les corrections du premier passage

| Correction                                              | Observé                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Accord proposé en un geste dès qu'un terme est confirmé | Malik : `to_contact` → `agreement` directement, « la direction est prévenue »                     |
| Termes confirmés au-dessus de la validation             | Claire relit 45 % / 10 000 € et valide (SEQ 6)                                                    |
| « Ouvrir un deal » pour qui négocie                     | Élise comprend qu'il faut demander à Claire, sans chercher partout                                |
| Deal abandonné expliqué                                 | Élise : « ne se rouvre pas, la direction en ouvre un nouveau »                                    |
| Prochain call avec jour et heure                        | Élise : 15/11, 12:00 – 12:30 (SEQ 6)                                                              |
| Contact privé                                           | Élise lit le numéro de Yasmine, maintenant qu'elle tient le deal de Lila Vega (lecture autorisée) |
| Dépenses filtrée sur un artiste                         | Claire y trouve le reste de Mona Lys (12 822 €)                                                   |

Le SUS d'Élise passe de 48 à 80 et celui de Malik de 65 à 70. Claire (37,5) et Lina (35) restent basses : la
création du PDS MIC pour Claire, la saisie au clavier pour Lina.

## Problèmes

### Q1 — Un PDS MIC se crée sans ses invités (3,5/4)

- **Ce qui se passe :**
  - Claire crée « PDS MIC 5 » : aucun champ pour les invités, qui ne viennent que d'une sélection d'artistes ou
    s'ajoutent ensuite titre par titre ;
  - elle ouvre ensuite la négo de Sélène Vega par « un projet ou un artiste » : le deal existe, mais sans
    participation, donc sans le contrat de la participation (règle § 0 ter de `docs/pds-mic-plan.md`).
- **Cause :**
  - `components/projects/create-project-form.tsx` et `collective-fields.tsx` ne proposent pas d'invités hors
    sélection ;
  - `components/deals/new-deal-form.tsx` accepte un artiste hors du collectif sans rien en dire. Depuis
    `20261112120101`, un artiste déjà invité est refusé, mais rien ne propose de l'inviter.
- **Recommandation :**
  - **Maël, lot 5** : des « Invités » dans le formulaire du collectif (un artiste par titre), ou une étape
    « Ajouter les invités » mise en avant juste après la création ;
  - **Business** : dans « Nouveau deal », un collectif choisi avec un artiste non invité affiche « Inviter
    d'abord Sélène Vega sur un titre ». Ainsi un deal de collectif part toujours d'une participation.

### Q3 — « Créer sans Deezer » a affiché le profil d'un autre artiste (2,5/4)

Claire tape « Kaya Mendes » : « Max Mendes », puis « Simple Minds » avec « Signé » coché. Rien n'a été
enregistré. Ce n'est pas reproduit, et peut-être un clic sur un résultat Deezer. À rejouer à la main dans
`components/catalog/deezer-artist-search.tsx`.

### Q9 — Deux totaux pour le budget d'un artiste (2,5/4)

La tuile « Dépensé » (47 478 €) laisse de côté 400 € d'estimations, que le tableau du bas compte (47 878 €).
Recommandation : un total du tableau qui suit la même règle, ou qui dit « dont 400 € estimés ».

### Q10 — Le bouton principal propose « Le call est prévu » après le call (2/4)

Malik, deal « À contacter » : avant de saisir les termes, le bouton principal propose l'étape suivante.
Recommandation : proposer d'abord de noter les termes (lien vers « Termes négociés ») quand aucun n'est saisi.

## Constats écartés (artefacts)

- **Kaya Mendès, Ama Prism et La Fève introuvables :** ils appartiennent à l'autre organisation de la base
  locale (seed local). C'est mon erreur de scénario, pas un bug. Rejoué avec Sélène Vega, Zéphyr Vega et Rivo Blanc.
- **Champs sans nom, focus non annoncé, toast muet, liens sans nom :** vérifiés dans le navigateur. Libellés
  reliés, focus dans la fenêtre (sur « Fermer »), toast `aria-live`, aucun lien sans nom. C'est la lecture de
  l'arbre par l'agent qui les a créés.
- **Historique à 45 000 € :** c'est ma remise à 60 000 € directement en base pour le test.

## Méthode et nettoyage

- **Sessions :**
  - Claire ×2 (le premier essai PDS MIC portait sur les mauvais artistes) ;
  - Malik, Élise ;
  - Lina au clavier et au lecteur d'écran.
- **Gravité :** deux évaluateurs indépendants. Un seul désaccord (Q11), tranché à 1, environnement.
- **Nettoyage :**
  - supprimés et vérifiés : le projet « PDS MIC 5 » avec son deal (par `delete_project_row`), les deux dépenses
    (taxi, coaching), le brouillon de projet ;
  - gardés volontairement : l'artiste maison « PDS » (il existe en prod, le modèle PDS Mic le propose) et
    l'enveloppe de Mona Lys à 60 000 € (alignée sur `showcase-business.sql`).
