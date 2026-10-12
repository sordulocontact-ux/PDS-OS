/** Contracts: type, parties, owner, status, dates, files, validation, signature. */
export const contracts = {
  title: "Contrats",
  description:
    "Chaque contrat avec ses parties, son responsable et ses versions, de la rédaction à la signature.",
  new: "Nouveau contrat",
  viewsLabel: "Filtrer les contrats",
  views: {
    all: "Tous",
    preparing: "En préparation",
    review: "À valider",
    signature: "À signer",
    signed: "Signés",
    terminated: "Résiliés",
  },
  types: {
    artist: "Contrat d'artiste",
    license: "Licence",
    distribution: "Distribution",
    publishing: "Édition",
    coproduction: "Coproduction",
    image_rights: "Droit à l'image",
    service: "Prestation",
    partnership: "Partenariat",
    other: "Autre",
  },
  states: {
    draft: "En préparation",
    in_review: "À valider",
    approved: "Validé, à signer",
    sent: "Envoyé pour signature",
    signed: "Signé",
    expired: "Expiré",
    terminated: "Résilié",
  },
  columns: {
    title: "Contrat",
    parties: "Parties",
    state: "État",
    due: "Échéance",
    owner: "Responsable",
  },
  due: "Échéance passée",
  search: {
    label: "Rechercher un contrat",
    placeholder: "Titre, partie, projet, artiste…",
    noResult: (query: string) => `Aucun contrat ne correspond à « ${query} ».`,
  },
  emptyTitle: "Aucun contrat pour l'instant",
  emptyBody:
    "Créez un contrat, nommez ses parties depuis le Réseau et déposez ses versions : il sera validé par la direction puis signé.",
  emptyBodyReadOnly:
    "Les contrats que vous suivez, ou ceux de vos projets, apparaîtront ici.",
  emptyViewTitle: (view: string) => `Aucun contrat « ${view} »`,
  emptyViewBody: "Les autres contrats restent dans l'onglet « Tous ».",
  loadError: "Les contrats n'ont pas pu être chargés. Rechargez la page.",
  form: {
    createTitle: "Nouveau contrat",
    createDescription:
      "Il commence en préparation : vous ajouterez ensuite ses parties et ses fichiers.",
    editTitle: "Modifier le contrat",
    editDescription: "Modifiable tant qu'il n'est ni en relecture ni résilié.",
    title: "Titre",
    titlePlaceholder: "Ex. Licence de synchronisation — clip de Nova",
    type: "Type",
    owner: "Responsable",
    ownerHint: "La personne qui suit le contrat jusqu'à sa signature.",
    project: "Projet",
    projectNone: "Aucun",
    artist: "Artiste",
    artistNone: "Aucun",
    dueOn: "Échéance",
    dueOnHint: "La date clé : signature attendue, renouvellement, délai.",
    startsOn: "Début",
    endsOn: "Fin",
    notes: "Notes",
    notesPlaceholder: "Conditions clés, points à négocier…",
    submitCreate: "Créer le contrat",
    submitEdit: "Enregistrer",
    pending: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    saved: "Contrat enregistré.",
  },
  // « Nouveau contrat » asks what is being made first (JUR-18).
  creation: {
    legend: "Que voulez-vous faire ?",
    import: "Enregistrer un contrat qui existe déjà",
    importHint:
      "Un contrat signé ou en cours, rédigé hors de PDS OS : vous l'enregistrez, puis vous ajoutez ses parties et son fichier.",
    importSteps: [
      "Remplissez ce qui le décrit : titre, type, projet, dates.",
      "Sur sa page, ajoutez ses parties depuis le Réseau.",
      "Déposez son fichier, puis soumettez-le à la validation de la direction.",
    ],
    generate: "Le générer depuis un modèle",
    generateHint:
      "Un contrat rempli d'après un modèle validé : il se prépare dans le Juridique d'un projet, d'après les contrats nécessaires et les fiches de renseignements.",
    template: "Créer un modèle réutilisable",
    templateHint:
      "Un texte type, avec ses champs à remplir, que la direction valide avant qu'il serve à générer des contrats.",
    openProjectContracts: "Ouvrir les contrats du projet",
    chooseProject: "Choisir le projet",
    openTemplates: "Ouvrir les modèles de contrat",
  },
  page: {
    // The contract's origin in the Juridique (JUR-17).
    legalOrigin: {
      agreement: (project: string) =>
        `Contrat préparé dans le Juridique du projet « ${project} ».`,
      clearance: (element: string) =>
        `Contrat d'autorisation de l'emprunt « ${element} ».`,
      backToPlan: "Revenir au Plan d'action",
      backToClearance: "Revenir à l'emprunt",
    },
    back: "Tous les contrats",
    facts: "Informations",
    type: "Type",
    owner: "Responsable",
    project: "Projet",
    artist: "Artiste",
    dueOn: "Échéance",
    period: "Période",
    periodValue: (start: string | null, end: string | null) =>
      [start ? `du ${start}` : null, end ? `au ${end}` : null]
        .filter(Boolean)
        .join(" "),
    signedOn: "Signé le",
    notes: "Notes",
    none: "non renseigné",
    edit: "Modifier",
    filesTitle: "Fichiers",
    filesDescription:
      "Projets de contrat, exemplaire signé et sa preuve, annexes. Une nouvelle version garde les précédentes.",
    filesEmpty:
      "Glissez le projet de contrat ici, ou cliquez pour le choisir. Chaque nouvelle version gardera les précédentes.",
    filesEmptyReadOnly: "Les fichiers du contrat apparaîtront ici.",
  },
  parties: {
    title: "Parties",
    description:
      "Les personnes et structures du Réseau engagées par le contrat.",
    empty: "Aucune partie pour l'instant.",
    add: "Ajouter une partie",
    contact: "Contact du réseau",
    role: "Rôle dans le contrat",
    rolePlaceholder: "Ex. Producteur, Licencié, Prestataire",
    submit: "Ajouter",
    pending: "Ajout…",
    remove: (name: string) => `Retirer ${name} des parties`,
    // Who the picker offers first, under each name.
    groups: {
      artist: "Artiste du contrat",
      credit: "Crédité sur le projet",
    },
    // The role suggested for the contact of the contract's artist.
    artistRole: "Artiste",
    // A party is a contact of the Réseau: a name alone cannot be bound.
    contactRequired:
      "Une partie est un contact du Réseau : choisissez-la, ou ajoutez-la au Réseau.",
    failed: "La partie n'a pas pu être enregistrée. Réessayez.",
  },
  // The status card: where the contract stands and the next step.
  flow: {
    title: "Validation et signature",
    steps: {
      draft:
        "Le responsable prépare le contrat, puis le soumet à la direction.",
      in_review:
        "La direction relit le contrat : elle le valide ou demande des modifications.",
      approved:
        "Validé par la direction : envoyez-le pour signature, ou enregistrez directement la signature.",
      sent: "Envoyé pour signature : enregistrez la date dès qu'il est signé.",
      signed: "Signé. Il pourra être résilié s'il prend fin avant son terme.",
      expired: "Signé, et sa date de fin est passée.",
      terminated: "Résilié : le contrat est figé.",
    },
    submit: "Soumettre à la direction",
    approve: "Valider",
    requestChanges: "Demander des modifications",
    send: "Marquer comme envoyé",
    sign: "Enregistrer la signature",
    terminate: "Résilier",
    commentLabel: "Commentaire",
    commentHint: "Obligatoire pour demander des modifications.",
    signedOnLabel: "Date de signature",
    signedOnHint: "Aujourd'hui ou avant.",
    confirmTerminateTitle: "Résilier ce contrat ?",
    confirmTerminateBody:
      "Il restera consultable, mais ne pourra plus être modifié.",
    cancel: "Annuler",
    close: "Fermer",
    lastReview: (who: string, date: string) => `Relu par ${who} le ${date}`,
    changesRequested: "Modifications demandées",
    done: {
      submit: "Contrat soumis à la direction.",
      approve: "Contrat validé.",
      request_changes: "Modifications demandées au responsable.",
      send: "Contrat marqué comme envoyé.",
      sign: "Signature enregistrée.",
      terminate: "Contrat résilié.",
    },
  },
  errors: {
    invalid: "Vérifiez le titre, le type et les dates.",
    dates: "La fin ne peut pas précéder le début.",
    forbidden: "Vous ne pouvez pas modifier ce contrat.",
    owner: "Ce responsable ne peut pas suivre de contrat.",
    comment: "Expliquez les modifications attendues.",
    signedOn: "La date de signature doit être aujourd'hui ou avant.",
    status: "Le contrat a changé d'état entre-temps. Rechargez la page.",
    failed: "L'opération n'a pas abouti. Réessayez.",
  },
} as const;
