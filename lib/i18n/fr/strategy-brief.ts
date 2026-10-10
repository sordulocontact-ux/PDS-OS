/** Brief de sortie consolidé of the Stratégie (step 8). */
export const strategyBrief = {
  title: "Brief de sortie",
  body: "Le document interne de référence de la sortie, établi par PO depuis les huit dimensions de la stratégie. Il est interne : le budget n'apparaît jamais dans le Plan de sortie ni le Dossier de presse.",
  asOf: (date: string) => `État au ${date}`,
  backToPilotage: "Pilotage de la stratégie",
  // On the pilotage, under the eight dimensions.
  entry: {
    title: "Brief de sortie",
    ready:
      "Les huit dimensions sont renseignées : PO peut établir le Brief de sortie.",
    notReady: (dimensions: string) =>
      `PO établit le Brief de sortie quand chaque dimension est au moins commencée. À compléter : ${dimensions}.`,
    open: "Générer le Brief de sortie",
    see: "Voir le Brief de sortie",
  },
  notReady: {
    title: "Pas encore de Brief de sortie",
    body: "PO établit le Brief quand chaque dimension est au moins commencée. Complétez :",
  },
  toDecide: {
    title: "Restant à arbitrer",
    none: "Rien ne reste à arbitrer.",
    badge: "À arbitrer",
    proposedField: (field: string) => `${field} : proposition à confirmer`,
    suggestions: (field: string) =>
      `${field} : réponses proposées par PO, à confirmer`,
    lever: (lever: string) => `Levier « ${lever} » à arbitrer`,
    budget: (amount: string) => `Budget : ${amount} à arbitrer`,
    overrun: (amount: string) => `Budget : enveloppe dépassée de ${amount}`,
    late: (step: string, deliverable: string, milestone: string) =>
      `${step} de « ${deliverable} » déjà passée pour « ${milestone} »`,
  },
  modifyWithPo: "Modifier avec PO",
  requestFromBrief: "La validation se demande depuis le Brief de sortie.",
  openBrief: "Ouvrir le Brief de sortie",
  requestBlocked:
    "Complétez les dimensions de la stratégie : la validation se demande sur le Brief de sortie complet.",
  validationTitle: "Validation du Brief de sortie",
  sections: {
    empty: "Non renseigné.",
    narrativeAngle: "Angle",
    leversNone: "Aucun levier retenu.",
    deliverablesNone: "Aucun livrable engagé.",
    milestonesNone: "Aucun temps fort.",
    objective: "Objectif stratégique",
    kpisNone: "Aucun KPI.",
    qualitative: "Qualitatif",
    target: (value: string) => `Cible : ${value}`,
    noTarget: "Cible à fixer",
    budgetTotals: (proposed: string, validated: string, toDecide: string) =>
      `Proposé ${proposed} · validé ${validated} · à arbitrer ${toDecide}`,
    envelope: (envelope: string, remaining: string) =>
      `Enveloppe ${envelope} · reste ${remaining}`,
    noEnvelope: "Pas d'enveloppe fixée",
  },
} as const;
