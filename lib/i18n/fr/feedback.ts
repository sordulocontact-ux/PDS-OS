/** Feedback page: the team tells whoever builds the app what to fix or add. */
export const feedback = {
  navLink: "Envoyer un retour",
  title: "Retours",
  subtitle:
    "Un bug, une idée, une gêne ? Écrivez-nous : chaque retour arrive directement à l'équipe qui construit PDS OS.",

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
  success: "Merci ! Votre retour est bien arrivé.",

  mine: "Vos retours",
  received: "Retours reçus",
  loadError: "Impossible de charger les retours pour l'instant.",
  from: (name: string) => `De ${name}`,
  onPage: "Page",
  emptyTitle: "Aucun retour pour l'instant",
  emptyBody: "Ceux que vous envoyez apparaîtront ici.",
  emptyReceivedBody: "Les retours de l'équipe apparaîtront ici.",

  view: {
    label: "Affichage des retours",
    topics: "Par sujet",
    all: "Tous les retours",
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
  byPo: "Regroupé et résumé par PO, qui peut se tromper : les retours d'origine restent consultables.",
  topicOf: (title: string) => `Sujet : ${title}`,

  errors: {
    invalid: "Vérifiez le formulaire.",
    kind: "Choisissez le type de retour.",
    messageRequired: "Écrivez votre retour.",
    messageTooLong: "4 000 caractères au plus.",
    generic: "Le retour n'a pas pu être envoyé. Réessayez.",
  },
} as const;
