/** Marketing › Production: each deliverable up to « Livré ». */
export const production = {
  title: "Production",
  stage: "Étape Production",
  start: "Commencer la production",
  notStarted:
    "Commencez la production pour déposer les fichiers finaux et livrer.",
  locked: "La production n'est plus en cours : rien ne change ici.",
  finishHint:
    "Demandez la validation une fois chaque livrable livré : la direction clôt alors l'étape.",
  empty: "Aucun livrable engagé : ils se décident dans la Stratégie.",
  emptyTitle: "Aucun livrable",
  toStrategy: "Ouvrir la Stratégie",
  source: (n: number) => `Conception validée : version ${n}`,
  noSource: "Pas encore de version validée en Conception",
  openSource: "Voir",
  assignee: (name: string) => `Confié à ${name}`,
  due: (date: string) => `pour le ${date}`,
  states: {
    no_file: "Fichier final attendu",
    to_approve: "Version à valider",
    to_check: "Exports à contrôler",
    to_deliver: "Conforme, à livrer",
    delivered: "Livré",
  },
  stats: {
    no_file: "Fichier attendu",
    to_approve: "À valider",
    to_check: "À contrôler",
    to_deliver: "À livrer",
    delivered: "Livrés",
  },
  steps: {
    approve: "Valider la version finale",
    check: "Exports contrôlés",
    deliver: "Marquer comme livré",
    reopen: "Rouvrir",
  },
  stepHints: {
    approve:
      "La validation créative : la version correspond-elle à ce qui était attendu ?",
    check:
      "Le contrôle technique : formats, durée, image, son, sous-titres, nommage. Un commentaire absent ne vaut pas contrôle.",
    deliver: "Les fichiers attendus sont remis : le livrable est livré.",
    reopen:
      "Les décisions prises sur ce fichier sont annulées : le livrable repasse à « Version à valider ».",
    reopenOnVersion:
      "Le contrôle technique et la livraison sont annulés ; la version validée reste validée.",
  },
  decided: {
    approve: (who: string, date: string) =>
      `Version validée par ${who} le ${date}`,
    check: (who: string, date: string) =>
      `Exports contrôlés par ${who} le ${date}`,
    deliver: (who: string, date: string) => `Livré par ${who} le ${date}`,
  },
  final: "Fichier final",
  finalAdd: "Ajouter le fichier final",
  finalReplace: "Remplacer le fichier",
  finalTitle: "Fichier final",
  finalDescription:
    "Le lien vers les exports (Drive, Frame.io, WeTransfer…). Un nouveau fichier annule les validations du précédent.",
  finalDescriptionOnVersion:
    "Le lien vers les exports (Drive, Frame.io, WeTransfer…). Un nouveau fichier rouvre le contrôle technique et la livraison ; la version validée reste validée.",
  finalUrl: "Lien du fichier",
  finalUrlHint: "Commence par https://",
  finalUrlProposed: (n: number) =>
    `Lien de la V${n} validée, à remplacer par le dossier des exports s'il est ailleurs.`,
  finalNote: "Note",
  finalNoteHint: "Par exemple : formats livrés, version.",
  open: "Ouvrir",
  save: "Enregistrer",
  saving: "Enregistrement…",
  cancel: "Annuler",
  close: "Fermer",
  moreActions: "Plus d'actions",
  errors: {
    url: "Le lien doit commencer par https://",
    forbidden:
      "Seul le responsable du projet fait cette étape (la validation créative est aussi ouverte aux directeurs créatifs du projet).",
    locked: "La production n'est pas en cours.",
    order:
      "Une étape à la fois : version validée, puis exports contrôlés, puis livré.",
    generic: "L'enregistrement a échoué. Réessayez.",
  },
} as const;

/** Vue d'ensemble › Clôture du projet: the review that closes the whole project,
 * a process apart from the Marketing closing (ticket « Suivi & bilan »). */
export const projectReview = {
  title: "Clôture du projet",
  description:
    "Le bilan du projet entier, validé par la direction, clôt le projet. La clôture du Marketing est une décision à part.",
  stage: "Bilan & clôture du projet",
  start: "Commencer le bilan",
  notStarted: "Commencez le bilan pour l'écrire, puis demandez la clôture.",
  locked: "Le bilan est envoyé : il ne change plus.",
  closed: "Projet clos : le bilan a été validé.",
  closeHint:
    "Une fois le bilan écrit, demandez la validation : la direction clôt le projet.",
  fields: {
    results: "Résultats",
    resultsHint: "Ce que le projet a produit : chiffres, retombées, livrables.",
    worked: "Ce qui a marché",
    improve: "À améliorer la prochaine fois",
  },
  save: "Enregistrer le bilan",
  saving: "Enregistrement…",
  saved: "Bilan enregistré.",
  empty: "Pas encore de bilan.",
  workflows: "Où en sont les workflows",
  errors: {
    forbidden: "Seul le responsable du projet écrit le bilan.",
    locked: "Le bilan ne s'écrit que pendant l'étape « Bilan & clôture ».",
    generic: "L'enregistrement a échoué. Réessayez.",
  },
} as const;
