// The titles of a collective project (docs/pds-mic-plan.md, lot 2): the
// view « Titres et artistes » (lot 6), its gestures, their history.
export const projectTitles = {
  title: "Titres et artistes",
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
  // Lot 7: its title in the Catalogue under a provisional name.
  catalogProvisional: (name: string) =>
    `Au Catalogue sous un nom provisoire : ${name}`,
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
  // Lot 10: the titles a marketing action targets (deliverable_titles).
  scope: {
    label: "Titres visés",
    kinds: {
      project: "Tout le projet",
      all_titles: "Tous les titres",
      titles: "Certains titres",
      none: "Aucun titre",
    },
    abandoned: (label: string) => `${label} (abandonné)`,
    edit: "Modifier",
    editLabel: (action: string) =>
      `Modifier les titres visés par « ${action} »`,
    button: "Titres",
    title: (action: string) => `Titres visés par « ${action} »`,
    description:
      "Une action peut valoir pour tout le projet, pour tous ses titres, pour certains, ou pour aucun : elle n'est jamais copiée par titre.",
    choice: "Périmètre",
    pick: "Titres",
    // What the chips chose, in words (a chip alone does not say it).
    picked: (labels: string[]) =>
      labels.length === 0
        ? "Aucun titre choisi."
        : `${labels.length} titre${labels.length > 1 ? "s" : ""} : ${labels.join(", ")}.`,
    noTitle:
      "Le projet n'a pas encore de titre : « Tous les titres » vaudra pour ceux qui viendront.",
    submit: "Enregistrer",
    done: "Titres visés enregistrés.",
    // The filter of a list by title.
    filter: "Titre",
    // Not « Tous les titres », which is a scope.
    filterAll: "Tous titres confondus",
    errors: {
      failed: "Les titres visés n'ont pas pu être enregistrés. Réessayez.",
      titlesRequired: "Choisissez au moins un titre.",
      abandoned: "Ce titre est abandonné : il n'est plus proposé.",
      titleNotFound: "Ce titre n'existe plus dans le projet.",
    },
  },
  // Lot 7 (voie A): a title not in the Catalogue yet.
  catalogStart: {
    action: "Déposer un audio",
    done: "Titre créé au Catalogue sous un nom provisoire : déposez l'audio.",
  },
  catalogAttach: {
    action: "Rattacher un titre du Catalogue",
    title: (label: string) => `Rattacher un titre du Catalogue à « ${label} »`,
    description:
      "Le titre du projet prend ce titre du Catalogue, ses fichiers et ses crédits ; son titre de travail reste le sien.",
    placeholder: "Choisir un titre",
    submit: "Rattacher le titre",
    done: "Titre du Catalogue rattaché.",
  },
  rename: {
    action: "Renommer",
    title: "Renommer le titre",
    description:
      "Le titre de travail sert dans le projet. Laissé vide, le titre redevient « sans nom » ou reprend son nom au Catalogue.",
    // Lot 7: its title in the Catalogue is provisional and takes the name.
    descriptionProvisional:
      "Son titre au Catalogue porte encore un nom provisoire : il prendra ce nom, et ne sera plus provisoire.",
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
  // The title's page in the Catalogue, from its « ⋯ ».
  openCatalog: "Voir au Catalogue",

  // « Titres et artistes » (lot 6): one row per title, under it one row
  // per participation; where each stands, computed (lib/projects/
  // title-board-rules.ts).
  board: {
    facts: {
      mainArtist: "Artiste principal",
      titles: "Titres",
      // « 3 en cours, 1 prévu »; nothing yet: « aucun ».
      titleCounts: (active: number, planned: number, abandoned: number) =>
        [
          active > 0 ? `${active} en cours` : null,
          planned > 0 ? `${planned} prévu${planned > 1 ? "s" : ""}` : null,
          abandoned > 0
            ? `${abandoned} abandonné${abandoned > 1 ? "s" : ""}`
            : null,
        ]
          .filter(Boolean)
          .join(", ") || "aucun",
      // « Artistes du projet » (projectArtists), the main one included.
      artists: "Artistes",
    },
    label: "Titres et artistes du projet",
    columns: {
      title: "Titre ou artiste",
      status: "Statut",
      contract: "Contrat",
      negotiation: "Négociation",
      // Who the deal is given to, in the Business module's words (« le
      // responsable » is the project's owner everywhere else).
      owner: "Négocié par",
      master: "Master",
      distribution: "Distribution",
      actions: "Actions",
    },
    // The abandoned titles, after the others.
    abandonedGroup: "Abandonnés",
    // A title without any artist yet.
    noArtist: "Aucun artiste invité",
    contract: {
      // Confirmed without a contract (décision 6): missing, never red (the
      // same word as the Juridique's « Participations et contrats », lot 11).
      missing: "Manquant",
      // Linked, the viewer may not read it.
      hidden: "Lié",
    },
    negotiation: {
      // The viewer reads every deal of the project: none for this one.
      none: "Pas de dossier",
      // As the Deals page says it.
      unassigned: "À affecter",
      // The link to the deal, for a screen reader: the artist and the step.
      link: (artist: string, stage: string) =>
        `Ouvrir le deal de ${artist}, étape ${stage}`,
    },
    master: {
      todo: "À mixer",
      mixed: "Mix validé",
      final: "Master final",
      // « Mix V2 à valider », « Master V3 attendu » (after changes asked on
      // the V2).
      pending: (round: "mix" | "mastering", number: number) =>
        `${round === "mix" ? "Mix" : "Master"} V${number} à valider`,
      retake: (round: "mix" | "mastering", number: number) =>
        `${round === "mix" ? "Mix" : "Master"} V${number + 1} attendu`,
    },
    // Not followed per title yet (lot 15): the title goes out with the
    // project's release.
    distribution: {
      withProject: "Avec le projet",
    },
    // Under the name on a small screen, the columns it hides.
    caption: {
      contract: "Contrat",
      negotiation: "Négociation",
      master: "Master",
    },
    empty: {
      title: "Aucun titre pour l'instant",
      body: "Ajoutez le premier titre : son nom peut attendre.",
      readOnly: "Le responsable du projet ajoute les titres ici.",
    },
  },

  // « Changer l'artiste principal » (lot 6), through set_project_main_artist.
  mainArtist: {
    action: "Changer l'artiste principal",
    title: "Changer l'artiste principal",
    description: (current: string | null) =>
      `${current ? `Aujourd'hui : ${current}. ` : ""}Il est crédité en tête sur chaque titre ; les crédits déjà inscrits au Catalogue et l'identité choisie en Conception restent tels quels.`,
    label: "Artiste principal",
    placeholder: "Choisir un artiste",
    search: "Chercher un artiste",
    empty: "Aucun artiste trouvé.",
    submit: "Changer l'artiste principal",
    done: "Artiste principal changé.",
    same: "C'est déjà l'artiste principal : choisissez-en un autre.",
    artistRequired: "Choisissez le nouvel artiste principal.",
    failed: "L'artiste principal n'a pas pu être changé. Réessayez.",
    notFound: "Ce projet n'existe plus ou ne vous est plus visible.",
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
    // Détacher (lot 6): the participation is withdrawn, never deleted.
    withdraw: {
      action: "Retirer du titre",
      title: (artist: string, label: string) =>
        `Retirer ${artist} de « ${label} »`,
      description:
        "Sa participation passe en « Retirée » : elle reste listée et dans l'historique, et les crédits déjà inscrits au Catalogue restent. Vous pourrez la rattacher ensuite.",
      submit: "Retirer du titre",
      pending: "Retrait…",
      done: "Participation retirée",
    },
    // Rattacher (lot 6): a declined or withdrawn participation comes back,
    // proposed.
    reattach: {
      action: "Rattacher au titre",
      done: "Participation rattachée, à nouveau proposée",
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
        "C'est l'artiste principal du projet : il est crédité sur chaque titre sans participation. Pour qu'il participe à un titre, changez d'abord l'artiste principal.",
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
    // Lot 7: a title of the Catalogue for a title of the project.
    hasMaster: "Ce titre est déjà au Catalogue.",
    masterRequired: "Choisissez un titre du Catalogue.",
    mainArtistRequired:
      "Le projet n'a pas d'artiste principal : choisissez-en un avant de créer le titre au Catalogue.",
    // update_project on a collective (the project's edit form).
    keptInProject:
      "Un titre du projet collectif n'est pas retiré : abandonnez-le depuis « Titres et artistes ».",
  },
  // The project's Activité (lib/overview/activity.ts).
  events: {
    added: (label: string) => `Titre ajouté · ${label}`,
    renamed: (from: string, to: string) => `Titre renommé · ${from} → ${to}`,
    // The provisional title of the Catalogue named by the same gesture.
    renamedInCatalog: (from: string, to: string) =>
      `Titre nommé · ${from} → ${to}, au Catalogue aussi`,
    // Lot 7: its title created in the Catalogue (provisional), or attached.
    cataloged: (label: string) =>
      `Titre créé au Catalogue sous un nom provisoire · ${label}`,
    masterAttached: (label: string, master: string) =>
      `Titre du Catalogue rattaché · ${label} → ${master}`,
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
    // « Artiste principal · PDS → Nadia Sel » (lot 6).
    mainArtistChanged: (from: string | null, to: string) =>
      from
        ? `Artiste principal · ${from} → ${to}`
        : `Artiste principal · ${to}`,
    // « Dérogation de tournage accordée · Nadia Benali · Titre 2 · jusqu'au
    // 30 nov. 2026 · le contrat part lundi » (lot 12).
    waiverGranted: (
      scope: string,
      artist: string,
      label: string,
      due: string,
      reason: string,
    ) =>
      `Dérogation ${scope} accordée · ${artist} · ${label} · jusqu'au ${due}${reason ? ` · ${reason}` : ""}`,
    waiverRevoked: (
      scope: string,
      artist: string,
      label: string,
      reason: string | null,
    ) =>
      `Dérogation ${scope} révoquée · ${artist} · ${label}${reason ? ` · ${reason}` : ""}`,
  },
} as const;
