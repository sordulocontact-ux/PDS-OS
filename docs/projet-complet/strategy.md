# Inventaire « Stratégie » — proto Projet complet ↔ app PDS OS

Sources lues : `docs/protos/src/mk.js` (STRAT_PROPS, stratItems, LEVERS/leverState, LIVRABLES, TEMPS,
BUDGET_LINES/budget(), dims(), itemRow, groupHead, addForm, dimBody, essentials, planItems, BODY_MK.st2/st3/st4
(la 2e définition de st3/st4, `Object.assign(BODY_MK,…)`, fait foi), briefDoc, onStrategyValidated, MK_STEPS
st1–st4, doneMk/actorsMk/summaryMk, prepGate/PREP_CALL.strat/prepReveal, crData/crModal, meetingOf/sumDraft/
summaryBlock, stratEntry), `mk-actions.js` (itm, itmsave, itmadd, lever, stask, stdecide, stresend, strelance,
copylink, stratgo, prepset/prepreset/prepcreate/prepconfirm/prepheld, sumsend, cr), `mk-scen.js` (stratstart,
strat, stratval), `tests/marketing.cjs` § 1. Proto parcouru en Chrome headless (captures et textes :
`scratchpad/strat_run/01…17_*.txt|png` — de la page d'entrée à « Stratégie validée », avec demande de
modification, renvoi, réserve). Ticket lu : **« TICKET — Workflow Stratégie complet »** (Drive › Ticket Stratégie
(dans projet) › « Lire le ticket Stratégie », doc `1nL7uvwQsQvJGqio_3LX3Fj9i9zFDnF5eCp4jq3FX5po` ; 22 maquettes
listées dans « Maquettes validées », non ouvertes : PNG). Docs : VISION-UX § 3–5, PROTOS § 6–7,
MARKETING-METIER « Stratégie » et « Stratégie (18/10) », ARCHITECTURE § 6 bis (+ lots 9b–9e, C1).

App lue : `app/(app)/app/projects/[projectId]/strategy/{page,brief,document/[documentId],release-plan,press-kit,
follow-up}`, `components/strategy/**` (88 fichiers), `lib/strategy/**` (≈ 95 fichiers), `lib/i18n/fr/strategy*.ts`
(14 fichiers), migrations `*strategy_*` (13), `lib/ui/marketing-steps.ts`, `lib/work/next-action.ts`.

Légende écart : **OK** · **DIFFÉRENT** · **MANQUANT** · **EN TROP**. Effort : S (< ½ j), M (1–2 j), L (> 2 j).
Origine d'une fonction de l'app : *ticket § n* (ticket Stratégie), *MKT-S1-xx / MKT-C2-xx* (retours Drive d'Ibé
des 11 et 12/10), *code seul* (aucune demande retrouvée).

---

## 0. Forme générale : le patron de parcours

| | Proto | App |
| --- | --- | --- |
| Écran | Patron VISION-UX § 4 : chevrons Marketing, titre « Stratégie », ligne projet (Néons · Mona Lys · Single, Budget, Responsable, Sortie), « Qui fait quoi », carte **Maintenant**, **Parcours · Stratégie** à gauche (4 étapes), **étape ouverte** à droite (titre + pastille, pourquoi, Exécute / Coordonne / Valide / Prérequis / Ensuite, contenu, « Signaler un blocage », « Noter une information »). Fil d'Ariane « Néons › Marketing › Stratégie › <étape> ». | Page `/strategy` sans parcours : d'abord `StrategyEntry` (carte), puis titre « Stratégie de lancement » + boutons (Dicter, Préparer un brouillon, Proposer des réponses, Préparer un échange) + pilotage en accordéon (`StrategyPilotage` / `AccordionSteps`, `?d=`) + `BriefEntry` ; colonne de droite : `StrategyValidationCard` ou `ValidationPanel`, `BriefReminder` (rappel du Brief de cadrage), `ImportPanel`. Le Brief et sa validation sont une **autre page** `/strategy/brief` (+ aside `BriefValidationAside`). |
| Étapes | `st1` Démarrer la stratégie / Échange stratégique / Départ · `st2` Les 8 dimensions · `st3` Validation du Brief de sortie · `st4` Stratégie validée | Aucune notion d'étape ; l'état vient de `stages.launch_strategy` (not_started / in_progress / validated) + `strategy_workspaces` + `strategy_documents`. |
| Maintenant / actions | `actorsMk` : « Démarrer la stratégie », « Préparer / Tenir l'échange stratégique », « Confirmer ou écarter n propositions de PO », « Arbitrer : <dimension> », « Compléter : <dimension> », « Demander la validation du Brief de sortie », « Valider le Brief de sortie » (par valideur), « Répondre et transmettre à nouveau ». Résumés : « Échange du 05/10 » / « Commencée directement », « Brief de sortie établi · n réponses confirmées », « Brief de sortie — V1 validé », « Brief V1 · Plan de sortie et Dossier de presse à générer ». | `lib/work/next-action.ts` : une seule action grossière `build_strategy` (lien `/strategy`) puis la validation (lien `/strategy/brief`). Pas de « n propositions », pas de « Arbitrer : … ». |
| Verrou | Étapes verrouillées visibles (« Après : … »), prérequis « Cadrage › Plan du projet ». | Pages pleines `StrategyNeedsFraming` ou `WorkflowLocked` (`workflowGate`). |

**Écart : DIFFÉRENT (structure). Effort M** (≈ 2 j) : `lib/strategy/journey/` (steps, actors, summaries, sur le
modèle de `lib/production/journey/`) + `components/shell/journey/{now-card,journey-spine,step-panel}` sur
`/strategy`. Pas de migration (tout se calcule depuis `strategy_workspaces`, `strategy_calls`, `field_values`,
`levers`, `strategy_documents`, `strategy_document_reviews`). `/strategy/brief` devient le panneau de l'étape
`st3` (garder la route pour les notifications `strategy_review_*`, `?v=n` et `next-action`). Garder `?d=` pour
déplier une dimension dans `st2` (liens du Planning `?d=calendar`, `routes.projectStrategyDimension`).

---

## 1. Étape `st1` « Démarrer la stratégie » (page d'entrée, ticket § 1)

### Proto
- Titre d'étape « Démarrer la stratégie », pastille « En cours ». Pourquoi : « Commencer directement, ou préparer
  un échange avec l'équipe ; ce qui y sera dit deviendra des propositions, dimension par dimension. » Exécute :
  Lina Haddad (Responsable du projet), Valide : Aucune validation, Prérequis : ✓ Cadrage › Plan du projet,
  Ensuite : Les 8 dimensions.
- Faits : **Projet** « « Néons » · single de Mona Lys », **Sortie** « Sam. 05/12/2026 », **Statut** « Stratégie non
  commencée ».
- Deux cartes de choix (`choices2`, sans « Recommandé ») : **« Commencer la stratégie »** — « Directement sur les 8
  dimensions, avec ce que PDS OS sait déjà. » ; **« Préparer un échange »** — « Un call avec l'équipe ; PO en tire
  des propositions pour chaque dimension. »
- Lecteur (DG…) : « En attente de Lina Haddad : démarrer la stratégie ».
- Gestes : `stratgo po` → items vides, journal « Stratégie commencée directement », bandeau « Stratégie commencée »,
  `st1` devient « Départ » (fait, résumé « Commencée directement ») ; `stratgo call` → toast « Préparez l'échange. »,
  l'étape devient « Échange stratégique » avec le formulaire (§ 2). Le choix est affiché « Départ : Préparer un
  échange · choisi par Lina Haddad le 01/10, 09:09 » avec **« Changer »** tant que rien n'est créé.
- Une fois fait : « Départ : Échange stratégique du Lun. 05/10/2026 à 14:00 [Lire le compte rendu] » ou
  « Commencée directement par … le … », et le **Résumé pour les participants** (§ 4) au-dessus.

### App
- `components/strategy/strategy-entry.tsx`, `start-strategy-form.tsx`, `strategy-call-sheet.tsx` ;
  `lib/strategy/actions/start.ts` (`start_strategy`, migration `20261010000401_strategy_calls`,
  table `strategy_workspaces`) ; textes `lib/i18n/fr/strategy-entry.ts`.
- Carte « Stratégie de lancement » + texte « Construisez la stratégie de la sortie avec PO… », `FactList` :
  Projet, Artiste, Type, Date de sortie (« Pas encore fixée »), Statut (badge « Non commencée ») ; « PO s'appuie sur
  le Brief validé et n comptes rendus » ; deux **boutons** : « Préparer un échange » (principal, Sacha 14/10) et
  « Commencer la stratégie » (contour). Lecteur : « Le chef de projet responsable mène la stratégie ; vous la suivez
  ici dès qu'elle commence. »

### Écart
- **DIFFÉRENT** (design et mots) : boutons au lieu de cartes de choix, ordre inversé, titre « Stratégie de
  lancement » au lieu de l'étape « Démarrer la stratégie », Statut « Non commencée » vs « Stratégie non
  commencée », Artiste/Type en plus (conformes au ticket § 1 « projet, artiste, type, date de sortie et statut » :
  **garder**, le proto les résume en une ligne). Lecteur : phrase au lieu du `waitRow`. **S**.
- **MANQUANT** : « Départ … choisi par … le … » + « Changer » (rien n'est stocké avant la création de l'échange ;
  on peut le dériver : `strategy_calls` existe → échange, `strategy_workspaces.started_by/at` → direct ; « Changer »
  = refermer le formulaire tant qu'aucun call n'est créé). **S**, sans migration.
- **MANQUANT** : l'échange **prévu** n'apparaît pas dans la Stratégie (après « Créer l'échange », redirection vers
  la page du call `routes.projectCall`, l'entrée reste vide). Proto : « Échange prévu · Lun. 05/10/2026 à 14:00 ·
  Visio · créé par … », « Lien de la visio », Participants, Ordre du jour, « L'échange s'enregistre dans PDS OS. À la
  fin, PO propose ce qui a été dit, point par point, avec la phrase exacte. » **S** (lire `strategy_calls` + `calls`).
- Point de proto à corriger : après « Commencer la stratégie », toutes les dimensions sans élément affichent
  « Rien n'a été dit sur ce point pendant l'échange. » alors qu'il n'y a pas eu d'échange (texte à remplacer par
  « Rien de renseigné pour l'instant »).

---

## 2. Préparer l'échange stratégique (formulaire de call commun, récapitulatif)

### Proto (`prepGate("strat")`, `PREP_CALL.strat`, gestes `prepwhoadd/del/new`, `prepagadd/del/save`, `agmove`,
`prepcreate`, `prepconfirm`)
- Dans l'étape, bloc **« Nouvel échange »**, dans l'ordre d'une invitation :
  1. **Participants \*** en pastilles préremplies par fonction depuis « Qui fait quoi » (Projet : Lina Haddad,
     Direction : Claire Morel, Création : Nadia Benali), × pour retirer, champ à la Teams (Entrée ajoute, Retour
     arrière retire), Réseau proposé, adresse → « Inviter … » (fiche créée), nom inconnu → modale « Créer la fiche ».
     Erreur : « Un call réunit au moins deux personnes. »
  2. **Date \*** · **Heure \*** · **Format** (Visio / Sur place). Erreurs « Choisissez la date. » / « Et l'heure. »
  3. **Ordre du jour** prérempli des **8 dimensions** (une par point), modifiable sur place (crayon, Entrée/Échap),
     retirable, déplaçable (poignée, flèches), « Ajouter un point » + « Ajouter » ; « L'ordre du jour est vide. »
  4. **Envoyé avec l'invitation** : Objectif « Cadrer la sortie de « Néons » : positionnement, publics, narratif,
     dispositif, livrables, calendrier, budget et objectifs. », Documents « Brief de cadrage validé · Fiche artiste
     de Mona Lys », Sujets « Les 8 dimensions de la Stratégie, une par point de l'ordre du jour ».
  5. **« Voir le récapitulatif »** → « Récapitulatif avant création » (Quand, Participants, Ordre du jour, Objectif,
     « Les invitations partent à la confirmation. ») → **« Confirmer et inviter »** / **« Modifier »** (garde la
     saisie). Bandeau « Échange stratégique créé », journal « Stratégie : échange stratégique créé pour le … ».
- Ensuite l'étape montre l'échange prévu (§ 1) et le bouton de simulation.

### App (`components/strategy/strategy-call-sheet.tsx` → `components/calls/prepare-call-sheet.tsx`,
`strategy-call-form.tsx`, `lib/strategy/call-prep.ts`, `lib/strategy/actions/call.ts` → RPC
`create_strategy_call`, table `strategy_calls` (purpose, format, participants, document_ids), composants partagés
`ParticipantsField`, `AgendaTopicsField`, `CallFormatField`, `CallFields`, `CallRecap`, `CallFormActions`)
- **Panneau latéral** (sheet) « Préparer un échange » : « PO a préparé l'échange à partir de ce qui manque à la
  stratégie. » Ordre : **Objectif de l'échange** (textarea modifiable, « Décider de la stratégie de sortie : … »),
  **Sujets à aborder** calculés depuis **ce qui manque** (questions précises : « Quel levier pour « X » ? », « On
  retient « X » ? »…, 4 min par question, durées modifiables, sujets cochables, sujets ajoutés), **Participants**
  (responsable, directeurs créatifs, **artiste**), **Format** (Visio / Sur place / **Téléphone**, aide
  d'enregistrement), titre + date/heure (`CallFields`). « **Vérifier** » → « Récapitulatif » (« Rien n'est créé tant
  que vous n'avez pas confirmé. ») → « **Créer l'échange** » / « Modifier ». Le serveur **recalcule** l'ordre du jour
  (jamais envoyé par le client). Puis redirection vers la page du call.

### Écart
- **DIFFÉRENT** (parcours, ordre, mots) : panneau au lieu du formulaire dans l'étape ; ordre objectif → sujets →
  participants → format vs participants → date → ordre du jour → ce qui part ; « Vérifier / Créer l'échange » vs
  « Voir le récapitulatif / Confirmer et inviter » ; ordre du jour = ce qui manque (questions) vs les 8 dimensions
  déplaçables ; objectif modifiable vs « Envoyé avec l'invitation » en lecture ; pas de « Documents » joints (la
  colonne `strategy_calls.document_ids` existe) ; pas de « Les invitations partent à la confirmation » (l'envoi
  d'invitations dépend du branchement Google Workspace, CLAUDE.md « Décisions en attente »).
- C'est une **brique commune** (Cadrage, Stratégie, Conception, Production, Master : PROTOS § 6 « préparation d'un
  call … partout ») : à faire **une fois** dans `components/calls/` puis brancher la Stratégie. Côté Stratégie seule :
  **S** ; brique commune : **M** (autre zone probablement).
- Risque : rendre l'ordre du jour éditable et ordonné contredit « le serveur recalcule l'ordre du jour » ; accepter
  la liste du client validée par zod (libellés courts, 1 à 20 points). Pas de migration (agenda déjà stocké sur le
  call ; vérifier la colonne de `calls`).
- Choix à trancher : les sujets « ce qui manque » de l'app (ticket § 1 : « PO réutilise les informations connues
  pour proposer … les sujets à aborder ») sont plus fidèles au ticket que « les 8 dimensions » du proto. Proposition :
  garder les 8 dimensions comme points, et sous chaque point les questions de ce qui manque (texte de
  `strategyCallTopics`).

---

## 3. L'échange a lieu → compte rendu → propositions (simulation)

### Proto
- Bouton pointillé **« Proto : l'échange a eu lieu, compte rendu reçu »** (`prepheld`) : `prepReveal("strat")`
  crée les 10 propositions `STRAT_PROPS` datées « Échange stratégique du 05/10 », toast « Compte rendu reçu : PO
  propose ce qui a été dit. », `st1` devient faite, `st2` s'ouvre.
- **Compte rendu** (modale `crModal`, bouton « Lire le compte rendu » dans `st1` et en tête de `st2`) : « Compte rendu ·
  Échange stratégique », Date, Format (« Visio · 48 min »), Participants (fonction : nom), Source « Enregistré dans
  PDS OS, transcrit, puis rangé par PO » ; puis **un bloc par point de l'ordre du jour** (« 1. Positionnement »…)
  avec chaque phrase citée, ce qu'elle est devenue (« Devenu : « … » ») et son sort (Confirmé par X / Corrigé et
  confirmé par X / Écarté par X / À confirmer) ; point sans rien : « Rien n'a été dit sur ce point. » ; « Ajouté
  après la réunion » ; « Les phrases sont citées telles quelles. Ce qui fait foi, ce sont les décisions confirmées
  dans l'étape. »

### App (vrai événement)
- Le call est créé, enregistré dans PDS OS (`components/calls/call-recorder.tsx`, parties toutes les 20 s,
  `call_recording_takes/_pieces`) ou un audio importé / des notes saisies, transcrit (Groq,
  `lib/ai/transcribe.ts`), compte rendu (`call_reports`, `report_items`), puis `/api/calls/[callId]/extract` →
  `fillStrategyFromCall` / `importReportIntoStrategy` (`lib/strategy/import-report.ts`) : propositions sourcées
  (citation, minutage) pour **positionnement, publics, narratif** (`field_values` « proposé ») et **leviers**
  (`levers.review_status = 'proposed'`, état « à arbitrer »), puis `proposeStrategyChoices` (choix pré-cochés). Seul
  le premier compte rendu est importé ; l'entrée cède la place (`start_strategy`).
- Compte rendu : page `/app/calls/[callId]/report` (`components/calls/closure/report-view.tsx`) : Résumé,
  Décisions, Actions, Points ouverts ; clôture et partage (`call_closures`, `call_report_shares`).

### Écart
- Simulation → remplacée par : **call enregistré + transcription + compte rendu + extraction** (existe). **OK** sur
  le principe.
- **MANQUANT** : PO ne propose **ni livrable, ni temps fort, ni objectif/KPI** depuis un call (règle écrite dans
  ARCHITECTURE § 6 bis : « Jamais de temps fort ni de livrable proposé »). Le proto propose « Clip officiel, en 16:9 et
  en 9:16 », « Teasers × 4 », « Pochette », « Sortie du clip une semaine après le titre » (J+7), « 200 000 streams à
  4 semaines ». Le ticket le demande (« Les appels, transcripts, comptes rendus … peuvent préremplir plusieurs
  dimensions ») et la règle 11 l'autorise si le code recopie et vérifie (`lib/ai/verbatim.ts`, `said-date.ts`).
  **L** : schéma d'extraction (`lib/ai/schemas/`), nouveaux `report_items.kind` (`deliverable`, `milestone`,
  `objective`), **migration** : `review_status` (proposed/confirmed/rejected) + `source_type`, `source_report_item_id`,
  `source_quote`, `source_start_seconds` sur `strategy_deliverables`, `milestones`, `strategy_objectives` (comme
  `levers`), `strategy_deliverables.lever_id` **nullable** (la Pochette est « Hors levier » dans le proto ; l'app
  l'interdit). Point à trancher : un jour relatif dit (« une semaine après le titre ») converti par le code en J+7 —
  règle 6 (« jamais une date par l'IA ») : le code calcule depuis la phrase citée, sinon le temps fort reste sans date
  « à préciser ».
- **DIFFÉRENT** : compte rendu en page à part, par rubriques (Résumé/Décisions/Actions), sans le sort de chaque
  phrase dans la Stratégie, au lieu d'une modale par point de l'ordre du jour. **M** (vue « compte rendu d'un
  échange préparé » commune aux réunions, autre zone probable) ; côté Stratégie : bouton « Lire le compte rendu » dans
  `st1`/`st2` (**S**).

---

## 4. Résumé aux participants (dans `st1`, après tri)

### Proto (`meetingOf/sumDraft/summaryBlock/sumsend`)
- Dès que toutes les propositions sont tranchées : bloc **« Résumé pour les participants »** dans `st1` :
  « Préparé par PO à partir de ce qui a été tranché, sans les phrases citées ni ce qui a été écarté. Relisez et
  corrigez avant d'envoyer. » Champ **Message** prérempli :
  « Bonjour à tous, / Merci pour l'échange du 05/10. Voici ce qui a été décidé. / Ce que nous retenons : — <Dimension> :
  <texte> … / Prochaine étape : — Le Brief de sortie part en validation auprès de Claire Morel. / Lina Haddad » (le
  **Budget stratégie** est exclu). **Destinataires** = participants (pastilles), « L'équipe le reçoit dans PDS OS. »
  (externes : « sur son lien privé » / « par e-mail »). « **Envoyer aux participants** ».
- Après : « Résumé envoyé aux participants » + pastille « Envoyé · version 1 », le texte, « Envoyé par … le … à 3
  participants. », « **Corriger et renvoyer** » (version 2, précédentes gardées). Bandeau « Résumé envoyé à
  l'équipe » / « Résumé envoyé, dont n externe(s) ». Lecteur : « En attente de … : envoyer le résumé de la réunion ».

### App
- Rien dans la Stratégie. Équivalent le plus proche : « Partager le compte rendu » sur la page du call
  (`components/calls/closure/share-report-form.tsx`, `call_report_shares`) : portée « complet / synthèse » (résumé et
  décisions **du compte rendu**, pas du tri), membres prévenus, externes par **mailto** + PDF.

### Écart
- **MANQUANT** (dans l'étape) / **DIFFÉRENT** (le partage existant ne part pas de ce qui a été tranché, garde les
  formulations de l'IA, n'exclut pas l'écarté ni le budget, n'envoie pas lui-même aux externes — règle 19).
  **M**, brique commune avec la Production (call de production). **Migration** : table `meeting_summaries` (ou
  `call_summaries`) : `call_id`, `version`, `body`, `recipients` (personnes/contacts), `sent_by`, `sent_at` ;
  notification aux membres par trigger ; e-mail aux contacts quand le SMTP de PO est branché.
- Point de proto : « Prochaine étape … auprès de Claire Morel » oublie la directrice créative quand elle valide aussi
  (texte calculé depuis `holder("direction")` seul).

---

## 5. Étape `st2` « Les 8 dimensions » (ticket § 2 à 7)

### Proto — en commun
- Pourquoi : « Ce que l'échange a fait dire, rangé par dimension. On confirme, on corrige ou on écarte, on ajoute ce
  qui manque : plus rien « à arbitrer » ni « à compléter ». »
- Faits : « Échange stratégique · Lun. 05/10/2026 à 14:00 · Visio · Lina Haddad, Claire Morel, Nadia Benali »,
  « Compte rendu · Lire le compte rendu » (ou « Départ · Commencée directement, sans échange : ajoutez ce que vous
  savez dans chaque dimension »).
- Encadré PO : « PO a rangé dans chaque dimension ce qui a été dit pendant l'échange, avec la phrase exacte.
  Confirmez, corrigez ou écartez chaque proposition, et ajoutez ce qui manque : rien n'entre dans la Stratégie sans
  vous. »
- Compteur : « **n complétées · n à arbitrer · n à compléter** » (+ « · la Stratégie est figée pendant la
  validation »).
- Une **carte repliable par dimension** (`versionCard`), dépliée tant qu'elle n'est pas complète : titre, pastille
  (« À compléter » / « **À trancher** » / « Complété »), compteur « n à confirmer » ou « rien de dit ».
- **Une proposition = une ligne** (`itemRow`) : texte en gras, « « citation » · Échange stratégique du 05/10 »,
  boutons **Confirmer** (contour) · **Modifier** · **Écarter** ; après : pastille « Confirmé » + Modifier + Écarter,
  ou « Écarté » (texte barré) + « Confirmer » ; « Confirmé par / Écarté par Lina Haddad ». **Modifier** ouvre le champ
  sur place, « Proposé : <texte d'origine> » dessous, Entrée enregistre (= confirmé, « Modifié par Lina Haddad »),
  « Annuler ». Erreur : « Écrivez le texte. »
- **« Ajouter … »** dans l'en-tête de chaque groupe (règle 17), formulaire juste dessous : « Ajouter » / « Annuler »,
  l'ajout est « Saisi par … », confirmé d'office. Erreur : « Écrivez ce qu'il faut ajouter. »
- Rien ne se coche d'avance (test : 0 case cochée). Toast = verbe du bouton (« Retenu », « Écarté », « Modifié et
  retenu », « Ajouté ») ; quand la dernière dimension se complète, bandeau « Brief de sortie établi ».
- Lecture seule pour tout autre rôle et pendant la validation (`stratFrozen`), réouvert sur « Demander une
  modification ».

### Proto — par dimension (données « Néons »)
| Dimension | Contenu proto | Ajouter |
| --- | --- | --- |
| Positionnement | « Conquérir un nouveau public » (citation) | « Ajouter une réponse » (champ « Positionnement \* ») |
| Publics prioritaires | « Cœur de cible : 18–24 ans qui écoutent du R&B alternatif » | « Ajouter un public » |
| Narratif de sortie | « Une nuit blanche à Paris, entre deux lumières » | « Ajouter un angle » |
| Dispositif | Les 9 leviers toujours listés : Social organique / Pitching playlists / Clip-contenus vidéo « Retenu » (source « Brief de cadrage › Besoins ») ; Influence et Relations presse = propositions de PO (ligne Confirmer/Modifier/Écarter, nom du levier en surtitre) ; Publicité en ligne et Live/showcase « À arbitrer » (source = citation du Cadrage) avec **« Retenir » / « Ne pas retenir »** ; Radio et Partenariats « Non retenu » (« Leviers courants »). Après arbitrage : « · retenu par Lina Haddad ». État dimension : à arbitrer tant qu'un levier l'est. | « Ajouter un levier » = liste des leviers non retenus, ajouté **retenu** |
| Livrables engagés | « Clip officiel, en 16:9 et en 9:16 », « Teasers × 4, 15 s, en 9:16 », « Pochette » (propositions) | « Ajouter un livrable » : Livrable \*, Format |
| Calendrier de lancement | Temps forts du **Brief de cadrage › Calendrier** en lecture (Annonce de la sortie · Annonce, J-14, Sam. 21/11/2026 ; Premier teaser · Teaser, J-7 ; Sortie du titre · Sortie, J) + proposition « Sortie du clip une semaine après le titre » (J+7 · Sam. 12/12/2026). Puis **« Échéances amont »** : « Calculées depuis le premier temps fort de chaque livrable. Elles partent dans le Planning. » Par livrable retenu : Conception terminée le (J-21), Production terminée le (J-10), Validation le (J-4) ; sinon « Aucun livrable retenu n'a encore de temps fort. » | « Ajouter un temps fort » : Temps fort \*, Jour par rapport à la sortie \* (« Ex. : -3 pour J-3 ») |
| Budget stratégie | Tuiles **Enveloppe** 25 000 € HT (Brief de cadrage › Budget), **Proposé** (lignes des leviers retenus), **Validé** (engagé ou payé), **À arbitrer** (estimé ou devis), **Reste** (enveloppe − proposé − à arbitrer) ; lignes (Clip officiel 18 000 « Brief de cadrage › Budget « 18 pour le clip » », Influence 3 500 « Estimé par Lina Haddad », RP 1 200, Pochette 800 « Estimé par Nadia Benali », Pub 1 500) dont l'état **suit le levier** : Estimé / À arbitrer / Écartée. « Le budget reste interne : il ne figure ni dans le Plan de sortie, ni dans le Dossier de presse. » | « Ajouter une ligne » : Ligne \*, Montant estimé \* (« En euros HT ») |
| Objectifs & KPIs | « 200 000 streams à 4 semaines » | « Ajouter un objectif » |

### App
- Pilotage : `components/strategy/strategy-pilotage.tsx` (`AccordionSteps` : ligne = nom, **résumé** calculé, état
  **À compléter / En cours / À arbitrer / Complété** — `lib/strategy/dimensions.ts` `dimensionStatuses`, ton
  `strategyDimensionTone`), **une seule dimension dépliée** (`?d=`), « Terminé », lien vers le premier manque
  (MKT-S1-05) ; travail : `components/strategy/dimension-work.tsx`.
- Positionnement / Publics / Narratif : **question à choix fermés** (`StrategyChoices`, `ChoiceGrid`, texte composé
  par le code `lib/strategy/compose.ts`, « Enregistrer la réponse »), choix pré-cochés par PO (`SuggestionList` :
  « Accepter » / « Écarter » / « Tout accepter », citation « Depuis X : « … » ») ; valeur texte proposée
  (`BriefFieldCard` du Cadrage : **Confirmer / Rejeter / Modifier**) ; Positionnement **en quatre points**
  (promesse, différence, preuve, tonalité, MKT-S1-05) ; Publics **un par un** (`AudiencesSection`, segment,
  priorité, insight, canal, MKT-S1-05) ; Narratif **en 4 parties + angle** (`NARRATIVE_PARTS`, ticket § 2) +
  **synthèse du récit** (ton, longueur, répétitions/contradictions, MKT-S1-06) + « Proposer à nouveau ».
- Dispositif : `levers-section.tsx`, `lever-row.tsx`, `lever-state-control.tsx` (**trois états côte à côte**,
  un clic), « Leviers courants » (`lib/strategy/lever-presets.ts`, ajoutés « à arbitrer »), « Autre levier »,
  besoins du Cadrage « En faire un levier », prérequis juridiques (MKT-S1-07), refus de dé-retenir un levier qui a
  des livrables (`lever_has_deliverables`).
- Livrables : `deliverables-section.tsx`, `deliverable-form.tsx`, `deliverable-item.tsx`,
  `deliverable-lot-form.tsx`, `deliverables-bulk-bar.tsx` : nature, **quantité**, **levier obligatoire**,
  **responsable**, **échéance**, format, lots par levier, sélection en masse (MKT-S1-08), « Aucun livrable requis ».
- Calendrier : `calendar-section.tsx`, `calendar/milestone-form.tsx` (modale : titre, J relatif, type, canal,
  livrable, note), onglets **Temps forts / Par canal** (ticket § 5), échéances amont `upstream-chains.tsx`
  (J-21/J-10/J-4 identiques au proto, `lib/strategy/upstream.ts`), arbitrage d'une échéance passée (déplacer, ajuster
  les délais, accepter le risque — MKT-S1-04/10), « Proposer les jalons amont ». Temps forts **toujours saisis par
  une personne**.
- Budget : `budget/strategy-budget-summary.tsx`, `budget/lever-budget-table.tsx` (répartition par levier, ticket
  § 6), éditeur `components/budget/budget-lines.tsx` de la page Budget ; calcul `lib/strategy/budget.ts` :
  **proposé = toutes les lignes**, validé = engagé/payé, à arbitrer = estimé/devis, **reste = enveloppe − validé** ;
  quatre états d'enveloppe (MKT-S1-02).
- Objectifs & KPIs : `objectives-section.tsx`, `objective-form.tsx`, `kpi-item.tsx` : objectif stratégique (texte)
  + KPI quantitatif (cible, métrique, unité, échéance, responsable, source Deezer) ou qualitatif (ticket § 7,
  MKT-S1-03).
- En tête de page : `StrategyDictation` (« Dicter »), `StrategyDraftButton` (« Préparer un brouillon », MKT-S1-09),
  `ProposeChoices` (« Proposer des réponses »).

### Écarts
| Point | Écart | Effort |
| --- | --- | --- |
| Liste des 8 dimensions, états, résumé | **DIFFÉRENT** : proto = cartes dépliées tant qu'incomplètes, plusieurs à la fois ; app = accordéon une à la fois. Proto a 3 états et dit « **À trancher** » sur la pastille mais « à arbitrer » dans le compteur ; ticket et app : 4 états avec « **En cours** » et « **À arbitrer** » → **suivre l'app pour les mots** (corriger le proto). Ticket § 2 : « Au clic, la dimension s'ouvre » : les deux conviennent. | S |
| Encadré PO, faits de l'échange, compteur « n complétées · n à arbitrer · n à compléter » | **MANQUANT** | S |
| Proposition une par une (Confirmer / Modifier / Écarter, citation · source, « Modifié par », « Écarté par » barré, « n à confirmer », « Rien n'a été dit pendant l'échange ») — règle 21 | **DIFFÉRENT** : trois mécanismes selon l'objet (`BriefFieldCard` Confirmer/**Rejeter**/Modifier ; `SuggestionList` Accepter/Écarter/**Tout accepter** ; levier proposé = état « à arbitrer » sans bouton propre) ; un écarté disparaît ; pas de « rien n'a été dit ». À unifier en une ligne commune (extraire `components/design/work/proposal-card.tsx` de la Conception, déjà Confirmer / Modifier / Écarter / « Confirmer ainsi », vers `components/ui/` ou `components/shell/`). | L (avec § 3) |
| Positionnement / Publics / Narratif = liste de réponses libres + « Ajouter » | **DIFFÉRENT** : l'app pose des questions à choix fermés (`lib/strategy/choices.ts`, *code seul*, contraire au ticket « PO ne fonctionne pas comme un formulaire rigide ») avec texte composé ; 4 points du positionnement et publics détaillés (*MKT-S1-05*) ; narratif 4 parties + angle (*ticket § 2*, **absent du proto** : MARKETING-METIER « Reste … narratif en 5 parties ») ; synthèse du récit (*MKT-S1-06*). Proposition : retirer la grille de choix (EN TROP), garder narratif 5 parties comme 5 groupes avec « Ajouter » et propositions, garder publics un par un comme items (segment en texte, détails repliés) ; 4 points du positionnement : à trancher. | M–L |
| Dispositif | **DIFFÉRENT** : proto liste les 9 leviers d'emblée, prérempli « Retenu » depuis les besoins du Brief de cadrage (règle 1), « Retenir / Ne pas retenir » seulement si à arbitrer, « Ajouter un levier » = choisir parmi les non retenus. App : leviers ajoutés par presets « à arbitrer », contrôle à 3 états toujours visible, besoins « En faire un levier ». Prérequis juridiques (*MKT-S1-07*) : garder sous la liste. | M |
| Livrables | **DIFFÉRENT / EN TROP** : proto = nom + format, sans levier obligatoire, sans responsable ni échéance (ticket § 4 : « sans encore concevoir précisément les contenus »). App : levier obligatoire (**migration** `lever_id` nullable pour « Hors levier »), quantité, responsable, échéance, lots, masse (*MKT-S1-08*). Responsable/échéance n'alimentent que le plan d'exécution (EN TROP, § 8) : à masquer dans la Stratégie. | M |
| Calendrier | **DIFFÉRENT** : proto = liste lisible (date complète + J) ; temps forts du Cadrage préremplis en lecture (**MANQUANT** dans l'app : le Cadrage n'a pas de temps forts structurés, seulement `timing` texte → à trancher : PO les propose depuis le Brief de cadrage avec citation) ; pas de vue par canal ni d'édition d'un temps fort dans le proto (**demandées par le ticket § 5** : garder celles de l'app). Arbitrage d'échéance passée (*MKT-S1-04/10*) et « Proposer les jalons amont » : garder mais repliés sous « Échéances amont ». | M |
| Budget | **DIFFÉRENT (règle de calcul)** : proto « Proposé » = lignes des leviers **retenus**, ligne d'un levier à arbitrer = « À arbitrer », d'un levier non retenu = « Écartée », Reste = enveloppe − proposé − à arbitrer ; app : proposé = toutes les lignes, à arbitrer = statut estimé/devis, reste = enveloppe − validé. Point à trancher (ticket § 6 ne définit pas). Saisie : proto Ligne + Montant ; app = éditeur complet de la page Budget (statut, fournisseur, preuve) : plus lourd. Répartition par levier (ticket § 6) : app OK, proto implicite. | M |
| Objectifs & KPIs | **DIFFÉRENT** : proto = objectifs en texte libre ; app = objectif stratégique + KPI structurés (*ticket § 7*, *MKT-S1-03*). Garder la structure de l'app, mais présenter les propositions de PO et l'ajout comme le proto (texte d'abord, détails du KPI repliés). | S–M |
| « Dicter », « Préparer un brouillon », « Proposer des réponses », `ImportPanel`, `BriefReminder`, `ValidationPanel` générique | **EN TROP** à l'écran : boutons et colonne absents du proto. « Préparer un brouillon » (*MKT-S1-09*) répond au ticket (« PO exploite les données déjà présentes ») : proposition = le lancer **automatiquement** à « Commencer la stratégie » et ranger ses propositions comme celles d'un échange (source « Brief de cadrage › … » + citation) ; `ImportPanel` (*code seul*, doublon de l'import automatique après un call) et `ProposeChoices` (*code seul*) : retirer ; `BriefReminder` → une ligne de faits « Brief de cadrage V… » ; dictée → garder comme « Modifier avec PO » du Brief (ticket § 8). | S–M |

---

## 6. Étape `st3` « Validation du Brief de sortie » (ticket § 8–9)

### Proto
- Pourquoi : « La direction valide le Brief de sortie sur pièce. Pendant la relecture, la Stratégie est figée. »
  Valide : « Claire Morel · Validation de la direction », « Nadia Benali · Validation créative interne ». Ensuite :
  Stratégie validée, Conception › Accueil, Activations › Leviers à préparer. S'ouvre quand `st2` est fait (**plus
  rien à arbitrer ni à compléter**).
- **Le document sur pièce** : « Brief de sortie — V1 », « Restant à arbitrer : aucun », « **Voir le PDF** » ; corps en
  **4 blocs** (`briefDoc`) : **Pour qui et pourquoi** (Positionnement, Publics prioritaires, Narratif) · **Comment**
  (Dispositif retenu en pastilles, Livrables en pastilles) · **Quand** (date complète + « nom · J-n ») · **Objectif
  et budget** (Objectif ; Budget proposé « 23 500 € HT · sur 25 000 € HT · interne »).
- **Envoyer en validation** (responsable) : cases « Claire Morel · valide toujours » (cochée, grisée) et « Nadia
  Benali · directrice créative » (cochée) → « Envoyer en validation ». Bandeau « Brief de sortie envoyé en
  validation ».
- **Validation** : une ligne par valideur avec pastille En attente / Validé / Validé avec réserves / Modification
  demandée, son commentaire cité, « Relancée le … » ; boutons **« Relancer Claire Morel »**, « Relancer Nadia
  Benali » (toast « … relancée. »).
- **Votre décision** (valideur) : « Commentaire » (« Obligatoire pour des réserves ou une modification ») +
  **« Valider le Brief de sortie »** · **« Valider avec réserves »** · **« Demander une modification »** ; erreurs
  « Écrivez la réserve. » / « Dites ce qui doit changer. ». Une réserve devient à la validation finale une **tâche de
  la cheffe de projet** « Réserve : <texte> » (origine « Réserve de X sur le Brief de sortie »).
- **Modification demandée** : la Stratégie se dégèle ; en tête « Claire Morel (demander une modification) : « … » » ;
  champ « Votre réponse \* » + **« Répondre et transmettre à nouveau »** (nouveau tour, décisions remises à zéro).
- Tous ont décidé : « Brief de sortie — V1 validé le … Il est figé ; le réviser crée une V2. » ; bandeau « Brief de
  sortie validé » avec « Ensuite : Lina Haddad · désigner le responsable créatif (Conception › Accueil) », « Ensuite :
  Lina Haddad · créer ou reporter 6 activations (Activations › Leviers à préparer) ».

### App
- Page `/strategy/brief` (`app/(app)/app/projects/[projectId]/strategy/brief/page.tsx`) : « Brief de sortie »,
  « État au … », « Modifier avec PO » (dictée), `BriefSnapshotView` (`components/strategy/brief/*`,
  `lib/strategy/documents/brief-snapshot.ts`, `brief-summary.ts`) : **« L'essentiel »** (Objectif, Publics, Angle,
  Dispositif, Jalons clés, Budget, KPI, Risques et manques) puis **le détail des huit dimensions replié**, « Restant à
  arbitrer » (liste des points avec lien), « Changements depuis la V… » (`BriefVersionChanges`).
- Aside `BriefValidationAside` : « Demander la validation » → modale `SendForValidation` (DG « Valide toujours »,
  « Ajouter des directeurs créatifs du projet », « Message aux valideurs », récapitulatif + alertes critiques) →
  `requestBriefValidation` (instantané, `create_strategy_document`, `send_strategy_document`) ; `ReviewPanel` (états
  En attente / Validé / Modification demandée / **Non commencé**, « Relancer » 12 h mini, `remind_strategy_review`) ;
  `DecisionForm` : « Valider » / « Valider avec réserves » (**chaque réserve : texte, responsable, échéance**) /
  « Demander une modification » + **alertes critiques à accepter une par une** (`strategy_critical_alerts`,
  `decide_strategy_document`) ; version validée : Voir · Partager (lien interne) · PDF · « Réviser la stratégie »
  (`open_strategy_revision`) ; `ReservesList` (« Lever ») ; **`ExecutionPlanCard`** ; historique.
- Envoi possible dès qu'**aucune dimension n'est « À compléter »** (`briefReadiness`), les points à arbitrer partent
  dans « Restant à arbitrer ».
- Tables/fonctions : `strategy_documents`, `strategy_document_reviews`, `strategy_document_reserves`,
  `strategy_execution_items`, migrations `20261010000801_strategy_documents`, `20261012101501_strategy_reserves_execution`.

### Écarts
| Point | Écart | Effort |
| --- | --- | --- |
| Le Brief sur pièce dans l'étape | **DIFFÉRENT** : page à part + aside, vs panneau d'étape ; 4 blocs (proto) vs « L'essentiel » + 8 sections repliées (*MKT-S1-14*). Ticket § 8 liste les 8 dimensions. Proposition : les 4 blocs du proto comme vue principale (ils couvrent les 8 dimensions : narratif, dispositif, livrables, calendrier, budget, objectifs), le détail replié ; même rendu dans le PDF (`lib/strategy/documents/brief-html.ts`). Pas de migration (le contenu de l'instantané ne change pas, seule la vue). | M |
| Quand on peut envoyer | **DIFFÉRENT** : proto = tout tranché ; app = rien « à compléter » (« à arbitrer » toléré et affiché). Le ticket § 8 (« met en évidence uniquement les éléments restant à arbitrer ») va dans le sens de l'app. Point à trancher ; le proto affiche d'ailleurs « Restant à arbitrer : aucun » en dur. | S |
| Envoyer en validation | **DIFFÉRENT** (léger) : modale vs bloc dans l'étape ; DA à cocher (app) vs cochée par défaut (proto) ; « Message aux valideurs » en plus (à garder comme la « réponse » du renvoi). | S |
| Décision | **DIFFÉRENT** : libellé « Valider » vs « Valider le Brief de sortie » ; une réserve = texte + responsable + échéance (*MKT-S1-16*) vs simple commentaire → tâche de la cheffe de projet ; alertes critiques (*MKT-S1-16*) absentes du proto. Simplifier comme le proto = **migration** : `strategy_document_reserves.owner_person_id` par défaut = responsable du projet, `due_on` nullable (lever la contrainte « à venir » si vide). À trancher (retour d'Ibé du 11/10 vs proto du 18/10). | M |
| Modification demandée → renvoi | **DIFFÉRENT** : app = l'autre revue passe « Non commencé », l'étape se rouvre, on redemande la validation (V2 + « Changements depuis la V1 ») ; proto = motif signé en tête, « Votre réponse \* » + « Répondre et transmettre à nouveau ». Aligner les mots (motif en tête de l'étape, bouton « Répondre et transmettre à nouveau » qui ouvre l'envoi avec la réponse obligatoire = `request_note`). Pas de migration. Le versionnage de l'app est juste (le proto affiche « V2 » au 2e tour puis valide « V1 » : incohérence du proto). | S |
| Relance | **OK** (« Relancer » + nom à ajouter au libellé ; « Relancé le … »). | S |
| Figée pendant la relecture | **OK** (`strategy_is_editable`). | — |
| Réviser la stratégie | **EN PLUS** dans l'app, demandé par le ticket § 9 (« une modification importante crée une nouvelle version ») : garder ; le proto le dit seulement en texte. | — |
| Valideur dans « Maintenant » | **MANQUANT** : « À vous · valider le Brief de sortie » (app : notification + `next-action` vers `/strategy/brief`). Couvert par § 0. | — |

---

## 7. Étape `st4` « Stratégie validée » (ticket § 10, 13)

### Proto
- Pourquoi : « Le Brief de sortie V1 est figé. Les documents se préparent à partir de lui, et ses décisions alimentent
  la Conception, les Activations et le Planning. » Ensuite : —.
- Encadré : « **Stratégie validée** le 07/10, 19:10 : Brief de sortie — V1. Rien n'oblige à lancer la Conception
  maintenant. »
- **Documents** : « Brief de sortie — V1 · Interne · avec le budget · [Validé] · Voir · Partager » ; « Plan de sortie ·
  Pour l'équipe de l'artiste · sans budget · [À générer] » ; « Dossier de presse · Pour les médias · sans budget ·
  [À générer] ».
- **Ce que la Stratégie alimente** : « Conception · 3 livrables à concevoir » (liste) [Ouvrir] ; « Activations · 6
  leviers retenus à préparer » (liste) [Ouvrir] ; « Planning · 4 temps forts et 9 échéances amont · Calculés depuis la
  sortie du Sam. 05/12/2026 ».
- Conséquences du code (`onStrategyValidated`) : une **fiche Livrable par livrable retenu** en Conception (`de0`
  « Livrables reçus ») ; **une proposition d'activation par levier retenu** dans Activations (« Leviers à
  préparer » : « Créer l'activation » avec mode Gestion interne / Agence externe pour influence et presse, « Plus
  tard ») ; pas de plan d'exécution (retiré le 18/10, MARKETING-METIER « Pas demandé »).

### App
- `ValidatedStrategyHome` → `ValidatedStrategy` (`components/strategy/documents/validated-strategy*.tsx`) : état,
  **« Prochaine étape : la Conception » / « Passer à la conception »** en action principale au-dessus des documents
  (`ConceptionNextStep`, *MKT-C2-01*), `StrategyDocumentCards` (Brief ✓ Validé Vn · Voir · Partager · PDF ·
  Versions ; Plan de sortie et Dossier de presse avec leur état réel, public et usage, « Facultatif »), réserves
  ouvertes, « Ensuite, quand l'équipe est prête » (Activations, Planning), puis « Consulter la stratégie validée »
  (8 rubriques repliées). Plan d'exécution (`ExecutionPlanCard`, `apply_strategy_execution`) dans l'aside du Brief.
- Générateurs **Plan de sortie** `/strategy/release-plan?step=1..8` et **Dossier de presse**
  `/strategy/press-kit?step=1..8` (ticket § 11, 12), **Suivi** `/strategy/follow-up` (ticket § 14).

### Écarts
| Point | Écart | Effort |
| --- | --- | --- |
| Encadré + Documents + « Ce que la Stratégie alimente » | **DIFFÉRENT** (ordre et poids) : l'app met « Passer à la conception » en action principale (*MKT-C2-01*) alors que le proto (et le ticket § 10 « La validation n'oblige pas … Conception ») met les trois conséquences à égalité avec « Ouvrir ». Ligne Planning chiffrée (n temps forts, m échéances amont) **MANQUANTE**. Aligner sur le proto. | S |
| Actions des documents | App plus riche (PDF, Versions) : conforme au ticket § 9/13, garder. Le proto « Partager » copie « le lien du Plan de sortie » (erreur du proto). | — |
| Plan de sortie / Dossier de presse « À générer » | Proto sans action ; app avec générateurs (ticket § 11–12) : **garder**, la ligne « À générer » mène au générateur. | — |
| 8 rubriques repliées sous « Consulter la stratégie validée » | **EN TROP** dans cet écran : avec le parcours, elles restent lisibles dans l'étape `st2` (faite). | S |
| Plan d'exécution (`ExecutionPlanCard`, `strategy_execution_items`, tâches « Livrer : … ») | **EN TROP** (*MKT-S1-16*, retiré du proto le 18/10 : « Pas demandé ») — remplacé par « Leviers à préparer » des Activations (zone Activations) et la Conception qui lit déjà les livrables. Masquer ; garder les tables pour l'historique. Risque : activations déjà créées par ce chemin (« Plan d'exécution du Brief V… » affiché sur l'activation). | S |
| « Leviers à préparer » (Créer l'activation / Plus tard, mode) | **MANQUANT** côté Activations (autre zone) ; **migration** probable : état `later` / mode sur une proposition par levier (réutiliser `strategy_execution_items` avec `state`). | M (Activations) |
| Suivi de la Stratégie (`/strategy/follow-up`) | **EN PLUS** dans l'app, demandé par le ticket § 14, absent du proto : garder, en 5e étape « Suivi » du parcours ou en lien depuis `st4`. | S |

---

## 8. Briques communes utilisées par la zone

| Brique | Dans le proto | Dans l'app | Où |
| --- | --- | --- | --- |
| Parcours / Maintenant / étape ouverte | `st1`–`st4`, `waits()`, `after()` | Existe, pas branché sur la Stratégie | `components/shell/journey/{now-card,journey-spine,step-panel}.tsx`, `lib/ui/journey.ts`, modèle `lib/production/journey/`, `components/legal/legal-step-frame.tsx` |
| Formulaire de call commun + récapitulatif | `prepGate` (participants en pastilles, date/heure/format, ordre du jour déplaçable, « Envoyé avec l'invitation », « Confirmer et inviter ») | Panneau `PrepareCallSheet` + `ParticipantsField`, `AgendaTopicsField`, `CallFormatField`, `CallFields`, `CallRecap` | `components/calls/`, `lib/calls/prepare.ts` |
| Compte rendu | Modale par point de l'ordre du jour, sort de chaque phrase | Page `/app/calls/[callId]/report` (Résumé, Décisions, Actions, Points ouverts) | `components/calls/closure/report-view.tsx` |
| Résumé aux participants | `summaryBlock`, versions, « Corriger et renvoyer » | « Partager le compte rendu » (mailto) | `components/calls/closure/share-report-form.tsx`, `call_report_shares` |
| Proposition Confirmer / Modifier / Écarter | `itemRow`, `groupHead`, `addForm` | `BriefFieldCard` (Confirmer/Rejeter/Modifier), `SuggestionList` (Accepter/Écarter), `ProposalCard` de la Conception (Confirmer/Modifier/Écarter/« Confirmer ainsi ») | `components/framing/brief-field-card.tsx`, `components/strategy/suggestion-list.tsx`, `components/design/work/proposal-card.tsx`, `SourceQuote`, `ProposedBadge` |
| Décision avec motif | `stdecide` (motif obligatoire hors « oui »), motif signé en tête, « Répondre et transmettre à nouveau » | `DecisionForm` (strategy/documents), `ReviewPanel` | `components/strategy/documents/` |
| Modale verre | compte rendu, création d'une fiche | `Dialog` / `FormDialog` | `components/ui/` |
| Cartes de choix (« Recommandé ») | `choices2` sans « Recommandé » pour la Stratégie | `ChoiceCards` | `components/ui/choice-cards.tsx` |
| Fil d'Ariane, chevrons | « Néons › Marketing › Stratégie › … », chevrons Marketing | chevrons `lib/ui/marketing-steps.ts` ; fil d'Ariane : zone coquille | `components/shell/` |
| Documents versionnés (Voir / Partager / PDF) | Brief V1 | `DocumentActions`, `StrategyDocumentCards`, route PDF | `components/strategy/documents/`, `app/api/projects/[projectId]/strategy-documents/[documentId]/route.ts` |

---

## 9. Simulations du proto et vrais événements

| Simulation du proto | Vrai événement dans l'app |
| --- | --- |
| « Proto : l'échange a eu lieu, compte rendu reçu » (`prepheld`) | Call créé par `create_strategy_call`, enregistré dans PDS OS (`CallRecorder`) ou audio importé, transcription (`lib/ai/transcribe.ts`), compte rendu (`call_reports`/`report_items`), extraction `/api/calls/[callId]/extract` → `fillStrategyFromCall` → propositions dans la Stratégie |
| Lien de visio inventé (`meet.google.com/neo-…`) | Lien saisi (`MeetField`) ; création Meet par OAuth Google Workspace (en attente, CLAUDE.md) |
| « Les invitations partent à la confirmation » | Pas d'invitation envoyée aujourd'hui (SMTP de PO non branché) |
| « Voir comme » Claire Morel / Nadia Benali pour décider | Session du valideur, notification `strategy_review_*`, `/strategy/document/[id]` |
| « Relancer » (toast) | `remind_strategy_review` + notification (12 h minimum) |
| « Voir le PDF » (`open` d'un nom de fichier) | PDF réel `/api/projects/[id]/strategy-documents/[docId]` (`lib/pdf/render.ts`) |
| « Partager » (toast) | Lien interne de l'app (Brief) ; lien public `/d/[token]` (Plan, Dossier) |
| Envoi du résumé aux externes (« sur son lien privé », « par e-mail ») | À construire (§ 4) ; aujourd'hui mailto |

---

## 10. Découpage proposé en sous-lots (ordonnés, chacun livrable et testable seul)

1. **S1 — Parcours de la Stratégie** (M, sans migration) : `lib/strategy/journey/` (4 étapes, titres, pourquoi,
   rôles, prérequis/ensuite, résumés et acteurs du proto), `NowCard` / `JourneySpine` / `StepPanel` sur `/strategy`,
   `/strategy/brief` rendu comme panneau de `st3` (route gardée), retrait de la colonne de droite (`ImportPanel`,
   `BriefReminder`, `ValidationPanel` générique), `next-action` détaillé. Risques : liens existants (`?d=`,
   `?v=n`, notifications, Planning), pages `StrategyNeedsFraming` / `WorkflowLocked` à remplacer par étapes
   verrouillées visibles.
2. **S2 — Démarrer la stratégie** (S, sans migration) : cartes de choix et mots du proto, « Départ … choisi par …
   Changer », échange prévu affiché dans l'étape (date, lien, participants, ordre du jour, phrase d'enregistrement),
   « Lire le compte rendu », lecteur « En attente de … ».
3. **S3 — Ligne de proposition commune** (M) : extraire `ProposalCard` de la Conception en brique générique
   (Confirmer / Modifier / Écarter, citation · source, « Modifié par », « Écarté par » barré), « n à confirmer »,
   « Rien n'a été dit pendant l'échange », « Ajouter … » en tête de groupe ; l'appliquer aux `field_values` et aux
   `levers` proposés ; encadré PO et compteur de `st2`. Retirer `SuggestionList`/`ProposeChoices` de l'écran.
4. **S4 — Propositions sur toutes les dimensions** (L, **migration**) : `review_status` + `source_*` sur
   `strategy_deliverables`, `milestones`, `strategy_objectives` ; `strategy_deliverables.lever_id` nullable ;
   `report_items.kind` étendu ; schéma d'extraction + vérification `verbatim` / `said-date` ; brouillon de PO
   (`lib/strategy/draft.ts`) lancé à « Commencer la stratégie » et rangé en propositions. Risques : contraintes et
   RLS existantes (`strategy_is_editable`, `lever_has_deliverables`, triggers `no_deliverables`), tests pgTAP
   stratégie, Conception qui lit les livrables (ne lire que les confirmés).
5. **S5 — Contenu des dimensions comme le proto** (M–L, décisions à prendre avec Sacha) : Dispositif (9 leviers
   listés, prérempli depuis les besoins du Cadrage, Retenir / Ne pas retenir), Livrables (nom + format, sans
   responsable/échéance/lots dans la Stratégie), Calendrier (liste date + J, temps forts du Cadrage, vue par canal et
   arbitrages repliés), Budget (règle proposé/à arbitrer/reste à trancher, ajout simple), Objectifs (texte d'abord),
   retrait de la grille de choix ; narratif 5 parties gardé (ticket). Pas de migration sauf si le Cadrage doit
   fournir des temps forts structurés.
6. **S6 — Validation du Brief dans l'étape** (M) : Brief en 4 blocs (vue + PDF), envoi dans l'étape (DA cochée par
   défaut), décision « Valider le Brief de sortie / Valider avec réserves / Demander une modification » + un
   commentaire, motif signé en tête, « Répondre et transmettre à nouveau », « Relancer <Nom> ». **Migration** si on
   simplifie les réserves (responsable par défaut, échéance facultative). Risques : `decide_strategy_document`
   (alertes critiques obligatoires), tests `strategy-*.test.sql`.
7. **S7 — Stratégie validée** (S, sans migration) : encadré, Documents (Voir, Partager, PDF ; « À générer » → générateur),
   « Ce que la Stratégie alimente » (Conception, Activations, Planning chiffré, « Ouvrir »), retrait du plan
   d'exécution et des 8 rubriques repliées ; lien « Suivi ». Dépend de « Leviers à préparer » (zone Activations).
8. **S8 — Résumé aux participants** (M, **migration** `meeting_summaries`) : brique commune (avec la Production),
   brouillon calculé depuis ce qui a été tranché (sans citation, écarté ni budget), versions, envoi équipe par
   notification, externes par lien privé / e-mail quand le SMTP est branché.
9. (commun, autre zone) **Formulaire de call commun** dans l'étape (participants → date → ordre du jour déplaçable
   → ce qui part avec l'invitation → « Voir le récapitulatif » → « Confirmer et inviter ») et **compte rendu par
   point de l'ordre du jour** en modale.

**Effort total zone Stratégie** : S1 2 j + S2 0,5 j + S3 1,5 j + S4 3–4 j + S5 2–3 j + S6 1,5–2 j + S7 0,5 j +
S8 1,5 j ≈ **13 à 15 jours**, hors briques communes du call (≈ 2 j) et « Leviers à préparer » (Activations).

## 11. Points à trancher (à remonter à Sacha / Ibé)

1. Grille de choix fermés (Positionnement, Publics, Narratif), 4 points du positionnement (MKT-S1-05), synthèse du
   récit (MKT-S1-06) : retirer ou replier ? (le proto n'en a aucun ; le ticket refuse le « formulaire rigide »).
2. Responsable / échéance / lots des livrables dans la Stratégie (MKT-S1-08) et plan d'exécution (MKT-S1-16) :
   retirés comme dans le proto ?
3. Réserves de validation : simple commentaire → tâche de la cheffe de projet (proto) ou texte + responsable +
   échéance + alertes critiques (MKT-S1-16) ?
4. Envoi du Brief : tout tranché (proto) ou « à arbitrer » toléré et listé (app, ticket § 8) ?
5. Règle du budget proposé / à arbitrer / reste (proto suit l'état du levier, app suit le statut de la ligne).
6. PO qui propose des temps forts et des KPI chiffrés depuis un call : date relative calculée par le code depuis la
   phrase, ou « à préciser » ?
7. Temps forts du Cadrage préremplis : le Cadrage n'en a pas de structurés.
8. « Passer à la conception » en action principale (MKT-C2-01, 12/10) vs trois conséquences égales (proto 18/10).

Corrections à faire dans le proto (incohérences relevées) : pastille « À trancher » au lieu d'« À arbitrer » et pas
d'état « En cours » ; « Rien n'a été dit pendant l'échange » quand la stratégie a été commencée sans échange ;
2e tour affiché « V2 » puis validé « V1 » ; « Partager » du Brief copie « le lien du Plan de sortie » ; « Restant à
arbitrer : aucun » écrit en dur ; résumé « en validation auprès de Claire Morel » sans la directrice créative ;
narratif en 5 parties, vue par canal et « Modifier avec PO » (ticket) absents.
