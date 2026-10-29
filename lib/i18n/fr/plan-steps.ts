// The steps of the Plan du projet, made pilotable (PROJ-UX-07): real state,
// pilot and executor, due date, dependencies, inconsistencies, history.
export const planSteps = {
  pilot: "Pilote",
  executor: "Exécutant",
  executorSame: "Le pilote",
  due: "Échéance",
  noDue: "Non définie",
  dueFromFraming: (label: string) => `Échéance du cadrage : ${label}`,
  dependsOn: "Dépend de",
  noDependency: "Aucune",
  status: "Statut réel",
  added: "Étape ajoutée",
  addedStatus: { open: "À faire", done: "Faite" },
  noStatus: "Accès restreint",
  issues: {
    runningLater: "Déjà en cours : sa colonne ne dit pas l'avancement réel.",
    doneLater: "Déjà terminé : sa colonne ne dit pas l'avancement réel.",
    dependencyLater: (name: string) =>
      `Dépend de ${name}, placé plus tard dans le plan.`,
    dependencyRemoved: (name: string) => `Dépend de ${name}, retiré du plan.`,
    dueAfterTarget: (date: string) =>
      `Échéance après la date cible du projet (${date}).`,
    dueBeforeDependency: (name: string) =>
      `Échéance avant celle de ${name}, dont elle dépend.`,
    blocked: (what: string) => `Bloqué : ${what}`,
    toReview: (labels: string) =>
      `À revoir : le cadrage a changé depuis le Brief validé (${labels}).`,
  },
  edit: "Modifier l'étape",
  editTitle: "Modifier l'étape",
  editBody:
    "Pilote, exécutant, échéance, colonne et dépendances. Chaque changement reste dans l'historique du plan.",
  editBodyDraft:
    "Pilote, exécutant, échéance, colonne et dépendances. Rien n'est enregistré avant « Lancer le plan ».",
  add: "Ajouter une étape",
  addTitle: "Ajouter une étape",
  addBody:
    "Une étape que le plan ne propose pas : un shooting, un rendez-vous, une validation externe…",
  title: "Nom de l'étape",
  column: "Colonne",
  save: "Enregistrer l'étape",
  saved: "Étape enregistrée.",
  addedToast: "Étape ajoutée au plan.",
  moveUp: "Monter",
  moveDown: "Descendre",
  moved: "Étape déplacée.",
  markDone: "Marquer comme faite",
  reopen: "Rouvrir",
  doneToast: "Étape marquée comme faite.",
  reopenedToast: "Étape rouverte.",
  missingTitle: "Donnez un nom à l'étape.",
  dueInvalid: "Date invalide.",
  review: {
    issues: (n: number) =>
      `${n} ${n === 1 ? "incohérence signalée" : "incohérences signalées"} : vous pouvez lancer quand même, ou corriger d'abord.`,
  },
  launchOne: {
    title: (name: string) => `Lancer ${name} ?`,
    body: (name: string, pilot: string) =>
      `${name} démarre maintenant, piloté par ${pilot}. Le lancement est enregistré à votre nom, avec la date.`,
  },
  launchedBy: (date: string, name: string | null) =>
    name ? `Plan lancé le ${date} par ${name}` : `Plan lancé le ${date}`,
  board: {
    title: "Étapes du plan",
    body: "Le plan lancé, étape par étape : où en est chacune, qui la pilote, qui l'exécute, pour quand, et ce qu'elle attend.",
    views: {
      all: "Toutes",
      active: "En cours",
      next: "Suivantes",
      blocked: "Bloquées",
      done: "Terminées",
    },
    step: "Étape",
    empty: "Aucune étape dans cette vue.",
  },
  history: {
    title: "Historique du plan",
    empty: "Aucun changement depuis le lancement.",
    kinds: {
      launched: (n: number) =>
        `Plan lancé (${n} ${n === 1 ? "étape" : "étapes"})`,
      workflow_launched: (name: string) => `${name} lancé`,
      step_added: (name: string) => `Étape ajoutée : ${name}`,
      step_updated: (name: string) => `Étape modifiée : ${name}`,
      step_moved: (name: string) => `Étape déplacée : ${name}`,
      step_done: (name: string) => `Étape faite : ${name}`,
      step_reopened: (name: string) => `Étape rouverte : ${name}`,
    },
    changes: {
      column: "colonne",
      owner: "pilote",
      executor: "exécutant",
      dueDate: "échéance",
      dependsOn: "dépendances",
      title: "nom",
    },
    changed: (fields: string) => `Changé : ${fields}`,
    by: (name: string | null, date: string) =>
      name ? `${name}, le ${date}` : `Le ${date}`,
  },
} as const;
