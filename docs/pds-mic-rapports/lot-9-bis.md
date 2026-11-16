# Lot 9 bis : « Demander des fichiers »

Compte rendu du 14/11/2026. Ta décision : option (a), une demande à un membre de l'équipe, pour
la source de chaque titre seulement. Vérification dans Chrome regroupée après le lot 12
(`recap-9-12.md`).

## Ce qui est fait

- **Bouton « Demander des fichiers »** sous les tuiles de la vue consolidée du Master d'un
  collectif, pour la responsable du projet, quand au moins un titre attend sa source.
- **La modale** : les titres qui attendent leur source (ceux qui ne sont encore demandés à
  personne sont cochés d'avance ; un titre déjà demandé est marqué « (demandé à Nadia
  Benali) »), la personne, un message facultatif. Toast « Demande envoyée à Nadia Benali :
  2 titres. ».
- **Une ligne par titre** (table `master_file_requests`, migration
  `20261114100101_master_file_requests`). Une seule ligne ouverte par titre : redemander un titre
  à la même personne ne change rien ; à quelqu'un d'autre, l'ancienne ligne est close
  (« remplacée ») et gardée.
- **« Reçue » toute seule** : un déclencheur sur `master_files` marque reçue la ligne ouverte du
  titre dès qu'un fichier audio arrive sur lui, quel que soit le chemin (dépôt de la personne
  sollicitée, onglet Audio du Catalogue, session). Un fichier d'un autre titre, ou un fichier qui
  n'est pas audio, ne touche pas la ligne (principe 1).
- **La tuile « Attendent leur source »** dit « dont N demandés » avant les noms des titres.
- **La personne sollicitée** :
  - est prévenue (notification « Lina Haddad vous demande des fichiers pour « PDS MIC #5 » :
    déposez la source de chaque titre dans le Master. ») ;
  - a son « À vous » dans Travail : « Déposer les fichiers demandés de 2 titres », qui ouvre
    l'étape Source du Master ;
  - y trouve en tête « Fichiers qui vous sont demandés » : une ligne par titre (qui a demandé,
    quand, le message) et « Déposer le fichier », qui ouvre une modale : mise à plat ou
    maquette, fichier choisi puis confirmé (rien ne part au choix), écoute possible.
- **Le fichier déposé** devient une version audio de ce titre au Catalogue ; la ligne est reçue,
  la responsable est prévenue (« … a déposé un fichier demandé : la source du titre est à
  confirmer ») et confirme la source comme d'habitude.
- **Sur l'étape Source d'un titre demandé**, la responsable voit « Fichiers demandés à Nadia
  Benali le 14 novembre », le message, et « Annuler la demande » (l'auteur de la demande ou la
  responsable).
- **Projet simple** : rien ne change (ni tuiles, ni bouton ; la base refuse `not_collective`).

## Mes choix

- **Qui peut être sollicité** : un membre actif qui travaille sur le projet et le voit déjà,
  sauf soi-même : l'équipe du projet (`project_creatives`, comme les questions du Brief), un
  ingénieur interne du Master, la direction. Jamais un contact : le plan interdit tout nouveau
  chemin vers un contact.
- **Dépôt sans droit sur le Catalogue** : seuls la direction et les chefs de projet peuvent
  ajouter un audio au Catalogue, or la personne sollicitée est souvent un directeur créatif. Le
  dépôt passe donc par un chemin de dépôt à usage unique d'une heure, ouvert seulement à la
  personne sollicitée sur sa ligne ouverte (même mécanisme que le dépôt de l'ingénieur interne,
  `master_member_slots`). Il n'ouvre aucun autre droit sur le Catalogue.
- **Quels titres** : ceux du Master (déjà au Catalogue) qui attendent leur source, comme la
  tuile. Un titre pas encore au Catalogue n'est pas proposé (« Déposer un audio » du lot 7 le
  fait entrer) ; un titre abandonné est refusé.
- **Une ligne ouverte dont la source a été confirmée autrement** (la responsable confirme un
  audio déjà là) n'est plus comptée nulle part (tuile, « À vous », listes) : elle ne compte que
  tant que son titre attend sa source. Je ne la ferme pas en base (rien à écrire en plus) ; un
  fichier arrivé plus tard la marquerait reçue sans effet.
- **État du fichier déposé** : « Une mise à plat » par défaut, ou « Une maquette » ; jamais
  deviné.
- **Pas d'entrée dans l'Historique du master** pour l'instant : les notifications et la ligne du
  titre suffisent à suivre la demande. À ajouter si tu veux la trace dans l'Historique.

## Ce que le skill a fait changer

Le lot ne demandait pas `/layers-interaction-flow`. `/layers-surface` passe après la
vérification dans Chrome (récapitulatif 9-12).

## Tests

- Nouveau `supabase/tests/master-file-requests.test.sql` (25) : qui demande (la responsable
  seule), à qui (jamais hors du projet, jamais soi-même), quoi (titre au Catalogue, pas
  abandonné, collectif seulement) ; une ligne par titre, la personne prévenue une fois ;
  redemander à la même personne ne change rien, à une autre remplace et garde ; un audio du
  titre A reçoit sa ligne et pas celle de B ; un fichier non audio ne reçoit rien ; l'auteur
  prévenu ; dépôt par le directeur créatif (chemin ouvert à lui seul, mise à plat du titre B
  créée par lui, ligne reçue) ; annulation (pas par la personne sollicitée ; une fois) ; lecture
  par l'équipe ; `delete_project_row` vide la table.
- Verts : `collective-master`, `master-inhouse`, `project-titles`, `title-board`,
  `provisional-titles`, `deliverable-titles`, `project-types`, `title-participations`,
  `collective-projects`. `visible-project-ids` : seul le n° 24, déjà rouge avant ces lots.
- Typecheck, lint, prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (après le lot 12).

## Questions pour toi

Aucune.
