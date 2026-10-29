/** Files page of the main navigation: every file the viewer may read. */
export const library = {
  title: "Fichiers",
  description:
    "Tous les fichiers que vous pouvez ouvrir, dans leur dernière version : artistes, titres, projets et contrats.",
  viewsLabel: "Filtrer par rattachement",
  views: {
    all: "Tous",
    artist: "Artistes",
    master: "Titres",
    project: "Projets",
    contract: "Contrats",
  },
  // What a file belongs to, before its name.
  sources: {
    artist: "Artiste",
    master: "Titre",
    project: "Projet",
    contract: "Contrat",
  },
  columns: {
    name: "Nom",
    owner: "Rattaché à",
    category: "Catégorie",
    addedAt: "Ajouté",
    actions: "Actions",
  },
  search: {
    label: "Rechercher un fichier",
    placeholder: "Nom, précision, artiste, titre, projet…",
    noResult: (query: string) => `Aucun fichier ne correspond à « ${query} ».`,
  },
  filters: {
    categoryLabel: "Catégorie",
    categoryAll: "Toutes les catégories",
    kindLabel: "Type de fichier",
    kindAll: "Tous les types",
    kinds: { audio: "Audio", image: "Image", document: "Document" },
    authorLabel: "Ajouté par",
    authorAll: "Tout le monde",
  },
  filtersEmpty: "Aucun fichier ne correspond à ces filtres.",
  filtersEmptyBody: "Retirez un filtre pour élargir la liste.",
  versions: (count: number) => `${count} versions`,
  openOwner: (source: string, label: string) =>
    `Ouvrir les fichiers de ${source.toLowerCase()} « ${label} »`,
  emptyTitle: "Aucun fichier pour l'instant",
  emptyBody:
    "Un fichier s'ajoute dans la bibliothèque d'un artiste, d'un titre, d'un projet ou d'un contrat : il apparaît aussi ici.",
  emptyViewTitle: (view: string) => `Aucun fichier dans « ${view} »`,
  emptyViewBody: "Les autres fichiers restent dans l'onglet « Tous ».",
  truncated: (limit: number) =>
    `Les ${limit} fichiers les plus récents sont affichés. Les autres restent dans la bibliothèque de leur artiste, titre, projet ou contrat.`,
  loadError: "Les fichiers n'ont pas pu être chargés. Rechargez la page.",
} as const;
