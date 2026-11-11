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

  // The artists of each title (lot 3): their participations.
  participations: {
    // « Artistes du projet : PDS, Nadia, Sami » (computed, projectArtists).
    ofProject: (names: string) => `Artistes du projet : ${names}`,
    roles: { featuring: "Featuring", main: "Principal" },
    // A participation's status, said of the participation (« Confirmée »).
    statuses: {
      proposed: "Proposée",
      invited: "Invitée",
      confirmed: "Confirmée",
      declined: "Refusée",
      withdrawn: "Retirée",
    },
    menu: (artist: string, label: string) =>
      `Actions pour ${artist} sur « ${label} »`,
    add: {
      action: "Ajouter un artiste",
      title: (label: string) => `Ajouter un artiste à « ${label} »`,
      // Names the project's main artist (not in the list: credited on every
      // title), so that the role « Principal » reads as this title's credit;
      // says when the credit comes, or that none comes on a title a simple
      // project shares (`shared`: the warning, décision 10).
      description: (
        main: string | null,
        mode: "now" | "later" | "manual",
        shared: string,
      ) =>
        mode === "manual"
          ? `${shared}. Une participation confirmée n'y écrit aucun crédit automatiquement.`
          : `${main ? `${main}, artiste principal du projet, est crédité sur chaque titre. ` : ""}${
              mode === "now"
                ? "Une participation confirmée crédite aussi l'artiste sur le titre au Catalogue."
                : "Une participation confirmée créditera aussi l'artiste quand le titre sera au Catalogue."
            }`,
      artist: "Artiste",
      artistPlaceholder: "Choisir un artiste",
      artistSearch: "Chercher un artiste",
      artistEmpty: "Aucun artiste trouvé.",
      // Every artist of the Catalogue is on the title already.
      noArtist:
        "Tous les artistes du Catalogue sont déjà sur ce titre ou en sont l'artiste principal.",
      artistRequired: "Choisissez l'artiste qui participe au titre.",
      role: "Rôle",
      status: "Statut",
      submit: "Ajouter l'artiste",
      done: "Artiste ajouté.",
    },
    status: {
      action: "Changer le statut",
      title: (artist: string, label: string) =>
        `Participation de ${artist} à « ${label} »`,
      // A credit is never removed by a participation (décision 10): said
      // before confirming, since withdrawing later keeps it; none is
      // written on a title a simple project shares.
      description: (mode: "now" | "later" | "manual", shared: string) =>
        `${
          mode === "now"
            ? "Confirmée, elle crédite l'artiste sur le titre au Catalogue, et ce crédit reste ensuite."
            : mode === "later"
              ? "Confirmée, elle créditera l'artiste quand le titre sera au Catalogue."
              : `${shared}. Confirmée, elle n'écrit aucun crédit automatiquement.`
        } Refusée ou retirée, elle reste listée et dans l'historique.`,
      label: "Statut",
      submit: "Changer le statut",
      done: "Statut changé.",
      // The toast says where the participation now stands (« Participation
      // refusée »), the period added by the toast.
      changed: (status: string) => `Participation ${status.toLowerCase()}`,
    },
    // The toast of a gesture that credited the title (its `done`, the
    // period added by the toast): « Participation confirmée · 2 crédits
    // ajoutés au titre du Catalogue ».
    credited: (lead: string, count: number) =>
      count === 1
        ? `${lead} · 1 crédit ajouté au titre du Catalogue`
        : `${lead} · ${count} crédits ajoutés au titre du Catalogue`,
    // A title whose master is also in a project that is not collective: no
    // automatic credit (décision 10, client 11/11/2026). « Crédits à
    // vérifier au Catalogue : ce titre est aussi dans le projet Néons »; the
    // name of a project the viewer does not see is never given.
    shared: (names: string[], hidden: number) => {
      const others =
        hidden === 0
          ? []
          : [hidden === 1 ? "un autre projet" : "d'autres projets"];
      const all = [...names, ...others];
      const list =
        all.length === 1
          ? all[0]
          : `${all.slice(0, -1).join(", ")} et ${all.at(-1)}`;
      const where =
        names.length === 0
          ? list
          : names.length === 1
            ? `le projet ${list}`
            : `les projets ${list}`;
      return `Crédits à vérifier au Catalogue : ce titre est aussi dans ${where}`;
    },
    // On a confirmed participation of such a title.
    sharedShort: "Crédits à vérifier au Catalogue",
    addedLead: "Artiste ajouté",
    confirmedLead: "Participation confirmée",
    errors: {
      failed: "La participation n'a pas pu être enregistrée. Réessayez.",
      notFound:
        "Cette participation n'existe plus ou ne vous est plus visible.",
      exists: "Cet artiste participe déjà à ce titre.",
      mainArtist:
        "C'est l'artiste principal du projet : il est crédité sur chaque titre sans participation.",
      artistNotFound: "Cet artiste n'existe plus ou a été archivé.",
      contactNotFound: "Cet interlocuteur n'est pas un contact du Réseau.",
      unchanged: "La participation a déjà ce statut : choisissez-en un autre.",
      noteTooLong: "La note fait 2 000 caractères au plus.",
    },
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
    // « Artiste ajouté · Nadia (featuring, proposée) · Néons »
    participationAdded: (
      artist: string,
      role: string,
      status: string,
      label: string,
    ) => `Artiste ajouté · ${artist} (${role}, ${status}) · ${label}`,
    // « Participation · Nadia · Néons · Proposée → Confirmée »
    participationStatus: (
      artist: string,
      label: string,
      from: string,
      to: string,
    ) => `Participation · ${artist} · ${label} · ${from} → ${to}`,
  },
} as const;
