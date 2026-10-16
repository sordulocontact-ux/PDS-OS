// The Juridique as a journey of five steps (docs/VISION-UX.md § 4): title,
// why, what the person does and what a done step gave. Written here, never
// in the components.

export const legalJourney = {
  owner: "Cheffe ou chef de projet",
  validator: { name: "La direction", role: "Contrats et conditions d'emprunt" },
  rootPrereq: "Dossier ouvert",
  steps: {
    inventory: {
      title: "État des lieux",
      why: "Ce que le projet sait déjà, classé connu, à confirmer ou manquant.",
    },
    framing: {
      title: "Cadrage juridique",
      why: "PO pose une question à la fois sur ce que le projet ne sait pas encore. Vous répondez librement ; il relève les informations, vous les vérifiez avant qu'elles soient gardées.",
    },
    confirmation: {
      title: "Confirmation",
      why: "Une synthèse écrite par le code, confirmée par une personne.",
    },
    plan: {
      title: "Plan d'action",
      why: "Le code propose les démarches ; lancées, elles sont suivies et cochées par leurs sources.",
    },
    tracking: {
      title: "Suivi",
      why: "Chaque démarche se fait depuis sa ligne ; un emprunt non sécurisé bloque la sortie.",
    },
  },
  todo: {
    framing: (open: number) =>
      open > 1 ? `Répondre aux ${open} questions` : "Répondre à la question",
    confirm: "Confirmer le dossier",
    confirmAgain: "Confirmer à nouveau le dossier",
    launch: "Lancer le plan d'action",
    track: (open: number) =>
      open > 1
        ? `Faire avancer ${open} démarches`
        : "Faire avancer la démarche",
  },
  summary: {
    inventory: (known: number, toConfirm: number, missing: number) =>
      `${known} connus · ${toConfirm} à confirmer · ${missing} manquants`,
    answers: (n: number) =>
      n === 1 ? "1 réponse enregistrée" : `${n} réponses enregistrées`,
    nothingToAsk: "Rien à demander",
    confirmed: "Dossier confirmé",
    launched: (n: number) =>
      n === 1 ? "1 démarche lancée" : `${n} démarches lancées`,
    allDone: "Toutes les démarches sont faites",
  },
  plan: {
    launched: (n: number) =>
      n === 1
        ? "Plan d'action lancé : 1 démarche"
        : `Plan d'action lancé : ${n} démarches`,
    openTracking: "Ouvrir le Suivi",
  },
} as const;
