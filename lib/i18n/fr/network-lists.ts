/** Réseau › Mes listes: lists of contacts (Ibé, 18/11/2026). */
export const networkLists = {
  title: "Mes listes",
  open: "Mes listes",
  back: "Mes listes",
  backToNetwork: "Réseau",
  views: {
    label: "Filtrer les listes",
    all: "Toutes",
    mine: "Pour moi",
    shared: "Partagées",
  },
  columns: {
    name: "Liste",
    people: "Personnes",
    replied: "Ont répondu",
    state: "État",
    owner: "Par",
  },
  you: "Vous",
  peopleCount: (n: number) => (n === 1 ? "1 personne" : `${n} personnes`),
  repliedCount: (replied: number, total: number) => `${replied} sur ${total}`,
  // Three names under a list's name, the others counted.
  names: (names: string[], more: number) =>
    more > 0 ? `${names.join(", ")} et ${more} autres` : names.join(", "),
  // A list's state, beside its name.
  states: {
    private: "Pour moi",
    toValidate: "À valider",
    validated: "Validée",
  },
  // Each person's reply: Ibé's hourglass and green tick.
  replies: {
    waiting: "Pas encore répondu",
    replied: "A répondu",
  },
  replyToggle: (name: string, next: string) => `${name} : marquer « ${next} »`,
  replyDone: {
    waiting: "Marqué « Pas encore répondu »",
    replied: "Marqué « A répondu »",
  },
  empty: {
    all: {
      title: "Aucune liste",
      body: "Dans le Réseau, cochez des personnes puis « Ajouter à une liste ».",
    },
    mine: {
      title: "Aucune liste pour vous seul",
      body: "Une liste que vous ne partagez pas reste ici.",
    },
    shared: {
      title: "Aucune liste partagée",
      body: "Une liste partagée avec l'équipe se retrouve ici.",
    },
    people: {
      title: "Personne dans cette liste",
      body: "Ajoutez des personnes du Réseau.",
      readOnly: "Les personnes ajoutées s'afficheront ici.",
    },
  },
  search: {
    label: "Rechercher dans la liste",
    placeholder: "Nom, métier…",
    noResult: (query: string) => `Personne ne correspond à « ${query} ».`,
  },
  people: {
    name: "Personne",
    contact: "Contact",
    reply: "Réponse",
    menu: (name: string) => `Actions pour ${name}`,
    remove: "Retirer de la liste",
    removed: "Retiré de la liste",
  },
  new: {
    button: "Nouvelle liste",
    title: "Nouvelle liste",
    description: "Ajoutez-y ensuite des personnes du Réseau.",
    name: "Nom de la liste",
    namePlaceholder: "Médias pour Jay, campagne d'influence…",
    nameRequired: "Donnez un nom à la liste.",
    share: "Partager avec l'équipe",
    shareHint: "Sinon, elle reste visible par vous seul.",
    submit: "Créer la liste",
    done: "Liste créée",
  },
  addTo: {
    button: "Ajouter à une liste",
    title: (n: number) =>
      n === 1
        ? "Ajouter 1 personne à une liste"
        : `Ajouter ${n} personnes à une liste`,
    description: "Une liste existante ou une nouvelle.",
    list: "Liste",
    placeholder: "Choisir une liste",
    newList: "Nouvelle liste",
    listRequired: "Choisissez une liste.",
    submit: "Ajouter",
    done: (n: number, list: string) =>
      n === 0
        ? `Déjà tous dans « ${list} »`
        : n === 1
          ? `1 personne ajoutée à « ${list} »`
          : `${n} personnes ajoutées à « ${list} »`,
  },
  addPeople: {
    button: "Ajouter des personnes",
    title: "Ajouter des personnes",
    description: "Chaque personne choisie est ajoutée tout de suite.",
    label: "Rechercher dans le Réseau",
    placeholder: "Nom, métier…",
    noResult: (query: string) =>
      `Personne ne s'appelle « ${query} » dans le Réseau.`,
    allIn: "Tout le Réseau est déjà dans la liste.",
    create: "Créer un contact",
    createNamed: (query: string) => `Créer « ${query} » dans le Réseau`,
    added: (name: string) => `${name} ajouté à la liste`,
    close: "Terminé",
  },
  validate: {
    button: "Valider la liste",
    done: "Liste validée",
    undo: "Retirer la validation",
    undone: "Validation retirée",
  },
  share: {
    on: "Partager avec l'équipe",
    onDone: "Liste partagée avec l'équipe",
    off: "Garder pour moi",
    offDone: "Liste gardée pour vous",
  },
  rename: {
    action: "Renommer",
    title: "Renommer la liste",
    description: "Le nouveau nom s'affiche pour tous ceux qui la voient.",
    submit: "Renommer",
    done: "Liste renommée",
  },
  remove: {
    action: "Supprimer la liste",
    title: (name: string) => `Supprimer « ${name} » ?`,
    body: "La liste disparaît. Ses personnes restent dans le Réseau.",
    confirm: "Supprimer",
    pending: "Suppression…",
    cancel: "Annuler",
    done: "Liste supprimée",
  },
  listMenu: "Actions de la liste",
  createProject: "Créer un projet",
  project: {
    title: "Nouveau projet",
    subtitle: (list: string) => `Depuis la liste « ${list} »`,
    // People of the list who are not artists of the Catalogue: a project
    // takes artists of the Catalogue only.
    notInCatalog: (names: string[]) =>
      names.length === 1
        ? `${names[0]} n'est pas au Catalogue : non repris dans le projet.`
        : `${names.join(", ")} ne sont pas au Catalogue : non repris dans le projet.`,
  },
  loadError: "Les listes n'ont pas pu être chargées. Rechargez la page.",
  errors: {
    failed: "La liste n'a pas pu être enregistrée. Réessayez.",
    notFound: "Cette liste n'existe plus ou ne vous est pas visible.",
    nameRequired: "Donnez un nom à la liste.",
    nameTooLong: "Le nom tient en 120 caractères.",
    contactNotFound: "Une des personnes n'est plus dans le Réseau.",
    notInList: "Cette personne n'est plus dans la liste.",
    notShared: "Seule une liste partagée avec l'équipe se valide.",
    forbidden: "Vous ne pouvez pas modifier cette liste.",
  },
};
