// Blockers and noted information of a step (proto `docs/protos/marketing.html`
// blockerForm, blockerRow, liftModal, decisionForm, decisionsView, strip).

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const stepTools = {
  report: "Signaler un blocage",
  note: "Noter une information",
  cancel: "Annuler",
  blocker: {
    title: "Signaler un blocage",
    what: "Ce qui bloque",
    whatPlaceholder: "Ex. : l'autorisation de stationnement n'est pas arrivée",
    who: "Qui débloque",
    next: "Prochaine action",
    nextPlaceholder: "Ex. : relancer la mairie",
    submit: "Signaler",
    done: "Blocage signalé",
    missingWhat: "Dites ce qui bloque.",
    missingWho: "Dites qui débloque.",
    missingNext: "Dites la prochaine action.",
    blocked: "Bloqué",
    unblocks: "Débloque :",
    nextAction: (text: string) => `prochaine action : ${text}`,
    reported: (day: string, by: string) =>
      by ? `signalé le ${day} par ${by}` : `signalé le ${day}`,
    contradiction: (texts: string[]) =>
      `Informations contradictoires : ${texts.map((t) => `« ${t} »`).join(" / ")}`,
    contradictionNext: "Indiquer l'information qui fait foi",
    choose: "Choisir ce qui fait foi",
  },
  lift: {
    button: "Lever le blocage",
    title: "Lever le blocage",
    description: "Dites ce qui l'a réglé.",
    context: (day: string, by: string, who: string) =>
      `Signalé le ${day}${by ? ` par ${by}` : ""} · à lever par ${who}`,
    label: "Ce qui l'a réglé",
    placeholder: "Ex. : autorisation reçue de la mairie le 22/10",
    hint: "Le blocage reste dans l'historique avec cette explication.",
    done: "Blocage levé",
  },
  noteForm: {
    title: "Noter une information",
    what: "Ce qui a été dit",
    whatPlaceholder: "Ex. : l'artiste est disponible jusqu'à 15 h le 23/10",
    source: "Source",
    status: "Statut",
    step: "Étape concernée",
    contradicts: "Contredit",
    nothing: "Rien",
    submit: "Noter",
    done: "Information notée.",
    doneContradiction: "Notée : contradiction à trancher.",
    missingWhat: "Écrivez ce qui a été dit.",
  },
  sources: {
    call: "Appel",
    whatsapp: "WhatsApp",
    email: "E-mail",
    meeting: "Réunion",
    other: "Autre",
  },
  statuses: {
    information: "Information",
    to_confirm: "À confirmer",
    pending_decision: "En attente de décision",
    decided: "Décidé",
  },
  notes: {
    title: "Informations et décisions",
    intro:
      "Ce qui se dit au téléphone, sur WhatsApp ou par e-mail est noté ici avec sa source. Une information non confirmée ne fait jamais avancer une étape.",
    inStep: "Informations notées",
    inStepContradiction:
      "Deux informations se contredisent : tant qu'aucune ne fait foi, c'est un blocage.",
    contradiction: "Contradiction à trancher",
    contradictionHint:
      "Les deux restent ; celle qui fait foi est visible partout, l'autre reste dans l'historique. Tant que rien n'est tranché, c'est un blocage.",
    groups: {
      pending_decision: "En attente de décision",
      to_confirm: "À confirmer",
      decided: "Décidé",
      information: "Informations",
    },
    old: "Écartées ou remplacées",
    discarded: "Écartée",
    source: (source: string, by: string, day: string) =>
      `${source} · noté par ${by} le ${day}`,
    confirmed: (by: string, day: string) => `confirmé par ${by} le ${day}`,
    discardedTag: "écarté",
    authoritativeTag: "fait foi",
    authoritative: "Fait foi",
    decide: "Décider",
    confirm: "Confirmer",
    discard: "Écarter",
    doneAuthoritative: "Contradiction tranchée",
    doneDecide: "Décision validée.",
    doneDiscard: "Écarté, gardé dans l'historique.",
    empty: "Aucune information notée pour l'instant.",
    open: "Informations et décisions",
  },
  chips: {
    label: "Points ouverts",
    blockers: (n: number) => plural(n, "blocage", "blocages"),
    review: (n: number) => plural(n, "élément à revoir", "éléments à revoir"),
    toConfirm: (n: number) =>
      plural(n, "information à confirmer", "informations à confirmer"),
  },
  missingCount: (count: number) =>
    count === 1 ? "Un champ à corriger." : `${count} champs à corriger.`,
  errors: {
    forbidden: "Vous ne pouvez pas faire cela sur ce projet.",
    invalid: "Vérifiez les champs.",
    unblocker: "Choisissez qui débloque : un membre, un contact ou un nom.",
    lifted: "Ce blocage est déjà levé.",
    liftNote: "Dites ce qui a réglé le blocage.",
    noteGone: "Cette information a été écartée entre-temps.",
    noteNotOpen: "Cette information n'attend plus de décision.",
    failed: "L'enregistrement n'a pas abouti. Réessayez.",
  },
} as const;
