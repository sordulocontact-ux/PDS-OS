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
  missing: (n: number) =>
    n === 1
      ? "1 point n'est pas prêt. Vous pouvez confirmer quand même, en connaissance de cause et avec un motif."
      : `${n} points ne sont pas prêts. Vous pouvez confirmer quand même, en connaissance de cause et avec un motif.`,
  force: (list: string) => `Je confirme la préparation malgré ${list}`,
  reason: "Motif",
  reasonPlaceholder: "Ex. : autorisation promise par la mairie pour le 22/10",
  confirm: "Confirmer : préparation validée",
  errors: {
    force: "Cochez la case pour confirmer malgré ce qui n'est pas prêt.",
    reason: "Dites pourquoi vous confirmez quand même.",
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
