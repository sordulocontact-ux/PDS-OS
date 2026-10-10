const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

/** Pilotage of the Stratégie: its eight dimensions and their work panel. */
export const strategyPilot = {
  listLabel: "Dimensions de la stratégie",
  number: (index: number) => String(index + 1).padStart(2, "0"),
  dimensions: {
    positioning: "Positionnement",
    audiences: "Publics prioritaires",
    narrative: "Narratif de sortie",
    levers: "Dispositif",
    deliverables: "Livrables engagés",
    calendar: "Calendrier de lancement",
    budget: "Budget stratégie",
    objectives: "Objectifs & KPIs",
  },
  // One sentence under the panel's title: what the dimension decides.
  purposes: {
    positioning: "Ce que la sortie doit accomplir en priorité.",
    audiences: "À qui la sortie s'adresse d'abord.",
    narrative:
      "L'histoire racontée autour de la sortie, reprise dans le plan de sortie, le dossier de presse et les pitchs.",
    levers: "Les leviers activés pour lancer la sortie, par famille.",
    deliverables: "Ce qui sera produit, par qui et pour quand.",
    calendar: "Les temps forts avant et après la sortie.",
    budget:
      "Les lignes du budget du projet, rattachées aux leviers de la stratégie.",
    objectives: "Ce que l'on mesure et le chiffre à atteindre.",
  },
  states: {
    to_complete: "À compléter",
    in_progress: "En cours",
    to_decide: "À arbitrer",
    complete: "Complété",
  },
  close: "Fermer",
  summaries: {
    notDefined: "Pas encore défini",
    proposed: (value: string) => `Proposé : ${value}`,
    toConfirm: "Réponses proposées par PO, à confirmer",
    narrative: (filled: number, total: number) =>
      `${filled} élément${filled > 1 ? "s" : ""} sur ${total} renseigné${filled > 1 ? "s" : ""}`,
    noLever: "Aucun levier",
    levers: {
      selected: (n: number) => plural(n, "retenu", "retenus"),
      toDecide: (n: number) => `${n} à arbitrer`,
      openNeeds: (n: number) =>
        plural(n, "besoin sans levier", "besoins sans levier"),
    },
    noSelectedLever: "Retenez d'abord un levier",
    noDeliverable: "Aucun livrable",
    deliverables: {
      count: (n: number) => plural(n, "livrable", "livrables"),
      unassigned: (n: number) => `${n} sans responsable`,
      undated: (n: number) => `${n} sans échéance`,
      uncovered: (n: number) =>
        plural(n, "levier sans livrable", "leviers sans livrable"),
    },
    noMilestone: "Aucun temps fort",
    milestones: (n: number) => plural(n, "temps fort", "temps forts"),
    release: (date: string) => `sortie le ${date}`,
    noReleaseDate: "date de sortie à fixer",
    noBudget: "Aucune ligne de budget",
    budget: {
      committed: (amount: string) => `Engagé ${amount}`,
      planned: (amount: string) => `prévu ${amount}`,
      envelope: (amount: string) => `sur ${amount}`,
      toAccept: (n: number) =>
        plural(n, "devis à accepter", "devis à accepter"),
      overrun: "enveloppe dépassée",
      uncovered: (n: number) =>
        plural(n, "levier sans budget", "leviers sans budget"),
    },
    noObjective: "Aucun objectif",
    objectives: {
      count: (n: number) => plural(n, "objectif", "objectifs"),
      noTarget: (n: number) => `${n} sans cible`,
    },
  },
  narrative: {
    parts: {
      narrative_origin: "Histoire ou origine du morceau",
      narrative_story: "Ce qu'il raconte",
      narrative_context: "Contexte artistique",
      narrative_why_now: "Pourquoi il sort maintenant",
    },
    angleTitle: "Angle à raconter",
  },
  objectives: {
    empty: "Aucun objectif pour l'instant.",
    label: "Objectif",
    labelPlaceholder: "Streams Spotify, abonnés, dates de concert…",
    target: "Cible",
    unit: "Unité",
    unitPlaceholder: "streams",
    dueOn: "Échéance",
    noTarget: "Cible à fixer",
    noDueOn: "sans échéance",
    add: "Ajouter l'objectif",
    adding: "Ajout…",
    save: "Enregistrer",
    cancel: "Annuler",
    edit: "Modifier",
    remove: "Retirer",
    removeLabel: (label: string) => `Retirer l'objectif « ${label} »`,
    editLabel: (label: string) => `Modifier l'objectif « ${label} »`,
  },
} as const;
