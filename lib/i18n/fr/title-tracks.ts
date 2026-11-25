// A collective's titles as the way in (Maël 25/11/2026): the list of its
// titles, each with its journeys, and one title's page (its « Maintenant »,
// its « Progression », its artists).
export const titleTracks = {
  title: "Titres",
  list: {
    columns: {
      title: "Titre",
      master: "Master",
      legal: "Juridique",
      distribution: "Distribution",
    },
    groups: { abandoned: "Abandonnés" },
    // Under a workflow's step when its next action is the viewer's.
    mine: "À vous",
    empty: {
      title: "Aucun titre pour l'instant",
      body: "Les titres s'ajoutent dans « Titres et artistes ».",
      action: "Ouvrir « Titres et artistes »",
    },
  },
  page: {
    artists: "Artistes",
    abandoned: "Ce titre est abandonné.",
    seeAll: "Tout voir",
  },
} as const;
