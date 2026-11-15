# Bilan PDS MIC : le projet collectif dans PDS OS

Au 14/11/2026, branche `pre-prod`. Les 15 lots de `docs/pds-mic-lots.md` sont faits, avec leurs
tests SQL et une passe dans Chrome pour chacun. Le détail est dans `docs/pds-mic-resume.md` et
dans les comptes rendus de ce dossier.

Un projet collectif rassemble plusieurs artistes et plusieurs titres dans un seul projet. Chaque
titre a son suivi propre : participations et contrats, Master, actions marketing ciblées, sortie,
plan de sortie, dépôt en Distribution. Un projet classique ne change pas : chaque règle ne joue
que si `projects.collective = true`.

## Ce qui est livré, lot par lot

| Lot | Livré | Migration | Commits |
| --- | --- | --- | --- |
| 1 | Drapeau « projet collectif », artiste principal (PDS), lu partout à la place du premier crédit | `20261111100101_collective_projects` | `7cf1ad85` |
| 2 | Titres d'un collectif : position, nom de travail, abandon et réactivation sans rien perdre | `20261111120101_project_titles` | `c8e93ceb` |
| 3 | Participations des artistes par titre (rôle, statut, interlocuteur), crédits au Catalogue (décision 10) | `20261111140101_title_participations` | `614de94c` |
| 4 | Sélections d'artistes au Catalogue | `20261111233101_artist_selections` | `b135d799` |
| 5 | Création d'un collectif (formulaire, depuis une sélection, avec PO), invités → titres | `20261111235101_collective_project_creation`, `20261112130101_collective_guests` | `dd5739b7`, `6adf1416`, `225c3c61` |
| 6 | Vue « Titres et artistes » (statut, contrat, négociation, Master, Distribution par titre), raccord aux deals de Sacha, journal du changement d'artiste principal | `20261113170101_main_artist_history` | `cc3704fc` |
| 7 | Titre provisoire (voie A) : nom lisible au Catalogue jusqu'au vrai nom | `20261113180101_provisional_titles` | `6dd83bb7` |
| 8 | Master titre par titre (sélecteur de titre) | — | `7f2270cf` |
| 9 | Vue consolidée du Master, titres abandonnés hors des comptes | `20261113190101_abandoned_titles_counts` | `7f890188` |
| 9 bis | « Demander des fichiers » à un membre de l'équipe, pour plusieurs titres | `20261114100101_master_file_requests` | `982fe1ad` |
| 10 | Actions marketing ciblées par titre (jamais dupliquées) | `20261113200101_deliverable_titles` | `2877f22b`, `a2d17bb8` |
| 11 | Juridique par participation (« Participations et contrats », deals de Sacha lus) | — | `15ae3e81` |
| 12 | Contrat manquant : verrous du tournage et de la sortie, dérogations de la direction (motif, échéance, révocation, historique) | `20261114110101_participation_waivers` | `f8d49764`, `cedd8e2d` |
| 12 bis | Tournage bloqué dans le parcours de la Production, avertissements, demandes de fichiers dans l'Historique du master | — | `fe4add46` |
| 13 | Sorties : mode (sorties individuelles, compilation, les deux), une sortie par titre, compilation, dates et UPC propres, page « Sorties » | `20261114120101_title_releases` | `280d9ed9`, `8486c452` |
| 14 | Plan de sortie éditorial par titre (statuts, versions, journal, lien de partage `/t/`, PDF 16:9 style plan Jeho) ; retouches : couverture « PDS - Titre (feat. Invité) », placements avec logo | `20261114130101_title_release_plans` | `0f070e71`, `5ed99113`, `dbc6cd2d` |
| 15 | Distribution par sortie : un dépôt par sortie de titre et pour la compilation, pochette et crédits du titre (« Titre (feat. X) »), refus pour titre provisoire ou contrat sans dérogation, « Sorties » et « Titres et artistes » lisent chaque dépôt | `20261114140101_release_distribution` | `56ecd3d2`, `f1b3c510` |

Corrections transverses : `0a3e8afa` (l'Historique du Master nomme les titres comme le projet),
`79b0c855` et `20261112120101_deals_collective_fixes` (raccord avec le module Business, côté
Sacha).

Tests SQL propres au collectif : `collective-projects`, `project-titles`, `title-participations`,
`artist-selections`, `collective-project-creation`, `title-board`, `provisional-titles`,
`collective-master`, `master-file-requests`, `deliverable-titles`, `legal-participations`,
`participation-waivers`, `title-releases`, `title-release-plans`, `release-distribution`. Tous
verts en local ; `project-types` vert ; `visible-project-ids` : seul le n° 24, rouge depuis avant
PDS MIC (voir plus bas).

## Ce qui reste à faire

### Dans le périmètre PDS MIC

- **Logo PDS** : le document du plan de sortie utilise un tracé fait depuis l'image du PDF de
  référence (`lib/projects/title-plan/pds-logo.ts`) ; à remplacer par le fichier officiel.
- **Police des titres du plan** : League Gothic (libre) remplace SegmentA, sans licence web
  libre. Une licence SegmentA si Ibé y tient : une ligne dans `lib/projects/title-plan/fonts.ts`.
- **Une sortie archivée** n'apparaît plus dans « Sorties » : son dépôt se relit par son adresse
  seulement.
- **Plan de sortie à 390 px** : le document partagé se lit comme un diaporama réduit (zoom
  permis) ; un mode lecture pour téléphone serait une suite.
- **Mode « Compilation finale » vu à l'écran** dans « Titres et artistes » (« Avec la compilation
  · … ») : couvert par le code, pas encore montré sur une donnée réelle.

### P1 et P2 du ticket (plus tard)

- Génération en masse des plans de sortie (régénérer seulement les plans impactés).
- Export PDF artiste stylé et versionné (le PDF 16:9 par version existe ; à étendre).
- Validation et retours de l'artiste sur le plan.
- Budget marketing ventilé par titre, relié à l'enveloppe budget du projet.
- Notifications ciblées.
- Plusieurs contrats et versions par participation.
- Tableau de bord consolidé avec filtres.
- Preuves et résultats marketing.
- Historique et audit.
- Réglages Mix/Master par titre (ingénieur, valideur, dates) : aujourd'hui un seul Brief par
  projet (décision 4).
- Modèles marketing, comparaison des titres, suggestions de PO sans invention, origine et
  commissions, portail artiste.

### À traiter à part (relevé pendant les lots, hors PDS MIC)

- Test `visible-project-ids` rouge (n° 24) : 3 politiques RLS (`distribution_derogations`,
  `distribution_reserves`, `master_session_projects`) ne suivent pas la règle de visibilité.
- Autres tests déjà rouges sur base propre : `team` (14, 15), `ux-roles` (5), `marketing-review`,
  `marketing-review-notifications`, `project-view-cache` ; `marketing-review` n° 9 instable.
  Sur la base de démo, `plan-all-workflows`, `brief-requests-plan-steps` et `strategy*` ne
  passent qu'avec une note temporaire sur l'adhésion de démo de Claire.
- « Créer l'artiste X » proposé alors que l'artiste existe (crédits d'un master, « Ajouter des
  artistes » d'une sélection).
- En-tête d'une sélection en mobile : boutons sur 3 lignes.
- Déclencheur de cache `zz_project_live` absent sur `personal_tasks`.
- `database.types.ts` maintenu à la main, à régénérer proprement un jour.
- Changer d'identité artistique dans la Conception : aucune interface n'appelle
  `pickIdentityVersion` / `setIdentityDeviation` ; même défaut sur les projets classiques quand le
  premier artiste change.
- `SearchSelect` (32 px) moins haut que les champs texte (40 px) dans tous les formulaires.
- Repasser un collectif en projet classique : pas encadré.
- **Nouveau (lot 15)** : `supabase/preprod/showcase-contracts.sql` (contrainte `project_id` de
  `legal_agreement_needs`) et `showcase-business.sql` (`deal_subject_required`) ne passent plus sur
  le schéma actuel. `pnpm preprod:reset` s'arrêterait sur eux : à corriger avant de remettre la
  pré-prod à zéro (côté Sacha pour le second).
- Avertissement lint ancien : `formatDate` inutilisé dans `coverItem` (`lib/distribution/readiness.ts`).

## Migrations à pousser

Toutes les migrations se rejouent depuis zéro sans erreur (vérifié en local au lot 15). Celles du
collectif que je n'ai pas vues appliquées en pré-prod :

1. `20261114100101_master_file_requests` (lot 9 bis)
2. `20261114110101_participation_waivers` (lot 12)
3. `20261114120101_title_releases` (lot 13)
4. `20261114130101_title_release_plans` (lot 14)
5. `20261114140101_release_distribution` (lot 15)

Je n'ai pas consulté la base de pré-prod (règle : jamais sans ton accord). Avant un `db push` :
`supabase migration list --linked` pour voir ce qui manque vraiment, puis `supabase db push`.
L'ordre des fichiers suffit (chacune dépend des précédentes). La migration du lot 15 rattache à
leur compilation les lignes de Distribution d'un collectif écrites avant elle, s'il y en a.

Côté git : `origin/pre-prod` est à `5ed99113` ; les commits suivants (retouches du lot 14,
lot 15, ce bilan) restent à pousser. Rien n'a été poussé par moi.

## Ce qu'il faut montrer à Ibé en visio

### Préparer

- Pousser les migrations ci-dessus en pré-prod, puis déployer `pre-prod`.
- **PDS MIC #5 n'existe qu'en local** (créé par mes scripts de test) : en pré-prod, créer le
  collectif devant Ibé (c'est la première démonstration), ou ajouter un « moment » PDS MIC au seed
  de pré-prod (à faire avec ton accord).
- Préparer un titre presque complet au Catalogue (ISRC, auteurs, ℗, pochette, master final) pour
  aller jusqu'à la soumission en Distribution.
- Comptes « Voir comme » : Claire Morel (direction), Lina Haddad (cheffe de projet), Malik
  Durand (business manager), Nadia Benali (directrice créative).

### Déroulé proposé (40 minutes)

1. **Créer le collectif** (Lina, 5 min) : depuis une sélection d'artistes ou le formulaire, PDS
   en artiste principal, les invités deviennent des titres. Montrer « Titres et artistes ».
2. **Les titres et leurs artistes** (5 min) : ajouter un titre sans nom (titre provisoire),
   le renommer ; confirmer une participation (le crédit arrive au Catalogue) ; abandonner puis
   réactiver un titre ; colonnes Contrat et Négociation (deals de Malik).
3. **Master par titre** (3 min) : sélecteur de titre, vue consolidée, « Demander des fichiers ».
4. **Marketing par titre** (3 min) : une action ciblée sur un titre, une action globale ;
   chacune n'apparaît que là où elle doit.
5. **Contrats et dérogations** (6 min) : contrat manquant → tournage bloqué avec le nom de
   l'artiste ; Claire accorde une dérogation de tournage (motif, échéance) ; le tournage repart ;
   révocation visible dans l'historique.
6. **Sorties** (4 min) : mode de sortie, dates propres par titre, UPC, compilation.
7. **Plan de sortie d'un titre** (7 min) : du brouillon au plan actif, une version, le lien
   partagé ouvert sans compte (rien d'interne), le PDF 16:9 comparé au plan Jeho ; couverture
   « PDS - Titre (feat. Invité) », placements avec logo.
8. **Distribution par sortie** (7 min) : ouvrir le dépôt d'un titre depuis « Sorties » ; la
   Préparation dit « Crédits pour les plateformes : « Titre (feat. X) » · PDS · featuring X » ;
   le contrat manquant bloque ; Claire accorde la dérogation de sortie ; Lina soumet la V1 ;
   Claire valide ; « Sorties » et « Titres et artistes » passent à « V1 validée ». Montrer le
   titre provisoire refusé et la compilation (pistes, crédits par piste). Finir sur un projet
   classique, inchangé.

### Décisions à demander à Ibé

- Le fichier officiel du logo PDS, et SegmentA (licence) ou League Gothic.
- L'écriture du featuring : « A & B » et « A, B & C » (convention des plateformes) dans les
  titres livrés et la couverture du plan, ou une virgule partout comme au Catalogue.
- Les plateformes et placements du plan : liste de plateformes en texte, logo seulement pour les
  placements et le lien d'écoute (comme la référence) ; logos des plateformes aussi ?
- Pour la visio : créer le collectif en direct, ou un projet PDS MIC préparé dans le seed.
- Priorités parmi les P1 et P2 ci-dessus.
