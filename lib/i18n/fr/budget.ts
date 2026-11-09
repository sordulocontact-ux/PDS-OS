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
  // The « Poste » of a line (retour du 09/11/2026: the artist's kinds of
  // spend joined the families, one list).
  families: {
    content_production: "Production de contenus",
    photo_video: "Photo et vidéo",
    image: "Image",
    advertising: "Publicité & promotion",
    events: "Événements & activations",
    studio: "Studio",
    services: "Prestations",
    coaching: "Coaching",
    equipment: "Matériel",
    transport: "Transport",
    lodging: "Hébergement",
    per_diem: "Per diem",
    food: "Restauration",
    food_delivery: "Livraison de repas",
    misc: "Frais divers",
    other: "Autre",
  },
  familyHints: {
    content_production:
      "Ce qui se fabrique : clip, visuels, teaser, pochette, motion design.",
    photo_video: "Shooting photo, tournage, contenus pour les réseaux.",
    image: "Stylisme, tenues, coiffure, maquillage.",
    advertising:
      "Ce qui fait connaître : campagne publicitaire, sponsorisation, relations presse, influence, playlists.",
    events:
      "Ce qui se vit : concert, showcase, release party, activation de terrain.",
    studio: "Location de studio, heures d'enregistrement.",
    services:
      "Ce qu'un prestataire facture : mixage, mastering, avocat, graphiste, réalisateur.",
    coaching: "Coach vocal, scénique, média training.",
    equipment: "Instrument, micro, location de matériel.",
    transport: "Train, avion, taxi, Uber, essence, péage.",
    lodging: "Hôtel, Airbnb.",
    per_diem: "Indemnité par jour en déplacement, en tournée.",
    food: "Restaurant, repas de session, traiteur.",
    food_delivery: "Uber Eats, Deliveroo.",
    misc: "Fournitures, abonnements, logiciels.",
    other: "Ce qui n'entre nulle part ailleurs : précisez ce que c'est.",
  },
  // « Par poste » (retour du 09/11/2026, repris du Budget de l'artiste).
  byFamily: {
    title: "Par poste",
    hint: "Toutes les lignes, quel que soit leur état, additionnées par poste.",
    none: "Sans poste",
    count: (count: number) => `${count} ligne${count > 1 ? "s" : ""}`,
    pending: (amount: string) => `dont ${amount} pas encore engagés`,
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
  // A line that follows an invoice (lib/invoices).
  committedWas: (amount: string) => `Engagé ${amount}`,
  form: {
    newTitle: "Nouvelle dépense",
    editTitle: "Modifier la dépense",
    description: "Un libellé, un montant et où en est la dépense.",
    globalDescription:
      "Un libellé, un montant et son statut suffisent : le classement est proposé, à corriger si besoin. La dépense rejoint le Budget du projet.",
    loading: "Chargement…",
    label: "Libellé",
    amount: "Montant HT (€)",
    followsInvoice:
      "Le montant et l'état suivent la facture : ils changent quand elle est reçue, puis payée.",
    amountHint: "Par exemple 1500 ou 1 500,50.",
    status: "Statut",
    family: "Poste",
    familySearch: "Rechercher un poste",
    familyNone: "Aucun poste ne correspond.",
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
