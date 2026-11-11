// Selections of artists in the Catalogue, before a project (lot 4 of
// docs/pds-mic-plan.md): the list, a selection's page, its gestures.
export const artistSelections = {
  title: "Sélections d'artistes",
  subtitle: "Les artistes envisagés pour un projet, avant de le créer.",
  // On the artists' page: the way to the selections.
  open: "Sélections",
  back: "Toutes les sélections",
  backToArtists: "Tous les artistes",
  views: { label: "Sélections", mine: "Mes sélections", all: "Toutes" },
  columns: {
    name: "Sélection",
    artists: "Artistes",
    // Who works on it (« Mes sélections »), the word of the projects list.
    holder: "Responsable",
    updated: "Mise à jour",
  },
  artistCount: (count: number) =>
    count === 0
      ? "Aucun artiste"
      : count === 1
        ? "1 artiste"
        : `${count} artistes`,
  // « Nadia Sel, Sami Kader et 3 autres »
  artistNames: (names: string[], more: number) =>
    more > 0 ? `${names.join(", ")} et ${more} autres` : names.join(", "),
  you: "Vous",
  // In a sentence: « Responsable : vous ».
  youInline: "vous",
  empty: {
    mine: {
      title: "Aucune sélection à vous",
      body: "Créez une sélection, ou retrouvez ici celles qu'on vous transmet.",
    },
    all: {
      title: "Aucune sélection",
      body: "Une sélection réunit les artistes envisagés pour un projet, avant de le créer.",
    },
    readOnly: "La direction et les chefs de projet créent les sélections.",
    seeAll: "Voir toutes les sélections",
  },
  new: {
    button: "Nouvelle sélection",
    title: "Nouvelle sélection",
    description:
      "Donnez-lui un nom et choisissez ses premiers artistes : vous pourrez en ajouter ensuite.",
    name: "Nom",
    namePlaceholder: "PDS MIC #7",
    nameRequired: "Donnez un nom à la sélection.",
    submit: "Créer la sélection",
    done: "Sélection créée.",
  },
  // A selection's page, under its name.
  holder: (holder: string) => `Responsable : ${holder}`,
  transmitted: (by: string, day: string) => `transmise par ${by} le ${day}`,
  created: (by: string, day: string) => `créée par ${by} le ${day}`,
  someone: "un membre",
  // The artists chosen in a form (Nouvelle sélection, Ajouter des artistes).
  picker: {
    legend: "Artistes",
    label: "Chercher un artiste",
    placeholder: "Nom de l'artiste",
    chosen: "Artistes choisis",
    remove: (name: string) => `Retirer ${name}`,
    create: "Créer un artiste",
    createNamed: (query: string) => `Créer l'artiste « ${query} »`,
    noResult: (query: string) => `Aucun artiste ne correspond à « ${query} ».`,
    allSelected: "Tous les artistes du Catalogue sont déjà choisis.",
  },
  add: {
    button: "Ajouter des artistes",
    title: "Ajouter des artistes",
    description: "Ils s'ajoutent à la fin de la sélection.",
    required: "Choisissez au moins un artiste à ajouter.",
    submit: "Ajouter",
    // The toast (`done`, the period added by the toast).
    done: (count: number) =>
      count === 1 ? "1 artiste ajouté" : `${count} artistes ajoutés`,
    none: "Ces artistes étaient déjà dans la sélection",
  },
  remove: {
    action: "Retirer de la sélection",
    done: "Artiste retiré de la sélection.",
  },
  rename: {
    action: "Renommer",
    title: "Renommer la sélection",
    description: "Le nouveau nom s'affiche pour toute l'équipe.",
    submit: "Renommer",
    done: "Sélection renommée.",
  },
  transmit: {
    button: "Transmettre",
    title: "Transmettre la sélection",
    description:
      "La personne choisie la retrouve dans ses sélections et en est prévenue. La sélection reste visible par toute l'équipe.",
    recipient: "Transmettre à",
    placeholder: "Choisir un membre",
    required: "Choisissez à qui transmettre la sélection.",
    submit: "Transmettre",
    // The toast (`done`, the period added by the toast).
    done: (name: string) => `Sélection transmise à ${name}`,
    noRecipient:
      "Personne d'autre ne gère le Catalogue : la sélection ne peut être transmise à personne pour l'instant.",
  },
  artists: {
    name: "Artiste",
    relation: "Relation",
    titles: "Titres",
  },
  menu: (name: string) => `Actions pour ${name}`,
  selectionMenu: "Actions sur la sélection",
  emptyArtists: {
    title: "Aucun artiste dans cette sélection",
    body: "Ajoutez les artistes envisagés pour le projet.",
    readOnly: "Aucun artiste pour l'instant.",
  },
  loadError: "Les sélections n'ont pas pu être chargées. Réessayez.",
  errors: {
    failed: "La sélection n'a pas pu être enregistrée. Réessayez.",
    notFound: "Cette sélection n'existe plus.",
    nameRequired: "Donnez un nom à la sélection.",
    nameTooLong: "Le nom fait 120 caractères au plus.",
    artistNotFound: "Un des artistes n'existe plus ou a été archivé.",
    notInSelection: "Cet artiste n'est déjà plus dans la sélection.",
    recipientNotAllowed:
      "Cette personne ne gère pas le Catalogue : elle ne pourrait pas travailler la sélection.",
    alreadyHolder: "Cette personne est déjà responsable de la sélection.",
  },
} as const;
