/** Catalog: artists, masters and their pickers (docs/PARCOURS-01). */
export const catalog = {
  notProvided: "non renseigné",

  // Relation of an artist with PDS, apart from archiving (Actif / Archivé).
  relation: {
    legend: "Relation avec PDS",
    labels: { signed: "Signé", collaboration: "Collaboration" },
    hints: {
      signed: "Intégré au roster de PDS, accompagné dans la durée.",
      collaboration:
        "Présent pour un ou plusieurs projets ponctuels (un PDS Mic…), sans faire partie du roster.",
    },
    editHint:
      "Changer la relation garde la même fiche : masters, projets, contacts, fichiers et historique.",
    required: "Choisissez la relation avec PDS.",
    filter: {
      label: "Relation avec PDS",
      all: "Tous",
      signed: "Signés",
      collaboration: "Collaborations",
    },
  },

  artists: {
    title: "Artistes",
    subtitle:
      "Les artistes du label, tels qu'ils apparaissent sur les plateformes.",
    newArtist: "Nouvel artiste",
    columns: {
      name: "Nom",
      relation: "Relation",
      masters: "Masters",
      notes: "Notes",
    },
    emptyTitle: "Aucun artiste pour l'instant",
    emptyBody: "Ajoutez un artiste pour pouvoir lui créditer des masters.",
    emptyBodyReadOnly: "Les artistes apparaîtront ici dès qu'ils seront créés.",
    // A relation filter with no match, while the catalog holds artists.
    filteredEmpty: {
      signed: "Aucun artiste signé",
      collaboration: "Aucune collaboration",
    },
    filteredEmptyBody:
      "La relation avec PDS se choisit à la création et se modifie depuis la fiche de l'artiste.",
    loadError: "Impossible de charger les artistes. Rechargez la page.",
  },

  artist: {
    back: "Tous les artistes",
    backTo: (name: string) => `Retour à ${name}`,
    newMaster: "Nouveau master",
    notes: "Notes",
    noNotes: "Aucune note.",
    masters: "Masters crédités",
    noMasters: "Aucun master ne crédite cet artiste pour l'instant.",
    openDeezer: "Voir sur Deezer",
  },

  // Artist page frame and overview.
  artistPage: {
    tabsLabel: "Sections de l'artiste",
    tabs: {
      overview: "Vue d'ensemble",
      masters: "Masters",
      projects: "Projets",
      files: "Fichiers",
      activity: "Activité",
      discography: "Discographie",
    },
    noProjects:
      "Aucun projet visible pour cet artiste : ses masters ne sont rattachés à aucun projet que vous pouvez voir.",
    loadError: "La liste n'a pas pu être chargée. Rechargez la page.",
    kind: "Artiste",
    edit: "Modifier",
    identity: "Identité",
    stageName: "Nom d'artiste",
    relation: "Relation avec PDS",
    legalName: "Nom civil",
    country: "Pays d'origine",
    summary: "En bref",
    mastersCount: "Masters",
    projectsCount: "Projets",
    fansCount: "Fans sur Deezer",
    noDeezer: "Pas de profil Deezer : discographie et chiffres indisponibles.",
    bioManual: "Rédigée par l'équipe",
  },

  profileForm: {
    title: "Modifier l'artiste",
    description:
      "Identité, relation avec PDS, photo et biographie de la fiche.",
    identity: "Identité",
    name: "Nom d'artiste",
    legalName: "Nom civil",
    legalNameHint: "Facultatif.",
    country: "Pays d'origine",
    countryPlaceholder: "Choisir un pays",
    noCountry: "Non renseigné",
    bio: "Biographie",
    bioHint:
      "Laissez vide pour afficher la biographie Deezer ou Wikipédia. Une biographie écrite ici la remplace.",
    notes: "Notes internes",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    saved: "Fiche enregistrée.",
    errors: {
      country: "Pays inconnu.",
      phone: "Numéro invalide : chiffres, espaces, +, points et tirets.",
    },
    picture: {
      title: "Photo",
      fromDeezer: "Photo Deezer",
      uploaded: "Photo ajoutée par l'équipe",
      none: "Aucune photo",
      upload: "Choisir une photo",
      replace: "Remplacer",
      uploading: "Envoi…",
      remove: "Retirer la photo",
      backToDeezer: "Revenir à la photo Deezer",
      hint: "JPG, PNG ou WebP, 5 Mo au plus.",
      tooLarge: "Photo trop lourde : 5 Mo au plus.",
      badType: "Format non pris en charge : JPG, PNG ou WebP.",
      failed: "La photo n'a pas pu être envoyée. Réessayez.",
    },
  },

  contacts: {
    title: "Contacts",
    add: "Ajouter un contact",
    empty: "Aucun contact pour l'instant.",
    primary: "Principal",
    roles: {
      manager: "Manager",
      booker: "Booker",
      press: "Attaché·e de presse",
      legal: "Juriste",
      other: "Autre",
    },
    form: {
      addTitle: "Nouveau contact",
      editTitle: "Modifier le contact",
      description: "Visible seulement par la direction et les chefs de projet.",
      role: "Rôle",
      name: "Nom",
      email: "Email",
      phone: "Téléphone",
      optional: "Facultatif.",
      isPrimary: "Contact principal",
      submit: "Enregistrer",
      submitting: "Enregistrement…",
      cancel: "Annuler",
      close: "Fermer",
    },
    edit: (name: string) => `Modifier ${name}`,
    remove: (name: string) => `Supprimer ${name}`,
    confirmTitle: "Supprimer ce contact ?",
    confirmBody: (name: string) =>
      `${name} sera retiré de la fiche. Cette action est définitive.`,
    confirm: "Supprimer",
    deleting: "Suppression…",
    deleteFailed: "Le contact n'a pas pu être supprimé. Réessayez.",
  },

  // Artist page, what Deezer (and Wikipedia) knows about the artist.
  deezerProfile: {
    unavailable:
      "Deezer ne répond pas pour l'instant. Ses informations reviendront au prochain chargement.",
    loading: "Chargement des informations Deezer…",
    stats: {
      fans: "Fans sur Deezer",
      releases: "Sorties",
      albums: "Albums",
    },
    latestRelease: "Dernière sortie",
    latestAlbum: "Dernier album",
    noRelease: "Aucune sortie sur Deezer pour l'instant.",
    bio: {
      title: "Biographie",
      none: "Aucune biographie pour l'instant.",
      more: "Lire la suite",
      less: "Réduire",
      fromDeezer: (author: string | null) =>
        author ? `Source : ${author}, via Deezer` : "Source : Deezer",
      fromWikipedia: (lang: "fr" | "en") =>
        lang === "fr"
          ? "Source : Wikipédia"
          : "Source : Wikipédia (en anglais)",
    },
    discography: {
      title: "Discographie",
      filtersLabel: "Filtrer par type de sortie",
      all: "Tout",
      showAll: (count: number) => `Tout afficher (${count})`,
      showLess: "Afficher moins",
      noDate: "Date inconnue",
      upcoming: "À paraître",
    },
    kinds: {
      album: "Album",
      ep: "EP",
      single: "Single",
      compile: "Compilation",
    },
    kindsPlural: {
      album: "Albums",
      ep: "EP",
      single: "Singles",
      compile: "Compilations",
    },
    topTracks: "Titres les plus écoutés",
    related: "Artistes similaires",
    inCatalog: "Au catalogue",
    fans: (fans: string) => `${fans} fans`,
    newTab: "(nouvel onglet)",
  },

  artistForm: {
    title: "Nouvel artiste",
    description: "Il pourra être crédité sur un ou plusieurs masters.",
    name: "Nom",
    nameHint: "Nom de scène tel qu'il apparaît sur les plateformes.",
    notes: "Notes",
    notesHint: "Facultatif.",
    submit: "Créer l'artiste",
    submitting: "Création…",
    cancel: "Annuler",
    close: "Fermer",
    duplicate: "Cet artiste existe déjà.",
    openExisting: "Voir sa fiche",
    selectExisting: "Le sélectionner",
    deezerDuplicate: "Ce profil Deezer est déjà au catalogue.",
    deezerInvalid: "Profil Deezer invalide. Relancez la recherche.",
    deezerUnavailable:
      "Deezer ne répond pas. Réessayez, ou créez l'artiste sans Deezer.",
    deezer: {
      label: "Rechercher sur Deezer",
      placeholder: "Nom de l'artiste ou lien Deezer",
      hint: "Photo, nom et lien Deezer seront repris automatiquement. Artiste introuvable par son nom ? Collez le lien de sa page Deezer.",
      searching: "Recherche sur Deezer…",
      unavailable:
        "Deezer ne répond pas. Réessayez dans un instant, ou créez l'artiste sans Deezer.",
      noResult: (query: string) =>
        `Aucun artiste Deezer pour « ${query} ». Vérifiez l'orthographe, collez le lien de sa page Deezer, ou créez-le sans Deezer.`,
      noLinkResult:
        "Ce lien ne mène à aucun artiste. Copiez le lien de la page de l'artiste sur Deezer (deezer.com/artist/…), ou créez-le sans Deezer.",
      resultsLabel: "Artistes trouvés sur Deezer",
      resultCount: (count: number) =>
        count > 1 ? `${count} artistes trouvés` : "1 artiste trouvé",
      fans: (count: string) => `${count} fans sur Deezer`,
      inCatalog: "Déjà au catalogue",
      manual: "Créer sans Deezer",
      change: "Changer",
      backToSearch: "Rechercher sur Deezer",
      source: "Profil Deezer",
    },
  },

  masters: {
    title: "Masters",
    subtitle:
      "Les enregistrements audio de PDS, leurs identifiants et leurs sorties liées.",
    newMaster: "Nouveau master",
    columns: {
      title: "Nom",
      artists: "Artiste",
      isrc: "ISRC",
      release: "Release liée",
      releaseDate: "Sortie officielle",
      status: "Statut",
    },
    otherReleases: {
      short: (count: number) => `+${count}`,
      full: (count: number) =>
        count > 1 ? `et ${count} autres sorties` : "et 1 autre sortie",
    },
    releaseStatus: {
      online: "En ligne",
      planned: "Prévue",
      undated: "Sans date",
    },
    search: {
      label: "Rechercher un master",
      placeholder: "Rechercher par titre, artiste ou ISRC",
      noResult: (query: string) => `Aucun master ne correspond à « ${query} ».`,
    },
    emptyTitle: "Aucun master pour l'instant",
    emptyBody: "Créez un master pour pouvoir le rattacher à un projet.",
    emptyBodyReadOnly: "Les masters apparaîtront ici dès qu'ils seront créés.",
    loadError: "Impossible de charger les masters. Rechargez la page.",
  },

  master: {
    back: "Tous les masters",
    backTo: (title: string) => `Retour à « ${title} »`,
    facts: "Informations",
    credits: "Crédits",
    version: "Version",
    mainVersion: "Version principale",
    isrc: "ISRC",
    duration: "Durée",
    linkedProjects: "Projets liés",
    noLinkedProjects: "Aucun projet ne rattache ce master pour l'instant.",
    createProject: "Créer un projet",
  },

  masterForm: {
    title: "Nouveau master",
    subtitle: "Un enregistrement, crédité à un ou plusieurs artistes.",
    fields: {
      title: "Titre",
      artists: "Artistes",
      version: "Version",
      versionHint:
        "« radio edit », « instrumental »… Laissez vide pour la version principale.",
      isrc: "ISRC",
      isrcHint: "Facultatif. Les tirets et les espaces sont acceptés.",
      duration: "Durée",
      durationHint: "Facultatif, au format m:ss, par exemple 3:07.",
    },
    submit: "Créer le master",
    submitting: "Création…",
    cancel: "Annuler",
    errors: {
      artistsRequired: "Ajoutez au moins un artiste.",
      isrcInvalid:
        "ISRC invalide : 12 caractères, par exemple FR-Z03-26-00001.",
      isrcTaken: "Un master porte déjà cet ISRC.",
      durationInvalid:
        "Durée invalide : utilisez le format m:ss, par exemple 3:07.",
    },
  },

  artistPicker: {
    searchLabel: "Ajouter un artiste",
    placeholder: "Rechercher par nom…",
    noResult: (query: string) => `Aucun artiste ne correspond à « ${query} ».`,
    allSelected: "Tous les artistes sont déjà crédités.",
    create: "Créer un artiste",
    createNamed: (name: string) => `Créer l'artiste « ${name} »`,
    empty: "Aucun artiste crédité.",
    credits: "Artistes crédités, dans l'ordre d'affichage",
    role: (name: string) => `Crédit de ${name}`,
    roles: { main: "Principal", featuring: "Featuring" },
    moveUp: (name: string) => `Monter ${name}`,
    moveDown: (name: string) => `Descendre ${name}`,
    remove: (name: string) => `Retirer ${name}`,
  },

  masterPicker: {
    searchLabel: "Rattacher un master",
    placeholder: "Rechercher par titre ou artiste…",
    noResult: (query: string) => `Aucun master ne correspond à « ${query} ».`,
    allSelected: "Tous les masters sont déjà rattachés.",
    create: "Créer un master",
    empty: "Aucun master rattaché.",
    linked: "Masters rattachés",
    remove: (title: string) => `Retirer ${title}`,
    createDialogDescription:
      "Il sera rattaché au projet dès sa création. Votre saisie est conservée.",
  },
} as const;
