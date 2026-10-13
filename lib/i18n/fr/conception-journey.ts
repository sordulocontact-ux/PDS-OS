/** Conception's journey (MKT-C2-03): one home, six steps, one next action. */
export const conceptionJourney = {
  goal: "La Conception décide ce que chaque livrable raconte et à quoi il ressemble.",
  final:
    "Elle aboutit au dossier de conception validé — direction créative, fiches livrables et brief créatif — transmis à la Production.",
  progressTitle: "Progression du dossier",
  progressHint:
    "La progression du dossier est distincte de celle de chaque livrable : les livrables avancent en parallèle.",
  steps: {
    prepare: "Préparer la sortie",
    exchange: "Organiser l'échange créatif",
    develop: "Développer les livrables",
    consolidate: "Consolider le dossier",
    validate: "Valider la conception",
    production: "Passer en Production",
  },
  stepStates: {
    done: "Fait",
    current: "En cours",
    todo: "À venir",
    skipped: "Passée",
  },
  summaries: {
    prepareTodo:
      "Contexte, stratégie validée et livrables prévus, puis démarrage.",
    prepareDone: (n: number) =>
      n === 1 ? "1 livrable engagé." : `${n} livrables engagés.`,
    exchangeTodo:
      "Un call avec l'équipe créative, dont PO tire des propositions.",
    exchangePlanned: (n: number) =>
      n === 1
        ? "1 échange préparé : son compte rendu est attendu."
        : `${n} échanges préparés : leur compte rendu est attendu.`,
    exchangeDone: (n: number) =>
      n === 1
        ? "1 compte rendu utilisé comme source."
        : `${n} comptes rendus utilisés comme sources.`,
    exchangeSkipped: (reason: string | null) =>
      reason
        ? `Passée : ${reason}`
        : "Commencée directement, sans échange créatif.",
    develop: (direction: string, validated: number, total: number) =>
      `Direction : ${direction.toLowerCase()} · fiches validées ${validated}/${total}.`,
    consolidateTodo: "Le brief créatif réunit ce qui a été retenu.",
    consolidateOutdated: (n: number) =>
      `Le projet a évolué depuis la V${n} du brief créatif.`,
    consolidateDone: (n: number) => `Brief créatif V${n}, à jour.`,
    validateTodo:
      "Le dossier entier est validé, en plus des validations par objet.",
    validatePending: "Demande envoyée : en attente de la décision.",
    validateDone: "Dossier validé.",
    productionTodo: "Chaque fiche validée est transférée à la Production.",
    production: (done: number, total: number) =>
      `Fiches transférées ${done}/${total}.`,
  },
  next: {
    title: "Prochaine action",
    opens: (place: string) => `Ouvre : ${place}`,
    nothing:
      "Rien à faire pour l'instant : tout ce qui reste attend une autre personne.",
    readOnly:
      "Vous suivez la Conception en lecture : le chef de projet et l'équipe créative la font avancer.",
    waiting: (what: string) => `En attente : ${what}.`,
  },
  actions: {
    prepareExchange: "Préparer l'échange créatif",
    startDirect: "Commencer sans échange",
    reviewProposals: (n: number) =>
      n === 1
        ? "Relire la proposition de PO"
        : `Relire les ${n} propositions de PO`,
    assignDirection: "Désigner le responsable de la direction",
    answerDirection: "Répondre aux questions de la direction créative",
    submitDirection: "Soumettre la direction créative",
    reviseDirection: "Reprendre la direction (modifications demandées)",
    createSheet: (title: string) => `Créer la fiche de « ${title} »`,
    answerDeliverable: (title: string) =>
      `Répondre aux questions de « ${title} »`,
    completeSheet: (title: string) => `Compléter la fiche « ${title} »`,
    submitSheet: (title: string) => `Soumettre la fiche « ${title} »`,
    createBrief: "Créer le brief créatif",
    updateBrief: (n: number) => `Mettre à jour le brief créatif (V${n})`,
    requestValidation: "Demander la validation du dossier",
    transfer: (title: string) => `Transférer « ${title} » en Production`,
    openProduction: "Ouvrir la Production",
  },
  places: {
    home: "Accueil de la Conception",
    work: (target: string) => `Intentions › ${target}`,
    workAll: "Intentions",
    direction: "Direction artistique",
    sheets: "Fiches livrables",
    sheet: (title: string) => `Fiche livrable › ${title}`,
    brief: "Brief créatif",
    validation: "Accueil › Valider la conception",
    production: "Production",
    directionTarget: "Direction créative",
  },
  waitingFor: {
    direction: "la décision sur la direction créative",
    sheet: (title: string) => `la décision sur la fiche « ${title} »`,
    validation: "la validation du dossier",
  },
  blockersTitle: "Ce qui bloque",
  blockersEmpty: "Rien ne bloque.",
  blockers: {
    proposals: (n: number) =>
      n === 1
        ? "1 proposition de PO attend une personne."
        : `${n} propositions de PO attendent une personne.`,
    references: (n: number) =>
      n === 1
        ? "1 référence n'est rattachée à rien."
        : `${n} références ne sont rattachées à rien.`,
    directionResponsible: "La direction créative n'a pas de responsable.",
    directionChanges:
      "Des modifications sont demandées sur la direction créative.",
    directionRejected: "La direction créative a été refusée.",
    sheetChanges: (title: string) => `La fiche « ${title} » a été refusée.`,
    noSheet: (n: number) =>
      n === 1
        ? "1 livrable n'a pas encore de fiche."
        : `${n} livrables n'ont pas encore de fiche.`,
    toQualify: (n: number) =>
      n === 1
        ? "1 besoin ajouté reste à qualifier."
        : `${n} besoins ajoutés restent à qualifier.`,
    briefOutdated: "Le brief créatif n'est plus à jour.",
  },
  directionTitle: "Direction de la sortie",
  directionBody:
    "Ce que tous les livrables partagent : le récit, l'univers, le ton, ce qui doit figurer ou être évité.",
  directionOpen: "Ouvrir la direction",
  directionAnswered: (n: number, total: number) =>
    `${n}/${total} questions confirmées`,
  deliverablesTitle: "Conception par livrable",
  validationTitle: "Valider la conception",
} as const;
