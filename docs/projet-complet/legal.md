# Juridique — inventaire proto ↔ app (cahier des charges)

Zone : `docs/protos/juridique-v2.html` (moteur en ligne, repris tel quel dans `projet.html` par
`MOD_legal`), scénarios `legal:*`. Dépôt lu : worktree `PDS-OS-projet-complet` (commit `2935141`,
même code que `Proto-in-the-code` : « juridique redesign » `5673c7b`, « ux juridique » `d6b3861`,
« liste etat - juridique » `d9360b6`). Aucun fichier du dépôt n'a été modifié.

Sources lues : script complet du proto (copie lisible : `scratchpad/inventory/jur.js`), textes de
chaque scénario × rôle (`scratchpad/inventory/jurshots/*.txt`, générés par `jurshots.cjs` /
`jurshots2.cjs` sur `juridique-v2.html` seul, car `projet.html` remet `S.sel` à zéro et force
Lina), tickets Juridique 01 à 08 (`scratchpad/inventory/tickets/T01..T08.txt`),
`docs/VISION-UX.md` § 3-5, `docs/PROTOS.md` § 6-7, `docs/ARCHITECTURE.md` § 8 sexies (l. 2160-2985),
`docs/CONTEXTE-PROJET.md` § 2, et le code `app/(app)/app/projects/[projectId]/legal/**`,
`components/legal/**`, `lib/legal/**`, `lib/i18n/fr/legal*.ts`, `app/(public)/{f,s}/[token]`,
`app/api/legal/**`, migrations `*legal*`, `*contract_templates*`.

> `app/(public)/l/[token]` (smartlink de la Sortie) et `app/(public)/fs/[token]` (feuille de service
> de la Production) **ne relèvent pas du Juridique** : hors zone, rien à faire ici.

---

## 0. Le gros écart, en une phrase

Le proto fait de **chaque démarche une étape du Parcours** (Dossier : État des lieux, Cadrage
juridique, Confirmation, Plan d'action · **Suivi : une étape par démarche** (« Sami Kader · fiche et
contrat », « Yanis Morel · fiche et contrat », « Emprunt « Night Lights » », « Répartition de
l'édition « Néons » », « Déclaration SACEM « Néons » ») · **Sortie : « Prêt pour la sortie »**),
chacune avec le patron d'écran complet (Responsable / Validation / Prérequis / Ensuite, action,
lien privé, « Déjà fait »). L'app a **5 étapes** (`inventory`, `framing`, `confirmation`, `plan`,
`tracking`) : le Suivi est **une** étape qui contient un tableau de lignes (`TrackingView`,
`lib/legal/plan/board.ts`) ouvrant des panneaux latéraux (`PlanRowSheet` : `FichePanel`,
`ContractPanel`, `SplitPanel`, `ClearanceBody`, `FormalityCard`, `MappingPanel`), plus **six pages de
branche pleine largeur** (`/legal/forms`, `/contracts`, `/splits`, `/clearances`, `/formalities`,
`/history`). Tout le reste (contenu des étapes) est déjà très proche du proto : les objets, les
règles SQL, les preuves et l'historique existent ; ce sont surtout **les lieux, la forme et
l'envoi par PDS OS** qui diffèrent, plus trois blocs absents (factures, Prêt pour la sortie en
étape, portail privé unique).

---

## 1. Écrans et étapes du proto, correspondance app, écart

Personnes du proto : Lina Haddad (cheffe de projet, `cp`, responsable de tout par défaut), Claire
Morel (DG, `dg`, valide contrats, conditions, modèles, paie, valide la sortie), Sami Kader
(co-auteur, sans compte, `/f/`), Yanis Morel (musicien, dans le Réseau, `/f/`), Inès Robin
(choriste, n'apparaît qu'après correction du Cadrage), Mona Lys (artiste, `/s/`).
Dates : sortie Sam. 05/12/2026, master final attendu Sam. 21/11/2026, « aujourd'hui » 19/10/2026.

### E0. Coquille du module

**Proto.** Fil d'Ariane « Néons › Juridique › <étape ouverte> » (« Juridique » cliquable vers ma
première action) ; h1 « Juridique » ; ligne de faits « « Néons » · Mona Lys · single · Master final
attendu le Sam. 21/11/2026 · Sortie Sam. 05/12/2026 » (+ « Aujourd'hui … » si la date simulée
bouge) ; bandeau de résultat (flash) après chaque geste (« Ensuite : <b>Personne</b> · action »,
« Débloqué : … ») ; carte **Maintenant** (« À vous » / « Aussi à vous » / « Rien à faire pour
vous · Le Juridique avance sans vous pour l'instant » avec la liste des attentes et « Voir ») ;
carte **À payer** (DG seulement, sous Maintenant) ; **Parcours** à gauche avec intertitres de
section « Dossier », « Suivi » (« Suivi · démarches proposées » avant lancement), « Sortie » ; pied
« Historique du dossier ». Pastille de la nav du projet : nombre de mes actions ; point de couleur du
Juridique (fait quand la sortie est validée).

**App.** `app/(app)/app/projects/[projectId]/legal/layout.tsx` (verrou `WorkflowLocked` tant que le
Plan du projet n'est pas lancé : identique au proto global) ; `[[...step]]/page.tsx` redirige `/legal`
vers l'étape qui attend la personne (`entryHref`) ; `components/legal/legal-step-frame.tsx` =
`NowCard` + `JourneySpine` (pied « Historique ») + `StepPanel`
(`components/shell/journey/*`, types `lib/ui/journey.ts`, textes `lib/i18n/fr/journey.ts`,
`legal-journey.ts`). Le titre et la ligne de faits viennent de la coquille du projet
(`ProjectPageTitle`, autre zone).

**Écart : DIFFÉRENT.**
- `JourneySpine` n'a pas d'**intertitres de section** ; `JourneyStep` (`lib/ui/journey.ts`) n'a ni
  section, ni plusieurs acteurs (la répartition attend Mona **et** Sami), ni attente externe
  (« En attente de X (lien privé) »), ni état « Obsolète », ni marques « Échéance dépassée · » /
  « Décision requise · » dans le sous-titre. Étendre le type commun (sert aussi la Production) :
  `section?`, `actors[]`, `wait?: {who, what}`, `status: "obsolete"`, `flags: {overdue, decision}`.
- **Acteur** : `lib/legal/journey-context.ts` met « À vous » sur l'étape en cours pour **toute**
  personne qui voit le Juridique (`actor: viewer`). Le proto distingue : Lina fait les gestes, Claire
  ne voit « À vous » que sur ses décisions (Valider le document, Valider les conditions, Valider le
  modèle, Signer pour PDS Éditions, Confirmer le RIB, Payer, Valider la sortie) et « Rien à faire »
  sinon. Contredit aussi CLAUDE.md (« dans un projet lancé, seul son responsable écrit ; le DG lit
  et valide »). À corriger dans `legalJourney`.
- Carte **À payer** de la DG : MANQUANTE (voir E11).
- Bandeau de résultat dans l'étape : à vérifier composant par composant (`useLegalAction` `done`
  donne un toast ; le proto veut « Ensuite : … » / « Débloqué : … » au-dessus du geste, règle 7).
- Effort : **M** (1-2 j) pour le type commun et l'acteur ; pas de migration.

### E1. État des lieux (`inv`)

**Proto.** Pourquoi : « Ce que le projet sait déjà, classé connu, à confirmer ou manquant. Lu par le
code à chaque ouverture : rien ne s'y coche à la main. » Responsable Lina, Validation Aucune,
Prérequis « Dossier ouvert ». Liste **groupée par intertitres** : Titre (« « Néons » · ISRC
FR-PDS-26-00041 », ISWC, Ayant droit ℗), Personnes, Emprunts, Contrats, Droits (Éditeur,
Répartition de l'édition), Déclarations (SACEM) ; chaque ligne = fait + source + pastille
Connu / À confirmer / Manquant. **Aucune action** ; note finale « Une information se complète là où
elle vit (fiche du titre, Réseau, contrat) ou par les démarches du plan : cette liste se relit
seule. » Sous-titre du Parcours : « 8 connus · 2 à confirmer · 4 manquants ». Les lignes évoluent
avec les démarches (« Réseau · fiche complète », « Signé · Contrats », « Déposée, en attente de la
SACEM », ISWC « T-930.412.775-1 · SACEM »).

**App.** `components/legal/steps/inventory-step.tsx` → `components/legal/legal-inventory.tsx`
(refait le 18/10 en **une seule liste plate**, `inventory/inventory-row.tsx`), données
`lib/legal/inventory.ts`, `inventory-rows.ts`, `inventory-mappers.ts`, `title-facts.ts`,
`project-facts.ts`, `people-facts.ts` ; tuiles-filtres `?state=` ; actions par ligne
(`FactAction`, `TitleRightsButton`) et boutons de section (`SectionButtons` : Ajouter un
contributeur, Nouveau contrat, Déclarer, Ajouter un intervenant non crédité
`project-contact-controls.tsx`, table `legal_project_contacts`).

**Écart : DIFFÉRENT (forme), proche sur le fond.**
- Manquent les **intertitres** (Titre / Personnes / Emprunts / Contrats / Droits / Déclarations) :
  la liste plate du 18/10 les a retirés. Les sections existent dans les données (`sections`).
- Les **actions sur place** (Répartir, Déclarer, Modifier le titre, Nouveau contrat…) sont EN
  TROP par rapport au proto, qui renvoie à la source ; Sacha vient de les garder volontairement
  (commit `d9360b6`) : **à trancher avec lui**. Proposition : garder un seul lien par ligne
  (« Compléter » / « Voir », vers la source) et les quatre boutons de section, retirer les éditions
  en modale ; « Ajouter un intervenant non crédité » reste (ticket « Architecture globale », lot 6).
- Note finale du proto absente. Effort **S** ; pas de migration.

### E2. Cadrage juridique (`framing`)

**Proto.** Pourquoi : « PO pose une question à la fois sur ce que le projet ne sait pas encore. Vous
répondez librement ; il relève les informations, vous les vérifiez avant qu'elles soient gardées. »
Parcours : « À vous · Répondre aux 2 questions ».
1. Bloc `.qa` : surtitre « Question 1 sur 2 · Participants », h3 « Qui d'autre a participé à
   « Néons » ? », pourquoi (« PDS OS connaît déjà les personnes ci-dessous. Il manque qui a composé,
   écrit, arrangé, produit ou joué : c'est ce que demandent les contrats et la déclaration SACEM. »).
2. « Votre réponse » : note « Déjà connu, avec sa source : ajoutez à la suite les autres personnes et
   leur rôle, puis faites lire la réponse à PO. », textarea **pré-remplie** (« Mona Lys : interprète
   (artiste du titre) / Karim Haddou : mix et mastering (Cadrage) / Sami Kader : co-auteur (Cadrage)
   / Yanis Morel : basse (crédits du titre) »), aide (« Composition, texte… Vous pouvez aussi la
   dicter. »). Boutons « Lire ma réponse » (→ « PO lit votre réponse… »), « Compléter avec un
   exemple » (proto), et pour la question 2 « Aucun emprunt ».
3. « ✦ Ce que PO a compris » + « Retirez ce qui est faux, puis enregistrez. Rien n'est gardé
   avant. » : une ligne par élément, **libellé en gras + citation « … »**, bouton « Retirer » ;
   « 1 élément n'a pas été retrouvé tel quel dans votre réponse : écarté. » (PO avait proposé « Yanis
   Morel · arrangement », non dit) ; « Enregistrer » / « Modifier ma réponse ». Rien relevé → callout
   « PO n'a rien relevé dans cette réponse. Reformulez… ».
4. Question 2 « « Néons » reprend-il un élément d'une œuvre existante ? », réponse pré-remplie
   « Il y a un sample de 4 s » (« Repris du Cadrage (« il y a un sample de 4 s ») : vérifiez… »).
5. Sous la question : « Réponses » (une ligne par question : faits + citations, « Corriger » **seulement
   une fois l'étape faite**), puis repli « Questions que PO ne pose pas · Déjà réglées par une donnée
   fiable » (« Des accords existent-ils déjà ? → Contrat d'artiste de Mona Lys, signé · prestation de
   Karim Haddou, signée · Contrats · Master » ; « L'œuvre a-t-elle un éditeur ? → PDS Éditions ·
   Splits du titre »).
6. Après lancement, « Corriger » : « Le plan est lancé : corriger une réponse recalcule les démarches.
   Une démarche devenue sans objet passe en « Obsolète », une nouvelle est proposée dans le Suivi. »
   (scénario `correction`).

**App.** `components/legal/steps/framing-step.tsx` → `intake/intake-workspace.tsx`,
`intake/question-card.tsx` (`PageSection card`, eyebrow `Question n sur N`), `intake/proposal-review.tsx`,
`intake/answered-list.tsx` (DataTable « Réponses » + « Corriger ») ; `lib/legal/intake/*`
(`questions.ts`, `known-people.ts`, `cadrage.ts`, `interpret.ts` via `lib/ai/llm.ts`, `verbatimFrom`),
SQL `record_legal_answer`, tables `legal_intakes`, `legal_answers`, `legal_facts`, `legal_clearances`
(élément tiers à `to_investigate`) ; textes `fr.legal.intake`.

**Écart : quasi OK sur le parcours, DIFFÉRENT sur la présentation.**
- Mots identiques (« Lire ma réponse », « PO lit votre réponse… », « Ce que PO a compris »,
  « Retirez ce qui est faux… », « Enregistrer », « Modifier ma réponse », « Aucun emprunt »,
  `fromKnown`, `fromCadrage`, `dropped`). Bouton « Retirer » : texte dans le proto, icône X dans
  l'app (`ProposalReview`) → S.
- MANQUANT : « Questions que PO ne pose pas » (les questions écartées par `intakeQuestions` parce
  qu'une donnée fiable répond : à exposer avec leur valeur et leur source) → S.
- « Corriger » toujours visible dans l'app ; dans le proto seulement quand l'étape est faite.
- La liste « Réponses » de l'app (tableau à 3 colonnes, faits joints par « · ») ne montre pas les
  citations ; le proto montre chaque fait avec sa citation → S.
- **Point connu à résoudre : aligner sur la question du Cadrage.** Comparaison précise avec
  `frQuestion` / `frDims` (`docs/protos/src/mk.js` l. 2089-2113) :

  | | Cadrage (mk.js) | Cadrage juridique (proto et app) |
  | --- | --- | --- |
  | Conteneur | encadré `.nowbox` titré **« Question de PO »**, au-dessus des cartes des dimensions | bloc `.qa` sans titre (proto) ; `PageSection card` (app) |
  | Surtitre | **« DIMENSION · INFORMATION MANQUANTE »** ou « … · À CONFIRMER » (domaine + état, capitales) | « Question 1 sur 2 · Participants » (rang + libellé court) |
  | Titre | h3 20 px (app : `FramingStepCard`, `text-display-md`) | h3 `.qh` (app : titre de `PageSection`) |
  | État | pastille Connu / À confirmer / Manquant (app : `StatusBadge` sous le pourquoi) | aucun état affiché |
  | Valeur déjà connue | **valeur en gras + source** (ou « citation » · Échange du …), puis **Confirmer / Modifier** | connu glissé **dans la réponse** pré-remplie, à lire par PO |
  | Réponse libre | « Votre réponse * » puis **Confirmer** (pas de lecture PO) ; « M'aider à définir » propose 3 formulations | « Lire ma réponse » → **« Ce que PO a compris »** (faits + citations, Retirer) → Enregistrer |
  | Autres issues | « Non applicable » (motif), « À définir plus tard » (date + tâche), « Rien à signaler » / « Passer » (app) | « Aucun emprunt / Aucun accord / Pas d'éditeur » |
  | Vue d'ensemble | « Confirmation humaine · n/N · x dimensions complètes sur 6 » + cartes repliables par dimension, chaque ligne avec pastille et **« Répondre »** pour sauter à une autre question | « Réponses » (seulement ce qui est gardé) ; pas de saut vers une autre question ouverte |
  | Proposition d'un call | proposée avec sa phrase, Confirmer / Modifier / Écarter (règle 21) | n/a |

  **Proposition de convergence** (aucune règle métier nouvelle, règles 12 et 21) :
  1. Même conteneur : la question dans l'encadré « Question de PO » (`FramingStepCard` de
     `components/framing/guide/step-card.tsx`, à remonter dans `components/ui/` ou `shell/` car
     partagé par deux domaines) ; surtitre « <DOMAINE> · INFORMATION MANQUANTE » (domaine =
     Participants, Élément repris, Accords existants, Éditeur, + titre si plusieurs titres), avec le
     rang « 1 sur 2 » à droite comme le `QuestionPager` du Cadrage ; pastille d'état sous le
     pourquoi.
  2. Même cœur : réponse libre (tapée ou dictée) → « Lire ma réponse » → « Ce que PO a compris »
     (faits + citations, Retirer) → « Enregistrer ». Le Cadrage n'a pas cette lecture : c'est le
     Juridique qui garde ce cœur (il crée des crédits et des emprunts) ; le Cadrage pourra le
     reprendre pour ses réponses libres, mais ce n'est pas dans ma zone.
  3. Même vue d'ensemble : sous l'encadré, une carte repliable par domaine (Personnes, Éléments
     repris, Accords, Éditeurs) avec chaque fait, sa pastille, sa source ou sa citation et
     « Répondre » / « Corriger » ; en tête « n réponses sur N » ; « Questions que PO ne pose pas »
     devient l'une de ces cartes (pastille « Connu », source).
  4. Les connus pré-remplis restent dans la réponse (règle 12 : PO ne lit que la parole visible).
  Effort **M** (1-1,5 j) ; pas de migration.

### E3. Confirmation (`confirm`)

**Proto.** Pourquoi : « Une synthèse écrite par le code, confirmée par une personne. Confirmer le
dossier ne vaut ni signature, ni autorisation, ni dépôt. » Sections Personnes (rôle, nom en gras,
source « Cadrage juridique · « Mona a écrit le texte » », pastille Crédité / Déclaré / Connu /
Confirmé), Éléments repris (« À vérifier »), Contrats, Éditeurs ; callout « Confirmer le dossier ne vaut
ni signature, ni autorisation, ni dépôt. » ; bloc « Le plan d'action qui sera généré » (« 2 fiches de
renseignements à recueillir · 2 contrats à prévoir · 1 répartition de l'édition à faire confirmer ·
1 emprunt à sécuriser · 1 déclaration SACEM ») ; boutons « Confirmer et générer le plan d'action »
et « Corriger une réponse » (→ Cadrage). Rouvert après correction : callout « Une réponse a changé
depuis la dernière confirmation : relisez le dossier et confirmez-le à nouveau. », bouton
« Confirmer à nouveau le dossier ».

**App.** `steps/confirmation-step.tsx` → `confirmation/confirmation-view.tsx` (`ConfirmationStatus`,
`ConfirmationPanel`, `FactTable`, `SynthesisAction`), `confirm-button.tsx`, `lib/legal/confirmation/synthesis.ts`,
`queries.ts`, SQL `confirm_legal_intake`, aperçu `proposeLegalPlan`.

**Écart : OK** (mêmes sections, même aperçu JUR-06, même bouton, même réouverture). Petites
différences : « Corriger » / « Répondre » par ligne dans l'app au lieu d'un bouton « Corriger une
réponse » (garder les deux) ; l'aperçu de l'app compte « fiches » et « contrats » à part, le proto
aussi → OK. Effort **S** (quelques mots) ; pas de migration.

### E4. Plan d'action (`plan`)

**Proto.** Pourquoi : « Le code propose les démarches et les contrats à prévoir. Vous confirmez les
contrats en une fois, puis vous gardez, attribuez et datez chaque démarche. » Ensuite : « Sami Kader ·
fiche et contrat, Yanis Morel · fiche et contrat, et 3 autres ».
1. **Contrats à prévoir** (avant le lancement) : « Un contrat par personne, proposé d'après son rôle.
   Vous les confirmez ensemble : ce n'est ni valider leur contenu, ni les générer. » Par personne :
   nom · qualité, source du rôle (« Cadrage juridique · « Sami Kader a composé la musique » »,
   « Crédits du titre · basse »), pastille « Proposé : 250 € HT, forfait », liste « Contrat » (modèles
   validés de la bibliothèque dont les rôles conviennent, sinon « Aucun modèle validé pour ce
   rôle », + « Pas d'accord nécessaire » qui ouvre « Pourquoi aucun accord n'est nécessaire * »),
   source « Proposé d'après son rôle (Compositeur·rice) · bibliothèque, validé par la direction » ou
   « Aucun modèle de la bibliothèque ne correspond à son rôle : sans modèle validé, pas de contrat »,
   bouton **« Nouveau modèle de contrat »** ; « Confirmer les contrats nécessaires » (erreurs :
   « Choisissez un contrat pour X, créez un modèle, ou « Pas d'accord nécessaire ». », « Il reste des
   contrats à régler avant de confirmer. »). Confirmé : résumé + « Confirmés par Lina Haddad le … : ce
   n'est ni valider leur contenu, ni les générer. » + « Modifier les contrats à prévoir ».
2. **Modale verre « Nouveau modèle de contrat »** (règle 18) : « Il entre dans la bibliothèque une fois
   validé par la direction, et sera proposé pour ces rôles sur tous les projets. » ; « Le modèle (Word,
   PDF ou texte) * » (dépôt), « Nom du modèle * », « S'applique à * » (pastilles de rôles, pré-coché
   avec le rôle de la personne), « ✦ Ce que PO a repéré dans « fichier » » (La personne / Le projet /
   L'accord), « Envoyer à la direction » / « Annuler ». Le modèle passe « envoyé à Claire Morel : en
   attente de sa validation ».
3. **Côté DG, dans l'étape** : carte « À vous · Valider un modèle de contrat » (fiche du modèle :
   fichier, « Voir le modèle », S'applique à, valeurs repérées), « Valider le modèle », repli
   « Refuser le modèle » (« Ce qui ne va pas * », revient signé à Lina).
4. **Démarches** en **deux colonnes** « À lancer maintenant · Rien ne les retient : elles démarrent en
   parallèle. » / « À venir · Débloquées dès que ce dont elles dépendent est fait. ». Une ligne par
   démarche, **fiche et contrat d'une personne réunis** (« Faire remplir la fiche de Sami Kader, puis
   lui faire signer un contrat · Fiche puis contrat · Rien ne la retient »), case « garder »,
   « Responsable » (membres), « Échéance » (date, **source « Calculé : 30 jours avant la sortie »**
   ou « Modifié par … »).
5. Note « Lancer le plan fait de chaque démarche gardée une étape du Suivi, à son responsable. Chacune
   se coche d'elle-même quand sa source dit que c'est fait. Rien n'est envoyé à l'extérieur et aucun
   contrat n'est créé. » ; « Lancer le plan d'action » (refusé tant que les contrats ne sont pas
   confirmés : « Confirmez d'abord les contrats à prévoir. »).
6. Une fois lancé : résumé des contrats à prévoir + liste des démarches (« Ouvrir » vers chaque
   étape) ; pastille « Hors du plan » pour une démarche retirée.

**App.** `steps/plan-step.tsx` → `plan/plan-view.tsx`, `plan-form.tsx`, `plan-item-row.tsx`,
`action-group.tsx` ; `lib/legal/plan/proposal.ts` (+ `proposal-titles.ts`, `groups.ts`,
`due-dates.ts`, `where.ts`), SQL `launch_legal_plan`, `insert_legal_plan_item` (tâches du Travail),
tables `legal_plans`, `legal_plan_items`, `legal_plan_events`. Lancé : simple callout + « Ouvrir le
Suivi ». Contrats à prévoir : `contracts/mapping-panel.tsx`, `mapping-form.tsx`
(`lib/legal/contracts/mapping.ts`, SQL `approve_contract_mapping`, table `legal_agreement_needs`) **dans
le Suivi**, ligne « Cartographie des contrats » **après** le lancement. Modèles :
`/app/contracts/templates` (+ `[seriesId]`, import Word/PDF lu par PO `template-source.ts`,
`template-values.ts`, validation / refus DG `set_contract_template_status`).

**Écart : DIFFÉRENT.**
- **Contrats à prévoir avant le lancement** (dans l'étape Plan) au lieu d'une ligne du Suivi ; le
  lancement exige leur confirmation. → **M**. Risque : `legal_agreement_needs` est clé par
  **contact** (« Fiche à préparer d'abord » quand la personne n'a pas de contact) ; Sami n'a pas de
  contact avant sa fiche. Il faut soit créer le contact à la confirmation des contrats (comme
  `prepare_legal_form`), soit permettre un besoin clé par crédit. **Migration** : colonne
  `no_agreement_reason` (motif obligatoire de « Pas d'accord nécessaire » : MANQUANT dans l'app) et
  éventuellement `credit_ids`/clé de nom sur `legal_agreement_needs` ; `approve_contract_mapping`
  appelée avant `launch_legal_plan`, et `launch_legal_plan` qui la vérifie.
- **« Nouveau modèle de contrat » en modale** depuis la ligne de la personne (fichier, nom, rôles
  pré-cochés, ce que PO a repéré) : l'app a tout le moteur (`create_contract_template`, import, PO)
  mais sur une page à part (`/app/contracts/templates/new`) → **M** : un `FormDialog` qui réutilise
  l'import (`upload-source.ts`, `template-source.ts`) et le formulaire du modèle en mode court.
- **Validation du modèle par la DG dans l'étape** (carte « Valider le modèle » / « Refuser le modèle »
  avec motif) : l'app le fait sur la page du modèle → **S** (réutiliser l'action, la poser dans
  l'étape quand un modèle lié attend).
- **Une démarche par personne « fiche puis contrat »** : l'app propose deux actions (onboarding +
  contract) et les fusionne seulement à l'affichage du Suivi (`mergeSteps`). Dans le plan, garder
  les deux actions SQL (tâches et coches différentes) mais **les présenter comme une ligne** →
  **S-M**, pas de migration.
- **Deux colonnes** (proto) contre **trois** (« À lancer maintenant / En cours / À venir », ticket 07 et
  `CONTEXTE-PROJET.md` « un seul vocabulaire de plan »). Le proto fond « En cours » dans les deux
  autres. **À trancher** (le ticket 07 cite trois colonnes) ; proposition : garder « En cours » seulement
  si non vide.
- **Source de l'échéance** (« Calculé : 30 jours avant la sortie », « Modifié par … ») : MANQUANTE
  dans `PlanItemRow` alors que `due-dates.ts` la calcule → **S** (ajouter la règle à la ligne).
- Plan lancé : le proto garde le résumé des contrats et la liste « Ouvrir » vers chaque démarche ;
  l'app renvoie au Suivi. Avec E5, « Ouvrir » mène à l'étape de la démarche → **S**.
- Effort global E4 : **L** (≈ 3 j). Migration : oui (ci-dessus).

### E5. Suivi (section du Parcours) et ses quatre groupes

**Proto.** Pas d'étape « Suivi » : un **intertitre** « Suivi » dans le Parcours, sous lequel chaque
démarche est une étape. Sous-titre de chaque démarche : « Sami Kader · remplir sa fiche de
renseignements » (acteur externe), « En attente d'Éditions Nocturne et Velvet Records · signer la
licence » (attente surveillée), « À vous · Demander l'autorisation », « Après : la fiche de Sami
Kader », « Contrat signé · facture attendue », « Échéance dépassée · … » (rouge), « Décision requise ·
… » (rouge : validation de la DG, refus, réponse SACEM, démarche apparue). Les quatre groupes du
ticket 07 (« À traiter maintenant / Décision requise / En attente externe / Progression silencieuse »)
existent dans le code du proto (`VIEWS.track`, `trackGroups`) mais **ne sont plus affichés** : ils
sont portés par ces sous-titres et par « Maintenant ». Après une correction du Cadrage : démarche
« Obsolète · Inès Robin n'est plus dans le dossier (correction du Cadrage par …) » (barrée, plus
d'action, historique gardé) ; démarche « Apparue après le lancement » avec callout et formulaire
« Contrat à prévoir » + « Ajouter au plan ».

**App.** `steps/tracking-step.tsx` → `tracking/tracking-view.tsx` (tuiles `StatTiles` des 4 groupes
qui filtrent `?view=`, cartes Personnes / Emprunts / Titres, lignes `PlanRowSheet` → panneau,
« Suivant » `NextLineButton`, délégation `DelegateButton`, « Ajouter au plan » `AddedActions`,
carte « Prêt pour la sortie »), `lib/legal/plan/board.ts`, `lib/legal/tracking/{queries,sources,state,summary}.ts`,
SQL `legal_plan_item_done`, `legal_tick_*`, `add_legal_plan_items`, `update_legal_plan_item`.

**Écart : DIFFÉRENT (structure).** Les règles (états calculés, coche par les sources, attente vs
action, obsolète, apparue après lancement, échéance dépassée) sont **là** ; c'est la forme qui
change :
- Remplacer l'étape `tracking` par **une étape par démarche** dans le Parcours, chacune avec son URL
  (proposition : `/legal/d/<cléDeLigne>` où la clé est celle de `board.ts`, `person:<contactId>`,
  `clearance:<id>`, `split:<masterId>`, `sacem:<masterId>`), son responsable et son échéance
  (`legal_plan_items`), sa validation (DG pour personne et emprunt, aucune pour répartition et SACEM),
  ses prérequis (« ✓ Plan d'action », « ○ Fiche de Sami Kader », « ○ Master final · Master · attendu
  le … »), « Ensuite », et le contenu de son panneau actuel en corps d'étape.
- Retirer les tuiles et le tableau (EN TROP une fois les démarches dans le Parcours) ; « Maintenant »
  et les sous-titres les remplacent. Garder `board.ts` comme calcul (urgence, verbe, badge).
- Une démarche pas encore lancée reste visible, verrouillée : « Proposée par le code d'après le
  dossier. Elle démarre quand le plan d'action est lancé. » + « Ce qui viendra » (liste des gestes
  numérotés avec qui les fait).
- Effort **L** (3-4 j : routes, `legalJourney` étendu aux démarches, `LegalStepFrame` par
  démarche, redirections des anciennes adresses `?ligne=` et des pages de branche). Pas de
  migration.

### E6. Démarche « <Personne> · fiche et contrat » (`sami`, `yanis`, `ines`)

**Proto.** Pourquoi : « Sa fiche donne au contrat ce qui lui manque. La direction valide le document
avant l'envoi en signature. » Responsable Lina (« avant le Jeu. 05/11/2026 », « Changer »),
Validation Claire Morel « La direction · contrats et conditions ». Sept gestes :
1. **Envoyer la fiche** (Lina). Personne **dans le Réseau** (Yanis) : note « … son lien ne lui demande
   que ce qui manque à son contrat. La rémunération lui est montrée pour qu'il la confirme. »,
   « Déjà connu, pré-rempli dans sa fiche » (faits + sources, « Rémunération, à confirmer · 250 € HT,
   forfait · Convenue par Lina Haddad · budget du projet »), **carte « L'e-mail que PDS OS enverra »**
   (De : l'adresse de PO au nom de Lina ; À avec source « Réseau » ; Objet « « Néons » : quelques
   informations pour votre contrat » ; Message modifiable ; bloc fixe « Ajouté automatiquement à la fin
   de l'e-mail : Ouvrir votre espace : *lien privé créé à l'envoi* · valable jusqu'au … »), boutons
   « Envoyer la fiche à Yanis Morel » / « Copier le lien plutôt ». Personne **sans adresse** (Sami) :
   callout « PDS OS n'a pas encore l'adresse de Sami Kader : c'est justement la fiche qui la recueille.
   Créez le lien, envoyez-le-lui par votre canal habituel, puis marquez la fiche comme envoyée. »,
   « Créer le lien de la fiche » → lien affiché + « Marquer comme envoyée » / « Copier le lien ».
2. **Remplir sa fiche** (la personne, lien privé) : « En attente de Sami Kader (lien privé) : remplir sa
   fiche de renseignements. » + le lien en ligne (« Copier le lien », « Relancer », « Nouveau lien »,
   « Révoquer l'accès » avec « Pourquoi vous révoquez l'accès * »), « Lien privé · valable jusqu'au
   Mer. 18/11/2026 · créé le … · Envoyé par … · Ouvert le … ». Ouvert ≠ fait.
3. **Vérifier les réponses** (Lina) : « Corrections à vérifier » (« Prénom et nom (état civil) « Sami
   Kader » → « Samir Kader » · Corrigé par Sami Kader dans sa fiche · rien n'est appliqué avant votre
   accord ») + « Accepter les corrections » / « Garder les anciennes valeurs » ; sinon « Nouvelles
   informations · ajoutées à sa fiche Réseau » (rôle « Choisi par … », « Intervient en tant que »,
   chaque valeur « Fournie par X, dans sa fiche », **IBAN masqué « visible par la direction
   seulement »**, BIC, titulaire « gardé dans sa fiche du Réseau ») + « Marquer la fiche complète ».
4. **Soumettre à la direction** (Lina) : **carte document en tête** (règle 18) « Contrat_Kader_Neons_v1.pdf ·
   Généré depuis les valeurs ci-dessous · 0 bloquante sur 8 · chaque valeur se corrige à sa source ·
   Voir le PDF », puis valeurs avec source (Modèle « Contrats à prévoir · confirmé par Lina Haddad »,
   Partie, Adresse, IPI/COAD, Œuvre « Fiche du titre · Catalogue », Qualité (citation du Cadrage), Part de
   composition « Selon la répartition de l'édition… », Rémunération, Signataire pour PDS) ; « Corriger
   dans sa fiche » **sur place** (Entrée enregistre, la fiche est corrigée, « le contrat suit », ligne
   marquée), « Corriger dans le Catalogue » ; pastille Montant (Proposé / Accepté par Claire Morel /
   Engagé) ; repli « Modifier une clause · Crée une nouvelle version du document » (Clause : Crédit,
   Durée, Territoire, Rémunération, Exclusivité, Autre ; « Nouvelle rédaction * » ; « Pourquoi * » ;
   « Créer la nouvelle version ») ; ligne « Changé depuis la v1 : clause « Crédit » (Lina, v2) : « … » » ;
   bouton « Soumettre à la direction » (après retour : « Répondre et transmettre à nouveau »).
5. **Valider le document** (Claire) : même carte en lecture, « Vous décidez sur ce document, tel qu'il
   partira. Une valeur fausse se corrige à sa source ; un texte à changer, c'est une clause. »,
   « Valider le document », repli « Demander des modifications » (« Ce qu'il faut changer (une clause, ou
   une valeur à corriger à sa source) * », « Revient signé en tête de l'étape de Lina Haddad. »). Le
   retour s'affiche en tête de l'étape de Lina : « Claire Morel (demander des modifications) : « … » ».
6. **Envoyer le contrat** (Lina) : carte « L'e-mail que PDS OS enverra » (À : adresse de sa fiche,
   Objet « « Néons » : votre contrat à signer », pièce jointe = version validée, « Voir le PDF »,
   message, lien privé « avec le même lien que pour sa fiche », note « Il y déposera le contrat signé. »),
   « Envoyer à Sami Kader » / « Je l'ai remis autrement » (Remis en main propre / Envoyé par un outil
   de signature / Envoyé depuis ma messagerie + « Le » date) → « Noter la remise ».
7. **Marquer comme signé** : attente « En attente de Sami Kader (lien privé) : signer et renvoyer le
   contrat · envoyé par PDS OS le … à … » + lien + repli « Le signé vous est parvenu autrement ? »
   (Contrat signé *, Preuve de signature *). Quand la personne dépose par son lien : « Reçu de Sami
   Kader par son lien privé » (fichier, « Déposé par … le … », « Preuve de signature · Dépôt par son
   lien privé, horodaté ») + « Vérifiez que c'est bien le document envoyé, signé, avant de le marquer
   comme signé. » + « Marquer comme signé ». Contrat rémunéré signé → PDS OS envoie seul l'e-mail de
   facture (E11).
Sous l'action : carte « Lien privé de X · Sa fiche, puis son contrat à signer · sans compte ·
valable jusqu'au … » (pastille Ouvert / Envoyé / Révoqué) ; puis « Déjà fait ».

**App.** Ligne « Personnes » du Suivi, panneau à étapes (`board.ts` `mergeSteps`) :
`tracking/fiche-panel.tsx` (Préparer la fiche, lien **affiché une fois**, « Envoyer par e-mail »
`mailto:`, Marquer envoyée, Nouveau lien, Révoquer, corrections à accepter `review_legal_form`),
`tracking/contract-panel.tsx` (génération auto `lib/legal/contracts/auto-generate.ts`, valeurs
`ContractValueList` + `completeness.ts`, « Relire, puis soumettre à la direction », DG « Valider le
document » / « Demander des modifications », « Envoyer en signature » avec sa façon, dépôt signé +
preuve `ContractProofSlot`, « Marquer comme signé », conditions financières) ; clause sur la page du
contrat (`revise_contract_document`) ; SQL `prepare_legal_form`, `set_legal_form_state`,
`generate_legal_contract`, `advance_contract`, tables `legal_forms`, `legal_form_submissions`,
`contact_legal_details`, `contract_documents`, `contract_events`, `financial_needs` (trigger
`contracts_financial_need`, état `waiting_for_invoice`).

**Écart : DIFFÉRENT.**
- **Envoi par PDS OS** (règle 19) : MANQUANT. L'app fait `mailto:` + « Marquer envoyée ». Il faut un
  envoi serveur (fournisseur ou SMTP Google Workspace de PO, point à trancher `CONTEXTE-PROJET.md`
  « Envoi d'e-mails ») et une **carte « L'e-mail que PDS OS enverra »** commune (brique). **Migration** :
  table `outbound_emails` (projet, objet, destinataires, corps, pièce jointe, lien, envoyé par, envoyé
  le, id fournisseur, statut) écrite par fonction, lue en RLS du projet ; la preuve d'envoi = cette
  ligne. **L** (3 j) hors réception.
- **Lien toujours visible** (règle 19 : « Copier le lien », « Relancer », « Nouveau lien », révoquer
  **avec motif**, créé / envoyé / ouvert, expiré) : l'app ne garde que `sha256` et affiche le lien **une
  seule fois**. **Migration** : jeton chiffré récupérable (colonne `token_encrypted` sur `legal_forms`
  et `legal_split_confirmations`, chiffrée par une clé serveur ou Vault ; `get_*` inchangées),
  `revoked_reason`, `revoked_by` ; « Relancer » = un nouvel e-mail sur le même lien. **M** (2 j).
- **Étape « Vérifier les réponses » + « Marquer la fiche complète »** : dans l'app une fiche sans
  correction est complète d'elle-même ; le proto exige un geste. **À trancher** (le ticket 02 dit
  seulement « Une correction sensible peut être signalée pour revue ») ; si gardé : colonne
  `reviewed_at/by` ou état `complete` posé par `review_legal_form`. **S** + migration légère.
- **Contrat « document en tête »** (règle 18) avec nom de fichier versionné, « Voir le PDF », valeurs
  sourcées, **« Corriger dans sa fiche » sur place** (écrit `contact_legal_details` et fait suivre le
  contrat), **« Modifier une clause » dans l'étape** et ligne « Changé depuis la v1 » : l'app a les
  fonctions (`revise_contract_document`, `ContractValueList`, PDF `/api/contracts/[id]/document`) mais
  la correction renvoie au Réseau (`?retour=`) et la clause vit sur la page du contrat. **M** (1,5 j).
  Correction sur place : nouvelle fonction SQL `correct_contact_legal_detail(contact, champ, valeur)`
  (manage_legal, journalisée) → migration.
- **Retour de la DG en tête de l'étape du responsable** + bouton « Répondre et transmettre à
  nouveau » : à vérifier dans `ContractPanel` (le motif est gardé dans `contract_events`) → **S**.
- **Retour du signé par le lien privé** de la personne : MANQUANT (le signé est déposé par l'équipe).
  Voir E7. **M**.
- Rémunération « à confirmer » par la personne dans sa fiche (« La rémunération n'est pas celle
  convenue ? Dites-le ») et **IBAN / BIC / titulaire** pour les personnes payées : MANQUANTS dans
  `lib/legal/forms/definition.ts`. **Migration** : champs bancaires dans un stockage à part, lisible
  par la DG seule (règle de confidentialité du proto « visible par la direction seulement ») : table
  `contact_bank_details` (contact, iban chiffré, bic, titulaire, source, vérifié par) avec RLS
  `pay_invoices`/DG. **M**.
- Effort E6 total : **L** (≈ 5 j avec E7, hors envoi d'e-mails).

### E7. Page privée de la personne (`/f/<jeton>`)

**Proto.** En-tête « PDS · « Néons » · Sami Kader · 🔒 Lien privé /f/… · sans compte » ; « Néons · Mona
Lys · single · Co-auteur, compositeur » ; h1 « Ce que PDS attend de vous » / « Rien à faire pour
l'instant » ; si plusieurs attentes, un résumé avec « Voir » vers chaque carte ; **cartes dans l'ordre
inverse du parcours** (règle 17) : « Votre facture », « Le bulletin SACEM de « Néons » », « La
répartition de l'édition de « Néons » · version n », « Votre contrat », « Votre fiche de
renseignements » / « Quelques informations pour votre contrat » ; pastilles À vous / Envoyée /
Suivi / Signé / Payée ; carte « Votre contact chez PDS · Lina Haddad · Cheffe de projet ».
- **Fiche** : « D'abord : quel est votre rôle sur ce titre ? Plusieurs réponses possibles. » (pastilles
  des 10 rôles, pré-cochées « déjà connu · <source> »), « Continuer » ; puis tronc commun (« Vous »,
  « Vous intervenez en tant que * » Personne / Société), « Pour vous payer » (IBAN, BIC, titulaire),
  un bloc par rôle (« Auteur, compositeur, arrangeur » : Société de gestion, IPI/COAD, « Votre part
  d'auteur ou de compositeur, à votre avis » ; « Interprétation » : « Rémunération convenue · 250 € HT ·
  Fixée avec Lina Haddad · à confirmer », Instrument ou voix…), encadré RGPD, case de consentement,
  « Vérifier ma fiche » → relecture → « Envoyer ma fiche » → « Fiche envoyée le … Reçu gardé chez
  PDS. ». Personne du Réseau : « PDS a déjà vos coordonnées : il ne manque à votre contrat que ce qui
  suit. », valeurs connues en lecture (règle 20).
- **Contrat** : « PDS prépare votre contrat et le fait relire par sa direction. » → « Votre contrat est
  approuvé… » → « Envoyé par e-mail le … Signez-le, puis déposez-le ici : c'est ce qui prouve la
  signature. » + « Télécharger » + dépôt « Votre contrat signé * » + « Envoyer mon contrat signé » →
  « Contrat signé reçu le … Lina Haddad le vérifie ».
- **Répartition** (pour Sami sur ce même lien ; Mona sur `/s/`) : « Ce qui a changé depuis votre dernière
  réponse », parts, « Confirmer n'est pas signer un contrat. », « Je confirme » / « Je conteste »
  (« Ce qui ne vous convient pas * »).
- **Bulletin SACEM** : « Télécharger », dépôt « Le bulletin signé * », « Envoyer le bulletin signé ».
- **Facture** : voir E11.
- Lien révoqué : « Ce lien n'est plus valable · PDS a désactivé ce lien. Demandez-en un nouveau à
  Lina Haddad : ce que vous avez déjà envoyé est conservé. »

**App.** `app/(public)/f/[token]/page.tsx` (fiche **seule** : `forms/public-form.tsx`,
`role-step.tsx`, `form-review.tsx`, `requester-note.tsx` RGPD, `get_legal_form` / `submit_legal_form`
/ `note_legal_form_opened` en `security definer` pour `anon`) ; `app/(public)/s/[token]/page.tsx`
(répartition **seule**, un lien par personne et par version, `get_split_confirmation`,
`respond_split_confirmation`, `splits/public-split.tsx`).

**Écart : DIFFÉRENT (périmètre).** Fiche : OK sur le fond (rôles d'abord, blocs par rôle, consentement,
vérifier, reçu ; textes `fr.legalForms.public`) — manquent l'en-tête « Ce que PDS attend de vous »,
la carte contact, les données bancaires et la rémunération à confirmer. MANQUANTS : **contrat à signer
et dépôt du signé**, **bulletin SACEM à signer**, **facture**, et la **réunion des cartes d'une même
personne** sous un seul lien (règle 10 + « une page privée par personne » de `PROTOS.md` § 6, qui réunit
aussi le Master `/m/` et la Production `/p/`). **Migration** : un « espace » par personne et par projet
(table `private_spaces` : contact, projet, jeton chiffré, expiration, révocation) auquel se rattachent
fiche, contrat, confirmation, signature, facture ; fonctions `anon` `get_private_space(token)`,
`upload_signed_contract(token, …)` (bucket privé, chemin imposé), `upload_signed_bulletin`,
`submit_invoice`. Le `/s/` actuel peut rester comme cible de compatibilité. Effort **L** (3-4 j) ;
coordination avec la zone « pages privées réunies ».

### E8. Démarche « Emprunt « Night Lights » » (`borrow`)

**Proto.** Pourquoi : « Un emprunt non sécurisé bloque la sortie. Demander, négocier, faire signer :
chaque temps garde sa preuve. Un refus se décide : retirer, remplacer, ou rester bloqué. » Échéance
« Mer. 21/10/2026 · Calculé : 45 jours avant la sortie ». Validation Claire. Cinq gestes :
1. **Demander l'autorisation** : fait « Élément repris · Sample de 4 s de « Night Lights » (The
   Velvetones, 1978) · Cadrage juridique » ; « Ce qui est repris » (pastilles L'œuvre / L'enregistrement,
   « Proposé par le code pour un sample : l'œuvre et l'enregistrement. À corriger si besoin. ») ;
   « Qui détient l'œuvre « Night Lights » ? * » et « Qui détient l'enregistrement original… ? * »
   (choix dans le Réseau, aides « Chercher « Night Lights » dans le répertoire SACEM » / mention ℗,
   « Ajouter au Réseau ») ; carte « L'e-mail que PDS OS enverra » (« Demande d'autorisation : sample
   de « Night Lights » dans « Néons » », « Leur réponse revient dans ce fil : PDS OS la rattache à
   l'emprunt. ») ; « Envoyer la demande » / « Je l'ai envoyée autrement » (date) ; repli « Rien à
   sécuriser ? · Avec sa raison, l'emprunt se clôt » (« Confirmer : rien à sécuriser »).
2. **Coller leur réponse** (attente « En attente d'Éditions Nocturne et Velvet Records : répondre à la
   demande ») : la réponse **arrive dans le fil** (proto : « Proto : faire arriver leur accord / un
   refus ») → « Leur réponse · Reçue le … · Hélène Brun · Éditions Nocturne » + « Reçu dans le fil de la
   demande et rattaché par PDS OS. » + « ✦ Ce que PO a compris » (conditions avec citations : Montant
   800 € HT forfait, Territoire monde entier, Durée sans limite, Crédit…, « Retirer ») + « 1 élément
   n'a pas été retrouvé tel quel… » + « Envoyer à la direction ». Recours : repli « Leur réponse est
   arrivée par un autre canal ? » (« Leur réponse, collée telle quelle * », « Faire lire par PO »).
3. **Valider les conditions** (Claire) : « Sur quoi vous décidez » (ce qui est repris, ayants droit,
   conditions citées, Montant + état Proposé/Accepté/Engagé) ; callout « Valider les conditions accepte
   le montant et vaut accord sur l'emprunt : la licence est préparée et approuvée du même geste, puis
   Lina Haddad la fait signer. » ; « Valider les conditions » ; repli « Demander une contre-proposition »
   (« Ce qu'il faut leur demander * ») → chez Lina : e-mail de contre-proposition dans le même fil
   (« Re : … », « Envoyer la contre-proposition »), puis nouvelle réponse (600 €).
4. **Envoyer la licence** : e-mail PDS OS (pièce jointe « Licence_Nocturne_Velvet_Neons.pdf · Préparée et
   approuvée à la validation des conditions ») / « Je l'ai remis autrement ».
5. **Marquer comme sécurisé** : la licence signée revient **par e-mail** (« Reçue par e-mail · pièce
   jointe de … · Preuve : l'e-mail de retour, horodaté ») ; recours « La licence signée est arrivée par un
   autre canal ? » (signée + preuve). Fait : « Emprunt sécurisé : il ne bloque plus la sortie ».
- **Refus** (scénario `refusal`) : « Leur réponse : un refus » (citations), callout « Tant que rien n'est
  décidé, la sortie reste bloquée : l'emprunt est dans « À résoudre avant sortie ». », « Décider de la
  suite » en deux colonnes : « Retirer l'élément du titre » (« Le titre sort sans le sample : le Master
  le refait… », Pourquoi *, « Retirer l'élément » → historique « Karim Haddou prévenu dans le Master :
  refaire le passage sans le sample ») / « Le remplacer » (« Par quoi * » pré-rempli « Une version
  rejouée… », « Remplacer et redemander » → nouvelle demande, l'enregistrement décoché).

**App.** Ligne « Emprunts » du Suivi → `clearance/clearance-drawer.tsx` (`ClearanceBody` : onglets
Vue d'ensemble / Échanges / Documents / Historique repliés sous les trois temps `clearance-stages.tsx` :
`ask-moment.tsx` (pastilles, ayants droit `PersonPickerField`, « Copier un modèle de demande »,
« J'ai envoyé la demande »), `negotiate-moment.tsx` (réponse collée, `readClearanceMessage`, conditions
en champs, « Envoyer à la direction », « Enregistrer le refus », DG « Valider les conditions » /
« Demander une contre-proposition »), `sign-moment.tsx` (envoi déclaré, `ContractProofSlot`, « Marquer
comme sécurisé »), `withdraw-button.tsx`) ; page `/legal/clearances` ; `lib/legal/clearance/*`
(`flow-actions.ts`, `interpret.ts`, `matrix.ts`) ; tables `legal_clearances`, `_rightsholders`, `_terms`,
`_contracts`, `_communications`, `_events` ; validation des conditions = licence préparée et approuvée
(décision du 07/10, identique au proto).

**Écart : DIFFÉRENT (envoi, réception, refus), OK sur les règles.**
- Demande et licence **envoyées par PDS OS** avec aperçu : MANQUANT (dépend de l'envoi d'e-mails, E6).
- **Réponse qui revient seule dans le fil** et rattachée : MANQUANT ; suppose la **lecture de la boîte
  de PO** (Gmail OAuth, règle 19). Le collage reste le recours (existant). **L** (3-5 j), plus tard.
- **Refus → décision** : l'app a « Enregistrer le refus », « Reprendre à … », « Retirer l'élément »
  (abandon). MANQUANT : « Le remplacer » (nouvel élément, nouvelle demande, droits recalculés) et
  **prévenir le Master** quand on retire (« Karim Haddou prévenu dans le Master ») → **M**. Migration :
  `legal_clearances.replaced_by` / `element` versionné, ou nouvelle clearance liée ; notification au
  responsable du Master.
- Contre-proposition : le motif de la DG doit revenir en tête de l'étape et ouvrir un e-mail de
  réponse dans le fil → **S** une fois l'e-mail branché.
- Onglets Échanges / Documents / Historique (`clearance-drawer.tsx`) : **EN TROP** (règle 22 « Pas
  d'onglets » ; le proto met tout dans « Déjà fait » et l'Historique du dossier). À replier en
  « Déjà fait ». Page `/legal/clearances` : EN TROP (rediriger vers l'étape).
- Échéance « Calculé : 45 jours avant la sortie » : la règle existe (`due-dates.ts`), la source n'est
  pas affichée → S.
- Effort E8 : **M** (2 j) sans la réception d'e-mails.

### E9. Démarche « Répartition de l'édition « Néons » » (`split`)

**Proto.** Pourquoi : « Les parts de l'œuvre, saisies par une personne et confirmées par chaque ayant
droit par son lien. Confirmer n'est pas signer un contrat. » Prérequis « ✓ Plan d'action, ○ Fiche de
Sami Kader » ; Validation Aucune. Trois gestes :
1. **Proposer la répartition** : « Saisie par une personne : PO ne propose jamais de part. » ; Mona Lys
   (Auteure, compositrice), Sami Kader (Compositeur, « a indiqué « 50 % » de la composition dans sa
   fiche, à son avis »), PDS Éditions (Éditeur) ; total « Répartition de l'édition · version 1 · Total :
   100 % » (« il faut 100 % tout juste ») ; à partir de v2 « Raison du changement * » ; « Enregistrer la
   répartition » / « Proposer la nouvelle version ».
2. **Envoyer pour confirmation** : parts en lecture, « Un lien par personne, valable 30 jours : Mona Lys
   et Sami Kader confirment ou contestent. PDS Éditions, c'est vous. » (+ « Même lien qu'avant… »),
   « Envoyer pour confirmation » / « Modifier avant l'envoi ».
3. **Confirmer la répartition** (Mona et Sami, liens) : tableau « Confirmations · personnes ×
   versions » (Confirmé / Contesté / En attente), liens avec « Copier le lien », « Relancer »,
   « Nouveau lien », « Révoquer l'accès » ; « Une contestation revient ici, avec son motif. ». Une
   contestation : v2 à proposer, motif en tête de l'étape.

**App.** Ligne « Titres » du Suivi → `tracking/split-panel.tsx`, `split-editor-inline.tsx`,
`splits/*` (`split-editor.tsx`, `split-card.tsx`, `split-actions.tsx`, `split-version-changes.tsx`) ;
page `/legal/splits` ; `lib/legal/splits/*` (`shares.ts` dix-millièmes, `title-split.ts` point de
départ depuis la fiche du titre) ; SQL `propose_split_version`, `save_split_draft`,
`new_split_confirmation`, `respond_split_confirmation`, `consolidate_split_version`, liens stables
(`20261012100601`).

**Écart : proche, DIFFÉRENT sur les liens.** Règles identiques (100 % exact, versions, liens stables,
contestation motivée, comparateur). Différences : liens affichés une fois (E6), pas d'envoi par PDS OS,
pas de tableau personnes × versions tant que ce n'est pas fini (l'app : `SplitVersionChanges`) → **S** ;
pré-remplissage « Parts égales » / depuis la fiche du titre : EN TROP par rapport au proto (« PO ne propose
jamais de part »), mais vient d'un retour de Sacha du 05/10 (point de départ depuis la fiche) : garder.
Mention de la part déclarée dans la fiche (« a indiqué 50 % ») : MANQUANTE → S. Page `/legal/splits` :
EN TROP. Pas de migration hors liens (E6).

### E10. Démarche « Déclaration SACEM « Néons » » (`sacem`)

**Proto.** Pourquoi : « Le bulletin 725, rempli depuis le dossier et le master final, vérifié avant
d'être généré, signé par les créateurs et l'éditeur, puis déposé. » Prérequis « ✓ Fiche de Sami Kader,
✓ Répartition…, ✓ Emprunt…, ○ Master final · Master · attendu le Sam. 21/11/2026 » ; échéance « Calculé :
15 jours avant la sortie ». Quatre gestes :
1. **Préparer le bulletin** : « L'œuvre » (Titre, Interprète, **Durée « En attente du master final · Jamais
   une durée de brouillon : lue au master final »**, Territoires « Monde · Brief de cadrage ›
   Distribution », Arrangement « Autorisé par la licence de l'emprunt »), « Genre * » (liste, « Obligatoire
   pour la SACEM »), « Première exploitation » (« Calculé : date de sortie »), « Lieu de la première
   exploitation » (« Distribution »), case « Je confirme la première exploitation » ; « Créateurs et
   éditeur » (Créatrice Mona Lys · IPI · Fiche artiste ; Créateur « Samir Kader (Sami Kader) · compositeur ·
   IPI · Sa fiche de renseignements » ; Éditeur PDS Éditions · seul éditeur ; Rubrique G « Contrat
   d'édition de Sami Kader signé le … ») ; « Parts DEP / DR » (« Rubrique D : partage des droits * » :
   « Comme les parts Phono » / « Partage égal du Règlement général de la SACEM » ; tableau DEP / DR par
   ayant droit « proposé 50 % depuis la répartition v1 » ; case « J'ai vérifié les parts du bulletin : la
   répartition de l'édition et les parts SACEM sont deux choses distinctes ») ; **« Avant de générer » en
   trois colonnes** Bloquant (Genre, Durée, Rubrique G, total ≠ 100) / À confirmer (Parts DEP / DR,
   Première exploitation) / Facultatif (Sous-titre, ISWC) ; « Générer la version à signer » (refus :
   « Pas encore : 2 points bloquants et 2 à confirmer. Un brouillon reste possible. ») et **« Générer un
   brouillon »** (« Bulletin_725_Neons_BROUILLON.pdf · BROUILLON — informations manquantes · ne se signe
   pas »).
2. **Recueillir les signatures** : la carte du bulletin passe en tête (« Bulletin_725_Neons_v1.pdf ·
   Généré le … · signatures : n sur 3 », « Voir le PDF », « Télécharger », repli « Les valeurs du
   bulletin ») ; e-mail PDS OS à Mona et Sami avec leur lien (« Claire Morel signe pour PDS Éditions dans
   l'app. »), « Envoyer le bulletin à signer » ; puis « Signatures · n sur 3 » : Mona, Sami (« Envoyé à son
   lien privé le … », En attente, « Relancer », « A signé autrement » + date), PDS Éditions (DG : « Signer
   pour PDS Éditions ») ; repli « Déclarer sans toutes les signatures · Déclaration partielle, avec sa
   raison ». 3 sur 3 → passe seul au dépôt.
3. **Enregistrer le dépôt** : « Preuve du dépôt * » (+ rappel de la déclaration partielle).
4. **Enregistrer la réponse de la SACEM** (attente « La SACEM · répondre à la déclaration ») : Enregistrée
   (« Identifiant SACEM * », « ISWC reçu ») / À corriger (« Champ à corriger », « Ce que la SACEM demande * »
   → seul ce champ se rouvre, nouvelle version et nouvelles signatures) / Rejetée (« Motif du rejet * » →
   « Préparer une nouvelle déclaration »).

**App.** Ligne « Titres » → `FormalityCard` (`components/legal/formalities/*` : `dossier-form.tsx`
pas à pas `DossierStepChips`, `dossier-recap.tsx` Récapitulatif confirmé / proposé / manquant,
`creator-card.tsx`, `publisher-row.tsx`, `dep-dr-preview.tsx`, `signatures-list.tsx`, `steps-panel.tsx`) ;
page `/legal/formalities` ; `lib/legal/formalities/*` (définition `SACEM_725_EDITED_WORK`, `prefill.ts`,
`sharing-rule.ts`, `field-errors.ts`, `timeline.ts`, `bulletin-pdf.ts` avec `pdf-lib` sur le formulaire
officiel), `/api/legal/formalities/[formalityId]/document` ; SQL `open_formality`, `save_formality_values`,
`formality_missing`, `generate_formality_document`, `record_formality_signature`,
`declare_formality_partial`, `submit_formality`, `mark_formality_processing`, `require_formality_action`,
`complete_formality`.

**Écart : DIFFÉRENT (forme et signatures), l'app va plus loin sur le bulletin.**
- Présentation : l'app découpe en sections pas à pas + Récapitulatif + « Valider le dossier » puis
  « Générer le bulletin » ; le proto montre tout sur une page, avec la colonne « Avant de générer »
  et deux boutons. **M** (reprendre `DossierRecap` en trois colonnes Bloquant / À confirmer /
  Facultatif, cases « Je confirme la première exploitation » et « J'ai vérifié les parts », retirer les
  puces de sections).
- **Brouillon** « BROUILLON — informations manquantes » : MANQUANT (`bulletin-pdf.ts` avec filigrane,
  sans version ni signature) → **S-M**, pas de migration (document non gardé, ou ligne
  `legal_formality_documents.kind = 'draft'` : migration légère).
- **Signatures par lien privé** (e-mail, dépôt du bulletin signé par Mona et Sami) et **« Signer pour
  PDS Éditions » par la DG dans l'app** : l'app enregistre chaque signature à la main (« Enregistrer la
  signature de X » + « Comment X a signé »). → **M** (avec E7) ; `record_formality_signature` à appeler
  depuis la page privée (fonction `anon` à ajouter) et par la DG (signataire éditeur = la DG).
- Réponse de la SACEM (enregistrée / à corriger / rejetée) : **OK** sur le fond.
- Durée « En attente du master final » + « Proto : le master final est validé » : l'app lit déjà la
  durée au master final (`prefill.ts`) → OK.
- Page `/legal/formalities` : EN TROP (rediriger).
- Les champs « en plus » de l'app (éditeur qui représente quels créateurs, contrats d'édition, IPI,
  aide DEP/DR chiffrée, coédition) sont **justifiés par le ticket 06** : garder, repliés.

### E11. Factures (dans la démarche personne, côté DG et côté lien)

**Proto.** À la signature d'un contrat rémunéré, **PDS OS envoie seul** l'e-mail « « Néons » : votre
contrat est signé, vous pouvez déposer votre facture » (carte « E-mail envoyé par PDS OS » dans l'étape)
et ajoute la carte « Votre facture » au lien de la personne : « Facturer à » (raison sociale, adresse,
SIRET, TVA de PDS Records), « Montant attendu 250 € HT », « Votre facture (PDF) * », « Numéro de facture
* », « Montant HT (€) * » (écart → « Explication de l'écart * »), « Virement sur » (IBAN masqué de sa fiche,
« Mon RIB a changé » → « Nouvel IBAN * », « BIC * », « PDS vous appelle pour le confirmer avant de
payer. »), « Envoyer ma facture ». Dans l'étape (sous « Contrat signé… ») : bloc « Facture » avec pastille
Facture attendue / RIB à confirmer / À payer / Payée ; côté Lina « Ajouter une facture reçue autrement »
(fichier, numéro, montant, « Reçue le ») ; côté DG : faits (n°, Montant HT avec « Écart », Échéance « 30
jours après réception », RIB de sa fiche vs RIB de la facture), callout anti-fraude « Vérifiez-le par
téléphone avec Yanis Morel (06 …) avant de payer : c'est la fraude la plus courante. », « Comment vous
l'avez vérifié * » → « Confirmer le nouveau RIB » ; « Marquer comme payée » (« Payée le * », « Preuve du
virement * ») ; liste **« À payer »** sous Maintenant pour la DG. Contrôle « Facture de Yanis Morel ·
250 € HT » dans Prêt pour la sortie, **jamais bloquant** (ticket 08). Montant : Proposé → Accepté → Engagé
→ Facturé → Payé (`moneyOf`).

**App.** Seulement `financial_needs` (`waiting_for_invoice`, un par contrat, trigger à la signature) ;
budget du projet `budget_lines` (états planned / proposed / committed / invoiced / paid,
`attachment_file_id`) côté Budget (`components/budget/`), sans lien avec le Juridique.

**Écart : MANQUANT.** **L** (3 j). **Migration** : `legal_invoices` (ou `invoices` commune avec le Master,
qui a le même parcours dans `master-v2.html`) : besoin financier, contact, fichier (bucket privé), numéro,
montant, écart et explication, reçue le, échéance, déposée par lien ou ajoutée, RIB indiqué (chiffré),
RIB confirmé par / comment, payée le / par / preuve ; fonctions `submit_invoice` (anon, par l'espace
privé), `add_invoice`, `confirm_invoice_rib`, `mark_invoice_paid` (DG) ; `financial_needs.status`
étendu (`invoiced`, `paid`) et reflet dans `budget_lines` (une seule vérité : la ligne de budget suit
la facture). Permission « payer » : DG (`role_permissions`). Brique commune avec le Master.

### E12. Prêt pour la sortie (`ready`, section « Sortie »)

**Proto.** Pourquoi : « Calculé à chaque lecture depuis toutes les sources : le Master, les droits, les
métadonnées, les visuels et la Distribution. Seule la direction valide la sortie avant The Orchard. »
Responsable et Validation : Claire Morel (« Valide la sortie avant The Orchard ») ; prérequis « ✓ Plan
d'action · ○ Master final · Master · attendu le … · ✓ Pochette validée · Conception » ; Ensuite
« Distribution ». Sous-titre du Parcours : « Non prête · 2 points à résoudre » / « À risque · rien ne
bloque, des points à suivre » / « Sortie validée par Claire Morel ». Corps : verdict (Non prête / À
risque / Prête à sortir + explication « 2 points bloquent la livraison. ») ; **« À résoudre avant
sortie »** (bloquants ouverts) ; **« Reste à suivre »** (non bloquants ouverts et dérogations) ; chaque
ligne : « <Domaine> · Bloquant / Ne bloque pas / Fait / Dérogation », libellé, raison, « Responsable : … »,
« Prochaine action : … », « Source : … · Preuve : … », « Ouvrir », pour la DG « Accorder une dérogation »
(« Pourquoi vous accordez une dérogation * » → « la sortie passe « À risque », la dérogation reste dans
l'historique ») ; repli « Voir tous les contrôles · 6 faits sur 11 » par domaine (Master & audio, Droits &
juridique, Métadonnées, Assets & contenus, Distribution & validations) ; « Politique du label » (« Bloque la
sortie : master final absent, emprunt non sécurisé, métadonnées ou visuels manquants. SACEM : ne bloque
pas… », case « SACEM bloquante » pour la DG) ; « Valider la sortie avant The Orchard » (DG, quand plus rien
ne bloque ; sinon « La validation finale s'ouvre quand plus rien ne bloque, ou avec une dérogation. »).
Contrôles : Master final, Emprunt, Contrat de chaque personne (risque), Répartition, SACEM (selon la
politique), ISRC, Crédits du titre, Pochette validée, Facture de chaque personne payée, Facture de la
licence, Validation finale.

**App.** Carte « Prêt pour la sortie » dans le Suivi (`tracking-view.tsx` l. 456-515, `fr.legal.board.readiness` :
emprunts seuls bloquants, « Démarches ouvertes ») ; contrôle de préparation de la **Distribution**
(`lib/distribution/readiness.ts`, `checks.ts`, `sources.ts`, qui lit Catalogue, Master, Juridique,
Conception, Projet, avec « Corriger dans ») ; politique par défaut `CONTEXTE-PROJET.md` § 2 (« la Vue
d'ensemble ne marque « Bloque la sortie » que les accords non sécurisés »).

**Écart : MANQUANT comme étape ; DOUBLON potentiel avec la Distribution.** `CONTEXTE-PROJET.md` disait
« Juridique 08 relève de l'étape Livraison » ; le proto le met dans le Juridique, la DG validant avant The
Orchard, et la Distribution l'attend (`host.js` : dépendance « Juridique · Prêt pour la sortie →
Distribution »). **Décision à prendre avec la zone Distribution** : un seul calcul
(`lib/distribution/readiness.ts` est déjà l'agrégat multi-sources) montré **deux fois** (étape du
Juridique pour la décision de la DG ; contrôle de la Distribution qui la lit). **Migration** :
`release_readiness_waivers` (contrôle, motif, par, le), `release_readiness_policy` (projet ou
organisation : SACEM bloquante oui/non), `release_validations` (validé par, le, instantané des contrôles :
« snapshot auditable » du ticket 08). Effort **L** (3 j) ; pas de recalcul stocké (règle 6).

### E13. Historique du dossier

**Proto.** Vue (pas une étape) « Historique du dossier » : « Chaque geste, qui l'a fait, quand, et ce
qu'il suit. Une correction ne remplace rien : elle s'ajoute. » ; filtres « Personne » et « Partie du
dossier » ; « Exporter en CSV » ; lignes « <heure> · <qui> · <quoi> · <partie> · Suite à : <cause> » ;
bouton « ← Parcours ».

**App.** `/legal/history` (`components/legal/history/history-view.tsx`, `history-csv-button.tsx`,
`lib/legal/history/{build,causes,filter,queries}.ts`) : filtres partie, personne, mois, groupes par jour,
« Suite à … », CSV.

**Écart : OK** (le filtre par mois est EN TROP mais léger : garder). « ← Parcours » : à vérifier. S.

### E14. Gestes transverses d'une démarche

| Geste proto | App | Écart |
| --- | --- | --- |
| « Changer » le responsable / l'échéance, **« Pourquoi * »** obligatoire, « Gardé dans l'historique. La personne qui reprend est prévenue. » | `DelegateButton` + `update_legal_plan_item` (journal `legal_plan_events`, tâche déplacée) **sans motif** | DIFFÉRENT, **S**, migration : `p_reason` + colonne `reason` sur `legal_plan_events` |
| Échéance dépassée : pastille « Échéance dépassée », « Dépassée de n jours », callout « Échéance dépassée (date) : décidez de la suite, ou changez l'échéance et dites pourquoi. » | `overdue` dans le Suivi (`fr.legal.board.overdue`) | DIFFÉRENT (forme) S |
| Obsolète après correction du Cadrage | « plus nécessaire » calculé (`sources.ts`) | OK fond, forme avec E5 |
| « Apparue après le lancement » + « Contrat à prévoir » + « Ajouter au plan » | `AddedActions`, `add_legal_plan_items` | DIFFÉRENT : le contrat à prévoir se choisit à l'ajout (proto) ; S |
| Retour signé en tête de l'étape (« Claire Morel (demander des modifications) : « … » ») | partiel selon les panneaux | à homogénéiser S |
| « Déjà fait » en bas de chaque étape | journaux par branche, historique global | MANQUANT en bas d'étape : lire `loadLegalHistory` filtré par démarche, S |

### E15. Scénarios « Aller à » du proto et état équivalent dans l'app (pour la recette)

| Scénario | Ce qu'il montre | Équivalent app aujourd'hui |
| --- | --- | --- |
| `start` | Cadrage juridique, question 1/2 | `/legal/framing` OK |
| `confirm` | Confirmation, synthèse + plan qui sera généré | `/legal/confirmation` OK |
| `plan` | Contrats à prévoir + modale modèle + démarches | `/legal/plan` sans contrats à prévoir (dans le Suivi) |
| `launched` | Sami / Yanis : liens envoyés, emprunt à demander | Suivi, panneaux ; liens non revisibles |
| `direction` | DG : Valider le document (Sami), Valider les conditions (emprunt) | panneaux Contrat / Emprunt côté DG ; « À vous » sur tout |
| `refusal` | Refus des ayants droit, Retirer / Remplacer | « Enregistrer le refus », Retirer ; pas Remplacer |
| `overdue` | « Aujourd'hui 22/10 », emprunt en retard | échéance dépassée dans le Suivi |
| `correction` | Corriger le Cadrage après lancement | « Corriger », recalcul, Ajouter au plan |
| `sacem` | Bulletin à préparer, durée en attente du master | Formalité SACEM, pas à pas |
| `invoice` | DG : facture de Yanis, RIB à confirmer | MANQUANT |
| `ready` | DG : Prêt pour la sortie, Non prête | carte emprunts seulement |

> `docs/protos/tests/legal.cjs` vise l'ancien `pds-app.html` (scénarios `framing` / `running`, sélecteurs
> `#qaText`) : il ne teste plus `juridique-v2.html`. À réécrire comme cahier de recette si on veut un
> test Juridique (les scripts `scratchpad/inventory/jurshots*.cjs` en sont une base).

---

## 2. Ce qui est EN TROP dans l'app (ni dans le proto, ni demandé par un ticket récent)

1. **Pages de branche pleine largeur** `/legal/forms`, `/legal/contracts`, `/legal/splits`,
   `/legal/clearances`, `/legal/formalities` (`[[...step]]/page.tsx`, `FormsView`, `AgreementsView`,
   `SplitsView`, `ClearancesView`, `FormalitiesView`) : une démarche se fait dans son étape. À
   **rediriger** vers l'étape de la démarche (garder les URL pour les notifications et les tâches du
   Travail : `lib/legal/plan/where.ts`, `legalActionHref`). Complexifient (deux endroits pour le même
   geste).
2. **Tuiles des 4 groupes, filtres `?view=`, replis, « Suivant », cartes Personnes / Emprunts / Titres**
   du Suivi (`tracking-view.tsx`, `next-line-button.tsx`, `plan-sheet-context.tsx`, `plan-row-sheet.tsx`) :
   remplacés par le Parcours. Complexifient.
3. **Onglets** de l'emprunt (Vue d'ensemble / Échanges / Documents / Historique, `clearance-drawer.tsx`,
   `exchanges-tab.tsx`, `documents-tab.tsx`, `history-tab.tsx`) : règle 22.
4. **Éditions en modale sur l'État des lieux** (Répartir, Déclarer, Modifier le titre, Modifier les droits,
   Nouveau contrat) : à trancher avec Sacha (il vient de les garder).
5. **« Parts égales » proposées dans l'éditeur de répartition** : à garder (retour de Sacha), mais le
   proto dit « PO ne propose jamais de part » ; c'est le code qui propose, pas PO : compatible.
6. **Filtre par mois** de l'historique : léger, garder.
7. **« Affiché une seule fois »** pour les liens : devient faux avec la règle 19 (à retirer quand le
   jeton est récupérable).

## 3. Briques communes utilisées par le Juridique

| Brique | Dans l'app | Où | État pour le Juridique |
| --- | --- | --- | --- |
| Parcours, « Maintenant », étape ouverte | oui | `components/shell/journey/{journey-spine,now-card,step-panel}.tsx`, `lib/ui/journey.ts` | à étendre : sections, plusieurs acteurs, attentes externes, obsolète, marques « Échéance dépassée » / « Décision requise » |
| Fil d'Ariane, titre et faits du projet | oui | `ProjectPageTitle`, layout projet | à vérifier (autre zone) |
| Proposition « Ce que PO a compris » (faits + citations, Retirer) | oui (Juridique, emprunt) | `intake/proposal-review.tsx`, `clearance/negotiate-moment.tsx` | à unifier en un composant commun (Cadrage, Stratégie, emprunt) |
| Question « Question de PO » (une à la fois) | oui (Cadrage) | `components/framing/intel/question-screen.tsx`, `guide/step-card.tsx` | à remonter dans `ui/`/`shell/` et réutiliser au Cadrage juridique (E2) |
| Décision avec motif (Valider / Demander des modifications / Refuser) | oui, par branche | `ContractPanel`, `negotiate-moment.tsx`, modèles | à homogénéiser : motif « revient signé en tête de l'étape » (règle 6) |
| Modale verre | oui | `FormDialog`, `ConfirmDialog` | « Nouveau modèle de contrat » à faire dedans |
| Carte « L'e-mail que PDS OS enverra » | **non** | — | **à créer** (Juridique : fiche, contrat, demande, licence, bulletin, facture ; Master et Production aussi) |
| Lien privé visible (Copier, Relancer, Nouveau lien, Révoquer avec motif, créé / envoyé / ouvert) | partiel (`OneTimeLinksProvider`, liens une fois) | `fiche-panel.tsx`, `split-actions.tsx` | **à créer** en brique `PrivateLinkCard` après jeton récupérable |
| Page privée réunie « Ce que PDS attend de vous » | non (pages séparées `/f/`, `/s/`, `/m/`, `/p/`) | — | **à créer** (zone pages privées) |
| Document en tête (fichier, version, Voir le PDF, valeurs sourcées, « Changé depuis la v1 ») | partiel | `ContractValueList`, `FormalityCard`, `/api/contracts/[id]/document` | à composer en `DocumentCard` |
| Dépôt de fichier + preuve | oui | `ContractProofSlot`, `FileDropZone`, `FilePickField` | OK |
| Cartes de choix « Recommandé » | oui | `ChoiceCards` | non utilisées par le proto Juridique |
| Pages privées triées (récentes en haut) | non | — | à faire avec la page réunie |
| Historique filtrable + CSV | oui | `components/legal/history/*` | OK ; « Déjà fait » par étape à brancher dessus |
| Facture par lien, RIB, paiement | non | — | **à créer**, commune avec le Master |
| Prêt pour la sortie / readiness | partiel | `lib/distribution/readiness.ts` | à partager avec la Distribution |

## 4. Simulations « Proto : … » du Juridique et le vrai événement

| Proto | Vrai événement dans l'app |
| --- | --- |
| « Voir comme » Sami / Yanis / Mona (lien) | la personne ouvre son lien privé `/f/<jeton>` (et `/s/`) ; ouverture notée (`note_legal_form_opened`), « Ouvert ≠ fait » |
| « Remplir avec un exemple » (fiche), « Compléter avec un exemple » (Cadrage), « Coller un exemple » (réponse des ayants droit), « Remplir avec un exemple » (clause, motif, résultat SACEM, facture) | saisie réelle (ou dictée `VoiceFieldControl`) ; rien à coder |
| « Proto : faire arriver leur accord » / « … un refus » | e-mail des ayants droit reçu **dans le fil de la demande** sur la boîte de PO (Gmail OAuth, lecture), rattaché à l'emprunt, lu par PO (`readClearanceMessage`) → conditions proposées ; recours actuel : coller la réponse |
| « Proto : faire arriver la licence signée » | pièce jointe de l'e-mail de retour déposée dans l'étape, l'e-mail faisant preuve ; recours : dépôt manuel signé + preuve (existe) |
| « Proto : le master final est validé » | validation du Master final dans le workflow Master (zone Master) → durée du bulletin (`prefill.ts`) et contrôle « Master final » |
| Dépôt du contrat signé par Sami (« Envoyer mon contrat signé ») | dépôt par la page privée (fonction `anon` à créer, E7) |
| Signature du bulletin par Mona / Sami par lien | dépôt du bulletin signé par la page privée (à créer, E10) |
| Facture déposée par Yanis | dépôt par la page privée (à créer, E11) |
| « Envoyé par PDS OS à … » (fiche, contrat, demande, licence, bulletin, e-mail de facture), « Relancer » | envoi serveur (outbox + fournisseur / SMTP Workspace de PO), point à trancher |
| « Aujourd'hui » simulé au 22/10 (`overdue`) | date réelle (Paris) |

## 5. Découpage en sous-lots (chacun livrable et testable seul)

1. **J1 — Parcours du Juridique comme le proto** (L, ≈ 3-4 j, sans migration). Étendre `lib/ui/journey.ts`
   et les trois composants communs (sections, acteurs multiples, attente externe, obsolète, marques) sans
   casser la Production ; `legalJourney` : une étape par démarche lancée ou proposée (depuis
   `legal_plan_items` / `board.ts`), « Prêt pour la sortie » en section « Sortie » (contenu actuel de la
   carte en attendant J9) ; acteurs justes (CP agit, DG valide) ; route `/legal/d/<clé>` qui affiche le
   panneau actuel en corps d'étape ; redirections `/legal/tracking`, `?ligne=`, pages de branche ; « Déjà
   fait » depuis l'historique filtré. Test : naviguer les 11 scénarios, notifications et tâches du Travail
   qui ouvrent la bonne étape. *Risque* : liens des notifications et tâches (`where.ts`), Vue d'ensemble
   et Travail qui lisent `steps`.
2. **J2 — Cadrage juridique aligné sur le Cadrage** (M, 1-1,5 j, sans migration) : E2 (encadré « Question
   de PO », surtitre domaine · état, cartes par domaine avec « Répondre / Corriger », « Questions que PO ne
   pose pas », citations dans les réponses, « Retirer » en texte) ; E1 (intertitres, note) ; E3 (mots).
3. **J3 — Plan d'action** (L, ≈ 3 j, migration `legal_agreement_needs` : motif de « Pas d'accord », clé
   avant contact ; `launch_legal_plan` exige les contrats confirmés). Contrats à prévoir dans l'étape,
   modale « Nouveau modèle de contrat » (import + PO existants), validation / refus du modèle par la DG
   dans l'étape, démarche personne « fiche puis contrat », source des échéances, délégation avec motif
   (migration `legal_plan_events.reason`). *Risque* : plans déjà lancés (la cartographie déjà faite reste
   valable) ; personnes sans contact.
4. **J4 — Liens privés revisibles** (M, 2 j, migration : jeton chiffré récupérable sur `legal_forms` et
   `legal_split_confirmations`, `revoked_reason/by`). Brique `PrivateLinkCard` (Copier, Relancer = e-mail
   ou copie, Nouveau lien, Révoquer avec motif, états). *Risque* : sécurité (clé de chiffrement serveur,
   jamais au client ; anciens jetons non récupérables → « Nouveau lien »).
5. **J5 — Envoi par PDS OS** (L, ≈ 3 j, migration `outbound_emails`, dépend du choix fournisseur / SMTP
   Workspace : `CONTEXTE-PROJET.md` § 2). Carte « L'e-mail que PDS OS enverra » commune ; branchée sur la
   fiche, le contrat, la demande d'emprunt, la licence, le bulletin, l'e-mail de facture ; « Je l'ai remis
   autrement » gardé. *Risque* : quotas d'envoi, adresse d'expédition, consentement RGPD.
6. **J6 — Démarche personne complète** (M-L, ≈ 2-3 j, migrations : correction sur place d'une valeur de
   fiche `correct_contact_legal_detail`, revue explicite de la fiche si tranchée, `contact_bank_details`
   confidentiel). Contrat « document en tête », correction sur place, clause dans l'étape, « Changé depuis
   la v1 », retour de la DG en tête, rémunération à confirmer et RIB dans la fiche.
7. **J7 — Page privée réunie** (L, 3-4 j, migration `private_spaces` + fonctions `anon` de dépôt). Fiche,
   contrat à signer, répartition, bulletin SACEM à signer sur un seul lien par personne, ordre inversé,
   « Ce que PDS attend de vous ». À coordonner avec le Master (`/m/`) et la Production (`/p/`). *Risque* :
   anciens liens `/f/` et `/s/` à garder valides.
8. **J8 — Emprunt** (M, 2 j, migration : remplacement d'un élément, notification du Master). Refus →
   « Retirer » (Master prévenu) / « Remplacer et redemander » ; onglets repliés en « Déjà fait » ;
   contre-proposition en tête. (Lecture des réponses dans la boîte de PO : lot à part J8b, L, après J5.)
9. **J9 — SACEM** (M-L, 2-3 j, migration légère pour le brouillon) : page unique avec « Avant de générer »
   en trois colonnes, brouillon, envoi à signer par lien, « Signer pour PDS Éditions » par la DG.
10. **J10 — Factures** (L, 3 j, migration `invoices` + statuts de `financial_needs` + reflet budget,
    permission de payer). Commune avec le Master. *Risque* : double vérité avec `budget_lines`.
11. **J11 — Prêt pour la sortie** (L, 3 j, migrations waivers / policy / validation finale), **avec la zone
    Distribution** (un seul agrégat `lib/distribution/readiness.ts`). *Risque* : la Distribution et la Vue
    d'ensemble lisent déjà « bloque la sortie ».

Ordre conseillé : J1 → J2 → J3 → J4 → J6 → J8 → J9 → J5 (dès que le fournisseur est choisi) → J7 → J10 →
J11. J1 à J3 ne demandent rien d'externe.

## 6. Migrations à prévoir (récapitulatif)

| Lot | Migration |
| --- | --- |
| J3 | `legal_agreement_needs` : `no_agreement_reason` (obligatoire si pas d'accord), besoin possible avant contact ; `approve_contract_mapping` et `launch_legal_plan` ajustées ; `update_legal_plan_item(p_reason)` + `legal_plan_events.reason` |
| J4 | `legal_forms.token_encrypted`, `legal_split_confirmations.token_encrypted`, `revoked_reason`, `revoked_by` |
| J5 | `outbound_emails` (+ RLS projet, écrite par fonction), lien vers l'objet (fiche, contrat, emprunt, bulletin, facture) |
| J6 | `correct_contact_legal_detail(...)` ; `legal_forms.reviewed_at/by` si la revue explicite est gardée ; `contact_bank_details` (IBAN chiffré, lecture DG) |
| J7 | `private_spaces` (contact × projet, jeton chiffré, expiration, révocation) ; fonctions `anon` de dépôt (contrat signé, bulletin signé, facture) et bucket privé |
| J8 | remplacement d'un élément d'emprunt (nouvelle clearance liée ou version de l'élément) ; notification au Master |
| J9 | `legal_formality_documents.kind` (`draft`) si le brouillon est gardé |
| J10 | `invoices` (ou `legal_invoices`), `financial_needs.status` étendu, lien `budget_lines` |
| J11 | `release_readiness_waivers`, `release_readiness_policy`, `release_validations` |

Toute nouvelle table liée au projet entre dans `delete_project_row` (CLAUDE.md) et reçoit le trigger
`zz_project_live` (`docs/ARCHITECTURE.md` « Synchronisation »). Migrations à pousser en prod à la main.

## 7. Points à trancher (à signaler dans le bilan)

- **Deux ou trois colonnes** au Plan d'action (proto 2, ticket 07 et `CONTEXTE-PROJET.md` 3).
- **Revue explicite d'une fiche** (« Vérifier les réponses » → « Marquer la fiche complète ») ou
  complétude automatique (app actuelle).
- **Éditions sur place à l'État des lieux** (gardées par Sacha le 18/10) contre « se complète là où elle
  vit » (proto).
- **Prêt pour la sortie** : étape du Juridique (proto) ou contrôle de la Distribution
  (`CONTEXTE-PROJET.md` : « Juridique 08 relève de la Livraison ») ; proposition : un calcul, deux vues.
- **Fournisseur d'e-mail** et **lecture de la boîte de PO** (Gmail OAuth) : conditionnent J5 et J8b ;
  l'équipe démarre le 19/10 avec `mailto:`.
- **Qui paie** (permission) et où vit la facture (Juridique, Master, Budget).
- Grammaire du proto : « Se débloque quand la fiche de Sami Kader est fait. » → « est faite ».

## 8. Effort total estimé

≈ **30 à 35 jours** : J1 3-4 · J2 1-1,5 · J3 3 · J4 2 · J5 3 · J6 2-3 · J7 3-4 · J8 2 (+ J8b 3-5) ·
J9 2-3 · J10 3 · J11 3. Sans les lots externes (J5, J7, J8b, J10, J11) : ≈ 15 jours pour avoir le
parcours, les mots et le design du proto avec les données actuelles.
