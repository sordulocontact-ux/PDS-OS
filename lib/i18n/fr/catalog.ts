/** Catalog: artists, titles ("masters" in the code) and their pickers (docs/PARCOURS-01). */
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
      "Changer la relation garde la même fiche : titres, projets, contacts, fichiers et historique.",
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
      masters: "Titres",
      notes: "Notes",
    },
    emptyTitle: "Aucun artiste pour l'instant",
    emptyBody: "Ajoutez un artiste pour pouvoir lui créditer des titres.",
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
    newMaster: "Nouveau titre",
    notes: "Notes",
    noNotes: "Aucune note.",
    masters: "Titres crédités",
    noMasters: "Aucun titre ne crédite cet artiste pour l'instant.",
    openDeezer: "Voir sur Deezer",
  },

  // Artist page frame and overview.
  artistPage: {
    tabsLabel: "Sections de l'artiste",
    tabs: {
      overview: "Vue d'ensemble",
      masters: "Titres",
      projects: "Projets",
      files: "Fichiers",
      activity: "Activité",
      discography: "Discographie",
    },
    noProjects:
      "Aucun projet visible pour cet artiste : ses titres ne sont rattachés à aucun projet que vous pouvez voir.",
    loadError: "La liste n'a pas pu être chargée. Rechargez la page.",
    kind: "Artiste",
    edit: "Modifier",
    identity: "Identité",
    stageName: "Nom d'artiste",
    relation: "Relation avec PDS",
    legalName: "Nom civil",
    country: "Pays d'origine",
    summary: "En bref",
    mastersCount: "Titres",
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
      isPrimary: "Contact principal",
      // The person, picked in the Réseau (UX test of 09/10/2026).
      person: "Personne",
      fromNetwork: "Repris de sa fiche Réseau, modifiable.",
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
    description: "Il pourra être crédité sur un ou plusieurs titres.",
    name: "Nom",
    nameHint: "Nom de scène tel qu'il apparaît sur les plateformes.",
    notes: "Notes",
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
    // Picture and main contact, on the same screen (UX test of 09/10/2026:
    // « Photo et contact absents de la création d'artiste (3 écrans) »).
    picture: {
      title: "Photo",
      fromDeezer: "La photo de Deezer, remplaçable depuis sa fiche.",
      add: "Ajouter une photo",
      replace: "Remplacer",
      remove: "Retirer",
      hint: "JPG, PNG ou WebP, 5 Mo au plus.",
      uploading: "Création et envoi de la photo…",
      failed:
        "L'artiste est créé, mais la photo n'a pas pu être envoyée. Ne recréez pas l'artiste : ajoutez-la depuis sa fiche.",
      openArtist: "Continuer",
    },
    contact: {
      title: "Contact principal",
      hint: "La personne à joindre pour cet artiste, choisie dans le Réseau.",
      role: "Rôle",
      failed:
        "L'artiste est créé, mais son contact n'a pas pu être enregistré. Ajoutez-le depuis sa fiche.",
    },
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

  // Audio state and variant of a title: two separate facts.
  audioStates: {
    demo: "Maquette",
    rough_mix: "Mise à plat",
    mix: "Mix",
    master: "Master",
    final_master: "Master final",
  },
  variants: {
    original: "Original",
    radio_edit: "Radio Edit",
    instrumental: "Instrumental",
    acapella: "Acapella",
    remix: "Remix",
    other: "Autre",
  },

  masters: {
    title: "Catalogue",
    subtitle:
      "Les morceaux de PDS, de la maquette au master final, avec leurs identifiants et leurs sorties.",
    newMaster: "Nouveau titre",
    columns: {
      title: "Titre",
      artists: "Artiste",
      audioState: "État audio",
      isrc: "ISRC",
      release: "Sortie liée",
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
    // Views of the list by audio state. The default one leaves the demos
    // out: they stay titles, one tab away.
    views: {
      label: "État audio",
      withoutDemos: "Hors maquettes",
      demo: "Maquettes",
      rough_mix: "Mises à plat",
      mix: "Mix",
      master: "Masters",
      final_master: "Masters finaux",
      all: "Tous",
    },
    filteredEmpty: {
      withoutDemos: "Aucun titre au-delà de la maquette",
      demo: "Aucune maquette",
      rough_mix: "Aucune mise à plat",
      mix: "Aucun mix",
      master: "Aucun master",
      final_master: "Aucun master final",
    },
    filteredEmptyBody:
      "L'état audio se choisit à la création, se modifie dans « Modifier » et avance tout seul quand on ajoute un fichier audio plus avancé.",
    search: {
      label: "Rechercher un titre",
      placeholder: "Rechercher par titre, artiste ou ISRC",
      noResult: (query: string) => `Aucun titre ne correspond à « ${query} ».`,
    },
    emptyTitle: "Aucun titre pour l'instant",
    emptyBody:
      "Créez un titre dès qu'un morceau existe, même à l'état de maquette.",
    emptyBodyReadOnly: "Les titres apparaîtront ici dès qu'ils seront créés.",
    loadError: "Impossible de charger les titres. Rechargez la page.",
  },

  master: {
    back: "Tout le catalogue",
    backTo: (title: string) => `Retour à « ${title} »`,
    facts: "Informations",
    credits: "Crédits",
    audioState: "État audio",
    variant: "Variante",
    isrc: "ISRC",
    duration: "Durée",
    linkedProjects: "Projets liés",
    noLinkedProjects: "Aucun projet ne rattache ce titre pour l'instant.",
    createProject: "Créer un projet",
  },

  masterForm: {
    title: "Nouveau titre",
    subtitle:
      "Un titre et son artiste principal suffisent : le reste se complète quand vous le connaissez.",
    // The optional fields, grouped under the two required ones.
    optionalLegend: "Si vous les connaissez déjà",
    fields: {
      title: "Titre",
      artists: "Artistes",
      audioState: "État audio",
      audioStateHint: "Il avance tout seul avec les fichiers audio.",
      audioStateUnknown: "Non renseigné",
      variant: "Variante",
      variantLabel: "Précisez la variante",
      variantLabelHint: "« Version live », « Slowed »…",
      isrc: "ISRC",
      isrcHint: "Les tirets et les espaces sont acceptés.",
      duration: "Durée",
      durationHint: "Minutes et secondes, par exemple 3:07 pour 3 min 7 s.",
      durationPlaceholder: "m:ss",
      audioFile: "Fichier audio",
      audioFileHint:
        "Rattaché au titre à l'état audio choisi ; sa durée est lue quand c'est possible.",
    },
    // The title's credits, entered with it (UX test of 09/10/2026).
    credits: {
      legend: "Crédits",
      hint: "Qui a écrit, composé, produit ou mixé ce titre : une ligne par personne, avec tous ses rôles.",
      add: "Ajouter une personne",
      remove: (name: string) =>
        name ? `Retirer ${name} des crédits` : "Retirer cette ligne",
      personRequired: "Choisissez la personne de ce crédit.",
      rolesRequired: "Choisissez au moins un rôle.",
      invalid: "Un crédit est incomplet : chaque personne a au moins un rôle.",
      missing: (count: number) =>
        count === 1
          ? "Un crédit est incomplet : complétez-le ou retirez la ligne."
          : `${count} crédits sont incomplets : complétez-les ou retirez les lignes.`,
    },
    submit: "Créer le titre",
    submitting: "Création…",
    uploading: "Envoi du fichier…",
    cancel: "Annuler",
    // The title exists, its file did not follow: said on the title's page.
    fileFailed:
      "Le titre est créé, mais le fichier audio n'a pas pu être envoyé. Ne recréez pas le titre : ajoutez le fichier depuis son onglet Audio.",
    createdSending: (title: string) =>
      `« ${title} » est créé. Envoi du fichier audio…`,
    createdOpening: (title: string) => `« ${title} » est créé. Ouverture…`,
    openTitle: "Ouvrir le titre",
    addFileAgain: "Ajouter le fichier",
    errors: {
      artistsRequired: "Ajoutez au moins un artiste.",
      isrcInvalid:
        "ISRC invalide : 12 caractères, par exemple FR-Z03-26-00001.",
      isrcTaken: "Un titre porte déjà cet ISRC.",
      durationInvalid:
        "Durée invalide : utilisez le format m:ss, par exemple 3:07.",
      audioStateInvalid: "Choisissez un état audio de la liste.",
      variantInvalid: "Choisissez une variante de la liste.",
      fileNeedsAudioState:
        "Choisissez l'état audio du fichier : maquette, mise à plat, master ou master final.",
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
    searchLabel: "Rattacher un titre",
    placeholder: "Rechercher par titre ou artiste…",
    noResult: (query: string) => `Aucun titre ne correspond à « ${query} ».`,
    allSelected: "Tous les titres sont déjà rattachés.",
    create: "Créer un titre",
    createNamed: (title: string) => `Créer le titre « ${title} »`,
    empty: "Aucun titre rattaché.",
    linked: "Titres rattachés",
    remove: (title: string) => `Retirer ${title}`,
    createDialogDescription:
      "Il sera rattaché au projet dès sa création. Votre saisie est conservée.",
  },
} as const;
