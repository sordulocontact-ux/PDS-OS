# Lot 15 : Distribution par sortie

Projet collectif (`docs/pds-mic-plan.md` § 3 bis, point 7). Chaque sortie d'un collectif — la
sortie d'un titre, la compilation — a son propre dépôt en Distribution : dossier, paramètres,
versions, contrôles, plateformes, déclarations, anomalies, clôture, dérogations et historique.
Un projet classique ne change pas.

## Ce qui est fait

- **Données** (`20261114140101_release_distribution`) :
  - `release_id` sur les dix tables de la Distribution. Nul : le dépôt d'un projet simple, comme
    avant, sans reprise de données. Une sortie appartient au projet de la ligne (clé
    `(release_id, project_id)`).
  - Chaque unique `(project_id, …)` garde son index, limité à `release_id is null`, et gagne son
    double `(release_id, …) where release_id is not null` : un dossier, une version en attente,
    un contrôle par clé, une plateforme, une clôture ouverte, une dérogation ouverte **par
    sortie**. Les versions sont numérotées par sortie (chaque sortie a sa V1).
  - Garde-fou : une ligne d'un collectif sans sortie est refusée (`release_required`), une ligne
    d'un projet simple avec une sortie aussi.
  - Les lignes d'un collectif écrites avant ce lot (aucune en local) sont rattachées à sa
    compilation (sa sortie de projet au lot 13).
- **Fonctions** : toutes celles qui visent un projet prennent `p_release_id` (nul par défaut :
  un projet simple les appelle comme avant). Un collectif sans sortie est refusé, jamais deviné.
  Celles qui visent une ligne (décider une version, retirer une déclaration…) lisent la sortie
  sur la ligne.
- **Refus de soumission** d'une sortie de collectif, dans cet ordre : sortie archivée (changement
  de mode), titre abandonné, **titre provisoire** (lot 7), **contrat non signé sans dérogation
  de sortie** (lot 12) — sur son titre, ou sur l'un des titres de la compilation. Le verrou des
  contrats sur les versions lit maintenant la sortie.
- **Sortie d'un titre** : sa piste, **la pochette du titre** (fichier « Pochette » au Catalogue),
  sa date propre, son ISRC. **Crédits pour les plateformes** (décision 10) : PDS en artiste
  principal, les invités confirmés en featuring, et le titre livré comme sur les plateformes,
  « Marina (feat. Lou Vega) ». La Distribution vérifie (PDS crédité artiste principal au
  Catalogue, chaque invité confirmé crédité en featuring) et applique la règle à la fiche de
  livraison (« feat. » déjà écrit au Catalogue : retiré puis réécrit). Format « Single ».
- **Compilation** : son propre dépôt, la **pochette du projet** (Conception, comme avant), les
  **pistes = les titres actifs** dans l'ordre du projet (un titre pas encore au Catalogue est un
  manque bloquant), les **crédits de chaque piste lus sur son titre**, les contrats de tous ses
  titres. Format « Compilation ».
- **Écrans** :
  - la Distribution d'une sortie : les mêmes étapes, l'adresse garde la sortie (`?sortie=`),
    l'en-tête dit « « Marina » · sortie du titre · PDS », la date est celle de la sortie, un
    bouton « Sorties » ramène au choix ; une sortie archivée ou d'un titre abandonné se lit
    sans geste ;
  - un collectif sans sortie choisie va sur « Sorties » ; une sortie d'un autre projet : 404 ;
  - Préparation : crédits pour les plateformes, pochette du titre, contrats (lien vers
    « Participations et contrats »), titre provisoire, titres de la compilation pas encore au
    Catalogue ;
  - **« Sorties »** : colonne « Distribution » (À préparer, V1 à valider, V1 refusée, V1
    validée, Déposée, Acceptée, Clôture à valider, Clôturée) qui ouvre le dépôt de la sortie ;
    « Titre provisoire » sous la sortie concernée ;
  - **« Titres et artistes »** : la colonne Distribution lit le dépôt de la sortie du titre, ou
    « Avec la compilation · … » quand il n'a pas de sortie à lui ;
  - le statut « Distribution » du pilotage d'un collectif : le dépôt le moins avancé de ses
    sorties vivantes ;
  - la Distribution s'applique à un collectif quel que soit son type (décision 9), entrée de
    navigation comprise.

## Mes choix

- **La sortie dans l'adresse** (`?sortie=<id>`) plutôt qu'un nouveau segment de route : les sept
  pages existantes servent telles quelles, une adresse se partage, un onglet par sortie. « Sorties »
  reste le lieu du choix (breadboard : `scratchpad/lot15-breadboard.md`).
- **Index partiels**, comme le plan le demande ; pour la seule clé étrangère des déclarations
  vers leur version, une colonne calculée `scope_id` (une clé étrangère ne peut pas viser un
  index partiel).
- **Emprunts au Juridique** : ceux du projet (`legal_clearances` n'a pas de titre) ; un emprunt
  non sécurisé bloque chaque dépôt du collectif.
- **Validateur, paramètres, contrôles** : par sortie. Le validateur proposé reste la direction.
  La précommande et l'écoute en avant-première se comparent à la date de la sortie.
- **Sortie d'un titre sans pochette au Catalogue** : manque bloquant (la règle « pochette livrée
  par la Production » reste celle du projet et de la compilation).
- **Le statut Distribution d'un collectif** : la sortie la moins avancée, pour qu'un dépôt en
  retard ne soit pas masqué par un autre déjà en ligne.
- **Titre provisoire** : refus serveur (`title_provisional`) et élément bloquant de la
  Préparation, avec le lien vers « Titres et artistes ».
- **Mode de sortie** : une sortie de titre soumise en Distribution compte comme partie (le mode
  « compilation finale » ne peut plus l'archiver).

## Tests

- Nouveau `supabase/tests/release-distribution.test.sql` (29) : projet simple appelé comme avant
  (un dossier sans sortie) ; collectif sans sortie refusé, sortie d'un autre projet refusée ; un
  dossier par sortie ; garde-fou et clé (sortie d'un autre projet, contrôle en double) ; contrôles
  séparés ; refus titre provisoire, contrat manquant, compilation ; `release_submission_blockers`
  (codes et détail nommé) ; dérogation de sortie qui lève le refus ; précommande après la date de
  la sortie refusée ; deux V1 indépendantes ; `release_distribution_states` ; journal par sortie ;
  droit d'insérer `release_id` et dossier figé par sortie ; `single_released` ; titre abandonné ;
  `delete_project_row`.
- Adaptés (une version de collectif porte sa sortie) : `title-releases`, `participation-waivers`.
- Verts : `distribution`, `distribution-journey`, `distribution-recette`, `release`,
  `title-releases`, `participation-waivers`, `title-release-plans`, collectifs, titres,
  participations, `title-board`, `provisional-titles`, `collective-master`, `deliverable-titles`,
  `legal-participations`, `project-types`, `plan-all-workflows` et `brief-requests-plan-steps`
  (ces deux-là avec la note temporaire sur l'adhésion de démo, retirée ensuite).
  `visible-project-ids` : seul le n° 24, déjà rouge.
- Typecheck, lint, prettier (fichiers modifiés seulement) : propres.

## Incident pendant le lot

En voulant relancer les tests, j'ai lancé par erreur `supabase db reset --local` : la base
locale (démo de pré-prod + données de test des lots 6 à 14) a été effacée. Je l'ai reconstruite :
toutes les migrations rejouées depuis zéro (lot 15 compris, sans erreur), seed local, démo de
pré-prod (`seed.sql`, `showcase.sql`), scripts de test des lots 6 à 10, puis l'état de PDS MIC #5
utile au lot (mode, titres, Marina, titre provisoire, dates, actions de Marina). Perdu : ce qui
avait été fait à la main dans Chrome aux lots précédents (plans de sortie de Marina, images,
versions et liens du lot 14, et les données faites à l'écran). Les vitrines `showcase-contracts`
et `showcase-business` ne se chargent plus sur le schéma actuel (erreurs dans ces scripts,
relevées à part). Aucune base distante n'a été touchée.

## Ce qui reste à faire

- Passe dans Chrome et `/layers-surface` (ci-dessous).
- Détection de mise en ligne d'une compilation par UPC : déjà au lot 13 ; rien de neuf ici.
