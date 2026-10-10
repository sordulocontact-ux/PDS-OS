/** Conception, étape 6: moodboards and references, one resource for many deliverables. */
export const conceptionRefs = {
  title: "Références",
  description:
    "Moodboards, images, PDF, vidéos ou liens. Une référence sert à un ou plusieurs livrables ; elle reste une proposition tant que la direction artistique ne l'a pas validée.",
  readOnly:
    "Le chef de projet, l'équipe créative et les responsables désignés déposent les références pendant la conception.",

  unattached: "À rattacher",
  unattachedHint: "Déposées sans livrable : choisissez à quoi elles servent.",
  direction: "Direction créative",
  directionHint: "Ce que tous les livrables partagent.",
  empty: "Aucune référence pour l'instant.",
  emptyTarget: "Aucune référence rattachée.",
  alsoFor: (targets: string) => `Sert aussi à : ${targets}`,

  statuses: {
    proposed: "Proposée",
    validated: "Validée",
  },
  kinds: {
    image: "Image",
    pdf: "PDF",
    video: "Vidéo",
    other: "Fichier",
    link: "Lien",
  },
  open: "Ouvrir",
  openLabel: (name: string) => `Ouvrir ${name} dans un nouvel onglet`,
  unavailable: "Fichier indisponible",

  add: {
    open: "Déposer des références",
    title: "Déposer des références",
    description:
      "Un moodboard complet, plusieurs références séparées, ou un lien. Une même référence n'est jamais stockée deux fois : elle est rattachée à plusieurs livrables.",
    file: "Fichiers",
    link: "Lien",
    kindLabel: "Type de référence",
    dropLabel: "Glissez des fichiers ici, ou cliquez pour les choisir",
    dropHint: "Images, PDF ou vidéos, 50 Mo au plus chacun.",
    chosen: (n: number) =>
      n === 1 ? "1 fichier choisi" : `${n} fichiers choisis`,
    removeFile: (name: string) => `Retirer ${name}`,
    urlLabel: "Lien",
    urlPlaceholder: "https://…",
    urlHint: "Une vidéo, une image, un moodboard en ligne.",
    titleLabel: "Titre",
    titlePlaceholder: "Ex. Lumière rasante, profil",
    noteLabel: "Note",
    notePlaceholder: "Ce qu'on en retient : la lumière, le cadrage, le rythme.",
    targetsLegend: "Sert à",
    targetsHint: "Aucun choix : la référence reste « À rattacher ».",
    submit: "Déposer",
    submitting: "Dépôt…",
    cancel: "Annuler",
    close: "Fermer",
    added: (n: number) =>
      n === 1 ? "Référence déposée" : `${n} références déposées`,
    deduped: (name: string) =>
      `« ${name} » était déjà déposée : rattachée en plus aux livrables choisis.`,
    tooLarge: (name: string) => `« ${name} » dépasse 50 Mo.`,
    wrongType: (name: string) =>
      `« ${name} » n'est ni une image, ni un PDF, ni une vidéo.`,
    nothing: "Choisissez au moins un fichier, ou collez un lien.",
  },

  actions: {
    label: (name: string) => `Actions sur ${name}`,
    attach: "Rattacher",
    edit: "Modifier",
    remove: "Retirer",
  },
  attach: {
    title: "Rattacher la référence",
    description:
      "Choisissez les livrables qu'elle sert. La même ressource est partagée, jamais recopiée.",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    saved: "Rattachements enregistrés",
  },
  edit: {
    title: "Modifier la référence",
    description: "Son titre et ce qu'on en retient.",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    saved: "Référence modifiée",
  },
  remove: {
    title: "Retirer cette référence ?",
    body: "Elle disparaît de tous les livrables qu'elle sert. Une version déjà soumise la garde dans son historique.",
    confirm: "Retirer la référence",
    pending: "Retrait…",
    done: "Référence retirée",
  },

  errors: {
    upload: "Le fichier n'a pas pu être envoyé. Réessayez.",
    invalid: "Vérifiez la référence : lien https, titre et note courts.",
  },
};
