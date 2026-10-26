/** Brief de sortie consolidé of the Stratégie (step 8). */
export const strategyBrief = {
  // MKT-S1-14: read first, before the detail.
  summary: {
    title: "L'essentiel",
    established: (date: string) =>
      `Établi le ${date}, depuis la stratégie à cette date.`,
    objective: "Objectif",
    audiences: "Publics",
    angle: "Angle",
    levers: "Dispositif",
    milestones: "Jalons clés",
    budget: "Budget",
    kpis: "KPI",
    risks: "Risques et manques",
    none: "Non renseigné",
    noRisk: "Aucun point ouvert.",
    details: "Le détail des huit dimensions",
  },
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
    envelopeUndefined:
      "Budget : aucune enveloppe fixée (0 €, montant ou « à confirmer » à choisir)",
    envelopeToConfirm: (amount: string | null) =>
      amount
        ? `Budget : enveloppe de ${amount} à confirmer`
        : "Budget : enveloppe à confirmer",
    overrun: (amount: string) => `Budget : enveloppe dépassée de ${amount}`,
    // Recette 23/10 (MKT-STR-004): a milestone already past, a legal
    // dependency blocked or without a date.
    milestonePassed: (milestone: string, date: string) =>
      `« ${milestone} » était prévu le ${date} : déplacez ce temps fort ou retirez-le`,
    legalBlocked: (label: string) =>
      `Juridique : « ${label} » est bloqué (à lever avant la sortie)`,
    legalNoDate: (label: string) =>
      `Juridique : « ${label} » n'a pas d'échéance`,
    late: (c: {
      step: string;
      deliverable: string;
      milestone: string;
      milestoneDate: string;
      date: string;
      leadDays: number;
      overdueDays: number;
    }) =>
      `${c.step} de « ${c.deliverable} » : prévue le ${c.date}, ${c.leadDays} j avant « ${c.milestone} » du ${c.milestoneDate}, dépassée de ${c.overdueDays} j (déplacer le temps fort, réduire le délai ou accepter le risque)`,
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
    narrativeSummary: "Synthèse du récit",
    leversNone: "Aucun levier retenu.",
    deliverablesNone: "Aucun livrable engagé.",
    milestonesNone: "Aucun temps fort.",
    objective: "Objectif stratégique",
    kpisNone: "Aucun KPI.",
    qualitative: "Qualitatif",
    target: (value: string) => `Cible : ${value}`,
    noTarget: "Cible à fixer",
    dependencies: "Prérequis / dépendances",
    budgetTotals: (
      proposed: string,
      validated: string,
      toDecide: string,
      real: string,
    ) =>
      `Prévisionnel ${proposed} · engagé ${validated} · réel ${real} · à arbitrer ${toDecide}`,
    // MKT-S1-12: a remainder per kind, never one for all.
    remainders: (forecast: string, validated: string, real: string) =>
      `Reste sur le prévisionnel ${forecast} · sur l'engagé ${validated} · sur le réel ${real}`,
    // MKT-S1-12 / 14: levers without any amount are not listed.
    hiddenZero: (count: number) =>
      `${count} levier${count > 1 ? "s" : ""} sans dépense non affiché${count > 1 ? "s" : ""}.`,
    envelope: (envelope: string, remaining: string) =>
      `Enveloppe ${envelope} · reste ${remaining}`,
    noEnvelope: "Pas d'enveloppe fixée",
    envelopeStates: {
      undefined: "Budget non défini",
      zero: "Budget à 0 €",
      set: (envelope: string) => `Enveloppe ${envelope} · pas encore ventilée`,
      toConfirm: (envelope: string | null) =>
        envelope
          ? `Enveloppe ${envelope} à confirmer`
          : "Enveloppe à confirmer",
    },
  },
} as const;
