// « Contrôle avant tournage » of an external production (proto BODY.ready,
// synthesis; Artefact § 13; production.md § 2.11).
export const productionReady = {
  note: "Calculée à partir de ce qui est réellement validé : une information « à confirmer » ne compte jamais comme prête.",
  rows: {
    place: "Lieu retenu",
    date: "Date et horaires",
    crew: "Équipe confirmée",
    plan: "Planning et feuille de service",
    gear: "Matériel",
    quote: "Devis",
    direction: "Proposition de réalisation",
    blockers: "Blocages actifs",
    notes: "Informations à confirmer",
  },
  values: {
    noPlace: "Aucun lieu retenu",
    shootOn: (day: string) => `Tournage le ${day}`,
    noDate: (who: string) => `Aucune date fixée · à fixer par ${who}`,
    done: (at: string) => `Fait · ${at}`,
    notYet: (who: string) => `Pas encore · ${who}`,
    noTask: "Aucune tâche",
    quote: (n: number, amount: string) => `V${n} validé · ${amount}`,
    revising: " · révision en cours",
    noQuote: "Aucun devis validé",
    direction: "Validée",
    directionRevising: "Validée · nouvelle version demandée",
    noDirection: "Pas encore validée",
    proposal: (n: number) => `V${n} validée`,
    proposalNext: " · nouvelle version en cours",
    none: "Aucun",
    noneF: "Aucune",
    blockers: (n: number) => (n === 1 ? "1 blocage" : `${n} blocages`),
    notes: (n: number, who: string) =>
      `${n === 1 ? "1 information" : `${n} informations`} · à confirmer ou écarter par ${who}`,
  },
  ready: "Prêt",
  notReady: "Pas prêt",
  // Severity of a line (recette 23/10, MKT-PROD-002).
  critical: "Critique",
  minor: "Mineur",
  missing: (n: number) =>
    n === 1
      ? "1 point n'est pas prêt. Vous pouvez confirmer quand même, en connaissance de cause et avec un motif."
      : `${n} points ne sont pas prêts. Vous pouvez confirmer quand même, en connaissance de cause et avec un motif.`,
  missingCritical: (n: number, who: string) =>
    `${n === 1 ? "1 point critique n'est pas prêt" : `${n} points critiques ne sont pas prêts`} : passer outre demande la validation de ${who}, avec un plan de rattrapage.`,
  plan: {
    title: "Plan de rattrapage",
    hint: "Pour chaque point critique : qui le règle, et avant quand. Chaque ligne devient une tâche une fois la dérogation validée.",
    who: "Qui s'en charge",
    none: "Choisir",
    due: "Avant le",
    line: (label: string, who: string, due: string) =>
      `${label} : ${who}, avant le ${due}`,
  },
  ask: "Demander la validation de la direction",
  direction: "la direction",
  requested:
    "Dérogation demandée : le tournage attend la décision de la direction.",
  pending: (who: string, at: string) =>
    `Dérogation demandée par ${who} le ${at} : en attente de la décision de la direction.`,
  toDecide: (who: string) =>
    `${who} demande de valider la préparation malgré des points critiques. Vous décidez, avec le plan de rattrapage ci-dessous.`,
  approve: "Valider la dérogation",
  refuse: "Refuser",
  refuseReason: "Motif du refus",
  refuseHint:
    "La préparation reste à valider ; la personne qui a demandé la dérogation reçoit votre motif.",
  reasonGiven: (reason: string) => `Motif : « ${reason} »`,
  approved:
    "Dérogation validée : préparation validée, plan de rattrapage en tâches.",
  refused: "Dérogation refusée : la préparation reste à valider.",
  approvedBy: (who: string) => ` Dérogation validée par ${who}.`,
  // MKT-PROD-001: a change after the confirmation reopens it.
  reopened: (at: string, what: string) =>
    `Préparation rouverte le ${at} : ${what}. Le tournage attend un nouveau contrôle.`,
  changes: {
    place: "le lieu a changé",
    date: "la date a changé",
    quote: "une révision du devis est demandée",
    direction: "une nouvelle version de la proposition est demandée",
  },
  force: (list: string) => `Je confirme la préparation malgré ${list}`,
  reason: "Motif",
  reasonPlaceholder: "Ex. : autorisation promise par la mairie pour le 22/10",
  confirm: "Confirmer : préparation validée",
  errors: {
    force: "Cochez la case pour confirmer malgré ce qui n'est pas prêt.",
    reason: "Dites pourquoi vous confirmez quand même.",
    plan: "Pour chaque point critique, dites qui s'en charge et avant quand.",
    planWho: "Choisissez qui s'en charge.",
    planDue: "Choisissez une date.",
    planPast: "L'échéance ne peut pas être passée.",
    planPerson: "Cette personne n'est pas membre de l'équipe.",
    pending: "Une dérogation attend déjà la décision de la direction.",
    already: "La préparation est déjà validée.",
    samePerson:
      "La dérogation est décidée par une autre personne que celle qui la demande.",
    noRequest: "Aucune dérogation n'attend de décision.",
    refuseReason: "Dites pourquoi vous refusez.",
    count: (n: number) =>
      n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
  },
  done: "Préparation validée — tournage à venir.",
  by: (who: string, at: string) => ` Confirmée par ${who} le ${at}`,
  despite: (reason: string) => ` malgré : « ${reason} »`,
  kept: ". La synthèse ci-dessous est gardée telle qu'elle a été validée.",
  link: {
    title: "Préparation",
    done: "Préparation validée — tournage à venir.",
  },
} as const;
