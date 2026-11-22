// The Juridique as a journey of five steps (docs/VISION-UX.md § 4): title,
// why, what the person does and what a done step gave. Written here, never
// in the components.

export const legalJourney = {
  owner: "Cheffe ou chef de projet",
  validator: {
    name: "La direction",
    role: "Contrats et conditions d'utilisation",
  },
  // What a gesture did, for the result banner and its toast (rule 7).
  done: {
    confirmed: "Dossier confirmé",
    launched: "Plan d'action lancé",
    // Gestures of the team that move a démarche or a step on (JUR-04).
    clearance: {
      requested: "Demande d'autorisation envoyée",
      nothingToSecure: "Autorisation close : rien à sécuriser",
      replied: "Réponse envoyée à la direction",
      refused: "Refus enregistré",
      termsValidated: "Conditions validées",
      countered: "Contre-proposition demandée",
      contractSent: "Contrat d'autorisation envoyé",
      secured: "Autorisation sécurisée",
      advanced: "Autorisation avancée",
      withdrawn: "Élément retiré du titre",
      replaced: "Élément remplacé et redemandé",
    },
    formality: {
      opened: "Dossier SACEM ouvert",
      valuesSaved: "Dossier validé",
      generated: "Bulletin à signer généré",
      partial: "Déclaration partielle enregistrée",
      submitted: "Dépôt enregistré",
      processing: "Dossier en cours de traitement",
      rejected: "Rejet enregistré",
      restarted: "Dossier repris",
      actionRequired: "Complément demandé",
      completed: "Formalité terminée",
      signedForHouse: "Bulletin signé pour PDS Éditions",
      signedOtherwise: "Signature enregistrée",
    },
    contract: {
      generated: "Contrat généré",
      sent: "Contrat envoyé pour signature",
      submitted: "Contrat soumis à la direction",
      approved: "Contrat validé",
      changesRequested: "Modifications demandées",
      signed: "Contrat marqué signé",
      countersigned: "Contrat contresigné",
      terminated: "Contrat résilié",
    },
    split: {
      proposed: "Répartition envoyée pour confirmation",
      revoked: "Accès révoqué",
    },
    delegated: "Démarche déléguée",
  },
  // Several prerequisites arrive joined by « et ».
  blocked: (prereqs: string) =>
    prereqs.includes(" et ")
      ? `Se débloque quand ${prereqs} sont faits.`
      : `Se débloque quand ${prereqs} est fait.`,
  steps: {
    inventory: {
      title: "État des lieux",
      why: "Ce que le projet sait déjà, classé connu, à confirmer ou manquant.",
    },
    framing: {
      title: "Cadrage juridique",
      why: "PO pose une question à la fois sur ce que le projet ne sait pas encore.",
    },
    confirmation: {
      title: "Confirmation",
      why: "Une synthèse écrite par le code, confirmée par une personne. Confirmer le dossier ne vaut ni signature, ni autorisation, ni dépôt.",
    },
    plan: {
      title: "Plan d'action",
      why: "Le code propose les démarches et les contrats à prévoir. Vous confirmez les contrats en une fois, puis vous gardez, attribuez et datez chaque démarche.",
    },
    tracking: {
      title: "Suivi",
      why: "Chaque démarche se fait depuis sa ligne ; une œuvre existante non autorisée bloque la sortie.",
    },
  },
  todo: {
    framing: (open: number) =>
      open > 1
        ? `Répondre aux ${open} questions du cadrage juridique`
        : "Répondre à la question du cadrage juridique",
    confirm: "Confirmer le dossier juridique",
    confirmAgain: "Confirmer à nouveau le dossier juridique",
    launch: "Lancer le plan d'action juridique",
    track: (open: number) =>
      open > 1
        ? `Faire avancer ${open} démarches juridiques`
        : "Faire avancer la démarche juridique",
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
