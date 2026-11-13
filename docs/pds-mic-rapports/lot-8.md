# Lot 8 : Master, sélecteur de titre

Compte rendu du 13/11/2026. Vérification dans Chrome regroupée après le lot 10
(`recap-7-10.md`).

## Ce qui est fait

Aucune migration : les données du Master sont déjà par projet × titre.

- **Un titre à la fois** dans chaque étape du Master d'un collectif (`?titre=<master>`).
- **Sélecteur en haut de la page, dans le fil d'Ariane** : « Master ▸ Néons ▸ Mixage ». Le
  segment du titre ouvre la liste des titres du Master (patron existant `CrumbSwitcher`, celui des
  sous-modules du Marketing) : nom du titre dans le projet, son état Master en gris (« Mix V2 à
  valider »), coche verte s'il a son Master final, « Abandonné » en gris, recherche au-delà de
  9 titres. Un seul titre : son nom, sans liste.
- **Le titre suit d'une étape à l'autre** : les chevrons de gauche et les liens d'étape gardent
  `?titre`.
- **Filtré au titre actif** : la source (Source), les versions, retours, commentaires et décisions
  (Mixage, Mastering, y compris les décisions en tête de page et le dépôt d'un ingénieur
  interne), le Master final et ses livrables.
- **Inchangés, ceux du projet** : le Brief (un seul, décision 4), le paquet envoyé, le lien, le
  tarif, l'ingénieur, le fil d'échanges, la facture, l'Historique. Le repli « tout est validé »
  du Mixage/Mastering et le bilan du Master final comptent **tous** les titres, jamais le seul
  titre affiché.
- **Titre par défaut** : celui de l'URL ; sinon, au Mixage et au Mastering, le premier dont une
  version attend une décision (un lien de notification « Mix V2 à valider » tombe sur le bon
  titre) ; à la Source, sa règle actuelle (le premier à confirmer) ; ailleurs, le premier titre
  vivant. Un titre abandonné reste choisissable (son historique est gardé), jamais par défaut.
- **« Titres et artistes »** : la ligne d'un titre ouvre maintenant le Master sur ce titre
  (annoncé au lot 6) ; `/master?titre=` garde le titre jusqu'à l'étape.
- **Collectif de type Contenu** : son Master s'ouvre dès qu'il a un titre au Catalogue (règle
  `applicableWorkflows` existante, vérifiée en base par le test). S'il a lancé son plan avant
  d'avoir des titres, le Master se lance depuis « Lancer maintenant » (geste existant).
- **Projet simple** : rien ne change (pas de segment de titre, pastilles de la Source comme
  avant).

## Mes choix

- **Le sélecteur est le segment du fil d'Ariane**, plutôt qu'un second contrôle dans la page : un
  seul endroit pour choisir, au sommet de la page, sur un patron déjà en place. Les pastilles de
  titres de la Source disparaissent pour un collectif (le fil les remplace).
- Le Brief et l'Historique gardent le titre dans le fil (pour le retrouver en revenant à une
  étape par titre), mais leur contenu reste celui du projet.
- L'état Master d'un titre (« Mix V2 à valider ») est la même étiquette que dans « Titres et
  artistes » (`titleMasterLabel`, déplacée dans les règles pures pour être partagée).

## Ce que le skill a fait changer

`/layers-interaction-flow` (breadboard, avant le code) :
- le pliage « tout est validé » et le bilan du Master final calculés sur tous les titres (sans
  ça, le paquet d'un projet se repliait dès qu'un titre était fini) ;
- un titre par défaut propre à chaque étape, pour que les liens de notification tombent juste ;
- les titres abandonnés gardés dans la liste, marqués, jamais choisis d'office ;
- `?titre` gardé dans les chevrons et dans la redirection de `/master`.

## Tests

- Nouveau `supabase/tests/collective-master.test.sql` (8) : collectif de type Contenu au Master,
  un mix du titre A ne crée une version que de A, la décision sur A ne touche pas B, B numérote
  ses versions seul.
- Collectifs et deals verts (mêmes fichiers qu'au lot 7, plus `provisional-titles`).
- Typecheck, lint (2 avertissements préexistants hors lot), prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (après le lot 10).
- Lot 9 : vue consolidée en tête du Master, demande de fichiers pour plusieurs titres, titres
  abandonnés hors des comptes.

## Questions pour toi

Aucune.

*Note du lot 9* : les titres abandonnés sortent du Master ; ils ne sont plus dans le sélecteur
(au lot 8, ils y restaient marqués « Abandonné »).
