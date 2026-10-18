# Inventaire « Master » : proto ↔ app PDS OS

Zone : workflow Master (Source → Brief → Mixage → Mastering → Master final, facture), lien privé de
l'ingénieur `/m/…`, écoute de l'artiste, formulaire de call commun appliqué au Master.

**Sources lues**
- Proto : `docs/protos/master-v2.html` (script en ligne, intégralement), `docs/protos/src/global/master-patch.js`,
  `docs/protos/src/global/build-global.py` (les 3 patchs appliqués au Master dans `projet.html` : formulaire
  d'échange commun `mxPrep`, cartes de choix « Recommandé » `briefStartChoice`, callout « Échange prévu le … »),
  `host.js` (Master dans la coquille, pages privées réunies). Textes réels de chaque scénario `master:*` × chaque
  rôle « Voir comme » capturés dans `scratchpad/inventory/master_out/<scénario>__<rôle>.txt` (script
  `scratchpad/inventory/master_tools/roles.cjs`) + `scratchpad/shots/master_*.txt`.
- Anciens tests : `docs/protos/tests/{source,dates,audio,mixer-package}.cjs`.
- Règles : `docs/VISION-UX.md` § 4 (patron), § 5 règles 2, 3, 4, 6, 7, 13, 14, 17, 19, 21 (deux règles portent le
  n° 21 : « Les retours restent dans l'équipe » et « Une proposition se tranche une par une »), 22 (deux aussi :
  « Une désignation dit d'où elle vient » et « Pas d'onglets sous les chevrons »).
- Ticket Master (Drive « Ticket Master (dans projet) » › « Lire le ticket Master », doc
  `1z05z8Er5a3keQm2XLsMCLeNc4hZbGjCzffxJNLs6J3A`, Ibé, 30/09/2026, 14 points) : copié dans
  `scratchpad/inventory/drive_master/ticket.txt`.
- App (worktree `PDS-OS-projet-complet`, branche `feat/projet-complet`) : `app/(app)/app/projects/[projectId]/master/**`,
  `app/(public)/m/[token]/page.tsx`, `lib/master-workflow/*` (49 fichiers), `components/master-workflow/*` (48),
  `lib/i18n/fr/master-workflow.ts`, `lib/ui/master-steps.ts`, `lib/workflow-status/rules.ts` (`masterState`),
  migrations `20260927003001_master_page` … `20261012101801_engineer_messages` (17 fichiers master*/mix*/engineer*),
  `docs/ARCHITECTURE.md` § 8 septies (lots 1 à 10).

**Différence de fond à garder en tête partout**
1. **Forme** : l'app est un module à **5 pages sous chevrons `SectionSteps`** (`/master`, `/master/brief`,
   `/master/mix`, `/master/mastering`, `/master/final`) faites de `PageSection` empilées. Le proto est le **patron
   unique** (§ 4) : en-tête du module, « Maintenant », Parcours à gauche, Étape ouverte à droite, « Déjà fait » en
   bas, « Historique du master » en pied du parcours. Les briques existent (`components/shell/journey/*`, déjà
   utilisées par Production et Juridique via `LegalStepFrame`) mais **le Master ne les utilise pas**.
2. **Plusieurs titres** : l'app gère N titres par projet (sources, versions, mix finals, livrables par titre). Le
   proto montre un single (« Néons »). Toute la refonte doit garder le multi-titre (une ligne par titre dans les
   faits, statuts agrégés « 2 titres sur 3 »).
3. **Externes et e-mail** : l'app n'envoie aucun e-mail (mailto + « J'ai envoyé le lien ») et ne garde que
   l'empreinte SHA-256 du jeton (lien montré une seule fois). Le proto suppose que PDS OS envoie l'e-mail et que le
   lien reste visible dans l'étape (règle 19) : dépend du branchement Google Workspace (CLAUDE.md « Décisions en
   attente ») et d'un jeton récupérable chiffré.
4. **Ingénieur maison (compte PDS)**, **artiste qui écoute par lien**, **prise en charge avec tarif**, **facture
   et RIB** : n'existent pas du tout dans l'app.

Légende des écarts : **OK** identique · **DIFFÉRENT** · **MANQUANT** · **EN TROP**. Effort : S (< ½ j), M (1–2 j),
L (> 2 j). « Migr. » = migration SQL nécessaire.

---

## 0. Coquille du module Master (toutes les étapes)

### Ce que montre le proto
- Fil d'Ariane `Néons › Master › <étape>` (« Néons » ouvre la Vue d'ensemble, « Master » revient au parcours).
- Titre `Master` ; ligne de faits : `« Néons » · Mona Lys · single`, `Master final attendu le Sam. 21/11/2026`,
  `Sortie Sam. 05/12/2026`.
- Bandeau de résultat (`flash`) vert après chaque geste : titre = verbe du bouton (« Source confirmée », « Brief
  enregistré », « Dossier envoyé à Karim Haddou »…), lignes « Ensuite : **Personne** (lien privé) · action » et
  « Débloqué : **Étape** · Personne · action » ; toast identique.
- **Maintenant** : « À vous » (ou « Aussi à vous » si l'étape ouverte est déjà la sienne) + `Nom · Master › Étape`,
  l'action en titre, le « pourquoi » de l'étape, « Ouvrir l'étape », « Et n autres : … ». Sinon « Rien à faire pour
  vous » + « Le Master avance sans vous pour l'instant » et jusqu'à 4 lignes « En attente de **X** (lien privé) :
  … · Étape » avec « Voir » ; quand tout est fini : « Le master final est au Catalogue ».
- **Parcours** (5 étapes) : rond coché + résumé (`Néons_maquette_v3.wav · voix définitives`, `Prêt à transmettre`,
  `Mix final : V2`, `Master final : V1`, `Au Catalogue · livrables reçus · facture à payer`, ou « Non nécessaire :
  mix déjà terminé ») ; en cours : « À vous · <action> » en bleu, ou « Personne · action », ou « En attente de Mona
  Lys · enregistrer les voix définitives… » ; verrouillée : « Après : <prérequis> ». Pied : « Historique du master ».
- **Étape ouverte** : titre + pastille (`Fait`, `En cours`, `En attente d'un retour`, `Plus tard`, `Non
  nécessaire`), pourquoi, 4 colonnes Responsable (Lina Haddad, Cheffe de projet) / Validation (« Nadia Benali ·
  Valide les versions · désignée au Brief » ou « Aucune ») / Prérequis (✓/○, y compris **hors module** : « Plan du
  projet lancé · Plan du projet · fait le 18/10 », « Équipe et temporalité · Cadrage › Brief de cadrage · validé le
  16/10 ») / Ensuite (étapes suivantes + « Distribution · attend le master final avant le Sam. 21/11/2026 »,
  « Juridique · durée du bulletin SACEM »). Étape verrouillée : « Se débloque quand X est fait. », lecture seule.
- **Déjà fait** en bas de chaque étape : `✓ geste · qui · quand · suite à : cause`.
- Ouvrir le module ouvre l'étape qui attend la personne, sinon l'étape en cours.
- « Voir comme » : Lina (CP), Nadia (DA), Claire (DG), l'ingénieur (lien), Mona (lien) ; Hugo (maison) et Studio
  Arpège dans `master-v2.html` seulement (le `roleSel` de `projet.html` ne les liste pas).

### Dans l'app
- Routes : `app/(app)/app/projects/[projectId]/master/{page,brief/page,mix/page,mastering/page,final/page}.tsx`,
  verrou `master/layout.tsx` (`workflowGate`, `WorkflowLocked` tant que le Plan n'a pas lancé le Master) = OK sur le
  fond (« Avant les workflows »).
- Chevrons : `SectionSteps` + `masterSteps()` dans `app/(app)/app/projects/[projectId]/layout.tsx` l. 179-186,
  coches calculées par `masterState` (`lib/workflow-status/rules.ts` l. 128+, statut jamais stocké : OK règle 6).
- Pas de « Maintenant », pas de parcours, pas de 4 colonnes, pas de « Déjà fait », pas de bandeau de résultat
  (toasts seuls, via `useWriteSubmit`), pas de ligne de faits sous le titre (`ProjectPageTitle` « Master »).
- Briques disponibles : `components/shell/journey/{now-card,journey-spine,step-panel}.tsx`, `lib/ui/journey.ts`
  (`JourneyStep`, `nowOf`), modèle d'intégration `components/legal/legal-step-frame.tsx` +
  `lib/legal/journey-context.ts` + `lib/legal/journey.ts`.

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Patron Maintenant / Parcours / Étape ouverte | **MANQUANT** : écrire `lib/master-workflow/journey.ts` (5 `JourneyStep` avec statut, acteur, résumé, prérequis) + `journey-context.ts` (`cache`, lit `loadStepView` mix/mastering, `loadMixVersions`, `loadMasterBrief`, `loadFinalView`, questions, messages) + `components/master-workflow/master-step-frame.tsx` sur le modèle de `LegalStepFrame` ; envelopper les 5 pages | M | non |
| Chevrons `SectionSteps` du Master | **EN TROP** une fois le parcours en place (règle 22 « pas d'onglets sous les chevrons » : le parcours remplace les chevrons) — retirer le bloc l. 179-186 du layout projet | S | non |
| Prérequis hors module (Plan lancé, Cadrage › Équipe et temporalité) | **MANQUANT** : `StepPanel` ne connaît que des clés d'étapes du module + `rootPrereq` ; ajouter des prérequis externes `{label, source, done}` | S | non |
| « Ensuite » vers Distribution / Juridique | **MANQUANT** (même extension de `StepPanel`) | S | non |
| Ligne de faits (master final attendu, sortie) | **MANQUANT** : lue dans `master_briefs.master_final_due` et la sortie du projet | S | non |
| Bandeau de résultat « Ensuite / Débloqué » au-dessus du geste (règle 7) | **MANQUANT** dans tout le Master (toasts seuls) ; brique commune à créer côté coquille si elle n'existe pas déjà ailleurs | M | non |
| « Déjà fait » par étape | **MANQUANT** (voir § 12 Historique) | — | — |
| Fil d'Ariane `Néons › Master › Étape` | **DIFFÉRENT** : brique de la coquille (`fr.shell` « Fil d'Ariane » existe pour les sous-pages) ; à traiter avec la zone coquille | S | non |
| Multi-titre | à garder : résumés du parcours agrégés (« Source confirmée pour 2 titres sur 3 ») | inclus | non |

---

## 1. Étape **Source**

### Proto (scénarios `master:start`, `master:mixdone`, `master:nostems`, `master:vocals`)
- Pourquoi : « La version de départ du mix, confirmée. Jamais un master final. » Responsable : CP. Validation :
  Aucune. Prérequis : « Plan du projet lancé ». Ensuite : Brief.
- **Dernière version détectée** (fieldset radio, la plus récente cochée) : `Néons_maquette_v3.wav` — « v3 · maquette ·
  ajoutée par Claire Morel le 02/10 · la plus récente », v2, v1 ; **bouton Écouter** (lecteur + barre d'onde) sur
  chaque version. Sous la liste : « Les versions audio du titre au Catalogue. Un master final ne peut pas être une
  source. »
- **Ce que PDS OS a vérifié** (faits avec source et pastille) : « Où en est le mix » = « Mix à faire · aucun mix au
  Catalogue » (Lu au Catalogue, `À faire`) ; « Production définitive » = Oui, source « Call de cadrage du 16/10 · « la
  prod est finie, on ne touche plus à l'instru » » (`Prête`) ; « Pistes séparées » = « 12 pistes sur 12 » (Lu par le
  code · Stems_Neons_v3.zip, `Prêtes`) ou « 0 sur 12 » (`Manquantes`) ; « Voix définitives » = « Non · le 2e couplet est
  à refaire » (citation du call de cadrage, `Pas encore`).
- **Voix pas définitives : que fait-on ? *** (encadré PO « propose deux façons de faire, chacune avec sa
  conséquence. Vous décidez. ») : « Attendre les voix définitives » (le mix attend ; PDS OS surveille ; Mix V1
  attendu le … : serré mais tenable) / « Anticiper avec une version de travail » (le mixeur commence sur la v3 ; à
  l'arrivée des voix, PDS OS propose de remplacer ; aucun mix ne peut être validé avant). Erreur rouge si rien de
  choisi : « Choisissez : attendre les voix définitives, ou anticiper avec une version de travail. »
- Bouton « **Utiliser cette version** » → flash « Source confirmée ». Après : fait « Source du mix » (v3 · confirmée par
  Lina Haddad · version de travail, Écouter), « Choix · Anticiper avec une version de travail · Décidé par Lina
  Haddad ». Si « attendre » : le **Mixage reçoit un prérequis supplémentaire** « l'arrivée des voix définitives ».
- En attente : « En attente de Mona Lys : enregistrer les voix définitives du 2e couplet (session du Ven. 13/11). » +
  « PDS OS surveille le Catalogue : à l'arrivée des voix, il propose de remplacer la source. » + simulation
  « Proto : les voix définitives arrivent au Catalogue ».
- Arrivée (`master:vocals`) : callout « **Nouvelle version reçue au Catalogue :** Néons_v4_voix_definitives.wav (v4 ·
  voix définitives du 2e couplet · session du Ven. 13/11 · Mona Lys) », fait « Nouvelle source proposée » (Écouter,
  « 12 pistes · Stems_Neons_v4.zip »), phrase « Karim la trouvera sur son lien, avec ses pistes : ses prochaines
  versions partiront de là. », bouton « **Remplacer la source et prévenir Karim** » (ou « Remplacer la source » si
  rien n'est parti) → le lien de l'ingénieur affiche « Nouvelle source le … ».
- **Un mix existe déjà au Catalogue** (`master:mixdone`) : fait « Mix trouvé » `Néons_Mix_final_Studio.wav` (« Mix ·
  ajouté par Claire Morel le 12/10 · Studio Ressac », Écouter) ; choix * « Utiliser ce mix comme mix final » (« Le
  titre passe directement au Mastering : pas de mixage, pas de pistes à envoyer. ») / « Refaire un mixage » ; si
  utiliser : champ obligatoire « **Pourquoi ce mix est le bon** * » puis bouton « Utiliser ce mix comme mix final » →
  Mixage « Non nécessaire : le mix existe déjà », flash « Mix déjà terminé : le titre passe au Mastering ».
- Qui : seule la CP agit ; les autres lisent les faits + « En attente de Lina Haddad : confirmer la source ».

### App
- `/master` (`app/.../master/page.tsx`) = `PrepareSummary` (« Où en est la préparation » : sources, Brief, envoi
  au mixeur avec boutons « Confirmer les sources », « Remplir le Brief », « Passer au mix ») + `MixDiagnosis` (« Où en
  est le mix de chaque titre » : Mix à faire / en cours / terminé / Master final déjà là, divergence Brief/crédits,
  « Utiliser ce mix comme mix final ») + `MasterInventory` (« État du master », tuiles filtres connu / à confirmer /
  manquant, sections Source / Pistes et fichiers / Mix et mastering, actions Créditer, Relier, Ajouter au Réseau,
  Ajouter l'audio, Ajouter les pistes, Ajouter une session).
- Confirmer : `ConfirmSourceButton` (modale `FormDialog` « Source du mix · titre », radios des versions, « Importer
  une version », « Utiliser cette version ») → `confirmMasterSource` (`lib/master-workflow/actions.ts`) → table
  `master_flow_sources` (une ligne par confirmation, append-only, trigger `check_master_flow_source` : jamais un
  Master final) — migration `20261004002001_master_flow_sources.sql`.
- Surveillance : « Version plus récente reçue » recalculée à la lecture (`lib/master-workflow/audio-source.ts`,
  `source-facts.ts`) — OK sur le principe, sans notification.
- Mix existant : `DeclareMixFinalButton` → `declareMixFinal` → SQL `declare_mix_final` (migration
  `20261011500501_master_existing_mix_final.sql`), raison **facultative** (« Pourquoi (facultatif) »).
- Textes : `fr.masterWorkflow.prepare`, `.diagnosis`, `.inventory`.

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Choix de la version **dans l'étape**, radios avec « Écouter » | **DIFFÉRENT** : modale, pas d'écoute (`confirm-source-button.tsx` n'utilise pas `AudioFile`). Mettre la liste en place dans l'étape, `AudioFile` par version, « Importer une version » gardé | M | non |
| « Ce que PDS OS a vérifié » (4 faits + pastilles) | **DIFFÉRENT** : « Où en est le mix » ≈ `MixDiagnosis` (OK sur le fond), « Pistes séparées » ≈ fait stems de l'inventaire ; **« Production définitive » et « Voix définitives » MANQUANTES** : l'app dit qu'aucune donnée ne les porte (ARCHITECTURE § 8 septies lot 1). Le proto les cite depuis le call de cadrage → il faut une source réelle (dimension du Brief de cadrage ou citation de transcription vérifiée, règle 12). **Point à trancher** si le Cadrage ne les pose pas | M | peut-être (champ dans le Brief de cadrage) |
| Choix « Attendre / Anticiper » avec conséquences, prérequis « voix définitives » sur le Mixage, refus de valider un mix fait sur une version de travail | **MANQUANT**. Ticket § 2 l'exige (« Attendre / Anticiper… surveiller… proposer le remplacement… notifier le Mixeur »). Colonne `master_flow_sources.plan text check (plan in ('wait','anticipate'))` (+ `waits_for text`) ; `decide_mix_version` refuse `approved` si la source en vigueur est « anticipate » non remplacée (erreur `working_source`) ; transmission bloquée si « wait » | M | **oui** |
| « Remplacer la source et prévenir Karim » | **DIFFÉRENT** : remplacer = nouvelle confirmation (OK) ; l'ingénieur n'est prévenu que par « Renvoyer le dossier » (nouveau lien). Il faut que le lien en cours montre la nouvelle source sans nouveau jeton (paquet mis à jour ou `master_transmissions.package` versionné) + notification | M | oui (fonction `refresh_master_transmission_source` ou colonne `source_updates jsonb`) |
| Notification à l'arrivée d'une version plus récente (« PDS OS surveille ») | **MANQUANT** : calcul à la lecture seulement ; ajouter un trigger sur `master_files` (audio du titre, après confirmation) → notification `master_source_newer` au responsable | S | oui |
| Mix existant : choix radio « Utiliser / Refaire un mixage » + motif **obligatoire** | **DIFFÉRENT** : bouton + confirmation, motif facultatif. Rendre `p_reason` obligatoire dans `declare_mix_final` (règle 6) et passer en radio dans l'étape | S | oui (petite) |
| `PrepareSummary` « Où en est la préparation » | **EN TROP** : double le Parcours et « Maintenant » | S | non |
| `MasterInventory` (tuiles connu/à confirmer/manquant, Pistes et fichiers, Mix et mastering, Créditer/Relier) | **EN TROP** à l'écran (le proto ne l'a pas ; l'ingénieur se désigne au Brief, ses crédits sont posés par le trigger `z_credit_engineers`). Garder « Ajouter les pistes » / « Ajouter l'audio » comme actions des faits vérifiés quand ils manquent. Complexifie : oui (3 sections + filtres) | S | non |
| Divergence Brief / crédits (`diagnosis.divergence`) | **EN TROP** non demandé par le proto ; utile pour le Juridique → garder en ligne d'alerte discrète | — | — |

---

## 2. Étape **Brief**

### Proto (scénarios `master:brief`, `master:brieflots`, `master:noeng`)
- Pourquoi : « Ce que l'ingénieur du mix puis celui du mastering doivent savoir : direction, livrables, formats,
  dates. C'est le dossier qu'ils recevront. » Prérequis : « Source confirmée », « Équipe et temporalité (Cadrage ›
  Brief de cadrage · validé le 16/10) ». Ensuite : Mixage.
- **Avant de commencer** : fait « Déjà pré-rempli · Ingénieur, validatrice, livrables, formats et dates · Cadrage,
  Réseau, Distribution », puis « **Comment voulez-vous remplir le Brief ?** » en **deux cartes de choix**
  (`projet.html`, patch `briefStartChoice`) : « Commencer directement » (« Tout ce qui est connu est déjà là. PO pose à
  Nadia Benali la question de la direction artistique ; vous complétez le reste. ») et « Préparer un échange » (« Un
  call avec l'équipe et l'ingénieur ; PO propose ensuite les réponses, avec leurs citations. ») ; pastille
  « **Recommandé** » calculée : échange si ≥ 2 manques, avec la raison « Il manque l'ingénieur du mix et la direction
  artistique : un échange ira plus vite que des questions séparées. » (`master:brieflots`).
- **Commencer directement** → la question part à Nadia (son « Maintenant » : « Répondre à la question du Brief »).
  Vue DA : carte « **Question de PO** · pour Nadia Benali · posée le 19/10 », « Quelle direction artistique et quelles
  références pour le mix de « Néons » ? », « Le Brief ne la connaît pas : c'est à la directrice créative d'en décider.
  Votre réponse ira dans le dossier de l'ingénieur. », champ « Votre réponse », « **Lire ma réponse** » (« PO lit votre
  réponse… »), puis « **Ce que PO a compris** » groupé Direction / Références / Contraintes, chaque élément avec sa
  citation « « … » » et « Retirer » ; « Envoyer la réponse » / « Modifier ma réponse ». Erreurs : « Écrivez ou dictez
  votre réponse : PO ne lit que ce que vous dites. », « Rien n'est gardé : reprenez votre réponse. »
  Vue CP : callout « **Nadia Benali a répondu** le … Rien n'entre dans le Brief avant que vous l'ajoutiez. » +
  « Ajouter au Brief ».
- **Préparer un échange** (version `projet.html`, `master-patch.js` `mxPrep`) dans l'étape : « Nouvel échange » —
  « Participants * » en pastilles (Lina Haddad, Nadia Benali, Mona Lys, Karim Haddou ; « externe » sur les liens),
  champ « Ajouter » avec suggestions (Équipe / Externe), Entrée ajoute, × ou Retour arrière retire ; « Date * »,
  « Heure * », « Format » Visio / Sur place ; « **Ordre du jour** » modifiable sur place (Monter, Descendre, Modifier,
  Retirer ; Entrée enregistre, Échap annule ; « Ajouter un point ») — points calculés : « Direction artistique et
  références », « Livrables en plus des deux finals », « Disponibilité de Karim pour le Mix V1 » ; « **Envoyé avec
  l'invitation** » : Objectif « Compléter le Brief mix et master avec ce qu'il ne sait pas encore » (Calculé depuis le
  Brief), Documents « Brief_Mix_Master_Neons.pdf · version en cours » ; « Voir le récapitulatif » / « Commencer
  directement plutôt ». Erreur « Un échange réunit au moins deux personnes. ». Récapitulatif : Quand, Participants,
  Ordre du jour, « Les invitations partent à la confirmation : Mona Lys, Karim Haddou sont externes. »,
  « **Confirmer et inviter** » / « Modifier ». Puis callout « **Échange prévu le Mar. 20/10/2026 à 14:00** avec … L'invitation
  est partie avec l'ordre du jour. » + simulation « Proto : le call a lieu (transcription) ». Puis « **Ce que PO a
  compris du call du 20/10** » (« Chaque élément cite la phrase dite. Retirez ce qui est faux, puis appliquez : rien
  n'entre dans le Brief avant. ») : 5 propositions avec citation et locuteur (direction, référence, livrable A
  cappella, message « Karim peut livrer le Mix V1 le 14/11 »), « Retirer », « **Appliquer au Brief** » → « Réponses du
  call du 20/10 appliquées au Brief le … ».
- **Contenu du Brief** (CP, éditable ; autres : lecture) :
  - Carte document `Brief_Mix_Master_Neons.pdf` : « Enregistré le … par Lina Haddad » ou « Pas encore enregistré : ce
    qui est déjà connu du projet est pré-rempli · ce que l'ingénieur recevra, sans les tarifs », pastille
    `Incomplet` / `Brouillon` / `Prêt à transmettre`, « Voir le PDF », « Il manque : l'ingénieur du mix, la direction
    artistique. »
  - Si déjà envoyé : « Dossier envoyé le … : modifier le Brief ne change rien chez l'ingénieur tant que vous ne
    renvoyez pas le dossier. »
  - **Conditions de prestation** : « Ingénieur du mix » **Karim Haddou**, source « Désigné au Cadrage › Équipe · « Karim
    fait le mix et le master » (call du 16/10) / Réseau · mix et mastering · 3 projets avec PDS, dernier : « Lumière »
    (06/2026) », « Changer » → liste du Réseau (nom, « déjà lié au projet », tarifs mix/mastering, révisions,
    historique ; « Choisir » ; « Ajouter au Réseau » ; « Fermer ») ; personne : « À choisir » + « Personne n'est
    désigné au Cadrage ni crédité sur le titre » (règle 22) ; « Même ingénieur pour le mastering » Oui / Non (pastilles) ;
    « Ingénieur du mastering » (si Non) ; « Révisions incluses » « Mix : 2 (Karim Haddou) · Réseau · leurs conditions
    habituelles » ; « **Qui valide les versions** » **Nadia Benali**, directrice créative, « Désignée au Cadrage ›
    Équipe », « Changer » (Nadia / Lina) ; « Tarif (interne) · Mix · Karim Haddou » 800 € HT, « Réseau · tarif habituel
    de Karim Haddou », pastille `Estimé`. Après un changement : « Choisi par Lina Haddad » (ligne marquée).
  - **Direction artistique** : liste groupée Direction / Références / Contraintes, source « Réponse de Nadia Benali, le
    … · chaque élément est repris mot pour mot » ou « Call du 20/10 » ; avant : « Demandée à Nadia Benali · Question
    posée par PO le 19/10 · dans son Travail » `En attente`.
  - **Livrables et formats** : pastilles cliquables (Mix final et Master final fixes ; Instrumental, Radio edit,
    A cappella, Version clean, Version live / performance, TV mix / backing track, Stems), sources par livrable
    (« Instrumental : Cadrage · « on veut l'instru pour les vidéos TikTok » », « Radio edit : Brief de cadrage ›
    Activations · passages radio »), « Formats de livraison · WAV 24 bits / 44,1 kHz · Distribution › exigences de
    The Orchard ».
  - **Dates** : 4 lignes « Mix V1 attendu le · Dim. 15/11/2026 » (« Calculé : 6 jours avant le master final »),
    « Mix final attendu le » (3 j), « Mastering attendu le » (1 j), « Master final attendu le » (« Brief de cadrage ›
    Temporalité · la date dont tout le reste dépend »), chacune « Modifier » → champ date sur place, « Proposition : …
    · source — Entrée enregistre, Échap annule. », erreur d'ordre « Cette date tombe avant « Mix V1 » : les échéances
    vont dans l'ordre (Mix V1, Mix final, Mastering, Master final). », après : « Modifié par Lina Haddad ».
  - **Message** : « Message pour les ingénieurs » (pré-rempli).
  - « **Enregistrer le Brief** » ; erreurs « Il manque l'ingénieur du mix, la direction artistique. » (ouvre la liste
    des ingénieurs), info « Rien à enregistrer : le Brief n'a pas changé depuis le … ».

### App
- `/master/brief` → `BriefPage` (`components/master-workflow/brief-page.tsx`) : `BriefHeader` (« Remplir en dictant »,
  `/api/voice/master_brief`), bouton d'en-tête « Ajouter un ingénieur », phrase `purpose` + « Enregistré le … par … »,
  sections **Source** (FactTable des sources), **Échanges** (`PrepareExchangeButton` modale + `BriefExchanges` tableau
  « Proposer pour le Brief » → `DictationReview` à cases), **Questions à l'équipe** (`BriefQuestions` : plan « à
  demander », « Poser les questions » → tâches Travail des directeurs créatifs), **formulaire** `BriefForm`
  (Conditions de prestation, Direction artistique en 3 textareas, Livrables et formats en cases + formats texte libre,
  Dates `BriefCalendarFields` avec « Proposition : … » + « Utiliser ces dates », Message), `BriefNextStep` (« Étape
  suivante : transmettre le dossier »), **Budget du projet** (`BriefBudget` « Inscrire au budget », état modifiable).
- Lib : `brief.ts` (`loadMasterBrief`), `brief-actions.ts` (`saveMasterBrief`), `calendar.ts`
  (`proposeMasterCalendar` 6/3/1 j, `calendarOrderErrors`), `framing-defaults.ts` (ingénieurs et date du master final
  depuis le Cadrage), `network-engineers.ts`, `questions*.ts`, `exchange-*.ts`, `voice.ts`, `brief-proposals.ts`,
  `budget-actions.ts`.
- SQL : `master_briefs` (`20261005000101`, colonnes `mix_contact_id`, `mastering_same_engineer`,
  `mastering_contact_id`, `mix_rate_cents`, `mastering_rate_cents`, `revisions`, `validator_person_id`,
  `references_text`, `direction`, `constraints_text`, `deliverables[]`, 4 dates, ordre en CHECK) + `engineer_message`,
  `delivery_formats` (`20261011500301`), trigger `z_credit_engineers` (`20261006002001`), `master_brief_calls`
  (`20261005010001`, `create_master_exchange`), `master_brief_questions` (`20261005016001`, `ask_/answer_/apply_master_question`).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Cartes « Commencer directement / Préparer un échange » avec « Recommandé » calculé | **MANQUANT** : `ChoiceCards` existe (`components/ui/choice-cards.tsx`) ; le choix n'est pas gardé aujourd'hui → colonne `master_briefs.start_mode` ou déduit (questions posées / échange créé) | S | non (déduire) |
| « Commencer directement » pose seul la question à la DA | **DIFFÉRENT** : la CP doit cliquer « Poser les questions » (plan affiché, 2 dimensions direction + livrables). Le geste devient le choix de la carte ; ne poser que la direction (livrables : pré-remplis Cadrage) | S | non |
| Réponse de la DA lue par PO (« Lire ma réponse » → « Ce que PO a compris » cité, Retirer, Envoyer) | **MANQUANT** : `QuestionAnswerForm` = texte libre + cases, rien de cité. Réutiliser `components/legal/intake/{question-card,proposal-review}.tsx` (même geste au Juridique) + un adaptateur `lib/ai` (schéma fermé, citations vérifiées `verbatim.ts`) | M | **oui** : `master_brief_questions.items jsonb` (éléments retenus groupés + citations) |
| Direction artistique en liste groupée citée | **DIFFÉRENT** : 3 textareas libres (`references_text`, `direction`, `constraints_text`). Garder les colonnes texte pour l'édition et ajouter les éléments cités (`master_briefs.direction_items jsonb`) ou dériver de la question | M | oui |
| Formulaire d'échange commun (participants, format, ordre du jour éditable, récap, « Confirmer et inviter ») dans l'étape | **DIFFÉRENT** : modale `PrepareExchangeButton` avec `CallFields` (titre, date-heure, lien), ordre du jour **figé**, sans participants ni format ni récap. La brique riche existe (Stratégie / Conception : `components/strategy/strategy-call-form.tsx`, `components/calls/{participants-field,call-recap,call-plan-form}.tsx`, table `strategy_calls.participants/format`) | M | **oui** : `master_brief_calls` + `participants jsonb`, `format`, `purpose`, agenda modifié (ou réutiliser le stockage commun des calls préparés) ; `create_master_exchange` à étendre |
| « Échange prévu le … avec … » dans l'étape, puis « Ce que PO a compris du call » **dans l'étape** avec Retirer / Appliquer | **DIFFÉRENT** : tableau « Échanges » + « Proposer pour le Brief » → `DictationReview` à **cases pré-cochées** (règle 21 bis : « rien n'est coché d'avance », Confirmer / Modifier / Écarter). Le moteur (`proposeBriefFromCall`, `applyBriefProposals`) est OK | M | non |
| Conditions : ingénieur avec **source de la désignation** (citation du Cadrage), « Changer » sur place, « À choisir » | **DIFFÉRENT** : `BriefEngineerField` = `PersonPickerField` (OK règle 3), ligne Réseau (structure, ville, historique) ; pas la citation du Cadrage ni « Choisi par … » ; `framing-defaults.ts` lit l'équipe du Cadrage → exposer la source | S | non |
| Tarifs et révisions **repris du Réseau** (« tarif habituel ») | **MANQUANT** : « Les tarifs et disponibilités n'existent pas encore dans le Réseau » (ARCHITECTURE). Aujourd'hui tarif et révisions **saisis** dans le Brief. Pour le proto : tarifs usuels sur le contact | M | **oui** : `network_contacts` (ou table `network_engineer_terms`) `mix_rate_cents`, `mastering_rate_cents`, `revisions` |
| « Même ingénieur pour le mastering » Oui/Non en pastilles | **OK** sur le fond (`mastering_same_engineer`) ; forme différente (case) | S | non |
| Validateur « Désignée au Cadrage › Équipe » | **DIFFÉRENT** : défaut = **chef de projet** (`brief.ts`), pas la DA du Cadrage ; changer le défaut si l'équipe du Cadrage désigne une directrice créative + dire la source (règle 22) | S | non |
| Livrables en pastilles avec **source** de chaque ajout | **DIFFÉRENT** : cases sans source ; sources (Cadrage, call) à garder | S | oui (`deliverable_sources jsonb`) |
| Formats « WAV 24 bits / 44,1 kHz · Distribution › exigences de The Orchard » | **DIFFÉRENT** : texte libre `delivery_formats` (« Par exemple : WAV 24 bits / 48 kHz… »). Ticket § 14 : lu dans la Distribution (`lib/distribution/delivery-file.ts` a un `format`) | S | non |
| Dates : **pré-calculées** (« Calculé : 6 jours avant le master final »), « Modifier » sur place, « Modifié par », master final « Brief de cadrage › Temporalité » (règles 2 et 4) | **DIFFÉRENT** : 4 champs date + « Proposition » + « Utiliser ces dates » (geste en plus). Le calcul et l'ordre (SQL `master_briefs_calendar_order` + `calendarOrderErrors`) sont **OK**. Manque qui a modifié chaque date | S | oui : `master_briefs.dates_changed_by jsonb` (ou colonnes `*_due_by`) |
| Carte document `Brief_Mix_Master_Neons.pdf` + état Incomplet/Brouillon/Prêt + « Il manque : … » + « Voir le PDF » | **MANQUANT** (l'état « dirty » existe via `useFormDirty`, `BriefNextStep` dit les manques). PDF via `lib/pdf/render.ts` | M | non |
| « Enregistrer le Brief » : erreurs de manque, « Rien à enregistrer » | **DIFFÉRENT** : bouton actif seulement après modification (`useFormDirty`) — contraire à la règle « jamais de bouton désactivé » de CLAUDE.md ; manques non bloquants à l'enregistrement | S | non |
| « Dossier envoyé le … : modifier le Brief ne change rien… » | **OK** (`brief.next.sentAlready`) | — | — |
| « Remplir en dictant » (en-tête) | **EN TROP** (le proto ne dicte que la réponse de la DA) ; garder seulement si Sacha le veut : complexifie peu | S | non |
| Section « Source » dans le Brief | **EN TROP** (double l'étape Source) | S | non |
| Section « Questions à l'équipe » (plan, liste des questions) | **EN TROP** sous cette forme : remplacée par la carte de choix + la question dans « Direction artistique » | S | non |
| Section « Budget du projet » (« Inscrire au budget », état modifiable à la main) | **EN TROP** dans le Brief : le proto montre le tarif interne `Estimé` dans Conditions, et les états suivants naissent des gestes (proposé par l'ingénieur, accepté par la CP, facturé, payé) — voir § 4 et § 8 | S | non |
| `BriefNextStep` « Étape suivante : transmettre le dossier » + « Aller à Mixage » | **EN TROP** une fois le bandeau « Débloqué : Mixage » et le parcours en place | S | non |

---

## 3. Étape **Mixage** — avant l'envoi (transmission)

### Proto (`master:hugo`, `master:nostems`, CP sur Mixage après Brief enregistré)
- Pourquoi : « Le dossier part au mixeur, les versions reviennent, la validatrice décide. Un mix validé ne change
  plus. » Validation : Nadia Benali. Prérequis : Brief (+ « l'arrivée des voix définitives » si « Attendre »).
- « **Avant d'envoyer** » : Source confirmée (`Prêt`), Brief enregistré (`Prêt` / `À enregistrer` : « Des
  modifications ne sont pas enregistrées »), Pistes séparées (`Prêt` / `Manquant`), Dates à venir (« Mix V1 attendu le
  Dim. 15/11/2026 »).
- Carte « **Dossier pour le mixeur** » (« Calculé à partir du Brief et des fichiers confirmés : c'est exactement ce que
  Karim recevra. Les tarifs restent internes. ») : Titre à mixer, Source (« version de travail, voix définitives
  attendues »), Pistes séparées, Direction artistique, Livrables, Formats, Échéances (4 dates + « Sortie prévue le Sam.
  05/12/2026 »), Révisions incluses, Message — chaque ligne avec sa source.
- Carte « **L'e-mail que PDS OS enverra** » (« De : l'adresse de PO, au nom de Lina Haddad · gardé dans l'historique,
  c'est la preuve d'envoi ») : À `Karim Haddou <karim@haddou-studio.fr>` (Réseau), Objet « « Néons » : votre dossier de
  mix », Message modifiable, bloc fixe « Ajouté automatiquement à la fin de l'e-mail : Ouvrir votre dossier : *lien privé
  créé à l'envoi* · Lien privé, sans compte · valable jusqu'au … ».
- Brief non enregistré : « Le Brief a des modifications non enregistrées : enregistrez-le, sinon Karim recevra
  l'ancien dossier. » + « Ouvrir le Brief » ; le geste est refusé.
- Sans pistes (`master:nostems`) : « **Il manque les pistes séparées.** L'envoi n'est possible qu'avec une dérogation,
  écrite et gardée dans l'historique. » + champ obligatoire « **Pourquoi envoyer quand même** * » ; bouton « Envoyer à
  Karim Haddou avec une dérogation ».
- Bouton : « **Envoyer à Karim Haddou** » (Maintenant : « Transmettre au mixeur »). Flash « Dossier envoyé à Karim
  Haddou », « Ensuite : **Karim Haddou** (lien privé) · prendre en charge le dossier ».
- **Ingénieur maison** (`master:hugo`) : « Hugo Martin a un compte PDS : il reçoit une tâche dans son Travail, avec ce
  dossier, et dépose ses versions dans PDS OS. Pas de lien, pas d'e-mail. » ; bouton « **Assigner à Hugo Martin** » ;
  budget « Interne · pas de facture » ; Hugo dépose dans l'app (« Déposer ma version · Mix V1 », « rangé dans le titre,
  au Catalogue »).

### App
- `/master/mix` → `ProductionPage stage="mix"` → `PackageSections` (`package-preview.tsx` : destinataire, titres à
  mixer avec source et stems, direction, références, contraintes, livrables, révisions, échéances, formats ; « Les
  tarifs restent internes ») + blockers (« Avant de transmettre ») + `TransmitButton` → modale `TransmitReview`
  (« Avant d'envoyer » : destinataire et e-mail, sources confirmées, stems, case « **Envoyer sans stems** pour ces
  titres », dates + alertes date passée / après la sortie, fichiers qui partent avec écoute et « Changer », « Le lien
  privé » portée / validité / « affiché qu'une fois », « Message pour le mixeur » repris du Brief) → « Créer le lien »
  → `transmitPackage` (`lib/master-workflow/transmission-actions.ts`, signe les fichiers 30 j avec la session) → SQL
  `create_master_transmission` (jeton haché SHA-256, `package` instantané JSON `masterPackageSchema`) → `LinksDialog`
  (`OneTimeLinksProvider`) « Copier le lien », « Écrire un e-mail » (mailto), « Fermer ».
- Tables : `master_transmissions` (`20261005011001`, + `link_sent_at/by`, `opened_at`, `revoke_reason`, `revoked_by`,
  `derogations jsonb`, `delivered_at` en `20261011500301`, `continues_id` en `20261011500401`).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| « Avant d'envoyer » + « Dossier pour le mixeur » avec sources par ligne | **OK sur le fond**, **DIFFÉRENT** de forme : revue en modale, sources de ligne absentes ; mettre la revue dans l'étape (fait + pastille Prêt / Manquant) | S | non |
| E-mail envoyé par PDS OS (aperçu À / Objet / Message / lien en bloc fixe) | **MANQUANT** : aucun envoi d'e-mail dans l'app (mailto + « J'ai envoyé le lien »). Dépend du SMTP / Gmail de PO (Workspace, décision en attente). En attendant : montrer l'aperçu + mailto prérempli + « Marquer comme envoyé » (règle 19 le prévoit si pas d'adresse) | M (aperçu) / L (envoi réel) | non / oui (journal d'envoi) |
| Dérogation **écrite** pour l'envoi sans pistes | **DIFFÉRENT** : case « Envoyer sans stems » sans raison (décision du 12/10 dans CONTEXTE-PROJET § 2 « pas de raison écrite » — **contredite par le proto** : à acter) ; ajouter `derogations.withoutStemsReason` et l'exiger dans `create_master_transmission` | S | oui (fonction) |
| Refus si Brief non enregistré | **OK** de fait (le paquet est calculé depuis le Brief enregistré) ; la phrase manque | S | non |
| Bouton « Envoyer à Karim Haddou » / tâche « Transmettre au mixeur » | **DIFFÉRENT** de mots : app « Transmettre au mixeur » → modale → « Créer le lien » (deux gestes, dernier mot ≠ toast) | S | non |
| Ingénieur maison : « Assigner à Hugo Martin », tâche Travail, dépôt dans l'app, pas de facture | **MANQUANT** (ARCHITECTURE : « pas en V1 ») ; ticket § 8 « Pour un utilisateur PO → Mon Travail ». Brief : `mix_person_id` / `mastering_person_id` (exclusif avec `*_contact_id`), `assign_master_round` crée une tâche (`tasks.master_round`), RLS de dépôt pour ce membre (version audio du titre sans `manage_catalog`), versions créées par le trigger existant | L | **oui** |

---

## 4. Étape **Mixage** — lien, prise en charge, tarif

### Proto (`master:v1` côté CP, `master:thread`, lien de Karim)
- Bloc « **Lien privé de Karim** » dans l'étape (règle 19) : frise « Créé · Envoyé · Ouvert · Pris en charge · Fichier
  reçu », chacun daté ; lien `https://pds-os.app/m/…` + « Copier le lien », « Relancer », « Renouveler le lien »,
  « Révoquer le lien » (champ « Pourquoi vous le révoquez » * sur place, « Annuler ») ; « Lien privé de Karim Haddou ·
  valable jusqu'au Sam. 05/12/2026 · envoyé par PDS OS à karim@haddou-studio.fr » ; alerte « Le lien de Karim expire
  dans 3 jours (…). » + « Renouveler le lien » ; révoqué : « **Lien révoqué le …** par … : « raison ». Karim Haddou ne
  peut plus l'ouvrir ; ce qu'il a déposé reste. » + « Renouveler le lien ». Validité : 14 jours après le master final,
  30 jours au moins.
- Côté lien : carte « **Prendre en charge le dossier** » : tarifs estimés par PDS (« Mix 800 € HT · Tarif estimé par
  PDS d'après vos tarifs habituels », + Mastering si même ingénieur), radios « Je confirme ce tarif » / « Je propose un
  autre tarif » (montants *), « PDS valide votre tarif avant de l'engager. », bouton « Prendre en charge le dossier » ;
  flash « Dossier pris en charge » + « Votre tarif est envoyé à Lina Haddad : elle le valide avant de l'engager. »
- Côté CP : bloc « **Tarif** » (Mix · Karim Haddou 800 € HT, « Proposé par Karim Haddou le … · c'est le tarif
  estimé », pastille `Proposé`, « **Accepter le tarif** ») + « Un montant proposé ne consomme pas le budget : il ne
  compte qu'une fois accepté. » ; Maintenant « Accepter le tarif de Karim » ; toast « Tarif accepté : le montant est
  engagé. »
- « Le dossier envoyé le … » replié (le paquet) + « Renvoyer le dossier ».
- « Le Brief a changé depuis l'envoi : Karim a toujours l'ancien dossier. » + « Renvoyer le dossier ».

### App
- Suivi `TransmissionHistory` (`transmission-history.tsx`) : un envoi par ligne (« Envoi n · à »), « Étapes du lien » :
  Lien créé, Lien envoyé (« J'ai envoyé le lien »), Ouvert par l'ingénieur, Prise en charge confirmée, Fichier reçu ;
  expiration et alerte, « Révoquer le lien » (modale `ReasonForm`, `revokeTransmission`), « Renouveler le lien »
  (nouvel envoi = nouveau jeton), « Renvoyer le dossier » (`transmission-actions.tsx`). Lien affiché une fois.
- Côté `/m/` : « J'ai bien reçu le dossier » (`AcknowledgeButton` → `acknowledge_master_transmission`, notification
  `master_transmission_received`).
- Budget : `BriefBudget` + `addBriefRateToBudget` / `setBriefBudgetStatus` (`budget_lines.master_role`, statuts
  `planned/proposed/committed/invoiced/paid` — `20261005012001_budget_four_states.sql`, `20261012101101_budget_model.sql`).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Frise du lien (5 points datés) | **OK** (`fr.masterWorkflow.mix.life`) ; forme : frise dans l'étape au lieu du tableau d'envois | S | non |
| Lien visible et copiable à tout moment | **DIFFÉRENT** : affiché une fois (empreinte seule). Règle 19 : « garder le jeton récupérable (chiffré) » — brique commune à tous les liens privés (`/f/`, `/p/`, `/s/`, `/m/`) | M | **oui** (`token_ciphertext` + clé Vault, fonction de lecture réservée au responsable) |
| « Relancer » (rappel sans changer de lien) vs « Renouveler le lien » | **DIFFÉRENT** : l'app n'a que « Renouveler » (ex-« Relancer »). Relancer = e-mail de rappel → dépend de l'envoi d'e-mail | S (après e-mail) | non |
| Révoquer avec motif | **OK** (modale, conforme règle 17) | — | — |
| « Prendre en charge le dossier » avec tarif confirmé / proposé | **DIFFÉRENT** : « J'ai bien reçu le dossier » sans tarif. Étendre `acknowledge_master_transmission(token, rates)` : écrit le tarif proposé (anon, jeton vérifié) | M | **oui** |
| « Accepter le tarif » (Proposé → Engagé) par la CP dans l'étape | **DIFFÉRENT** : l'état se change à la main dans le Brief ou le Budget ; il faut une ligne de budget créée **à la prise en charge** (`proposed`) puis `committed` par le geste « Accepter le tarif » (ticket § 9) | M | oui (fonction `accept_master_rate`) |
| « Le Brief a changé depuis l'envoi » sur le Mixage | **MANQUANT** sur la page Mixage (seulement dit sur le Brief) : comparer `master_briefs.updated_at` au dernier envoi | S | non |
| Tableau des envois successifs (`TransmissionHistory`) | **EN TROP** partiellement : le proto montre le lien en cours + « Déjà fait » ; garder les envois anciens repliés | S | non |

---

## 5. Étape **Mixage** — versions, retours, décision, réouverture

### Proto (`master:v1` vu par la DA, `master:vocals`, test `audio.cjs`)
- Carte « **Mix · n versions** » (« Chacune s'écoute avant de décider ») : la dernière et la validée ouvertes, les
  autres repliées « Versions précédentes (n) » ; chaque ligne : lecteur, « **Mix V1** · Neons_Mix_V1.wav », « 3 min 14 ·
  48 kHz · 24 bits · 112 Mo · déposée par Karim Haddou par son lien le 19/10, 12:07 · sur Néons_maquette_v3.wav »,
  pastille `En écoute` / `Retours envoyés` / `Modification demandée` / `Mix validé` / `Rouverte` ; sous la ligne : note
  « **Nadia Benali** (demander une modification, le …) : « … » », ou « Validée par Nadia Benali le … : c'est le mix
  final, il ne changera plus. », ou « … puis rouverte par … : « … ». Elle reste dans l'historique. »
- « **Retours sur le Mix V1** » : liste « 0:42 · « … » · Mona Lys (lien privé) · 19/10, 12:24 » ; CP / DA / DG :
  « Minutage » + « Mon retour » + « Ajouter mon retour » ; phrase « **Visible par l'équipe seulement** : Karim Haddou
  reçoit la demande de modification décidée par Nadia Benali, ou les retours que vous lui transmettez. » (règle 21).
- CP (si le validateur n'est pas elle) : repli « **Transmettre les retours sans décider** » (« Karim avance pendant que
  Nadia Benali écoute ») : « Proposer une synthèse des retours » (PO, **chaque ligne garde son auteur**), « Les retours
  à transmettre * » (« Karim les lit sur son lien. Ce n'est pas une décision : la version reste en écoute. »),
  « Transmettre les retours à Karim » → « Retours transmis à Karim le …, sans décision : « … » ».
- Validatrice : « **Valider ce mix** » + repli « **Demander une modification** » (« Proposer une synthèse des retours »,
  « Ce qu'il faut changer * » — « Visible par l'équipe et par Karim Haddou. Chaque ligne garde son auteur. »,
  « Demander une modification ») ; motif obligatoire (« Écrivez ce qu'il faut changer : ce sera le retour de Karim. »).
  Les autres : « En attente de Nadia Benali : valider le Mix V1. »
- Garde : mix sur une version de travail → callout « Ce mix repose sur Néons_maquette_v3.wav, une version de travail :
  les voix définitives ne sont pas encore là. Il ne peut pas devenir le mix final. » et refus de « Valider ».
- Après validation : « **Mix V2 validé par Nadia Benali : c'est le mix final.** Plus aucun dépôt n'est possible sur le
  mix. » ; CP : « **Rouvrir le mix** » (tant que le mastering n'est pas parti) → « Pourquoi rouvrir le mix * » →
  « Rouvrir le mix » ; la version passe `Rouverte`, l'ingénieur peut redéposer.
- Débloque : flash « Débloqué : Mastering · Lina Haddad · transmettre au mastering ».

### App
- `MixVersionsSection` / `MixVersionItem` (`AudioFile` lecteur + téléchargement, « Reçue le …, ajoutée par … »,
  statuts « Retours en cours » / « Retours transmis »), commentaires avec minutage (`addMixComment`,
  `master_mix_comments.timecode_seconds`, `client_key`), « Synthèse pour l'ingénieur » + « Proposer une synthèse »
  (`proposeMixSummary`, PO **sans auteurs**) + « Enregistrer la synthèse » + « Transmettre les retours »
  (`send_mix_feedback`, une fois, synthèse figée), `MixDecision` : « Valider ce mix » (ConfirmDialog « Valider la V… du
  mix de « … » ? ») et « Demander une modification » (modale, note **facultative** si une synthèse est partie,
  `note_required` sinon) → `decide_mix_version` (validateur du Brief, sinon responsable ; dernière version ; un seul
  Mix final par titre). « Ajouter une version » (import par la CP, état Mix) ; versions créées par trigger
  `z_create_mix_versions` sur `master_files`, notifications `master_mix_version_received`, `master_mix_approved`,
  `master_mix_changes_requested`.
- Migrations : `20261005013001_master_mix_versions.sql`, `20261005014001_master_mix_decisions.sql`,
  `20261011500201_mix_feedback_flow.sql`, `20261012100901_master_audio_review.sql` (décision recopiée sur le fichier).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Carte de versions (dernière + validée ouvertes, anciennes repliées, métadonnées, « sur <source> ») | **DIFFÉRENT** : liste par titre, toutes ouvertes ; pas la source de la version ni la durée/format | S | non |
| Pastilles d'état (« En écoute », « Retours envoyés », « Modification demandée », « Mix validé », « Rouverte ») | **DIFFÉRENT** de mots côté équipe (« Retours en cours » / « Retours transmis ») ; la page `/m/` a déjà « En écoute / Retours envoyés / Modification demandée / Mix validé » → aligner | S | non |
| Retours avec minutage, qui, quand | **OK** | — | — |
| Phrase « Visible par l'équipe seulement… » (règle 21) | **MANQUANT** | S | non |
| Retour de l'artiste par son lien (« Mona Lys (lien privé) ») | **MANQUANT** (voir § 10) | — | — |
| « Transmettre les retours sans décider » (CP, synthèse en un geste, auteurs gardés) | **DIFFÉRENT** : deux gestes (Enregistrer la synthèse, puis Transmettre) ; PO retire les auteurs (`lib/ai/instructions/mix-feedback.ts`) alors que le proto garde « (Nadia Benali) » par ligne ; à décider : le code peut concaténer les retours avec auteur sans IA | S | non |
| Décision : motif **obligatoire** pour « Demander une modification » (règle 6) | **DIFFÉRENT** : facultatif si une synthèse est partie (PROJ-BUG-08) ; à trancher, le proto exige | S | oui (`decide_mix_version`) |
| Décision réservée à la validatrice, attente nommée pour les autres | **OK** côté SQL ; phrase « En attente de Nadia Benali : valider le Mix V1. » à ajouter | S | non |
| Garde « mix sur version de travail » | **MANQUANT** (lié à § 1 Attendre/Anticiper) | inclus § 1 | oui |
| « Rouvrir le mix / le master » avec motif | **MANQUANT** : « une décision ne change jamais ». Règle 14 (« une décision se remplace, elle ne s'efface pas ») : colonnes `reopened_at/by/reason` sur `master_mix_versions`, fonction `reopen_mix_version` (responsable seul, refus si le mastering est parti / des livrables reçus), le titre redescend de « Mix final » ; notification à l'ingénieur | M | **oui** |
| « Ajouter une version » par la CP (import) | **EN TROP** au regard du proto (seul l'ingénieur dépose) ; à garder comme recours « reçue autrement », replié | S | non |
| Bandeau « Débloqué : Mastering » | **MANQUANT** (§ 0) | — | — |

---

## 6. Fil avec l'ingénieur (Mixage et Mastering)

### Proto (`master:thread`)
- CP : « **Messages de Karim** », une carte par message : « Retard signalé : 3 jours · Karim Haddou · Reçu le … par son
  lien » (pastille `À traiter` / `Chez la direction`), le texte cité.
  - **Retard** : lignes « Mix V1 attendu le · Dim. 15/11/2026 → **Mer. 18/11/2026** · Proposé : décalé de 3 jours »
    (V1 si aucune version, puis Mix final, Mastering, Master final) ; si le master final dépasse la sortie : « Le master
    final passerait le …, après la sortie du … : c'est à la direction d'arbitrer. » ; « Réponse à Karim » ; boutons
    « **Appliquer ces dates** » ou « **Envoyer à la direction** », et « **Garder les dates** » (réponse obligatoire :
    « Dites pourquoi à Karim : il le lira sur son lien. »). DG (escaladé) : « Appliquer ces dates (la sortie est à
    revoir) » / « Refuser le retard ». Après : « Nouvelles dates envoyées à Karim Haddou » (PDS OS).
  - **Question** : « Réponse à Karim * » + « Répondre ».
  - **Fichier manquant** : réponse + « Renvoyer le dossier » (clôt le message).
  - « Échanges traités (n) » repliés avec l'issue (« Dates décalées de 3 jours, appliquées par … », « Répondu par … »).
- Lien : carte « **Échanges avec le label** » : historique (« Envoyé à Lina Haddad : elle vous répond ici », `En
  attente` / `Traité`) + replis « Poser une question » (« Votre question * », « Envoyer la question »), « Signaler un
  retard » (« Combien de jours * » 1–90, « Pourquoi * », « Signaler le retard »), « Signaler un fichier manquant »
  (« Quel fichier * », « Signaler le fichier manquant ») ; flash « Envoyé à Lina Haddad · Elle vous répond ici. Vous
  recevez aussi un e-mail. »

### App
- `EngineerThreadSection` / `EngineerThreadPanel` (« Fil avec l'ingénieur », sous Mixage et Mastering) : répondre,
  « Marquer comme traité » / « Rouvrir », retard → « Échéances touchées » (`delayImpact`) + « Appliquer ces dates »
  (`applyDelayDates`, ordre SQL) + « Le master final passerait après la date de sortie prévue : à arbitrer avec la
  direction. ». `/m/` : `EngineerThread` (Écrire un message, Poser une question, Signaler un retard, Signaler un fichier
  manquant). SQL `master_engineer_messages` (`20261012101801`), `post_master_engineer_message` (anon), notification
  `master_engineer_signal` (une fois tant que non lu).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Messages et 3 types de signalement côté lien | **OK** (l'app a en plus « Écrire un message » : EN TROP léger) | — | — |
| Retard : dates proposées, « Appliquer ces dates » | **OK** | — | — |
| « Garder les dates » avec réponse obligatoire | **MANQUANT** (seulement « Marquer comme traité ») | S | oui (issue `kept` + texte) |
| « Envoyer à la direction » + décision DG (« Appliquer… (la sortie est à revoir) » / « Refuser le retard ») | **MANQUANT** : l'app le dit sans geste ; statut `escalated`, fonction DG (`is_director`/permission) + notification | M | **oui** |
| Fichier manquant → « Renvoyer le dossier » qui clôt le message | **DIFFÉRENT** : deux gestes séparés | S | non |
| Fil dans l'étape (cartes) vs section sous la page | **DIFFÉRENT** de forme (suivra le patron) | S | non |

---

## 7. Étape **Mastering**

### Proto (`master:arp`, `master:master`)
- Pourquoi : « S'ouvre quand le mix final est validé : même mécanisme, sur le mix final. » Prérequis : Mixage (ou
  « Source, Brief » si mix déjà terminé).
- En tête : « **Le Mix final est validé. Le Mastering peut commencer.** Même ingénieur que le mix : poursuivez avec
  Karim Haddou. » ou « Ingénieur du mastering : Studio Arpège, qui reçoit son propre lien : il ne voit que le
  mastering. »
- « Dossier pour le mastering » : Mix final à masteriser (« Mix V2 · Neons_Mix_V2.wav · Validé par Nadia Benali le … »),
  Direction artistique, Formats, Échéances (Mastering, Master final), Message. E-mail : « « Néons » : le mastering peut
  commencer », même lien que pour le mix si même ingénieur. Bouton « Transmettre au mastering » (même ingénieur) ou
  « Envoyer à Studio Arpège ».
- Ensuite identique au Mixage (prise en charge du Studio Arpège avec tarif mastering, versions « Master V1 »,
  retours, « Valider ce master », « Rouvrir le master »). Validé : « Master V1 validé par … » ; hist « Master V1
  rattaché au titre du Catalogue : master final » (PDS OS) + « Facture demandée à Karim Haddou par PDS OS ».
- « Choisir l'ingénieur du mastering » si « Non » et personne.

### App
- `/master/mastering` → `ProductionPage stage="mastering"` (`waiting` : « S'ouvre quand chaque titre a son mix final
  (n sur N pour l'instant). »), callout `fr.masterWorkflow.mastering.ready` / `sameEngineer` / `otherEngineer`, même
  dossier (`loadStepView(…, "mastering")`), « Transmettre au mastering », même lien (`continues_id`) ou lien propre ;
  versions `stage = 'mastering'` ; « Valider ce master » → fichier et titre passent « Master final »
  (`20261005015001_master_mastering_versions.sql`). Notifications `master_mastering_*`, `master_final_approved`.

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Ouverture au mix final, phrase du ticket § 12, même lien / lien propre | **OK** | — | — |
| Prise en charge + tarif mastering (Studio Arpège) | **MANQUANT** (§ 4) | inclus | inclus |
| Facture demandée automatiquement à la validation | **MANQUANT** (§ 9) | inclus | inclus |
| Rouvrir le master | **MANQUANT** (§ 5) | inclus | inclus |
| Mix déjà terminé → Mastering directement (prérequis Source + Brief) | **OK** (`declare_mix_final`) ; phrase « Non nécessaire : le mix existe déjà » sur Mixage à ajouter | S | non |

---

## 8. Étape **Master final** — fichier et livrables

### Proto (`master:final`)
- Pourquoi : « Le master validé devient le master final du titre au Catalogue ; la Distribution et le Juridique le
  lisent directement. Restent les autres livrables et la facture. » Ensuite : « Distribution · attend le master final
  avant le Sam. 21/11/2026 », « Juridique · durée du bulletin SACEM ».
- Carte : lecteur + « **Master final · Neons_Master_V1_24-44.wav** » + « Master V1 validé par Nadia Benali le … » +
  pastille `Au Catalogue` ; faits : « État au Catalogue · « Néons » · Master final · ISRC FR-PDS-26-00041 · Rattaché au
  titre du Catalogue, même fichier », « **Filiation** · Source confirmée : … / Mix final V2 : … / Master final V1 : … »,
  « **Ce que ça débloque** · Distribution · prérequis « Master final » : fait / Juridique · durée du bulletin SACEM :
  3 min 14 · Lus directement sur ce master final, sans import » + « Aller à la Distribution ».
- « **Autres livrables attendus** » : une ligne par livrable du Brief, « Attendu · Demandé dans le Brief » (`Attendu`)
  ou « Neons_Instrumental_24-44.wav · Reçu le … par son lien · Karim Haddou » (écoute, `Reçu`) ; « En attente de Karim
  Haddou (lien privé) : déposer 2 livrables ». **Déposés par l'ingénieur** sur son lien (carte « Autres livrables »,
  un dépôt audio par livrable, zip accepté pour Stems).
- Fin : « **Master final au Catalogue, livrables reçus.** Le paiement reste à suivre : il ne bloque rien. » (ou
  « Facture payée : le Master est entièrement clos. », « Ingénieur maison : pas de facture. »).

### App
- `/master/final` → `FinalPage` (`final-page.tsx`, `loadFinalView` `lib/master-workflow/final.ts`) : par titre la version
  validée (écoute + téléchargement `AudioFile`), « Ingénieur du mastering », « État au Catalogue » (« Rattaché au titre
  du Catalogue (Master final), même fichier »), « Filiation », « Aller à la Distribution » ; « Autres livrables
  attendus » = **cases cochées par la CP** (`DeliverablesChecklist`, `setDeliverableReceived`,
  `master_deliverables_received`). La Distribution lit `loadFinalView` (`lib/distribution/sources.ts`).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Fichier écoutable, Catalogue, filiation, « Aller à la Distribution » | **OK** | — | — |
| ISRC dans « État au Catalogue » | **MANQUANT** (lu sur le titre) | S | non |
| « Ce que ça débloque » (Distribution, durée SACEM 3 min 14) | **MANQUANT** : statut du prérequis Distribution (`lib/distribution/readiness.ts`) + durée lue sur le fichier (le Juridique SACEM la lit déjà ? à vérifier côté zone Juridique) | S | non |
| Livrables **déposés par l'ingénieur** sur son lien (fichier, écoute, « Reçu le … par son lien ») | **DIFFÉRENT** : cases cochées par la CP, sans fichier. Étendre le dépôt du lien (`open_master_delivery` / `record_master_delivery`) à un `deliverable` ; `master_deliverables_received.file_id`, `received_via` ; garder la case comme recours « reçu autrement » | M | **oui** |
| Phrase de fin (« Le paiement reste à suivre : il ne bloque rien ») et coche « Master final » quand livrables reçus | **OK** sur la règle (`masterState` : `final` coché quand livrables reçus) ; phrase à ajouter | S | non |

---

## 9. **Facture et paiement** (dans Master final) + Budget

### Proto (`master:final`, `master:invoice`, rôles CP / DG / ingénieur)
- À la validation du master : PDS OS demande la facture à chaque ingénieur externe (« Facture demandée à Karim Haddou
  par PDS OS (karim@…) · suite à : Master final validé »). Ligne « Facture de Karim Haddou · Attendue · Montant engagé :
  1 100 € HT (mix 800 € · mastering 300 €) · demandée le … par e-mail, avec son lien » + repli « L'e-mail envoyé à
  Karim » (lecture seule : À, Objet « « Néons » : votre facture », Message, lien).
- CP : repli « **Ajouter une facture reçue autrement** » (« Par e-mail, en main propre… ») avec les mêmes champs.
- Lien de l'ingénieur, carte « **Votre facture** » : « Facturer à » (Raison sociale PDS Records SAS, adresse, SIRET, TVA),
  « Montant attendu 1 100 € HT (…) · Le tarif engagé par PDS », « **La facture (PDF)** * » (dépôt, PDF seul : « « x » n'est
  pas un PDF : déposez la facture en PDF. »), « Numéro de facture * », « Montant HT (€) * » pré-rempli (« Pré-rempli avec
  le tarif engagé : corrigez s'il diffère. »), si différent « Pourquoi le montant diffère * » ; « Votre RIB » (masqué
  FR76 •••• •••• 4567, « Votre fiche chez PDS : le virement part sur ce compte », « **Mon RIB a changé** » → IBAN *, BIC,
  Titulaire *, « Un nouveau RIB est vérifié par PDS, par téléphone, avant tout paiement. ») ; « **Envoyer ma facture** »
  → « Facture envoyée · Merci. Elle sera payée avant le … ». Après : « Facture n° … reçue le … (…) : elle sera payée avant
  le … » puis « payée le … par virement. Merci ! ».
- Équipe : carte « Facture n° KH-2026-118 · Karim Haddou » (PDF « Voir le PDF »), « Montant · 1 100 € HT · Conforme au
  tarif engagé » (`Conforme` / `Écart` + motif), « Échéance · À payer avant le Mer. 18/11/2026 · 30 jours après
  réception » (`À payer` / `Payée`), « RIB » (DG : masqué + « Modifié par Karim Haddou le … · avant : … » `À confirmer`,
  sinon `Vérifié` ; CP : « Visible seulement par la direction »).
- DG (Maintenant « Confirmer le nouveau RIB de Karim », puis « Payer la facture de Karim avant le … ») : « **Le RIB a
  changé.** Avant de payer, appelez Karim Haddou au numéro de sa fiche Réseau, pas à celui d'un e-mail… », case « J'ai
  vérifié ce RIB par téléphone avec Karim Haddou » (erreur si non cochée), « **Confirmer le nouveau RIB** » ; puis « Faites
  le virement depuis la banque de PDS, puis notez-le ici. », « Virement fait le * » (date), « Preuve du virement * »
  (PDF/PNG/JPG), « **Marquer comme payée** ».
- **Budget** (bas de l'étape) : une ligne par étape payée « Mix · Karim Haddou · 800 € HT », état `Estimé` → `Proposé`
  (« Proposé par … le … ») → `Engagé` (« Accepté par … le … · facture attendue ») → `Facturé` (« Facture n° … reçue le …
  · à payer avant le … ») → `Payé` (« Facture payée le … · Claire Morel ») ; ingénieur maison : « Interne · pas de
  facture ».
- Résumé du parcours : « Au Catalogue · livrables reçus · facture à payer / attendue / payée ».

### App
- Rien sur la facture, le RIB, le paiement dans le Master. `budget_lines` a les 5 statuts (`planned`, `proposed`,
  `committed`, `invoiced`, `paid`), `master_role`, `attachment_file_id` (preuve, fichier du projet) — `20261012101101`.

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Demande de facture automatique à la validation du master | **MANQUANT** (dépend de l'e-mail ; sinon carte sur le lien + notification) | S | oui (trigger) |
| Dépôt de la facture par l'ingénieur sur son lien (PDF, n°, montant, motif d'écart) | **MANQUANT** : table `master_invoices` (transmission/contact, n°, montant, motif, fichier, reçue le, via lien / autrement, par) + créneau de dépôt PDF anon (modèle `master_delivery_slots`) + fonction `submit_master_invoice(token, …)` ; met la ligne de budget en `invoiced` | L | **oui** |
| « Ajouter une facture reçue autrement » (CP) | **MANQUANT** (même table, session CP) | S | inclus |
| RIB du contact (masqué, visible direction seule), changement → confirmation DG par téléphone | **MANQUANT**, sensible (fraude au RIB) : table `network_contact_bank_details` (RLS : direction seule, jamais l'API pour CP), `pending_*`, `confirm_rib(case cochée)` | L | **oui** |
| « Marquer comme payée » (DG : date, preuve) | **MANQUANT** : `budget_lines.status = paid` + `attachment_file_id` existent ; fonction `pay_master_invoice` (DG), écrit la ligne de budget | M | oui |
| Échéance à 30 jours, conformité au tarif engagé | **MANQUANT** (calcul code) | S | non |
| Budget par étape avec états liés aux gestes | **DIFFÉRENT** : états posés à la main (`setBriefBudgetStatus`) ; à brancher sur prise en charge (§ 4), acceptation, facture, paiement | inclus | inclus |
| Facture ≠ blocage de la sortie | **OK** à respecter (le statut `final` du workflow ne dépend pas du paiement) | — | — |

---

## 10. **Lien privé de l'ingénieur** `/m/…` (page externe)

### Proto (rôle `karim` / `arp`, textes `master_out/master_*__karim.txt`)
- En-tête « PDS · « Néons » · Karim Haddou », « 🔒 Lien privé /m/… · sans compte » ; sous-titre « Néons · Mona Lys ·
  single · Ingénieur mix et mastering » ; titre « **Ce que PDS attend de vous** » / « Rien à faire pour l'instant » /
  « Rien pour l'instant » (« Lina Haddad ne vous a pas encore envoyé de dossier. »).
- Cartes dans l'**ordre inverse du parcours** (règle 17), regroupées sous « Master » dans la page privée réunie de
  `projet.html` : « Votre facture », « Autres livrables », « Mastering », « Dossier du mastering », « Mix »,
  « Échanges avec le label », « Votre dossier » ; pastilles `À vous` / `Suivi` / `Pris en charge` / `Mix validé` /
  `Ouvert` / `En attente`.
- « **Votre dossier** » : « Karim Haddou, voici le dossier du mix de « Néons ». », « Nouvelle source le … :
  Néons_v4_voix_definitives.wav, voix définitives du 2e couplet, et ses pistes. Vos prochaines versions partent de là. »,
  « Dossier mis à jour le … », faits « Message du label » (Lina Haddad), « Source » + « Télécharger » (« Version de
  travail : les voix définitives arrivent »), « Pistes séparées » + « Télécharger » (ou « Envoyées à part (voir le
  message) »), « Ce qui est attendu » (4 dates), « Direction artistique » groupée (Nadia Benali) ; puis « Prendre en
  charge le dossier » (§ 4) ou « Pris en charge le … Merci ! ».
- « **Mix** » : versions de la plus récente à la plus ancienne (« « Néons » · V1 · reçue le … », fichier, lecteur,
  pastille `En écoute` / `Retours envoyés` / `Modification demandée` / `Mix validé`), « Retours du label, le … : … »,
  « Retours du label, le … (pas encore une décision) : … », « Rouvert le … : « … ». Déposez une nouvelle version. » ;
  dépôt « **Déposer ma version · Mix V2** * » (glisser ou « Choisir un fichier », « Fichier choisi, pas encore
  envoyé », « Remplacer », « Confirmer l'envoi », refus non-audio avec la raison) ; « Votre version est en écoute chez
  le label. » ; « Mix V2 validé le … : plus aucun dépôt n'est possible sur le mix. Le mix validé ne valide pas le
  master. »
- « Échanges avec le label » (§ 6), « Autres livrables » (§ 8), « Votre facture » (§ 9).
- Pied : « **Votre contact chez PDS** · Lina Haddad · Cheffe de projet ».
- Lien révoqué : « **Ce lien n'est plus valable** · Le label l'a désactivé. Ce que vous avez déjà déposé reste chez PDS ;
  demandez un nouveau lien à Lina Haddad. »

### App
- `app/(public)/m/[token]/page.tsx` → `PublicPackageView` (`public-package.tsx`) : `PublicVersions` (« Vos versions »,
  états, retours, décisions, étape suivante), « Message du label », « Fichiers » (source + stems par titre, téléchargement,
  `DeliverVersion` par titre : sas « Fichier choisi, pas encore envoyé », écoute, « Remplacer », « Confirmer l'envoi »),
  « Ce qui est attendu » (dates, formats, révisions, livrables, direction, références, contraintes), `EngineerThread`,
  « J'ai bien reçu le dossier », « Lien valable jusqu'au … », `PublicRefresh` (30 s). États : remplacé, expiré, révoqué.
  RPC : `get_master_transmission`, `acknowledge_master_transmission`, `open_master_delivery`, `record_master_delivery`,
  `post_master_engineer_message`, `get_master_engineer_messages`. Textes `fr.masterWorkflow.publicPackage`.

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Titre « Ce que PDS attend de vous », résumé de ce qui est attendu en tête avec liens vers chaque carte (règle 17) | **DIFFÉRENT** : titre « Dossier Mix » + intro | S | non |
| Cartes en ordre inverse du parcours avec pastilles À vous / Suivi | **DIFFÉRENT** : ordre versions → message → fichiers → attendu → fil → accusé | S | non |
| Dossier, téléchargements, dates, direction | **OK** (direction en texte libre au lieu de groupée) | — | — |
| Dépôt des versions (sas, refus motivé, formats) | **OK** (règle 13) ; 50 Mo max (point à trancher CONTEXTE § 2) | — | — |
| Prise en charge avec tarif | **MANQUANT** (§ 4) | inclus | inclus |
| « Nouvelle source le … » sur le même lien | **MANQUANT** (§ 1) | inclus | inclus |
| « Rouvert le … : déposez une nouvelle version » | **MANQUANT** (§ 5) | inclus | inclus |
| Autres livrables déposés, facture, RIB | **MANQUANT** (§ 8, § 9) | inclus | inclus |
| « Votre contact chez PDS » | **MANQUANT** | S | non |
| Page privée **réunie par personne** (Master + Juridique pour Mona, en-tête unique) | **MANQUANT** : chaque lien a sa page (`/m/`, `/f/`, `/s/`…). Brique de la coquille (zone « pages privées réunies ») | L (commun) | oui (commun) |
| Rafraîchissement 30 s, « Écrire un message » | **EN TROP** léger, sans complexité : garder | — | — |

---

## 11. **Écoute de l'artiste** (lien privé `/v/…` de Mona Lys)

### Proto (`master:v1`, rôle `mona`)
- Carte « **Le Mix V1 de « Néons »** » (ou « Le Master V1 ») quand une version est `En écoute` : lecteur « Mix V1 ·
  Neons_Mix_V1.wav · Déposé par Karim Haddou le … », « Écoutez-le et dites ce que vous en pensez : Nadia Benali décide
  avec vos retours. », ses retours (« Votre retour · 0:42 · « … » »), « Minutage » + « Votre retour » + « **Envoyer mon
  retour** » (« Remplir avec un exemple ») ; flash « Retour envoyé · Merci. Nadia Benali le lira avant de décider. » ;
  pastille `À vous` / `Avis envoyé`. Sans version : « Rien à écouter pour l'instant : vous recevrez un message quand une
  version sera prête. » Le retour apparaît chez l'équipe « Mona Lys (lien privé) ».
- Dans `projet.html`, la même page porte aussi la carte Juridique de Mona.

### App
- **Rien** : aucun lien artiste, aucun retour externe sur une version (`master_mix_comments` = membres seuls, RLS
  `can_see_project`).

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| Lien d'écoute de l'artiste (création, envoi, version en écoute, retour minuté) | **MANQUANT** : table `master_listen_links` (contact artiste du titre, jeton haché, expiration) ou un lien « personne × projet » commun ; RPC anon `get_listen_version(token)` (URL signée de la dernière version en écoute), `post_listen_comment(token, version, timecode, text, client_key)` ; `master_mix_comments.contact_id` + `via_link` ; notification au validateur. Qui crée le lien : la CP à l'envoi d'une version, ou automatique à chaque nouvelle version (à trancher) | L | **oui** |

---

## 12. **Historique du master** et « Déjà fait »

### Proto
- Pied du parcours « Historique du master » → carte « Historique du master » (« Chaque geste, qui l'a fait, quand, et ce
  qui l'a déclenché. Une version validée ne se remplace jamais en silence. »), filtre par personne (pastilles « Tout le
  monde », Lina Haddad, Karim Haddou, PDS OS…), « **Exporter en CSV** » (Date ; Qui ; Geste ; Suite à), « ← Parcours ».
- Par étape « Déjà fait » (mêmes lignes, `suite à : …`).

### App
- Pas d'historique du Master ; l'Activité du projet (`lib/insights/activity.ts`) ne lit aucune table du Master ; les
  Validations du projet (`listProjectValidations`) non plus. Le Juridique a un historique (`lib/legal/history`,
  `components/legal/…`), le Marketing `marketing_events`, la Distribution `lib/distribution/history.ts`.

### Écart
| Élément | Écart | Effort | Migr. |
| --- | --- | --- | --- |
| « Déjà fait » par étape + page Historique filtrable + CSV | **MANQUANT** : reconstruire depuis les tables existantes (sources, transmissions et leur frise, versions, décisions, retours, messages, livrables, budget) suffit pour 90 % ; les modifications du Brief (qui a changé quoi) demandent un journal `master_events` (append-only, comme `marketing_events`) | M | oui (journal) |
| Master dans Activité et Validations du projet | **MANQUANT** (zone coquille) : décisions à prendre par la validatrice dans Validations | M | non |

---

## 13. Rôles, notifications, déblocages (synthèse)

| Qui | Proto | App |
| --- | --- | --- |
| Lina Haddad (CP, responsable) | confirme la source, remplit et enregistre le Brief, prépare l'échange, applique, envoie, accepte le tarif, répond aux messages, transmet les retours, rouvre, ajoute une facture reçue autrement | **OK** responsable seul (`is_project_owner`) pour tout ce qui existe |
| Nadia Benali (DA, validatrice) | répond à la question de PO, commente, valide ou demande une modification | répond à une question (texte libre), commente, décide (`decide_mix_version`) — OK ; défaut validateur = CP (**différent**) |
| Claire Morel (DG) | lit, commente ; arbitre un retard escaladé ; confirme un RIB ; paie | lit ; **aucun geste** Master |
| Karim / Studio Arpège (lien) | prend en charge + tarif, dépose versions et livrables, signale, facture, RIB | accuse réception, dépose versions, signale — partiel |
| Hugo Martin (maison, compte) | tâche Travail, dépose dans l'app | **absent** |
| Mona Lys (artiste, lien) | écoute et commente la version en écoute | **absent** |
| PDS OS (automatique) | surveille l'arrivée des voix, rattache le master au Catalogue, demande la facture, prévient l'ingénieur d'une nouvelle source, envoie les nouvelles dates | rattache au Catalogue (OK, `decide_mix_version`) ; le reste absent |

Notifications app existantes : `master_transmission_received`, `master_delivery_received`,
`master_mastering_delivery_received`, `master_mix_version_received`, `master_mix_approved`,
`master_mix_changes_requested`, `master_mastering_version_received`, `master_final_approved`,
`master_mastering_changes_requested`, `master_engineer_signal`, `task_assigned` (questions). À ajouter :
`master_source_newer`, `master_rate_proposed`, `master_delay_escalated`, `master_invoice_received`,
`master_rib_changed`, `master_listen_comment` (et la redéclaration `NOT VALID` de `notifications_kind_check`).

Déblocages inter-modules : Distribution lit `loadFinalView` (**OK**) ; « Ensuite » vers Juridique (durée SACEM) à
afficher ; la Vue d'ensemble lit `masterState` (**OK**).

---

## 14. Briques communes utilisées par le Master

| Brique | Proto (Master) | Dans l'app | Où / écart |
| --- | --- | --- | --- |
| **Formulaire de call commun** (participants en pastilles, date, heure, format, ordre du jour modifiable et déplaçable, récap, « Confirmer et inviter ») | `master-patch.js` `mxPrep` | Oui pour Stratégie / Conception / Production : `components/strategy/strategy-call-form.tsx`, `components/calls/participants-field.tsx`, `call-recap.tsx`, `call-plan-form.tsx`, `components/ui/move-buttons.tsx` ; SQL `strategy_calls.participants/format` | **Le Master utilise l'ancien `CallFields`** (`prepare-exchange-button.tsx`) : à remplacer |
| Compte rendu / transcription | « le call a lieu (transcription) » | Page commune du call (`CallWorkspace`), enregistrement, Groq, compte rendu | OK, l'échange Master est un call du projet |
| Résumé aux participants | — (pas montré dans le Master) | commun calls | — |
| Proposition « Confirmer / Modifier / Écarter » ou « Retirer » | « Ce que PO a compris » (question DA, call) avec citation et Retirer | `DictationReview` (cases cochées) pour le Brief ; `components/legal/intake/proposal-review.tsx` (citation, retirer) au Juridique | Prendre `ProposalReview` (ou la version Confirmer/Modifier/Écarter du Marketing) ; jamais pré-coché |
| Cartes de versions | carte « Mix · n versions », lecteur, état, note, repli | `MixVersionItem` + `AudioFile` ; Catalogue `AudioVersionList` | Ajouter le repli et les pastilles alignées |
| Décision avec motif | « Valider ce mix » / « Demander une modification » (motif *) ; « Rouvrir » (motif *) ; « Garder les dates » (motif *) | `ConfirmDialog`, `ReasonForm` (`components/ui/reason-form.tsx`) | motif facultatif à un endroit, « Rouvrir » absent |
| Modale verre | révoquer : champ sur place dans le proto | `FormDialog` / `ConfirmDialog` | l'app (modale) suit la règle 17 : OK |
| Pages privées triées | cartes inverse du parcours, « Ce que PDS attend de vous », contact | `/m/` linéaire | à refaire (§ 10) ; page réunie par personne = coquille |
| « Maintenant » | oui | `NowCard` | non branché (§ 0) |
| Parcours | oui | `JourneySpine`, `StepPanel` | non branché (§ 0) ; prérequis externes à ajouter |
| Fil d'Ariane | `Néons › Master › Étape` | partiel (`fr.shell` « Fil d'Ariane ») | coquille |
| Chevrons | aucun dans le Master (parcours) | `SectionSteps` + `masterSteps` | à retirer |
| Cartes de choix « Recommandé » | début du Brief | `ChoiceCards` ; « Recommandé » existe au Cadrage (`fr.framingIntel` l. 483) | à brancher |
| Lien privé visible dans l'étape (frise, copier, relancer, renouveler, révoquer) | oui | frise OK, lien une seule fois (`OneTimeLinksProvider`) | jeton chiffré récupérable = commun à tous les liens |
| E-mail envoyé par PDS OS (aperçu, preuve) | oui | aucun envoi | commun (Workspace) |
| Dates en entier, éditées en champ date, ordre refusé | oui | `calendarOrderErrors`, `formatShortDate` | « Modifier » sur place à faire ; vérifier que `formatShortDate` donne « Dim. 15/11/2026 » (jour + année) |
| Bandeau de résultat au-dessus du geste | oui | non | commun |

---

## 15. Simulations du proto (boutons « Proto : … » et aides) → vrai événement de l'app

| Simulation du proto | Vrai événement dans l'app |
| --- | --- |
| « Proto : les voix définitives arrivent au Catalogue » (`vocals`) | Une nouvelle version audio importée sur le titre (onglet Audio, `FileImport`, ou dépôt d'un ingénieur) ; la détection « Version plus récente reçue » existe à la lecture (`audio-source.ts`) ; à ajouter : trigger + notification `master_source_newer` au responsable |
| « Proto : le call a lieu (transcription) » (`callheld`) | Le call de l'échange est enregistré dans l'app (`call_recording_takes`), transcrit (Groq, `lib/ai/transcribe.ts`), compte rendu ; puis `proposeBriefFromCall` (adaptateur `masterBriefVoice`) propose les réponses citées |
| « Proto : déposer un fichier d'exemple » (`upex`, versions et livrables) | Dépôt réel de l'ingénieur sur `/m/` (`open_master_delivery` → créneau Storage d'une heure → `record_master_delivery`) ; ingénieur maison : import dans l'app ; livrables : même mécanisme à étendre |
| « Proto : déposer une facture d'exemple » (`invex`) | Dépôt PDF de l'ingénieur sur son lien (créneau anon à créer) ou « Ajouter une facture reçue autrement » par la CP |
| « Proto : déposer une preuve d'exemple » (`proofex`) | Fichier déposé par la DG (bibliothèque du projet, `budget_lines.attachment_file_id`) |
| « Remplir avec un exemple » (réponse DA, retours, retour de Mona) | Saisie ou dictée réelle (micro commun) ; hors prod : `fill_page_test_data` |
| « Voir le PDF » (toast) | PDF du Brief généré par `lib/pdf/render.ts` ; PDF de la facture = fichier déposé (URL signée) |
| « Aller à la Distribution » (toast) | lien `/app/projects/[id]/distribution` (existe dans `FinalPage`) |
| « Ajouter au Réseau » (toast) | `CreateContactDialog` / `AddToNetworkButton` (existe) |
| Envoi d'e-mail « par PDS OS » (dossier, facture, relance, nouvelles dates) | **aucun équivalent** aujourd'hui : mailto + « J'ai envoyé le lien » ; à brancher sur l'adresse de PO (Google Workspace) |
| Ouverture du lien (« Ouvert » daté quand on passe « Voir comme » Karim) | `noteOpened(token)` à l'ouverture de `/m/` (existe) |
| Gestes de Karim / Mona (« Voir comme ») | Pages publiques `/m/[token]` (existe) et `/v/[token]` (à créer) |
| « Voir comme » Claire Morel (DG) | session d'un membre DG : aucun geste Master aujourd'hui |

---

## 16. Découpage proposé en sous-lots (ordonnés, chacun livrable et testable seul)

Effort total estimé : **≈ 25 à 28 jours** (hors envoi d'e-mail réel et hors page privée réunie, briques communes).

| # | Sous-lot | Contenu | Migrations | Effort | Risques pour l'existant |
| --- | --- | --- | --- | --- | --- |
| **M1** | **Parcours du Master** | `lib/master-workflow/journey.ts` + `journey-context.ts` (cache, un aller-retour), `MasterStepFrame` (NowCard, JourneySpine, StepPanel) autour des 5 pages existantes, prérequis/ensuite externes dans `StepPanel` (profite au Juridique et à la Production), ligne de faits, retrait des chevrons Master du layout projet, « Ouvrir le module » → étape qui attend la personne, `PrepareSummary` et `BriefNextStep` retirés | aucune | M (2 j) | `StepPanel` partagé (Production, Juridique) : prop optionnelle ; notifications qui pointent `/master/mix` etc. : routes gardées ; multi-titre dans les résumés |
| **M2** | **Source refondue** | liste des versions dans l'étape avec écoute, « Ce que PDS OS a vérifié », mix existant en choix radio avec motif obligatoire, inventaire masqué, choix Attendre / Anticiper, garde « version de travail » dans `decide_mix_version`, notification d'une version plus récente, « Remplacer la source et prévenir » sur le même lien | `master_flow_sources.plan`, `declare_mix_final` motif requis, trigger `master_source_newer`, mise à jour de la source dans le paquet en cours | M-L (2,5 j) | Retirer `MasterInventory` touche les actions Créditer/Relier (Juridique lit les crédits : le trigger `z_credit_engineers` les pose déjà) ; « Production définitive / Voix définitives » sans source réelle → **point à trancher** avant de les afficher |
| **M3** | **Brief en document** | cartes de départ « Recommandé », Conditions en faits avec « Changer » et source de la désignation (Cadrage), validateur par défaut = DA du Cadrage, dates pré-calculées avec « Modifier » sur place et « Modifié par », formats lus dans la Distribution, livrables en pastilles avec source, carte PDF + état Incomplet / Brouillon / Prêt, « Enregistrer » jamais désactivé, sections Source / Questions / Budget / dictée retirées de la page | `master_briefs.dates_changed_by`, `deliverable_sources` ; tarifs usuels du Réseau (`network_engineer_terms`) | L (3 j) | `saveMasterBrief` et le trigger de crédits ; le formulaire est remonté à chaque enregistrement (`key = savedAt`) : passer à l'édition en ligne demande des actions par champ ; garder `revisions` / tarifs saisissables tant que le Réseau n'a pas de tarifs |
| **M4** | **Question à la DA et échange** | « Commencer directement » pose la question direction ; réponse lue par PO (réutiliser `QuestionCard` / `ProposalReview` du Juridique, adaptateur `lib/ai` + `verbatim.ts`) ; « Préparer un échange » avec le formulaire de call commun (participants, format, ordre du jour modifiable, récap, « Confirmer et inviter ») dans l'étape ; « Ce que PO a compris du call » dans l'étape, rien de pré-coché | `master_brief_questions.items jsonb`, `master_brief_calls` participants / format / purpose (ou stockage commun des calls préparés), `create_master_exchange` étendu | M-L (2,5 j) | quota de PO (`takeAiRequest`) sur le nouvel appel ; `DictationReview` partagé avec la dictée : ne changer que l'usage Master |
| **M5** | **Envoi du dossier** | revue « Avant d'envoyer » et dossier avec sources dans l'étape, aperçu de l'e-mail (mailto en attendant le SMTP), dérogation écrite pour l'envoi sans pistes, « Le Brief a changé depuis l'envoi » sur Mixage, frise du lien dans l'étape, bouton « Envoyer à <Nom> » | `create_master_transmission` exige `withoutStemsReason` ; (plus tard) `token_ciphertext` pour garder le lien visible | M (1,5 j) | `transmitPackage` signe les fichiers avec la session : ne pas toucher ; décision du 12/10 « pas de raison écrite » à remplacer dans `docs/CONTEXTE-PROJET.md` |
| **M6** | **Prise en charge et tarif** | `/m/` « Prendre en charge le dossier » (confirmer / proposer le tarif), ligne de budget `proposed` créée par la fonction, « Accepter le tarif » dans l'étape (→ `committed`), budget du Brief en lecture | `acknowledge_master_transmission(token, rates)`, `accept_master_rate`, notification `master_rate_proposed` | M (1,5 j) | écriture de `budget_lines` depuis une fonction anon (security definer, jeton vérifié) : relire la RLS du budget (CP et direction seulement) ; lignes existantes créées par « Inscrire au budget » à reprendre |
| **M7** | **Versions, retours, décision, réouverture** | carte de versions repliée, pastilles alignées sur `/m/`, phrase « Visible par l'équipe seulement », « Transmettre les retours sans décider » en un geste (auteurs gardés), « Demander une modification » motif obligatoire, attente nommée, « Rouvrir le mix / le master » avec motif (CP), « Ajouter une version » replié en recours | colonnes `reopened_*` + `reopen_mix_version` ; `decide_mix_version` (motif requis) ; titre qui redescend de « Mix final » / « Master final » | M-L (2,5 j) | `master_audio_review` recopie la décision sur le fichier : la réouverture doit aussi rouvrir le fichier ; `final_validated_at` du titre ; Distribution qui lisait un master final rouvert |
| **M8** | **Fil avec l'ingénieur** | cartes dans l'étape, « Garder les dates » (motif), « Envoyer à la direction » et décision DG, « Renvoyer le dossier » qui clôt un fichier manquant | `master_engineer_messages` statut `escalated` + issue ; fonction DG ; notification `master_delay_escalated` | S-M (1 j) | permission DG : `can(access, …)` / `role_permissions`, jamais le poste |
| **M9** | **Master final et livrables** | ISRC, « Ce que ça débloque » (Distribution, durée SACEM), livrables déposés par l'ingénieur sur son lien, case gardée en recours | `master_deliverables_received.file_id / received_via`, dépôt étendu à `deliverable` dans `open_/record_master_delivery`, zip pour Stems | M (1,5 j) | `masterState` compte les livrables reçus : garder la même table |
| **M10** | **Facture et paiement** | demande de facture à la validation, carte « Votre facture » sur `/m/`, « Ajouter une facture reçue autrement », RIB direction seule et changement confirmé par téléphone, « Marquer comme payée » (date, preuve), budget Facturé / Payé, résumé « facture à payer » | `master_invoices`, créneau PDF anon, `network_contact_bank_details` (RLS direction), `submit_master_invoice`, `confirm_rib`, `pay_master_invoice`, notifications | L (3 j) | **données bancaires** : RLS stricte, jamais exposées à la CP ni dans l'API d'un lien ; IBAN masqué ; le paiement ne bloque jamais la sortie |
| **M11** | **Écoute de l'artiste** | lien `/v/[token]` (ou carte de la page privée réunie), version en écoute, retour minuté, « Mona Lys (lien privé) » chez l'équipe, notification au validateur | `master_listen_links`, `master_mix_comments.contact_id / via_link`, RPC anon get / post | L (2,5 j) | si la page privée réunie par personne arrive (coquille), construire la carte pour elle plutôt qu'une page `/v/` isolée |
| **M12** | **Historique du master** | « Déjà fait » par étape, page Historique (filtre par personne, CSV), Master dans Activité et Validations du projet | `master_events` (append-only) pour les changements du Brief | M (1,5 j) | Activité reconstruite depuis les tables : volume des lignes du Master |
| **M13** | **Ingénieur maison** | « Assigner à <membre> », tâche Travail avec le dossier, dépôt dans l'app par ce membre, budget « Interne · pas de facture » | `master_briefs.mix_person_id / mastering_person_id` (exclusifs avec les contacts), `assign_master_round`, RLS de dépôt pour l'ingénieur membre | L (2,5 j) | crédits Juridique (un membre crédité au lieu d'un contact) ; `z_credit_engineers` ; Travail |

**Ordre conseillé** : M1 (tout le reste s'y range) → M2 → M3 → M5 → M7 → M4 → M6 → M8 → M9 → M12 → M10 → M11 → M13.
Briques communes à faire en dehors du Master (et dont M5, M10, M11 profitent) : envoi d'e-mail par l'adresse de PO,
jeton de lien chiffré récupérable, bandeau de résultat, page privée réunie par personne, fil d'Ariane.

**Points à trancher (à écrire dans `docs/CONTEXTE-PROJET.md` § 2 au moment de coder)**
1. D'où viennent « Production définitive » et « Voix définitives » (le Cadrage ne les pose pas comme champ).
2. Dérogation sans pistes : raison écrite (proto) contre case seule (décision du 12/10).
3. « Demander une modification » : motif toujours obligatoire (proto, règle 6) contre facultatif après une synthèse.
4. Synthèse des retours : avec auteurs (proto) ou réécrite sans auteurs par PO (app).
5. Validateur par défaut : DA désignée au Cadrage (proto) ou chef de projet (app).
6. Qui crée le lien d'écoute de l'artiste, et quand.
7. Rouvrir une décision validée : jusqu'où (mastering parti, livrables reçus, Distribution engagée).
8. Tarifs usuels et RIB dans le Réseau : qui les saisit, qui les voit.
