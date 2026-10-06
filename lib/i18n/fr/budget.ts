/** Budget page of a project: envelope, lines and totals (computed by code). */
export const budget = {
  title: "Budget",
  description:
    "L'enveloppe du projet et chaque dépense, d'estimée à payée. Un montant proposé ne consomme pas l'enveloppe : accepté, il devient engagé. Les totaux sont calculés à partir des lignes.",
  tiles: {
    envelope: "Enveloppe",
    planned: "Estimé",
    proposed: "Proposé",
    committed: "Engagé",
    paid: "Payé",
    remaining: "Reste",
  },
  loadError: "Impossible de charger le budget. Rechargez la page.",
  noEnvelope: "Non définie",
  overrun: (amount: string) => `Dépassement de ${amount}`,
  envelopeHint: "L'enveloppe est celle fixée à la création du projet.",
  statuses: {
    planned: "Estimé",
    proposed: "Proposé",
    committed: "Engagé",
    paid: "Payé",
  },
  filters: {
    label: "Filtrer par statut",
    all: "Toutes",
  },
  table: {
    label: "Ligne",
    status: "Statut",
    amount: "Montant",
    actions: "Actions",
    total: "Total",
    filteredEmpty: "Aucune ligne avec ce statut.",
  },
  empty: {
    title: "Aucune dépense pour l'instant",
    body: "Ajoutez chaque dépense du projet, même prévue : le reste de l'enveloppe se calcule tout seul.",
    bodyReadOnly:
      "Le responsable du projet ajoute ici chaque dépense, de prévue à payée.",
  },
  add: "Ajouter une dépense",
  edit: (label: string) => `Modifier « ${label} »`,
  remove: (label: string) => `Supprimer « ${label} »`,
  form: {
    newTitle: "Nouvelle dépense",
    editTitle: "Modifier la dépense",
    description: "Un libellé, un montant et où en est la dépense.",
    label: "Libellé",
    amount: "Montant (€)",
    amountHint: "Par exemple 1500 ou 1 500,50.",
    status: "Statut",
    family: "Famille",
    lever: "Levier",
    none: "Aucun",
    note: "Note",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    saved: "Dépense enregistrée.",
    invalidAmount:
      "Indiquez un montant en euros, par exemple 1500 ou 1 500,50.",
  },
  confirm: {
    title: "Supprimer cette dépense ?",
    body: (label: string) =>
      `« ${label} » sera retirée du budget. Cette action est définitive.`,
    confirm: "Supprimer",
    deleting: "Suppression…",
    deleted: "Dépense supprimée.",
  },
} as const;
