# Inventaire — Marketing › Conception (proto ↔ app)

Zone : module Conception du proto (`docs/protos/src/mk.js` : `INTENTS`, `designItems`, `dirValue`,
`newFiche`, `fieldRow`, `subRow`, `ficheCard`, `seedRefs`, `designGroups`, `refTile`, `refAddForm`,
`transferredFiches`, `BODY` de0 / de1 / deR / de2 / deB / de3 lignes 821-884 — **les anciens `de1`…`de4`
de `BODY_MK` lignes 274-321 sont écrasés, ne pas s'y fier** ; gestes `mk-actions.js` lignes 1-15, 31-34,
62-92 ; moteur d'échange `prepGate` / `prepReveal` / `summaryBlock` lignes 1495-1935 ; scénarios
`marketing:designstart` et `marketing:design`, `mk-scen.js` lignes 26-40).
App : `app/(app)/app/projects/[projectId]/design/**`, `lib/design/**` (≈ 70 fichiers), `components/design/**`
(≈ 95 fichiers), migrations `20260927000601_design_stage`, `20261010000901_conception_entry`,
`20261010005001_conception_direction_sheets`, `20261011110001_design_intention_choices`,
`20261013100201_conception_exchanges`, `…100301_series_items`, `…100401_design_roles`,
`…100501_reference_types`, `…100601_proposal_retouches`, `…100701_design_requests`,
`…100801_conception_handoff`, `…100101_artist_identity`. Doc : `docs/ARCHITECTURE.md` § 8 decies (l. 3971-4504).

Ticket source : « TICKET — Workflow Conception complet » (Drive, dossier « Ticket Conception (dans
projet) », doc `1XkD6xyG6yCSPm1HBinmtbR3Co18rncUrQzkbGesTWwQ`), relu ce jour. Le proto suit le ticket
(MARKETING-METIER.md § Conception) sauf « fusionner / dissocier les intentions » (listé « Reste »).

Textes exacts du proto rejoués dans Chrome headless (parcours complet, rôles cp → da → dg → cp) :
`scratchpad/design-run/NN_*.txt|png`
(31 états : chemin direct, ajout de livrable, désignation, échange préparé / récap / créé / tenu,
intentions cp et da, références, rattachement, ajout, direction soumise / décidée, brief, fiches cp/da,
édition d'un champ, soumission en erreur, édition d'un élément de série). Script : `design-run/run.cjs`.

---

## 0. Le constat d'ensemble

**Les données et le SQL sont là à ~85 %. Le parcours et l'écran, non.** L'app a construit la Conception
lot après lot (C1 à C12, retours MKT-C2 du 12/10) en **pages à onglets** (`ConceptionTabs` : Accueil ·
Intentions · Références · Direction artistique · Fiches Livrables · Brief créatif), avec **son propre
parcours en 6 étapes** (`lib/design/journey.ts` : Préparer la sortie · Organiser l'échange créatif ·
Développer les livrables · Consolider le dossier · **Valider la conception** · Passer en Production) et
une « prochaine action » maison (`components/design/conception-journey.tsx`, `lib/design/journey-next.ts`).
Le proto, lui, est le **patron d'écran unique** (VISION-UX § 4) : « Maintenant » en haut, colonne
« Parcours · Conception » à gauche avec **6 étapes différentes** (Accueil · Intentions · Références ·
Direction artistique · Brief créatif · Fiches Livrables), étape ouverte à droite (Exécute / Coordonne /
Valide / Prérequis / Ensuite, faits sourcés, action, « Déjà fait »). Le patron générique existe déjà
(`components/shell/journey/*`, `lib/ui/journey.ts`, utilisé par Production et Juridique) mais **la
Conception ne l'utilise pas**.

Deuxième écart de fond : l'app a une **validation globale de l'étape Conception** (`ValidationPanel`
« Valider la conception », clôture `design_stage_closed`, `pass_to_production`, `reopen_design`) qui
n'existe ni dans le proto ni dans le ticket (le ticket : « La validation est configurable et
indépendante par fiche ; chaque fiche validée part en Production seule »). Dans le proto, la Conception
est faite quand **toutes les fiches sont transférées** (`doneMk("de3")`).

Troisième écart : l'app a beaucoup **en trop** par rapport au proto (délégations, matrice des droits,
auto-approbation, mode de validation, « Valider avec réserves », message + échéance de demande, page de
décision, propositions créatives versionnées, recherche de références semblables Unsplash/Tumblr,
identité artistique, rattacher un call existant, import de brief, fusion/dissociation, questions à choix
fermés, confirmation consolidée des intentions par le chef de projet). Une partie vient de tickets ou de
retours (à garder repliés), une partie complexifie (à masquer).

---

## 1. Écrans et étapes du proto, dans l'ordre

Rôles du proto (`holder()`) : **project** = Lina Haddad (cheffe de projet) ; **creative** = responsable
créatif désigné (Nadia Benali, directrice créative) ; **direction** = Claire Morel (DG, valide) ;
**creativeInt** = directrice créative interne. Patron commun à chaque étape : titre + pastille
(« En cours » / « Fait » / verrouillée), « pourquoi », bloc Exécute / Coordonne / Valide / Prérequis /
Ensuite, contenu, `waits()` (« En attente de X : … » avec avatar), puis « Signaler un blocage » /
« Noter une information ». Sous-titres du parcours (`summary`) : de0 « Commencé directement » ou
« Échange créatif du Ven. 09/10 » ; de1 « n intentions confirmées » ; deR « n références rattachées » ;
de2 « Direction validée » ; deB « Brief créatif V1 » ; de3 « n fiches transférées en Production ».
En cours : « À vous · Nom · action » ou « Nom · action » ; verrouillée : « Après : X ».

Déclencheur amont : **Stratégie validée** (`stdecide` → `onStrategyValidated()`) crée **une fiche par
livrable engagé** (`S.design.fiches = planItems().livs.map(newFiche)`), pré-remplie, statut Brouillon.

### 1.1 Accueil (`de0`) — exec : project ; valide : aucune ; prérequis : Stratégie › Validation du Brief de sortie ; ensuite : Intentions
Pourquoi : « Les livrables reçus de la Stratégie, le responsable créatif, et la façon de commencer :
préparer un échange créatif ou commencer directement. »
- **Faits** : Projet « Néons · Mona Lys · Single » ; Sortie « Sam. 05/12/2026 » ; Stratégie « Brief de
  sortie V1 validé le 07/10, 19:10 ».
- **Livrables reçus (3)** [bouton en-tête « Ajouter un livrable », cheffe de projet seule] : une ligne par
  fiche « Clip officiel · Fiche unique » / « Teasers, série de 4 · Fiche série · 4 éléments » /
  « Pochette · Fiche unique », source « Stratégie validée › Livrables engagés », pastille **Confirmé** ou
  **À qualifier**.
  - Formulaire en place (`addliv`) : « Livrable * » (placeholder « Ex. : Session acoustique »),
    « Format » (« Ex. : 16:9, 4 min »), « Provenance » (Ajout manuel / Décision d'un call), « Motif * »
    (« Pourquoi l'ajouter maintenant ») ; boutons « Ajouter » / « Annuler » ; erreurs « Nommez le
    livrable. », « Dites pourquoi il arrive maintenant. » ; effet : fiche créée « À qualifier » avec
    source « Ajout manuel par Lina Haddad : <motif> » ; toast « <nom> ajouté, à qualifier ».
- **Responsable créatif** : « Qui prépare la direction artistique * » (liste des membres, Nadia
  présélectionnée), « Suggestion : Nadia Benali, directrice créative du projet. Rien n'est affecté sans
  vous. », bouton « Désigner » (`crset`) → ligne « Responsable créatif · Nadia Benali · désigné par Lina
  Haddad » ; bandeau « Nadia Benali désignée responsable créative ». Autres rôles : « En attente de Lina
  Haddad : désigner le responsable créatif ».
- **Comment commencer** (cartes de choix) : « Préparer un échange créatif » + pastille **Recommandé** +
  « PO prépare l'objectif, les participants, les livrables et les sujets ; il propose ensuite les
  intentions, avec la phrase exacte. » ; « Commencer directement » + « PO montre ce qui est déjà connu et
  ne demande que ce qui manque. » ; note « Rien n'a encore été dit sur la direction artistique : un échange
  ira plus vite que des questions une à une. »
  - Direct (`depath direct`) : ligne « Commencé directement · Par Lina Haddad » ; étape faite.
  - Échange (`depath call`) → **moteur commun d'échange** (`prepGate("design")`) : « Départ · Préparer un
    échange créatif · choisi par Lina Haddad le 08/10, 09:18 [Changer] » ; « Nouvel échange » :
    Participants * en pastilles (Nadia Benali, Lina Haddad, Mona Lys « externe » ; « Externes : Mona Lys
    (invitation par e-mail). »), Date *, Heure *, Format (Visio / Sur place), **Ordre du jour** prérempli
    « 1. Direction de la sortie · 2. Intentions : Clip officiel · 3. Intentions : Teasers, série de 4 ·
    4. Intentions : Pochette · 5. Références » (modifiable, déplaçable, « Ajouter un point »),
    « Envoyé avec l'invitation » (Objectif « Fixer ce que la sortie et chaque livrable racontent, et à
    quoi ils ressemblent. », Livrables, Documents « Brief de sortie V1 · Fiches Livrables »), bouton
    « Voir le récapitulatif » → « Récapitulatif avant création » (Quand, Participants, Ordre du jour,
    Objectif, « Les invitations partent à la confirmation : Mona Lys est externe. ») → « Confirmer et
    inviter » / « Modifier » → « Échange prévu » (date, format, créé par, lien de la visio si Visio,
    participants, ordre du jour, « L'échange s'enregistre dans PDS OS. À la fin, PO propose ce qui a été
    dit, point par point, avec la phrase exacte. ») → simulation « Proto : l'échange a eu lieu, compte
    rendu reçu » → ligne « Échange créatif du Ven. 09/10/2026 · Compte rendu disponible : les intentions
    sont proposées dans l'étape suivante ».
  - Une fois les intentions tranchées : **Résumé pour les participants** (`summaryBlock("design")`) :
    message préparé par PO (« Ce que nous retenons : — Direction de la sortie : … » + « Prochaine étape :
    — Nadia Benali soumet la direction artistique à Claire Morel. »), destinataires en pastilles,
    « Envoyer aux participants », puis « Résumé envoyé aux participants · Envoyé · version n », « Corriger
    et renvoyer » (version 2, précédente gardée).
- Fait quand : responsable désigné **et** chemin choisi **et** (direct ou échange tenu).
- Maintenant : « Désigner le responsable créatif » → « Choisir comment commencer la Conception » →
  « Créer l'échange créatif ».

### 1.2 Intentions (`de1`) — exec : creative ; coordonne : project ; valide : aucune ; ensuite : Références
Pourquoi : « Ce que la sortie et chaque livrable doivent raconter. Chaque intention est confirmée avant la
direction artistique. »
- Faits : après un échange « Échange créatif · Ven. 09/10/2026 · Visio · 55 min » + « Compte rendu · Lire
  le compte rendu » (modale du compte rendu) ; en direct, ce que PDS OS sait : « Rôle des livrables »,
  « Publics » (Stratégie › Publics prioritaires), « Narratif » (Stratégie › Narratif de sortie), « Temps
  forts » (Annonce · Premier teaser · Sortie du titre · Sortie du clip, dates complètes).
- Encadré PO : échange → « PO a rangé les intentions dites pendant l'échange, avec la phrase exacte.
  Confirmez, corrigez ou écartez ; les livrables hériteront de la direction. » ; direct sans rien →
  « Voici ce que PDS OS sait déjà. Écrivez les intentions qui manquent, en commençant par la direction de
  la sortie. »
- **Une carte par groupe** : « Direction de la sortie » puis une par fiche ; pastille **À confirmer**
  (warn) / **Confirmé** / **À compléter** (direction vide) / **Hérite de la direction** (livrable vide) ;
  compteur « n à confirmer » ; bouton d'en-tête « Ajouter une intention » (formulaire : « Question » =
  liste fermée — direction : Concept central et message / Codes communs / Ton / Contraintes et lignes
  rouges ; livrable : Ce qu'il raconte / À quoi il ressemble / Ton et émotion / Incontournables et
  interdits — + « Intention * » + « Ajouter » / « Annuler »).
- Chaque proposition : question en surtitre, texte, « « citation exacte » · Échange créatif du 09/10 »,
  boutons **Confirmer / Modifier / Écarter** (Modifier → champ en place, retenue « Modifié par … », la
  citation reste). Note vide : « Rien n'a été dit sur ce livrable : il hérite de la direction de la
  sortie. »
- Modifiable seulement par le responsable créatif, tant que la direction n'est ni soumise ni validée.
- Fait quand : aucune « À confirmer » et au moins une confirmée. Maintenant : « Confirmer ou écarter n
  intentions » / « Écrire les intentions ». Bandeau final « Intentions confirmées ».

### 1.3 Références (`deR`) — exec : creative ; coordonne : project ; ensuite : Direction artistique
Pourquoi : « Moodboards et références, rattachés à un ou plusieurs livrables. Elles restent des
propositions jusqu'à la validation de la direction. »
- Note : « Une référence peut servir plusieurs livrables sans être importée deux fois. Pas de moodboard
  global imposé. »
- Une carte par groupe (Direction de la sortie, chaque livrable, puis **À rattacher** si non vide),
  pastille « n références » / « n à rattacher » ; bouton d'en-tête « Ajouter une référence » ; vide :
  « Aucune référence pour la direction de la sortie. » / « Aucune référence propre : ce livrable hérite de
  celles de la direction. »
- **Tuile** (`refTile`) : image, titre, pastille **Proposée / Validée**, « Sorte · Droits » (ex.
  « Moodboard · Licence libre »), notes, « Aussi pour : Clip officiel », crédit « Photo : … · CC BY 4.0 ·
  Wikimedia Commons » ou « Déposée par … » ; bouton « Rattacher à… » (ou « Rattacher ») → cases à cocher
  des groupes + « Enregistrer » / « Annuler » ; toast « Référence rattachée. » / « Référence remise dans
  « À rattacher ». ».
- **Ajout** (`refAddForm`, en place) : zone de dépôt « Glissez une image, un PDF ou une vidéo, ou
  choisissez-la » + vignette, « Titre * », « Ou un lien » (https), « Sorte » (Référence / Moodboard /
  Proposition créative / Version de travail), « Droits d'usage » (Licence libre / Usage interne / À
  vérifier, défaut À vérifier), « Rattacher à » (cases, groupe courant coché ; « Sans rattachement, elle va
  dans « À rattacher ». »), « Notes », « Ajouter la référence » / « Annuler » ; erreurs « Donnez un titre
  à la référence. », « Un lien qui commence par https:// ».
- Fait quand : au moins une référence et aucune à rattacher. Maintenant : « Rattacher n références » /
  « Ajouter des références ».

### 1.4 Direction artistique (`de2`) — exec : creative ; coordonne : project ; **valide : direction** ; ensuite : Brief créatif
Pourquoi : « Le concept, les codes, le ton et les lignes rouges, avec les références choisies, soumis à la
direction. »
- **Direction de la sortie** : les 4 champs (Concept central et message, Codes communs, Ton, Contraintes et
  lignes rouges), valeur = intention confirmée avec sa source (« Échange créatif du 09/10 « … » » ou
  « Modifié par … » ou « Saisi par … ») ; si rien : champ à écrire sur place « Rien n'a été dit : à
  écrire » (erreur « Écrivez ce point de la direction. ») ; lecture : « À écrire par Nadia Benali ».
- **Ce qui est soumis** : « Responsable : Nadia Benali · validation : Claire Morel » ; une ligne par
  section (Direction de la sortie, chaque livrable) : « n références · à préciser dans la fiche :
  Sous-titres », case **Soumettre** (direction cochée et grisée) ; après envoi pastille « Soumise ».
- Action responsable : « Soumettre à Claire Morel » (ou « Répondre et soumettre à nouveau ») ; bandeau
  « Direction soumise ».
- Décision (Claire) : « Votre décision », « Commentaire » (« Obligatoire pour demander des modifications
  ou refuser »), **Valider la direction / Demander des modifications / Refuser** ; erreur « Dites ce qui
  doit changer. ». Décision **globale** sur les sections soumises (pas une par section).
- Effets : validée → callout « Direction validée par Claire Morel le … Les références soumises sont
  validées ; les livrables en héritent. » + toutes les références des sections soumises passent
  « Validée » ; modifications/refus → callout « Claire Morel (demander des modifications) : « … » » en
  tête, champs à nouveau modifiables. Historique « Déjà fait » (« Soumise par … le … », « Validée par … »).
- Maintenant : « Soumettre la direction à Claire Morel » / « Valider la direction artistique » /
  « Répondre et soumettre à nouveau ».

### 1.5 Brief créatif (`deB`) — exec : creative ; coordonne : project ; ensuite : Fiches Livrables
Pourquoi : « Le cadre commun à tous les livrables, établi par le code depuis ce qui est validé. Il ne
remplace pas les fiches. »
- Encadré PO : « Le code assemble le Brief créatif depuis ce qui est validé : rien n'est écrit par l'IA.
  Relisez, puis établissez la V1. »
- Document « Brief créatif — V1 » en faits : Contexte · Objectifs créatifs (Stratégie › Positionnement) ·
  Publics et usages · Narratif · Principes (direction 1 et 2) · Ton · À éviter · Livrables · Références
  validées (« 6 · … ») · Points encore ouverts (« Clip officiel : Sous-titres » = champs requis vides des
  fiches).
- Bouton « Établir le Brief créatif V1 » (responsable créatif ou cheffe de projet) → callout « Brief
  créatif — V1 établi par Nadia Benali le … Sans budget. » + « Voir le PDF ».

### 1.6 Fiches Livrables (`de3`) — exec : creative ; coordonne : project ; **valide : direction** ; ensuite : —
Pourquoi : « Une fiche par livrable ou par série : chacune a son responsable, se complète, se valide et
part en Production seule. »
- **Une carte par fiche** (`ficheCard`), repliée une fois transférée : titre, pastille (Brouillon / En
  attente de validation / Modifications demandées / Refusée / **Validée · Prête pour Production** /
  **Transférée**), « Fiche unique » / « Fiche série · 4 éléments ».
- Ligne du haut : « Responsable : Nadia Benali · désigné par Lina Haddad » **ou** (cheffe de projet)
  « Responsable de la fiche * » (liste, responsable créatif présélectionné, « Suggestion : Nadia Benali,
  responsable créatif. Rien n'est affecté sans vous. », « Désigner ») **ou** « Responsable à désigner par
  Lina Haddad » ; à droite « Validation : Claire Morel · V1 ». « À qualifier · <source> » pour un ajout.
- **Champs**, chacun « Libellé * » + valeur en gras + source dessous, et **« Modifier » par champ** (seul
  le responsable de la fiche, en Brouillon ou Modifications demandées) ; non rempli : « À renseigner »
  (requis) / « Non renseigné ». Clip : Concept * (Intentions › Clip officiel) · Intention et ton
  (Direction artistique) · Durée cible * (Stratégie › Livrables engagés) · Ratios et formats * (Échange
  stratégique « … ») · Sous-titres * · Déclinaisons · Notes et contraintes · Tournage le (Brief de cadrage
  › Calendrier) · Début de postproduction le (« Calculé : le lundi qui suit le tournage ») · Fin de
  postproduction le (« Calculé : 8 jours avant la livraison ») · Livraison finale le * (« Avant l'échéance
  amont « Production terminée », Mer. 02/12/2026 ») · Montant prévisionnel (« 18 000 € HT · non engagé »,
  Brief de cadrage › Budget « 18 pour le clip ») · Dépendances · Points à préciser en Production. Teasers :
  Concept, Durée, Ratios, Sous-titres, Livraison (« Calculé : J-10 avant le premier teaser »), Montant
  (« Compris dans le clip »). Pochette : Concept, **Format** (« 3000 × 3000 px, JPG ou PNG »), Notes,
  Livraison (« J-10 avant l'annonce »), Montant (800 € HT), Points à préciser.
- **Édition d'un champ** (`fieldRow`) : éditeur selon le type (texte, zone longue, date, ratios en cases
  16:9 / 9:16 / 1:1 / 4:5, sous-titres en liste « Oui, intégrés aux exports / Oui, fichier séparé / Oui,
  intégrés et fichier séparé / Non », montant + « Non engagé / Engagé ») ; dessous « Proposé : <valeur> ·
  <source> » ; « Enregistrer » (Entrée) / « Annuler » ; contrôles du code : « Ce champ est obligatoire. »,
  « Les dates doivent se suivre : tournage, début de postproduction, fin de postproduction, livraison
  finale. », « La livraison doit précéder <échéance amont>. » ; après : « Modifié par Nadia Benali ».
- **Série** : « Éléments de la série » : « Teaser 1 · <statut de la fiche> », objectif en gras, « Publié le
  · Sam. 28/11/2026 », « Modifier » (objectif + date).
- Soumettre : « Soumettre à Claire Morel » (ou « Corriger et soumettre à nouveau ») + « Il manque :
  Sous-titres » ; erreur « Il manque : Sous-titres. ».
- Décision (Claire) : « Commentaire » (« Obligatoire pour demander des modifications ou refuser »),
  **Valider la fiche V1 / Demander des modifications / Refuser** ; erreurs « Dites ce qui doit changer. »,
  « Dites pourquoi vous refusez. ». Callout en tête après un retour, signé.
- Validée : cheffe de projet « **Transférer en Production** » (fiche par fiche) ; responsable « Modifier
  (nouvelle version) » → V2 en Brouillon (toast « V2 ouverte : elle devra être validée à nouveau. »).
  Transférée : « Transférée en Production par Lina Haddad le … · version V1 » + si V2 : « la V2 n'est pas
  encore transférée : la Production sera prévenue ». Historique par fiche.
- Effet du transfert : la Production de ce livrable apparaît (« Qui produit ? ») — `S.prods[key]`.
- Fait quand : toutes les fiches transférées. Maintenant (un acteur par fiche) : « Désigner le responsable
  de la fiche X » / « Compléter et soumettre la fiche X » / « Valider la fiche X » / « Corriger la fiche
  X » / « Transférer X en Production ».

---

## 2 et 3. Correspondance dans l'app et écart, étape par étape

### 2.0 Coquille du module
| Proto | App | Écart | Effort |
|---|---|---|---|
| Chevrons Marketing (Conception avec pastille « 1 » d'actions), fil d'Ariane « Néons › Marketing › Conception › <étape> » | Chevrons : `app/(app)/app/projects/[projectId]/layout.tsx` + `lib/ui/marketing-steps.ts` ; fil : `lib/ui/project-sections.ts projectTrail`, « Marketing / Conception / Travail direct » | DIFFÉRENT : pas de compteur d'actions sur le chevron, le fil n'a pas le nom de l'étape (zone coquille) | S |
| « Maintenant » + « Parcours · Conception » (6 étapes) + étape ouverte (Exécute / Coordonne / Valide / Prérequis / Ensuite) | `ConceptionTabs` (`components/design/conception-tabs.tsx`) + `ConceptionJourney` (`components/design/conception-journey.tsx`, 6 étapes **autres** : `lib/design/journey.ts` `JOURNEY_STEPS`) sur l'accueil seulement ; chaque onglet = page plein écran | **DIFFÉRENT (parcours et design)** : à refaire sur `NowCard` / `JourneySpine` / `StepPanel` avec un layout `design/layout.tsx` comme `production/[deliverableId]/layout.tsx`. Ordre des étapes à changer (Brief avant Fiches). Le `StepPanel` générique n'a pas de colonne « Coordonne » (à ajouter au patron commun, prop optionnelle). | **L** |
| « Qui fait quoi » (modale du projet : responsable créatif, validation) | `RightsMatrix` titré « Qui fait quoi » sur la page Direction (`fr.conceptionRoles.matrixTitle`) | DIFFÉRENT / EN TROP : collision de nom ; la matrice des droits n'est pas dans le proto | S (masquer) |
| « Signaler un blocage » / « Noter une information » en pied d'étape | aucun dans `components/design` | MANQUANT (brique transverse, autre zone) | — |

### 2.1 Accueil (`de0`)
| Proto | App | Écart | Effort |
|---|---|---|---|
| Faits Projet / Sortie / Stratégie (« Brief de sortie V1 validé le … ») | `ConceptionEntry` (`components/design/conception-entry.tsx`) : FactList Projet, Artiste, Sortie, Stratégie (pastille), Conception (pastille d'état `lib/design/states.ts`) | DIFFÉRENT (mots : pastille d'état au lieu de « Brief de sortie V1 validé le … » ; « Artiste » en plus, « Conception » en plus = déjà dans la pastille d'étape) | S |
| Stratégie non validée : (proto : étape verrouillée « Après : Validation du Brief de sortie », lisible) | `DesignNeedsStrategy` remplace toute la page | DIFFÉRENT : règle VISION-UX « étapes verrouillées visibles et lisibles » ; le ticket veut aussi « autoriser un brouillon de Conception » (pas fait, pas dans le proto) | S |
| Livrables reçus (n), lignes compactes « Nom · Fiche unique/série · n éléments », source, Confirmé / À qualifier | `ConceptionDeliverables` + `conception-deliverable-row.tsx` (« Conception par livrable », `<details>`, confirmés / « Besoins à qualifier », levier, échéance, responsable, prochaine étape `deliverableNext`) ; table `design_deliverables` (trigger depuis `strategy_deliverables`) | DIFFÉRENT : plus dense (échéances, responsable, prochaine étape, bouton retirer) ; le proto dit « Fiche unique / Fiche série · n éléments » parce que la fiche existe déjà | S |
| « Ajouter un livrable » en en-tête, formulaire en place : Livrable *, Format, Provenance (Ajout manuel / Décision d'un call), **Motif *** | `AddDeliverableDialog` (modale) : Livrable, « D'où vient-il ? » manual / strategy_decision (levier) / call (liste des calls), Note facultative ; `add_design_deliverable` (`20261010000901`) | DIFFÉRENT : pas de champ Format, motif facultatif (le ticket exige « source, auteur et motif ») ; modale au lieu d'en place (acceptable : modale verre). « Décision de Stratégie » en plus = demandé par le ticket → garder. Rendre la note obligatoire (`required`, `FieldError`) ; format → colonne. **Migration** : `design_deliverables.format text` (ou réutiliser `strategy_deliverables.format` qui existe déjà pour les engagés) + `note` not null pour les ajouts. | S |
| Un ajout crée sa fiche « À qualifier » tout de suite | Un besoin à qualifier n'a pas de fiche ni de geste pour devenir confirmé (`docs/ARCHITECTURE.md` « Décisions prises ici ») | MANQUANT (geste « Confirmer le livrable ») — le proto ne montre pas non plus ce geste, seulement la fiche « À qualifier » | S |
| **Responsable créatif** sur l'accueil : liste + suggestion + « Désigner », puis ligne « désigné par » | `ResponsiblePicker scope="direction"` (`components/design/people/responsible-picker.tsx`, `assign_design_responsible`) sur la page **Travail direct** et la page **Direction**, pas sur l'accueil | DIFFÉRENT (place) : le déplacer dans l'étape Accueil ; la donnée existe (`design_assignments`). Le proto en fait un **prérequis** de l'étape | S |
| « Comment commencer » : deux **cartes** de choix, « Recommandé » sur l'échange, phrase de raison | Deux boutons : `ConceptionCallSheet` (« Préparer l'échange créatif », panneau latéral) et `StartConceptionForm` (« Commencer sans échange », **modale qui exige une raison**, `start_design_without_exchange`) ; `fr.conception.entry.sources(n)` | DIFFÉRENT (mots, design, parcours) : le proto dit « Préparer un échange créatif » / « Commencer directement », sans raison demandée. La raison (`no_exchange_reason`, lot C4) n'est pas dans le proto → retirer l'obligation (garder la colonne nullable). Cartes « Recommandé » : extraire le bloc de `components/framing/intel/framing-entry.tsx` (l. 125-160) en composant commun (Cadrage, Stratégie, Conception). | S |
| Choix de l'échange → formulaire d'échange **dans l'étape** (participants en pastilles, date, heure, format, ordre du jour prérempli déplaçable, « Envoyé avec l'invitation »), récapitulatif, « Confirmer et inviter » | `ConceptionCallForm` (`components/design/conception-call-form.tsx`) dans `PrepareCallSheet` : `ParticipantsField`, `CallFields`, `CallFormatField`, `AgendaTopicsField`, `CallDeliverablesField`, `CallRecap` ; serveur `prepareDesignCall` / `create_design_call` (`lib/design/actions/call.ts`, `lib/design/call-prep.ts`, `use-design-call-agenda.ts`) ; ordre du jour calculé depuis les intentions manquantes + identité + points ouverts | DIFFÉRENT (design) : panneau latéral au lieu d'en place ; ordre du jour : le proto = « Direction de la sortie · Intentions : <chaque livrable> · Références » ; « livrables concernés » en plus (garder) ; « Changer » le départ avant création absent. Participants externes (artiste) : `call_attendees` refuse hors équipe (`attendee_not_in_team`) — à vérifier pour un contact Réseau. | M |
| « Échange prévu » (date, lien visio, participants, ordre du jour, « L'échange s'enregistre dans PDS OS… ») | `ConceptionExchanges` (`components/design/exchanges/conception-exchanges.tsx`, `lib/design/exchanges.ts`) : liste des échanges à venir / passés, portée, décisions / questions / actions du compte rendu, idées de PO | DIFFÉRENT : liste séparée au lieu de l'état de l'étape ; garder le contenu, le ranger dans l'étape | S |
| Résumé pour les participants (PO prépare, CP corrige, « Envoyer aux participants », versions) | Brique commune `components/calls/closure/share-report-form.tsx` (page du call) | À VÉRIFIER / DIFFÉRENT : présent sur la page du call, pas dans l'étape Accueil ; à afficher dans l'étape une fois les intentions tranchées | S |
| — | « Rattacher un call existant » (`AttachCallButton`, `attachDesignCall`) | EN TROP (lot C4, pas dans le proto) : complexifie l'accueil → replier ou retirer | S |
| — | `ConceptionIdentityCard` (identité artistique, lot C3, `artist_identity_versions`) | EN TROP vs proto (demandé par le retour MKT-C2-04) : à arbitrer ; si gardé, en fait sourcé repliable dans Intentions, pas une carte d'accueil | S |
| — | `ConceptionDirectionCard`, « Ce qui bloque », prochaine action maison (`journey-next.ts`) | EN TROP une fois le patron commun en place (« Maintenant » le remplace) | (dans L) |
| — | `ConceptionValidationSection` / `ValidationPanel` « Valider la conception » (accueil et page Brief), `ConceptionClosureSection`, `HandoffPlanForm` (`pass_to_production`), `ReopenDesignForm` (`reopen_design`) | **EN TROP** : ni proto ni ticket. Complexifie fortement. Le retirer suppose de redéfinir « Conception faite » (toutes les fiches transférées) dans `lib/workflow-status/rules.ts` (`MARKETING_STAGES` lit l'étape `design` validée) et de ne plus exiger l'étape Production démarrée (voir 2.6) | M |
| — | « Dépôt créatif avant la Conception » (`EarlyDepositLink`) | EN TROP léger (test UX 09/10) ; sans gêne si la Conception verrouillée reste lisible | — |

### 2.2 Intentions (`de1`)
| Proto | App | Écart | Effort |
|---|---|---|---|
| **Une page avec toutes les cibles** : carte « Direction de la sortie » puis une par livrable, état « À confirmer / Confirmé / À compléter / Hérite de la direction », « n à confirmer » | `/design/work?d=<cible>&q=<sujet>` (`work/page.tsx`) : **une cible à la fois** via pastilles `WorkTargets` + `TargetBadges` ; `KnownFacts`, `TargetProposals` / `UnassignedProposals`, `IntentionQuestions` (4 questions en accordéon `AccordionSteps`, **choix fermés en cartes + « Autre »**, dictée), `ConsolidationPanel`, références de la cible, `TargetVersions` | **DIFFÉRENT (parcours et design)** : le proto range tout sur une page, par groupe ; l'app fait naviguer cible par cible et répondre à un questionnaire. Mêmes sujets (`fr.conception.topics` / `directionTopics` = mots du proto), même héritage (lot C5). | M |
| Proposition : sujet, texte, citation + source, **Confirmer / Modifier / Écarter** | `ProposalCard` (`components/design/work/proposal-card.tsx`) : « Confirmer », « Modifier », « Écarter », « Confirmer ainsi », signaux « Diffère de la réponse déjà posée » ; `review_design_intention` ; citations vérifiées `lib/design/propose.ts` (`locateQuote`) | OK (mots identiques) ; à afficher dans la carte du groupe | — |
| « Ajouter une intention » en **en-tête du groupe** : Question (liste) + Intention * | `IntentionQuestions` / `IntentionComposer` / `IntentionChoices` (`save_design_intention`, `design_intentions.choices`) | DIFFÉRENT : le proto n'a ni accordéon de questions ni cartes de choix (`lib/design/intention-choices.ts`, retour de Sacha du 11/10) → **à arbitrer** : le proto fait foi (« tickets avant le code ») → remplacer par le petit formulaire Question + Intention ; garder la dictée si voulue | S |
| Fait quand : plus rien à confirmer, ≥ 1 confirmée ; confirmé par le **responsable créatif** au fil de l'eau | `ConsolidationPanel` + `ConfirmIntentionsButton` : le **chef de projet confirme l'ensemble d'une cible** (`confirm_design_intentions`, instantané `design_intent_confirmations`), sinon « Intentions pas encore confirmées par le chef de projet » ; états Brouillon → À confirmer → Confirmées → À réviser | **EN TROP** (étape de plus, autre personne) : dériver « Confirmé » des statuts des intentions (`states.ts`), ne plus exiger l'instantané (aucune fonction SQL ne l'exige : seul l'affichage / `directionSummary` le lit). Garder la table pour l'historique « À réviser ». | S |
| — | Fusionner / dissocier (`MergeDialog`, `SplitDialog`, `merge_design_intentions`, `split_design_intention`) | EN TROP vs proto mais **demandé par le ticket § 4** (listé « Reste » du proto) : garder en action secondaire (menu « ⋯ » de la proposition) | — |
| — | `ImportBriefDialog` (brief collé → propositions, `design_sources` kind `import`) | EN TROP vs proto, **demandé par le ticket § 3** : garder en action secondaire du chemin direct | — |
| Faits du chemin direct : Rôle des livrables, Publics, Narratif, Temps forts (dates) | `KnownFacts` (`components/design/work/known-facts.tsx`, `data.known`) : rôle, timing et échéances amont, public, narratif, contraintes du Cadrage, dépendances | OK sur le fond ; DIFFÉRENT de forme (à mettre en `FactList` sourcée en tête de l'étape) | S |
| Lien « Lire le compte rendu » (modale) | Sources (`design_sources`) + page du call | DIFFÉRENT (modale du compte rendu commune, autre zone) | S |

### 2.3 Références (`deR`)
| Proto | App | Écart | Effort |
|---|---|---|---|
| Groupes Direction / livrables / « À rattacher », compteur, « Ajouter une référence » en en-tête de chaque groupe | `references/page.tsx` : `ReferenceSection` par cible + « À rattacher » (en tête), `ReferenceTypesGuide`, **un seul** `AddReferencesDialog` en haut de page | DIFFÉRENT (design) : bouton par groupe pré-réglé sur la cible (le dialogue accepte `initialTargets`), « À rattacher » en dernier comme le proto | S |
| Tuile : image, titre, Proposée / Validée, « Sorte · Droits », notes, « Aussi pour : … », crédit, « Rattacher à… » (cases en place) | `ReferenceCard` (`components/design/references/reference-card.tsx`), `ReferenceThumbnail`, `ReferenceActions`, `ReferenceEditDialogs`, `TargetPicker` ; `design_references` + `design_reference_links` (un fichier, plusieurs liens ; dédoublonnage sha256 / URL) ; statut `lib/design/reference-status.ts` | OK sur le fond ; DIFFÉRENT de forme (modales au lieu d'en place, à vérifier « Aussi pour ») | S |
| Ajout : dépôt (image / PDF / vidéo) ou lien, Titre *, Sorte (Référence / Moodboard / **Proposition créative / Version de travail**), Droits (Licence libre / Usage interne / À vérifier), Rattacher à, Notes | `AddReferencesDialog` + `ReferenceKindFields` : types `reference` / `moodboard` (+ `to_qualify`), usages `inspiration / free / licensed / to_license / owned`, moodboard d'appartenance ; bucket `design-references` 50 Mo | DIFFÉRENT (listes) : le proto propose 4 sortes et 3 droits ; l'app 2 types (la proposition créative = `design_versions`, la version de travail = Production, lot C8) et 5 usages. À aligner sur les mots du proto **ou** garder la taxonomie C8 (retour d'Ibé MKT-C2-09) : à arbitrer. Si alignement : **migration** check `design_references_type_check` (+ `proposal`, `work_version`) et `usage` (`free`, `internal`, `to_check`). | S |
| Validée quand la direction qui la contient est validée | Idem (« une référence reste une proposition tant qu'aucune section approuvée ne la contient ») | OK | — |
| — | « Chercher des références semblables » (`SimilarReferencesDialog`, Unsplash + Tumblr, `lib/design/similar-*.ts`, `reference-similar.ts`) | EN TROP vs proto, **demandé par Sacha (11/10)** : garder en action secondaire de l'en-tête | — |
| — | Propositions créatives versionnées dans la Conception (`TargetVersions`, `DesignTrack`, `DepositVersion`, `VersionItem`, `review_design_version`, `/design/versions/[versionId]`, tâches de retouche) | **EN TROP** vs proto (pour lui une proposition créative est une sorte de référence) ; **risque** : `design_versions` est lu par la Production existante (« dont dépend la Production ») — masquer dans la Conception sans supprimer la table | M |

### 2.4 Direction artistique (`de2`)
| Proto | App | Écart | Effort |
|---|---|---|---|
| 4 champs de la direction, valeur = intention confirmée + source, sinon **écrite sur place** | `DirectionSubmitForm` + `SummarySectionCard` + `SectionContent` (`components/design/direction/*`, `lib/design/direction-summary.ts`) : « Synthèse avant envoi » par section (intentions retenues, références, note, « À compléter ») | DIFFÉRENT : l'app renvoie au Travail direct pour écrire ; le proto écrit le point manquant dans l'étape (`dirManual` → en app : `save_design_intention` target direction, confirmé) | S |
| « Ce qui est soumis » : sections cochées (direction obligatoire), « n références · à préciser dans la fiche : … » | Cases « Soumettre « … » » dans la synthèse ; manques : sujets sans réponse, propositions, non confirmé, sans référence, à qualifier | DIFFÉRENT (mots ; le proto cite les champs requis vides des fiches) | S |
| Responsable et validateur **montrés** (« Responsable : Nadia Benali · validation : Claire Morel »), validateur = la direction du projet | Section « Responsable et validation » : `ResponsiblePicker`, **`ValidatorsPicker`** (`set_design_validators`, soumission bloquée sans validateur), **`ValidationModeField`** (global / par section, défaut `per_section`), **`DelegationsPanel`**, **`SelfApprovalSwitch`** ; `RightsMatrix` repliée | **EN TROP** (4 réglages) : le proto n'a aucun réglage. Valideur par défaut = la direction du projet (DG) ; mode global. **Migration** : `alter table design_workspaces alter column validation_mode set default 'global'` + mise à jour des espaces existants ; validateur par défaut posé par `start_design` (insert `design_validators` = membre avec `validate`, ou code à l'ouverture). Délégations / auto-approbation : masquer (« après MVP » selon le ticket). | M |
| « Soumettre à Claire Morel » (un clic) | `RequestReviewDialog` : objet, version, sections, qui décide, **message**, **décision attendue pour le**, conséquences, « Envoyer à … » ; `submit_design_direction` | DIFFÉRENT : plus lourd. Garder la modale de confirmation sans message ni échéance (facultatifs repliés) | S |
| Décision : Valider la direction / Demander des modifications / Refuser, commentaire obligatoire hors validation, **globale** | `VersionCard` + `DecisionControls` (`components/design/direction/*`) : par section ou global, **« Valider avec réserves… »**, délégué ; page `/design/decisions/[submissionId]` ; retrait (`withdraw_design_submission`) ; `submission_outdated` | DIFFÉRENT : réserves EN TROP (pas au proto ni au ticket pour la Conception) ; décision par section EN TROP si mode global ; la décision doit se prendre **dans l'étape** (la page de décision peut rediriger vers l'étape) | S |
| Callout validé / retour signé en tête ; historique « Déjà fait » | Versions soumises (`direction.submissions`), `DecisionLine` | OK sur le fond, forme à reprendre dans `StepPanel` | S |

### 2.5 Brief créatif (`deB`)
| Proto | App | Écart | Effort |
|---|---|---|---|
| Encadré PO « Le code assemble… », document en faits (10 rubriques), « Établir le Brief créatif V1 », callout « … établi par … Sans budget. », « Voir le PDF » | `brief/page.tsx` : `BriefChecksList` (bloquant / réserve / exclu), `CreateBriefButton` (« Créer la V1 », chef de projet ou responsable de la direction), versions en pastilles, `BriefDocumentCard` (statut calculé, ce qui a changé, PDF `GET /api/projects/[id]/creative-briefs/[n]`), `CreativeBriefView` (parties `lib/design/brief*.ts`) ; table `design_briefs` | OK sur le fond (plus riche : identité, concepts des livrables, sources, décisions). DIFFÉRENT : mots (« Établir le Brief créatif V1 »), et **`ValidationPanel` « Valider la conception » sur cette page = EN TROP** | S |
| Place : **avant** les Fiches Livrables | Onglet **après** les Fiches ; son parcours met « Consolider le dossier » après « Développer les livrables » | DIFFÉRENT (ordre du parcours). Le brief du proto liste « Points encore ouverts » = champs vides des fiches : il peut être établi avant que les fiches soient complètes (l'app le permet aussi, avec réserves) | (dans L) |

### 2.6 Fiches Livrables (`de3`)
| Proto | App | Écart | Effort |
|---|---|---|---|
| Fiches **créées automatiquement** à la validation de la Stratégie, une par livrable engagé, série d'après la quantité | `sheets/page.tsx` + `SheetsTable` + `CreateSheetButton` : le **chef de projet crée chaque fiche** (« Créer la fiche », unique ou série + nombre) ; `createDesignSheet` (`lib/design/actions/sheets.ts`) | DIFFÉRENT (geste en trop) : créer les fiches à l'ouverture de la Conception (`start_design` ou trigger sur `design_deliverables` confirmé), série si `strategy_deliverables.quantity > 1`. **Migration** : fonction / trigger de création + reprise des projets existants (ne créer que si absente : `design_sheets.design_deliverable_id unique`). | M |
| **Toutes les fiches sur une page** (cartes dépliables), chacune avec sa ligne responsable / validation | Liste (`SheetsTable`) puis **une page par fiche** `/design/sheets/[sheetId]` à deux colonnes (intentions, formulaire, série, références | personnes, contrôles, demande, historique) | DIFFÉRENT (design) : cartes dans l'étape ; la page par fiche peut rester comme ancre / lien profond | M |
| Responsable de la fiche désigné par la CP (suggestion = responsable créatif) ; validation = direction, montrée | `ResponsiblePicker scope="sheet"`, `ValidatorsPicker` par fiche, `DelegationsPanel` | DIFFÉRENT : validateurs et délégations EN TROP (valideur par défaut = direction, voir 2.4) | S |
| **« Modifier » champ par champ** sur des valeurs pré-remplies **avec leur source en toutes lettres** ; « Proposé : … · source » sous l'éditeur ; « Modifié par … » ; contrôles bloquants à l'enregistrement (ordre des dates, échéance amont) | `SheetForm` (`components/design/sheets/sheet-form.tsx`) : **un seul formulaire** pour toute la fiche + « Enregistrer » ; `SourcedField` + `ProvenanceTag` (source = type seulement : stratégie / intention / call / manuel / fichier / suggestion) ; `SheetCreativeFields`, `SheetFormatFields`, `SheetPlanFields` ; suggestions de PO (`sheet-suggest.ts`) ; contrôles calculés à part (`lib/design/sheet-checks.ts`, `SheetChecksPanel`) non bloquants à l'enregistrement | **DIFFÉRENT (règles VISION-UX 1, 2 et 4)** : passer à la ligne « valeur + source + Modifier » avec éditeur en place (`fieldRow`) ; la provenance doit porter le **détail** (`provenance.<champ>.detail` existe déjà : « Échange stratégique « … » », « Calculé : … ») ; refuser à l'enregistrement une date hors ordre ou après l'échéance amont (code serveur dans `toSheetPatch`, pas de migration) | M |
| **Pré-remplissage riche** : Concept ← intention « Ce qu'il raconte » du livrable ; Intention et ton ← direction ; Durée, Ratios ← Stratégie (format) ou citation d'échange ; Sous-titres ← échange créatif ; Tournage ← Brief de cadrage › Calendrier ; post-production **calculée** (lundi après le tournage ; 8 jours avant la livraison) ; Livraison ← échéance amont (« Production terminée ») ou J-10 avant le temps fort ; Montant ← Brief de cadrage › Budget (citation) ; Points à préciser ← Brief créatif | `createDesignSheet` ne remplit que **titre, intention (texte agrégé), livraison (échéance de la Stratégie)** | **MANQUANT** (pré-remplissage) : le reste est vide. Tout est du **code** (règle 6), sources disponibles : `strategy_deliverables.format / quantity / due_date / production_lead_days`, Cadrage (calendrier, budget), intentions confirmées. Pas de migration (colonnes et `provenance` jsonb existent). | M |
| Champs par type de livrable (clip : 14 ; teasers : 6 ; pochette : 6 dont **Format**) | Tous les champs pour tous (`SHEET_FIELDS`), `title` éditable, `notes` et `constraints` séparés, durée min / max, sous-titres = booléen + ratios + mode (`burned / file / both`) | DIFFÉRENT : masquer selon le format (`lib/design/formats.ts` le sait déjà), fusionner « Notes et contraintes » à l'affichage, libellés du proto. **MANQUANT : « Format » (pochette : « 3000 × 3000 px, JPG ou PNG »)** → **migration** `design_sheets.file_format text` (ou réutiliser `variants`) | S |
| Sous-titres : 4 choix (« Oui, intégrés aux exports / Oui, fichier séparé / Oui, intégrés et fichier séparé / Non ») | `subtitles boolean` + `subtitle_mode` + `subtitle_ratios` | OK sur le fond (même information) ; libellés à aligner | S |
| Montant « 18 000 € HT · non engagé » | `budget_cents` + `budget_state` | OK | — |
| Série : éléments « Teaser n · statut », objectif, **« Publié le · date »**, Modifier (objectif + date) ; statut = celui de la fiche | `SheetItems` / `SheetItemForm` : titre, objectif, **date de livraison**, notes, **responsable, concept, lien de référence**, décision par élément ; `SeriesTracking` (en bloc / contenu par contenu) | DIFFÉRENT : le proto = suivi en bloc, date de **publication** ; l'app = date de livraison + par contenu (demandé par le ticket § 9 et le retour MKT-C2-07). À arbitrer ; au minimum, libellé de la date et « en bloc » par défaut. Si « Publié le » est voulu : **migration** `design_sheet_items.publish_date date` (la date de publication relève aussi des Activations) | S |
| « Soumettre à Claire Morel » + « Il manque : … » à côté | `SubmitSheetButton` + `RequestReviewDialog` (message, échéance) ; `submit_design_sheet` | DIFFÉRENT (comme 2.4) | S |
| Décision : Valider la fiche Vn / Demander des modifications / Refuser | `SheetReview` + `SheetVersionCard` + `DecisionControls` (réserves, par section pour une série) ; `decide_design_submission` | DIFFÉRENT : réserves EN TROP | S |
| « Modifier (nouvelle version) » après validation | Fiche éditable dès qu'aucune demande n'attend ; callout `t.newVersion(n)` | DIFFÉRENT (geste explicite à ajouter, S) | S |
| **« Transférer en Production »** fiche par fiche (CP), « Transférée … · version V1 », V2 non transférée signalée, Production prévenue | `HandoffButton` dans `SheetReview` (`handoff_design_sheet`, `design_handoffs`) ; `t.handoff.newer` ; `pass_to_production` global en plus | OK pour le geste ; **MANQUANT** : prévenir la Production d'une nouvelle version (ticket : « avertir Production ») ; **DIFFÉRENT** : en app, la Production d'un livrable n'est utilisable que si l'**étape Production** est démarrée (`production/page.tsx` `ValidationPanel`, `startBlocked` quand la Conception est validée) → faire démarrer l'étape Production par le premier transfert. **Migration** : `handoff_design_sheet` démarre l'étape `production` si besoin (comme `pass_to_production`) + notification `design_sheet_new_version` (kind dans `notifications_kind_check`). | S |
| Fait quand toutes les fiches sont transférées | Conception faite = étape `design` validée (`lib/workflow-status/rules.ts`) | DIFFÉRENT : à recalculer (voir 2.1) | S |
| — | `SheetChecksPanel` (bloquants / à vérifier / reportés en Production) | OK sur le fond (le proto le dit par « Il manque » et « Points à préciser en Production ») ; à fondre dans la carte | S |
| — | `SheetHistory` (`design_events`) | OK (= historique de fiche du proto) | — |

---

## 4. Briques communes utilisées par la zone

| Brique | Dans l'app | Pour la Conception |
|---|---|---|
| Patron « Maintenant » / parcours / étape ouverte | `components/shell/journey/{now-card,journey-spine,step-panel}.tsx`, `lib/ui/journey.ts` (`JourneyStep`, `nowOf`) ; utilisé par `production/[deliverableId]/layout.tsx` et `components/legal/legal-step-frame.tsx` | **Pas utilisé.** À brancher ; ajouter « Coordonne » (`coordinator`) à `JourneyStep` / `StepPanel` (proto : 5 colonnes) |
| Chevrons Marketing | `layout.tsx` + `lib/ui/marketing-steps.ts` | OK ; compteur d'actions à ajouter (coquille) |
| Fil d'Ariane | `lib/ui/project-sections.ts projectTrail` | Ajouter le nom de l'étape |
| Formulaire de call commun | `components/calls/{prepare-call-sheet,participants-field,call-fields,call-format-field,agenda-topics-field,agenda-editor,call-recap}.tsx`, `lib/calls/prepare.ts` | Utilisé (`ConceptionCallForm`) ; à rendre en place dans l'étape |
| Compte rendu / extraction | `app/api/calls/[callId]/extract`, `components/calls/{call-results,call-outcomes,call-processing}.tsx`, `fillDesignFromCall` (`lib/design/import-call.ts`) | Utilisé |
| Résumé aux participants | `components/calls/closure/share-report-form.tsx` | Sur la page du call ; à montrer dans l'Accueil |
| Proposition Confirmer / Modifier / Écarter | `components/design/work/proposal-card.tsx` (Conception) ; la Stratégie a les siens (`components/strategy/suggestion-list.tsx`, `propose-choices.tsx`) | Deux implémentations → un composant commun `ProposalRow` (règle « deux fois = un composant ») |
| Cartes de choix « Recommandé » | En dur dans `components/framing/intel/framing-entry.tsx` (l. 125-160) ; `components/ui/choice-cards.tsx` (sans pastille) | Extraire `WayChoice` / variante `recommended` de `ChoiceCards` |
| Cartes de versions | `components/design/direction/version-card.tsx`, `components/design/sheets/sheet-version-card.tsx` | Deux cartes proches → une |
| Décision avec motif | `components/design/direction/decision-controls.tsx`, `components/ui/reason-form.tsx`, `ConfirmDialog` / `FormDialog` (modale verre) | OK ; retirer « avec réserves » côté Conception |
| Désignation d'une personne | `components/design/people/responsible-picker.tsx` (membres + suggestions) | OK (membres seulement, conforme : un compte agit) |
| Pages privées triées | — | Sans objet dans la Conception (aucun externe n'agit ; l'artiste invitée à l'échange reçoit une invitation et le résumé) |
| « Déjà fait » / historique | `design_events` + `SheetHistory` ; Activité du projet | À porter en bas de chaque étape |

---

## 5. Simulations du proto et vrai événement

| Simulation (bouton pointillé) | Événement réel dans l'app |
|---|---|
| « Proto : l'échange a eu lieu, compte rendu reçu » (`prepheld`) → intentions proposées avec citation, références d'exemple semées | Échange créatif enregistré dans PDS OS (`call_recording_takes` / `_pieces`, enregistreur), transcription (`lib/ai/transcribe.ts`, Groq), compte rendu (`app/api/calls/[callId]/extract`), puis `fillDesignFromCall` : source `design_sources` + propositions `design_intentions` `proposed` avec citation vérifiée (`lib/design/propose.ts`). Existe. |
| Invitation de Mona Lys « par e-mail » à la création de l'échange | Invitation calendrier / e-mail : dépend du branchement Google Workspace (Meet OAuth + SMTP, CLAUDE.md « Décisions en attente »). `call_attendees` n'accepte que l'équipe : un contact Réseau externe est à vérifier. |
| « Envoyer aux participants » (résumé) | `share-report-form.tsx` : envoi dans l'app à l'équipe ; e-mail à l'externe = même dépendance SMTP. |
| Références d'exemple (photos Wikimedia, « Déposée depuis le téléphone ») | Vrai dépôt dans le bucket privé `design-references` (`upload-reference.ts`, `reference-files.ts`) ou lien https. Existe. |
| « Voir le PDF » du Brief créatif | `GET /api/projects/[id]/creative-briefs/[n]` (`lib/pdf/render.ts`). Existe. |
| Transfert → « Qui produit ? » apparaît | `handoff_design_sheet` + Production qui lit `design_handoffs` (`lib/production/fiche.ts`, `conception-links.ts`) ; manque le démarrage automatique de l'étape Production. |

---

## 6. Découpage proposé en sous-lots (ordonnés, chacun livrable et testable seul)

**C-1. Parcours commun de la Conception (L, ~3 j, sans migration).** `lib/design/journey.ts` réécrit sur
`lib/ui/journey.ts` : 6 étapes du proto (`home`, `intentions`, `references`, `direction`, `brief`,
`sheets`) avec exec / coord / valide / prérequis / ensuite / résumé / acteur, calculées depuis les faits
déjà chargés (`loadConception`, `loadDirection`, `loadSheetSummaries`, briefs). Layout
`design/layout.tsx` (comme Production) avec `NowCard` + `JourneySpine` + `StepPanel` ; chaque onglet
devient une étape (routes gardées : `/design` = Accueil, `/design/work` = Intentions…, ordre Brief avant
Fiches). Supprimer `ConceptionTabs`, `ConceptionJourney`, `ConceptionDirectionCard`, « Ce qui bloque »,
`journey-next.ts` (garder ses libellés utiles). Ajouter « Coordonne » au patron commun (prop
optionnelle, Production / Juridique inchangés). Mettre à jour Travail / Validations (« Ma conception »,
« Mes décisions de conception ») pour lire les acteurs du parcours. *Risque* : notifications et liens
profonds (`/design/decisions/[id]`, `/design/versions/[id]`, ancres `#deliverable-<id>`) → rediriger vers
l'étape.

**C-2. Accueil conforme (S–M, migration légère).** Responsable créatif désigné dans l'étape ; deux cartes
« Recommandé » (composant commun extrait du Cadrage) ; « Commencer directement » sans raison obligatoire ;
formulaire d'échange **dans l'étape** (même `ConceptionCallForm`), ordre du jour du proto, « Changer » le
départ ; états « Échange prévu » / « Échange du … » ; résumé aux participants dans l'étape ; « Ajouter un
livrable » avec Format et Motif obligatoire. Migration : `design_deliverables.format`, note obligatoire
pour un ajout (check `origin <> 'strategy' → note non vide`). Masquer « Rattacher un call existant »,
l'identité (à arbitrer), la validation globale. *Risque* : les projets déjà commencés sans échange gardent
leur raison (colonne gardée).

**C-3. Intentions sur une page (M, sans migration).** Cartes par groupe (direction puis livrables) avec
`ProposalCard` mutualisé, « n à confirmer », « Ajouter une intention » (Question + Intention) en en-tête,
héritage dit ; faits connus en tête ; confirmation au fil de l'eau par le responsable créatif, plus de
« Confirmer l'ensemble » par le chef de projet (états dérivés). Fusion / dissociation et import de brief en
actions secondaires. *Risque* : `directionSummary` et `states.ts` lisent `design_intent_confirmations` →
adapter, ne pas supprimer la table.

**C-4. Références par groupe (S, migration facultative).** Bouton d'ajout par groupe, « À rattacher » en
dernier, rattachement en place, sortes et droits du proto (si arbitré : migration des checks `type` /
`usage` + reprise des valeurs). Semblables en action secondaire. Propositions créatives
(`TargetVersions`) masquées dans la Conception (table gardée pour la Production).

**C-5. Direction artistique simplifiée (M, migration).** Points manquants écrits dans l'étape ; « Ce qui est
soumis » ; responsable et valideur montrés, pas réglés ; décision globale Valider / Demander des
modifications / Refuser dans l'étape ; masquer mode, délégations, auto-approbation, matrice, réserves,
message / échéance (repliés). Migration : défaut `validation_mode = 'global'` (+ update), valideur par
défaut = direction du projet posé à l'ouverture (`start_design`). *Risque* : tests pgTAP
`conception-roles`, `conception-requests`, `conception-piegee` (par section) à adapter.

**C-6. Brief créatif (S, sans migration).** Mots du proto, place avant les fiches, retirer le
`ValidationPanel` de la page.

**C-7. Fiches créées et pré-remplies (M, migration).** Création automatique d'une fiche par livrable
confirmé (série d'après la quantité) à l'ouverture de la Conception ; pré-remplissage par le code de tous
les champs disponibles avec `provenance.detail` en toutes lettres (citations, « Calculé : … ») ; champs
selon le format ; champ « Format » (migration `design_sheets.file_format`). *Risque* : projets existants
(reprise idempotente), fiches déjà créées à la main inchangées.

**C-8. Fiches champ par champ, toutes sur l'étape (M, sans migration).** Carte par fiche : ligne
responsable / validation, champs « valeur + source + Modifier » avec éditeur en place et « Proposé : … »,
contrôles bloquants à l'enregistrement (ordre des dates, échéance amont), série en bloc avec « Publié
le » (si arbitré : migration `design_sheet_items.publish_date`), « Soumettre à … » + « Il manque », décision
à trois issues, « Modifier (nouvelle version) », « Transférer en Production ». La page `/design/sheets/[id]`
devient l'ancre de la carte.

**C-9. Transfert sans clôture globale (S–M, migration).** `handoff_design_sheet` démarre l'étape Production
si besoin et notifie la Production d'une nouvelle version non transférée ; « Conception faite » = toutes
les fiches des livrables confirmés transférées (`lib/workflow-status/rules.ts`, chevron Conception) ;
masquer `ConceptionValidationSection`, `ConceptionClosureSection`, `HandoffPlanForm`, `ReopenDesignForm`
(fonctions SQL gardées). *Risque* : la Production lit `isStageValidated(..., "design")` (`startBlocked`) et
`pass_to_production` crée des tâches de réserve — vérifier qu'aucun projet en cours n'est bloqué ;
`supabase/tests/conception-handoff.test.sql` à adapter.

Migrations à prévoir, au total : `design_deliverables.format` + contrainte de motif (C-2) ; checks
`design_references.type/usage` si alignés (C-4) ; défaut `validation_mode` + valideur par défaut dans
`start_design` (C-5) ; création automatique des fiches (C-7) ; `design_sheets.file_format` (C-7) ;
`design_sheet_items.publish_date` si arbitré (C-8) ; `handoff_design_sheet` (démarrage Production) +
notification `design_sheet_new_version` (C-9). Aucune table à supprimer.

**Effort total estimé : 13 à 17 jours** (C-1 L ~3 j ; C-2 1,5 j ; C-3 1,5 j ; C-4 1 j ; C-5 2 j ; C-6 0,5 j ;
C-7 2 j ; C-8 2 j ; C-9 1,5 j), plus l'adaptation des tests pgTAP de la Conception (9 fichiers) et de
`docs/ARCHITECTURE.md` § 8 decies.

Points à arbitrer avec Sacha (le proto fait foi pour le parcours, mais ces éléments viennent de retours) :
questions à choix fermés (11/10) ; identité artistique (MKT-C2-04) ; série « par contenu » et responsable
par élément (ticket § 9, MKT-C2-07) ; taxonomie des références (MKT-C2-09) ; propositions créatives
versionnées (MKT-C2-10) ; validation globale du dossier et réouverture (MKT-C2-13) ; « Valider avec
réserves » (MKT-C2-11).

---

## 7. Décisions prises au lot 4 (19/10/2026)

- **Questions à choix fermés (11/10)** : retirées de l'écran ; « Ajouter une intention » = Question
  (liste fermée) + Intention, comme le proto. `design_intentions.choices` gardée.
- **Identité artistique (MKT-C2-04)** : hors écran de la Conception (le proto ne l'a pas) ; tables et
  liens gardés, le Brief créatif la lit toujours.
- **Série par contenu (ticket § 9, MKT-C2-07)** : la série se décide en bloc (proto) ; les éléments
  gardent objectif et « Publié le » (`publish_date`, proposé depuis les jalons). Une version déjà
  envoyée par contenu est décidée d'un coup sur chaque contenu.
- **Taxonomie des références (MKT-C2-09)** : mots du proto (4 sortes, 3 droits, « À vérifier » par
  défaut) ; les anciennes valeurs restent lisibles.
- **Propositions créatives versionnées (MKT-C2-10)** : hors de la Conception (une proposition est une
  sorte de référence) ; `design_versions` gardée pour la Production, la page d'une version renvoie aux
  Intentions du livrable.
- **Validation globale et réouverture (MKT-C2-13)** : retirées ; la Conception est faite quand toutes
  les fiches sont transférées.
- **« Valider avec réserves » (MKT-C2-11)** : retiré (ni proto ni ticket pour la Conception).
- **Valideurs (ticket : « configurable »)** : la direction par défaut, changeable dans « Qui fait
  quoi » ; plus de réglage dans l'étape. Délégations et auto-approbation : après MVP (ticket).
- **Fusion / dissociation (ticket § 4)** et **import d'un brief (ticket § 3)** : gardés en actions
  secondaires des Intentions.
- **Tournage** : jamais proposé (aucune source structurée) ; les dates de postproduction se calculent
  dès qu'un tournage ou une livraison existe.
- **Concept d'un livrable sans intention propre** : proposé depuis la direction de la sortie (il en
  hérite), source « Direction artistique ».
