# Lots 7 à 10 : passe dans Chrome

13/11/2026, application en local (base Supabase locale : données de démo de pré-prod, jeu
Business, données des lots 6 à 10 sur « PDS MIC #5 », collectif de type Contenu lancé, Lina
Haddad responsable). Écran large (1568 px), puis 390 px ; thème sombre, puis clair.

## Écrans vérifiés

| Écran | Lot | Ce qui a été fait |
| --- | --- | --- |
| Titres et artistes | 7 | « ⋯ » d'un titre sans master : « Déposer un audio » (titre provisoire « Sans titre · Lou Vega · PDS MIC #5 » créé, toast, onglet Audio ouvert) et « Rattacher un titre du Catalogue » (envoi vide : erreur en rouge ; puis « Velours » rattaché à « Ballade du port », avertissement de crédits affiché). Titre provisoire affiché « Titre 2 · sans nom », « En cours », « Au Catalogue sous un nom provisoire : … ». Renommé « Marina » : le titre du Catalogue prend le nom. Menu d'un titre au Catalogue sans les deux gestes. |
| Fiche d'un titre au Catalogue | 7 | Badge « Maquette · Brouillon » + « Nom provisoire ». « Rattacher à un projet existant » visible pour Lina (cheffe de projet, pas direction) : PDS MIC #5 proposé (« · Projet collectif »), second champ « Titre du projet » (Nouveau titre / « Refrain d'hiver »), rattachement réussi. |
| Maquettes du Catalogue | 7 | « Nom provisoire » sur le seul titre encore provisoire. |
| Nouvelle session | 7 | « Titre 7 · sans nom · PDS MIC #5 (pas encore au Catalogue) » proposé ; à l'enregistrement, titre créé au Catalogue et projet rattaché à la session. |
| Master d'un collectif | 8, 9 | Fil « Master / Néons nocturnes ⇕ / Source » ; liste des titres avec leur état (coche pour le Master final) ; changement de titre ; titre gardé d'une étape à l'autre (liens des chevrons) ; Mixage ouvert par défaut sur le titre dont la V2 attend une décision ; tuiles « Attendent leur source / un mix / un mastering / une validation », la tuile ouvrant le premier titre sur son étape. |
| Master d'un projet simple (« Minuit pile ») | 8 | Inchangé : « Master / Source », ni sélecteur ni tuiles. |
| Activations (liste) | 10 | Filtre « Titre » ; périmètre sous chaque activation ; filtre sur « Marina » (ne garde que l'activation qui le vise) ; filtre sur « Lumière » (état vide « Aucune activation pour ce titre dans cette vue. ») ; « Effacer les filtres ». |
| Activation (page) | 10 | « Titres visés · Tout le projet · Modifier » ; modale : « Certains titres » sans case (erreur en rouge), puis « Néons nocturnes, Marina » enregistré ; réouverture sur l'état enregistré. |
| Livrable en Production | 10 | Même ligne et même modale ; « Néons nocturnes » enregistré. |
| Livrables de la Stratégie | 10 | « Titres visés · … » et bouton « Titres » présents sous chaque livrable (vérifié dans la page : le panneau replié des 8 dimensions ne s'ouvre pas au clic dans ces données, la stratégie n'étant pas démarrée). |
| Activations d'un projet simple | 10 | Inchangé : ni filtre ni périmètre. |
| 390 px | 7-10 | Titres et artistes, Master (tuiles en 2 × 2, sélecteur dans le fil), activations (filtre pleine largeur), page d'une activation. |
| Thème clair | 7-10 | Titres et artistes (390 px), page d'une activation (390 px), Master (pleine largeur). |

## Défauts trouvés et corrigés

| Défaut | Lot d'origine | Correction |
| --- | --- | --- |
| Le lecteur d'écran annonçait « Négociation : Négociation » sur le lien d'un deal | 6 | Libellé « Ouvrir le deal de Sami Kader, étape Négociation ». |
| Un titre abandonné affichait encore un état Master (« À mixer ») | 9 | Plus d'état Master sur la ligne d'un titre abandonné (il est hors du Master). |
| « Déjà fait » d'une étape montrait les lignes d'un autre titre (« Mix déclaré mix final : maree-mix-v1.wav » sur Néons nocturnes) | 8 | Les lignes de l'historique savent leur titre ; un collectif ne montre que celles du titre actif (et celles du projet). L'Historique complet reste celui du projet. |
| Filtre « Titre » des activations : toute la largeur et un vide de 190 px sous lui | 10 | Placé dans une ligne de la largeur d'une cellule (le filtre attend un parent en ligne). |
| Modale « Titres visés » : les quatre périmètres en segments passaient sur deux lignes | 10 | Liste déroulante « Périmètre ». |
| « Modifier » décalé quand il passe à la ligne sur téléphone | 10 | Aligné sur le texte. |
| Tuiles du Master : la liste de noms décalait les chiffres d'une même rangée sur téléphone | 9 | Deux noms, puis « et N autres ». |

## Ce que `/layers-surface` a changé

- **Feedback** : le renommage d'un titre au nom provisoire dit maintenant que son titre au
  Catalogue prendra ce nom.
- **Feedback, accessibilité** : la sélection de titres dit en mots ce qui est choisi (« 2 titres :
  Néons nocturnes, Marina. ») ; une pastille seule ne le dit pas.
- **Vocabulaire** : le choix « sans filtre » de la liste des activations s'appelle « Tous titres
  confondus », pour ne plus se confondre avec le périmètre « Tous les titres ».
- Relevé sans changement : le nom provisoire apparaît dans les blocages et l'aperçu du paquet du
  Mixage (« Sans titre · PDS · PDS MIC #5 ») : c'est le nom du titre au Catalogue, celui que
  reçoit l'ingénieur ; la session nomme aussi le titre ainsi, sans badge « Nom provisoire ».

## Ce qui n'a pas pu être vérifié

- **Versions et décisions d'un titre au Mixage/Mastering** : l'étape reste verrouillée tant que le
  Brief n'est pas enregistré, la liste des versions n'apparaît donc pas dans ces données ; le
  filtrage par titre est couvert par le code et par `collective-master.test.sql`.
- **Facture de l'ingénieur à l'abandon d'un titre** (lot 9) : pas de paquet envoyé dans ces
  données ; couvert par `collective-master.test.sql`.
- **Panneau des livrables de la Stratégie** ouvert à l'écran (voir plus haut).
- **« Demander des fichiers »** : pas construit (questions du lot 9).
- Un avertissement React (clé manquante) vu une fois pendant un rechargement à chaud, juste après
  mes modifications du cadre du Master, puis jamais reproduit. Des erreurs `removeChild` vues une
  fois en fermant une modale par Échap suivi d'une navigation programmée immédiate ; aucune dans un
  parcours normal (Annuler puis lien).
- Écart entre la tuile « Attendent leur source » (4) et l'étape Source (« confirmer la source de
  6 titres ») : la tuile dit ce que chaque titre attend **ensuite** (un titre dont une version
  attend une décision compte en « validation ») ; l'étape compte tous les titres sans source
  confirmée. Dans ces données, des versions existent sans source confirmée (créées à la main), ce
  qu'un vrai parcours ne produit pas.

## Tests après la passe

Suite complète sur base propre avant la passe : seuls échouent les 6 tests déjà rouges avant ces
lots (`marketing-review`, `marketing-review-notifications`, `project-view-cache`, `team` 14-15,
`ux-roles` 5, `visible-project-ids` 24). Les échecs `rls`, `plan-all-workflows` et `strategy*`
vus pendant les lots venaient des données de démo (plusieurs directeurs généraux) : verts sur base
propre. Typecheck, lint, prettier propres après les corrections.
