/** Work page: what each person has to do, by permission. */
export const work = {
  title: "Travail",
  // Keyed by position: only the wording changes, the lists follow permissions.
  descriptions: {
    general_director:
      "Ce qui attend votre décision : validations et projets à transmettre.",
    project_manager: "Vos projets et la prochaine chose à faire sur chacun.",
    creative_director:
      "Les livrables à concevoir et les projets de votre équipe créative.",
  } as Record<string, string>,
  descriptionFallback: "Ce qui vous attend, projet par projet.",
  loadError: "Impossible de charger votre travail. Rechargez la page.",

  cards: {
    // MKT-C2-08: designated or delegated in a Conception.
    myConception: "Ma conception",
    myConceptionEmpty: "Aucune responsabilité de conception.",
    toRetransmitEmpty: "Aucun projet refusé ni de précision demandée.",
    awaitingAcceptance: "En attente d'un chef de projet",
    awaitingAcceptanceEmpty: "Tous les projets transmis ont été acceptés.",
    ownedProjects: "Mes projets",
    ownedProjectsEmpty: "Aucun projet lancé sous votre responsabilité.",
    deliverablesToStaff: "Livrables à attribuer",
    deliverablesToStaffEmpty:
      "Chaque livrable engagé a un responsable et une échéance.",
    myDeliverables: "Livrables à concevoir",
    myDeliverablesEmpty:
      "Aucun livrable ne vous est attribué. Ils arrivent depuis la Stratégie de lancement.",
    creativeProjects: "Projets de mon équipe créative",
    creativeProjectsEmpty: "Aucun projet lancé ne vous est affecté.",
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

  noDueDate: "Sans échéance",
  noAssignee: "Sans responsable",
  inDesign: "En conception",
  allValidated: "Terminé",
  // What the person is responsible for in a Conception (MKT-C2-08).
  conception: {
    direction: "Direction de la sortie",
    sheet: (title: string) => `Fiche « ${title} »`,
    decide: (title: string | null) =>
      title
        ? `Décider sur la fiche « ${title} » (délégation)`
        : "Décider sur la direction (délégation)",
  },
} as const;
