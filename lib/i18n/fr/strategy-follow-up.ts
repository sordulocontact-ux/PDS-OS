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
    hint: "Calculées par le code depuis les données réelles du projet ; chacune cite la donnée sur laquelle elle repose. Aucune ne remet en cause la validation de la stratégie : créez la tâche proposée, ou ignorez-la en disant pourquoi.",
    levels: {
      information: "Information",
      recommendation: "Recommandation",
      risk: "Risque",
      blocking: "Blocage",
    },
    // Where the recommendation comes from, beside its level.
    sources: {
      kpi_missed: "Objectif",
      kpi_pace: "Objectif",
      upstream: "Calendrier",
      undelivered: "Jalon",
    },
    why: {
      kpi_missed:
        "L'échéance de l'objectif est passée et la dernière valeur relevée reste sous la cible.",
      kpi_pace:
        "La dernière valeur relevée est sous 80 % du rythme attendu : la cible répartie de la sortie à l'échéance.",
      upstream:
        "Une étape amont n'est pas faite à sa date : le jalon qui en dépend est menacé.",
      undelivered:
        "Le jalon est passé sans que le livrable qu'il attend soit livré.",
    },
    effect: {
      information: "Ne bloque rien : à garder pour le bilan.",
      recommendation: "Ne bloque rien : une action est conseillée.",
      risk: "Ne bloque rien aujourd'hui, mais une échéance du calendrier est menacée.",
      blocking:
        "Bloquant : le jalon ne peut pas avoir lieu tant que le livrable n'est pas livré.",
    },
    proposedAction: (action: string) => `Action proposée : ${action}`,
    proposal: (who: string, date: string, basis: string) =>
      `Tâche proposée : ${who}, pour le ${date} (${basis}).`,
    basis: {
      week: "dans 7 jours, heure de Paris",
      milestone: (title: string) => `jour de « ${title} », heure de Paris`,
    },
    noAssignee: "responsable à choisir",
    readOnly:
      "Seul le chef de projet crée la tâche ou ignore une recommandation. Vous pouvez en parler à PO.",
    askPo: "Parler à PO",
    // The PO conversation's way back: project › Stratégie › Suivi › level.
    trail: (project: string, level: string) => [
      project,
      "Stratégie",
      "Suivi",
      `Recommandation : ${level.toLowerCase()}`,
    ],
    task: {
      open: "Créer la tâche",
      title: "Créer la tâche",
      body: "Pré-remplie depuis la recommandation : corrigez ce qu'il faut. Elle arrive dans le Travail de son responsable, avec un lien vers cette recommandation.",
      context: "Contexte",
      name: "Tâche",
      assignee: "Responsable",
      due: "Échéance",
      dueHint: (basis: string) => `Proposée : ${basis}.`,
      nameRequired: "Écrivez la tâche.",
      assigneeRequired: "Choisissez qui la fait.",
      dueRequired: "Choisissez une échéance.",
      duePast: "L'échéance ne peut pas être passée.",
      missing: (n: number) =>
        n === 1 ? "1 champ à compléter." : `${n} champs à compléter.`,
      submit: "Créer la tâche",
      created: "Tâche créée dans le Travail du projet.",
    },
    ignore: {
      open: "Ignorer",
      title: "Ignorer la recommandation",
      body: "Elle ne sera plus proposée. Le motif reste visible dans « Déjà traitées ».",
      reason: "Pourquoi l'ignorer ?",
      submit: "Ignorer",
      done: "Recommandation ignorée.",
    },
    settled: {
      title: "Déjà traitées",
      applied: "Tâche créée",
      ignored: "Ignorée",
      by: (who: string | null) => (who ? `par ${who}` : ""),
      noSummary: "Texte non conservé : traitée avant le 13/10/2026.",
      reason: (reason: string) => `Motif : ${reason}`,
      noReason: "Ignorée sans motif, avant le 13/10/2026.",
      taskDone: "Faite",
      taskOpen: "À faire",
      taskLine: (title: string, who: string | null, due: string | null) =>
        [title, who, due ? `échéance ${due}` : null]
          .filter(Boolean)
          .join(" · "),
      taskGone: "La tâche a été supprimée.",
      openWork: "Voir dans le Travail",
    },
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
