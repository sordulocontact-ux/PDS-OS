// The titles of a collective project (docs/pds-mic-plan.md, lot 2): the
// minimal list on its overview, its four gestures, their history.
export const projectTitles = {
  title: "Titres",
  empty: "Aucun titre pour l'instant.",
  // « Titre 3 · sans nom »: a title without a working title nor a master.
  unnamed: (position: number) => `Titre ${position} · sans nom`,
  statuses: {
    planned: "Prévu",
    active: "En cours",
    abandoned: "Abandonné",
  },
  // Under the label: where the title stands in the Catalogue.
  catalog: (title: string) => `Catalogue : ${title}`,
  // « Catalogue : Néons · Maquette · En développement » (demos.badge).
  catalogDemo: (title: string, demoBadge: string) =>
    `Catalogue : ${title} · ${demoBadge}`,
  inCatalog: "Au Catalogue",
  notInCatalog: "Pas encore au Catalogue",
  // « Le 11/11 · « Pas retenu » »: the date first, a long reason is cut
  // after two lines; the status already says « Abandonné ».
  abandonedOn: (day: string, reason: string) => `Le ${day} · « ${reason} »`,
  menu: (label: string) => `Actions pour « ${label} »`,
  add: {
    button: "Ajouter un titre",
    title: "Ajouter un titre",
    description:
      "Le nom peut attendre : le titre s'affichera « sans nom » jusqu'à ce que vous le renommiez.",
    name: "Titre de travail",
    master: "Titre du Catalogue",
    noMaster: "Pas encore au Catalogue",
    masterSearch: "Chercher un titre",
    masterEmpty: "Aucun titre trouvé.",
    masterHint:
      "Choisissez-le seulement s'il existe déjà au Catalogue : il sera rattaché au projet.",
    submit: "Ajouter le titre",
    done: "Titre ajouté.",
  },
  rename: {
    action: "Renommer",
    title: "Renommer le titre",
    description:
      "Le titre de travail sert dans le projet. Laissé vide, le titre redevient « sans nom » ou reprend son nom au Catalogue.",
    submit: "Renommer",
    done: "Titre renommé.",
  },
  abandon: {
    action: "Abandonner",
    title: (label: string) => `Abandonner « ${label} »`,
    description:
      "Rien n'est supprimé : fichiers, versions, négociations et validations restent, et le titre peut être réactivé.",
    // Only when its master is a maquette.
    demoNote: "Sa maquette passe en « abandonnée » au Catalogue.",
    reason: "Motif de l'abandon",
    submit: "Abandonner le titre",
    done: "Titre abandonné.",
  },
  // Done at once from the « ⋯ » (nothing to ask): no dialog.
  reactivate: {
    action: "Réactiver",
    done: "Titre réactivé.",
  },

  errors: {
    failed: "Le titre n'a pas pu être enregistré. Réessayez.",
    notCollective: "Seul un projet collectif a des titres.",
    notFound: "Ce titre n'existe plus ou ne vous est plus visible.",
    tooLong: "Le titre de travail fait 200 caractères au plus.",
    reasonRequired: "Dites pourquoi le titre est abandonné.",
    reasonTooLong: "Le motif fait 2 000 caractères au plus.",
    alreadyInProject: "Ce titre du Catalogue est déjà un titre du projet.",
    masterNotFound: "Ce titre du Catalogue n'existe plus.",
    singleOneMaster:
      "Un single n'a qu'un titre du Catalogue : changez le format du projet pour en ajouter un autre.",
    abandoned: "Ce titre est abandonné : réactivez-le avant de le modifier.",
    notAbandoned: "Ce titre n'est pas abandonné.",
    // update_project on a collective (the project's edit form).
    keptInProject:
      "Un titre du projet collectif n'est pas retiré : abandonnez-le depuis la liste des titres de la Vue d'ensemble.",
  },
  // The project's Activité (lib/overview/activity.ts).
  events: {
    added: (label: string) => `Titre ajouté · ${label}`,
    renamed: (from: string, to: string) => `Titre renommé · ${from} → ${to}`,
    abandoned: (label: string, reason: string) =>
      `Titre abandonné · ${label} · « ${reason} »`,
    reactivated: (label: string) => `Titre réactivé · ${label}`,
  },
} as const;
