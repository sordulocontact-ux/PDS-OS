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

- Une sortie archivée n'apparaît plus dans « Sorties » (lot 13) : son dépôt se relit par son
  adresse seulement.
- Les messages d'erreur `release_required` ne sont traduits que dans les gestes du dossier ; les
  autres gestes reçoivent toujours leur sortie de la page.
- Détection de mise en ligne d'une compilation par UPC : déjà au lot 13 ; rien de neuf ici.

## Passe dans Chrome

Desktop, 390 px (iframe), sombre et clair ; Lina Haddad (cheffe de projet, responsable) et
Claire Morel (direction).

### Vérifié

- **« Sorties »** : colonne « Distribution » sur chaque sortie (À préparer partout au départ),
  « Titre provisoire : Titre 7 · sans nom » sous sa sortie, contrats manquants ; le badge ouvre
  la Distribution de la sortie. À 390 px, « Distribution : … » sous le nom, en sombre et en clair.
- **Sortie de Marina** : en-tête « « Marina » · sortie du titre · PDS », sortie du 04/12/2026,
  bouton « Sorties » ; Préparation avec « Crédits pour les plateformes : « Marina (feat. Lou
  Vega) » · PDS · featuring Lou Vega », la pochette du titre (manquante, puis déposée au
  Catalogue), le contrat de Lou Vega bloquant ; paramètres réglés et confirmés par sortie ;
  Dossier « Marina (feat. Lou Vega) », artiste principal PDS, Single, Featuring Lou Vega, ISRC,
  ℗, auteurs, audio ; « 1 élément bloque la soumission : Contrats des participations ».
- **Refus puis dérogation** : Claire accorde la dérogation de sortie de Lou Vega dans
  « Participations et contrats » ; la Préparation passe à 10 sur 10 ; six contrôles enregistrés ;
  « V1 soumise à Claire Morel » ; Claire valide la V1 ; « Sorties » et « Titres et artistes »
  affichent « V1 à valider » puis « V1 validée » pour Marina seule ; historique propre à la
  sortie.
- **Titre provisoire** (titre 7) : élément bloquant « Titre provisoire » ; refus serveur
  `title_provisional` couvert par le test SQL.
- **Compilation** : « « PDS MIC #5 » · compilation de 7 titres · PDS », sept pistes dans l'ordre,
  crédits de chaque piste (« Néons nocturnes (feat. Nadia Sel) »…, « Marée basse » : PDS doit
  être l'artiste principal au Catalogue), pochette du projet en Conception, contrats de Nadia
  Sel, Iris Moon et Malo, titre provisoire.
- **Projet classique « Minuit pile »** : mêmes faits (« Mona Lys · single »), ligne « Pochette »,
  pas de bouton « Sorties », adresse sans `?sortie`, enregistrement d'un paramètre toujours
  possible.

### Défauts trouvés et corrigés

La plupart ont été corrigés pendant la passe, avant le commit du lot ; le commit « Chrome pass »
porte les corrections de `/layers-surface` et ce compte rendu.

- Enregistrer un paramètre d'une sortie : refusé (« Seul le responsable… »). Cause : les droits
  d'écriture du dossier sont accordés colonne par colonne ; `release_id` ajouté (migration et
  test).
- Paramètres d'une sortie de titre : la ligne « Pochette » proposait une fiche de la Conception ;
  retirée (la pochette du titre est lue au Catalogue, en Préparation et au dossier).
- Dossier et contrôle « Visuel » d'une sortie de titre : lisaient la fiche de la Conception ;
  lisent la pochette du titre.
- « Contrats des participations » menait à « Titres et artistes » sous « Corriger dans
  Juridique » : mène à « Participations et contrats », où se donnent les dérogations.
- Date d'une sortie de titre : « à fixer au Lancement du projet » ; dit maintenant « Date à fixer
  dans « Sorties » » et y mène (la compilation garde l'échéance du projet).
- « Titres et artistes » sous 1280 px : la Distribution du titre manquait sous le nom ; ajoutée.

### Ce que `/layers-surface` a changé

- Vocabulaire : le contrôle « Visuel » d'une sortie de titre parle du fichier « Pochette » du
  titre au Catalogue, plus de la Conception.
- Redondance : le détail du titre provisoire ne répète plus le nom déjà en tête de ligne.
- Accessibilité : le lien vers le dépôt, dans « Sorties », dit l'action, la sortie et l'état
  (« Ouvrir la Distribution · Marina · V1 à valider »).
- Gardé tel quel : les mêmes huit états du dépôt et les mêmes tons dans « Sorties » et
  « Titres et artistes » (une seule règle, `releaseDistributionOf`) ; l'en-tête de la
  Distribution nomme toujours la sortie.

### Ce qui n'a pas pu être vérifié

- Le mode « Compilation finale » dans « Titres et artistes » (« Avec la compilation · … ») : le
  mode ne peut plus changer une fois la sortie de Marina soumise ; règle couverte par le code
  (`loadTitleDeposits`), pas vue à l'écran.
- Le dépôt, la réponse de The Orchard et la clôture d'une sortie : mêmes écrans qu'avant, gestes
  passés par sortie ; non rejoués jusqu'au bout dans Chrome (couverts côté base par le test).
