/** Authenticated shell: navigation, projects list, project tabs (step 3). */
export const shell = {
  brandSubtitle: "Cycle de vie des sorties",
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    projects: "Projets",
    artists: "Artistes",
    masters: "Masters",
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

  projectTypes: {
    music_release: "Sortie musicale",
    partnership: "Partenariat",
    content: "Contenu",
  },

  priorities: { low: "Basse", normal: "Normale", high: "Haute" },

  stageStates: {
    not_started: "À venir",
    in_progress: "En cours",
    awaiting_validation: "À valider",
    validated: "Validée",
  },

  projects: {
    title: "Projets",
    subtitle: "Sorties musicales, partenariats et contenus.",
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
    emptyBodyReadOnly: "Les projets apparaîtront ici dès qu'ils seront créés.",
    loadError: "Impossible de charger les projets. Rechargez la page.",
  },

  newProject: {
    title: "Nouveau projet",
    subtitle:
      "Le projet est créé non transmis. Il sera lancé une fois accepté par un chef de projet.",
    fields: {
      title: "Titre du projet",
      type: "Type",
      masters: "Masters",
      mastersOptional: "Facultatif pour ce type de projet.",
      dueDate: "Échéance principale",
      dueDateHint: "Date de sortie visée pour une sortie musicale.",
      budget: "Budget prévisionnel",
      budgetHint: "Montant en euros, par exemple 1500 ou 1 500,50.",
      priority: "Priorité",
      priorityNone: "Non définie",
      notes: "Notes de cadrage",
      notesHint: "Reprenez le brief reçu.",
    },
    submit: "Créer le projet",
    submitting: "Création…",
    cancel: "Annuler",
    errors: {
      mastersRequired:
        "Une sortie musicale doit rattacher au moins un master. Rattachez-en un, ou changez le type de projet.",
      invalidType: "Choisissez un type de projet.",
      invalidPriority: "Priorité invalide.",
      invalidBudget: "Montant invalide, par exemple 1500 ou 1 500,50.",
      invalidDate: "Date invalide.",
      invalidMasters: "Un master sélectionné n'existe plus. Retirez-le.",
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
      type: "Type",
      masters: "Masters rattachés",
      noMasters: "Aucun master rattaché.",
      dueDate: "Échéance principale",
      budget: "Budget prévisionnel",
      priority: "Priorité",
      framingNotes: "Notes de cadrage",
      notProvided: "non renseigné",
      owner: "Responsable",
      noOwner: "Non défini",
      createdAt: "Créé le",
      currentStage: "Étape en cours",
      stages: "Étapes",
      changedAt: "Mis à jour le",
    },
  },
} as const;
