// « Les 8 dimensions » of the Stratégie (proto « Projet complet »: dims,
// dimBody, itemRow, groupHead, addForm, budget, BODY_MK.st2). Exact words
// of the proto; « À arbitrer » / « En cours » as the ticket says (§ 2).

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const strategyDimensions = {
  names: {
    positioning: "Positionnement",
    audiences: "Publics prioritaires",
    narrative: "Narratif de sortie",
    levers: "Dispositif",
    deliverables: "Livrables engagés",
    calendar: "Calendrier de lancement",
    budget: "Budget stratégie",
    objectives: "Objectifs & KPIs",
  },
  states: {
    to_complete: "À faire",
    in_progress: "En cours",
    to_decide: "À arbitrer",
    complete: "Complété",
  },
  // Where a dimension stands, after « n à confirmer » (the Cadrage's words).
  stateWords: {
    to_complete: "à compléter",
    in_progress: "en cours",
    to_decide: "à arbitrer",
    complete: "Complète",
  },
  add: {
    positioning: "Ajouter une réponse",
    audiences: "Ajouter un public",
    narrative: "Ajouter un angle",
    levers: "Ajouter un levier",
    deliverables: "Ajouter un livrable",
    calendar: "Ajouter un temps fort",
    budget: "Ajouter une ligne",
    objectives: "Ajouter un objectif",
  },
  // The field of « Ajouter … » (proto addForm).
  fields: {
    positioning: "Positionnement",
    audiences: "Public",
    narrative: "Angle",
    deliverable: "Livrable",
    deliverablePlaceholder: "Ex. : Session acoustique",
    format: "Format",
    formatPlaceholder: "Ex. : 16:9, 4 min",
    milestone: "Temps fort",
    milestonePlaceholder: "Ex. : Live sur Instagram",
    day: "Jour par rapport à la sortie",
    dayPlaceholder: "Ex. : -3 pour J-3",
    line: "Ligne",
    linePlaceholder: "Ex. : Achat média",
    amount: "Montant estimé",
    amountPlaceholder: "En euros HT",
    objective: "Objectif",
    decided: "Ce qui a été décidé",
    lever: "Levier",
    otherLever: "Autre levier",
    otherLeverLabel: "Nom du levier",
  },
  errors: {
    text: "Écrivez ce qu'il faut ajouter.",
    day: "Le jour par rapport à la sortie, en nombre : -3 pour J-3.",
    amount: "Le montant estimé, en euros.",
    lever: "Choisissez le levier.",
    releaseDate:
      "Fixez d'abord la date de sortie : le temps fort se place par rapport à elle.",
  },
  addButton: "Ajouter",
  cancel: "Annuler",
  done: {
    added: "Ajouté",
    kept: "Retenu",
    discarded: "Écarté",
    saved: "Modifié et retenu",
    retained: "Levier retenu",
    notRetained: "Levier non retenu",
    confirmedAll: (n: number, dimension: string) =>
      `${plural(n, "proposition retenue", "propositions retenues")} · ${dimension}`,
  },
  // The dimensions as the Cadrage's (DimensionList, Sacha 06/11/2026),
  // under PO's question: never the step's name twice (Sacha 09/11/2026).
  listTitle: "Avancement",
  // The Dispositif's two parts.
  leverHeads: {
    proposed: "Proposé par PO",
    levers: "Leviers",
  },
  confirmAll: (n: number) => (n > 1 ? `Confirmer les ${n}` : "Confirmer"),
  confirming: "Confirmation…",
  confirmAllHint: (n: number) =>
    n > 1
      ? "Tout est juste ? Confirmez-les ensemble, ou modifiez ou écartez une ligne d'abord."
      : "C'est juste ? Confirmez-la, ou modifiez-la ou écartez-la d'abord.",
  counter: (complete: number, toDecide: number, toComplete: number) =>
    `${complete} ${complete > 1 ? "complétées" : "complétée"} · ${toDecide} à arbitrer · ${toComplete} à compléter`,
  frozenCallout: "La Stratégie est figée pendant sa validation.",
  nothingYet: "Rien de renseigné pour l'instant.",
  // Facts at the head of the step.
  // Sources of a line.
  saidIn: (day: string) => `Échange stratégique du ${day}`,
  typedBy: (name: string) => `Saisi par ${name}`,
  fromBrief: "Brief de cadrage › Besoins",
  briefBudget: "Brief de cadrage › Budget",
  commonLevers: "Leviers courants",
  // Levers (proto LSTATE).
  lever: {
    retained: "Retenu",
    to_decide: "À arbitrer",
    not_retained: "Non retenu",
    retain: "Retenir",
    reject: "Ne pas retenir",
    retainedBy: (name: string) => `retenu par ${name}`,
    rejectedBy: (name: string) => `non retenu par ${name}`,
  },
  // Calendar.
  upstream: {
    title: "Échéances amont",
    note: "Calculées depuis le premier temps fort de chaque livrable. Elles partent dans le Planning.",
    none: "Aucun livrable retenu n'a encore de temps fort.",
    first: (title: string, day: string) =>
      `Premier temps fort : ${title}, ${day}`,
    late: "Trop tard",
    steps: {
      conception: "Conception terminée le",
      production: "Production terminée le",
      validation: "Validation le",
    },
  },
  noReleaseDate: "Date de sortie à fixer",
  // Budget (proto budget(), its rule written in docs).
  budget: {
    envelope: "Enveloppe",
    proposed: "Proposé",
    validated: "Validé",
    toDecide: "À arbitrer",
    rest: "Reste",
    envelopeSource: "Brief de cadrage › Budget",
    noEnvelope: "Non définie",
    proposedSource: "Lignes des leviers retenus",
    validatedSource: "Engagé ou payé",
    toDecideSource: "Lignes des leviers à arbitrer",
    restSource: "Enveloppe − proposé − à arbitrer",
    lineToDecide: "À arbitrer",
    lineDropped: "Écartée",
    outOfLever: "Hors levier",
    leverOf: (label: string) => `Levier : ${label}`,
    internal:
      "Le budget reste interne : il ne figure ni dans le Plan de sortie, ni dans le Dossier de presse.",
  },
  // The parts of a written answer, in its open dimension.
  parts: {
    positioning: "Les quatre points du positionnement",
    narrative: "Le récit, partie par partie",
  },
  strategicObjective: "Objectif stratégique",
  toConfirm: (n: number) => `${n} à confirmer`,
  pending: (n: number) =>
    `${plural(n, "proposition", "propositions")} à trancher`,
};
