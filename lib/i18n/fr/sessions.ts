// Sessions studio (retours d'Ibé du 01, du 05 et du 06/11/2026): their list,
// their page, their form, their report, the maquettes and links they gather.

export const sessions = {
  title: "Sessions studio",
  subtitle: "Planifier, préparer et garder la trace des séances.",
  newSession: "Nouvelle session",
  loadError: "Les sessions n'ont pas pu être lues. Réessayez dans un instant.",
  views: {
    label: "Sessions",
    upcoming: "À venir",
    toReport: "À compléter",
    done: "Terminées",
    all: "Toutes",
  },
  columns: {
    date: "Date",
    session: "Séance",
    artists: "Artistes",
    projects: "Projets",
    state: "État",
  },
  // Computed, never typed (lib/sessions/state.ts).
  states: {
    planned: "Prévue",
    ongoing: "En cours",
    toReport: "Compte rendu à compléter",
    done: "Terminée",
    cancelled: "Annulée",
  },
  // « 4 h 18 », « 45 min ».
  duration: (minutes: number) =>
    minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`,
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
    toReport: "Aucun compte rendu à compléter",
    done: "Aucune session terminée",
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
      "Elle arrive dans le Calendrier ; l'équipe interne invitée la reçoit dans son agenda.",
    // The three parts of the form (Ibé, 06/11/2026).
    when: "La séance",
    who: "Avec qui",
    what: "Ce qu'on travaille",
    artists: "Artistes",
    artistsPlaceholder: "Choisir des artistes",
    titles: "Titres ou maquettes",
    titlesPlaceholder: "Choisir des titres",
    titlesHint: "Leur projet est rattaché tout seul à la session.",
    // A title of a collective not in the Catalogue yet (lot 7): created
    // there under a provisional name when the session is saved.
    waitingTitle: (label: string, project: string) =>
      `${label} · ${project} (pas encore au Catalogue)`,
    projects: "Projets",
    projectsPlaceholder: "Choisir des projets",
    projectsHint:
      "Seulement un projet sans titre choisi : celui d'un titre vient tout seul.",
    notes: "Notes de préparation",
    notesPlaceholder: "Objectifs, consignes, morceaux à travailler…",
    participantsHint:
      "L'équipe et les personnes du Réseau présentes. Seule l'équipe interne est invitée dans l'agenda.",
    artistRequired: "Choisissez au moins un artiste.",
    teamDetail: "Équipe PDS",
  },
  // The block of a title's Vue d'ensemble.
  onTitle: {
    description: "Les séances où ce morceau a été travaillé.",
    empty:
      "Aucune session rattachée à ce titre. On rattache un titre depuis la page de la session (« Maquettes et titres »).",
  },
  page: {
    back: "Toutes les sessions",
    infoTitle: "Informations",
    prepTitle: "Préparation",
    prepDescription: "Ce qui est prévu pour la séance.",
    facts: {
      date: "Date",
      hours: "Horaires",
      studio: "Studio ou lieu",
      engineer: "Ingénieur du son",
      artists: "Artistes",
      projects: "Projets",
      participants: "Participants",
      notes: "Notes de préparation",
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
    cancel: "Annuler la séance",
    cancelTitle: "Annuler cette séance ?",
    cancelBody:
      "Elle quitte le Calendrier et n'attend plus de compte rendu. Vous pourrez la rétablir.",
    cancelled: "Séance annulée",
    keep: "Garder la séance",
    restore: "Rétablir la séance",
    restored: "Séance rétablie",
  },
  report: {
    title: "Compte rendu",
    description: "Ce qui s'est passé pendant la séance et la suite.",
    write: "Rédiger le compte rendu",
    edit: "Modifier le compte rendu",
    why: "La séance a eu lieu : racontez-la pendant que tout est frais.",
    ongoing: "La séance est en cours : le compte rendu peut déjà commencer.",
    waitingFor: (name: string) => `À rédiger par ${name}`,
    notes: "Résumé",
    notesPlaceholder:
      "Racontez librement la séance : ce qui a été travaillé, ce qui a marché, les choix faits…",
    takeaways: "À retenir",
    takeawaysPlaceholder:
      "Versions validées, choix artistiques, points d'attention…",
    nextStep: "Prochaine étape",
    nextStepPlaceholder: "Ce qu'il reste à faire, par qui et pour quand…",
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
    columns: { title: "Titre", status: "Statut" },
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
    column: "Lien",
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
  // The event of the label's Google Agenda (lib/sessions/calendar.ts).
  calendar: {
    title: (kind: string, who: string) =>
      who ? `Session studio · ${kind} · ${who}` : `Session studio · ${kind}`,
    description: (url: string) =>
      `Session studio planifiée depuis PDS OS. Le compte rendu se rédige sur sa page : ${url}`,
  },
  errors: {
    failed: "L'enregistrement n'a pas abouti. Réessayez dans un instant.",
    forbidden:
      "Seules la direction et les cheffes et chefs de projet gèrent les sessions.",
    session_shared:
      "Cette session est liée à plusieurs titres : détachez-la d'abord des titres.",
  },
} as const;
