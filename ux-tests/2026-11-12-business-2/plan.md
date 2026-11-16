# Plan — second passage (12/11/2026, après le commit 79b0c855)

Serveur : `pnpm start` (build de production) sur http://localhost:3001, base locale Docker.
But : vérifier les corrections, et que le parcours PDS MIC (projet collectif → deal d'un invité →
négociation → validation → budget) s'enchaîne sans accroc ni lenteur.

| Persona | Tâche                                                        | Succès vérifiable                                         |
| ------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Claire  | C1 créer « PDS MIC 5 » avec Kaya Mendès, Ama Prism, La Fève  | projet collectif, artiste principal PDS, 3 participations |
| Claire  | C2 négo de Kaya Mendès sur son titre, confiée à Malik        | deal avec participation_id, assignee Malik                |
| Claire  | C3 valider l'accord de Lila Vega (45 % / 10 000 €)           | agreement validated                                       |
| Claire  | C4 reste du budget de Mona Lys en partant des dépenses       | lit le reste via la carte d'enveloppe                     |
| Malik   | M1 ce qui est nouveau aujourd'hui                            | cite le deal Kaya Mendès                                  |
| Malik   | M2 Kaya d'accord 30 % master, cachet 3 000 € → faire valider | 2 termes confirmés, agreement pending en un geste         |
| Malik   | M3 taxi 45 € pour Kaya Mendès                                | budget_line Kaya 4500 transport                           |
| Élise   | E1 négocier avec Ama Prism (PDS MIC 5)                       | comprend qui ouvre un deal (dialogue)                     |
| Élise   | E2 téléphone de Yasmine Ould                                 | comprend « privé », pas de « non renseigné »              |
| Élise   | E3 reprendre Rivo Blanc                                      | comprend que la direction ouvre un nouveau deal           |
| Élise   | E4 reprendre Lila Vega : où en est-on, prochain call         | dit l'étape, voit jour et heure du call                   |
| Lina    | L1 où en est la négo de Mona Lys, qui la mène (clavier)      | négociation, Malik                                        |
| Lina    | L2 300 € coaching pour Mona Lys                              | budget_line Mona 30000 coaching                           |
| Lina    | L3 dépensé et reste pour Mona Lys                            | montants lus                                              |
