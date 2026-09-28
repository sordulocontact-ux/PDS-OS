/** Handing a project over to a project manager (circuit d'attribution). */
export const transmission = {
  statuses: {
    not_transmitted: "Non transmis",
    // Handed over, waiting for the project manager to accept it.
    pending: "Transmis, à accepter",
    refused: "Refusé",
    clarification_requested: "Précision demandée",
    launched: "Lancé",
  },

  panel: {
    title: "Statut",
    notTransmittedBody:
      "Le projet sera lancé, avec ses étapes, une fois accepté par un chef de projet.",
    pendingBody: (name: string, date: string) =>
      `Transmis à ${name} le ${date}. Le projet sera lancé à son acceptation.`,
    refusedBody: (name: string) => `${name} a refusé le projet.`,
    clarificationBody: (name: string) => `${name} demande une précision.`,
    reason: "Motif",
    question: "Question",
    transmit: "Transmettre à un chef de projet",
    retransmit: "Retransmettre",
    noManager:
      "Aucun chef de projet actif dans l'équipe. Créez-en un depuis l'équipe pour pouvoir transmettre.",
    toMembers: "Ouvrir l'équipe",
  },

  dialog: {
    title: "Transmettre à un chef de projet",
    retransmitTitle: "Retransmettre le projet",
    description:
      "Le chef de projet pourra l'accepter, le refuser ou demander une précision.",
    assignee: "Chef de projet",
    assigneePlaceholder: "Choisir un chef de projet",
    note: "Message",
    noteHint: "Facultatif. Contexte, réponse à une question…",
    submit: "Transmettre",
    submitting: "Transmission…",
    cancel: "Annuler",
    close: "Fermer",
  },

  respond: {
    title: "Ce projet vous est transmis",
    from: (name: string, date: string) => `Par ${name}, le ${date}.`,
    accept: "Accepter et lancer le projet",
    accepting: "Lancement…",
    refuse: "Refuser",
    clarify: "Demander une précision",
    refuseLabel: "Motif du refus",
    clarifyLabel: "Votre question",
    responseHint: "Le message est renvoyé au directeur général.",
    send: "Envoyer",
    sending: "Envoi…",
    cancel: "Annuler",
  },

  history: {
    title: "Historique des transmissions",
    transmitted: (by: string, to: string) => `${by} → ${to}`,
    decisions: {
      pending: "En attente",
      accepted: "Accepté",
      refused: "Refusé",
      clarification_requested: "Précision demandée",
    },
  },

  errors: {
    assigneeRequired: "Choisissez un chef de projet.",
    responseRequired: "Écrivez un message pour le directeur général.",
    invalidAssignee: "Cette personne n'est pas chef de projet actif.",
    pending: "Ce projet attend déjà une réponse.",
    launched: "Ce projet est déjà lancé.",
    closed: "Cette transmission a déjà reçu une réponse.",
  },

  cards: {
    toAccept: "Projets à accepter",
    toRetransmit: "Projets à retransmettre",
  },
} as const;
