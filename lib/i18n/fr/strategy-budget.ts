/** Budget stratégie of the Stratégie (step 6): proposed, validated, to arbitrate, by lever. */
export const strategyBudget = {
  tiles: {
    envelope: "Enveloppe",
    proposed: "Proposé",
    validated: "Validé",
    toDecide: "À arbitrer",
    remaining: "Reste",
  },
  noEnvelope: "Non fixée",
  noRemaining: "—",
  meaning: "Validé = engagé ou payé ; à arbitrer = estimé ou devis.",
  internal:
    "Interne : repris dans le Brief de sortie, jamais dans le Plan de sortie ni le Dossier de presse.",
  overrun: (amount: string) => `Enveloppe dépassée de ${amount}`,
  byLever: {
    title: "Répartition par levier",
    lever: "Levier",
    proposed: "Proposé",
    validated: "Validé",
    toDecide: "À arbitrer",
    noLever: "Hors levier",
    empty: "Retenez d'abord un levier pour y répartir le budget.",
  },
  linesTitle: "Lignes du budget",
} as const;
