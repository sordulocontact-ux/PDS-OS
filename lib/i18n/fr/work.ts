/** Work page: what each person has to do, by permission. */
export const work = {
  title: "Travail",
  // Keyed by position: only the wording changes, the lists follow permissions.
  descriptions: {
    general_director:
      "Ce qui attend votre décision dans tous les projets, le plus pressé d'abord, et les projets à transmettre.",
    project_manager:
      "Ce qui vous attend dans tous vos projets, le plus pressé d'abord.",
    creative_director:
      "Ce qui vous attend dans tous vos projets, le plus pressé d'abord.",
  } as Record<string, string>,
  descriptionFallback:
    "Ce qui vous attend dans tous vos projets, le plus pressé d'abord.",
  loadError: "Impossible de charger votre travail. Rechargez la page.",

  // The viewer's actions read from every project's journeys (docs/VISION-UX.md
  // § 3, « Une seule source »): one card per project on the Travail, one card
  // « À vous » and one for the decisions on the home.
  journeys: {
    toValidate: "À valider",
    overdue: "En retard",
    // A project's journeys could not be read: its rows are missing.
    partial:
      "Une partie de vos projets n'a pas pu être lue. Rechargez la page.",
  },

  // The global Travail: « Maintenant » (the lead), then every action grouped
  // by when, tabs by kind.
  table: {
    views: {
      all: "Tout",
      todo: "À faire",
      validate: "À valider",
    },
    viewsLabel: "Filtrer le travail",
    search: {
      label: "Rechercher une action",
      placeholder: "Action, projet, module…",
    },
    filters: {
      project: "Projet",
      allProjects: "Tous les projets",
      module: "Module",
      allModules: "Tous les modules",
      due: "Échéance",
      allDues: "Toutes les échéances",
    },
    noMatch: "Aucune action ne correspond à cette recherche ou à ces filtres.",
    groups: {
      overdue: "En retard",
      week: "Cette semaine",
      later: "Plus tard",
      undated: "Sans échéance",
      others: "En attente d'un autre",
    },
    columns: {
      action: "Action",
      project: "Projet",
      module: "Module",
      due: "Échéance",
      validator: "Validation",
      state: "État",
    },
    // Rows whose wording the page writes (no step, no task behind them).
    titles: {
      accept: "Accepter le projet",
      retransmit: "Retransmettre le projet",
      awaiting: "En attente d'un chef de projet",
      proposals: "Relire les propositions de PO",
      session: "Rédiger le compte rendu de la session",
    },
    places: {
      task: "Tâche",
      deliverable: "Livrable",
    },
    // A studio session's report to write (retour d'Ibé du 01/11/2026).
    session: {
      place: (kind: string, day: string | null) =>
        day ? `Session studio › ${kind} du ${day}` : `Session studio › ${kind}`,
      noProject: "Sans projet",
    },
    todo: "À faire",
    emptyTitle: "Rien ne vous attend",
    emptyBody:
      "Les actions de vos projets apparaîtront ici dès qu'elles vous reviennent.",
    viewEmpty: {
      all: "Rien d'autre ne vous attend.",
      todo: "Rien d'autre à faire.",
      validate: "Aucune décision ne vous attend.",
    },
  },

  // The lead of the Travail (docs/VISION-UX.md § 2): what to do now, why,
  // who validates, what follows.
  lead: {
    label: "Maintenant",
    mine: "À vous",
    nothing: "Rien à faire pour vous",
    allDone: "Tout ce qui vous concerne est fait",
    othersMove:
      "Les autres avancent : la Vue d'ensemble de chaque projet dit qui est attendu.",
    open: "Ouvrir",
    due: (day: string) => `avant le ${day}`,
    validator: "Validation",
    then: "Ensuite",
    // Rows with no step behind them: the sentence the page says.
    why: {
      task: "Une tâche qui vous est confiée dans ce projet, en dehors des étapes de ses workflows.",
      deliverable:
        "Un livrable de la Conception vous est confié : déposez une version pour qu'elle soit relue.",
      accept:
        "Le projet vous est transmis : acceptez-le, demandez une précision ou refusez-le, en voyant tout ce qui a été saisi.",
      retransmit:
        "Le chef de projet a refusé le projet ou demandé une précision : répondez, puis transmettez-le à nouveau.",
      awaiting:
        "Le projet attend la réponse du chef de projet à qui il est transmis.",
      proposals:
        "PO a tiré des propositions d'un échange : confirmez, modifiez ou écartez chacune.",
      session:
        "La séance est passée : notez qui était là, les maquettes réalisées et ce qu'il faut retenir.",
    },
  },

  // The two sections of the Travail: what the projects ask, and the
  // person's own to-do list (retour du 31/10/2026).
  tabs: {
    label: "Sections du travail",
    actions: "Actions des projets",
    tasks: "Mes tâches",
  },

  // « Mes tâches »: private, put in by PO from the meetings or written by
  // the person for themselves.
  tasks: {
    description:
      "Vos tâches à vous, visibles de vous seul : celles que PO relève dans vos réunions et celles que vous ajoutez.",
    // « Ajouter une tâche » at the head of the page and « Modifier » of a
    // task: one form, in a modal (retour du 09/11/2026).
    form: {
      open: "Ajouter une tâche",
      addTitle: "Nouvelle tâche",
      addDescription:
        "Elle rejoint Mes tâches, rangée dans la matrice selon son importance et son échéance.",
      editTitle: "Modifier la tâche",
      editDescription: "Son intitulé, son échéance et son importance.",
      name: "Tâche",
      namePlaceholder: "Rappeler le distributeur",
      nameMissing: "Écrivez la tâche.",
      due: "Échéance",
      dueHint:
        "Facultative. Une tâche devient urgente 3 jours avant son échéance.",
      importance: "Importance",
      important: "Importante",
      secondary: "Pas importante",
      goesTo: "Rangée dans",
      // Where it leads (retour du 09/11/2026).
      project: "Projet",
      noProject: "Aucun",
      projectSearch: "Rechercher un projet",
      projectNone: "Aucun projet ne correspond.",
      page: "Page à ouvrir",
      pageSuggested:
        "Proposée d'après l'intitulé. Un clic sur la tâche ouvre cette page.",
      pageHint: "Un clic sur la tâche ouvre cette page.",
      submit: "Ajouter la tâche",
      save: "Enregistrer",
      added: "Tâche ajoutée.",
      edited: "Tâche modifiée.",
    },
    // The pages a task opens (lib/work/task-pages.ts), named as in a
    // project's sidebar.
    pages: {
      overview: "Vue d'ensemble",
      framing: "Cadrage",
      strategy: "Stratégie",
      design: "Conception",
      production: "Production",
      activations: "Activations",
      master: "Master",
      sessions: "Sessions studio",
      legal: "Juridique",
      release: "Distribution",
      budget: "Budget",
      calls: "Calls",
      files: "Fichiers",
    },
    // « Minuit pile › Budget », below the task.
    leadsTo: (project: string, page: string) => `${project} › ${page}`,
    open: (title: string, where: string) => `Ouvrir « ${title} » : ${where}`,
    // The Eisenhower matrix (« comme l'app Matrix »).
    quadrants: {
      do: "Faire",
      plan: "Planifier",
      delegate: "Déléguer",
      later: "Plus tard",
    },
    views: {
      label: "Affichage des tâches",
      list: "Liste",
      matrix: "Matrice",
    },
    move: {
      label: (title: string) => `Déplacer « ${title} »`,
      to: (box: string) => `Vers « ${box} »`,
      staysUrgent:
        "Son échéance est dans 3 jours ou moins : la tâche reste urgente. Changez sa date pour la planifier.",
    },
    boxEmpty: "Aucune tâche ici.",
    // Lot 5: on the home, the urgent ones.
    home: {
      title: "Vos tâches",
      all: "Voir mes tâches",
      more: (n: number) => `Et ${n} autre${n > 1 ? "s" : ""} dans Mes tâches`,
    },
    due: (day: string) => `Échéance ${day}`,
    // Put in by PO from a meeting's next actions (lot 4, without asking
    // since the retour du 09/11/2026).
    fromCall: (title: string) => `Réunion « ${title} »`,
    meetingsPartial:
      "Les actions de vos dernières réunions n'ont pas toutes pu être ajoutées. Rechargez la page.",
    remove: {
      title: "Supprimer la tâche ?",
      body: (title: string) =>
        `« ${title} » sera supprimée définitivement. Pour la garder, cochez-la plutôt comme faite.`,
      done: "Tâche supprimée.",
    },
    quadrantHelp: {
      do: "Urgent et important : à faire tout de suite.",
      plan: "Important, pas urgent : prévoyez un moment pour le faire.",
      delegate: "Urgent, pas important : confiez-le ou faites-le vite.",
      later: "Ni urgent ni important : si vous avez le temps.",
    },
    toggle: (title: string) => `Marquer « ${title} » comme faite`,
    untoggle: (title: string) => `Remettre « ${title} » à faire`,
    overdue: "En retard",
    noDue: "Sans échéance",
    emptyTitle: "Aucune tâche",
    emptyBody:
      "PO y met les actions relevées dans vos réunions. Ajoutez les vôtres avec « Ajouter une tâche ».",
    allDone: "Tout est fait.",
    done: (count: number) =>
      count === 1 ? "1 tâche faite" : `${count} tâches faites`,
    loadError: "Impossible de charger vos tâches. Rechargez la page.",
    failed: "La tâche n'a pas pu être enregistrée. Réessayez.",
  },

  cards: {
    toRetransmitEmpty: "Aucun projet refusé ni de précision demandée.",
    awaitingAcceptance: "En attente d'un chef de projet",
    awaitingAcceptanceEmpty: "Tous les projets transmis ont été acceptés.",
  },

  nextActions: {
    record_call: "Cadrer le projet, avec PO ou pendant un échange",
    write_brief: "Compléter le cadrage et envoyer le Brief",
    build_plan: "Construire et lancer le plan du projet",
    build_strategy: "Construire la Stratégie et la soumettre",
    follow_design: "Suivre la conception avec l'équipe créative",
    prepare_release: "Préparer la sortie",
    run_stage: "Faire avancer le projet",
    await_validation: "En attente de validation",
    done: "Projet terminé",
  },
} as const;
