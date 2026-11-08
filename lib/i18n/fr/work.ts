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
    },
    places: {
      task: "Tâche",
      deliverable: "Livrable",
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
    calendar: "Voir le calendrier",
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
    },
  },

  // The two sections of the Travail: what the projects ask, and the
  // person's own to-do list (retour du 31/10/2026).
  tabs: {
    label: "Sections du travail",
    actions: "Actions des projets",
    tasks: "Mes tâches",
  },

  // « Mes tâches »: private, written by the person for themselves.
  tasks: {
    description:
      "Vos tâches à vous, visibles de vous seul, la plus proche échéance d'abord.",
    add: {
      title: "Nouvelle tâche",
      titlePlaceholder: "Ajouter une tâche…",
      due: "Échéance",
      submit: "Ajouter",
      titleMissing: "Écrivez la tâche.",
      important: "Important",
      goesTo: "Rangée dans",
      // No « Urgent » box (simplified 08/11/2026): the date says it.
      urgentHint:
        "L'urgence vient de la date : une tâche devient urgente 3 jours avant son échéance.",
    },
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
    // Lot 5: on the home, the urgent ones and the suggestions to sort.
    home: {
      title: "Vos tâches",
      all: "Voir mes tâches",
      due: (day: string) => `Échéance ${day}`,
      more: (n: number) => `Et ${n} autre${n > 1 ? "s" : ""} dans Mes tâches`,
      suggestions: (n: number) =>
        n === 1
          ? "1 action de vos réunions à trier"
          : `${n} actions de vos réunions à trier`,
      suggestionsSub: "Ajoutez-les à vos tâches ou ignorez-les.",
    },
    // Lot 4: the next actions of the meetings, suggested to whom they fall.
    fromCall: (title: string) => `Réunion « ${title} »`,
    suggestions: {
      title: "Suggérées par vos réunions",
      hint: "Les actions relevées par l'IA dans vos réunions des 30 derniers jours, qui vous reviennent. Ajoutez celles à garder.",
      add: "Ajouter",
      dismiss: "Ignorer",
      addLabel: (what: string) => `Ajouter « ${what} » à vos tâches`,
      dismissLabel: (what: string) => `Ignorer « ${what} »`,
      said: (quote: string) => `« ${quote} »`,
      added: "Ajoutée à vos tâches.",
      partial:
        "Une partie des suggestions de vos réunions n'a pas pu être lue. Rechargez la page.",
    },
    edit: {
      title: "Modifier la tâche",
      description: "Son intitulé, son échéance et son importance.",
      name: "Tâche",
      due: "Échéance",
      dueHint: "Facultative. 3 jours avant, la tâche devient urgente.",
      important: "Important",
      submit: "Enregistrer",
      done: "Tâche modifiée.",
    },
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
      "Notez ici ce que vous avez à faire : une tâche, et si besoin sa date.",
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
