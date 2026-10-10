/** Project pages Travail and Équipe (app/(app)/app/projects/[projectId]). */
export const projectWork = {
  work: {
    title: "Travail",
    description:
      "Ce que chaque personne a à faire sur ce projet : en retard d'abord, puis à faire, puis ce qui attend quelqu'un d'autre.",
    loadError:
      "Le travail du projet n'a pas pu être chargé. Rechargez la page.",
    stats: {
      overdue: "En retard",
      todo: "À faire",
      waiting: "En attente",
      done: "Fait",
    },
    statuses: {
      overdue: "En retard",
      todo: "À faire",
      waiting: "En attente",
      done: "Fait",
    },
    filterLabel: "Filtrer par personne",
    everyone: "Tout le monde",
    personEmpty: "Rien en cours.",
    kinds: {
      task: "Tâche",
      deliverable: "Livrable",
      staff: "Livrable à attribuer",
      validate: "Validation à donner",
      awaitValidation: "Validation demandée",
    },
    due: (day: string) => `échéance ${day}`,
    noDueDate: "sans échéance",
    waitingOn: (labels: string) => `En attente de : ${labels}`,
    doneOn: (day: string) => `fait le ${day}`,
    validator: (name: string) => `auprès de ${name}`,
    doneCount: (count: number) =>
      count === 1 ? "1 tâche faite" : `${count} tâches faites`,
    markDone: (title: string) => `Marquer « ${title} » comme faite`,
    toDecide: "À décider",
    toDecideEmpty: "Aucune décision en suspens.",
    unknownPerson: "Personne inconnue",
    roles: {
      owner: "Responsable du projet",
      creative: "Directeur créatif",
      member: "Participant",
    },
    add: {
      open: "Ajouter une tâche",
      title: "Nouvelle tâche",
      label: "Intitulé",
      placeholder: "Ex. Envoyer les stems au mixeur",
      assignee: "Responsable",
      dueDate: "Échéance",
      deliverable: "Livrable concerné",
      noDeliverable: "Aucun",
      submit: "Ajouter",
      cancel: "Annuler",
      hint: "Une tâche a toujours un responsable et une échéance.",
    },
  },
  team: {
    title: "Équipe",
    description:
      "Qui travaille sur ce projet, sa charge en cours, et les intervenants cités pendant les calls.",
    internal: "Membres",
    columns: {
      person: "Personne",
      todo: "À faire",
      overdue: "En retard",
      waiting: "En attente",
    },
    external: "Intervenants cités",
    externalHint:
      "Personnes nommées pendant un call ou ajoutées au Cadrage. Elles n'ont pas de compte.",
    externalEmpty: "Aucun intervenant pour l'instant.",
    externalColumns: {
      name: "Nom",
      role: "Rôle",
      source: "Source",
    },
    noRole: "Rôle non précisé",
  },
} as const;
