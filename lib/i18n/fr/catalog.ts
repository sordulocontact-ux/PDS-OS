/** Catalog: artists, masters and their pickers (docs/PARCOURS-01). */
export const catalog = {
  notProvided: "non renseigné",

  artists: {
    title: "Artistes",
    subtitle:
      "Les artistes du label, tels qu'ils apparaissent sur les plateformes.",
    newArtist: "Nouvel artiste",
    columns: { name: "Nom", masters: "Masters", notes: "Notes" },
    emptyTitle: "Aucun artiste pour l'instant",
    emptyBody: "Ajoutez un artiste pour pouvoir lui créditer des masters.",
    emptyBodyReadOnly: "Les artistes apparaîtront ici dès qu'ils seront créés.",
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
      placeholder: "Nom de l'artiste",
      hint: "Photo, nom et lien Deezer seront repris automatiquement.",
      searching: "Recherche sur Deezer…",
      unavailable:
        "Deezer ne répond pas. Réessayez dans un instant, ou créez l'artiste sans Deezer.",
      noResult: (query: string) =>
        `Aucun artiste Deezer pour « ${query} ». Vérifiez l'orthographe, ou créez-le sans Deezer.`,
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
