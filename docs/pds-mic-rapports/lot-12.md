# Lot 12 : contrat manquant et dérogations

Compte rendu du 14/11/2026. Vérification dans Chrome regroupée juste après
(`recap-9-12.md`).

## Vérifié avant de coder

- **Pas de système de dérogation côté Sacha** : aucune table ni fonction d'exception avant
  signature dans ses migrations (`20261111230101` à `20261112150101`) ni dans `lib/deals/`. Ses
  « contrôles » de deal memo (`deal_memo_checks`) comparent un contrat au memo, ce n'est pas une
  dérogation. Les seules dérogations existantes sont antérieures et d'un autre usage
  (`release_readiness_waivers`, `distribution_derogations`). J'ai donc créé
  `participation_waivers`, générique pour qu'il la réutilise (voir « Pour Sacha »).
- **L'étape « tournage » existe clairement** (plan § 0 bis) : `production_shoots`, par livrable
  de la Stratégie ; « Lancer le tournage » et « Confirmer que le tournage a eu lieu » (production
  externe) passent tous deux par la même transition. Pas de question à poser.

## Ce qui est fait

- **Table `participation_waivers`** (migration `20261114110101_participation_waivers`), en
  ajout seul :
  - périmètre « tournage » ou « sortie », l'un ne couvre jamais l'autre ;
  - motif obligatoire, risque facultatif ;
  - échéance obligatoire : passée, la dérogation est « échue » et ne couvre plus ;
  - qui l'a accordée et quand ;
  - révocation (qui, quand, pourquoi) sans rien écraser ; rien d'autre ne se modifie.
- **Accordée par la direction seule** (`validate`), pour une participation confirmée d'un titre
  non abandonné dont le contrat n'est pas signé, une seule ouverte par périmètre.
- **Gestes de la direction** dans « Participations et contrats » (Juridique, lot 11), menu
  « ⋯ » de la participation : « Accorder une dérogation » (périmètre, motif, risque,
  échéance), « Révoquer la dérogation de tournage / de sortie ». La responsable du projet lit,
  sans gestes.
- **Visible et tracé** :
  - sous le contrat de la participation : « Dérogation de tournage jusqu'au 30 nov. 2026 », ou
    « échue le … » (dans « Participations et contrats » et dans « Titres et artistes ») ;
  - dans l'Activité du projet : « Dérogation de tournage accordée · Nadia Benali · Titre 2 ·
    jusqu'au … · motif », puis « … révoquée · motif » ;
  - la responsable est prévenue (notification qui ouvre « Participations et contrats »).
- **Préparation et enregistrement : possibles, avec alerte en amont** :
  - **Vue d'ensemble** du collectif : encart « Contrats de participation manquants », qui dit
    ce que le tournage et la sortie refuseraient (« Tournage bloqué sans dérogation : Nadia
    Benali (Titre 2) »), avec le lien vers « Participations et contrats » pour qui a le
    Juridique ;
  - **Titres et artistes** : sous le titre, « Contrat manquant : Nadia Benali » ;
  - **Production, avant « Prête pour tournage »** : la même information, qui ne bloque jamais
    « Prête pour tournage ».
- **Tournage bloqué** : tant qu'une participation confirmée des titres que vise le livrable
  (lot 10 ; sans ciblage, tous les titres non abandonnés ; « Aucun titre » : rien) n'a ni contrat
  signé ni dérogation de tournage ouverte.
  - À l'écran : à la place de « Lancer le tournage » (ou de « Confirmer que le tournage a eu
    lieu »), « Tournage bloqué : contrat non signé de Nadia Benali (Titre 2), et aucune
    dérogation de tournage ouverte. Faites signer le contrat, ou demandez à la direction une
    dérogation de tournage. »
  - En base : refus `contract_missing`, contrats manquants nommés ; la modale « Changer
    l'état » reçoit le même message.
- **Sortie bloquée** : la soumission d'une version en Distribution est refusée sans contrat
  signé ou dérogation de sortie pour chaque participation confirmée des titres non abandonnés.
  La porte de soumission le dit avant le clic : « Dépôt impossible : contrat non signé de … ».
  Par sortie de titre ou compilation au lot 15.
- **Projet simple** : rien ne change (déclencheurs inactifs hors collectif, aucun encart).

## Mes choix

- **Échéance obligatoire**, et une dérogation échue ne couvre plus : sinon une autorisation
  exceptionnelle durerait sans fin. Une nouvelle peut être accordée ; l'ancienne reste dans
  l'historique.
- **Contrat signé = statut `signed`** ; un contrat signé puis expiré reste signé pour ces
  verrous (le plan lit le statut).
- **Titres comptés** : ceux qui ne sont pas abandonnés, prévus compris (prudent).
- **Encart de la Vue d'ensemble pour tous les lecteurs du projet** (pas seulement la
  responsable) : prévenir tôt sert aussi l'équipe ; le lien vers le Juridique n'apparaît qu'à
  qui l'ouvre.
- **Sortie** : verrou sur la soumission en Distribution, la seule sortie qui existe avant le
  lot 13 ; le lot 15 le passera par sortie.

## Écart avec le prompt du lot

Le prompt demande de documenter la table « dans le plan pour le collègue ». Ta règle est de
ne jamais modifier `docs/pds-mic-plan.md` : je l'ai documentée dans `docs/ARCHITECTURE.md`
(ligne de la migration), dans le résumé et ci-dessous.

## Pour Sacha (PDSBIZ-010)

- `participation_waivers` : une ligne par dérogation, en ajout seul. Révocation par
  `revoke_participation_waiver` ; rien d'autre ne change une ligne (trigger `a_append_only`).
- Pour d'autres exceptions avant signature : étendre `participation_waivers_scope_check` avec
  ses périmètres plutôt que créer une deuxième table.
- Lire si une participation est couverte : `participation_covered(participation, scope)`.
- `contract_gaps` / `list_contract_gaps` donnent les participations non couvertes d'un
  périmètre (noms seulement).

## Ce que le skill a fait changer

`/layers-interaction-flow` (breadboard avant l'interface) :
- une dérogation « échue » distincte de « révoquée », et l'échéance rendue obligatoire ;
- un périmètre déjà couvert n'est plus proposé dans la modale ;
- le chemin « Changer l'état » du tournage, refusé en base avec le même message que l'écran ;
- les gestes réservés à la direction : la responsable et l'équipe voient l'alerte et le
  blocage, sans boutons ;
- le livrable ciblé « Aucun titre », qui ne vérifie rien.

## Tests

- Nouveau `supabase/tests/participation-waivers.test.sql` (29) :
  - tournage refusé pour le livrable de tout le projet, et le manque nommé ;
  - rien de vérifié pour un livrable « Aucun titre » ni pour un titre sans participation
    confirmée ; projet simple inchangé ;
  - accordée : jamais par la responsable ; motif, échéance (ni absente ni passée), périmètre
    connu, participation confirmée ; une seule ouverte par périmètre ; qui l'a accordée ;
    journal ; responsable prévenue ; le tournage démarre ensuite ;
  - une dérogation de tournage ne vaut pas pour la sortie, et la soumission en Distribution est
    refusée ;
  - révocation par la direction seule, une fois, sans rien écraser, dans le journal ; le
    tournage suivant est de nouveau refusé ;
  - une dérogation échue ne couvre plus ; le contrat signé couvre, plus de dérogation à
    accorder ;
  - `delete_project_row` vide la table.
- Verts : les tests Distribution, Production, collectifs, deals (39 fichiers, 1 082
  vérifications) ; `visible-project-ids` : seul le n° 24, déjà rouge avant ces lots.
- Typecheck, lint (un avertissement préexistant hors lot, `lib/distribution/readiness.ts`),
  prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (juste après).
- Avertissements dans les sessions studio et le Brief Mix/Master (cités par le plan, pas par le
  prompt du lot) : non faits.
- Verrou de la sortie par sortie (lot 15).

## Questions pour toi

Aucune.

## Note

La ligne de la migration du lot 9 bis dans `docs/ARCHITECTURE.md` est ajoutée dans ce commit
(oubliée dans celui du lot 9 bis).
