// The Cadrage as a journey of four steps (proto « Projet complet », module
// framing: FR_STEPS, frActors, frSummary, frEntry, frDims, frBrief,
// frPlanView). Exact words of the proto; written here, never in components.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const framingJourney = {
  module: "Cadrage",
  owner: "Responsable du projet",
  validatorRole: "Validation de la direction",
  // « Qui fait quoi » of the Cadrage.
  roleWhat: {
    owner: "Mène le cadrage, crée le Brief et lance le plan",
    validator: "Valide le Brief de cadrage",
  },
  // « S'ouvre quand Les 6 dimensions est fait. » (proto, Marketing wording).
  blocked: (prereqs: string) =>
    prereqs.includes(" et ")
      ? `S'ouvre quand ${prereqs} sont faits.`
      : `S'ouvre quand ${prereqs} est fait.`,
  // NowCard: the proto said « Le Marketing avance… » here (defect, § 7).
  now: {
    waitingTitle: "Le Cadrage avance sans vous pour l'instant",
    finished: "Le Cadrage est terminé",
  },
  steps: {
    start: {
      title: "Démarrer le cadrage",
      titleCall: "Échange de cadrage",
      titleDirect: "Départ",
      why: "Commencer directement avec PO, ou préparer un échange : les deux chemins mènent au même Brief de cadrage.",
    },
    dimensions: {
      title: "Les 6 dimensions",
      why: "Ce que le projet sait déjà, ce qui reste à confirmer, ce qui manque. PO pose une question à la fois et ne redemande jamais ce qui est connu.",
    },
    brief: {
      title: "Brief de cadrage",
      why: "Les 6 dimensions dans un document versionné, avec leurs sources. La direction le valide ; une demande de modification ne rouvre que les dimensions concernées.",
    },
    plan: {
      title: "Plan du projet",
      why: "Ce qui commence maintenant, ce qui suit, ce qui avance en parallèle, ce qu'il faut prévoir. Rien ne démarre avant « Lancer le plan ».",
    },
  },
  todo: {
    start: "Démarrer le cadrage",
    hold: "Tenir l'échange de cadrage",
    answer: (n: number) =>
      `Répondre à ${plural(n, "question", "questions")} de PO`,
    createBrief: "Créer le Brief de cadrage",
    createVersion: (n: number) => `Créer la version ${n} du Brief`,
    send: "Envoyer le Brief en validation",
    validate: "Valider le Brief de cadrage",
    launch: "Lancer le plan du projet",
  },
  summary: {
    exchange: (day: string) => `Échange du ${day}`,
    direct: "Commencé directement",
    confirmed: (n: number) =>
      plural(n, "information confirmée", "informations confirmées"),
    validated: (n: number) => `Version ${n} validée`,
    launched: (day: string) => `Lancé le ${day}`,
  },
  // « Ensuite » of the plan: the Stratégie's first step.
  strategyNext: { module: "Stratégie", label: "Démarrer la stratégie" },
  // Gestures, for the toast and the result banner (rule 7).
  done: {
    started: "Cadrage commencé",
    briefCreated: "Brief créé",
    briefSent: "Brief envoyé en validation",
    briefValidated: "Brief validé",
    changesRequested: "Modification demandée",
    planSaved: "Plan enregistré",
    planLaunched: "Plan lancé",
  },
  start: {
    accepted: "Prise en charge",
    acceptedValue: (day: string, name: string | null) =>
      name ? `Acceptée le ${day} par ${name}` : `Acceptée le ${day}`,
    project: "Projet",
    projectValue: (
      title: string,
      kind: string,
      artist: string | null,
      day: string | null,
    ) =>
      [
        `« ${title} » · ${kind.toLowerCase()}${artist ? ` de ${artist}` : ""}`,
        day ? `sortie visée le ${day}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    knownTitle: "Ce que le projet sait déjà",
    known: (known: number, toConfirm: number, missing: number) =>
      `${plural(known, "information connue", "informations connues")} · ${toConfirm} à confirmer · ${plural(missing, "manquante", "manquantes")}. PO ne redemandera pas ce qui est connu.`,
    detail: "Voir le détail",
    notKnown: "Pas encore connu",
    choices: {
      po: {
        title: "Commencer le cadrage",
        body: "PO pose une question à la fois, dans les 6 dimensions, et ne redemande jamais ce qui est connu.",
      },
      call: {
        title: "Préparer un échange",
        body: "Un call avec le management ; PO en tire des propositions, chacune avec la phrase exacte.",
      },
    },
    // Only when the exchange is recommended (proto).
    reason: (missing: number, toConfirm: number) =>
      `Il manque ${plural(missing, "information", "informations")} et ${toConfirm} ${toConfirm > 1 ? "sont" : "est"} à confirmer : un échange ira plus vite que des questions une à une.`,
    waiting: (name: string) => `En attente de ${name} : démarrer le cadrage`,
    departure: "Départ",
    departureCall: (when: string) => `Échange de cadrage du ${when}`,
    departureDirect: (name: string | null, when: string) =>
      name
        ? `Commencé directement par ${name} le ${when}`
        : `Commencé directement le ${when}`,
    choseCall: "Préparer un échange",
    chosenBy: (name: string) => `· choisi par ${name}`,
    change: "Changer",
    openCall: "Ouvrir le call",
    processing:
      "L'échange est enregistré : la transcription puis le compte rendu se font sur la page du call. PO propose ensuite ce qui a été dit dans « Les 6 dimensions ».",
    meetingName: "Échange de cadrage",
    summaryNext: "Le Brief de cadrage part en validation",
  },
  dimensions: {
    progress: (confirmed: number, total: number) =>
      `Confirmation humaine · ${confirmed}/${total}`,
    complete6: (n: number) =>
      ` · ${plural(n, "dimension complète", "dimensions complètes")} sur 6`,
    question: "Question de PO",
    missing: "Information manquante",
    toConfirm: "À confirmer",
    toTreat: (n: number) => `${n} à traiter`,
    complete: "Complète",
    answer: "Répondre",
    done: "Les 6 dimensions sont complètes.",
    doneBody: "Le Brief de cadrage peut être créé.",
    frozen: (name: string) =>
      `Le cadrage est figé pendant la relecture du Brief par ${name}.`,
    waiting: (name: string) =>
      `En attente de ${name} : répondre aux questions de PO`,
    states: {
      known: "Connu",
      confirmed: "Confirmé",
      to_confirm: "À confirmer",
      missing: "Manquant",
      na: "Non applicable",
      later: "À définir plus tard",
      toReview: "À revoir",
    },
    confirmedBy: (name: string) => `Confirmé par ${name}`,
    na: (reason: string) => `Non applicable · « ${reason} »`,
    later: (day: string) => `À définir avant le ${day}`,
    toReview: (name: string, comment: string) =>
      `À revoir · demande de ${name} : « ${comment} »`,
    dictation:
      "La dictée reste disponible pour remplir plusieurs réponses d'un coup.",
  },
  brief: {
    versionTitle: (n: number) => `Brief de cadrage · version ${n}`,
    created: (name: string | null, when: string) =>
      name ? `Créée par ${name} le ${when}` : `Créée le ${when}`,
    notYet: (n: number) =>
      `Le Brief se crée quand les 6 dimensions sont complètes : ${plural(n, "point", "points")} à traiter dans « Les 6 dimensions ».`,
    create: "Créer le Brief",
    createVersion: (n: number) => `Créer la version ${n}`,
    sendTo: (name: string) => `Envoyer en validation à ${name}`,
    question: "Le projet est-il assez clair pour que PO organise la suite ?",
    toReview: "Dimensions à revoir",
    comment: "Commentaire",
    commentHint: "Obligatoire pour demander une modification",
    approve: "Valider le Brief",
    requestChange: "Demander une modification",
    dimsRequired: "Cochez au moins une dimension à revoir.",
    commentRequired: "Dites ce qui doit changer.",
    returned: (name: string, comment: string, dims: string) =>
      `Retour de ${name} : « ${comment} » · ${dims}`,
    validated: "✓ Brief validé · ✓ Cadrage terminé.",
    validatedBody: (name: string | null, when: string) =>
      `Validé par ${name ?? "la direction"} le ${when}. PO propose maintenant le plan du projet.`,
    waiting: (name: string) =>
      `En attente de ${name} : valider le Brief de cadrage`,
    more: "Corrections détaillées, comparaison et export",
    detailed: "Demander des corrections détaillées",
    openRequests: (n: number) =>
      `${plural(n, "demande obligatoire reste ouverte", "demandes obligatoires restent ouvertes")} : elle${n > 1 ? "s" : ""} empêche${n > 1 ? "nt" : ""} de valider. Levez-la${n > 1 ? "s" : ""} ou demandez une modification.`,
  },
  plan: {
    po: "PO propose l'organisation à partir du Brief validé. Modifiez-la si besoin : rien ne démarre avant « Lancer le plan ».",
    launched: (name: string | null, when: string) =>
      `par ${name ?? "—"} le ${when}. Les workflows du plan ont démarré.`,
    launchedStrong: "Plan lancé",
    group: "Marketing",
    columnOf: (name: string) => `Colonne de ${name}`,
    pilotOf: (name: string) => `Pilote de ${name}`,
    save: "Enregistrer le plan",
    saved: "Plan enregistré.",
    cancel: "Annuler",
    waiting: (name: string) =>
      `En attente de ${name} : lancer le plan du projet`,
    details: "Détail de chaque étape, ajouts et revue",
    stepsTitle: "Étapes du plan et historique",
  },
} as const;
