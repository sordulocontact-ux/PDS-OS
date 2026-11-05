/** Cadrage intelligent: six dimensions, one question at a time, the Brief. */
const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const framingIntel = {
  dimensions: {
    objective: "Objectif",
    timing: "Temporalité",
    budget: "Budget & contraintes",
    team: "Équipe",
    start: "État de départ",
    legal: "Cadre juridique",
  },
  dimensionNumber: (index: number) => String(index + 1).padStart(2, "0"),
  dimensionsLabel: "Dimensions du cadrage",
  statuses: {
    known: "Connu",
    to_confirm: "À confirmer",
    missing: "Manquant",
  },
  dimensionLine: (known: number, toConfirm: number, missing: number) =>
    [
      known > 0 && plural(known, "connue", "connues"),
      toConfirm > 0 && `${toConfirm} à confirmer`,
      missing > 0 && plural(missing, "manquante", "manquantes"),
    ]
      .filter(Boolean)
      .join(" · "),
  progress: (known: number, total: number, optionalEmpty = 0) =>
    `${known} sur ${total} informations confirmées${
      optionalEmpty > 0
        ? ` · ${plural(optionalEmpty, "facultative vide", "facultatives vides")}`
        : ""
    }`,
  // What is left, said at all times (PROJ-UX-04).
  remaining: (blocking: number) =>
    blocking > 0
      ? `${plural(blocking, "point bloque", "points bloquent")} encore le Brief`
      : "Plus rien ne bloque le Brief",
  questionOf: (index: number, total: number) =>
    `Question ${index} sur ${total}`,
  none: "Rien à signaler",
  notProvided: "Non renseigné",
  questions: {
    objective: {
      label: "Résultat recherché",
      ask: "Quel résultat recherchez-vous avec ce projet ?",
      confirm: "Est-ce bien le résultat recherché ?",
      why: "Tout le reste du cadrage en découle.",
      placeholder: "Ex. installer Dioo comme la voix pop de la rentrée",
    },
    success_criteria: {
      label: "Critère de réussite",
      ask: "À quoi verra-t-on que c'est réussi ?",
      confirm: "Est-ce bien le critère de réussite ?",
      why: "Le bilan du projet se fera sur ce critère.",
      placeholder: "Ex. 500 000 streams le premier mois",
    },
    main_priority: {
      label: "Priorité principale",
      ask: "Si un seul point devait primer, lequel ?",
      confirm: "Est-ce bien la priorité principale ?",
      why: "Elle tranche entre deux choix quand le temps ou le budget manque.",
      placeholder: "Ex. tenir la date, quitte à réduire le dispositif",
    },
    needs: {
      label: "Ce qu'il faut produire",
      ask: "Que faut-il produire ou activer pour y arriver ?",
      confirm: "Est-ce bien ce qu'il faut produire ?",
      why: "Les besoins ouvrent les rôles de l'équipe et les leviers de la Stratégie.",
      placeholder: "",
      none: "Rien de particulier à produire",
    },
    target_date: {
      label: "Date cible",
      ask: "Quelle est la date cible ?",
      confirm: (date: string) => `La date cible est-elle toujours le ${date} ?`,
      why: "Le planning et les échéances se calent sur elle.",
      placeholder: "",
    },
    deadlines: {
      label: "Échéances imposées",
      ask: "Y a-t-il des échéances imposées ?",
      confirm: "Ces échéances sont-elles justes ?",
      why: "Master final, livraison au distributeur, temps fort de promotion…",
      placeholder: "",
      none: "Aucune échéance imposée",
    },
    calendar_constraints: {
      label: "Contraintes calendaires",
      ask: "Des contraintes de calendrier à respecter ?",
      confirm: "Ces contraintes calendaires sont-elles justes ?",
      why: "Tournée, indisponibilités, périodes à éviter…",
      placeholder: "Ex. l'artiste est en tournée du 2 au 15 novembre",
      none: "Aucune contrainte calendaire",
    },
    prerequisites: {
      label: "Prérequis",
      ask: "Qu'est-ce qui doit être prêt avant de lancer ?",
      confirm: "Ces prérequis sont-ils justes ?",
      why: "Ce qui bloque le démarrage tant que ce n'est pas réglé.",
      placeholder: "Ex. le master final validé avant la livraison",
      none: "Aucun prérequis",
    },
    budget_envelope: {
      label: "Enveloppe",
      ask: "Quelle est l'enveloppe du projet ?",
      confirm: (amount: string) => `L'enveloppe est-elle bien de ${amount} ?`,
      why: "Les dépenses du projet se comparent à elle.",
      placeholder: "Ex. 15 000",
      none: "Pas d'enveloppe dédiée",
    },
    commitments: {
      label: "Engagements existants",
      ask: "Des dépenses sont-elles déjà engagées ?",
      confirm: "Ces engagements sont-ils justes ?",
      why: "Ce qui est déjà promis ou payé réduit ce qui reste.",
      placeholder: "Ex. studio réservé, 1 200 € versés",
      none: "Aucun engagement",
    },
    constraints: {
      label: "Contraintes",
      ask: "Quelles contraintes financières, créatives, humaines ou opérationnelles ?",
      confirm: "Ces contraintes sont-elles justes ?",
      why: "Les limites que le plan devra respecter.",
      placeholder: "",
      none: "Aucune contrainte",
    },
    contributors: {
      label: "Intervenants",
      ask: "Qui intervient sur le projet ?",
      confirm: "Ces intervenants sont-ils justes ?",
      why: "Chaque besoin a besoin de quelqu'un pour le porter.",
      placeholder: "",
      none: "Personne d'autre que l'équipe du projet",
    },
    decision_makers: {
      label: "Décideurs",
      ask: "Qui décide sur ce projet ?",
      confirm: "Est-ce bien ainsi que se prennent les décisions ?",
      why: "Pour savoir à qui demander quand un choix se pose.",
      placeholder: "Ex. le chef de projet décide, l'artiste valide la cover",
    },
    missing_skills: {
      label: "Ressources manquantes",
      ask: "Quelles compétences ou ressources manquent ?",
      confirm: "Est-ce bien ce qui manque ?",
      why: "Ce qu'il faudra trouver avant de lancer.",
      placeholder: "Ex. un réalisateur pour le clip",
      none: "Rien ne manque",
    },
    current_state: {
      label: "État réel",
      ask: "Où en est réellement le projet aujourd'hui ?",
      confirm: "Est-ce bien l'état du projet ?",
      why: "Le plan part de là, pas d'une page blanche.",
      placeholder: "Ex. les titres sont mixés, la cover est à faire",
    },
    existing_elements: {
      label: "Éléments existants",
      ask: "Qu'est-ce qui existe déjà ?",
      confirm: "Ces éléments existants sont-ils justes ?",
      why: "Pour ne pas refaire ce qui est fait.",
      placeholder: "Ex. maquettes, photos de presse, teaser",
      none: "Rien n'existe encore",
    },
    decisions_made: {
      label: "Décisions prises",
      ask: "Quelles décisions sont déjà prises ?",
      confirm: "Ces décisions sont-elles justes ?",
      why: "Elles ne se rediscutent pas pendant le plan.",
      placeholder: "Ex. sortie chez le distributeur habituel",
      none: "Aucune décision prise",
    },
    work_started: {
      label: "Travail commencé",
      ask: "Quel travail est déjà commencé ?",
      confirm: "Est-ce bien le travail commencé ?",
      why: "Le plan le reprend au lieu de le relancer.",
      placeholder: "Ex. le mixage est en cours",
      none: "Rien n'est commencé",
    },
    legal_parties: {
      label: "Parties impliquées",
      ask: "Qui est impliqué juridiquement ?",
      confirm: "Qualifiez chaque partie",
      why: "Pour chacun, le document qu'il faut. Travailler sur le projet ne fait pas d'un intervenant une partie au contrat.",
      placeholder: "Ex. Dioo (interprète, autrice), Jo (compositeur)",
      none: "Personne en dehors de PDS",
    },
    legal_agreements: {
      label: "Accords existants",
      ask: "Quels accords existent déjà ?",
      confirm: "Ces accords sont-ils justes ?",
      why: "Ce qui est déjà signé ou convenu.",
      placeholder: "Ex. contrat d'artiste signé en 2025",
      none: "Aucun accord",
    },
    legal_needs: {
      label: "Contrats et droits à prévoir",
      ask: "Quels autres contrats ou droits faudra-t-il sans doute ?",
      confirm: "Est-ce bien ce qu'il faudra prévoir ?",
      why: "En plus des parties qualifiées : une autorisation, un droit à l'image… Le Juridique partira de là.",
      placeholder: "Ex. une autorisation pour le sample du refrain",
      none: "Rien à prévoir",
    },
    legal_secured: {
      label: "Éléments sécurisés",
      ask: "Qu'est-ce qui est déjà sécurisé ?",
      confirm: "Ces éléments sont-ils bien sécurisés ?",
      why: "Ce qu'il n'y a plus à traiter.",
      placeholder: "Ex. les splits sont signés",
      none: "Rien n'est encore sécurisé",
    },
    legal_blockers: {
      label: "Blocages connus",
      ask: "Y a-t-il des blocages juridiques connus ?",
      confirm: "Ces blocages sont-ils justes ?",
      why: "Un blocage connu passe en premier dans le plan.",
      placeholder: "",
      none: "Aucun blocage connu",
    },
  },
  // The Brief's summary, written by code from the answers (PROJ-BUG-04).
  summary: {
    title: "Synthèse",
    decisions: "Décisions",
    open: "Points ouverts",
    risks: "Risques",
    prerequisites: "Prérequis",
    owners: "Responsables",
    notProvided: (label: string) => `${label} : non renseigné`,
    openPoint: (question: string) => `Question d'un call : ${question}`,
    partyAction: (status: string, name: string, owner: string | null) =>
      `${status} : ${name}${owner ? ` (suivi : ${owner})` : ""}`,
    owner: (name: string) => `Responsable du projet : ${name}`,
    validator: (name: string) => `Valide le Brief : ${name}`,
    blocker: (text: string) => `Blocage juridique : ${text}`,
    constraint: (text: string) => `Contrainte : ${text}`,
    deadline: (text: string) => `Échéance : ${text}`,
  },
  // Production steps offered as items (with the needs' presets).
  itemPresets: ["Enregistrement", "Mix", "Mastering", "Master final"],
  // An item of a structured answer (PROJ-UX-05): never « mix » alone.
  itemStates: {
    exists: "Existe",
    in_progress: "En cours",
    done: "Terminé",
    decided: "Décidé",
    planned: "Prévu",
  },
  items: {
    label: "Éléments",
    add: "Ajouter un élément",
    itemLabel: "Élément",
    stateLabel: "État",
    remove: "Retirer",
    presets: "Suggestions",
    required: "Ajoutez au moins un élément.",
    labelRequired: "Nommez l'élément.",
  },
  // A measurable objective (PROJ-UX-04): metric, target, horizon.
  measure: {
    text: (
      target: string,
      metric: string,
      period: string,
      source: string | null,
    ) =>
      `${target} ${metric} · ${period}${source ? ` · source : ${source}` : ""}`,
    estimated: (amount: string) => `${amount} (estimée)`,
    metric: "Métrique",
    metricPlaceholder: "Ex. streams",
    target: "Cible",
    targetPlaceholder: "Ex. 500 000",
    period: "Période",
    periodPlaceholder: "Ex. le premier mois",
    source: "Où le mesurer",
    sourcePlaceholder: "Ex. Spotify for Artists",
    said: (text: string) => `Dit : « ${text} »`,
    metricRequired: "Dites ce qui se mesure.",
    targetRequired: "Donnez une cible chiffrée.",
    periodRequired: "Dites sur quelle période.",
    // Several measures (Ibé 01/11/2026).
    add: "Ajouter une métrique",
    nth: (n: number) => `Mesure ${n}`,
    remove: (n: number) => `Retirer la mesure ${n}`,
  },
  // Answered without a value (PROJ-UX-04).
  answerStates: {
    na: (reason: string) => `Non applicable · ${reason}`,
    later: (date: string) => `À définir plus tard · suivi avant le ${date}`,
    naAction: "Non applicable",
    laterAction: "À définir plus tard",
    naTitle: "Pourquoi ce n'est pas applicable",
    reason: "Raison",
    reasonRequired: "Dites pourquoi.",
    // Proto « Projet complet » (frQuestion).
    naSave: "Marquer non applicable",
    laterSave: "Reporter, avec une tâche",
    laterDone: "Reporté : une tâche est créée.",
    laterTitle: "Quand faut-il le définir ?",
    due: "À définir avant le",
    dueRequired: "Choisissez une date.",
    task: (label: string) => `Définir : ${label}`,
    save: "Enregistrer",
  },
  expenses: {
    title: "Dépenses du projet (Budget)",
    empty: "Aucune dépense enregistrée.",
    add: "Ajouter une dépense",
  },
  certainty: {
    label: "Cette enveloppe est",
    confirmed: "Confirmée",
    estimated: "Estimée",
  },
  // The plan rests on a Brief the Cadrage no longer matches (PROJ-BUG-04).
  drift: {
    body: (labels: string[]) =>
      `Le plan s'appuie sur le Brief validé, qui ne correspond plus au Cadrage : ${labels.join(", ")}. Vérifiez le plan avant d'avancer.`,
    open: "Voir le Brief",
  },
  // Contradictions found by code before the Brief (PROJ-BUG-04).
  conflicts: {
    title: "À résoudre avant le Brief",
    afterTarget: (label: string, date: string, target: string) =>
      `${label} le ${date}, après la date cible du ${target}.`,
    releaseDiffers: (date: string, target: string) =>
      `Échéance de sortie le ${date}, mais date cible le ${target}.`,
    overEnvelope: (engaged: string, envelope: string) =>
      `Dépenses engagées (${engaged}) au-delà de l'enveloppe confirmée (${envelope}).`,
    proofLost: (name: string, contract: string) =>
      `${name} : « Existant », mais le contrat « ${contract} » n'est plus signé.`,
  },
  // The legal parties, qualified one by one (PROJ-BUG-03).
  parties: {
    undecided: "À qualifier",
    count: (n: number) => plural(n, "partie", "parties"),
    qualify: "Qualifier",
    edit: "Modifier",
    clear: "Retirer la qualification",
    found: (origins: string) => `Trouvé dans : ${origins}`,
    suggestion: (status: string, contract: string) =>
      `Contrat trouvé dans Contrats : « ${contract} ». Statut possible : ${status}.`,
    decidedBy: (name: string | null, date: string) =>
      `Qualifié${name ? ` par ${name}` : ""} le ${date}`,
    unassigned: (roles: string[]) =>
      `Rôles non attribués : ${roles.join(", ")}. Ils seront qualifiés une fois attribués : pas de partie, pas de document à prévoir d'ici là.`,
    legacy: (text: string) => `Réponse écrite avant la qualification : ${text}`,
    none: "Aucune partie dans les crédits, l'équipe ou le Juridique.",
    relationLabel: "Relation avec PDS",
    relationNone: "Non précisée",
    statusLabel: "Document",
    statusRequired: "Choisissez le document qu'il faut avec cette partie.",
    contractLabel: "Contrat qui le prouve",
    contractNone: "Aucun contrat",
    contractRequired:
      "« Existant » demande le contrat signé qui le prouve : un accord de production n'est pas un contrat.",
    noSignedContract:
      "Aucun contrat signé de cette personne dans Contrats : « Existant » n'est pas possible.",
    ownerLabel: "Qui suit",
    ownerNone: "Personne",
    noteLabel: "Pourquoi",
    noteRequired: "Dites pourquoi aucun document n'est nécessaire.",
    save: "Enregistrer la qualification",
    title: (name: string) => `Qualifier ${name}`,
    contract: (title: string) => `Contrat : ${title}`,
    owner: (name: string) => `Suivi : ${name}`,
    relations: {
      client: "Client",
      provider: "Prestataire",
      partner: "Partenaire",
      supplier: "Fournisseur",
      other: "Autre",
    },
    statuses: {
      existing: "Existant",
      to_verify: "À vérifier",
      to_prepare: "À préparer",
      not_needed: "Non nécessaire",
      not_applicable: "Non applicable",
    },
    statusHints: {
      existing: "Un contrat signé le couvre déjà.",
      to_verify: "Un accord est évoqué ou en cours : à vérifier.",
      to_prepare: "Un document est à préparer avec cette partie.",
      not_needed: "Aucun document n'est nécessaire avec cette partie.",
      not_applicable:
        "Cette personne n'est pas une partie juridique du projet.",
    },
  },
  sources: {
    projectSheet: "Fiche projet",
    initialContext: "Contexte initial",
    contextAndClarifications: "Contexte initial et précisions de la direction",
    budget: "Budget du projet",
    team: "Équipe du projet",
    rolesToFind: "Rôles à pourvoir",
    catalog: "État audio des titres",
    files: "Fichiers du projet",
    decisions: "Décisions des calls",
    work: "Travail du projet",
    credits: "Crédits des titres",
    contracts: "Contrats du projet",
    legal: "Juridique",
    timingSaid: (said: string) => `Dit : « ${said} »`,
    // Under « Y a-t-il des échéances imposées ? » (Ibé 01/11/2026: « la date
    // de sortie en rappel, si c'est un rétroplanning »).
    releaseReminder: (day: string) =>
      `Sortie visée le ${day} : les échéances se placent avant elle.`,
  },
  records: {
    commitment: (label: string, amount: string, status: string) =>
      `${label} · ${amount} (${status})`,
    decisionMakers: (owner: string, validator: string | null) =>
      validator
        ? `${owner} (chef de projet) décide ; ${validator} valide le Brief`
        : `${owner} (chef de projet) décide`,
    rolesToFind: (roles: string[]) => `À trouver : ${roles.join(", ")}`,
    titleState: (title: string, state: string) => `${title} : ${state}`,
    noAudioState: "état audio non renseigné",
    // The Cadrage's words for a title's audio (PROJ-UX-05): a mix received
    // is not a finished mix.
    audioStates: {
      demo: "maquette",
      rough_mix: "mise à plat",
      mix: "mix reçu, pas encore validé",
      master: "master reçu, pas encore validé",
      final_master: "master final",
    },
    moreFiles: (count: number) =>
      count > 1 ? `${count} autres fichiers` : "1 autre fichier",
    tasks: (done: number, open: number) =>
      [
        done > 0 && plural(done, "tâche faite", "tâches faites"),
        open > 0 && plural(open, "tâche en cours", "tâches en cours"),
      ]
        .filter(Boolean)
        .join(", "),
    masterBrief: "Brief Mix/Master commencé",
    legalIntake: "Cadrage juridique commencé",
    performer: "interprète",
    featuring: "featuring",
    contract: (title: string, status: string) => `${title} (${status})`,
    secured: (contracts: number, splits: number, declarations: number) =>
      [
        contracts > 0 && plural(contracts, "contrat signé", "contrats signés"),
        splits > 0 &&
          plural(splits, "répartition à 100 %", "répartitions à 100 %"),
        declarations > 0 &&
          plural(declarations, "déclaration déposée", "déclarations déposées"),
      ]
        .filter(Boolean)
        .join(" · "),
  },
  facts: {
    owner: "Responsable",
    validator: "Valide le Brief",
    creatives: "Équipe créative",
    type: "Type de projet",
    titles: "Titres",
    // Beside a confirmed answer that differs from the project sheet (PROJ-BUG-04).
    initial: (value: string) => `Modifié · initial (fiche projet) : ${value}`,
    contracts: "Contrats rattachés",
    none: "Aucun",
  },
  deadlineKinds: {
    master_final: "Master final",
    delivery: "Livraison au distributeur",
    release: "Sortie",
    promotion: "Temps fort de promotion",
    other: "Autre",
  },
  constraintTypes: {
    budget: "Financière",
    artistic: "Créative",
    human: "Humaine",
    production: "Opérationnelle",
    rights: "Droits",
    other: "Autre",
  },
  entry: {
    accepted: (date: string, name: string | null) =>
      `Prise en charge acceptée le ${date}${name ? ` par ${name}` : ""}`,
    analysisTitle: "Ce que le projet sait déjà",
    analysis: (known: number, toConfirm: number, missing: number) =>
      `${plural(known, "information connue", "informations connues")} · ${toConfirm} à confirmer · ${plural(missing, "manquante", "manquantes")}`,
    nextAttention: "Prochaine attention : le cadrage",
    nextAttentionBody:
      "Complétez seulement ce qui manque, pendant un échange ou directement avec PO. Les deux mènent au même Brief.",
    start: "Commencer le cadrage",
    starting: "PO lit le contexte…",
    resume: "Reprendre le cadrage",
    prepare: "Préparer un échange",
    recommended: "Recommandé",
    // What each way in does (PROJ-UX-02).
    ways: {
      exchange: {
        title: "Préparer un échange",
        body: "PO prépare l'ordre du jour d'un call à partir de ce qui manque. Vous le relisez, choisissez participants et date : le call est créé, rien du cadrage n'est validé. Après le call, PO propose ce qui a été dit, vous confirmez.",
      },
      direct: {
        title: "Commencer le cadrage",
        body: "PO lit le contexte initial et les précisions de la direction, propose ce qu'il y trouve, puis vous répondez question par question. Rien n'est confirmé sans vous.",
      },
    },
    why: {
      exchange: (missing: number) =>
        `${plural(missing, "information manque", "informations manquent")} : un échange les rassemble plus vite.`,
      direct: (known: number) =>
        `Le projet en dit déjà assez (${plural(known, "information", "informations")}) : PO propose, vous confirmez.`,
    },
    readOnly:
      "Le chef de projet responsable mène le cadrage ; vous le suivez ici.",
    awaiting: (name: string) => `Brief envoyé en validation à ${name}`,
    awaitingBody: "Le cadrage est figé pendant la relecture du valideur.",
    changes: "Modification demandée sur le Brief",
    validated: "Brief validé",
    framingDone: "Cadrage terminé",
    planNext: "Prochaine attention : le plan du projet",
    planBody:
      "PO propose ce qui commence maintenant, ce qui suit et ce qui avance en parallèle. Rien ne démarre sans vous.",
    buildPlan: "Construire le plan",
    seePlan: "Voir le plan du projet",
    seeBrief: "Voir le Brief",
    planLaunched: (date: string) => `Plan lancé le ${date}`,
  },
  guide: {
    eyebrow: (number: string, dimension: string) => `${number} · ${dimension}`,
    knownTitle: "Déjà connu",
    help: "M'aider à définir",
    helping: "PO cherche…",
    write: "Écrire moi-même",
    confirm: "Confirmer",
    confirming: "Confirmation…",
    modify: "Modifier",
    skip: "Passer",
    dismiss: "Écarter",
    // The ways to answer other than the value, folded (Sacha 29/10/2026).
    otherAnswer: "Autre réponse",
    save: "Enregistrer",
    cancel: "Annuler",
    choose: "Choisir",
    next: "Question suivante",
    previous: "Question précédente",
    pagerLabel: "Parcourir les questions",
    see: "Voir",
    answerLabel: "Votre réponse",
    dateLabel: "Date",
    amountLabel: "Montant en euros",
    fromSource: (label: string) => `D'après : ${label}`,
    structure: "Préciser et confirmer",
    deferredTitle:
      "Restent ouverts dans le Brief (à définir plus tard, une tâche suit chacun) :",
    lineSources: "Sources des propositions",
    helpEmpty:
      "PO n'a rien trouvé de vérifiable sur ce point : écrivez-le vous-même.",
    helpErrors: {
      no_sources:
        "Rien sur quoi s'appuyer pour l'instant : ni contexte initial, ni call.",
      provider: "PO n'a pas pu répondre. Réessayez dans un instant.",
      stage_locked: "Cette dimension n'est pas ouverte.",
      forbidden: "Seul le chef de projet responsable cadre ce projet.",
      generic: "Une erreur est survenue. Réessayez.",
    },
    missingInfo: "Information manquante",
    complete: "Compléter",
    dimensionDone: "Cette dimension est complète.",
    doneTitle: "Le cadrage est complet",
    // Ready for the Brief, with optional questions still empty: not « complet ».
    readyTitle: "Prêt pour le Brief",
    readyBody: (n: number) =>
      `Les informations nécessaires sont confirmées. ${plural(n, "information facultative reste vide", "informations facultatives restent vides")} : complétez-les si elles comptent pour ce projet.`,
    doneBody:
      "Toutes les informations nécessaires sont confirmées : le Brief peut être créé.",
    seeBrief: "Voir le Brief",
    remainingTitle: "Avant de créer le Brief",
    remaining: (n: number) =>
      `${plural(n, "information", "informations")} à confirmer ou à compléter.`,
    lockedAll: "Le cadrage n'est plus modifiable.",
    correction: (comment: string, dimensions: string) =>
      `Le valideur demande une modification : « ${comment} ». Rouvert : ${dimensions}.`,
    briefNav: "Brief de cadrage",
    saidInCall: "Dit pendant un échange",
    deadlines: {
      add: "Ajouter une échéance",
      kind: "Échéance",
      label: "Précision",
      date: "Date",
      remove: "Retirer",
      noDate: "date à choisir",
      confidence: "Cette date est",
      confidences: { firm: "Ferme", estimated: "Estimée" },
      feeds: (workflows: string) => `Alimente : ${workflows}`,
      workflows: {
        master: "Master (date du master final du Brief Mix/Master)",
        distribution: "Distribution",
        marketing: "Marketing",
      },
    },
    proposedLine: "proposé",
    review: {
      title: (call: string) => `Ce que PO a compris de l'échange « ${call} »`,
      body: "Confirmez ou modifiez chaque information. Rien ne devient une vérité du projet sans votre accord.",
      empty: "Rien de nouveau à confirmer depuis cet échange.",
      backToGuide: "Continuer le cadrage",
    },
  },
  call: {
    title: "Préparer un échange",
    body: "PO a préparé les sujets à partir de ce qui manque au cadrage.",
    titleLabel: "Titre",
    defaultTitle: "Échange de cadrage",
    purposeLabel: "But de l'échange",
    purpose: (dimensions: string[]) =>
      `Compléter le cadrage : ${dimensions.join(", ")}`,
    purposeConfirm: "Relire ensemble le cadrage avant le Brief",
    topics: "Sujets",
    documents: "Documents",
    noDocuments: "Aucun document dans le projet.",
    date: "Date et heure",
    link: "Lien de visio",
    launch: "Créer l'échange",
    launching: "Création…",
    failed: "L'échange n'a pas pu être préparé. Réessayez.",
    detailsTitle: "Échange de cadrage",
    detailsPurpose: "But",
  },
  brief: {
    title: "Brief de cadrage",
    version: (n: number) => `Version ${n}`,
    // `pending` is a version not sent yet (send_framing_brief makes it
    // `sent`): never « en attente de validation » (UX test of 09/10/2026).
    states: {
      pending: "À envoyer",
      sent: "En attente de validation",
      approved: "Brief validé",
      changes_requested: "Modification demandée",
      superseded: "Remplacée",
    },
    notSent: "Pas encore envoyée au valideur.",
    sentTo: (name: string, date: string) => `Envoyée à ${name} le ${date}.`,
    send: "Envoyer en validation",
    sendNote: "Message au valideur",
    sending: "Envoi…",
    approve: "Valider le Brief",
    approveTitle: "Valider le Brief ?",
    approveBody:
      "Le cadrage sera terminé. PO proposera ensuite le plan du projet.",
    requestChange: "Demander une modification",
    requestBody:
      "Seules les dimensions cochées seront rouvertes ; le reste du Brief reste tel quel.",
    commentLabel: "Ce qu'il faut corriger",
    dimensionsLabel: "Dimensions à rouvrir",
    submitChange: "Envoyer la demande",
    emptyTitle: "Pas encore de Brief",
    emptyBody:
      "Le Brief se crée quand toutes les informations nécessaires sont confirmées.",
    toFraming: "Continuer le cadrage",
    history: "Historique",
    changesFrom: (n: number) => `Changements depuis la version ${n}`,
    noChange: "Aucun changement de contenu.",
    reopened: (dimensions: string) => `Rouvert : ${dimensions}`,
    created: (name: string | null, date: string) =>
      name ? `Créée par ${name} le ${date}` : `Créée le ${date}`,
    decided: (name: string | null, date: string) =>
      name ? `Décidée par ${name} le ${date}` : `Décidée le ${date}`,
    validatorComment: "Demande du valideur",
    youDecide: "Vous êtes le valideur de ce Brief.",
    waitingFor: (name: string) => `En attente de la décision de ${name}.`,
    sources: "Sources",
    legacy:
      "Cadrage validé avant les versions du Brief : il se lit tel qu'il est enregistré.",
    framingDone: "Cadrage terminé",
    before: "Avant",
    after: "Après",
  },
  plan: {
    title: "Plan du projet",
    body: "PO propose à partir du Brief validé. Rien ne démarre avant « Lancer le plan ».",
    bodyLaunched: "Le plan est lancé : chaque workflow avance à son rythme.",
    columns: {
      focus: "Focus",
      next: "Ensuite",
      meanwhile: "Pendant ce temps",
      anticipate: "À anticiper",
    },
    columnHints: {
      focus: "Ce qui commence maintenant",
      next: "Ce qui suit une étape",
      meanwhile: "Ce qui avance en parallèle",
      anticipate: "Ce qu'il faut prévoir",
    },
    workflows: {
      strategy: "Stratégie",
      master: "Master",
      legal: "Juridique",
      design: "Conception",
      production: "Production",
      activations: "Activations",
      distribution: "Distribution",
      review: "Suivi & bilan",
    },
    specialized: (name: string) => `Cadrage spécialisé : ${name}`,
    specializedNames: {
      master: "Brief Mix/Master",
      legal: "Cadrage juridique",
    },
    dependsOn: (names: string) => `Après : ${names}`,
    owner: "Responsable",
    noOwner: "À désigner",
    edit: "Modifier le plan",
    doneEditing: "Terminer les modifications",
    move: "Colonne",
    remove: "Retirer du plan",
    restore: "Remettre dans le plan",
    removedTitle: "Retiré du plan",
    launch: "Lancer le plan",
    launching: "Lancement…",
    launched: (date: string, name: string | null) =>
      name ? `Lancé le ${date} par ${name}` : `Lancé le ${date}`,
    launchNow: "Lancer maintenant",
    states: {
      launched: "Lancé",
      waiting: "En attente",
      follows: "Suit son étape",
    },
    open: "Ouvrir",
    absentTitle: "Hors du plan",
    absentHint:
      "Retirés au lancement ou jamais proposés : vous pouvez les ajouter et les lancer.",
    absentReadOnly:
      "Pas dans le plan : le chef de projet responsable peut l'ajouter.",
    addAndLaunch: "Ajouter et lancer",
    empty: "Rien dans cette colonne.",
    notReady: "Le plan se construit une fois le Brief validé.",
    readOnly: "Le chef de projet responsable lance le plan.",
    why: {
      strategy: "Elle décide du dispositif et des livrables",
      masterFocus: (n: number, date: string) =>
        `${plural(n, "titre", "titres")} sans master final et une date cible le ${date} : la production est le chemin critique.`,
      masterMeanwhile: (n: number) =>
        `${plural(n, "titre", "titres")} sans master final : mix et mastering avancent en parallèle.`,
      masterReady: (n: number) =>
        `${plural(n, "titre a déjà son", "titres ont déjà leur")} master final : il reste à le confirmer.`,
      legalBlockers: (n: number) =>
        `${plural(n, "blocage juridique connu", "blocages juridiques connus")} : à lever avant la sortie.`,
      legalMeanwhile:
        "Personnes, droits et contrats à sécuriser pendant que le reste avance.",
      design: "Après la Stratégie",
      production: "Après la Conception",
      activations: "Après la Stratégie",
      distribution: "Après le Master final",
      review: "Après la sortie",
      addedLater: "Ajouté au plan après son lancement.",
    },
    anticipate: {
      deadline: (label: string, date: string) => `${label} le ${date}`,
      role: (role: string) => `Trouver : ${role}`,
      noEnvelope: "Aucune enveloppe : chaque dépense sera à arbitrer.",
      overBudget: (amount: string) =>
        `Déjà ${amount} engagés au-delà de l'enveloppe.`,
      legalNeed: (text: string) => `À prévoir : ${text}`,
      openPoint: (question: string) => `À trancher : ${question}`,
    },
  },
  locked: {
    title: (name: string) => `${name} démarre au lancement du plan`,
    body: "Ce workflow démarre au lancement du plan du projet, après le Cadrage.",
    bodyBeforeBrief:
      "Ce workflow démarre au lancement du plan du projet, après le Cadrage.",
    bodyWaiting:
      "Le plan le place en Ensuite : lancez-le depuis le plan quand le moment est venu.",
    bodyAbsent:
      "Il n'est pas dans le plan lancé : ajoutez-le depuis le plan pour le démarrer.",
    openPlan: "Ouvrir le plan du projet",
    openFraming: "Ouvrir le Cadrage",
  },
} as const;
