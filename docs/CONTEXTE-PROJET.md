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
| 1   | Cadrage                  | Le **Brief** (versionné, validé) : objectif, temporalité, budget & contraintes, équipe, état de départ, cadre juridique ; puis le Plan du Projet |
| 2   | Stratégie de lancement   | La **Stratégie** : positionnement, publics, narratif, dispositif, livrables engagés, calendrier. Export éditorial : le **Plan de sortie** |
| 3   | Conception               | Le **Dossier de conception** : direction créative, cover, capsules, clip                                                                  |
| 4   | Production & préparation | Organisation et fabrication : lieux, équipe, planning, exécution                                                                          |
| 5   | Livraison & lancement    | Mise en ligne via le distributeur, smartlink, activation                                                                                  |
| 6   | Défense                  | **Périmètre à clarifier avec le client** — voir § 10                                                                                      |
| 7   | Bilan & clôture          | Streams, vues, performance, stats de sortie                                                                                               |

### Workflows spécialisés : Master et Juridique (précision du DG, 04/10/2026)

Les sept étapes restent **la colonne vertébrale** du projet. Rien ne les remplace.

- **Le Cadrage est global** : il cadre le projet de A à Z (objectif, budget, échéance,
  équipe, responsables, livrables) et **initialise toutes les dimensions**. Par exemple :
  qui mixe, qui masterise, date du master final, participants, besoins juridiques déjà
  identifiés, date de distribution souhaitée.
- **Master et Juridique sont des workflows spécialisés.** Ils sont rattachés au Workflow du
  projet et **alimentés par le Brief**. Ils détaillent l'exécution :
  - Master : réception du mix, retours, versions, validation, master final ;
  - Juridique : personnes, droits, contrats, splits, clearances, formalités, suivi.

  Ils ne sont **ni une étape du cycle, ni un outil transversal**.
- **En parallèle** : la Stratégie peut avancer pendant que Master et Juridique tournent. On
  n'attend pas qu'un workflow soit fini pour en commencer un autre.
- **Les dépendances relient le tout.** La Livraison n'avance que quand ses prérequis sont
  prêts : master final, métadonnées, éléments juridiques, assets.
- **Chaque workflow spécialisé a son propre parcours interne**, distinct des sept étapes.
  Celui du Juridique : État des lieux → Cadrage juridique → Confirmation → Plan d'action →
  Suivi.
- **Planning, Budget, Validations et Activité sont des outils transversaux** : on n'y range
  ni Master ni Juridique.
- **Disposition** : placer Master et Juridique sous Workflow est une proposition, pas une
  décision figée. Seule cette logique fonctionnelle compte.

### Cadrage intelligent : décisions du 06/10/2026

Ticket « Cadrage intelligent d'un projet » (30/09/2026), réalisé le 06/10/2026
(`docs/ARCHITECTURE.md` § 6 et § 6 ter). Quatre points que le ticket laissait ouverts ont
été tranchés :

- **Six dimensions**, comme le ticket : Objectif, Temporalité, Budget & contraintes, Équipe,
  État de départ, Cadre juridique. **Les besoins & activations restent dans 01 Objectif**
  (« Ce qu'il faut produire ») : le DG veut que le Cadrage couvre les livrables, et la
  Stratégie en part pour ses leviers.
- **Vraies dates confirmées** pour la Temporalité (date cible, échéances dont le master
  final), toujours choisies ou confirmées par une personne. PO cite la phrase dite ; le code
  ne lit qu'une date complète, année comprise ; sinon, une personne choisit la date.
- **Stratégie, Master et Juridique attendent le Plan du Projet** : ils ne démarrent plus
  seuls après le Cadrage, mais depuis « Lancer le plan ». Un workflow déjà commencé avant
  cette règle reste ouvert.
- **« Lancer le plan »** plutôt que « Lancer le Projet » : un projet est déjà « lancé » quand
  le chef de projet l'accepte.

**Points à trancher avant de coder le Juridique.** Ils viennent de la relecture des
tickets du 30/09 (Cadrage, Master, Juridique 01 à 08) :

- **Le Brief comme source.** Les tickets Master et Juridique 01 ne citent pas le Brief de
  cadrage parmi leurs sources. D'après la logique ci-dessus, ils doivent en partir
  (dimension « Cadre juridique », mixeur, échéances).
- **Ce que le Cadrage intelligent transmet au Master** (audit du 06/10/2026). La précision
  du DG ci-dessus dit que le Cadrage initialise « qui mixe, qui masterise, date du master
  final ». Le ticket Cadrage ne les nomme pas : il parle seulement d'« intervenants,
  validateurs » (04 Équipe) et de « date cible, échéances imposées » (02 Temporalité).
  Aujourd'hui, le Master ne lit rien du Cadrage : le Brief Mix/Master fait saisir ces
  valeurs. Deux choix sont retenus pour le Cadrage intelligent :
  - **04 Équipe porte les rôles Mix et Mastering** (personne du Réseau). Le Brief Mix/Master
    les reprend pré-remplis, puis l'ingénieur choisi est crédité sur les titres, ce qui le
    rend visible au Juridique (déjà en place depuis le Brief).
  - **02 Temporalité porte la date du master final** quand il y a une sortie musicale. Elle
    alimente le calendrier proposé par le Brief Mix/Master.
  Le « Cadrage Master » du ticket Master (§ 3) **reste** : il part de ces valeurs et les fait
  confirmer, au lieu de les redemander. Il ne remplace pas le Cadrage global.
- **Juridique 08 (Récap Sortie)** relève de l'étape **Livraison**, pas du Juridique. La
  brique « Distribution », que le Master interroge, n'a pas de ticket.
- **Ce qui bloque la sortie (ReadinessPolicy du ticket 08)**. Le ticket dit que
  « blocking_release est déterminé par ReadinessPolicy » et ne tranche que sa fixture : un
  accord non sécurisé (« Humanisme sans autorisation ») est bloquant, une facture absente
  ne l'est pas, la SACEM « peut être bloquante selon la politique configurée ». Rien n'est
  dit des fiches, des contrats, des répartitions, ni du Master ou de la Stratégie. *Choix
  par défaut en attendant (07/10/2026)* : la Vue d'ensemble ne marque « Bloque la sortie »
  que les accords non sécurisés ; tout le reste est montré comme du suivi.
- **Juridique 07 (moteur de dépendances)** sert à tout le projet. Les tickets 02 à 05 en
  dépendent alors que le 07 dépend d'eux : il faut une base minimale dès le premier
  workflow spécialisé.
- **Un seul vocabulaire de plan**, au lieu de trois :
  - Plan du projet : Focus / Ensuite / Pendant ce temps / À anticiper ;
  - Plan d'action juridique : À lancer maintenant / En cours / À venir ;
  - Suivi : À traiter maintenant / En attente externe / Incident / Progression silencieuse.
- **Un seul classement de confiance** : le Cadrage en a 3 (connu / à confirmer /
  manquant), Juridique 01 en a 7. « SIMULÉ » relève des données de test, pas de la
  production.
- **Étendre plutôt que dupliquer** ce qui existe déjà : Réseau (ticket 02), Contrats
  (ticket 03), Splits de la fiche master (ticket 04), Déclarations SACEM / SCPP (ticket 06).
- **Une personne à la fois artiste du catalogue et créditée** (Dioo, interprète et auteur
  dans le cas Piégée) : sa ligne d'interprète est connue par sa fiche artiste, mais sa ligne
  d'auteur proposerait « Ajouter au Réseau », ce qui recréerait un doublon. Les tickets ne
  disent pas comment relier les deux qualités d'une même personne.
- **Qui pilote le Juridique** : les tickets confient des branches à une RAF / juriste, un
  poste qui n'existe pas (§ 12). C'est une exception à « seul le responsable du projet
  écrit ». *Choix par défaut en attendant (04/10/2026)* : une permission `manage_legal`
  donnée au DG et aux chefs de projet (`docs/ARCHITECTURE.md` § 8 sexies).

Modules transversaux présents dans la navigation du prototype : Accueil, Projets,
Talents, Musique, Budgets, Calls, Idées, Équipe, Paramètres. Onglets au sein d'un
projet : Vue d'ensemble, Travail, Budget, Calls, Fichiers, Historique.

### Cadrage et Plan du projet : décisions du 19/10/2026 (lot 2 « Projet complet »)

Prises en codant le proto (`docs/projet-complet/framing.md`), à confirmer par Sacha :

- **Recommandation du départ** (règle du proto, remplace celle du 11/10) : « Préparer un échange » est
  recommandé quand manquant + à confirmer > connu ; sinon « Commencer le cadrage ». Les cartes gardent
  leur ordre ; la raison n'est dite que pour l'échange.
- **« Lancer le plan » démarre tous les workflows du plan**, quelle que soit leur colonne (Focus,
  Ensuite, Pendant ce temps, À anticiper = ordre de priorité, plus un verrou). Avant le plan, **tous**
  les workflows sont verrouillés (Master, Juridique, tout le Marketing, Distribution), sauf ce qui avait
  commencé avant.
- **Le plan propose huit workflows** (Stratégie, Conception, Production, Activations, Suivi & bilan,
  Master, Juridique, Distribution) ; les lignes-notes d'« À anticiper » (rôles à trouver, enveloppe,
  points ouverts) ne sont plus proposées : le proto n'en a pas.
- **Décision de la direction** : cases « Dimensions à revoir » + commentaire (proto) ; les demandes
  détaillées (PROJ-UX-06) restent possibles, repliées.
- **Le compte rendu de l'échange de cadrage** se lit dans l'étape par dimension : ce que PO en a proposé
  et ce que le Cadrage en a fait ; le résumé aux participants part quand tout est tranché.
- **La dictée** reste dans « Les 6 dimensions » (bouton sur la ligne de progression).
- Écart au mot du ticket : « Écrire moi-même » n'est plus un bouton pour une information manquante,
  le champ « Votre réponse * » est ouvert d'emblée (proto).

### Points à trancher : les autres rôles (test UX du 09/10/2026, section 5)

Décisions prises en construisant le lot (`docs/ARCHITECTURE.md` § 8 undecies), à confirmer :

- **Budget et directeur créatif.** Lignes de budget, leurs notes et tarifs du Brief Mix/Master
  sont réservés au responsable et à la direction. Restent lisibles par l'équipe créative :
  l'**enveloppe du Cadrage** (elle fait partie du Brief, partagé avec l'équipe), ce qui se dit du
  budget **dans les calls** (transcriptions), et les colonnes de tarif de `master_briefs` par
  l'API (masquées à l'écran). À trancher : l'enveloppe sort-elle du Brief pour l'équipe créative ?
- **Conservation des données d'une fiche** (`/f/…`) : la page dit « tant que les titres du projet
  sont exploités, puis le temps que la loi impose au label » (RGPD art. 13 demande une durée ou
  ses critères). Durée exacte à valider avec le label.
- **Dépôt de l'ingénieur** : 50 Mo au plus (limite du bucket), un WAV long la dépasse. Relever la
  limite (offre Supabase) ou accepter un lien externe ?
- **Participants d'un call de projet** (tranché par Sacha le 28/10/2026) : l'équipe du projet, la
  direction, et tout directeur créatif, qui **rejoint l'équipe créative du projet** en étant invité
  (un DC oublié à la création). Un chef de projet d'un autre projet ne s'invite que par le Réseau
  (e-mail), pour qu'un invité dans l'app voie toujours le projet.

### Points à trancher : retours BUG + UX consolidés (11/10/2026)

- **Quel document pour quel rôle** (PROJ-BUG-03). Le ticket donne les statuts (existant, à
  vérifier, à préparer, non nécessaire, non applicable) et les principes (un intervenant
  opérationnel n'est pas une partie contractuelle par défaut, un accord de production n'est pas
  un contrat sans preuve), mais aucune règle « tel rôle → tel document ». Aujourd'hui chaque
  partie est qualifiée par une personne ; le code ne propose un statut que sur preuve (un
  contrat de Contrats dont la personne est partie). Une règle par rôle (producteur, mixeur,
  masteriseur…) est à donner par le label, avec sa source.
- **« Continuer sans enregistrement »** (PROJ-BUG-01). Un call sans audio n'a pas d'état
  aujourd'hui (pas de « tenu sans enregistrement ») : à définir avant d'offrir ce choix.
- **Décisions prises sans le ticket pour les lots 6 à 11 et UX-01** (12/10/2026), à confirmer :
  une demande de correction **facultative** du Brief ne bloque rien (seules les obligatoires
  bloquent l'envoi et la validation) et la seule dérogation à une demande obligatoire est sa
  **levée** motivée par le valideur ; le Brief Mix/Master **reste modifiable après la
  transmission** (un nouvel envoi porte les changements) ; envoyer un dossier de mix **sans stems**
  demande une case « Envoyer sans stems » (pas de raison écrite) ; « même ingénieur » = **même
  contact du Réseau** ; un projet refusé ou en précision demandée est rangé dans **Actifs** ; seul
  un fichier à l'état « Mix » peut être déclaré mix final sans nouveau mixage ; les formats
  acceptés au dépôt de l'ingénieur sont WAV, AIFF, FLAC, MP3, M4A, AAC, OGG.

### Points à trancher : Juridique allégé (test UX du 09/10/2026, section 6)

- **Envoi d'e-mails depuis PDS OS** : aujourd'hui un `mailto:` pré-rempli ouvre la messagerie de
  l'utilisateur. Un vrai envoi demande un fournisseur (Resend, Postmark…), un domaine vérifié et
  une clé serveur : choix du fournisseur et du domaine d'envoi.
- **Échéances par démarche** (fiches + 7 j, emprunts − 45 j, contrats et répartitions − 30 j,
  SACEM − 15 j) : validées le 10/10/2026 sans ticket, à ajuster avec l'usage.
- **Parts Phono reprises de la répartition** : validé le 10/10/2026, affiché « à vérifier ». À
  confirmer avec un juriste pour les œuvres où le partage Phono diffère de la répartition de
  l'édition.

### Points à trancher : Marketing / Activations (tickets du 11/10/2026)

Construit sur le socle MVP des trois tickets (`docs/ARCHITECTURE.md` § 8 duodecies). Non prévu
par les tickets ou laissé « à confirmer », donc décidé provisoirement ou reporté :

- **Validateur PDS** : DG ou directeur créatif du projet ; la séparation des rôles (interdire
  l'auto-validation) n'est pas activée. À confirmer avec le DG.
- **Accord express** : valeur probatoire, mentions, durée de conservation et base légale à valider
  par le Juridique avant toute donnée réelle (exigence du ticket). L'adresse IP n'est pas gardée.
- **Paiement administratif** : rôle « Finance / administration » absent de l'app ; les montants et
  justificatifs sont lus par le responsable du projet et la direction (`can_read_project_budget`).
- **Agence** : Google Sheets lu par son export CSV public (le tableau doit être partagé « lecteur
  avec le lien ») ; pas de synchronisation planifiée ni d'OCR des PDF (après MVP).
- **Réseau** : fusion de doublons, historique daté des rattachements d'un journaliste à ses médias,
  demandes RGPD (effacement, restriction) : non construits.
- **Bilan Marketing** : le ticket « Bilan, validation et clôture » n'est pas codé ; Suivi & bilan
  lit déjà les trois axes et les réserves de chaque activation.

### Points à trancher : Distribution (lot 10, 19/10/2026)

- **Écart master final → sortie** : le proto montre 14 jours ; aucun ticket ni code ne le fixe.
  Seule règle tenue : une échéance du Cadrage (master final) ne suit pas la date visée. Sans
  date de master final, l'en-tête n'en montre pas.
- **Précommande** : proposée seulement si la Stratégie a un temps fort « pré-save » /
  « précommande » ; pas de règle « 3 semaines avant » inventée.
- **Master déjà au Catalogue sans workflow Master** : gardé « Disponible » (non bloquant) comme
  avant ; le proto bloque tant que le Master ne l'a pas validé.
- **« Prêt pour la sortie » du Juridique** : montré comme prérequis de l'étape Dépôt (✓/○ avec sa
  source), sans verrouiller le dépôt ; seul un emprunt non sécurisé bloque la soumission.
- **UPC** : « Attribué par The Orchard au dépôt », pas encore de champ pour l'enregistrer.
- **Smartlink** : retiré de l'écran Distribution (route publique gardée) ; Distribution ou
  Marketing, à trancher avec la décision Odesli / maison.
- **Ordre Reçu → Accepté → Livré** à la saisie : aide de l'écran seulement, la base ne déduit rien.
### Master : décisions du lot 8 (19/10/2026, proto « Projet complet »)

- « Voix définitives » : **déclaré par le responsable** à la confirmation de la source (aucune donnée du
  Cadrage ne le porte). « Production définitive » n'est pas affichée faute de source réelle (point à
  trancher : une dimension du Brief de cadrage ?).
- Source détectée = la version la plus récente (maquette ou mise à plat), comme le proto et le ticket.
- Dérogation sans pistes : **raison écrite obligatoire** (proto ; remplace la case seule du 12/10).
- « Demander une modification » : motif **toujours** obligatoire (règle 6, proto).
- Retours transmis sans décider : texte écrit par le code avec l'auteur de chaque ligne, sans PO.
- Validatrice par défaut : la direction créative désignée au Cadrage › Équipe, sinon celle du projet,
  sinon le responsable. Même ingénieur pour le mastering par défaut quand un seul est connu.
- Rouvrir une décision : le mix tant qu'aucune version masterisée n'est revenue sur le titre (le dossier du
  mastering part seul avec le mix validé, 05/11/2026) ; le master tant que la Distribution n'a pas livré.
- Personnes du Master (ingénieurs, valideur) : le responsable dans le Brief, le DG pour corriger une erreur,
  tant qu'aucune version du tour n'est validée (Ibé, 04/11/2026).
- Le lien privé du Master est gardé chiffré et relisible par le responsable (règle 19).
- **Direction artistique** : demandée par la base aux directeurs créatifs du projet dès que le Brief démarre
  « directement » sans elle, qu'ils valident les versions ou non (ticket § 6, proto `master-v2` ; avant le
  06/11 elle ne partait que si le valideur était un DC, et le valideur est le chef de projet par défaut
  depuis le 02/11). Aussi pour un DC ajouté ensuite ; jamais au responsable, jamais deux fois à la même
  personne, plus une fois un mix revenu ou le projet archivé. La ligne du Brief dit « Demandée à … » puis
  « Réponse de … à ajouter ».
- **Formats de livraison** : propriété de la Distribution (ticket § 14), réglés par la direction dans
  Réglages › Distribution (une ligne par organisation : un seul distributeur en V1). Le Brief, le dossier
  de l'ingénieur et le PDF les reprennent quand le Brief n'en dit pas d'autres, source « Distribution ›
  exigences de The Orchard ». Décision du 06/11 : Distribution n'avait aucune exigence audio à lire.
- **Tarif habituel d'un ingénieur** (ticket § 4, proto) : ce que PDS a engagé la dernière fois avec lui pour ce
  rôle, appris par la base à « Accepter le tarif » (`network_engineer_rates`), jamais saisi ni deviné. Choisir
  l'ingénieur dans le Brief le pré-remplit (sauf tarif tapé à la main), source « Réseau · tarif habituel de … ».
  Lisible seulement par ceux qui voient un budget (chefs de projet, direction), pas sur la fiche du contact.

### Finances unifiées : décisions du 20/10/2026 (branche `pc/f1-finance`)

Prises sans ticket plus précis, cohérentes avec le proto « Projet complet » (`invBlock`, `payList`,
`invControl`) et `master-v2.html` ; à confirmer par Ibé :

- **Une seule facture par chose payée** : l'ingénieur (ses rôles du Master) et chaque contrat signé avec
  rémunération ont chacun leur facture, dans une seule table ; mêmes règles partout (écart motivé,
  échéance à 30 jours, RIB vérifié par téléphone s'il change, payée par la direction seule avec
  date et preuve, jamais de virement par l'app).
- **Le RIB est demandé et gardé** pour toute facture (il était refusé côté Juridique ; confirmé par Sacha le 20/10/2026) : lu par la direction seule,
  demandé avec la première facture ; le proto du Juridique le montre (« Virement sur », « Mon RIB a changé »).
- **Le responsable du projet lit la facture d'un contrat** comme le budget (proto : la cheffe de
  projet voit la facture et ajoute une facture reçue autrement), jamais le RIB ; le Juridique qui ne
  lit pas le budget voit seulement où elle en est.
- **« Ajouter une facture reçue autrement »** : le responsable ou la direction, avec « Reçue le ».
- **« À payer »** : sur le Budget du projet (direction seule, payable sur place) ; tous projets : les
  actions « Payer la facture de X » du Travail. Pas de page à part.
- **Budget** : un contrat signé avec rémunération crée sa ligne « Engagé » (libellé du contrat) ; une
  facture reçue donne son montant à ses lignes (« Facturé », le convenu gardé), puis « Payé » ; ces
  lignes ne se modifient plus à la main (montant, état, suppression).
- **« Prêt pour la sortie »** : une facture reçue et non payée est « À suivre », jamais bloquante ;
  une facture encore attendue n'y figure pas.
- **Tout montant est HT** et le dit (« 1 100 € HT »), un seul formateur.

### Master, le reste : décisions du 20/10/2026 (branche `pc/r1-master`)

Prises sans tickets plus précis, cohérentes avec le proto `master-v2.html` ; à confirmer par Ibé :

- **La direction = la permission `validate`** (directeur général) : elle lit les RIB et les preuves de
  virement, confirme un RIB, marque une facture payée, arbitre un retard escaladé. Le responsable du
  projet lit la facture et son PDF (comme le budget), jamais un RIB.
- **Premier RIB** donné par l'ingénieur sur son propre lien avec sa première facture : gardé tel quel
  (proto « gardé dans votre fiche ») ; un RIB **changé**, ou **saisi par un membre** d'après un e-mail,
  n'est jamais utilisé avant la vérification par téléphone de la direction.
- **Facture demandée** quand chaque titre du tour a son Master final, aux seuls ingénieurs qui ont reçu un
  lien (l'ingénieur maison ne facture pas) ; PDS OS n'envoie pas l'e-mail de demande : la carte est sur
  son lien, l'étape le dit.
- **« Facturer à »** : identité de facturation de l'organisation saisie dans les réglages
  (administration) ; vide, la carte ne l'affiche pas.
- **L'artiste qui écoute** = les contacts du Réseau liés à l'artiste du projet ou d'un de ses titres ;
  pas de lien `/v/` à part : sa page par personne `/c/`. Le fichier d'une version en écoute peut être signé
  par cette page tant que la version n'est pas décidée (chemin non devinable, donné par la page seule).
- **Rouvrir le master** : refusé une fois la sortie livrée par la Distribution (`delivered_on`).
- **Un livrable déposé** est un fichier du titre (catégorie « autre », ou « pistes » pour les stems),
  jamais une version audio.

### Master : qui fait les retours sur le mix (retour d'Ibé, 02/11/2026)

- « Pouvoir désigner, lors de la création d'un projet, la personne qui fait les retours sur le mix » :
  champ « Qui valide les versions du master » du formulaire « Nouveau projet », pour une sortie musicale
  seulement (le seul type qui a un Master), choisi parmi le chef de projet et les directeurs créatifs
  choisis au-dessus, **le chef de projet par défaut**. Même règle que le validateur du Brief.
- Le Brief Mix/Master le reprend à sa création et reste l'endroit où il change ensuite. Décision prise
  sans le ticket : si la personne n'est plus dans l'équipe du projet à ce moment-là (transmission
  refusée puis faite à un autre, directeur créatif retiré), le Brief part du responsable du projet.

### Vocabulaire fixé

Trois objets, trois noms. Ne jamais en introduire d'autres dans l'interface.

- **Brief** — livrable du Cadrage
- **Stratégie** — livrable de la Stratégie de lancement ; le **Plan de sortie** en est
  la traduction éditoriale exportable
- **Dossier** — livrable de la Conception

**Termes bannis**, présents dans le prototype et source de confusion : _pancarte_,
_consolidation_, _récapitulatif_ utilisé comme nom d'objet, _mise en marché_,
_document de stratégie_ en doublon de _Stratégie_.

**Une chose, un nom** (test UX du 09/10/2026, section 7) :

- **Avancement** : Cadrage → plan du projet (sur la Vue d'ensemble) → workflows Master,
  Juridique, Marketing, Distribution. Les 7 étapes restent en base mais ne s'affichent plus :
  « Où en est le projet » dit « Cadrage », « Plan du projet », « Marketing · Conception »,
  « Distribution » (`lib/projects/progress.ts`). « Défense » n'est jamais dite (non décidée).
- **Titre** pour un morceau ; **master** seulement pour l'état audio (Master, Master final) et
  le workflow Master. **Sortie**, jamais « release ».
- **Date de sortie visée** (projet musical) ou **Échéance du projet** (autre) : un seul nom,
  partout (`projectDateLabel`) ; plus d'« Échéance principale ».
- **Créer le projet** (il est transmis au chef de projet choisi) ; **Répondre et
  transmettre** après une question, **Transmettre à quelqu'un d'autre** après un refus.
- **Contrats à prévoir** (plus « cartographie ») ; **plan d'action** pour le Juridique,
  **plan du projet** pour la Vue d'ensemble.
- **Créer l'échange** pour un échange préparé (plus « Lancer »).
- **Rôles** : mêmes libellés dans les crédits, les fiches, les répartitions et le Réseau
  (Auteur·rice (paroles), Compositeur·rice, Réalisateur·rice…) ; « Producteur
  (phonographique) » pour le propriétaire de l'enregistrement. Avocat·e et Studio ajoutés.
- Barre latérale du projet : **Workflows**, **Pilotage** (Travail, Équipe, Planning, Budget,
  Validations, Activité), **Ressources** (Calls, Livrables, Fichiers).

**Reporté** (Sacha, 10/10/2026) : l'accord des postes au genre de chaque membre (« Directrice
créative » pour Nora) ; aujourd'hui les postes restent au masculin.

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
   Habillage seul, 27/09/2026 : la sidebar contextuelle d'un projet (onglet « Workflow »)
   affiche déjà les 7 libellés en fil d'Ariane (`lib/ui/workflow-steps.ts`), mais aucune
   des 7 n'existe en base — 3 seulement ont une page (Cadrage, Stratégie, Sortie). Les
   vraies étapes restent `ProjectStage`, visibles sur la Vue d'ensemble du projet. Ne pas
   lire cet habillage comme une réponse à la question : elle reste ouverte.
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

Décidé le 26/09/2026 : une fois le projet lancé, le premier geste est un **call**
(planifié ou enregistré) : **pas de cadrage sans compte rendu de call**.

### Types et formats de projet (retour n°2, 27/09/2026)

La création suit **Type → Format → objet(s) lié(s) → informations initiales → chef de
projet → Transmettre**. Elle reste légère : ce n'est pas un Cadrage avant le Cadrage.

- **Trois familles** : Musical, Contenu, Événement. **Un partenariat n'est pas un projet**
  (ni type, ni sous-type, ni contexte) : il aura sa propre catégorie plus tard. Les
  anciens projets « partenariat » sont devenus des contenus.
- **Musical** : un format (Single, EP, Album, Mixtape, Compilation, Autre) puis les masters
  du Catalogue. **Un single rattache exactement un master** ; les autres formats au moins
  un (compilation : plusieurs artistes possibles, lus sur les masters). Le projet ne fait
  que **référencer** ses masters : crédits, splits, fichiers restent sur le master, qui
  peut n'avoir que titre + artiste principal.
- **Contenu** : soit l'édition d'un **format PDS existant** (« PDS Mic »), soit un
  **contenu ponctuel**. **Format ≠ Projet** : le format est durable et enregistré en base
  (`content_formats`, créé depuis le formulaire, jamais codé) ; chaque édition est un
  nouveau projet. Artiste facultatif. Ce qu'un format pourra pré-remplir (structure,
  route, livrables, postes) reste à définir.
- **Événement** : présent dans le modèle, **fermé en V1** (carte « Bientôt », refusé par
  `create_project`) ; les événements créés avant restent consultables et modifiables.
- **Chef de projet** : on choisit la personne, jamais le poste. L'acceptation lance le
  projet (étapes, responsable), le Cadrage devient disponible **sans démarrer tout seul**.
  Direction créative facultative, qui ne donne aucun droit de validation.
- **Échéance** : pour un projet musical, « Date de sortie visée » ; dès que la date prévue
  de l'onglet Sortie existe, **elle fait foi** (décompte de la Stratégie, Planning, où
  l'échéance ne s'affiche plus en double).
- **Budget prévisionnel** : première estimation ; le suivi prévu / engagé / payé vit sur
  la page Budget. Prévu ≠ autorisé ≠ engagé ≠ dépensé.
- **Priorité** : facultative, **utilisée** — les projets en priorité haute passent en tête
  de l'accueil, de Travail et de la liste Projets, avec une pastille « Priorité haute ».
- **Contexte initial** (ex-« Notes de cadrage ») : ce qu'on sait au moment de transmettre,
  matière d'entrée que PO pourra reprendre au Cadrage ; ce n'est pas le Brief.

### Encore ouvert

- ~~Qui affecte le directeur créatif à un projet ; un projet peut-il avoir plusieurs DC ?~~
  Tranché le 26/09/2026 : le DG (tous les projets) et le chef de projet responsable (ses
  projets) ; plusieurs DC par projet. Un DC ne voit que les projets de son équipe créative.
- Un compte s'inscrit **sans poste** ; c'est le DG qui le fixe en l'approuvant.

