# Inventaire — zone « Distribution » (proto ↔ app)

Dépôt lu : le worktree de la branche `feat/projet-complet`, lecture seule.
Proto : `docs/protos/distribution.html` (script en ligne, 944 lignes, repris tel quel dans `projet.html` par
`docs/protos/src/global/build-global.py`, sans patch). Cahier de recette : `docs/protos/tests/distribution.cjs`
(**passe aujourd'hui, 0 erreur**, sortie relue le 18/10). Ticket Drive : « Ticket PO — Distribution »
(doc `1wBeKCCUPd2k4xDP6-UNMrIqCNHs3k5gLrJMjUDUjEbY`, V1 cadrage fonctionnel, CA01 à CA18).

**Constat général.** Le back-end de l'app couvre déjà presque tout le ticket (7 lots, migrations
`20261011100101` à `…100601`, 103 tests pgTAP) : paramètres, six contrôles, versions avec instantané et
écarts, déclarations séparées avec preuve, anomalies, nouvelle version, plateformes, clôture normale ou
avec réserves, réouverture, historique. **L'écart est surtout de forme et de parcours** : l'app est en
**5 chevrons à pages-formulaires** (Préparation · Dossier · Suivi · Plateformes · Clôture) avec des modales
par geste ; le proto est le **patron unique** (Maintenant + Parcours de 7 étapes en 4 sections + étape
ouverte) avec des gestes groupés (frise The Orchard en un seul geste, « Tout est bon » en un clic,
corrections de The Orchard qui ouvrent l'anomalie **et** la V suivante d'un coup). Deux points de fond :
la **Préparation** ne lit pas encore « pochette **livrée en Production** » (elle lit le statut de la Fiche
Livrable en Conception), et les **dates** de sortie / master final ne viennent pas du Cadrage (la date de
sortie est **tapée** dans le formulaire « Sortie » de la Préparation).

---

## 0. Le cadre commun du proto Distribution

- **En-tête** : « Distribution » + pastille d'état du workflow (Bloqué / En cours / En attente / Terminé,
  calculée : `wfStatus()`), puis la ligne de faits « « Néons » · Mona Lys · single · Master final
  **Sam. 21/11/2026** · Sortie **Sam. 05/12/2026** · Distributeur **The Orchard** ».
- **Maintenant** : « À vous » (action, pourquoi, « Ouvrir l'étape », « Et n autres ») ; « Aussi à vous » ;
  « **À vous, ailleurs** » (Nadia Benali : « Valider le Master V2 » — « Ouvrir dans Master », « Et 1 autre :
  valider la pochette (Conception) ») ; « Rien à faire pour vous » + « La Distribution avance sans vous pour
  l'instant » et la liste « En attente de **Claire Morel** : valider la V1 · Dossier de livraison [Voir] »,
  ou « En attente de **The Orchard** : recevoir le dossier », ou « En attente de **la détection
  automatique** : trouver les liens, à partir du Sam. 05/12/2026 ».
- **Parcours** (7 étapes, 4 sections) : *Dossier* — Préparation, Paramètres de distribution, Dossier de
  livraison ; *Dépôt* — Dépôt dans The Orchard, Réponse de The Orchard ; *En ligne* — Plateformes ;
  *Clôture* — Clôture. Sous-titres : résultat si fait (« Prêt pour contrôle · 9 éléments sur 9 »,
  « Confirmés par Lina Haddad », « V1 validée », « Déclaré, preuve jointe », « Acceptée et livrée,
  déclarées », « 5 plateformes vérifiées sur 5 », « Clôturée avec réserves (3) »), « À vous · … »,
  « Claire Morel · valider la V1 », « En attente de The Orchard · recevoir le dossier », « Après : X »,
  « 3 éléments bloquent le dossier » (rouge), « Possible avec réserves dès maintenant » (Clôture, prérequis
  = Dépôt). Marque de la Clôture en **avertissement** (jamais verte) si réserves, idem Dossier si écart.
  Pied du parcours : liens « **Anomalies** (n ouvertes) » et « **Historique de la distribution** ».
- **Étape ouverte** : titre + pastille (Fait / En cours / Plus tard / En attente d'un retour / Prêt pour
  contrôle / Incomplet), pourquoi, 4 colonnes Responsable / Validation (« Claire Morel · Validateur
  Distribution » ou « Aucune ») / Prérequis (✓/○, pour la Préparation : Master final · Master, Pochette ·
  Conception, Emprunt « Night Lights » · Juridique) / Ensuite ; « Se débloque quand X est fait » + « Ce qui
  viendra » (actions numérotées avec qui) si verrouillée ; motif d'un retour en tête ; vue ; bandeau de
  résultat **dans l'étape** ; action ; « Déjà fait » en bas.
- **Rôles du proto** : Lina Haddad (Cheffe de projet, responsable), Claire Morel (DG, validatrice
  Distribution proposée), Nadia Benali (Directrice créative, agit **ailleurs** : Master, Conception). The
  Orchard n'a pas de lien : ce qu'il dit est **déclaré** par Lina.
- **Dans `projet.html`** (host) : Distribution verrouillée avant « Lancer le plan » ; la Vue d'ensemble a
  « Ce qui dépend d'un autre workflow » : *Master final* (Master → Distribution), *Pochette livrée*
  (Marketing → Distribution, `mk.coverDelivered()` = livraison Production de la pochette), *Prêt pour la
  sortie* (Juridique → Distribution), *Durée du master final* (Master → Juridique · SACEM).

### Correspondance app du cadre
| Élément | App | Écart |
| --- | --- | --- |
| Pages | `app/(app)/app/projects/[projectId]/release/{page,dossier,tracking,online,closure}` | DIFFÉRENT : 5 pages-onglets, pas d'étape ouverte |
| Chevrons | `lib/ui/distribution-steps.ts`, `SectionSteps` dans `projects/[projectId]/layout.tsx` l. 168-175, libellés `fr.shell.project.distributionSteps` | EN TROP (règle 22 « pas d'onglets sous les chevrons » ; le proto n'a pas de chevrons Distribution) |
| Statut commun | `distributionState` `lib/workflow-status/rules.ts` l. 427, faits `distributionFacts` `lib/workflow-status/load.ts` l. 213 ; textes `fr.workflowStatus.distribution` | DIFFÉRENT : « prepared » = sortie + ISRC + date saisis (pas la Préparation réelle) ; jamais « Bloqué » pour une source manquante (seul `withDependencies` bloque, et seulement à l'étape Suivi) |
| En-tête faits | Aucun (h2 + description par page) | MANQUANT (S) : Master final + Sortie + Distributeur |
| Maintenant | Aucun sur les pages Distribution | MANQUANT (M avec le parcours) |
| Parcours 7 étapes | Aucun | MANQUANT (L, lot parcours) |
| Rappel « dépôt manuel » | `ToneCallout fr.distribution.manualNotice` en tête de **chaque** page | DIFFÉRENT : le proto ne le dit qu'à l'étape Dépôt |
| Dépendances Vue d'ensemble | `dependencies()` rules.ts l. 552 : master-online, clearances-online, engineers-contracts | MANQUANT « Pochette livrée → Distribution » (S) |

---

## 1. Écrans et étapes du proto, correspondance, écarts

### 1.1 Préparation (section Dossier) — `prep`, calculée, aucun responsable
**Proto.** Pourquoi : « Ce que le dépôt réutilise, lu dans le module qui en est propriétaire. On corrige à
la source : rien n'est recopié ici. » Responsable « Calculé par le code · à chaque ouverture ».
Verdict rouge « 3 éléments bloquent le dossier · 6 éléments prêts sur 9 · chacun se corrige dans son
module », ou info « **Prêt pour contrôle.** Toutes les sources sont prêtes … Ce n'est pas une validation ».
Faits classés par module, chacun avec note de module, valeur, source datée et pastille (Validé à la source /
Disponible / Non validé / Manquant / Ne bloque pas) :
- *Catalogue* (« Saisi au Catalogue, qui n'a pas d'étape de validation : la donnée fait foi telle que
  saisie ») : Titre et artistes, ISRC, Crédits auteurs et compositeurs, Ligne ℗, UPC (« Souvent attribué
  par le distributeur : ne bloque pas »).
- *Master* : Master final — « Pas encore de master final validé · Master V2 déposé par Karim Haddou, à
  valider » → « Neons_master_V2.wav · version V2 validée le 21/11 par Nadia Benali », lecteur ▶ +
  « Télécharger ».
- *Juridique* : Emprunt « Night Lights » (« Emprunt à sécuriser avant le dépôt · licence envoyée,
  signature attendue », en attente d'« Éditions Nocturne et Velvet Records : signer la licence de
  l'emprunt ») ; Couverture des droits (« Monde entier · aucune restriction territoriale connue ») ;
  « Reste à suivre au Juridique » (contrat de Sami Kader, SACEM : ne bloque pas).
- *Conception* : Pochette « Néons » (« en attente de validation » → « v2 · version validée en Conception »).
- *Projet* : Sortie enregistrée, Date de sortie prévue (« Lancement · validé par Claire Morel le 14/10 »).
Chaque bloquant : « Corriger dans Master / Juridique / Conception ». Pied : « Cette liste se relit seule à
chaque ouverture : rien ne s'y coche à la main. » Proto : 3 boutons pointillés (§ 5).

**App.** `release/page.tsx` → `ReadinessSummary`, `ReadinessList` (`components/distribution/`), calcul pur
`lib/distribution/readiness.ts`, lecture `lib/distribution/sources.ts` (master final par
`loadFinalView` `lib/master-workflow/final`, Juridique par `loadWorkflowStates().details.legalItems`
— un emprunt (`kind === "clearance"`) bloque —, pochette par `loadSheetSummaries` (statut de la Fiche
Livrable `ready_for_production`/`transferred`), contraintes du Cadrage), puis **`ReleaseForm`**
(`components/release/release-form.tsx`, `saveRelease` dans `release/actions.ts`, table `releases` :
titre, ISRC, UPC, date de sortie prévue, URL Spotify). Textes `fr.distribution.readiness`, `fr.release`.

**Écart.**
- Logique de préparation : **OK sur le principe** (sources réelles, « Corriger » vers le module, jamais
  vert, média du master final écoutable). Mots et groupement proches, à aligner (verdict « n éléments
  bloquent le dossier · n prêts sur N », notes par module, « Corriger dans X »). S.
- **Point connu « plus de simulation »** :
  - *Master final validé dans le Master* : OK (`loadFinalView`). Mais l'app accepte aussi un master « déjà
    au Catalogue » (`title.before` → « Disponible ») : le proto bloque tant que le Master ne l'a pas
    validé. DIFFÉRENT — garder l'exception pour un titre de catalogue sans workflow Master (point à
    trancher, à écrire dans `docs/`).
  - *Pochette livrée en Production* : **DIFFÉRENT**. L'app lit le statut de la Fiche Livrable en
    Conception (et devine la fiche par son titre). Le vrai fait est
    `deliverable_deliveries.delivered_at` (migration `20261010000301`) du livrable de la pochette :
    `design_sheets.design_deliverable_id → design_deliverables.strategy_deliverable_id →
    deliverable_deliveries.deliverable_id`, avec la version approuvée (`production_versions`,
    `lib/production/delivery/queries.ts`). Le proto Marketing écrit d'ailleurs « Production › Pochette
    livrée » (`docs/protos/src/mk.js` l. 1361) et sa livraison « pochette validée transmise à la
    Distribution » (`mk-actions.js` l. 104). Pas de migration (lecture, RLS existante à vérifier pour le
    rôle qui ouvre la Distribution). M.
  - *Emprunt sécurisé dans le Juridique* : OK pour qui a `manage_legal`. **Risque** : sans
    `manage_legal`, l'élément est « Accès restreint », **non bloquant**, et la soumission
    (`submitGate`, lue avec la session) passerait. Il faut une fonction SQL `security definer`
    `distribution_legal_blockers(project_id)` qui ne rend que le nombre / les titres des emprunts non
    sécurisés (migration S), utilisée par l'écran et par `submit_distribution_version`.
- **Formulaire « Sortie » (titre, ISRC, UPC, date, Spotify)** : **EN TROP** et contraire à CA03 : l'ISRC
  existe au Catalogue (`masters.isrc`, déjà lu par la Préparation), la date doit venir du Cadrage (§ 1.9),
  le lien Spotify est un lien de plateforme (§ 1.6). Le proto n'a aucun champ ici. À retirer ; garder la
  ligne `releases` créée par le code (voir L0). UPC : le proto le dit « Attribué par The Orchard au dépôt »
  → le saisir comme champ facultatif de la déclaration de dépôt ou « Modifier » dans le dossier (point à
  trancher). Risque : la détection (`lib/release/detect.ts`, cron `app/api/cron/detect-releases`) lit
  `releases.isrc` → la faire lire `masters.isrc`.

### 1.2 Paramètres de distribution (section Dossier) — `params`, responsable Lina, sans validation
**Proto.** Pourquoi : « Ce qui appartient à la distribution elle-même. Tout le reste se corrige dans son
module source. » Faits avec source et « Modifier / Renseigner / Changer » sur place (règle 2) :
- Territoires « Monde entier » — « Par défaut · le contrôle « Droits et territoires » le confirme » ;
  éditeur : Monde entier / Seulement certains pays / Monde entier sauf certains pays + pastilles de pays
  (« Choisissez au moins un pays. »).
- Précommande « Oui, à partir du Sam. 14/11/2026 » — « **Stratégie › Temps forts · « pré-save trois
  semaines avant »** » ; Oui/Non + date (« La sortie est le Sam. 05/12/2026 : la date doit la précéder. »,
  refus « La précommande doit commencer avant la sortie, le Sam. 05/12/2026. »).
- Écoute en avant-première « À renseigner » (obligatoire : « Dites s'il y a une écoute en avant-première. »).
- Catégorie tarifaire « À renseigner » (Front (plein tarif) / Mid / Budget / À confirmer ; « Choisissez une
  catégorie tarifaire : The Orchard la demande. »).
- Pochette (vignette NÉONS) « Pochette « Néons » · en attente de validation » — « Trouvée par son titre en
  Conception : confirmez-la » ; « Changer » liste les Fiches Livrables avec leur statut ; « La pochette
  reste validée dans sa Fiche Livrable ; seul le lien est gardé ici. »
- **Validateur Distribution** « Claire Morel · Directrice générale » — « Proposé : la direction valide les
  dossiers. Jamais le responsable lui-même. » ; « Changer » parmi ceux qui peuvent valider.
- Notes pour la saisie « Aucune » — « Ce qu'il faut savoir au moment de remplir The Orchard ».
Une fois modifiée : « Modifié par Lina Haddad ». Action : **« Confirmer les paramètres »** ; manques en rouge
après l'essai + « 2 informations manquent : elles sont en rouge. ». Résultat : « Paramètres de distribution
confirmés / Débloqué : Dossier de livraison · Lina Haddad · contrôler le dossier V1 ». Paramètres encore
modifiables dans le Dossier jusqu'à la soumission.

**App.** `DossierParamsCard` + `DossierParamsButton` + `DossierParamsForm` (modale, 185 l.) sur
`/release/dossier` ; `saveDossierParams` `lib/distribution/actions.ts` ; schéma `lib/distribution/dossier.ts` ;
table `distribution_dossiers` (`20261011100101`), `validator_person_id` + `set_distribution_validator`
(`20261011100201`) désigné dans `ValidationSection` (« Désigner »). Pochette devinée
(`coverGuessed`). Textes `fr.distribution.dossier.params`.

**Écart.** DIFFÉRENT (M) :
- Pas d'étape « Paramètres » ni de geste **« Confirmer les paramètres »** : migration S —
  `distribution_dossiers.params_confirmed_at/_by` + `confirm_distribution_params(project_id)` (refuse si
  avant-première ou catégorie manquent ; historise `dossier.parameters_confirmed`).
- Édition en modale au lieu de « Modifier » ligne par ligne avec la proposition et sa source dessous
  (règle 2), et « Modifié par … ».
- Précommande **non pré-remplie** (null) : pré-remplir depuis le temps fort pré-save de la Stratégie
  (`milestones`, `lib/strategy/`) ou, à défaut, la règle « 3 semaines avant la sortie » (code), avec sa
  source. S.
- Validateur : désigné ailleurs et **vide par défaut** ; proto = dans les paramètres, **pré-proposé** (DG
  détenteur de `validate`, jamais le responsable) avec sa raison (règle 22). S, sans migration.
- Contrôle « date avant la sortie » : l'app le signale comme écart du contrôle Calendrier
  (`checks.ts` l. 156) mais n'empêche pas l'enregistrement ; le proto refuse à l'enregistrement. S.

### 1.3 Dossier de livraison (section Dossier) — `dossier`, responsable Lina, validation Claire
**Proto.**
- *Préparer* (Lina) : carte document en tête (règle 18) « Dossier de livraison · V1 » + « En préparation ·
  paramètres modifiables jusqu'à la soumission » + « Exporter en PDF » ; sections **Sortie** (Titre, Artiste
  principal, Label, Format « Projet · Lancement », Date de sortie « Projet · Lancement, validé par Claire
  Morel », UPC grisé « Attribué par The Orchard au dépôt · Ne bloque pas »), **Pistes** (Piste 1 · Titre,
  ISRC, Ligne ℗, Auteurs et compositeurs, Audio avec lecteur + « Télécharger » « Master final V2, validé
  dans le workflow Master »), **Visuel** (vignette, « v2 · version validée en Conception », « Changer »),
  **Territoires et droits** (Territoires, État des droits « Emprunt « Night Lights » sécurisé · couverture
  monde entier · Juridique », Contrainte du Cadrage), **Prix et dates**, **Notes** ; chaque paramètre avec
  « Modifier ».
- *Contrôles de cohérence* « 0 contrôle sur 6 enregistré » — « Chacun est enregistré par une personne. Le
  calcul de PDS OS aide, il ne vaut jamais contrôle. » Par contrôle : quoi, « Calcul de PDS OS : Cohérent /
  Écart / À confirmer par une personne · … », « Personne n'a encore enregistré ce contrôle. » ou
  « Contrôlé par Lina Haddad le 23/11, 10:25 », boutons **sur place** Conforme / Non conforme / Non
  applicable ; Non conforme ouvre « Ce qui ne correspond pas * » + « Enregistrer le contrôle » ; « Changer ».
  Sous la liste : « n contrôles non conformes : corrigez à la source… » (bloque) ou « 6 contrôles sur 6 non
  vérifiés : Claire Morel le verra. » (ne bloque pas).
- Si la Préparation bloque : encadré « 3 éléments de la Préparation bloquent la soumission. Vous pouvez déjà
  régler les paramètres et faire les contrôles. » + un bouton « <élément> · corriger dans <module> » par
  manque ; erreur « La Préparation n'est pas prête : corrigez d'abord à la source ce qui bloque. »
- Action : « Claire Morel recevra le dossier tel qu'il est maintenant. Les paramètres seront figés jusqu'à
  sa décision. » **« Soumettre la V1 à Claire Morel »** → « V1 soumise à Claire Morel / Ensuite : Claire
  Morel · valider la V1 ».
- *Décider* (Claire, sur pièce, règle 5) : même carte en lecture seule, « Soumise le 23/11, 13:49 par Lina
  Haddad, à Claire Morel · paramètres figés », contrôles lus, encadré « **Pas encore connu :** l'UPC et
  l'identifiant The Orchard, attribués au dépôt. », « En validant, Lina Haddad pourra faire le dépôt dans
  The Orchard et le déclarer. » **« Valider la V1 »** ; issue repliée **« Refuser »** (Motif * obligatoire,
  « Dites pourquoi : c'est ce que Lina Haddad lira en tête de l'étape. »). Refus → retour en tête de l'étape
  chez Lina « Claire Morel (refuser) : « … » / À corriger dans : Paramètres de distribution », numéro suivant
  V2, « Soumettre la V2 ».
- *Fait* : « V1 validée », carte en lecture, contrôles, « Versions précédentes du dossier » repliées.
  **Écart à la source** (§ 13) : « Changé à la source depuis la V1 validée : Pochette : v2 → **v3** (Nadia
  Benali, Conception). Le dossier ne correspond plus à la source. », marque d'avertissement dans le
  parcours, « À vous · Préparer la V2 » ; formulaire « Ce qui a été corrigé, et où * » pré-rempli + **« Préparer
  la V2 »** (la V1 et son cycle de dépôt restent dans l'historique ; les six contrôles repartent à « non
  vérifié »). Après corrections de The Orchard : ligne « Rien n'a changé à la source depuis la V2 : la
  correction demandée par The Orchard n'est pas encore faite. » puis « Changé à la source depuis la V2 :
  Auteurs et compositeurs : Sami Kader → **Samir Kader** (Lina Haddad, Catalogue) ».

**App.** `/release/dossier` : `ValidationSection` (désigner, soumettre, valider / refuser en modales,
`validation-forms.tsx`, écarts `drift` l. 117), `ChecksSection` + `CheckForm` (modale), `DossierParamsCard`,
`DossierSections` (`lib/distribution/delivery-file.ts`), `VersionList`. SQL : `distribution_checks`,
`record_distribution_check`, `distribution_versions` (+ `snapshot`), `submit_distribution_version`,
`decide_distribution_version`, `distribution_dossier_editable` ; nouvelle version `prepare_distribution_version`
(`20261011100501`) via `anomalies-section`. Calcul `computedSignal` `lib/distribution/checks.ts`, garde
`submitGate` / `snapshotDrift` `lib/distribution/validation.ts`, vue `lib/distribution/view.ts`.

**Écart.** Back-end OK. DIFFÉRENT (M-L) :
- Ordre et forme : l'app met validation, contrôles, paramètres puis le dossier ; le proto met **le document
  en tête** (règle 18) avec paramètres modifiables dedans, puis les contrôles, puis le geste.
- Contrôles en modale (`CheckForm`) ; proto : trois boutons sur la ligne, note en place pour « Non conforme ».
- **Manquent** : lecteur audio + « Télécharger » dans la piste (la donnée `media` existe dans la
  Préparation), vignette de pochette, **« Exporter en PDF »** du dossier (`lib/pdf/render.ts`, M),
  encadré « Pas encore connu » côté validateur, boutons « corriger dans X » par manque.
- Refus : le motif doit revenir **en tête de l'étape** chez le responsable (règle 6) ; l'app le montre dans
  la liste des versions. S.
- Écarts (`snapshotDrift`) : compare les **valeurs affichées** ; une nouvelle version de pochette ou de
  master au même titre ne se voit pas. Ajouter au dossier la version (n° de version Production de la
  pochette, n° du master final) pour que l'écart « v2 → v3 » apparaisse. S, sans migration (l'instantané est
  du JSON).
- « Préparer la V(n+1) » vit dans `AnomaliesSection` (page Suivi) ; proto : dans l'étape Dossier, mis en
  avant quand un écart existe. S.
- Notifications : **aucune** pour la Distribution (pas de trigger sur `distribution_versions` /
  `distribution_closures`, rien dans Travail / Validations : `grep` ne trouve `distribution_versions` que
  dans `lib/workflow-status/load.ts`). Proto : Claire voit « Valider la V1 » dans Maintenant, Travail,
  Validations, pastille du menu. Migration M : triggers de `notifications` (soumission → validateur ;
  décision → responsable ; clôture proposée / décidée) + entrées de `lib/work/` et des Validations.

### 1.4 Dépôt dans The Orchard (section Dépôt) — `deposit`, responsable Lina
**Proto.** Pourquoi : « Vous saisissez le dossier validé dans The Orchard, puis vous déclarez le dépôt ici. »
Encadré : « Le dépôt se fait à la main dans The Orchard. PDS OS ne transmet rien au distributeur : il
prépare, contrôle et garde la trace de ce que vous déclarez. » Repli ouvert « Ce que vous saisissez dans
The Orchard — Chaque valeur se copie » : le dossier avec un **« Copier »** par valeur (17 boutons dans le
test). Bloc « Dépôt manuel effectué dans The Orchard » (« Date, identifiant et preuve sont facultatifs :
leur absence restera visible. ») : Date, Identifiant The Orchard (« Ex. 10458823 »), Preuve (zone de dépôt
« Ajouter une capture, un PDF ou un courriel exporté · 50 Mo au plus · sans preuve, la déclaration reste
« sans preuve » »), **« Déclarer le dépôt »** → « Dépôt manuel déclaré effectué · preuve jointe / Débloqué :
Réponse de The Orchard · en attente de The Orchard : recevoir le dossier ». Si écart à la source :
« Le dossier validé ne correspond plus à la source (pochette v3). Préparez la V2 avant de déposer. »
Fait : « Dépôt manuel déclaré · dossier V1 » + source « Déclaré le … par … · date indiquée … · identifiant
The Orchard … » + pastille « Déclaré, preuve jointe » + « Voir la preuve ».

**App.** `/release/tracking` : `TrackingCycle` → `DeclarationButton kind="deposit"`
(`declaration-forms.tsx`, modale), `declareDistribution` → `declare_distribution` (`20261011100301`), bucket
`distribution-proofs`, `upload-proof.ts`, `proof-rules.ts`. `EmptyState` « dossier pas validé » avant.

**Écart.** DIFFÉRENT (M) : pas d'étape propre ; pas de dossier « à copier » (`CopyButton` existe,
`docs/COMPOSANTS.md`) ; pas d'avertissement d'écart avant dépôt. Données et règles (CA06, CA08) OK.

### 1.5 Réponse de The Orchard (section Dépôt) — `orchard`, responsable Lina, attend The Orchard
**Proto.** Pourquoi : « Réception, acceptation, puis livraison aux plateformes : chacune se déclare à part,
aucune n'est déduite d'une autre. » **Frise** Déposé · Reçu · Accepté · Livré aux plateformes, chaque
point avec sa date et « preuve jointe / sans preuve », « En attente de The Orchard » sur le point courant,
« Pas encore » ensuite, et « **Ajouter une preuve** » sur un point déclaré sans preuve. Formulaire « Ce que
The Orchard vous a dit » — « Cochez ce que vous avez appris, par e-mail ou sur leur site, puis enregistrez.
Chaque état a sa date et, si vous l'avez, sa preuve. » : trois cases (Il a reçu le dossier — « Cela ne vaut
ni acceptation ni livraison. » ; Il a accepté la sortie — « Cela ne vaut pas livraison aux plateformes. » ;
Il a livré les plateformes — « Cela ne vaut pas disponibilité : elle se vérifie plateforme par
plateforme. »), une case n'est cochable que si la précédente l'est ; case cochée → date + « Joindre une
preuve », la preuve d'une ligne est proposée aux autres (« **Même e-mail que « Accepté »** », « Changer »,
retirer) ; **« Enregistrer »** (« Cochez ce que The Orchard vous a fait savoir. ») → « 3 réponses de The
Orchard enregistrées / Débloqué : Plateformes · en attente de la détection automatique… ». Issue repliée
**« The Orchard demande des corrections »** : « Ce que The Orchard demande * », Type d'anomalie *, À corriger
dans *, Gravité * (Mineure / Majeure / Bloquante), « Une anomalie s'ouvre. La correction se fait dans ce
module, puis une nouvelle version du dossier est validée et déposée. », « Déclarer les corrections
demandées » → **en un geste** : déclaration + anomalie ouverte + V(n+1) préparée (« Corrections demandées :
V3 à préparer / Ensuite : Lina Haddad · soumettre la V3 à validation »), l'étape Dossier s'ouvre avec le
retour « The Orchard (corrections demandées, déclarées par Lina Haddad) : « … » / À corriger dans :
Catalogue [Corriger dans Catalogue] ».

**App.** `TrackingCycle` (4 lignes État / déclaration, badges `distributionEvidenceTone`, « Retirer ») +
un bouton-modale **par état** (`declarable()` `lib/distribution/tracking.ts` l. 77) ; `corrections_requested`
est une simple déclaration avec note ; ensuite `ToneCallout fr.distribution.anomalies.correctionsCallout`
(« Corrigez dans le module source, puis préparez une nouvelle version du dossier depuis l'étape Dossier. »),
l'anomalie et la nouvelle version sont **deux autres gestes** (`AnomaliesSection`, `prepare_distribution_version`).
`DeclarationHistory` sous la page.

**Écart.** DIFFÉRENT (M) — c'est la règle 7 de `docs/VISION-UX.md` (« frise … se déclare en un seul geste,
pas un bouton par état », Sacha 18/10) :
- Frise + formulaire à cases, plusieurs déclarations en un « Enregistrer » (server action qui appelle
  `declare_distribution` dans l'ordre ; idéalement une RPC `declare_distribution_many` atomique, S).
- Ordre imposé à l'écran (l'app permet de déclarer « livré » sans « accepté » ; la base ne déduit rien, c'est
  conforme au § 7 — l'ordre n'est qu'une aide de saisie, à écrire dans `docs/`).
- Une preuve partagée par plusieurs déclarations (même objet du bucket, à vérifier avec la purge des
  orphelins) ; « Ajouter une preuve » plus tard : **migration S** `attach_distribution_declaration_proof`
  (seulement si la déclaration n'en a pas, historisé — les déclarations ne sont jamais réécrites
  autrement).
- Corrections en un geste : **migration M** `declare_distribution_corrections(project, note, kind, module,
  severity)` = déclaration + `distribution_anomalies` + version remplacée + contrôles remis à « non
  vérifié », dans une transaction.
- « Retirer » une déclaration : absent du proto mais prévu par le ticket (historique) → garder en action
  secondaire.

### 1.6 Plateformes (section En ligne) — `platforms`, responsable Lina
**Proto.** Pourquoi : « Le lien officiel de chaque plateforme, puis ce qu'une personne a constaté en
l'ouvrant. PDS OS ne vérifie rien tout seul. » Ensuite « Clôture normale ». Fait « Disponibilité
publique » : Non déclarée / Déclarée, non vérifiée / Vérifiée partiellement / Vérifiée, « n plateformes de
référence vérifiées sur 5 · pas encore déclarée », pastille « n sur 5 », **« Déclarer la disponibilité
publique »**. Avant la sortie : « En attente de la détection automatique : trouver les liens, à partir du
Sam. 05/12/2026. Vous pouvez aussi renseigner un lien vous-même. » En-tête de liste « Plateformes » +
**« Ajouter une plateforme »** (Nom *, Lien officiel ; « hors des cinq de référence »). Par plateforme :
nom, « À vérifier / Vérifiée disponible / Indisponible » + « Conforme / Non conforme », lien
(« **Trouvé par la détection automatique le 05/12** » ou « Lien non renseigné · la détection ne l'a pas
trouvé »), « Vérifiée par Lina Haddad le 07/12, 16:22 », boutons « Ouvrir », **« Tout est bon »** (un clic =
disponible **et** conforme), « Il y a un problème » (La sortie n'y est pas / Elle y est, mais quelque chose
diffère du dossier validé ; « Ce que vous avez vu * », « À corriger dans * » → **anomalie ouverte** dans le
même geste), « Renseigner le lien » (« Collez le lien officiel : il commence par https:// »), « Revérifier ».
Section « Anomalies des plateformes » + « Toutes les anomalies ». Fin : « Les cinq plateformes de référence
sont vérifiées, disponibles et conformes. Une clôture normale est possible. » Maintenant : « Vérifier les
plateformes (4 sur 5) », « Suivre l'anomalie ouverte ».

**App.** `/release/online` : `AvailabilityCard`, `PlatformsSection` + `PlatformEditButton` /
`PlatformVerifyButton` (`platform-forms.tsx`, modales ; vérification et conformité choisies séparément),
suggestion de la détection affichée « à reprendre » (`lib/distribution/platforms.ts` l. 54-85 : « a
suggestion, never filled in »), puis `DetectionCard` (« Vérifier maintenant », `checkRelease`) et
**`SmartlinkCard`**. SQL `distribution_platforms`, `save_distribution_platform`, `verify_distribution_platform`
(`20261011100401`).

**Écart.** DIFFÉRENT (M) :
- Lien de la détection montré **comme pré-rempli avec sa source** (règle 1) et « Tout est bon » en un clic :
  **migration S** `confirm_distribution_platform(project, platform, url)` (enregistre le lien proposé +
  disponible + conforme, par la personne). La détection reste une suggestion tant que personne n'a cliqué
  (CA16 tenu).
- « Il y a un problème » qui ouvre l'anomalie dans le même geste : étendre `verify_distribution_platform`
  (ou nouvelle RPC) pour créer `distribution_anomalies` (type `platform_unavailable` / `metadata`, module).
  Migration S.
- « Ajouter une plateforme » dans l'en-tête de la liste (règle 17). S.
- `DetectionCard` : à fondre dans l'attente « En attente de la détection automatique » (le bouton « Vérifier
  maintenant » peut rester en recours). S.
- **`SmartlinkCard` : EN TROP** (ni proto ni ticket Distribution ; le dossier de presse lit les liens
  vérifiés). À masquer ou déplacer vers Marketing / Activations — point à trancher avec Ibé (CLAUDE.md :
  « clé Odesli ou smartlink maison » en décision en attente).

### 1.7 Anomalies (vue depuis le pied du parcours)
**Proto.** « Anomalies » + « Signaler une anomalie » (en-tête) + « ← Parcours ». « Ce qui ne va pas, et le
module où le corriger. Rien ne se corrige ici : une fois la source corrigée, une nouvelle version du dossier
est préparée depuis l'étape Dossier. » Formulaire : Type *, Module où corriger * (proposé d'après le type),
Description *, Plateforme concernée, Gravité *. Ligne : type · plateforme, « « description » », « Signalée le …
par … (déclarée de The Orchard) · dossier V3 · à corriger dans : … », pastilles état + gravité, « Corriger
dans X », « Changer l'état » (Ouverte / En correction à la source / Résolue / Écartée ; « Pourquoi » obligatoire
pour résolue ou écartée). Vide : « Aucune anomalie déclarée, mais des contrôles restent non vérifiés :
l'absence d'anomalie ne vaut pas conformité. »
**App.** `AnomaliesSection` + `anomaly-forms.tsx` sur `/release/tracking`, `distribution_anomalies`,
`report_distribution_anomaly`, `set_distribution_anomaly_state`. **Écart** : OK en données et règles ;
DIFFÉRENT d'emplacement (vue à part depuis le parcours, pas sous le Suivi). S.

### 1.8 Clôture (section Clôture) — `closure`, responsable Lina, validation Claire
**Proto.** Prérequis : Dépôt dans The Orchard (« Possible avec réserves dès maintenant »). Pourquoi : « Fermer
le suivi : normalement si tout est déclaré et vérifié, sinon avec des réserves arbitrées. Une réserve ne
devient jamais une vérification. » « Conditions d'une clôture normale » ✓/○ + « Remplie / Non remplie » +
détail : Réception, acceptation et livraison déclarées ; Les cinq plateformes vérifiées disponibles ; Leur
conformité vérifiée ; Les six contrôles enregistrés, aucun non conforme ; Aucune anomalie ouverte. Sans
réserve : « Proposer une clôture normale ». Avec réserves : « Elles resteront non vérifiées : la distribution
sera « clôturée avec réserves », jamais « distribuée » ni « conforme ». », réserves regroupées (« Disponibilité
non vérifiée sur 1 plateforme · Amazon Music »), « Arbitrage : pourquoi clôturer malgré ces réserves * »,
case « Je confirme que ces réserves restent non vérifiées après la clôture. », **« Proposer une clôture avec
réserves »**. Claire : proposition + arbitrage + conditions + réserves en lecture, « Le suivi de la
distribution sera fermé. Une réouverture reste possible et sera tracée. » **« Valider la clôture »** /
« Refuser » (motif). Fait : « Clôturée avec réserves (3) le … par … · Arbitrage : « … » », chaque réserve
« Non vérifiée », workflow « Terminé », marque non verte ; « Rouvrir le suivi » (Motif *).
**App.** `/release/closure` : `ClosureSection` + `closure-forms.tsx`, `DistributionHistory` ;
`lib/distribution/closure.ts` (réserves groupées), `closure-queries.ts`, SQL `distribution_closures`,
`distribution_closure_ready`, `propose_…`, `decide_…`, `reopen_distribution_closure` (`20261011100601`).
**Écart.** OK en règles (CA14, CA15, regroupement § 10). DIFFÉRENT de forme : dans le patron d'étape,
« Remplir avec un exemple » est propre au proto (à ne pas reprendre). S.

### 1.9 Historique de la distribution
**Proto.** Vue « Historique de la distribution » : « Chaque geste, qui l'a fait et quand, avec ou sans preuve.
Une déclaration retirée ou une version remplacée reste ici. » + « Déjà fait » dans chaque étape.
**App.** `DistributionHistory` (page Clôture) et `DeclarationHistory` (page Suivi), `lib/distribution/history.ts`,
`distribution_events`. **Écart** : OK en données ; DIFFÉRENT d'emplacement (vue depuis le pied du parcours,
« Déjà fait » par étape à filtrer par type d'événement). S.

### 1.10 Dates cohérentes d'un workflow à l'autre (point connu)
**Proto.** Une seule paire de dates partout : Sortie Sam. 05/12/2026, Master final Sam. 21/11/2026 (Master
`RELEASE`, Juridique `RELEASE`/`MASTER_DUE`, Distribution `RELEASE`/`MASTER_FINAL`). En Distribution la date
de sortie n'est jamais saisie : « Projet · Lancement, validé par Claire Morel ». Précommande : « 3 semaines
avant » depuis la Stratégie. Juridique : « Calculé : 15 jours avant la sortie » (SACEM).

**App — où sont les dates aujourd'hui.**
- Date visée du Cadrage : question `target_date` (`lib/framing/dimensions.ts` l. 83) = `projects.due_date`
  (fiche projet, `lib/framing/assess.ts` l. 246) ; échéances confirmées `framing_deadlines` (kinds
  `master_final`, `delivery`, `release`, `lib/framing/knowledge.ts`), conflits « échéance après la date
  visée » / « date de sortie différente » (`lib/framing/conflicts.ts`).
- Date de sortie de l'app : **`releases.planned_release_date`, tapée dans le formulaire Sortie de la
  Distribution** (`release/actions.ts`). Lue par : Stratégie (`referenceDate()` `lib/strategy/calendar.ts`
  l. 22 : `planned_release_date ?? projects.due_date`), Plan du projet (`lib/project-plan/queries.ts` l. 141),
  Juridique (échéances `lib/legal/plan/due-dates.ts` : emprunts 45 j, contrats 30 j, SACEM 15 j avant),
  Master (`lib/master-workflow/delay-impact.ts`, `engineer-thread-actions.ts`), statut (`load.ts` l. 218).
- Master final : `master_briefs.master_final_due` (Brief Mix/Master), pré-rempli **avant** la première
  sauvegarde depuis `framing_deadlines` `master_final` confirmée (`lib/master-workflow/framing-defaults.ts`) ;
  jalons du mix calculés à rebours (`lib/master-workflow/calendar.ts` `DAYS_BEFORE_MASTER_FINAL`). Lu par
  les dépendances (`load.ts` l. 362 `masterDue`).
- **Aucune règle** « master final = sortie − N jours » dans le code (le proto montre 14 jours).

**Écart.** DIFFÉRENT (M) : deux sources concurrentes pour la sortie (`projects.due_date` du Cadrage et
`releases.planned_release_date` de la Distribution) et un repli silencieux de l'une sur l'autre. Proposition
(à écrire dans `docs/ARCHITECTURE.md` et `CONTEXTE-PROJET.md`) :
1. **Sortie** = date visée confirmée du Cadrage (validée avec le Brief par le DG), recopiée **par le code**
   dans `releases.planned_release_date` au lancement du plan (`launch_project_plan`, ou au lancement du
   workflow Distribution `launch_plan_workflow`) ; changeable seulement depuis le Cadrage / Plan, avec trace.
   Migration S-M (création de la ligne `releases` + date au lancement ; plus d'écriture de la date depuis la
   Distribution).
2. **Master final** = échéance `master_final` confirmée du Cadrage, sinon règle du code « sortie − 14 jours »
   (constante nommée dans `lib/master-workflow/calendar.ts`, *point à trancher* : le 14 ne vient que du proto),
   déjà propagée au Brief ; refus d'une date après la sortie.
3. Un seul point d'entrée `lib/projects/dates.ts` (`projectDates(projectId)` → sortie, master final, avec leur
   source) lu par l'en-tête Distribution, le Juridique, la Stratégie, le Master et les dépendances.
4. Précommande = temps fort pré-save de la Stratégie, sinon sortie − 21 jours, proposée avec sa source.

---

## 2. Briques communes utilisées par la zone

| Brique (proto) | Existe dans l'app | Où / écart |
| --- | --- | --- |
| « Maintenant » (À vous / Aussi à vous / Rien à faire) | Oui | `components/shell/journey/now-card.tsx`, `lib/ui/journey.ts` ; **manque « À vous, ailleurs »** (Nadia → Master / Conception) et l'attente d'un tiers non-personne (The Orchard, « la détection automatique ») — étendre `JourneyActor` (S) |
| Parcours à gauche | Oui | `journey-spine.tsx` ; **manquent les intertitres de section** (Dossier / Dépôt / En ligne / Clôture), la marque « avec réserves » (avertissement) et **deux** liens de pied (Anomalies, Historique) au lieu d'un `footer` (S) |
| Étape ouverte (4 colonnes, Se débloque quand, Déjà fait) | Oui | `step-panel.tsx` ; utilisé par Production et `components/legal/legal-step-frame.tsx` |
| Fait avec source + « Modifier » sur place + « Modifié par » | Partiel | `FactTable` / `FactList` ; pas d'édition en ligne générique (le proto Paramètres en a besoin) |
| Décision avec motif (Valider / Refuser) | Oui | `ReasonForm`, `FormDialog`, `validation-forms.tsx`, `closure-forms.tsx` — le proto les met en repli `details` sous le geste principal, pas en modale |
| Motif d'un retour en tête de l'étape | Non (pour la Distribution) | à ajouter (refus de version, refus de clôture, corrections de The Orchard) |
| Bandeau de résultat dans l'étape, « Ensuite : … / Débloqué : … » | Partiel | `useWriteSubmit` donne le toast ; le bandeau « qui agit ensuite » est à calculer depuis le parcours |
| Carte document en tête + « Exporter en PDF » + ligne « Changé depuis la Vn » | Partiel | `PdfExportButton`, `lib/pdf/render.ts` ; drift `snapshotDrift` existe |
| Frise d'états déclarés, un seul geste | Non | à créer (`components/distribution/orchard-track.tsx`) — règle 7, réutilisable ailleurs (agence, presse) |
| Lecteur du master final + Télécharger | Oui | `AudioFile`, `media` de la Préparation |
| Copier une valeur | Oui | `CopyButton` |
| Dépôt de preuve | Oui | `FileDropZone` / `FilePickField`, bucket `distribution-proofs` |
| Statut commun calculé | Oui | `loadWorkflowStates` |
| Formulaire de call, compte rendu, Confirmer/Modifier/Écarter, cartes « Recommandé » | Sans objet | la Distribution n'a ni call ni proposition de PO |
| Pages privées | Sans objet | The Orchard n'a pas de lien (ses réponses sont déclarées) |

---

## 3. Simulations du proto (boutons pointillés « Proto : … ») et vrai événement

| Bouton du proto | Vrai événement dans l'app |
| --- | --- |
| « Proto : le faire dans Master » / « Proto : Nadia Benali valide le master final » | Validation du master final dans le workflow Master (`lib/master-workflow/final`, décision du valideur sur la version de mastering) ; la Préparation se relit (pages relues par `ProjectLive`) |
| « Proto : le faire dans Conception » / « Proto : Nadia Benali valide la pochette » | **Livraison de la pochette en Production** : version validée, contrôle technique, « Confirmer la livraison » → `deliverable_deliveries.delivered_at` (`lib/production/delivery/*`) — à lire par `sources.ts` (aujourd'hui : statut de la Fiche Livrable) |
| « Proto : la licence signée revient (Juridique) » | Emprunt sécurisé au Juridique (`legal_clearances` / `lib/legal/clearance`, licence signée reçue par le fil de l'e-mail ou déposée), lu par `legalItems` |
| « Proto : faire la correction au Catalogue » | Correction du crédit au Catalogue (`master_contributors`, page crédits du titre) ; l'écart « Sami Kader → Samir Kader » sort de `snapshotDrift` |
| « Proto : la pochette change en Conception » | Nouvelle version de pochette livrée en Production après la validation du dossier ; écart visible seulement si le dossier porte le n° de version (§ 1.3) |
| « Proto : la détection passe le jour de la sortie » | Cron `app/api/cron/detect-releases` (`lib/release/detect.ts`, `release_links`) et « Vérifier maintenant » |
| Réponses de The Orchard, preuves (« Joindre une preuve », « Mail_TheOrchard_… .eml ») | Aucune simulation : déclarations humaines (`declare_distribution`) et vrais fichiers envoyés dans `distribution-proofs` |
| « Remplir avec un exemple » (motifs, anomalie, arbitrage) | Propre au proto, à ne pas reprendre |

---

## 4. Écart par élément — récapitulatif

| # | Élément | Écart | Effort | Migration |
| --- | --- | --- | --- | --- |
| 1 | Parcours 7 étapes + Maintenant + en-tête de faits | MANQUANT (5 chevrons à la place) | L | non |
| 2 | Préparation : logique, sources | OK, mots à aligner | S | non |
| 3 | Préparation : pochette = livrée en Production | DIFFÉRENT | M | non |
| 4 | Préparation : emprunt bloquant pour tout lecteur | DIFFÉRENT (risque) | S | oui : `distribution_legal_blockers` |
| 5 | Formulaire Sortie (titre, ISRC, UPC, date, Spotify) | EN TROP (CA03) | S (retrait) + M (dates) | oui : ligne `releases` créée au lancement |
| 6 | Paramètres : étape + « Confirmer les paramètres » | MANQUANT | S | oui : `params_confirmed_at/_by` + `confirm_distribution_params` |
| 7 | Paramètres : édition en ligne, précommande pré-remplie, validateur proposé dans les paramètres | DIFFÉRENT | M | non |
| 8 | Dossier : carte document en tête, audio, vignette, PDF, contrôles sur place, « Pas encore connu », retour en tête | DIFFÉRENT / MANQUANT (PDF) | M | non |
| 9 | Écarts avec n° de version pochette / master | DIFFÉRENT | S | non |
| 10 | Notifications + Travail / Validations pour le validateur | MANQUANT | M | oui : triggers `notifications` |
| 11 | Dépôt : étape, dossier à copier, alerte d'écart | DIFFÉRENT | M | non |
| 12 | Réponse de The Orchard : frise + un seul geste + preuve partagée + preuve ajoutée après | DIFFÉRENT | M | oui : `attach_distribution_declaration_proof` (+ option `declare_distribution_many`) |
| 13 | Corrections de The Orchard en un geste (anomalie + V suivante) | DIFFÉRENT | M | oui : `declare_distribution_corrections` |
| 14 | Plateformes : lien détecté pré-rempli, « Tout est bon », problème → anomalie, Ajouter en en-tête | DIFFÉRENT | M | oui : `confirm_distribution_platform` + anomalie dans la vérification |
| 15 | Smartlink | EN TROP | S (masquer) | non |
| 16 | Anomalies, Historique en vues du parcours | DIFFÉRENT (emplacement) | S | non |
| 17 | Clôture | OK (forme) | S | non |
| 18 | Statut « Bloqué » si une source manque ; dépendance « Pochette livrée » | DIFFÉRENT / MANQUANT | S | non |
| 19 | Dates cohérentes (Cadrage → sortie, master final) | DIFFÉRENT | M | oui (cf. 5) |
| 20 | Rappel « dépôt manuel » sur chaque page | EN TROP (seulement à l'étape Dépôt) | S | non |

**Effort total estimé : ≈ 12 à 16 jours** (dont ~5 j de patron/parcours, ~3 j de gestes groupés avec leurs
5-6 petites migrations, ~2 j de dates et sources réelles, ~2 j de notifications, le reste en alignement de
mots, PDF et tests).

---

## 5. Découpage proposé en sous-lots (chacun livrable et testable seul)

**D0 — Dates et sources réelles (M, ~2 j).** `lib/projects/dates.ts` (sortie depuis le Cadrage, master final
depuis l'échéance confirmée ou la règle) ; ligne `releases` créée par le code au lancement (migration :
`launch_project_plan` / `launch_plan_workflow` insèrent la sortie avec `planned_release_date`) ; Préparation :
pochette lue en Production (`deliverable_deliveries`), emprunts via `distribution_legal_blockers` (migration),
master final validé seulement (exception catalogue à trancher) ; `distributionState` lit la Préparation
(« Bloqué » si un bloquant), dépendance « Pochette livrée → Distribution » dans `dependencies()`.
*Risques* : la Stratégie, le Juridique, le Plan et le Master lisent `releases.planned_release_date` (inchangé,
mais projets existants sans ligne → migration de rattrapage) ; la détection lit `releases.isrc` → la passer à
`masters.isrc` ; tests pgTAP `distribution.test.sql` à compléter.

**D1 — Patron de parcours en lecture (L, ~4-5 j).** `lib/distribution/journey.ts` (7 étapes, 4 sections,
acteurs dont « ailleurs » et tiers The Orchard / détection) depuis les faits existants ; layout
`release/layout.tsx` (en-tête de faits, `NowCard`, `JourneySpine` avec intertitres et 2 liens de pied) ;
routes `/release` (Préparation), `/release/params`, `/release/dossier`, `/release/deposit`, `/release/orchard`,
`/release/online`, `/release/closure`, `/release/anomalies`, `/release/history` ; anciennes URL `/tracking`
redirigées ; retrait des chevrons Distribution (`SectionSteps`, `lib/ui/distribution-steps.ts`,
`workflow-hrefs.ts`, `board.ts` qui pointent `prepare`/`online`). Pas de migration. Étendre `NowCard` /
`JourneySpine` (briques partagées : à coordonner avec les autres zones). *Risque* : liens déjà partagés et
`workflowStepHref` utilisés par la Vue d'ensemble / Accueil.

**D2 — Paramètres (M, ~1,5 j).** Étape avec faits + « Modifier » en ligne + « Modifié par », précommande
pré-remplie (Stratégie), validateur proposé (DG) dans les paramètres, « Confirmer les paramètres » (migration
`params_confirmed_at/_by` + `confirm_distribution_params`), refus d'une date après la sortie ; retrait du
formulaire « Sortie » (UPC : point à trancher). *Risque* : `submitGate` doit exiger la confirmation ;
dossiers existants à marquer confirmés.

**D3 — Dossier de livraison et validation (M, ~2 j).** Carte document en tête (audio, vignette, n° de
versions, « Exporter en PDF » via `lib/pdf/render.ts`), contrôles sur place, encadrés de blocage avec
« corriger dans X », décision sur pièce (« Pas encore connu »), refus en tête de l'étape, écarts + « Préparer
la V(n+1) » dans l'étape. Notifications (migration triggers) et entrées Travail / Validations.

**D4 — Dépôt et Réponse de The Orchard (M, ~2 j).** Étape Dépôt (dossier à copier, alerte d'écart, déclaration) ;
frise + formulaire à cases en un geste, preuve partagée, « Ajouter une preuve » (migration
`attach_distribution_declaration_proof`), issue « The Orchard demande des corrections » en un geste (migration
`declare_distribution_corrections`). *Risque* : purge des preuves orphelines si un fichier est partagé.

**D5 — Plateformes (M, ~1,5 j).** Lien détecté pré-rempli avec sa source, « Tout est bon » (migration
`confirm_distribution_platform`), « Il y a un problème » → anomalie (extension de
`verify_distribution_platform`), « Ajouter une plateforme » en en-tête, attente de la détection ; smartlink
masqué (ou déplacé, à trancher). *Risque* : le dossier de presse lit les liens vérifiés (inchangé).

**D6 — Anomalies, Historique, Clôture dans le patron (S, ~1 j).** Vues depuis le pied du parcours, « Déjà fait »
par étape (filtre de `distribution_events`), Clôture en étape (marque d'avertissement si réserves), rappel
« dépôt manuel » limité à l'étape Dépôt.

Ordre conseillé : D0 → D1 → D2 → D3 → D4 → D5 → D6 (D0 et D1 indépendants entre eux ; D2-D6 supposent D1).
Chaque lot : `pnpm build`, `supabase test db` (compléter `supabase/tests/distribution.test.sql`), et rejouer
le scénario correspondant de `docs/protos/tests/distribution.cjs` à la main dans l'app.

## 6. Points à trancher (à écrire dans `docs/` au moment du lot)
- Master « déjà au Catalogue » sans workflow Master : disponible (app actuelle) ou bloquant (proto) ?
- Règle « master final = sortie − 14 jours » quand le Cadrage n'a pas d'échéance : le 14 vient du proto seul.
- UPC : saisi à la déclaration de dépôt, ou « Modifier » dans le dossier après dépôt ?
- Smartlink : rester en Distribution, passer au Marketing (Activations), ou attendre la décision Odesli / maison.
- Ordre imposé Reçu → Accepté → Livré à la saisie : aide d'écran seulement (la base ne déduit rien, § 7 du ticket).
