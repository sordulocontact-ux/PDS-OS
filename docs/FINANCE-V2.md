# Finance, nouveau style (d'après Midday)

Pour étendre ce style à toute l'app : `docs/STYLE-FINANCE-PARTOUT.md` (16/11/2026).

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
- **Arrondis légers** : cartes 8 px, champs 6 px, modales 12 px (v2) ; boutons et tableaux du design system (15/11/2026).
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

- **Résumé de la semaine** : la carte « En bref » devient « Résumé de la semaine » (icône de PO). La semaine = aujourd'hui et
  les 6 jours d'avant (Paris). Le résumé regarde **90 jours** quel que soit l'horizon affiché (30/60/90) : il ne change pas
  quand on bascule l'horizon. La page charge donc toujours 90 jours de mouvements ; les cartes restent à l'horizon choisi.
- La phrase du code (secours) garde l'ordre d'avant : passage sous la réserve, puis la semaine, entrées en retard, enveloppe
  à 82 % ou plus, justificatifs, « la réserve tient » ; 3 phrases au plus.

**Retour du 15/11/2026 (Sacha)** : la Vue d'ensemble en cartes-phrases « fait accueil d'une application complète ».
La Vue d'ensemble de Finance redevient une vue globale de la Finance (`CockpitOverview` : solde et courbe, À encaisser,
À payer, Budgets, À surveiller ; horizon, « Ajouter une dépense » et « Nouvelle recette » en haut à droite). Les
cartes-phrases, le résumé de la semaine et « Je veux… » (lots 1 et 7 : `FinanceHome`, `FinanceBriefCard`, `FinanceAsk`)
restent dans le code pour la future vue d'ensemble générale (accueil) ; leur assemblage est la page
`app/(app)/app/finance/page.tsx` du commit `7c071e76`. **Trésorerie** prend le dessin de la page Rapports du proto :
horizon et enveloppe en haut ; le solde et sa courbe seule (réel plein, prévu en tirets, réserve, point bas) ; puis
« Entrées et sorties » par mois comme le proto (`FlowBars`, `monthFlows` : entrées en encre, sorties hachurées, montant
au-dessus, mois à venir plus pâles) à côté des dépenses par poste de l'enveloppe choisie ; puis « Disponible sur les
budgets » (`BudgetsCard`) ; puis le calendrier financier. Historique du 15/11 : la maquette Figma (barres par semaine
sous le solde, puis en deux bandes) a été jugée moins lisible que les barres par mois du proto (Sacha).

## Lots

| Lot | Contenu | État |
| --- | --- | --- |
| 1 | Thème `finance-scope` (tailles, graisses, arrondis) ; navigation à icônes ; **Vue d'ensemble en cartes-phrases** (solde, prévision 30/60/90, point bas et réserve, à encaisser, à payer, budgets, justificatifs, alertes) | fait le 15/11/2026 |
| 2 | Pages de section sans titre visible (h1 pour les lecteurs d'écran, nom gardé sur la page d'une enveloppe) ; action sur la ligne des onglets (Dépenses, Rapprochement, Factures & encaissements) ; tableau Finance dans le thème (en-tête sans bandeau en 13 px gris, filets verticaux, cellules 14 px, montants déjà à droite) | fait le 15/11/2026 ; le total sous une liste filtrée reste à faire (les cartes chiffre de chaque vue donnent déjà la somme) |
| 3 | Fiche latérale Finance (`FinanceSheet` : ↑ ↓, Échap, liste visible dessous) pour une dépense, une opération Qonto, une facture : chiffres, faits, gestes de la ligne, historique de l'enregistrement (`finance_events.row_id`) ; écrans de chargement sans titre (`FinanceLoading`) ; section « Factures & encaissements » renommée « Factures » | fait le 15/11/2026 ; la modification au champ reste à faire (« Modifier » ouvre le formulaire existant) |
| 4 | Page d'un budget : « Reste disponible » en grand avec sa jauge puis la bande des chiffres (`EnvelopeFigures`), camembert légende dessous, **filtre par statut** (`?statut=prevu|engage|facture|paye`) qui pilote postes et lignes ; Trésorerie et Financements déjà conformes (calendrier avec le solde après chaque mouvement, changer la date d'une émission dans `ShowsTable`) | fait le 15/11/2026 |
| 5 | Graphiques lisibles (axes et mois en gris secondaire, 13 px) ; **barre du haut** de toute page Finance (`FinanceTopbar`) : recherche **⌘K** (`FinanceSearch` : pages, budgets, dépenses, factures, par nom, montant ou numéro ; une dépense ou une facture s'ouvre dans sa fiche par `?ouvrir=`) et **cloche** des alertes avec leur nombre, rouge si l'une est grave ; lus après l'affichage (`readFinancePulse`, gardé 60 s), alertes calculées par `loadFinanceWatch` comme la page Alertes | fait le 15/11/2026 |
| 6 | Boîte à justificatifs : section « Justificatifs » (dépôt par bouton ou glisser-déposer partout sur la page, adresse po+justificatifs@, lecture vérifiée, rattachement proposé par le code, grille / liste, fiche latérale) | fait le 15/11/2026 ; reste : WhatsApp, blocage d'un expéditeur, « Autres documents » en onglet, rapprochement d'un justificatif avec une opération bancaire |
| 7 | PO dans Finance : « Je veux… » sous les actions rapides (suggestions selon le poste, champ « Je veux… », ouvre PO avec la question posée) ; carte « Résumé de la semaine » rédigée par PO à partir des chiffres du code, vérifiée par le code, en cache par jour (`finance_briefs`) ; lecture `finance` de PO | fait le 15/11/2026 ; la suggestion « voir ce que change le décalage de l'émission #10 » du proto (poste Finance) n'est pas reprise : PO ne simule pas un décalage |
| 8 | Planning : le mois en calendrier (Sacha 15/11/2026, mieux que la liste par mois du proto) | fait le 15/11/2026 ; reste le détail des dépenses payées passées (agrégées par jour) |
