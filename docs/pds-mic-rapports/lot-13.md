# Lot 13 : sorties par titre et compilation (données)

Compte rendu du 14/11/2026. Vérification dans Chrome regroupée juste après
(`recap-12bis-13.md`). Pas de Distribution dans ce lot (lot 15).

## Ce qui est fait

- **Mode de sortie d'un collectif** (`projects.collective_release_mode`, migration
  `20261114120101_title_releases`) :
  - « Sorties individuelles », « Compilation finale » ou « Sorties individuelles puis
    compilation » ;
  - modifiable en cours de projet par qui écrit les titres (la responsable une fois lancé,
    `create_projects` avant) ; chaque changement va dans l'Activité.
- **Une ligne `releases` par sortie** :
  - `project_title_id` renseigné = sortie d'un titre, une au plus par titre ;
  - nul = sortie du projet (tout projet simple, comme aujourd'hui ; la compilation d'un
    collectif).
- **Création selon le mode**, sans doublon :
  - au lancement du plan ;
  - quand un titre devient actif ou reçoit son master (titre ajouté en cours de projet
    compris) ;
  - à chaque changement de mode.
- **Archivage, jamais suppression** : une sortie que le nouveau mode n'utilise plus est archivée ;
  revenir au mode la ramène (la même ligne). Refusé si elle est déjà partie : compilation
  soumise en Distribution, sortie de titre livrée ou en ligne.
- **Dates propres** :
  - la sortie d'un titre garde sa date quand l'échéance du projet change ;
  - la compilation suit l'échéance du projet ;
  - un projet simple : sa sortie suit son échéance, comme avant.
- **Titre abandonné** : sa sortie est gardée (historique), hors des comptes ; réactivé, il la
  retrouve.
- **ISRC et UPC** :
  - la détection de mise en ligne cherche la sortie d'un titre avec l'ISRC de son master ;
  - elle cherche la compilation par son UPC seulement (Deezer et iTunes par UPC d'album),
    jamais par l'ISRC d'un de ses titres ; sans UPC, la compilation attend ;
  - `setReleaseUpc` vise une sortie (plus toutes les sorties du projet).
- **Un seul accès à « la sortie »** (`loadRelease`) :
  - un projet simple : sa sortie, comme avant ;
  - un collectif : la sortie du titre demandé, ou la compilation ; appelé sans l'un ni
    l'autre, il **échoue** au lieu de prendre la plus ancienne.
- **Les neuf lectures en `limit 1` remplacées** :
  - pages de la sortie du projet (Distribution, assistant, dossier de presse, actions de la
    sortie, liens plateformes) : la sortie du projet, demandée explicitement ;
  - pages qui ont besoin de « la » date de sortie (Stratégie, Conception, Plan du projet, retard
    de l'ingénieur, première exploitation SACEM) : `next_release_date`, la date la plus proche
    parmi les sorties vivantes (pour un projet simple, la date de sa sortie) ;
  - jamais une ligne archivée.
- **Page « Sorties » d'un collectif** (`/app/projects/[id]/releases`, entrée « Sorties » sous
  « Titres et artistes ») :
  - « Mode de sortie » (modale, avec ce que chaque mode crée) ;
  - groupes « Sorties des titres », « Compilation » (ses titres listés), « Titres abandonnés » ;
  - pour chaque sortie : date (« Modifier la date » pour une sortie de titre ; la compilation
    affiche « Échéance du projet »), UPC (« Modifier l'UPC »), ISRC du Catalogue, état
    (Prévue, Livrée, En ligne), et « Sortie bloquée : contrat non signé de … » quand un
    contrat manque ;
  - les titres pas encore au Catalogue sont nommés sous le tableau.
  - Projet simple : 404, sa sortie reste dans sa Distribution, inchangée.
- **Le verrou de sortie du lot 12 suit les nouvelles sorties** :
  - une sortie marquée livrée ou confirmée en ligne est refusée sans contrat signé ni dérogation
    de sortie : ceux de son titre pour une sortie de titre, ceux de tous les titres vivants pour
    la compilation ;
  - la soumission en Distribution (compilation ou sortie du projet) reste verrouillée comme au
    lot 12 ;
  - la détection automatique, elle, constate et n'est jamais bloquée.

## Mes choix

- **Mode par défaut d'un collectif** : « Sorties individuelles ».
  - Les collectifs déjà lancés avec leur sortie de projet passent en « Sorties individuelles
    puis compilation », pour garder cette sortie comme compilation.
  - Le mode se règle sur la page « Sorties » plutôt que dans le formulaire de création, pour ne
    pas toucher à `create_collective_project` (redéfinie par Sacha).
  - Il reste modifiable à tout moment.
- **La compilation regroupe les titres actifs** au Catalogue, dans l'ordre du projet (plan
  § 3 bis). Le prompt dit « les titres choisis » : je lis ces titres actifs, sans sélection à la
  main.
- **Nom d'une sortie de titre** : le nom du titre dans le projet (jamais un nom provisoire du
  Catalogue), mis à jour quand le titre est renommé.
- **Dates des pages de projet** : la plus proche des sorties vivantes, plutôt que la compilation
  seule. Sinon, un collectif en « Sorties individuelles » n'aurait aucune date dans la
  Stratégie.
- **Index d'unicité** :
  - posé sur `project_title_id` ;
  - pas posé sur « une sortie de projet par projet », que des données de pré-prod pourraient
    contredire ; les fonctions créent une seule compilation, sans doublon.
- **Colonne Distribution de « Titres et artistes »** : toujours « Avec le projet » jusqu'au
  lot 15.

## Tests

- Nouveau `supabase/tests/title-releases.test.sql` (30) :
  - droits du mode et modes refusés ; aucune sortie avant le lancement du plan ;
  - projet simple inchangé : une sortie, datée par l'échéance, qui la suit ;
  - `singles` : N sorties de titres, aucune de projet ; `compilation` : une seule ;
    `singles_then_compilation` : N + 1 ;
  - dates propres qui ne bougent pas avec l'échéance, la compilation qui la suit ;
    `next_release_date` ;
  - titre au Catalogue plus tard ; titre abandonné gardé mais hors des comptes ;
  - UPC par sortie ;
  - archivage puis retour de la même compilation, journal ;
  - refus `single_released` et `compilation_submitted` ;
  - verrou de sortie par titre, levé par une dérogation ;
  - `delete_project_row`.
- Verts : collectifs, participations, dérogations, Distribution (dont `distribution-journey`),
  plan (`brief-requests-plan-steps` et `plan-all-workflows`), lancés sur la base de démo en
  posant le temps du test une note sur l'adhésion de démo qui les bloque, puis retirée.
  `visible-project-ids` : seul le n° 24, déjà rouge avant ces lots.
- Typecheck, lint, prettier (fichiers modifiés seulement) : propres.

## Ce qui reste à faire

- Vérification dans Chrome (juste après).
- Lot 15 : Distribution par sortie (`release_id`), verrou de soumission par sortie, pochette et
  crédits du titre.

## Questions pour toi

Aucune.
