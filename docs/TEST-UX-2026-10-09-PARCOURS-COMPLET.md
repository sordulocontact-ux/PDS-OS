# Test UX — parcours complet à 4 testeurs (09/10/2026)

Complète `docs/TEST-UX-2026-10-09.md` (test manuel du même jour, arrêté au Brief). Ici, le
parcours a été mené **jusqu'au master final, à la sortie déclarée et à « Prêt pour la sortie »**.

## Méthode

- **4 testeurs en parallèle**, chacun avec un navigateur par compte (cookies séparés, comme des
  collègues à des bureaux différents), plus un navigateur « personne extérieure » pour les liens
  publics (`/m`, `/f`, `/s`). Ils ne connaissent l'app que par l'écran : pas de code, pas de base.
- **Scénarios de tâches** (buts métier, pas des clics), **parcours cognitif** à chaque étape (« aurais-je
  l'idée ? je vois le contrôle ? je comprends ce qu'il fait ? je sais que ça a marché ? »),
  **heuristiques de Nielsen**, et pour chaque tâche : réussite, **SEQ** (facilité 1-7), détours.
- **Sévérité Nielsen** : 4 = bloque ou perd des données · 3 = majeur · 2 = mineur · 1 = cosmétique.
  Un constat relevé par plusieurs testeurs indépendants est noté **(×n)** : c'est le meilleur
  indicateur de fiabilité.

| Testeur | Scénario | Comptes | Jusqu'où |
| --- | --- | --- | --- |
| A | Single « Lueur » de bout en bout | DG, CP, DC, mixeur externe | **T1 → T12** : master final, sortie déclarée (ISRC), smartlink ; pas de mise en ligne (rien ne le permet) |
| B | EP avec featuring + sample : tout le Juridique | DG, CP, artistes / ayants droit externes | **Jusqu'au bout** : fiche, contrat signé, répartition contestée puis confirmée, emprunt sécurisé, SACEM enregistrée |
| C | Projet de contenu + journée de la DC + PO au quotidien | DG, CP, DC | Brief (bloqué par l'env, voir limites) ; PO, réunion, budget, retours, mobile testés |
| D | La DG au quotidien + recrue sans formation | DG, 2 CP, DC | Tout sauf la validation (bloquée par l'env) |

### Limites (causes d'environnement, écartées des constats)

- **Deux DG actifs** dans la base locale (le compte de test `ux-dg` en plus d'`admin`) :
  `sole_validator` refusait toute validation (`multiple_validators`) pendant ~3 h. Corrigé à
  20:40 (un seul DG) : A et B ont pu finir, C et D étaient déjà clos.
- **Machine saturée** au début (4 tests + une 2ᵉ pile Supabase, charge jusqu'à 190) : timeouts,
  `/unavailable`, une partie des 404. Après correction : pages en 1 à 4 s, actions en 2 à 8 s.
  Seule la **façon dont l'app réagit** à ces pannes est gardée comme constat.
- **Micro simulé** : l'enregistrement est resté muet (onde plate, « 0 Mo ») pour A et C alors qu'un
  essai direct du micro simulé fonctionnait. À revérifier dans un vrai Chrome avant de conclure.

---

## Verdict

Le parcours **va au bout** : un chef de projet peut mener un single du catalogue au master final
et un EP à travers tout le Juridique. Les écrans « guidés » sont le point fort (relecture du
cadrage avec citation, Plan du projet, Brief Mix/Master, panneau d'emprunt, pages publiques sans
compte). **La confiance casse sur trois choses** : des échecs **silencieux** (rien ne s'affiche,
des données se perdent), des **états contradictoires** (deux vérités sur le même écran, « Rien à
valider » quand quelque chose attend), et **PO qui invente ou déforme** (dates, montants, causes).
Les rôles autres que le chef de projet (DG, directeur créatif) n'ont **pas encore leur outil de
travail** : la DG n'a pas de vue d'ensemble ni de file de décisions fiable, la DC ne peut rien
déposer. Enfin, la **fin du parcours manque** : pas de livraison au distributeur ni de clôture.

---

## 1. Bloquants et pertes de données (sévérité 4)

1. **Lien « affiché une seule fois » jamais affiché** (A ×2, B ×2) — Mix / Mastering « Transmettre »
   et Répartitions « Envoyer pour confirmation » : la fenêtre se ferme seule, le lien est perdu ;
   il faut « Relancer » ou « Nouveau lien » (qui annule le premier).
   **Cause vérifiée dans le code** : la server action fait `revalidatePath`, la page se re-rend,
   la ligne change d'état (`!latest` → `latest` dans `package-sections.tsx` ; la répartition passe
   dans « En attente d'un retour »), et le composant qui tient le lien dans son état est
   démonté. « Relancer » marche parce que son bouton reste au même endroit.
2. **Échecs serveur avalés** (×4) — « Envoyer en validation » renvoie `{"ok":false,…}` et la
   fenêtre reste ouverte sans un mot ; le titre est créé **sans son audio** quand l'envoi du
   fichier échoue, formulaire vidé, aucun message (un humain recrée le titre → doublon) ; un crédit
   « Enregistrement… » perdu ; « Lien Spotify » qui revient vide après « Enregistrer ».
3. **Correction d'une fiche de renseignements perdue** (B) — Maya corrige son e-mail : aucun
   « Reçue, à vérifier », rien à accepter ou refuser ; le Réseau garde l'ancien e-mail **mais le
   contrat généré prend le nouveau**.
4. **Avance de 2 000 € disparue** (B) — saisie dans « Négocier » d'un emprunt, absente des
   conditions présentées au DG pour validation (présentées comme « lues par PO »).
5. **Pas de fin de parcours** — Distribution : ni livraison au distributeur, ni passage « en
   ligne » à la main (A) ; Contenu : « Production » et « Suivi & bilan » = « Pas encore de page »,
   impossible de livrer ou de clore (C).

## 2. États faux ou contradictoires (sévérité 3) — la confiance

- **Une lecture qui échoue s'affiche comme un état** (A, B, D) : « Projets en cours : Aucun projet
  pour l'instant » sur timeout, **404 en anglais** sur une fiche qui existe ; « Réessayer » de
  `/unavailable` ramène à l'accueil, pas à la page ; une conversation PO perdue.
- **404 en anglais après « Demander une précision » et « Refuser »** côté chef de projet (D, 2/2,
  hors charge) : il perd l'accès au projet sans message.
- **Brief « Pas encore envoyée au valideur » + badge « En attente de validation »** (×4).
- **« Le cadrage est complet »** avec « 21 sur 23 » ou des manquants affichés (A, D) ; compteurs
  différents entre la Vue d'ensemble et le Cadrage (D).
- **Activité récente illisible et fausse** (×4) : une ligne par réponse, en clés techniques
  (`legal_blockers`, `budget_envelope`…), libellée « **Brief confirmé** » alors que le Brief
  n'existe pas, et même « **Brief rejeté** » quand on choisit une des deux propositions de PO.
- **« Prêt pour la sortie : Atteint »** dès l'emprunt sécurisé, alors que contrats, répartitions
  et SACEM restent ouverts (B) ; la sortie peut partir sans aucun contrat signé sans alerte (A).
- **Vue d'ensemble « Aucun blocage »** juste après le Plan qui annonçait « 1 blocage juridique » (B).
- Sources fausses : « **Proposé depuis un call** » sans aucun call (C, D, A).
- Un projet non accepté apparaît déjà dans « Projets en cours » (A, C, D).
- Plan juridique : une action retirée revient, un contrat décoché reste une tâche (B).
- Après « Enregistré », la carte de PO garde **ses** valeurs, pas celles corrigées (D).

## 3. La DG ne peut pas piloter (sévérité 3)

- **File de décisions incomplète et mal reliée** (A, B, D) : « Validations qui m'attendent : Rien à
  valider » alors qu'un contrat, un modèle, des conditions d'emprunt attendent (seule la cloche les
  dit) ; la carte « Cadrage · À valider » mène à `/framing` **sans bouton Valider**, même pour la
  Stratégie ; la page Validations n'a pas de bouton. B a dû taper l'URL du Brief.
- **Pas de vue portefeuille** (D) : liste Projets = Titre / Artiste / Type / Étape ; ni responsable,
  ni date de sortie, ni retard / blocage, ni avancement, ni budget, **ni recherche ni filtre**. La
  date de sortie et le budget **disparaissent** du bloc Informations une fois le projet lancé. Aucun
  budget consolidé. Les projets UX-A/B/C se ressemblaient « trait pour trait » : impossible de dire
  qui attend qui.
- Attribution : pas de charge des chefs de projet au moment de choisir ; répondre à une précision
  passe par « **Retransmettre** » (la fenêtre cache la question) ; après un refus, la fenêtre
  **présélectionne celui qui a refusé** (D).
- Validation d'un modèle de contrat **en un clic depuis « ⋯ »** sans l'ouvrir (B).
- Deux interfaces de validation différentes (Brief : confirmation + « Demander une modification » ;
  Stratégie : aucune + « Refuser ») (A).

## 4. PO : utile mais pas encore fiable (sévérité 3)

- **Dates** (C, D) : « vendredi » non compris ; « mardi 13 octobre 2026 à 10h » non repris et la
  réunion pré-remplie à **aujourd'hui 20:00** (plausible et fausse) ; « mars **2024** » proposé en
  exemple ; « en attente depuis le **14 octobre** » (futur).
- **Invente** (C, D, A) : une cause (« temporalité non renseignée ») ; le pays « France » ;
  « budget **engagé** 8 000 € » (c'est l'enveloppe) ; « (UX-D) » lu comme un label.
- **Déforme** (A, B) : la synthèse au mixeur retire « 1 ou 2 dB » et laisse un commentaire de PO
  dans le texte ; la « sortie début mars » écartée au cadrage revient dans le Rappel du Brief de
  la Stratégie ; l'avance de 2 000 € et les 25 % d'édition non lus.
- **Ne connaît pas l'équipe** (×4) : « Nora » cherchée comme projet ; « Yannis » (call) jamais relié
  à Yanis Roche ; « Direction créative : à trouver » alors que le projet a sa DC ; « **admin pds** »
  proposé comme valideur ; action « Yannis prépare un moodboard » pré-assignée à Camille.
- **Création en chaîne cassée** (D) : artiste → 4 titres → projet = 6 formulaires, ~45 actions,
  l'artiste créée n'est pas reprise dans les titres, ni les titres dans le projet.
- **Silence = texte inventé** (A, C) : enregistrement muet de 5 min accepté sans alerte, transcrit
  « Sous-titrage Société Radio-Canada », call « Compte rendu prêt » ; avec Espace Espace, ce texte
  part **directement** à PO.
- Point fort : la **phrase piège** du faux call (« budget d'un million ») n'a été reprise **nulle part**.

## 5. Les autres rôles n'ont pas leur outil (sévérité 3)

- **Directrice créative** (C, D, A) : accueil identique à celui d'une CP (« Validations », « Propositions
  de PO à confirmer » qu'elle ne peut pas traiter) ; **ne peut rien déposer** avant la Conception ;
  sa tâche « Livrer la miniature » ouvre le **Cadrage** ; pas notifiée quand le projet est lancé, le
  Brief prêt ou un call planifié avec elle ; « Mes tâches : aucune » sur l'accueil alors que Travail
  montre 2 livrables. Verdict C : « Camille ouvrirait l'app avec plaisir, Nora retournerait sur
  WhatsApp/Drive. »
- **Mixeur / ingénieur** (A) : ne peut pas déposer sa version par le lien (le CP ressaisit chaque
  fichier) ; lien valable jusqu'au 8 nov. pour un mix final attendu le 17 nov.
- **Personnes extérieures** (B) : la fiche `/f/…` ne dit ni quel label demande, ni à qui écrire, ni
  l'usage des données ; message final d'une ligne.
- **Recrue** (D) : aucune prise en main ; PO répond génériquement sans parler du projet à accepter.
- **Confidentialité** (D) : le motif de refus d'un CP et les échanges sur le budget sont lus par le
  CP suivant et par la DC.

## 6. Juridique : complet mais lourd pour un non-juriste (sévérité 2-3)

- ≈ **250 actions** pour un EP ; **chaque panneau du Suivi se ferme** après une action et la ligne se
  cache dans un groupe replié (~15 allers-retours « Tout le plan » → déplier → rouvrir) ; boutons
  intermédiaires (« Préparer la fiche » ouvre un panneau avec… « Préparer la fiche »).
- **Featuring non reconnu** : le modèle « Artiste interprète » n'est proposé à personne (Maya n'est
  vue que comme « Auteur ») ; contournement par une v2 au rôle détourné — un CP serait resté bloqué.
- **SACEM opaque** : Phono, DEP et DR, Règlement général, rubrique G, Qualité, Dénomination sans
  aucune aide ; **parts à retaper** alors que la répartition vient d'être confirmée ; signatures
  sans le nom des personnes.
- PO redemande ce que le cadrage a établi (sample, aucun accord) ; impasse « Enregistrer » grisé
  quand la bonne réponse est « aucun accord ».
- Texte interne affiché : « (ticket Juridique 08) … reste à décider ».
- Échéances pré-remplies au jour de la sortie ; pas d'envoi d'e-mail depuis l'app (tout en
  copier-coller).

## 7. Modèle mental et vocabulaire (sévérité 2)

- **Deux modèles d'avancement superposés** (C, D) : 7 « Étapes » (dont « **Défense** », « Bilan »
  sans page) + 4 « Workflows » + groupes « Pilotage » / « Production » (où sont rangés Calls et
  Validations) ; points de statut gris sans légende ; « Plan du Projet » cité dans une infobulle
  qu'on n'a jamais vu. « Où en est mon projet, au juste ? »
- **Une chose, plusieurs noms** (A, B, D) : titre / master / « Masters* » / « Release liée » ; « Date
  de sortie visée » = « Échéance principale » ; « Lancer » qui **planifie** un call ;
  « Transmettre le projet » pour **créer** ; « Retransmettre » pour **répondre** ; « cartographie ».
- **Trois listes de rôles** (Réseau « Auteur·rice-compositeur·rice », crédits « Auteur » +
  « Compositeur », projet « Auteur (paroles) ») ; manquent Avocat·e, Studio.
- « directeur général » au masculin, « Directeur créatif » pour Nora ; messages de PO fautifs
  (« Échéance non repris… avec l'année pour une date ») ; message serveur « Détail dans la
  console du serveur ».

## 8. Re-saisie et pré-remplissage manquants (sévérité 2) — règle « ne jamais faire retaper »

- Crédits absents de « Nouveau titre » (~10 modales pour 3 titres) ; 2 crédits pour une
  autrice-compositrice ; rôle du crédit non repris du contact.
- « Artiste du catalogue : Aucun » pour un contact homonyme de l'artiste du titre (B ×2).
- Titre du projet non repris du titre rattaché ; nom tapé non repris dans « Créer un titre ».
- Photo et contact absents de la création d'artiste (3 écrans) ; manager et participants d'un call
  en nom libre, hors Réseau.
- Parts Phono SACEM, catégorie « Featuring », « Artiste interprète » de la fiche publique, nom
  d'artiste : connus, non pré-remplis.

## 9. Notifications et retours d'action (sévérité 2)

- Notifications **sans le texte** (question, refus) ; une réponse à une précision s'affiche « vous
  transmet », comme une première fois ; un projet supprimé devient « un projet ».
- Rien quand une tâche est cochée (le CP ne le voit pas), quand le projet est lancé, le Brief prêt.
- Pas de confirmation visible après l'envoi d'un retour, d'une précision, d'un refus.
- **Mobile** : **pas de cloche** de notifications ; tâches sous ~750 px de PO ; cases de 16 px.

## 10. Divers (sévérité 1-2)

Planning sans les dates du cadrage (tournage, montage, temps fort) · Budget : « Engagé » et « Payé »
qui s'additionnent à l'œil, lignes restées « Estimé » après la validation du master · pas de lecteur
audio sur les versions commentées · recherche absente sur Artistes (et Projets) · fiche d'une
structure sans « Ajouter une personne » · format créé dans la modale non sélectionné · avatar « X( »
pour un nom suivi d'une parenthèse · barre latérale qui reste repliée hors projet · la DG voit
« Lecture seule » au-dessus de boutons qu'elle peut utiliser · « Transmettre » (vers Notion) en
bouton principal à côté de « Modifier » sur la page Retours.

---

## Ce qui marche bien (à garder)

- **Relecture guidée du cadrage** : une question à la fois, citation source surlignée, Confirmer /
  Modifier / Écarter, « M'aider à définir » sourcé. « Le meilleur écran de l'app » (A).
- **« Prochaine attention : le cadrage »** et les 6 dimensions connues / à confirmer / manquantes.
- **Plan du projet** et **Vue d'ensemble par workflow** (statut, raison, dépendances).
- **Brief Mix/Master** : calendrier proposé, tarifs inscrits au budget en un clic ; **page du mixeur**
  sans compte avec accusé de réception en direct ; cycle versions → retours → synthèse → validation.
- **Juridique** : raisons écrites en clair, tâches de Travail **cochées toutes seules**, « Ajouter au
  Réseau » qui relie tous les crédits homonymes, repérage des valeurs d'un contrat collé, contrat
  généré avec la source de chaque valeur, **panneau d'emprunt** (où trouver l'ayant droit), cycle
  contestation → nouvelle version, PDF SACEM officiel.
- **Pages publiques** `/f`, `/s`, `/m` sobres et rassurantes.
- **Brouillon de « Nouveau projet »**, historique des transmissions, modales d'archivage et de
  suppression qui disent la conséquence, écrans fermés qui expliquent pourquoi.
- **Compte rendu de réunion** sourcé (« citation introuvable » signalée), actions → tâches en 3 champs.
- **Retours** : touche C, capture collée, modification ; regroupement par PO juste.
- Cartes de PO « Relire et enregistrer » : rien n'est écrit sans l'humain. Phrase piège ignorée.

## Par où commencer (proposition)

1. **Liens à usage unique** : garder le lien hors du composant qui se démonte (ou ne revalider qu'à
   la fermeture de la fenêtre) — corrige A et B d'un coup.
2. **Toute action serveur qui échoue affiche son erreur** ; jamais de faux état vide ni de 404 pour
   une lecture qui échoue ; message après précision / refus au lieu de la 404.
3. **Une file « À décider » unique pour la DG** (Brief, Stratégie, contrats, modèles, emprunts), chaque
   ligne ouvrant l'écran où l'on décide ; puis une vue portefeuille.
4. **PO** : relier les noms aux membres du projet, ne jamais pré-remplir une date non comprise,
   « je ne sais pas » plutôt qu'une cause, rejeter une transcription de silence.
5. **Activité** : une ligne humaine par événement réel, plus de clés techniques ni de « Brief rejeté ».
6. **Directeur créatif** : dépôt d'une version sur sa tâche / son livrable et un accueil à lui.
7. **Fin du parcours** : livraison au distributeur et « en ligne » ; production et clôture d'un contenu.

## Données de test laissées en place

Comptes `ux-*@pds.test` (mot de passe `UxTest-2026!`), **`ux-dg@pds.test` suspendu** (un seul DG :
`admin@pds.test`, réactivé). Tout est suffixé « (UX-A) » à « (UX-D) » : projets « Lueur — single »,
« Marées », « Sessions Lumière », « Zélie EP » ; artistes Nova Kessel, Ilan Vasseur, Maya Lenoir,
Lou Arcane, Zélie Moreau ; leurs titres et contacts du Réseau ; modèle « Contrat de featuring »
v1/v2. Rapports détaillés de chaque testeur (journal par tâche, captures) dans le scratchpad de la
session du 09/10, non versionnés.
