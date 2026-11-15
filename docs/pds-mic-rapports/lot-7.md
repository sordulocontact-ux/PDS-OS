# Lot 7 : titre provisoire (voie A)

Compte rendu du 13/11/2026. Vérification dans Chrome regroupée après le lot 10
(`recap-7-10.md`).

## Ce qui est fait

- **`masters.title_is_provisional`** (migration `20261113180101_provisional_titles`) : faux par
  défaut, jamais écrit par le navigateur (aucun droit de colonne). Tout renommage du master le
  termine (trigger) : nommage du titre dans le projet, formulaire du Catalogue, « Passer au
  catalogue des masters ».
- **Création au premier audio ou à la première session** : `ensure_project_title_master` crée
  une maquette en brouillon nommée « Sans titre · Artiste · Projet » (premier artiste en jeu du
  titre, sinon l'artiste principal), créditée à l'artiste principal en `main` ; les invités
  confirmés suivent en `featuring` (déclencheur du lot 3). Le master est relié au projet, le
  titre devient « En cours ». Deux entrées :
  - « Déposer un audio » dans le « ⋯ » d'un titre pas encore au Catalogue (page Titres et
    artistes) : crée le titre, puis ouvre l'onglet Audio de sa fiche, où l'audio se dépose ;
  - le formulaire « Nouvelle session » propose les titres des collectifs pas encore au
    Catalogue (« Titre 2 · sans nom · PDS MIC #5 (pas encore au Catalogue) ») ; le titre est
    créé à l'enregistrement de la session.
- **Nommage** : renommer le titre dans le projet donne ce nom au master provisoire, qui cesse de
  l'être. Un master déjà nommé garde son nom (seul le titre de travail change, comme avant).
- **Signalé dans le Catalogue** : badge « Nom provisoire » (avec une infobulle) dans la liste des
  Maquettes et dans l'en-tête de la fiche du titre. Dans le projet, le titre reste « Titre 2 ·
  sans nom » (le nom provisoire n'est jamais pris pour le nom du titre), avec sous le nom « Au
  Catalogue sous un nom provisoire : … ».
- **Rattacher un titre du Catalogue à un titre du projet sans master** (manque du lot 2) :
  « Rattacher un titre du Catalogue » dans le « ⋯ », `attach_master_to_project_title`.
- **« Rattacher à un projet existant »** depuis la fiche d'un titre du Catalogue : propose aussi
  les collectifs, lancés ou non, de tout type (Contenu compris), dont la personne écrit les
  titres. Un second champ « Titre du projet » permet de le donner à un titre qui l'attendait, ou
  d'en faire un nouveau titre (`add_project_title`).
- **Activité** : « Titre créé au Catalogue sous un nom provisoire · Titre 2 · sans nom », « Titre
  du Catalogue rattaché · Titre 3 · sans nom → Lumière », « Titre nommé · Titre 1 · sans nom →
  Néons, au Catalogue aussi ».

## Mes choix

- **Qui crée le titre provisoire** : qui écrit les titres du collectif (responsable une fois
  lancé, direction avant), ou qui tient les sessions (`manage_sessions`) sur un projet qu'il
  voit, pour que la première session puisse venir d'ailleurs que du responsable.
- **« Déposer un audio » ouvre la fiche du titre au Catalogue** (onglet Audio), là où les
  fichiers d'un titre se déposent déjà ; le workflow Master du projet le reçoit ensuite comme
  ses autres titres (sélecteur au lot 8).
- **Nom provisoire écrit en français en base** (« Sans titre · … »), comme le plan le décrit :
  c'est le nom du titre au Catalogue, lu partout où un titre est lu.
- **Bouton « Rattacher à un projet existant »** : affiché aussi pour le responsable d'un
  collectif (pas seulement la direction) quand il a un collectif où le rattacher ; « Créer un
  projet » reste réservé à la direction.
- Deux nouveaux types dans le journal des titres (`cataloged`, `master_attached`) plutôt qu'un
  journal à part.

## Ce que le skill a fait changer

Pas de `/layers-interaction-flow` pour ce lot. `/layers-surface` passe après la vérification
dans Chrome (récapitulatif 7-10).

## Tests

- Nouveau `supabase/tests/provisional-titles.test.sql` (31) : nom provisoire, crédits, lien au
  projet, statut, historique, droits (directeur créatif refusé, chef de projet qui ne voit pas le
  projet refusé, direction acceptée par les sessions), nommage, renommage au Catalogue, marque
  jamais écrite par le navigateur, rattachement (refus : déjà dans le projet, titre qui a son
  master, titre abandonné).
- Collectifs et deals verts : `title-board`, `project-titles`, `title-participations`,
  `collective-projects`, `collective-project-creation`, `artist-selections`, `project-types`,
  `titles`, `deals*`, `deal-*`. `visible-project-ids` n° 24 échoue comme avant.
- `rls` n° 14-18 échoue sur la base locale **chargée des données de démo** (`multiple_validators` :
  plusieurs directeurs généraux) : sans rapport avec le lot, à reconfirmer sur base propre.
- Typecheck, lint (2 avertissements préexistants hors lot), prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (après le lot 10).
- Lot 15 : refuser un titre provisoire à la soumission en Distribution.
- Le workflow Master du projet affiche encore le nom du master (provisoire compris) : le lot 8
  montrera le nom du titre dans le projet.

## Questions et points pour toi

- **Pour Sacha** : la page d'un deal nomme le titre par le nom du master au Catalogue
  (`read_deal_context`) ; pour un titre provisoire, elle affichera « Sans titre · Nadia Sel ·
  PDS MIC #5 ». À lui de lire `title_is_provisional` s'il veut garder « Titre 2 · sans nom ».
