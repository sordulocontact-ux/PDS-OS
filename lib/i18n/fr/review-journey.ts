// Marketing › Suivi & bilan as a journey of three steps (proto « Projet
// complet », mk.js `bi1`–`bi3`, `dashboard`, `reportModal`): the words of
// the steps, of « Où on en est », of the version cards and the decisions.
// Written here, never in the components.

const s = (n: number) => (n > 1 ? "s" : "");

export const reviewJourney = {
  module: "Suivi & bilan",
  // « S'ouvre quand Réserves est fait. » (Marketing wording).
  blocked: (prereqs: string) =>
    prereqs.includes(" et ")
      ? `S'ouvre quand ${prereqs} sont faits.`
      : `S'ouvre quand ${prereqs} est fait.`,
  history: {
    link: "Historique",
    title: "Historique du suivi & bilan",
    empty: "Rien n'a encore été fait sur le suivi & bilan.",
    generated: (v: number) => `Bilan Marketing V${v} généré`,
    submitted: (v: number, to: string) => `Bilan V${v} soumis à ${to}`,
    decided: (v: number, decision: string) => `Bilan V${v} : ${decision}`,
    decisions: {
      approved_provisional: "bilan provisoire approuvé",
      changes_requested: "corrections demandées",
      postponed: "validation reportée",
    },
    quote: (text: string) => ` · « ${text} »`,
    arbitrated: (text: string, decision: string) =>
      `Réserve « ${text} » : ${decision}`,
    lifted: (text: string) => `Réserve levée : « ${text} »`,
    requested: "Clôture du Marketing demandée",
    closed: (withReserves: boolean | null) =>
      withReserves === null
        ? "Marketing clôturé"
        : `Marketing clôturé ${withReserves ? "avec" : "sans"} réserve`,
    closureChanges: "Clôture : corrections demandées",
    closurePostponed: "Clôture : décision reportée",
    reopened: "Marketing rouvert",
  },
  roles: {
    owner: "Responsable du projet",
    ownerWhat:
      "Prépare et soumet le bilan, arbitre les réserves, demande la clôture",
    validator: "Validation de la direction",
    validatorWhat:
      "Approuve le bilan provisoire, clôture ou rouvre le Marketing",
  },
  // The Activations' first step, the bilan's prerequisite.
  prereq: { module: "Activations", label: "Leviers à préparer" },
  steps: {
    bilan: {
      title: "Bilan provisoire",
      why: "Un rapport figé à une date, calculé par le code. La direction l'approuve, même avec des activations encore ouvertes ; approuver ne vérifie ni ne clôture rien.",
    },
    reserves: {
      title: "Réserves",
      why: "Le responsable arbitre chaque réserve : à lever avant la clôture, à suivre après, non applicable ou doublon ; la direction peut aussi l'accepter comme limite définitive. Une activation pas terminée n'est jamais non applicable ni doublon.",
    },
    closure: {
      title: "Clôture du Marketing",
      why: "La direction clôture le volet Marketing. Ensuite on lit seulement, et les preuves restent acceptées. Il peut être rouvert, avec un motif.",
    },
  },
  todo: {
    prepare: (n: number) => `Préparer la version ${n} du bilan`,
    submit: "Soumettre le bilan à validation",
    resubmit: (n: number) => `Soumettre de nouveau le bilan V${n}`,
    approve: "Approuver le bilan provisoire",
    arbitrate: (n: number) => `Arbitrer ${n} réserve${s(n)}`,
    lift: (text: string) => `Lever : ${text}`,
    request: "Demander la clôture du Marketing",
    close: "Clôturer le Marketing",
  },
  summary: {
    bilan: (v: number, reserves: boolean) =>
      `V${v} approuvée${reserves ? " avec réserves" : ""}`,
    reserves: (n: number) =>
      n > 0 ? `${n} réserve${s(n)} arbitrée${s(n)}` : "Aucune réserve",
    closure: (withReserves: boolean) =>
      `Clôturé ${withReserves ? "avec" : "sans"} réserve`,
  },
  issues: {
    cancelled: (title: string, reason: string | null) =>
      reason ? `${title} : annulée (« ${reason} »)` : `${title} : annulée`,
    notClosed: (title: string, state: string) =>
      `${title} : pas encore clôturée (${state})`,
    proof: (title: string) => `${title} : preuve non vérifiée`,
    statsUnavailable: (title: string) =>
      `${title} : statistiques indisponibles`,
    horizon: (label: string, day: string) => `${label} : lus après le ${day}`,
    states: {
      draft: "brouillon",
      to_prepare: "à préparer",
      ready: "prête",
      in_progress: "en cours",
      done_declared: "réalisée déclarée",
      closed: "clôturée",
      cancelled: "annulée",
      suspended: "suspendue",
      blocked: "bloquée",
    },
  },
  // Objectives against results, the budget by activation (recette of 23/10,
  // MKT-BIL-002), under « Voir le détail ».
  goals: {
    objectives: "Objectifs et résultats",
    objectivesNone: "Aucun objectif chiffré dans la Stratégie.",
    objective: "Objectif",
    target: "Cible",
    declared: "Déclaré",
    verified: "Vérifié",
    gap: "Écart",
    states: {
      reached: "Atteint",
      below: "En dessous",
      not_measurable: "Non mesurable",
    },
    reasons: {
      no_target: "pas de cible chiffrée",
      not_tracked: "les activations ne relèvent pas cette mesure",
      no_reading: "aucun relevé dans les activations",
    },
    early: (day: string) => `provisoire, se lit le ${day}`,
    rule: "Somme des derniers relevés valides des activations (nombres seulement), déclarés et vérifiés à part ; un chiffre absent n'est jamais un zéro.",
    budget: "Budget par activation",
    budgetNone: "Aucune ligne de budget.",
    activation: "Activation",
    estimated: "Estimé",
    committed: "Engagé",
    invoiced: "Facturé",
    paid: "Payé",
    budgetLabels: { outside: "Hors activation", total: "Total" },
    envelope: (envelope: string, gap: string, over: boolean) =>
      over
        ? `Enveloppe ${envelope} : dépassée de ${gap} par l'engagé.`
        : `Enveloppe ${envelope} : ${gap} restent après l'engagé.`,
    noEnvelope: "Pas d'enveloppe fixée.",
    budgetRule:
      "Chaque ligne est lue sur l'activation qu'elle nomme, sinon celle de son livrable, sinon la seule activation de son levier. Facturé = facture reçue, payée ou non.",
  },
  standing: {
    title: "Où on en est",
    computed: "Calculé à l'instant",
    empty:
      "Aucune activation pour l'instant : le bilan se remplit au fil des activations.",
    closed: (n: number, total: number) =>
      `${n} activation${s(n)} sur ${total} clôturée${s(n)}`,
    cancelled: (n: number) => `dont ${n} annulée${s(n)}`,
    proofs: (ok: number, toVerify: number, missing: number) =>
      `Preuves : ${ok} vérifiée${s(ok)}${toVerify ? `, ${toVerify} à vérifier` : ""}${missing ? `, ${missing} manquante${s(missing)}` : ""}`,
    proofsNone: "Preuves : aucune activation réalisée",
    stats: (got: number, missing: number, unavailable: number) =>
      `Statistiques : ${got} relevée${s(got)}${missing ? `, ${missing} manquante${s(missing)}` : ""}${unavailable ? `, ${unavailable} indisponible${s(unavailable)}` : ""}`,
    statsNone: "Statistiques : aucune activation réalisée",
    budget: (committed: string, envelope: string) =>
      `Budget : ${committed} engagés sur ${envelope}`,
    budgetHint: "Visible de la cheffe de projet et de la direction",
    detail: "Voir le détail",
    open: (label: string) => `Ouvrir le détail : ${label}`,
    rule: (rule: string) =>
      `Règle de calcul : ${rule}${/[.!?]$/.test(rule) ? "" : "."}`,
    none: "Aucun élément.",
    noSource: "—",
    groups: {
      activations: "Activations",
      publications: "Publications",
      coverage: "Retombées",
      statistics: "Statistiques",
      budget: "Budget",
      reserves: "Réserves",
    },
    labels: {
      all: "Activations",
      phases: [
        "À préparer",
        "À réaliser",
        "À prouver",
        "À mesurer",
        "À clôturer",
        "Clôturées",
      ],
      cancelled: "Annulées",
      proofs: "Preuves",
      stats: "Statistiques",
      budget: "Budget · Engagé",
    },
    rules: {
      all: "Activations du périmètre filtré",
      every: "Toutes les activations du projet",
      phases: [
        "Activations dont la frise est à « Préparer » : responsable, échéance ou préparation à faire",
        "Activations dont la frise est à « Réaliser »",
        "Activations réalisées dont la preuve est à fournir ou à vérifier",
        "Activations réalisées et prouvées dont les statistiques sont à collecter",
        "Activations réalisées, prouvées et mesurées, pas encore clôturées",
        "Activations clôturées",
      ],
      cancelled: "Annulées avec un motif, gardées dans le bilan",
      proofs:
        "La preuve de chaque activation réalisée : vérifiée, à vérifier ou manquante",
      stats: "Le dernier relevé de chaque activation réalisée",
      committed: "Devis validés et rémunérations acceptées",
      statistics_partial:
        "Relevé incomplet : toutes les publications ne sont pas comptées",
      statistics_unavailable: "Indisponible n'est jamais compté comme zéro",
    },
    partialMark: "partiel",
    unavailableDetail: "la plateforme ne les fournit pas",
    proof: {
      not_expected: "Non attendue",
      to_provide: "À fournir",
      provided_unverified: "Fournie, non vérifiée",
      verified: "Vérifiée",
      contested: "Contestée",
      unavailable: "Lien inaccessible, à vérifier",
    },
    measure: {
      not_expected: "Non attendues",
      to_collect: "À collecter",
      partial: "Partielles",
      available_declared: "Disponibles, déclarées",
      available_verified: "Disponibles, vérifiées",
      unavailable: "Indisponibles",
    },
    noOwner: "Responsable à désigner",
  },
  bilan: {
    prepare: (n: number) => `Préparer la version ${n}`,
    summary: "Résumé exécutif",
    summaryPlaceholder: "Ce qu'il faut retenir de la campagne",
    summaryRequired: "Écrivez le résumé exécutif.",
    recommendations: "Recommandations",
    recommendationsPlaceholder: "Pour la prochaine sortie",
    missing: "Ce qui manque",
    missingHint:
      "Relevé par le code ; ces points deviendront des réserves du bilan.",
    nothingMissing: "Rien ne manque.",
    carried: (n: number) =>
      `${n} réserve${s(n)} déjà ouverte${s(n)}, reprise${s(n)} telle${s(n)} quelle${s(n)}.`,
    options: "Options du rapport",
    from: "Du",
    to: "Au",
    fromRequired: "Le début de la période.",
    toRequired: "La fin de la période.",
    order: "La fin doit suivre le début.",
    scope: "Périmètre",
    scopeHint: "Une activation décochée est exclue et nommée dans le rapport.",
    scopeRequired: "Gardez au moins une activation.",
    scopeState: {
      cancelled: "annulée",
      closed: "clôturée",
      phase: (label: string) => label.toLowerCase(),
    },
    sections: "Sections",
    reservesToInclude: "Réserves à inclure",
    lockedReserve:
      "Activation pas terminée : elle reste une réserve, à suivre après la clôture ou à accepter comme limite.",
    missingFields: (n: number) =>
      n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
    generate: (n: number) => `Générer la version ${n}`,
    generated: (n: number) => `Version ${n} générée`,
    afterRelease: (day: string) =>
      `Le bilan se prépare après la sortie, à partir du ${day}.`,
    noActivation:
      "Aucune activation à mettre dans le bilan pour l'instant : le rapport se génère dès qu'il y en a une.",
    reports: "Rapports",
    versionTitle: (project: string, n: number) =>
      `Bilan Marketing — ${project} — V${n}`,
    generatedBy: (who: string, at: string) => `Généré par ${who} le ${at}`,
    facts: {
      status: "Statut",
      summary: "Résumé exécutif",
      period: "Période",
      periodValue: (from: string, to: string) => `du ${from} au ${to}`,
      scope: "Périmètre",
      scopeValue: (n: number, excluded: number) =>
        `${n} activation${s(n)}${excluded ? ` · ${excluded} exclue${s(excluded)}` : ""}`,
      scopeExcluded: (n: number, titles: string) =>
        `${n} activation${s(n)} · exclues : ${titles}`,
      reserves: "Réserves",
      none: "Aucune",
      generated: "Généré",
      generatedValue: (who: string, at: string) => `par ${who} le ${at}`,
      fingerprint: "Empreinte",
      fingerprintValue: (hash: string, rules: number) =>
        `${hash} · règles de calcul v${rules}`,
      frozen: "figé à la génération",
    },
    view: "Voir le rapport",
    page: "Comparer et exporter",
    exportPdf: "Exporter en PDF",
    close: "Fermer",
    submitTo: (who: string) => `Soumettre à ${who}`,
    resubmitTo: (who: string) => `Soumettre de nouveau à ${who}`,
    submitted: "Bilan soumis à validation",
    noValidator: "la direction",
    decision: {
      placeholder: "Obligatoire pour demander des corrections ou reporter",
      required: "Dites pourquoi.",
      approve: "Approuver le bilan provisoire",
      approveWithReserves: "Approuver le bilan provisoire avec réserves",
      changes: "Demander des corrections",
      postpone: "Reporter la validation",
      approved: "Bilan provisoire approuvé",
      changesDone: "Corrections demandées",
      postponed: "Validation reportée",
    },
    returned: {
      changes_requested: "demander des corrections",
      postponed: "reporter la validation",
    },
    self: "Vous avez préparé ou soumis cette version : une autre personne habilitée décide.",
  },
  reserves: {
    empty: "Le bilan approuvé n'a aucune réserve.",
    decision: "Arbitrage",
    decisions: {
      blocking: "À lever avant clôture",
      follow_up: "À suivre après clôture",
      accepted_limit: "Acceptée comme limite définitive",
      not_applicable: "Non applicable",
      duplicate: "Doublon",
    },
    duplicateOf: "Doublon de",
    person: "Qui suit",
    dueOn: "À suivre pour le",
    channel: "Canal de suivi",
    channelPlaceholder: "Ex. : point hebdomadaire, e-mail à l'agence",
    reason: "Motif",
    reasonPlaceholder:
      "Obligatoire pour une limite définitive ou « non applicable »",
    errors: {
      limit: "Une limite définitive demande un motif.",
      notApplicable: "« Non applicable » demande un motif.",
      duplicate: "Choisissez la réserve conservée.",
      person: "Choisissez qui suit.",
      due: "La date du suivi.",
      channel: "Le canal du suivi.",
    },
    choose: "Choisir",
    arbitrate: "Arbitrer",
    arbitrated: "Réserve arbitrée",
    line: {
      follow: (who: string, day: string) => ` · ${who}, pour le ${day}`,
      duplicate: (text: string) => ` de « ${text} »`,
      reason: (reason: string) => ` · « ${reason} »`,
      by: (who: string) => ` · arbitrée par ${who}`,
      lifted: (note: string) => ` · levée : « ${note} »`,
    },
    lift: "Ce qui l'a levée",
    liftRequired: "Dites ce qui l'a levée.",
    markLifted: "Marquer levée",
    lifted: "Réserve levée",
  },
  closure: {
    before: "Avant la clôture",
    approved: "Bilan provisoire approuvé",
    arbitrated: "Réserves arbitrées",
    ready: "Prêt",
    notReady: "Pas prêt",
    attention: "Attention",
    withReserves: "Avec réserves",
    openActivations: (n: number, titles: string) =>
      `${n} activation${s(n)} pas clôturée${s(n)} : ${titles}`,
    // Recette of 23/10 (MKT-BIL-001): each one followed or accepted first.
    uncovered: (n: number, titles: string) =>
      `${n} activation${s(n)} pas clôturée${s(n)} sans réserve suivie ni limite acceptée : ${titles}`,
    followed: (n: number) =>
      `${n} réserve${s(n)} suivie${s(n)} après la clôture`,
    unpaid: (amount: string) => `Engagé non payé : ${amount}`,
    legal: (state: string) => `Juridique : ${state}`,
    request: "Demander la clôture",
    requested: "Clôture demandée",
    decision: {
      placeholder: "Obligatoire pour demander des corrections",
      required: "Dites ce qui doit être corrigé.",
      closeWith: "Clôturer avec réserves",
      closeClean: "Clôturer sans réserve",
      changes: "Demander des corrections",
      postpone: "Reporter la décision",
      closed: "Marketing clôturé",
      changesDone: "Corrections demandées",
      postponed: "Décision reportée",
    },
    returned: {
      changes_requested: "demander des corrections",
      postponed: "reporter la décision",
    },
    closed: (withReserves: boolean) =>
      `Marketing clôturé ${withReserves ? "avec" : "sans"} réserve`,
    closedBy: (who: string, at: string) =>
      ` par ${who} le ${at}. Lecture seule : plus de nouvelle activation, les preuves restent acceptées.`,
    reopenTitle: "Rouvrir le Marketing",
    reason: "Motif",
    reasonPlaceholder: "Ex. : retombées presse arrivées après la clôture",
    reasonRequired: "Dites pourquoi vous rouvrez le Marketing.",
    reopen: "Rouvrir le Marketing",
    reopened: "Marketing rouvert",
    reopenedNote: (who: string, at: string, why: string) =>
      `Rouvert par ${who} le ${at} : « ${why} »`,
    self: "Vous avez demandé cette clôture : une autre personne habilitée décide.",
  },
} as const;
