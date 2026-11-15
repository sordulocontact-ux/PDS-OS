# Lot 10 : ciblage marketing par titre

Compte rendu du 13/11/2026. Vérification dans Chrome regroupée juste après
(`recap-7-10.md`).

## Ce qui est fait

- **`deliverable_titles`** (migration `20261113200101_deliverable_titles`) : les titres que vise
  une action marketing d'un collectif. Une action = un **livrable engagé de la Stratégie**
  (celui que travaillent la Conception et la Production) ou une **activation**. Quatre
  périmètres :
  - **Tout le projet** : aucune ligne, comme aujourd'hui, par défaut ;
  - **Tous les titres** : une ligne sans titre, qui vaut aussi pour les titres ajoutés plus tard ;
  - **Certains titres** : une ligne par titre visé ;
  - **Aucun titre** : l'action ne parle d'aucun titre (marque, coulisses…).
- **Jamais dupliquée, rien créé par titre**, rien ne bloque sur l'absence de périmètre.
- **Choisir le périmètre** (responsable du projet, collectif seulement) : modale « Titres
  visés », depuis la page d'une activation, la page d'un livrable en Production, et le bouton
  « Titres » d'un livrable dans la Stratégie.
- **Affiché sur l'action** : « Titres visés · Néons, Lumière » sur ces pages ; sous chaque
  activation de la liste ; dans la barre des livrables de la Production ; sous chaque livrable de
  la Stratégie.
- **Filtrer par titre** : filtre « Titre » de la liste des activations (`?titre=`, la vue
  gardée). Un titre garde les actions de tout le projet, de tous les titres et celles qui le
  visent ; pas celles d'autres titres, ni « Aucun titre ».
- Titre abandonné : gardé s'il était déjà visé (affiché « (abandonné) »), jamais proposé de
  nouveau, absent du filtre.
- Projet simple : rien ne change (ni périmètre, ni filtre, ni bouton).

## Mes choix

- **Un mode en plus des lignes** (`scope` : `all_titles`, `titles`, `none`), dans la même table :
  le plan demande quatre périmètres, que « aucune ligne » seul ne distingue pas. « Tous les
  titres » est un mode (pas une ligne par titre) pour valoir aussi pour les titres à venir.
- **Pas de colonne `design_deliverable_id`** (prévue au plan) : un livrable de Conception est soit
  le miroir d'un livrable de la Stratégie (il lit son périmètre), soit « à qualifier », pas encore
  une action. L'ajouter plus tard reste simple si un livrable propre à la Conception devient une
  action.
- **Qui le règle** : le responsable du projet (même règle que les autres gestes marketing du
  responsable), à tout moment, sans dépendre de l'état de la Stratégie : le périmètre n'est pas le
  contenu de la stratégie.
- **Filtre par titre sur la liste des activations** seulement : c'est la seule liste d'actions du
  Marketing (la Production s'ouvre sur un livrable, la Stratégie range ses livrables par levier).
  Les livrables affichent leur périmètre partout où ils sont listés.

## Ce que le skill a fait changer

`/layers-interaction-flow` (breadboard, avant le code) :
- quatre périmètres plutôt qu'une simple liste de titres (« tout le projet » et « aucun titre »
  ne disent pas la même chose) ;
- la règle du filtre (tout le projet et tous les titres restent visibles sous un titre) ;
- le cas du titre abandonné déjà visé (gardé, marqué, jamais reproposé) ;
- le message quand « Certains titres » n'a aucune case cochée, et celui du projet sans titre.

## Tests

- Nouveau `supabase/tests/deliverable-titles.test.sql` (19) : sans ligne = tout le projet ;
  droits (directeur créatif refusé, projet simple refusé) ; contrôles (une action à la fois,
  périmètre inconnu, sélection vide, titre d'un autre projet) ; une ligne par titre, sans
  doublon, le livrable non dupliqué ; tous les titres ; aucun titre ; retour à tout le projet ;
  titre abandonné gardé mais jamais visé de nouveau ; lu par l'équipe, jamais écrit par elle ;
  `delete_project_row` vide la table.
- Collectifs, deals, activations, Production, suppression : verts. Les tests `strategy*`
  échouent sur la base locale **chargée des données de démo** (`multiple_validators` : plusieurs
  directeurs généraux) : sans rapport avec le lot, à reconfirmer sur base propre.
- Typecheck, lint (2 avertissements préexistants hors lot), prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (juste après).
- Lots 12 et 14 liront ces lignes (verrou du tournage par titres visés, plan de sortie d'un
  titre).

## Questions pour toi

Aucune.
