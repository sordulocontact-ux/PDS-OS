// A collective's titles as the way in (Maël 25/11/2026): « Titres », by
// title (each with its journeys) or by artist (projectTitles.board), and
// one title's page (its « Maintenant », its « Progression », its artists).
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
    // Under the Distribution's step of a title going out with the
    // compilation: its journey is the compilation's. After « À vous · ».
    withCompilation: "Avec la compilation",
    compilation: "compilation",
  },
  // The two views of « Titres », above the table.
  views: {
    label: "Vue",
    byTitle: "Par titre",
    byArtist: "Par artiste",
  },
  page: {
    artists: "Artistes",
    abandoned: "Ce titre est abandonné.",
    seeAll: "Tout voir",
    // After « Distribution » in its « Progression »: the compilation's.
    withCompilation: "avec la compilation",
  },
} as const;
