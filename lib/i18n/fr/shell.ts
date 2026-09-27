/** Authenticated shell: navigation, projects list, project sidebar. */
export const shell = {
  brand: "PDS",
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    work: "Travail",
    projects: "Projets",
    calendar: "Calendrier",
    calls: "Calls",
    artists: "Artistes",
    masters: "Masters",
    members: "Équipe",
    feedback: "Retours",
    // Read after "Équipe" or "Ouvrir le menu" when requests are waiting.
    pendingMembers: (count: number) =>
      count === 1
        ? "1 demande d'accès en attente"
        : `${count} demandes d'accès en attente`,
    openMenu: "Ouvrir le menu",
    menuTitle: "Menu",
    collapse: "Réduire la navigation",
    expand: "Développer la navigation",
    comingSoon: "Bientôt disponible",
  },

  home: {
    welcome: (firstName: string) => `Bonjour ${firstName}`,
    welcomeAnonymous: "Bonjour",
    body: "Suivez chaque sortie, du cadrage au bilan",
    toProjects: "Voir les projets",
  },

  projectTypes: {
    music_release: "Sortie musicale",
    partnership: "Partenariat",
    content: "Contenu",
    event: "Événement",
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
    subtitle: "Sorties musicales, contenus, partenariats et événements.",
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
      "Le projet part chez le chef de projet choisi. Il sera lancé une fois qu'il l'aura accepté.",
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
      team: "Équipe",
      manager: "Chef de projet",
      managerPlaceholder: "Choisir un chef de projet",
      managerHint:
        "Il reçoit le projet et l'accepte, le refuse ou demande une précision.",
      managerNone:
        "Aucun chef de projet dans l'organisation : créez d'abord son compte depuis Membres.",
      creatives: "Direction artistique",
      creativesHint:
        "Facultatif. Les directeurs créatifs choisis voient le projet. Modifiable ensuite.",
      creativesNone: "Aucun directeur créatif dans l'organisation.",
    },
    submit: "Créer le projet",
    submitting: "Création…",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    errors: {
      notEditable:
        "Ce projet ne se modifie plus ici : il est lancé, ou vous n'en avez pas le droit.",
      mastersRequired:
        "Une sortie musicale doit rattacher au moins un master. Rattachez-en un, ou changez le type de projet.",
      invalidType: "Choisissez un type de projet.",
      invalidPriority: "Priorité invalide.",
      invalidBudget: "Montant invalide, par exemple 1500 ou 1 500,50.",
      invalidDate: "Date invalide.",
      invalidMasters: "Un master sélectionné n'existe plus. Retirez-le.",
      managerRequired: "Choisissez le chef de projet qui recevra le projet.",
      invalidManager:
        "Cette personne n'est plus chef de projet. Choisissez-en un autre.",
      invalidCreatives:
        "Un directeur créatif sélectionné n'est plus disponible. Retirez-le.",
    },
  },

  project: {
    creatives: {
      title: "Équipe créative",
      empty: "Aucun directeur créatif sur ce projet.",
      add: "Ajouter",
      adding: "Ajout…",
      placeholder: "Choisir un directeur créatif",
      label: "Directeur créatif",
      remove: (name: string) => `Retirer ${name}`,
      removeShort: "Retirer",
      noneAvailable: "Tous les directeurs créatifs sont déjà sur ce projet.",
      noCreative: "Aucun directeur créatif dans l'équipe pour l'instant.",
      error: "Impossible de modifier l'équipe créative. Réessayez.",
      hint: "Ils voient le projet et tout ce qu'il contient, sans le modifier.",
    },
    back: "Tous les projets",
    // Sidebar contextuelle du projet (Figma "Devis Sordulo", node 120:74).
    // Seuls overview et workflow (Cadrage + Stratégie + Sortie) et calls ont
    // une page ; le reste est affiché mais désactivé (docs/DESIGN.md § 4).
    sidebar: {
      label: "Sections du projet",
      overview: "Vue d'ensemble",
      workflow: "Workflow",
      activations: "Activations",
      work: "Travail",
      calls: "Calls",
      team: "Équipe",
      deliverables: "Livrables",
      files: "Fichiers",
      planning: "Planning",
      budget: "Budget",
      validations: "Validations",
      activity: "Activité",
    },
    // Les 7 étapes du métier (docs/CONTEXTE-PROJET.md § 4) : habillage de
    // navigation fixe dans l'onglet Workflow, tant que le nombre d'étapes
    // n'est pas tranché avec le client (§ 10, point 3). Ne pas confondre
    // avec `stages` (ProjectStage), qui reste la source d'état réelle.
    workflowSteps: {
      label: "Étapes du parcours",
      // Why a step with a page cannot be opened yet.
      locked: {
        strategy: "Disponible une fois le Cadrage validé",
        conception: "Disponible une fois la Stratégie validée",
      } as Record<string, string>,
      framing: "Cadrage",
      strategy: "Stratégie",
      conception: "Conception",
      production: "Production",
      delivery: "Livraison",
      defense: "Défense",
      wrap: "Bilan",
    },
    notFoundTitle: "Projet introuvable",
    notFoundBody: "Ce projet n'existe pas ou vous n'y avez pas accès.",
    readOnly:
      "Lecture seule : seul le chef de projet responsable modifie ce projet.",
    readOnlyDesign:
      "Seul le chef de projet responsable écrit le Dossier et relit les versions ; l'équipe créative y dépose les siennes.",
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
