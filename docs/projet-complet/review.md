# Inventaire — Marketing › Suivi & bilan (proto ↔ app)

Zone : module `review` du proto (`docs/protos/src/mk.js` l. 211-227, 326-372, 679-683, 711-775, 1946-2041 ;
`docs/protos/src/mk-actions.js` l. 47-60, 108, 271-274 ; scénario `bilan` de `mk-scen.js` l. 98-106 ; fin du
parcours de `docs/protos/tests/marketing.cjs` l. 105-116 ; `host.js` scénario global `after`).
Ticket : « Ticket PO — Marketing / Bilan, validation et clôture » (Drive, doc
`1vC-bERAEH0JnwhfqHvPYPZ_bNn3rnCqvsaVAZA8iKWQ`).
App comparée : `app/(app)/app/projects/[projectId]/review/**`, `.../closure/page.tsx`, `lib/marketing/**`,
`lib/review/`, `components/marketing/{review,closure}/`, `components/review/`, `app/api/projects/[projectId]/marketing-reports/`,
migrations `20261011000601` à `20261011001001`, `lib/i18n/fr/marketing-review.ts`.

Textes exacts relevés en rejouant le proto (Chrome headless, `marketing.html`, scénario « Suivi & bilan : début,
bilan à préparer », rôles Lina Haddad = cheffe de projet `cp`, Claire Morel = DG `dg`) : dumps et captures dans
`scratchpad/review-run/`
(01 à 39, `.txt` + `.png`, script `run.cjs`).

---

## 0. Vue d'ensemble de l'écart

| | Proto | App |
| --- | --- | --- |
| Structure | **Une page** : « Où on en est » (4 phrases cliquables + « Voir le détail » replié), puis le **parcours** à 3 étapes (Bilan provisoire → Réserves → Clôture du Marketing), patron VISION-UX § 4 (spine à gauche, panneau d'étape à droite). | **Trois onglets** `SectionTabs` : Tableau de bord (`/review`), Rapports (`/review/reports`, + `/new`, `/[reportId]`), Clôture (`/review/closure`), sous une ligne « Volet Marketing [badge] · La clôture du projet entier est une décision à part. » Aucun parcours, aucun « Maintenant ». |
| Densité | Simplifiée le 18/10 (« énormément d'information », MARKETING-METIER.md l. 173) : tout le chiffré est replié. | Tout déplié : filtres, 6 groupes de tuiles, « Chiffres relevés par mesure », tableau « ce que les activations apportent au bilan » ; page Clôture à 9 sections. |
| Métier / SQL | — | **Très complet et conforme au ticket** : rapports figés (snapshot SQL + SHA-256), approbations avec séparation des rôles, réserves arbitrées (5 décisions), clôture demandée / décidée / rouverte, garde « lecture contrôlée », audit `marketing_events`, PDF serveur. |

**Conclusion** : le moteur est là (≈ 90 % du métier), c'est la **surface** qui diffère : passer des 3 onglets au
parcours 3 étapes + « Où on en est », replier le chiffré, mettre les décisions en ligne dans les panneaux
d'étape, et brancher les actions sur Travail / Validations / notifications (absent aujourd'hui).

---

## 1. Écrans et étapes du proto, correspondance, écart

Rôles du proto : **Exécute** Lina Haddad (Responsable du projet = `project`), **Coordonne** —, **Valide** Claire Morel
(Validation de la direction = `direction`). Les externes (lien privé) ne voient rien de ce module (vérifié :
Studio Ressac, Léa Moreau). Chargé de production et directrice créative lisent tout sauf le budget.

En-tête commun (toutes étapes) : fil d'Ariane « Néons › Marketing › Suivi & bilan › <étape> », chevrons
Stratégie / Conception / Production / Activations / **Suivi & bilan** (pastille du nombre d'actions), titre
« Suivi & bilan », lien « Qui fait quoi », ligne de faits « Néons · Mona Lys · Single · Budget 25 000 € HT ·
Responsable Lina Haddad · Sortie Sam. 05/12/2026 ». En pied de panneau : « Signaler un blocage », « Noter une
information » (briques communes, hors zone).

### 1.1 Carte « Où on en est » (au-dessus du parcours, `dashboard()` mk.js l. 1993)

**Proto**
- Titre « Où on en est », à droite « Calculé à l'instant ».
- Quatre lignes-boutons avec chevron `›` (`data-act="dashopen"`) :
  1. « 5 activations sur 5 clôturées » (+ sous-ligne « dont N annulée(s) » si annulées) → modale `all`.
  2. « Preuves : 4 vérifiées, 1 à vérifier[, N manquante(s)] » (ou « Preuves : aucune activation réalisée ») →
     modale « Preuves » : règle « La preuve de chaque activation réalisée : vérifiée, à vérifier ou manquante. »
     + une ligne par activation (titre, « Vérifiée » / « Fournie, non vérifiée »…).
  3. « Statistiques : 5 relevées[, N manquante(s)][, N indisponible(s)] » → modale « Statistiques » (dernier
     relevé de chaque activation réalisée).
  4. « Budget : 18 150 € HT engagés sur 25 000 € HT » + sous-ligne « Visible de la cheffe de projet et de la
     direction » — **seulement pour cp et dg** → modale « Budget · Engagé · 18 150 € HT », règle « Devis validés
     et rémunérations acceptées. », lignes « Clip officiel · devis V2 — 17 200 € HT », « Léa Moreau — 950 € HT ».
- « Voir le détail » (`<details>` replié) : par groupe, tuiles cliquables (`dtile`) libellé + nombre :
  **Activations** (Activations, À préparer, À réaliser, À prouver, À mesurer, À clôturer, Clôturées, Annulées —
  les phases de la frise des activations), **Publications** (Déclarées, Vérifiées, Liens manquants),
  **Retombées** (Déclarées, Vérifiées, À vérifier), **Statistiques** (Déclarées, Vérifiées, Partielles,
  Indisponibles), **Budget** (Estimé, Engagé, Payé administrativement — cp/dg), **Réserves** (Ouvertes,
  Arbitrées, Levées, Suivies après clôture). Chaque tuile ouvre la modale « Groupe · Libellé · valeur »,
  « Règle de calcul : … », la liste des éléments (ou « Aucun élément. »).
- Sans activation : « Aucune activation pour l'instant : le bilan se remplit au fil des activations. »
- Pas de filtres (le code `dfType/dfResp` existe mais n'est plus rendu depuis la simplification du 18/10).

**App** : `review/page.tsx` + `lib/marketing/dashboard.ts` (`computeDashboard`, `FIGURE_GROUPS`, règles v1),
`lib/marketing/dashboard-data.ts`, `components/marketing/review/{dashboard-figures,dashboard-filters,figure-detail,metric-totals}.tsx`,
`components/activations/activations-review.tsx`, vues SQL `marketing_review_activations` / `marketing_review_evidence`
(`20261011000601`). Texte : `fr.marketingReview.dashboard`.
- Pas de « Où on en est » ni des 4 phrases. À la place : description + « Calculé le … à … · règles de calcul v1 »,
  barre de filtres (Du, Au, Type, Responsable, Statut, Déclaré par, Vérification, Réserve), **tous les groupes
  dépliés** en `StatTiles`, détail d'un chiffre en section de page (`?detail=`), « Chiffres relevés par mesure »,
  puis la carte « ce que les activations apportent au bilan » (statut, preuve, mesure, réserves par activation).
- Groupe Activations = statuts `planned / in_progress / done / cancelled` (la vue SQL fusionne `done_declared`
  et `closed` en `done`) : **pas de « clôturée »**, pas de phases de frise.

**Écart : DIFFÉRENT (parcours, densité, mots, design) — M.**
- Ajouter `components/marketing/review/standing-card.tsx` (« Où on en est », 4 `CardRow`/lignes avec chevron)
  calculé par une fonction pure `lib/marketing/review/standing.ts` à partir de `loadActivationsBoard`
  (`ActivationSummary.status` brut avec `closed`, `.proof`, `.measure`) et de `project.budgetCents` +
  `budgetTotals().committedCents` (déjà lus par `loadDashboardInput`). **Aucune migration.**
  Correspondance des états : preuves « vérifiées » = `verified | not_expected` ; « à vérifier » =
  `provided_unverified` ; « manquantes » = `to_provide | contested` ; `unavailable` (lien inaccessible) à
  ranger en « à vérifier » (décision à écrire dans `docs/MARKETING-METIER.md`). Statistiques « relevées » =
  `available_declared | available_verified | partial`, « manquantes » = `to_collect` ; **« indisponible »
  n'existe pas dans `MeasureState`** (dépend de la zone Activations, `lib/activations/states.ts`).
- Replier `DashboardFigures` sous « Voir le détail » (`CollapsibleSection`), y déplacer `DashboardFilterBar`
  (ticket : filtres demandés ; proto : retirés) — à signaler à Sacha.
- Détail d'un chiffre : passer de la section `?detail=` à la **modale verre** (`Dialog`) comme le proto ; garder
  la règle de calcul et la liste.
- Groupe Activations par **phase de frise** (À préparer… Clôturées, Annulées) : dépend de la frise de la zone
  Activations (aucune notion de phase dans `lib/activations/`). En attendant, mapper les statuts bruts.
- **EN TROP** : `MetricTotals` (« Chiffres relevés par mesure ») et `ActivationsReview` sous le tableau de bord —
  absents du proto, la même info est dans le rapport et sur la page Activations → retirer de cette page (S).
- Libellé tuile budget « Payé » → « Payé administrativement » (proto et ticket) (S).

### 1.2 Étape 1 — « Bilan provisoire » (`bi1`)

**Proto**
- Spine : « Bilan provisoire » ; sous-titre selon l'état : « À vous · Lina Haddad · préparer la version 1 du bilan »
  (rien avant le jour de sortie : `relDay(0)`), « soumettre le bilan à validation », « Claire Morel · approuver le
  bilan provisoire » ; une fois fait : « V2 approuvée avec réserves ».
- Panneau : titre, pastille « En cours » / « Fait », pourquoi : « Un rapport figé à une date, calculé par le code.
  La direction l'approuve, même avec des activations encore ouvertes ; approuver ne vérifie ni ne clôture rien. »
  Faits : Exécute Lina Haddad / Responsable du projet · Coordonne — · Valide Claire Morel / Validation de la
  direction · Prérequis « ✓ Activations › Leviers à préparer » · Ensuite « Réserves ».
- **Préparer (cp)** — bloc « Préparer la version N » :
  - « Résumé exécutif * » (placeholder « Ce qu'il faut retenir de la campagne ») ; erreur « Écrivez le résumé
    exécutif. »
  - « Recommandations » (placeholder « Pour la prochaine sortie »).
  - « Ce qui manque » + « Relevé par le code ; ces points deviendront des réserves du bilan. » + puces, une par
    activation : « <titre> : annulée (« motif ») », « <titre> : pas encore clôturée (<état>) », « <titre> : preuve
    non vérifiée », « <titre> : statistiques indisponibles », plus l'objectif de la Stratégie à horizon :
    « Streams à 4 semaines : lus après le Sam. 02/01/2027 ».
  - « Options du rapport » replié : « Du * » / « Au * » (pré-remplis 01/11/2026 et aujourd'hui ; erreurs « Le
    début de la période. », « La fin de la période. », « La fin doit suivre le début. ») ; « Périmètre » (case par
    activation cochée, « · clôturée / annulée / à <phase> », note « Une activation décochée est exclue et nommée
    dans le rapport. ») ; « Sections » (8 cases cochées, la 1re verrouillée : Résumé exécutif et périmètre ·
    Objectifs et stratégie source · Récapitulatif des activations · Résultats déclarés et vérifiés · Statistiques
    · Budget · Écarts, réserves et recommandations · Annexes : preuves et liens) ; « Réserves à inclure » (une case
    par point de « Ce qui manque », « · Preuves / Statistiques… »).
  - Bouton « Générer la version N » → toast/bandeau « Version N générée ».
- **Rapports** (titre « Rapports ») : une carte de version par rapport, la plus récente ouverte : « Bilan Marketing —
  Néons — V1 », pastille d'état (Généré / À valider / Bilan provisoire approuvé / Corrections demandées / Validation
  reportée), « Généré par Lina Haddad le 05/01, 10:09 », faits : Résumé exécutif · Période « du Dim. 01/11/2026 au
  Mar. 05/01/2027 » · Périmètre « 5 activations[ · N exclue(s)] » · Réserves « 2 » / « Aucune » · Empreinte
  « a3929702 · règles de calcul v1 » ; commentaire du décideur ; bouton « Voir le rapport » (modale).
- **Soumettre (cp)** : bouton « Soumettre à Claire Morel » (sans confirmation) ; toast « Bilan soumis à
  validation ». La DG voit avant : « En attente de Lina Haddad : soumettre le bilan à validation ».
- **Décider (dg)** : bloc « Votre décision », « Commentaire » (placeholder « Obligatoire pour demander des
  corrections ou reporter »), trois boutons : « Approuver le bilan provisoire avec réserves » (sans « avec
  réserves » s'il n'y en a pas), « Demander des corrections », « Reporter la validation » ; erreur « Dites
  pourquoi. ». La cp voit « En attente de Claire Morel : approuver le bilan provisoire ».
- Corrections / report : bandeau « Claire Morel (demander des corrections) : « … » » ; la cp prépare la
  version suivante (**dans le proto, « Reporter » rouvre aussi la préparation d'une nouvelle version**).
- Approuvé : les points de la version deviennent les réserves (étape 2) ; résultat « Bilan provisoire approuvé ».
- **Modale « Voir le rapport »** (`reportModal`) : titre « Bilan Marketing — Néons — V1 », faits Statut / Période /
  Périmètre (« exclues : … ») / Généré / Empreinte « … · règles de calcul v1 · figé à la génération », puis les
  8 sections (budget seulement cp/dg), notes « Brief de sortie V1. », « Déclaré et vérifié restent séparés : une
  déclaration n'est jamais comptée comme vérifiée. », « Chaque relevé garde sa période, sa plateforme et sa source ;
  ils ne s'additionnent pas. », « Rien à signaler. » ; boutons « Exporter en PDF » (impression) et « Fermer ».

**App**
- Préparation : page à part `review/reports/new/page.tsx` + `components/marketing/review/report-preparation.tsx`
  (283 l.) + `reserve-draft-list.tsx` ; calcul pur `lib/marketing/reports/prepare.ts` ; action
  `lib/marketing/reports/actions.ts` ; snapshot et empreinte SHA-256 par SQL `marketing_report_snapshot` (table
  `marketing_reports`, `20261011000701`, refaite en `…0901`). Titre « Préparer la version N », description, puis
  **tout déplié** : Périmètre (Tout cocher / Tout décocher), « Période (facultative) », Sections, Résumé exécutif,
  Recommandations, « Avant de générer » (Données manquantes / Incohérences / Activations exclues / « Rien à
  signaler. »), « Réserves proposées » **agrégées par catégorie** (« Vérifier les liens de publication (N non
  vérifiés…) », « Récupérer les statistiques (…) », « Vérifier les retombées (…) », « Activations non terminées
  (N) »), « Ajouter une réserve » libre, « Déjà ouvertes : reprises telles quelles » ; « Générer la version N » →
  redirige vers la page du rapport.
- Liste : `review/reports/page.tsx` — `DataTable` (Version « Rapport — V1 », État, Générée, Auteur, Empreinte 12
  car.), bouton « Préparer un rapport ».
- Version : `review/reports/[reportId]/page.tsx` — page entière : `ReportView`, méta (« Générée par … », période,
  périmètre, règles, « Empreinte SHA-256 » complète), « Version figée : … », « Comparer avec la version précédente »
  (`ReportComparisonView`, `lib/marketing/reports/compare.ts`), `PdfExportButton` → `app/api/projects/[projectId]/marketing-reports/[reportId]/route.ts`
  (`lib/marketing/reports/html.ts` + `lib/pdf/render.ts`, vrai PDF), et à droite `ApprovalPanel` (« Validation du
  bilan provisoire »).
- Soumettre : `ApprovalPanel` → `ConfirmButton` « Soumettre à validation » (modale « Soumettre cette version à
  validation ? ») ; SQL `submit_marketing_report`.
- Décider : `components/marketing/review/decision-form.tsx` — `ChoiceCards` (Approuver provisoirement / Demander des
  corrections / Reporter la validation, avec conséquences), « Commentaire », **un** bouton dont le libellé suit le
  choix (« Approuver le bilan provisoire avec réserves »…), **désactivé tant que le commentaire obligatoire est
  vide** ; SQL `decide_marketing_report(p_report_id, p_expected_version, …)` (`20261011000801`), table
  `marketing_report_approvals` (réserves gardées en jsonb, préparateur ≠ validateur). « Reporter » = la même
  version pourra être resoumise (conforme au ticket).
- Réserves : créées **dès la génération** (cochées), statut `open` ; l'approbation les fige dans la décision.

**Écart : DIFFÉRENT — M à L.**
- Parcours : déplacer préparation, cartes de versions, soumission et décision **dans le panneau de l'étape**
  (`StepPanel`) au lieu de 3 pages (L avec l'ossature du § 6).
- Préparation : deux champs + « Ce qui manque » en lecture, le reste dans « Options du rapport » replié (réutiliser
  les morceaux de `report-preparation.tsx`, M). « Ce qui manque » **par activation** comme le proto (reformuler
  les `CheckKind` de `prepare.ts` : « <titre> : preuve non vérifiée », « … : pas encore clôturée (<état>) »,
  « … : annulée (« motif ») », « … : statistiques indisponibles ») ; « Réserves à inclure » = mêmes lignes (le
  proto ne regroupe pas par catégorie) — S/M, sans migration (la colonne `category` existe).
- Ligne d'objectif à horizon (« Streams à 4 semaines : lus après le … ») : **MANQUANT**, calculable par le code
  depuis l'objectif mesurable de la Stratégie (`FramingObjective.measure.period`) + date de sortie, seulement si la
  période est exprimée en jours/semaines — S/M, à écrire dans `docs/MARKETING-METIER.md`.
- « Période (facultative) » **viole la règle « jamais le mot facultatif »** (CLAUDE.md, Formulaires 3) ; le proto
  la rend obligatoire et pré-remplie → `required` + pré-remplissage (début = première activation, fin =
  aujourd'hui) — S. Côté SQL la période peut rester nullable.
- Bouton de décision **désactivé** (`decision-form.tsx` l. 98) **viole la règle 4** (pas de bouton désactivé ; erreur
  rouge à la validation) ; idem `closure-forms.tsx` l. 189 — S.
- Décision : trois boutons directs (proto) au lieu de `ChoiceCards` + bouton unique — S.
- « Soumettre à validation » + confirmation → « Soumettre à Claire Morel » direct (nom du validateur) — S.
- Titre de version « Rapport — V1 » → « Bilan Marketing — <projet> — V1 » (déjà le nom du PDF) — S.
- Empreinte : afficher 8 car. « a3929702 · règles de calcul v1 », garder la SHA-256 complète en infobulle — S.
- Rapport : **modale verre** depuis « Voir le rapport » (`ReportView` + « Exporter en PDF » + « Fermer »), chargée
  par `next/dynamic` ; garder la page `/reports/[reportId]` comme lien direct (PDF, comparaison) — M.
- Le proto ne montre la préparation qu'**après le jour de sortie** : ajouter la même condition à l'acteur de
  l'étape (pas un verrou) — S.
- **EN TROP** (vs proto, mais demandés par le ticket) : comparaison de versions (critère d'acceptation « comparée
  à la précédente ») → garder, sur la page du rapport ; « Ajouter une réserve » libre dans la préparation et
  « Proposer une réserve » sur Clôture (ticket : « Contributeur : proposer des réserves ») → garder discret
  (menu « ⋯ » de l'étape Réserves) ; liste `DataTable` des rapports → remplacée par les cartes de versions.
- Écart métier à trancher : « Reporter » dans le proto relance une nouvelle version ; l'app (et le ticket :
  « Rien ne change ») permet de resoumettre la même. **Garder l'app (ticket)**, adapter l'acteur : après un report,
  « Soumettre de nouveau la V<n> ».

### 1.3 Étape 2 — « Réserves » (`bi2`)

**Proto**
- Spine : verrouillée « Après : Bilan provisoire » ; puis « À vous · Lina Haddad · arbitrer 2 réserves »,
  « Lever : <texte> » ; fait : « 2 réserves arbitrées » / « Aucune réserve ».
- Pourquoi : « Chaque réserve est arbitrée : à lever avant la clôture, à suivre après, acceptée comme limite, non
  applicable ou doublon. » Prérequis « ✓ Bilan provisoire », Ensuite « Clôture du Marketing ».
- Sans réserve : « Le bilan approuvé n'a aucune réserve. »
- Une ligne par réserve : catégorie en petit (« Preuves », « Statistiques »), texte en gras ; **formulaire en ligne**
  (cp et dg) : « Arbitrage » (À lever avant clôture · À suivre après clôture · Acceptée comme limite définitive
  [dg seul] · Non applicable · Doublon), « Doublon de » (autres réserves), « Qui suit, et motif » (membre), « À
  suivre pour le » (date, défaut 15/01/2027), « Motif » (placeholder « Obligatoire pour une limite définitive »),
  bouton « Arbitrer ». Erreurs : « Une limite définitive demande un motif. », « Choisissez la réserve conservée. »
- Arbitrée : « À lever avant clôture · arbitrée par Lina Haddad », « À suivre après clôture · Lina Haddad, pour le
  Ven. 15/01/2027 · arbitrée par Lina Haddad », « Doublon de « … » », « · « motif » ».
- À lever : champ « Ce qui l'a levée » + « Marquer levée » (erreur « Dites ce qui l'a levée. ») → « · levée :
  « Lien de la retombée vérifié » ».
- La DG voit le formulaire (avec l'option limite) et « En attente de Lina Haddad : arbitrer 2 réserves ».
- Fait quand le bilan est approuvé et qu'aucune réserve n'est ouverte ni « à lever » non levée.

**App** : section « Réserves » de `review/closure/page.tsx` ; `components/marketing/closure/{reserve-list,reserve-menu,arbitrate-form,add-reserve-button}.tsx` ;
`lib/marketing/closure/reserve-actions.ts`, `lib/marketing/reserves/queries.ts` ; SQL `arbitrate_marketing_reserve`,
`lift_marketing_reserve`, `note_marketing_reserve`, `link_reserve_task`, `create_reserve_task` (`20261011000901`).
- Liste avec badge d'état (À arbitrer, À lever avant clôture, Suivi après clôture, Limite acceptée, Levée, Fermée),
  lignes de suivi ; actions dans un menu « ⋯ » (`RowActions`) → modales : « Arbitrer la réserve » (`ChoiceCards` +
  champs conditionnels : Qui la suit, Échéance, **Canal de suivi** obligatoire, Réserve gardée, Motif obligatoire
  pour limite **et non applicable**), « Lever la réserve » (« Ce qui a été fait »), « Noter le suivi », « Créer la
  tâche dans Travail », « Rattacher une tâche existante ».
- Droits SQL : **seul le responsable du projet arbitre** ; la direction peut seulement « accepter comme limite » ;
  lever = la personne qui suit ou le responsable.

**Écart : DIFFÉRENT (design, parcours) — M.**
- Mettre la liste dans le panneau de l'étape et l'**arbitrage en ligne** (formulaire sous chaque réserve non
  arbitrée, champs conditionnels gardés), « Ce qui l'a levée » + « Marquer levée » en ligne — M (réutiliser
  `arbitrate-form.tsx` hors modale).
- Phrases de résultat au format proto (« À suivre après clôture · Lina Haddad, pour le … · arbitrée par … ») — S.
- Écarts métier, **garder l'app (ticket)** et le signaler : canal de suivi obligatoire (ticket : « propriétaire,
  échéance et canal ») et justification obligatoire pour « Non applicable » (ticket) — le proto ne les a pas.
- Droits : le proto laisse la DG arbitrer tout ; l'app réserve l'arbitrage au responsable (CLAUDE.md : « seul son
  responsable écrit ; le DG lit et valide »). **Garder l'app**, à signaler.
- Ordre : dans l'app les réserves existent dès la génération et peuvent être arbitrées avant l'approbation ; le
  parcours affichera l'étape verrouillée « Après : Bilan provisoire » (prérequis), sans migration.
- **EN TROP vs proto, demandé par le ticket** : « Noter le suivi », « Créer la tâche dans Travail », « Rattacher une
  tâche existante » (ticket écran 4) → garder dans le menu « ⋯ » de la réserve.

### 1.4 Étape 3 — « Clôture du Marketing » (`bi3`)

**Proto**
- Spine : « Après : Réserves » ; « À vous · Lina Haddad · demander la clôture » ; « Claire Morel · clôturer le
  Marketing » ; fait « Clôturé avec réserve » / « sans réserve ».
- Pourquoi : « La direction clôture le volet Marketing. Ensuite on lit seulement, et les preuves restent acceptées.
  Il peut être rouvert, avec un motif. » Ensuite « — ».
- « Avant la clôture » : lignes « Bilan provisoire approuvé — Prêt / Pas prêt », « Réserves arbitrées — Prêt / Pas
  prêt », « N activation(s) pas clôturée(s) : … — Attention », « N réserve(s) suivie(s) après la clôture — Avec
  réserves ».
- cp : « Demander la clôture » (direct, sans note) → « En attente de Claire Morel : clôturer le Marketing ».
- dg : « Votre décision », « Commentaire » (« Obligatoire pour demander des corrections »), boutons « Clôturer avec
  réserves » (ou « Clôturer sans réserve » selon les réserves suivies/limites) et « Demander des corrections »
  (erreur « Dites ce qui doit être corrigé. ») → bandeau « Claire Morel (demander des corrections) : « … » ».
- Clôturé : « **Marketing clôturé avec réserve** par Claire Morel le 05/01, 12:33. Lecture seule : plus de nouvelle
  activation, les preuves restent acceptées. »
- dg, une fois clôturé : bloc « Rouvrir le Marketing », « Motif * » (placeholder « Ex. : retombées presse arrivées
  après la clôture »), bouton « Rouvrir le Marketing » (erreur « Dites pourquoi vous rouvrez le Marketing. ») →
  note « Rouvert par Claire Morel le 05/01, 12:51 : « Retombées presse arrivées après la clôture » », la cp redemande
  la clôture.

**App** : `review/closure/page.tsx` (274 l.) ; `components/marketing/closure/{closure-readiness,closure-decision,closure-forms}.tsx` ;
`lib/marketing/closure/{readiness,status,closure-actions,queries}.ts` ; SQL `request_marketing_closure`,
`decide_marketing_closure`, `reopen_marketing_closure`, `marketing_is_closed`, trigger `marketing_closed_guard`
sur `marketing_activations` et `marketing_reserves`, table `marketing_closures` (`20261011001001`).
- Sections : « Rapport de référence » (« V2 · bilan provisoire approuvé par … le … », « Ouvrir le rapport ») ;
  « Avant la clôture » (« Ce qui bloque » en callouts rouges / « À savoir avant de décider » : activations non
  terminées, engagé non payé / « Rien ne bloque la clôture. ») ; carte « Décision de clôture » (Périmètre exact,
  Réserves qui restent, **liste de 5 conséquences**, bouton-modale « Demander la clôture » avec « Note pour la
  direction », formulaire DG en `ChoiceCards` : Clôturer sans réserve / avec réserves / Demander des corrections /
  **Reporter**, bouton unique désactivé si commentaire manquant, « Rouvrir le Marketing » en modale) ; Réserves ;
  Activations non terminées (tableau) ; Preuves et statistiques (ligne) ; Paiements administratifs (3 tuiles) ;
  Droits et Juridique ; Historique du suivi & bilan.
- Séparation : demandeur ≠ décideur (SQL) ; clôture sans réserve refusée s'il reste des suivis, avec réserves
  refusée s'il n'en reste pas.

**Écart : DIFFÉRENT (densité, design) — M.**
- Panneau d'étape = « Avant la clôture » en lignes Prêt / Pas prêt / Attention comme le proto (réécrire
  `closure-readiness.tsx`, S) ; y ajouter, **demandés par le ticket écran 4**, deux lignes « Attention » :
  engagé non payé, état du Juridique (au lieu des sections Paiements / Droits).
- Décision DG : boutons directs « Clôturer avec réserves » (le libellé choisi par le code, `suggested`) + « Demander
  des corrections » (+ « Reporter » du ticket en bouton discret, à signaler : absent du proto) ; plus de bouton
  désactivé — S.
- « Demander la clôture » : bouton direct (la note devient facultative ou disparaît) — S.
- Bandeau « clôturé » au mot près du proto, réouverture **en ligne** (« Motif * ») au lieu de la modale — S.
- **EN TROP** : carte « Rapport de référence » (le fait « Bilan provisoire approuvé — Prêt » suffit, lien vers la
  version dans l'étape 1), liste des 5 conséquences (le « pourquoi » de l'étape la résume), tableaux Activations non
  terminées / Paiements / Preuves et statistiques, « Historique du suivi & bilan » (`MarketingHistory`) → le
  journal va dans le pied de spine « Historique » comme Production/Juridique — S/M, sans migration.
- Lecture contrôlée : déjà assurée en SQL (garde) ; le proto dit « plus de nouvelle activation » → vérifier que la
  page Activations masque « Nouvelle activation » quand `isMarketingClosed` (zone Activations).

### 1.5 Statut « Volet Marketing » et clôture du projet entier

**Proto** : pas de ligne de statut ; l'état du Marketing passe par le chevron « Suivi & bilan », la sidebar
(point de couleur, pastille), la Vue d'ensemble (« Marketing — En cours — Étape 36 sur 38 · Bilan provisoire — À
vous · préparer la version 1 du bilan »). **Aucune page « Clôture du projet »** dans le proto global.

**App** :
- `review/layout.tsx` : « Volet Marketing [badge] La clôture du projet entier est une décision à part. » —
  **EN TROP** vs proto (S, retirer ; l'état est dans le spine/chevron). `marketingStatus()` reste utile pour
  `lib/workflow-status/rules.ts`.
- `app/(app)/app/projects/[projectId]/closure/page.tsx` (« Clôture du projet » : état de chaque workflow,
  `ReviewForm` résultats / ce qui a marché / à améliorer, validation de l'étape `review` par la direction,
  `MarketingClosureLink`), `lib/review/{actions,queries}.ts`, `components/review/review-form.tsx`, SQL
  `save_project_review` ; lien depuis la Vue d'ensemble (`page.tsx` l. 246, `ListCard` « Clôture du projet »). —
  **EN TROP vs proto**. Le ticket exige seulement que la clôture Marketing **ne déclenche pas** la clôture globale
  (« Projet › Vue globale › Clôture du projet », processus séparé, non décrit). Recommandation : garder la route et
  le SQL (rien ne casse), **retirer la carte de la Vue d'ensemble** tant qu'aucun ticket ne décrit la clôture du
  projet (S) — à confirmer avec Sacha, c'est la zone Vue d'ensemble qui tranche.

### 1.6 Actions dans « Maintenant », Travail, Validations, Accueil, notifications

**Proto** (`A(...)` mk.js l. 745-747, agrégées par `host.js`) :
- cp : « Préparer la version N du bilan » (après la sortie), « Soumettre le bilan à validation », « Arbitrer N
  réserve(s) », « Lever : <texte> », « Demander la clôture ».
- dg : « Approuver le bilan provisoire », « Clôturer le Marketing » (dans Validations).
- Vue d'ensemble (scénario « Après la sortie ») : « À vous — Marketing › Bilan provisoire — Préparer la version 1
  du bilan — Ouvrir ».
- Toasts : « Version N générée », « Bilan soumis à validation », « Bilan provisoire approuvé », « Corrections
  demandées », « Validation reportée », « Réserve arbitrée », « Réserve levée », « Clôture demandée », « Marketing
  clôturé », « Marketing rouvert » ; journal (Activité) : « Bilan Marketing V1 généré », « Bilan V1 soumis à Claire
  Morel », « Réserve « … » : à suivre après clôture », « Marketing clôturé avec réserve », « Marketing rouvert ·
  « … » ».

**App** : aucune référence à `marketing_reports` / `marketing_closures` hors `lib/marketing/**` sauf
`lib/workflow-status/rules.ts` (raison = libellé du statut). **Rien dans Travail, Validations, Accueil ; aucune
notification** (aucun trigger `notifications` dans les migrations review). Audit présent (`marketing_events`,
libellés `fr.marketingReview.events`), toasts présents.

**Écart : MANQUANT — M.**
- Acteurs du parcours (`lib/marketing/review/journey/steps.ts`) exportés vers « Maintenant », Travail, Validations
  et la carte Marketing de la Vue d'ensemble (raison « À vous · préparer la version 1 du bilan »).
- **Migration** `2026101800xx01_marketing_review_notifications.sql` : triggers qui écrivent `notifications` à la
  soumission d'un rapport (→ validateur), à la décision (→ préparateur), à la demande de clôture (→ direction), à la
  décision / réouverture (→ responsable) ; `schedulePendingPushes()` après les actions concernées
  (`lib/marketing/reports/approval-actions.ts`, `lib/marketing/closure/closure-actions.ts`).
- Lien Activité : `marketing_events` à verser dans le journal du projet (`/activity`) si ce n'est pas déjà lu.

---

## 2. Tableau récapitulatif

| # | Écran / étape | App | Écart | Effort | Migration |
| --- | --- | --- | --- | --- | --- |
| 1 | « Où on en est » 4 phrases cliquables | absent (tuiles dépliées) | MANQUANT | M | non |
| 2 | « Voir le détail » replié + modale par chiffre | `DashboardFigures` + `FigureDetail` en page | DIFFÉRENT | S/M | non |
| 3 | Détail par phase de frise | statuts planned/in_progress/done/cancelled | DIFFÉRENT (dépend Activations) | M | éventuelle (vue `marketing_review_activations` : exposer le statut brut) |
| 4 | Filtres du tableau de bord | barre visible | EN TROP vs proto (ticket) → replier | S | non |
| 5 | « Chiffres relevés par mesure », carte activations | `MetricTotals`, `ActivationsReview` | EN TROP | S | non |
| 6 | Parcours 3 étapes (spine, panneau, Maintenant) | 3 onglets | DIFFÉRENT (structure) | L | non |
| 7 | Préparer la version (2 champs + Ce qui manque + Options repliées) | page `/reports/new` dépliée | DIFFÉRENT | M | non |
| 8 | « Ce qui manque » par activation + objectif à horizon | checks + réserves par catégorie | DIFFÉRENT / MANQUANT (horizon) | S/M | non |
| 9 | Période obligatoire pré-remplie | « Période (facultative) » | DIFFÉRENT (règle violée) | S | non |
| 10 | Cartes de versions « Bilan Marketing — Néons — Vn » | `DataTable` « Rapport — Vn » | DIFFÉRENT | S/M | non |
| 11 | « Voir le rapport » en modale + Exporter en PDF | page + PDF serveur | DIFFÉRENT (design) ; PDF app meilleur | M | non |
| 12 | Soumettre à <validateur> | ConfirmButton « Soumettre à validation » | DIFFÉRENT (mots) | S | non |
| 13 | Décision DG 3 boutons | ChoiceCards + bouton désactivé | DIFFÉRENT (règle violée) | S | non |
| 14 | Comparer deux versions | présent | EN TROP vs proto (ticket) → garder | — | non |
| 15 | Arbitrage en ligne, levée en ligne | modales via « ⋯ » | DIFFÉRENT (design) | M | non |
| 16 | Canal de suivi, motif « non applicable » | obligatoires (ticket) | DIFFÉRENT (app = ticket) → garder | — | non |
| 17 | Tâches liées à une réserve | présent | EN TROP vs proto (ticket) → garder dans « ⋯ » | — | non |
| 18 | Avant la clôture (Prêt / Pas prêt / Attention) | blockers/warnings + 6 sections | DIFFÉRENT / EN TROP | S/M | non |
| 19 | Décision de clôture 2 boutons | ChoiceCards 4 choix | DIFFÉRENT | S | non |
| 20 | Réouverture en ligne avec motif | modale | DIFFÉRENT (design) | S | non |
| 21 | Statut « Volet Marketing » en tête | ligne + badge | EN TROP | S | non |
| 22 | Clôture du projet entier | `/closure` + `ReviewForm` | EN TROP vs proto | S (masquer) | non |
| 23 | Actions dans Travail / Validations / Accueil / Vue d'ensemble | absent | MANQUANT | M | non |
| 24 | Notifications (soumis, décidé, clôture) | absent | MANQUANT | M | **oui** (triggers `notifications`) |

**Effort total estimé : 8 à 11 jours** (L pour l'ossature du parcours ≈ 2-3 j ; M × 7 ≈ 6-7 j ; S × ~10 ≈ 2 j),
une seule migration nécessaire (notifications), une éventuelle (statut brut / phase dans la vue, si la zone
Activations n'expose pas déjà la frise).

---

## 3. Briques communes utilisées par la zone

| Brique (proto) | Dans l'app | Où |
| --- | --- | --- |
| Parcours : spine, « À vous · … », « Après : … », panneau d'étape (Exécute / Coordonne / Valide / Prérequis / Ensuite), « Maintenant » | **existe** | `lib/ui/journey.ts`, `components/shell/journey/{journey-spine,step-panel,now-card}.tsx` ; modèles d'usage `lib/production/journey/*`, `components/legal/legal-step-frame.tsx`. À instancier pour la review. |
| Chevrons du Marketing (Suivi & bilan) | existe | `components/projects/section-steps.tsx`, `lib/ui/marketing-steps.ts`, `lib/ui/workflow-hrefs.ts` (step `review`) |
| Fil d'Ariane « Néons › Marketing › Suivi & bilan › <étape> » | existe (labels par route) | `lib/ui/project-sections.ts` ; ajouter les labels des 3 étapes |
| « En attente de <qui> : <quoi> » | existe | `fr.journey.waitFor` (`lib/i18n/fr/journey.ts`), rendu par `StepPanel`/`NowCard` |
| Faits d'une version (Résumé, Période, Périmètre, Réserves, Empreinte) | existe | `FactTable` / `FactList` (`components/ui/fact-table.tsx`, `fact-list.tsx`) |
| Carte de version repliable avec pastille | **dupliquée par domaine** | `components/design/direction/version-card.tsx`, `components/design/sheets/sheet-version-card.tsx`, `components/production/post/version-card.tsx` → 3e domaine : **remonter un `VersionCard` générique dans `components/ui/`** (règle « deux fois = un composant ») |
| Décision avec motif (Approuver / Corrections / Reporter ; commentaire obligatoire sauf approbation) | existe en plusieurs exemplaires | `components/marketing/review/decision-form.tsx`, `components/marketing/closure/closure-forms.tsx`, `components/production/post/decision-form.tsx`, `components/strategy/documents/DecisionForm`, `components/ui/reason-form.tsx` (modale) — à aligner sur le proto (boutons directs, erreur rouge, jamais désactivé) |
| Modale verre (détail d'un chiffre, rapport) | existe | `components/ui/dialog.tsx` (`.surface-glass`), `FormDialog`, `ConfirmDialog`, `DialogButton` |
| Lignes cliquables avec chevron (« Où on en est ») | existe | `ListCard` / `CardRow` (`components/ui/list-card.tsx`, utilisé par la Vue d'ensemble) |
| Tuiles chiffrées | existe | `StatTiles` (`components/ui/stat-tiles.tsx`, `href` + `view`) |
| Repli « Voir le détail », « Options du rapport » | existe | `components/shell/collapsible-section.tsx` |
| Pastilles d'état | existe | `StatusBadge` + `lib/ui/state-tones.ts` (`marketingReportTone`, `marketingReserveTone`, `marketingStatusTone`) |
| Export PDF | existe | `PdfExportButton` + `lib/pdf/render.ts` + route `marketing-reports/[reportId]` |
| Toast / écriture | existe | `useWriteSubmit` (`components/ui/use-write-submit.ts`) |
| Historique en pied de spine | existe (Production, Juridique) | `components/marketing/marketing-history.tsx` à brancher en pied de `JourneySpine` |
| Formulaire de call commun, compte rendu, résumé aux participants, Confirmer/Modifier/Écarter, cartes « Recommandé », pages privées triées | **non utilisés par cette zone** | — |

---

## 4. Simulations du proto et vrais événements

Aucun bouton pointillé « Proto : … » dans le module review. Ce qui est simulé :

| Simulation | Vrai événement de l'app |
| --- | --- |
| Scénario « bilan » : 4 semaines après la sortie, toutes les activations clôturées avec preuves et relevés (`mk-scen.js` l. 98-106) | Les responsables clôturent leurs activations, déposent preuves et relevés (`activation_evidence`, `activation_metrics`, vérifications) dans la zone Activations ; le tableau de bord les lit par les vues `marketing_review_*`. |
| Horloge du proto (`S.base` = 05/01/2027) qui ouvre la préparation après la sortie | Date du serveur comparée à la date de sortie du projet (jamais la date du jour dans un prompt : c'est du code). |
| Empreinte FNV-1a 8 hexa calculée dans le navigateur | SHA-256 calculée par la base sur le snapshot (`marketing_reports.content_hash`). |
| « Exporter en PDF » = `window.print()` | `GET /api/projects/[projectId]/marketing-reports/[reportId]` → PDF Playwright (`lib/pdf/render.ts`), nom « Bilan Marketing — <projet> — Vn.pdf ». |
| « Voir comme » (changer de rôle) | Session réelle ; droits SQL : responsable (`is_project_owner`) prépare / soumet / arbitre / demande ; permission `validate` décide / accepte une limite / rouvre ; séparation préparateur ≠ validateur, demandeur ≠ décideur. |
| Ligne figée « Streams à 4 semaines : lus après le Sam. 02/01/2027 » | À calculer depuis l'objectif mesurable de la Stratégie et la date de sortie (aujourd'hui absent). |
| Toasts / journal | Toasts `useWriteSubmit` + `marketing_events` ; **notifications et push à créer** (§ 1.6). |

---

## 5. Points à signaler à Sacha (décisions prises dans ce cahier)

1. Filtres du tableau de bord : retirés du proto le 18/10, demandés par le ticket → proposés **repliés dans « Voir
   le détail »**.
2. « Reporter la validation » : le ticket dit « rien ne change » (même version resoumise) ; le proto prépare une
   nouvelle version → **app/ticket gardé**.
3. Canal de suivi obligatoire, justification d'un « Non applicable », « Reporter » une clôture : ticket, absents du
   proto → **gardés**.
4. Arbitrage par la DG : le proto le permet, l'app le réserve au responsable (règle « seul le responsable écrit »)
   → **app gardée**.
5. Réserves libres et tâches liées : ticket, absentes du proto → gardées dans un menu « ⋯ ».
6. Page « Clôture du projet » (`/closure`) : hors proto ; proposée **masquée de la Vue d'ensemble** (route gardée).
7. Preuve « lien inaccessible » (`unavailable`) comptée « à vérifier » dans « Où on en est » ; statistiques
   « indisponibles » dépendent d'un état à ajouter côté Activations.

---

## 6. Découpage proposé en sous-lots (ordonnés, chacun livrable et testable seul)

**Lot R1 — Ossature du parcours (L, ≈ 2-3 j, sans migration)**
- `lib/marketing/review/journey/{types,steps,load,href}.ts` : 3 étapes `bilan` / `reserves` / `closure`
  (`JourneyStep` de `lib/ui/journey.ts`), état, acteur (« Préparer la version N du bilan » après la sortie,
  « Soumettre… », « Approuver le bilan provisoire », « Arbitrer N réserves », « Lever : … », « Demander la
  clôture », « Clôturer le Marketing »), résumés (« V2 approuvée avec réserves », « N réserves arbitrées »,
  « Clôturé avec réserve »), calculés depuis `listReports`, `loadApprovals`, `loadReserves`, `loadClosures`.
- Routes : `review/page.tsx` (= étape courante), `review/reserves/page.tsx`, `review/closure/page.tsx` (réutilisé),
  un `ReviewStepFrame` sur le modèle de `legal-step-frame.tsx` ; retirer `SectionTabs` et la ligne « Volet
  Marketing » de `review/layout.tsx`. Garder `/review/reports/[reportId]` (lien direct, PDF, comparaison) ; rediriger
  `/review/reports` vers `/review`.
- Textes : `lib/i18n/fr/marketing-review.ts` (titres et « pourquoi » des étapes, mots exacts du proto).
- Test : `marketing.cjs` § 6 rejoué à la main sur la stack locale (cp puis dg).
- Risque : liens existants vers `routes.projectReviewReports` / `projectReviewClosure` (actions
  `revalidatePath`, `workflow-hrefs.ts`, `marketing-closure-link.tsx`) — à garder valides ; `loading.tsx` à ajouter.

**Lot R2 — « Où on en est » + détail replié (M, ≈ 1-1,5 j, sans migration)**
- `lib/marketing/review/standing.ts` (pur) + `components/marketing/review/standing-card.tsx` ; modale verre du détail
  (`FigureDetail` en `Dialog`) ; `DashboardFigures` et filtres dans « Voir le détail » ; retirer `MetricTotals` et
  `ActivationsReview` de la page ; « Payé administrativement ».
- Risque : `MetricTotals` est aussi utilisé par `components/marketing/review/report-view.tsx` (le rapport) → seulement
  le retirer de la page du tableau de bord, ne pas supprimer le composant ; `ActivationsReview` n'a pas d'autre usage.

**Lot R3 — Étape « Bilan provisoire » en ligne (M, ≈ 1,5-2 j, sans migration)**
- Préparation dans le panneau : résumé, recommandations, « Ce qui manque » par activation (reformulation de
  `prepare.ts`), « Options du rapport » repliées (période obligatoire pré-remplie, périmètre, sections, réserves à
  inclure) ; ligne d'objectif à horizon (Stratégie + sortie).
- `VersionCard` générique remonté dans `components/ui/` (et les 3 copies existantes basculées dessus, ou au moins
  la nouvelle utilisation, en le notant) ; cartes « Bilan Marketing — <projet> — Vn » ; « Voir le rapport » en modale
  (`next/dynamic`) avec « Exporter en PDF ».
- Soumission directe « Soumettre à <validateur> » ; décision DG à 3 boutons, erreur rouge, plus de bouton désactivé.
- Risque : `ReportPreparation` ne doit plus rediriger vers la page du rapport (rester sur l'étape) ;
  `decide_marketing_report` exige `p_expected_version` → le passer depuis la carte.

**Lot R4 — Étapes « Réserves » et « Clôture » en ligne (M, ≈ 1,5 j, sans migration)**
- Arbitrage et levée en ligne (formulaire extrait de `arbitrate-form.tsx`), menu « ⋯ » gardé pour suivi / tâches /
  proposer une réserve ; « Avant la clôture » en lignes Prêt / Pas prêt / Attention (+ non payé, Juridique) ;
  décision DG à boutons directs ; bandeau « clôturé » et réouverture en ligne ; historique en pied de spine ;
  retirer les sections EN TROP de `review/closure/page.tsx`.
- Risque : le trigger `marketing_closed_guard` refuse les écritures une fois clôturé → masquer les formulaires dans
  cet état (déjà partiellement fait par `viewer.closed`).

**Lot R5 — Travail, Validations, Accueil, Vue d'ensemble, notifications (M, ≈ 1,5 j, migration)**
- Brancher les acteurs du parcours dans « Maintenant », Travail, Validations, carte Marketing de la Vue d'ensemble
  (`lib/workflow-status/rules.ts` : raison = action courante) ; retirer la carte « Clôture du projet » de la Vue
  d'ensemble (si Sacha confirme).
- **Migration** `supabase/migrations/2026101800xx01_marketing_review_notifications.sql` : triggers
  `notifications` sur `marketing_reports` (passage à `to_validate`), `marketing_report_approvals` (insert),
  `marketing_closures` (insert `requested`, décision, `reopened`) ; tests pgTAP (destinataires, RLS) ; à pousser en
  prod avec accord (`supabase db push --dry-run` d'abord).
- Risque : doublons de notifications si le Realtime `ProjectLive` relit déjà ; `schedulePendingPushes()` à appeler
  après chaque action qui notifie.

**Dépendances avec les autres zones** : la frise des activations (phases À préparer… Clôturées) et l'état de
statistique « indisponible » viennent de la zone Activations ; la carte Marketing de la Vue d'ensemble et le sort de
`/closure` relèvent de la zone Vue d'ensemble / coquille.
