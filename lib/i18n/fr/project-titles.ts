// The titles of a collective project (docs/pds-mic-plan.md, lot 2): the
// view « Titres et artistes » (lot 6), its gestures, their history.
// « de » elides before a vowel: « Ouvrir le deal d'Iris Moon ».
const de = (name: string) =>
  /^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`;

export const projectTitles = {
  title: "Titres et artistes",
  empty: "Aucun titre pour l'instant.",
  // A title without a working title nor a master (Ibé 18/11 : « pourquoi il
  // y a titre sans nom ? ») is called by its guests: « Titre de Jay (à
  // nommer) », « Titre d'Iris Moon & Jay (à nommer) » ; with no guest left,
  // by its number: « Titre 3 (à nommer) ».
  unnamed: (position: number) => `Titre ${position} (à nommer)`,
  unnamedOf: (artists: string) => `Titre ${de(artists)} (à nommer)`,
  // The number, kept as a secondary mark next to a label (« n° 2 »).
  number: (position: number) => `n° ${position}`,
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
      "Le nom peut attendre : le titre s'affiche « à nommer » jusque-là.",
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
    placeholder: "Choisir un titre",
    submit: "Rattacher le titre",
    done: "Titre du Catalogue rattaché.",
  },
  rename: {
    action: "Renommer",
    title: "Renommer le titre",
    // Lot 7: its title in the Catalogue is provisional and takes the name.
    descriptionProvisional:
      "Son titre au Catalogue porte encore un nom provisoire : il prendra ce nom, et ne sera plus provisoire.",
    submit: "Renommer",
    done: "Titre renommé.",
  },
  abandon: {
    action: "Abandonner",
    title: (label: string) => `Abandonner « ${label} »`,
    // Only when its master is a maquette: said in the modal, the one
    // consequence outside the project.
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

  // « Titres et artistes » (lot 6): each title's cell, beside it one row
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
    // The other columns: recap.columns (lot L2b).
    columns: {
      title: "Titre",
      actions: "Actions",
    },
    // The abandoned titles, after the others.
    abandonedGroup: "Abandonnés",
    // A title without any artist yet.
    noArtist: "Aucun artiste invité",
    negotiation: {
      // As the Deals page says it.
      unassigned: "À affecter",
      // The link to the deal, for a screen reader: the artist and the step.
      link: (artist: string, stage: string) =>
        `Ouvrir le deal ${de(artist)}, étape ${stage}`,
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
    // Each title's release deposit (lot 15): its own, else the
    // compilation's it goes out with.
    distribution: {
      withCompilation: (state: string) => `Avec la compilation · ${state}`,
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
      current ? `Aujourd'hui : ${current}.` : "",
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
    // A participation's status in the team's words (retours d'Ibé du
    // 18/11/2026: the Excel's orange, then green), said of the artist.
    statuses: {
      proposed: "À contacter",
      invited: "Contacté",
      confirmed: "D'accord",
      declined: "A refusé",
      withdrawn: "Retiré",
    },
    menu: (artist: string, label: string) =>
      `Actions pour ${artist} sur « ${label} »`,
    add: {
      action: "Ajouter un artiste",
      title: (label: string) => `Ajouter un artiste à « ${label} »`,
      // Only the title a simple project shares says something (`shared`:
      // the credits are to check by hand, décision 10); the rule of the
      // credits is not written on the screen.
      description: (mode: "now" | "later" | "manual", shared: string) =>
        mode === "manual" ? `${shared}.` : undefined,
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
      // Décision 4.1: the same artist on two titles is allowed, confirmed
      // first (« Jay est déjà invité sur Titre de Jay (à nommer). »).
      alreadyInvited: (artist: string, labels: string[]) => {
        const list =
          labels.length === 1
            ? labels[0]
            : `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}`;
        return `${artist} est déjà invité sur ${list}. L'inviter aussi sur ce titre ?`;
      },
      alreadyInvitedSubmit: "L'inviter aussi",
    },
    status: {
      action: "Changer le statut",
      title: (artist: string, label: string) =>
        `Participation ${de(artist)} à « ${label} »`,
      // Only the title a simple project shares says something (`shared`:
      // the credits are to check by hand, décision 10).
      description: (mode: "now" | "later" | "manual", shared: string) =>
        mode === "manual" ? `${shared}.` : undefined,
      label: "Statut",
      submit: "Changer le statut",
      done: "Statut changé.",
      // The toast says where the artist now stands (« Statut changé :
      // D'accord »), the period added by the toast.
      changed: (status: string) => `Statut changé : ${status}`,
    },
    // Détacher (lot 6): the participation is withdrawn, never deleted.
    withdraw: {
      action: "Retirer du titre",
      title: (artist: string, label: string) =>
        `Retirer ${artist} de « ${label} »`,
      // A confirmation needs its sentence: what stays, and the way back.
      description:
        "Les crédits déjà inscrits au Catalogue restent. Vous pourrez le rattacher ensuite.",
      submit: "Retirer du titre",
      pending: "Retrait…",
      done: "Participation retirée",
    },
    // Rattacher (lot 6): a declined or withdrawn participation comes back,
    // proposed.
    reattach: {
      action: "Rattacher au titre",
      done: "Artiste rattaché, à nouveau « À contacter »",
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
    confirmedLead: "Statut changé : D'accord",
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

  // The recap of a collective (retours d'Ibé du 18/11/2026, lot 2): « Titres
  // et artistes » read as the team's Excel (lib/projects/recap-rules.ts),
  // its gestures (contact, number, note, release) and their history.
  recap: {
    // A participation's status in the Excel's words (orange, then green).
    contactStates: {
      to_contact: "À contacter",
      contacted: "Contacté",
      agreed: "D'accord",
    },
    // A guest's contract waits for their accord (§ 3.5).
    waitingAgreement: "En attente de l'accord",
    // The number changed here is the Réseau's.
    phoneChanged: "Numéro changé dans le Réseau",
    // The screen of the recap (lot L2b): its columns, the counters that
    // filter its artists, the title's facts in its cell, and what is edited
    // in place (contact, release, note).
    columns: {
      status: "Statut",
      accord: "Accord",
      legal: "Juridique",
      artist: "Artiste",
      // The overview's compact recap.
      mix: "Mix",
    },
    filters: "Filtrer les artistes par statut",
    // No artist in the states chosen.
    filteredEmpty: "Aucun artiste dans ce statut.",
    facts: {
      mix: "Mix",
      beatmaker: "Beatmaker",
      release: "Sortie",
      distribution: "Distribution",
    },
    release: {
      label: (title: string) => `Sortie de « ${title} »`,
      yes: "Oui",
      no: "Non",
      undecided: "Pas décidé",
    },
    // « Nommer » on a title without a name (Ibé 18/11, 37:03).
    name: {
      action: "Nommer",
      title: (label: string) => `Nommer « ${label} »`,
      submit: "Nommer le titre",
      done: "Titre nommé.",
    },
    note: {
      add: "Ajouter une note",
      edit: (artist: string) => `Modifier la note sur ${artist}`,
      title: (artist: string) => `Note sur ${artist}`,
      label: "Note",
      submit: "Enregistrer la note",
      done: "Note enregistrée.",
    },
    accord: {
      // « Call le Sam. 05/12/2026 » (formatDay).
      callOn: (day: string) => `Call le ${day}`,
      // The overview's recap (read only) says it, the board has the button.
      callToPlan: "Call à caler",
    },
    contact: {
      // Under the artist's name, before the contact's name.
      label: "Contact",
      title: "Contact du manager",
      add: "Ajouter le contact",
      edit: (artist: string) => `Modifier le contact ${de(artist)}`,
      call: (name: string) => `Appeler ${name}`,
      whatsapp: (name: string) => `Écrire à ${name} sur WhatsApp`,
      hidden: "Coordonnées privées",
      modes: {
        phone: "Numéro",
        pick: "Autre contact",
        create: "Nouveau contact",
      },
      modesLabel: "Que faire",
      phone: (name: string) => `Numéro de ${name}`,
      phoneSubmit: "Enregistrer le numéro",
      pick: "Contact du Réseau",
      pickRequired: "Choisissez un contact du Réseau.",
      pickSubmit: "Choisir ce contact",
      picked: "Contact du manager changé.",
      name: "Nom",
      newPhone: "Numéro",
      createSubmit: "Ajouter au Réseau",
      created: "Contact ajouté au Réseau.",
    },
    legal: {
      fiche: (state: string) => `Fiche · ${state}`,
      // The fiche in the Excel's three words (RecapFicheState); the
      // Juridique keeps its finer ones.
      ficheStates: {
        toSend: "À envoyer",
        waiting: "En attente",
        filled: "Remplie",
      },
      // The nuance of a fiche received and not yet validated, read on hover.
      ficheToValidate: "Remplie, à valider",
      contract: (state: string) => `Contrat · ${state}`,
      // The contract's state after « Contrat · », without repeating the
      // word (the Juridique's own words stay its own: « Contrat
      // nécessaire »), by AgreementState.
      contractStates: {
        unmapped: "À rédiger",
        not_needed: "Non requis",
        needs_info: "À rédiger",
        ready_to_generate: "À rédiger",
        draft: "Brouillon",
        review_required: "À valider",
        ready_for_signature: "À envoyer",
        // The Excel's « Contrat envoyé ? » then « Contrat signé ».
        signature_pending: "Envoyé · en attente de retour",
        signed: "Signé",
        ended: "Terminé",
      },
      // Sent, and the signed copy is back (the person signs first, then
      // PDS): ContractBack.
      contractBack: {
        countersign: "Retour reçu · à contresigner",
        check: "Retour reçu · à vérifier",
      },
      // A contract the reader may not read.
      hidden: "Lié",
    },
    overview: {
      seeAll: "Tout voir",
      empty: "Aucun artiste invité pour l'instant.",
    },
    errors: {
      failed: "La modification n'a pas pu être enregistrée. Réessayez.",
      networkForbidden:
        "Vous ne pouvez pas modifier le Réseau : un membre qui le gère peut ajouter ce contact.",
      nameRequired: "Donnez le nom du contact.",
      nameTooLong: "Le nom fait 200 caractères au plus.",
      phoneTooLong: "Le numéro fait 40 caractères au plus.",
      contactNotFound: "Ce contact n'existe plus dans le Réseau.",
      // A private contact (BIZ 8): its owner and the direction only.
      phonePrivate:
        "Coordonnées privées : seuls la personne qui suit ce contact et la direction peuvent changer son numéro.",
      releaseUnchanged: "La sortie de ce titre est déjà enregistrée ainsi.",
    },
    // The project's Activité (lib/overview/activity.ts).
    events: {
      // « Sortie · Titre de Jay (à nommer) : oui », « … : oui → non ».
      releaseDecided: (label: string, from: string | null, to: string) =>
        `Sortie · ${label} : ${from ? `${from} → ${to}` : to}`,
      release: { yes: "oui", no: "non", undecided: "pas décidé" },
      // « Contrats du titre confirmés · Néons · Production, Édition ».
      contractNeedsConfirmed: (label: string, kinds: string[]) =>
        `Contrats du titre confirmés · ${label} · ${kinds.length ? kinds.join(", ") : "aucun"}`,
      contractKinds: {
        production: "Production",
        image_rights: "Droit à l'image",
        publishing: "Édition",
        beatmaker: "Beatmaker",
      } as Record<string, string>,
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
