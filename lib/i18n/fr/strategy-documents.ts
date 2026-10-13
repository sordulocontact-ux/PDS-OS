/** Documents of the Stratégie (steps 9-10): validation circuit, versions, validated screen. */
export const strategyDocuments = {
  kinds: {
    brief: "Brief de sortie",
    release_plan: "Plan de sortie",
    press_kit: "Dossier de presse",
  },
  version: (n: number) => `V${n}`,
  titleVersion: (kind: string, n: number) => `${kind} — V${n}`,
  // A version's state (strategy_documents.state).
  states: {
    pending: "Prête à envoyer",
    sent: "En attente de validation",
    approved: "Validé",
    changes_requested: "Modification demandée",
    superseded: "Remplacée",
  },
  // A reviewer's state; « Non commencé »: the round ended before they
  // answered (another reviewer asked for a change).
  reviewStates: {
    pending: "En attente",
    approved: "Validé",
    changes_requested: "Modification demandée",
    cancelled: "Non commencé",
  },
  close: "Fermer",
  cancel: "Annuler",
  toGenerate: "À générer",
  request: {
    open: "Demander la validation",
    title: "Demander la validation du Brief de sortie",
    body: "PO fige le Brief tel qu'il est affiché en une nouvelle version. Pendant la relecture, la stratégie est figée et aucun Plan de sortie ni Dossier de presse final n'est généré.",
    director: "Directeur général",
    directorAlways: "Valide toujours",
    addReviewers: "Ajouter des directeurs créatifs du projet",
    noCreatives: "Aucun directeur créatif dans l'équipe du projet.",
    note: "Message aux valideurs",
    send: "Envoyer en validation",
    sending: "Envoi…",
    sent: "Brief envoyé en validation.",
    notReady:
      "Le Brief de sortie doit être établi (chaque dimension au moins commencée) avant d'être envoyé.",
    // MKT-S1-16: what is sent, said before sending.
    recap: (version: number, critical: number) =>
      `Envoyé : Brief de sortie V${version}, figé à l'envoi, en attente de validation.${
        critical === 0
          ? ""
          : critical === 1
            ? " 1 alerte critique devra être acceptée par qui valide."
            : ` ${critical} alertes critiques devront être acceptées par qui valide.`
      }`,
    creativeRole: "Directeur créatif du projet",
  },
  review: {
    title: "Validation",
    who: "Personnes qui valident",
    waiting:
      "En attente de validation : la stratégie est figée, aucun Plan de sortie ni Dossier de presse final n'est généré d'ici là.",
    comments: "Commentaires",
    remind: "Relancer",
    reminded: "Relance envoyée.",
    remindedOn: (date: string) => `Relancé le ${date}`,
    decidedOn: (date: string) => `le ${date}`,
    note: (text: string) => `Message : ${text}`,
    youDecide: "Votre décision est attendue sur cette version.",
    commentLabel: "Commentaire",
    commentRequired: "Dites ce qu'il faut modifier.",
    approve: "Valider",
    requestChanges: "Demander une modification",
    changeRequested: (comment: string) => `Modification demandée : ${comment}`,
    // MKT-S1-16.
    approveWithReserves: "Valider avec réserves",
    approveReserves: (n: number) =>
      n === 1 ? "Valider avec 1 réserve" : `Valider avec ${n} réserves`,
    addReserve: "Ajouter une réserve",
    cancelReserves: "Valider sans réserve",
    missing: (n: number) =>
      n === 1
        ? "1 point à compléter avant d'envoyer votre décision."
        : `${n} points à compléter avant d'envoyer votre décision.`,
    alertsTitle: "Alertes critiques à accepter",
    alertsHint:
      "Valider, c'est accepter chacune en connaissance de cause. Sinon, demandez une modification.",
    alertsMissing: "Acceptez chaque alerte, ou demandez une modification.",
    accepted: (n: number) =>
      n === 1
        ? "1 alerte critique acceptée"
        : `${n} alertes critiques acceptées`,
    withReserves: "avec réserves",
  },
  reserves: {
    title: "Réserves",
    number: (n: number) => `Réserve ${n}`,
    remove: (n: number) => `Retirer la réserve ${n}`,
    text: "Ce qui doit être levé",
    owner: "Responsable",
    due: "Échéance",
    textRequired: "Dites ce qui doit être levé.",
    ownerRequired: "Choisissez qui la lève.",
    dueRequired: "Donnez une échéance.",
    duePast: "L'échéance est déjà passée.",
    listTitle: "Réserves de validation",
    open: "À lever",
    lifted: "Levée",
    line: (owner: string, due: string) => `${owner} · avant le ${due}`,
    liftedLine: (name: string, date: string) => `Levée par ${name} le ${date}`,
    from: (name: string, version: number) =>
      `Posée par ${name} sur la V${version}`,
    lift: "Lever",
    liftTitle: "Lever la réserve",
    liftBody:
      "Dites comment elle a été levée : la note reste dans l'historique de la réserve.",
    liftNote: "Comment elle a été levée",
    liftedToast: "Réserve levée.",
  },
  changes: {
    title: (n: number) => `Changements depuis la V${n}`,
    none: "Aucun changement de contenu depuis la version précédente.",
    added: "Ajouté",
    removed: "Retiré",
    changed: "Modifié",
    before: "Avant",
    after: "Après",
    main: "Texte principal",
  },
  execution: {
    title: "Plan d'exécution",
    body: "Ce que le Brief validé devient dans l'exécution, proposé par le code. Rien n'est créé avant votre confirmation, et rien deux fois.",
    activation: (title: string) => `Activation · ${title}`,
    task: (title: string, who: string, due: string) =>
      `Tâche « Livrer : ${title} » · ${who} · ${due}`,
    conception: (n: number) =>
      n === 0
        ? "Aucun livrable engagé dans la Conception."
        : n === 1
          ? "1 livrable engagé est déjà dans la Conception, qui alimente la Production."
          : `${n} livrables engagés sont déjà dans la Conception, qui alimente la Production.`,
    unplanned: (titles: string) =>
      `Sans responsable ou sans échéance, à planifier d'abord dans la Stratégie : ${titles}.`,
    existing: (n: number) =>
      n === 1 ? "1 élément déjà en place." : `${n} éléments déjà en place.`,
    nothing: "Tout ce que le Brief engage est déjà en place.",
    create: (n: number) =>
      n === 1 ? "Créer 1 élément" : `Créer ${n} éléments`,
    confirmTitle: "Confirmer le plan d'exécution",
    confirmBody: (n: number, version: number) =>
      `${n === 1 ? "1 élément sera créé" : `${n} éléments seront créés`}, chacun relié à son levier ou à son livrable et au Brief V${version}. Un élément déjà créé n'est jamais refait.`,
    creating: "Création…",
    created: (n: number) =>
      n === 0
        ? "Rien de nouveau : tout était déjà créé."
        : n === 1
          ? "1 élément créé."
          : `${n} éléments créés.`,
    madeTitle: "Créé depuis le Brief",
    made: (label: string, version: number | null) =>
      version ? `${label} · Brief V${version}` : label,
    open: "Ouvrir",
  },
  history: {
    title: "Historique",
    entry: (date: string, name: string) => `Établie le ${date} par ${name}`,
    sentOn: (date: string) => `envoyée le ${date}`,
    decision: (name: string, state: string, date: string) =>
      `${name} · ${state} le ${date}`,
  },
  versionView: {
    validatedTitle: (n: number) => `Brief de sortie — V${n}`,
    frozen: (date: string) =>
      `Version figée, validée le ${date}. Elle ne change plus : une révision crée une nouvelle version.`,
    snapshotOf: (date: string) => `Établie le ${date}`,
    backToLive: "Brief en cours",
    notFound: "Cette version n'existe pas.",
    seeVersion: (n: number) => `Voir la V${n}`,
  },
  actions: {
    view: "Voir",
    share: "Partager",
    shared:
      "Lien copié : il s'ouvre dans l'application, pour l'équipe du projet.",
    pdf: "PDF",
    versions: "Versions",
    internal:
      "Document interne : partagé dans l'application, jamais par un lien public.",
  },
  revision: {
    open: "Réviser la stratégie",
    title: "Réviser la stratégie ?",
    body: "La stratégie redevient modifiable. Vos changements formeront une nouvelle version du Brief, validée par le même circuit ; la V1 reste la référence d'ici là et n'est jamais écrasée.",
    confirm: "Ouvrir une révision",
    running: (n: number) =>
      `Révision en cours — la V${n} reste la référence jusqu'à la validation de la nouvelle version.`,
  },
  validated: {
    title: "Stratégie validée",
    body: (n: number) =>
      `Le Brief de sortie — V${n} est la référence. Les documents externes se construisent depuis lui.`,
    documents: "Documents",
    // MKT-C2-01: the one next action, above the documents.
    next: {
      title: "Prochaine étape : la Conception",
      start: "Passer à la conception",
      resume: "Reprendre la conception",
      view: "Voir la conception",
      body: (n: number) =>
        `La Conception s'ouvre sur son accueil avec ${
          n === 0
            ? "les livrables de cette stratégie"
            : n === 1
              ? "le livrable engagé par cette stratégie"
              : `les ${n} livrables engagés par cette stratégie`
        }, leurs échéances et leurs responsables. Vous y choisissez de commencer directement ou de préparer un échange créatif, dont PO tire des propositions d'intentions à confirmer.`,
      keeps: (n: number) =>
        `Le Brief de sortie V${n} reste tel quel : rien n'est recréé ni modifié.`,
      started:
        "La Conception est commencée : son accueil montre où en est chaque livrable.",
      locked: "La Conception est soumise ou validée.",
      readOnly:
        "Le chef de projet démarre la Conception ; vous pouvez déjà consulter son accueil.",
    },
    consequencesTitle: "Ensuite, quand l'équipe est prête",
    consequencesBody:
      "La validation n'oblige pas à tout lancer tout de suite : chaque étape s'ouvre quand l'équipe est prête.",
    consequences: {
      activations: {
        title: "Activations",
        body: "Prépare et exécute l'influence, les RP, la diffusion et le partage.",
      },
      planning: {
        title: "Planning",
        body: "Reçoit les échéances et les dépendances du calendrier de lancement.",
      },
    },
  },
  // MKT-C2-01: the eight dimensions, folded under the validated strategy.
  consult: {
    title: "Consulter la stratégie validée",
    summary: (counts: {
      complete: number;
      to_decide: number;
      to_complete: number;
      in_progress: number;
    }) =>
      [
        counts.complete === 1
          ? "1 rubrique complétée"
          : `${counts.complete} rubriques complétées`,
        counts.to_decide ? `${counts.to_decide} à arbitrer` : null,
        counts.to_complete ? `${counts.to_complete} à compléter` : null,
        counts.in_progress ? `${counts.in_progress} en cours` : null,
      ]
        .filter(Boolean)
        .join(" · ") +
      (counts.complete === 8
        ? "."
        : " : validées avec ces manques, elles restent signalées."),
  },
  // What each document is for (MKT-C2-01), under its audience.
  usage: {
    brief: "Référence interne validée : la source de vérité de la stratégie.",
    release_plan:
      "Version opérationnelle de la stratégie, pour l'équipe artiste.",
    press_kit: "Support externe pour les médias.",
  },
  optional: "Facultatif",
  pdfFileName: (title: string, kind: string, n: number) =>
    `${kind} V${n} - ${title}.pdf`,
} as const;
