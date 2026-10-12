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
    // MKT-S1-12: three amounts, three remainders.
    forecast: "Prévisionnel",
    real: "Réel",
    restOf: (amount: string) => `Reste ${amount}`,
    overrunOf: (amount: string) => `Dépassement de ${amount}`,
    hints: {
      forecast: "Toutes les lignes, d'estimée à payée.",
      committed: "Engagé, facturé ou payé : ce que le projet doit.",
      real: "Facturé ou payé : ce qui est réellement dépensé.",
    },
  },
  loadError: "Impossible de charger le budget. Rechargez la page.",
  noEnvelope: "Non définie",
  overrun: (amount: string) => `Dépassement de ${amount}`,
  envelopeHint: "L'enveloppe est celle fixée à la création du projet.",
  statuses: {
    planned: "Estimé",
    proposed: "Proposé",
    committed: "Engagé",
    invoiced: "Facturé",
    paid: "Payé",
  },
  // MKT-S1-11: the team's real spending, said with examples.
  families: {
    content_production: "Production de contenus",
    advertising: "Publicité & promotion",
    events: "Événements & activations",
    services: "Prestations",
    travel: "Déplacements",
    misc: "Frais divers",
    other: "Autre",
  },
  familyHints: {
    content_production:
      "Ce qui se fabrique : clip, photos, visuels, teaser, pochette.",
    advertising:
      "Ce qui fait connaître : campagne publicitaire, sponsorisation, relations presse, influence, playlists.",
    events:
      "Ce qui se vit : concert, showcase, release party, activation de terrain.",
    services:
      "Ce qu'un prestataire facture : studio, mixage, mastering, avocat, graphiste.",
    travel: "Train, avion, hôtel, transport sur place.",
    misc: "Repas, fournitures, abonnements, logiciels.",
    other: "Ce qui n'entre nulle part ailleurs : précisez ce que c'est.",
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
    globalDescription:
      "Un libellé, un montant et son statut suffisent : le classement est proposé, à corriger si besoin. La dépense rejoint le Budget du projet.",
    loading: "Chargement…",
    label: "Libellé",
    amount: "Montant (€)",
    amountHint: "Par exemple 1500 ou 1 500,50.",
    status: "Statut",
    family: "Famille",
    familyDetail: "Précisez de quoi il s'agit",
    familyDetailRequired: "Dites ce qu'est cette dépense « Autre ».",
    suggestion: (family: string, word: string) =>
      `Proposé : ${family} (le libellé dit « ${word} »).`,
    useSuggestion: "Utiliser",
    lever: "Levier",
    deliverable: "Livrable",
    linkSuggestion: (label: string) =>
      `Proposé : ${label} (même mot dans le libellé).`,
    attachment: "Pièce (devis, facture)",
    attachmentHint:
      "Rangée dans les Fichiers du projet, catégorie Autres : jamais déposée deux fois.",
    attachmentKept: (name: string) => `Pièce jointe : ${name}`,
    attachmentOf: (label: string) => `Pièce de la dépense « ${label} »`,
    attachmentFailed:
      "La dépense est enregistrée, mais la pièce n'a pas pu être déposée. Réessayez depuis la ligne.",
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
