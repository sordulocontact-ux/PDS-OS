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
    start: "Choisir comment démarrer",
    hold: "Tenir l'échange de cadrage",
    holdOn: (day: string) => `Tenir l'échange du ${day}`,
    answer: (n: number) =>
      `Répondre à ${plural(n, "question", "questions")} de PO`,
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
        body: "Un échange avec la direction ; PO en tire des propositions, chacune avec la phrase exacte.",
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
    // « Annuler l'échange » (Sacha 28/10): back to the two ways in.
    cancel: {
      label: "Annuler l'échange",
      title: "Annuler l'échange de cadrage ?",
      body: (when: string) =>
        `L'échange du ${when} est supprimé, avec son invitation. Vous revenez au choix : commencer le cadrage avec PO ou préparer un autre échange.`,
      keep: "Garder l'échange",
      pending: "Annulation…",
      done: "Échange annulé",
      googleFailed:
        "Échange annulé, mais Google n'a pas pu retirer l'invitation : prévenez les participants.",
      errors: {
        recorded:
          "L'échange a déjà été enregistré : il ne peut plus être annulé.",
        forbidden: "Seul le responsable du projet peut annuler l'échange.",
        generic: "L'échange n'a pas pu être annulé. Réessayez.",
      },
    },
    meetingName: "Échange de cadrage",
    summaryNext: "Le Brief de cadrage part en validation",
  },
  dimensions: {
    question: "Question de PO",
    missing: "Information manquante",
    toConfirm: "À confirmer",
    toTreat: (n: number) => `${n} à traiter`,
    complete: "Complète",
    answer: "Répondre",
    currentQuestion: "Question en cours",
    listTitle: "Les 6 dimensions",
    done: "Les 6 dimensions sont complètes.",
    doneBody: "Le Brief de cadrage peut être envoyé en validation.",
    // The banner after an answer (lot 3 of Ibé's feedback): the verb of
    // the button, then the question's name.
    answered: (done: string, label: string) => `${done} · ${label}`,
    gesture: {
      confirmed: "Réponse confirmée",
      saved: "Réponse enregistrée",
      dismissed: "Question écartée",
      skipped: "Question passée",
      notApplicable: "Marquée non applicable",
      later: "Reportée, avec une tâche",
    },
    frozen: (name: string) =>
      `Le cadrage est figé pendant la relecture du Brief par ${name}.`,
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
    sendTo: (name: string) => `Envoyer en validation à ${name}`,
    // While it runs (lot 3 of Ibé's feedback).
    sending: "Envoi en validation…",
    question: "Le projet est-il assez clair pour que PO organise la suite ?",
    approve: "Valider le Brief",
    requestChange: "Demander une modification",
    // The direction marks the dimensions in the document it reads (Sacha
    // 29/10/2026).
    mark: "Marquer à revoir",
    marked: "À revoir",
    markHint:
      "Marquez dans le Brief les dimensions à revoir : seules celles-là se rouvrent.",
    markedList: (names: string) =>
      `À revoir : ${names}. Seules ces dimensions se rouvrent.`,
    whatChanges: "Ce qui doit changer",
    sendRequest: "Envoyer la demande",
    dimsRequired: "Marquez au moins une dimension à revoir dans le Brief.",
    commentRequired: "Dites ce qui doit changer.",
    returned: (name: string, comment: string, dims: string) =>
      `Retour de ${name} : « ${comment} » · ${dims}`,
    validatedMeta: (name: string | null, when: string) =>
      `validée par ${name ?? "la direction"} le ${when}`,
    // The version to send, made from the 6 dimensions at the gesture.
    draftMeta: "Faite depuis les 6 dimensions, créée à l'envoi",
    changedSince: (version: number, list: string) =>
      `Changé depuis la version ${version} : ${list}`,
    change: (label: string, before: string, after: string) =>
      `${label}, ${before} → ${after}`,
    previous: (n: number) =>
      n > 1 ? `Versions précédentes (${n})` : "Version précédente",
    detailed: "Demander des corrections détaillées",
    openRequests: (n: number) =>
      `${plural(n, "demande obligatoire reste ouverte", "demandes obligatoires restent ouvertes")} : elle${n > 1 ? "s" : ""} empêche${n > 1 ? "nt" : ""} de valider. Levez-la${n > 1 ? "s" : ""} ou demandez une modification.`,
  },
  plan: {
    // The proposal, in one card (proto « Suite du Cadrage », Sacha 29/10/2026).
    title: "Organisation du projet",
    proposedFrom: (version: number | null) =>
      version
        ? `Proposée par PO à partir du Brief de cadrage · version ${version}`
        : "Proposée par PO à partir du Brief de cadrage",
    launchedMeta: (name: string | null, when: string) =>
      `Lancée par ${name ?? "—"} le ${when}`,
    starts: (list: string) =>
      `Lancer le plan démarre : ${list}. Chaque pilote voit son étape dans Travail.`,
    moreSettings: "Autres réglages",
    modifyStep: (name: string) => `Modifier ${name}`,
    group: "Marketing",
    columnOf: (name: string) => `Colonne de ${name}`,
    pilotOf: (name: string) => `Pilote de ${name}`,
    details: "Détail de chaque étape, ajouts et revue",
    stepsTitle: "Étapes du plan et historique",
  },
} as const;
