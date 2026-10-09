/**
 * The Strategy workflow (ticket « Stratégie · Finalisation du workflow après
 * cadrage »): entry, pilot of the eight dimensions, work panel, Brief de
 * sortie and its validation. The documents and the follow-up are in
 * strategy-docs.ts.
 */
export const strategyFlow = {
  tabs: {
    label: "Étapes de la stratégie",
    pilot: "Pilotage",
    brief: "Brief de sortie",
    documents: "Documents",
    followUp: "Suivi",
  },
  entry: {
    title: "Stratégie de lancement",
    body: "PO part de ce que le projet sait déjà (Brief validé, calls, documents) et ne vous demande que ce qui manque.",
    readOnly:
      "Le chef de projet responsable construit la stratégie : elle apparaîtra ici.",
    start: "Commencer la stratégie",
    starting: "Ouverture…",
    prepare: "Préparer un échange",
    facts: {
      project: "Projet",
      artist: "Artiste",
      type: "Type",
      releaseDate: "Date de sortie",
      status: "Statut",
    },
    noReleaseDate: "Pas encore fixée",
    statuses: {
      not_started: "Pas commencée",
      in_progress: "En cours",
      awaiting_validation: "En attente de validation",
      validated: "Stratégie validée",
      revision: "Révision en cours",
    },
  },
  dimensionNumber: (index: number) => String(index + 1).padStart(2, "0"),
  dimensions: {
    positioning: "Positionnement",
    audiences: "Publics prioritaires",
    narrative: "Narratif de sortie",
    setup: "Dispositif",
    deliverables: "Livrables engagés",
    calendar: "Calendrier de lancement",
    budget: "Budget stratégie",
    objectives: "Objectifs & KPIs",
  },
  dimensionHints: {
    positioning: "Ce que la sortie privilégie.",
    audiences: "À qui elle s'adresse d'abord.",
    narrative:
      "L'histoire du morceau, ce qu'il raconte, pourquoi maintenant, l'angle.",
    setup: "Les leviers retenus, non retenus ou à arbitrer.",
    deliverables:
      "Ce que la stratégie exige de produire : ils deviennent les entrées de la Conception.",
    calendar:
      "Les temps forts relatifs à la sortie, par canal, et les échéances amont.",
    budget:
      "L'enveloppe par levier, validée ou à arbitrer. Interne : jamais dans le Plan de sortie ni le Dossier de presse.",
    objectives:
      "Ce que la sortie doit accomplir et les signaux qui permettront de le juger.",
  },
  states: {
    todo: "À compléter",
    in_progress: "En cours",
    to_decide: "À arbitrer",
    done: "Complété",
  },
  pilot: {
    label: "Dimensions de la stratégie",
    progress: (done: number, total: number) =>
      `${done} dimension${done > 1 ? "s" : ""} complétée${done > 1 ? "s" : ""} sur ${total}`,
    toBrief: "Voir le Brief de sortie",
    briefReady:
      "Les huit dimensions sont assez renseignées : PO peut générer le Brief de sortie.",
    briefNotReady:
      "Le Brief de sortie se génère quand aucune dimension n'est plus « À compléter » ni « En cours » (« À arbitrer » est mis en évidence dans le Brief).",
    back: "Toutes les dimensions",
    locked:
      "Stratégie envoyée en validation ou validée : elle n'est plus modifiable.",
    revision:
      "Révision ouverte : vos modifications deviendront une nouvelle version du Brief de sortie, V1 reste la référence d'ici là.",
  },
  summaries: {
    empty: "Rien pour l'instant.",
    proposed: "Proposition à confirmer.",
    narrative: (filled: number, total: number) =>
      `${filled} élément${filled > 1 ? "s" : ""} sur ${total} renseigné${filled > 1 ? "s" : ""}`,
    levers: (selected: number, toDecide: number, rejected: number) =>
      [
        selected && `${selected} retenu${selected > 1 ? "s" : ""}`,
        toDecide && `${toDecide} à arbitrer`,
        rejected && `${rejected} non retenu${rejected > 1 ? "s" : ""}`,
      ]
        .filter(Boolean)
        .join(" · "),
    deliverables: (n: number) => `${n} livrable${n > 1 ? "s" : ""}`,
    milestones: (n: number) => `${n} temps fort${n > 1 ? "s" : ""}`,
    releaseOn: (date: string) => `sortie le ${date}`,
    noReleaseDate: "date de sortie à fixer",
    budget: (proposed: string, validated: string, toDecide: string) =>
      `Proposé ${proposed} · validé ${validated} · à arbitrer ${toDecide}`,
    budgetNone: "Pas de budget dédié",
    objectives: (objective: boolean, kpis: number) =>
      [
        objective ? "Objectif défini" : "Objectif à définir",
        `${kpis} KPI${kpis > 1 ? "s" : ""}`,
      ].join(" · "),
  },
  narrative: {
    angleTitle: "L'angle à raconter",
    parts: {
      narrative_origin: "L'histoire ou l'origine du morceau",
      narrative_story: "Ce qu'il raconte",
      narrative_context: "Le contexte artistique",
      narrative_why_now: "Pourquoi il sort maintenant",
    },
    reuse:
      "Le narratif est repris dans le Plan de sortie, le Dossier de presse et les pitchs.",
  },
  setup: {
    presetsTitle: "Leviers courants",
    presets: {
      organic: "Social organique",
      influence: "Influence",
      press: "Relations presse / médias",
      playlists: "Pitching playlists",
      partnerships: "Partenariats",
    },
    add: (label: string) => `Ajouter « ${label} »`,
    detail:
      "Le détail opérationnel de chaque levier se prépare dans Activations.",
  },
  deliverables: {
    quantity: "Quantité",
    quantityShort: (n: number) => `× ${n}`,
    toDesign:
      "Une fois la stratégie validée, chaque livrable devient une entrée de la Conception.",
  },
  calendar: {
    milestonesTitle: "Temps forts",
    channelsTitle: "Vue par canaux",
    upstreamTitle: "Échéances amont",
    upstreamBody:
      "Calculées par le code depuis la date de publication : conception, production et validation avant. Elles apparaissent aussi dans le Planning.",
    upstreamEmpty:
      "Reliez un temps fort à un livrable pour voir ses échéances amont.",
    steps: {
      conception: "Conception",
      production: "Production",
      validation: "Validation",
      publication: "Publication",
    },
    late: "En retard",
    channel: "Canal",
    channels: {
      organic: "Organique",
      influence: "Influence",
      press: "RP / Médias",
      release: "Sortie",
      live: "Live / Event",
      other: "Autre",
    },
    notes: "Notes",
    add: "Ajouter un temps fort",
    edit: "Modifier",
    editTitle: "Modifier le temps fort",
    addTitle: "Nouveau temps fort",
    dialogBody:
      "La date est saisie par une personne ; le décompte J-n est calculé par le code.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    close: "Fermer",
    noneInChannel: "—",
  },
  budget: {
    title: "Budget stratégie",
    internal:
      "Strictement interne : figure dans le Brief de sortie, jamais dans le Plan de sortie ni le Dossier de presse.",
    envelope: (amount: string) => `Enveloppe du Cadrage : ${amount}`,
    noEnvelope: "Aucune enveloppe confirmée au Cadrage.",
    tiles: {
      proposed: "Budget proposé",
      validated: "Montant validé",
      toDecide: "À arbitrer",
    },
    byLever: "Répartition par levier",
    noLever: "Hors levier",
    label: "Poste",
    lever: "Levier",
    amount: "Montant (€)",
    state: "État",
    states: { validated: "Validé", to_decide: "À arbitrer" },
    add: "Ajouter",
    remove: "Retirer",
    removeLabel: (label: string) => `Retirer « ${label} »`,
    empty: "Aucune ligne de budget.",
    none: "Pas de budget dédié à cette sortie",
    noneSet: "Pas de budget dédié : la dimension est réglée.",
    undoNone: "Annuler",
    overEnvelope: (amount: string) =>
      `Le budget proposé dépasse l'enveloppe du Cadrage de ${amount}.`,
  },
  objectives: {
    objectiveTitle: "Objectif stratégique",
    objectiveHint: "Ce que la sortie doit accomplir.",
    kpisTitle: "KPIs",
    kpisHint:
      "Quelques signaux, quantitatifs ou qualitatifs. Après la sortie, leur valeur réelle est saisie ou lue à la source ; aucune n'est inventée.",
    label: "Indicateur",
    kind: "Type",
    kinds: { quantitative: "Quantitatif", qualitative: "Qualitatif" },
    target: "Cible",
    unit: "Unité",
    metric: "Source de la valeur réelle",
    metrics: {
      manual: "Saisie par l'équipe",
      deezer_fans: "Fans Deezer de l'artiste",
    },
    add: "Ajouter",
    remove: "Retirer",
    removeLabel: (label: string) => `Retirer « ${label} »`,
    empty: "Aucun KPI.",
    noTarget: "sans cible chiffrée",
  },
  call: {
    title: "Préparer un échange de stratégie",
    body: "PO propose l'objectif, les participants et les sujets à partir de ce qui manque à la stratégie. Après le call, la transcription et le compte rendu préremplissent les dimensions concernées.",
    purpose: (topics: string[]) =>
      `Avancer la stratégie de lancement : ${topics.join(", ")}.`,
    purposeConfirm:
      "Relire ensemble la stratégie de lancement avant le Brief de sortie.",
    defaultTitle: "Échange stratégie",
    questions: {
      positioning: ["Qu'est-ce que cette sortie doit privilégier ?"],
      audiences: ["À qui s'adresse-t-elle en priorité ?"],
      narrative: [
        "D'où vient le morceau, quelle est son histoire ?",
        "Que raconte-t-il ?",
        "Pourquoi sort-il maintenant ?",
        "Quel angle veut-on raconter ?",
      ],
      setup: ["Quels leviers retient-on, lesquels écarte-t-on ?"],
      deliverables: ["Que faut-il produire pour ces leviers ?"],
      calendar: [
        "Quelle date de sortie ?",
        "Quels temps forts avant et après la sortie ?",
      ],
      budget: ["Quelle enveloppe par levier, qu'est-ce qui reste à arbitrer ?"],
      objectives: [
        "Que doit accomplir la sortie ?",
        "À quels signaux jugera-t-on le résultat ?",
      ],
    },
    recap: "Récapitulatif",
    recapLine: (topics: number, people: number, minutes: number) =>
      `${topics} sujet${topics > 1 ? "s" : ""} · ${people} participant${people > 1 ? "s" : ""} · environ ${minutes} min`,
  },
} as const;
