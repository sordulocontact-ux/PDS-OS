# Zone « Production » — inventaire proto ↔ app

Dépôt lu : le worktree de la branche `feat/projet-complet`, lecture seule.

## 0. Sources lues

- Proto global : `docs/protos/projet.html` (Production = étape du module Marketing, construite par
  `docs/protos/src/build-mk.py` à partir de `production-v2.html` + `src/mk.js`, `mk-actions.js`, `mk-scen.js`).
  Scénarios « Aller à » de la zone : `prodstart`, `quote`, `change`, `ready` (+ le scénario projet `prod` = `quote`,
  `pre` = `ready`). Proto détaillé : `docs/protos/production-v2.html` + test `docs/protos/tests/production-v2.cjs`.
- Parcours rejoué dans Chrome headless (textes exacts) : `scratchpad/inventory/prod_run/*.txt` (call de production créé,
  invitation sur le lien de la société, tâches du call, résumé aux participants, réalisateur proposé puis retenu, devis
  vérifié/soumis/validé, checklist de préproduction, portails société / réalisateur / management, modale « Qui fait quoi »,
  formulaire « Remplacer le lieu », pochette et teasers).
- Métier : `docs/PRODUCTION-METIER.md` (entier), `docs/ARCHITECTURE.md` § 8 nonies + « Retours d'Ibé du 13/10 »
  (Production en parcours), `docs/VISION-UX.md` § 5 (règles 14, 17).
- Tickets : « TICKET — Workflow Production complet » (Drive `Ticket Production (dans projet)`, doc
  `1EU1C1p4iqzdiT6XegxXonDeCfCgCa-2ACBfP3iYPTn4`) ; « TICKET PO — Retours prototype Artefact » (15/10) — **introuvable
  dans le dossier Drive public** (ni à la racine ni dans les sous-dossiers) ; lu dans Notion, page
  `3f6dd6cf7e7d80ccbef8cdba3b249a66` (« Workflow production externe — Clip « Néons » — V1 »). Ses § cités ci-dessous
  sont notés « Artefact § n ». Les tickets PROD-001 à 040 / BUG-001 à 007 (Drive retours › Marketing › Partie 3) sont
  déjà codés dans l'app (ARCHITECTURE).
- App : `app/(app)/app/projects/[projectId]/production/**`, `lib/production/**` (dont `journey/`), `components/production/**`,
  `app/(public)/p/[token]/page.tsx`, migrations `20261014000101` → `20261014001401` (+ socle `20261010003001`,
  `…6001`, `…6101`, `…6201`, `…6301`), `lib/i18n/fr/production-*.ts`, `lib/ui/journey.ts`, `components/shell/journey/*`.

## 1. Les parcours en un coup d'œil

### Proto (référence)

Production = 3e chevron du Marketing (« Stratégie ✓ · Conception ✓ · **Production** · Activations · Suivi & bilan »),
fil d'Ariane `Néons › Marketing › Production › <Livrable> › <Étape>`. En-tête : « Production », pastille
`<Livrable> · <Mode> · <Qui>`, bouton **« Qui fait quoi »** (modale), faits projet (Néons · Mona Lys · Single, Budget,
Responsable, Sortie). Puis la carte **« Maintenant »**, puis une **barre de livrables** (une carte par fiche transférée :
« Clip officiel », « Teasers, série de 4 », « Pochette » ; sous-titre « Qui produit ? à choisir » ou « Externe · Studio
Ressac », pastille du nombre d'actions à moi, « · livré »), puis spine « Parcours · Production » + étape ouverte.
Pas d'onglets : les décisions vivent dans leur étape (« Informations notées »), Travail et Activité sont dans la barre
projet. Chaque étape (membre) finit par « Signaler un blocage » et « Noter une information ».

Un parcours **par livrable transféré**, choisi à « Qui produit ? » :

| Livrable / mode | Étapes du proto (ids) |
| --- | --- |
| **Clip, Externe** (société) | Qui produit ? (`pq-clip`) → Call de production (`kickoff`, titre = « Call de production » / « Préparation avec PO » / « Organisation importée ») → Devis (`quote`) → Proposition de réalisation (`creative`) → Préproduction (`prep`) → Lieux (`locs`) → Contrôle avant tournage (`ready`) → Tournage (`shoot`) → Rushes (`rushes`) → Montage et retours (`post`) → Livraison et clôture (`delivery`) |
| **Clip / Teasers, Interne** | Qui produit ? → Brief réalisateur → Call de production / Préparation avec PO / Organisation importée (points Décision / Hypothèse / Action proposée / Point à arbitrer → « Approuver le plan de préproduction ») → Équipes et matériel → Lieu, budget et feuille de service → Tournage → Versions → Contrôle technique → Livraison |
| **Teasers, « Décliné du Clip officiel »** | Qui produit ? → Versions (bloquée tant que « Montage du clip validé ») → Contrôle technique → Livraison |
| **Pochette (Interne ou Externe)** | Qui produit ? → Versions de la pochette (image déposée, taille lue par le code) → Contrôle technique (auto : 3000 × 3000 px, JPG/PNG, carré ; manuel : lisible à 64 px, couleurs) → Livraison (« Distribution · pochette validée », « Activations ») |

Prérequis externes (proto) : devis après call ; proposition après devis ; préproduction après devis (en parallèle de la
proposition) ; lieux après proposition ; contrôle après **devis + proposition + lieux** (la préproduction n'est qu'une
ligne de la synthèse) ; tournage → rushes → montage → livraison.

### App (aujourd'hui)

`/app/projects/[id]/production` = **liste** des livrables de la Stratégie (StatTiles 5 états, carte par livrable,
« Préparer » / « Ouvrir la préparation », fichier final et décisions de livraison, `ValidationPanel` de l'étape
`production` démarrée par le responsable, validée par le DG). Puis `/production/[deliverableId]/<étape>` : en-tête
`SheetHeader` (« Production / <Livrable> », pastille « Production externe/interne », Fiche Vn, Enveloppe, Tournage visé,
Livraison), `NowCard`, `JourneySpine` (+ lien « Historique ») et `StepPanel`. Étapes (`lib/production/journey/steps.ts`) :

- externe : Organisation → Call de présentation à la société → Devis de la société → Proposition de réalisation et
  découpage → Préproduction par <société> → Lieux → Contrôle avant tournage → Tournage → Postproduction → Livraison et clôture ;
- interne : Organisation → Proposition de réalisation et découpage → Call technique → Équipe et matériel → Lieux →
  Devis et budget → Planning et feuille de service → Contrôle avant tournage → Tournage → Postproduction → Livraison et clôture.

Tout livrable a le parcours « tournage » complet ; pas de parcours léger (pochette), pas de mode « décliné ».

## 2. Écrans et étapes, dans l'ordre du parcours

Légende : **OK** identique · **DIFF** différent · **MANQ** manquant · **TROP** en trop. Effort S < ½ j, M 1–2 j, L > 2 j.

### 2.1 Entrée de la Production (barre de livrables, en-tête, liste)

- **Proto** : pas de page liste. Arrivée sur la Production du Marketing, barre de livrables transférés (carte = nom,
  mode · qui, pastille de mes actions, « livré »), sélection mémorisée ; sans livrable : « Aucun livrable en Production »
  / « La Production commence quand une fiche validée y est transférée depuis la Conception. » / « Ouvrir la Conception ».
  La Production commence au **transfert** de la fiche (Conception), sans étape à démarrer ni à valider.
  En-tête : bouton « Qui fait quoi » (modale verre `rolesModal`).
- **App** : `app/(app)/app/projects/[projectId]/production/page.tsx` (liste + StatTiles + `ValidationPanel`),
  `components/production/production-deliverable.tsx` (« Préparer », `FinalFileButton`, `DeliveryStepButton` — ancien flux
  de livraison du lot 8 nonies), `components/production/prep/sheet-header.tsx`, layout
  `production/[deliverableId]/layout.tsx`. `set_production_organization` exige `project_stage_in_progress('production')`.
- **Écart** : **DIFF** (parcours et design). Liste + stat tiles + démarrage/validation d'étape par le DG = **TROP** par
  rapport au proto (complexifie : une étape à « démarrer » avant de pouvoir choisir qui produit). Barre de livrables
  **MANQ** (on change de livrable en revenant à la liste). « Qui fait quoi » est une étape (« Organisation ») et non une
  modale d'en-tête. Fil d'Ariane : l'app a « Production / Livrable », pas l'étape. Effort **M**.
  Migration : rendre l'étape `production` démarrée automatiquement au premier transfert (ou ne plus l'exiger dans
  `set_production_organization` & co.) — à décider ; sinon garder la validation DG de fin de module masquée.

### 2.2 « Qui produit ? » (`pq-<livrable>`)

- **Proto** (scénario `prodstart`, `pqBody`) : faits « Fiche transférée : Clip officiel · V1 · Fiche unique »,
  « Livraison finale le Sam. 28/11/2026 ». Fieldset **« Qui produit ce livrable ? »** — cartes radio :
  Clip : « **Externe** · Une société de production est mandatée / La société se choisit juste en dessous » (cochée),
  « **Interne** · PDS pilote, avec ses freelances / Tom Mercier · chargé de production » ; Teasers : « **Décliné du Clip
  officiel** · La même production les tire du montage du clip / Fiche « Montant : compris dans le clip » », « Interne · PDS
  les monte à part » ; Pochette : « Interne · PDS la réalise ou la fait réaliser / Nadia Benali · responsable de la fiche »,
  « Externe · Un photographe ou un illustrateur du Réseau / Lou Vasseur · photographe, Réseau ». Note « Proposé d'après la
  fiche et le Réseau ; vous confirmez. » Puis (clip) **« Quelle société ? \* »** (`companyField`) : « Studio Ressac ·
  proposée par PO / Réseau · a produit le précédent clip de Mona Lys », « Atelier Nocturne / Réseau · trois clips R&B
  tournés de nuit en 2025 », « Lumen Films / Réseau · n'a jamais travaillé avec PDS », bouton « Créer la fiche d'une
  société » (modale `newPersonModal` « Nouvelle société dans le Réseau » : Nom de la société \*, E-mail du contact \*,
  Contact ; « Créer la société »). Puis (clip, teasers) **« Comment organiser la préproduction ? »** (`prepModeField`) :
  « Préparer directement avec PO / PO propose les points à trancher d'après la fiche ; vous les confirmez un par un. »,
  « Préparer un call de production / PO prépare l'ordre du jour ; après le call, il propose ce qui a été dit, avec la phrase
  exacte. », « Importer une organisation existante / Un planning ou un document déjà fait : PO en tire les points, vous les
  confirmez. » + « Ce choix ne déclenche rien à l'extérieur. » Bouton **« Confirmer »**. Erreurs : « Choisissez comment
  organiser la préproduction. », « Choisissez la société. ». Geste `pqset` → `setCompany` (la société devient
  « Production exécutive » + « Postproduction », reçoit son lien), journal « Clip officiel : production externe · Studio
  Ressac ». Fait : callout « **Externe · Studio Ressac** · préparer un call de production, choisi par Lina Haddad le …»,
  bouton « Changer qui produit ». Résumé spine : « Externe · Studio Ressac ». Qui agit : responsable du projet seul
  (autres : « En attente de … : choisir qui produit »).
- **App** : `organisation/page.tsx`, `components/production/journey/organisation-form.tsx` (`ChoiceCards` Interne /
  Externe : « PDS pilote. Les intervenants, freelances compris, travaillent chacun sur leur part. » / « Une société de
  production gère l'opérationnel. PDS suit et valide. ») + « Les rôles » : `HolderSelect` Société de production \*,
  `OptionSelect` Chargé de production, Validation des devis \*, Réalisateur, Chef opérateur ; bouton « Lancer la production
  interne/externe ». `lib/production/organization-actions.ts` (ouvre la fiche en mode `direct` puis
  `set_production_organization`), migration `20261014001401` (colonnes `production_sheets.organization`,
  `company_contact_id`, `line_producer_person_id`, `quote_validator_person_id`, `dop_*`), i18n
  `lib/i18n/fr/production-organization.ts`. Une fois fait : `WhoDoesWhat` + « Modifier l'organisation » repliable +
  `ScheduleSection` + `HeritageSection`.
- **Écart** : **DIFF**.
  - Mots : « Organisation » vs « Qui produit ? » ; « Lancer la production … » vs « Confirmer » ; textes des cartes.
  - Société : liste déroulante triée vs **cartes avec la raison** (« proposée par PO », historique Réseau) et création de
    société en modale → **MANQ** la suggestion argumentée (le « pourquoi » doit être calculé par le code : a déjà produit
    un clip de l'artiste, nombre de productions, jamais travaillé) ; création → `PersonPickerField` existe (création en
    modale), à brancher.
  - Chargé de production, validation des devis, réalisateur, chef op **dans** ce formulaire = **TROP** côté proto (ils sont
    dans « Qui fait quoi », pré-remplis ; le réalisateur est *proposé par la société* en externe, § 2.5). Garder les
    valeurs pré-remplies, sortir les champs du premier écran.
  - Mode de préparation (PO / call / import) : existe en base (`production_sheets.mode`, `open_production_sheet`) mais
    plus proposé à l'écran (l'app ouvre toujours en `direct`) → **MANQ** à l'écran (S).
  - Modes « Décliné du Clip officiel » et parcours léger (pochette) → **MANQ** (voir 2.17).
  Effort **M** (formulaire) ; migration : aucune pour la société/mode (colonnes présentes) ; une fonction SQL de
  suggestion n'est pas nécessaire (calcul TS sur `network_contacts` + projets).

### 2.3 « Changer qui produit » (modale `pqChangeModal`)

- **Proto** : modale « Changer qui produit · Clip officiel » : « Aujourd'hui : **Externe · Studio Ressac**. Ce parcours
  n'est pas effacé : il reste dans l'historique avec ses décisions. » ; « Déjà fait » (étapes faites + résumé) ; « Repris
  dans le nouveau parcours » (lieu retenu, date et horaires, budget de référence « devis Vn », proposition retenue, rushes
  reçus, versions déposées) ; callout « 16 400 € HT sont engagés auprès de Studio Ressac (devis V1 validé). Changer de
  production ne les annule pas. » ; « Nouveau choix \* » (autres sociétés + Interne) ; case « Révoquer le lien privé de
  Studio Ressac » (cochée, « Ce qu'elle a déposé reste… ») ; Motif \* ; « Changer qui produit ». L'étape `pq` garde
  « Choix précédents » (↺ mode · qui · arrêté le … par … : « motif », « Déjà fait : … ») ; les faits repris s'affichent
  « · repris du parcours précédent » dans les étapes.
- **App** : « Modifier l'organisation » (même formulaire, repliable) ; `set_production_organization` réécrit et journalise
  `organized` (avant/après) dans `production_events`. Pas de motif, pas de « déjà fait / repris », pas de révocation.
- **Écart** : **MANQ** (modale, motif, historique des choix, révocation). Effort **M**. Migration : paramètre `p_reason`
  + table `production_organization_changes` (ou `production_events` avec motif) ; fonction `revoke_production_provider_link`.
  Risque : changer de société remet à zéro devis/lieux/proposition dans le proto (`setCompany`) — en base ce sont des
  lignes liées à la fiche : à **garder** et marquer « parcours précédent », jamais supprimer.

### 2.4 « Qui fait quoi » (modale `rolesModal` = `BODY.org`) et liens privés

- **Proto** : rangées par rôle avec pastille **Coordonne / Exécute / Valide**, titulaire (avatar, nom, rôle, « · lien
  privé »), ce qu'il fait, bouton « Changer » (select dans le pool, « Les étapes déjà commencées restent intactes ;
  l'ancien titulaire reste dans l'historique. », « Enregistrer ») : Responsable du projet (Coordonne), Responsable de
  production (Coordonne), Production exécutive (Exécute, société), Réalisation (Exécute), Postproduction (Exécute, société
  ou monteuse), Responsable créatif (Coordonne), Validation budgétaire (Valide, DG), Validation créative interne (Valide,
  DA), Validation de la direction (Valide), Validation créative externe (Valide, management, « Pas de validation
  externe » possible). « X tient N rôles : chaque action dit à quel titre elle est faite. » Historique ↺. Bloc **« Liens
  privés »** : « Chaque lien ne montre que la part de la personne : ni l'enveloppe, ni les échanges internes, ni les
  autres prestataires. » ; par personne « Lien n° 1 actif » / « Révoqué le … · ce qu'il a déposé reste », « Révoquer »,
  « Nouveau lien » (flash « Affiché une seule fois : … », « L'ancien lien ne fonctionne plus. »). Artefact § 5 et § 8.
- **App** : `components/production/journey/who-does-what.tsx` (société, chef de projet, chargé de production, validation
  des devis, réalisateur, chef op ; « Lien privé » / « Compte PDS » ; création de lien `create_production_provider_link`,
  un nouveau lien remplace l'ancien ; `OneTimeLinksProvider`).
- **Écart** : **DIFF**. Rôles manquants : responsable créatif, validation créative interne/externe distinctes,
  postproduction ≠ société ; pas de typage Exécute/Coordonne/Valide ; pas d'historique des titulaires ; pas de
  « Révoquer » sans régénérer. Effort **M–L**. Migration : table `production_role_assignments` (sheet_id, slot,
  person_id | contact_id, assigned_by/at, ended_at) ou colonnes + journal ; `revoke_production_provider_link`.
  Le `StepPanel` (`components/shell/journey/step-panel.tsx`) affiche Responsable / Validation / Prérequis / Ensuite ;
  le proto : **Exécute / Coordonne / Valide / Prérequis / Ensuite** (5 colonnes, « · lien privé ») → **DIFF** S
  (brique commune, impacte le Juridique).

### 2.5 Call de production / Préparation (`kickoff` en externe, `iv<k>-2` en interne)

- **Proto** (`prepGate`, `BODY_MK.kickoff`, `prepBody`, `prepNext`) :
  1. Si le mode n'est pas choisi : fieldset mode + « Confirmer » (sinon attente « choisir comment organiser la
     préproduction »). Fait : « Organisation : Préparer un call de production · choisi par … » + « Changer » (tant que rien
     n'est créé).
  2. Mode **call**, non créé : « Nouveau call » — **Participants \*** en puces (`whoChips`, pré-remplis par fonction depuis
     « Qui fait quoi » via `callWho` : Production : Studio Ressac *externe*, Projet : Lina, Production PDS : Tom, Création :
     Nadia ; champ « Ajouter », suggestions Équipe/Externe, Entrée/Backspace, « Inviter x@y » / « Créer la fiche de « … » »
     → modale « Nouvelle fiche dans le Réseau » (Nom \*, E-mail \*, Structure, Fonction dans le call ; « Créer et
     inviter »)), « Externes : Studio Ressac (invitation sur son lien privé). » ; Date \*, Heure \*, Format (Visio / Sur
     place) ; **Ordre du jour** (`agendaRow` : 1. Le projet et le Brief créatif · 2. Contraintes : dates, lieu, enveloppe ·
     3. Ce que le devis doit contenir · 4. Prochaines étapes ; poignée glisser, flèches, Monter/Descendre, Modifier en
     place (Entrée/Échap), Retirer ; « Ajouter un point » + « Ajouter ») ; **« Envoyé avec l'invitation »** (Objectif
     « Présenter le projet à Studio Ressac et cadrer le devis : attentes, contraintes, enveloppe. », Documents « Fiche
     Livrable « Clip officiel » V1 · Brief créatif V1 · 3 références validées », Points ouverts « … · Fiche Livrable ›
     Points à préciser ») ; « Voir le récapitulatif » → **« Récapitulatif avant création »** (Quand, Participants, Ordre du
     jour, Objectif ; « Les invitations partent à la confirmation : Studio Ressac est externe. » ; « Confirmer et inviter »
     / « Modifier »). Erreurs : « Choisissez la date. », « Et l'heure. », « L'ordre du jour est vide. », « Un call réunit
     au moins deux personnes. ».
  3. Créé, pas tenu : « Call prévu : Jeu. 15/10/2026 à 14:00 · Visio · créé par … », « Lien de la visio », participants,
     ordre du jour ; « L'call s'enregistre dans PDS OS… » (coquille : « Le call ») ; bouton pointillé **« Proto : le call a
     eu lieu, compte rendu reçu »**. La société voit sur son lien « Votre prochain rendez-vous avec PDS / Call de production
     · Invité » (Quand, Où, Participants, Ordre du jour, « Invitation envoyée par … »).
  4. Tenu (externe) : faits « Call de production … · participants », « Compte rendu : Lire le compte rendu » (modale
     `crModal` : Date, Format « Visio · 52 min », Participants, Ordre du jour, Source « Enregistré dans PDS OS, transcrit,
     puis rangé par PO », « Tâches dites pendant le call » chaque phrase citée + état, « Ajouté après la réunion », « Les
     phrases sont citées telles quelles… »). Bandeau PO « PO propose les tâches dites pendant le call, avec la phrase
     exacte. Retenez, corrigez ou écartez chacune ; une phrase ambiguë reste « à confirmer » dans Décisions. » Carte
     « Tâches proposées · 4 à confirmer » (« Ajouter une tâche ») : chaque ligne « Pour : Studio Ressac · pour le 21/10 »,
     texte, « « citation » · Call de production du 15/10 », **Confirmer / Modifier / Écarter**. Une fois tout tranché :
     PO « PO a proposé 4 tâches tirées du call… Lina Haddad les a tranchées le …, sans en modifier. », « Tâches confirmées »
     (texte, qui, pour le, « origine : Call de production du 15/10 « … » », À faire / Fait), puis **« Résumé pour les
     participants »** (§ 3) et le bloc **« Réalisateur »** (§ 2.6).
     Interne : points rangés par sujet de l'ordre du jour (Décision / Hypothèse / Action proposée / Point à arbitrer),
     « Rien n'a été dit pendant le call sur : … », puis « Plan de préproduction » (Décisions, Hypothèses à vérifier,
     « Actions, qui deviendront des tâches », Points à arbitrer) et « Approuver le plan de préproduction » (les actions
     deviennent des tâches, les points à arbitrer des « informations à confirmer »).
  5. Modes **po** (points proposés d'emblée, source « Proposé par PO d'après la Fiche Livrable… ») et **import** (dépôt
     « Glissez un planning ou un document d'organisation… », « Importer » / « Utiliser un document d'exemple »).
- **App** : `call/page.tsx` ; externe : `components/production/prep/production-call-sheet.tsx` (`ProductionCallPanel`) +
  `production-call-form.tsx` (`AgendaTopicsField`, `ParticipantsField`, `CallFormatField`, `CallRecap`, « Vérifier » puis
  « Créer l'échange ») ; `lib/production/call-prep.ts`, `call-actions.ts` (`create_production_call`) ; vrai call
  enregistré (calls), extraction `app/api/calls/[callId]/extract/route.ts` → `fillProductionFromCall`
  (`lib/production/preprod/fill-from-call.ts`) → `production_call_items` ; `TechnicalCallSection`, `PlanSection`
  (« Planifier » qui + quand → `production_plan_actions` approuvées → tâches Travail ; contact du Réseau → actions visibles
  sur son lien `get_production_link_journey.actions`), `TeamBriefsSection` (interne). Import : `ProductionImportButton`
  (page Proposition). i18n `production-call.ts`, `production-preprod.ts`.
- **Écart** : **DIFF** (fond proche, forme différente).
  - Titre : app « Call de présentation à la société » / « Call technique » ; proto « Call de production » (ou « Préparation
    avec PO » / « Organisation importée »). S.
  - Participants pré-remplis par rôle et création d'une fiche Réseau en cours de saisie : `ParticipantsField` existe
    (commun aux calls) — vérifier pré-remplissage par fonction (« Production : … »). Ordre du jour : l'app calcule des
    sujets depuis ce qui manque (interne) ; en externe le proto a 4 points fixes éditables/réordonnables — `AgendaEditor`
    / `AgendaTopicsField` existent (vérifier glisser + flèches + édition en place). « Envoyé avec l'invitation » : à
    composer (objectif, documents, points ouverts). S–M.
  - Invitation visible sur le lien de la société : **MANQ** (`get_production_link_journey` ne renvoie pas les calls). M,
    migration : étendre la fonction (calls du livrable où le contact est participant : date, lien visio, participants,
    ordre du jour — jamais le compte rendu interne).
  - Propositions du compte rendu : l'app range en `production_call_items` puis « Planifier » chaque action ; le proto
    « Confirmer / Modifier / Écarter » puis tâches. Mots et geste à aligner sur la brique commune « proposition » (§ 3). M.
  - Mode PO / import à l'entrée : **MANQ** à l'écran (cf. 2.2). Résumé aux participants : **MANQ** dans la Production (§ 3).
  - « Une phrase ambiguë reste à confirmer dans Décisions » : pas de « Décisions » dans l'app (§ 2.12) → **MANQ**.

### 2.6 Réalisateur proposé par la société (`directorBlock`, `portalDirector`)

- **Proto** : tant que personne n'est désigné, l'étape « Proposition de réalisation » (et la fin du call) montre
  « Réalisateur » + « En attente de Studio Ressac (lien privé) : proposer un réalisateur ». Sur son lien, la société a la
  carte **« Proposer un réalisateur · À vous »** : Nom \*, Lien du showreel \* (https), « Pourquoi lui », « Proposer à
  PDS » (tâche du call « Proposer un réalisateur » passée « Fait · Proposition envoyée le … ») ; ensuite « Envoyé à PDS »,
  « Proposer un autre réalisateur ». Côté PDS : « Studio Ressac a proposé un réalisateur. Celui que vous retenez reçoit le
  rôle « Réalisation » et son lien privé ; les autres sont gardés ici. », ligne « Bastien Roy · https://vimeo… / « … » /
  Proposé par Studio Ressac le … · **Retenir** » ; une tâche « Retenir un réalisateur » est créée pour le responsable.
  Retenu : « Réalisation : **Bastien Roy** · proposé par Studio Ressac. Il a son lien privé pour la proposition de
  réalisation. » ; la société voit « Réalisateur · Retenu ».
- **App** : le réalisateur est choisi par le responsable à l'Organisation (`HolderSelect`), `set_production_director`.
- **Écart** : **MANQ** (proposition par la société + « Retenir »). Effort **M**. Migration : table
  `production_director_proposals` (sheet_id, name, reel_url, note, proposed_by contact, state proposed/retained/declined,
  decided_by/at) ; `propose_production_director_by_link(token, …)` ; `retain_production_director(id)` (crée/retrouve la
  fiche Réseau, pose le réalisateur, crée son lien). Règle : garder la désignation directe en interne.

### 2.7 Devis (`quote`)

- **Proto** (`BODY.quote`, scénario `quote`) : en-tête « Déposé par la société, vérifié par la production, validé par la
  validation budgétaire. Un dépôt ne vaut jamais validation. » ; Exécute Studio Ressac (Production exécutive · lien
  privé), Coordonne Tom Mercier (Responsable de production), Valide Claire Morel (Validation budgétaire).
  - Dépôt (lien de la société, « Déposer le devis · avant le 21/10 » — échéance = celle de la tâche du call, `quoteDue`) :
    « Déposer le devis V1 » : Montant total \*, Devis (PDF) \*, **« Dont montant prévu pour les lieux \* »** (aide
    « Location des lieux pour 1 jour de tournage (Ven. 23/10/2026). Le lieu retenu y sera comparé. » — jours de tournage
    = date de la Fiche + jours supplémentaires décidés, `shootDays`), Note pour PDS ; « Déposer le devis V1 ». Erreurs :
    « Un montant en euros, par exemple 16 400. », « Le montant prévu pour les lieux, par exemple 2 500 (0 si aucun lieu à
    louer). », « Ne peut pas dépasser le montant total du devis. », « Joignez le devis. ».
  - « Versions du devis » : « V1 · 16 400 € HT dont lieux 1 800 € HT · Devis_Ressac_Neons_V1.pdf », « Déposé par … le …
    », commentaires « Studio Ressac : « … » », pastille Déposé, à vérifier / Vérifié, à valider / Validé / Révision
    demandée / Refusé / Remplacé, « Voir le devis ».
  - Vérification (chargé de production) « Vérifier le devis V1 » : ✓ « Montant 16 400 € HT ≤ enveloppe 18 000 € HT ·
    calculé par le code », ✓ « Dont lieux : 1 800 € HT pour 1 jour de tournage · le lieu retenu sera comparé à ce
    montant », cases « Délais compatibles avec le tournage du 23/10 et la livraison du 28/11 », « Postes complets :
    réalisation, équipe, matériel, lieux, régie, postproduction » ; Commentaire ; **« Soumettre à Claire Morel »** /
    **« Demander une modification »** (commentaire obligatoire : « Dites ce qui doit changer : Studio Ressac le lira. »).
  - Décision (DG) « Décider du devis V1 » : « Vérifié par Tom Mercier : délais et postes cochés, montant dans
    l'enveloppe. », Commentaire, **« Valider le devis V1 » / « Demander une modification » / « Refuser »**.
  - Validé : « **Référence active : V1 · 16 400 € HT**, validée par Claire Morel le … » ; « Demander une révision du
    devis » (Motif \* ; « La V1 reste la référence jusqu'à la validation de la nouvelle version. » ; « Demander à Studio
    Ressac ») → callout « Révision demandée par … : « … » » ; l'étape passe « À revoir » sans bloquer la suite.
    Valider le devis **amorce la checklist de préproduction** (§ 2.9).
- **App** : `quote/page.tsx`, `components/production/quotes/{quotes-section,add-quote-button,quote-check-form,
  quote-decision-form}.tsx`, `lib/production/quotes/{actions,check,queries}.ts`, table `production_quotes`
  (`deposited/submitted/approved/rejected`, `checks`, `check_note`, `reason`), `submit_production_quote`,
  `decide_production_quote`, `deposit_production_quote_by_link` ; lien : `components/production/provider/link-quote-form.tsx`.
  Contrôles calculés (`quoteChecks`) : montant/enveloppe, délai de livraison, périmètre ; « Soumettre à … » ; « Valider le
  devis » / « Refuser » (motif). Interne : `BudgetBlock` sous les devis.
- **Écart** : **DIFF**.
  - Pas de numéro de version (V1, V2) ni de lien « remplace » ; pas d'état « Révision demandée » ; pas de « Demander une
    modification » (ni par le chargé de production à la vérification, ni par le DG) ; pas de « Demander une révision du
    devis » après validation avec référence active conservée ; pas de « dont lieux » ; pas de commentaires en fil.
    → **MANQ** partiels, Effort **M**. Migration : `production_quotes` + `number` (calculé par la base), `loc_budget_cents`,
    statut `changes`, `replaces_id` ; table `production_quote_comments` (ou jsonb) ; colonnes `production_sheets.quote_revision_reason/by/at`
    (ou table) ; `request_production_quote_changes`, `request_production_quote_revision` ; seuil « ne dépasse pas le total ».
  - Échéance du dépôt reprise de la tâche du call : **MANQ** (S).
  - Mots : « Devis de la société » vs « Devis » ; « Valider le devis » vs « Valider le devis V1 ». S.
  - **Sécurité / confidentialité** : le lien de la société affiche l'enveloppe interne (`get_production_link_journey`
    renvoie `envelopeCents`, `link-journey.tsx` l. 108 « Enveloppe : … »). Le proto l'interdit (« ni l'enveloppe… ») et
    l'Artefact § 8 aussi (« Ne pas exposer le budget global »). → **DIFF bloquant**, S, migration : réécrire
    `get_production_link_journey` sans `envelopeCents`.

### 2.8 Proposition de réalisation (`creative`)

- **Proto** (`BODY.creative`, portail réalisateur) : « Traitement, moodboard, découpage : ce qu'on tourne. Validé en
  interne, et en externe quand c'est requis. » Exécute réalisateur (lien privé), Coordonne responsable créatif, Valide
  interne + externe. Réalisateur sur son lien : « Déposer la proposition V1 » — Traitement / Moodboard / Découpage
  technique (« aucun fichier » puis nom du PDF), « Déposer la V1 » (« Joignez au moins le traitement et le découpage. »).
  Cartes de version repliables (`versionCard`) : « V1 · Retenue / À valider / Modifications demandées / Remplacée par la
  V2 », « Déposée par … le … », pièces avec « Ouvrir », bandeau « Interne · À valider » + « Externe · À valider » (ou « Pas
  de validation externe », « Sans suite » si remplacée), commentaires « Jade Petit (externe) : « … » ». Décision par
  validateur : « Votre décision sur la V1 · validation créative interne/externe », Commentaire (obligatoire pour
  modifier), « Valider la V1 » / « Demander des modifications ». Retenue : « **Version retenue : V1** » ; « Demander une
  nouvelle version » (Motif \*, « La V1 reste retenue jusqu'à la validation de la nouvelle. », « Demander à Bastien Roy »).
  Management (lien `/v/`) voit la proposition et valide « en plus de la validation interne, jamais à sa place ».
- **App** : `direction/page.tsx`, `ProductionBriefSection` (champs du brief réalisateur : intention, découpage, caméra,
  son, déroulé, contraintes, références, besoins), `components/production/journey/direction-decision.tsx`
  (`submit_production_direction`, `decide_production_direction`, statut `draft/submitted/approved/changes` sur la fiche,
  modifier ensuite = brouillon), lien réalisateur `link-direction-form.tsx` (`submit_production_direction_by_link`).
- **Écart** : **DIFF**. Pas de versions (V1, V2 conservées), pas de pièces jointes (traitement, moodboard, découpage), pas
  de validation externe (management) distincte de l'interne, pas de « version retenue » pendant qu'une nouvelle est en
  cours. Effort **L**. Migration : table `production_direction_versions` (sheet_id, number, files[], int_status,
  ext_status, comments, submitted_by contact|person) ; rôle « validation créative externe » (contact) + lien privé
  `/v/`-like ou rôle `validator` dans `production_provider_links` ; `decide_production_direction_version(int|ext)` et
  sa variante par lien. Le brief réalisateur structuré de l'app (PROD-tickets) peut rester le corps du « Traitement »
  en interne.

### 2.9 Préproduction (`prep`, externe)

- **Proto** : « Studio Ressac organise ; PDS suit les tâches, les échéances et les blocages. » **Checklist de
  préproduction** (« Tenue par Studio Ressac depuis son lien ; PDS ajoute les tâches propres au projet. Les tâches faites
  restent ici. ») amorcée à la validation du devis : « Calls techniques faits · pour le 19/10 », « Matériel réservé · 20/10 »,
  « Équipe confirmée · 21/10 », « Planning envoyé · 21/10 » (origine « Checklist de préproduction »), plus les tâches
  ajoutées (« Réserver 15 figurants · Tom Mercier · origine : Saisie par Lina Haddad ») et celles d'un changement
  (« Revoir le matériel pour Entrepôt Quai de Seine · origine : Changement de lieu du 21/10 », pastille « À revoir »).
  Ligne : texte, qui, pour le, origine, « faite le … », pastille À faire / Faite, bouton « Fait » pour son titulaire.
  « Ajouter une tâche » (Tâche \*, Qui la fait, Échéance ; « Ajouter »). Spine : « Studio Ressac et Tom Mercier · faire
  avancer 2 tâches de préproduction · et 1 autre ». Résumé « 2 / 5 tâches faites ».
- **App** : `follow-up/page.tsx`, `components/production/journey/company-progress.tsx` (4 cases `company_progress` jsonb :
  Calls techniques faits, Matériel réservé, Équipe confirmée, Planning de tournage envoyé, « Mis à jour le … »),
  `set_production_progress_by_link`, `link-progress.tsx` ; + matériel saisi le cas échéant (`EquipmentSection`).
- **Écart** : **DIFF**. Mêmes 4 points mais en cases sans échéance, sans responsable, sans ajout de tâche, sans origine ;
  pas de tâche PDS mêlée ; pas d'« À revoir ». Effort **M**. Migration : remplacer `company_progress` par des
  `production_plan_actions` (titre, contact_id/person_id, due_date, origin) amorcées par `decide_production_quote`
  (approve) avec les échéances calculées (rétroplanning existant `dueByStep`) ; `finish_production_action_by_link(token,
  action_id)`. Reprise des données : convertir `company_progress` existant.
  Prérequis : l'app met « Préproduction » après « Proposition » et exige qu'elle soit finie avant le Contrôle ; le proto
  l'ouvre après le devis, en parallèle, et le contrôle ne l'exige pas (ligne de synthèse). **DIFF** S (steps.ts).

### 2.10 Lieux (`locs`)

- **Proto** : « La société propose, PDS retient un lieu. Le remplacer crée une nouvelle décision, l'ancienne reste. »
  « Lieux proposés » + bouton d'en-tête « Proposer un lieu » (société) : Nom \*, Adresse, Tarif à la journée,
  Disponibilités, Contraintes techniques et logistiques, Photos (glisser-déposer, « JPG, PNG ou HEIC, plusieurs à la
  fois »), Lien (album, fiche du lieu ; https) ; « Proposer ce lieu » / « Modifier ». Carte : photo + « n photos »,
  nom + pastille Proposé / Retenu / Non retenu / Remplacé, adresse, « 1 400 € HT la journée · 23 et 24/10 », contraintes,
  **« Compris dans le devis V1 (1 800 € HT prévus pour les lieux) »** ou **« Dépasse de 400 € HT le montant prévu pour les
  lieux (…) : révision du devis à prévoir »** (calculé : tarif × jours de tournage vs « dont lieux »), « Album et fiche
  du lieu », « Proposé par Studio Ressac », crédit photo, **« Retenir ce lieu »** (responsable). Retenir au-dessus du
  devis → modale « Retenir <lieu> » (callout dépassement, case cochée « Demander une révision du devis à Studio
  Ressac », « Le devis V1 reste la référence… », « Retenir ce lieu »). Retenu : « **Lieu retenu : Rooftop Belleville** ·
  le même pour tous les intervenants autorisés. » ; « Décisions sur le lieu » (✓ / ↺ date · qui retient · « motif » ·
  remplacé le …). **« Remplacer le lieu retenu »** → « Remplacer Rooftop Belleville » : « Une nouvelle décision :
  l'ancienne reste dans l'historique, avec sa validation. Le reste du projet continue. », Nouveau lieu \* (liste avec
  « · compris dans le devis » / « · dépasse de … »), Motif \* (pré-rempli par l'information liée), « Informations liées »
  (cases cochées : « Notées dans Décisions, encore à confirmer. Cochées, elles passent en « Décidé » avec ce
  remplacement. »), **« Ce qu'il faut revoir »** (« Choisi par vous : chaque case crée une tâche pour la bonne
  personne. » : Découpage et scénario → Bastien Roy ; Matériel → Studio Ressac ; Planning et feuille de service → Studio
  Ressac ; Budget : révision du devis → Studio Ressac, cochée seulement si dépassement) ; « Remplacer le lieu ». Effets :
  tâches « origine : Changement de lieu du 21/10 », révision du devis et nouvelle version de proposition demandées, étapes
  Devis / Proposition / Préproduction « À revoir » (spine orange, pas de blocage), flash « Entrepôt Quai de Seine remplace
  Rooftop Belleville ». Artefact § 11.
- **App** : `locations/page.tsx`, `components/production/locations/*` (`LocationsBoard`, `LocationCard`, comparaison,
  consultations et avis par rôle, `LocationReview`), `lib/production/locations/*`, `production_location_options`,
  `production_location_consults`, `propose_production_location_by_link`, `review_production_location(_by_link)` ; « Retenir
  ce lieu » (motif facultatif) / « Écarter » (motif) / « Remettre en candidat » ; lieu de la fiche « Confirmé ».
- **Écart** : **DIFF**. App plus riche sur les avis (PROD-011 à 013, à garder). **MANQ** : comparaison tarif × jours vs
  « dont lieux » (dépend de 2.7), modale de dépassement → révision ; **remplacement** avec motif obligatoire, informations
  liées et « Ce qu'il faut revoir » qui crée des tâches et met des étapes « À revoir » ; historique des décisions de lieu
  visible dans l'étape. Effort **M–L**. Migration : `replace_production_location(sheet, option, reason, reviews[], notes[])`
  (crée les `production_plan_actions` d'origine « Changement de lieu », pose `quote_revision`, demande de nouvelle version
  de proposition) ; état « À revoir » calculé (pas stocké) depuis les actions ouvertes d'origine « Changement ».
  Photos : l'app a les médias (fichier ou lien) — OK.

### 2.11 Contrôle avant tournage (`ready`)

- **Proto** (scénarios `change`, `ready`) : « La synthèse de ce qui est réellement prêt, confirmée explicitement, puis
  gardée telle quelle. » Note « Calculée à partir de ce qui est réellement validé : une information « à confirmer » ne
  compte jamais comme prête. » Lignes (Prêt / Pas prêt) : **Lieu retenu** (« Entrepôt Quai de Seine · Compris dans le
  devis V2 … » ; pas prêt si dépassement), **Date et horaires** (« Tournage le Ven. 23/10/2026, de 8 h à 15 h · décidé par
  Lina Haddad » + « Changer la date et les horaires » → modale « Date du tournage \*, Début \*, Fin \*, Décidé lors de
  (Réunion/Appel/WhatsApp/E-mail/Autre) ; Valider la date et les horaires », l'ancienne reste dans l'historique),
  **Équipe confirmée**, **Planning et feuille de service**, **Matériel** (« Fait · 22/10, 12:00 » ou « Pas encore ·
  Studio Ressac », lus dans la checklist), **Devis** (« V2 validé · 17 200 € HT », « · révision en cours »),
  **Proposition de réalisation** (« V2 validée »), **Blocages actifs** (texte · à lever par … + « Lever le blocage » /
  « Choisir ce qui fait foi »), **Informations à confirmer** (+ « Ouvrir les décisions »). Si des points manquent :
  callout « 3 points ne sont pas prêts. Vous pouvez confirmer quand même, en connaissance de cause et avec un motif. »,
  case « Je confirme la préparation malgré planning et feuille de service, blocages actifs, informations à confirmer »,
  Motif \* ; **« Confirmer : préparation validée »**. Fait : « **Préparation validée — tournage à venir.** Confirmée par …
  le … malgré : « … ». La synthèse ci-dessous est gardée telle qu'elle a été validée. » + tableau figé ; la société voit la
  même phrase sur son lien. Artefact § 13.
- **App** : `readiness/page.tsx`, `components/production/preprod/readiness-{section,actions,dialogs}.tsx`,
  `lib/production/preprod/readiness.ts`, `production_readiness_checks` + `production_check_evidence` (lieu, équipe,
  matériel, planning, budget, feuille de service, autorisations, sauvegarde prévue), « Déroger » par contrôle (motif),
  responsable par contrôle, `mark_production_ready` ; libellé « Marquer prêt pour tournage », résumé « Prêt pour tournage ».
- **Écart** : **DIFF**. En externe, les contrôles de l'app exigent des données que PDS ne saisit plus (postes, matériel,
  feuille de service diffusée) → la fiche externe ne peut être « prête » que par dérogations (incohérent avec § 0.3 :
  la société gère l'opérationnel). Proto = synthèse lue (checklist société, devis, proposition, lieu vs devis, date et
  horaires décidés, blocages, informations à confirmer) + **confirmation globale forcée avec motif** + **synthèse figée**.
  Effort **M** (externe) ; interne : garder les contrôles PROD-017 (ticketés) mais y ajouter les lignes Devis,
  Proposition, Blocages, Informations et la synthèse figée. Migration : `production_sheets.ready_snapshot jsonb`,
  `ready_forced_reason` ; décision « date et horaires » (table des informations § 2.12 avec `key='schedule'`, ou colonnes
  `shoot_start_time/end_time` + journal) ; `mark_production_ready(p_force_reason)` pour l'externe. Mots : « Confirmer :
  préparation validée », « Préparation validée — tournage à venir » (Artefact § 13 l'exige). Montrer la confirmation sur
  le lien de la société : **MANQ** (S, via `get_production_link_journey`).

### 2.12 Informations notées et décisions (`stepDecisions`, `decisionsModal`, `strip`)

- **Proto** : sur chaque étape, « Informations notées » (texte ; « source · noté par … le … · étape · confirmé par … ·
  fait foi » ; pastilles Information / À confirmer / En attente de décision / Décidé / Écartée ; « Confirmer » / « Décider »
  / « Écarter » ; en contradiction : « Fait foi » + « Deux informations se contredisent : tant qu'aucune ne fait foi, c'est
  un blocage. »). Bouton « Noter une information » → « Ce qui a été dit \* », Source (Appel, WhatsApp, E-mail, Réunion,
  Autre), Statut, Étape concernée, **Contredit** (une autre info) ; « Noter ». Modale « Informations et décisions »
  (Contradiction à trancher, En attente de décision, À confirmer, Décidé, Informations, Écartées ou remplacées). Une
  contradiction non tranchée devient un **blocage automatique** (« Informations contradictoires : « … » / « … » »,
  débloque : responsable du projet, « Indiquer l'information qui fait foi »). « Confirmer ou écarter n informations
  notées » est une action du responsable dans « Maintenant ». Artefact § 10, § 12.
- **App** : rien d'équivalent dans la Production (les `production_call_items` « hypothèse / point à arbitrer » du call
  sont le plus proche).
- **Écart** : **MANQ**. Effort **L** (brique commune à toute l'app selon VISION-UX règle 14). Migration : table
  `production_notes` (ou générique `project_notes` : project_id, scope workflow/sheet, step_key, text, source, kind
  info/confirm/pending/decided, group_id, foi, discarded_at, noted_by/at, confirmed_by/at, key, extra_day) + fonctions
  `note_…`, `confirm_…`, `discard_…`, `set_foi_…` ; contradictions et blocage calculés par le code.

### 2.13 Blocages (`blockerForm`, `blockerRow`, `liftModal`)

- **Proto** : « Signaler un blocage » sur toute étape (membres) : Ce qui bloque \*, Qui débloque \* (toutes les
  personnes), Prochaine action \* ; « Signaler ». Affichage : callout rouge « **Bloqué** · … / Débloque : Tom Mercier ·
  prochaine action : Relancer la mairie d'Aubervilliers · signalé le … par … » + « Lever le blocage » (modale : rappel,
  « Ce qui l'a réglé \* », « Le blocage reste dans l'historique avec cette explication. Le contrôle avant tournage ne le
  compte plus. », « Lever le blocage »). Spine : icône stop sur l'étape ; « Maintenant » : variante « Blocage à lever »
  pour son titulaire ; bandeau « n blocage(s) » en tête.
- **App** : rien dans la Production (incidents de tournage seulement) ; **existe dans Activations**
  (`components/activations/pilot/{blocker-form,blocker-buttons,blockers-section}.tsx`, `activation_blockers`).
- **Écart** : **MANQ**. Effort **M** si on généralise la brique Activations. Migration : `production_blockers` (sheet_id,
  step_key, text, owner person|contact, next_action, opened_by/at, lifted_by/at, resolution) ou table générique
  `workflow_blockers` partagée avec Activations.

### 2.14 Tournage (`shoot`)

- **Proto (externe)** : « Confirmer qu'il a eu lieu ; ensuite, les fichiers sont attendus. » « Prévu le Ven. 23/10/2026
  à l'Entrepôt Quai de Seine. » ; « Confirmer que le tournage a eu lieu » (responsable) → « **Tournage terminé — fichiers
  attendus.** Confirmé par … ». Exécute société, Coordonne production, Valide responsable. **Interne** (`intVideoSteps`) :
  gestes « Confirmer : préparation validée », « Confirmer que le tournage a eu lieu », « Rushes vidéo et audio récupérés »,
  « Sauvegarde vérifiée ».
- **App** : `shoot/page.tsx` + `components/production/shoot/*` (« Lancer le tournage », états prévu/en cours/terminé/
  partiel/reporté/interrompu, « Le jour du tournage », déclarations rushes vidéo / sources audio / sauvegarde,
  incidents, retour matériel, compte rendu figé, suivis). PROD-018 à 024.
- **Écart** : **DIFF**. Interne : app plus riche et ticketée → garder. Externe : l'app montre la même page (lancement,
  états, matériel loué…) alors que la société tient le tournage ; le proto se limite à « Confirmer que le tournage a eu
  lieu » → **TROP** en externe (complexifie). Effort **S–M** : variante externe (masquer matériel/équipe/compte rendu,
  garder confirmation + incidents). Mots : « Tournage terminé — fichiers attendus » (Artefact § 14).

### 2.15 Rushes (`rushes`, externe)

- **Proto** : tableau « Lien des rushes » (« Attendu de Studio Ressac » / lien · transmis par … le …), « Rushes reçus »
  (« Oui, vidéo et audio · Tom Mercier, … »), « Sauvegarde vérifiée », « Transfert à <monteuse> » (À envoyer / Envoyé /
  Reçu, seulement si la postproduction n'est pas la société). Société (lien) : « Lien de récupération des rushes \* »,
  « Transmettre le lien ». Chargé de production : « Rushes vidéo et audio reçus » (« Le lien fonctionne et les fichiers
  sont complets. Sinon : signalez un blocage. »), puis « Sauvegarde vérifiée » (« Les rushes sont copiés à deux endroits
  au moins, et les copies s'ouvrent. »), puis « Transférer à Inès Garnier » ; monteuse : « Bien reçu pour le montage ».
  « Studio Ressac monte aussi : pas de transfert, le montage peut commencer. »
- **App** : déclarations dans `production_shoots` (rushes vidéo, audio, sauvegarde ; qui récupère, qui vérifie,
  emplacements) saisies par un membre, dans la page Tournage. Pas d'étape « Rushes », pas de lien déposé par la société,
  pas de transfert.
- **Écart** : **MANQ** (étape et dépôt par lien) / **DIFF** (déclarations existantes). Effort **M**. Migration :
  colonnes `rushes_url`, `rushes_by_contact`, `rushes_at`, `transfer_status` (to_send/sent/received) sur
  `production_shoots` ou la fiche ; `set_production_rushes_by_link(token, url)` ; `confirm_rushes_received_by_link`
  pour un monteur externe.

### 2.16 Montage et retours (`post`) et Livraison et clôture (`delivery`)

- **Proto (externe)** : « Chaque version a son lien et ses retours ; elle est en revue, à modifier ou validée. » Société
  (lien) : « Lien du montage V1 \* », « Déposer le montage V1 ». Cartes « Montage V1 · En revue / Modifications
  demandées / Validée / Remplacé par la V2 », lien, bandeau Interne/Externe, retours. DA puis management : « Votre retour
  sur le montage V1 », Retours (obligatoire pour modifier), « Valider le montage V1 » / « Demander des modifications ».
  Livraison : « Fichier final » (attendu / nom · déposé par …), « Validé par Nadia Benali et Jade Petit », « Livré à … » ;
  société : « Déposer le fichier final du montage V2 » ; responsable : **« Destinataires de la livraison \* »** (« Pré-cochés :
  ceux qui en ont besoin dans PDS OS. Les autres viennent du projet et du Réseau. » : Lina Haddad · Distribution, Nadia
  Benali · Activations, Jade Petit · validation externe ; « Ajouter un destinataire » → sélecteur de personnes « Liées au
  projet » / « Réseau », « Créer un contact », « Garder seulement le nom »), « Confirmer la livraison », puis « Clôturer
  la production » → « **Production clôturée** le … La synthèse avant tournage et la version livrée restent
  consultables. » **Pochette/teasers** : voir 2.17.
- **App** : `post/page.tsx` (`components/production/post/*` : références, étapes de post, versions illimitées numérotées,
  retours horodatés, demandes de corrections, décision unique Valider / Demander des corrections / Refuser, lien
  prestataire), `delivery/page.tsx` (`components/production/delivery/*` : fichiers attendus et contrôle point par point,
  dépôts gardés, transmission aux Activations avec responsable, clôture `close_production_sheet`), lien `/p/[token]`
  (`provider-space.tsx` : mission, corrections, dépôt de version et d'exports, « Mission terminée »).
- **Écart** : **DIFF**. App beaucoup plus riche et ticketée (PROD-025 à 040) → garder. **MANQ** : validation
  **externe** (management) en plus de l'interne ; en externe, la société dépose sans « étape de post » créée à la main
  (l'app exige une étape avec intervenant pour ouvrir le lien) ; destinataires multiples de la livraison (Distribution,
  Activations, valideur externe). Mots : « Postproduction » vs « Montage et retours » ; « Valider le montage Vn ».
  Effort **M**. Migration : `production_versions.ext_status` + décision par lien ; étape de post implicite « Montage » tenue
  par la société à l'organisation externe ; `production_delivery_recipients` (ou réutiliser
  `production_activation_handoffs` + destinataires libres).

### 2.17 Parcours légers : pochette, teasers déclinés, interne simplifié

- **Proto** : `lightSteps` (Versions → Contrôle technique → Livraison) et `intVideoSteps` (gestes génériques à rôle :
  « Compléter le brief réalisateur », « Confirmer les équipes image, son et musiciens », « Valider la liste du matériel
  (aucune réservation tant que le loueur ne l'a pas confirmée) », « Retenir le lieu », « Valider le budget de production »
  (validation budgétaire), « Envoyer la feuille de service », « Confirmer : préparation validée », … ; historique ✓ par
  geste). Pochette : dépôt d'image (« Glissez l'image de la pochette… Le code lit sa taille et son format. »), « Contrôlé
  par le code » (3000 × 3000 px / JPG ou PNG / Carré : Conforme / Non conforme), « À contrôler » (cases), « Confirmer :
  fichiers conformes » ou « Le fichier validé n'est pas conforme : demandez une nouvelle version. », Livraison
  « Distribution · pochette validée · Activations », « Livré ne veut pas dire publié. ». Teasers déclinés : bloqués jusqu'à
  « Montage du clip validé ».
- **App** : tout livrable suit le parcours tournage (interne très détaillé : besoins, matériel, feuille de service,
  contrôles, etc.).
- **Écart** : pochette et « décliné » **MANQ** (L). Interne : app plus détaillée que le proto (qui la résume en gestes) —
  les tickets PROD-001 à 040 l'exigent → **garder l'app**, n'aligner que les titres/ordre des étapes ; signaler à Sacha
  que le proto interne est un résumé (pas un retrait demandé). Migration : `production_sheets.organization` +
  `'derived'` et `derived_from_sheet_id` ; `production_sheets.track` (`shoot` | `artwork`) déduit de la Fiche (type de
  livrable image) ; `production_versions.width/height/mime` lus par le code au dépôt ; contrôles auto d'export image.
  Question ouverte n° 13 de `PRODUCTION-METIER.md` (contenus sans tournage) : le proto y répond (pochette) → à écrire dans
  `docs/`.

### 2.18 « Maintenant », spine et page privée (lien `/p/`)

- **Proto « Maintenant »** : « À vous » / « Aussi à vous » (si l'étape ouverte est déjà la mienne) / « À vous, ailleurs »
  (autre module) / « Rien à faire pour vous » ; ligne « Lina Haddad · Production › Qui produit ? · pour le … » ; titre =
  action ; pourquoi ; « Ouvrir l'étape » ; « Et 6 autres : choisir qui produit (Qui produit ?) · … » ; callout « n
  blocage(s) à lever par vous » ; variante « Blocage à lever ». Pour un externe, seulement la Production du clip, une
  ligne. Flash après chaque geste : « Devis V1 soumis / Ensuite : **Claire Morel** · valider le devis (Devis) ».
  **Spine** : statut (✓ fait, cadenas plus tard, « À revoir » orange), sous-titre (« À vous · Lina · … », « Après : Devis,
  Proposition de réalisation, Lieux », résumé de l'étape fait), icône bloqué.
- **Proto page privée** (société) : en-tête « PDS · Clip « Néons » · Studio Ressac · Lien privé /p/… · sans compte »,
  « Néons · Mona Lys · Société de production », « Ce que PDS attend de vous » / « Rien à faire pour l'instant », cartes
  triées **À vous (échéance la plus proche d'abord) → « En attente de PDS » → « Fait · n » replié** (`portalCards`), cartes
  : invitation au call, « Call de production du 15/10 » (résumé envoyé + « Ce qui vous a été demandé »), « Proposer un
  réalisateur », Devis, Lieux, Préproduction, Rushes, Montage, Livraison ; « Votre contact chez PDS · Lina Haddad ». Dans
  le proto global (`src/global/host.js` `portalPage`), **une page par personne** réunit les cartes de tous les workflows.
- **App** : `NowCard` (`components/shell/journey/now-card.tsx`, sans `shownKey` dans le layout Production → répète l'étape
  ouverte), `JourneySpine` (statuts done/current/blocked/upcoming, pas « À revoir »), page `/p/[token]` = `LinkJourneyView`
  (Vos tâches, Proposition, Devis, Avancement, Lieux, Matériel) + `ProviderSpaceView` (mission de post), en-tête
  « <Livrable> », « intro », « valable jusqu'au … ». Un lien **par fiche et par contact**.
- **Écart** : **DIFF**. NowCard : passer `shownKey`, « À vous, ailleurs », flash « Ensuite : … » après geste (S–M).
  Spine : statut « À revoir » (M, calculé). Page privée : tri À vous / En attente de PDS / Fait replié, invitation au call,
  résumé, réalisateur, confirmation « Préparation validée », sans enveloppe (M) ; page **par personne** tous workflows
  (brique commune, hors zone, L).

## 3. Briques communes utilisées par la zone

| Brique | Proto | App : ce qui existe et où | Écart |
| --- | --- | --- | --- |
| Formulaire de call commun | `prepGate` (puces participants, ordre du jour éditable/réordonnable, envoyé avec l'invitation, récap, « Confirmer et inviter ») | `components/calls/{participants-field,attendees-field,agenda-editor,agenda-topics-field,call-recap,call-format-field,create-call-form}.tsx` ; Production : `components/production/prep/production-call-form.tsx` | Proche ; ajouter « Envoyé avec l'invitation », pré-remplissage par fonction, création de fiche Réseau dans le champ, invitation sur lien privé |
| Compte rendu | modale `crModal` (points de l'ordre du jour, phrases citées, état) | page du call (`components/calls/call-results.tsx`, `call-outcomes.tsx`, `call-processing.tsx`), `fillProductionFromCall` | Pas de lecture « par point » dans l'étape Production ; lien vers la page du call |
| Résumé aux participants | `summaryBlock` / `summaryFor` / `sumDraft` (rédigé par PO, versions, envoi à l'équipe + lien privé / e-mail) | `components/calls/closure/share-report-form.tsx` (« Partager le compte rendu », PROJ-AMEL-01, mailto pour externes) | À brancher dans l'étape Production + affichage sur le lien de la société |
| Proposition Confirmer / Modifier / Écarter | `itemRow` (texte, citation, source, 3 boutons, « Ajouter ») | `production_call_items` + `components/production/preprod/call-item-row.tsx` ; Stratégie/Conception ont leurs `*proposal*` | Mots à unifier (« Planifier » vs « Confirmer ») |
| Cartes de versions | `versionCard` repliable, dernière + retenue ouvertes | `components/production/post/version-card.tsx`, Master (`components/master-workflow/*`) | Devis et proposition sans cartes de versions |
| Décision avec motif | Valider / Demander des modifications (commentaire obligatoire) / Refuser | `quote-decision-form.tsx`, `direction-decision.tsx`, `post/decision-form.tsx`, `ReasonForm` | OK sur le principe |
| Modale verre | `dialog.modal` (Qui fait quoi, Informations et décisions, Changer qui produit, Retenir, Lever, Date et horaires, Nouvelle société, Compte rendu) | `FormDialog`, `ConfirmDialog` (`components/ui/`) | Disponible |
| Pages privées triées | `portalCards` | `/p/[token]` non trié | À faire |
| « Maintenant » | `nowCard` | `NowCard` | `shownKey`, « ailleurs », blocages |
| Parcours (spine + étape) | `spineItem` + `detail` (meta 5) | `JourneySpine`, `StepPanel` (meta 4) | Ajouter « Exécute / Coordonne », statut « À revoir » |
| Fil d'Ariane, chevrons | `Néons › Marketing › Production › Livrable › Étape`, chevrons Marketing | chevrons `lib/ui/marketing-steps.ts` / `components/projects/section-steps.tsx` ; Production : « Production / Livrable » | Ajouter livrable + étape au fil |
| Cartes de choix « Recommandé » | « proposée par PO » sur la société, « Proposé d'après la fiche et le Réseau ; vous confirmez. » | `ChoiceCards` (`components/ui/choice-cards.tsx`) ; « Recommandé » existe en i18n framing-intel | Ajouter la mention + raison |
| Sélecteur de personnes | `pickerModal` (Liées au projet / Réseau / Créer un contact / Garder seulement le nom) | `PersonPickerField` | Disponible (destinataires livraison) |
| Blocages | `blockerForm` / `liftModal` | Activations : `components/activations/pilot/blocker-*` | À généraliser |
| Informations notées / fait foi | `decisionsView` | — | À créer (VISION-UX règle 14) |

## 4. Simulations du proto et vrai événement de l'app

| Geste du proto | Remplacé dans l'app par |
| --- | --- |
| **« Proto : le call a eu lieu, compte rendu reçu »** (seul bouton pointillé de la zone, `prepheld`) | Call enregistré dans PDS OS (`call-recorder`, parts toutes les 20 s) → transcription Groq (`lib/ai/transcribe.ts`) → compte rendu → `app/api/calls/[callId]/extract` → `fillProductionFromCall` → propositions (`production_call_items`) |
| « Voir comme » Studio Ressac / Bastien Roy / Jade Petit / Inès Garnier (rôles « (lien) ») | Le vrai lien privé `/p/[token]` du contact (créé par `create_production_provider_link`, montré une fois) ; pour le management : **aucun lien Production aujourd'hui** |
| « Remplir avec un exemple » (devis, lieu, réalisateur), « Utiliser un lien d'exemple » (rushes, montage, versions), « Joindre les fichiers d'exemple » (proposition), « Utiliser un fichier d'exemple » (pochette), « Utiliser un document d'exemple » (import) | Saisie et dépôt réels sur le lien (slots `open_production_provider_slot`, bucket `production-files`) ou dans l'app ; import : `ProductionImportButton` (texte collé) |
| « Confirmer et inviter » (« Les invitations partent à la confirmation ») | Création du call (`create_production_call`), notification des membres (`inviteProjectTeam`) ; externe : l'invitation doit apparaître sur son lien (à faire) — pas d'e-mail envoyé par PDS OS |
| « Envoyer aux participants » (résumé) | Notification in-app aux membres + carte sur le lien privé + `mailto` pour une adresse hors Réseau (modèle `share-report-form`) |
| « Nouveau lien » (« Affiché une seule fois ») | `create_production_provider_link` + `OneTimeLinksProvider` |
| Dates simulées (`S.base`, `stamp()`) | Horodatage base (`now()`), `Timestamp` |
| « Confirmer que le tournage a eu lieu », « Rushes reçus » | Déclarations humaines (pas de contrôle de fichier) : `production_shoots` ; dépôt du lien des rushes par la société (à créer) |

## 5. Découpage proposé en sous-lots (ordonnés, chacun livrable et testable seul)

| Lot | Contenu | Migration | Effort | Risques |
| --- | --- | --- | --- | --- |
| **PR-0** Conformité immédiate | Retirer l'enveloppe du lien société ; titres des étapes = proto (« Qui produit ? », « Call de production », « Devis », « Proposition de réalisation », « Préproduction », « Montage et retours ») ; « Confirmer : préparation validée » / « Préparation validée — tournage à venir » / « Tournage terminé — fichiers attendus » ; `NowCard shownKey` ; `StepPanel` Exécute / Coordonne / Valide | `create or replace get_production_link_journey` sans `envelopeCents` | S–M | `StepPanel` partagé avec le Juridique (vérifier ses pages) ; test `production-journey.test.sql` |
| **PR-1** Entrée par livrable | Barre de livrables + atterrissage sur le livrable (la liste `/production` devient redirection ou la barre) ; « Qui produit ? » avec cartes, société suggérée avec raison + création de fiche, mode de préparation (PO / call / import) ; rôles sortis du premier écran (pré-remplis) | Aucune (colonnes `mode`, `organization` existent) ; décision sur l'étape `production` (démarrage auto au transfert ?) | M | Retirer `ValidationPanel` change la règle « le DG valide la Production » (CLAUDE.md, CONTEXTE) : à trancher et documenter ; `FinalFileButton` / `DeliveryStepButton` (ancien flux) à masquer |
| **PR-2** Qui fait quoi | Modale d'en-tête, 9–10 rôles typés Exécute/Coordonne/Valide, changement avec historique, liens privés Révoquer / Nouveau lien | `production_role_assignments` ; `revoke_production_provider_link` ; RLS + `can_see_project_row` pour les nouveaux rôles membres | M–L | Les droits actuels lisent `line_producer_person_id`/`quote_validator_person_id` : migrer sans casser `production_can_organize` |
| **PR-3** Changer qui produit | Modale avec Déjà fait / Repris / montant engagé / révocation / motif ; « Choix précédents » | `production_organization_changes` (ou motif dans `production_events`) | M | Ne jamais supprimer devis/lieux du parcours précédent |
| **PR-4** Call de production externe | Pré-remplissage participants par rôle, ordre du jour 4 points, « Envoyé avec l'invitation », invitation sur le lien, propositions Confirmer/Modifier/Écarter, tâches avec origine, résumé aux participants | Étendre `get_production_link_journey` (calls, résumé) ; table des résumés si `share-report` ne suffit pas | M | Le call réel dépend du pipeline d'enregistrement (déjà en place) |
| **PR-5** Réalisateur proposé par la société | Carte « Proposer un réalisateur » sur le lien, « Retenir » côté PDS, tâche « Retenir un réalisateur » | `production_director_proposals` + 2 fonctions | M | Interne : garder la désignation directe |
| **PR-6** Devis versionné | V1/V2, dont lieux, Demander une modification (charge et DG), Référence active, Demander une révision, échéance reprise de la tâche du call ; amorce de la checklist à la validation | `production_quotes` (+ number, loc_budget_cents, statut `changes`, replaces_id, comments) ; révision sur la fiche | M | Données existantes : numéroter par date de dépôt |
| **PR-7** Préproduction en checklist | 4 tâches de base avec échéances et responsable société, ajout de tâches PDS, « Fait » par le lien, origine ; prérequis : ouverte après le devis, non exigée par le contrôle | Remplacer `company_progress` par `production_plan_actions` + `finish_…_by_link` ; reprise des données | M | Lien société, prochaine action (`lib/production/next`) |
| **PR-8** Informations notées + Blocages (brique commune) | « Noter une information », contradictions / fait foi, modale « Informations et décisions », « Signaler un blocage » / « Lever », bandeau des points ouverts, « Maintenant » | `project_notes` (ou `production_notes`), `workflow_blockers` (généraliser `activation_blockers`) | L | Toucher Activations si on généralise ; `delete_project_row` pour les nouvelles tables |
| **PR-9** Lieux : budget et remplacement | Tarif × jours vs « dont lieux », modale de dépassement → révision ; « Remplacer le lieu retenu » (motif, informations liées, ce qu'il faut revoir → tâches, étapes « À revoir ») ; spine « À revoir » | `replace_production_location` ; jours de tournage depuis Fiche + informations décidées (PR-8) | M–L | Dépend de PR-6 et PR-8 ; contrôles `z_recheck` qui rouvrent le contrôle Lieu |
| **PR-10** Contrôle avant tournage par synthèse | Externe : lignes lues (checklist, devis, proposition, lieu/devis, date et horaires décidés, blocages, informations) ; confirmation forcée avec motif ; synthèse figée ; visible sur le lien ; interne : ajouter ces lignes aux contrôles existants | `ready_snapshot`, `ready_forced_reason` ; décision date/horaires | M | `mark_production_ready` refuse aujourd'hui sans contrôles requis : variante externe |
| **PR-11** Proposition de réalisation versionnée + validation externe | Versions avec 3 pièces, double validation interne/externe, version retenue, nouvelle version demandée ; lien du management | `production_direction_versions` ; rôle validateur externe + lien | L | Reprise de `direction_status` existant en V1 |
| **PR-12** Après tournage externe | Tournage confirmé (variante externe), étape Rushes (lien par la société, reçus, sauvegarde, transfert si monteur ≠ société), montage déposé par la société sans étape manuelle, validation externe des versions, destinataires de livraison | Colonnes rushes + fonctions par lien ; `production_versions.ext_status` ; étape de post implicite ; destinataires | L | Ne pas casser le flux interne PROD-019 à 040 |
| **PR-13** Parcours légers | Pochette (versions image, contrôle auto, livraison Distribution + Activations) ; teasers « Décliné du Clip officiel » | `organization` + `derived`, `derived_from_sheet_id`, `track`, métadonnées image des versions | L | Phase calculée (`lib/production/phase.ts`) et transmission aux Activations à adapter |

**Effort total estimé : ~30 jours** (PR-0 ½ j, PR-1 2 j, PR-2 2,5 j, PR-3 1,5 j, PR-4 2 j, PR-5 1,5 j, PR-6 2 j, PR-7 1,5 j,
PR-8 3,5 j, PR-9 2,5 j, PR-10 2 j, PR-11 3 j, PR-12 4 j, PR-13 4 j). PR-0 à PR-7 rendent le parcours externe du proto
jouable jusqu'au devis et à la préproduction (≈ 14 j) ; PR-8 à PR-10 couvrent l'Artefact P0 (changements, blocages,
contrôle) ; PR-11 à PR-13 le P1 et les livrables sans tournage.

## 6. Points à trancher (à signaler, sans les inventer)

1. **Étape `production` démarrée / validée par le DG** (app) vs Production ouverte au transfert de la fiche (proto) : garder
   la validation DG en fin de Marketing ou la retirer ?
2. **Interne** : le proto résume l'interne en gestes génériques ; l'app (tickets PROD-001 à 040) a les vraies sections.
   Hypothèse retenue ici : garder l'app, n'aligner que titres, ordre et briques communes.
3. **Ticket « Retours prototype Artefact »** : absent du dossier Drive public, présent dans Notion seulement — vérifier
   que c'est la bonne version (Notion du 15/10, 17:01).
4. **Lien du management** (validation créative externe) : nouveau type de lien ou rôle du lien `/p/` ?
5. Question du 17/10 (lieu et devis, `PRODUCTION-METIER.md` § 9) toujours sans réponse : le proto code l'hypothèse
   « dont lieux » + « Dépasse de X € : révision du devis à prévoir ».
6. Page privée **par personne** tous workflows (proto global) vs un lien par fiche (app) : hors zone, mais la Production
   devra s'y brancher.
