# Finance, nouveau style (d'après Midday)

Décision de Sacha du 15/11/2026 : développer dans l'app le style du proto
`docs/protos/finance-midday.html`, version **v8** (sélecteur « Version » du proto). Analyse et origine :
`docs/ANALYSE-MIDDAY.md`. Ce document dit **quoi construire, dans quel ordre**, et ce qui est déjà fait.
Les règles métier ne changent pas : le ticket « Cockpit Finance » d'Ibé (13/11/2026) fait foi sur les
informations, les calculs restent dans `lib/finance/` (aucun chiffre écrit par l'IA).

## Ce qu'est le style v8

- **Une seule encre, des filets fins** : la couleur ne dit que la donnée (entrée, retard, sous la réserve) et
  les tons d'état de l'app ; gris et bordures de `app/globals.css` (v5).
- **Plus petit, plus léger** : texte courant 15 px, cellules 14 px, légendes 13 px ; regular par défaut, medium
  pour ce qui ressort (v3-v5). Titres en Google Sans Flex.
- **Arrondis légers** : cartes et tableaux 8 px, boutons et champs 6 px, modales 12 px (v2).
- **Pas de titre ni de phrase d'intro sur une liste** : la barre d'outils d'abord (recherche à gauche, filtre
  segmenté et actions à droite).
- **Vue d'ensemble en cartes-phrases** (v6, v8) : chaque carte dit une chose avec son chiffre en gras et mène à
  sa page ; la carte « En bref » est seule, sans pile de feuilles (v8).
- **Graphiques lisibles** (v7) : dessinés à la taille de leur carte, textes 13 px, légende sous le camembert (v4).
- **Détail d'une ligne en fiche latérale** (↑ ↓ pour enchaîner, modification au champ, historique) : écart voulu
  à « une seule modale » (07/11), limité à Finance.

## Comment c'est fait

**Un thème de section, pas des composants recopiés.** `FinanceFrame` pose la classe `finance-scope` ; dans
`app/globals.css`, ce bloc redéfinit les variables qui pilotent déjà tous les composants (`--type-*`,
`--font-weight-*`, `--radius-*`), comme `:root.dark` redéfinit les couleurs. `Button`, `DataTable`, `Field`,
`MetricCard`… prennent donc le style Finance sans changer de code. Les modales et menus, posés en portail hors
de la page, gardent le style de l'app.

## Lots

| Lot | Contenu | État |
| --- | --- | --- |
| 1 | Thème `finance-scope` (tailles, graisses, arrondis) ; navigation à icônes ; **Vue d'ensemble en cartes-phrases** (solde, prévision 30/60/90, point bas et réserve, à encaisser, à payer, budgets, justificatifs, alertes) | fait le 15/11/2026 |
| 2 | Listes sans titre, barre d'outils d'abord ; tableau Finance (filets fins, montants à droite, état point + mot) sur Dépenses, Rapprochement, Factures & encaissements, Budgets, Exports ; total sous une liste filtrée | à faire |
| 3 | Fiche latérale Finance (↑ ↓, Échap, modification au champ, historique) pour une dépense, une opération Qonto, une facture | à faire |
| 4 | Page d'un budget (chiffres, filtre par statut qui pilote tout, camembert légende dessous) ; Trésorerie (solde après chaque événement, déplacer une émission) ; Financements | à faire |
| 5 | Graphiques lisibles ; recherche ⌘K et cloche d'alertes de Finance | à faire |
| 6 | Boîte à justificatifs (dépôt partout, adresse e-mail, lecture vérifiée, rattachement proposé) : `docs/ANALYSE-MIDDAY.md` § 7.2 | à faire |
| 7 | PO dans Finance : « Je veux… », résumé de la semaine rédigé par PO à partir des chiffres du code | à faire |
