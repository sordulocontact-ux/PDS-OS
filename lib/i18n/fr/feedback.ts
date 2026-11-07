/**
 * Feedback: the team tells the director what to fix or add; the director
 * sends what matters, with a priority, to whoever builds the app.
 */
export const feedback = {
  navLink: "Envoyer un retour",
  title: "Retours",
  subtitle:
    "Un bug, une idée, une gêne ? Écrivez-le : le directeur général lit chaque retour et transmet les plus utiles à l'équipe qui construit PDS OS.",
  subtitleReader:
    "Les retours de l'équipe, un par un. Choisissez ceux à transmettre à l'équipe qui construit PDS OS, avec leur priorité.",
  newFeedback: "Nouveau retour",

  dialog: {
    title: "Envoyer un retour",
    description:
      "Il arrive au directeur général, qui le transmet s'il est utile.",
    close: "Fermer",
  },
  // The director's own feedback: no inbox, straight to Notion.
  directDialog: {
    title: "Envoyer un retour sur Notion",
    description:
      "Il part directement dans le suivi de l'équipe produit (Notion), avec la priorité choisie.",
  },
  directSubmit: "Envoyer sur Notion",
  directSubmitting: "Envoi sur Notion…",
  kind: "De quoi s'agit-il ?",
  kinds: {
    bug: "Bug",
    idea: "Idée",
    other: "Autre",
  },
  kindHints: {
    bug: "Quelque chose ne marche pas comme prévu.",
    idea: "Une amélioration, une fonction qui manque.",
    other: "Une question, une remarque.",
  },
  message: "Votre retour",
  messageHint:
    "Pour un bug : ce que vous faisiez, ce qui s'est passé, ce que vous attendiez.",
  sentFrom: "Envoyé depuis la page",
  submit: "Envoyer le retour",
  submitting: "Envoi…",
  cancel: "Annuler",
  success: "Merci ! Votre retour est bien arrivé.",

  screenshot: {
    label: "Captures d'écran",
    drop: "Glissez vos captures ici, ou cliquez pour les choisir",
    rules: "PNG, JPEG ou WebP, 5 Mo chacune, 5 au plus.",
    full: "5 captures au plus : retirez-en une pour en ajouter une autre.",
    removeOf: (n: number) => `Retirer la capture ${n}`,
    pasteHint: "Vous pouvez aussi en coller une (⌘V ou Ctrl+V).",
    printScreenHint: "Capture faite : collez-la ici (Ctrl+V) pour la joindre.",
    altOf: (n: number) => `Capture d'écran ${n} jointe au retour`,
    openOf: (n: number) => `Voir la capture ${n}`,
    titleOf: (n: number, total: number) => `Capture ${n} sur ${total}`,
    viewer: {
      close: "Fermer la capture",
      previous: "Capture précédente",
      next: "Capture suivante",
    },
    badType: "Image PNG, JPEG ou WebP uniquement.",
    tooLarge: "5 Mo au plus par capture.",
    tooMany: "5 captures au plus : les suivantes n'ont pas été ajoutées.",
    failed: "Une capture n'a pas pu être envoyée. Réessayez ou retirez-la.",
  },

  // Zone capture, opened by the C key from any page.
  capture: {
    label: "Capture d'une zone de la page pour un retour",
    firstCorner: "Cliquez un coin de la zone à capturer",
    secondCorner: "Cliquez le coin opposé",
    cancelHint: "Échap pour annuler",
    working: "Capture…",
    failed:
      "La capture n'a pas pu être faite. Joignez une capture à la main si besoin.",
  },

  // The author changes their own feedback after sending it.
  mineEdit: {
    action: "Modifier",
    actionOf: (date: string) => `Modifier le retour du ${date}`,
    title: "Modifier votre retour",
    description:
      "Ajoutez une précision ou une capture : le directeur général voit la version à jour.",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    success: "Retour modifié.",
  },
  edited: (date: string) => `Modifié le ${date}`,

  mine: "Vos retours",
  received: "Retours de l'équipe",
  loadError: "Impossible de charger les retours pour l'instant.",
  from: (name: string) => `De ${name}`,
  emptyTitle: "Aucun retour pour l'instant",
  emptyBody: "Ceux que vous envoyez apparaîtront ici.",
  emptyReceivedBody: "Les retours de l'équipe apparaîtront ici.",

  view: {
    label: "Affichage des retours",
    new: (count: number) => `À examiner (${count})`,
    sent: (count: number) => `Transmis (${count})`,
    dismissed: (count: number) => `Écartés (${count})`,
    all: "Tous les retours",
  },
  emptyView: {
    new: "Rien à examiner : tous les retours ont été traités.",
    sent: "Aucun retour transmis pour l'instant.",
    dismissed: "Aucun retour écarté.",
  },
  triage: {
    running: (count: number) =>
      count === 1
        ? "PO vérifie le nouveau retour pour éviter les doublons…"
        : `PO vérifie les ${count} nouveaux retours pour éviter les doublons…`,
    failed:
      "PO n'a pas pu trier les nouveaux retours. Ils restent visibles ci-dessous, en attente de tri.",
    // PO's grouping off: each feedback is filed alone, by code.
    filing: (count: number) =>
      count === 1
        ? "Ajout du nouveau retour…"
        : `Ajout des ${count} nouveaux retours…`,
    filingFailed:
      "Les nouveaux retours n'ont pas pu être ajoutés. Ils restent visibles ci-dessous, en attente.",
    retry: "Réessayer",
  },
  unfiled: "En attente de tri",
  count: (count: number) => (count === 1 ? "1 retour" : `${count} retours`),
  originals: (count: number) =>
    count === 1
      ? "Voir le retour d'origine"
      : `Voir les ${count} retours d'origine`,
  byPo: "Les sujets de plusieurs retours ont été regroupés et résumés par PO (sauf mention « Modifié par »), qui peut se tromper : les retours d'origine restent consultables.",
  topicOf: (title: string) => `Sujet : ${title}`,

  priorities: { high: "Haute", normal: "Normale", low: "Basse" },
  priority: (label: string) => `Priorité ${label.toLowerCase()}`,
  sentBy: (date: string, name: string) => `Transmis le ${date} par ${name}`,
  newSinceSent: (count: number) =>
    count === 1
      ? "1 nouveau retour depuis la transmission"
      : `${count} nouveaux retours depuis la transmission`,
  editedBy: (date: string, name: string) => `Modifié le ${date} par ${name}`,
  edit: {
    title: "Modifier le retour",
    description:
      "Ce texte est celui que recevra l'équipe qui construit PDS OS. Les retours d'origine ne changent pas.",
    close: "Fermer",
    kind: "Type",
    topicTitle: "Titre",
    summary: "Résumé",
    rewrite: {
      label: "Demander à PO de réécrire",
      hint: "Dites ce que vous voulez (plus court, plus précis…). PO repart des retours d'origine.",
      placeholder: "Ex. : plus court, en mettant l'accent sur l'impact",
      submit: "Proposer",
      pending: "PO réécrit…",
      done: "Proposition de PO : relisez-la avant d'enregistrer.",
      failed:
        "PO n'a pas pu proposer de texte. Réessayez ou modifiez-le vous-même.",
    },
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    saved: "Retour modifié.",
    errors: {
      title: "Un titre, 200 caractères au plus.",
      summary: "Un résumé, 2 000 caractères au plus.",
      generic: "La modification n'a pas pu être enregistrée. Réessayez.",
    },
  },
  notion: {
    originalsHeading: "Retours d'origine",
    open: "Voir sur Notion",
    send: "Envoyer sur Notion",
    update: (count: number) =>
      count === 1
        ? "Ajouter le retour à la page Notion"
        : `Ajouter les ${count} retours à la page Notion`,
    pending: "Envoi sur Notion…",
    synced: "Envoyé sur Notion.",
    failed: (reason: string) =>
      `Transmis dans PDS OS, mais pas envoyé sur Notion : ${reason}`,
    error: (reason: string) => `Pas envoyé sur Notion : ${reason}`,
    retry: "Réessayer sur Notion",
    off: (reason: string) =>
      `Les retours transmis ne partent pas sur Notion : ${reason}`,
    notSynced: "Pas encore sur Notion.",
    reasons: {
      notConfigured: (settings: string) =>
        `réglage manquant (${settings}) dans .env.local ou sur Vercel ; redémarrez le serveur après l'avoir ajouté.`,
      unreachable: "Notion ne répond pas. Réessayez dans quelques minutes.",
      unauthorized:
        "le jeton NOTION_TOKEN est refusé. Vérifiez-le, ou recréez l'intégration dans l'espace Sordulo.",
      forbidden:
        "l'intégration n'a pas le droit d'écrire dans la base (capacités « Insérer » et « Mettre à jour du contenu » de l'intégration).",
      notShared:
        "la base Notion est introuvable ou n'est pas partagée avec l'intégration (page Retours → « ••• » → Connexions).",
      invalid:
        "Notion refuse la page : une colonne manque ou n'a pas le bon type (Titre, Résumé, Type, Priorité, Retours, Transmis par, Transmis le, Lien).",
      busy: "Notion est occupé. Réessayez dans une minute.",
      notSent: "le sujet n'est pas transmis.",
      notFiled:
        "le retour est enregistré, mais n'a pas pu être transmis. Transmettez-le depuis la page Retours.",
      notRecorded:
        "la page Notion est créée, mais PDS OS n'a pas pu enregistrer son lien. Réessayez.",
      unknown: "erreur inattendue de Notion.",
    },
    newSinceSync: (count: number) =>
      count === 1
        ? "1 retour pas encore sur Notion"
        : `${count} retours pas encore sur Notion`,
  },
  review: {
    priority: "Priorité",
    priorityHints: {
      high: "À traiter en premier.",
      normal: "À traiter dans le cours normal.",
      low: "Quand il y aura le temps.",
    },
    confirm: {
      send: "Transmettre",
      prioritize: "Changer la priorité",
      dismiss: "Écarter",
      reopen: "Remettre à examiner",
    },
  },
  actions: {
    edit: "Modifier",
    send: "Transmettre",
    sendWith: (label: string) => `Priorité ${label.toLowerCase()}`,
    changePriority: "Changer la priorité",
    dismiss: "Écarter",
    reopen: "Remettre à examiner",
    failed: "L'action n'a pas pu aboutir. Réessayez.",
  },

  errors: {
    invalid: "Vérifiez le formulaire.",
    kind: "Choisissez le type de retour.",
    messageRequired: "Écrivez votre retour.",
    messageTooLong: "4 000 caractères au plus.",
    generic: "Le retour n'a pas pu être envoyé. Réessayez.",
    editFailed: "La modification n'a pas pu être enregistrée. Réessayez.",
  },
} as const;
