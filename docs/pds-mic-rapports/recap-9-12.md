# Lots 9 bis, 11 et 12 : passe dans Chrome

14/11/2026, application en local (base Supabase locale : données de démo de pré-prod, jeu
Business, données des lots 6 à 12 sur « PDS MIC #5 », collectif de type Contenu lancé, Lina
Haddad responsable). Données ajoutées pour la passe (`scratchpad/lot9-12-data.sql`) : Nadia
Benali dans l'équipe du projet, le deal d'Iris Moon confié à Malik Durand, deux fiches de
Production (« Teaser du collectif » sans ciblage, « Visuel Néons » ciblé sur Néons nocturnes)
menées jusqu'au tournage.

Comptes, par « Voir comme » : Claire Morel (direction), Lina Haddad (cheffe de projet), Nadia
Benali (directrice créative), Malik Durand (business manager). Grand écran (1 524 px), 390 px
(page affichée dans un cadre de 390 px : la fenêtre de Chrome ne descend pas sous 500 px),
thème sombre puis clair.

## Écrans vérifiés

| Écran | Lot | Ce qui a été fait |
| --- | --- | --- |
| Master › Source (Lina) | 9 bis | Tuiles, « Demander des fichiers » sous elles ; modale : envoi sans personne → erreur en rouge sous « À qui » ; 2 titres demandés à Nadia Benali avec un message ; toast, tuile « dont 2 demandés » ; sur Marina, « Fichiers demandés à Nadia Benali le 14 novembre », le message, « Annuler la demande ». |
| Travail (Nadia) | 9 bis | « Déposer les fichiers demandés de 2 titres » · PDS MIC #5 › Master › Source ; « Ouvrir » mène à l'étape. |
| Master › Source (Nadia) | 9 bis | En tête, « Fichiers qui vous sont demandés » : une ligne par titre, qui a demandé, quand, le message ; « Déposer le fichier » de Marina : mise à plat, fichier WAV choisi (écoute), « Confirmer l'envoi » ; la ligne disparaît, tuile « dont 1 demandé », le parcours passe à « déposer le fichier demandé ». |
| Juridique › Participations et contrats (Lina) | 11 | Groupes par titre, une ligne par participation (statut, contrat, étape du deal et négociateur, prochaine action) ; « Ouvrir un dossier » sur Nadia Sel, négociateur Malik Durand : deal ouvert en négociation, la ligne se met à jour ; la responsable n'a pas de menu de dérogation. |
| Participations et contrats (Claire) | 12 | « ⋯ » sur les participations confirmées sans contrat signé ; « Accorder une dérogation » : envoi vide → motif et échéance en rouge ; calendrier sans jours passés ; dérogation de tournage accordée à Nadia Sel (« Dérogation de tournage jusqu'au 30 nov. 2026 » sous le contrat) ; « Révoquer la dérogation de tournage » : rappel du motif, de l'échéance et de qui l'a accordée, motif de révocation, la ligne disparaît. |
| Production › Tournage | 12 | « Teaser du collectif » : « Tournage bloqué : contrat non signé de Nadia Sel (Néons nocturnes), Iris Moon (Lumière), Malo (Marée basse)… », lien « Participations et contrats », pas de « Lancer le tournage » ; « Visuel Néons » (Néons nocturnes seul) : plus bloqué une fois la dérogation de Nadia Sel accordée. |
| Vue d'ensemble | 12 | Encart « Contrats de participation non signés » avec les noms, lien pour qui a le Juridique. |
| Titres et artistes | 11, 12 | « Contrat non signé : Nadia Sel » sous le titre ; lien « Participations et contrats » dans l'en-tête (Juridique) ; contrat « Manquant ». |
| Activité | 12 | « Dérogation de tournage accordée · Nadia Sel · Néons nocturnes · jusqu'au 30 nov. 2026 · motif · Claire Morel », puis « … révoquée · motif ». |
| Droits (Nadia, directrice créative) | 11, 12 | « Participations et contrats » : 404 ; Titres et artistes sans colonnes de négociation ; le contrat qu'elle ne lit pas reste « Lié », jamais « Manquant ». |
| Droits (Malik, business manager) | 11 | Titres et artistes, Master, Participations et contrats : 404 ; Deals : seulement ses deals (Nadia Sel, Iris Moon et deux deals d'artistes), rien de Sami Kader (Glen) ni de Lou Vega ; page du deal : projet en texte, aucun contact. |
| 390 px | 9 bis-12 | Participations et contrats (colonnes sous le nom, menu « ⋯ » de la direction), modale de dérogation en tiroir (boutons pleine largeur), Vue d'ensemble, Master (tuiles 2 × 2, bouton), tournage bloqué. |
| Thème clair | 9 bis-12 | Participations et contrats et Titres et artistes (grand écran), tournage bloqué (390 px), Vue d'ensemble. |

## Défauts trouvés et corrigés

| Défaut | Lot | Correction |
| --- | --- | --- |
| « Participations et contrats » verrouillée quand le Juridique n'est pas dans le plan du projet (cas de ce collectif de type Contenu) : la direction ne pouvait pas accorder de dérogation, le lien de l'encart menait à une page fermée | 11, 12 | Le verrou « workflow non lancé » du Juridique passe du layout à la page, qui connaît sa route : toutes les pages du Juridique restent verrouillées, sauf « Participations et contrats » (toujours 404 sans `manage_legal`). Lien ajouté dans l'en-tête de « Titres et artistes ». |
| « Contrat manquant : Nadia Sel » alors que son contrat existe (envoyé, pas signé) | 12 | « Contrat non signé : … » sur le titre, encart « Contrats de participation non signés ». « Manquant » reste pour une participation sans contrat. |
| L'encart répétait les mêmes noms pour le tournage et la sortie | 12 | Une ligne « Tournage et sortie bloqués sans dérogation : … » quand ce sont les mêmes. |
| Toast « Demande envoyée à Nadia Benali : 2 titres.. » (double point) | 9 bis | Message donné à l'envoi (le point final n'est plus ajouté deux fois). |
| Toast « Deal créé. » (mot de l'action de Sacha) sur une page qui dit « dossier de négociation » | 11 | « Dossier de négociation ouvert. », sans toucher à l'action de Sacha. |
| Les erreurs de la modale de dérogation restaient affichées une fois les champs remplis | 12 | Effacées à la saisie. |
| « dont N demandés » ajoutait une ligne à la tuile et décalait le chiffre de sa voisine | 9 bis | Un nom de moins sur la tuile quand des titres sont demandés. |
| « Faites signer le contrat » quand plusieurs contrats sont nommés | 12 | Pluriel selon le nombre. |

## Ce que `/layers-surface` a changé

- **Vocabulaire** : « non signé » pour ce que verrouille la règle (contrat absent ou pas encore
  signé), « Manquant » pour l'absence de contrat ; « dossier de négociation » partout sur la
  page, y compris le toast.
- **Accessibilité** : élision dans les libellés lus par les lecteurs d'écran (« Ouvrir le deal
  d'Iris Moon », « Dérogations d'Iris Moon », « Déposer le fichier d'… »), avec l'aide `de()`
  déjà en usage ailleurs ; aussi dans le lien du deal de « Titres et artistes » (lot 6).
- **Retours** : notification de dérogation reformulée (« une dérogation pour un contrat de
  participation non signé ») ; pluriel du tournage bloqué.
- Relevé sans changement :
  - un directeur créatif lit « Lié » pour un contrat qu'il ne peut pas lire, mais l'encart du
    tournage nomme ce contrat comme non signé : la règle du lot demande de dire quel contrat
    manque ; seul l'état est dit, jamais le contenu ;
  - le titre reçu disparaît de la liste de la demande sans trace « Reçu » côté responsable :
    la notification le dit, et la nouvelle version apparaît dans la Source.

## Ce qui n'a pas pu être vérifié

- **Le parcours de la Production dit encore « À vous : lancer le tournage »** quand le tournage
  est bloqué par un contrat (le texte vient du parcours de la Production, pas de l'étape). La
  page et la base disent le blocage ; aligner le parcours et Travail demande de brancher les
  contrats dans le calcul de l'étape suivante de la Production (`lib/production/next`, parcours
  de la Production) : je ne l'ai pas fait dans cette passe.
- **Le refus en base au lancement du tournage** depuis l'écran : la Production de ce projet
  n'est pas « en cours », le bouton n'est donc pas proposé ; couvert par
  `participation-waivers.test.sql`.
- **Le dépôt Distribution bloqué** : ce collectif de type Contenu n'a pas de Distribution ;
  couvert par le test SQL et la porte de soumission.
- **L'information avant « Prête pour tournage »** : les fiches de test sont déjà prêtes.
- **Annuler une demande de fichiers** et **une dérogation échue** : couverts par les tests SQL.
- Des erreurs `removeChild` dans le journal du serveur viennent du cadre de 390 px (j'ai
  remplacé la page par un cadre) ; un avertissement CSS `::highlight` est antérieur.

## Tests après la passe

Aucune migration modifiée pendant la passe. Typecheck, lint, prettier propres sur les fichiers
touchés. Les tests SQL des lots (`master-file-requests`, `legal-participations`,
`participation-waivers`) et les 39 fichiers Distribution, Production, collectifs et deals
passent ; `visible-project-ids` : seul le n° 24, déjà rouge avant ces lots.
