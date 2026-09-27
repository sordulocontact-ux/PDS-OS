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
    "Les retours de l'équipe, regroupés par PO. Choisissez ceux à transmettre à l'équipe qui construit PDS OS, avec leur priorité.",
  newFeedback: "Nouveau retour",

  dialog: {
    title: "Envoyer un retour",
    description:
      "Il arrive au directeur général, qui le transmet s'il est utile.",
    close: "Fermer",
  },
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
    label: "Capture d'écran",
    add: "Joindre une capture",
    remove: "Retirer la capture",
    pasteHint:
      "Astuce : faites une capture, puis collez-la ici (⌘V ou Ctrl+V).",
    printScreenHint: "Capture faite : collez-la ici (Ctrl+V) pour la joindre.",
    alt: "Capture d'écran jointe au retour",
    open: "Voir la capture",
    badType: "Image PNG, JPEG ou WebP uniquement.",
    tooLarge: "5 Mo au plus.",
    failed: "La capture n'a pas pu être envoyée. Réessayez ou retirez-la.",
  },

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
    retry: "Réessayer",
  },
  unfiled: "En attente de tri",
  count: (count: number) => (count === 1 ? "1 retour" : `${count} retours`),
  originals: (count: number) =>
    count === 1
      ? "Voir le retour d'origine"
      : `Voir les ${count} retours d'origine`,
  byPo: "Regroupé et résumé par PO (sauf mention « Modifié par »), qui peut se tromper : les retours d'origine restent consultables.",
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
      hint: "Facultatif : dites ce que vous voulez (plus court, plus précis…). PO repart des retours d'origine.",
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
    update: "Mettre à jour sur Notion",
    pending: "Envoi sur Notion…",
    synced: "Envoyé sur Notion.",
    failed:
      "Transmis dans PDS OS, mais pas envoyé sur Notion. Réessayez avec « Envoyer sur Notion ».",
    notSynced: "Pas encore sur Notion.",
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
  },
} as const;
