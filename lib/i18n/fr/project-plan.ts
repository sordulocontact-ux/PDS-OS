/** Project pages read from the Strategy: Livrables, Activations, Planning. */
export const projectPlan = {
  editInStrategy: "Modifier dans la Stratégie",
  deliverables: {
    title: "Livrables",
    description:
      "Tout ce que le dispositif engage à produire, avec son responsable et son échéance.",
    stats: {
      total: "Livrables",
      overdue: "En retard",
      toStaff: "À attribuer",
      planned: "Planifiés",
    },
    columns: {
      name: "Livrable",
      lever: "Levier",
      assignee: "Responsable",
      dueDate: "Échéance",
      state: "État",
    },
    states: {
      overdue: "En retard",
      to_staff: "À attribuer",
      planned: "Planifié",
    },
    noAssignee: "Sans responsable",
    noDueDate: "Sans échéance",
    emptyTitle: "Aucun livrable engagé",
    emptyBody:
      "Les livrables s'engagent dans la Stratégie, sous un levier retenu du dispositif.",
  },
  activations: {
    title: "Activations",
    description:
      "Le dispositif de lancement : les leviers par famille, ce qui est retenu et ce qu'il reste à arbitrer.",
    stats: {
      selected: "Retenus",
      toDecide: "À arbitrer",
      rejected: "Non retenus",
      deliverables: "Livrables rattachés",
    },
    familyEmpty: "Aucun levier dans cette famille.",
    deliverableCount: (count: number) =>
      count === 0
        ? "Aucun livrable"
        : count === 1
          ? "1 livrable"
          : `${count} livrables`,
    emptyTitle: "Aucun levier pour l'instant",
    emptyBody:
      "Le dispositif se construit dans la Stratégie, à partir des besoins du Brief.",
  },
  planning: {
    title: "Planning",
    description:
      "Tout ce qui est daté dans le projet, dans l'ordre : temps forts, calls, échéances et sortie.",
    reference: (date: string) => `Décompte depuis la sortie du ${date}`,
    noReference:
      "Aucune date de sortie connue (onglet Sortie ou échéance du projet) : pas de décompte.",
    today: "Aujourd'hui",
    kinds: {
      milestone: "Temps fort",
      call: "Call",
      deliverable: "Livrable",
      upstream: "Échéance amont",
      task: "Tâche",
      release: "Sortie prévue",
      project_due: "Échéance du projet",
    },
    taskDone: "Faite",
    late: "En retard",
    emptyTitle: "Rien de daté pour l'instant",
    emptyBody:
      "Les temps forts se saisissent dans la Stratégie ; les calls et les échéances des livrables et des tâches s'y ajoutent ici.",
  },
} as const;
