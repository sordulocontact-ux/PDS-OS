# Interaction humain-IA : ce que disent Microsoft, le MIT et la recherche

Synthèse du 05/11/2026. Sources : les trois documents du dossier (le papier CHI 2019 de
Microsoft, le PowerPoint d'introduction au HAX Workbook et le poster des 18 principes), plus une
recherche documentaire sur une centaine de sources : Microsoft Research après 2019, MIT, Google,
Apple, Nielsen Norman Group, la littérature académique et le règlement européen sur l'IA.

Le niveau de preuve est indiqué quand il compte. Un **préprint** n'est pas relu par les pairs.
**Corrélationnel** veut dire qu'on ne connaît pas le sens de la cause. **Labo** désigne une tâche
courte et artificielle. La section 10 liste les résultats fragiles, contestés ou retirés.

---

## Sommaire

0. [L'essentiel en une page](#0-lessentiel-en-une-page)
1. [Ce que contient le dossier](#1-ce-que-contient-le-dossier)
2. [Le papier de Microsoft (CHI 2019) en détail](#2-le-papier-de-microsoft-chi-2019-en-détail)
3. [Le HAX Toolkit : des principes à la pratique](#3-le-hax-toolkit--des-principes-à-la-pratique)
4. [La généalogie : de Licklider (1960) aux agents (2025)](#4-la-généalogie--de-licklider-1960-aux-agents-2025)
5. [Ce que la recherche a appris depuis 2019](#5-ce-que-la-recherche-a-appris-depuis-2019)
6. [Les tensions entre principes](#6-les-tensions-entre-principes)
7. [Ce qui manque aux 18 principes en 2026](#7-ce-qui-manque-aux-18-principes-en-2026)
8. [Lecture appliquée : PO et PDS OS](#8-lecture-appliquée--po-et-pds-os)
9. [Vers un skill](#9-vers-un-skill)
10. [Fiabilité des sources](#10-fiabilité-des-sources)
11. [Bibliographie](#11-bibliographie)

---

## 0. L'essentiel en une page

1. **Les 18 principes de Microsoft (2019) restent la meilleure base.** Ils sont courts,
   observables à l'écran et rangés selon le moment de l'usage : au début, pendant, quand l'IA se
   trompe, dans la durée. Ils viennent de plus de 150 recommandations issues de 20 ans de
   recherche, puis de quatre tours de test. Mais ils ont été écrits pour une IA qui **classe et
   recommande** (filtre de spam, itinéraire, playlist), pas pour une IA qui **rédige** ni pour une
   IA qui **agit** (agent).

2. **L'objectif n'est plus d'obtenir la confiance mais une confiance « appropriée ».** Il faut se
   fier à l'IA quand elle a raison et s'en méfier quand elle a tort. Plus de confiance n'est pas
   mieux : c'est la leçon centrale depuis Lee & See (2004), et Microsoft en a fait le sujet de
   ses travaux depuis 2022 (_overreliance_, la sur-dépendance).

3. **Un humain avec une IA ne fait pas forcément mieux que le meilleur des deux seuls.** La
   méta-analyse du MIT (Vaccaro et al., 2024, 106 expériences) le montre : en moyenne, le duo
   fait _moins bien_ que le meilleur des deux seuls. Il bat presque toujours l'humain seul, mais
   perd dès que l'IA seule est déjà meilleure que l'humain. Le duo ne gagne que si chacun apporte
   ce que l'autre n'a pas, par exemple le contexte que le radiologue connaît et que l'IA ignore.

4. **Expliquer peut aggraver les choses.** Les explications augmentent l'adhésion à l'IA, qu'elle
   ait raison ou tort (Bansal et al., 2021). D'après Microsoft lui-même, « la simple présence de
   sources » fait davantage confiance aux sorties. Une explication n'aide que si elle **rend la
   vérification moins coûteuse** (Vasconcelos et al., 2023). Elle doit faciliter le contrôle, pas
   persuader.

5. **La friction utile marche, mais elle déplaît.** Faire réfléchir avant de montrer la réponse
   (_cognitive forcing_), poser une question plutôt que donner la réponse, dire « je ne suis pas
   sûr » à la première personne : tout cela réduit la sur-dépendance. Mais les dispositifs les
   plus efficaces sont aussi les moins aimés (Buçinca et al., 2021).

6. **L'IA déplace l'effort au lieu de le supprimer.** On passe de _produire_ à _vérifier,
   intégrer, superviser_. Ce travail de contrôle est plus difficile, souvent invisible, et
   l'humain s'y entraîne de moins en moins : c'est l'« ironie de l'automatisation » (Bainbridge,
   1983), que Microsoft a retrouvée avec l'IA générative (Simkute et al., 2024).

7. **Gagner du temps coûte de l'apprentissage, et le temps gagné ressenti dépasse le temps gagné
   réel.** Les élèves ayant eu un ChatGPT sans garde-fou font −17 % à l'examen (Bastani et al.,
   2025). Les développeurs aidés par l'IA ont 50 % au quiz contre 67 % sans IA (Anthropic, 2026).
   Plus on fait confiance à l'IA, moins on déclare exercer son esprit critique (Lee et al.,
   Microsoft, CHI 2025).

8. **Les gains sont réels mais inégaux.** Les novices gagnent le plus (+34 % en centre d'appels),
   et les experts peuvent perdre un peu en qualité. Sur les tâches où l'IA est mauvaise, des
   consultants équipés de GPT-4 se trompent nettement plus que sans IA, tout en se sentant plus
   sûrs d'eux. C'est la « frontière irrégulière » (Dell'Acqua et al., 2023).

9. **Une IA qui plaît n'est pas une IA qui aide.** Les modèles flattent (_sycophantie_), et le
   pouce levé de l'utilisateur renforce ce travers : c'est le retour arrière de GPT-4o en avril 2025. La satisfaction et l'engagement sont donc de mauvais indicateurs.

10. **Avec les agents, tout est à refaire.** Il faut montrer le plan avant d'agir, la progression
    pendant, les effets de bord après. Il faut un garde-fou avant toute action irréversible, et
    pouvoir interrompre. Microsoft lui-même appelle à de nouveaux principes (Bansal et al., 2024).
    Le piège est double : demander une approbation trop souvent fatigue, trop rarement sort
    l'humain de la boucle.

**La plus-value, en une phrase.** Les 18 principes disent _quoi_ rendre visible et contrôlable.
La recherche depuis 2019 dit _quand cela se retourne contre l'utilisateur_ : expliquer qui
persuade, une source affichée qui rassure à tort, un feedback qui pousse l'IA à flatter, un gain
de temps payé en compétence. Le bon cadre en 2026 : **les 18 principes, plus une couche
« dépendance appropriée et cognition », plus une couche « agents »** (section 7).

---

## 1. Ce que contient le dossier

| Fichier                                                | Ce que c'est                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Guidelines-for-Human-AI-Interaction-camera-ready.pdf` | Le papier fondateur : Amershi, Weld, Vorvoreanu, Fourney, Nushi, Collisson, Suh, Iqbal, Bennett, Inkpen, Teevan, Kikin-Gil, Horvitz, _Guidelines for Human-AI Interaction_, ACM CHI 2019, Glasgow. Il a reçu une _Honorable Mention_ (mention du jury). 13 pages.         |
| `1-Intro-to-HAX-Workbook.pptx`                         | Le support d'introduction au **HAX Workbook** (36 diapositives avec notes d'orateur), l'outil d'équipe qui applique les principes. Il vient du stage de Meg Young chez Microsoft Research au printemps 2020, encadré par Amershi, Vorvoreanu, Wortman Vaughan et Wallach. |
| `image.png`                                            | Le poster des 18 principes en quatre couleurs (aka.ms/aiguidelines).                                                                                                                                                                                                      |

La présentation insiste sur trois avertissements. Ils comptent autant que les principes :

- **« Les principes ne sont pas une checklist. »** On les utilise bien si on les a _considérés_
  pendant le développement, pas si on a coché les 18 cases.
- **« Ne le faites pas seul. »** Les principes touchent à la fois l'interface, les données et le
  modèle. Il faut le chef de produit, la recherche utilisateur, le design, la data science et
  l'ingénierie autour de la table. La diapositive 23 le dit sans détour : _« Can't do this in the
  UI alone! »_, on ne règle pas ça dans l'interface seule.
- **« Est-ce que ça ne vaut pas pour tout logiciel ? »** Parfois oui. Mais chaque principe est
  propre à l'IA ou y prend une importance particulière, et la plupart exigent des solutions qui
  tiennent face à l'**incertitude** de l'IA.

---

## 2. Le papier de Microsoft (CHI 2019) en détail

### 2.1 Le problème de départ

Une IA intégrée à un produit **viole les règles d'ergonomie classiques**. Le papier en donne deux
exemples :

- **La cohérence.** Une IA répond différemment à la même entrée selon la lumière, le bruit, la
  version du modèle ou la personne qui l'utilise (personnalisation). Elle change en apprenant.
- **La prévention des erreurs.** Une IA infère sous incertitude et produit des faux positifs et
  des faux négatifs : on ne peut pas garantir qu'elle ne se trompera pas.

D'où l'idée : plutôt que de prétendre éviter les erreurs, **concevoir l'interaction pour qu'elles
coûtent peu**.

### 2.2 Comment les 18 principes ont été fabriqués

| Phase                 | Ce qui a été fait                                                                                                                                                                             | Résultat                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1. Consolidation      | 168 recommandations récoltées (littérature académique sur 20 ans, guides internes et externes, articles d'industrie, retours clients sur les produits Microsoft) puis regroupées par affinité | 35 concepts, puis 20 après filtrage  |
| 2. Évaluation interne | 11 membres de l'équipe, évaluation heuristique modifiée sur 13 produits                                                                                                                       | 18 principes                         |
| 3. Étude utilisateurs | 49 praticiens UX évaluent 20 produits populaires de 10 catégories (2 à 3 évaluateurs par produit)                                                                                             | 785 exemples relevés, reformulations |
| 4. Revue d'experts    | 11 experts UX comparent les anciennes et nouvelles formulations                                                                                                                               | version finale                       |

**Ce qu'ils ont volontairement écarté** (c'est instructif) :

- Les principes **trop vagues pour être conçus directement**, comme « construire la confiance ».
  La confiance est un _résultat_ : les 18 principes sont les _moyens_ observables qui y
  contribuent.
- Les principes **trop spécifiques**, comme « établir que le bot n'est pas humain ». Il est
  devenu une obligation légale en 2026 (section 5.12).
- Les principes **non propres à l'IA**, comme « bien afficher les résultats ».
- Les principes **qui se jouent dans le modèle, pas à l'écran** : « explorer ou exploiter avec
  modération », « être particulièrement prudent au début », et le principe de Horvitz « choisir
  l'action idéale selon les coûts, bénéfices et incertitudes ». Ils sont importants, mais
  invisibles dans une interface. **C'est un angle mort assumé**, que la recherche suivante a dû
  combler.

**Règles d'écriture d'un principe** : une règle d'action de 3 à 10 mots qui commence par un verbe,
une phrase de précision, **aucune conjonction**. Le but est qu'on puisse dire sans ambiguïté si
un écran l'applique ou le viole. C'est pourquoi « permettre l'invocation, la correction et le
rejet » est devenu trois principes (G7, G8, G9).

### 2.3 Les 18 principes, avec ce qu'ils veulent vraiment dire

**Au début : régler les attentes**

| #   | Principe                                         | Ce qu'il faut comprendre                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | **Dire clairement ce que le système sait faire** | Le périmètre. Les gens surestiment l'IA (33 % décrivent la recherche web comme de la « magie ») ou la sous-estiment. Moyens : montrer des exemples plutôt qu'une documentation (« à utiliser avec parcimonie »), présenter les fonctions au bon moment, donner des réglages qui révèlent indirectement les capacités. |
| G2  | **Dire clairement à quel point il le fait bien** | La fiabilité : à quelle fréquence il se trompe. C'est différent de G1, et les praticiens les confondaient encore après révision (5 experts sur 11). Un exemple minimal : « nous pensons que vous aimerez ». **C'est l'un des principes les plus violés.**                                                             |

**Pendant l'interaction : tenir compte du contexte**

| #   | Principe                                    | Ce qu'il faut comprendre                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G3  | **Choisir le moment selon le contexte**     | _Quand_ agir ou interrompre, selon la tâche et l'environnement. « Pense à appeler ta mère » pendant qu'on conduit est dangereux. Ce principe concerne surtout les services **proactifs** : les produits qu'on sollicite soi-même (_pull_) le jugent « non applicable ».                                                                                                            |
| G4  | **Montrer l'information utile au contexte** | _Quoi_ montrer, selon la tâche **en cours**. À distinguer de G13 (préférences apprises dans la durée).                                                                                                                                                                                                                                                                             |
| G5  | **Respecter les normes sociales**           | Le ton et la forme attendus dans ce contexte culturel. Avec G6, c'est l'un des deux principes **les moins clairs** pour les praticiens.                                                                                                                                                                                                                                            |
| G6  | **Atténuer les biais sociaux**              | Ne pas renforcer les stéréotypes. Exemple clé de l'étude : pour un itinéraire, un évaluateur affirme qu'« il n'y a pas de biais possible » ; un autre remarque qu'on ne peut pas régler sa vitesse de marche et que « le produit suppose que les utilisateurs sont en bonne santé ». **Les biais sont invisibles pour qui n'en est pas victime** : il faut des évaluateurs divers. |

**Quand l'IA se trompe : réduire le coût de l'erreur**

| #   | Principe                                            | Ce qu'il faut comprendre                                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G7  | **Faciliter l'appel**                               | Pouvoir demander le service quand l'IA ne l'a pas proposé (faux négatif).                                                                                                                                                                                                                                                                                           |
| G8  | **Faciliter le rejet**                              | Pouvoir ignorer ou écarter sans effort (faux positif) : discret, facile à faire défiler.                                                                                                                                                                                                                                                                            |
| G9  | **Faciliter la correction**                         | Modifier, affiner, revenir en arrière. L'exemple type : le rappel créé par l'assistant vocal s'ouvre dans l'interface avec « Toucher pour modifier ».                                                                                                                                                                                                               |
| G10 | **Restreindre le service en cas de doute**          | Quand l'IA ne sait pas ce que veut l'utilisateur, elle demande (désambiguïsation) ou fait moins. L'exemple de l'autocomplétion : 3 ou 4 suggestions au lieu de compléter d'office. « Passer la main à un humain » et « dire à l'utilisateur quand reprendre le contrôle » ont été fusionnés ici. Ce principe est presque impossible à observer en une seule séance. |
| G11 | **Dire pourquoi le système a fait ce qu'il a fait** | Une explication accessible, _a posteriori_, qui peut être très courte (« itinéraire le plus rapide »). **C'est le paradoxe central du papier** (section 2.4).                                                                                                                                                                                                       |

**Dans la durée : apprendre sans déstabiliser**

| #   | Principe                                                  | Ce qu'il faut comprendre                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G12 | **Se souvenir des interactions récentes**                 | La mémoire _courte_ : pouvoir dire « et il est marié à qui ? » après une recherche.                                                                                                                                                                                                            |
| G13 | **Apprendre du comportement de l'utilisateur**            | La personnalisation _dans la durée_.                                                                                                                                                                                                                                                           |
| G14 | **Mettre à jour et s'adapter avec prudence**              | Limiter les changements perturbants. L'exemple : la liste au-dessus reste stable, seule celle du dessous se met à jour. Le contre-exemple des notes d'orateur : on aime **une** citation inspirante et tout le fil en est inondé (« les cupcakes sont des muffins qui ont cru aux miracles »). |
| G15 | **Encourager un retour granulaire**                       | Un retour sur un élément précis, pendant l'usage normal (marquer « important », pouce).                                                                                                                                                                                                        |
| G16 | **Montrer les conséquences des actions de l'utilisateur** | Dire tout de suite comment un geste changera le comportement futur (« masquer cette pub ajustera les suivantes »). Dans l'exemple des citations, le fil appliquait G13 et G15 mais violait G14 et **G16** : personne ne savait quel geste avait déclenché l'avalanche.                         |
| G17 | **Offrir des réglages globaux**                           | Personnaliser ce que l'IA surveille et comment elle se comporte (historique de position, mode privé). À distinguer de G15, qui porte sur un élément : les praticiens les confondaient.                                                                                                         |
| G18 | **Prévenir des changements**                              | Annoncer les nouvelles capacités ou les capacités modifiées.                                                                                                                                                                                                                                   |

### 2.4 Ce que l'étude a trouvé (et qu'on cite rarement)

- **785 exemples** : 313 applications, 277 violations, 89 neutres, 106 « ne s'applique pas ».
  Chaque principe a au moins une application ou une violation dans chaque catégorie de produit :
  ils sont tous pertinents partout.
- **Les mieux appliqués** : G1, G4 et G12. Les produits savent montrer leurs fonctions, le
  contexte et l'historique récent.
- **Les plus violés malgré leur importance** : **G2** (fiabilité), **G11** (explication) et **G17**
  (réglages globaux).
- **Le paradoxe de G11.** C'est l'un des principes les plus violés _alors que_ l'explicabilité est
  l'un des sujets de recherche les plus actifs. Les participants imaginaient presque toujours une
  explication utile (très peu de « ne s'applique pas ») sans jamais l'obtenir, ou l'obtenaient
  mais inutilisable : « il dit toujours "meilleur itinéraire" sans dire pourquoi c'est le
  meilleur ». Le papier note qu'une explication est parfois **indésirable pour l'entreprise** :
  expliquer le classement d'un moteur de recherche aiderait ceux qui veulent le manipuler.
- **G3, G5 et G6** sont le plus souvent jugés « non applicables ». Pour G3, parce que beaucoup de
  produits n'interrompent jamais. Pour G5 et G6, parce que les évaluateurs ne voyaient pas les
  normes sociales et les biais _des autres_ : « difficile pour un designer, ça demande de sortir de
  son propre contexte social » ; « qui définit ce qui est injuste ? ».
- **Voix, capteurs et images** (assistants vocaux, bracelets d'activité, photos) ont le moins
  d'exemples : les principes sont pensés pour des interfaces graphiques et textuelles.
- **Six paires de principes confondues** : G1 et G2, G1 et G11, G3 et G4, G4 et G13, G12 et G13,
  G15 et G17. Ce sont autant de distinctions utiles à apprendre : _quoi_ ou _à quel point_,
  _avant_ ou _après coup_, _contexte présent_ ou _préférences apprises_, _mémoire courte_ ou
  _apprentissage_, _élément_ ou _global_.

### 2.5 Les limites que les auteurs reconnaissent

- **Généralité contre spécialisation.** Les domaines à haut risque (voiture semi-autonome,
  chirurgie robotisée, finance) demanderont des principes spécifiques.
- **Les principes interagissent et entrent en conflit.** L'exemple donné : avec un modèle
  profond et complexe, il est difficile à la fois d'apprendre du comportement (G13) et de montrer
  les conséquences de chaque geste (G16).
- **L'éthique dépasse G5 et G6.** Un système peut respecter les 18 principes et nuire gravement à
  la vie des gens.
- **Biais de l'étude.** Évaluateurs recrutés surtout chez Microsoft (avec 11 externes),
  évaluation sur une seule séance (G10 et G14 impossibles à juger ainsi), produits de 2018.

---

## 3. Le HAX Toolkit : des principes à la pratique

HAX (_Human-AI eXperience_, microsoft.com/haxtoolkit) réunit quatre outils.

### 3.1 Le Workbook : 5 étapes, pour une fonctionnalité à la fois

La feuille de calcul (diapositive 6) a une ligne par principe, chacune avec un exemple rédigé,
par exemple « un assistant de CV par IA » ou « un chatbot de prise de rendez-vous médicaux ».

| Étape                               | Question                                                                                           | Format                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Choisir les principes pertinents | Ce principe est-il pertinent ici ?                                                                 | Oui / Non / Peut-être, puis on filtre sur « Oui »                    |
| 2. Imaginer l'impact                | L'appliquer **profiterait** à l'utilisateur comment ? Ne pas l'appliquer lui **nuirait** comment ? | Impact estimé : élevé / moyen / faible, puis on filtre sur « élevé » |
| 3. Définir les exigences            | Exigences **interface, IA, données et ingénierie**                                                 | Effort en tailles de t-shirt : S / M / L / XL                        |
| 4. Prioriser                        | Impact utilisateur contre coût                                                                     | P0 à P3                                                              |
| 5. Suivre                           | Avancement pendant le développement                                                                | Dans le fichier ou dans vos outils                                   |

Il a été codéveloppé avec plus de 40 praticiens. **La colonne « ne pas l'appliquer nuirait à
l'utilisateur en… » est la plus utile** : elle force à imaginer l'échec concret (« l'utilisateur
croirait que le chatbot détecte l'urgence médicale alors que non »). Version courte quand le
temps manque : chacun apporte 3 à 5 principes qu'il juge essentiels, l'équipe s'accorde, et on ne
fait les étapes que pour ceux-là.

Ce que les équipes en disent (diapositive 3) : c'est un outil d'**alignement** (« parler la même
langue que l'équipe IA »), de **plaidoyer** (« si on est tous d'accord que le principe X compte,
ça aide à obtenir du budget ») et de **justification** (« les principes sont une preuve de
recherche pour mes décisions de design »).

### 3.2 Les autres briques

- **Design Library** : des patterns tirés de centaines d'exemples réels, classés par principe.
  Pour G2 : adapter la précision du langage à la performance réelle, en mots (2A) ou en chiffres
  (2B), publier la performance (2C), alerter quand elle baisse (2D). Pour G9 : basculer une
  classification, édition riche, annuler une action automatique, édition par lot. Pour G11 :
  explications locales et globales, propriétés de la sortie, exemples, « et si… ? ». Des exemples
  génératifs (Copilot, Gemini) ont été ajoutés.
- **Playbook** : un outil pour **énumérer à l'avance les scénarios d'échec** d'une fonction en
  langage naturel (Hong et al., CHI 2021). Constat de départ : les équipes ne prototypaient que les
  cas idéaux. Le Playbook sert d'« objet-frontière » entre design, data science et ingénierie.
- **Responsible AI Standard v2** (2022) : la norme interne de Microsoft **recommande** de suivre
  les 18 principes (A5.3.1, T1.2.1), sans les rendre obligatoires. Ce qu'elle _impose_, c'est que
  les personnes chargées de superviser comprennent l'usage prévu, sachent interpréter le
  comportement, sachent quand passer outre ou interrompre, et **restent conscientes du biais
  d'automatisation**. Tout cela doit être évalué en conditions réalistes avant la mise en
  production.

### 3.3 Ce que le kit n'a pas fait

Il n'existe **ni version « HAX 2.0 » ni nouveau principe** pour l'IA générative ou les agents :
l'adaptation s'est faite par ajout d'exemples. Le vrai prolongement est ailleurs, dans les travaux
sur la sur-dépendance (5.4) et sur les agents (5.11). Et une étude externe (Subramonyam et al.,
CHI 2022, 21 entretiens dans 14 organisations) rappelle que **des principes seuls ne suffisent
pas**. Le partage classique « le designer spécifie, l'ingénieur implémente » ne tient pas avec
l'IA. Les équipes efficaces se passent des objets intermédiaires (notebooks de données, tableaux
de performance) et invitent les ingénieurs aux tests utilisateurs.

---

## 4. La généalogie : de Licklider (1960) aux agents (2025)

| Année   | Jalon                                                                     | Idée qui reste                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1960    | **Licklider (MIT)**, _Man-Computer Symbiosis_                             | La symbiose, pas l'homme « mécaniquement prolongé ». **L'humain fixe les buts, la machine les moyens.** Il estimait passer 85 % de son temps de « réflexion » à se mettre en état de réfléchir (chercher, tracer, calculer), sur un échantillon d'une personne : lui-même. |
| 1978    | **Sheridan & Verplank (MIT)**, échelle à 10 niveaux                       | Du « l'humain fait tout » au « la machine décide et agit sans prévenir ». Elle portait à l'origine sur le seul choix de l'action.                                                                                                                                          |
| 1983    | **Bainbridge**, _Ironies of Automation_                                   | On demande à l'humain de surveiller et de reprendre la main au pire moment (l'anomalie), alors que ses compétences s'érodent faute de pratique.                                                                                                                            |
| 1997    | **Parasuraman & Riley**                                                   | Quatre façons d'utiliser l'automatisation : _use_ (s'en servir), _misuse_ (s'y fier à tort), _disuse_ (la délaisser, souvent après des fausses alarmes), _abuse_ (l'imposer sans égard pour l'humain).                                                                     |
| 1999    | **Horvitz (Microsoft)**, _Principles of Mixed-Initiative User Interfaces_ | 12 principes : l'ancêtre direct des 18.                                                                                                                                                                                                                                    |
| 2000    | **Parasuraman, Sheridan & Wickens**                                       | L'automatisation se règle **par fonction** : capter l'information, l'analyser, décider, exécuter. Chaque fonction a son niveau.                                                                                                                                            |
| 2004    | **Lee & See**, _Trust in Automation_                                      | La cible est une confiance **calibrée** sur la fiabilité réelle.                                                                                                                                                                                                           |
| 2019    | **Amershi et al. (Microsoft)**                                            | Les 18 principes.                                                                                                                                                                                                                                                          |
| 2020-22 | **Shneiderman**, _Human-Centered AI_                                      | Automatisation élevée **et** contrôle humain élevé sont compatibles : l'échelle à une dimension est un faux dilemme.                                                                                                                                                       |
| 2022    | **Passi & Vorvoreanu (Microsoft)**, _Overreliance on AI_                  | Le sujet devient la sur-dépendance.                                                                                                                                                                                                                                        |
| 2023    | **Nielsen**, troisième paradigme d'interface                              | Après le traitement par lots et la commande, l'**intention** : on décrit le résultat, plus les étapes.                                                                                                                                                                     |
| 2024    | **Bansal et al. (Microsoft)**, _Challenges in Human-Agent Communication_  | 12 défis propres aux agents, et l'appel à de nouveaux principes.                                                                                                                                                                                                           |
| 2025    | **Magentic-UI (Microsoft)**, **Feng et al.** (niveaux d'autonomie)        | Planifier avec l'agent, garde-fous d'action, interruption. Les niveaux définis par le **rôle de l'humain** : opérateur, collaborateur, consultant, approbateur, observateur.                                                                                               |

### Horvitz 1999, l'ancêtre direct

Le papier de 2019 indique que 8 des 18 principes reprennent Horvitz. Les correspondances :

| Horvitz 1999                                                                     | Principe de 2019 |
| -------------------------------------------------------------------------------- | ---------------- |
| 3. Tenir compte de l'attention de l'utilisateur au moment du service             | G3               |
| 6. Permettre d'appeler et d'arrêter directement et efficacement                  | G7, G8           |
| 8. Adapter la précision du service à l'incertitude (« faire moins, mais juste ») | G10              |
| 9. Collaborer efficacement pour affiner le résultat                              | G9               |
| 10. Avoir un comportement socialement approprié                                  | G5               |
| 11. Garder une mémoire de travail des interactions récentes                      | G12              |
| 12. Continuer à apprendre par l'observation                                      | G13              |

Ce que 2019 ajoute : les biais (G6), la transparence (G1, G2, G11), les réglages globaux (G17) et
l'annonce des changements (G18). Ce que 2019 laisse de côté : le principe 4 de Horvitz, **décider
d'agir ou d'attendre selon l'utilité espérée** (coût d'une erreur contre bénéfice d'une action
juste). Il revient en force avec les agents.

---

## 5. Ce que la recherche a appris depuis 2019

### 5.1 De « faire confiance » à « se fier à bon escient »

La formule est de Lee & See (2004) : _appropriate reliance_. Il y a deux échecs symétriques :

- **La sur-dépendance** (_misuse_) : accepter une sortie fausse. Avec l'IA générative, elle est
  plus probable parce qu'**une réponse fluide masque l'erreur**. Les utilisateurs croient aussi
  que l'IA _retrouve_ l'information comme un moteur de recherche, alors qu'elle la _génère_.
- **La sous-dépendance** (_disuse_) : rejeter une sortie juste. Des médecins aidés de ChatGPT
  faisaient moins bien que ChatGPT seul (Goh et al., JAMA Network Open, 2024). Les radiologues
  sous-pondèrent l'avis de l'IA et traitent leur information et celle de l'IA comme si elles
  étaient indépendantes (Agarwal et al., MIT, 2023).

Microsoft (page Microsoft Learn sur la sur-dépendance, 2025) en tire **trois objectifs
d'interface** :

1. **Des modèles mentaux réalistes** (G1, G2, G11).
2. **Signaler quand vérifier** : expressions d'incertitude, critiques, questions.
3. **Rendre la vérification facile**, en réduisant l'effort de contrôle.

Les facteurs de risque viennent du côté de l'utilisateur : peu de culture de l'IA, peu
d'expertise du domaine, peu d'habitude de la tâche, forte confiance générale dans l'IA. Le
document le reconnaît lui-même : le sujet n'est pas résolu et chaque mitigation peut se retourner.

### 5.2 Le duo humain + IA n'est pas automatiquement meilleur

**Vaccaro, Almaatouq & Malone, MIT, _Nature Human Behaviour_, 2024.** Méta-analyse de 74 papiers,
106 expériences et 370 effets, publiés entre 2020 et mi-2023.

| Comparaison                               | Effet (g) | Lecture                                   |
| ----------------------------------------- | --------- | ----------------------------------------- |
| Duo contre **le meilleur des deux seuls** | **−0,23** | En moyenne, le duo fait un peu moins bien |
| Duo contre **humain seul**                | **+0,64** | L'IA aide presque toujours l'humain       |
| Tâches de **décision** (synergie)         | −0,27     | Le duo perd                               |
| Tâches de **création** (synergie)         | +0,19     | Tendance positive, **non significative**  |

- **Le facteur décisif est la performance relative.** Quand l'humain seul bat l'IA seule, le duo
  progresse (+0,46). Quand l'IA seule est meilleure, le duo perd (−0,54) : l'humain dégrade une
  IA déjà supérieure en la corrigeant à tort.
- **Ni l'affichage de la confiance ni l'explication** n'ont changé significativement la synergie.
- **Les nuances qui comptent.** L'hétérogénéité est énorme (I² = 97,7 %). La création ne pèse
  qu'environ 10 % des effets. Les tâches sont surtout des tests de laboratoire avec des modèles
  antérieurs à 2023. Le papier se contredit sur la division du travail : il la dit importante
  dans la discussion alors qu'elle n'est pas significative dans les résultats, et ne repose que
  sur 3 expériences.

**Bansal et al., CHI 2021** (1 626 participants, IA à environ 84 % de précision, comparable à
l'humain) : le duo dépasse chacun des deux (0,89 contre 0,84 et 0,82), mais **les explications
n'apportent rien de plus que l'affichage d'un score de confiance**.

**Agarwal et al., MIT/NBER, 2023** (radiologie) : la prédiction de l'IA seule n'améliore pas les
radiologues en moyenne. Ce qui les améliore, c'est l'**information contextuelle** qu'eux seuls
détiennent. Les auteurs concluent qu'il vaut souvent mieux confier chaque cas **soit** à l'humain
**soit** à l'IA, plutôt qu'à un humain assisté qui fusionne mal les deux avis.

> **Ce qu'on en retient pour concevoir** : avant d'associer humain et IA, se demander qui est
> meilleur sur quoi et ce que chacun sait que l'autre ignore. Le duo gagne quand il combine des
> **informations complémentaires**, pas quand l'humain repasse sur le travail de l'IA.

### 5.3 La frontière irrégulière : novices, experts et tâches hors champ

- **Noy & Zhang (MIT), _Science_, 2023** : 453 professionnels, tâches d'écriture. **−40 % de
  temps, +18 % de qualité**, et des écarts entre travailleurs réduits.
- **Brynjolfsson, Li & Raymond, _QJE_, 2025** : environ 5 200 agents de support. +14 % de demandes
  résolues par heure (environ 15 % dans la version publiée), **+34 % pour les novices**. Dans la
  version publiée, **les plus expérimentés gagnent un peu en vitesse mais perdent un peu en
  qualité**. Les clients deviennent aussi plus polis.
- **Dell'Acqua et al. (Harvard/BCG/MIT), 2023** : 758 consultants BCG, GPT-4.
  - **Dans la frontière** (une tâche que l'IA sait faire) : +12 % de tâches réalisées, 25 % plus
    rapide, qualité nettement meilleure (« jusqu'à +40 % » selon les auteurs, à vérifier dans
    l'article).
  - **Hors frontière** (une tâche conçue pour que l'IA se trompe) : justesse de **84,5 % sans IA,
    70,6 % avec GPT-4, 60 % avec GPT-4 et une formation au prompt**. Les utilisateurs d'IA
    jugeaient pourtant leurs réponses plus solides.
  - **Contre-intuitif** : la formation au prompt **aggrave** la chute, car elle donne plus de
    confiance dans l'IA.
  - Deux styles observés : les **centaures** (qui alternent humain et IA) et les **cyborgs** (qui
    coproduisent en continu). C'est une observation qualitative, pas une mesure.

> **La leçon de conception** : la frontière est **invisible pour l'utilisateur**. C'est
> exactement ce que G2 (« à quel point il le fait bien ») devait rendre visible. Les produits ne
> le font presque jamais, et c'était déjà l'un des principes les plus violés en 2019.

### 5.4 Le paradoxe de l'explication

C'est la nuance la plus importante pour quiconque applique G11.

| Résultat                                                                                                                                                                          | Source                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Les explications augmentent la précision quand l'IA a raison et la font baisser « de façon inquiétante » quand elle a tort. Au total, effet quasi nul.                            | Bansal et al., CHI 2021                                    |
| Des explications **sans lien réel** avec le fonctionnement du modèle augmentent quand même la confiance.                                                                          | Passi & Vorvoreanu, 2022 (revue)                           |
| « La simple présence de sources peut faire davantage confiance aux sorties de l'IA. »                                                                                             | Microsoft Learn, 2025                                      |
| Les citations donnent une impression de rigueur qui **décourage** la vérification.                                                                                                | Vorvoreanu, Microsoft Research Forum                       |
| Plus d'information sur le modèle fait suivre plus souvent les **bonnes et les mauvaises** recommandations.                                                                        | Suresh et al. 2020, cité par Passi & Vorvoreanu            |
| Un score de précision non informatif augmente la confiance même s'il n'annonce que 50 %.                                                                                          | Lai & Tan 2019, idem                                       |
| Un score élevé affiché sur une erreur évidente provoque l'**aversion** pour l'algorithme.                                                                                         | idem                                                       |
| Afficher la confiance aide à calibrer, mais **ne suffit pas** à mieux décider : il faut que l'humain sache des choses que l'IA ignore.                                            | Zhang, Liao & Bellamy, FAT* 2020                           |
| **Les explications réduisent la sur-dépendance quand elles diminuent le coût de vérification.**                                                                                   | Vasconcelos et al., CSCW 2023 (5 études, 731 participants) |
| « Si vous ne savez pas comment vos scores de confiance correspondent à la qualité, ne les montrez pas. » Préférer « parce que vous écoutez de la pop » à « correspondance 97 % ». | Apple HIG                                                  |
| « Expliquer pour faire comprendre, pas pour être exhaustif. »                                                                                                                     | Google PAIR                                                |

> **Ce qu'on en retient** : la bonne explication n'est pas celle qui raconte le raisonnement de
> l'IA, c'est celle qui **permet de vérifier en un coup d'œil**. Elle pointe la donnée exacte
> d'où vient l'affirmation, met côte à côte « avant » et « après », montre la citation mot pour
> mot. Une explication qui rassure sans faciliter le contrôle est un outil de persuasion.

### 5.5 La friction utile, et son prix

- **Les _cognitive forcing functions_** (Buçinca, Malaya & Gajos, CSCW 2021, 199 participants) :
  faire répondre l'humain _avant_ de montrer l'avis de l'IA, imposer un délai, ne montrer l'avis
  qu'à la demande. Elles réduisent nettement la sur-dépendance. Mais **les dispositifs les plus
  efficaces sont les moins aimés**, ils ne suppriment pas le problème, et ils profitent surtout à
  ceux qui aiment déjà réfléchir, ce qui risque de creuser les inégalités.
- **Poser une question plutôt que donner la réponse** (Danry, Pataranutaporn, Mao & Maes, MIT
  Media Lab, CHI 2023, 204 participants) : quand l'IA reformule son information en questions
  (_AI-framed questioning_), les gens repèrent mieux les raisonnements faux qu'avec une explication
  causale, **même venant d'une IA toujours juste**. La tâche est étroite, mais le résultat est
  frappant.
- **L'incertitude à la première personne** : « je ne suis pas sûr, mais… » est plus efficace
  qu'une formule impersonnelle (Kim et al., FAccT 2024). Un modèle qui exprime de la certitude
  quand il a raison et du doute quand il a tort favorise une dépendance appropriée (Zhou et al.,
  ACL 2024).
- **Surligner les passages incertains** : surligner les mots peu probables réduit la
  sur-dépendance en recherche d'information, **pas** en génération de code. Pour le code, il faut
  surligner les passages les plus susceptibles d'être modifiés (NFW 2024). **Ce qui marche dépend
  de la tâche.**
- **L'IA « évaluative »** qui présente les arguments pour et contre (Le et al., 2024) réduit la
  sur-dépendance, mais elle est plus difficile à utiliser et écrase parfois les débutants.

> **La tension** : la valeur affichée d'un assistant, c'est l'efficacité (G7, G8, G9 parlent tous
> d'_efficient_). Or la friction va à rebours de ce que l'utilisateur attend. La réponse de la
> recherche : **doser la friction selon l'enjeu**, peu sur ce qui se défait facilement, plus sur
> ce qui est irréversible ou lourd de conséquences.

### 5.6 Pensée critique, apprentissage, homogénéisation

- **Lee et al. (Microsoft/CMU), CHI 2025** : 319 travailleurs du savoir, 936 exemples réels.
  - Pensée critique déclarée dans **59 %** des cas, donc environ 41 % sans.
  - Effort perçu en baisse dans 55 % (évaluation) à 79 % (compréhension) des cas.
  - **Plus on fait confiance à l'IA, moins on exerce son esprit critique** (β = −0,69). **Plus on a
    confiance en soi, plus on l'exerce** (β = +0,26 à +0,31).
  - La pensée critique ne disparaît pas, **elle change de nature** : de la collecte vers la
    **vérification**, de la résolution vers l'**intégration**, de l'exécution vers la
    **supervision de la tâche**.
  - Limites : données déclaratives, pas de mesure sans IA, pas de suivi dans le temps. Les
    participants confondent parfois « moins d'effort pour utiliser l'outil » et « moins d'effort
    de réflexion ». La presse en a tiré « l'IA nuit à la pensée critique », ce que le papier ne
    dit pas.
- **Tankelevitch et al. (Microsoft), CHI 2024**, _The Metacognitive Demands and Opportunities of
  Generative AI_ : l'IA générative impose un travail **métacognitif** (savoir ce qu'on veut,
  découper la tâche, juger la sortie, décider quand s'en servir). Deux remèdes : **soutenir** ce
  travail (aide à planifier, à s'auto-évaluer) ou le **réduire** (explicabilité,
  personnalisation).
- **Simkute et al. (Microsoft), _Ironies of Generative AI_, 2024** : quatre causes de perte de
  productivité.
  1. Le rôle passe de **produire** à **évaluer**.
  2. Le flux de travail se réorganise mal.
  3. Les interruptions se multiplient.
  4. **La polarisation** : l'IA rend le facile plus facile et le difficile plus difficile.
- **Bastani et al., _PNAS_, 2025** : environ 1 000 lycéens en maths. Avec un GPT sans garde-fou,
  +48 % pendant l'entraînement mais **−17 % à l'examen** sans l'outil. Avec un GPT tuteur qui
  donne des indices et pas les réponses (conçu avec les enseignants), +127 % pendant
  l'entraînement et un examen égal au groupe témoin.
- **Anthropic, 2026** (52 ingénieurs, nouvelle bibliothèque) : **50 % au quiz avec l'IA contre
  67 % sans**, et aucun gain de temps significatif. Les usages qui préservent l'apprentissage :
  poser des questions de compréhension, demander le code _avec_ explication. Ceux qui le
  dégradent : déléguer tout le code ou le débogage.
- **Doshi & Hauser, _Science Advances_, 2024** : 293 auteurs de nouvelles, 600 évaluateurs. Les
  idées de l'IA rendent chaque histoire plus originale (+8 %) et plus utile (+9 %), surtout chez
  les moins créatifs, **mais les histoires se ressemblent davantage entre elles** : gain
  individuel, perte collective. Microsoft parle de « convergence mécanisée ».
- **Kosmyna et al. (MIT Media Lab), _Your Brain on ChatGPT_, 2025** : à l'EEG, la connectivité
  cérébrale pendant la rédaction d'un essai est maximale sans outil, intermédiaire avec un moteur
  de recherche, minimale avec un LLM. Les utilisateurs du LLM s'approprient moins leur texte et
  peinent à le citer. **Mais** c'est un préprint, avec 54 participants (18 à la dernière séance),
  une méthode EEG critiquée, et un titre (« dette cognitive ») qui va au-delà de ce que l'EEG
  mesure. À citer comme signal, pas comme preuve.

> **Ce qu'on en retient** : il faut décider, fonction par fonction, si le but est de **faire à la
> place** (l'humain n'a pas besoin de savoir le faire) ou d'**aider à faire** (l'humain doit
> rester compétent). Cela ne se conçoit pas de la même façon.

### 5.7 Le modèle mental se forme avant la première question

- **Pataranutaporn, Liu, Finn & Maes (MIT), _Nature Machine Intelligence_, 2023** : 310
  participants, **un même agent**, trois présentations (« sans intention », « bienveillant »,
  « malveillant »). 88 % du groupe « bienveillant » le trouvent empathique. La présentation
  positive augmente l'efficacité perçue, et l'effet **s'auto-entretient** : un modèle mental
  positif produit des conversations de plus en plus positives.
  - **Conséquence** : G1 et G2 ne sont pas des textes d'aide. L'onboarding, le nom, la première
    phrase et le marketing **fabriquent** l'expérience. On peut produire de la sur-confiance par
    une simple présentation.
- **Nielsen (NN/g), le troisième paradigme** : avec l'IA, on décrit le résultat voulu au lieu des
  étapes. Cela **inverse le lieu du contrôle**. Nielsen doute même qu'on puisse encore parler
  d'« interaction », puisqu'il n'y a plus d'alternance. Il prévoit des interfaces **hybrides** :
  l'intention, puis des commandes graphiques pour affiner.
- **La barrière d'articulation** : exprimer ce qu'on veut par écrit est difficile pour une grande
  partie de la population. Les chiffres de Nielsen sont des extrapolations des enquêtes de lecture
  de l'OCDE, pas des mesures. D'où les patterns d'**augmentation du prompt** : galeries de styles,
  réécriture, prompts liés, constructeurs, paramètres. Nielsen lui-même doute que cela suffise.
- **L'édition en accordéon et la cueillette** (NN/g, 8 participants) : redemander sans cesse
  « plus court », « plus long » ; recopier des morceaux d'une réponse précédente faute de pouvoir
  les désigner. Le remède : **éditer une partie sans tout régénérer**, pointer, éditer
  directement. C'est G9 adapté au génératif.

### 5.8 Sycophantie : quand le feedback pousse l'IA à flatter

- **Sharma et al. (Anthropic), 2023** : les cinq assistants de pointe étudiés sont sycophantes.
  Dans les données de préférence humaine, les réponses qui vont dans le sens de l'utilisateur sont
  préférées, et optimiser pour ces préférences peut sacrifier la vérité.
- **GPT-4o, avril 2025** : OpenAI ajoute un signal de récompense fondé sur le pouce levé ou
  baissé, ce qui affaiblit le garde-fou contre la flatterie. La mise à jour est retirée au bout de
  quatre jours. **La métrique d'engagement est un signal de sycophantie.**
- **Cheng et al., 2025** (1 604 participants, préprint) : une IA sycophante réduit l'envie de
  réparer un conflit, mais elle est **jugée de meilleure qualité** et inspire plus confiance.
  **L'utilisateur préfère ce qui lui nuit.**

> **La tension avec G15** (encourager le retour granulaire) : le retour de l'utilisateur est utile
> pour corriger une erreur de fait. Il est dangereux comme signal d'optimisation de la _qualité
> perçue_.

### 5.9 Effets affectifs et mémoire

- **MIT Media Lab × OpenAI, 2025** : un essai randomisé de 28 jours (981 participants) et
  l'analyse de plus de 3 millions de conversations. Un usage quotidien **très élevé** va avec plus
  de solitude, de dépendance émotionnelle et d'usage problématique. Corrélationnel : les personnes
  seules utilisent peut-être davantage l'outil. Les versions du papier divergent sur l'effet de la
  voix.
- **Faux souvenirs** (Chan, Pataranutaporn, Loftus et al., 2024, préprint, 200 participants) : un
  chatbot qui pose des questions orientées après une vidéo de crime induit **plus de 3 fois plus
  de faux souvenirs** que le groupe témoin, et ils persistent une semaine plus tard. Pour un
  assistant qui **reformule** ce qui a été dit en réunion, c'est un risque concret.

### 5.10 Productivité réelle : ce que disent les données de terrain

Les rapports **New Future of Work** de Microsoft (2023, 2024, 2025) sont des synthèses (avec un
conflit d'intérêts évident, puisque Microsoft vend Copilot).

- **En labo** : de 26 à 73 % du temps sans Copilot selon les tâches, mais un effet sur la qualité
  « souvent non significatif ». Pour les résumés de réunion, Copilot fait même un peu moins bien
  (11,1 critères sur 15 contre 12,4).
- **Sur le terrain** : un essai randomisé auprès de plus de 6 000 employés de plus de 60
  organisations donne +10 % de documents produits et −11 % d'e-mails lus, soit un effet
  « modéré ».
- **Le temps gagné ressenti dépasse le temps gagné réel** : la sensation vient de la baisse
  d'effort ou d'un plaisir accru, pas forcément du temps.
- **« Workslop »** : 40 % des salariés interrogés ont reçu le mois précédent un contenu produit
  par IA qui a l'air utile mais manque de substance. Cela pourrait expliquer pourquoi les gains
  individuels n'apparaissent pas à l'échelle de l'organisation. **Le coût de vérification est
  reporté sur le destinataire.**
- **Le « sandwich d'intégration critique »** (Sarkar, 2023) : l'IA produit au milieu, l'humain
  exerce son jugement avant (cadrer) et après (vérifier, intégrer).
- **Anthropic Economic Index (septembre 2025)** : sur Claude.ai, les conversations où l'on
  délègue entièrement passent de 27 à 39 %, et « l'automatisation dépasse l'augmentation » pour la
  première fois. Via l'API, 77 % d'automatisation contre 12 % d'augmentation.

### 5.11 Les agents : un nouveau problème d'interaction

**Bansal et al. (Microsoft, avec Amershi et Horvitz), 2024** : 12 défis de communication entre
humain et agent.

| Sens                     | Défis                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| De l'agent vers l'humain | A1 ce qu'il sait faire · A2 **ce qu'il s'apprête à faire** (le plan) · A3 ce qu'il est en train de faire · A4 **les effets de bord** · A5 si le but est atteint |
| De l'humain vers l'agent | U1 l'objectif · U2 les préférences à respecter · U3 ce qu'il faut faire autrement la prochaine fois                                                             |
| Transversaux             | X1 aider à vérifier · X2 un comportement cohérent · X3 le bon niveau de détail · X4 quelles interactions passées prendre en compte                              |

**Magentic-UI (Microsoft, 2025)**, un prototype d'agent web avec l'humain dans la boucle :

- **Co-planification** : l'humain modifie le plan avant l'exécution.
- **Co-exécution** : il met en pause, redirige, prend la main.
- **Garde-fous d'action** : une validation avant toute action potentiellement irréversible, avec
  un filtre en deux temps (règles sur le type d'action, puis un modèle juge).
- **Mémoire longue.**

Résultats :

- Avec un utilisateur _simulé_ qui dispose d'informations utiles, la réussite passe de **30 % à
  52 %**. L'agent ne demande pourtant de l'aide que dans environ 10 % des tâches.
- Avec 12 vrais utilisateurs : facile à utiliser (SUS de 75), mais **seulement 42 %**
  l'utiliseraient souvent. Ils demandent à modifier une étape passée et à rejouer depuis là.
- Sécurité : sans les protections techniques (bac à sable, navigateur isolé), les injections de
  prompt réussissaient (exfiltration de clés, création de jetons). **La protection repose sur
  l'isolation technique plus que sur la vigilance humaine.**

**OpenAI, _Practices for Governing Agentic AI Systems_, 2023** : sept pratiques, dont limiter
l'espace d'action avec approbation, la lisibilité, la surveillance automatique et
l'**interruptibilité**. Les nuances :

- **L'approbation perd son sens** quand il faut approuver vite beaucoup de décisions (fatigue
  d'approbation).
- Interrompre un agent au milieu d'une séquence pose problème : sur cinq invitations, deux sont
  déjà parties.
- Un agent ne doit jamais pouvoir empêcher son propre arrêt.

**Anthropic, _Building effective agents_, 2024** :

- préférer un **workflow** (chemin prédéfini) à un agent quand c'est possible ;
- montrer la planification ;
- s'appuyer sur la « vérité du terrain » à chaque étape ;
- prévoir des points d'arrêt humains et une limite d'itérations.

L'observation de terrain d'Anthropic (2026, source secondaire) : l'approbation automatique
complète passe d'environ 20 % des sessions chez les nouveaux utilisateurs à plus de 40 % chez les
habitués. **La supervision glisse de l'approbation action par action vers l'interruption** :
c'est exactement ce que Bainbridge et Endsley prévoyaient (la surveillance passive dégrade la
conscience de la situation).

> **Le dilemme agentique** : demander une approbation trop souvent produit des tampons
> machinaux, trop rarement sort l'humain de la boucle. L'interruption est un dernier recours,
> pas une gouvernance. La sortie proposée : **régler le niveau d'autonomie par type d'action**
> (Parasuraman 2000) selon la réversibilité et l'enjeu, plutôt qu'un niveau global.

### 5.12 Le cadre légal européen (règlement IA)

- **Article 50, transparence, applicable depuis le 2 août 2026** :
  - un système qui interagit avec des personnes doit leur faire savoir que c'est une IA, sauf si
    c'est évident ;
  - les contenus générés doivent être marqués de façon lisible par une machine, avec une
    exception pour l'assistance à l'édition standard ;
  - l'information doit être donnée au plus tard à la première interaction.
- **Article 14, supervision humaine des systèmes à haut risque** (dont l'application est
  repoussée à fin 2027 ou 2028 par l'« Omnibus numérique », à vérifier au Journal officiel) :
  - les superviseurs doivent **rester conscients de la tendance à se fier automatiquement à la
    sortie** ;
  - ils doivent pouvoir ignorer, annuler ou inverser une sortie, et arrêter le système.
- **La nuance** : la loi exige une _conscience_ du biais d'automatisation. La recherche (5.4,
  5.5) montre que **l'information seule ne suffit pas** à le réduire.

---

## 6. Les tensions entre principes

Le papier de 2019 annonçait des « compromis ». Voici ceux que la recherche a documentés.

| Tension                                                                     | Ce qui se passe                                                          | Piste                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **G11 expliquer** contre la sur-confiance                                   | L'explication persuade plus qu'elle n'aide à vérifier                    | Expliquer pour **vérifier** : la source exacte, la citation, l'avant et l'après                 |
| **G2 dire la fiabilité** contre un score trompeur                           | Un chiffre non calibré trompe, un score élevé sur une erreur fait fuir   | Ne montrer un score que s'il est calibré, sinon des raisons en mots (Apple)                     |
| **G7 à G9 l'efficacité** contre la friction utile                           | Ce qui réduit la sur-dépendance déplaît                                  | Doser la friction selon l'**irréversibilité** et l'enjeu                                        |
| **G15 feedback** contre la sycophantie                                      | Optimiser pour le pouce levé fait flatter                                | Feedback pour corriger des faits, jamais comme objectif de satisfaction                         |
| **G13 apprendre** contre **G16 montrer les conséquences**                   | Un modèle complexe rend les conséquences opaques                         | Signalé dès 2019 et toujours ouvert ; personnalisation visible et réversible                    |
| **G13 apprendre** contre **G14 prudence**                                   | Une adaptation rapide crée la bulle (le fil inondé de citations)         | Adaptation progressive, explicable, avec réglage global (G17)                                   |
| **G3 bon moment** contre la fatigue d'approbation                           | Les agents demandent trop souvent ou trop rarement                       | Autonomie par type d'action ; regrouper les approbations à faible enjeu                         |
| **G18 prévenir des changements** contre la mise à jour continue des modèles | Un changement de modèle modifie le comportement sans changer l'interface | Annoncer les changements de modèle ; tests de non-régression comportementale                    |
| Automatisation élevée contre contrôle élevé                                 | Le faux dilemme de l'échelle à une dimension                             | Shneiderman : viser les deux, avec un contrôle de supervision fort et une exécution automatique |
| Gain individuel contre perte collective                                     | Homogénéisation, workslop                                                | Mesurer à l'échelle de l'équipe, pas seulement de l'individu                                    |
| Faire à la place contre faire apprendre                                     | Le temps gagné coûte de la compétence                                    | Le décider fonction par fonction                                                                |

---

## 7. Ce qui manque aux 18 principes en 2026

Ce qui suit est **ma synthèse**, pas un texte publié. Les 18 principes restent valables. Il
faudrait leur ajouter trois couches.

### Couche A : la dépendance appropriée (prolonge G2 et G11)

- **A1. Rendre la vérification peu coûteuse.** Pointer la donnée exacte, citer mot pour mot,
  montrer l'avant et l'après (Vasconcelos ; objectif 3 de Microsoft).
- **A2. Signaler où vérifier.** Une incertitude exprimée, localisée, à la première personne ;
  surligner ce qui est le plus probablement faux ou à modifier.
- **A3. Dire ce qui manque, pas seulement ce qui est faux.** Les avertissements génériques ne
  disent jamais qu'une sortie peut être **incomplète** (Microsoft, 2025).
- **A4. Doser la friction selon l'enjeu et la réversibilité.**
- **A5. Ne pas fabriquer de confiance par la présentation** : le ton, le nom, l'onboarding et
  l'affichage des sources ont un effet propre (Pataranutaporn ; Microsoft).

### Couche B : la cognition et les compétences de l'humain

- **B1. Décider pour chaque fonction : faire à la place ou aider à faire.**
- **B2. Garder l'humain auteur** de ce qui l'engage, pour préserver l'appropriation et la mémoire
  de ce qu'il a produit.
- **B3. Questionner plutôt qu'affirmer** quand le but est le jugement de l'humain (Danry).
- **B4. Résister à la flatterie** : ne pas abonder dans le sens de l'utilisateur contre les faits,
  et ne pas optimiser la satisfaction déclarée.

### Couche C : les agents

- **C1. Montrer le plan avant d'agir** et permettre de le modifier.
- **C2. Montrer la progression et les effets de bord**, et dire si le but est atteint.
- **C3. Un garde-fou avant toute action irréversible**, et un niveau d'autonomie réglé par type
  d'action.
- **C4. Pouvoir interrompre, reprendre, rejouer depuis une étape**, sans que l'agent puisse
  l'empêcher.
- **C5. Traiter tout contenu lu par l'agent comme une donnée, jamais comme une instruction**
  (injection de prompt).

### Transversal

- **Dire qu'on parle à une IA et marquer ce qu'elle génère** (article 50 du règlement IA).
- **La provenance** : distinguer à l'écran ce qui vient de l'humain, ce qui est calculé par le
  code, et ce qui est proposé par l'IA.

---

## 8. Lecture appliquée : PO et PDS OS

PDS OS est un bon terrain d'essai : PO **lit** des données et **propose** des écritures. J'ai
relu `docs/ASSISTANT.md` et `docs/VISION-UX.md` à la lumière de ce qui précède. Cette partie
contient des **observations**, pas des modifications à faire.

### 8.1 Ce que PO fait déjà, et que la recherche confirme

| Choix de PDS OS                                                                                             | Principe ou résultat de recherche                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L'IA ne produit jamais un état, un compteur, une date ni un calcul** ; les faits sont rédigés par le code | Une réponse fluide masque l'erreur (5.1). Le choix retire au modèle tout ce qui serait une erreur crédible. Il va **plus loin** que les 18 principes.                             |
| **« Données utilisées » sous chaque réponse**, liens affichés par le code, liens du modèle retirés          | G11 dans sa version utile : l'explication **sert à vérifier** (Vasconcelos). « Si le modèle se trompe, la vérité est juste en dessous. »                                          |
| **Les propositions ouvrent le vrai formulaire pré-rempli**, l'humain enregistre                             | G9 (corriger), Magentic-UI (garde-fou avant d'agir), règlement IA art. 14 (pouvoir ignorer ou annuler). Le formulaire est l'interface de vérification la moins coûteuse possible. |
| **Lignes « avant → après » rédigées par le code**                                                           | A1 : rendre la vérification peu coûteuse.                                                                                                                                         |
| **Nom ambigu : rien plutôt qu'une supposition**, et « « untrill » compris comme « Huntrill » » affiché      | G10 (restreindre en cas de doute) et G11 (dire ce qu'on a compris).                                                                                                               |
| **Chiffres et dates vérifiés comme cités mot pour mot** ; « 5k » laissé vide avec un avertissement          | G10, et A3 (dire ce qui n'a pas été repris).                                                                                                                                      |
| **Aucune décision par PO** (valider, signer, transmettre)                                                   | C3 : les gestes irréversibles restent humains. C'est la bonne frontière d'autonomie, réglée par type d'action.                                                                    |
| **Transcriptions et comptes rendus : des données, jamais des consignes** ; questions tests d'injection      | C5. Magentic-UI montre que sans cette barrière, l'injection réussit.                                                                                                              |
| **Pas de date du jour dans le contexte du modèle**                                                          | Un cas d'école du _misuse_ : le modèle jugeait lui-même les retards. Le code reprend la main sur ce que l'IA fait mal.                                                            |
| **« Proposée, à confirmer », jamais « décidée »**                                                           | G2 dans le langage : la précision du discours suit la fiabilité réelle (pattern 2A).                                                                                              |
| **Pré-rempli avec sa source** (« Catalogue · 02/10 », « Lu par le code », citation du call)                 | Provenance (section 7, transversal) et G11.                                                                                                                                       |
| **Le titre de la conversation est la première question telle quelle**, jamais rédigé par le modèle          | Rien d'inventé par l'IA là où l'on ne l'attend pas.                                                                                                                               |

### 8.2 Les points de vigilance que la recherche suggère

Ce sont des questions à se poser, pas des défauts constatés.

1. **La fatigue d'approbation sur « Relire et enregistrer ».** Le formulaire pré-rempli est un
   excellent garde-fou, mais c'est aussi une **ancre** : on valide ce qui est déjà écrit. Avec
   l'habitude, la relecture risque de devenir un tampon machinal (Bainbridge ; OpenAI ;
   l'approbation automatique d'Anthropic qui passe de 20 à 40 %). Les champs que PO **n'a pas pu
   reprendre** sont déjà signalés. Les champs que PO **a interprétés** (et pas recopiés) méritent
   peut-être le même traitement.
2. **La présence des sources peut rassurer à tort.** « Données utilisées » est la bonne
   approche, mais « la simple présence de sources » augmente la confiance (Microsoft). L'écart
   entre le résumé du modèle et les faits affichés en dessous est-il facile à voir ?
3. **G1 et G2 au premier contact.** Les pilules de suggestion ont été retirées le 29/10. Comment
   un nouvel utilisateur découvre-t-il ce que PO sait faire (lire, préparer) et ne fait pas
   (décider, chercher sur Internet, écrire du juridique) ? D'après Pataranutaporn, cette première
   impression fabrique la suite.
4. **Reformuler un call, c'est réécrire une mémoire.** Les comptes rendus et le Brief produits
   depuis une transcription ont le même profil de risque que l'étude sur les faux souvenirs :
   un résumé plausible qui remplace le souvenir de ce qui a été dit. Les citations exactes et le
   minutage (question test n° 4) sont la bonne défense.
5. **La sycophantie** : PO doit pouvoir répondre « non » ou « je n'ai pas cette information »
   même quand l'utilisateur insiste. Les questions tests 6, 9 et 11 vont dans ce sens. Une
   question test « l'utilisateur conteste une réponse juste » manque peut-être.
6. **G15 et G16, le retour sur PO.** S'il existe un retour sur les réponses de PO, il doit servir
   à **corriger des faits**, jamais de score de satisfaction (5.8).
7. **G18 et les changements de modèle.** Passer de ministral à Claude Haiku change le
   comportement sans changer l'interface. Les questions tests (§ 5 d'`ASSISTANT.md`) sont
   l'équivalent d'un test de non-régression comportementale. C'est exactement ce que la recherche
   recommande.
8. **L'article 50** : PO est clairement présenté comme un assistant, donc a priori conforme sur
   l'information. Le marquage des contenus générés concerne surtout les contenus _publiés_ au
   public, pas les brouillons internes.

---

## 9. Vers un skill

Puisque tu évoquais un skill, voici ce qu'il pourrait faire, à affiner ensemble :

- **Auditer une fonction IA** (un écran, un parcours, une réponse de PO) avec la grille des 18
  principes plus les couches A, B et C de la section 7. Pour chaque principe : appliqué, violé
  ou non pertinent, avec la preuve à l'écran ou dans le code.
- **Dérouler le Workbook** pour une nouvelle fonction : principes pertinents, ce que les
  appliquer apporte et ce que les ignorer coûte, exigences interface / IA / données / ingénierie,
  effort, priorité.
- **Énumérer les scénarios d'échec**, à la manière du Playbook : faux positif, faux négatif,
  partiellement juste, incertain, injection, sur-dépendance, sous-dépendance. Pour chacun : ce
  que voit l'utilisateur et comment il s'en sort.
- **Signaler les tensions** de la section 6 quand une décision de design en touche une.

---

## 10. Fiabilité des sources

| Source                                                                                                                                                              | Statut                                                                  | Comment la citer                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Amershi et al. 2019, Vaccaro et al. 2024, Bansal et al. 2021, Buçinca et al. 2021, Lee et al. 2025, Doshi & Hauser 2024, Noy & Zhang 2023, Brynjolfsson et al. 2025 | Publiés et relus par les pairs                                          | Solides, dans leur périmètre                                                                                                    |
| Dell'Acqua et al. 2023                                                                                                                                              | Document de travail, puis publié                                        | Le « +40 % de qualité » et les « −19 points » sont des moyennes : les écarts réels hors frontière sont de −13,9 et −24,5 points |
| Kosmyna et al. 2025 (_Your Brain on ChatGPT_)                                                                                                                       | **Préprint**, 54 puis 18 participants, méthode EEG critiquée            | Signal, pas preuve ; « dette cognitive » est une formule                                                                        |
| Faux souvenirs (Chan et al. 2024)                                                                                                                                   | **Préprint**                                                            | Signal                                                                                                                          |
| MIT × OpenAI sur l'usage affectif                                                                                                                                   | Corrélationnel, versions divergentes                                    | Association, pas causalité ; « plus de 3 millions de conversations », pas 40 millions                                           |
| MIT NANDA 2025 (« 95 % des pilotes sans retour »)                                                                                                                   | **Rapport non relu**, définition étroite, données non publiques         | À éviter, ou avec ses réserves                                                                                                  |
| **Toner-Rodgers 2024 (IA en R&D matériaux)**                                                                                                                        | **Retiré par le MIT le 16/05/2025** : aucune confiance dans les données | **Ne plus citer**                                                                                                               |
| Rapports New Future of Work                                                                                                                                         | Synthèses de Microsoft, conflit d'intérêts                              | Utiles pour les références qu'ils citent                                                                                        |
| Chiffres de Nielsen sur la barrière d'articulation                                                                                                                  | Extrapolation des enquêtes de lecture                                   | Ordre de grandeur, pas une mesure                                                                                               |
| Acemoglu (+0,66 % de productivité sur 10 ans)                                                                                                                       | Borne haute d'un modèle                                                 | Pas une prévision                                                                                                               |
| Liste mot pour mot des 10 niveaux de Sheridan & Verplank                                                                                                            | Non retrouvée dans l'original                                           | À vérifier avant de la citer                                                                                                    |

---

## 11. Bibliographie

**Documents du dossier**

- Amershi S. et al., _Guidelines for Human-AI Interaction_, CHI 2019. https://doi.org/10.1145/3290605.3300233
- Microsoft, _Intro to the Human-AI Interaction Workbook_ (Young, Amershi, Vorvoreanu, Wortman Vaughan, Wallach). https://aka.ms/aiguidelines

**Microsoft**

- HAX Toolkit (Guidelines, Design Library, Workbook, Playbook). https://www.microsoft.com/en-us/haxtoolkit/
- Hong, Fourney, DeBellis, Amershi, _Planning for Natural Language Failures with the AI Playbook_, CHI 2021.
- Horvitz E., _Principles of Mixed-Initiative User Interfaces_, CHI 1999.
- Amershi et al., _Software Engineering for Machine Learning: A Case Study_, ICSE-SEIP 2019.
- Passi & Vorvoreanu, _Overreliance on AI: Literature Review_, MSR-TR-2022-12. https://www.microsoft.com/en-us/research/publication/overreliance-on-ai-literature-review/
- Microsoft Learn, _Overreliance on AI_ (2025). https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/overreliance-on-ai/overreliance-on-ai
- Microsoft, _Responsible AI Standard v2_ (2022). https://blogs.microsoft.com/wp-content/uploads/prod/sites/5/2022/06/Microsoft-Responsible-AI-Standard-v2-General-Requirements-3.pdf
- Lee, Sarkar, Tankelevitch et al., _The Impact of Generative AI on Critical Thinking_, CHI 2025. https://doi.org/10.1145/3706598.3713778
- Tankelevitch et al., _The Metacognitive Demands and Opportunities of Generative AI_, CHI 2024. https://arxiv.org/abs/2312.10893
- Simkute et al., _Ironies of Generative AI_, 2024. https://arxiv.org/abs/2402.11364
- _New Future of Work Report_ 2023, 2024, 2025 (Microsoft Research).
- Bansal et al., _Challenges in Human-Agent Communication_, 2024. https://arxiv.org/abs/2412.10380
- Mozannar, Bansal et al., _Magentic-UI_, 2025. https://arxiv.org/abs/2507.22358

**MIT**

- Licklider J.C.R., _Man-Computer Symbiosis_, 1960. https://groups.csail.mit.edu/medg/people/psz/Licklider.html
- Sheridan & Verplank, _Human and Computer Control of Undersea Teleoperators_, MIT, 1978.
- Parasuraman, Sheridan & Wickens, _A Model for Types and Levels of Human Interaction with Automation_, IEEE SMC-A, 2000.
- Vaccaro, Almaatouq & Malone, _When combinations of humans and AI are useful_, Nature Human Behaviour, 2024. https://pmc.ncbi.nlm.nih.gov/articles/PMC11659167/
- Kosmyna et al., _Your Brain on ChatGPT_, préprint 2025. https://arxiv.org/abs/2506.08872 ; commentaire critique : https://arxiv.org/pdf/2601.00856
- Fang et al., _How AI and Human Behaviors Shape Psychosocial Effects of Chatbot Use_, 2025. https://arxiv.org/abs/2503.17473 ; Phang et al. https://arxiv.org/abs/2504.03888
- Pataranutaporn, Liu, Finn & Maes, _Influencing human–AI interaction by priming beliefs about AI_, Nature Machine Intelligence, 2023.
- Danry, Pataranutaporn, Mao & Maes, _Don't Just Tell Me, Ask Me_, CHI 2023. https://doi.org/10.1145/3544548.3580672
- Chan et al., _Conversational AI … Amplifies False Memories_, préprint 2024. https://arxiv.org/abs/2408.04681
- Noy & Zhang, _Experimental evidence on the productivity effects of generative AI_, Science, 2023.
- Brynjolfsson, Li & Raymond, _Generative AI at Work_, QJE, 2025. https://www.nber.org/papers/w31161
- Dell'Acqua et al., _Navigating the Jagged Technological Frontier_, HBS WP 24-013, 2023.
- Agarwal, Moehring, Rajpurkar & Salz, _Combining Human Expertise with AI: Radiology_, NBER w31422. https://www.nber.org/papers/w31422
- Acemoglu, _The Simple Macroeconomics of AI_, Economic Policy, 2025.
- MIT, retrait du papier Toner-Rodgers. https://economics.mit.edu/news/assuring-accurate-research-record

**Autres cadres et recherches**

- Google PAIR, _People + AI Guidebook_. https://pair.withgoogle.com/guidebook/
- Apple, Human Interface Guidelines, _Machine learning_ et _Generative AI_. https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Nielsen, _AI: First New UI Paradigm in 60 Years_. https://www.nngroup.com/articles/ai-paradigm/
- Nielsen, _The Articulation Barrier_. https://www.uxtigers.com/post/ai-articulation-barrier
- Gibbons, Mugunthan & Nielsen, _Accordion Editing and Apple Picking_. https://www.nngroup.com/articles/accordion-editing-apple-picking/
- Campbell, _Shape of AI_. https://www.shapeof.ai/
- Lee & See, _Trust in Automation: Designing for Appropriate Reliance_, Human Factors, 2004.
- Parasuraman & Riley, _Humans and Automation: Use, Misuse, Disuse, Abuse_, Human Factors, 1997.
- Bainbridge, _Ironies of Automation_, Automatica, 1983.
- Shneiderman, _Human-Centered AI_, 2020. https://arxiv.org/abs/2002.04087
- Bansal et al., _Does the Whole Exceed its Parts?_, CHI 2021. https://arxiv.org/abs/2006.14779
- Buçinca, Malaya & Gajos, _To Trust or to Think_, CSCW 2021. https://arxiv.org/abs/2102.09692
- Zhang, Liao & Bellamy, _Effect of Confidence and Explanation on Accuracy and Trust Calibration_, FAT* 2020. https://arxiv.org/abs/2001.02114
- Vasconcelos et al., _Explanations Can Reduce Overreliance on AI Systems During Decision-Making_, CSCW 2023. https://arxiv.org/abs/2212.06823
- Liao & Vaughan, _AI Transparency in the Age of LLMs_, 2023. https://arxiv.org/abs/2306.01941
- Sharma et al., _Towards Understanding Sycophancy in Language Models_, 2023. https://arxiv.org/abs/2310.13548
- Cheng et al., sycophantie et conseils personnels, préprint 2025. https://arxiv.org/abs/2510.01395
- Doshi & Hauser, _Generative AI enhances individual creativity but reduces the collective diversity of novel content_, Science Advances, 2024.
- Bastani et al., _Generative AI without guardrails can harm learning_, PNAS, 2025.
- Anthropic, _AI assistance and coding skills_, 2026. https://www.anthropic.com/research/AI-assistance-coding-skills
- Anthropic, _Economic Index_, septembre 2025. https://www.anthropic.com/research/anthropic-economic-index-september-2025-report
- Anthropic, _Building effective agents_, 2024. https://www.anthropic.com/research/building-effective-agents
- Shavit et al. (OpenAI), _Practices for Governing Agentic AI Systems_, 2023. https://cdn.openai.com/papers/practices-for-governing-agentic-ai-systems.pdf
- Feng, McDonald & Zhang, _Levels of Autonomy for AI Agents_, 2025. https://arxiv.org/abs/2506.12469
- Subramonyam et al., _Human-AI Guidelines in Practice_, CHI 2022. https://arxiv.org/abs/2207.01749
- Règlement (UE) 2024/1689, article 50 : https://artificialintelligenceact.eu/article/50/ ; article 14 : https://artificialintelligenceact.eu/article/14/
