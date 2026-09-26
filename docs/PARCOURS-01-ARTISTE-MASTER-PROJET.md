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
  type est présélectionné sur « Sortie musicale », le titre du projet est pré-rempli avec
  le titre du master. Tout reste modifiable.
- Depuis `/projets` → bouton « Nouveau projet » → formulaire vierge.

Formulaire `/projets/nouveau` :

| Champ | Obligatoire | Note |
| --- | --- | --- |
| Titre du projet | oui | |
| Type | oui | `sortie_musicale`, `partenariat`, `contenu` |
| Masters | dépend du type | Voir la règle ci-dessous |
| Échéance principale | non | Date de sortie visée pour une sortie musicale |
| Budget prévisionnel | non | Montant en euros |
| Priorité | non | basse, normale, haute |
| Notes de cadrage | non | Champ libre, reprend le brief reçu |

### La règle qui porte tout le type de projet

- `sortie_musicale` → au moins un master obligatoire. Le formulaire refuse la validation
  sans master et le dit explicitement.
- `partenariat` et `contenu` → master facultatif. Zéro master est un cas normal, pas une
  saisie incomplète : ne pas afficher d'avertissement.

Changer le type après avoir rattaché des masters ne les efface pas. Passer de
`partenariat` à `sortie_musicale` sans master affiche la contrainte au moment de valider,
pas avant.

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
- [ ] Un partenariat sans master est créé sans avertissement.
- [ ] Un projet avec trois masters s'affiche correctement des deux côtés.
- [ ] Après création, le projet est « Non transmis » et aucune étape n'existe en base.
- [ ] Le directeur créatif ne voit aucun bouton de création sur ces trois écrans, et un
      appel direct à la base depuis sa session est refusé.
- [ ] Rechargement complet de la page : tout persiste.
