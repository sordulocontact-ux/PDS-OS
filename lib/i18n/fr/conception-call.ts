/** Conception, Chemin A (ticket « Conception »): the creative exchange. */
export const conceptionCall = {
  prepare: "Préparer un échange créatif",
  title: "Préparer un échange créatif",
  body: "PO a préparé l'échange à partir de ce qui manque aux livrables. Ajustez, puis vérifiez avant de le créer.",
  defaultTitle: "Échange créatif",
  purposeLabel: "Objectif de l'échange",
  purpose: (deliverables: string[]) =>
    deliverables.length
      ? `Poser les intentions créatives : ${deliverables.join(", ")}`
      : "Poser la direction créative d'ensemble",
  purposeReview: "Relire ensemble les intentions créatives",
  deliverables: "Livrables concernés",
  deliverablesHint: "Les sujets suivent les livrables choisis.",
  noDeliverables: "Aucun livrable dans la Conception pour l'instant.",
  topics: "Sujets à aborder",
  noTopics:
    "Rien ne manque aux livrables choisis : ajoutez les sujets que vous voulez aborder.",
  noParticipants: "Ajoutez au moins une personne.",
  directionTopic: "Direction créative",
  alreadyAttached: "Ce call est déjà un échange de la Conception.",
  deliverableTopic: (title: string) => `Livrable · ${title}`,
  questions: {
    direction: {
      story: "Quelle histoire porte l'ensemble de la campagne ?",
      look: "Quel univers visuel commun aux livrables ?",
      tone: "Quel ton, quelle émotion pour l'ensemble ?",
      musts: "Qu'est-ce qui doit toujours être là, ou jamais ?",
    },
    deliverable: {
      story: (title: string) => `Que doit raconter « ${title} » ?`,
      look: (title: string) => `À quoi doit ressembler « ${title} » ?`,
      tone: (title: string) => `Quel ton, quelle émotion pour « ${title} » ?`,
      musts: (title: string) =>
        `Qu'est-ce qui doit absolument être dans « ${title} », ou en être absent ?`,
    },
    qualify: (title: string) =>
      `« ${title} » est à qualifier : le garde-t-on, sous quelle forme ?`,
  },
  recapDeliverables: "Livrables concernés",
  failed: "L'échange n'a pas pu être créé. Réessayez.",
  locked: "La Conception est soumise ou validée : plus d'échange à préparer.",
  detailsTitle: "Échange créatif",
  detailsDeliverables: "Livrables concernés",
  toConception: "Voir la conception",
  afterCall:
    "PO a relevé les intentions du call. Relisez et confirmez-les livrable par livrable.",
  // The creative exchanges on the Conception's home (MKT-C2-05).
  exchanges: {
    title: "Échanges créatifs",
    hint: "Les calls de la Conception, à venir et passés. Les idées de PO restent des propositions tant qu'une personne ne les confirme pas.",
    empty: "Aucun échange créatif pour l'instant.",
    skipped: (reason: string) => `Commencée sans échange : ${reason}`,
    upcoming: "À venir",
    past: "Passé",
    scopeRelease: "Toute la sortie",
    scopeDeliverables: (titles: string[]) => `Livrables : ${titles.join(", ")}`,
    noReport: "Compte rendu pas encore traité.",
    synthesis: (decisions: number, open: number, actions: number) =>
      [
        decisions === 1 ? "1 décision" : `${decisions} décisions`,
        open === 1 ? "1 question ouverte" : `${open} questions ouvertes`,
        actions === 1 ? "1 action" : `${actions} actions`,
      ].join(" · "),
    ideas: (proposed: number, confirmed: number) =>
      [
        proposed === 1
          ? "1 idée de PO à confirmer"
          : `${proposed} idées de PO à confirmer`,
        confirmed === 1 ? "1 confirmée" : `${confirmed} confirmées`,
      ].join(" · "),
    open: "Ouvrir le call",
    attach: "Rattacher un call existant",
    attachTitle: "Rattacher un call existant",
    attachBody:
      "Un call du projet devient un échange de la Conception. Son compte rendu, s'il est déjà traité, est lu par PO : ses propositions attendent une personne.",
    attachCall: "Call",
    attachPurpose: "Objectif de l'échange",
    attachPurposeDefault: "Échange créatif sur la sortie",
    attachScope: "Livrables concernés",
    attachScopeHint: "Aucun : l'échange porte sur toute la sortie.",
    attachSubmit: "Rattacher",
    attached: "Call rattaché à la Conception.",
    noAttachable: "Aucun autre call du projet à rattacher.",
    callRequired: "Choisissez un call.",
    purposeRequired: "Écrivez l'objectif.",
    // The agenda, prepared from the release's open points and identity.
    openPointsTopic: "Points ouverts du projet",
    identityQuestion: (n: number) =>
      `La sortie reste-t-elle dans l'identité V${n} de l'artiste, ou s'en écarte-t-elle volontairement ?`,
    // A collective whose main artist changed (docs/pds-mic-plan.md).
    identityMismatchQuestion: (n: number, artist: string) =>
      artist
        ? `L'identité V${n} retenue est celle de ${artist} et ne correspond plus à l'artiste principal : la garder, ou passer à celle de l'artiste principal ?`
        : `L'identité V${n} retenue ne correspond plus à l'artiste principal : la garder, ou passer à celle de l'artiste principal ?`,
  },
};
