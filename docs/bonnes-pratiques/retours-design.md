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

---

## 27/11/2026 : Notes, on ne pouvait pas lier une note ; une note est un document

- **Ce que Sacha a dit** : « on veut lier une note à un projet mais aussi à un deal, un devis, etc. », puis « quand
  je crée une note je ne peux pas la lier ; pour les parcours de création/interaction, inspire-toi d'Accordee ».
- **Son explication** : une note s'écrit tout de suite, comme dans Accordee : pas de formulaire en fenêtre avec un
  champ « Projet » caché dans une liste, mais la note ouverte à droite, « Lier à… » en haut, le titre, le texte.
- **Fait** : colonne et filtre « Lié à » ; `NewNoteSheet` / `NoteSheet` = la note en document, enregistrée seule ;
  `NoteLinkMenu` (Projets / Deals / Contrats avec leur nombre, puis recherche). Règle dans `docs/DESIGN.md`
  (« Une note est un document »).
- **À retenir** : pour un parcours de création ou d'interaction, partir d'Accordee (vault, `INSPIRATION/WEBDESIGN/
  accordee/flows/`) avant de reprendre un formulaire existant ; un écrit libre (note) n'est pas un formulaire.

---

## 27/11/2026 : Sessions studio, une fiche latérale et un fait par colonne

- **Ce que Sacha a dit** : « modifie la page session pour qu'elle soit comme les autres une petite modale (note,
  réseau, contrat…), à part si tu penses que la page est trop chargée », puis « sur le tableau de session sépare et
  rajoute les données si besoin ».
- **Son explication** : ouvrir une ligne ne doit pas faire quitter la liste, comme partout ailleurs ; et une cellule
  qui empile deux faits (le type et le studio, la date et les horaires, l'ingé et la durée) se lit mal et ne se trie pas.
- **Fait** : `SessionSheet` sur le modèle du Réseau (une session est une séance datée comme un call, pas un
  enregistrement complexe comme un artiste ou un projet : la page reste derrière « Ouvrir la session ») ; tableau en
  une colonne par fait, avec Titres et « Compte rendu par » en plus. Règles dans `docs/STYLE-FINANCE-PARTOUT.md`
  § 6.7 bis et `docs/COMPOSANTS.md`.
- **À retenir** : une ligne de liste s'ouvre en fiche latérale dès que l'enregistrement se lit en un coup d'œil ; un
  tableau met un fait par colonne, jamais une sous-ligne grise qui en cache un second.

---

## 27/11/2026 : Titres › Par artiste, le bouton « Filtres » des listes

- **Ce que Sacha a dit** : « enlève les filtres et met le vrai bouton filtre qu'on a dans les listes » (pastilles
  « À contacter 1 », « Contacté 1 », « D'accord 4 » au-dessus du tableau).
- **Fait** : les pastilles `FilterChip` remplacées par `FilterPanel` (bouton « Filtres » en contour, cases du statut,
  compteur sur le bouton, « Effacer les filtres ») ; `align="start"` ajouté au panneau pour un bouton en début de ligne.
- **Puis** : « je veux qu'il soit côte à côte » : le bouton sur la ligne des vues « Par titre / Par artiste », juste
  après elles (`TitlesViewsSwitch` passé au tableau par `views`).
- **À retenir** : filtrer une liste = le bouton « Filtres » des listes, jamais une rangée de pastilles maison.

---

## 27/11/2026 : « Qui fait quoi › Liens privés », la carte du lien commune

- **Ce que Sacha a dit** : « utilise les bons composants pour les liens », « c'est dans qui fait quoi » (lignes « Bastien
  Coll · 2 éléments dans le projet », dates en gris, puis Copier le lien / Relancer / Nouveau lien / Révoquer en texte).
- **Fait** : chaque lien de la section est la carte commune `PersonLinkCard` (via `ContactLinkCard` pour la page par
  personne, directement pour les liens propres d'un module dans `PrivateLinks`) : pliée, pastille d'état, adresse à
  copier, Relancer, Nouveau lien, le reste dans « ⋯ ». Les lignes maison et `ContactLinkActions` sont supprimés.
- **À retenir** : un lien privé, où qu'il soit, s'affiche dans `PersonLinkCard` ; jamais une ligne de texte avec une
  rangée de boutons.

---

## 27/11/2026 : Master d'un collectif, l'en-tête de l'étape d'un titre

- **Ce que Sacha a dit** : « pour toi c'est normal ça ? » (capture de « Assurance 30 › Master › Marée haute ›
  Source », la zone titre, pourquoi et ligne « Assurance 30 · PDS · Échéance du projet » entourée).
- **Son explication** (mon avis, validé par « ok ») : la ligne « projet · artiste » était retirée partout ailleurs, et
  ici elle parlait du projet alors que l'étape porte sur un titre ; l'échéance du projet n'est pas la sortie du titre ;
  le pourquoi était une règle pour le code (« Jamais un master final ») ; les 4 tuiles du collectif, posées sous le
  titre de l'étape, se lisaient comme faisant partie de « Source » de ce titre, deux à « 0 · Aucun titre » ;
  « En attente de Lina » était dit trois fois avec deux verbes.
- **Fait** : faits du Master = « Master final attendu le » et la sortie (celle du titre dans un collectif), plus de
  « projet · artiste » ; « Où en sont les titres » en bas de l'étape avec son titre et « Demander des fichiers » à
  côté, tuiles à 0 retirées ; l'encadré « En attente de … : confirmer la source » retiré (l'étape le dit déjà) ;
  pourquoi de Source : « Le fichier sur lequel le mixeur va travailler. ».
- **À retenir** : entre le titre d'une étape et son contenu, rien qui parle d'autre chose ; une attente se dit une
  fois ; un pourquoi s'écrit pour la personne, pas pour le code.

---

## 27/11/2026 : jamais trois boutons à texte côte à côte

- **Ce que Sacha a dit** : « sur toutes les pages/composants où on a 3 boutons à côté comme ça, il faut soit mettre
  des icônes (icon only) soit les mettre dans un menu » (en-tête de Titres : « Ajouter un titre », « Changer
  l'artiste principal », « Participations et contrats » ; lignes des liens privés).
- **Fait** : règle écrite dans `docs/DESIGN.md` « Rangée de boutons » (au plus deux boutons à texte, le reste en
  icône seule ou dans « ⋯ ») ; `RowActions` accepte `dialog` pour ranger un bouton à modale dans le menu ; en-tête de
  Titres et 18 rangées repérées dans l'app corrigées.
- **À retenir** : avant d'ajouter un bouton à une rangée, compter ; au troisième, icône seule (geste sans ambiguïté)
  ou « ⋯ ».

---

## 27/11/2026 : des en-têtes trop chargés (pourquoi, explications, faits qui flottent)

- **Ce que Sacha a dit** : « je trouve que les header sont toujours beaucoup trop surchargés », exemples Nilo Sarrat
  (fiche et contrat), Source, Sorties : « est-ce qu'on a besoin d'expliquer : Chaque sortie a sa date, son UPC et son
  suivi… ? Il y a ça sur toutes les pages, ça crée du bruit. Le mode de sortie, etc. : des infos sous les textes qui
  flottent, mal placées, est-ce qu'elles servent ici ? ». Puis, à la question posée : pourquoi « retiré de l'écran »,
  faits « triés un par un ».
- **Son explication** : les phrases sous les titres décrivent les règles et le modèle, pas ce qu'on fait ; quelqu'un
  qui vient chaque jour ne les lit plus. Les faits sans rattachement (mode, comptes, « Aucune ») ne disent ni s'ils se
  changent ni où.
- **Fait (lot 1)** : le pourquoi de chaque étape n'est plus sous le titre, il devient la description de « Qui fait
  quoi » (`StepWhyProvider`) ; Sorties et Plans de sortie perdent leur phrase et leurs comptes ; le mode de sortie est
  le libellé de son bouton (« Sorties individuelles ⇕ »), un fait seulement pour qui ne peut pas le changer.
- **Fait (lots 2 à 5, « ok fais les autres lots »)** : `FactRow` en une ligne par fait, icône du concept devant le
  libellé, source simple en ⓘ avec infobulle (les citations restent écrites) ; fiche de Nilo sans « Déjà connu,
  pré-rempli dans sa fiche » et « Participations et contrats » en bouton discret ; lignes de faits triées (Distribution
  sans « « Néons » · artiste · format » ni « Distributeur », Production sans « livrable · Fiche Vn », Plan d'un titre
  sans version, Participations sans compteurs) ; Source : « Importer la maquette ou la mise à plat » au lieu du
  paragraphe ; Nouveau projet, Nouveau titre, Sélections et Nouveau membre sans phrase sous le titre.
- **À retenir** : rien sous le titre d'une page qui n'est pas l'objet lui-même ; un fait n'est en tête que s'il change
  ce qu'on fait ici et n'apparaît pas dessous ; un réglage se montre dans son bouton.

---

## 27/11/2026 : le tableau « Titres » par artiste

- **Ce que Sacha a dit** : le tableau n'est pas bien designé : plusieurs infos par case (Artiste : nom · « Featuring »
  puis le titre et « Nommer » ; Contact : « Manager », nom, téléphone, crayon ; Accord : étape puis « Call à caler ») ;
  il déborde (« Fiche de renseigneme… » coupé) ; deux styles d'état (Statut en pastille pleine, Accord et Fiche en point +
  mot) ; un contact vide = une icône seule au lieu de « — » ; on modifie dans les cases ; « Featuring » répété sur toutes
  les lignes ; téléphone et taux en chasse fixe ; pas d'icône dans les en-têtes.
- **Fait** : une info par colonne avec son icône, Rôle seulement s'il varie, Téléphone à part, tous les états en point +
  mot, « — » pour un vide, chiffres dans la police du texte ; rien ne se modifie dans le tableau, le nom ouvre la fiche
  latérale de l'artiste (blocs Titre, Statut, Contact, Accord, Juridique, Notes) ; toutes les colonnes de l'Excel
  restent, le tableau défile dans son cadre sans en-tête coupé.
- **À retenir** : une case = un fait sur une ligne ; une valeur identique sur toutes les lignes n'a pas sa colonne ; un
  seul style pour un état ; un tableau se lit, une fiche se modifie ; un vide se dit « — », jamais par une icône de
  geste.


---

## 27/11/2026 : « Qui fait quoi », les rôles comme une fiche

- **Ce que Sacha a dit** : « je trouve ça très mal designé, fais quelque chose dans ce style » (liste des rôles en
  blocs empilés : titre, pastille Exécute / Coordonne / Valide, avatar, phrase grise ; modèle : la fiche de
  renseignements, lignes encadrées icône + libellé / valeur / ⓘ).
- **Fait** : `RolesPanel` en `FactRows` : une ligne par rôle (icône du type et rôle, titulaire, « Changer », ⓘ avec le
  type et ce que fait le rôle).
- **À retenir** : une liste de « qui / quoi » se lit comme des faits (`FactRows`), pas en blocs empilés avec une phrase
  sous chaque titre ; l'explication va dans le ⓘ.

---

## 27/11/2026 : « Participations et contrats » en panneau, pas en page

- **Ce que Sacha a dit** : « je voudrais que Participations et contrats soit similaire [à « Qui fait quoi »], une modale,
  je trouve qu'avoir une page pour ça c'est juste relou et overkill ».
- **Fait** : panneau latéral sur « Titres » (`?participations=1`, l'ancienne page y redirige) ; dedans un bloc par
  titre et une ligne par artiste en `FactRows` (contrat et deal avec leur icône), au lieu d'un grand tableau.
- **À retenir** : une vue de consultation rattachée à une page (qui fait quoi, suivi des contrats d'un projet) s'ouvre
  en panneau sur cette page, pas sur une page à part ; une URL à paramètre garde les liens et les notifications.
