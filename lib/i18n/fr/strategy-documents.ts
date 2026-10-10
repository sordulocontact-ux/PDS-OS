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
    consequencesTitle: "Et maintenant",
    consequencesBody:
      "La validation n'oblige pas à lancer la suite tout de suite : chaque étape s'ouvre quand l'équipe est prête.",
    consequences: {
      design: {
        title: "Conception",
        body: "Transforme les livrables décidés en contenus et en assets.",
      },
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
  pdfFileName: (title: string, kind: string, n: number) =>
    `${kind} V${n} - ${title}.pdf`,
} as const;
