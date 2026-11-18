# Étude : à quoi sert l'IA, et tout ce que PO pourrait faire dans PDS OS

18/11/2026. Demande de Sacha : « que PDS OS remplace le Claude de l'entreprise » pour l'équipe de PDS :
tout ce qu'une personne de PDS demande à Claude ou ChatGPT, PO doit savoir le faire dans l'app, en
moins puissant mais sans trou. Les règles actuelles de PO ne sont **pas** prises comme limite (§ 9 dit
lesquelles changer).

Sources : cinq recherches web (usages grand public, usages au travail, capacités des assistants, IA
intégrée aux applications, musique), lecture des 19 tickets d'Ibé et des tickets BUD / BIZ, de ~210
pages Retours (53 ouvertes), des docs métier, du code de l'IA déjà en place, et de la base « Questions
sans réponse de PO ». Les chiffres marqués _(relais)_ viennent d'un article qui cite l'étude, pas de
l'étude elle-même. Liens en § 12.

Documents voisins : `SYNTHESE-INTERACTION-HUMAIN-IA.md` (les 18 principes, la dépendance appropriée),
`AUDIT-PO.md` (les 6 lots du 07/11), `docs/ANALYSE-MIDDAY.md` (l'IA de Midday, lue dans leur code).

---

## 0. En bref

1. **Les gens demandent d'abord, ils produisent ensuite.** Chez ChatGPT, 49 % des messages demandent
   (une info, un conseil), 40 % font faire quelque chose, 11 % s'expriment. Conseil pratique, recherche
   d'information et écriture font près de 80 % des usages. Au travail, la première activité est
   **décider / résoudre un problème** (21,6 % des demandes de travail aux États-Unis), puis penser de
   façon créative, documenter, chercher, conseiller.
2. **L'écriture, c'est surtout de la réécriture** : deux tiers des demandes d'écriture modifient un
   texte existant (reformuler, corriger, traduire, changer le ton). PO ne sait pas faire ça
   aujourd'hui, alors que c'est l'usage le plus banal de Claude dans une équipe.
3. **Ce qui fait quitter un outil métier pour ChatGPT** : il refuse ce qui est « hors sujet » (un mail,
   une traduction, une explication), il ne rend que du texte, il ne sait rien produire (fichier,
   graphique, tableau). 68 % des salariés qui utilisent l'IA passent par un compte personnel _(relais,
   TELUS 2025)_ : si PO ne couvre pas le banal, l'équipe colle les contrats dans ChatGPT.
4. **Ce que l'IA intégrée fait mieux que ChatGPT** : elle connaît les données, les droits et le
   vocabulaire, elle agit dans le contexte de la page, elle travaille **sans qu'on lui demande**
   (catégoriser, résumer la semaine, relancer, signaler une anomalie) et elle prépare un geste que
   l'humain valide. Les meilleures (Midday, Qonto, Pennylane, Ramp, Linear) ont toutes la même forme :
   **l'IA lit, nomme, classe et propose ; le code calcule et tranche ; l'humain confirme.**
5. **PDS OS a déjà le plus dur** : ~30 traitements IA invisibles (compte rendu, lecture de devis, de
   justificatifs, dictée, retours de mix, brief Master…), 27 lectures et 13 propositions pour PO, le
   rendu PDF, les graphiques Finance. Il manque surtout **trois sorties** (afficher autre chose que du
   texte, produire un fichier, écrire n'importe quel texte de travail) et **un mode** (travailler seul,
   sur un calendrier, avec approbation).
6. **Les 22 « questions sans réponse »** du 10 au 17/11 ont toutes la cause « aucune fonction
   appelée ». Correction du 18/11 : ce comptage relevait **toute** réponse donnée sans fonction (un
   « merci », une explication), il ne prouve donc pas que PO ne savait pas faire. Il est remplacé par
   `report_gap`, que PO appelle quand il ne sait pas encore faire, avec le genre de la demande.
7. **Midday ferme** : l'équipe a rejoint Ramp, le produit s'arrête dans les trois mois (annonce sur
   midday.ai). Leur code reste public et reste la meilleure référence de conception ; ce n'est plus un
   produit vivant à suivre.

La liste complète des idées est au § 8 (≈ 140 idées en 15 familles), les priorités au § 10.

---

## 1. À quoi les gens utilisent l'IA en général

### 1.1 Les études

| Étude                                                 | Méthode                                                 | Ce qu'elle dit                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAI / NBER « How People Use ChatGPT » (sept. 2025) | > 1 M de conversations classées par machine             | Conseil pratique ≈ 29 %, recherche d'info 24 % (14 % un an avant), écriture 24 % (36 % avant), tutorat ≈ 10 %, code 4,2 % _(relais)_. Hors travail > 70 %. Au travail, l'écriture ≈ 40 % des messages                                                                          |
| OpenAI Signals v3.0 (26/10/2026)                      | Demandes de travail aux États-Unis, 165 activités O*NET | Décider / résoudre 21,6 %, penser créativement 15,6 % (11,8 % un an avant), documenter 11,8 %, chercher 9,9 %, conseiller autrui 9,0 % (5,5 % avant) _(relais)_                                                                                                                |
| Anthropic Economic Index (janv. et mars 2026)         | 1 M de conversations Claude.ai + 1 M d'API              | Claude.ai : 46 % travail, 52 % « augmentation » (itérer, apprendre, valider) contre 45 % « automatisation ». API (l'IA dans des produits) : ~¾ d'automatisation : e-mails, factures, classement, agenda                                                                        |
| Microsoft « It's About Time » (déc. 2025)             | 37,5 M de conversations Copilot                         | Intentions dans l'ordre : chercher une info, conseil et avis, créer, apprendre, support technique. Desktop = travail en semaine                                                                                                                                                |
| Menlo Ventures, State of Consumer AI 2026             | Enquête, adultes américains                             | 64 % utilisent l'IA, 25 % chaque jour. Parmi ceux qui font l'activité, part qui la fait avec l'IA : écriture 61 %, présentations 52 %, images 53 %. 24 % utilisent un agent régulièrement. Voix = mode principal pour 19 %. Premier critère de choix : **l'exactitude** (45 %) |
| Reuters Institute (29/10/2026)                        | Six pays                                                | Usage hebdomadaire 51 % (34 % en 2025). Recherche d'info 38 % des usages de la semaine                                                                                                                                                                                         |
| HBR « AI in the Wild » 2026 (Zao-Sanders)             | 12 637 cas tirés de forums                              | Classement de ce dont on **parle** : thérapie / compagnie n° 1, décision n° 13, e-mails n° 42. Biaisé vers le spectaculaire, à ne pas prendre comme mesure d'usage                                                                                                             |

### 1.2 La taxonomie qu'on retient

| Usage                                        | Poids                                                  | Ce que ça donne chez PDS                                                              |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Chercher, comprendre une info**            | 1er ou 2e partout                                      | « Où en est X ? », « Qui a mixé Y ? », « C'est quoi un ISWC ? »                       |
| **Conseil pratique, comment faire**          | ≈ 29 % ChatGPT                                         | « Comment je déclare à la SACEM ? », « Que faire si The Orchard refuse le fichier ? » |
| **Décider, résoudre**                        | 1re activité de travail                                | « Lequel des deux devis ? », « On attend ou on anticipe ? »                           |
| **Écrire, surtout réécrire**                 | ≈ 24 % (⅔ de réécriture)                               | Mail à un mixeur, relance presse, pitch DSP, bio, traduction                          |
| **Résumer**                                  | 40 % des utilisateurs au travail (Pew)                 | Un call, un contrat, un projet, la semaine                                            |
| **Créer, trouver des idées**                 | 15,6 % du travail, en hausse                           | Noms de single, idées TikTok, concepts d'influence                                    |
| **Apprendre**                                | ≈ 10 %                                                 | Comprendre les droits voisins, un écran, une règle de l'app                           |
| **Planifier, s'organiser**                   | n° 2 HBR 2025                                          | Rétroplanning, semaine de sortie                                                      |
| **Analyser des données, faire un graphique** | 27 % des utilisateurs au travail (Pew, avec le code)   | Trésorerie, budget, stats d'une activation                                            |
| **Images, multimédia**                       | 7,8 % des messages ChatGPT après Images 2.0 _(relais)_ | Moodboard, déclinaison de visuels                                                     |

Tendances 2025 → 2026 : la recherche d'info et le conseil montent, l'écriture baisse en part, les
usages se dispersent (les 10 premières tâches pèsent de moins en moins), les agents et la voix
s'installent, la création d'images explose.

---

## 2. À quoi les salariés l'utilisent au travail

### 2.1 Les tâches les plus confiées à l'IA

Croisement de Pew (2025), Microsoft Research (200 000 conversations Copilot), Anthropic, OpenAI.
L'ordre est notre synthèse.

1. **Chercher et s'informer** (57 % des utilisateurs, Pew).
2. **Éditer un texte existant** (52 %) : relire, reformuler, corriger le ton, traduire.
3. **Rédiger un premier jet** (47 %) : mail, note, compte rendu, message.
4. **Résumer** documents, fils, réunions (40 %).
5. **Trouver des idées** (35 %).
6. **Communiquer** : réponses, relances, messages d'équipe (top 3 Microsoft Research).
7. **Analyser des données, tableaux, formules** (27 %).
8. **Images, vidéo** (21 %).
9. **Back-office automatisé** (API Anthropic) : classer des mails, traiter des factures, agenda,
   prospection.

### 2.2 Par fonction, appliqué à PDS

| Fonction chez PDS  | Usages typiques mesurés ou très courants                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direction (Ibé)    | Synthèse d'avancement, préparation d'une décision (options, risques), mails sensibles, résumé de calls, préparer une intervention. 43 % des dirigeants l'utilisent chaque jour, contre 10 % des non-managers _(Slack, relais)_ |
| Chef de projet     | Comptes rendus et actions, rapports d'avancement, découpage et planification, risques, briefs                                                                                                                                  |
| Finance / business | Rapprochement, classement de factures et justificatifs, analyse d'écarts, prévisions, reporting. Les prévisions sont **les moins bien notées** _(relais)_ : l'IA s'y trompe                                                    |
| Juridique          | Recherche, synthèse et revue de documents, comparaison de versions, rédaction de clauses (usage des cabinets : 14 % → 26 % en un an, _relais_)                                                                                 |
| Marketing / RP     | Contenus, légendes, déclinaisons de messages, idées de campagne, recherche d'audience, visuels                                                                                                                                 |
| Direction créative | Brainstorming, variantes, moodboards, textes de brief artistique                                                                                                                                                               |

### 2.3 Ce que les études disent des gains et des limites

- Gains nets sur la langue (chercher, écrire, résumer) et **surtout pour les moins expérimentés**
  (+34 % chez les débutants du support, Brynjolfsson ; P&G : un individu avec IA ≈ une équipe de deux).
- **Frontière irrégulière** (Dell'Acqua, BCG) : hors de ce que l'IA sait bien faire, les gens font
  _moins bien_ avec elle (≈ −19 points). Les tâches de jugement gagnent peu.
- **« Workslop »** : 40 % des salariés ont reçu dans le mois un contenu IA bâclé qui fait perdre du
  temps à celui qui le reçoit _(relais, HBR 2025)_. Un PDF « fait par PO » envoyé à un mixeur doit
  être bon, ou ne pas exister.
- **Shadow AI** : plus de la moitié trouveraient un autre outil sans accord (BCG). C'est l'argument
  central de la demande de Sacha.
- Aucune étude ne compare directement « IA dans l'outil » et « ChatGPT à côté ». Ce qui ressort : les
  gens vont au généraliste quand l'outil intégré fait moins ; la valeur de l'intégré, c'est le
  contexte et la préparation de gestes.

---

## 3. Ce que savent faire Claude, ChatGPT, Gemini, Copilot, NotebookLM

| Capacité                       | Ce que l'utilisateur obtient                                                   | Qui le fait                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Recherche approfondie          | Rapport long, sources citées, recherche pilotable en cours                     | Claude Research, ChatGPT Deep Research, Gemini, Copilot Researcher                                                                         |
| Interroger ses propres sources | Réponses limitées à ses documents, avec citations                              | NotebookLM, Claude Projects                                                                                                                |
| Écrire dans un panneau         | Le texte vit à droite, on le modifie en parlant                                | Claude artifacts, Gemini Canvas, Copilot Pages. ChatGPT a retiré son canvas des nouveaux modèles au profit de blocs dans le fil _(relais)_ |
| Analyser des données           | On dépose un fichier, l'assistant exécute du code et rend tableau ou graphique | Claude (exécution de code, toutes offres), Copilot Analyst, Copilot dans Excel (« Plan Mode » : montre ce qu'il va modifier avant)         |
| Visualiser                     | Graphiques interactifs, diagrammes, cartes mentales, infographies              | Claude artifacts, NotebookLM (cartes mentales, infographies), Gemini                                                                       |
| Produire des fichiers          | Excel, PowerPoint, Word, PDF téléchargeables                                   | Claude (officiel, jusqu'à 30 Mo), Copilot, agent ChatGPT (présentations)                                                                   |
| Apprendre                      | Quiz, fiches, guide d'étude, FAQ tirés de ses documents                        | NotebookLM, ChatGPT mode étude, Gemini Canvas                                                                                              |
| Interactif                     | Mini-applis, simulateurs à curseurs                                            | Claude artifacts, Gemini Canvas, Airtable Omni                                                                                             |
| Audio                          | « Podcast » à deux voix sur un dossier, vidéo narrée                           | NotebookLM                                                                                                                                 |
| Agir                           | Tâches longues, tâches planifiées, agents sur déclencheur                      | ChatGPT (tâches, agent), Gemini Agent, Notion Custom Agents                                                                                |
| Mémoire                        | Préférences et projets retenus d'une conversation à l'autre                    | Claude, ChatGPT, Notion                                                                                                                    |
| Intégrations                   | Lire et agir dans mail, agenda, drive, CRM, compta                             | Connecteurs / MCP partout. Les SaaS s'ouvrent en MCP pour être pilotés par Claude (Midday, Qonto, Pennylane en lecture seule)              |

**Patterns d'interface qui marchent** : l'objet à côté de la conversation ; une **carte fichier** avec
« Télécharger » dans la réponse ; un bouton **« Créer à partir de ce résultat »** qui transforme une
réponse en autre format (NotebookLM Studio : une tuile par format, aucune consigne à écrire) ; sources
citées ouvrables ; **plan avant exécution** ; brouillon à valider ; sortie déclenchée par un événement
(fin de réunion → compte rendu) ; consommation visible.

---

## 4. L'IA intégrée dans les applications

### 4.1 Midday, la référence (en cours de fermeture)

Lu dans leur site et leur code (`midday-ai/midday`). Détail : `docs/ANALYSE-MIDDAY.md` § 4.

- **Trois familles** : invisible (catégoriser les transactions, lire les reçus, rapprocher,
  résumer la semaine), conversationnelle (« Ask Midday » sur l'accueil, bots WhatsApp / iMessage /
  Slack, serveur MCP pour Claude et ChatGPT), autonome planifiée (« Midday Computer »).
- **L'accueil n'a pas de page blanche** : la zone « Ask Midday » est entourée de quatre actions
  rapides (créer une facture, ajouter une transaction, un client, suivre du temps) qui envoient un
  message prédéfini au chat.
- **Un objet, pas un paragraphe** : quand l'assistant crée une facture, le vrai éditeur s'ouvre à
  côté et le texte se réduit à une phrase. Les objets cités sont des liens (`#inv:…`, `#cust:…`).
  Tableau obligatoire dès 3 éléments.
- **Pendant le travail** : une ligne par outil, en mots humains (« Looking up invoices »), repliable.
- **Le rapprochement reçu ↔ transaction n'a aucun LLM** : score calculé, trois niveaux
  (automatique, suggéré, à revoir), automatique seulement après des confirmations humaines.
- **Le résumé de la semaine** : le code choisit les chiffres et les anomalies (« slots »), le modèle
  ne rédige que le récit.
- **Midday Computer** (bêta) : on décrit un résultat, un agent tourne sur un calendrier.
  Préconstruits : **clôture du mois** (28-31, 8 h), **relance des factures** (mardi 9 h), **briefing
  du lundi** (8 h, 12 semaines de comparaison), **détecteur de dépenses** (silencieux sauf doublon,
  pic, fournisseur inconnu). « Nothing executes without your approval. » Trace complète de ce que
  l'agent a lu et décidé.
- **Une seule boîte à outils** sert le chat, les bots, l'API et les clients MCP.

### 4.2 Les applications comparables (choisies pour leur proximité avec PDS OS)

Petite équipe, données structurées, documents, validations.

| Application                     | Ce que fait l'IA                                                                                                                                                                                                                                                       | Pourquoi elle compte pour nous                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Pennylane** (compta, FR)      | Deux niveaux : _Copilot_ (lit les factures, suggère écritures, catégories, rapprochements, « chaque action est déclenchée par une personne ») et _Autopilot_ (tient, rapproche, relance les pièces, prépare la TVA, supervisé depuis un cockpit, démarrage progressif) | Le passage « l'humain déclenche » → « le système tourne, on traite les exceptions » est exactement le chemin de nos justificatifs |
| **Qonto** (banque, FR)          | _Operator_ prépare paiements, cartes, factures ; _Analyst_ répond sur dépenses et trésorerie ; photo d'un reçu → montant, date, fournisseur ; approuver une catégorie fait suivre les transactions similaires. « AI drafts the work, you review & approve »            | Le modèle de nos dépenses ; apprentissage par la confirmation                                                                     |
| **Ramp / Brex** (dépenses)      | Appliquent la politique de dépenses, approuvent seuls le routinier, escaladent le douteux, codent les dépenses, détectent anomalies et faux justificatifs générés par IA. Brex marque chaque message IA d'un losange                                                   | Automatiser le simple, escalader le douteux, avec piste d'audit                                                                   |
| **Attio** (CRM)                 | « Ask Attio » cherche, met à jour, crée des fiches, rédige les relances ; Call Intelligence transcrit et rédige les prochaines étapes ; enrichissement automatique                                                                                                     | Le module Business (deals, relances, calls)                                                                                       |
| **Productive.io** (agences)     | Agents écrits en langage naturel : audit des temps, projets à risque, budgets prêts à facturer, deals endormis à relancer ; approbation de la sortie avant envoi                                                                                                       | Budgets, projets, relances : très proche d'un label                                                                               |
| **Juro / Spellbook** (contrats) | Générer depuis un modèle, relire un contrat tiers avec un « playbook » de règles et des clauses de repli, extraire les clauses, poser des questions au contrat ; modifications en suivi que l'on accepte une par une                                                   | Le Juridique : modèles, contrats reçus, comparaison                                                                               |
| **Box AI**                      | Questions sur dossiers avec liens vers les sources, extraction de termes et de dates en métadonnées ; l'agent hérite exactement des droits de l'utilisateur                                                                                                            | Notre règle « le RLS est la sécurité »                                                                                            |
| **tl;dv / Granola** (réunions)  | Transcription sans bot, résumé, actions, mises à jour du CRM ; chaque chiffre d'un tableau de bord ouvre les citations d'appel derrière lui                                                                                                                            | Nos Calls, et « chaque chiffre renvoie à sa source »                                                                              |
| **Frame.io** (production vidéo) | Arborescences, renommage, métadonnées, **résumé des retours** sur une version, recherche dans les images, mention « IA utilisée » sur un fichier                                                                                                                       | Production et livrables                                                                                                           |
| **Linear**                      | Triage : suggère assigné, projet, étiquettes, doublons ; **le survol montre le raisonnement** ; suggestions séparées de ce qu'un humain a posé ; automatisation activée type par type ; mises à jour de projet en brouillon                                            | La bonne façon d'afficher une suggestion                                                                                          |
| **Shopify Sidekick**            | Commandes « / » (`/low-stock-alert`), changements préparés en brouillon et testés avant validation ; limité aux droits du membre                                                                                                                                       | Commandes rapides dans la saisie                                                                                                  |
| **Notion AI**                   | Agents sur déclencheur ou planning, notes de réunion sans bot, **autofill** des propriétés d'une base                                                                                                                                                                  | Remplir une colonne entière                                                                                                       |
| **Chartmetric Flow AI**         | Agent d'analyse sur les données musicales                                                                                                                                                                                                                              | Seul outil du secteur avec un agent                                                                                               |

### 4.3 Les patterns qui reviennent

| Pattern                           | Où on le voit                                           | Comment l'humain garde la main                            |
| --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Catégoriser / remplir tout seul   | Cellule qui se remplit, bouton d'autofill d'une colonne | Aperçu, correction, marque « suggéré »                    |
| Détecter une anomalie             | Pastille, file « à revoir », notification               | Silence si tout va bien ; règles réglables                |
| Résumer un objet ou une période   | Ligne en tête de fiche, briefing hebdomadaire           | Chiffres du code, lien vers la source                     |
| Demander à ses données            | Zone de saisie de l'accueil, panneau                    | Outils visibles, objets cliquables, droits de la personne |
| Graphique ou rapport              | Dans le fil ou dans un panneau                          | Chiffres tirés d'un outil, jamais du modèle               |
| Brouillon d'action à valider      | Formulaire pré-rempli, mail pré-écrit                   | Enregistrer / envoyer = geste humain séparé               |
| Relancer                          | Liste d'urgences avec relances proposées                | Approuver ou rejeter chacune                              |
| Digest planifié                   | Mail ou message du lundi                                | Activable / désactivable, trace                           |
| Recherche sémantique              | Une barre unique                                        | Citations cliquables                                      |
| Extraction d'un document          | Photo, PDF déposé → champs remplis                      | Champs corrigeables, passage source cité                  |
| Actions en un clic depuis la page | Boutons à côté de l'objet, commandes « / »              | Le message envoyé est visible                             |
| Agents de bout en bout            | Cockpit, mode approbation, journal                      | Périmètre réglable, démarrage progressif, mode simulation |

### 4.4 Ce qui sépare l'excellent du gadget

Excellent : l'IA agit **dans un geste existant** (Linear a trouvé son propre chatbot « pas vraiment
utile ») ; **pas de page blanche** (écrire une consigne est plus dur que lire : boutons et suggestions
d'abord) ; **l'origine et le raisonnement visibles** ; ce que l'IA a suggéré reste **distinct** de ce
que l'humain a décidé ; **autonomie progressive** et activée exprès ; invoquer, rejeter, corriger
coûtent un clic ; le système dit ce qu'il sait faire ; il retient les corrections.

Gadget : un chat qui ne sait rien de la page ouverte ; une saisie vide sans suggestion ; un résultat
sans source ; une action irréversible sans validation ; impossible à corriger ou à couper ; « demande-moi
n'importe quoi » au lieu de tâches précises ; une démo qui fait moins bien qu'un bouton existant.
Contre-exemple chiffré : Copilot 365, 3 % des répondants voient une valeur « significative » _(relais,
Gartner 2025)_.

---

## 5. L'IA dans la musique

Le secteur parle surtout de création et de lutte contre le spam IA ; les usages « bureau » d'un label
sont peu documentés. Ce qui existe :

- **Repérage** : Chartmetric note chaque jour 10 M d'artistes (« contexte, pas prévision », dit
  Chartmetric lui-même) ; Cyanite tague un catalogue et cherche par similarité (utile en sync).
- **Marketing** : 50 % des artistes indépendants utilisent l'IA en marketing ou stratégie (Ditto
  2026). Légendes, calendriers de posts, communiqués, bios, EPK : usage courant, peu chiffré.
- **Contrats** : Contracko (splits, territoires, obligations dans les contrats de disque, d'édition,
  de sync), Tone (compare des termes saisis au PDF). Aucun banc d'essai indépendant : relecture
  humaine obligatoire.
- **Déclarations** : Spotify adopte le standard DDEX pour déclarer l'usage de l'IA dans les crédits
  (voix, instrumentation, post-production) ; Deezer étiquette les titres 100 % IA (≈ 90 000 par jour,
  plus de la moitié des envois au pic de juin 2026).
- **Droit** : la SACEM a exercé son opposition à la fouille de données (art. L. 122-5-3 CPI) en
  octobre 2023 ; des majors ajoutent des clauses d'entraînement IA aux contrats _(relais, Billboard)_ ;
  AI Act, obligations de transparence (art. 50) en vigueur depuis le 02/08/2026 : un texte, une image
  ou un son **publiés** et générés par IA peuvent devoir être signalés. À faire vérifier par un juriste
  avant que PO produise du contenu publié.
- **Créateurs inquiets** : 71 % craignent de ne plus vivre de leur travail (Goldmedia pour Sacem /
  GEMA). Tout ce que PO fait autour de la voix, de l'image ou des masters d'un artiste doit rester
  côté organisation, jamais côté création.

---

## 6. Ce que dit PDS OS lui-même

### 6.1 Les questions sans réponse

Base Notion « Questions sans réponse de PO », 22 lignes du 10 au 17/11/2026, dont 18 en production.
Cause unique : **« Aucune fonction appelée »**, depuis l'Accueil, Travail, les Titres d'un projet, le
Cadrage, la SACEM. Le texte des questions n'est pas gardé (choix du 07/11). **Limite** (vue le 18/11 en
lisant `lib/assistant/gaps.ts`) : cette cause comptait toute réponse sans fonction, un « merci » ou une
explication compris ; elle dit seulement que PO a répondu de tête, pas qu'il ne savait pas faire. D'où
la **catégorie** de la demande (§ 8 O2), livrée le 18/11 avec `report_gap`.

### 6.2 Ce que les tickets d'Ibé demandent déjà à PO

Les tickets décrivent un PO bien plus large que l'actuel. Extraits (détail par ticket dans le rapport
de lecture, index en § 12) :

- **Cadrage** : analyser ce qui est connu avant de demander ; une question à la fois ; préparer et
  exploiter le call ; générer Brief et Plan du projet (Focus / Ensuite / Pendant ce temps / À anticiper).
- **Master** : détecter la source, les prérequis manquants (Attendre / Anticiper), **surveiller une
  condition et reprendre le workflow**, calculer les échéances à rebours, distribuer les questions aux
  bonnes personnes, générer le Brief Mix/Master et le package de transmission, synthétiser les retours.
- **Stratégie** : construire les 8 dimensions sans redemander, calculer les échéances amont, générer
  Brief de sortie, **Plan de sortie** (« le vrai document visuel, plus éditorial que le Brief ») avec
  proposition de moodboard, **Dossier de presse** ; après la sortie, comparer les signaux aux objectifs
  et recommander.
- **Juridique** : interpréter des réponses libres, statut de confiance par fait (connu, déduit,
  déclaré, confirmé, manquant…), fiches de renseignements adaptées au rôle, cartographie personne →
  besoin → modèle, extraction des conditions d'un message de clearance, pré-remplissage du bulletin
  SACEM 725, Récap Sortie (verdict prête / à risque / non prête).
- **Conception et Production** : préparer les calls, extraire les intentions, proposer des
  formulations, briefs par équipe, compte rendu en décisions / hypothèses / actions, plan de
  préproduction, extraction des devis, rétroplanning, regrouper les retours en corrections, contrôle
  des exports.
- **Marketing** : concept décliné par influenceur, réponse de négociation préparée, **mapping de
  l'Excel d'une agence**, message récapitulatif, synthèse du bilan, détection de doublons ; RP : un
  brouillon distinct par cible, relances, **brief d'interview avec questions probables**.
- **Distribution** : dossier de livraison The Orchard, manques et incohérences, réserves regroupées.
- **Budget / Business** : photo d'un ticket → dépense remplie (BUD 5) ; préparer le call d'un deal et
  proposer les changements après (BIZ 6) ; **lire les boîtes mail et ranger les fils dans le bon deal**
  (BIZ 9) ; « en ouvrant PO, Glen sait quoi faire aujourd'hui et sur quel artiste » (BIZ 4) ;
  comparer deal memo et contrat (BIZ 7).

Livrables du métier que l'IA peut préparer ou exporter : Brief de cadrage, Plan du projet, Brief de
sortie (PDF), Plan de sortie, Dossier de presse, Brief Mix/Master et package, fiches de renseignements,
contrats remplis, feuille de splits, bulletin SACEM, Récap Sortie, brief créatif et Fiches Livrables,
brief réalisateur et briefs d'équipe, feuille de service, comptes rendus, liste de matériel, concepts
d'influence, messages RP, brief d'interview, rapport Marketing, dossier de livraison, deal memo.

### 6.3 Ce que les retours des tests demandent

Le besoin dominant n'est **pas** une IA créative : c'est **ne pas ressaisir, savoir quoi faire
ensuite, comprendre un écran ou une règle, moins de bruit**. Demandes nettes encore ouvertes ou en
partie faites : brouillon complet sourcé des 8 dimensions de la Stratégie avec niveau de confiance
(MKT-S1-09, MKT-UX-002) ; synthèse narrative avec contradictions à arbitrer (MKT-S1-06, MKT-UX-003) ;
Brief de sortie en une page lisible (MKT-S1-14) ; classement assisté des dépenses avec pièce jointe
(MKT-S1-15) ; options proposées quand une date est « trop tard » (MKT-S1-10) ; lots de livrables par
levier (MKT-S1-08) ; assistant SACEM pas à pas (JUR-21) ; « il manque X, de la part de Y, à saisir
ici » (JUR-16) ; création de contrat guidée (JUR-18) ; chaque alerte transformée en action (JUR-03) ;
explication d'un contrôle de distribution en échec (DIST-006) ; signalements de l'ingénieur rédigés
et classés (PROJ-AMEL-02).

Le seul retour sur la fiabilité (PROJ-BUG-02) : « des citations introuvables ». **Les testeurs
attendent que PO cite.** Et Ibé : « ça fait très ordinateur qui met des données ».

### 6.4 L'IA déjà en place

- **Hors conversation** (`lib/ai/instructions/`, 29 traitements) : compte rendu de call avec
  citations, préparation du prochain call, lecture d'un texte pour le Cadrage, « M'aider à définir »,
  reformulations de l'objectif, dictée du Cadrage / de la Stratégie / du Brief Master, pré-cochage de
  la Stratégie, premier brouillon de la Stratégie, lecture des réponses juridiques et des échanges de
  clearance, modèle tiré d'un contrat rempli, termes d'un deal tirés d'un call, intentions créatives,
  formulation d'un champ de Fiche Livrable, synthèse des retours de mix, lecture d'une réponse de la
  DA, lecture de devis, import d'une organisation de production, points d'un call de production,
  lecture de justificatifs, lecture de moodboard, lecture de captures TikTok, homonymes Deezer,
  réécriture et tri des retours, résumé Finance de la semaine. Plus la transcription (Groq).
- **PO** : 27 lectures (projets, workflows, calendrier, fichiers, Finance, contrats, Réseau, guide de
  l'app, droits, notions…) et 13 propositions qui ouvrent le vrai formulaire pré-rempli.
- **Briques réutilisables** : rendu PDF (`lib/pdf/render.ts`, Playwright), export CSV de Finance
  (`app/api/finance/export`), graphiques maison en SVG (`donut-chart`, `ranked-bars`, `progress-bar`,
  `month-chart`, `budgets-pie`, `flow-bars`), images jointes, historique des conversations, quota
  par membre.
- **Ce que la conversation sait afficher** (`components/assistant/answer-text.tsx`) : paragraphes,
  listes, gras, sources construites par le code, et les cartes de brouillon. **Ni tableau, ni
  graphique, ni fichier, ni lien d'objet.** C'est le premier verrou.

---

## 7. Ce que PO doit devenir

Trois rôles, empruntés à Midday et aux généralistes, qui couvrent toute la taxonomie du § 1 :

1. **Le collègue qu'on interroge** (le « Claude de l'entreprise ») : répond, explique, écrit,
   réécrit, traduit, résume, réfléchit avec vous, sur les données de PDS **et** sur n'importe quelle
   tâche de travail. Rend un tableau, un graphique, un schéma ou un fichier quand c'est la bonne forme.
2. **L'assistant qui prépare** : ouvre le vrai formulaire, le vrai document ou le vrai message,
   rempli et sourcé ; l'humain enregistre, signe, envoie.
3. **Le veilleur qui travaille seul** : résume la semaine, relance, signale, rapproche, sans qu'on lui
   demande, et propose ; rien n'a d'effet sans approbation.

Principe de construction, inchangé : **le modèle choisit et rédige ; le code lit, calcule, met en
forme et vérifie ; l'humain décide.** Un graphique de PO est un composant de l'app rempli par une
requête, jamais des chiffres écrits par le modèle. Un PDF de PO est un gabarit de l'app rempli par le
code, avec le texte du modèle aux endroits prévus.

---

## 8. Tout ce que PO pourrait faire

Effort : **F** faible (briques déjà là), **M** moyen, **L** lourd. « Existe » = déjà fait, en tout
ou en partie. Les exemples sont des demandes réelles ou plausibles de l'équipe.

### A. Répondre et expliquer

| #   | Idée                                                                                                    | Exemple                                                                                                       | Effort                                        |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A1  | Répondre à **toute question de travail**, même hors données de PDS (culture du métier, outils, méthode) | « Comment on calcule un taux de royalties net ? », « Différence entre un contrat d'artiste et une licence ? » | F                                             |
| A2  | Expliquer l'écran ouvert                                                                                | « Je fais quoi ici ? » sur Master › Source                                                                    | Existe en partie (`step_status`, `app_guide`) |
| A3  | « Que dois-je faire aujourd'hui ? », par poste et par artiste (BIZ 4)                                   | Glen ouvre PO le matin                                                                                        | Existe en partie (`my_todo`)                  |
| A4  | Expliquer pourquoi un chiffre vaut ce qu'il vaut                                                        | « Pourquoi le point bas est le 12 décembre ? » → les mouvements qui y mènent                                  | Existe en partie (`finance`)                  |
| A5  | Expliquer une règle, un état, une conséquence avant le geste                                            | « Si je refuse cette version, il se passe quoi ? » (PROD-033)                                                 | F                                             |
| A6  | Expliquer un contrôle en échec et comment le lever (DIST-006, JUR-16)                                   | « Il manque l'IPI de Nora, c'est elle qui doit le donner, ici »                                               | M                                             |
| A7  | Expliquer un document ou une clause collée, en langage simple, avec l'étiquette « à faire relire »      | « Explique-moi l'article 7 de ce contrat »                                                                    | F                                             |
| A8  | Répondre sur l'historique : « qu'est-ce qui a changé depuis lundi sur Marée basse ? »                   |                                                                                                               | Existe en partie (`recent_activity`)          |
| A9  | Comparer deux objets de l'app                                                                           | Deux projets, deux versions d'un mix, deux deals                                                              | M                                             |
| A10 | Répondre en **tableau** dès 3 éléments, avec liens vers chaque objet                                    | « Les titres sans ISRC »                                                                                      | M (rendu)                                     |
| A11 | Dire ce qu'il ne sait pas et où le trouver, et proposer d'en faire un retour                            |                                                                                                               | Existe                                        |

### B. Écrire et réécrire

| #   | Idée                                                                                                                              | Exemple                                                | Effort               |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------- |
| B1  | **Réécrire n'importe quel texte collé** : corriger, raccourcir, changer le ton, rendre plus clair                                 | « Rends ce mail plus ferme mais poli »                 | F                    |
| B2  | **Traduire** (FR ↔ EN au moins), en gardant les noms propres et les chiffres                                                      | Pitch pour un média anglais                            | F                    |
| B3  | Rédiger un mail de travail à partir du contexte de l'objet                                                                        | Mail au mixeur avec les retours de la V2 et l'échéance | M                    |
| B4  | Relances : paiement en retard, justificatif manquant, signature attendue, fiche de renseignements non remplie, livrable en retard | Une relance par personne, prête à envoyer              | M                    |
| B5  | Messages RP : un brouillon distinct par média depuis un modèle commun (ticket RP)                                                 |                                                        | M                    |
| B6  | Pitch DSP / playlists à partir de la fiche artiste et du Brief                                                                    |                                                        | M                    |
| B7  | Bio d'artiste, communiqué de presse, texte de présentation d'un single (versions courte / longue)                                 |                                                        | M                    |
| B8  | Légendes et accroches réseaux, plusieurs variantes, selon le plan d'activation                                                    |                                                        | F                    |
| B9  | Brief d'interview : messages clés, sujets sensibles, **questions probables** (ticket RP)                                          |                                                        | M                    |
| B10 | Réponse de négociation préparée à partir de la dernière position de chaque partie (Influence, BIZ)                                |                                                        | M                    |
| B11 | Message récapitulatif à une agence (profils validés, refusés, questions)                                                          |                                                        | M                    |
| B12 | Compte rendu partageable aux absents d'un call, en une page                                                                       |                                                        | F (existe en partie) |
| B13 | Synthèse éditoriale d'un document de l'app : Brief, Plan, Bilan (« moins extraction de données »)                                 | MKT-S1-14                                              | M                    |
| B14 | Formulations d'un champ (existe pour les Fiches Livrables), étendu à tout champ texte long                                        | Bouton « Proposer une formulation »                    | M                    |
| B15 | Rédiger un retour sur l'app précis (écran, geste) à partir d'une phrase vague                                                     | Existe (`propose_feedback`)                            | Existe               |
| B16 | Mémoriser le ton et la signature de chaque membre pour ses mails                                                                  |                                                        | M                    |

### C. Résumer

| #   | Idée                                                                                                | Exemple                                                             | Effort                 |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| C1  | Résumer un projet en 5 lignes : où il en est, ce qui bloque, prochaine échéance                     |                                                                     | F (`project_status`)   |
| C2  | Résumer un call (existe), **une série de calls** d'un même sujet                                    | « Tout ce qu'on a dit sur la pochette »                             | M                      |
| C3  | Résumer un document déposé (contrat, devis, PDF d'agence, relevé) avec citations                    |                                                                     | M                      |
| C4  | Résumer les retours d'une version (mix, vidéo, visuel), dédoublonnés, contradictions « à arbitrer » | Existe pour le mix ; à étendre à Production (PROD-030) et Influence | M                      |
| C5  | « Depuis ma dernière visite » : ce qui a changé pour moi                                            |                                                                     | M                      |
| C6  | Résumé de la semaine **par poste** (Finance existe ; projet, juridique, marketing, business)        |                                                                     | M                      |
| C7  | Résumé d'un fil de mails rangé dans un deal (BIZ 9)                                                 |                                                                     | L (lecture des boîtes) |
| C8  | Résumé d'un artiste : projets, titres, contrats, deals, chiffres Deezer                             | « Fais-moi le point sur ATYR »                                      | F                      |
| C9  | Récapitulatif de fin de workflow (PROD-040), de fin de sortie                                       |                                                                     | M                      |

### D. Visualiser (dans la réponse)

Toujours un composant de l'app rempli par une requête du code ; le modèle choisit lequel et pour quoi.

| #   | Idée                                                                                                           | Exemple                                       | Effort                               |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| D1  | **Graphique de trésorerie** prévue sur 1, 3, 6 mois, point bas marqué                                          | « Montre-moi la trésorerie jusqu'en mars »    | F (`month-chart`, `computeTreasury`) |
| D2  | Dépenses par poste, par projet, par artiste (camembert, barres classées)                                       |                                               | F (`donut-chart`, `ranked-bars`)     |
| D3  | Budget prévu / engagé / payé d'un projet ou d'une enveloppe                                                    |                                               | F (`consumption-meter`)              |
| D4  | Entrées et sorties par mois                                                                                    |                                               | F (`flow-bars`)                      |
| D5  | Avancement de tous les projets (workflows × états)                                                             | « Où en sont toutes les sorties ? » → matrice | M                                    |
| D6  | **Frise / rétroplanning** d'un projet jusqu'à la sortie, jalons et retards                                     |                                               | M                                    |
| D7  | **Schéma du plan du projet** : workflows, dépendances, ce qui bloque quoi                                      |                                               | M                                    |
| D8  | Répartition des droits d'un titre (splits master et édition) en camembert                                      |                                               | F                                    |
| D9  | Carte des personnes d'un projet (rôles, interne / externe, contrats signés ou non)                             |                                               | M                                    |
| D10 | Stats d'une activation ou d'un artiste dans le temps (relevés TikTok, YouTube, Deezer)                         |                                               | M                                    |
| D11 | Objectif vs réalisé du Marketing (bilan)                                                                       |                                               | M                                    |
| D12 | Charge de l'équipe : tâches et échéances par personne sur 4 semaines                                           |                                               | M                                    |
| D13 | Graphique **d'un fichier déposé** (Excel d'agence, relevé) : calculé par du code exécuté, jamais par le modèle |                                               | L (exécution de code)                |
| D14 | Carte mentale de la Stratégie (positionnement, publics, narratif, leviers)                                     |                                               | M                                    |

### E. Produire des fichiers

Le gabarit est de l'app ; le code remplit les faits ; le modèle n'écrit que les passages de texte
prévus. Livré comme **carte fichier** dans la réponse (« Télécharger », « Enregistrer dans les
fichiers du projet »).

| #   | Idée                                                                                                                                                    | Exemple                                          | Effort                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| E1  | **Export CSV / Excel de n'importe quelle liste** : titres d'un projet ou du catalogue, fichiers, contacts du Réseau, dépenses, contrats, tâches, splits | « Exporte tous les titres avec ISRC et crédits » | F (sur le modèle de `api/finance/export`) |
| E2  | Rapport Finance PDF : trésorerie, point bas, à payer, entrées en retard, enveloppes                                                                     |                                                  | M (`lib/pdf/render.ts`)                   |
| E3  | **Point projet** PDF d'une page (avancement, blocages, échéances, budget pour qui y a droit)                                                            | Pour un rendez-vous avec l'artiste               | M                                         |
| E4  | Plan de sortie (éditorial, sans budget) et Dossier de presse (ticket Stratégie)                                                                         |                                                  | M à L                                     |
| E5  | One-pager / EPK d'artiste                                                                                                                               |                                                  | M                                         |
| E6  | Rapport de bilan Marketing (figé, versionné)                                                                                                            |                                                  | M                                         |
| E7  | Présentation (PowerPoint ou PDF en pages) : bilan de sortie, point mensuel pour la direction                                                            |                                                  | L                                         |
| E8  | Fichier calendrier (.ics) des échéances d'un projet                                                                                                     |                                                  | F                                         |
| E9  | Archive (.zip) des fichiers d'un projet ou d'un titre                                                                                                   |                                                  | M                                         |
| E10 | Feuille de métadonnées pour The Orchard (titres, ISRC, crédits, dates)                                                                                  |                                                  | M                                         |
| E11 | Version d'un document existant de l'app en PDF depuis la conversation                                                                                   | « Envoie-moi le Brief Mix en PDF »               | F (les boutons existent)                  |

### F. Apprendre et s'entraîner

| #   | Idée                                                                                                                        | Exemple                | Effort               |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------- |
| F1  | **Quiz de prise en main** de PDS OS par poste, tiré du guide de l'app                                                       | Nouveau chef de projet | M                    |
| F2  | Fiches des notions du métier (ISRC, ISWC, droits voisins, SACEM 725, splits, sample) avec un exemple tiré des vrais projets |                        | F (`explain_notion`) |
| F3  | **Parcours guidé pas à pas** d'un geste rare (bulletin SACEM, dépôt The Orchard)                                            | JUR-21                 | M                    |
| F4  | Mode « explique-moi comme à un débutant »                                                                                   |                        | F                    |
| F5  | Simulateur de répartition : curseurs sur les parts, total et arrondis calculés par le code                                  |                        | M                    |
| F6  | Simulateur « et si » de trésorerie : décaler une dépense, ajouter une avance                                                |                        | M                    |
| F7  | Questions types par page, tirées au hasard du guide (« Essayez : … »)                                                       |                        | F                    |

### G. Analyser et aider à décider

| #   | Idée                                                                                                                 | Exemple                                               | Effort               |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------- |
| G1  | Comparer deux devis ou deux offres en tableau (prix, conditions, risques)                                            | Deux loueurs, deux agences                            | M                    |
| G2  | Comparer deux versions d'un contrat ou un deal memo et son contrat (BIZ 7)                                           |                                                       | M                    |
| G3  | Présenter les scénarios d'une décision et leurs conséquences sur les dates                                           | Master : Attendre ou Anticiper                        | M                    |
| G4  | **Détecter les contradictions** entre sources (Brief vs call vs Stratégie)                                           | MKT-UX-003                                            | M                    |
| G5  | Objectif vs réalisé commenté (Suivi & bilan, après sortie)                                                           |                                                       | M                    |
| G6  | Analyse d'un relevé de royalties ou d'un Excel d'agence déposé : lignes inhabituelles                                |                                                       | L                    |
| G7  | Contrôle de cohérence du catalogue : ISRC en double ou manquants, crédits incomplets, graphies d'artiste différentes |                                                       | F (code) + rédaction |
| G8  | Repérer ce qui dérape : projet sans mouvement depuis 10 jours, enveloppe à 90 %, échéance intenable                  |                                                       | M                    |
| G9  | Lire les arguments pour / contre d'une option et faire l'avocat du diable                                            | « Est-ce que sortir le 12 mars est une bonne idée ? » | F                    |
| G10 | Recommandations après sortie (« Appliquer / Ignorer / Parler à PO », ticket Stratégie)                               |                                                       | L                    |

### H. Lire des documents et des images

| #   | Idée                                                                                                                      | Exemple                               | Effort                       |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------- |
| H1  | **Déposer n'importe quel PDF, Excel, Word ou image dans PO** et lui poser des questions                                   | « Que dit ce contrat sur la durée ? » | M                            |
| H2  | Extraire les termes d'un contrat reçu (avance, taux, territoire, durée, clause IA) vers un brouillon, passage source cité |                                       | M                            |
| H3  | Photo d'un ticket → dépense pré-remplie (BUD 5)                                                                           |                                       | F (`receipt-reading` existe) |
| H4  | Excel d'une agence → mapping des colonnes proposé, erreurs signalées (ticket Influence)                                   |                                       | M                            |
| H5  | Capture d'écran d'une conversation ou d'un mail → faits et actions                                                        |                                       | F (images jointes existent)  |
| H6  | Lire une pochette ou un visuel et vérifier les mentions (crédits, logos)                                                  |                                       | M                            |
| H7  | Classer un fichier déposé et proposer son rattachement (projet, titre, catégorie)                                         |                                       | M                            |

### I. Chercher

| #   | Idée                                                                                         | Exemple                                                                                  | Effort                                 |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| I1  | Recherche par le sens dans tout PDS OS, **transcriptions et contenu des fichiers compris**   | « Où on a parlé de reverb sur la voix ? »                                                | M à L                                  |
| I2  | **Recherche web** quand la question le demande, réponse marquée « source externe » avec lien | Taux de TVA, contact d'un média, actu d'un artiste, règles de livraison d'une plateforme | M                                      |
| I3  | Enrichir une fiche (artiste, média, prestataire) depuis le web, champs proposés et sourcés   |                                                                                          | M                                      |
| I4  | Retrouver une personne ou un fichier à partir d'une description floue                        | « Le photographe de la session d'août »                                                  | Existe en partie (`search_everything`) |

### J. Créer et remplir

| #   | Idée                                                                                              | Exemple                                          | Effort             |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------ |
| J1  | **Une proposition pour chaque formulaire de l'app** (aujourd'hui 13)                              | Fiche Livrable, activation, deal, session, call… | M (par formulaire) |
| J2  | Créations en chaîne avec le plan montré avant                                                     | « Crée l'artiste, son titre et le projet »       | M                  |
| J3  | Créations en masse depuis une liste ou un Excel                                                   | 15 contacts presse d'un coup                     | M                  |
| J4  | Remplir une colonne entière (autofill façon Notion) : catégories des dépenses, rôles des contacts |                                                  | M                  |
| J5  | Brouillon complet sourcé d'une étape longue avec niveau de confiance (MKT-S1-09)                  | Stratégie                                        | M                  |
| J6  | Lots de livrables proposés par levier (MKT-S1-08)                                                 |                                                  | M                  |
| J7  | Classement assisté d'une dépense avec pièce jointe (MKT-S1-15)                                    |                                                  | F                  |
| J8  | Rétroplanning et jalons amont proposés depuis une date, options quand c'est trop tard (MKT-S1-10) |                                                  | M                  |
| J9  | Fiche de renseignements adaptée au rôle et pré-remplie (Juridique 02)                             |                                                  | M                  |
| J10 | Contrat pré-rempli depuis un modèle validé, manques listés (Juridique 03)                         | Existe en partie                                 | M                  |

### K. Agir et surveiller (avec approbation)

Le modèle de Midday Computer et de Pennylane Autopilot : chaque agent est activé exprès par la
personne, propose, attend l'approbation, garde une trace.

| #   | Idée                                                                                                                                                    | Quand         | Effort                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------ |
| K1  | **Briefing du lundi** par poste : ce qui m'attend, ce qui a bougé, ce qui dérape                                                                        | Lundi 8 h     | M                              |
| K2  | **Clôture du mois** Finance : dépenses non classées, justificatifs manquants, comparaison au mois précédent                                             | 28-31         | M                              |
| K3  | **Relance des entrées en retard** : liste par urgence, relances prêtes                                                                                  | Mardi 9 h     | M                              |
| K4  | Détecteur de dépenses : doublon, pic, fournisseur inconnu ; silencieux sinon                                                                            | Chaque jour   | M                              |
| K5  | Veille d'un projet : rien ne bouge depuis N jours, échéance intenable, prérequis enfin arrivé (« Master : la source est là, le mixage peut commencer ») | Événement     | M                              |
| K6  | Veille juridique : signature attendue depuis 7 jours, fiche non remplie, échéance de déclaration                                                        | Chaque jour   | M                              |
| K7  | **Envoyer un mail préparé** par po@pdsrecords.com, bouton « Envoyer » de la personne                                                                    | Sur demande   | M (`lib/email/send.ts` existe) |
| K8  | Ranger les mails reçus dans le bon deal ou le bon projet (BIZ 9) ; en cas de doute, demander                                                            | Continu       | L                              |
| K9  | Créer les tâches issues d'un call, sans doublon, après validation (PROD-005)                                                                            | Fin de call   | M                              |
| K10 | Préparer le prochain call (existe pour le Cadrage) dans tous les workflows                                                                              | Avant un call | M                              |
| K11 | Rappel « tu voulais… » : PO note un engagement dit en conversation et le rappelle                                                                       |               | M                              |
| K12 | Agent écrit en langage naturel par l'utilisateur (« chaque vendredi, liste-moi les titres sans ISRC »)                                                  |               | L                              |

### L. Créativité

| #   | Idée                                                                                                                                                     | Exemple | Effort                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------- |
| L1  | Brainstorming : noms de single, titres de campagne, angles de communication                                                                              |         | F                       |
| L2  | Idées de contenus TikTok / Reels depuis le Brief et le calendrier                                                                                        |         | F                       |
| L3  | Concepts d'influence déclinés par profil (ticket Influence)                                                                                              |         | M                       |
| L4  | Pistes de moodboard (existe : lecture d'un moodboard et recherches Unsplash) étendues à la proposition « Voir une autre proposition » (ticket Stratégie) |         | M                       |
| L5  | Images de travail (maquette de pochette, moodboard généré) **à usage interne seulement**, marquées « générée par IA »                                    |         | L, et AI Act à vérifier |

### M. Voix et mobile

| #   | Idée                                                                                                                             | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| M1  | Dictée partout dans PO et dans les longs champs (existe pour Cadrage, Stratégie, Brief Master)                                   | M      |
| M2  | Réponse lue à voix haute, courte, sans jargon (retour d'Ibé du 02/11 : « l'ordi dit des choses qui ne devraient pas être lues ») | M      |
| M3  | Raccourci iPhone : photo → PO → dépense, capture → repérage (existe pour le Repérage)                                            | F      |
| M4  | « Récap audio » de deux minutes d'un projet avant un call                                                                        | L      |
| M5  | PO par WhatsApp ou iMessage (notifications auxquelles on répond « relance-le »)                                                  | L      |

### N. Mémoire et personnalisation

| #   | Idée                                                                                                            | Effort |
| --- | --------------------------------------------------------------------------------------------------------------- | ------ |
| N1  | Préférences par membre : ton, longueur des réponses, langue, signature                                          | M      |
| N2  | « Mes artistes, mes projets » en tête des réponses                                                              | F      |
| N3  | Apprendre des corrections : une catégorie corrigée trois fois devient la proposition par défaut (Qonto, Midday) | M      |
| N4  | Suggestions de questions selon le poste et la page (existe sur Finance › Vue d'ensemble)                        | F      |

### O. Ouvrir PDS OS et mesurer

| #   | Idée                                                                                                                                          | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| O1  | **Serveur MCP de PDS OS en lecture** : l'équipe interroge PDS OS depuis son propre Claude, avec ses droits (Midday, Qonto, Pennylane le font) | M      |
| O2  | Compter la **catégorie** des questions sans réponse (écrire, traduire, exporter, graphique…) sans garder le texte                             | F      |
| O3  | Tableau de bord interne de l'usage de PO : questions par catégorie, outils appelés, réponses sans outil                                       | F      |

---

## 9. Les règles de PO à changer

| Règle actuelle (`docs/ASSISTANT.md` § 1)            | Proposition                                                                                                                                                                                                         | Pourquoi                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Ne répond que sur PDS OS ; hors sujet → refus court | **Lever** pour toute tâche de travail (écrire, traduire, expliquer, réfléchir, connaissances du métier). Garder le refus pour le clairement personnel                                                               | C'est la condition pour « remplacer le Claude de l'entreprise » ; l'écriture et le conseil sont les deux premiers usages mesurés |
| Pas de recherche Internet                           | **Assouplir** : recherche web quand la question l'exige, réponse marquée « source externe » avec lien, jamais mêlée sans le dire aux données de PDS                                                                 | Midday le fait (prix, taux de TVA) avec la même règle de provenance                                                              |
| Pas de calcul, date ou état de son cru              | **Garder** pour les données de PDS. Pour un fichier déposé : calcul par du **code exécuté** (pas par le modèle), résultat montré avec la formule                                                                    | La règle 6 reste vraie : c'est le code qui calcule, quel que soit le code                                                        |
| Rien n'est enregistré sans « Enregistrer »          | **Garder**, et l'étendre : envoyer un mail, lancer un agent, exporter = un geste humain                                                                                                                             | Toutes les références sérieuses le font (Qonto, Midday, Pennylane, Ramp)                                                         |
| Pas de décision (valider, transmettre, signer)      | **Garder**                                                                                                                                                                                                          | Ce sont des gestes de responsabilité ; les tickets d'Ibé l'exigent partout                                                       |
| Pas de texte juridique, aucune clause               | **Assouplir** : expliquer une clause collée, comparer deux versions, signaler une clause absente (IA, durée), toujours « à faire relire » ; ne **jamais** réécrire un modèle validé ni proposer une clause à signer | Le juridique est le domaine où la confusion coûte le plus ; l'explication aide sans engager                                      |
| PO n'envoie rien                                    | **Assouplir** : il prépare, la personne clique « Envoyer » depuis po@                                                                                                                                               | BIZ 9, RP, relances : les tickets en ont besoin                                                                                  |
| Réponse en texte seul                               | **Lever** : tableau, graphique, carte fichier, carte brouillon, lien d'objet ; tous construits par le code                                                                                                          | § 6.4 : c'est le premier verrou                                                                                                  |
| Un seul modèle (Haiku 5.5)                          | **Compléter** : un modèle plus fort pour les tâches longues (rapport, analyse, document entier), choisi par le code selon l'outil, compté plus cher dans le quota                                                   | Haiku suffit pour répondre, pas pour un dossier de presse                                                                        |

Ce qui ne change pas : les contenus importés et les transcriptions sont des données, jamais des
instructions ; le RLS fait la sécurité (PO lit avec la session de la personne) ; aucune clé côté
client ; un seul point d'entrée par fournisseur.

---

## 10. Par où commencer

Classement par **valeur pour l'équipe ÷ effort**, en s'appuyant sur les briques existantes.

**Vague 1 : faire sauter les trois verrous** (quelques lots)

1. **Ouvrir le champ de PO** aux tâches de travail générales (A1, A7, B1, B2, F4, G9, L1, L2) :
   c'est surtout un changement de consignes. Le plus gros gain pour le plus petit effort.
2. **Des réponses qui ne sont pas que du texte** : tableau et liens d'objet (A10), puis les graphiques
   qui existent déjà dans Finance (D1 à D4, D8). Un composant de réponse typé, rempli par l'outil.
3. **Les exports** : CSV / Excel de toute liste (E1) et les PDF qui existent déjà déclenchés depuis
   PO (E11). Une carte fichier dans la réponse.
4. **Compter la catégorie des questions sans réponse** (O2) pour savoir ce que l'équipe demande.

**Vague 2 : préparer à la place de l'humain** 5. Mails et relances préparés, envoyés par la personne (B3, B4, K7). 6. Déposer un document dans PO et lui poser des questions ; extraction des termes d'un contrat
(H1, H2) ; photo → dépense (H3). 7. Résumés par poste et « depuis ma dernière visite » (C5, C6). 8. Rapport Finance et Point projet en PDF (E2, E3). 9. Les demandes des retours encore ouvertes : brouillon sourcé de la Stratégie, contradictions,
Brief en une page, assistant SACEM (J5, G4, B13, F3).

**Vague 3 : travailler seul, avec approbation** 10. Briefing du lundi, clôture du mois, relance des entrées en retard, détecteur de dépenses
(K1 à K4). 11. Veilles projet et juridique (K5, K6), tâches issues des calls (K9). 12. Recherche web sourcée (I2), recherche dans les transcriptions et fichiers (I1). 13. Serveur MCP en lecture (O1).

À garder pour plus tard : génération d'images (AI Act à faire vérifier), voix lue, bots de
messagerie, agents écrits par l'utilisateur, analyse de relevés de royalties.

---

## 11. Risques à tenir

- **Workslop** : un document de PO envoyé à l'extérieur doit être meilleur qu'un document fait à la
  main ; sinon il coûte du temps à celui qui le reçoit. Gabarits soignés, relecture visible.
- **Frontière irrégulière** : PO doit dire quand il sort de ce qu'il sait faire (prévisions,
  jugement juridique, décisions artistiques) plutôt que répondre avec la même assurance.
- **Sur-dépendance** : chaque chiffre, chaque citation ouvre sa source (PROJ-BUG-02 ; Granola, tl;dv).
- **Confidentialité** : contrats, avances, splits ne partent que vers des fournisseurs sans
  entraînement sur nos données ; c'est déjà le cas avec l'API Anthropic, à vérifier pour tout nouveau
  fournisseur (recherche web, exécution de code).
- **Coût** : fichiers, recherche web, modèle plus fort et agents coûtent plus qu'une réponse ;
  le quota par membre doit les compter à part.
- **AI Act** : texte, image ou son **publiés** générés par IA (communiqué, visuel, légende) : faire
  vérifier les obligations de transparence avant de livrer ces fonctions.

---

## 12. Sources

**Usages généraux et au travail** : OpenAI / NBER w34255 (nber.org/papers/w34255) ; OpenAI Signals
v3.0, relayé par ppc.land ; Anthropic Economic Index, janvier et mars 2026 (anthropic.com/research) ;
Microsoft « It's About Time » (microsoft.ai/news/its-about-time-the-copilot-usage-report-2025) et
arXiv 2507.07935 ; Menlo Ventures 2026 (menlovc.com/perspective/2026-the-state-of-consumer-ai) ;
Reuters Institute 2026 ; Pew (février 2025 et juin 2026) ; Gallup (indicateur IA) ; BCG « AI at Work
2025 » ; McKinsey « State of AI 2025 » ; Stanford AI Index 2026 ; Slack Workforce Index ; Ramp AI
Index ; Brynjolfsson, NBER w31161 ; Dell'Acqua et al. (jagged frontier, cybernetic teammate) ; HBR
« workslop » (septembre 2025) ; HBR « AI in the Wild » 2026.

**Assistants** : support.claude.com (création de fichiers, skills) ; blog.google (NotebookLM, Gemini) ;
gemini.google/overview/canvas ; notion.com/releases ; annonces Microsoft 365 Copilot.

**IA intégrée** : midday.ai (/assistant, /inbox, /chat, /updates/midday-computer,
/updates/joining-ramp) et github.com/midday-ai/midday ; pennylane.com/fr/pme/solutions-intelligence-artificielle ;
qonto.com/en/ai ; ramp.com/ai ; brex.com/platform/brex-ai ; attio.com/ai ; productive.io/agents ;
juro.com/ai ; spellbook.com ; box.com/ai ; tldv.io ; granola.ai ; frame.io/ai ; linear.app/ai et
linear.app/blog/how-we-built-triage-intelligence ; shopify.com/sidekick ; notion.com/product/ai ;
Microsoft, « Guidelines for Human-AI Interaction » ; Shneiderman, arXiv 2002.04087.

**Musique** : Ditto « Independent Music Report 2026 » ; MIDiA « State of AI and Music » ; Water &
Music × Moises (mars 2026) ; Goldmedia pour Sacem / GEMA (2024) ; Deezer newsroom (juillet 2026) ;
TechCrunch (politique IA de Spotify, septembre 2025) ; Assemblée nationale, question écrite n° 16057
(art. L. 122-5-3 CPI) ; Cooley et Faegre Drinker (AI Act, art. 50) ; contracko.com ; chartmetric.com.

**PDS OS** : base Notion Tickets (`collection://3e8dd6cf-7e7d-8035-b1aa-000bb3eed599`) et dossier
Drive des tickets ; base Retours (`collection://39885a02-74d4-4985-8520-75a921811b9b`) ; base
« Questions sans réponse de PO » ; `docs/ASSISTANT.md`, `docs/ANALYSE-MIDDAY.md`,
`docs/CONTEXTE-PROJET.md`, `docs/PRODUCTION-METIER.md`, `docs/MARKETING-METIER.md` ;
`lib/ai/instructions/`, `components/assistant/answer-text.tsx`.

Tickets cités (`https://app.notion.com/p/<id>`) : Cadrage `3eddd6cf7e7d81a4970cc0e4913feb3a` ·
Master `3eddd6cf7e7d8142bdc0df93b5d228e4` · Stratégie `3f0dd6cf7e7d8174b70acdca6fb7f05a` ·
Juridique 01 à 08 `3f0dd6cf7e7d81b79518ee6aa4979d6a`, `…81ef8af2e704de50f209`,
`…8100bb6ecdfd9f7d5c45`, `…81fb9833d3a0e0d9bcaf`, `…81f2b253e435b10f891b`, `…81f084c6dc70e0c07729`,
`…81768862cc76b909075f`, `…818eae97f308c8e7ee22` · Conception `3f5dd6cf7e7d81abbf0bfddf0c5cf38d` ·
Production `3f5dd6cf7e7d8174a28cfb970fd35795` · Influence `3f5dd6cf7e7d8154b25bee2a5c0887bd` ·
RP `3f5dd6cf7e7d81258e61f1d569c09a8c` · Bilan Marketing `3f5dd6cf7e7d81deb7f8fe43806f85ff` ·
Distribution `3f5dd6cf7e7d81008431cb27185124e5` · BUD 5 `415dd6cf7e7d817a8d32ec36097f43c6` ·
BIZ 4 `415dd6cf7e7d8135871ac184fe9067ab` · BIZ 6 `415dd6cf7e7d81d280e0f71190927abb` ·
BIZ 7 `415dd6cf7e7d8112be7ce10e59d08173` · BIZ 9 `415dd6cf7e7d81e09d9efc079561dea2`.

Limites : les rapports payants (MIDiA, IFPI, Gartner) n'ont pas été lus en entier ; plusieurs pages
officielles 2026 (aide OpenAI, Canva, Qonto) répondaient 403 et sont lues par des relais ; le ticket
Finance d'Ibé du 13/11 (PDF) n'était plus dans `~/Downloads`, la Finance repose ici sur BUD 1 à 5 et
sur `docs/FINANCE-V2.md`.
