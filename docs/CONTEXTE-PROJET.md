# PDS OS — Contexte projet

Fichier de mémoire longue. À lire une fois par session si la tâche touche au métier,
aux intégrations externes ou au rôle de l'IA. Pas besoin de le relire pour une tâche
purement technique.

Dernière mise à jour : 25 septembre 2026.

---

## 1. Le client et la situation

Le commanditaire est un créateur de contenu et producteur de musique qui dirige une
structure de label. Il veut ce qu'il appelle un « OS » pour son activité : une
plateforme où tous les process, échanges et projets sont cartographiés. Pas un Notion,
mais un outil qui collecte la donnée, l'analyse et renvoie des retours.

Il n'est pas développeur. Il est accompagné d'un YouTubeur développeur et d'un ancien
CTO, qui relisent les choix techniques. **Les décisions d'architecture seront
challengées** : les documenter vaut mieux que les subir.

Contraintes de calendrier et d'usage :

- V1 fonctionnelle visée pour début octobre 2026
- Séminaire de conception et développement les 26 et 27 septembre 2026
- Usage strictement interne, 3 à 5 utilisateurs
- Aucune communication publique avant fin 2027 / début 2028
- Un NDA est attendu, la confidentialité est un sujet sensible pour lui

Un prototype existe déjà, construit sans code, en web. Il est abouti sur les étapes
faciles et vide sur les étapes difficiles (voir § 4).

---

## 2. Le produit

L'application suit le cycle de vie complet d'une sortie musicale. L'assistant intégré
s'appelle **PO**. Le produit s'appelle **PDS OS**.

### Les sept étapes

| #   | Étape                    | Ce qu'elle produit                                                                                                                        |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cadrage                  | Le **Brief** : objectif, temporalité, besoins, cadre, équipe                                                                              |
| 2   | Stratégie de lancement   | La **Stratégie** : positionnement, publics, narratif, dispositif, livrables engagés, calendrier. Export éditorial : le **Plan de sortie** |
| 3   | Conception               | Le **Dossier de conception** : direction créative, cover, capsules, clip                                                                  |
| 4   | Production & préparation | Organisation et fabrication : lieux, équipe, planning, exécution                                                                          |
| 5   | Livraison & lancement    | Mise en ligne via le distributeur, smartlink, activation                                                                                  |
| 6   | Défense                  | **Périmètre à clarifier avec le client** — voir § 10                                                                                      |
| 7   | Bilan & clôture          | Streams, vues, performance, stats de sortie                                                                                               |

Modules transversaux présents dans la navigation du prototype : Accueil, Projets,
Talents, Musique, Budgets, Calls, Idées, Équipe, Paramètres. Onglets au sein d'un
projet : Vue d'ensemble, Travail, Budget, Calls, Fichiers, Historique.

### Vocabulaire fixé

Trois objets, trois noms. Ne jamais en introduire d'autres dans l'interface.

- **Brief** — livrable du Cadrage
- **Stratégie** — livrable de la Stratégie de lancement ; le **Plan de sortie** en est
  la traduction éditoriale exportable
- **Dossier** — livrable de la Conception

**Termes bannis**, présents dans le prototype et source de confusion : _pancarte_,
_consolidation_, _récapitulatif_ utilisé comme nom d'objet, _mise en marché_,
_document de stratégie_ en doublon de _Stratégie_.

---

## 3. Ce que le prototype fait bien, et qu'il faut conserver

Quatre idées à ne pas perdre dans la refonte.

**La traçabilité de chaque information.** Chaque champ porte sa source : qui l'a posée,
dans quel call, à quelle date, avec un lien pour ouvrir cette source. Un écran dédié
liste l'origine de chaque ligne du Brief. C'est ce qui différencie l'outil d'un Notion.
Conséquence sur le modèle de données : **toute valeur métier porte une provenance**.

**La distinction identifié / engagé.** « Identifier un besoin n'engage rien : aucune
mission, dépense ou activation n'est créée ici. » À conserver mot pour mot. Deux états
distincts en base.

**La distinction tâche / point ouvert.** Une décision non prise n'est pas une tâche :
pas de responsable, pas d'échéance. Deux entités séparées.

**La vue externe.** Les documents partagés par lien montrent une fiche propre, jamais
l'interface. Transcription, notes et préparation n'y figurent jamais. Le refus
d'enregistrement d'un call est un état à part entière, avec ses conséquences expliquées
à l'utilisateur.

---

## 4. Ce qui ne va pas dans le prototype, et les décisions prises

### Diagnostic

- **Le tunnel est démesuré.** Remplir un seul champ demande jusqu'à six écrans
  (question → « m'aider » ou « écrire » → choix de direction → question complémentaire
  → proposition → validation). Multiplié par les blocs et les étapes, on dépasse
  quatre-vingts écrans pour une seule sortie.
- **Le même tunnel se répète à l'identique** pour objectif, positionnement, narratif et
  direction créative, sans aucun raccourci pour un utilisateur expérimenté.
- **Trois systèmes de navigation coexistent** : sidebar à 9 entrées, 6 onglets projet,
  barre à 7 étapes. Quatre dimensions de position simultanées.
- **L'état est raconté en paragraphes** au lieu d'être montré.
- **PO parle trop** : le texte compense un défaut de structure.
- **Le prototype est vide là où c'est dur.** Production, Livraison, Défense et Bilan ne
  sont pas prototypées. Ce sont exactement les quatre étapes qui demandent des
  intégrations externes.

### Décisions produit qui en découlent

1. **L'IA pré-remplit, elle n'interroge pas.** À la fin d'un call, le cadrage est déjà
   rempli, chaque champ marqué « proposé · à confirmer ». L'utilisateur relit une page
   et corrige. Le tunnel guidé devient un recours, pas le chemin par défaut.
2. **Une page par étape, édition en ligne.** Le récapitulatif devient l'écran principal,
   pas la récompense de fin de parcours.
3. **Desktop-first, responsive, installable en PWA.** Le travail de composition se fait
   au bureau ; le mobile sert à consulter, valider, être notifié et capter de l'audio.
   Pas d'application native, pas de store.
4. **Pas de compte pour les intervenants externes.** Un prestataire dépose un fichier
   et lit un retour via un **lien à jeton**, sans jamais créer de compte.

---

## 5. Contraintes des API externes — l'état vérifié du terrain

Section critique. Ces verdicts ont été vérifiés en septembre 2026 et conditionnent le
périmètre.

### Fermé

**Spotify.** Depuis février 2026, le mode développeur est neutralisé : quinze endpoints
supprimés, accès élargi conditionné à une entreprise enregistrée et 250 000
utilisateurs actifs mensuels, cinq utilisateurs de test maximum. **Il n'existe aucune
API Spotify for Artists.** Le seul export est manuel, en CSV depuis le dashboard.

**Distributeurs grand public.** DistroKid n'a pas d'API publique, TuneCore n'expose
qu'une API partenaire, CD Baby n'en a pas. Seules les infrastructures côté label
(LabelGrid, Revelator) sont ouvertes, à partir de 249 $/mois.
→ **L'étape Livraison suit un statut, elle ne pilote pas le distributeur.**

**Facturation.** Depuis le 1er septembre 2026, la facture électronique passe
obligatoirement par une plateforme agréée par l'État. Coder un module de facturation
maison n'a aucun sens. Hors périmètre.

### Contraint

**TikTok.** L'API Direct Post force toute publication en visibilité privée tant que le
client n'a pas passé un audit de conformité. Avant audit : cinq utilisateurs maximum
sur 24 heures, comptes privés obligatoires. Aucune planification native, l'API publie
immédiatement ou crée un brouillon. Revue manuelle de plusieurs jours à plusieurs
semaines.

**Instagram.** Publication impossible sur un compte personnel, sans contournement.
Comptes Business obligatoires pour les Reels, les comptes Creator ne sont pas
supportés. Pas d'équivalent à `scheduled_publish_time`. JPEG uniquement. Reels
éligibles seulement entre 5 et 90 secondes en 9:16. Plafond quotidien : les sources
divergent entre 25 et 100 posts par 24 h, à vérifier avant toute promesse.

→ **Décision V1 : pas de publication automatique.** Calendrier éditorial avec états,
assignation, rappels et export du média prêt à poster.

### Ouvert et exploitable

**YouTube Analytics.** Gratuit, officiel, OAuth standard. Scopes
`yt-analytics.readonly` pour les métriques d'activité et
`yt-analytics-monetary.readonly` pour les revenus estimés.
→ **C'est la source de bilan à brancher en premier.**

**Deezer.** Dernier grand catalogue avec une API publique **sans authentification**.
Plus de 90 millions de titres, expose **ISRC** et **UPC** comme clés de jointure
inter-plateformes. Limite : 50 requêtes par 5 secondes.

**Odesli / Songlink.** Résolution d'un lien vers toutes les plateformes. Aucune
authentification nécessaire, 10 requêtes par minute sans clé. Odesli ne distribue plus
de clés API ; l'accès durable passe par un formulaire de mise en liste blanche.

**iTunes Lookup.** Complète Deezer pour Apple Music.

### Payant, mais moins cher qu'on ne croit

Les agrégateurs de stats musicales incluent désormais un accès MCP et une clé API dans
l'abonnement au dashboard.

| Service                 | Prix         | Ce qui est inclus                       |
| ----------------------- | ------------ | --------------------------------------- |
| Songstats Artist        | 9,99 €/mois  | 1 profil, MCP inclus, Member API Key    |
| Songstats Professional  | 83,33 €/mois | tous artistes et labels, MCP inclus     |
| Soundcharts PRO         | 129 $/mois   | illimité, MCP inclus, 330 requêtes/jour |
| Soundcharts API Starter | 50 $/mois    | 10 000 requêtes                         |

→ Le bilan multi-plateformes ne coûte plus 250 à 350 $/mois comme prévu initialement.

---

## 6. Les contournements retenus

### Détection automatique de mise en ligne (le point fort de la V1)

L'ISRC est saisi au Cadrage. Un job quotidien :

1. interroge l'API publique Deezer par ISRC, sans authentification ;
2. complète par le lookup iTunes pour Apple Music ;
3. passe le premier lien trouvé à Odesli, qui renvoie tous les liens plateformes.

L'app détecte seule que la sortie est en ligne, sur combien de plateformes, et génère
le smartlink de campagne. Coût : zéro. Le prototype prévoit déjà cette fonctionnalité
sans savoir comment la réaliser, sous le libellé « Lien d'écoute multi-plateforme
personnalisé ».

### Les six niveaux de faisabilité

Grille à appliquer à toute fonctionnalité. Une fonctionnalité n'est jamais impossible :
elle est impossible **au niveau 1**. On descend jusqu'au premier niveau qui tient, et on
assume la dégradation dans l'interface.

1. API officielle du service
2. API tierce agrégatrice
3. MCP ou clé membre d'un SaaS déjà payé
4. Import de fichier (CSV, PDF, XLSX) parsé par IA
5. Saisie manuelle assistée : formulaire pré-rempli, rappel, provenance affichée
6. Automatisation de liaison (jobs planifiés, webhooks, email entrant)

### Le scraping est exclu

Scraper en étant authentifié revient à violer les CGU acceptées, et contourner une
protection technique peut relever de l'accès frauduleux à un système. Les données utiles
(Spotify for Artists) sont derrière un login. L'export CSV officiel existe : on parse le
CSV.

---

## 7. Le rôle de l'IA — la frontière à tenir

### Ce qui ressemble à de l'IA mais n'en est pas

À implémenter en code déterministe, parce que ça doit être fiable à 100 %.

| Comportement                                             | Implémentation réelle                    |
| -------------------------------------------------------- | ---------------------------------------- |
| « La stratégie a évolué → actualiser le plan de sortie » | Graphe de dépendances + diff de versions |
| Rétroplanning, temps forts autour de la date de sortie   | Règles métier et arithmétique de dates   |
| Héritage entre étapes, verrouillage des champs amont     | Contraintes en base + machine à états    |
| Compteurs « 3 éléments posés », « 2 points ouverts »     | Requêtes SQL                             |
| Versionnement, historique, provenance                    | Tables et clés étrangères                |

**Règle :** l'IA produit du langage et des hypothèses ; le code produit des faits et des
états.

### Les six usages légitimes

1. **Extraction structurée** : call transcrit → compte rendu (décidé / à trancher /
   prochaines actions, chacun au format « quoi — qui · pourquoi »). Sorties structurées
   par JSON Schema. L'usage le plus rentable.
2. **Classification dans une taxonomie fermée** : ranger un besoin dans l'une des
   familles Création & contenus / Promotion & diffusion / Expériences & activations /
   Autre. Enum contraint, pas de génération libre.
3. **Pré-cochage depuis le call** : proposer les besoins et leviers entendus, à
   confirmer. Le geste qui fait gagner le plus de temps.
4. **Proposition rédigée** : objectif, positionnement, narratif, directions créatives.
   **Nécessite du few-shot** avec deux ou trois briefs validés réels du client, sinon la
   production sera générique et rejetée. Pas de RAG vectoriel.
5. **Préparation de call** : ordre du jour construit à partir de l'état du projet et des
   points ouverts.
6. **Assistant conversationnel transversal** : function calling sur des fonctions typées
   au-dessus de Postgres. Pas de RAG.

### Ce que l'IA ne fait pas en V1

- Pas de génération d'image. Le moodboard et le visuel principal viennent d'uploads et
  d'une bibliothèque de références. Une DA générée sur un artiste réel sera générique et
  ouvre une question de droits.
- Pas de transcription en streaming temps réel. Batch après le call. L'écran de call en
  direct conserve chrono, présents et ordre du jour.
- Pas d'évaluation automatique de la conformité créative d'un livrable.

### Coût

Trois calls d'une heure transcrits plus une vingtaine d'appels structurés :
**moins de 3 € par sortie**. Le prompt système lourd (template de fiche, règles métier)
bénéficie de la mise en cache, remise de 90 % sur l'entrée chez les trois grands
fournisseurs.

---

## 8. Sécurité, confidentialité, conformité

Trois points identifiés comme insuffisamment traités lors du premier appel, et donc à
soigner explicitement.

**Le RLS est la sécurité.** L'assistant conversationnel s'exécute avec le jeton de la
personne connectée. Jamais de `service_role` sur un chemin déclenché par un
utilisateur. Sinon une question innocente fait ressortir le budget d'un projet
inaccessible.

**Les transcriptions sont du contenu non fiable.** N'importe quel participant à un call
peut prononcer une phrase qui ressemble à une instruction. Le texte transcrit est une
donnée, jamais une consigne. Il ne doit jamais être concaténé dans un prompt système.
Même traitement pour tout fichier importé.

**Consentement à l'enregistrement.** Décidé le 26/09/2026 : il est **donné par contrat**
(note de contrat signée par les participants). Rien ne le demande à l'écran ; tout call est
« accordé » dès sa création. La colonne et la règle « pas d'audio sans accord » restent en
base.

**Paliers gratuits et entraînement.** Sur les paliers gratuits des fournisseurs de
modèles, les requêtes peuvent servir à améliorer les modèles. **Aucune donnée réelle du
client ne transite par un palier gratuit.** Pendant le séminaire, on utilise un faux
call enregistré pour l'occasion, sur un artiste inventé.

**AI Act.** Depuis août 2026, les obligations de transparence s'appliquent : l'utilisateur
doit être informé qu'il interagit avec un système d'IA, et les contenus générés doivent
être identifiables. Pour un outil interne, une mention dans l'interface suffit. Les
champs proposés par PO sont déjà marqués « proposé · à confirmer », ce qui remplit cette
obligation naturellement.

---

## 9. Périmètre

### Dans la V1

- Modèle de données complet sur les sept étapes
- Authentification, rôles, RLS
- Étape Cadrage de bout en bout, avec la chaîne audio → transcription → Brief structuré
- Étape Stratégie en CRUD avec machine à états
- Détection de mise en ligne par ISRC et génération du smartlink
- Une intégration de stats réelle branchée en démonstration (YouTube Analytics)
- Documents partageables par lien à jeton, sans compte

### Hors V1, assumé et documenté

- Publication automatique sur les réseaux sociaux
- Facturation et comptabilité
- Comptes pour les intervenants externes
- Bot qui rejoint automatiquement les visioconférences
- Transcription en temps réel
- Génération d'images
- Application native et présence sur les stores
- Le module « Airbnb des studios », qui est un second produit

---

## 10. Questions ouvertes à trancher avec le client

Par ordre d'importance. Les trois premières bloquent le modèle de données.

1. **Que recouvre l'étape « Défense » ?** Deux lectures plausibles : défense du projet en
   interne (documents et validation) ou suivi presse, radio et playlists après sortie
   (agrégateur de stats). Rien ne permet de trancher depuis le prototype.
2. ~~**Qui valide quoi ?**~~ Tranché le 26/09/2026 : voir § 12. Le DG valide tout ce
   qui est soumis à validation, Stratégie de lancement comprise.
3. **Sept étapes ou cinq ?** « Production & préparation » et « Livraison & lancement » se
   recouvrent largement. Sept jalons multiplient mécaniquement les écrans.
4. **Budget mensuel accepté pour les données** : 0 € (YouTube + CSV), 83 €/mois
   (Songstats) ou 129 $/mois (Soundcharts PRO).
5. **Une seule chose qui doit absolument fonctionner le lundi matin.** S'il ne peut pas
   répondre, le périmètre n'est pas mûr.

### Ce que le client doit fournir

- Accès OAuth à sa chaîne YouTube, ou un compte de test
- Exports CSV Spotify for Artists sur au moins deux sorties passées
- **Deux ou trois vrais dossiers de sortie complets** — indispensable pour le few-shot
  des propositions de PO
- Le nom de son distributeur et le type d'accès dont il dispose
- Ses références visuelles et codes de marque

---

## 11. Entités métier pressenties

Brouillon, à valider avant d'écrire les migrations. Ne pas implémenter tel quel sans
confirmation.

```
organization
user · role
artist (talent)
project                    une sortie · type single, EP, album
  stage                    instance d'étape, avec son état
release                    isrc, upc, date, statut, liens plateformes
brief / strategy / design_doc   livrables versionnés
field_value                valeur métier + provenance (source_type, source_id, author, at)
need                       besoin · famille · état identifié|engagé
lever                      levier de dispositif · retenu|non retenu|à arbitrer
deliverable                livrable engagé · versions · validations
milestone                  temps fort du calendrier
call                       préparation, participants, ordre du jour, consentement
transcript · summary       transcription et compte rendu structuré
task                       a un responsable et une échéance
open_point                 décision non prise · pas de responsable, pas d'échéance
validation                 demande, validateur, état, horodatage, version
share_link                 jeton, portée, expiration
file                       stockage, provenance, visibilité
stat_snapshot              relevé daté par plateforme
```

Deux invariants structurants :

- **toute valeur métier porte sa provenance** ;
- **une tâche et un point ouvert sont deux entités distinctes.**

---

## 12. Postes, permissions et autorité (V1)

Fiche fournie par le client le 26/09/2026, complétée par ses réponses du même jour.

**Règle de fond : Poste ≠ Permission ≠ Autorité**, même si la V1 simplifie volontairement
le rôle du DG. Dans le code, un poste ne donne jamais un droit directement : une seule
table de correspondance traduit le poste en permissions (`role_permissions` en base).

### Les 3 postes

| Poste | Nature | Rôle |
| --- | --- | --- |
| **Directeur général** (DG) | Gestionnaire, admin V1 | Cumule Label Manager et responsable stratégie financière. Voit et administre l'ensemble. **Valide tout ce qui est soumis à validation**, dont le scénario (= la **Stratégie de lancement**). |
| **Chef de projet** (CP) | Responsable opérationnel | Reçoit un projet, l'**accepte, le refuse ou demande une précision**. Pilote les projets qu'il a acceptés. **Ne voit que les projets qui lui sont attribués.** |
| **Directeur créatif** (DC) | Membre interne affecté | Travaille sur les projets et livrables créatifs qui lui sont affectés. Dépose et propose des versions. Sans administration ni validation globale. |

### Matrice des accès

| Accès V1 | DG | Chef de projet | Dir. créatif |
| --- | --- | --- | --- |
| Administration et vue globale | Oui | Non | Non |
| Réception et pilotage des projets | Vue / attribue | Oui | Selon affectation |
| Travail créatif et dépôt de versions | Vue | Selon besoin | Oui |
| Validation globale du scénario | Oui | Non | Non |

### Circuit d'attribution

1. Le DG attribue le projet à un chef de projet **dès la création** (avec, facultatif, les
   directeurs créatifs). Tranché le 26/09/2026.
2. Le chef de projet accepte, refuse, ou demande une précision.
3. Refus ou demande de précision : le projet **revient chez le DG avec un message** (le
   motif, ou l'information qui manque).

Décidé le 26/09/2026 : quatre types de projet (sortie musicale avec au moins un master,
contenu, partenariat, événement). Une fois le projet lancé, le premier geste est un
**call** (planifié ou enregistré) : **pas de cadrage sans compte rendu de call**.

### Encore ouvert

- ~~Qui affecte le directeur créatif à un projet ; un projet peut-il avoir plusieurs DC ?~~
  Tranché le 26/09/2026 : le DG (tous les projets) et le chef de projet responsable (ses
  projets) ; plusieurs DC par projet. Un DC ne voit que les projets de son équipe créative.
- Un compte s'inscrit **sans poste** ; c'est le DG qui le fixe en l'approuvant.

