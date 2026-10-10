const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

/** Follow-up of the Stratégie before and after the release (step 14). */
export const strategyFollowUp = {
  title: "Suivi de la stratégie",
  link: "Suivi de la stratégie",
  linkHint:
    "Avant la sortie, ce qui est prêt ou bloqué ; après, les résultats face aux objectifs.",
  back: "Stratégie",
  locked:
    "Le suivi s'ouvre une fois la stratégie validée : il s'appuie sur ce qu'elle a décidé.",
  before: {
    title: "Avant la sortie",
    body: (when: string) =>
      `Sortie ${when}. Ce que PO surveille, calculé depuis le projet : rien n'est estimé.`,
    noDate:
      "Pas encore de date de sortie : le suivi reste celui d'avant la sortie.",
    empty: "Rien à surveiller pour l'instant.",
  },
  after: {
    title: "Après la sortie",
    body: (date: string) =>
      `Sortie le ${date}. Chaque objectif face à la dernière donnée réelle disponible.`,
  },
  inDays: (days: number) =>
    days === 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days} jours`,
  states: {
    ready: "Prêt",
    in_progress: "En cours",
    waiting: "En attente",
    blocked: "Bloqué",
  },
  areas: {
    contents: "Contenus",
    influence: "Influence",
    press: "RP / Médias",
    playlisting: "Playlisting",
    coordination: "Coordination",
    validations: "Validations",
  },
  reasons: {
    delivered: "Livré",
    milestonePassed: (milestone: string, date: string) =>
      `Le temps fort « ${milestone} » (${date}) est passé sans livraison`,
    upstreamLate: (step: string, date: string) =>
      `${step} prévue le ${date}, dépassée`,
    designSubmitted: "Version déposée, à valider",
    designChanges: "Modifications demandées sur la conception",
    toDesign: "À concevoir",
    designApproved: "Conception validée, production en cours",
    toApprove: "Version finale à valider",
    toCheck: "Contrôle technique à faire",
    toDeliver: "Livraison à confirmer",
    leverDeliverables: (done: number, total: number) =>
      `${done} livrable${done > 1 ? "s" : ""} prêt${done > 1 ? "s" : ""} sur ${total}`,
    leverNext: (milestone: string, date: string) =>
      `Prochain temps fort : « ${milestone} » le ${date}`,
    leverNothing: "Ni livrable ni temps fort rattaché",
    tasksOverdue: (n: number) =>
      plural(n, "tâche en retard", "tâches en retard"),
    tasksOpen: (n: number) => plural(n, "tâche ouverte", "tâches ouvertes"),
    tasksDone: "Toutes les tâches sont faites",
    upstreamLateCount: (n: number) =>
      plural(n, "échéance amont dépassée", "échéances amont dépassées"),
    upstreamNext: (step: string, deliverable: string, date: string) =>
      `Prochaine : ${step.toLowerCase()} de « ${deliverable} » le ${date}`,
    upstreamDone: "Toutes les échéances amont sont tenues",
    docApproved: (version: number) => `Validé · V${version}`,
    docSent: (n: number) =>
      `Envoyé, ${plural(n, "validation attendue", "validations attendues")}`,
    docChanges: "Modification demandée",
    docPending: "Généré, pas encore envoyé en validation",
    docMissing: "À générer",
    stagePending: "Validation de l'étape attendue",
  },
  labels: {
    tasks: "Tâches du projet",
    upstream: "Échéances amont",
  },
  documents: {
    brief: "Brief de sortie",
    release_plan: "Plan de sortie",
    press_kit: "Dossier de presse",
  },
  stages: {
    design: "Conception",
    production: "Production",
    review: "Suivi & bilan",
  } as Record<string, string>,
  kpis: {
    title: "Objectifs & KPIs",
    empty: "Aucun KPI défini dans la stratégie.",
    kpi: "KPI",
    target: "Cible",
    actual: "Dernière donnée",
    gap: "Écart",
    noTarget: "Sans cible",
    noData: "Pas encore de donnée",
    unavailable: "Donnée indisponible",
    qualitative: "Signal à observer",
    qualitativeHint: "Qualitatif : pas de chiffre, à apprécier par l'équipe.",
    deezer: "Fans Deezer, lus automatiquement",
    measuredOn: (date: string, source: string | null) =>
      source ? `le ${date} · ${source}` : `le ${date}`,
    progress: (percent: number) => `${percent} % de la cible`,
    note: "Noter une valeur",
    noteTitle: (label: string) => `Noter une valeur · ${label}`,
    noteBody:
      "La valeur réellement constatée, avec la date et l'endroit où elle a été lue. PO ne l'estime jamais.",
    value: "Valeur constatée",
    date: "Date de la mesure",
    source: "Où elle a été lue",
    sourcePlaceholder: "Spotify for Artists, relevé presse…",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    saved: "Valeur notée.",
  },
  recommendations: {
    title: "Recommandations",
    empty:
      "Aucune recommandation : rien dans les données réelles n'appelle d'action.",
    hint: "Calculées depuis des données réelles uniquement ; chacune cite la donnée sur laquelle elle repose.",
    apply: "Appliquer",
    applyHint: "Crée une tâche pour le responsable du projet",
    applied: "Tâche créée dans le Travail du projet.",
    ignore: "Ignorer",
    askPo: "Parler à PO",
    belowPace: (
      label: string,
      value: string,
      date: string,
      target: string,
      due: string,
      expected: string,
    ) =>
      `« ${label} » : ${value} le ${date}, pour une cible de ${target} au ${due} (rythme attendu à cette date : ${expected}).`,
    belowPaceAction: (label: string) =>
      `Renforcer le dispositif pour « ${label} » (sous le rythme attendu)`,
    missed: (label: string, value: string, target: string, due: string) =>
      `« ${label} » : ${value} à l'échéance du ${due}, pour une cible de ${target}.`,
    missedAction: (label: string) =>
      `Faire le bilan de « ${label} » (cible non atteinte)`,
    upstreamLate: (
      step: string,
      deliverable: string,
      date: string,
      milestone: string,
      milestoneDate: string,
    ) =>
      `${step} de « ${deliverable} » prévue le ${date} est dépassée, pour « ${milestone} » le ${milestoneDate}.`,
    upstreamLateAction: (deliverable: string, milestone: string) =>
      `Accélérer « ${deliverable} » ou décaler « ${milestone} »`,
    undelivered: (milestone: string, date: string, deliverable: string) =>
      `« ${milestone} » était prévu le ${date}, « ${deliverable} » n'est pas livré.`,
    undeliveredAction: (deliverable: string, milestone: string) =>
      `Livrer « ${deliverable} » ou replanifier « ${milestone} »`,
    question: (project: string, fact: string) =>
      `Sur le projet « ${project} » : ${fact} Que proposes-tu, en t'appuyant uniquement sur les données du projet ?`,
  },
} as const;
