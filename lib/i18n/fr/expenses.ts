/** The Dépenses page (BUD 3): every spend the reader may see. */
export const expenses = {
  title: "Dépenses",
  description:
    "Les dépenses des projets et des artistes que vous pouvez lire, la plus récente d'abord.",
  loadError: "Impossible de charger les dépenses. Rechargez la page.",
  emptyTitle: "Aucune dépense pour l'instant",
  emptyBody:
    "Les dépenses saisies dans le Budget d'un projet ou d'un artiste apparaissent ici.",
  filtersEmpty: "Aucune dépense avec ces filtres",
  filtersEmptyBody: "Retirez un filtre pour revoir les dépenses.",
  truncated: (limit: number) =>
    `Seules les ${limit} dépenses les plus récentes sont listées.`,
  views: {
    label: "Vues des dépenses",
    all: "Toutes",
    noProof: "Sans justificatif",
  },
  search: {
    label: "Rechercher une dépense",
    placeholder: "Rechercher une dépense, un projet, un artiste",
    noResult: (query: string) => `Aucune dépense ne correspond à « ${query} ».`,
  },
  filters: {
    artist: "Artiste",
    artistAll: "Tous les artistes",
    project: "Projet",
    projectAll: "Tous les projets",
    family: "Poste",
    familyAll: "Tous les postes",
    person: "Saisie par",
    personAll: "Tout le monde",
    month: "Mois",
    monthAll: "Tous les mois",
  },
} as const;
