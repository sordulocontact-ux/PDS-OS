/** Launch strategy stage page and the Strategy deliverable. */
export const strategy = {
  title: "Stratégie de lancement",
  description:
    "La Stratégie de la sortie : positionnement, publics, narratif, dispositif, livrables engagés, calendrier.",
  notStarted:
    "La stratégie n'a pas commencé. Le chef de projet la démarre une fois le Brief validé.",
  locked: "Stratégie soumise ou validée : elle n'est plus modifiable.",
  fields: {
    positioning: "Positionnement",
    audiences: "Publics",
    narrative: "Narratif",
  },
  brief: {
    title: "Rappel du Brief",
    validated: "Validé",
    notValidated: "Pas encore validé",
    empty: "Brief vide.",
    open: "Ouvrir le cadrage",
  },
  levers: {
    title: "Dispositif",
    hint: "Les leviers de lancement, par famille. Seul un levier retenu porte des livrables.",
    empty: "Aucun levier pour l'instant.",
    familyEmpty: "Aucun levier.",
    label: "Levier",
    family: "Famille",
    state: "État",
    states: {
      to_decide: "À arbitrer",
      selected: "Retenu",
      rejected: "Non retenu",
    },
    fromNeed: (need: string) => `Répond au besoin « ${need} »`,
    needsTitle: "Besoins du Brief sans levier",
    needsHint:
      "Point de départ : transformez un besoin en levier, puis arbitrez.",
    fromNeedAction: "En faire un levier",
  },
  deliverables: {
    title: "Livrables engagés",
    hint: "Ce que le dispositif engage à produire. Responsable et échéance peuvent venir plus tard.",
    empty: "Aucun livrable engagé.",
    noLever: "Retenez d'abord un levier pour y rattacher des livrables.",
    name: "Livrable",
    lever: "Levier",
    assignee: "Responsable",
    noAssignee: "Sans responsable",
    dueDate: "Échéance",
    noDueDate: "sans échéance",
    remove: "Retirer",
    removeLabel: (title: string) => `Retirer le livrable « ${title} »`,
  },
  calendar: {
    title: "Calendrier",
    hint: "Les temps forts, saisis à la main. Le décompte est calculé depuis la date de sortie.",
    empty: "Aucun temps fort.",
    reference: (date: string) => `Date de sortie de référence : ${date}`,
    noReference:
      "Aucune date de sortie connue (onglet Sortie ou échéance du projet) : pas de décompte.",
    name: "Temps fort",
    date: "Date",
    kind: "Type",
    deliverable: "Livrable lié",
    noDeliverable: "Aucun",
    remove: "Retirer",
    removeLabel: (title: string) => `Retirer le temps fort « ${title} »`,
    kinds: {
      release: "Sortie",
      announcement: "Annonce",
      teaser: "Teaser",
      content: "Contenu",
      live: "Live",
      press: "Presse",
      other: "Autre",
    },
    dayOffset: (days: number) =>
      days === 0 ? "Jour J" : days < 0 ? `J${days}` : `J+${days}`,
  },
  import: {
    title: "Importer depuis un call",
    hint: "Propose positionnement, publics, narratif et leviers entendus pendant un call. Rien n'est confirmé automatiquement ; le calendrier reste saisi à la main.",
  },
  validation: {
    title: "Validation de la Stratégie",
    start: "Commencer la stratégie",
    briefFirst: "Le Brief doit être validé avant de commencer la stratégie.",
  },
} as const;
