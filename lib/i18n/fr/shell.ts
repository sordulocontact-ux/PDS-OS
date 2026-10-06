/** Authenticated shell: navigation, projects list, project sidebar. */
export const shell = {
  // Read after a validated step of a process (ProcessSteps), by screen readers.
  processSteps: { done: "validée" },
  brand: "PDS",
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    work: "Travail",
    projects: "Projets",
    calendar: "Calendrier",
    calls: "Calls",
    artists: "Artistes",
    // The list of titles ("masters" in the code), named Catalogue (04/10/2026).
    masters: "Catalogue",
    network: "Réseau",
    contracts: "Contrats",
    files: "Fichiers",
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
    music_release: "Musical",
    content: "Contenu",
    event: "Événement",
  },

  musicFormats: {
    single: "Single",
    ep: "EP",
    album: "Album",
    mixtape: "Mixtape",
    compilation: "Compilation",
    other: "Autre",
  },

  priorities: { low: "Basse", normal: "Normale", high: "Haute" },
  highPriority: "Priorité haute",

  stageStates: {
    not_started: "À venir",
    in_progress: "En cours",
    awaiting_validation: "À valider",
    validated: "Validée",
  },

  projects: {
    title: "Projets",
    subtitle: "Sorties musicales, contenus et événements.",
    newProject: "Nouveau projet",
    columns: {
      title: "Titre",
      artist: "Artiste",
      type: "Type",
      stage: "Étape en cours",
    },
    allValidated: "Terminé",
    draft: "Brouillon",
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
    sections: {
      project: "Le projet",
      details: "Informations initiales",
      team: "Équipe",
    },
    fields: {
      title: "Titre du projet",
      type: "Type",
      eventSoon: "Bientôt",
      format: "Format",
      contentModes: {
        format: "Format PDS existant",
        one_off: "Contenu ponctuel",
      },
      contentFormat: "Format PDS",
      artist: "Artiste",
      optional: "facultatif",
      master: "Master",
      masters: "Masters",
      singleHint: "Un seul master pour un single.",
      dueDate: "Échéance principale",
      releaseDate: "Date de sortie visée",
      releaseDateHint:
        "Remplacée par la date de l'onglet Sortie une fois celle-ci saisie.",
      budget: "Budget prévisionnel",
      priority: "Priorité",
      priorityHint: "Haute : en tête de l'accueil, de Travail et des projets.",
      initialContext: "Contexte initial",
      initialContextHint:
        "Ajoutez ici les informations déjà connues au moment de transmettre le projet.",
      team: "Équipe",
      manager: "Chef de projet",
      managerPlaceholder: "Choisir un chef de projet",
      managerNone:
        "Aucun chef de projet dans l'organisation : créez d'abord son compte depuis Membres.",
      creatives: "Direction créative",
      creativesNone: "Aucun directeur créatif dans l'organisation.",
    },
    contentFormatPicker: {
      searchLabel: "Choisir un format PDS",
      placeholder: "Rechercher un format…",
      noResult: (query: string) => `Aucun format ne s'appelle « ${query} ».`,
      allSelected: "Aucun autre format.",
      create: "Créer un format PDS",
      createNamed: (name: string) => `Créer le format « ${name} »`,
      remove: (name: string) => `Retirer ${name}`,
    },
    contentFormatForm: {
      title: "Nouveau format PDS",
      description:
        "Un format se réutilise : chaque édition sera un nouveau projet.",
      name: "Nom du format",
      details: "Description",
      submit: "Créer le format",
      submitting: "Création…",
      cancel: "Annuler",
      close: "Fermer",
      nameTaken: "Un format porte déjà ce nom.",
    },
    artistField: {
      searchLabel: "Rattacher un artiste",
      remove: (name: string) => `Retirer ${name}`,
    },
    submit: "Transmettre le projet",
    submitting: "Transmission…",
    // Kept as it is typed (feedback n°6), resumed from this page.
    draft: {
      idle: "Votre saisie est gardée en brouillon : vous pouvez quitter la page et la reprendre ici.",
      saving: "Enregistrement du brouillon…",
      saved: "Brouillon enregistré.",
      error: "Le brouillon n'a pas pu être enregistré. Vérifiez la connexion.",
      untitled: "Projet sans titre",
      notFound:
        "Ce brouillon n'existe plus : le projet a sans doute déjà été créé.",
      delete: "Supprimer le brouillon",
      confirmTitle: "Supprimer ce brouillon ?",
      confirmDescription:
        "Ce qui a été saisi sera perdu. Aucun projet n'a été créé.",
      confirm: "Supprimer",
      deleting: "Suppression…",
      cancel: "Annuler",
      close: "Fermer",
      deleteFailed: "Le brouillon n'a pas pu être supprimé. Réessayez.",
    },
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    errors: {
      notEditable:
        "Ce projet ne se modifie plus ici : il est lancé, ou vous n'en avez pas le droit.",
      mastersRequired:
        "Un projet musical rattache au moins un master. Rattachez-en un, ou créez-le.",
      singleOneMaster:
        "Un single rattache un seul master. Retirez-en, ou choisissez un autre format.",
      musicFormatRequired: "Choisissez le format de la sortie.",
      contentModeRequired:
        "Choisissez un format PDS existant ou un contenu ponctuel.",
      contentFormatRequired: "Choisissez le format PDS, ou créez-le.",
      invalidContentFormat: "Ce format n'existe plus. Choisissez-en un autre.",
      invalidArtist: "Cet artiste n'est plus disponible. Retirez-le.",
      typeUnavailable: "Ce type de projet n'est pas encore disponible.",
      invalidType: "Choisissez un type de projet.",
      invalidPriority: "Priorité invalide.",
      invalidBudget: "Montant invalide, par exemple 1500 ou 1 500,50.",
      invalidDate: "Date invalide.",
      invalidMasters: "Un titre sélectionné n'existe plus. Retirez-le.",
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
      groups: {
        process: "Processus",
        steering: "Pilotage",
        production: "Production",
      },
      overview: "Vue d'ensemble",
      workflow: "Workflow",
      plan: "Plan du projet",
      master: "Master",
      legal: "Juridique",
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
    legalSteps: {
      label: "Étapes juridiques",
      soon: "Bientôt disponible",
      inventory: "État des lieux",
      framing: "Cadrage juridique",
      confirmation: "Confirmation",
      plan: "Plan d'action",
      tracking: "Suivi",
      // The branches' pages, opened at any time beside the path.
      branchesLabel: "Dossiers juridiques",
      branches: {
        forms: "Fiches de renseignements",
        contracts: "Contrats",
        splits: "Répartitions",
        clearances: "Accords",
        formalities: "SACEM",
      },
    },
    workflowSteps: {
      label: "Étapes du parcours",
      // Why a step with a page cannot be opened yet.
      locked: {
        strategy: "Se lance depuis le Plan du Projet, une fois le Brief validé",
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
      masters: "Titres rattachés",
      noMasters: "Aucun titre rattaché.",
      dueDate: "Échéance principale",
      budget: "Budget prévisionnel",
      priority: "Priorité",
      initialContext: "Contexte initial",
      notProvided: "non renseigné",
      owner: "Responsable",
      noOwner: "Non défini",
      createdAt: "Créé le",
      currentStage: "Étape en cours",
      stages: "Étapes",
      changedAt: "Mis à jour le",
      // Sections without a tab of their own, when the project uses tabs.
      moreSections: "Aussi dans ce projet",
    },
  },
} as const;
