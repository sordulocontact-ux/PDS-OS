# Retours design de Sacha

Chaque retour design de Sacha sur un écran, noté tel qu'il l'a dit, avec la capture et ce qui a été
fait. À relire avant de toucher à l'écran concerné, et avant tout écran voisin : une remarque sur un
écran vaut souvent pour le même pattern ailleurs.

Ce fichier n'est pas `docs/DESIGN.md` : DESIGN.md dit les règles en vigueur, ce fichier garde les
retours eux-mêmes. Une règle tirée d'un retour peut ensuite y entrer.

Format d'une entrée : date, écran et geste, capture, ce que Sacha a dit, ce qu'il voulait dire, ce
qui a été fait.

---

## 26/11/2026 : « Nouveau contrat » › Déposer un contrat existant, après le dépôt

- **Capture** : `docs/bonnes-pratiques/captures/2026-11-26-nouveau-contrat-depot.png` (fichier
  `contrat_test_anonymise.docx` déposé).
- **Ce que Sacha a dit** : « c'est pas bon là ».
- **Son explication** : « tu as tout bon » : les cinq points ci-dessous sont confirmés. Il demande
  aussi pourquoi ils n'ont pas été vus dès le début : l'écran n'avait pas été regardé une fois le
  fichier déposé, voir `regarder-l-ecran.md`.
- **Ce que Claude a trouvé** (confirmé par Sacha) :
  1. Le fichier déposé revient en grande zone de dépôt vide (« Contrat / PDF ou Word »), avec son nom
     en petite ligne grise dessous : on croit qu'il reste à déposer. `ContractForm` passe le fichier à
     `FilePickField`, qui montre toujours la zone de dépôt.
  2. La phrase sous le titre (« vous ajouterez ensuite ses parties et ses fichiers ») contredit
     l'écran, le fichier est déjà là ; c'est en plus une phrase sous un titre.
  3. Presque rien n'est lu du document : titre = nom du fichier (« anonymise » sans accent), projet et
     artiste « Aucun », dates vides, alors que l'avenant donne sa date, sa fin (30 juin 2032) et ses
     parties (Nova Sound, Harbor Distribution).
  4. Les dates ne s'alignent pas : `w-fit` les rend plus étroites que Projet et Artiste au-dessus ;
     Échéance seule sur sa ligne avec une aide ; « jj/mm/aaaa » en chasse fixe.
  5. Long pour un contrat qui existe déjà : Échéance, Début, Fin, Notes, il faut défiler jusqu'au
     bouton.
- **Fait** (26/11/2026, vérifié dans le navigateur) :
  - le contrat déposé est affiché **à côté** de ses champs (idée de Sacha : « mettre le contrat à côté
    de toutes les infos pour le voir »), dans une fenêtre plus large ;
  - le fichier choisi remplace la zone de dépôt par une ligne avec « Remplacer », dans **toute
    l'app** (`FilePickField`) ;
  - plus de phrase sous « Nouveau contrat » ;
  - Échéance et Notes retirées pour un contrat qui existe déjà, ainsi que l'aide de « Responsable » ;
  - les dates prennent toute leur colonne ;
  - « PDS Records » n'est plus pris pour l'artiste « PDS ».
- **Reste** : un avenant sans ligne de titre (le fichier de test) garde le nom du fichier comme titre,
  mais le document à côté permet de le corriger d'un coup d'œil. « jj/mm/aaaa » s'affiche en Geist
  Mono, la police des chiffres (décision du 15-16/11).

---

## 26/11/2026 : « Nouveau contrat » › Partir d'un modèle, projet choisi

- **Capture** : `docs/bonnes-pratiques/captures/2026-11-26-nouveau-contrat-modele.png` (projet
  Assurance 30, une ligne ouverte).
- **Ce que Sacha a dit** : « dis-moi ce qui ne va pas ici ».
- **Son explication** :
  - Le choix en grandes cartes n'est pas le bon composant. Il préfère « le composant qui glisse »
    (`SegmentedControl`) : « moins de place et plus facile à lire ».
  - « Ce qui me choque sur l'UX » : à l'ouverture du menu « Contrat », la valeur proposée est « Pas
    d'accord nécessaire ». Ce n'est pas la bonne réponse : la vraie situation est « aucun modèle de
    contrat ».
  - Il veut pouvoir créer un nouveau modèle depuis le menu lui-même.
- **Cause trouvée** : sans modèle validé pour son rôle, le menu « Contrat » n'a qu'une option,
  « Pas d'accord nécessaire ». À l'ouverture, la liste se pose par-dessus le champ (d'où les « deux
  cadres décalés ») et c'est la seule réponse offerte. La vraie situation (aucun modèle) et le geste
  utile (en créer un) sont absents du menu. (Claude avait d'abord accusé à tort `initialOf` : sa
  ligne disait « Choisir un contrat », rien n'était choisi.)
- **Fait** (26/11/2026) :
  - le choix en `SegmentedControl`, « Déposer un contrat » choisi d'office ;
  - le menu « Contrat » : « Aucun modèle pour ce rôle » en attente quand aucun modèle n'existe,
    « + Nouveau modèle de contrat » en bout de liste (le bouton sous le menu est retiré) ;
    « Pas d'accord nécessaire » reste un choix, jamais la seule réponse affichée ; partout où ce menu
    sert (Plan d'action compris) ;
  - « Partir d'un modèle » ne montre plus le tableau du Plan d'action. Il montre les seules
    personnes qui ont encore besoin d'un contrat, chacune avec son modèle et « Créer le contrat ».
    « Confirmer les contrats nécessaires », la colonne Rémunération et les lignes « Signé » ne
    sont plus là ;
  - la phrase en double est retirée, « Fermer » passe en contour.
- **Les « deux cadres décalés »** : la liste d'un menu se posait par-dessus son champ, dans toute
  l'app. Question posée, réponse de Sacha : « sous le champ, partout ». Fait (`SelectContent`).
- **Ce que Claude a trouvé** (confirmé par Sacha) : le tableau « Contrats à prévoir » du Plan d'action a été
  mis tel quel dans la fenêtre. Il sert à décider des contrats d'un projet, pas à en créer un. La même
  erreur qu'au dépôt : un composant réutilisé sans relire son rendu dans le nouveau parcours.
  1. Rien ne se crée : aucune ligne n'a de « Générer ». Deux personnes sur trois sont déjà « Signé »,
     la troisième n'a pas de modèle. Une impasse, sans le dire.
  2. Les choix restent en haut et prennent un tiers de la fenêtre alors qu'on a déjà choisi.
  3. La ligne ouverte se contredit : le menu « Contrat » dit « Pas d'accord nécessaire » alors que
     l'état dit « Modèle manquant ».
  4. La même phrase deux fois (« Aucun modèle de la bibliothèque… »), dans la ligne et dessous.
  5. Le menu « Contrat » a deux cadres décalés l'un dans l'autre.
  6. « Fermer » est un bouton texte seul et décalé : la règle veut un contour à côté.
  7. Deux fins dans la même fenêtre : « Fermer » dans la ligne, et « Confirmer les contrats
     nécessaires » / « Annuler » en bas. « Confirmer… » valide le Plan d'action, ce n'est pas créer un
     contrat. Le bouton principal est à gauche, alors qu'il est à droite partout ailleurs.
  8. La colonne Rémunération est vide partout (« – »).
  9. Un tableau pour modifier, ce qu'Ibé trouve « algorithmique » (22/11).
- **Fait** : rien encore.

---

## 26/11/2026 : fenêtre d'un modèle de contrat, et son fichier source

- **Ce que Sacha a dit** : « il faudrait aussi mettre le design similaire de contrat dans modèle,
  contrat à gauche et information à droite. Pareil pour le fichier source, c'est pas le même
  composant. Tu dois à chaque fois vérifier les patterns similaires et corriger ceux qui n'ont pas le
  même ; si tu as des doutes, tu poses une question. »
- **Leçon** : un pattern changé sur un écran se cherche aussi là où il est fait autrement, pas
  seulement là où le même composant est utilisé (`DESIGN.md` § 0, point 3).
- **Fait** (26/11/2026, vérifié dans le navigateur) :
  - le formulaire d'un modèle (nouveau, nouvelle version, demandé pour une personne) : le contrat à
    gauche, les informations à droite, « Enregistrer » sous elles, en fenêtre `document` ;
  - le fichier source : la même zone de dépôt, puis la même ligne « Remplacer » que tout fichier
    choisi (`ChosenFileRow`), « Retirer » à côté.
- **Questions posées** (doute sur le périmètre), réponses de Sacha : oui aux deux. Fait et vérifié
  dans le navigateur :
  - la fenêtre « Voir » d'un modèle (et sa page) : le contrat à gauche ; à droite l'état, « Valider »,
    le type, « Voir le PDF », « Modifier » et les versions ;
  - « Importer un contrat » d'un deal : le même écran que « Déposer un contrat ». Le deal fixe le
    type, l'artiste et le projet ; le titre vient du document s'il en a un.

---

## 26/11/2026 : « Déposer un contrat », date et lieu du contrat

- **Ce que Sacha a dit** : « il y a pas de date de contrat et lieu ? dans les inputs ? si ça ne sert à
  rien ne mets pas », puis « fais les retours qu'on a dit ».
- **Décision** :
  - pas de lieu : rien ne s'en sert dans PDS OS ;
  - pas de « Date du contrat » à part pour un contrat non signé ;
  - les dates que le document dit sont lues par le code : Début, Fin (aussi depuis une durée en ans
    ou en mois) et le jour de signature (« Fait à …, le … ») ;
  - « Déjà signé », jamais coché d'office, fait apparaître « Signé le » et fait entrer le contrat
    directement en « Signé ».
- **Fait** (vérifié dans le navigateur avec `contrat_licence_mona_lys.docx`) :
  - le contrat est créé « Signé le 26 novembre 2026 », du 1er décembre 2026 au 30 novembre 2031,
    avec son fichier rangé comme signé ;
  - trouvé en vérifiant et corrigé : les dates coupées à deux par ligne dans la colonne étroite
    (« Mar. 01/12/2… »), et « Créer le contrat » qu'il fallait aller chercher en faisant défiler la
    colonne.

---

## 27/11/2026 : Calendrier, la barre d'outils sur une seule ligne

- **Ce que Sacha a dit** : « Tout / À vous », Semaine / Mois et « Nouveau call » sur la même ligne ; plus rien
  dans l'en-tête de la page.
- **Son explication** : pas de deuxième ligne d'outils, le bouton principal compris : tout ce qui sert à lire
  et à agir sur le calendrier tient à côté de « Aujourd'hui » et de la période.
- **Fait** : `CalendarToolbar` prend `action` (le bouton principal), à droite de la même ligne ; puis
  « Tout / À vous » retiré (Sacha : « ça fait 2 fois le même composant » à côté de Semaine / Mois) ; l'en-tête ne porte plus que le titre. Règle dans `docs/DESIGN.md` (Calendrier). Même esprit :
  l'`EmptyState` des Notes n'a que son titre (`body` facultatif), moins de texte à l'écran.
- **À retenir** : sur une page de calendrier ou de liste, ne pas empiler une ligne de filtres, une ligne de
  vues et un bouton dans l'en-tête ; une seule ligne, le bouton principal en dernier à droite.
