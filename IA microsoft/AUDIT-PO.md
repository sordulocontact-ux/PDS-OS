# Audit de PO, l'assistant de PDS OS

05/11/2026. Lecture du code de PO (`lib/ai/instructions/assistant.ts`, `app/api/assistant/route.ts`,
`lib/assistant/`, `components/assistant/`, `docs/ASSISTANT.md`) à la lumière de la synthèse sur
l'interaction humain-IA (`SYNTHESE-INTERACTION-HUMAIN-IA.md`, dans ce dossier). Les renvois du
type « G11 » désignent les 18 principes de Microsoft. « Couche A, B, C » renvoie à la section 7 de
la synthèse.

Rien n'a été modifié dans le code : c'est une liste de propositions, classées par priorité.

---

## 0. Diagnostic : pourquoi PO dit « je ne peux pas »

Le modèle n'est pas en cause. **Trois verrous dans le code** produisent les refus.

### Verrou 1 : les consignes l'enferment dans les données des projets

Extraits de `lib/ai/instructions/assistant.ts` :

- « Ton rôle : répondre aux questions sur les données de PDS OS, **et seulement elles** (projets,
  étapes, Brief, besoins, équipe, tâches, points ouverts, validations, calls, sorties, artistes,
  titres du catalogue, retours sur l'application) ».
- « Si l'information n'y est pas, réponds « **je n'ai pas cette information dans PDS OS** » ».
- « À une question « pourquoi », ne donne une cause **que si un fait la contient** ».
- « Hors sujet (culture générale, actualité, météo, **conseils sans lien avec les données**) :
  réponds en une phrase que tu ne traites que les projets de PDS OS ».

Une question **sur l'application elle-même** n'entre dans aucune case : « mes conversations
sont-elles enregistrées ? », « où sont les contrats ? », « pourquoi je ne peux pas modifier cette
page ? ». Elle tombe soit dans « je n'ai pas cette information », soit dans « hors sujet ». C'est
exactement ce que tu as constaté.

### Verrou 2 : PO ne voit qu'une partie de l'application

PO a **10 fonctions de lecture** : `find_projects`, `project_status`, `step_status`, `my_todo`,
`recent_activity`, `search_calls`, `team_members`, `find_artists`, `find_masters`, et
`find_feedback` (DG seulement). Tout le reste lui est **invisible** :

| Domaine de l'app                                                    | PO peut le lire ?                                                                                                                            |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Projets, étapes, Brief, tâches, validations                         | Oui                                                                                                                                          |
| Calls et comptes rendus                                             | Oui (recherche dans le texte)                                                                                                                |
| Artistes, titres                                                    | Oui (liste) ; la fiche d'un titre en détail, non                                                                                             |
| **Contrats et modèles de contrat**                                  | **Non** (il sait en proposer, pas les lire)                                                                                                  |
| **Réseau**                                                          | **Non** (même chose)                                                                                                                         |
| **Juridique** (État des lieux, fiches, splits, emprunts, SACEM)     | **Non**                                                                                                                                      |
| **Master** en détail (versions, tours de mix, retours)              | Seulement l'étape de la page ouverte (`step_status`)                                                                                         |
| **Distribution**                                                    | **Non**                                                                                                                                      |
| **Marketing** (Production, Conception, Activations, Suivi et bilan) | **Non**                                                                                                                                      |
| **Budget**                                                          | **Non**. `docs/ASSISTANT.md` : « PO ne lit jamais les lignes existantes » ; la question test n° 6 n'accepte que le cadre budgétaire du Brief |
| **Calendrier et réunions**                                          | **Non**                                                                                                                                      |
| **Fichiers**                                                        | **Non**                                                                                                                                      |
| **Notifications**                                                   | **Non**                                                                                                                                      |
| **Permissions** (qui peut quoi, et pourquoi)                        | **Non**                                                                                                                                      |
| **PO lui-même** (historique, quota, Espace Espace)                  | **Non**                                                                                                                                      |

### Verrou 3 : PO ne connaît pas l'application

Rien ne décrit PDS OS à PO : ni ses pages, ni où se trouve chaque chose, ni ses règles (une étape
validée est définitive, seul le responsable écrit dans un projet lancé, etc.), ni ses propres
règles de fonctionnement. Tout cela est écrit dans `docs/`, mais pour les développeurs, et PO n'y a
pas accès.

**L'exemple de la conversation enregistrée.** La réponse est écrite noir sur blanc dans
`docs/ASSISTANT.md` § 2 ter : chaque conversation est enregistrée après chaque réponse, y compris
celles de la fenêtre Espace Espace (avec la page d'ouverture). Elle est privée (même le DG ne la
lit pas) et gardée jusqu'à ce que la personne la supprime. PO n'a aucun moyen de le savoir, et ses
consignes lui interdisent de le deviner. Il répond donc « non » ou « je n'ai pas cette
information ».

> **Le refus est pire qu'un « je ne sais pas ».** Une réponse fausse sur l'application elle-même
> (« non, ce n'est pas enregistré ») détruit la confiance plus vite qu'une erreur sur un projet.
> L'utilisateur sait que c'est faux. C'est le _disuse_ de Parasuraman : on cesse de poser des
> questions à un outil qui refuse trop souvent.

---

## 1. Le principe directeur : élargir sans casser ce qui marche

Ce qui fait la solidité de PO doit rester tel quel : la session de l'utilisateur et le RLS, aucune
écriture par le modèle, des faits rédigés par le code, pas de date du jour, les transcriptions
traitées comme des données, aucune décision prise par PO (section 5). La recherche confirme que
c'est la bonne architecture (synthèse, § 8.1).

**La proposition** : PO répond à toute question sur PDS OS, à partir de **trois sources**, chacune
signalée comme telle à l'écran.

| Source                                     | Pour quelles questions                                                                                         | D'où vient la réponse                                                                        | Affiché comme                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Les données**                            | « Où en est Lueur ? », « Qui signe le contrat de Nova ? »                                                      | Les fonctions, avec la session et le RLS (comme aujourd'hui)                                 | « Données utilisées » + liens           |
| **Le mode d'emploi de PDS OS**             | « Où sont les contrats ? », « Mes conversations sont-elles gardées ? », « Pourquoi je ne peux pas modifier ? » | Un guide écrit par l'équipe et versionné, plus des faits calculés par le code (droits, page) | « Guide de PDS OS » + lien vers la page |
| **La connaissance du métier** (à trancher) | « C'est quoi un ISWC ? », « Différence entre droits master et édition ? »                                      | Le modèle, **sans chiffre, sans date, sans conseil juridique**                               | « Connaissance générale, à vérifier »   |

C'est l'application directe de la recherche : **distinguer à l'écran ce qui vient des données, du
code ou du modèle** (synthèse, § 7, provenance). La règle « l'IA ne produit jamais un état, un
compteur, une date ni un calcul » reste intacte dans les trois cas.

---

## 2. Priorité 0 : faire répondre PO sur l'application elle-même

### 2.1 Un guide de PDS OS pour PO

**Le problème** : le verrou 3.

**Ce qu'on fait** :

- Un **guide** dans `lib/assistant/guide/`, découpé par domaine (Projets, Cadrage, Master,
  Juridique, Contrats, Réseau, Catalogue, Calls, Calendrier, Fichiers, Équipe, Paramètres, PO).
  Pour chaque page :
  - à quoi elle sert ;
  - comment y aller (« Barre latérale › Contrats › onglet Modèles ») ;
  - ce qu'on y fait ;
  - qui peut faire quoi ;
  - les questions fréquentes, avec leur réponse.
- **Une partie générée par le code**, pour qu'elle ne mente jamais : la liste des pages et leurs
  liens (depuis `lib/ui/nav-items.ts` et `routes`), les intitulés (depuis `lib/i18n/fr/`), les
  droits par poste (depuis `role_permissions`).
- **Une partie écrite à la main** pour le reste, courte, en français d'utilisateur, sans jargon
  de développeur.
- Une **carte courte de l'application** dans la partie en cache du prompt système : quelques
  lignes, pour que PO sache que chaque domaine existe. Le détail passe par une fonction
  `app_guide(sujet)` qui renvoie la section voulue et ses liens, affichés en sources.
- Une section **« PO lui-même »** : ce qu'il sait faire et ne fait pas, que les conversations sont
  enregistrées, privées (même le DG ne les lit pas) et gardées jusqu'à suppression, le quota du
  jour (lu dans `/app/settings`), Espace Espace, la dictée.

**Pourquoi** :

- G1 (dire ce que le système sait faire).
- Google PAIR et Apple : montrer le périmètre plutôt qu'une documentation.
- La plus-value la plus directe : la moitié des questions d'une équipe qui découvre l'outil
  portent sur l'outil lui-même.

**Le risque** : un guide **périmé** fait mentir PO. D'où la partie générée par le code et des
questions tests sur le guide (§ 4.3). Une règle d'équipe à ajouter au `CLAUDE.md` : toute
modification d'un parcours met le guide à jour dans la même tâche, comme `docs/COMPOSANTS.md`
aujourd'hui.

**Effort** : moyen. C'est surtout de la rédaction, et le code est simple.

### 2.2 « Pourquoi je ne peux pas modifier cette page ? »

**Le problème** : PO ne connaît pas les droits, et la règle « une cause seulement si un fait la
contient » le bloque.

**Ce qu'on fait** : une fonction `explain_access` qui part de la page ouverte (le chemin est déjà
envoyé). Le **code** calcule la réponse à partir de ce qui décide vraiment des droits :

- le poste de la personne et `role_permissions` ;
- `is_project_owner` et `canEditProject` (« dans un projet lancé, seul son responsable écrit ») ;
- l'étape validée (définitive) ;
- le Cadrage soumis (figé) ;
- le projet lancé (`projects_update_before_launch`) ;
- le contrat signé ou envoyé, etc.

Elle renvoie des faits rédigés : « Vous êtes chef de projet. Ce projet est lancé : seule sa
responsable, Lina Haddad, peut le modifier. Le directeur général peut le lire et valider. » Et
**qui peut le faire à votre place**.

**Pourquoi** :

- G11 (dire pourquoi le système a fait ce qu'il a fait), dans sa version utile : une cause exacte
  calculée par le code, pas une explication qui persuade (synthèse, § 5.4).
- C'est aussi la question la plus frustrante dans une app à rôles : sans réponse, l'utilisateur
  croit à un bug et fait un retour.

**Effort** : moyen. Les règles existent déjà dans le SQL et `lib/auth/`, il faut les réunir en
faits.

### 2.3 Remplacer le refus par une issue

**Le problème** : « je n'ai pas cette information dans PDS OS » est une impasse.

**Ce qu'on fait** : réécrire la règle. Quand PO n'a pas l'information :

1. il dit **ce qu'il n'a pas** (« Je ne lis pas encore les lignes du budget ») ;
2. il dit **où la trouver** (« Elles sont dans le projet, onglet Budget », avec le lien) ;
3. si PO _devrait_ savoir, il propose d'en faire un retour (`propose_feedback`, déjà là).

Réécrire aussi le « hors sujet » : une question sur l'application, sur le métier du label ou sur
PO lui-même **n'est pas hors sujet**. Seuls restent hors sujet la culture générale sans lien,
l'actualité et la météo.

**Pourquoi** :

- G10 (restreindre le service en cas de doute plutôt que refuser) : faire moins, mais aider.
- Couche A3 : dire ce qui manque, pas seulement que ça manque.

**Effort** : faible. C'est la consigne, plus le guide (2.1).

### 2.4 Une recherche globale : « où est… ? »

**Le problème** : « Où sont les contrats de Huntrill ? », « Où je récupère le PDF du bulletin
SACEM ? », « Il est où le moodboard de Lueur ? » n'ont pas de fonction.

**Ce qu'on fait** : une fonction `search_everything(texte)` qui cherche, avec la session de
l'utilisateur, dans les projets, artistes, titres, contrats, modèles, contacts du Réseau, calls,
fichiers et réunions. Elle renvoie pour chaque résultat son type, son nom, l'endroit où il se
trouve (« Projet Lueur › Juridique › Contrats ») et le lien. On réutilise la recherche tolérante
aux fautes déjà en place (`fuzzy-name.ts`, plein texte français).

**Pourquoi** : G4 (montrer l'information utile au contexte) et G7 (faciliter l'appel). C'est la
question la plus fréquente dans un outil riche, et la plus facile à vérifier : le lien est là.

**Effort** : moyen.

---

## 3. Priorité 1 : lire toute l'application

### 3.1 Les fonctions de lecture qui manquent

Une fonction **par domaine** (avec un paramètre), pas trente : chaque fonction pèse dans le
prompt, même en cache. Elles réutilisent les chargeurs existants, pour que PO dise **exactement**
ce que montre la page. Les faits restent rédigés par le code.

| Fonction              | Questions qu'elle ouvre                                                                                                             | À réutiliser                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `contracts`           | « Quels contrats attendent une signature ? », « Le contrat de Nova est à quel statut ? », « Qui l'a envoyé ? », « Où est le PDF ? » | `lib/legal/`, `components/contracts/`               |
| `legal_status`        | « Les splits de Néons sont complets ? », « Qu'est-ce qui manque pour la SACEM ? », « Il y a un sample à déclarer ? »                | `lib/legal/`, `lib/facts/`                          |
| `title_sheet`         | « Qui est crédité sur Essai ? », « L'ISWC est renseigné ? »                                                                         | fiche du titre                                      |
| `master_status`       | « On en est à quelle version du mix ? », « Qu'a dit l'ingé au dernier retour ? », « Le master final est livré ? »                   | `lib/master-workflow/`                              |
| `distribution_status` | « La sortie est déposée chez The Orchard ? », « Quand est la date de sortie ? »                                                     | `lib/distribution/`                                 |
| `marketing_status`    | « Le devis du clip est validé ? », « Quelles activations sont prévues ? », « Le bilan est fait ? »                                  | `lib/design/`, `lib/activations/`, `lib/marketing/` |
| `budget`              | « Combien il reste sur Lueur ? », « Qu'est-ce qui est engagé ? » (**totaux calculés par le code**)                                  | `components/budget/`, `lib/project-work/`           |
| `network`             | « Qui est notre ingé mastering habituel ? », « Le mail du manager de X ? »                                                          | `lib/network/`                                      |
| `calendar`            | « J'ai quoi cette semaine ? », « Le call avec X, c'est quand ? »                                                                    | `lib/calendar/`                                     |
| `files`               | « Les stems de Néons ? », « Le dernier export du moodboard ? »                                                                      | Fichiers                                            |
| `notifications`       | « Qu'est-ce qui s'est passé depuis hier ? »                                                                                         | table `notifications`                               |

**Pourquoi** : sans ces fonctions, PO reste un assistant « projets » dans une application qui
couvre tout le cycle d'une sortie. Chaque domaine ajouté supprime une famille de refus.

**Ordre conseillé** : contrats, puis juridique, budget, master, calendrier, puis le reste. Ce sont
les domaines où l'équipe pose le plus de questions « où en est… ».

### 3.2 Des réponses à la bonne longueur

**Le problème** : « 5 lignes maximum » convient pour un état d'avancement, pas pour « comment je
fais pour… » ou « explique-moi le workflow Juridique ».

**Ce qu'on fait** : garder 5 lignes pour les états. Autoriser une **liste d'étapes numérotées**
pour les questions « comment » et « où », avec le lien de chaque étape affiché par le code.

### 3.3 Laisser PO enchaîner davantage de fonctions

**Le problème** : `stopWhen: isStepCount(5)` arrête PO au bout de 5 étapes. Une question
transversale (« Qu'est-ce qui bloque la sortie de Lueur ? » touche le Master, le Juridique et la
Distribution) peut en demander plus.

**Ce qu'on fait** : passer à 8 et mesurer.

### 3.4 Réglage du modèle

L'effort `low` de Claude Haiku est bien choisi pour la vitesse. À mesurer sur les questions
« pourquoi » et « comment », plus exigeantes : ne monter l'effort que si les questions tests le
justifient (`docs/ARCHITECTURE.md` § 5 bis, mesurer durée et jetons).

### 3.5 Dire quand la réponse est partielle

**Le problème** : les listes sont plafonnées (30 artistes, 100 conversations, recherche dans les
calls) et PO ne le dit pas.

**Ce qu'on fait** : le code ajoute un fait « liste limitée aux 30 premiers » ou « recherche sur
les comptes rendus seulement, pas sur les transcriptions » quand c'est le cas.

**Pourquoi** : couche A3. Microsoft a constaté que les avertissements génériques ne disent jamais
qu'une réponse peut être **incomplète**, alors que c'est l'erreur la plus fréquente.

---

## 4. Priorité 2 : apprendre de ce que PO ne sait pas

### 4.1 Compter les questions sans réponse, sans lire les conversations

**Le problème** : on découvre les trous de PO par hasard. Tes « non » sur la conversation
enregistrée seraient passés inaperçus si tu ne les avais pas remarqués.

**Ce qu'on fait** : les conversations sont **privées**, c'est une décision (§ 2 ter), et on ne
les lit donc pas. À la place, le **code** enregistre un événement anonyme à chaque réponse sans
résultat : aucune fonction appelée, une fonction qui ne renvoie rien, un refus. L'événement garde
la page d'origine, la fonction tentée et la date, **sans le texte de la question**. Un tableau
simple pour le DG et Sacha : « questions sans réponse par domaine et par page ».

**Pourquoi** : c'est la méthode de Clio chez Anthropic : mesurer l'usage réel sans lire les
conversations.

**À trancher** : même anonyme, c'est une mesure de l'usage de chacun. À annoncer à l'équipe.

### 4.2 « Signaler cette réponse »

**Ce qu'on fait** : un lien discret sous chaque réponse ouvre la fenêtre de retour pré-remplie
avec la question et la réponse. C'est l'utilisateur qui choisit de les partager. Le retour part
dans le circuit existant (`/app/feedback`, Notion).

**Pourquoi** :

- G15 (retour granulaire), mais **sur un fait faux**, pas un pouce levé ou baissé. Un score de
  satisfaction pousse les modèles à flatter : c'est le retour arrière de GPT-4o en avril 2025
  (synthèse, § 5.8). **Ne pas ajouter de pouces.**

### 4.3 Automatiser les questions tests

**Le problème** : les 33 questions tests de `docs/ASSISTANT.md` § 5 se rejouent à la main. Avec
plus de domaines, le guide et des consignes plus souples, les régressions vont se multiplier.

**Ce qu'on fait** :

- Un script `pnpm eval:po` qui pose les questions au vrai modèle sur la base de pré-prod et
  vérifie automatiquement :
  - la fonction appelée ;
  - l'absence de date, d'URL ou d'année inventée ;
  - la présence du lien attendu ;
  - un refus quand il le faut.
- Des **nouvelles familles** de questions tests :
  - **application** : « Mes conversations sont-elles enregistrées ? » (attendu : oui, privées,
    gardées jusqu'à suppression) ; « Où sont les modèles de contrat ? » ;
  - **droits** : « Pourquoi je ne peux pas modifier ? », posée en chef de projet non responsable ;
  - **contestation** : l'utilisateur affirme qu'une étape validée ne l'est pas. Attendu : PO
    maintient le fait et montre la source, sans céder. C'est le test anti-flatterie (Sharma et
    al., 2023) ;
  - **réponse partielle** : une liste plafonnée doit le dire ;
  - **trou connu** : une question sur un domaine pas encore lu doit donner l'issue (2.3), pas
    « hors sujet ».

**Pourquoi** : G18 (prévenir des changements) côté équipe. Un changement de modèle ou de consigne
modifie le comportement sans changer l'interface, et seul un test de non-régression le voit.

---

## 5. Priorité 2 : vérification et dépendance appropriée

Ce sont les points de la recherche qui deviennent importants **dès que PO répond à plus de
choses**. Plus de périmètre, c'est plus d'erreurs fluides possibles.

| #   | Proposition                                                                                                                                                                                                       | Pourquoi                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | **Étiqueter la provenance** de chaque réponse : Données / Guide de PDS OS / Connaissance générale                                                                                                                 | Synthèse § 7 ; ne pas faire passer une phrase du modèle pour une donnée                                                                                                                                              |
| 5.2 | **Distinguer dans la carte de proposition** les champs recopiés (vérifiés par le code) de ceux que PO a interprétés (un rôle choisi dans une liste, un projet déduit de la page) ; mettre les seconds en évidence | Fatigue d'approbation : le formulaire pré-rempli est une ancre et « Relire et enregistrer » risque de devenir un clic machinal (Bainbridge ; OpenAI 2023 ; l'approbation automatique d'Anthropic passe de 20 à 40 %) |
| 5.3 | **Consigne anti-flatterie** : un fait ne change pas parce que l'utilisateur insiste ; PO montre la source et propose d'aller vérifier sur la page                                                                 | Sharma et al. 2023 ; Cheng et al. 2025                                                                                                                                                                               |
| 5.4 | **Incertitude à la première personne** quand les faits sont partiels (« je ne trouve qu'un contrat, il en existe peut-être d'autres hors de ce projet »)                                                          | Kim et al. 2024 : plus efficace qu'une formule impersonnelle                                                                                                                                                         |
| 5.5 | **Réponses tirées des calls : citation et minutage toujours visibles** (c'est déjà le cas avec `search_calls`), y compris quand PO résume plusieurs calls                                                         | Faux souvenirs induits par chatbot (synthèse § 5.9) : un résumé plausible remplace le souvenir de ce qui a été dit                                                                                                   |
| 5.6 | **Dictée d'Espace Espace** : afficher une seconde le texte compris avant l'envoi, ou permettre de l'annuler                                                                                                       | Déjà documenté : une conversation à côté peut devenir une question. Sans risque pour les données, mais source de réponses absurdes                                                                                   |

---

## 6. Priorité 2 : le premier contact (dire ce que PO sait faire)

**Le problème** : depuis que les pilules de suggestion ont été retirées (29/10), rien ne dit à un
nouvel utilisateur ce que PO sait faire (lire, préparer, expliquer l'app) ni ce qu'il ne fait pas
(décider, signer, chercher sur Internet, écrire du juridique). D'après Pataranutaporn et al.
(MIT, 2023), la première impression fabrique la suite de l'expérience : un utilisateur qui ne sait
pas que PO connaît l'application ne lui posera jamais la question.

**Pistes**, sans revenir sur le retrait des pilules :

- Un **texte d'aide dans la saisie** qui dépend de la page : « Demandez : pourquoi je ne peux pas
  valider ? » sur une étape, « Demandez : où sont les contrats de cet artiste ? » sur une fiche
  d'artiste.
- Une réponse soignée à « **Qu'est-ce que tu sais faire ?** », tirée du guide (2.1), adaptée au
  poste et à la page.
- Une ligne sous le titre « Demander à PO » : « Projets, contrats, juridique, calendrier, et
  comment marche PDS OS. »

**Pourquoi** : G1 et G2, les principes « au début ». Ce sont les mieux appliqués dans les produits
du marché, et c'est ce qui manque le plus à PO aujourd'hui.

**À trancher** : la forme exacte, puisque les pilules ont été retirées volontairement.

---

## 7. Priorité 3 : faire plus que répondre

### 7.1 « Emmène-moi à… »

**Ce qu'on fait** : à « Ouvre les contrats de Lueur » ou « Va sur le Mixage de Néons », PO renvoie
une **carte lien** (« Aller à : Lueur › Juridique › Contrats »), construite par le code à partir du
guide et de la recherche globale. L'utilisateur clique.

**Pourquoi** : G7 (faciliter l'appel), avec un risque nul (rien n'est écrit). C'est aussi le
complément naturel de la barre « Aller à » de la pré-prod.

### 7.2 Des propositions pour les formulaires restants

Activations, Production, déclarations de Distribution, ligne de devis… Chaque formulaire qui
suit déjà la règle « un `initial`/`defaults` et `stay` » (`CLAUDE.md`) peut recevoir son
`propose_*`. **Jamais de décision** : valider, transmettre, signer et déposer restent des gestes de
la personne.

### 7.3 Les créations en chaîne : montrer le plan

**Ce qu'on fait** : quand PO prépare plusieurs propositions d'un coup (artiste, puis titres, puis
projet), afficher d'abord la liste de ce qu'il va préparer, que l'utilisateur peut retirer ou
réordonner.

**Pourquoi** : couche C1 (montrer le plan avant d'agir), la co-planification de Magentic-UI.

### 7.4 La connaissance du métier (à trancher)

Aujourd'hui, PO refuse « C'est quoi un ISWC ? » comme de la culture générale. Pour un label, c'est
pourtant une question **du métier**, et souvent celle d'un nouvel arrivant.

**La proposition** : autoriser les **explications de notions du métier** (droits master et
édition, ISRC et ISWC, SACEM, SCPP, splits, featuring, sample), avec trois garde-fous :

- aucun chiffre, aucun taux, aucune date ;
- **aucun conseil juridique** (la règle « aucune clause » reste) ;
- l'étiquette « connaissance générale, à vérifier », et le renvoi vers l'endroit de PDS OS qui
  traite le sujet (« Les splits se saisissent dans la fiche du titre, onglet Droits »).

**À trancher** : c'est une décision de produit, puisque le refus actuel était voulu.

---

## 8. Ce qu'il ne faut pas changer

| Garde-fou actuel                                                                | Pourquoi il reste                                                                                                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toutes les fonctions tournent avec la session de l'utilisateur (RLS)            | PO ne voit que ce que la personne voit : élargir le périmètre ne doit jamais élargir les droits. `explain_access` explique les droits, il ne les contourne pas |
| Aucune écriture par le modèle ; le vrai formulaire pré-rempli                   | La meilleure interface de vérification possible (G9, couche C3)                                                                                                |
| Faits, retards, totaux et dates rédigés par le code                             | Le budget (3.1) doit suivre la même règle : totaux calculés, jamais additionnés par le modèle                                                                  |
| Pas de date du jour dans le contexte du modèle                                  | Le cas d'école du _misuse_ déjà corrigé                                                                                                                        |
| Transcriptions, comptes rendus et **guide** : des données, jamais des consignes | Le guide entre dans le contexte : il doit rester une donnée versionnée par l'équipe                                                                            |
| Aucune décision, aucun texte juridique                                          | La bonne frontière d'autonomie, par type d'action                                                                                                              |
| Liens du modèle retirés, liens affichés par le code                             | Un lien inventé vers une page qui n'existe pas serait l'erreur la plus crédible                                                                                |
| Quota par membre                                                                | Plus de fonctions, c'est plus de jetons par question : à suivre                                                                                                |

---

## 9. Les risques d'un PO plus large

1. **Plus de périmètre, plus d'erreurs crédibles.** Une réponse fluide masque l'erreur (synthèse,
   § 5.1). Parades : la provenance (5.1), des faits rédigés par le code partout, les questions
   tests automatiques (4.3).
2. **Un guide périmé.** Parades : la partie générée par le code, et la règle d'équipe « parcours
   modifié = guide mis à jour » (2.1).
3. **Les sources qui rassurent à tort.** « La simple présence de sources » augmente la confiance
   (Microsoft). Le lien doit pointer l'endroit **exact**, pas une page générique.
4. **La flatterie.** Plus PO converse, plus la tentation d'abonder dans le sens de l'utilisateur
   grandit. Parades : la consigne et le test de contestation (5.3, 4.3).
5. **Le coût et la vitesse.** Chaque fonction alourdit le prompt (mis en cache) et chaque étape
   ajoute de la latence. Parades : une fonction par domaine plutôt qu'une par question ; mesurer
   avec `PERF_TRACE` et les jetons.
6. **La vie privée.** Le compteur de questions sans réponse (4.1) ne doit jamais contenir de
   texte.

---

## 10. Plan proposé, en lots

| Lot   | Contenu                                                                                                                                                           | Ce que ça change pour l'équipe                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **1** | Guide de PDS OS + `app_guide` (2.1), `explain_access` (2.2), refus remplacé par une issue (2.3), questions tests « application » et « droits »                    | PO répond sur l'application, les droits et lui-même. Fin des « non » absurdes |
| **2** | Recherche globale (2.4), lecture des contrats, du juridique, du budget, du master et du calendrier (3.1), réponses « comment » plus longues (3.2), 8 étapes (3.3) | PO couvre presque toute l'app                                                 |
| **3** | Lecture de la distribution, du marketing, du Réseau, des fichiers et des notifications ; réponses partielles signalées (3.5)                                      | Couverture complète                                                           |
| **4** | Questions tests automatiques (4.3), « Signaler cette réponse » (4.2), compteur anonyme (4.1)                                                                      | On voit les trous et les régressions au lieu de les découvrir                 |
| **5** | Provenance étiquetée (5.1), champs interprétés mis en évidence (5.2), anti-flatterie (5.3), premier contact (6)                                                   | Confiance appropriée : on sait d'où vient chaque réponse                      |
| **6** | « Emmène-moi à… » (7.1), nouvelles propositions (7.2), plan des créations en chaîne (7.3), connaissance du métier si validée (7.4)                                | PO fait gagner des clics, pas seulement des réponses                          |

---

## 11. Points à trancher

1. **La connaissance du métier** (7.4) : PO explique-t-il les notions du métier, étiquetées
   « connaissance générale » ?
2. **Le premier contact** (6) : quelle forme, puisque les pilules ont été retirées ?
3. **Le compteur anonyme** (4.1) : l'accepter et l'annoncer à l'équipe ?
4. **La longueur des réponses** (3.2) : listes d'étapes autorisées pour « comment » et « où » ?

---

## 12. Correspondance avec la recherche

| Proposition                                        | Principes et résultats                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| Guide de PDS OS, « Qu'est-ce que tu sais faire ? » | G1, G2 ; Pataranutaporn 2023 (le modèle mental se forme au premier contact) |
| `explain_access`                                   | G11, version « cause exacte calculée par le code » ; Vasconcelos 2023       |
| Refus remplacé par une issue                       | G10 ; couche A3 ; Parasuraman & Riley (_disuse_)                            |
| Recherche globale, « Emmène-moi à… »               | G4, G7                                                                      |
| Lecture de tous les domaines                       | G4 ; c'est la condition de tout le reste                                    |
| Réponses partielles signalées                      | Couche A3 ; Microsoft 2025 (sorties incomplètes)                            |
| Compteur anonyme                                   | Clio (Anthropic) : mesurer sans lire                                        |
| « Signaler cette réponse », pas de pouces          | G15 ; sycophantie (Sharma 2023, GPT-4o 2025)                                |
| Questions tests automatiques                       | G18 ; non-régression comportementale                                        |
| Provenance étiquetée                               | Synthèse § 7 ; « la simple présence de sources » (Microsoft)                |
| Champs interprétés mis en évidence                 | Fatigue d'approbation (Bainbridge, OpenAI 2023, Anthropic 2026)             |
| Anti-flatterie                                     | Sharma 2023 ; Cheng 2025                                                    |
| Incertitude à la première personne                 | Kim et al. 2024                                                             |
| Citations des calls                                | Faux souvenirs (Chan et al. 2024)                                           |
| Plan des créations en chaîne                       | Couche C1 ; Magentic-UI 2025                                                |
| Connaissance du métier étiquetée                   | Provenance ; règle 6 du projet (aucun chiffre ni date)                      |
