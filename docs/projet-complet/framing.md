# Inventaire — Cadrage et Plan du projet (proto « Projet complet » ↔ app)

Dépôt lu : le worktree de la branche `feat/projet-complet`, en lecture seule.
Proto : `docs/protos/src/mk.js` l. 2040-2174 (FR_*), `prepGate` / `prepReveal` / `summaryBlock` l. 1495-1612 et 1876-1912,
gestes `docs/protos/src/mk-actions.js` l. 228-247 et 275-288, scénarios `docs/protos/src/mk-scen.js` l. 8-12,
coquille `docs/protos/src/global/host.js` (verrou des workflows avant le plan, Vue d'ensemble « Avant les workflows »).
Captures supplémentaires faites pour ce rapport (gestes cliqués, texte exact) :
`scratchpad/inventory/frshots/*.png|.txt`
(o_start, f1_callform, f1_recap, f1_planned, f1_held, f1_direct, f2_aftercall, f2_direct, f2_help, f2_na_err, f3_dg,
f3_dg_err, f3_changes, f3_cp_after_changes, f4_edit, f4_launched, o_launched) ; script :
`scratchpad/inventory/frtools/fr.cjs`.

Ticket du DG relu : « TICKET 1 — Cadrage intelligent d'un Projet » (Ibé, 30/09/2026, doc
`10K3M7WDTbCIi52SWtWqnPRy1TRH5aC35qxbgcp9ZQkg`, dossier Drive « Tickets Cadrage de projet »), et « Architecture globale
des projets PO » (doc `1sv27dNeDfwIPqmlmnSg14DaQv0WQPxNu3D09Iz9prcc`) pour la place du Cadrage. Points du ticket utiles
ici, cités :
- § 1 « Dans la Vue d'ensemble : ✓ Prise en charge acceptée ; … proposer Commencer le cadrage ; proposer Préparer un échange ».
- § 4 « PO pose une seule question contextuelle à la fois. Afficher : les 6 dimensions ; la dimension active ; la question ;
  la progression ; M'aider à définir ; Écrire moi-même ».
- § 5 « Réutiliser le moteur Call existant … Le compte rendu reste dans Projet → Calls et ne doit pas devenir le Brief ».
- § 6 « Pour chaque donnée : Confirmer / Modifier. Si absente : Information manquante / Compléter ».
- § 8 « Le validateur retrouve le Brief dans : Notifications ; Mon Travail ; Validations du Projet. En cas de correction :
  commentaire précis ; ne rouvrir que les dimensions concernées ; conserver l'historique ».
- § 9 « Présenter : Focus, Ensuite, Pendant ce temps, À anticiper. L'humain peut : Modifier le plan, Lancer le Projet.
  PO ne crée/lance pas silencieusement les workflows proposés » (le proto et l'app disent « Lancer le plan », décision du
  06/10/2026, `docs/CONTEXTE-PROJET.md` § 2).

---

## 0. Vue d'ensemble de l'écart

| | Proto | App |
| --- | --- | --- |
| Forme | **Patron de parcours** (VISION-UX § 4) : titre « Cadrage », « Qui fait quoi », ligne de faits (artiste · type, Budget, Responsable, Sortie), « Maintenant », **Parcours · Cadrage** à gauche (4 étapes), étape ouverte à droite (Exécute / Coordonne / Valide / Prérequis / Ensuite), « Signaler un blocage » · « Noter une information » en pied | Page à **menu de dimensions** (`DimensionNav`) + écran de question (`?step=<dimension>&q=`), écran de relecture d'un call (`?step=review&call=`), écran « avant le Brief » (`?step=brief`), page séparée `/framing/brief`, et le **Plan sur la Vue d'ensemble** |
| Étapes | fr1 Démarrer le cadrage (→ « Échange de cadrage » ou « Départ ») · fr2 Les 6 dimensions · fr3 Brief de cadrage · fr4 **Plan du projet** | Pas d'étapes : entrée (`FramingEntry`), dimensions, Brief ; le plan vit dans `app/(app)/app/projects/[projectId]/page.tsx` (`ProjectPlanSection`, puis `ProjectBoard` + `PlanStepsSection`) |
| Avant le plan | Master, Juridique, Marketing, Distribution **verrouillés** (« Ce workflow démarre au lancement du plan du projet, après le Cadrage. » + « Ouvrir le Cadrage ») | Seuls Stratégie, Master, Juridique attendent le plan (`WorkflowLocked`, `workflow_is_launched`) ; Distribution, Conception, Production, Activations ne sont pas verrouillés par le plan |
| Plan | 8 cartes : Stratégie, Master, Juridique (Focus) ; Conception, Production, Activations (Ensuite) ; — (Pendant ce temps) ; Distribution, Suivi & bilan (À anticiper), chacune pilote + échéance + raison | 5 workflows SQL (`strategy`, `master`, `legal`, `design`, `delivery`) + lignes « À anticiper » qui ne sont pas des workflows (échéances, rôles à trouver, enveloppe, contrats, points ouverts) ; pilote, exécutant, échéance, dépendances, incohérences, revue de lancement, historique |

Le **contenu métier** de l'app (analyse préalable, 6 dimensions, structure des réponses, Brief versionné, validation,
correction ciblée, plan calculé par le code, lancement en SQL) est **plus riche que le proto** et couvre tout le ticket.
L'écart est surtout de **forme et de parcours** (patron d'étapes, plan dans le Cadrage, formulaire de call commun, décision
de la direction en ligne) et de **périmètre du plan** (8 workflows au lieu de 5).

---

## 1. Écrans et étapes du proto, correspondance, écart

### 1.0 Vue d'ensemble avant le plan (host.js `overview()`, scénario « Projet accepté : cadrage à faire »)

**Proto** (`frshots/o_start.txt`) : « Néons › Vue d'ensemble », h1 « Néons » + pastille **« Non démarré »**, faits
(Mona Lys · Single · Budget 25 000 € HT · Responsable Lina Haddad · Sortie Sam. 05/12/2026), carte **Maintenant**
(« À vous » · « Cadrage › Démarrer le cadrage » · h2 « Démarrer le cadrage » · « Ouvrir »), carte **« Avant les
workflows »** : « Le projet avance dans cet ordre : le Cadrage, puis le Plan du projet. Au lancement du plan, le Master, le
Juridique, le Marketing et la Distribution démarrent. » + une ligne par étape du Cadrage (« En cours » / « À venir » / « Fait »,
sous-titre « Après l'étape précédente ») + bouton « Ouvrir le Cadrage ». Aucune carte de workflow avant le plan. Sidebar :
« Cadrage » au-dessus de « Workflows », avec point d'état (`run`/`done`) et pastille du nombre d'actions « À vous ».

**App** : `app/(app)/app/projects/[projectId]/page.tsx` montre `FramingEntry`
(`components/framing/intel/framing-entry.tsx`) **en entier sur la Vue d'ensemble** (les deux entrées, l'analyse par
dimension), puis `ProjectAttention` (`components/projects/project-attention.tsx`) quand le Brief attend, puis
`ProjectJourney` (« Comment avance un projet », `components/projects/project-journey.tsx`, `fr.shell.project.journey`),
équipe créative, historique d'affectation, faits (artiste, type, responsable, étape, créé le).
Sidebar : `lib/ui/project-sections.ts` met bien le Cadrage hors groupe au-dessus des Workflows, mais **sans point
d'état ni compteur** (`statuses` vient de `loadWorkflowStates`, qui ne connaît pas `framing`).

**Écart : DIFFÉRENT.** Le proto ne met pas le choix de départ sur la Vue d'ensemble : il y met « Maintenant » + la liste
des 4 étapes ; le choix est dans Cadrage › Démarrer le cadrage. (Le ticket § 1 demande le choix « dans la Vue
d'ensemble » : le proto le résout par la carte Maintenant qui ouvre l'étape — à garder comme le proto.) Pastille
« Non démarré » et faits Budget/Sortie absents de l'app. **Effort S** (zone partagée avec l'inventaire « Vue d'ensemble » :
à coordonner). Pas de migration. Point d'état + compteur Cadrage dans la sidebar : S (ajouter `framing` aux états
calculés, depuis le parcours du § 1.1).

### 1.1 Cadre commun de la page Cadrage (patron de parcours)

**Proto** : fil d'Ariane « Néons › Cadrage › <étape> », h1 « Cadrage », lien « Qui fait quoi » (modale rôles), ligne de faits,
« Maintenant » (masqué si l'étape affichée est celle de la personne, VISION-UX § 4), **Parcours · Cadrage** (4 lignes :
titre, sous-titre = résultat / « À vous · Lina Haddad · <action> » / « Après : <étape> »), étape ouverte : titre + pastille
(En cours / Fait / Plus tard), pourquoi, **Exécute** (Lina Haddad, Responsable du projet) · **Coordonne** (—) · **Valide**
(« Aucune validation » ; fr3 : « Claire Morel · Validation de la direction ») · **Prérequis** (« Aucun », « ✓ Départ »,
« ○ Les 6 dimensions ») · **Ensuite** (fr4 : « Stratégie › Démarrer la stratégie »), puis le contenu, puis « Signaler un
blocage » · « Noter une information ». Étape verrouillée : « S'ouvre quand Les 6 dimensions est fait. »

Titres et « pourquoi » (FR_STEPS, mk.js l. 2154-2158) :
- fr1 « Démarrer le cadrage » → devient « Échange de cadrage » (chemin call) ou « Départ » (chemin PO) — « Commencer
  directement avec PO, ou préparer un échange : les deux chemins mènent au même Brief de cadrage. »
- fr2 « Les 6 dimensions » — « Ce que le projet sait déjà, ce qui reste à confirmer, ce qui manque. PO pose une question
  à la fois et ne redemande jamais ce qui est connu. »
- fr3 « Brief de cadrage » — « Les 6 dimensions dans un document versionné, avec leurs sources. La direction le valide ;
  une demande de modification ne rouvre que les dimensions concernées. »
- fr4 « Plan du projet » — « Ce qui commence maintenant, ce qui suit, ce qui avance en parallèle, ce qu'il faut prévoir.
  Rien ne démarre avant « Lancer le plan ». »

Résumés d'étape faite (frSummary) : fr1 « Échange du 02/10 » / « Commencé directement » ; fr2 « 17 informations
confirmées » ; fr3 « Version 1 validée » ; fr4 « Lancé le 03/10 ».
Actions « qui doit agir » (frActors) : fr1 « Démarrer le cadrage » → « Préparer l'échange de cadrage » → « Tenir l'échange
de cadrage » ; fr2 « Répondre à n questions de PO » (rien pendant la relecture du Brief) ; fr3 owner « Créer le Brief de
cadrage » / « Créer la version n du Brief » / « Envoyer le Brief en validation », direction « Valider le Brief de cadrage » ;
fr4 « Lancer le plan du projet ».

**App** : rien de ce cadre pour le Cadrage. Les briques existent : `lib/ui/journey.ts` (`JourneyStep`, `nowOf`),
`components/shell/journey/{now-card,journey-spine,step-panel}.tsx`, modèle d'assemblage
`components/legal/legal-step-frame.tsx` + `lib/legal/journey-context.ts`. Titre de page : `ProjectPageTitle`
(`components/projects/project-page-title.tsx`) rendu par `app/(app)/app/projects/[projectId]/layout.tsx`. Les
« prochaines actions » du Cadrage dans Travail ne sont que deux genres grossiers (`lib/work/next-action.ts` :
`record_call` / `write_brief` / `await_validation` / `build_plan`).

**Écart : MANQUANT.** À créer : `lib/framing/journey.ts` (4 étapes, statuts calculés depuis `project_stages` framing,
`framing_briefs`, `framing_calls`, `project_plans` ; acteur et « todo » par étape ; résumés), `components/framing/framing-step-frame.tsx`
(comme `LegalStepFrame`), routes d'étape (ex. `/framing?etape=depart|dimensions|brief|plan` ou sous-routes
`/framing/depart` …) avec redirections des anciennes URL (`?step=…`, `/framing/brief`, ancre `#plan` de la Vue d'ensemble,
liens des notifications de validation). **Effort M.** Pas de migration (statuts calculés).
Différence de brique commune : `StepPanel` de l'app a 4 colonnes (Responsable / Validation / Prérequis / Ensuite, comme
VISION-UX § 4) ; le proto Marketing en a 5 (Exécute / **Coordonne** / Valide / Prérequis / Ensuite). À trancher au niveau
de la brique, pas du Cadrage (Coordonne est toujours « — » au Cadrage).

### 1.2 fr1 — Démarrer le cadrage (avant le choix)

**Proto** (`marketing_framestart.txt`, frEntry l. 2078-2086) :
- Faits : **Prise en charge** « Acceptée le Jeu. 01/10/2026 par Lina Haddad » ; **Projet** « « Néons » · single de Mona
  Lys · sortie visée le Sam. 05/12/2026 ».
- Bloc **« Ce que le projet sait déjà »** : « 8 informations connues · 5 à confirmer · 4 manquantes. PO ne redemandera pas
  ce qui est connu. » + repli **« Voir le détail »** : une ligne par information (dimension en capitale, libellé · valeur ou
  « Pas encore connu », source, pastille Connu / À confirmer / Manquant).
- Deux **cartes cliquables** (toute la carte est le bouton), ordre fixe : « Commencer le cadrage » (« PO pose une question
  à la fois, dans les 6 dimensions, et ne redemande jamais ce qui est connu. ») et « Préparer un échange » (« Un call avec
  le management ; PO en tire des propositions, chacune avec la phrase exacte. »). Pastille **« Recommandé »** sur la carte
  choisie par le code : `missing + confirm > known` → échange, sinon PO. Raison sous les cartes (seulement si échange) :
  « Il manque 4 informations et 5 sont à confirmer : un échange ira plus vite que des questions une à une. »
- Qui : le responsable du projet ; les autres voient « En attente de Lina Haddad : démarrer le cadrage ».
- Gestes : `frgo` po → « Cadrage commencé » (journal « Cadrage commencé directement avec PO »), étape faite, fr2 s'ouvre ;
  `frgo` call → formulaire d'échange (§ 1.3). Fait ensuite : « Départ · Commencé directement par Lina Haddad le 01/10, 09:09 ».
- « Changer » à côté du départ tant que l'échange n'est pas créé (`prepreset`).

**App** : `components/framing/intel/framing-entry.tsx`, textes `lib/i18n/fr/framing-intel.ts` § `entry` ; action
`startFramingWithPo` (`lib/framing/actions/start.ts`) ; analyse `lib/framing/knowledge.ts` + `lib/framing/assess.ts`
(connu / à confirmer / manquant, calculé par le code) ; « Prise en charge acceptée le 1 octobre par … » (`entry.accepted`).
Affiché sur la Vue d'ensemble **et** sur `/framing` tant que le Cadrage n'est pas commencé.

**Écart : DIFFÉRENT** (forme et mots, pas le fond) :
- Cartes : l'app met un bouton dans chaque carte et **réordonne** (recommandée en premier) ; le proto garde l'ordre et rend
  la carte entière cliquable. Textes des cartes différents (app : longs, PROJ-UX-02 ; proto : une phrase).
- **Règle de recommandation différente** : app `missing > known + to_confirm` ; proto `missing + to_confirm > known`
  (avec les données Néons : app → PO, proto → échange). Raison : app « 4 informations manquent : un échange les rassemble
  plus vite. » / « Le projet en dit déjà assez (n informations) … » ; proto ne donne la raison que pour l'échange.
- Détail : app = 6 tuiles par dimension avec pastille ; proto = « Voir le détail » replié, une ligne par information.
- Titre « Prochaine attention : le cadrage » + paragraphe : absents du proto (le patron d'étape le remplace).
- Format de date « 1 octobre » vs « Jeu. 01/10/2026 ».
- « Changer » de départ : absent de l'app (une fois `startFramingWithPo` appelé, plus de retour).
- La brique « cartes de choix avec Recommandé » n'existe que dans `FramingEntry` : à extraire (voir § 4).
**Effort S-M.** Pas de migration (« Changer » = remettre l'étape en `not_started` si aucun call ni réponse : à faire en
SQL seulement si on veut l'autoriser après `startFramingWithPo` ; sinon le proposer seulement avant).

### 1.3 fr1 — Préparer un échange (formulaire de call commun)

**Proto** (`frshots/f1_callform`, `f1_recap`, `f1_planned`, prepGate l. 1550-1586, PREP_CALL.frame l. 1525) :
- Titre d'étape « Échange de cadrage », fait « Départ · Préparer un échange · choisi par Lina Haddad le 01/10, 09:09 » +
  « Changer ».
- « Nouvel échange » : **Participants \*** en pastilles (Lina Haddad, Claire Morel, Jade Petit **externe**), pré-remplis
  par fonction (Projet, Direction, Management), recherche « Ajouter », Entrée pour ajouter, Retour arrière pour retirer,
  « Inviter x@y » (e-mail → fiche Réseau) ou « Créer la fiche de « X » » ; ligne « Externes : Jade Petit (invitation sur son
  lien privé). » ; **Date \***, **Heure \***, **Format** (Visio / Sur place) ; **Ordre du jour** = les dimensions encore
  ouvertes (« 1. Objectif … 6. Cadre juridique »), modifiable et déplaçable, « Ajouter un point » + « Ajouter » ;
  **« Envoyé avec l'invitation »** : Objectif « Cadrer « Néons » : objectif, temporalité, budget, équipe, état de départ et
  cadre juridique. », Documents « Fiche projet · Catalogue · échanges avec Jade Petit », Sujets « Ce qui manque ou reste à
  confirmer, dimension par dimension » ; bouton « Voir le récapitulatif ».
- Erreurs : « Choisissez la date. », « Et l'heure. », « L'ordre du jour est vide. », « Un call réunit au moins deux
  personnes. »
- « Récapitulatif avant création » : Quand, Participants, Ordre du jour, Objectif, « Les invitations partent à la
  confirmation : Jade Petit est externe. », « Confirmer et inviter » / « Modifier ».
- Créé : faits « Échange prévu » (« Ven. 02/10/2026 à 14:00 · Visio · créé par … »), « Lien de la visio » (Meet),
  Participants, Ordre du jour ; note « L'échange s'enregistre dans PDS OS. À la fin, PO propose ce qui a été dit, point par
  point, avec la phrase exacte. » ; bouton pointillé « Proto : l'échange a eu lieu, compte rendu reçu ». Toast « Échange de
  cadrage créé ».
- Fait ensuite : « Départ · Échange de cadrage du Ven. 02/10/2026 à 14:00 » (+ résumé aux participants, § 1.4).

**App** : `components/framing/intel/framing-call-sheet.tsx` (panneau latéral `Sheet` « Préparer un échange ») : But (texte
`framingCallPurpose`), Sujets (`AgendaEditor`, sujets calculés par `lib/framing/call-prep.ts`, questions détaillées,
durées), `ParticipantsField` (`components/calls/participants-field.tsx`, **noms** `{name, contactId}`), Documents
(cases), `CallFields` (titre, date et heure, lien de visio), bouton « Créer l'échange » ; action
`prepareFramingCall` (`lib/framing/actions/call.ts`) → SQL `create_framing_call`
(`supabase/migrations/20261006000101_framing_intelligent.sql` l. 556) : un call normal + `framing_calls`
(purpose, participants jsonb, document_ids). Puis la page du call (`app/(app)/app/projects/[projectId]/calls/[callId]`).
Il existe **un autre** formulaire de call « comme Teams » : `CallPlanForm` + `AttendeesField` + `CallSlotFields` +
`MeetField` (`components/calls/`, `lib/calls/plan-call.ts`, tables `call_attendees` / `call_guests`) — membres, Réseau ou
e-mail en une recherche, lien Meet créé.

**Écart : DIFFÉRENT.** Le proto exige **le formulaire de call commun** en ligne dans l'étape (PROTOS.md § 6 « préparation
d'un call … partout : Cadrage, Stratégie, Conception, Production, Master »), avec personnes par id (CLAUDE.md « Formulaires »
règle 1), format, récapitulatif avant création, invitations à la confirmation, lien privé pour l'externe. L'app a un
panneau latéral propre au Cadrage, participants par nom, pas de format, pas de récapitulatif, pas d'invitation.
EN TROP par rapport au proto : durées par sujet, questions détaillées par sujet (PROJ-UX-03, demandé par un retour : à
garder dans l'éditeur d'ordre du jour commun, déplier facultatif), choix des documents (le proto les liste en lecture).
**Effort M** pour le Cadrage **si** la brique commune existe (sinon L, partagé avec Stratégie/Conception/Production/Master).
**Migration** : brancher le Cadrage sur `call_attendees` / `call_guests` : soit une version 2 de `create_framing_call` qui
accepte des participants par id (membres) et des invités (contacts du Réseau, e-mail), soit `link_framing_call(call_id,
purpose, document_ids)` appelé après `planCall`. `framing_calls.participants` (jsonb de noms) devient lecture seule pour
l'historique.

### 1.4 fr1 — Après l'échange : compte rendu, propositions, résumé aux participants

**Proto** : « Proto : l'échange a eu lieu, compte rendu reçu » (`prepheld` → `frReveal`) : chaque information manquante ou
à confirmer **qui a une phrase dite** passe « À confirmer » avec la valeur proposée, la **phrase citée** et la source
« Échange de cadrage du 02/10 » ; ce que personne n'a dit reste « Manquant ». Toast « Compte rendu reçu : PO propose ce qui
a été dit. » L'étape fr1 est faite, « Maintenant » pointe « Répondre à 9 questions de PO ».
Une fois toutes les dimensions tranchées, **« Résumé pour les participants »** (summaryBlock « frame ») dans fr1 : « Préparé
par PO à partir de ce qui a été tranché, sans les phrases citées ni ce qui a été écarté. Relisez et corrigez avant
d'envoyer. », champ « Message » pré-rempli (« Bonjour à tous, Merci pour le call du 02/10. Voici ce qui a été décidé. Ce
que nous retenons : — … Prochaine étape : — Le Brief de cadrage part en validation auprès de Claire Morel. Lina Haddad »,
budget exclu), « Destinataires » en pastilles (participants), « Jade Petit sur son lien privé ; l'équipe dans PDS OS. »,
« Envoyer aux participants » ; ensuite « Résumé envoyé aux participants » + « Envoyé · version n » + « Corriger et
renvoyer ». Côté externe (page privée) : « Résumé de la réunion » (dernière version). Note : le proto **n'a pas** de
« Lire le compte rendu » pour l'échange de cadrage (`crData` n'a pas de cas `frame`) ; le compte rendu reste dans Calls
(ticket § 5).

**App** :
- Enregistrement, transcription, compte rendu : page du call (`components/calls/call-workspace.tsx`, enregistreur
  `call-recorder.tsx`, `lib/calls/pipeline.ts`), compte rendu et clôture `components/calls/closure/*`
  (`call_closures`, `call_report_shares`, `supabase/migrations/20261012101701_call_closure_sharing.sql`).
- Lecture pour le Cadrage : route `app/api/calls/[callId]/extract/route.ts` → `lib/framing/import-report.ts`
  (`fillBriefFromCall`) + `lib/framing/call-analysis.ts` (`report_items` genre `brief_fact`, citation localisée) ; le call
  terminé ouvre `?step=review&call=<id>` → `components/framing/intel/call-review.tsx` (par dimension « Confirmer » /
  « Modifier », « Information manquante » / « Compléter », titre « Ce que PO a compris de l'échange « … » »).
- Partage : « Partager le compte rendu » (complet ou synthèse, membres notifiés, e-mail préparé `mailto`, PDF) sur la
  page du call (`components/calls/closure/share-report-form.tsx`, `fr.calls` l. 456-480).

**Écart :**
- Propositions issues du call : **DIFFÉRENT** — l'app a un écran de relecture séparé ; le proto les met directement dans
  « Les 6 dimensions » (question de PO + cartes), la phrase citée et « Échange de cadrage du … » sous la valeur.
  Proposition : `?step=review` redirige vers l'étape « Les 6 dimensions » (la provenance et la citation existent déjà
  dans `SourceLine` / `QuestionScreen`). **S.**
- Résumé aux participants : **MANQUANT** dans l'étape (l'app n'a que le partage du compte rendu sur la page du call, sans
  message rédigé par PO, sans versions de résumé, sans lien privé). Brique commune avec Stratégie, Conception,
  Production (§ 4). **M** (brique) ; **migration** : table de résumés versionnés (`meeting_summaries` : call, version,
  texte, envoyé par/le, destinataires) ou extension de `call_report_shares` (texte libre + version) ; notification des
  membres par trigger ; externes : e-mail ou page privée (dépend de la zone « pages privées »).

### 1.5 fr2 — Les 6 dimensions

**Proto** (`frshots/f2_direct`, `f2_aftercall`, `f2_help`, `f2_na_err`, frDims / frQuestion l. 2089-2114) :
- Ligne de progression : « **Confirmation humaine · 8/17** · 0 dimensions complètes sur 6 ».
- Encadré **« Question de PO »** (une seule, la première ouverte ou celle choisie par « Répondre ») :
  capitale « OBJECTIF · INFORMATION MANQUANTE » / « … · À CONFIRMER », la question en titre (« Que doit accomplir cette
  sortie ? », « La date de sortie est-elle toujours le Sam. 05/12/2026 ? »).
  - Manquante : « M'aider à définir » (trois formulations, chacune avec sa source : « Fiche projet · note de Lina Haddad »,
    « Échange avec Jade Petit le 02/10 », « Historique de Mona Lys » + « Trois formulations tirées de ce que PDS OS sait ;
    choisissez-en une, puis corrigez-la si besoin. ») ; champ **« Votre réponse \* »** ouvert d'emblée ; « Confirmer ».
    Erreur : « Écrivez la réponse, ou choisissez une proposition de PO. »
  - À confirmer : la valeur en gras, la phrase « « … » · Échange de cadrage du 02/10 » (ou la source), « Confirmer » /
    « Modifier » (→ champ pré-rempli + « Confirmer » / « Annuler »).
  - Toujours : « Non applicable » (→ « Pourquoi ce n'est pas applicable \* » + « Marquer non applicable » / « Annuler »,
    erreur « Dites pourquoi. ») et « À définir plus tard » (→ « À définir avant le \* » date + « Reporter, avec une tâche »,
    crée la tâche « Définir : <libellé> » au responsable, toast « Reporté : une tâche est créée. »).
- Six cartes repliables **« 01 · Objectif » … « 06 · Cadre juridique »** : pastille « n à traiter » ou « Complète »,
  ouvertes s'il reste à traiter ; une ligne par information : « Libellé · valeur » (ou « Pas encore connu »), sous-ligne
  = source / « « phrase » · Échange de cadrage du … » / « Confirmé par X » / « Modifié par X » / « Non applicable ·
  « raison » » / « À définir avant le … », pastille (Connu, Confirmé, À confirmer, Manquant, Non applicable, À définir plus
  tard), bouton « Répondre » sur les autres lignes ouvertes.
- Terminé : « **Les 6 dimensions sont complètes.** Le Brief de cadrage peut être créé. »
- Pendant la relecture du Brief : callout cadenas « Le cadrage est figé pendant la relecture du Brief par Claire Morel. »,
  plus de question, plus d'action.
- Après une demande de modification : seules les dimensions cochées reviennent « À confirmer » avec la source « À revoir ·
  demande de Claire Morel : « … » » (les « Connu » restent).
- Données Néons : 17 informations, dont « Master final : Sam. 21/11/2026 · Calculé par PDS OS : sortie moins 14 jours,
  délai de The Orchard » (connu).

**App** (`app/(app)/app/projects/[projectId]/framing/page.tsx`) : `DimensionNav` (menu des 6 dimensions + « Brief de
cadrage », ligne « n connues · n à confirmer · n manquantes »), `FramingProgress` (« x sur y informations confirmées ·
n facultatives vides », « n points bloquent encore le Brief »), `QuestionScreen` (`components/framing/intel/question-screen.tsx` :
capitale « 01 · Objectif · Question 1 sur 4 », question adaptée « confirm(value) », « M'aider à définir »
(`lib/framing/help.ts`, `proposeHelp` / `chooseHelp`), « Écrire moi-même », « Confirmer » / « Modifier », « Passer » /
« Écarter », « Non applicable » / « À définir plus tard » (`components/framing/intel/answer-states.tsx`,
`answerNotApplicable` / `answerLater` dans `lib/framing/actions/answers.ts`), `QuestionPager` (précédente / suivante),
listes spécialisées (`NeedsLines`, `ConstraintLines`, `DeadlineLines`, `TeamLines`, `PartyLines`, `ExpenseLines`),
réponses structurées (`structured-answer.tsx` : mesure, éléments à états), `KnownAnswers` (« Déjà connu »),
`LineSources`, callouts de demandes du valideur, `FramingDictation` (« Dicter »). 23 questions
(`lib/framing/dimensions.ts`, libellés `fr.framingIntel.questions`). Gel : `editableIn` (étape `not_started` /
`in_progress`) + SQL `framing_dimension_editable`.

**Écart : DIFFÉRENT** (mise en page) ; le fond est là.
- Remplacer le menu à gauche + écran par question par : ligne « Confirmation humaine · x/y · n dimensions complètes sur 6 »,
  encadré « Question de PO » (la question courante = `nextAfter` ou `?q=`), puis les **6 cartes repliables** (réutiliser
  `KnownAnswers` / lignes existantes, ajouter la pastille par ligne et « Répondre »). Le parcours de gauche devient celui du
  Cadrage (4 étapes). **M-L.**
- Mots : « Pourquoi ce n'est pas applicable \* » / « Marquer non applicable » (app : « Pourquoi ce point ne s'applique
  pas ? » / « Raison » / « Enregistrer ») ; « À définir avant le \* » / « Reporter, avec une tâche » (app : « Quand faut-il
  le définir ? » / « Enregistrer ») ; pastilles « Confirmé » / « Non applicable » / « À définir plus tard » (app : trois
  états seulement : Connu / À confirmer / Manquant, les deux autres dits dans la ligne). **S.**
- « Écrire moi-même » : bouton dans l'app (ticket § 4) ; dans le proto, le champ est ouvert d'emblée pour une
  information manquante. Suivre le proto (le champ ouvert **est** « écrire moi-même ») ; signaler à Sacha l'écart au mot
  du ticket.
- EN TROP vs proto (mais demandés par des retours, à garder dans le contenu des lignes) : réponses structurées
  (PROJ-UX-04/05), parties juridiques qualifiées (PROJ-BUG-03), contradictions (PROJ-BUG-04), dépenses du Budget, échéances
  Ferme/Estimée, « Passer » / « Écarter ». À **masquer ou retirer** : `QuestionPager` (précédente/suivante : remplacé par
  « Répondre » sur chaque ligne), `DimensionNav`. **« Dicter »** (`FramingDictation`) : absent du proto, ni demandé par le
  ticket Cadrage ; existe par décision antérieure (CLAUDE.md « Dictée ») — à trancher par Sacha (proposition : le garder
  comme action secondaire de l'encadré « Question de PO », il ne complexifie pas le parcours).
- « Master final calculé par PDS OS (sortie − 14 jours, délai The Orchard) » : **MANQUANT** dans l'app (l'échéance
  master final est demandée, pas calculée). Calcul par le code depuis la date cible confirmée + règle du distributeur
  (`lib/distribution/`) : **S**, pas de migration si c'est une valeur « à confirmer » de source « Calculé par PDS OS ».
- Le jeu de questions du proto (17, données de Néons) n'est **pas** à recopier : l'app suit les sous-points du ticket § 3.

### 1.6 fr3 — Brief de cadrage

**Proto** (`marketing_framebrief.txt`, `frshots/f3_*`, frBrief l. 2117-2141, gestes `frcreate` / `frsend` / `frdecide`) :
- Tant que des dimensions sont ouvertes : « Le Brief se crée quand les 6 dimensions sont complètes : n points à traiter dans
  « Les 6 dimensions ». »
- « Créer le Brief » (puis « Créer la version n » après une demande) → carte **« Brief de cadrage · version 1 »**, pastille
  « À envoyer », « Créée par Lina Haddad le 02/10, 16:00 », le document : une ligne par dimension « 01 · Objectif » puis
  « Libellé : valeur · source » (source = « Échange de cadrage du … · confirmé par X », « … · confirmé par X » ou la source
  connue) ; « Non applicable » exclu, « À définir plus tard » écrit « À définir avant le … ».
- « Envoyer en validation à Claire Morel » → « En attente de validation » ; le Cadrage est figé.
- Direction (Claire Morel) : **« Le projet est-il assez clair pour que PO organise la suite ? »**, « **Dimensions à revoir** »
  (6 cases « 01 · Objectif » …), « Commentaire » (« Obligatoire pour demander une modification »), « Valider le Brief » /
  « Demander une modification ». Erreurs : « Cochez au moins une dimension à revoir. », « Dites ce qui doit changer. »
- Modification demandée : la version passe « Modification demandée », callout « Retour de Claire Morel : « … » ·
  Objectif » et pastille « À revoir » sur la dimension ; seules ses informations (hors « Connu ») repassent à confirmer ;
  version 2 ensuite (« Remplacée » pour la précédente). Les versions sont des cartes, la dernière ouverte.
- Validé : « **✓ Brief validé · ✓ Cadrage terminé.** Validé par Claire Morel le … PO propose maintenant le plan du projet. »
- Qui est notifié : « Maintenant » de la direction « Valider le Brief de cadrage » ; page Validations (host.js
  `workPage("valid")`).
- Défaut du proto à ne pas recopier : après une demande, l'étape Brief passe « Plus tard » et **cache** ses versions
  (« S'ouvre quand Les 6 dimensions est fait. ») : dans l'app, l'historique doit rester lisible (VISION-UX § 4 « étapes
  verrouillées visibles et lisibles »).

**App** : page `app/(app)/app/projects/[projectId]/framing/brief/page.tsx` ; création `?step=brief` →
`components/framing/intel/brief-ready.tsx` (« Créer le Brief », « Mettre à jour le Brief », ce qui reste, reportés,
facultatifs) ; `generateBrief` / `sendBrief` / `decideBrief` (`lib/framing/actions/brief-versions.ts`) ; SQL
`create_framing_brief`, `send_framing_brief`, `decide_framing_brief`, trigger `framing_brief_follow_validation`,
`framing_dimension_editable` (`20261006000101_framing_intelligent.sql`), demandes `framing_brief_requests`,
`resolve_framing_brief_request`, `withdraw_framing_brief_request` (`20261011500101_brief_requests_plan_steps.sql`).
Composants : `BriefDocument` (synthèse en tête : décisions, points ouverts, risques, prérequis, responsables),
`BriefOwnerActions` (envoi en `FormDialog` avec « Message au valideur », dérogation si version identique),
`BriefValidatorActions` (`ConfirmDialog` « Valider le Brief ? » ; `BriefRequestForm` = liste de demandes par dimension /
question, obligatoire ou facultative), `BriefRequestsSection` (Ouvertes / Toutes), `BriefCompare`, `BriefHistory`,
`FramingReadiness`, `BriefActions` (PDF `lib/framing/brief-pdf.ts`). États `fr.framingIntel.brief.states` = mêmes mots
que le proto (À envoyer, En attente de validation, Brief validé, Modification demandée, Remplacée). Validation : notification,
Mon Travail, Validations du projet (via `request_validation`).

**Écart : DIFFÉRENT.**
- Lieu : le proto met création, envoi et **décision de la direction dans l'étape** (en ligne, sans modale, avec la question
  « Le projet est-il assez clair pour que PO organise la suite ? ») ; l'app a une page à part et des modales.
- Versions : cartes repliables (proto) vs une version affichée + comparaison + historique (app).
- Demande de modification : proto = cases de dimensions + un commentaire ; app = **liste de demandes** ancrées, obligatoires
  ou facultatives, à corriger / justifier / lever (PROJ-UX-06, demandé par un retour). **EN TROP vs proto mais demandé** :
  à garder côté données ; proposer à Sacha l'affichage du proto (cases + commentaire) comme saisie simple, la demande
  détaillée en option. Si on suit strictement le proto : l'ancien appel `decide_framing_brief(commentaire, dimensions)`
  marche toujours (doc § 6, « L'ancien appel … marche toujours ») → **pas de migration**.
- EN TROP vs proto, sans ticket qui l'impose au parcours : « Message au valideur » à l'envoi, synthèse calculée en tête du
  document (PROJ-BUG-04, demandée), « Comparer les versions », complétude « Cadrage complet ≠ prérequis satisfaits »,
  PDF. À garder repliés ou en action secondaire ; la page `/framing/brief` peut rester comme « document complet » ouvert
  depuis la carte de version.
- Après validation : « Voir le plan du projet » mène à la Vue d'ensemble (`routes.projectPlan` = `#plan`) ; dans le proto,
  l'étape suivante est **fr4 dans le Cadrage**.
**Effort M.** Pas de migration.

### 1.7 fr4 — Plan du projet

**Proto** (`marketing_planready.txt`, `frshots/f4_edit`, `f4_launched`, frPlanView l. 2144-2152, FR_PLAN l. 2135-2143) :
- Encadré PO : « PO propose l'organisation à partir du Brief validé. Modifiez-la si besoin : rien ne démarre avant
  « Lancer le plan ». »
- 4 colonnes : **Focus** « Ce qui commence maintenant », **Ensuite** « Ce qui suit une étape », **Pendant ce temps** « Ce qui
  avance en parallèle », **À anticiper** « Ce qu'il faut prévoir » ; colonne vide « — ».
- Cartes (8, une par workflow ou partie du Marketing) : « **Stratégie** · Marketing » « Elle décide du dispositif et des
  livrables » « Lina Haddad · Ven. 09/10 » ; « **Master** » « Master final dans 7 semaines : il démarre maintenant » « Lina
  Haddad · Master final le Sam. 21/11 » ; « **Juridique** » « Un emprunt à sécuriser : « Night Lights » » « … · Avant le
  Sam. 21/11 » ; « **Conception** · Marketing » « Après la Stratégie » « Nadia Benali » ; « **Production** · Marketing »
  « Après la Conception » « Tom Mercier · Livraison le Sam. 28/11 » ; « **Activations** · Marketing » « Après la Stratégie » ;
  « **Distribution** » « Après le Master final » « Lina Haddad · Pré-save le Sam. 14/11 » ; « **Suivi & bilan** · Marketing »
  « Après la sortie ». Pilote par défaut : responsable du projet, direction créative pour la Conception, chargé de
  production pour la Production.
- « Lancer le plan » / « Modifier le plan » (responsable seul ; autres : « En attente de Lina Haddad : lancer le plan du
  projet »). Modifier : sous chaque carte deux menus « Colonne de X » et « Pilote de X » (membres) ; « Enregistrer le plan »
  / « Annuler » (toast « Plan enregistré. »).
- Lancer (sans confirmation) : callout « **Plan lancé** par Lina Haddad le 03/10, 10:09. Les workflows du Focus et de
  « Pendant ce temps » ont démarré. » ; journal « Plan du projet lancé : les workflows du Focus démarrent » ; le Cadrage est
  terminé (point « done » dans la sidebar) ; **les quatre workflows se déverrouillent** ; la Vue d'ensemble passe aux cartes
  de workflow (`o_launched`) — le plan n'y est **pas** recopié, il reste dans Cadrage › Plan du projet.
- Ensuite (méta de l'étape) : « Stratégie › Démarrer la stratégie ».

**App** : proposition `lib/plan/propose.ts` (`proposePlan`, `framingDueDate`, règle des 42 jours pour le Master, blocage
juridique → Focus), `components/plan/plan-board.tsx` (colonnes, `PlanStepCard`, `PlanStepForm` en modale : colonne,
pilote, exécutant, échéance, dépendances ; monter / descendre ; retirer / remettre ; « Ajouter une étape » ;
`PlanLaunchReview` avant lancement), `components/plan/project-plan-section.tsx` (section `#plan` de la Vue d'ensemble),
après lancement `components/plan/plan-steps-section.tsx` + `plan-steps-table.tsx` + `plan-history.tsx` + « Hors du plan »
+ `BriefDrift` ; actions `lib/plan/actions.ts` (`launchPlan`), `lib/plan/step-actions.ts` ; SQL `project_plans`,
`project_plan_items`, `launch_project_plan`, `launch_plan_workflow`, `workflow_is_launched`, `start_stage` (refus
`plan_required`) (`20261006000201_project_plan.sql`, `20261007000101_plan_add_workflow.sql`,
`20261011500101_brief_requests_plan_steps.sql` : pilote / exécutant / échéance / dépendances / `project_plan_events`,
`update_/add_/move_/set_project_plan_item_done`) ; verrous `components/plan/workflow-locked.tsx` dans
`master/layout.tsx`, `legal/layout.tsx`, `strategy/page.tsx`, `strategy/brief/page.tsx`. Textes `fr.framingIntel.plan`,
`fr.planSteps` (`lib/i18n/fr/plan-steps.ts`). « Planning » (`app/(app)/app/projects/[projectId]/planning/page.tsx`) est
une **frise datée**, pas le Plan du projet.

**Écart : DIFFÉRENT / MANQUANT.**
- **Lieu** : étape 4 du Cadrage (proto) vs Vue d'ensemble (app, décision du 07/10 « il n'y a plus de page /plan »). Le
  proto inverse cette décision : la Vue d'ensemble ne montre plus le plan, le Cadrage le porte. **M** (déplacer
  `ProjectPlanSection` dans l'étape, `routes.projectPlan` → l'étape, mettre à jour `WorkflowLocked`, `ProjectAttention`,
  `next-action.ts`, le lien du Brief validé).
- **Périmètre des cartes** : app = Stratégie de lancement, Master, Juridique, Conception, Livraison & sortie + lignes
  d'anticipation ; proto = 8 cartes dont **Production, Activations, Distribution, Suivi & bilan** et aucune ligne
  d'anticipation non-workflow. Mots : « Stratégie » (pas « Stratégie de lancement »), sous-titre « · Marketing ».
  **MANQUANT** : Production, Activations, Suivi & bilan ; « Livraison & sortie » → « Distribution ». **Migration
  nécessaire** : élargir `project_plan_items_workflow_check` (`'production','activations','distribution','review'`,
  `delivery` renommé ou gardé en alias), `project_plan_items_launchable`, la règle de démarrage de `launch_project_plan`
  (Focus et Pendant ce temps démarrent) et `workflow_is_launched` pour les nouveaux ; reprise des plans existants
  (`delivery` → `distribution`). **M.**
- **Verrou avant le plan** : le proto verrouille les 4 workflows (Master, Juridique, Marketing, Distribution) jusqu'au
  lancement ; l'app laisse Distribution (`release/`) et le reste du Marketing (`design/`, `production/`, `activations/`,
  `review/`) ouverts. Ajouter `WorkflowLocked` aux layouts `release/` et des pages Marketing. **S-M.** Pas de nouvelle
  table (règle `workflow_is_launched` étendue = même migration que ci-dessus). Après lancement, le proto ouvre aussi
  Distribution même « À anticiper » : à confirmer (proposition : un workflow À anticiper est lisible, sans action).
- **Modifier le plan** : proto = 2 menus en ligne par carte (colonne, pilote) ; app = modale par étape avec exécutant,
  échéance, dépendances, ordre, retrait, ajout (PROJ-UX-07, demandé par un retour). EN TROP vs proto mais demandé :
  garder la modale comme « Modifier » d'une carte, mettre les deux menus du proto en ligne. Pilote par défaut : app = le
  responsable pour tout ; proto = rôle du workflow (direction créative → Conception, chargé de production → Production).
  **S.**
- **Lancer** : proto sans confirmation, callout « Plan lancé … » ; app : revue `PlanLaunchReview` en modale (PROJ-UX-07).
  Garder la revue (geste qui démarre des workflows : VISION-UX, décision du 07/10), aligner le callout. **S.**
- **Après lancement** : proto = l'étape reste lisible dans le Cadrage, rien sur la Vue d'ensemble ; app =
  `PlanStepsSection`, historique, « Hors du plan », `BriefDrift` sur la Vue d'ensemble. EN TROP vs proto (demandé par
  PROJ-UX-07 / PROJ-BUG-04) : à déplacer dans l'étape « Plan du projet » (repliés), pas à supprimer. **S.**
- « Ensuite » de l'étape (« Stratégie › Démarrer la stratégie ») : prérequis inter-modules, fourni par le parcours. **S.**

### 1.8 Acceptation du projet (« Prise en charge »)

**Proto** : n'apparaît que comme fait de fr1 (« Prise en charge · Acceptée le Jeu. 01/10/2026 par Lina Haddad ») et source
de l'information « Responsable du projet · Prise en charge acceptée le 01/10 ». Aucun écran d'acceptation dans
`projet.html` (le parcours commence « Projet accepté : cadrage à faire »).
**App** : avant acceptation, `components/projects/unlaunched-overview.tsx` (`HandoverSummary`, `ClarificationList`,
`respond_to_assignment`, `20260926000601_project_transmission.sql`, `20261011500301_brief_transmission_ux.sql`) ;
`knowledge.acceptedAt` lu pour le fait.
**Écart : OK** pour ce que le proto montre (fait + source). L'écran d'acceptation est **hors proto** (amont, VISION-UX
§ 6 « Lancement ») : à garder tel quel. Seul alignement : format de date « Jeu. 01/10/2026 ». **S.**

---

## 2. Correspondance résumée (proto → app)

| Proto | Route app | Composants | lib | SQL | Textes |
| --- | --- | --- | --- | --- | --- |
| Vue d'ensemble avant plan | `app/(app)/app/projects/[projectId]/page.tsx` | `FramingEntry`, `ProjectAttention`, `ProjectJourney` | `lib/framing/knowledge.ts`, `assess.ts` | — | `fr.framingIntel.entry`, `fr.shell.project.journey` |
| Parcours Cadrage (4 étapes) | — (à créer) | (`NowCard`, `JourneySpine`, `StepPanel` existent) | (à créer `lib/framing/journey.ts`) | `project_stages`, `framing_briefs`, `project_plans` | `fr.journey` |
| fr1 Démarrer | `/framing` (sans démarrage) | `FramingEntry` | `lib/framing/actions/start.ts` | `start_stage`, marqueur `context_analysis` | `fr.framingIntel.entry` |
| fr1 Préparer un échange | `/framing` (panneau) | `FramingCallSheet`, `AgendaEditor`, `ParticipantsField`, `CallFields` | `lib/framing/actions/call.ts`, `call-prep.ts`, `call-sheet-data.ts` | `create_framing_call`, `framing_calls`, `calls` | `fr.framingIntel.call`, `fr.calls` |
| Compte rendu | `/calls/[callId]` | `CallWorkspace`, `CallClosureSection` | `lib/calls/*`, `lib/framing/import-report.ts`, `call-analysis.ts` | `save_call_report`, `report_items.brief_key`, `call_closures` | `fr.calls` |
| Propositions de l'échange | `/framing?step=review&call=` | `CallReview` | idem | `field_values`, `needs`, … `review_status` | `fr.framingIntel.guide.review` |
| fr2 Les 6 dimensions | `/framing?step=<dim>&q=` | `DimensionNav`, `QuestionScreen`, `KnownAnswers`, `*Lines`, `FramingProgress`, `FramingDictation` | `lib/framing/actions/*`, `help.ts`, `dimensions.ts` | `field_values`, `framing_deadlines`, `framing_constraints`, `framing_legal_parties`, `framing_dimension_editable` | `fr.framingIntel.questions/guide/answerStates` |
| fr3 Brief | `/framing?step=brief`, `/framing/brief` | `BriefReady`, `BriefDocument`, `BriefOwnerActions`, `BriefValidatorActions`, `BriefRequestForm`, `BriefRequestsSection`, `BriefCompare`, `BriefHistory` | `brief-versions.ts`, `brief-snapshot.ts`, `brief-requests.ts`, `brief-pdf.ts` | `framing_briefs`, `framing_brief_requests`, `create_/send_/decide_framing_brief` | `fr.framingIntel.brief`, `fr.briefRequests` |
| fr4 Plan | Vue d'ensemble `#plan` | `ProjectPlanSection`, `PlanBoard`, `PlanStepForm`, `PlanLaunchReview`, `PlanStepsSection`, `PlanHistory`, `BriefDrift`, `WorkflowLocked` | `lib/plan/*` | `project_plans`, `project_plan_items`, `project_plan_events`, `launch_project_plan`, `launch_plan_workflow`, `workflow_is_launched` | `fr.framingIntel.plan/locked`, `fr.planSteps` |

---

## 3. Liste des écarts, chiffrés

| # | Écran / élément | Écart | Effort | Migration |
| --- | --- | --- | --- | --- |
| 1 | Parcours Cadrage en 4 étapes (patron) | MANQUANT | M | non |
| 2 | Vue d'ensemble avant plan (« Avant les workflows », Maintenant, « Non démarré ») | DIFFÉRENT | S | non |
| 3 | Sidebar : point d'état + compteur du Cadrage | MANQUANT | S | non |
| 4 | fr1 cartes de départ (ordre fixe, carte cliquable, règle de recommandation, raison, « Voir le détail », « Changer ») | DIFFÉRENT | S-M | non |
| 5 | fr1 formulaire de call commun en ligne + récapitulatif + invitations | DIFFÉRENT | M (L si la brique n'existe pas) | oui (`create_framing_call` v2 ou lien) |
| 6 | Propositions du call dans les 6 dimensions (plus d'écran `?step=review`) | DIFFÉRENT | S | non |
| 7 | Résumé aux participants (versions, externes) | MANQUANT | M | oui (résumés versionnés) |
| 8 | fr2 mise en page (question de PO + 6 cartes, plus de menu ni pager) | DIFFÉRENT | M-L | non |
| 9 | fr2 mots NA / plus tard, pastilles Confirmé / NA / plus tard | DIFFÉRENT | S | non |
| 10 | Master final calculé (sortie − délai distributeur) | MANQUANT | S | non |
| 11 | Dictée dans le Cadrage | EN TROP (à trancher) | — | non |
| 12 | fr3 Brief dans l'étape, décision en ligne, versions en cartes | DIFFÉRENT | M | non |
| 13 | Demandes de correction détaillées, comparaison, message au valideur, PDF | EN TROP vs proto (retours) : replier | S | non |
| 14 | fr4 Plan dans le Cadrage (quitte la Vue d'ensemble) | DIFFÉRENT | M | non |
| 15 | Plan : 8 workflows (Production, Activations, Distribution, Suivi & bilan) | MANQUANT | M | **oui** (check `workflow`, lancement, `workflow_is_launched`, reprise `delivery`) |
| 16 | Verrou de tous les workflows avant le plan | DIFFÉRENT | S-M | même migration que 15 |
| 17 | Modifier le plan : colonne + pilote en ligne, pilote par rôle | DIFFÉRENT | S | non |
| 18 | Après lancement : plan lisible dans l'étape, Vue d'ensemble sans plan | DIFFÉRENT | S | non |
| 19 | Format de date « Jeu. 01/10/2026 » dans les faits | DIFFÉRENT | S | non |

**Effort total estimé : 10 à 13 jours** (dont ~3 j si la brique « formulaire de call commun » et la brique « résumé aux
participants » sont faites par un autre lot et seulement branchées ici).

---

## 4. Briques communes utilisées par la zone

| Brique (proto) | Dans l'app | Où | État pour le Cadrage |
| --- | --- | --- | --- |
| Parcours (« Maintenant », spine, étape ouverte) | Oui | `lib/ui/journey.ts`, `components/shell/journey/*` ; assemblage `components/legal/legal-step-frame.tsx` | Non utilisé par le Cadrage (à brancher). 4 colonnes vs 5 du proto (Coordonne) |
| Fil d'Ariane | Oui | `ProjectPageTitle` (`projectTrail`) | À alimenter avec l'étape (« Cadrage › Démarrer le cadrage ») |
| Chevrons | Oui | `SectionSteps` | Sans objet : le Cadrage n'a pas de chevrons (ticket Architecture, proto idem) |
| Cartes de choix « Recommandé » + raison | Partiel | seulement dans `FramingEntry` ; `ChoiceCards` (`components/ui/choice-cards.tsx`) n'a pas de badge ni de raison | À extraire en variante de `ChoiceCards` (carte-bouton, `recommended`, `reason`) : Cadrage, Stratégie, Conception, Production |
| Formulaire de call commun (pastilles, date, heure, format, ordre du jour, récapitulatif, « Confirmer et inviter ») | Partiel, en 3 variantes | `CallPlanForm`/`AttendeesField`/`CallSlotFields`/`MeetField` (Teams), `FramingCallSheet` + `ParticipantsField` + `AgendaEditor` + `CallFields`, `AgendaTopicsField` | Unifier ; le Cadrage passe de `FramingCallSheet` à la brique |
| Compte rendu | Oui | `components/calls/closure/*`, `ReportView` | OK (reste dans Calls, ticket § 5) |
| Résumé aux participants | Non (seulement partage du compte rendu) | `ShareReportForm` | À créer (message rédigé par PO, versions, externes) |
| Proposition Confirmer / Modifier / Écarter avec phrase citée | Oui | `QuestionScreen`, `SourceLine`, `ProposedBadge`, `CallReview` | OK sur le fond ; présentation à aligner (§ 1.5) |
| Cartes de versions | Partiel | `BriefCompare`, `BriefHistory` (pas de carte repliable par version) | À faire pour le Brief (version la plus récente ouverte) |
| Décision avec motif | Oui | `BriefValidatorActions`, `BriefRequestForm`, `ReasonForm`, `answer-states.tsx` | À présenter en ligne dans l'étape |
| Modale verre | Oui | `FormDialog`, `ConfirmDialog` | Le proto n'en utilise pas dans le Cadrage (tout en ligne) |
| « En attente de X : … » | Oui | `NowCard`, `JourneyActor` | via le parcours |
| Pages privées triées | Hors app pour le Cadrage | (Production `/p/…`, Master `/m/…`) | Jade Petit (management) invitée « sur son lien privé » : dépend de la zone pages privées |
| « Signaler un blocage » / « Noter une information » | ? | (zone commune) | Non présents sur le Cadrage de l'app |
| « Qui fait quoi » | Production seulement (`WhoDoesWhat`) | `components/production/journey/` | Non présent sur le Cadrage |

---

## 5. Simulations du proto et vrais événements

| Bouton pointillé (proto) | Vrai événement dans l'app |
| --- | --- |
| « Proto : l'échange a eu lieu, compte rendu reçu » (`prepheld` → `frReveal`) | Le call de cadrage (créé par `create_framing_call`) est enregistré dans PDS OS (`call-recorder.tsx`, parties toutes les 20 s), transcrit (`lib/ai/transcribe.ts`, Groq), compte rendu (`lib/calls/pipeline.ts`, `save_call_report`) ; puis `app/api/calls/[callId]/extract/route.ts` → `fillBriefFromCall` / `call-analysis.ts` écrit les propositions « à confirmer » avec citation (`report_items.brief_key`) ; citation introuvable = écartée. Côté invités : invitation (membres notifiés par `call_attendees_notify`, externes `call_guests` / e-mail ; lien privé à venir). |
| Valeurs de « M'aider à définir » (3 formulations figées) | `proposeHelp` (`lib/framing/help.ts`) : jusqu'à trois formulations citées d'une source réelle, vérifiées par le code, gardées dans `<clé>_suggestions` (quota `takeAiRequest`). |
| Lien Meet aléatoire à la création | `MeetField` / `lib/calls/plan-call.ts` (lien Google Meet créé par OAuth, ou collé). |
| « Plan lancé » | `launch_project_plan` (SQL) : enregistre le plan, démarre les workflows de Focus et Pendant ce temps (`start_stage` de la Stratégie, `workflow_is_launched`). |

Aucune autre simulation dans la zone (la décision de la direction, l'envoi en validation et les réponses sont de vrais
gestes de personnes de PDS).

---

## 6. Découpage proposé en sous-lots

Ordre pensé pour que chaque lot soit livrable et testable seul, sans casser l'existant.

**Lot F1 — Parcours du Cadrage (M, sans migration).**
`lib/framing/journey.ts` (4 étapes, titres dynamiques fr1, statuts calculés, acteurs et todos, résumés),
`components/framing/framing-step-frame.tsx` (NowCard + JourneySpine + StepPanel), routes d'étape et redirections
(`?step=*`, `/framing/brief`, `routes.projectPlan`). Le contenu actuel de chaque écran est d'abord rangé dans son étape tel
quel (entrée, dimensions, Brief ; plan encore sur la Vue d'ensemble). Branche Travail / Accueil sur les todos du parcours
(`lib/work/next-action.ts`), sidebar avec point et compteur.
Risques : liens profonds (notifications de validation → page du Brief, e-mails), tests `pnpm build` ; garder les anciennes
URL en redirection.

**Lot F2 — Démarrer le cadrage (S-M, sans migration).**
Cartes de départ en brique commune (variante de `ChoiceCards` : carte-bouton, `recommended`, `reason`), règle
`missing + to_confirm > known`, ordre fixe, « Voir le détail » replié, faits « Prise en charge » / « Projet », « Changer »
avant tout échange créé, attente pour les autres rôles. Vue d'ensemble avant plan : « Avant les workflows » + Maintenant
(à faire avec l'inventaire Vue d'ensemble).
Risque : `FramingEntry` est aussi utilisé par la Vue d'ensemble : la retirer de là en même temps.

**Lot F3 — Les 6 dimensions (M-L, sans migration).**
Ligne « Confirmation humaine », encadré « Question de PO », 6 cartes repliables avec pastilles et « Répondre », gel pendant
la relecture (callout), mots NA / plus tard, plus de `DimensionNav` ni `QuestionPager` ; `?step=review` redirige ici
(propositions de l'échange avec phrase et « Échange de cadrage du … »). Master final calculé (valeur à confirmer).
Risque : `QuestionScreen` (563 lignes) porte beaucoup de cas (listes, mesures, parties) : ne changer que l'enveloppe ;
vérifier chaque genre de question à la main.

**Lot F4 — Brief de cadrage dans l'étape (M, sans migration).**
Cartes de version, « Créer le Brief » / « Créer la version n », « Envoyer en validation à X », décision en ligne de la
direction (question du proto, cases « Dimensions à revoir », commentaire obligatoire pour une modification), callout de
retour, « ✓ Brief validé · ✓ Cadrage terminé ». Demandes détaillées, comparaison, PDF : repliés / page détail.
Risque : `decide_framing_brief` refuse de valider avec une demande obligatoire ouverte : l'affichage simple doit le dire.

**Lot F5 — Plan du projet dans le Cadrage, 8 workflows (M+M, migration).**
Migration `…_plan_all_workflows.sql` : élargir `project_plan_items_workflow_check` et `_launchable`, règle de démarrage de
`launch_project_plan` / `launch_plan_workflow`, `workflow_is_launched` pour production / activations / distribution /
review, reprise `delivery` → `distribution` ; tests pgTAP dans `brief-requests-plan-steps.test.sql`. `proposePlan` : 8
cartes, raisons du proto, pilote par rôle ; `PlanBoard` dans l'étape fr4, édition en ligne (colonne, pilote) + modale
existante pour le détail ; callout « Plan lancé … » ; Vue d'ensemble sans plan ; verrous `WorkflowLocked` sur Distribution
et Marketing.
Risques : plans déjà lancés en prod (lecture de `delivery`), pages qui supposent qu'une Stratégie non lancée laisse la
Conception ouverte, migration à pousser en prod avec accord (CLAUDE.md).

**Lot F6 — Échange de cadrage sur la brique commune (M, migration légère) — après la brique « formulaire de call
commun ».** Participants par id (membres, Réseau, e-mail), format, ordre du jour = dimensions ouvertes, « Envoyé avec
l'invitation », récapitulatif, « Confirmer et inviter », faits « Échange prévu ». Migration : `create_framing_call` v2
(attendees / guests) ou fonction de rattachement.
Risque : `framing_calls.participants` (noms) déjà en base : garder en lecture.

**Lot F7 — Résumé aux participants (M, migration) — brique commune avec Stratégie / Conception / Production.**
Brouillon écrit par le code depuis les informations confirmées (budget exclu, pas de citations), relu, envoyé, versions,
« Corriger et renvoyer » ; membres notifiés (trigger) ; externes par e-mail (puis page privée).

Ordre conseillé : F1 → F2 → F3 → F4 → F5, puis F6 / F7 quand les briques communes existent.

---

## 7. Défauts du proto à ne pas recopier (à signaler)

- « Préparer **le** échange de cadrage » / « Tenir **le** échange de cadrage » (remplacement de texte dans `frActors`).
- Carte « Maintenant » du Cadrage : « Le **Marketing** avance sans vous pour l'instant » (doit dire le Cadrage).
- Après une demande de modification, l'étape Brief passe « Plus tard » et masque ses versions : l'historique doit rester
  visible.
- « Pendant ce temps » vide avec les données de Néons : la colonne existe, la règle de placement reste celle du code
  (Master ou Juridique y vont quand ils ne sont pas critiques, `proposePlan`).
- Aucun « Lire le compte rendu » pour l'échange de cadrage (le ticket le garde dans Calls : un lien vers le call depuis le
  fait « Départ » suffit).
