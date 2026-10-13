# État d'avancement — historique

Lots livrés, du plus ancien au plus récent (sorti de `CLAUDE.md` le 13/10/2026). Le détail
technique de chaque lot est dans `docs/ARCHITECTURE.md` ; ce qui reste à faire est dans
`CLAUDE.md` (« À faire ensuite »).

- [x] Étape 1 — amorçage (stack, env validé, qualité, page de vérification)
- [x] Étape 2 — modèle de données et RLS (43 tests pgTAP ; 835 au total aujourd'hui)
- [x] Étape 3 — authentification et coquille de navigation (fondation d'Ibé transposée)
- [x] Étape 4 — chaîne audio → transcription → compte rendu structuré, persistée
- [x] Étape 5 — étape Cadrage de bout en bout (propositions, provenance, validation)
- [x] Étape 6 — détection de sortie par ISRC, cron quotidien, smartlink public

Au-delà des six étapes :

- [x] Labo IA local (`/labo`), préparation du prochain call
- [x] Assistant PO sur l'accueil + cartes (faits rédigés par le code)
- [x] Accueil et barre latérale refaits d'après le Figma « Desktop - 11 » (barre blanche
      flottante, salutation centrée, saisie teintée, cartes à contour)
- [x] Enregistrement des calls dans l'app (onglet + micro, alerte de silence)
- [x] Dictée à la voix sur le Cadrage (moteur commun, prêt pour les autres étapes)
- [x] Postes (DG, chef de projet, directeur créatif) séparés des permissions, création de
      compte par le DG
- [x] Parcours 01 : artiste → master → projet (non transmis, sans étape), permissions
      `manage_catalog` / `create_projects`
- [x] Transmission : le DG transmet à un chef de projet, qui accepte (lancement : étapes +
      responsable), refuse ou demande une précision (retour au DG, retransmission)
- [x] Notifications : cloche, toast, notifications navigateur, pages à jour sans recharger
- [x] Seul le chef de projet responsable écrit dans un projet ; le DG lit et valide
- [x] Visibilité : chacun ne voit que ses projets (DG tous) ; équipe créative par projet
- [x] Page **Stratégie de lancement** : positionnement, publics, narratif, leviers par
      famille, livrables engagés, calendrier manuel, import depuis un call, validation DG
- [x] Dictée sur la Stratégie (positionnement, publics, narratif, leviers)
- [x] Stratégie : questions à choix fermé qui composent la réponse, « Proposer des
      réponses » (PO pré-coche, sourcé)
- [x] Fiche artiste enrichie depuis Deezer : chiffres, dernière sortie / dernier album,
      bio (Deezer, repli Wikipédia), discographie filtrable, top titres, similaires
- [x] Fiche artiste, étape 1 : onglets, identité, contacts, photo et bio modifiables
- [x] Fiche artiste : onglets Masters, Projets (tuiles cliquables), Fichiers, Activité
      (journal écrit par triggers)
- [x] Création avec l'équipe (chef de projet transmis d'office, directeurs créatifs), type
      Événement, pas de cadrage sans compte rendu de call, calls « À venir »
- [x] Call sans consentement (contrat), traitement automatique et Brief pré-rempli dès la
      fin du call
- [x] PO en écriture avec validation humaine : il prépare artiste (fiche + contacts),
      master, projet (création ou modification avant lancement), l'humain relit le vrai
      formulaire et enregistre ; fenêtre PO sur Espace Espace, dictée à l'écoute
- [x] Navigation refaite d'après le Figma « Devis Sordulo » (120:47 / 120:74) : barre
      latérale principale repliable en icônes (`Tooltip`, repliée par défaut dans un
      projet) ; sidebar contextuelle du projet à 12 sections (3 avec une page, le reste
      grisé) qui remplace l'ancienne double navigation horizontale ; fil d'Ariane des
      7 étapes du métier en habillage sur Cadrage/Stratégie/Sortie, sans nouvel état
- [x] Page **Travail** : DG (validations, projets à retransmettre / en attente), chef de
      projet (projets à accepter, prochaine action par projet, livrables à attribuer,
      propositions de PO), directeur créatif (livrables à concevoir, projets de son équipe)
- [x] Pages d'un projet : Travail (par personne, en retard / à faire / en attente, ajout de
      tâche), Équipe, Livrables, Activations, Planning, Fichiers, Budget, Validations,
      Activité
- [x] Menu « ⋯ » par ligne (artistes, masters, projets, membres) : modifier dans la
      modale, archiver / restaurer (DG, refusé si utilisé), filtre « Archivés »
- [x] **Retours** : fenêtre de retour partout (capture collée, Impr. écran), dédoublonnage
      par PO, le DG modifie (seul ou avec PO), transmet avec une priorité ou écarte
- [x] **Cadrage en relecture guidée** : 5 points un par un (objectif, temporalité, besoins &
      activations, cadre & contraintes, équipe par rôles), récapitulatif, Brief partageable
      et export PDF
- [x] Artistes **Signés / Collaborations** (relation avec PDS, un seul objet Artiste,
      filtre de la liste) ; « Créer l'artiste » ouvre sa fiche
- [x] Brouillon de « Nouveau projet » (retour n°6) ; retour du DG envoyé directement sur
      Notion avec sa priorité
- [x] **Création de projet par type** : Musical (format, masters, un seul pour un single),
      Contenu (format PDS réutilisable ou ponctuel, artiste facultatif), Événement fermé,
      plus de partenariat ; contexte initial, priorité utilisée pour trier
- [x] **Bibliothèque de fichiers** (retour n°6) : fiche artiste, titre et projet, vues Tous +
      par catégorie, dépôt dans toute la zone, catégorie + précision, reclasser, ouvrir
- [x] **Fiche master à onglets** : vue d'ensemble (dossier à compléter), sessions & pistes,
      versions, contributeurs & crédits, splits, droits & déclarations, distribution,
      projets, fichiers, activité
- [x] **MVP du 15 octobre, lot 1** : Réseau (personnes et structures), Contrats (parties,
      validation DG, signature), versions de fichiers et bibliothèque globale, lien de
      visio et réunions internes dans les Calls, décisions et actions de tout call en tâches
- [x] **Architecture globale, lot 6 : intervenants non crédités** du Juridique (avocat,
      distributeur, photographe…) : ajoutés depuis le Réseau avec un rôle, fiche et
      cartographie des contrats comme les crédités (11 tests pgTAP) ; plan d'action et
      plusieurs contrats par personne : plus tard, avec le NDA
- [x] **Architecture globale, lot 5 : dépendances** calculées (Master final et emprunts
      sécurisés → mise en ligne, ingénieurs du Brief → contrats) : tableau, blocages, la
      Distribution prête passe Bloqué, rien d'autre n'est gelé
- [x] **Architecture globale, lot 4 : Vue d'ensemble** (`ProjectBoard`) : cartes des workflows,
      À faire ensuite, Blocages avec leur panneau, Échéances (retards d'abord) ; remplace
      `LaunchedPlan` et `LegalOverview` (supprimé) une fois le plan lancé
- [x] **Architecture globale, lot 3 : statuts communs** (`lib/workflow-status/`) : Non démarré /
      En cours / En attente / Bloqué / Terminé calculés à chaque lecture, avec raison, étape et
      avancement ; point de statut dans la sidebar, coches des chevrons ; workflows selon le
      projet (Master si titres, Distribution si Musical)
- [x] **Master en cinq étapes** (11/10/2026) : Source · Brief · Mixage · Mastering · Master final,
      le Brief a son chevron au lieu d'être caché sous Préparation ; l'envoi au mixeur dans Mixage
- [x] **Architecture globale, lot 2 : chevrons** : Master en 4 (Préparation · Mixage ·
      Mastering · Master final, `/master/mastering` redevenue une page), Distribution en 2
      (Préparation · En ligne, `/release/online`), Juridique avec « Étape du dossier »
- [x] **Architecture globale, lot 1 : navigation** (ticket du 08/10) : Vue d'ensemble et
      Cadrage en tête, groupe Workflows (Master, Juridique, Marketing, Distribution), plus de
      « Processus » ni de « Workflow », Juridique grisé avec cadenas sans `manage_legal`,
      7 chevrons du parcours remplacés par ceux du Marketing ; pas de fil d'Ariane (Sacha)
- [x] Sidebar du projet groupée (Processus / Pilotage / Production) ou onglets
      (`DOUBLE_SIDEBAR`) ; sections Master et Juridique créées
- [x] **Juridique, branches 04 à 06** (tickets Juridique 04, 05, 06) : répartitions versionnées
      confirmées par lien sans compte (18 tests), accords de la qualification à la preuve avec
      lecture des échanges par PO (19 tests), moteur de formalités et bulletin SACEM 725
      (21 tests) ; fixtures « Piégée » et « Humanisme » simulées
- [x] **Juridique, tâches automatiques** (retours de Sacha du 05/10) : chaque action du plan
      est une tâche de Travail dès le lancement, en attente tant qu'elle dépend d'une autre,
      cochée par ses sources, menant là où elle se fait ; dossiers des branches dans la
      navigation du Juridique ; actions groupées par nature ; cartes de Travail sans
      troncature (13 tests pgTAP)
- [x] **Juridique, branche 03 : contrats depuis des modèles** (ticket Juridique 03) :
      bibliothèque versionnée validée par le DG, cartographie validée en une fois, copie
      remplie avec ses sources, clauses versionnées, envoi et signature prouvés, besoin
      financier en attente de facture (20 tests pgTAP, fixture « Piégée » simulée)
- [x] **Juridique, branche 02 : fiches de renseignements** (ticket Juridique 02) : lien
      sans compte par personne créditée, blocs selon les rôles, corrections relues avant
      application, état suivi dans le Suivi (`legal_forms`, 13 tests pgTAP)
- [x] **Juridique, lot 5 : Suivi** (ticket Juridique 07) : actions relues dans leurs
      sources, quatre groupes d'attention, dépendances et retards calculés, délégation
      journalisée (`legal_plan_events`, 4 tests pgTAP)
- [x] **Juridique, lot 4 : Plan d'action** (tickets Juridique 01 et 07) : plan proposé par le
      code en trois colonnes avec dépendances, responsables et échéances, lancé après
      confirmation humaine (`legal_plans`, `legal_plan_items`, 8 tests pgTAP)
- [x] **Juridique, lot 3 : Confirmation** (ticket Juridique 01) : dossier reformulé par le
      code avec ses sources, corrections possibles, confirmation (qui, quand), réouverture
      à la première correction (7 tests pgTAP)
- [x] **Juridique, lot 2 : Cadrage juridique** (ticket Juridique 01) : questions calculées,
      réponses libres lues par PO et relues, faits avec provenance et historique, crédits et
      points à sécuriser créés (`legal_intakes`, `legal_answers`, `legal_facts`,
      `legal_clearances`, 15 tests pgTAP)
- [x] **Juridique, lot 1 : État des lieux** (ticket Juridique 01) : permission
      `manage_legal`, lecture de ce que le projet sait déjà, classée connu / à confirmer /
      manquant
- [x] **Master, lot 1 : État du master** (ticket Workflow Master) : source détectée, session,
      stems, ingénieurs de mix et de mastering et leur lien au Réseau, ingénieurs du Réseau
      avec leur historique ; compléments par les formulaires existants
- [x] **Master, lot 2 : confirmer la source** : le responsable confirme ou change la version
      source (historique conservé, Master final refusé), une version plus récente redemande
- [x] **Master, lot 3 : Brief Mix/Master** : ingénieurs du Réseau, tarifs estimés, révisions,
      validateur, direction artistique, livrables, calendrier proposé depuis le master final
- [x] **Master, lot 3 bis** : remplir le Brief en dictant, ou par un échange (call préparé
      avec l'ordre du jour de ce qui manque, transcription → propositions relues)
- [x] **Master, lot 4 : transmettre au mixeur** : dossier calculé et montré avant l'envoi, lien
      privé sans compte `/m/[token]` (fichiers signés 30 jours), accusé de réception notifié,
      suivi (en attente, à relancer après 3 jours, reçu), relance = nouveau lien
- [x] **Master, lot 5 : budget à quatre états** : Estimé / Proposé / Engagé / Payé dans tout le
      Budget (le proposé ne consomme pas l'enveloppe), tarifs du Brief inscrits au budget et
      suivis depuis le Brief
- [x] **Master, lot 6 : versions et retours du mix** : état audio « Mix », version créée à
      réception (V1, V2…, équipe notifiée), retours de l'équipe, synthèse proposée par PO,
      relue et transmise au mixeur (visible sur sa page)
- [x] **Master, lot 7 : validation et mastering** : le validateur (ou le responsable) valide ou
      demande une modification de la dernière version, le Mix final ne change plus ; étape
      Mastering ouverte quand chaque titre a son Mix final, dossier de mastering transmis
- [x] **Master, lot 8 : master final** : versions de mastering (mêmes retours et décision), la
      version validée devient le Master final (fichier et titre au Catalogue), étape Master
      final avec les autres livrables du Brief à cocher
- [x] **Master, lot 9 : questions aux bonnes personnes** : direction artistique et livrables
      demandés aux directeurs créatifs (tâche dans leur Travail), réponse sur le Brief, ajoutée
      au Brief par le responsable
- [x] **Contrats, suites du ticket Juridique 03** (07/10) : modèle en pastilles (plus de
      `{{…}}` à taper), valeurs repérées dans un contrat déjà rempli, import d'un Word / PDF /
      texte gardé comme fichier source, contrats générés automatiquement, contrat d'édition
      signé qui coche la SACEM (11 tests pgTAP)
- [x] **Suppression** depuis les listes (Artistes, Catalogue, Projets, Réseau) : « Supprimer »
      dans le « ⋯ », cases à cocher et barre de sélection pour supprimer plusieurs lignes,
      refus expliqués ligne par ligne (`delete_records`, 14 tests pgTAP)
- [x] **Nouvelle Vue d'ensemble** (07/10) : le Plan du projet directement sur la page dès le
      Brief validé (plus de page `/plan`), et le Juridique résumé depuis son Suivi (groupes
      d'attention, accords qui bloquent la sortie, premières actions) — `docs/ARCHITECTURE.md`
      § 6 ter
- [x] **Juridique et Master simplifiés** (07/10, audit + prototypes « Juridique PDS OS v3 ») :
      Juridique en deux étapes (État des lieux avec questions et confirmation, Plan d'action
      devenu le Suivi, démarches dans l'ordre où elles se débloquent, « Prêt pour la sortie »),
      « Accords » → « Emprunts » en trois temps avec le signé et la preuve déposés dans le
      panneau ; Master en trois étapes (Préparer, Mix et mastering sur une page, Master final),
      repassé en quatre le 08/10 (lot 2 de l'architecture globale)
- [x] **Correctifs du test UX du 09/10** (sévérité 4) : liens à usage unique qui survivent à la
      revalidation, erreurs affichées dans leur fenêtre, titre créé sans son audio dit (plus de
      formulaire vidé), correction d'e-mail d'une fiche relue (et le Réseau suit), montant d'un
      emprunt lu avec « € », fin de parcours : livraison, mise en ligne, Production, Suivi & bilan
      (25 tests pgTAP) ; puis section 2 (états faux) : lecture échouée jamais montrée comme vide
      ni comme 404 (pages d'erreur et 404 en français), retour après /unavailable, refus d'un projet
      sans 404, Brief « À envoyer », « Prêt pour le Brief » avec les facultatives vides, Activité
      lisible, sources réelles, « Prêt pour la sortie » honnête, blocages du cadrage sur la Vue
      d'ensemble, actions retirées du plan juridique gardées retirées (7 tests pgTAP) ; puis
      section 4 (PO) : dates dites lues par le code, plus d'heure supposée, faits inventés
      écartés (pays, notes, engagement pris pour l'enveloppe), synthèse au mixeur qui garde
      les chiffres, emprunt lu par ayant droit, équipe connue (« Yannis » → Yanis Roche,
      direction créative du projet), création en chaîne, silence jamais transcrit
- [x] **Test UX du 09/10, section 5 (autres rôles)** : accueil et tâches de la directrice créative,
      notifications de l'équipe créative, dépôt créatif avant la Conception, dépôt du mixeur par son
      lien et durée du lien, fiche `/f/…` (qui demande, données, suite), carte « Bienvenue » et PO
      qui connaît les projets à accepter, mots d'une transmission et budget confidentiels
      (41 tests pgTAP)
- [x] **Test UX du 09/10, section 6 (Juridique allégé)** : Suivi par personne et par titre, panneau
      qui reste ouvert et « Suivant », verbes directs, featuring en Artiste interprète, SACEM aidée
      et pré-remplie depuis la répartition, questions de PO depuis le Cadrage et « Aucun »,
      échéances par démarche, e-mails pré-remplis
- [x] **Test UX du 09/10, section 7 (vocabulaire)** : un seul modèle d'avancement (Cadrage → plan
      du projet → workflows), sidebar regroupée avec légende, une chose = un nom, rôles
      harmonisés + Avocat·e et Studio, messages de PO et d'erreur corrigés ; accord des postes
      reporté
- [x] **Calls comme sur Teams** (10/10/2026) : calendrier par défaut (Semaine, Mois ; créer en cliquant ou glissant, déplacer, rallonger, fiche d'un call) et liste,
      création avec nom, participants (équipe, Réseau, e-mail tapé), créneau début → fin et lien
      Google Meet créé avec les invitations (7 tests pgTAP) ; à configurer : `GOOGLE_CALENDAR_*`
- [x] **Test UX du 09/10, section 8 (ne jamais faire retaper)** : crédits saisis avec le titre,
      une personne et tous ses rôles (repris de sa fiche Réseau), nom tapé repris dans « Créer
      le titre », nom du projet repris de son titre, contact homonyme relié à l'artiste, nouvel
      artiste avec photo et manager du Réseau, participants des échanges depuis le Réseau,
      fiche publique v2 (Featuring, nom d'artiste, nom à créditer), parts Phono de la
      répartition confirmée (tous projets, ajout à la main) ; tri `position` inexistant corrigé
      (11 tests pgTAP, `docs/ARCHITECTURE.md` § 2 nonies)
- [x] **Marketing / Activations** (tickets Vue d'ensemble et pilotage, Influence, RP, 11/10/2026) :
      vue d'ensemble et fiche Activation (trois axes, alertes, prochaine action, blocages,
      dépendances, preuves, statistiques, clôture avec réserves), Influence interne (concepts,
      collaborations, négociation, accord express, droits, contenus, paiement), RP interne
      (cadrage, dossier, modèle et brouillons, opportunités, retombées), mode agence commun
      (source, aperçu, décisions PDS, bilan), Réseau enrichi (52 tests pgTAP)
- [x] **Fusion du 11/10/2026** avec `origin/main` (Distribution en cinq étapes, Suivi & bilan) :
      un seul modèle d'activations, le Suivi & bilan rebranché sur celles des Activations par deux
      vues (migrations distantes renumérotées 20261011000601 à 001001), `ActionOutcome` →
      `WriteResult`, `useDialogSubmit` → `useWriteSubmit` (92 tests pgTAP du bilan réécrits)
- [x] **Retours BUG + UX consolidés du 11/10/2026, lots 6 à 11 et UX-01** (12/10/2026) :
      demandes de correction du Brief ancrées et comparaison des versions, V2 inchangée bloquée
      sans dérogation, export PDF réparé (Chromium absent des fonctions Vercel), plan du projet
      pilotable avec historique, un seul fil de retours avec l'ingénieur, Brief Mix/Master et
      transmission lisibles (revue, lien envoyé / ouvert / révoqué), dates complètes du dossier,
      même lien pour le même ingénieur, dépôt confirmé, mix existant déclaré final, master final
      écoutable dans Master et Distribution, liste des projets avec recherche et filtres
      (migrations `20261011500101` à `…500501`, à pousser en production)
- [x] **Retours Drive, lot 1 (bugs rapides)** (12/10/2026) : Positionnement et Publics repris
      des choix confirmés dans les cartes et le Brief (MKT-S1-01), budget en quatre états sans
      dépense fictive (MKT-S1-02), métrique des KPI et Deezer réservé aux fans (MKT-S1-03),
      échéances amont avec délai, marge et arbitrages (MKT-S1-04), « Garder seulement le nom »
      qui garde le nom tapé, durée et formats audio annoncés justes, « ⋯ » d'un brouillon de
      projet (migration `20261012100101`)
- [x] **Retours Drive, lot 2 (Juridique transversal)** (12/10/2026) : pages du projet relues
      seules après tout changement du Juridique, même venu d'un autre onglet ou d'un lien public
      (`project_live`, Realtime, JUR-12 / JUR-28), attentes du Suivi qui disent qui est attendu,
      date et heure partout (JUR-20), Historique du Juridique (JUR-29) (migration
      `20261012100201`, 7 tests pgTAP)
- [x] **Retours Drive, lot 3 (Juridique par branche)** (12/10/2026) : tuiles du Suivi définies et
      filtre actif, « terminé quand » par démarche, contrat qui nomme la fiche manquante et mène
      où compléter, fiche ouverte notée et réception notifiée, part de la fiche précisée, fiche
      publique Vérifier / Consentir / Envoyer avec reçu daté, origine juridique d'un contrat, page
      d'un modèle, contrôles SACEM (genre, prénom, dénomination), frise et signatures nommées
      (migrations `20261012100301`, `…100401`, 5 tests pgTAP) ; reste JUR-18, 21, 22, 23, 25
- [x] **Retours Drive, lot 4 (reste du Juridique)** (12/10/2026) : répartition renseignée ≠ droits
      sécurisés, déclarations datées et expliquées, alertes du Cadrage à traiter, « Lecture seule »
      corrigé sur le Juridique, compteur du cadrage en trois parts, aperçu du plan avant
      confirmation, contrats nécessaires confirmés, conditions financières, refus motivé d'un
      modèle, lien de répartition stable par personne, résumés de transition SACEM, export CSV de
      l'historique (migrations `20261012100501`, `…100601`, 10 tests pgTAP)
- [x] **Retours Drive, lot 5 (SACEM et contrats avancés)** (12/10/2026) : éditeur relié à ses
      créateurs et à son contrat (coédition), copie jointe seulement avec une pièce, totaux par
      catégorie, dossier SACEM pas à pas avec récapitulatif, choix du cas à la création d'un
      contrat (migration `20261012100701`, 2 tests pgTAP)
- [x] **Retours Drive, lot 6 (Catalogue : déclarations et droits ℗)** (12/10/2026) : sept statuts
      définitifs, applicabilité et suivi par un tiers, justificatif pris dans les fichiers du titre,
      historique des déclarations, complétude sur les seules démarches applicables, titulaire du ℗
      proposé puis confirmé, repris si la source change (migration `20261012100801`, 8 tests pgTAP)
- [x] **Retours Catalogue du 11/10/2026, lot 7** (12/10/2026) : Catalogue en Tous / En création /
      En production / Finalisés avec filtres combinables et nouvelles colonnes, vue d'ensemble d'un
      titre (où il en est, distribution séparée, prochaine action, complétude repliable), versions
      audio numérotées et validées sur le fichier, lecteur intégré, retours horodatés, suppression
      protégée, formats annoncés = acceptés (migration `20261012100901`, 15 tests pgTAP)
- [x] **Retours Catalogue du 11/10/2026, lot 8** (12/10/2026) : variantes Acoustique et Live
      reliées explicitement à leur original, répartitions sans champ Type et aux rôles du
      type, validation à part de « Complet » (instantané jamais réécrit), historique et
      écarts crédits / parts signalés, rattachement d'un titre à un projet existant, dates
      visée / confirmée / effective séparées, direction créative choisie écrite en clair
      (migration `20261012101001`, 15 tests pgTAP)
- [x] **Retours Marketing du 11/10/2026, lot 9a (budget)** (12/10/2026) : statut Facturé, un reste
      pour le prévisionnel, l'engagé et le réel, familles de dépense réelles avec exemples et
      suggestion, « Autre » précisé, livrable et pièce d'une dépense, « Ajouter une dépense » dans
      tout le Marketing, Brief sans leviers à 0 € (migration `20261012101101`, 6 tests pgTAP)
- [x] **Retours Marketing, lot 9b** (12/10/2026) : cartes de la Stratégie qui comptent confirmé /
      à arbitrer / à renseigner et mènent au premier manque, positionnement en quatre points,
      publics détaillés, juridique traité en dépendance (jamais en levier), objectif et KPI repris
      du Cadrage avec unité, calcul, source et responsable, Brief qui s'ouvre sur « L'essentiel »
      (migration `20261012101201`, 5 tests pgTAP)
- [x] **Retours Marketing, lot 9c** (12/10/2026) : livrables proposés par lots et modifiés en masse,
      format, « aucun livrable requis » voulu, types Livraison / Validation / Publication, jalons
      amont proposés, première date tenable et déplacement confirmé avec son impact (migration
      `20261012101301`, 4 tests pgTAP)
- [x] **Retours Marketing, lot 9d** (12/10/2026) : brouillon de la Stratégie préparé par PO depuis
      le Cadrage et les calls (propositions `generated` toujours à confirmer, source et confiance
      calculée par le code, rien de confirmé remplacé, questions prioritaires), synthèse du récit
      avec ton et longueur, répétitions et contradictions à arbitrer, « Proposer à nouveau » par
      partie (migration `20261012101401`, 6 tests pgTAP)
- [x] **Retours Marketing, lot 9e** (12/10/2026) : validation du Brief avec réserves (responsable,
      échéance, tâche, levée), alertes critiques acceptées une par une, changements entre versions,
      plan d'exécution confirmé et sans doublon (activations par levier, tâches par livrable, lien
      au Brief dans les deux sens) (migration `20261012101501`, 14 tests pgTAP)
- [x] **Lot 10, PROJ-TEST-01 et JUR-16** (12/10/2026) : matrice des actions d'un projet par statut
      documentée et testée (3 tests pgTAP) ; checklist de complétude d'un contrat (six états, bloquant
      ou non, qui fournit, où corriger) ; aperçu DEP / DR de la rubrique D par règle versionnée (JUR-23) ;
      sessions partagées entre titres (détacher ≠ supprimer) et fichiers de travail à la place des
      pistes (migration `20261012101601`, 11 tests pgTAP) ; clôture et partage d'un call (versions,
      membres notifiés, e-mail et PDF, jamais la transcription, migration `20261012101701`, 9 tests) ;
      fil avec l'ingénieur et ses signalements, échéances touchées proposées (migration
      `20261012101801`, 10 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C1 (MKT-C2-01, 02) : Stratégie validée centrée sur
      « Passer à la conception », documents expliqués, rubriques repliées ; recommandations du
      suivi avec niveau, raison, effet, tâche pré-remplie créée une seule fois et liée dans les
      deux sens, motif pour ignorer, retour au projet depuis PO
- [x] Retours Marketing du 12/10, lot C2 (MKT-C2-03) : accueil unique de la Conception (but,
      six étapes calculées, prochaine action avec sa destination, blocages), direction séparée
      des livrables, échange créatif en action principale, onglets dans l'ordre du parcours
- [x] Retours Marketing du 12/10, lot C3 (MKT-C2-04) : identité artistique versionnée sur la
      fiche Artiste (approuvée par le DG), gardée par chaque Conception, références liées,
      dérogation visible dans le brief créatif (migration `20261013100101`, 17 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C4 (MKT-C2-05) : échanges créatifs sur l'accueil (portée,
      synthèse, idées à part), rattacher un call existant, ordre du jour avec points ouverts et
      identité, démarrage sans échange justifié, une tâche par action de call (7 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C5 (MKT-C2-06) : direction de la sortie distincte des
      livrables (sujets propres, plus de dépôt), héritage par les livrables, questions selon le
      format, impacts d'une révision avant reconfirmation, brief qui sépare direction et concepts
- [x] Retours Marketing du 12/10, lot C6 (MKT-C2-07) : contrôles de fiche selon le format,
      contenus de série avec responsable, concept et référence, série en bloc ou contenu par
      contenu, manques et prochaine étape par livrable (migration `20261013100301`, 7 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C7 (MKT-C2-08) : personne n'approuve ce qu'il a soumis
      (exception de gouvernance motivée), délégations datées et révocables, audit, matrice des
      droits, « Ma conception » dans le Travail (migration `20261013100401`, 11 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C8 (MKT-C2-09) : références et moodboards typés (anciens « À
      qualifier »), droits d'usage, moodboard d'appartenance, un seul dialogue d'ajout,
      « Soumettre une proposition créative » / « Déposer une version de travail » (migration
      `20261013100501`, 5 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C9 (MKT-C2-10) : propositions créatives (concept approuvé,
      écartée), retouche ciblée qui crée la tâche de l'auteur et se ferme à la version suivante,
      notifications vers la proposition, proposition retenue dans le brief (migration
      `20261013100601`, 4 tests pgTAP de plus)
- [x] Retours Marketing du 12/10, lot C10 (MKT-C2-11) : demande de validation explicite (sections,
      version, valideurs, message, échéance), contenu figé contrôlé à la décision, retrait, réserves,
      notifications et file « Mes décisions », page de décision dédiée (migration `20261013100701`,
      10 tests pgTAP)
- [x] Retours Marketing du 12/10, lot C11 (MKT-C2-12) : Brief créatif en document — contrôles
      bloquants / avec réserve / exclus avant la version, fiches et séries, droits des références,
      réserves, statut calculé, changements par partie, PDF avec sommaire et numéros de page,
      validation du dossier depuis le brief (sans migration)
- [x] Retours Marketing du 12/10, lot C12 (MKT-C2-13) : clôture de la Conception (brief de référence),
      « Passer en Production » avec plan prévisualisé, exclusions motivées, réserves en tâches,
      idempotent, origine des livrables en Production, réouverture motivée par la direction avec
      impact (migration `20261013100801`, 15 tests pgTAP)
- [x] JUR-29, fin (13/10) : chaîne causale par règle, signatures rendues caduques par un nouveau
      bulletin, filtres par personne et par mois, export CSV avec cause, comparateur de versions des
      répartitions (sans migration)
