# Lot 14 : plan de sortie éditorial par titre

Compte rendu du 14/11/2026. Vérification dans Chrome et comparaison avec la référence à la fin
de ce fichier. Pas de Distribution
par sortie dans ce lot (lot 15).

## Ce qui est fait

- **Un plan par titre** (migration `20261114130101_title_release_plans`) :
  - `title_release_plans`, né « Brouillon » avec chaque titre d'un collectif (titre ajouté en
    cours de projet compris ; les 8 titres de PDS MIC #5 ont leur plan) ;
  - statuts **Brouillon › Planning provisoire › Version interne › Prêt à partager › Version
    révisée › Plan actif › Plan archivé** ;
  - un projet simple n'a aucun plan ; son plan de sortie de la Stratégie ne change pas.
- **Règles de passage** (en base, `set_title_release_plan_status`,
  `record_title_release_plan_version`) :
  - Brouillon → Planning provisoire : seulement avec une **date cible**, lue sur la sortie du
    titre (lot 13), ou sur la compilation en mode « Compilation finale » ;
  - Planning provisoire → Version interne : en **enregistrant une version** (l'accord de
    principe, avec une note) ; une nouvelle version interne reste possible ;
  - Version interne → Prêt à partager ;
  - Prêt à partager, Version révisée → Plan actif ;
  - une version enregistrée après le partage (prêt, révisé, actif) fait une **Version
    révisée** ;
  - Plan actif → Plan archivé : bilan obligatoire ; « Rouvrir le plan » le ramène ;
  - titre abandonné → plan archivé ; titre réactivé → le plan retrouve son statut ;
  - deux onglets ne déplacent jamais deux fois un statut (`status_changed`).
- **Chaque version garde** son document, le brouillon d'où il vient, les actions lues, son
  auteur, sa date, son statut et sa note ; ajout seul, jamais réécrite. Journal des statuts
  (`title_release_plan_events`), liens donnés et retirés compris.
- **Ce que lit le plan** :
  - couverture : pochette du titre au Catalogue, sinon photo de l'artiste principal, ou une
    image choisie ;
  - artiste principal du projet, **invités lus sur les participations confirmées du titre**
    (pas sur le premier crédit) ; celles pas encore confirmées sont nommées pour l'équipe ;
  - date cible et statut Distribution de la sortie ;
  - **actions** : celles ciblées sur ce titre (« Dédiées au titre ») et celles de tout le projet
    ou de tous les titres (« Globales du projet »), reprises du ciblage du lot 10 ; « Aucun
    titre » n'y figure jamais.
- **Ce qu'on règle dans le plan** (brouillon, une modale par partie) : plateformes et lien
  d'écoute, objectif / audience / message (repris de la Stratégie validée tant que rien n'est
  écrit), priorité (interne), phases de campagne, pour chaque action « Dans le document » ou non
  avec son texte et 5 images au plus, la timeline (dates des actions d'office ; dates ajoutées :
  date, canal, format, compte, responsable, validation), les images (envoi de plusieurs à la
  fois), la couverture, les liens de travail (Drive, internes).
- **Signalement** : quand une action change après la dernière version (ajoutée, retirée, nom,
  date, responsable ou ciblage modifiés), la liste et la page du plan le disent ; les versions
  enregistrées et leurs liens ne bougent pas. Calculé, jamais stocké.
- **Document partagé et PDF** (design du plan Jeho, 16:9, 1440 × 810) : couverture, date de
  sortie et liens, intention, intercalaire « N phases », phases, intercalaire « Moodboard des
  contenus » (gris clair), une page par contenu (trois mises en page selon le nombre d'images),
  intercalaire « Timeline des contenus », frise de 5 dates par page (jour de sortie en rouge,
  légende), page de fin avec le logo. Logo PDS en haut à droite de chaque page.
- **Lien de partage** (`/t/[token]`) : une version, lue sans compte, en lecture seule ; jamais
  la priorité, les responsables, les validations, les liens de travail, les participations non
  confirmées ni les actions hors du document. « Retirer le lien » l'arrête.
- **PDF** : `/api/projects/[id]/title-plans/[versionId]?format=pdf`, même HTML ; `htmlToPdf`
  prend l'option `cssPage` (taille de page donnée par le document, sans marges) ; l'A4 des autres
  PDF ne change pas.
- **Pages dans l'app** (design system de PO) : « Plans de sortie » dans la navigation d'un
  collectif, sous « Sorties » (un plan par titre, abandonnés en dessous) ; page d'un plan
  (`/release-plans/[titleId]`), les autres titres dans le fil d'Ariane.

## Polices et logo

- **SegmentA Key Bold** (gros titres condensés de la référence) : police commerciale (Typekiln),
  aucune licence web libre trouvée. Comparées dans Chrome sur « 3 PHASES », « DATE DE SORTIE »
  et « MOODBOARD DES CONTENUS » à côté de la référence :
  - **League Gothic à 75 % de largeur** (Google Fonts, SIL OFL) : la même largeur à quelques
    pixels près, un peu plus grasse ; **retenue** ;
  - Six Caps : aussi étroite, trop fine ;
  - Sofia Sans Extra Condensed, Smooch Sans, Antonio, Big Shoulders : trop larges.
  - Définie à un seul endroit : `DISPLAY_FONT` dans `lib/projects/title-plan/fonts.ts` (une
    ligne à changer si une licence SegmentA est achetée).
- **HK Grotesk** = Hanken Grotesk (Google Fonts) pour les textes (`TEXT_FONT`, même fichier).
- **Logo PDS** : dans le PDF de référence, c'est une image (522 × 269), pas un vecteur. Tracé en
  SVG vectoriel (potrace, deux calques : contour noir et anneaux blancs, blanc sur noir et noir
  sur gris comme la référence) dans `lib/projects/title-plan/pds-logo.ts`. **À remplacer par le
  fichier officiel** dès qu'il est fourni (mêmes deux calques, même fichier).

## Mes choix

- **Brouillon dans `title_release_plans.config`** (le plan § 3.1 ne le nommait pas) : ce qu'une
  version enregistre ; chaque modale n'écrit que sa clé (fusion en base).
- **Pas de `current_version_id`** : la version courante est la dernière (calculée), ce qui évite
  une clé circulaire entre plans et versions.
- **Contenu typé plutôt que pages et blocs** : la mise en page Jeho est une suite fixe de pages ;
  je réutilise du plan de sortie existant les images (`visualSchema`, `publishVisuals`,
  `uploadDocumentVisual`), `assertNoBudget`, les champs de la Stratégie, le patron de partage
  (une version, un jeton, révocable, lu par anon) et le rendu PDF, pas `editorialHtml` (A4).
- **Page « Intention »** ajoutée entre la date et les phases (objectif, audience, message, mise
  en page des phases) : le lot les demande, la référence n'en a pas. Absente si rien n'est écrit.
- **Restent internes** : priorité, responsables, validations, liens Drive, statut Distribution
  (la page du plan l'affiche, pas le document).
- **Qui écrit** : la ou le responsable du projet seulement, comme le plan de sortie de la
  Stratégie ; la direction et l'équipe lisent, voient les versions et leur PDF.
- **Actions** : livrables de la Stratégie et activations qui ne sont pas l'activation d'un
  livrable (sinon la même action deux fois) ; activations annulées exclues.
- **Timeline** : dates des actions dans le document, dates ajoutées, et la sortie elle-même si
  aucun contenu ne tombe ce jour-là ; toute date du jour de sortie a le point rouge.
- **Plateformes et placements** (retouche après le lot) : les plateformes (Spotify, Apple
  Music…) sont une liste de noms ; les placements (playlist « Ilebon »…) sont à part, chacun
  avec son logo choisi parmi les images du plan, et le lien d'écoute peut avoir l'image de sa
  page, comme dans la référence. Sans image, le texte seul, comme avant.
- **Lien public `/t/`** (`/p/` est déjà l'espace des prestataires de la Production).
- **Un lien donné à une version reste valide** quand une nouvelle version arrive (rien n'est
  écrasé) ; seul « Retirer le lien » l'arrête. Un plan archivé garde ses liens.

## Tests

- Nouveau `supabase/tests/title-release-plans.test.sql` (42) : naissance avec les titres (et un
  titre ajouté), aucun plan pour un projet simple, droits (équipe et direction refusées, lecture
  par l'équipe), fusion du brouillon, écriture directe refusée, date cible (titre, compilation),
  `no_target_date`, `not_provisional`, `invalid_transition`, `status_changed`, version interne
  (numéro, statut, brouillon, auteur, journal), partage refusé avant « Prêt à partager », jeton
  réutilisé, lecture anon du document seul, version révisée, version partagée inchangée, lien
  propre à chaque version, retrait, archivage avec bilan, réouverture, titre abandonné puis
  réactivé, versions jamais réécrites, `delete_project_row`.
- Verts : collectifs (`collective-*`, `project-titles`, `title-participations`, `titles`,
  `title-board`, `provisional-titles`, `deals-collective`), `deliverable-titles`,
  `legal-participations`, `participation-waivers`, `master-file-requests`, `title-releases`,
  `release`, Distribution (`distribution`, `-journey`, `-recette`), `framing-brief-share`,
  `framing-brief-pdfs`, `project-types`. `visible-project-ids` : seul le n° 24, déjà rouge.
  `strategy-documents` ne tourne pas sur la base de démo (`multiple_validators`, connu) ; la
  migration n'ajoute à `share_links` qu'une portée et une colonne nulle.
- Typecheck, lint, prettier (fichiers modifiés seulement) : propres.

## Ce qui reste à faire

- Lot 15 : Distribution par sortie.
- Le fichier officiel du logo PDS ; une licence web SegmentA si le client la veut.

## Questions pour toi

Aucune.

## Passe dans Chrome

14/11/2026, application en local (base Supabase locale : démo et données des lots 6 à 13).
Données ajoutées (`scratchpad/lot14-data.sql`, `lot14-config.sql`) : trois livrables ciblés sur
« Marina » de PDS MIC #5 (Play-back, PDS Out, Clip vidéo, datés autour de sa sortie du
4 décembre 2026), les photos de la référence envoyées comme images du plan. Comptes, par
« Voir comme » : Lina Haddad (responsable du projet) et Claire Morel (direction). Grand écran,
390 px (page dans un cadre de 390 px), thème sombre puis clair.

### Écrans et gestes vérifiés

| Écran | Ce qui a été fait |
| --- | --- |
| Plans de sortie | 8 titres, 8 plans (7 vivants, l'abandonné « Vieille démo » archivé dessous) ; date cible, statut, version ; « Actions modifiées depuis la dernière version » après le changement d'une action globale. |
| Plan de « Marina » (Lina) | Les 15 images envoyées d'un coup ; couverture choisie ; plateformes et lien d'écoute (lien sans https refusé sous le champ) ; intention ; trois phases (nom vide refusé) ; texte et images d'une action ; Brouillon → Planning provisoire → Version interne (note) → Prêt à partager → lien copié → Version révisée → Plan actif ; « Retirer le lien ». |
| Un plan par titre | « Néons nocturnes » : ses actions dédiées (Visuel Néons, Soirée d'écoute) et l'action globale, aucune action de « Marina », « Coulisses du studio » (aucun titre) absente ; le choix « Hors du document » de Marina ne s'applique pas à Néons. |
| Signalement | Date de « Teaser du collectif » (action globale) changée : encadré « Des actions ont changé depuis la version 1 · Modifiées : Teaser du collectif » sur le plan et dans la liste ; disparu après la version révisée ; la V1 partagée inchangée. |
| Lien de partage, sans compte | `curl` sans cookie : 200 ; aucune trace de la priorité, du lien Drive, des responsables, des validations, des invités non confirmés ni des actions hors du document ; jeton inconnu et lien retiré : 404 « Ce lien n'est plus disponible. ». |
| PDF | Route `?format=pdf` : fichier « Plan de sortie - Marina - V1.pdf », 13 pages 16:9. |
| Claire (direction) | Lecture seule : ni gestes ni « Modifier », phrase d'explication ; versions consultables. |
| Plan archivé (titre abandonné) | Bandeau « le titre est abandonné… », lecture seule. |
| Projet classique (« Minuit pile ») | Pas d'entrée « Plans de sortie », `/release-plans` en 404, plan de sortie de la Stratégie inchangé. |
| 390 px, sombre et clair | Page du plan (frise, sections, timeline, moodboard) ; document partagé. |

### Comparaison avec la référence (`docs/pds-mic-plan-jeho.pdf`)

Les 13 pages du PDF généré, côte à côte avec les 13 pages de la référence (rendues à la même
taille) :

| Page du PDF | Page de la référence | Écarts |
| --- | --- | --- |
| 1 Couverture | 1 | Conforme (titre, « Artiste - Titre », pochette 330 × 330, logo). Au départ titre 5 % trop grand et trop haut : corrigé. Depuis la retouche : « PDS - Marina (feat. Lou Vega) » avec les invités confirmés, comme sur les plateformes. |
| 2 Date de sortie | 2 | Même composition (titre condensé, date, trait). « DATE DE SORTIE » 25 % trop grand : corrigé. Depuis la retouche : logo du placement au-dessus de son nom (199 px de haut, comme la référence) et capture de la page d'écoute au-dessus du lien (161 × 157). Écart restant : nos plateformes, absentes de la référence, tiennent sur une ligne au-dessus des placements quand la page a des images. |
| 3 Intention | — | Page ajoutée (objectif, audience, message), dans la mise en page des phases ; absente si rien n'est écrit. |
| 4 « 3 phases » | 3 | Conforme après correction (titre 20 % trop grand). League Gothic un peu plus grasse que SegmentA. |
| 5 Phases | 4 | Même disposition en escalier des trois phases ; titres 14 % trop grands : corrigés. |
| 6 « Moodboard des contenus » | 5 | Fond #f1f1f1, logo noir : conforme ; titre corrigé (20 % trop grand). |
| 7 Play-back | 6 | Conforme : titre et texte à gauche, trois images en colonne à droite. |
| 8 PDS Out | 7 | Conforme : deux images en haut, une en bas, titre et texte alignés à droite. |
| 9 Clip vidéo | 8 | Conforme : collage de cinq images, titre près du logo, texte en bas à gauche. |
| 10 « Timeline des contenus » | 9 | Conforme. |
| 11 Timeline (5 dates) | 10 | Même frise : marques carrées, dates en alternance dessus / dessous, vignettes, flèche. La référence garde des marques vides entre des dates espacées (page 11) ; nos dates se suivent. Dates un peu petites : agrandies. |
| 12 Timeline (jour de sortie) | 12 | Point rouge et légende « Jour de sortie » conformes. Le titre « TIMELINE DES CONTENUS » et les dates sont en Hanken Grotesk gras (la référence utilise une police géométrique de Canva pour ces deux éléments). |
| 13 Fin | 13 | Conforme, logo centré. |

À l'écran, chaque page garde sa mise en page en se réduisant à la largeur : à 390 px le
document se lit comme un diaporama (texte petit, zoom permis) ; un mode de lecture sur
téléphone serait une suite possible.

### Défauts trouvés et corrigés

- **Document** (dans ce commit) : tailles des gros titres condensés et des dates de la timeline
  alignées sur la référence ; texte alternatif : la couverture nommée par le titre, les images
  des pages et de la timeline décoratives (le nom de fichier n'est plus lu).
- **Page du plan** (corrigés avant le premier commit, même session) :
  - indice du Brouillon quand la date est déjà posée (« passez le plan en planning
    provisoire ») ;
  - statut dit trois fois dans l'en-tête : le fait « Statut » retiré (pastille et frise restent) ;
  - un menu « ⋯ » à un seul geste sur chaque action : bouton « Modifier » direct ;
  - « Images : 3 » → « 3 images » ;
  - modale des phases : bouton « × » qui se décalait sous l'erreur, à côté de « Phase n » ;
    exemple seulement sur la première phase ;
  - lien de la liste lu deux fois par un lecteur d'écran ;
  - à 390 px : frise réduite aux segments et au statut, pastille « Dans le document » sous les
    faits de l'action ;
  - plan archivé : la frise retirée (le bandeau le dit) ;
  - envoi de plusieurs images à la fois (une seule auparavant).

### Ce que `/layers-surface` a changé

- **Vocabulaire / retours** : le journal dit « Lien de partage donné / retiré · version 1 » au
  lieu d'un statut répété ; « Prêt à partager » dit où copier le lien (« Versions ») ; l'erreur
  « le plan a changé entre-temps » dit quoi faire (recharger).
- **Hiérarchie** : plus de frise sur un plan archivé.
- **Accessibilité** : textes alternatifs du document.
- Relevé sans changement : les images du plan ne se retirent pas (le lot ne le demande pas) ;
  le menu « ⋯ » à un geste reste sur les vignettes et les lignes de tableaux, comme ailleurs
  dans l'app.

### Ce qui n'a pas pu être vérifié

- Le PDF sur Vercel (Chromium serverless) : vérifié en local avec Chrome.
- `strategy-documents.test.sql` sur la base de démo (`multiple_validators`, connu).

## Retouches du document (après le lot)

Trois retouches demandées avant le lot 15, dans un commit à part :

1. **Couverture** : « PDS - Titre (feat. Invité) », avec les invités confirmés du titre, écrits
   comme sur les plateformes (« A & B », « A, B & C ») : `withFeaturing` et `joinArtistNames`
   dans `lib/projects/participation-rules.ts`, repris par la Distribution au lot 15. Le code
   lisait déjà les invités confirmés ; sur Marina, Lou Vega n'était que « proposé » : confirmé en
   local pour le vérifier.
2. **Page de la date de sortie** : plateformes et placements séparés dans le brouillon
   (`placements` : nom + logo, jusqu'à 4 ; `listeningVisual`), dans la modale « Plateformes,
   placements et lien d'écoute » (logo et image choisis parmi les images du plan, repliés tant
   qu'on ne les ouvre pas) et dans la section « Couverture et sortie ». Le document met le logo
   au-dessus du nom du placement et la capture au-dessus du lien ; sans image, le texte reste
   comme avant. Les versions déjà enregistrées gardent leur document (lu avec `?? []`).
3. **Comparaison dans Chrome** des pages 1 et 2 de la version V3 de Marina avec la référence :
   tableau ci-dessus mis à jour. Corrigé pendant la comparaison : colonne de droite trop haute
   (plateformes en ligne quand il y a des images), libellé du placement sur deux lignes, logo
   trop petit, écart trop serré avant le lien d'écoute.

Vérifié : validation d'un placement sans nom, choix et retrait des images, enregistrement,
version V3, PDF (13 pages), version V2 (sans placements) identique à avant, modale à 390 px.

