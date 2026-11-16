# Test UX — Finance après fusion, projets collectifs (15/11/2026)

## En 30 secondes

4 personas simulés sur la stack locale (fusion du 15/11 : Finance lots 1 à 7 + projets collectifs de Maël).
La Finance se lit bien (Élise 4/4, SUS 72) ; ce qui casse, ce sont les gestes hors des chemins prévus :

1. **Une dépense sans projet ni artiste (loyer) est introuvable** — « Hors budget » existe mais tout en bas de la
   liste du champ « Pour », dont tous les textes parlent encore de « projet ou artiste ». Malik abandonne. (3)
2. **Planifier une émission ne se trouve pas** — Malik crée un centre de coût à la place (faux succès : rien
   n'entre dans la prévision), puis ne peut ni le décaler ni le renommer. (3,5)
3. **La validation d'un rapprochement se fait à l'aveugle** sur écran étroit, et **l'accueil de la DG dit « Rien ne
   vous attend »** alors qu'un budget est dépassé de 30 778 €. (3 chacun)

Nettoyage : complet et vérifié (aucune ligne créée pendant le test ne reste). SUS moyen 50,6 (indicatif).

## Méthode et limites

- Stack locale (localhost:3000, Supabase Docker), jeu de démo « pds » ; comptes de la démo via la barre « Voir comme ».
- Personas : Élise (business, à l'aise), Malik (business manager, peu à l'aise, **clavier seul**), Lina (cheffe de
  projet), Claire (DG, téléphone puis bureau).
- **Fenêtre bloquée entre 590 et 810 px** pour toutes les sessions (Chrome refuse le redimensionnement) : l'affichage
  étroit a été testé (onglets à la place de la double colonne), **la double colonne n'a pas été vue**.
- **Lina T1-T2 : tâche mal conçue** — une cheffe de projet n'a pas le droit de créer un projet (seule la DG le fait) ;
  son échec est attendu. Reste un vrai problème : l'écran ne le dit pas (P10).
- Lenteurs (8 à 10 s, squelettes) : serveur de développement, non jugées.
- Participants simulés : hypothèses fortes à confirmer avec 3 à 5 vraies personnes (Malik surtout).

## Résultats

| Persona                  | Réussites réelles | SEQ moyen | SUS | En un mot                              |
| ------------------------ | ----------------- | --------- | --- | -------------------------------------- |
| Élise (business)         | 4/4               | 5,5       | 72  | « prometteur »                         |
| Claire (DG)              | 4/4               | 4,0       | 58  | « Complet mais long »                  |
| Malik (business manager) | 1/4               | 2,8       | 35  | « bloqué »                             |
| Lina (cheffe de projet)  | 0/3               | 1,3       | 38  | « Bloquée » (tâche hors de ses droits) |

Vérifiés en base : facture FA-2026-040 marquée envoyée (Élise), prélèvement 1 080 € rapproché d'« Ingé son »
(Élise), projet collectif « PDS MIC #9 (test) » créé avec 2 titres (Claire). Faux succès : Malik T2 (centre de coût
au lieu d'une émission planifiée).

## Problèmes, par gravité (moyenne de 2 évaluateurs, 0 à 4)

| #   | Problème                                                                                                                                 | Gravité | Personas      | Cause dans le code                                                                                                                                                                                                               | Recommandation                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2  | Planifier une émission introuvable ; le centre de coût n'a ni date ni renommage                                                          | 3,5     | Malik         | Planification seulement dans Financements ; aucun lien depuis Budgets / un centre de coût (`app/(app)/app/finance/budgets/[kind]/[id]/page.tsx`) ; `finance_cost_centers` sans date ni édition (`lib/finance/budget-actions.ts`) | Lien « Planifier une émission » sur Budgets et sur la page d'un centre ; « Modifier » (nom) sur un centre ; nommer la section « Financements et émissions »     |
| P1  | Dépense sans projet ni artiste impossible à saisir                                                                                       | 3       | Malik         | Textes du champ « Pour » (`lib/i18n/fr/budget.ts:145-148`) ; « Hors budget » ajouté en fin de liste (`lib/budget/target-actions.ts`)                                                                                             | Libellés « projet, artiste, centre de coût ou hors budget » ; « Hors budget » visible en tête pour la Finance et trouvé par « structure », « loyer », « aucun » |
| P7  | Proposition de rapprochement tronquée : on valide sans voir                                                                              | 3       | Élise         | Colonne proposition masquée / tronquée en étroit (`components/finance/transactions-table.tsx`)                                                                                                                                   | En étroit, la proposition sous la transaction, en entier, avant « Valider »                                                                                     |
| P8  | Accueil DG « Rien ne vous attend » malgré une alerte Finance urgente                                                                     | 3       | Claire        | Le résumé de l'accueil ignore les alertes Finance (`lib/i18n/fr/assistant.ts:512` et son calcul)                                                                                                                                 | Une ligne « Finance : 1 alerte urgente » pour qui lit Finance                                                                                                   |
| P9  | Création d'un collectif : titre créé absent du champ, erreur muette, 2 « Titre sans nom » non demandés, invités non rattachés aux titres | 3       | Claire        | `components/projects/collective-fields.tsx`, `create-project-form.tsx` (Maël)                                                                                                                                                    | Insérer le titre créé dans le champ ; message d'erreur visible ; dire d'où viennent les titres prévus ; rattacher un invité à son titre                         |
| P3  | Deux Espace rapides (défilement clavier) ouvrent PO micro en écoute                                                                      | 2       | Malik         | `components/assistant/assistant-launcher.tsx:46-63`                                                                                                                                                                              | Raccourci avec modificateur, ou ignoré quand la page défile / après une touche de navigation                                                                    |
| P4  | Contour de focus invisible aux premiers Tab ; ~15 Tab avant le contenu                                                                   | 2       | Malik         | Pas de lien d'évitement dans la coquille                                                                                                                                                                                         | Lien « Aller au contenu » et focus visible dès le premier Tab                                                                                                   |
| P5  | Dire « facture émise et envoyée » : pas de geste direct, ligne non cliquable                                                             | 2       | Élise         | « Marquer envoyée » seulement à l'état Brouillon (`components/finance/incomes-table.tsx:148`)                                                                                                                                    | « Saisir la facture » dans « ⋯ » d'une entrée prévue ; ligne cliquable vers la modification                                                                     |
| P6  | Étroit : tableau coupé à droite, onglet Exports caché au bout des onglets                                                                | 2       | Élise, Claire | `SectionTabs` défilant sans indice ; tableaux larges                                                                                                                                                                             | Ombre / flèche de défilement sur les onglets ; colonnes masquées plus tôt                                                                                       |
| P10 | « Projets » vide sans bouton ni explication pour un business manager / chef de projet                                                    | 2       | Lina, Malik   | `lib/i18n/fr/shell.ts:118, 221`                                                                                                                                                                                                  | « Les projets que la direction vous confie apparaissent ici »                                                                                                   |
| P11 | Suivi du master d'un collectif réduit à « Master : À mixer »                                                                             | 2       | Claire, Lina  | Page « Titres et artistes » (Maël)                                                                                                                                                                                               | Lien vers le Master du titre depuis sa ligne                                                                                                                    |
| P13 | « Entrée prévue » mal compris                                                                                                            | 2       | Élise         | `lib/i18n/fr/treasury.ts` (`incomes.add`)                                                                                                                                                                                        | « Argent attendu » ou « Nouvelle recette »                                                                                                                      |
| P12 | L'export des factures ne dit pas sa période                                                                                              | 1       | Claire        | `lib/finance/exports.ts` (tout l'historique)                                                                                                                                                                                     | Dire « tout l'historique » ou proposer l'année                                                                                                                  |
| P14 | Calendrier qui recouvre le champ suivant                                                                                                 | 1       | Élise         | Champ date natif                                                                                                                                                                                                                 | Cosmétique                                                                                                                                                      |

Évaluateurs d'accord à 1 point près (P2 : 3 et 4) ; aucun désaccord de 2 points.

## Ce qui marche

- Lire la situation : solde, solde à 90 jours, point bas, budget dépassé et sa page détaillée (Élise, Malik, Claire).
- Rapprochement en un clic quand la proposition est juste (Élise T3, vérifié en base).
- Création d'un projet collectif avec deux titres (Claire T3, malgré les frictions de P9).

## Nettoyage

Supprimé et vérifié par requête : centre de coût « PDS MIC 18 décembre » (Malik), rapprochement 1 080 € (Élise),
facture Renault remise à vide (Élise), projet « PDS MIC #9 (test) » (`delete_project_row`), ses 2 masters, leurs
liens d'artistes, événements d'activité, notification à Lina, historique Finance du test. Aucune ligne créée après
le début du test ne reste.
