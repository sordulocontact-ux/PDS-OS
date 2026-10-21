/** Work page: what each person has to do, by permission. */
export const work = {
  title: "Travail",
  // Keyed by position: only the wording changes, the lists follow permissions.
  descriptions: {
    general_director:
      "Ce qui attend votre décision, projet par projet, et les projets à transmettre.",
    project_manager: "Ce qui vous attend, projet par projet.",
    creative_director: "Ce qui vous attend, projet par projet.",
  } as Record<string, string>,
  descriptionFallback: "Ce qui vous attend, projet par projet.",
  loadError: "Impossible de charger votre travail. Rechargez la page.",

  // The viewer's actions read from every project's journeys (docs/VISION-UX.md
  // § 3, « Une seule source »): one card per project on the Travail, one card
  // « À vous » and one for the decisions on the home.
  journeys: {
    mine: "À vous",
    mineEmpty: "Rien ne vous attend pour l'instant.",
    validations: "Validations qui m'attendent",
    validationsEmpty: "Aucune validation ne vous attend.",
    allWork: "Tout le travail",
    toValidate: "À valider",
    overdue: "En retard",
    due: (day: string) => `avant le ${day}`,
    // A project's journeys could not be read: its card is missing.
    partial:
      "Une partie de vos projets n'a pas pu être lue. Rechargez la page.",
  },

  // The global Travail's table: every action in one list, tabs by kind.
  table: {
    views: {
      all: "Tout",
      todo: "À faire",
      validate: "À valider",
      overdue: "En retard",
    },
    viewsLabel: "Filtrer le travail",
    columns: {
      action: "Action",
      project: "Projet",
      due: "Échéance",
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
    noDue: "Sans échéance",
    emptyTitle: "Rien ne vous attend",
    emptyBody:
      "Les actions de vos projets apparaîtront ici dès qu'elles vous reviennent.",
    viewEmpty: {
      all: "Rien ne vous attend pour l'instant.",
      todo: "Rien à faire pour l'instant.",
      validate: "Aucune décision ne vous attend.",
      overdue: "Rien n'est en retard.",
    },
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
