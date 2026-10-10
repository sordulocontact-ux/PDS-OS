/** Calendrier de lancement of the Stratégie (step 5): milestones, channels, upstream deadlines. */
export const strategyCalendar = {
  views: {
    label: "Vue du calendrier",
    milestones: "Temps forts",
    channels: "Par canal",
  },
  channels: {
    organic: "Organique",
    influence: "Influence",
    press: "RP / Médias",
    release: "Sortie",
    live: "Live / Event",
    other: "Autre",
  },
  channelEmpty: "Aucun temps fort sur ce canal.",
  add: "Ajouter un temps fort",
  open: (title: string) => `Ouvrir le temps fort « ${title} »`,
  noDate: "Sans décompte",
  dialog: {
    addTitle: "Nouveau temps fort",
    editTitle: "Modifier le temps fort",
    description:
      "Un jalon du lancement, saisi par l'équipe. Le décompte depuis la sortie est calculé.",
    close: "Fermer",
    title: "Temps fort",
    relative: "Jour",
    relativePlaceholder: "J-10",
    relativeHint: "Par rapport à la sortie : J-10, J0, J+2…",
    relativeInvalid: "Écrivez un jour comme J-10, J0 ou J+2.",
    date: "Date",
    kind: "Type",
    channel: "Canal",
    deliverable: "Livrable qui sort ce jour-là",
    noDeliverable: "Aucun",
    deliverableHint:
      "Ses échéances amont (conception, production, validation) se calculent depuis cette date.",
    notes: "Note",
    notesPlaceholder: "Ce qui se passe, qui s'en occupe, le lien utile…",
    save: "Enregistrer",
    add: "Ajouter",
    saving: "Enregistrement…",
    remove: "Retirer le temps fort",
  },
  upstream: {
    title: "Échéances amont",
    description:
      "Pour chaque livrable rattaché à un temps fort, ce qui doit être prêt avant. Calculé depuis le premier temps fort où il sort.",
    empty:
      "Rattachez un livrable à un temps fort : ses échéances de conception, de production et de validation apparaîtront ici et dans le Planning.",
    forMilestone: (title: string, day: string) => `pour « ${title} » · ${day}`,
    steps: {
      conception: "Conception terminée",
      production: "Production terminée",
      validation: "Validation",
    },
    late: "Trop tard",
    planningKind: "Échéance amont",
    planningLine: (step: string, milestone: string) =>
      `${step} · pour « ${milestone} »`,
  },
} as const;
