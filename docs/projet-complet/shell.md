# Zone « coquille » — inventaire proto « Projet complet » ↔ app PDS OS

Dépôt lu : le worktree de la branche `feat/projet-complet`, lecture seule.
Sources proto : `docs/protos/src/global/host.js` (en entier), CSS de `docs/protos/projet.html` (l. 1-716 : « Shell »,
« Head », « Pills », « Cards », « Overview + lists », « Portal », « Shared shell »), `docs/protos/tests/projet.cjs`.
Captures supplémentaires faites pour cette zone (1440 px et 390 px) :
`scratchpad/shell-shots/`
(`locked_master`, `<scénario>_work|_valid|_activity`, `<scénario>_role_<rôle>` = pages privées, `mobile_launched`), script
`.../scratchpad/shell.cjs` et `.../scratchpad/shell2.cjs`.

Personnes du proto : internes (`where:"app"`) Lina Haddad (cheffe de projet, défaut), Claire Morel (DG), Nadia Benali (DA),
Tom Mercier (chargé de production) ; externes (`where:"lien"`) Karim Haddou (ingé mix/master), Mona Lys (artiste), Sami Kader,
Yanis Morel, Inès Robin (crédités), Studio Ressac (société de prod), Bastien Roy (réalisateur), Jade Petit (management),
Inès Garnier (monteuse), Léa Moreau (créatrice TikTok). Un interne voit la coquille ; un externe voit **sa page privée**.

---

## 1. Écrans du proto (ordre du parcours) — 9 écrans

### E1. Barre principale (`.mainnav`, toujours visible ≥ 721 px)
- Carré **PDS** noir 40 px (rayon 10, 12 px gras) toujours affiché ; puis 4 boutons-icônes 44×40 (rayon 8, icône 20 px) avec
  info-bulle à droite : **Accueil** (→ Vue d'ensemble du projet), **Travail** (→ Travail du projet), **Projets** (allumé sur
  toute page de projet), **Réseau** (inerte). En bas : cloche (« Notifications ») et avatar rond 32 px aux initiales.
- **Pastille sur Travail** : nombre total de « mes actions » du projet (`myActions().length`), pastille noire 16 px
  (`.cnt`, 10,5 px gras) en haut à droite de l'icône. Ex. scénario `launched` : 4 ; `mid` : 5.
- Qui : tous les internes ; recalculé à chaque peinture, rien n'est stocké.

### E2. Navigation du projet (`.projnav`, 200 px, ≥ 1101 px)
- En tête : **sélecteur « Néons »** + double chevron (inerte dans le proto), sur un filet.
- `Vue d'ensemble` (sans point) ; `Cadrage` avec **point** (bleu `run` tant que `fr4` Plan du projet n'est pas fait, vert
  `done` après) et **pastille bleue** du nombre d'actions « À vous » du Cadrage.
- Titre de groupe **« Workflows »** : `Master`, `Juridique`, `Marketing`, `Distribution`, chacun avec un **point de statut à
  gauche du libellé** (gris Non démarré, bleu sélection En cours, ambre En attente, rouge Bloqué, vert Terminé) et à droite
  une **pastille bleue (18 px, `--sel`) = nombre de mes actions** dans ce workflow.
- Titre de groupe **« Pilotage »** : `Travail`, `Validations`, `Activité` (sans pastille).
- Statut d'un workflow (`wfInfo`) : Non démarré tant que le plan n'est pas lancé ; Terminé si toutes ses étapes sont faites ;
  Bloqué si le moteur dit bloqué ; En attente s'il reste des actions mais aucune pour l'équipe interne ; sinon En cours.
- Gestes : clic = ouvre la page (H.page) ; un workflow ouvre son moteur (étape qui attend la personne, sinon courante).

### E3. Navigation mobile (≤ 760 px)
- Rangée horizontale défilante de **puces** (`.mnav .chipbtn`, 34 px, pilule, filet) au-dessus du contenu :
  `Vue d'ensemble · Cadrage · Master · Juridique · Marketing · Distribution · Travail`, avec la pastille bleue de mes actions ;
  puce active = contour noir + fond `--soft`. Pas de Validations ni d'Activité en puces.
- ≤ 720 px la barre principale disparaît entièrement (anomalie, § 7).

### E4. Vue d'ensemble avant « Lancer le plan » (scénarios `start`, `brief`, `plan`)
- Fil : `Néons › Vue d'ensemble` (14 px gris) ; h1 **« Néons »** (30 px) + pastille **« Non démarré »** à droite.
- Ligne de faits : `Mona Lys · Single` · `Budget 25 000 € HT` · `Responsable Lina Haddad` · `Sortie Sam. 05/12/2026`.
- **Carte « Maintenant » globale** (`nowCardH`) : pastille **« À vous »** + source `Cadrage › Démarrer le cadrage`, titre =
  l'action (« Démarrer le cadrage »), bouton **« Ouvrir »** (ouvre l'étape) et « Et N autre(s) : a (Workflow) · b (Workflow) ».
  Rien pour moi : pastille **« Rien à faire pour vous »**, titre **« Tout ce qui vous concerne est fait »**, note
  « Les autres avancent ; la Vue d'ensemble dit qui est attendu. »
  Ex. DG au scénario `brief` : « À vous · Cadrage › Brief de cadrage · Valider le Brief de cadrage ».
- Carte **« Avant les workflows »** : « Le projet avance dans cet ordre : le Cadrage, puis le Plan du projet. Au lancement du
  plan, le Master, le Juridique, le Marketing et la Distribution démarrent. » puis une ligne par étape du Cadrage (Démarrer le
  cadrage / Départ, Les 6 dimensions, Brief de cadrage, Plan du projet) : sous-titre `Fait` / `En cours` /
  `Après l'étape précédente`, pastille `Fait` (verte) / `En cours` (bleue) / `À venir` (grise). Bouton contour
  **« Ouvrir le Cadrage »**.
- Le **Plan du projet est une étape du Cadrage** (`fr4`), page Cadrage, avec « Lancer le plan » (scénario `plan`).

### E5. Verrou d'un workflow avant le lancement (`locked()`)
- Fil `Néons › Master`, h1 « Master » + pastille « Non démarré » ; carte avec encadré cadenas :
  **« Ce workflow démarre au lancement du plan du projet, après le Cadrage. »** et bouton **« Ouvrir le Cadrage »**.
- Les quatre workflows (Master, Juridique, Marketing, Distribution) sont verrouillés pareil.

### E6. Vue d'ensemble après « Lancer le plan » (scénarios `launched` → `after`)
- Même tête ; pastille **« En cours »** ; faits + **`Master final Sam. 21/11/2026`** inséré avant la sortie.
- **Carte « Maintenant » globale** : ma première action tous workflows confondus, **Cadrage d'abord**, puis l'ordre
  Marketing, Master, Juridique, Distribution (pas de tri par échéance). Ex. `launched` (Lina) : « À vous ·
  Marketing › Démarrer la stratégie · Démarrer la stratégie · Ouvrir · Et 3 autres : confirmer la source (Master) · demander
  l'autorisation (Juridique) » (seules les 2 premières autres sont nommées).
- Carte **« Les workflows »** : grille `repeat(auto-fit,minmax(240px,1fr))` (4 côte à côte à 1440), chaque carte est un bouton
  qui ouvre le workflow : nom en gras + **pastille de statut** à droite ; `Étape n sur N · <titre de l'étape courante>` ;
  **barre de progression 4 px, remplissage vert** = étapes faites / total ; dernière ligne **« À vous · <action> »** en bleu
  sélection gras si j'ai une action, sinon **« <Nom> · <action> »** (prochain acteur, gris), sinon « Rien en attente ».
  Ex. `launched` : Master « En cours · Étape 1 sur 5 · Source · À vous · confirmer la source » ; Juridique « Étape 5 sur 10 ·
  Sami Kader · fiche et contrat » ; Marketing « Étape 1 sur 14 · Démarrer la stratégie » ; Distribution **« Bloqué »**
  « Étape 1 sur 7 · Préparation · À vous · confirmer les paramètres ».
- Carte **« Ce qui dépend d'un autre workflow »** : 4 lignes fixes, titre gras + `A → B` gris + pastille `Disponible`
  (verte) / `Attendu` (grise) : **Master final** (Master → Distribution), **Pochette livrée** (Marketing → Distribution),
  **Prêt pour la sortie** (Juridique → Distribution), **Durée du master final** (Master → Juridique · SACEM).
- Aucun autre bloc (ni équipe, ni échéances, ni blocages, ni plan, ni faits en colonne).

### E7. Travail du projet (`workPage()`)
- Fil `Néons › Travail`, h1 « Travail » ; une carte avec une liste de lignes-boutons (`.srow`) : **titre de l'action** (gras
  16 px), dessous `Workflow › Étape` (+ `· échéance`), chevron à droite ; clic = ouvre l'étape dans son workflow.
- Seulement **mes** actions (personne qui regarde), Cadrage d'abord. Vide : **« Rien ne vous attend pour l'instant. »**
- Ex. `mid` (Lina) : Confirmer ou écarter 10 propositions de PO (Marketing › Les 8 dimensions) ; Démarrer le Brief
  (Master › Brief) ; Vérifier les réponses (Juridique › Yanis Morel · fiche et contrat) ; Proposer la répartition
  (Juridique › Répartition de l'édition « Néons ») ; Confirmer les paramètres (Distribution › Paramètres de distribution).

### E8. Validations du projet (`workPage("valid")`)
- Même forme, filtrée sur mes actions dont le libellé commence par **Valider / Vérifier / Approuver / Clôturer avec /
  Arbitrer**. Vide : **« Aucune validation ne vous attend. »**
- Ex. DG `mid` : Valider le document (Juridique › Sami Kader · fiche et contrat) ; Valider les conditions (Juridique ›
  Emprunt « Night Lights »). DA `prod` : Valider le Mix V1 (Master › Mixage). Chargé `prod` : Vérifier le devis
  (Marketing › Devis).

### E9. Activité du projet (`activityPage()`)
- Fil `Néons › Activité`, h1 « Activité » ; une liste à puces : **`<Workflow>` · texte · qui jj/mm, hh:mm**, 80 au plus,
  journaux des 4 workflows (Marketing, Master, Juridique, Distribution) mis bout à bout (pas triés, § 7).

### E10. Page privée réunie par personne (`portalPage(r)`, tout externe)
- **Barre du haut** (`.pbar`) : carré PDS + **« « Néons » · <Nom> »** en gras ; à droite cadenas + **« Lien privé · sans
  compte »** (13 px gris).
- Colonne 820 px : légende `Néons · Mona Lys · single · <rôle de la personne>` ; h1 **« Ce que PDS attend de vous »** s'il
  existe une action pour elle dans un des workflows, sinon **« Rien à faire pour l'instant »**.
- Puis, **par workflow dans l'ordre Master, Juridique, Marketing, Distribution**, un intertitre (15 px gras gris) et les
  cartes que ce workflow montre à cette personne sur son propre lien (le proto découpe la page privée de chaque moteur et
  retire son en-tête et sa carte contact). Un workflow sans carte pour elle n'apparaît pas.
- Tout en bas, une seule carte **« Votre contact chez PDS »** : avatar LH, **Lina Haddad** · Cheffe de projet.
- Ex. Mona `prod` : Master « Le Mix V1 de « Néons » » (Avis envoyé, lecteur, « Votre retour », Minutage, « Envoyer mon
  retour ») + Juridique « La répartition de l'édition de « Néons » · version 1 » (Confirmée). Karim `prod` : Master (Mix V1 en
  écoute, « Échanges avec le label » Poser une question / Signaler un retard / Signaler un fichier manquant, « Votre dossier »).
  Sami `mid` : Juridique (Votre contrat · Suivi, Votre fiche de renseignements · Envoyée). Léa `release` : « Ce que PDS attend
  de vous » · Marketing « Votre facture » (Nom du fichier *, Envoyer la facture). Studio Ressac `prod` : Marketing « Devis ».

---

## 2. Correspondance dans l'app et écarts

Légende effort : S < ½ j, M 1–2 j, L > 2 j.

### E1. Barre principale — DIFFÉRENT (design + compteur), S
- App : `components/shell/sidebar.tsx`, `nav-links.tsx`, `nav-item.ts`, `lib/ui/nav-items.ts`, `use-collapsed-nav.tsx`,
  `app/(app)/layout.tsx`. Repliée à 68 px par défaut dans un projet (= proto), mais :
  - le carré PDS est **masqué une fois repliée** (seul le bouton « déplier » `IconSidebar` reste) ; proto : carré 40 px toujours là,
    pas de bouton déplier ;
  - **13 entrées** (Accueil, Travail, Projets, Calendrier grisé, Calls, Artistes, Masters, Réseau, Contrats, Fichiers, Équipe,
    Retours, Labo) contre 4 dans le proto — à garder (Figma « Devis Sordulo » + tickets), le proto simplifie ;
  - **aucune pastille sur Travail** : `CountBadge` n'est posé que sur Équipe (demandes d'accès). MANQUANT : nombre de mes actions
    (au minimum du projet ouvert ; idéalement tous projets, cf. lot 9).
- Pas de migration.

### E2. Navigation du projet — DIFFÉRENT (contenu, pastilles, design), M
- App : `components/projects/project-sidebar.tsx` (`ProjectSidebar`, `ProjectSidebarList`), `lib/ui/project-sections.ts`
  (`projectSections`, `DOUBLE_SIDEBAR = true`), `components/projects/project-switcher.tsx`, `components/projects/workflow-legend.tsx`,
  textes `lib/i18n/fr/shell.ts` (`shell.project.sidebar`), statuts `lib/workflow-status/load.ts` (`loadWorkflowStates`, lu dans
  `app/(app)/app/projects/[projectId]/layout.tsx`).
- OK : sélecteur de projet en tête (déjà fonctionnel, le proto est inerte), Vue d'ensemble puis Cadrage sans groupe, groupe
  « Workflows » avec points, groupe « Pilotage », Juridique grisé avec cadenas sans `manage_legal` (absent du proto, à garder :
  sécurité).
- DIFFÉRENT :
  - **Point à droite** du libellé (après `flex-1`) ; proto : **à gauche**. Point « En cours » = `--tone-info-fg` #0b3d8c (bleu
    nuit) ; proto = `--sel` #155dfc (bleu sélection). Autres teintes identiques.
  - **Cadrage sans point** (les `statuses` ne contiennent que les 4 workflows) ; proto : point bleu/vert selon le Plan du projet
    (lisible dans `project_stages` clé `framing` + `project_plans.launched_at`).
  - Icône ⓘ « Ce que disent les points de statut » (`WorkflowLegend`) : EN TROP vis-à-vis du proto (ajoutée au test UX du
    09/10) ; petite, peut rester ou partir (décision de design).
- MANQUANT : **pastille « À vous » par entrée** (Cadrage + chaque workflow) — demande l'agrégateur de lot 2.
- EN TROP : **Pilotage** contient aussi Équipe, Planning, Budget ; groupe **Ressources** (Calls, Livrables, Fichiers). Rien de cela
  n'est dans le proto. Budget est demandé par des tickets (MKT-S1-15 « une dépense s'ajoute là où elle apparaît ») ; Calls est une
  fonction cœur ; Équipe/Planning/Livrables/Fichiers ne sont pas dans le parcours du proto et ajoutent 7 entrées à une barre de
  200 px. Proposition : un drapeau dans `projectSections` pour ne garder que les entrées du proto (+ Budget en Pilotage si Sacha
  le veut), les pages restant joignables par URL et depuis leurs workflows (Calls depuis chaque étape « call », Fichiers depuis
  les livrables). Ça **simplifie**. À trancher par Sacha (impact sur `ProjectTabs`, `projectTrail`, liens « Aussi dans ce projet »).
- Pas de migration.

### E3. Navigation mobile — DIFFÉRENT, S
- App : `ProjectSidebarMobile` (même fichier) = bouton contour « Sections du projet » + tiroir `Sheet` à gauche, `md:hidden`
  (< 768 px). En-tête mobile global (`app/(app)/layout.tsx` : menu, « PDS », cloche).
- Proto : puces horizontales avec pastilles, sans tiroir. Remplacer le bouton par une rangée de puces
  (`FilterChip`/`ChipChoice` ne conviennent pas : ce sont des filtres ; DESIGN.md § 4 dit « une pastille veut toujours dire
  filtre, jamais autre page » → **conflit de règle** : soit on garde le tiroir, soit on écrit l'exception « navigation de
  projet en puces sur mobile » dans DESIGN.md). Garder l'en-tête mobile global de l'app (le proto n'a plus ni cloche ni
  avatar sous 720 px : anomalie).

### E4. Vue d'ensemble avant lancement — DIFFÉRENT (parcours), M
- App : `app/(app)/app/projects/[projectId]/page.tsx` : tant que le Brief n'est pas validé → `FramingEntry`
  (`components/framing/intel/framing-entry.tsx`, l'entrée du Cadrage **sur la Vue d'ensemble**), `ProjectAttention`
  (Brief en validation), `ProjectJourney` (étapes du projet), `CreativeTeam`, `AssignmentHistory`, `FactList` (Artiste, Type,
  Responsable, Étape en cours, Créé le), carte « Clôture du projet ». Brief validé, plan non lancé → `ProjectAttention` +
  **`ProjectPlanSection` (le Plan du projet est sur la Vue d'ensemble**, `docs/ARCHITECTURE.md` § 6 ter : « Le plan est sur la
  Vue d'ensemble (07/10/2026) », `routes.projectPlan` = Vue d'ensemble `#plan`).
- Écarts :
  - MANQUANT : tête « Néons » (h1 = **nom du projet**) + pastille « Non démarré », ligne de faits (Budget, Responsable, Sortie).
    Aujourd'hui le h1 vaut « Vue d'ensemble » (`ProjectPageTitle`). Budget : enveloppe du Cadrage/Budget
    (`budget_lines`/champ du Brief), Sortie : `releases`/date cible du Brief (déjà lue par `loadWorkflowStates.details`).
  - MANQUANT : carte **« Maintenant » globale** (lot 2/3).
  - DIFFÉRENT : « Avant les workflows » (4 étapes du Cadrage, Fait/En cours/À venir, « Ouvrir le Cadrage ») ≠ `ProjectJourney`
    (étapes `project_stages`). Les étapes du Cadrage du proto (Départ, Les 6 dimensions, Brief de cadrage, Plan du projet)
    sont celles de la zone Cadrage : réutiliser son parcours quand il existera.
  - DIFFÉRENT (parcours) : le **Plan du projet** doit **quitter la Vue d'ensemble** pour devenir l'étape 4 de la page Cadrage
    (lot de la zone Cadrage ; la coquille doit alors changer `routes.projectPlan`, `WorkflowLocked`, `nextActionOf`
    `build_plan`, les liens du Travail).
  - EN TROP sur la Vue d'ensemble : `FramingEntry` (va dans la page Cadrage), `CreativeTeam`, `AssignmentHistory`, `FactList` en
    colonne, carte « Clôture du projet » (la clôture du projet n'est pas dans le proto ; à garder accessible ailleurs, p. ex.
    dernière étape du Cadrage/Pilotage, décision Sacha).
- Pas de migration.

### E5. Verrou des workflows — DIFFÉRENT, S
- App : `components/plan/workflow-locked.tsx` (`EmptyState` + cadenas), textes `lib/i18n/fr/framing-intel.ts`
  (`locked.*` : « Master se lance depuis le plan du projet, sur la Vue d'ensemble », « Ouvrir le plan » / « Ouvrir le cadrage »),
  porte `lib/plan/queries.ts` (`workflowGate`, SQL `workflow_is_launched`), appliquée par `master/layout.tsx`, `legal/layout.tsx`,
  `strategy/page.tsx`, `strategy/brief/page.tsx`. **Distribution jamais verrouillée** (`release/` n'a pas de porte ; la règle
  `distributionState` n'a pas de `not_started`). Conception/Production/Activations : verrouillées via les chevrons du Marketing
  (`marketingSteps`, Stratégie grisée avant le plan).
- Écarts : textes (proto : « Ce workflow démarre au lancement du plan du projet, après le Cadrage. » + « Ouvrir le Cadrage »,
  pastille « Non démarré », fil) ; Distribution à verrouiller aussi (et statut `not_started` tant que le plan n'est pas lancé :
  changement de `distributionState` + `workflow_is_launched` ou condition code) ; les variantes « En attente du plan »
  (`bodyWaiting`, `bodyAbsent` : Ensuite / hors du plan, « Lancer maintenant ») n'existent pas dans le proto, où tout démarre
  au lancement. **Point à trancher** : le plan à colonnes Focus/Ensuite du proto lance-t-il tout d'un coup ? Le texte du proto
  (« Au lancement du plan, le Master, le Juridique, le Marketing et la Distribution démarrent ») dit oui ; l'app garde
  `launch_plan_workflow` pour l'Ensuite. Garder le code SQL, n'afficher que la forme du proto.
- Migration : aucune si Distribution est verrouillée côté code (porte de parcours, pas de sécurité, comme Master/Juridique).

### E6. Vue d'ensemble après lancement — DIFFÉRENT (contenu et design), M
- App : `components/overview/project-board.tsx` (`ProjectBoard`) puis `components/plan/plan-steps-section.tsx`
  (`PlanStepsSection`), puis équipe/historique/faits/clôture (page.tsx). `ProjectBoard` = bandeau **Cadrage** (« Validé le … »,
  « Voir le Brief », « Ouvrir le Cadrage »), `WorkflowCards` (`components/overview/workflow-cards.tsx`), note « … ne s'applique pas
  à ce projet », `NextActionsCard` « À faire ensuite » + `BlockersCard` « Blocages » (panneau Sheet cause/impact/source) +
  `DeadlinesCard` « Échéances » (`components/overview/board-cards.tsx`, `blockers-card.tsx`, logique `lib/workflow-status/board.ts`),
  `DependenciesTable` « Dépendances entre workflows » (`dependencies-table.tsx`, `rules.ts#dependencies`). Textes
  `lib/i18n/fr/workflow-status.ts`.
- Cartes de workflow : OK sur le principe (statut calculé jamais stocké, carte entière cliquable vers l'étape courante,
  `workflowStepHref`) ; DIFFÉRENT :
  - statut en `StatusDot` + libellé gris au lieu d'une **pastille** à droite du nom ; icône de workflow en plus (absente du proto) ;
  - barre **segmentée par chevron** (noir = fait, gris = courant) au lieu d'**une barre continue verte** done/total ;
  - « `<chevron>` · étape n sur N » (N = chevrons : Marketing 5, Master 5, Distribution 5) ; proto « Étape n sur N · <titre de
    l'étape du parcours> » (Marketing 14, Juridique 10, Distribution 7 : les étapes des parcours de chaque zone) ; le Juridique
    dit « étape du dossier » (`legalPhase`) ;
  - lignes « raison » + « progression » (`state.reason`, `state.progress`) au lieu d'**« À vous · … » / « <Nom> · … »** ;
    MANQUANT : la personne de la prochaine action et le « À vous » en couleur de sélection ;
  - bouton **« Lancer »** sur une carte non démarrée (`launch-workflow-button.tsx`) : EN TROP (proto : tout démarre au plan).
- MANQUANT : tête (h1 nom du projet, pastille « En cours », faits dont **Master final** = date du Brief Mix/Master déjà lue :
  `flows.details.masterDates.masterFinalDue`) et **carte « Maintenant » globale**.
- Dépendances — DIFFÉRENT (données) : l'app calcule 3 dépendances (Master final de chaque titre → Distribution ; Emprunts
  sécurisés Juridique → Distribution ; Ingénieurs du mix et du mastering → Juridique « Contrats de prestation ») dans un
  `DataTable` à 5 colonnes avec 4 états (Disponible/En cours/En attente/Bloqué) ; proto : 4 lignes simples, 2 états
  (Disponible/Attendu) : Master final, **Pochette livrée** (Marketing → Distribution : MANQUANT, lisible dans la Conception/
  Production : livrable « pochette » livré), **Prêt pour la sortie** (Juridique → Distribution : MANQUANT, dépend de l'étape
  « Récap / Release readiness » du Juridique, ticket Juridique 08), **Durée du master final** (Master → Juridique · SACEM :
  MANQUANT, durée du fichier master final). « Emprunts sécurisés » est couvert par « Prêt pour la sortie » ; « Ingénieurs →
  contrats » n'est pas dans le proto (EN TROP, ou à garder sous « Prêt pour la sortie »).
- EN TROP : bandeau Cadrage, « À faire ensuite », « Blocages » (+ panneau), « Échéances », « Étapes du plan »
  (`PlanStepsSection`, onglets, historique du plan), équipe créative, historique d'assignation, faits en colonne, carte Clôture.
  Les blocages du proto vivent dans les workflows (statut « Bloqué » + leur propre « Maintenant »). Supprimer ces blocs
  **simplifie** ; `lib/workflow-status/board.ts` (testé) peut rester pour l'assistant PO s'il s'en sert (vérifier
  `lib/assistant`), sinon le retirer avec ses tests.
- Statut « Bloqué » de la Distribution : proto = dès qu'une dépendance manque (dès la Préparation, cf. capture `launched`) ;
  app = seulement à l'étape Suivi (`withDependencies`). Règle de la zone Distribution ; la coquille ne fait que l'afficher.
- Pas de migration pour la coquille (les faits « pochette livrée », « prêt pour la sortie », « durée » sont lus dans les tables
  existantes des zones concernées, ou ajoutés par elles).

### E7. Travail du projet — DIFFÉRENT (parcours), M
- App : `app/(app)/app/projects/[projectId]/work/page.tsx` : bouton « Ajouter une tâche » (`AddTaskForm`), `StatTiles` par statut,
  `WorkBoard` **par personne** (`components/project-work/work-board.tsx`, filtre `?person=`), carte « À trancher » (`open_points`).
  Données `lib/project-work/queries.ts` : `tasks`, `strategy_deliverables`, `validations`, `open_points` — **pas** les actions des
  parcours (Master, Juridique, Distribution, Conception, Production n'y sont pas).
- Proto : **mes** actions de tous les workflows, une ligne par action, `Workflow › Étape`, chevron, ouvre l'étape.
- Écart : changer la source (agrégateur « À vous », lot 2) et la forme (liste de lignes, `ListCard`/`CardRow` existe :
  `components/ui/list-card.tsx`). EN TROP : StatTiles, WorkBoard, « Ajouter une tâche », « À trancher » (les points ouverts
  vivent dans le Cadrage). **Tension doc** : `docs/VISION-UX.md` § 4 dit « Travail une carte par personne », le proto montre
  la liste de la personne qui regarde ; le proto fait foi (demande de Sacha) → corriger VISION-UX § 4. La vue « par personne »
  peut survivre dans la page Équipe si elle est gardée. Tâches libres (`tasks`) : décider si elles restent (une tâche ajoutée à la
  main est « une liste de tâches à part », ce que VISION-UX § 3 interdit).
- Pas de migration.

### E8. Validations du projet — DIFFÉRENT (source), S–M
- App : `validations/page.tsx` : demandes de validation d'étape (`validations` + `project_stages`,
  `lib/project-history/queries.ts#listProjectValidations`), « En attente » puis « Historique », `ValidationItem`
  (`components/project-history/validation-item.tsx`). Ne voit ni la validation du mix (Master), ni celle d'un contrat par la DG,
  ni celle du dossier de distribution, ni les validations de la Conception/Production.
- Proto : mes actions de validation (tous workflows), même liste que Travail. Écart : la source doit être l'agrégateur, filtré
  par **un drapeau `kind: "validate"` sur l'acteur** (`JourneyActor` dans `lib/ui/journey.ts`), pas par le verbe comme le proto.
  L'historique des décisions (EN TROP vis-à-vis du proto) peut passer dans l'Activité.
- Pas de migration (champ TypeScript).

### E9. Activité du projet — DIFFÉRENT (source), M
- App : `activity/page.tsx`, `lib/insights/activity.ts#loadRecentActivity` (reconstruit depuis les horodatages de `calls`,
  `call_reports`, `field_values`, `tasks`, `open_points`, `project_stages`, `validations`, `releases`, `project_files`,
  `framing_briefs`), rendu `components/project-history/activity-timeline.tsx` (groupes par jour `DayGroups`, heure, type, détail,
  lien). Les journaux des workflows ne sont pas lus.
- Proto : journal des 4 workflows, préfixé du workflow, avec qui et quand.
- Écart : ajouter les journaux existants avec leur workflow : `lib/marketing/queries.ts#loadMarketingEvents`
  (`marketing_events`), `lib/activations/journal.ts` (`activation_events`), `lib/production/history.ts` (`production_events`),
  `lib/design/sheet-summaries.ts#loadSheetEvents` / `design_events`, `lib/legal/history/queries.ts#loadLegalHistory`
  (`legal_plan_events`, `contract_events`, `legal_split_events`, `legal_clearance_events`, `legal_formality_events`),
  `distribution_events`, `project_plan_events` (Cadrage › Plan), Master : pas de table d'événements → horodatages de
  `master_transmissions`, `master_mix_versions`, `master_engineer_messages`. Garder `DayGroups` (mieux que le proto, qui n'est
  pas trié). Option SQL : une vue `security_invoker` `project_activity` qui unit ces tables (colonnes hétérogènes : `created_at`
  vs `at`, `kind` vs `action`, `data`/`detail`/`new_value`) — plus simple en code, chaque loader existant renvoyant
  `{at, workflow, text, who, href}`.
- Migration : facultative (vue) ; sinon aucune.

### E10. Pages privées réunies par personne — MANQUANT, L
- App aujourd'hui : **une page par lien et par objet**, chacune avec son cadre (pas d'en-tête commun, pas de « Lien privé · sans
  compte », pas de « Votre contact chez PDS », `max-w-2xl` 672 px, `bg-muted/40`, h1 `text-2xl font-semibold`) :

  | Route | Objet | Composant | Table du jeton | Personne | Fonctions SQL (anon) |
  | --- | --- | --- | --- | --- | --- |
  | `app/(public)/m/[token]` | Dossier mix / mastering de l'ingénieur | `components/master-workflow/public-package.tsx` | `master_transmissions.token_hash` (`20261005011001`) | `contact_id` | `get_master_transmission`, `acknowledge_master_transmission`, `note_master_transmission_opened`, `open_transmission_of`, dépôt de versions (`20261010001301`, `20261011500201`) |
  | `app/(public)/f/[token]` | Fiche de renseignements | `components/legal/forms/public-form.tsx` | `legal_forms.token_hash` (`20261004004001`) | `contact_id` | `get_legal_form`, envoi de la fiche |
  | `app/(public)/s/[token]` | Confirmation de répartition | `components/legal/splits/public-split.tsx` | `legal_split_confirmations.token_hash` (`20261005005001`) | via `entry_id` → `legal_split_entries.contact_id` | `get_split_confirmation`, réponse |
  | `app/(public)/i/[token]` | Accord exprès d'un créateur (Influence) | `components/activations/influence/public-agreement.tsx` | `influence_agreements.token_hash` (`20261011000301`) | via `target_id` → `activation_targets.contact_id` | `get_influence_agreement`, décision |
  | `app/(public)/p/[token]` | Espace du prestataire (Production) | `components/production/provider/provider-space.tsx`, `link-journey.tsx` | `production_provider_links.token_hash` (`20261014000201`) | `contact_id` (+ `sheet_id`) | fonctions du prestataire |
  | `app/(public)/fs/[token]` | Feuille de service | `components/production/provider/provider-section.tsx` | `production_call_sheet_links.token_hash` (`20261014000901`) | **aucune** (par feuille) | `get_public_call_sheet` |
  | `app/(public)/d/[token]` (route) | Plan de sortie / Dossier de presse | HTML statique | `share_links.token` (uuid, `scope`) | **aucune** (document) | `get_shared_strategy_document` |
  | `app/(public)/l/[token]` | Smartlink | page | `releases.smartlink_token` | public | `get_smartlink` |

  Les cinq premiers sont personnels ; les jetons sont stockés **en SHA-256 seulement** (le lien n'est montré qu'une fois), donc
  une page réunie ne peut pas « retrouver » les jetons des objets.
- Ce que le proto demande et qui n'a **aucun lien** dans l'app (relève des autres zones, mais la page réunie devra les accueillir) :
  écoute et retour de l'artiste sur une version de mix (Mona), signature du contrat par la personne créditée (« Votre contrat ·
  Signé »), devis de la société de production (Studio Ressac), facture de la créatrice (Léa), suivi par le management (Jade),
  réalisateur externe (Bastien).
- **Proposition (à valider par la zone back)** :
  1. Migration `project_contact_links` : `id, organization_id, project_id, contact_id, token_hash unique, expires_at,
     revoked_at, first_opened_at, last_opened_at, created_by, created_at`, index unique partiel `(project_id, contact_id) where
     revoked_at is null`, RLS forcée (select `can_see_project`), écriture seulement par fonctions. `issue_contact_link(project,
     contact)` (responsable du projet, renvoie le jeton une fois, remplace l'ancien : même modèle que
     `production_provider_links`). Ajouter `delete_project_row` (règle CLAUDE.md : toute table liée à un projet).
  2. `get_contact_page(p_token)` (SECURITY DEFINER, `anon`) : vérifie hash/expiration/révocation, renvoie projet (titre, artiste,
     format), personne, **rôle sur le projet calculé** (ingénieur mix/master, rôle crédité, prestataire, créateur…), contact PDS
     (= `projects.owner_person_id` → `people`), et la liste des objets ouverts ou faits de cette personne dans ce projet :
     `master_transmissions` (contact_id), `legal_forms` (contact_id), `legal_split_confirmations` ⨝ `legal_split_entries`,
     `influence_agreements` ⨝ `activation_targets`, `production_provider_links` (contact_id), avec pour chacun `kind`, `id`,
     `open` (calculé : « Ce que PDS attend de vous » si au moins un est ouvert).
  3. Les fonctions publiques existantes acceptent **en plus** `(p_contact_token, p_item_id)` : elles résolvent le lien personne,
     vérifient que l'objet appartient au même contact et au même projet, puis suivent le même code (refactor en fonction interne
     `_by_id` appelée par les deux chemins). Les liens déjà envoyés (`/m`, `/f`, `/s`, `/i`, `/p`) restent valides.
  4. Route `app/(public)/c/[token]/page.tsx` (lettre libre à choisir) : composant commun **`PublicFrame`** (barre PDS + titre
     « « Projet » · Nom » + « Lien privé · sans compte », colonne 820 px, légende, h1, intertitres par workflow, carte « Votre
     contact chez PDS ») qui compose les vues existantes ; chaque vue reçoit un prop `auth: { token } | { contactToken, itemId }`
     pour ses Server Actions. `PublicFrame` sert aussi aux 7 pages actuelles (même en-tête partout).
  5. Côté interne : « Envoyer le lien » de chaque workflow propose le lien de la personne (un par personne et par projet) ;
     une page/bloc qui liste les liens par personne (Équipe ou Réseau du projet).
  6. pgTAP : un jeton ne lit que les objets de son contact et de son projet ; révoqué/expiré = rien ; `anon` ne lit jamais la
     table.
  Effort L (3–5 j) ; risque : toucher 5 jeux de fonctions publiques déjà en production → garder les signatures actuelles
  intactes, ajouter des surcharges.
- `fs` (feuille de service), `d` (documents) et `l` (smartlink) restent hors de la page personnelle (ni personne ni action) ; la
  feuille de service peut y apparaître en carte pour l'équipe d'un tournage plus tard.

### Accueil et Travail globaux — concernés par la source, M (plus tard)
- `app/(app)/app/(home)/page.tsx` (`HomeFeed`, `components/home/*`) et `app/(app)/app/work/page.tsx` (`MyWorkCards`,
  `components/work/*`, `lib/work/queries.ts#loadMyWork`, `lib/work/next-action.ts#nextActionOf` par étape de `project_stages`).
  Le proto ne les modélise pas (Accueil = Vue d'ensemble du seul projet). `docs/VISION-UX.md` § 3 : « L'Accueil, la page
  Travail, les Validations, l'Activité, les pastilles « À vous » … sont tirés des mêmes parcours ». À terme, une carte
  « À vous » par projet dans le Travail global et la pastille de la barre principale = somme des projets. Coût : charger les
  parcours de tous les projets de la personne → à faire après le lot 2, avec un compteur léger.

---

## 3. Écarts de design visibles (coquille du proto ↔ `components/shell/*`, `app/globals.css`)

| Élément | Proto (`projet.html`) | App (fichier, token) | Écart |
| --- | --- | --- | --- |
| Barre principale, largeur | 68 px fixe, icônes seules | 68 px repliée dans un projet (`--nav-width-collapsed`), 218 px ailleurs | OK dans un projet |
| Carré PDS | 40×40, rayon 10, 12 px gras, **toujours visible** | 60×60 `rounded-2xl` (12 px), `text-body-lg` gras, **masqué repliée** ; bouton `IconSidebar` à la place | Différent |
| Élément de nav | 44×40, rayon 8, icône 20, **gris `--text-2` #5e5e5e** au repos, actif `--sunken` #ececec + noir | 40 px (`py-2`), rayon 8 (`rounded-lg`), icône 20, **noir `--nav-fg`** au repos, actif `--nav-item-active-bg` #ececec | Couleur au repos |
| Compteur sur icône | Pastille noire 16 px, 10,5 px gras, coin haut droit | `CountBadge` noir 20 px, 13 px semi-gras (Équipe seulement) | Taille ; absent sur Travail |
| Info-bulle | noir, 13 px, rayon 6, à droite | `Tooltip` shadcn | Proche |
| Avatar | rond 32 px, `--sunken`, 12,5 px semi-gras | `AccountMenu` repliée | Proche |
| Nav projet, largeur | 200 px, fond `--page`, filet `--hair` | 200 px (`--project-nav-width`), `bg-sidebar`, filet `--nav-border` rgb(0 0 0/.08) | OK |
| Sélecteur | padding 10/10/12, 16 px **600**, filet dessous | bloc `h-14` + bouton `h-10 px-4` **500** (`font-medium`) | Graisse, hauteur |
| Élément de section | min 38 px, `px 10`, **15 px**, gris au repos, écart 1 px, rayon 8 | `h-9` (36 px), `px-4` (16), **16 px** (`text-body-md`), noir au repos, écart 4 px (`gap-1`), rayon 8 | Taille, couleur, padding |
| Titre de groupe | 13 px `--text-3`, padding 12/10/4 | `text-caption` 14 px `--nav-fg-muted` #767676, `pl-4`, blocs espacés de 24 px (`gap-6`) | 13 vs 14, espacement |
| Point de statut | 8 px **à gauche** ; En cours `--sel` #155dfc | `StatusDot` 8 px **à droite** ; En cours `--tone-info-fg` #0b3d8c | Position, teinte « En cours » |
| Pastille « À vous » | 18 px, fond `--sel`, blanc 11 px gras | — | Manquant |
| Contenu | `padding 28px 40px 130px`, colonne max **1180 px**, écart **20 px** | `pt-6 px-8` (24/32), `max-w-6xl` **1152 px**, écart **24 px** (`gap-6`) | Léger |
| Fil d'Ariane | ligne à part au-dessus, 14 px `--text-3`, séparateur « › », commence par le **projet** | dans la ligne du h1, même taille 28 px, séparateur « / », sans le projet (`ProjectPageTitle`) | Différent |
| h1 | **30 px**, 500, −0,04 em | `text-display-md` **28 px**, 500, `--type-display-tracking` −0,04 em | 30 vs 28 |
| Carte | rayon 12, filet **`--hair` #ececec**, padding 20, écart 14 | `ListCard` / cartes de workflow `rounded-2xl` 12 px, **`border-border` #d4d4d4**, `p-4` 16 | Couleur du filet, padding |
| Carte « Maintenant » | filet `--border` #d4d4d4 + ombre `0 1px 2px /.04, 0 8px 24px /.06`, h2 20 px | `NowCard` `border-border`, `shadow-elevation-2` (`0 4px 16px /.12`, plus forte), `p-5`, h2 `text-display-sm` 20 px | Ombre |
| Pastille d'état | 24 px, 13 px **600** | `StatusBadge size="sm"` 20 px, 14 px (`text-caption`) | Taille |
| Bouton principal | 40 px, pilule, 15 px 600 | `Button` défaut `--density-control-h` 38 px, pilule (`rounded-full`) | 38 vs 40 |
| Barre de progression | 4 px continue, rayon 2, rail `--hair`, remplissage **vert `--ok-fg`** | segments par chevron `h-1`, rail `--meter-track`, fait **noir** `bg-foreground`, courant gris 400 | Forme et couleur |
| Ligne de liste (Travail) | `.srow` 14/16 px de padding, titre 16 px gras, sous-titre 14 px `--text-3`, chevron | `CardRow` (`list-card.tsx`) | À aligner |
| Puces mobiles | 34 px, pilule, filet `--hair`, active contour noir + `--soft` | bouton contour `size="sm"` + `Sheet` | Différent |
| Page privée | barre du haut 14/24 px, fond `--page`, filet ; colonne **820 px**, padding 28/16 ; h1 30 px 500 ; intertitre 15 px 600 `--text-3` | pas de barre ; `max-w-2xl` **672 px**, `py-12/16`, `bg-muted/40` ; h1 `text-2xl` **600** | Différent (et graisse 600 sur h1 contraire à DESIGN.md « medium ») |
| Tokens couleur | `--app #fbfbfb, --page #fff, --soft #f4f4f4, --sunken #ececec, --hair #ececec, --border #d4d4d4, --text-2 #5e5e5e, --text-3 #767676, --muted #afafaf, --sel #155dfc`, tons info/warn/ok/bad identiques | `--surface-app`=grey-25 #fbfbfb, `--surface-soft` #f4f4f4, `--surface-sunken` #ececec, `--border-hairline` #ececec, `--border-default` #d4d4d4, `--text-secondary` #5e5e5e, `--text-tertiary` #767676, `--selection` #155dfc, `--tone-*` identiques | **Mêmes valeurs** : l'écart vient du choix de token dans les composants, pas des tokens |
| Typo | Google Sans Flex 500/600/700, 16 px, −0,02 em | idem (`--font-google-sans-flex`, `--type-body-tracking`) | OK |

---

## 4. Briques communes utilisées par la coquille

| Brique | Dans l'app | Où |
| --- | --- | --- |
| « Maintenant » | Oui, par module | `components/shell/journey/now-card.tsx` (`NowCard`, textes `lib/i18n/fr/journey.ts` : « À vous », « Aussi à vous », « Rien à faire pour vous », « Ouvrir l'étape », « Et N autres : … »). Pour la Vue d'ensemble : même carte avec la source « Workflow › Étape », bouton « Ouvrir » (proto) au lieu d'« Ouvrir l'étape », sans « pourquoi » (proto global n'en a pas) → prop `labels`/`variant` |
| Parcours / « qui agit » | Oui : `JourneyStep`, `JourneyActor {viewer, viaLink, todo}`, `nowOf` | `lib/ui/journey.ts`. Fournisseurs existants : `lib/legal/journey.ts`, `lib/production/journey/*`, `lib/design/journey.ts`. **Manquent** : Master, Distribution, Stratégie, Activations, Suivi & bilan, Cadrage (zones respectives) |
| Points de statut, pastilles | Oui | `components/ui/status-dot.tsx`, `status-badge.tsx`, `lib/ui/state-tones.ts` (`workflowStatusTone`), `components/ui/count-badge.tsx` |
| Statut commun des workflows | Oui, calculé | `lib/workflow-status/rules.ts`, `load.ts` (`loadWorkflowStates`, `cache`) |
| Fil d'Ariane | Oui (dans le h1) | `components/projects/project-page-title.tsx`, `lib/ui/project-sections.ts#projectTrail` |
| Chevrons | Oui | `components/projects/section-steps.tsx`, `ProcessSteps` |
| Listes de lignes | Oui | `components/ui/list-card.tsx` (`ListCard`, `CardRow`), `components/ui/day-groups.tsx` |
| Verrou | Oui | `components/plan/workflow-locked.tsx`, `EmptyState` |
| Pages privées triées / réunies | **Non** | à créer : `PublicFrame` + page par personne (E10) |
| Modale verre | Oui | `FormDialog`, `ConfirmDialog` (non utilisés par la coquille du proto) |
| Mise à jour en direct | Oui (absent du proto, à garder) | `components/projects/project-live.tsx` |

---

## 5. Simulations du proto et vrais événements

La coquille n'a pas de bouton pointillé « Proto : … » à elle. Ses commandes de proto :
- **« Voir comme »** (`#roleSel`) → dans l'app, la session de la personne connectée (`requireApproved`, `access.personId`) : les
  pastilles, « Maintenant », Travail et Validations sont calculés pour elle ; un externe n'a pas de compte et ouvre **son lien
  privé** (E10).
- **« Aller à »** (`#scenSel`, moments du projet) → l'état réel lu en base à chaque requête (statuts jamais stockés).
- **« Recommencer »** → aucun équivalent (données de test : `fill_page_test_data`, `create_test_data` hors prod).
- Dans les pages privées, les boutons pointillés hérités des moteurs (ex. « Remplir avec un exemple » sous le retour de Mona)
  sont des aides de proto : jamais dans l'app.

---

## 6. Découpage en sous-lots (ordonnés, chacun livrable et testable seul)

1. **Navigation du projet à la forme du proto** (S–M, sans migration) — `project-sidebar.tsx` : point à gauche, teinte
   « En cours » = sélection, tailles/espacements/couleurs du tableau § 3, point du Cadrage (depuis `project_stages`/plan),
   sélecteur en 600 ; drapeau dans `projectSections` pour masquer Équipe/Planning/Livrables/Fichiers/Calls (décision Sacha sur
   Budget) ; fil d'Ariane sur sa propre ligne avec le projet en tête, h1 30 px (`ProjectPageTitle`, nouveau token
   `--type-display-*` ou classe) ; contenu 1180 px / 40 px / écart 20. Risque : `ProjectTabs`, liens « Aussi dans ce projet »,
   `projectTrail` des sous-pages, tests e2e qui cherchent « Équipe ».
2. **Agrégateur « À vous »** (M, sans migration ; dépend des parcours des zones) — `lib/journey/project.ts`
   `loadProjectJourneys(project, access)` (avec `cache`) qui renvoie, par workflow (`framing`, `master`, `legal`, `marketing`,
   `distribution`), les `JourneyStep[]` ; `myActions()` = étapes dont `actor.viewer`, ordre Cadrage puis Marketing, Master,
   Juridique, Distribution ; `JourneyActor.kind: "do" | "validate"`. Branche ce qui existe (Juridique, Production, Conception) ;
   les autres renvoient `[]` jusqu'à leur lot. Pastilles de la nav projet + compteur Travail de la barre principale (projet
   ouvert). Risque : **lenteur du layout** (chaque parcours lit plusieurs tables à chaque page du projet) → compteurs dans un
   composant serveur sous `Suspense` dans la sidebar, ou fonction SQL de comptage plus tard.
3. **Vue d'ensemble lancée** (M, sans migration) — tête (h1 projet, pastille statut projet, faits Budget/Responsable/Master
   final/Sortie), `NowCard` global, cartes de workflow à la forme du proto (pastille, « Étape n sur N · titre », barre verte,
   « À vous · » / « Nom · »), dépendances en lignes 2 états avec les 4 du proto ; retirer bandeau Cadrage, À faire ensuite,
   Blocages, Échéances, Étapes du plan, équipe, historique, faits, carte Clôture (garder l'accès à la clôture ailleurs).
   Risque : `board.ts` et ses tests, `PlanStepsSection` (modifier le plan après lancement disparaît de l'écran : à loger dans
   Cadrage › Plan du projet), liens `#plan`.
4. **Avant lancement + verrou** (S–M) — carte « Avant les workflows », textes du verrou identiques, Distribution verrouillée et
   `not_started` avant le plan (code), retrait du bouton « Lancer » des cartes ; **dépend du lot Cadrage** qui déplace le Plan
   du projet dans la page Cadrage (sinon « Ouvrir le Cadrage » ne mène pas au plan). Risque : `nextActionOf` (`build_plan`),
   `routes.projectPlan`, tests pgTAP de `workflow_is_launched` si la porte SQL est étendue.
5. **Travail et Validations du projet** (S–M, après lot 2) — listes de lignes depuis l'agrégateur, vides exacts ; retirer
   StatTiles/WorkBoard/« Ajouter une tâche »/« À trancher » (décision sur `tasks`), corriger VISION-UX § 4.
6. **Activité** (M) — loaders de journaux existants → `{at, workflow, text, who, href}`, `DayGroups` conservé, préfixe
   workflow ; option vue SQL. Risque : RLS de chaque table d'événements (le Juridique n'est lisible qu'avec `manage_legal` :
   l'Activité doit taire ses lignes sinon).
7. **Navigation mobile en puces** (S) — après décision sur la règle « une pastille = un filtre » (DESIGN.md § 4).
8. **Pages privées réunies par personne** (L, **migration**) — `project_contact_links` + `issue_contact_link` +
   `get_contact_page` + surcharges des 5 fonctions publiques + `delete_project_row` + pgTAP ; `PublicFrame` ; route
   `/c/[token]` ; vues publiques avec prop `auth`. Les objets sans lien aujourd'hui (écoute artiste, signature de contrat, devis,
   facture) s'ajoutent quand leurs zones les livrent. Risque : fonctions publiques en production, liens déjà envoyés à garder.
9. **Accueil et Travail globaux** (M, plus tard) — « À vous » par projet, compteur tous projets sur la barre principale.

Effort total coquille : ≈ 9 à 13 jours (lots 1–7 ≈ 5–7 j ; lot 8 ≈ 3–5 j ; lot 9 ≈ 1–2 j), hors parcours Master/
Distribution/Stratégie/Activations/Cadrage que l'agrégateur consomme (zones voisines).

---

## 7. Anomalies du proto à ne pas recopier

1. Sur la Vue d'ensemble, **Accueil et Projets sont allumés en même temps** dans la barre principale.
2. **Entre 761 et 1100 px, aucune navigation de projet** (`.projnav` masquée ≤ 1100, puces seulement ≤ 760) ; ≤ 720 px la
   barre principale disparaît : plus de cloche, d'avatar ni de Travail.
3. Page privée de **Sami Kader** : la section Marketing affiche **toute l'app interne** (coquille « ST / Sami Tahar » : la clé
   `sami` désigne une autre personne dans le moteur Marketing).
4. **Activité non triée** par date (journaux mis bout à bout, Marketing d'abord) et sans le Cadrage.
5. Carte de workflow « **Lina Haddad ·** » sans action (action vide), « **Étape 5 sur 5 · —** » une fois terminé, Master
   « Terminé » qui garde une action (« confirmer le nouveau RIB de Karim »).
6. « Rien à faire pour vous » ne dit pas **qui on attend** (contraire à VISION-UX § 4, que `NowCard` respecte déjà).
7. Validations trouvées **par le verbe** du libellé (Valider/Vérifier/…) : fragile, à remplacer par un type d'action.
8. Faits de tête figés (« Master final Sam. 21/11/2026 » affiché dès le lancement, valeurs en dur).
9. Le sélecteur de projet et « Réseau » sont inertes (l'app les a déjà).
10. Une page privée garde des cartes « Fait · 2 » sans titre de section (Jade, Bastien) : à n'afficher qu'avec leur titre.
