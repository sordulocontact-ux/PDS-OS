# PARCOURS 01 — Créer un artiste, un master, puis un projet autour de ce master

Complète `docs/PROMPT-02-ARTISTE-MASTER.md` (modèle de données). Couvre les étapes 02, 03
et 04 du plan de construction PDS du 26/09/2026. Décrit le parcours utilisateur, pas le
schéma.

## Acteur et point de départ

Le directeur général est connecté. Il arrive sur un PO vide : aucun artiste, aucun
master, aucun projet. À la fin du parcours, un projet existe, rattaché à un master, prêt à
être transmis — mais pas encore transmis et surtout pas lancé.

Le chef de projet peut lui aussi créer artiste et master. Seul le DG crée un projet.

## Étape A — Créer l'artiste

Écran `/catalogue/artistes` → état vide : « Aucun artiste pour l'instant » + bouton
« Nouvel artiste ».

Formulaire (modale) :

| Champ | Obligatoire | Note |
| --- | --- | --- |
| Nom | oui | Nom de scène tel qu'il apparaît sur les plateformes |
| Notes | non | Champ libre |

À la validation : l'artiste est créé, la modale se ferme, la liste se rafraîchit et le
nouvel artiste est visible. Pas de redirection vers une fiche — le DG est probablement en
train d'en créer plusieurs à la suite.

Cas d'erreur : un nom déjà utilisé renvoie « Cet artiste existe déjà » sous le champ Nom,
et propose un lien vers la fiche existante plutôt que d'obliger à ressaisir.

## Étape B — Créer le master

Écran `/catalogue/masters` → état vide → bouton « Nouveau master ».

Formulaire `/catalogue/masters/nouveau` :

| Champ | Obligatoire | Note |
| --- | --- | --- |
| Titre | oui | |
| Artistes | oui, au moins un | Recherche par nom, ajout multiple, crédit principal ou featuring, ordre modifiable |
| Version | non | « radio edit », « instrumental »… vide = version principale |
| ISRC | non | Souvent inconnu à ce stade. Accepte les tirets, normalise |
| Durée | non | |

Raccourci obligatoire : si l'artiste n'existe pas encore, un lien « Créer un artiste »
dans le sélecteur ouvre la modale de l'étape A. À la fermeture, le nouvel artiste est déjà
sélectionné dans le formulaire du master, sans perte de la saisie en cours.

À la validation : redirection vers la fiche du master `/catalogue/masters/[id]`. La fiche
affiche le titre, les crédits dans l'ordre, l'ISRC formaté ou « non renseigné », un bloc
« Projets liés » vide, et un bouton « Créer un projet ».

## Étape C — Créer le projet autour du master

Deux chemins d'entrée, même formulaire :

- Depuis la fiche master, bouton « Créer un projet » → le master est déjà rattaché, le
  projet est présélectionné en « Musical » · « Single », le titre du projet est pré-rempli
  avec le titre du master. Tout reste modifiable.
- Depuis `/projets` → bouton « Nouveau projet » → formulaire vierge.

> **Mis à jour le 27/09/2026 (retour n°2)** : types et formats décrits dans
> `docs/CONTEXTE-PROJET.md` § 12, « Types et formats de projet ». Le partenariat n'est
> plus un type de projet.

Formulaire `/projets/nouveau`, en trois blocs :

| Bloc | Champ | Obligatoire | Note |
| --- | --- | --- | --- |
| Le projet | Type | oui | Musical, Contenu (Événement : « Bientôt ») |
| | Format | oui | Musical : Single, EP, Album, Mixtape, Compilation, Autre. Contenu : Format PDS existant ou Contenu ponctuel |
| | Masters | musical | Un seul pour un single, au moins un sinon |
| | Format PDS | édition d'un format | Choisi ou créé dans le sélecteur |
| | Artiste | non | Contenu seulement |
| Informations initiales | Titre du projet | oui | |
| | Échéance principale / Date de sortie visée | non | La date de l'onglet Sortie la remplace ensuite |
| | Budget prévisionnel | non | Montant en euros, première estimation |
| | Priorité | non | Haute : en tête des listes |
| | Contexte initial | non | Ce qu'on sait en transmettant, pas le Brief |
| Équipe | Chef de projet | oui | La personne, jamais le poste |
| | Direction créative | non | |

### La règle qui porte tout le type de projet

- Musical → un format et au moins un master (exactement un pour un single). Le formulaire
  refuse la validation et le dit explicitement ; la base refuse aussi (`check_project_shape`).
- Contenu → aucun master : ce que le formulaire a gardé d'un autre type est ignoré.

Changer le type ne vide rien à l'écran : revenir au type précédent retrouve la saisie.
Les contraintes s'affichent au moment de valider, pas avant.

### Rattacher plusieurs masters

Le sélecteur de masters fonctionne comme celui des artistes : recherche, ajout multiple,
retrait. Un raccourci « Créer un master » ouvre l'étape B et revient avec le master
sélectionné.

Un projet d'EP rattache trois masters. Une OP marque n'en rattache aucun. Les deux doivent
passer sans message d'erreur.

À la validation : redirection vers la fiche projet `/projets/[id]`.

## État final attendu

La fiche projet affiche :

- Le titre, le type, les masters rattachés avec lien vers leur fiche.
- L'échéance, le budget et la priorité s'ils ont été saisis, « non renseigné » sinon.
- Un statut « Non transmis ».
- Une action principale « Transmettre à un chef de projet ».
- Aucune étape, aucune route, pas de Cadrage.

Et symétriquement, la fiche du master affiche maintenant le projet dans son bloc
« Projets liés ».

## Ce qui ne doit surtout pas se produire

- Le projet ne se lance pas à la création. Pas de Route instanciée, pas de Cadrage
  disponible. Le lancement arrive après acceptation par le chef de projet, jamais avant.
- Aucun responsable n'est affecté automatiquement. Tant que personne n'a accepté, le
  projet n'a pas de chef de projet.
- Créer un projet ne modifie ni ne verrouille le master. Le même master peut être rattaché
  à un autre projet plus tard.

## Definition of done du parcours

- [ ] Depuis un PO vide, le DG enchaîne artiste → master → projet sans ouvrir de deuxième
      onglet ni ressaisir une information déjà donnée.
- [ ] Créer un artiste depuis le formulaire master le laisse sélectionné au retour.
- [ ] Créer un master depuis le formulaire projet le laisse rattaché au retour.
- [ ] Une sortie musicale sans master est refusée, avec un message qui nomme la règle.
- [ ] Un contenu ponctuel sans master ni artiste est créé sans avertissement.
- [ ] Un projet avec trois masters s'affiche correctement des deux côtés.
- [ ] Après création, le projet est « Non transmis » et aucune étape n'existe en base.
- [ ] Le directeur créatif ne voit aucun bouton de création sur ces trois écrans, et un
      appel direct à la base depuis sa session est refusé.
- [ ] Rechargement complet de la page : tout persiste.
