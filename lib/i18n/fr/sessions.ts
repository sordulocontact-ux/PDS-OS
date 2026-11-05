// Sessions studio (retours d'Ibé du 01 et du 05/11/2026): their list, their
// page, their form, their report, the maquettes and links they gather.

export const sessions = {
  title: "Sessions studio",
  subtitle:
    "Les séances de studio : planifiées, puis racontées, avec leurs maquettes et leurs rushs.",
  newSession: "Nouvelle session",
  loadError: "Les sessions n'ont pas pu être lues. Réessayez dans un instant.",
  views: {
    label: "Sessions",
    upcoming: "À venir",
    past: "Passées",
    all: "Toutes",
  },
  columns: {
    date: "Date",
    session: "Session",
    artists: "Artistes",
    projects: "Projets",
    report: "Compte rendu",
  },
  reportState: {
    todo: "À rédiger",
    done: "Rédigé",
    later: "Après la séance",
    cancelled: "Annulée",
  },
  noDate: "Date à fixer",
  search: {
    label: "Rechercher une session",
    placeholder: "Studio, artiste, projet…",
    noResult: (query: string) => `Aucune session ne correspond à « ${query} ».`,
  },
  empty: {
    title: "Aucune session studio",
    body: "Planifiez la prochaine séance : elle arrive dans l'agenda de l'équipe, puis attend son compte rendu.",
    bodyReadOnly:
      "Les séances planifiées par la direction et les chefs de projet apparaîtront ici.",
    upcoming: "Aucune session à venir",
    past: "Aucune session passée",
    viewBody: "Les autres sessions sont dans les autres onglets.",
    artist: "Aucune session pour cet artiste",
    project: "Aucune session pour ce projet",
    linkedBody:
      "Une session liée à l'artiste, au projet ou à l'un de ses titres apparaît ici.",
  },
  form: {
    createTitle: "Nouvelle session studio",
    editTitle: "Modifier la session",
    description:
      "Une session planifiée arrive dans le Calendrier ; l'équipe interne invitée la reçoit dans son agenda.",
    artists: "Artistes",
    artistsPlaceholder: "Choisir des artistes",
    projects: "Projets",
    projectsPlaceholder: "Choisir des projets",
    participantsHint:
      "L'équipe et les personnes du Réseau présentes. Seule l'équipe interne est invitée dans l'agenda.",
    anchorRequired: "Choisissez au moins un artiste ou un projet.",
    teamDetail: "Équipe PDS",
  },
  page: {
    back: "Toutes les sessions",
    infoTitle: "Informations",
    facts: {
      date: "Date",
      hours: "Horaires",
      studio: "Studio ou lieu",
      engineer: "Ingénieur du son",
      artists: "Artistes",
      projects: "Projets",
      participants: "Participants",
      notes: "Notes",
      responsible: "Compte rendu par",
    },
    hours: (start: string | null, end: string | null) =>
      start && end
        ? `${start} – ${end}`
        : start
          ? `À partir de ${start}`
          : `Jusqu'à ${end}`,
    none: "Non renseigné",
    edit: "Modifier",
    menu: "Actions de la session",
    close: "Fermer",
  },
  report: {
    title: "Compte rendu",
    description:
      "Qui était là, les maquettes réalisées et ce qu'il faut retenir.",
    write: "Rédiger le compte rendu",
    edit: "Modifier le compte rendu",
    lead: "À vous",
    why: "La séance a eu lieu : racontez-la pendant que tout est frais.",
    waitingFor: (name: string) => `À rédiger par ${name}`,
    notYet: "Le compte rendu se rédige après la séance.",
    cancelled: "Session annulée : pas de compte rendu.",
    notes: "Informations importantes",
    notesPlaceholder:
      "Ce qui a été enregistré, les choix faits, ce qui reste à faire…",
    present: "Présents",
    presentHint: "Qui était là : retirez les absents, ajoutez les autres.",
    nobody: "Personne n'est noté présent.",
    signed: (name: string) => `Rédigé par ${name}`,
    saved: "Compte rendu enregistré",
    responsibleOwner: "Chef de projet",
    responsibleCreator: "A créé la session",
  },
  titles: {
    title: "Maquettes et titres",
    description: "Les morceaux travaillés pendant la séance.",
    newDemo: "Nouvelle maquette",
    newDemoTitle: "Nouvelle maquette",
    newDemoDescription:
      "Elle entre dans les Maquettes du Catalogue, liée à cette session et à ses artistes.",
    demoName: "Nom de travail",
    demoArtist: "Artiste principal",
    attach: "Rattacher un titre",
    attachTitle: "Rattacher un titre ou une maquette",
    attachLabel: "Titre ou maquette",
    attachPlaceholder: "Choisir",
    attachNone: "Tous les titres sont déjà rattachés.",
    empty: "Aucune maquette ni aucun titre rattaché pour l'instant.",
    detach: "Détacher de la session",
    detached: "Titre détaché de la session",
    attached: "Titre rattaché",
    demoCreated: "Maquette créée",
    master: "Master",
  },
  links: {
    title: "Rushs et fichiers",
    description:
      "Les liens vers le Drive où sont rangés les rushs et les gros fichiers.",
    add: "Ajouter un lien",
    addTitle: "Ajouter un lien",
    label: "Nom",
    labelPlaceholder: "Rushs VHS, photos de la séance…",
    url: "Lien",
    urlHint: "L'adresse du dossier ou du fichier partagé (https).",
    urlInvalid: "Collez une adresse qui commence par https://",
    empty: "Aucun lien pour l'instant.",
    open: "Ouvrir",
    delete: "Retirer le lien",
    deleteTitle: "Retirer ce lien ?",
    deleteBody:
      "Le fichier reste sur le Drive : seul le lien quitte la session.",
    added: "Lien ajouté",
    deleted: "Lien retiré",
  },
  delete: {
    label: "Supprimer la session",
    title: "Supprimer cette session ?",
    body: "Son compte rendu, ses participants et ses liens sont supprimés. Les maquettes et les titres restent dans le Catalogue.",
    done: "Session supprimée",
  },
  saved: {
    created: "Session créée",
    updated: "Session enregistrée",
  },
  errors: {
    failed: "L'enregistrement n'a pas abouti. Réessayez dans un instant.",
    forbidden:
      "Seules la direction et les cheffes et chefs de projet gèrent les sessions.",
    session_shared:
      "Cette session est liée à plusieurs titres : détachez-la d'abord des titres.",
  },
} as const;
