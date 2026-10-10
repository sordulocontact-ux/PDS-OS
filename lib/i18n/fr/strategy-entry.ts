const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

/** Entry of the Stratégie and its prepared exchanges (« Préparer un échange »). */
export const strategyEntry = {
  title: "Stratégie de lancement",
  body: "Construisez la stratégie de la sortie avec PO, directement ou pendant un échange. PO part de ce que le projet sait déjà et ne demande que ce qui manque.",
  readOnly:
    "Le chef de projet responsable mène la stratégie ; vous la suivez ici dès qu'elle commence.",
  facts: {
    label: "Contexte du projet",
    project: "Projet",
    artist: "Artiste",
    type: "Type",
    releaseDate: "Date de sortie",
    status: "Statut",
    noReleaseDate: "Pas encore fixée",
  },
  notStarted: "Non commencée",
  sources: (calls: number) =>
    calls === 0
      ? "PO s'appuie sur le Brief validé."
      : `PO s'appuie sur le Brief validé et ${plural(calls, "compte rendu de call", "comptes rendus de calls")}.`,
  start: "Commencer la stratégie",
  starting: "Ouverture…",
  prepare: "Préparer un échange",
  errors: {
    plan_required:
      "La stratégie attend le plan du projet : lancez-la depuis le plan.",
    generic: "Impossible de commencer la stratégie pour l'instant. Réessayez.",
  },
  call: {
    title: "Préparer un échange",
    body: "PO a préparé l'échange à partir de ce qui manque à la stratégie. Ajustez, puis vérifiez avant de le créer.",
    defaultTitle: "Échange stratégie",
    purposeLabel: "Objectif de l'échange",
    purpose: (topics: string[]) =>
      `Décider de la stratégie de sortie : ${topics.join(", ")}`,
    purposeReview: "Relire ensemble la stratégie de sortie",
    topics: "Sujets à aborder",
    noTopics:
      "La stratégie ne manque de rien : ajoutez les sujets que vous voulez aborder.",
    noParticipants: "Ajoutez au moins une personne.",
    format: "Format",
    formats: {
      video: "Visio",
      in_person: "Sur place",
      phone: "Téléphone",
    },
    formatHints: {
      video: "L'onglet de la visio et le micro sont enregistrés.",
      in_person: "Enregistré au micro de l'ordinateur.",
      phone: "Enregistré au micro, haut-parleur activé.",
    },
    review: "Vérifier",
    recapTitle: "Récapitulatif",
    recapBody: "Rien n'est créé tant que vous n'avez pas confirmé.",
    recap: {
      title: "Titre",
      when: "Date",
      format: "Format",
      link: "Lien",
      purpose: "Objectif",
      participants: "Participants",
      topics: "Sujets",
      none: "Aucun",
    },
    edit: "Modifier",
    cancel: "Annuler",
    create: "Créer l'échange",
    creating: "Création…",
    failed: "L'échange n'a pas pu être créé. Réessayez.",
    locked: "La stratégie est soumise ou validée : plus d'échange à préparer.",
    detailsTitle: "Échange stratégie",
    detailsPurpose: "Objectif",
    detailsFormat: "Format",
  },
  questions: {
    confirm: (label: string, value: string) => `${label} : ${value} ?`,
    leverForNeed: (need: string) => `Quel levier pour « ${need} » ?`,
    leverToDecide: (lever: string) => `On retient « ${lever} » ?`,
    noLever: "Quels leviers activer pour cette sortie ?",
    deliverablesFor: (lever: string) => `Quels livrables pour « ${lever} » ?`,
    releaseDate: "Quelle date de sortie ?",
    milestones: "Quels temps forts avant et après la sortie ?",
    narrativeParts: {
      narrative_origin: "D'où vient le morceau ?",
      narrative_story: "Que raconte-t-il ?",
      narrative_context: "Dans quel contexte artistique s'inscrit-il ?",
      narrative_why_now: "Pourquoi sort-il maintenant ?",
    },
    noBudget: "Quel budget pour quels leviers ?",
    quoteToAccept: (line: string) => `Accepte-t-on le devis « ${line} » ?`,
    budgetFor: (lever: string) => `Quel budget pour « ${lever} » ?`,
    noObjective: "Quels objectifs chiffrés pour la sortie ?",
    targetFor: (objective: string) => `Quelle cible pour « ${objective} » ?`,
  },
  afterCall: "Stratégie pré-remplie depuis le call. Relisez et confirmez.",
  toStrategy: "Voir la stratégie",
} as const;
