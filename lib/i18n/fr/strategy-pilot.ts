const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

/** Pilotage of the Stratégie: its eight dimensions, unfolded in place. */
export const strategyPilot = {
  listLabel: "Dimensions de la stratégie",
  // Folds the unfolded dimension back, once there is nothing left to save.
  done: "Terminé",
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
  // One sentence atop an unfolded dimension: what it decides.
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
    lateUpstream: (n: number) =>
      n > 1 ? `${n} échéances amont trop tard` : "1 échéance amont trop tard",
    noBudget: "Aucune ligne de budget",
    budget: {
      validated: (amount: string) => `Validé ${amount}`,
      toDecide: (amount: string) => `${amount} à arbitrer`,
      envelope: (amount: string) => `sur ${amount}`,
      overrun: "enveloppe dépassée",
      uncovered: (n: number) =>
        plural(n, "levier sans budget validé", "leviers sans budget validé"),
    },
    noObjective: "Aucun objectif",
    objectives: {
      defined: "Objectif défini",
      undefined: "Objectif stratégique à définir",
      count: (n: number) => plural(n, "KPI", "KPIs"),
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
} as const;
