// A collective's missing participation contracts and the direction's
// waivers (lot 12 of docs/pds-mic-plan.md, décision 6): preparing and
// recording stay possible, warned; the shoot and the release are blocked
// without the contract signed or a waiver of that scope.
export const participationWaivers = {
  scopes: { shoot: "Tournage", release: "Sortie" },
  // « Dérogation de tournage »
  scopeOf: { shoot: "de tournage", release: "de sortie" },
  // A waiver's line, under the participation's contract.
  line: {
    open: (scope: string, due: string) => `Dérogation ${scope} jusqu'au ${due}`,
    lapsed: (scope: string, due: string) =>
      `Dérogation ${scope} échue le ${due}`,
    revoked: (scope: string) => `Dérogation ${scope} révoquée`,
  },
  // The warning on a title of « Titres et artistes ».
  titleMissing: (names: string) => `Contrat manquant : ${names}`,
  // Upstream (the overview, the Production's preparation).
  callout: {
    title: "Contrats de participation manquants",
    shoot: (names: string) => `Tournage bloqué sans dérogation : ${names}.`,
    release: (names: string) => `Sortie bloquée sans dérogation : ${names}.`,
    body: "La préparation et l'enregistrement continuent. Faites signer les contrats, ou demandez à la direction une dérogation.",
    link: "Participations et contrats",
  },
  // The shoot step.
  shoot: {
    blocked: (names: string) =>
      `Tournage bloqué : contrat non signé de ${names}, et aucune dérogation de tournage ouverte.`,
    how: "Faites signer le contrat, ou demandez à la direction une dérogation de tournage.",
    readiness: (names: string) =>
      `Avant le tournage : contrat non signé de ${names}. « Prête pour tournage » reste possible, mais le tournage sera bloqué sans contrat signé ni dérogation de tournage.`,
  },
  // Refusals of the database, the missing contracts named.
  refused: {
    shoot: (names: string) =>
      `Tournage impossible : contrat non signé de ${names}, et aucune dérogation de tournage ouverte.`,
    release: (names: string) =>
      `Dépôt impossible : contrat non signé de ${names}, et aucune dérogation de sortie ouverte.`,
    someone: "une participation",
  },
  // The direction's gestures, in « Participations et contrats ».
  actions: {
    label: (artist: string) => `Dérogations de ${artist}`,
    grant: "Accorder une dérogation",
    revoke: (scope: string) => `Révoquer la dérogation ${scope}`,
  },
  grant: {
    title: (artist: string, title: string) =>
      `Accorder une dérogation · ${artist} · ${title}`,
    description:
      "Autorise exceptionnellement à avancer sans contrat signé, pour un seul périmètre : une dérogation de tournage ne vaut pas pour la sortie. Elle reste dans l'historique, et vous pouvez la révoquer.",
    scope: "Périmètre",
    reason: "Motif",
    reasonPlaceholder: "Ex. le contrat part en signature lundi",
    risk: "Risque (facultatif)",
    riskPlaceholder: "Ex. image utilisée sans accord écrit",
    due: "Échéance",
    dueHint: "Passée cette date, la dérogation ne couvre plus.",
    submit: "Accorder",
    done: "Dérogation accordée.",
  },
  revoke: {
    title: (scope: string, artist: string) =>
      `Révoquer la dérogation ${scope} · ${artist}`,
    description:
      "La dérogation cesse de couvrir aussitôt. Elle reste dans l'historique, avec qui l'a révoquée et pourquoi.",
    grantedLabel: "Accordée",
    granted: (who: string, date: string) => `Par ${who} le ${date}`,
    reasonLabel: "Motif",
    due: "Échéance",
    reason: "Motif de la révocation (facultatif)",
    submit: "Révoquer",
    done: "Dérogation révoquée.",
  },
  errors: {
    reasonRequired: "Le motif est obligatoire.",
    dueRequired: "Choisissez l'échéance.",
    due_in_past: "L'échéance ne peut pas être passée.",
    contract_signed:
      "Le contrat est déjà signé : aucune dérogation n'est nécessaire.",
    waiver_open: "Une dérogation de ce périmètre est déjà ouverte.",
    participation_not_confirmed:
      "Seule une participation confirmée reçoit une dérogation.",
    title_abandoned: "Ce titre est abandonné : rien n'est bloqué pour lui.",
    waiver_revoked: "Cette dérogation est déjà révoquée.",
    failed: "La dérogation n'a pas pu être enregistrée. Réessayez.",
  } as Record<string, string>,
} as const;
