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
  // MKT-S1-05: each public with what makes it actionable.
  audiences: {
    title: "Les publics, un par un",
    empty: "Aucun public décrit pour l'instant.",
    add: "Ajouter un public",
    edit: "Modifier",
    remove: "Retirer",
    save: "Enregistrer le public",
    saved: "Public enregistré.",
    segment: "Segment",
    segmentHint:
      "Qui : « fans de rap FR 18-25 ans », « médias musique urbaine »…",
    segmentRequired: "Nommez ce public.",
    priority: "Priorité",
    priorities: { primary: "Cœur de cible", secondary: "À conquérir ensuite" },
    insight: "Besoin ou insight",
    insightHint: "Ce qui le touche, ce qu'il attend de cette sortie.",
    channel: "Canal pressenti",
    channelHint: "Où le toucher : TikTok, radio, presse spécialisée, live…",
    toFill: "à renseigner",
  },
  // MKT-S1-05: the positioning in plain words, no jargon required.
  positioning: {
    title: "Le positionnement en quatre points",
    parts: {
      positioning_promise: "Promesse : ce que la sortie apporte",
      positioning_difference: "Différence : ce qui la distingue",
      positioning_proof: "Preuve : ce qui le montre",
      positioning_tone: "Tonalité : comment on en parle",
    },
  },
  summaries: {
    // MKT-S1-05: said on the card, the first missing one a click away.
    counts: (c: { confirmed: number; toDecide: number; missing: number }) =>
      [
        c.confirmed > 0 &&
          `${c.confirmed} confirmé${c.confirmed > 1 ? "s" : ""}`,
        c.toDecide > 0 && `${c.toDecide} à arbitrer`,
        c.missing > 0 && `${c.missing} à renseigner`,
      ]
        .filter(Boolean)
        .join(" · "),
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
    budget: {
      undefinedEnvelope: "Budget non défini, à arbitrer",
      envelopeToConfirm: (amount: string | null) =>
        amount ? `Enveloppe de ${amount} à confirmer` : "Enveloppe à confirmer",
      zero: "Budget à 0 €, aucune dépense",
      envelopeOnly: (amount: string) =>
        `Enveloppe de ${amount}, pas encore ventilée`,
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
