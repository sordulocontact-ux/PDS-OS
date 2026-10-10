/** Authenticated shell: navigation, projects list, project sidebar. */
export const shell = {
  // Read after a validated step of a process (ProcessSteps), by screen readers.
  processSteps: { done: "validée" },
  // The chevron of a collapsible PageSection, read with the section's title.
  section: {
    collapse: (title: string) => `Replier « ${title} »`,
    expand: (title: string) => `Déplier « ${title} »`,
  },
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

  // Bottom of the sidebar: who is signed in, in a menu (Figma "PDS OS", 47:12055).
  account: {
    fallbackName: "Compte",
    open: (name: string) => `Compte de ${name}`,
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
    // Fil d'Ariane au-dessus d'une sous-page (« Master / Brief Mix/Master »).
    trail: "Fil d'Ariane",
    // Sidebar contextuelle du projet (ticket « Architecture globale »,
    // 08/10/2026) : Vue d'ensemble et Cadrage, puis les workflows en
    // parallèle, puis le pilotage (docs/DESIGN.md § 4).
    sidebar: {
      label: "Sections du projet",
      // Project switcher at the top of the sidebar (Figma "PDS OS", 47:12056).
      switcher: {
        open: (title: string) => `${title} — changer de projet`,
        search: "Rechercher un projet",
        placeholder: "Rechercher…",
        noResult: (query: string) => `Aucun projet pour « ${query} »`,
        loading: "Chargement des projets…",
        error: "Les projets n'ont pas pu être chargés.",
        all: "Tous les projets",
      },
      groups: {
        workflows: "Workflows",
        steering: "Pilotage",
        production: "Production",
      },
      overview: "Vue d'ensemble",
      framing: "Cadrage",
      master: "Master",
      legal: "Juridique",
      marketing: "Marketing",
      distribution: "Distribution",
      // Why a listed section is closed to this viewer.
      restricted: "Réservé à la direction et aux chefs de projet",
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
    legalSteps: {
      label: "Étapes juridiques",
      soon: "Bientôt disponible",
      inventory: "État des lieux",
      framing: "Cadrage juridique",
      confirmation: "Confirmation",
      plan: "Plan d'action",
      tracking: "Suivi",
      planLocked: "Disponible une fois le dossier confirmé",
      // Under the chevrons: the DG's five steps, as the dossier's state.
      phase: "Étape du dossier",
      // Back from a branch's page (opened by an action of the plan).
      backToPlan: "Plan d'action",
      // The branches' pages, each opened from an action of the plan.
      branches: {
        forms: "Fiches de renseignements",
        contracts: "Contrats",
        splits: "Répartitions",
        // « Accords » named both the clearances and the contracts (ticket
        // Juridique 01 calls the contracts « Accords »): the clearance of an
        // element taken from another work is an « Emprunt » on screen.
        clearances: "Emprunts",
        formalities: "SACEM",
      },
    },
    // Le workflow Marketing (ticket « Architecture globale », § 4) : une
    // organisation, pas une séquence ; chaque étape s'ouvre dès que sa page
    // existe et que ses prérequis réels sont là (lib/ui/marketing-steps.ts).
    // La Distribution (ticket « Architecture globale ») : la page Sortie en
    // deux étapes, sans nouvelle capacité (lib/ui/distribution-steps.ts).
    distributionSteps: {
      label: "Étapes de la Distribution",
      prepare: "Préparation",
      online: "En ligne",
    },
    marketingSteps: {
      label: "Étapes du Marketing",
      strategy: "Stratégie",
      conception: "Conception",
      production: "Production",
      activations: "Activations",
      review: "Suivi & bilan",
      soon: "Pas encore de page",
      strategyLocked:
        "Se lance depuis le Plan du Projet, une fois le Brief validé",
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
