/** Conception stage page and the Dossier de conception. */
export const design = {
  title: "Conception",
  description:
    "Le Dossier de conception : la direction créative, puis une version approuvée de chaque livrable engagé dans la Stratégie.",
  notStarted:
    "La conception n'a pas commencé. Le chef de projet la démarre une fois la Stratégie validée.",
  locked: "Dossier soumis ou validé : il n'est plus modifiable.",
  // The creative team, before the Conception opens (UX test of 09/10/2026).
  earlyDeposit:
    "En attendant, déposez vos références et premières pistes dans Fichiers › Visuels : toute l'équipe les retrouve.",
  toFiles: "Déposer dans Fichiers",
  needsStrategy: {
    title: "La conception suit la stratégie",
    body: "Faites valider la Stratégie de lancement : la conception s'ouvrira ensuite.",
    bodyReadOnly:
      "La conception s'ouvrira dès que la Stratégie de lancement aura été validée.",
    toStrategy: "Aller à la stratégie",
  },
  fields: {
    creative_direction: "Intention",
    visual_codes: "Codes visuels",
    references: "Références",
  },
  direction: {
    title: "Direction créative",
    hint: "L'intention, les codes et les références que tous les livrables suivent. Le chef de projet l'écrit ; l'équipe créative y joint ses planches.",
    boards: "Planches et moodboard",
    boardsEmpty: "Aucune planche pour l'instant.",
  },
  deliverables: {
    title: "Livrables à concevoir",
    hint: "Les livrables engagés dans la Stratégie. Chacun avance version par version, jusqu'à une version approuvée.",
    empty:
      "Aucun livrable engagé dans la Stratégie : il n'y a rien à concevoir.",
    noAssignee: "Sans responsable",
    noDueDate: "sans échéance",
    due: (date: string) => `pour le ${date}`,
  },
  states: {
    to_design: "À concevoir",
    submitted: "À relire",
    changes_requested: "À reprendre",
    approved: "Approuvé",
  },
  version: {
    label: (n: number) => `Version ${n}`,
    by: (name: string, date: string) =>
      name ? `Déposée par ${name} · ${date}` : `Déposée · ${date}`,
    open: "Ouvrir",
    download: "Télécharger",
    openLabel: (n: number) => `Ouvrir la version ${n}`,
    unavailable: "Fichier indisponible",
    link: "Lien",
    reviewedBy: (name: string, date: string) =>
      name ? `Relu par ${name} · ${date}` : `Relu · ${date}`,
    history: (n: number) =>
      n === 1 ? "1 version précédente" : `${n} versions précédentes`,
    none: "Aucune version déposée.",
    withdraw: "Retirer",
    withdrawConfirm: "Confirmer le retrait",
    withdrawLabel: (n: number) => `Retirer la version ${n}`,
  },
  review: {
    approve: "Approuver",
    requestChanges: "Demander des retouches",
    commentLabel: "Retouches attendues",
    commentPlaceholder: "Ce qu'il faut reprendre, précisément.",
    send: "Envoyer les retouches",
    cancel: "Annuler",
  },
  deposit: {
    open: "Déposer une version",
    title: (target: string) => `Nouvelle version · ${target}`,
    directionTarget: "Direction créative",
    description:
      "La version part en relecture chez le chef de projet, qui l'approuve ou demande des retouches.",
    file: "Fichier",
    link: "Lien",
    fileLabel: "Fichier",
    fileHint: "50 Mo au plus. Au-delà (clip, rushes), déposez un lien.",
    pickFile: "Choisir un fichier",
    noFile: "Aucun fichier choisi",
    urlLabel: "Adresse du fichier",
    urlPlaceholder: "https://…",
    urlHint:
      "Drive, Frame.io, WeTransfer… un lien https vers la version à relire.",
    noteLabel: "Note pour la relecture",
    notePlaceholder: "Ce qui a changé, ce qu'il faut regarder.",
    submit: "Déposer",
    submitting: "Envoi…",
    cancel: "Annuler",
  },
  progress: {
    title: "Avancement",
    summary: (approved: number, total: number) =>
      total === 0
        ? "Aucun livrable à concevoir."
        : `${approved} livrable${approved > 1 ? "s" : ""} approuvé${approved > 1 ? "s" : ""} sur ${total}.`,
    toStrategy: "Revoir la Stratégie",
  },
  validation: {
    title: "Validation du Dossier",
    start: "Commencer la conception",
    strategyFirst:
      "La Stratégie doit être validée avant de commencer la conception.",
  },
} as const;
