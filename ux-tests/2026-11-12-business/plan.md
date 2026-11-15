# Plan du test — Business et Budget (12/11/2026)

## Questions de recherche

1. Un négociateur sait-il, dès l'accueil, quels deals demandent une action aujourd'hui ?
2. Peut-on noter le résultat d'un appel (contre-proposition, accord oral, prochaine relance) sans se tromper d'état ?
3. La direction comprend-elle ce qu'elle doit valider, et le valide-t-elle en confiance ?
4. Les règles de droits (contact privé, ouverture d'un deal, deal abandonné) sont-elles compréhensibles quand on s'y heurte ?
5. Saisir et suivre une dépense d'artiste par rapport à son enveloppe est-il évident, y compris au clavier ?

## Tâches et critères (jamais montrés aux testeurs)

### Malik (business manager)

| Tâche | Scénario                                                                                          | Succès vérifiable                                                                                              | Chemin optimal |
| ----- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------- |
| M1    | Première impression de l'accueil : qu'as-tu à faire aujourd'hui ?                                 | Cite la relance en retard de Mona Lys                                                                          | 0              |
| M2    | Camille refuse 18 % de royalties, demande 20 % ; accepte l'avance de 15 000 € ; rappeler vendredi | deal_terms royalties = 200000 en counter_proposal (ou équivalent) ; next_action_on = vendredi (13/11 ou 20/11) | 8              |
| M3    | Retrouver quand est le call avec la manageuse de Lila Vega et son numéro                          | Dit « dans 3 jours à 11 h » et 06 11 42 87 30                                                                  | 3              |
| M4    | Accord oral pour Lila Vega : 45 % master, 10 000 € d'avance, à faire valider                      | master_split 450000 confirmed, advance 1000000 confirmed, stage agreement en attente                           | 10             |
| M5    | 120 € de taxi payés pour Mona Lys                                                                 | budget_line Mona Lys 12000, transport                                                                          | 6              |

### Élise (business)

| E1 | Ouvrir une négociation pour Kaya Mendès | Impossible par droits : succès = comprend qu'il faut la direction | 3 |
| E2 | L'accord proposé pour Nahel Nuit est-il validé ? que faire ? | Dit « en attente de la direction (Claire) » | 2 |
| E3 | Trouver le téléphone de Yasmine Ould | Coordonnées masquées : succès = comprend qu'elle est privée et à qui demander | 3 |
| E4 | Rivo Blanc revient : reprendre la négociation | Pas de reprise possible : succès = comprend quoi faire (demander à la direction) | 3 |

### Claire (DG)

| C1 | Valider l'accord de Nahel Nuit s'il correspond à 40 % / 20 % / cachet 8 000 € | Accord validé (deal_events) | 4 |
| C2 | Confier le deal de Lila Vega à Élise pendant les vacances de Malik | assignee = Élise | 4 |
| C3 | Reste de l'enveloppe 2026 de Mona Lys, puis ajouter 5 000 € au coaching | Dit 39 220 € (40 000 − 780) ; poste coaching 500000 | 7 |
| C4 | Sortir le document récapitulatif de l'accord de Mako Rouge pour l'avocat | Deal memo de Mako Rouge créé ou exporté en PDF | 4 |

### Lina (cheffe de projet, clavier et arbre d'accessibilité)

| L1 | Où en est la négo de Mona Lys pour Minuit pile, et qui la mène ? | Dit « en négociation, Malik » | 4 |
| L2 | 300 € pour 2 séances de coaching vocal de Mona Lys | budget_line Mona Lys 30000 coaching | 6 |
| L3 | Combien a déjà été dépensé pour Mona Lys cette année ? | 780 € (1 080 € avec L2) | 3 |

## Matrice de couverture

|                 | Malik     | Élise       | Claire     | Lina                      |
| --------------- | --------- | ----------- | ---------- | ------------------------- |
| Aisance         | 3         | 4           | 2          | 4 (clavier)               |
| Motivation      | tâche     | technologie | tâche      | tâche                     |
| Auto-efficacité | moyenne   | haute       | basse      | haute                     |
| Risque          | tolérant  | tolérant    | averse     | averse                    |
| Information     | sélectif  | sélectif    | exhaustive | exhaustive                |
| Apprentissage   | bricolage | bricolage   | processus  | processus                 |
| Fenêtre         | 1366×768  | 1440×900    | 1280×800   | 1440×900, clavier + arbre |
| Âge             | 38        | 27          | 56         | 34                        |

Hypothèses : app interne desktop-first (pas de mobile testé) ; e-mails non testés ; les testeurs se connectent par la barre « Voir comme » (outil de pré-prod, absent pour les vrais utilisateurs).
