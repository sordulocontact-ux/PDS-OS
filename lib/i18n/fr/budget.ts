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
    label: "Dépense",
    // One fact per column (Sacha, 12/11/2026: never two lines of facts).
    date: "Date",
    family: "Poste",
    target: "Projet ou artiste",
    linkedTo: "Lié à",
    proof: (name: string) => `Voir le justificatif ${name}`,
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
  // BUD 1: a real spend (invoiced or paid) without its proof.
  noProof: "Sans justificatif",
  errors: {
    invalid: "Vérifiez le libellé, le montant et la date de la dépense.",
    forbidden:
      "Vous ne pouvez pas écrire cette dépense : le budget d'un projet s'écrit par son responsable, celui d'un artiste par la direction, les chefs de projet et les business managers.",
    followsInvoice:
      "Cette dépense suit une facture : son montant et son état changent avec elle.",
    generic: "La dépense n'a pas pu être enregistrée. Réessayez.",
  },
  add: "Ajouter une dépense",
  // The quick entry of the phone's header (BUD 4).
  quickAdd: "Dépense",
  quickAddLabel: "Ajouter une dépense",
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
    labelMissing:
      "Dites ce qu'est la dépense, par exemple « Repas après la session ».",
    spentOn: "Date",
    // A quick spend (BUD 4): what it goes to.
    target: "Pour",
    targetPlaceholder: "Choisir un projet ou un artiste",
    targetSearch: "Rechercher un projet ou un artiste",
    targetNone: "Aucun projet ni artiste ne correspond.",
    // For the Finance, who also has cost centers and « Hors budget » (UX test of 15/11/2026).
    finance: {
      targetPlaceholder: "Projet, artiste, centre de coût ou hors budget",
      targetSearch: "Rechercher un projet, un artiste, un centre de coût…",
      targetNone:
        "Rien ne correspond. Une dépense de structure (loyer, abonnement) va dans « Hors budget ».",
    },
    targetMissing: "Choisissez à quoi va la dépense.",
    // Its kind as a badge after the name (Sacha 11/11/2026), « récent » beside.
    targetKinds: {
      project: "Projet",
      artist: "Artiste",
      cost_center: "Centre de coût",
      off_budget: "Hors budget",
    },
    targetRecent: "récent",
    quickTitle: "Nouvelle dépense",
    offBudget: "Hors budget",
    // Its line in « Pour », beside its « Hors budget » badge: found by
    // « loyer », « structure », « aucun ».
    offBudgetOption: "Loyer, abonnement, frais de structure (aucun projet)",
    subpost: "Sous-poste",
    offBudgetHint:
      "Sur aucune enveloppe : la Vue d'ensemble de Finance la signale.",
    quickDescription:
      "Le ticket en photo si vous l'avez, le montant, ce que c'est et pour qui : déjà payée par défaut.",
    noTargets:
      "Vous ne menez aucun projet et ne lisez pas le budget des artistes : aucune dépense à saisir ici.",
    spentOnMissing: "Indiquez le jour de la dépense.",
    missingCount: (n: number) =>
      n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
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
    attachment: "Justificatif (photo du ticket, facture)",
    attachmentHint:
      "Rangé dans les Fichiers du projet, catégorie Autres : jamais déposé deux fois.",
    // An artist's spend: the receipt is kept with the artist, read by the
    // budget's readers only.
    attachmentHintArtist:
      "Gardé avec l'artiste, lu seulement par ceux qui lisent son budget.",
    attachmentKept: (name: string) => `Justificatif : ${name}`,
    attachmentOf: (label: string) => `Justificatif de la dépense « ${label} »`,
    attachmentFailed:
      "Le justificatif n'a pas pu être déposé. Réessayez, ou enregistrez la dépense sans lui.",
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
  // A rebillable spend's expected income (Finance, lot 3).
  rebilling: {
    label: (spend: string) => `Refacturation · ${spend}`,
  },
  // What the Finance needs of a spend (lot 3 of the Finance, 13/11/2026).
  spendDetails: {
    title: "Facturation",
    ttc: (amount: string) => `Soit ${amount} TTC`,
    dueOn: "Échéance",
    supplier: "Fournisseur",
    validator: "Valideur",
    none: "Aucun",
    search: "Rechercher",
    noMatch: "Aucun résultat",
    rebillable: "Refacturable",
    rebillableHint:
      "Refacturée à un client ou un partenaire : une recette attendue est prévue pour elle.",
  },
} as const;
