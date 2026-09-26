/** Authenticated shell: navigation, projects list, project tabs (step 3). */
export const shell = {
  brandSubtitle: "Cycle de vie des sorties",
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    projects: "Projets",
    members: "Équipe",
    openMenu: "Ouvrir le menu",
    menuTitle: "Menu",
  },

  home: {
    welcome: (firstName: string) => `Bonjour ${firstName}`,
    welcomeAnonymous: "Bonjour",
    body: "Suivez chaque sortie, du cadrage au bilan.",
    toProjects: "Voir les projets",
    pendingRequests: (count: number) =>
      count === 1
        ? "1 demande d'accès attend votre décision."
        : `${count} demandes d'accès attendent votre décision.`,
    toMembers: "Ouvrir l'équipe",
  },

  releaseTypes: { single: "Single", ep: "EP", album: "Album" },

  stageStates: {
    not_started: "À venir",
    in_progress: "En cours",
    awaiting_validation: "À valider",
    validated: "Validée",
  },

  projects: {
    title: "Projets",
    subtitle: "Toutes les sorties en cours de préparation.",
    newProject: "Nouveau projet",
    columns: {
      title: "Titre",
      artist: "Artiste",
      type: "Type",
      stage: "Étape en cours",
    },
    allValidated: "Terminé",
    noStage: "—",
    emptyTitle: "Aucun projet pour l'instant",
    emptyBody:
      "Créez le premier projet pour commencer à suivre une sortie, du cadrage au bilan.",
    loadError: "Impossible de charger les projets. Rechargez la page.",
  },

  newProject: {
    title: "Nouveau projet",
    subtitle:
      "Un projet regroupe une sortie et ses sept étapes, du cadrage au bilan.",
    fields: {
      title: "Titre",
      releaseType: "Type de sortie",
      artist: "Artiste",
      artistExisting: "Artiste existant",
      artistNew: "Nouvel artiste",
      artistNewName: "Nom de l'artiste",
      artistPlaceholder: "Choisir un artiste",
      owner: "Responsable du projet",
      ownerHint: "La personne qui pilote la sortie.",
    },
    noArtistYet: "Aucun artiste enregistré : saisissez son nom.",
    submit: "Créer le projet",
    submitting: "Création…",
    cancel: "Annuler",
    you: "(vous)",
    errors: {
      artistRequired: "Choisissez un artiste ou saisissez un nom.",
      ownerInvalid: "Choisissez un membre actif de l'équipe.",
      invalidType: "Type de sortie invalide.",
    },
  },

  project: {
    back: "Tous les projets",
    tabsLabel: "Sections du projet",
    tabs: {
      overview: "Vue d'ensemble",
      framing: "Cadrage",
      calls: "Calls",
      release: "Sortie",
    },
    stagesLabel: "Étapes du projet",
    stageOf: (position: number, total: number) =>
      `Étape ${position} sur ${total}`,
    notFoundTitle: "Projet introuvable",
    notFoundBody: "Ce projet n'existe pas ou vous n'y avez pas accès.",
    overview: {
      facts: "Informations",
      artist: "Artiste",
      type: "Type de sortie",
      owner: "Responsable",
      noOwner: "Non défini",
      createdAt: "Créé le",
      currentStage: "Étape en cours",
      stages: "Étapes",
      changedAt: "Mis à jour le",
    },
  },
} as const;
