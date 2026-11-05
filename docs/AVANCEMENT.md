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
- [x] Retours d'Ibé sur la Production (13/10), lot 1 (PROD-001, PROD-007) : une prochaine action par
      fiche sur chaque onglet (pourquoi, qui est attendu, ce qui manque, lien direct, dernière étape
      franchie), calculée par le code ; données de chaque onglet lues une fois par requête (sans
      migration)
- [x] Retours d'Ibé sur la Production, lot 2 (PROD-029 à PROD-033) : numéro de version automatique,
      une seule soumission et une seule décision par version, demande de corrections adressée
      (destinataire, échéance, retours gardés, transmise / relancée / réaffectée / traitée), version
      suivante rattachée, notifications aux validateurs et au destinataire membre (migration
      `20261014000101`, 25 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 3 (PROD-026, 028, 031, 032, 036) : espace du prestataire
      par lien privé `/p/…` (mission, corrections, dépôt de version par lien ou fichier, exports
      attendus, références), demandes « Consultées » à l'ouverture, version soumise aussitôt
      (migration `20261014000201`, 22 tests pgTAP ; dépôt vérifié dans Chrome sur la base locale)
- [x] Retours d'Ibé sur la Production, lot 4 (PROD-004, PROD-005) : call technique avec heure de fin
      et invitation des membres participants, erreurs journalisées ; « Planifier » une action du
      compte rendu (responsable, échéance, plan approuvé, tâche du Travail sans doublon) ; prochaine
      action « relire les propositions » puis « planifier les actions » (migration `20261014000301`,
      2 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 5 (PROD-002, 008 en partie, 009, 027) : journal d'activité
      par déclencheurs et onglet Historique, statut et responsable des dates et de l'enveloppe,
      valeurs de la Fiche reprises, alerte d'impact, formulaire d'étape prérempli (migration
      `20261014000401`, 9 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 6 (PROD-006, PROD-010) : plan de préproduction proposé par
      le code (étapes adaptées au brief, échéances du rétroplanning, dépendances, responsables
      proposés, jamais de date passée en silence), échéances recalculées après confirmation
      (migration `20261014000501`, 1 test pgTAP)
- [x] Retours d'Ibé sur la Production, lot 7 (PROD-008, PROD-017, PROD-018) : contrôles confirmés sur
      leurs preuves ou par dérogation motivée, responsable par contrôle, « Sauvegarde prévue »,
      contrôles rouverts quand leurs données changent, lancement du tournage notifié et vue du jour
      (migration `20261014000601`, 9 tests pgTAP, test du parcours Piégée adapté aux preuves)
- [x] Retours d'Ibé sur la Production, lot 8 (PROD-011, 012, 013) : lieux candidats avec médias,
      tarif, disponibilités, contraintes et vérification ; comparaison ; avis par rôle des personnes
      consultées (membres, ou prestataires par leur lien) ; décision retenir / écarter motivée, lieu
      reporté sur la fiche et contrôle rouvert (migration `20261014000701`, 15 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 9 (PROD-014, 015, 022) : devis lus par PO et vérifiés par
      le code avant d'entrer au matériel sans doublon ; statut « Sur place », provenance, quantité
      reçue et écart ; retour réservé au matériel loué ou prêté, manquant ou endommagé (migration
      `20261014000801`, 4 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 10 (PROD-016) : feuille de service composée depuis les données
      validées, manques avant diffusion, versions datées, lien stable de l'équipe (`/fs/…`), membres
      prévenus à chaque version (migration `20261014000901`, 8 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 11 (PROD-019 à PROD-024) : début et fin du tournage horodatés,
      report avec nouvelle date, responsables et emplacements des rushes et de la sauvegarde, autres
      médias, incidents par catégorie et domaines touchés (clos sans suite si simple fait), compte rendu
      figé à la validation, étapes de post créées d'un coup (migration `20261014001001`, 6 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 12 (PROD-025, 026, 034) : entrées et dépendances des étapes,
      pas de démarrage sans intervenant, « Mission terminée » par le lien du prestataire, références du
      Brief créatif reprises avec leur origine et leur auteur (migration `20261014001101`, 6 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 13 (PROD-035 à PROD-040) : fichiers attendus avec ce qui est
      attendu de chacun, sans doublon, historisés ; chaque dépôt gardé ; contrôle point par point selon
      le type de fichier ; transmission des seuls fichiers conformes à un responsable Activations
      notifié ; clôture avec récapitulatif, éléments ouverts bloquants, lecture seule ensuite (migration
      `20261014001201`, 15 tests pgTAP)
- [x] Retours d'Ibé sur la Production, lot 14 (PROD-003) : préremplissage avec la source dans l'aide du
      champ — dates et accès des étapes de post, budget repris du devis, incident de matériel, relances
      du tournage confiées aux responsables connus, feuille de service reprise du brief et de la Fiche,
      lien du fichier final (sans migration)
- [x] Bugs du test Production du 13/10 (BUG-001 à BUG-007) : feuille de service confirmée seulement
      diffusée avec urgences, contrôles ouverts nommés, lieu et dérogation expliqués, lecture des devis
      fiabilisée (une requête, réessayer, formats refusés clairement), « Saisir à la main » (migration
      `20261014001301`, 8 tests pgTAP ; test du parcours adapté)
- [x] Production en parcours (message d'Ibé du 14/10, proto validé par Sacha) : interne ou externe et
      les rôles, parcours par étapes avec « Maintenant » selon la personne, responsable, validation,
      prérequis et suite ; chargé de production qui organise ; devis vérifiés puis validés ;
      proposition de réalisation validée ; liens privés de la société, du réalisateur et du chef op
      (migration `20261014001401`, 24 tests pgTAP ; parcours externe et lien de la société testés
      dans Chrome sur la base locale)
- [x] Quota quotidien de requêtes à PO et passage possible à Claude Haiku 5.5 (14/10) : limite par
      membre (200 par défaut) changée par le DG dans Équipe (colonne « PO aujourd'hui », champ dans
      « Modifier »), page « Paramètres » avec l'utilisation du jour comme dans Claude, refus clair
      partout où PO est appelé ; fournisseur `anthropic` (`claude-haiku-5-5`, effort `low`, sans
      température, cache des règles de PO) prêt, Mistral reste actif tant que la clé n'est pas fournie
      (migration `20261014100101`, 11 tests pgTAP)

## Projet complet : l'app identique au proto (`docs/protos/projet.html`, 18/10/2026)

Demande de Sacha du 18/10/2026 : porter dans l'app réelle tout le parcours du proto « Projet complet »
(Cadrage, Plan du projet, Master, Juridique, Marketing, Distribution, Vue d'ensemble, Travail, pages
privées), en parcours comme en design, tout branché. Branche `feat/projet-complet`, partie de `main`
(qui contient déjà toute `feat/production-ibe`).

**Inventaire écran par écran** (proto ↔ code, mots exacts, écarts, sous-lots, migrations) :
`docs/projet-complet/<zone>.md` — `commons` (briques communes), `shell` (coquille, Vue d'ensemble, Travail,
pages privées), `framing`, `strategy`, `design`, `production`, `activations`, `review`, `master`, `legal`,
`distribution`. Estimation cumulée des inventaires : ~190 à 220 jours-développeur ; constat commun : le
fond métier et le SQL couvrent l'essentiel des tickets, l'écart est le **parcours** (patron d'écran unique)
et le **design**, plus quelques manques par zone.

Décisions de design prises pour ce chantier (`docs/DESIGN.md`) : modale en verre clair du proto ; 13 px
seulement pour les sources et pastilles ; ton « action » gris (ticket « Architecture globale » : sans
violet) ; bouton principal d'abord, à gauche ; boutons 40 px / 15 px / 600 ; chevrons pour le seul
Marketing ; navigation du projet du proto + Budget ; Travail et Validations = mes actions des parcours.

Lots, dans l'ordre (chaque lot : migrations avec RLS et `delete_project_row`, états calculés, textes dans
`lib/i18n/fr/`, Server Actions par la session, notifications par triggers, `initial`/`defaults` + `stay`) :

- [x] **0. Briques communes** (`commons.md` § 13) : primitives et tokens, `ModuleHeader` (fil d'Ariane,
      pilules, faits, « Qui fait quoi »), patron d'étape complet (`StepPanel` 4/5 colonnes, prérequis
      inter-modules, verrouillée en lecture seule, « Déjà fait »), un seul « Maintenant »
      (`loadProjectJourneys`), bandeau de résultat, blocages et informations notées (`step_blockers`,
      `step_notes`), formulaire de call commun, compte rendu par point et résumé aux participants versionné,
      proposition à trancher une par une, décision avec motif, fait avec source et « Modifier », cartes de
      versions, cartes de départ « Recommandé », habillage commun des pages privées
- [x] **1. Coquille et Vue d'ensemble** (`shell.md`) : navigation du proto avec pastilles « À vous »,
      Vue d'ensemble (tête, « Maintenant » global, cartes des workflows, dépendances), verrou avant le plan,
      Travail, Validations, Activité depuis les parcours, navigation mobile en puces
- [x] **2. Cadrage et Plan du projet** (`framing.md`, 19/10/2026, branche `pc/z2-framing`, migration
      `20261019020101` à pousser avec accord) : parcours en 4 étapes (Démarrer, 6 dimensions,
      Brief, Plan), Plan dans le Cadrage, « Lancer le plan » démarre tous les workflows
- [x] **3. Stratégie** (`strategy.md`, branche `pc/z3-strategy`, 19/10/2026) : parcours en 4 étapes
      (`/strategy/start|dimensions|validation|validated`), entrée `StartChoices` + échange dans l'étape,
      lignes tranchées une par une sur les 8 dimensions (`ProposalRow`, plus de grille ni de
      pré-cochage), PO propose aussi livrables, temps forts et objectifs, Brief en 4 blocs validé dans
      l'étape (`DecisionPanel`), « Stratégie validée » ; migrations `20261019030101` et `20261019030201`
      à pousser en prod avec accord ; 20 tests pgTAP (`strategy-proposals.test.sql`)
- [x] **4. Conception** (`design.md`) : parcours en 6 étapes du proto, fiches champ par champ, transfert
- [x] **5. Production** (`production.md`) : d'abord la fuite de l'enveloppe interne sur le lien de la
      société ; barre de livrables, « Qui produit ? », « Quelle société ? », mode de préparation, call de
      production, réalisateur proposé et retenu, devis versionné, préproduction, lieux, contrôle, tournage,
      rushes, montage, livraison
- [x] **6. Activations** (`activations.md`) : liste et activation ouverte, frise, « Maintenant » de
      l'activation, influence et presse interne/agence, preuve calculée, lien de la créatrice
- [x] **7. Suivi & bilan** (`review.md`) : « Où on en est », préparation, rapport figé et PDF, réserves,
      clôture, notifications
- [x] **8. Master** (`master.md`) : parcours sans chevrons, Source, Brief (dates calculées, « Modifier »),
      Mixage (dossier, tarif, versions, décision), Mastering, Master final, facture
- [x] **9. Juridique** (`legal.md`) : démarches en étapes du parcours (Dossier, Suivi, Sortie), questions
      comme au Cadrage, « Prêt pour la sortie »
- [x] **10. Distribution** (`distribution.md`) : parcours en 7 étapes, Préparation lue dans le Master, la
      Production et le Juridique, gestes regroupés, dates cohérentes depuis le Cadrage
- [x] **11. Pages privées réunies par personne** : un lien par personne et par projet, « À vous » / « En
      attente de PDS » / « Fait » replié
- [x] Projet complet C8 + C10 (18/10/2026) : formulaire de call commun (pastilles de
      participants façon Teams, ordre du jour à poignée / clavier / tactile, « Envoyé avec
      l'invitation », récapitulatif « Confirmer et inviter ») pour le Cadrage, la Stratégie, la
      Conception, la Production (call de production et technique) et le Master, une action
      `createPreparedCall` ; compte rendu rangé par point de l'ordre du jour
      (`report_items.agenda_topic`) et lu en modale ; résumé aux participants écrit par le code,
      envoyé en versions (`call_summaries`, `send_call_summary`, 11 tests pgTAP). Migration
      `20261018200101` à pousser en prod avec accord (docs/ARCHITECTURE.md § 4 ter)

## Lot 10 — Distribution sur le patron commun (19/10/2026, branche `pc/z10-distribution`)

- D0 : sources réelles (pochette livrée en Production, emprunts lisibles sans `manage_legal`,
  « Prêt pour la sortie » lu du Juridique), une seule date de sortie (`projects.due_date`),
  ligne `releases` créée au lancement du plan, détection par l'ISRC du Catalogue.
- D1 : parcours en 7 étapes / 4 sections, une page par étape, loader du parcours (Maintenant,
  Travail, Validations), statut Bloqué / En attente calculé, anciens onglets redirigés.
- D2 à D6 : paramètres confirmés en un geste, dossier en document (PDF, écarts, contrôles sur la
  ligne, décision sur pièce, motif en tête, V suivante), notifications, dépôt et frise de The
  Orchard en un geste, corrections en un geste, plateformes « Tout est bon » / « Il y a un
  problème », clôture avec réserves, vues Anomalies et Historique.
- Migrations `20261019100101`, `…100201`, `…100301` à pousser en prod avec accord ; tests pgTAP
  `distribution.test.sql` (105) et `distribution-journey.test.sql` (35).


## Lot 4 — Conception sur le patron commun (19/10/2026, branche `pc/z4-design`)

- Parcours du proto en six étapes (Accueil, Intentions, Références, Direction artistique, Brief
  créatif, Fiches Livrables) sur `DesignStepFrame`, loader `lib/journey/design.ts` ; anciennes pages à
  onglets redirigées vers leur étape.
- Accueil : responsable créatif désigné en place, « Préparer un échange créatif » / « Commencer
  directement » sans motif, échange dans l'étape, ajout de livrable avec format et motif.
- Fiches créées par la base depuis la Stratégie validée, pré-remplies par le code avec leur source,
  modifiables champ par champ, validées une par une, transférées une par une (la Production s'ouvre
  au premier transfert) ; Conception faite quand tout est transféré, plus de validation globale.
- Migrations `20261019040101` à `20261019040701` (à pousser en prod avec accord) ; pgTAP
  `conception-journey.test.sql` + 6 fichiers adaptés.
## Lot 7 — Suivi & bilan sur le patron commun (19/10/2026, branche `pc/z7-review`)

- R1 : parcours en 3 étapes (Bilan provisoire, Réserves, Clôture du Marketing), loader dans celui du
  Marketing, anciens onglets redirigés, ligne « Volet Marketing » et sections en trop retirées.
- R2 : « Où on en est » en 4 phrases cliquables, détail et filtres repliés, modale par chiffre.
- R3 : préparation dans l'étape, cartes de versions, rapport en modale avec PDF serveur, soumission
  directe, décision par `DecisionPanel`.
- R4 : réserves arbitrées et levées en ligne, « Avant la clôture », demande, décision, réouverture.
- R5 : notifications (migration `20261019070101` à pousser en prod avec accord), Maintenant / Travail /
  Validations par le parcours.

## Lot 11 — Une page privée par personne et par projet (19/10/2026, branche `pc/z11-portal`)

- `project_contact_links` (un lien actif par personne et par projet, jeton recopiable par le responsable),
  `get_contact_page` pour `anon`, surcharges (jeton de la personne + id de l'objet) des 37 fonctions
  publiques des liens privés, signatures existantes intactes.
- Page `/c/[token]` : cartes du Master, du Juridique, du Marketing (créatrice, prestataire, calls) sous un
  intertitre par workflow, résumé si plusieurs actions, « Votre contact chez PDS ».
- « Liens privés » de « Qui fait quoi » (Master, Production) et à côté des liens du Master et de la fiche.
- Migrations `20261019110101`, `20261019110201` à pousser en prod avec accord ; pgTAP
  `contact-links.test.sql` (25).

## Lot 6 — Activations sur une seule page (19/10/2026, branche `pc/z6-activations`)

- Page unique du proto : liste à frise et filtres, activation ouverte avec « Maintenant » (geste en place),
  bandeau « Leviers à préparer » (créer en un clic, « Plus tard »), modules en cartes repliables,
  « Informations » repliées ; onglets et sous-pages redirigés vers leurs ancres.
- Suspendre / Reprendre / Annuler avec motif ; preuve calculée des campagnes internes ; « Déclarer réalisée »
  refusé avant la première publication / le premier message ; transmission à l'agence déclarée.
- Lien de la créatrice étendu : contenu, publication, facture sans compte.
- Parcours `lib/journey/activations.ts` dans `loadProjectJourneys` (Travail, Validations, Maintenant).
- Migrations `20261019060101`, `20261019060201` (à pousser en prod avec accord) ; pgTAP
  `marketing-activations.test.sql` (65) et `activation-creator-link.test.sql`.



## Lot 5 — Production par livrable sur le patron commun (19/10/2026, branche `pc/z5-production`)

- PR-0/1 : parcours du proto (étapes, rôles Exécute/Coordonne/Valide, étape Rushes), barre des livrables,
  Production ouverte au transfert, « Qui produit ? » (société proposée avec sa raison, mode de préparation).
- PR-2/3 : « Qui fait quoi » (Changer, Révoquer), « Changer qui produit » avec motif et choix précédents.
- PR-4/5 : call de production dans l'étape, invitation et résumé sur le lien ; réalisateur proposé par la
  société, « Retenir ».
- PR-6/7 : devis en versions (dont lieux, modification, référence active, révision) ; checklist de
  préproduction.
- PR-9/10/12 : lieu comparé au devis et remplacé ; contrôle avant tournage par synthèse figée ; tournage
  confirmé et lien des rushes.
- Reste : PR-11 (proposition versionnée, validation externe), montage déposé par la société sans étape de
  post, destinataires de livraison, PR-13 (pochette, teasers déclinés).
- Migrations `20261019050101` à `20261019050801` à pousser en prod avec accord ; pgTAP
  `production-projet-complet.test.sql`.

## Finitions de la recette (19/10/2026, branche `pc/finitions`)

Accueil et Travail global tirés des parcours de chaque projet (une carte « À vous » par projet,
Validations = décisions, compteur de la barre = somme), plan du projet selon les workflows que le
projet a (Juridique toujours, Master avec un titre), Plateformes « Fait » après une clôture avec
réserves, plus de cascade layout → page dans le Marketing, pastille d'état à droite du titre,
compteur bleu sur les pilules, texte du verrou hors du plan. Détail et mesures :
`docs/projet-complet/RECETTE.md` § 7. Aucune migration.

## Reste des Activations et des pages privées (20/10/2026, branche `pc/r4-activations`)

- Activations : « Brief et proposition » en un formulaire (position de PDS + brief déclaré envoyé),
  récapitulatif d'agence marqué envoyé directement, alerte « Doublon probable » sur les cibles presse
  (même média, même journaliste), statistiques « Partielles » / « Indisponibles » comme états réels
  (relevé partiel, donnée indisponible) branchés dans Suivi & bilan, **une seule frise**
  (`lib/activations/phase.ts`) lue par les Activations et le Suivi & bilan.
- Pages privées : lien de la personne proposé dans « Qui fait quoi » de la Conception et de la
  Distribution et sur la carte d'une créatrice ; sur `/c/`, après un call, « Ce qui vous a été demandé »
  (actions confirmées par PDS, « À faire » / « Fait », jamais le compte rendu).
- Migrations `20261020040101`, `20261020040201`, `20261020040301` à pousser en prod avec accord ;
  pgTAP `activations-remaining.test.sql` (23). Détail : `docs/ARCHITECTURE.md` § 8 duodecies
  (« Reste des Activations ») et lot 11.
## Le reste transverse (20/10/2026, branche `pc/r5-transverse`)

Accueil et Travail global : lectures des parcours groupées entre projets (`lib/supabase/batch.ts`,
5 à 8 fois moins de requêtes, même contenu) ; `my_todo` et `project_status` de PO lisent les
parcours ; un seul encadré de question de PO (`PoQuestion`) ; vrais 404 pour un projet, un artiste,
un master, un call, un contact, un contrat ou un modèle introuvable (`app/(app)/app/loading.tsx`
supprimé, un `loading.tsx` par segment) ; infobulle du point d'un workflow hors du plan. Détail et
mesures : `docs/projet-complet/RECETTE.md` § 8. Aucune migration.
## Master — le reste (20/10/2026, branche `pc/r1-master`)

Ce qui manquait au Master par rapport au proto (`docs/protos/master-v2.html`, `docs/projet-complet/master.md`),
détail dans `docs/ARCHITECTURE.md` § 8 septies (« Le reste du Master ») :

- [x] **Facture, RIB et paiement** (`master:invoice`) : facture demandée au Master final, déposée sur le lien
      de l'ingénieur (`/m/`, `/c/`) ou ajoutée « reçue autrement », montant comparé au tarif engagé, échéance à
      30 jours, RIB lu par la direction seule et confirmé par téléphone s'il change, « Marquer comme payée »
      (date + preuve) ; budget du Master `Facturé` puis `Payé` ; « Facturation de PDS » dans les réglages
- [x] **Écoute de l'artiste** sur sa page par personne (`/c/`) : versions en écoute, retour minuté gardé dans
      l'équipe (règle 21), la validatrice notifiée
- [x] **Escalade d'un retard** à la direction, « Garder les dates » avec réponse, décision de la direction
- [x] **Réponse de la directrice créative lue par PO** avec ses citations vérifiées mot pour mot (règle 12)
- [x] **Livrables déposés par l'ingénieur** sur son lien, **Rouvrir le master**, **PDF du Brief**,
      **ingénieur maison** (membre de PDS, assigné, dépôt dans l'app, pas de facture)

Migrations `20261020010101` à `20261020010601` à pousser en prod avec accord. Tests pgTAP :
`master-invoices`, `master-listen`, `master-delay-escalation`, `master-answer-reading`,
`master-deliverables`, `master-inhouse`.
## Le reste du Juridique (20/10/2026, branche `pc/r3-legal`)

- Modèle de contrat demandé à la direction depuis les contrats à prévoir, validé ou refusé
  (motif signé) **dans** le Plan d'action ; « À vous · Valider le modèle « … » » pour la direction.
- Contrat en document en tête de sa carte à chaque étape qui suit la génération (nom versionné,
  « Voir le PDF », valeurs sourcées), « Modifier une clause » dans l'étape, « Changé depuis la
  v1 : clause « … » (qui, vN) : « … » », retour de la direction en tête, « Répondre et transmettre
  à nouveau ».
- Liens des confirmations de répartition visibles dans l'étape (scellés `LEGAL_LINK_KEY`, Copier /
  Marquer comme envoyé / Relancer / Nouveau lien / Révoquer avec motif), `PrivateLinkCard` commun
  avec la fiche.
- SACEM sur une page : « Avant de générer » en trois colonnes (Bloquant / À confirmer / Facultatif),
  « Générer la version à signer », « Générer un brouillon » (725 filigrané), bulletin en tête
  ensuite (« Télécharger »).
- Factures (J10) : dépôt par la page de la personne (`/c/`), écart expliqué, lecture et paiement par
  la direction seule, jamais de virement ni d'IBAN dans l'app.
- Migrations `20261020030101`, `20261020030201`, `20261020030301` à pousser en prod avec accord ;
  pgTAP `legal-reste.test.sql` (31), tests Juridique verts.
- Reste : envoi d'e-mails par PDS OS, contrat et bulletin signés déposés par la page de la
  personne, contrôle des factures dans Prêt pour la sortie, liste « À payer », reflet Budget.
## Reste de la Production (20/10/2026, branche `pc/r2-production`)

- PR-11 : proposition de réalisation en versions (traitement, moodboard, découpage en liens), validations
  interne et externe (management par son lien privé, rôle « Validation créative externe » de « Qui fait
  quoi »), version retenue gardée jusqu'à la suivante, « Demander une nouvelle version ».
- PR-13 : pochette en parcours léger (Versions de la pochette → Contrôle technique → Livraison, image
  contrôlée par le code : 3000 × 3000 px, JPG ou PNG, carré, 10 Mo au plus) ; teasers « Décliné du Clip
  officiel » qui suivent la production du clip et attendent « Montage du clip validé ».
- Montage d'une production externe déposé par la société sur son lien (sans étape de post), validation
  externe en plus de l'interne, fichier final déposé sur le lien, destinataires de la livraison (tout
  livrable) ; livré ≠ publié.
- Date et horaires du tournage en décision qui remplace l'ancienne (historique, tâche « À revoir »,
  préparation à confirmer de nouveau).
- Corrigé en rejouant `docs/protos/tests/production-v2.cjs` sur l'app (projet « Néons (recette Production) »,
  cheffe de projet, directeur créatif, DG, liens de la société, du réalisateur et du management) : une
  préparation externe confirmée n'est plus effacée par une écriture sur la fiche (`production_recheck` ne
  touche que l'interne), « Rushes reçus » / « Sauvegarde vérifiée » en gestes du proto, montage proposé à la
  société après ses rushes, une seule tâche « À revoir » par changement de date, responsable Activations
  pré-rempli, mots de la clôture du proto. Captures 390 clair et sombre, 1440 sombre : aucun défilement
  horizontal. Restent hors de cette zone : le contrôle point par point des exports (PROD-037, rejoué en
  base), la vérification d'un lieu avant de le retenir (PROD-013), « HT » absent des montants du devis.
- Migrations `20261020020101` à `20261020020501` à pousser en prod avec accord ; pgTAP
  `production-reste.test.sql`. Décisions : `docs/PRODUCTION-METIER.md` § 12.
## Finances unifiées (20/10/2026, branche `pc/f1-finance`)

- [x] **Une seule gestion des factures** des externes (Master et Juridique) : table `project_invoices`,
      données migrées, anciennes signatures gardées, un seul « Facturer à », un seul RIB, une seule carte
      (`components/invoices/`, `lib/invoices/`) au Master final, dans l'étape d'une personne du
      Juridique et sur `/m` et `/c`
- [x] **« À payer »** de la direction sur le Budget du projet, payable sur place
- [x] **Budget** Estimé → Proposé → Engagé → Facturé → Payé suivi par les factures, sans double compte
- [x] **« Prêt pour la sortie »** : « Facture de X » à suivre tant qu'elle n'est pas payée, jamais bloquante
- [x] **« HT »** sur tous les montants, un seul formateur (`lib/utils/money.ts`)

Migrations `20261020060101`, `20261020060201` à pousser en prod avec accord (après `20261020010101` et
`20261020030301`). pgTAP : `project-invoices` (24), `master-invoices`, `legal-reste`,
`master-deliverables` adaptés. Reste : paiements des créateurs d'Influence (`influence_payments`, leur
propre circuit « Payé déclaré / vérifié »), non fusionnés ; envoi réel des e-mails de demande de facture.

## Signatures par la page privée, UPC, vrais 404, reste de la Production (20/10/2026, branche `pc/f2-signatures`)

- **Contrat et bulletin SACEM signés par la page de la personne** (`/c/`, règle 19) : « Envoyer à X » met
  la version validée sur sa page (lien créé au besoin), « Je l'ai remis autrement » garde comment et le
  jour ; la personne télécharge le PDF, dépose le signé (PDF seul, refusé avec sa raison) ; l'équipe lit
  « Reçu de X par son lien privé » et marque signé (le dépôt horodaté vaut preuve) ; le bulletin signé
  par le lien enregistre la signature, « A signé autrement » + date pour l'équipe. Notifications
  `legal_contract_signed_received`, `legal_bulletin_signed`.
- **UPC** dans les Paramètres de distribution, contrôlé par le code (12 ou 13 chiffres, clé GS1), lu par
  le dossier de livraison.
- **Vrais 404** pour un livrable, une activation, un call, un compte rendu, un document ou une route
  juridique inconnus sous un projet existant (`lib/projects/record-guard.ts`).
- **Production** : contrôle point par point des exports, blocage signalé puis levé, rejoués dans l'app ;
  lieu non vérifié refusé à l'écran avec sa raison.
- Migration `20261020070101` à pousser en prod avec accord ; pgTAP `signed-returns.test.sql` (30), tests
  Juridique existants verts. Détail : `docs/ARCHITECTURE.md` (lot 11 « Ce qui revient signé… »,
  § 3 bis « Vrais 404 », § 8 octies « UPC », § 8 nonies « Rejoué dans l'app »).
- Reste : envoi réel des e-mails ; « Signer pour PDS Éditions » par la DG ; 404 d'une démarche juridique
  inconnue ; le contrat ne compte pas dans « n objets » des liens privés (`contact_page_items`).

- [x] **Retours d'Ibé, lot 3 : confirmation et passage à la suite** (22/10/2026, branche
  `retours/lot3-confirmation-suite`) : après un envoi ou une validation, le bouton dit qu'il travaille,
  le bandeau confirme dans l'étape, puis dit la suite — « À vous : … », ou « En attente de **X** : … ».
  Si la suite revient à la même personne sur une autre étape, elle s'ouvre seule avec le bandeau
  (`withOutcome … { openNext: true }`, `open`). Sur les 6 dimensions (chaque réponse confirmée dans le
  bandeau, la dernière ouvre le Brief de cadrage), le Brief de cadrage (créer, envoyer, décision de la
  direction), le plan du projet (lancer) et le Brief Master (commencer, enregistrer). Attente d'un
  autre = `StepWaiting` (remonté du Suivi & bilan dans `shell/journey/`). Sans migration. Détail :
  `docs/ARCHITECTURE.md` § 3 ter, « Passage à la suite ».
  Reste : à rejouer dans un vrai navigateur par l'équipe (pas de session locale en mode auto) ;
  les numéros « Retours 02, 01 » du lot n'ont pas de page Notion retrouvée.

- [x] **Retours d'Ibé, lot 4 : l'action principale en haut, des liens directs depuis Travail**
  (retours 03 et partie lien du 09, 22/10/2026, branche `retours/lots-4-7`) : quand la personne a un
  geste à faire dans une étape, il passe en tête (`StepPanel lead`, encadré « À vous · action »
  ancré `#a-vous`), le bandeau de résultat au-dessus, la grille « Qui fait quoi, prérequis et
  suite » repliée dessous. Cas de Nadia : la décision d'une version au Mixage et au Mastering
  (la version, ses retours, Valider / Demander une modification ; versions précédentes, tarif,
  lien privé et échanges repliés) et la question qu'on lui pose au Brief (le Brief replié sous
  « Le Brief en cours »). L'acteur porte `href` (`leadHref`) : Travail (global et du projet),
  l'Accueil, « Maintenant », la Vue d'ensemble, les sources de PO et l'ouverture automatique du
  lot 3 ouvrent la section (`actionHref`). Sans migration. Détail : `docs/ARCHITECTURE.md` § 3 ter,
  « Action en tête, lien direct ». La prise en charge par Karim est sur son lien privé : lot 6.
  Reste : à rejouer dans un vrai navigateur par l'équipe.

- [x] **Retours d'Ibé, lot 5 : facture et paiement** (retour 09, 22/10/2026, branche
  `retours/lots-4-7`) : depuis Travail, « Payer la facture de Karim » ouvre la facture elle-même,
  en tête du Master final (`InvoiceLead`) : PDF, montant contre le tarif, échéance et RIB, puis la
  confirmation du RIB ou la date et le justificatif du virement ; le Master final et le budget se
  replient dessous. Une fois payée, l'action quitte le parcours et Travail. « Ouvrir » de « À payer »
  et de « Prêt pour la sortie » mène à la facture (`#facture-<id>`). Justificatif vérifié : dans le
  bucket privé `project-invoices` à côté du PDF, lisible par la direction seule. Sans migration.
  Détail : `docs/ARCHITECTURE.md` § 8 ter bis. Reste : à rejouer dans un vrai navigateur.

- [x] **Retours d'Ibé, lot 6 : page du prestataire externe** (retour 08, 22/10/2026, branche
  `retours/lots-4-7`) : sur le lien privé de Karim (`/m/[token]`, et ses cartes sur `/c`), le geste
  du moment est « À vous », encadré comme l'action en tête du lot 4, et vient en premier dans sa
  carte : prendre en charge (avant le message, les fichiers et le Brief), déposer la version
  attendue (avant les versions envoyées ; un dépôt non demandé reste possible, replié), répondre
  au label quand il a écrit en dernier. Les fichiers et le Brief restent à un clic (« Revoir le
  dossier »). Sans migration. Détail : `docs/ARCHITECTURE.md` § 8 septies, « La page suit
  l'avancement ». Reste : à rejouer dans un vrai navigateur.

- [x] **Retours d'Ibé, lot 7 : retours audio et versions** (retour 06, 22/10/2026, branche
  `retours/lots-4-7`) : au Mixage et au Mastering, les retours sont rangés dans leur version
  (minutage, contenu, auteur, quand), marqués « Interne » ; ce que Karim a reçu est un encadré à
  part (« Demande de modification envoyée à Karim » ou « Retours transmis à Karim, sans décision »,
  signé, daté, « Envoyé à Karim ») ; la version suivante s'ouvre sur « Corrections reçues : répond
  à la demande sur le Mix V1 » : Mix V1, demande à Karim, Mix V2 se lisent d'un coup. Sur le lien de
  Karim, la demande est au-dessus de son dépôt. Sans migration. Détail : `docs/ARCHITECTURE.md`
  § 8 septies, « Retours rangés par version ». Reste : à rejouer dans un vrai navigateur.

- [x] **Retours d'Ibé 04, 05 et 10** (21/10/2026, sur `main`, fusionnés dans `retours/lots-4-7` le
  24/10) : le Brief Master enregistré ne repropose plus « Enregistrer » (« Enregistrer les
  modifications » s'il a changé) ; un blocage dit sa raison et mène à « Résoudre le blocage »
  (`BlockerCallout`, type `Blocker`), y compris sous le Mix fait sur des voix de travail ; toute étape
  ouverte dit qui agit et quoi (`StepActor`, masqué quand l'encadré « À vous » du lot 4 le dit déjà),
  « Ensuite » nomme qui reprend. À la fusion, le tableau du Travail (`lib/work/rows.ts`) suit
  `actionHref` pour garder les liens directs des lots 4 et 5. Reste : à rejouer dans un vrai navigateur.

## Recette Juridique V1 d'Ibé (24/10/2026, branche `retours/juridique-v1`)

Ticket de recette du 21/10/2026 (JUR-01 à JUR-12, scénario « Néons »), d'après le proto
`docs/protos/juridique-v3.html` validé avec Sacha. Détail technique : `docs/ARCHITECTURE.md`
§ 8 sexies, « Recette Juridique V1 ». Migrations `20261024000101` à `20261024000601`, à pousser
en prod avec accord.

- [x] **Lot 1, transverse** : sections d'étape (`StepSection`), carte « Lien privé » de la
      maquette Figma, « À vous » en tête de l'étape (JUR-08), bandeau de résultat qui mène à la
      suite (JUR-04).
- [x] **Lot 2, plan d'action** (JUR-05, JUR-12) : démarches immédiates / dépendantes,
      « Prérequis », ce que le lancement crée ; contrats des intervenants par état, « déjà payé »
      refusé comme motif.
- [x] **Lot 3, fiche** (JUR-06) : reçue n'est pas complète ; validée par l'équipe, ou complément
      redemandé sur le lien privé.
- [x] **Lot 4, signature d'un contrat** (JUR-11) : la direction signe pour PDS, l'équipe vérifie
      la signature, puis « Marquer comme signé ».
- [x] **Lot 5, répartition** (JUR-01) : créateurs, qui édite la part de chacun (PDS Éditions,
      éditeur du Réseau, coédition, aucun), parts saisies, jamais proposées ; PDS Éditions sans
      lien de confirmation.
- [x] **Lot 6, SACEM** (JUR-02, JUR-03, JUR-10) : bulletin en cinq sections, état sur chaque
      ligne, genre en liste, première exploitation et vérification DEP / DR exigées ; dépôt et
      réponse (enregistrée / à corriger / rejetée) avec preuves PDF et identifiant SACEM.
- [x] **Lot 7, autorisation d'utilisation** (JUR-09, JUR-10) : « Emprunt » renommé, œuvre et
      enregistrement autorisés à part, conditions acceptées ≠ autorisée, plus de frise.
- [x] **Lot 8, Prêt pour la sortie** (JUR-07) : bandeau (non prête, prête à être validée,
      validée, livrée au distributeur), trois tuiles, détail replié.
- [x] **Lot 9, modales** : « A signé autrement » (avec le scan), « Je l'ai remis autrement »,
      facture reçue autrement, « Marquer comme payée », « Je conteste ».

Reste : signature de PDS Éditions sur le bulletin par la direction dans l'app (le bulletin ne
sait pas encore quelle ligne d'éditeur est la maison) ; « Continuer vers l'étape suivante » branché
sur les autres gestes (JUR-04, fait pour la fiche) ; tout rejouer dans un vrai navigateur.

## Pré-prod navigable comme un proto (26/10/2026, branches `feat/preprod-tools` et `pre-prod`)

- [x] **Barre « Voir comme / Aller à »** (`components/preprod/`, `lib/preprod/`) : vraie connexion à un
      compte de test sans quitter la page, cinq moments du parcours ; affichée seulement avec
      `PREPROD_TOOLS=1` hors déploiement Production. Données de test de PO aussi actives en pré-prod.
- [x] **Jeu de données** `supabase/preprod/seed.sql` : quatre comptes du proto, cinq projets amenés à
      leur moment par les vrais gestes (de « à accepter » à « plan lancé ») ; rejoué sans erreur sur la
      base locale dans une transaction annulée. `pnpm preprod:reset` remet la base à zéro (refuse une
      base avec de vrais comptes).
- [x] **Branche `pre-prod`** = `retours/juridique-v1` + `feat/preprod-tools`.

Reste : créer le projet Supabase de pré-prod et les variables Vercel de la branche (`docs/PREPROD.md`
§ 2), vérifier la connexion des comptes de test sur la vraie base ; moments suivants (Stratégie à
valider, Master, Juridique, Conception, Distribution).

## Visibilité des projets en une passe (26/10/2026, branche `perf/visible-projects`)

- [x] **`visible_project_ids()`** (`…20261026000101`) : la règle « qui voit un projet » calculée une
      fois par requête ; 137 policies `can_see_project(project_id)` (et la lecture de `projects`)
      réécrites dessus. Mesuré sur la pré-prod en tant que cheffe de projet : 45–50 ms → 1 ms par
      lecture (étapes, réponses du Cadrage).
- [x] Test `visible-project-ids.test.sql` (24) : même résultat que `can_see_project_row` pour dix
      profils (DG, responsable, autre chef de projet, assigné en attente, créatif, ingénieur interne,
      responsable de production, compte désactivé, membre en attente, autre maison).

Reste : pousser la migration en prod avec accord.

## Chargement des pages (26/10/2026, branche `pre-prod`)

Audit : la lenteur venait du volume de requêtes par rendu (65 à 250 par projet, 4 à 7 vagues) sur une
petite base, amplifié par le préchargement et les rafraîchissements. En isolation une lecture prend
moins de 1 ms ; sous la charge, `get_my_access` montait à 140 ms en moyenne (`pg_stat_statements`,
pré-prod). Détail : `docs/ARCHITECTURE.md` § 3 bis.

- [x] **`ProjectLive` / notifications** (`7394219`, migration `…20261026100101`) : plus de
      rafraîchissement complet pour ses propres écritures ni au retour sur l'onglet sans changement ;
      notifications regroupées, onglet caché en attente.
- [x] **Préchargement à l'intention** (`4018c45`) : `ViewLink` précharge au survol, au focus, au
      toucher, plus à l'entrée dans l'écran (15 à 20 rendus en fond par page de projet).
- [x] **Une lecture par requête** (`73839bb`) : `list_legal_people` (×4), couverture et blocages de
      la Distribution (×2), suivi du Juridique et vues du Master (×2) sous `cache()`/`memoPerRequest`.
- [x] **Mesure** (`7092c70`) : `PERF_TRACE=1` → ligne `[perf]` par rendu (requêtes, durée, profondeur).
- [x] **Cache des parcours par version du projet** (`2e06e5d`, migration `…20261026100201`) :
      `project_live` couvre tout le projet (déclencheur sur 175 tables, une incrémentation par
      transaction) ; états des workflows, parcours et contextes gardés d'une requête à l'autre pour la
      version et le lecteur. Tests `project-live.test.sql` (10/10 sur la pré-prod, migration rejouée
      dans une transaction annulée) ; logique du cache vérifiée hors app (copie, version, lecteur,
      projet invisible, concurrence, échec, données non pures).
- **Écarté pour l'instant : une RPC unique des données brutes des parcours.** Il faudrait couper
      une quarantaine de lecteurs en « lecture » + « calcul » et réécrire leurs `select` en SQL, sans
      pouvoir le vérifier dans un navigateur ; avec le cache par version, ce calcul ne repart
      qu'après un changement du projet. À reprendre si `PERF_TRACE` montre des rendus à froid trop
      lents, en commençant par la page la plus profonde.

Reste : rejouer la navigation en `pnpm build && pnpm start` puis sur la pré-prod avec `PERF_TRACE=1` ;
pousser les migrations `20261026100101` et `20261026100201` en prod avec accord ; taille de la base
Supabase de prod à vérifier (la pré-prod est sur l'offre gratuite).

## Recette Distribution V1 d'Ibé (26/10/2026, branche `pre-prod`)

Retours DIST-001 à DIST-007 du 23/10 sur le proto, appliqués à l'app (le dernier retour fait foi sur
les tickets précédents). Détail : `docs/ARCHITECTURE.md` § 8 octies, « Recette Distribution V1 ».

- [x] **SQL** (migrations `20261026200101` à `20261026200401`, appliquées sur la pré-prod) :
      soumission et validation bloquées sans les six contrôles, refus nommant ses modules, anomalie
      reliée à sa correction, dérogation de la direction ; contrôles par version, remis à zéro par
      module ; clôture avec réserves après acceptation, anticipée / annulée / abandonnée par la
      direction ; réserves suivies jusqu'à leur levée (preuve, autre personne, échéance) ; source et
      ordre des déclarations ; plateforme vérifiée avec territoire et preuve, indisponibilité avec
      action. Tests : `distribution-recette.test.sql` 47/47, `distribution.test.sql` 110/110,
      `distribution-journey.test.sql` 38/38 (sur la pré-prod, en transaction annulée).
- [x] **Écrans** : blocages de soumission dits et dérogation (direction), « À corriger dans » au
      refus, version des contrôles, réserves à remplir puis suivies, arrêt de la distribution,
      « Tout est bon » avec territoire/jour/preuve, indisponibilité avec action, source des
      déclarations ; notifications (dérogation, levée demandée/décidée, réserve échue).

Reste : passage dans un vrai navigateur (non fait : pas de session locale en mode auto) ; pousser les
quatre migrations en prod avec accord ; le territoire est saisi en texte (aucun droit structuré par
territoire n'existe au Juridique) ; une dérogation échue n'alerte pas encore (seules les réserves).


## Recette Marketing V1 d'Ibé (26/10/2026, branche `pre-prod`)

Retours du 23/10 sur le proto (5 P0, 11 P1, 10 P2), appliqués au proto **et** à l'app ; le dernier
retour fait foi sur les tickets précédents (règle 14 de `docs/VISION-UX.md` réécrite : un changement de
lieu bloque désormais le tournage). Les retours Stratégie (11/10) visaient l'app d'alors, déjà
corrigée aux lots 9a à 9e : seuls les reliquats sont repris. Détail : `docs/MARKETING-METIER.md`,
`docs/PRODUCTION-METIER.md` § 8 bis, `docs/ARCHITECTURE.md` (Production, Stratégie, Activations, Suivi & bilan).

- [x] **Protos** (`docs/protos/marketing.html`, `production-v2.html`, `distribution.html`, `projet.html`
      reconstruit, copies sur le Bureau) : tous les tickets, tests `marketing.cjs`, `production-v2.cjs`,
      `distribution.cjs`, `projet.cjs` à `errors: []`.
- [x] **Production** (migration `20261026300101`) : un changement de lieu, date, devis ou proposition
      rouvre la préparation validée ; point critique = direction + plan de rattrapage en tâches
      (`production-ready-recette.test.sql` 30/30). Champs date/heure vides sous Safari (`Input`
      `data-empty`), « * » sur l'organisation.
- [x] **Stratégie** : réponse cochée dans le Brief V1, « Aucune dépense estimée », dépassement
      « enveloppe − proposé − à arbitrer », temps forts passés et dépendances juridiques dans
      « Restant à arbitrer », récit sans parties vides.
- [x] **Activations et bilan** (migrations `20261026400101` à `20261026400301`) : Influence figée avant
      le lancement et clôture refusée avec un créateur engagé ouvert ; « Envoyer l'accord » (envoi
      déclaré) ; agence déclarée réalisée seulement sans média à examiner ni ligne en erreur, ou avec
      une réserve ; échéance bornée à la fin de campagne ; sources de mesure par levier ; « Hors
      filtre » ; activation ouverte = réserve non décochable jusqu'à la clôture ; doublon en boucle
      interdit ; facturé, budget par activation, écart objectif / résultat (`marketing-recette-v1.test.sql` 30/30).

Reste : passage dans un vrai navigateur ; pousser les quatre migrations en prod avec accord ; le
formulaire d'une ligne de budget ne propose pas encore l'activation (colonne en base) ; paiements des
créateurs hors du budget par activation ; envoi réel de l'accord quand le SMTP de PO sera branché ;
`marketing-review.test.sql` échoue déjà avant ce lot (`multiple_validators` de la pré-prod).

## Navigation instantanée, lot 1 (27/10/2026, branche `pre-prod`)

Mesuré en `pnpm start` sur la base de pré-prod (`PERF_TRACE=1`), parcours rejoué par Sacha.

- [x] Fiches ouvertes depuis une liste préparées à l'intention (`DataTableLink`, `CardRow`,
      `ProjectSwitcher` passent par `ViewLink`) : liste Projets 3 rendus de 158 requêtes en fond → 2
      requêtes.
- [x] `withOutcome` lit avant / après sous `withQueryBatching`, qui garde aussi les réponses
      identiques d'un même périmètre (`lib/supabase/batch.ts`).
- [x] Trace : requêtes demandées **et** envoyées (`→ N sent`).
- [x] `design-context` gardé par version du projet (`nameOf` ajouté après le cache) : il était
      recalculé à chaque rendu (« not plain data »).

Reste (mesuré, non traité) : chaque écriture d'un projet rerend son cadre à froid (110 à 230
requêtes, 3 à 6 s par bouton du Cadrage) ; une première entrée dans un projet coûte ~158 requêtes,
l'Accueil 890 demandées / 310 envoyées ; Realtime (`list_changes`) = un quart du temps SQL de la
pré-prod.

## Navigation instantanée, lots 2 à 6 (27/10/2026, branche `pre-prod`)

Codé après l'audit du 27/10 ; build passé, poussé sur `pre-prod`. **À mesurer** (`PERF_TRACE=1`,
un bouton du Cadrage, une première entrée dans un projet) : rien n'a encore été rejoué en navigateur.

- [x] Lot 2 — aucun bouton n'attend le projet entier : barre, en-tête, « Maintenant » et barre des
      livrables sous `ProjectFresh` (frontière à clé = version, dernier rendu gardé) ; cadres de module
      sans `loadProjectJourneys` ; ~98 `router.refresh()` retirés après des actions qui revalident
      (12 gardés, raison dans le commit) ; cloche et compteur d'accès lus en parallèle de la page ;
      droit de lecture de `influence_agreements.sent_*` (`20261027000101`, faits des Activations).
- [x] Lot 3 — lectures dédoublonnées : `listProjectCreatives` en cache, lignes partagées du Master
      (`lib/master-workflow/shared-rows.ts`) et du Juridique (`lib/legal/shared-rows.ts`),
      `projectPlanRow`, lectures du projet partagées par tous les livrables, Stratégie et Distribution
      gardées par version, provenance en une requête, vagues parallèles ; états de la Distribution en
      une RPC (`20261027000201_distribution_status_rows`). Estimé : ~40 à 50 requêtes de moins à froid
      (5 livrables).
- [x] Lot 4 — poids des pages : dictionnaire `fr` découpé par domaine (le morceau de 700 Ko chargé
      partout a disparu ; règle ESLint) ; SDK d'IA chargé au premier usage de PO.
- [x] Lot 5 — barre de navigation en attente (`NavigationProgress`, après 150 ms).
- [x] Lot 6 — Realtime par diffusion depuis la base sur canaux privés (`20261027000401_live_broadcast`,
      RLS sur `realtime.messages` vérifié en base) ; plus de `postgres_changes`.

Migrations `20261027000101` à `…000401` appliquées en pré-prod, à pousser en prod avec accord.
Non fait : une RPC des états de tous les workflows (Master et Juridique y recopieraient les filtres
de leurs pages : écarté au profit des lectures partagées) ; zod côté client (415 Ko).


## Travail repensé et Calendrier (27/10/2026, branche `pre-prod`)

Demande de Sacha : refaire la page Travail selon la vision UX et coder le Calendrier, grisé jusque-là.
Aucune migration (lectures seules, RLS). Build passé ; vérifié en `pnpm start` sur la pré-prod
(Lina Haddad, Claire Morel), desktop et 390 px, sans erreur JavaScript.

- [x] Travail : « Maintenant » en tête (l'action la plus pressée, pourquoi, Validation, Ensuite,
      « Ouvrir » sur le geste), puis les autres actions par échéance (En retard, Cette semaine, Plus
      tard, Sans échéance, En attente d'un autre), onglets Tout / À faire / À valider ; le tableau et
      l'onglet « En retard » disparaissent (`docs/ARCHITECTURE.md` § 8).
- [x] Calendrier (`/app/calendar`) : sorties, dates du Brief Mix et Master, tournages, temps forts,
      calls, étapes datées et tâches libres de tous les projets visibles ; Mois / Semaine, Tout / À
      vous, agenda sur téléphone ; chaque date s'ouvre là où elle se décide (`docs/ARCHITECTURE.md`
      § 8, « Calendrier »).
- [x] Partagé avec les Calls : jours et périodes (`lib/utils/calendar-period.ts`), barre
      `CalendarToolbar` (`components/ui/`), `loadLaunchedJourneys` (Travail, accueil, Calendrier).
- [x] 28/10, retours de Sacha : « Travail » de la barre principale ouvre toujours le Travail global,
      même depuis un projet (compteur = tous les projets) ; sous « Maintenant », les actions
      reviennent en **tableau** « comme Asana, Plane, GitLab » (`WorkTable` : Action, Projet en
      étiquette de couleur, Échéance, Validation, État ; groupes par échéance repliables) ; puis le
      module (Master, Juridique…) passe en étiquette dans sa propre colonne **Module**.

Reste : la pré-prod n'a encore ni Brief Mix, ni temps fort, ni tournage, ni étape datée ; à rejouer
quand le jeu de données en aura (`supabase/preprod/seed.sql`).

## Cache par table (28/10/2026, branche `pre-prod`)

Audit mesuré (pré-prod, `pg_stat_statements`, 80 pages parcourues avec `PERF_TRACE=1`) : une écriture
faisait recalculer tout le projet (263 requêtes, 1,2 à 4,5 s sur une base Micro à ~10 connexions
PostgREST). Livré (`docs/ARCHITECTURE.md` § 3 bis, « Cache par table ») :

- `20261028000101_project_live_tables.sql` : `project_live.tables`, version de chaque table par projet ;
  `20261028000201_live_rpc_reads.sql` : tables lues et lecture seule de chaque fonction.
- Vues et réponses gardées avec les tables qu'elles ont lues (`lib/projects/live-deps.ts`,
  `version-cache.ts`, `request-cache.ts`), parcours et faits des états par workflow ; `trackedCache`
  à la place de `cache` dans `lib/` (règle ESLint).
- Bouton en cours (anneau sur le bouton cliqué) et `withOutcome` passé par le cache.
- Mesures : après une contrainte du Cadrage, 22 requêtes au lieu de 263 ; page déjà vue, 9 en moyenne.
- Retour sur un projet après une pause (vues de plus de 5 min) : servies tout de suite et recalculées en
  arrière-plan après la réponse (1,3 s au lieu de 4,8 s mesurés). « Voir comme » ne déconnecte plus
  d'abord (un appel à Auth de moins, et les autres sessions du compte ne sont plus fermées).
- Entrée d'un module : la barre du projet, les pilules du Marketing et le fil d'Ariane lient directement
  l'étape d'arrivée (`lib/journey/landing.ts`) au lieu de la page qui redirige : plus de page vide puis
  de second squelette en ouvrant un module.
- Reste : gestes d'écriture optimistes si l'attente se voit encore, instance froide sur Vercel après
  une pause (cache d'exécution Vercel, payant), taille de l'instance de prod (décision).

## Échange de cadrage selon la maquette Figma (28/10/2026, branche `pre-prod`)

Maquette de Sacha (Figma PDS OS, node `282:6170`), appliquée au Cadrage et, pour le bloc de l'échange
prévu, à tous les modules qui en ont un (Stratégie, Conception, Production) :

- Un seul titre, « Échange de cadrage » ; la phrase des deux chemins disparaît une fois l'échange
  préparé (un `why` vide n'est plus affiché), et « Départ » ne répète plus la date de l'échange prévu.
- `PlannedCallFacts` redessiné : bloc Quand / Organisé par, lien de la visio (`LinkPill`), participants,
  ordre du jour en liste ; le format (« Visio ») n'est plus affiché ; « Enregistrer l'échange » en
  bouton principal ouvre la page du call sur son enregistreur (`#call-recording`).
- « Annuler l'échange » (et non « Commencer sans appel ») : migration `20261028000301_cancel_framing_call`
  (appliquée en pré-prod, à pousser en prod avec accord), test `supabase/tests/cancel-framing-call.test.sql`
  (7/7 en pré-prod), annulation de l'événement Google.
- La grille Exécute / Coordonne / Valide / Prérequis / Ensuite reste (choix de Sacha).

- Puis (même jour) : « Enregistrer l'échange » enregistre directement dans la carte (choix de l'onglet
  du Meet au clic), et la transcription et le compte rendu s'y lancent ; plus besoin de la page du call.

- Puis (même jour) : un call de projet invite aussi la direction et n'importe quel directeur créatif,
  qui rejoint l'équipe créative du projet (DC oublié à la création). Migration
  `20261028000501_call_invite_members` (appliquée en pré-prod, à pousser en prod avec accord), test
  `supabase/tests/call-invite-members.test.sql` (7/7 en pré-prod).

- Puis (même jour) : « Préparer en détail » retiré de l'ordre du jour (ni demandé par Ibé ni dans son
  proto) : la durée reste sur chaque point (PROJ-UX-03), les questions de PO sont toujours enregistrées et
  s'affichent sous chaque point dans la carte de l'échange prévu, comme aide-mémoire.

- Puis (même jour) : « Connu » passe en vert comme « Confirmé » ; la description de l'invitation Google
  d'un échange préparé reprend ce que montre « Envoyé avec l'invitation » (objectif, ordre du jour et
  durées, documents, lignes du module), au lieu de « Call planifié depuis PDS OS. ».

- Puis (même jour) : « M'aider à définir » aussi strict que la lecture après l'échange (même définition,
  même contrôle `answerHolds`, rien d'ajouté au passage cité) : un « nouveau home studio » n'est plus
  proposé comme dépense engagée.

- Puis (même jour) : Brief de cadrage en un geste, la prochaine version affichée telle qu'elle partira
  et « Envoyer en validation à X » qui la fige et l'envoie (plus de « Créer le Brief ») ; les versions
  précédentes repliées. Dans « 06 · Cadre juridique », les parties une par ligne avec leur statut,
  qualifiables sur place tant que la dimension est ouverte.

- Puis (même jour) : PDF du Brief gardé dans Storage (imprimé à l'envoi et à la validation, relu ensuite),
  police intégrée, bouton « Télécharger en PDF » sur chaque carte de version. Migration
  `20261028000701_framing_brief_pdfs` (appliquée en pré-prod, à pousser en prod avec accord), test
  `supabase/tests/framing-brief-pdfs.test.sql` (6/6 en pré-prod).
- 29/10 : la 1re étape garde son nom, « Démarrer le cadrage » (et « Démarrer la stratégie »), quel que soit
  le chemin : plus de « Échange de cadrage » ni de « Départ » comme titre (Sacha : un nom qui change perd le
  repère). Sa ligne dit le chemin : « À vous · choisir comment démarrer », puis « Tenir l'échange du JJ/MM »,
  puis « Échange du JJ/MM » ou « Commencé directement ».
- 29/10 : **début du Cadrage selon la maquette Figma** (PDS OS, section 304:20801, 5 écrans) :
  - **fil d'Ariane** dans une barre du haut de 55 px, « Module / Étape » sans le projet, sur toutes les pages d'un
    projet ; plus de ligne de faits du projet par défaut ; Vue d'ensemble : le nom seul (ni état ni faits) ;
  - parcours et cartes : « À vous : … » (deux-points au lieu du point médian) ; « Avant les workflows » : « Après :
    étape attendue », sans « Ouvrir le Cadrage » ;
  - départ : bouton dessiné au pied de chaque carte (plein sur la recommandée), raison sous elle, « Un échange avec
    la direction » ;
  - formulaire : titre au-dessus d'un bloc, « Objectif de l'échange * » toujours modifiable, plus de « Envoyé avec
    l'invitation » à l'écran (les Sujets ne vont que dans l'invitation Google), « Revenir au choix » au lieu de la
    ligne « Départ … Changer » et de « Commencer directement plutôt » (Cadrage et Stratégie) ;
  - récapitulatif et échange prévu dans le même bloc (`CallPlanBlock`) : titre du call, Quand / Organisé par,
    lien (une fois créé), participants, ordre du jour à côté de l'objectif ; plus de questions de PO sous les
    points ; « Enregistrer l'échange » et « Annuler l'échange » en boutons pleine taille.

Reste : passage navigateur ; l'enregistrement dans la carte pour la Stratégie, la Conception et la
Production ; « Annuler l'échange » pour l'échange stratégique et créatif si on le veut ;
prévenir dans l'app les participants d'un échange annulé (aujourd'hui seul Google les prévient, quand il
est branché).


## Audit des retours écrits d'Ibé : les P0 (28/10/2026, branche `pre-prod`)

Les quatre PDF d'Ibé (Néons 19/10, Juridique 21/10, Distribution et Marketing 23/10), le Drive et Notion
relus contre le code ; les trous de fiabilité tenus par l'écran seul sont passés en base. Migration
`20261028000601_recette_p0_guards` (appliquée en pré-prod, à pousser en prod avec accord). Détail :
`docs/ARCHITECTURE.md`, « Audit des retours écrits d'Ibé » et « Synthèse revérifiée en base ».

- [x] **JUR-11** : la signature de PDS d'un contrat vaut pour sa version ; une clause modifiée l'annule
      (historique « Signature de PDS annulée »), « Marquer comme signé » l'exige sur la dernière version.
- [x] **MKT-PROD-002** : « Confirmer : préparation validée » ne croit plus la synthèse du navigateur ; un
      appel direct ne peut plus sauter la direction.
- [x] **JUR-03** : une modification du bulletin annule les signatures de sa version (« Ne vaut plus »,
      « Versions remplacées » repliées) ; « Signer pour PDS Éditions » par la direction dans PDS OS.
- [x] **JUR-06 / JUR-12** : fiche incomplète et « déjà payé » refusés en base aussi.
- [x] Bug trouvé en route : un éditeur du bulletin saisi à la main perdait « qui il édite » et son
      contrat à l'enregistrement (schéma zod), le bulletin restait bloqué sur « publisher_link ».
- Tests pgTAP (pré-prod, transaction annulée) : `legal-formalities` 37/37, `legal-reste` 35/35,
  `legal-form-validation` 11/11, `legal-contracts-before-launch` 13/13, `production-ready-recette` 32/32,
  `production-projet-complet` 57/57, `production-reste` 66/66 ; fixtures de ces tests et de
  `legal-form-contact-corrections` mises en conformité (fiches complètes, préparation réellement prête).

Reste : passage navigateur ; pousser la migration en prod avec accord ; les P1/P2 de l'audit (bandeau de
suite sur les gestes du Juridique et du Brief Master, marqueur « déclaré par l'équipe » en Distribution,
réserves de disponibilité, budget par activation…) ; la valeur juridique de la signature électronique
simple et la signature du bulletin acceptée par la SACEM, à faire confirmer par Ibé.


## Recherche et filtres sur les pages de liste (29/10/2026, branche `pre-prod`)

Demande de Sacha : une recherche et des filtres sur la plupart des pages pour trouver plus vite. Même
forme partout que Catalogue et Réseau : onglets, bouton « Filtres » (`UrlFilters`, choix gardés dans
l'URL, pastilles qui retirent le filtre), recherche instantanée (`SearchableList`) au-dessus du tableau.

- [x] **Artistes** : recherche (nom, notes) + filtre Titres (avec / sans).
- [x] **Fichiers** : filtres Catégorie, Type de fichier (audio, image, document), Ajouté par (la recherche existait).
- [x] **Contrats** : filtres Type, Projet, Artiste, Responsable (la recherche existait).
- [x] **Calls**, vue liste : recherche (titre, projet) + filtres Projet (dont « Réunion interne ») et Traitement.
- Déjà en place : Projets (recherche + Type, Responsable, Statut, Échéance), Catalogue, Réseau.
- Non ajouté, volontairement : Équipe (3 à 5 comptes, les onglets par statut suffisent), Modèles de
  contrats (quelques modèles), Retours (rangés par sujet par PO).

Reste : passage navigateur.


## Accueil refait selon la vision produit (29/10/2026, branche `pre-prod`)

Demande de Sacha : refaire l'accueil avec `docs/VISION-UX.md`. Proto validé d'abord
(`docs/protos/accueil.html`, test `docs/protos/tests/accueil.cjs`), puis le code, sans nouvelle requête :
l'accueil lit les lignes du Travail et les parcours (`lib/home/feed.ts`).

- [x] Sous la salutation, ce qui attend la personne, compté par le code (« 2 validations vous attendent »).
- [x] **Maintenant** : la même action que Travail (`leadOf` : projet à accepter ou à retransmettre d'abord,
      puis le retard, puis l'échéance), son pourquoi, qui valide, ce qu'elle débloque, « Ouvrir ».
- [x] **Aussi à vous** : les trois suivantes, puis « Tout voir dans Travail ».
- [x] **Ce que vous attendez** : qui, sur quoi, pour quand, en retard d'abord (tout pour la direction ; sinon
      ses projets et les étapes qu'on validera), et les projets en attente d'acceptation.
- [x] **Vos projets** : par échéance, avec ce que chacun demande : l'action la plus pressée (« Valider le Mix V1
      +3 »), que la ligne ouvre, sinon le statut de transmission ou « Suivi » (un compte « 2 à vous » ne disait
      rien, Sacha 29/10).
- [x] Retirés : la grille de cartes (`CardGrid`, `home-cards`, `JourneyActionsCard`), l'Activité et les Sorties
      de l'accueil, et leurs textes ; la saisie de PO garde sa hauteur Figma (déjà plus haute que le proto).
- Décision prise faute de règle : « les étapes que je validerai » sont reconnues au nom du valideur, les étapes
  ne portant pas l'id de la personne.

Reste : passage navigateur sur la pré-prod avec les quatre rôles.

### Suite du 29/10 : la barre du wireframe Projets, Travail, tableaux en carte

- [x] **Une ligne recherche + filtres** sous les onglets (Figma 90:4972, `ListToolbar` + `FilterBar`) :
      3 filtres principaux en listes déroulantes, les autres derrière le bouton « Plus de filtres ».
      Projets (Type, Responsable, Statut ; Échéance en avancé), Contrats (Type, Projet, Artiste ;
      Responsable en avancé), Catalogue, Réseau, Fichiers, Artistes, Calls ; le bouton « Filtres »
      d'avant disparaît.
- [x] **Travail** : recherche (action, projet, module) + Projet, Module, Échéance, dans l'URL.
- [x] **Tableaux en carte** partout (`DataTable`) : contour, fond, en-tête sur bande, filet entre les
      lignes ; sans cadre dans une carte de section (règle du 04/10).
- [x] Recherche et filtres en champs du système (16 px, contour, `rounded-lg`, plus de pilule).
- [x] Tableau des projets : **Artiste** et **Priorité** dans leurs colonnes, plus sous le nom ;
      Responsable et Type ne s'affichent qu'en très grand écran (filtrables au-dessus).
- [x] Projets : colonne **Phase** retirée (Responsable revient dès 1280 px) ; filtre **Artiste** ;
      sur la ligne Artiste, Type, Responsable, et **Statut + Échéance** dans le bouton des filtres avancés.
- [x] Saisie de PO (accueil, fenêtre Espace Espace, conversation) : en sombre, la zone de texte
      n'a plus son propre fond dans la boîte teintée ; **pilules de suggestions retirées** (Sacha,
      « pour l'instant », en attendant une meilleure présentation).
- Reste : passage navigateur (session requise).


## Vue d'ensemble d'un titre du Catalogue refaite (29/10/2026, branche `pre-prod`)

Demande de Sacha : retirer le chevron de « Complétude du dossier », puis un audit et un proto
(`docs/protos/titre.html`, les six onglets, test `docs/protos/tests/titre.cjs`), puis le code.

- [x] La complétude toujours ouverte (le chevron ne cachait rien : la carte gardait la hauteur de sa voisine).
- [x] Ligne de faits sous les onglets : état audio, version de référence, projet, distribution.
- [x] « Maintenant » du titre (`NowFrame`) : la prochaine action calculée, son pourquoi, ce qui suit, « Ouvrir ».
- [x] « Dossier du titre » : une ligne par pièce avec sa valeur, « Pour la sortie » puis « Ensuite », le Master
      final verrouillé jusqu'à sa validation ; chaque manque se remplit sur place avec la fenêtre de son onglet.
- [x] Informations sans les identifiants (plus de doublon), artistes en simple liste ; « Créer un projet » secondaire.
- Écart assumé avec le proto : les parts s'ajoutent une à une (la fenêtre « Nouvelle part » existante) et
  les déclarations mènent à l'onglet Droits, au lieu des fenêtres groupées du proto ; pas de source
  « Modifié par » sur chaque valeur (l'app ne garde pas l'auteur de chaque champ).

Reste : passage navigateur avec un titre rempli et un compte en lecture seule.


## Suite du Cadrage plus claire (29/10/2026, branche `pre-prod`)

Demande de Sacha : penser la suite du Cadrage dans l'esprit de la maquette du début (une information
dite une fois, le geste en tête, les fonds qui font la hiérarchie), en proto (`docs/protos/cadrage-suite.html`),
puis le coder.

- [x] **Les 6 dimensions** : plus de ligne « Confirmation humaine » ; la question sans son statut (le domaine
      seul), flèches vers la question d'avant et d'après, le reste replié sous « Autre réponse » ; une réponse
      confirmée se modifie ; les 6 dimensions en lignes dans un seul cadre, seule celle de la question ouverte,
      « Question en cours » au lieu de sa valeur ; la dictée à côté du titre ; l'encadré n'est plus montré
      à qui ne répond pas.
- [x] **Brief de cadrage** : un seul document (plus de comparaison, document complet, historique ni complétude
      en double), « Changé depuis la version n », les versions d'avant repliées ; la direction décide sous le
      document et marque les dimensions à revoir dans le document.
- [x] **Plan du projet** : une carte « Organisation du projet » avec sa source, les groupes l'un sous l'autre,
      « Modifier » par ligne, « Lancer le plan » qui dit ce qu'il démarre, sans modale.
- [x] Composant commun `SunkCard` (filet pleine largeur sous l'en-tête, Sacha 29/10) ; `PoQuestion` refait
      (aussi pour le Cadrage juridique : le domaine seul au-dessus de la question).
- [x] **Vérifier en bloc** (Sacha 29/10, proto à deux variantes) : la boîte ne pose que ce qui manque ; les
      propositions de PO se lisent « À vérifier » dans leur dimension et se confirment par dimension
      (« Confirmer les n », `confirmDimension`, `lib/framing/verify.ts`) ; une ligne s'ouvre d'un clic dessus,
      sans « Répondre » / « Modifier ». Parties juridiques, contradictions et phrases à structurer restent
      des questions. Version de base (une à une) : `df67b396`. Pas de migration.
- Reste : passage navigateur des trois étapes, en responsable puis en direction.


## Page d'un projet pas encore lancé refaite (30/10/2026, branche `pre-prod`)

Demande de Sacha : la page d'acceptation était différente des autres ; la rapprocher du bloc de l'échange de
cadrage, sans parcours (un seul geste à la fois). Proto `docs/protos/projet-transmis.html`.

- [x] En-tête commun (`ModuleHeader`, « Projets / Néons » dans la barre du haut, « Qui fait quoi » : direction,
      chef de projet, direction créative gérée là) ; pas de ligne « À vous » (Sacha 30/10 : le bloc et ses boutons le disent) ;
      la précision ou le refus reçus en encadré.
- [x] « Ce que vous acceptez » en un seul bloc de faits (`HandoverFacts`, `FactBlock` sorti de `CallPlanBlock`) :
      plus de statut répété, de résumé « Transmis : … / Manque : … » ni de colonne « Informations » ;
      un manque dit sur sa ligne. Le geste dessous ; pas d'historique (seulement la transmission, déjà dans le bloc ; il reste dans Équipe).
- Pas de migration. Reste : passage navigateur en direction puis en chef de projet.


## Réseau, Contrats, Fichiers, Calls, Artistes refaits (29/10/2026, branche `pre-prod`)

Proto `docs/protos/pages.html` (test `docs/protos/tests/pages.cjs`), retours de Sacha du 29/10 :
**une page liste n'est qu'une liste** (règle écrite dans `docs/VISION-UX.md`), pas de ligne de
faits grise sous un titre (l'état à côté du titre, le reste dans « Informations »).

- **Réseau** : colonne « Avec PDS » (projets du contact), colonnes de même largeur. Fiche en
  cartes titrées : « Ce qu'on attend de X » (« Relancer » = e-mail prêt), « Dans les projets »,
  contrats, crédits, calls, personnes associées, campagnes, relevés ; à droite coordonnées et
  fiches de renseignements ; « Modifier » dans l'en-tête. Migration
  `20261029100101_contact_projects.sql` (pré-prod faite, **prod avec accord**).
- **Contrats** : fiche avec « Maintenant » selon le rôle (valider / modifications avec motif,
  soumettre, envoyer pour signature par sa messagerie ou « remis autrement », relancer, signer
  pour PDS), le document en tête, parties, « Déjà fait ».
- **Fichiers** : colonnes Nom (coupé, entier au survol), Catégorie, Rattaché à, Ajouté.
- **Calls** : calendrier ou liste seuls, blocs colorés par état ; fiche d'un call avec l'état
  à côté du titre, « Maintenant » de l'enregistrement à la clôture, tâches avec responsable et
  échéance obligatoires, résumé préparé.
- **Artistes** : liste avec « En cours » et « Prochaine sortie » ; fiche avec « Maintenant »
  pour une proposition d'identité ; Vue d'ensemble : chiffres et dernières sorties d'abord,
  « En cours » plus bas. **Titre** : son état audio, sa version de référence, ses projets et sa
  distribution passent dans « Informations ».
- **Contrats (30/10)** : Contrats et Modèles en deux onglets, l'état en filtre ; le document d'un
  contrat généré comme le proto ; **seul le responsable soumet et envoie** un contrat, la direction
  valide (migration `20261030100101_contract_owner_submits.sql`, pré-prod faite, **prod avec
  accord**).
- Reste : aucun envoi d'e-mail par PDS OS (SMTP à brancher), une relance n'est pas
  enregistrée ; pas d'aperçu de fichier au clic ; la page Modèles de contrat n'a pas de
  « Maintenant » (à trancher).

## Calls en liste, semaine du Calendrier aux heures (01/11/2026, branche `pre-prod`)

- **Calls** : la liste par défaut (Tous / À venir / Passés, filtre Projet, « Nouvelle réunion ») ;
  le calendrier reste en second affichage (`?display=calendar`), sans la ligne d'aide ni la
  légende des couleurs.
- **Calendrier, Semaine** : le même calendrier que les Calls (24 h, arrivée 7 h 30, trait de
  l'heure, créer une réunion sur une plage libre, glisser ses calls, fiche d'un call), avec les
  tournages à leur heure et les dates sans heure (sorties, master, temps forts, étapes, tâches)
  dans une rangée sous les jours. Le mois reste en lecture ; téléphone : agenda.
- Retiré : `CalendarWeek` (7 colonnes sans heures). Aucune migration.

## Ingénieur du Brief : tout le Réseau, création sur place (02/11/2026, branche `pre-prod`)

- « Changer » l'ingénieur du mix ou du mastering : ingénieurs du Réseau, membres de PDS, puis le
  reste du Réseau dès qu'un nom est tapé ; un musicien choisi devient ingénieur (rôle ajouté).
- « Ajouter « X » au Réseau » crée la fiche (rôle Ingénieur coché, nom tapé repris) sans quitter
  le Brief et la choisit. Aucune migration.

## En-tête des étapes allégé (03/11/2026, branche `pre-prod`)

- Retour d'Ibé : la grille « Exécute / Coordonne / Valide / Prérequis / Ensuite » faisait trop de
  bruit (sur « Départ », trois cases vides et une redite). Elle est retirée de `StepPanel`, donc de
  tous les modules, avec son repli « Qui fait quoi, prérequis et suite » sous le geste en tête.
- La ligne « À vous : … » / « En attente de X : … » sous le pourquoi est retirée aussi : le Parcours
  à gauche dit déjà qui agit et sur quoi. Restent l'encadré « À vous · … » quand on a un geste, le
  cadenas « Se débloque quand… », `StepWaiting` dans le contenu et « Qui fait quoi » dans l'en-tête.
- La pastille d'état à droite du titre (« En cours », « Fait »…) est retirée aussi : l'icône et le
  sous-titre du Parcours, puis le contenu de la carte (action, cadenas, « En attente de… », motif,
  « Déjà fait ») disent l'état. Restent l'échéance et la pastille propre à un module quand elle dit
  plus (Distribution : « Prêt pour contrôle », « Clôturée avec réserves (n) »).
- `StepMeta` supprimé, prop `rootPrereq` retirée (Juridique, Distribution). Proto de décision :
  `~/Desktop/Protos PDS OS/PDS OS - En-tête des étapes.html`. Aucune migration.
- [x] Toasts maison (03/11/2026) : `sonner` retiré, `components/ui/toast.ts` (même API) + `Toaster` (pile dépliable au survol, pause au survol et onglet caché, balayage, Échap, dédoublonnage) ; règles `docs/DESIGN.md` § 4

## Mouvement des popups (03/11/2026, branche `pre-prod`)

- `DropdownMenu` et `Popover` (menus « ⋯ », cloche, sélecteurs de personnes) sortent de leur bouton :
  opacité et `scale(.97)` en 120 ms, sortie en 80 ms ; `Tooltip` en fondu de 120 ms, instantané d'une
  voisine à l'autre. Une seule recette : `components/ui/popup-motion.ts`.
- La fenêtre de PO (Espace Espace) s'ouvre sans transition (`DialogContent instant`) : un raccourci
  clavier ne doit pas attendre. Le contenu replié (`Fold`) reste sans animation, par choix.
- Proto de décision : `~/Desktop/Protos PDS OS/PDS OS - Mouvement des popups.html`. Aucune migration.

## Projets : l'étape en cours revient (03/11/2026, branche `pre-prod`)

- [x] Colonne **Étape** remise dans la liste des projets (Sacha, 03/11), après Statut, dès 1024 px :
      l'étape en cours dans la teinte de son workflow (`phaseLabel`, « Diffusion » pour un Contenu ou un
      Événement) ; vide pour un brouillon, un projet pas encore lancé ou terminé (Statut le dit déjà).

## Le Labo de l'app devient « Repérage » (03/11/2026, branche `pre-prod`)

- [x] Menu, titre et textes de `/app/labo` : **Repérage** (Sacha, 03/11), icône `IconUserSearch` ; la
      description dit ce que fait la page (artistes repérés sur TikTok). Route et code inchangés (`labo`) ;
      le Labo IA local (`/labo`) garde son nom.

## PO dans la barre latérale, historique des conversations (03/11/2026, branche `pre-prod`)

- [x] Entrée **PO** sous Accueil → `/app/assistant` : la conversation et la colonne « Historique »
      (tiroir sur téléphone), par jour ; une conversation se rouvre où elle s'était arrêtée
      (`/app/assistant/[id]`) et se supprime (« ⋯ », confirmé). `docs/ASSISTANT.md` § 2 ter.
- [x] Enregistrement par `/api/assistant` à la fin de chaque réponse, accueil, page et fenêtre Espace
      Espace compris ; « Nouvelle conversation » démarre une vraie nouvelle conversation (avant, elle
      vidait la même).
- [x] Table `assistant_conversations` (migration `20261103100101`), privée à la personne (même le DG
      ne la lit pas), gardée jusqu'à sa suppression ; 13 tests pgTAP joués sur la pré-prod.
- [ ] Migration à pousser en prod (avec accord) au prochain passage de `pre-prod` dans `main`.

## Page de PO refaite (04/11/2026, branche `pre-prod`)

Demande de Sacha : « redesign mieux la page ia, il y a bcp de problèmes ». Relevé sur captures
(ordinateur et téléphone, compte de test de la pré-prod) puis corrigé :

- [x] Nouvelle conversation : « Demander à PO » et la saisie **au milieu** de la page (avant : page
      vide, saisie collée en bas) ; pas de pilules de suggestions (retirées par Sacha le 29/10).
- [x] Plus de flèche « Retour à l'accueil » ni de « + » grisé dans l'en-tête : **« Nouvelle
      conversation » en tête de l'historique** (bouton « + » de l'en-tête sur téléphone) ; ouverte
      depuis une page, un petit lien au-dessus du titre y ramène.
- [x] Historique : les titres longs **débordaient** de la colonne et cachaient « ⋯ » (`DayGroups` ne
      laisse plus une ligne dépasser) ; colonne ramenée à 256 px.
- [x] Fil : colonne de lecture de 768 px, titre aligné dessus ; **listes** de PO en vraies puces
      (`AnswerText`) ; une recherche (« Recherche du projet ») **ne tourne plus après une erreur** ou
      un arrêt ; **« Réessayer »** sous une réponse en échec (page et fenêtre Espace Espace) ; saisie
      du pied plus basse (`compact`).
- [x] Chargement au gabarit de la page (historique + saisie), plus le squelette générique.

## Calls : deux portes, liste refaite, actions de ligne (05/11/2026, branche `pre-prod`)

- [x] **Deux portes** (`lib/calls/door.ts`, `docs/ARCHITECTURE.md` § 4) : depuis Calls, tout call
      s'ouvre dans Calls (`/app/calls/<id>`, la barre reste sur Calls, « Projet : X › ») ; **Calls**
      revient dans la barre du projet (Pilotage, à côté de Travail), ses calls s'ouvrent dans le
      projet (fil « Calls / titre », plus de second titre ni de « Tous les calls » sous l'en-tête).
      Une liste (`CallsListView`) et une page (`CallPage`) pour les deux ; URLs inchangées.
- [x] **Liste** : prochains calls d'abord (le plus proche en haut), puis les passés, titrés sous
      « Tous » ; projet à sa teinte ; « État » au lieu de « Traitement » ; « Rejoindre » et « ⋯ » en
      bout de ligne ; même liste (onglets, recherche) dans le projet ; « Nouveau call » sur la ligne
      du titre, en modale.
- [x] **« ⋯ » au survol** de chaque ligne, le même menu que la page (`CallSheetMenu` : lien de la
      visio, fiche copiée ou en e-mail, « Supprimer la réunion » pour la direction).
- [x] **E-mails** : résumé aux participants et partage du compte rendu disent à qui PDS OS a écrit ;
      le `mailto:` ne reste que pour qui n'a pas d'adresse, n'a pas été atteint, ou e-mail coupé.
- [x] Le compte rendu partagé (`/app/calls/<id>/report`) n'est plus bloqué par le 404 du call.
