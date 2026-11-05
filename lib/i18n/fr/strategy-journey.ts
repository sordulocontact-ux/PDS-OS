// The Stratégie as a journey of four steps (proto « Projet complet »,
// module strategy: MK_STEPS st1–st4, actorsMk, summaryMk, stratEntry,
// BODY_MK.st2/st3/st4, dims, dimBody, itemRow, briefDoc). Exact words of
// the proto, its inconsistencies corrected (docs/projet-complet/strategy.md
// § 11): « À arbitrer » and « En cours » as the ticket says, « Rien de
// renseigné » without an exchange, the creative director in « Prochaine
// étape », « Restant à arbitrer » computed. Written here, never in components.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// A generated document's state, for the summary of « Stratégie validée ».
type DocState =
  "to_generate" | "pending" | "sent" | "approved" | "changes_requested";
const docStates: Record<"one" | "both", Record<DocState, string>> = {
  one: {
    to_generate: "à générer",
    pending: "généré",
    sent: "en validation",
    approved: "validé",
    changes_requested: "à corriger",
  },
  both: {
    to_generate: "à générer",
    pending: "générés",
    sent: "en validation",
    approved: "validés",
    changes_requested: "à corriger",
  },
};

export const strategyJourney = {
  module: "Stratégie",
  owner: "Responsable du projet",
  direction: "Validation de la direction",
  creative: "Validation créative interne",
  noValidation: "Aucune validation",
  roleWhat: {
    owner:
      "Mène la stratégie, tranche les propositions et demande la validation du Brief de sortie",
    direction: "Valide toujours le Brief de sortie",
    creative: "Valide le Brief de sortie quand elle est sollicitée",
  },
  blocked: (prereqs: string) =>
    prereqs.includes(" et ")
      ? `S'ouvre quand ${prereqs} sont faits.`
      : `S'ouvre quand ${prereqs} est fait.`,
  now: {
    waitingTitle: "La Stratégie avance sans vous pour l'instant",
    finished: "La Stratégie est validée",
  },
  plan: {
    label: "Plan du projet",
    module: "Cadrage",
    launched: (day: string) => `Lancé le ${day}`,
  },
  nextExternal: {
    design: { label: "Accueil", module: "Conception" },
    activations: { label: "Leviers à préparer", module: "Activations" },
  },
  steps: {
    start: {
      title: "Démarrer la stratégie",
      why: "Commencer directement, ou préparer un échange avec l'équipe ; ce qui y sera dit deviendra des propositions, dimension par dimension.",
    },
    dimensions: {
      title: "Les 8 dimensions",
      why: "Ce que l'échange a fait dire, rangé par dimension : confirmez, corrigez ou écartez, puis complétez ce qui manque.",
    },
    validation: {
      title: "Validation du Brief de sortie",
      why: "La direction valide le Brief de sortie sur pièce. Pendant la relecture, la Stratégie est figée.",
    },
    validated: {
      title: "Stratégie validée",
      why: (v: number) =>
        `Le Brief de sortie V${v} est figé. Les documents se préparent à partir de lui, et ses décisions alimentent la Conception, les Activations et le Planning.`,
    },
  },
  todo: {
    start: "Choisir comment démarrer",
    hold: "Tenir l'échange stratégique",
    holdOn: (day: string) => `Tenir l'échange du ${day}`,
    confirm: (n: number) =>
      `Confirmer ou écarter ${plural(n, "proposition", "propositions")} de PO`,
    arbitrate: (dimension: string) => `Arbitrer : ${lcFirst(dimension)}`,
    complete: (dimension: string) => `Compléter : ${lcFirst(dimension)}`,
    send: "Demander la validation du Brief de sortie",
    validate: "Valider le Brief de sortie",
    resubmit: "Répondre et transmettre à nouveau",
  },
  summary: {
    exchange: (day: string) => `Échange du ${day}`,
    direct: "Commencée directement",
    established: (n: number) =>
      `Brief de sortie établi · ${plural(n, "réponse confirmée", "réponses confirmées")}`,
    validated: (v: number) => `Brief de sortie — V${v} validé`,
    // « Brief V1 · Plan de sortie et Dossier de presse à générer ».
    final: (v: number, plan: string, press: string) =>
      plan === press
        ? `Brief V${v} · Plan de sortie et Dossier de presse ${docStates.both[plan as DocState] ?? plan}`
        : `Brief V${v} · Plan de sortie ${docStates.one[plan as DocState] ?? plan} · Dossier de presse ${docStates.one[press as DocState] ?? press}`,
  },
  // Démarrer la stratégie (proto stratEntry, prepGate « strat »).
  start: {
    choices: {
      po: {
        title: "Commencer la stratégie",
        body: "Directement sur les 8 dimensions, avec ce que PDS OS sait déjà.",
      },
      call: {
        title: "Préparer un échange",
        body: "Un call avec l'équipe ; PO en tire des propositions pour chaque dimension.",
      },
    },
    // Same rule as the Cadrage's (docs/ARCHITECTURE.md § 6 bis, « Lot 3 »).
    reason: (known: number, missing: number) =>
      `PDS OS connaît déjà ${plural(known, "dimension", "dimensions")} sur 8 ; ${missing} ${missing > 1 ? "restent" : "reste"} à décider : un échange ira plus vite qu'une dimension après l'autre.`,
    reasonPo: (known: number) =>
      `PDS OS connaît déjà ${plural(known, "dimension", "dimensions")} sur 8 : il reste peu à décider, directement.`,
    waiting: (name: string) => `En attente de ${name} : démarrer la stratégie`,
    departure: "Départ",
    departureCall: (when: string) => `Échange stratégique du ${when}`,
    departureDirect: (name: string | null, when: string) =>
      name
        ? `Commencée directement par ${name} le ${when}`
        : `Commencée directement le ${when}`,
    openCall: "Ouvrir le call",
    processing:
      "L'échange est enregistré : la transcription puis le compte rendu se font sur la page du call. PO propose ensuite ce qui a été dit dans « Les 8 dimensions ».",
    meetingName: "Échange stratégique",
    summaryNext: (names: string) =>
      `Le Brief de sortie part en validation auprès de ${names}.`,
    starting: "Ouverture…",
    started: "Stratégie commencée",
  },
  // « Claire Morel et Nadia Benali »
  names: (list: string[]) =>
    list.length <= 1
      ? (list[0] ?? "—")
      : `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`,
};
