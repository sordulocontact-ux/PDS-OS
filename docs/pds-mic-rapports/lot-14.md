# Lot 14 : plan de sortie éditorial par titre

Compte rendu du 14/11/2026. Vérification dans Chrome à la fin de ce fichier. Pas de Distribution
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
- **Plateformes** : une liste libre (« Spotify », « Placement playlist « Ilebon » ») sans logos :
  la référence montre un logo par placement, notre document les écrit.
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
