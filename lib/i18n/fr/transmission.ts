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
    // Transmitting again says why (UX test of 09/10/2026: « Retransmettre »
    // to answer a question).
    answer: "Répondre et transmettre",
    reassign: "Transmettre à quelqu'un d'autre",
    noManager:
      "Aucun chef de projet actif dans l'équipe. Créez-en un depuis l'équipe pour pouvoir transmettre.",
    toMembers: "Ouvrir l'équipe",
  },

  dialog: {
    title: "Transmettre à un chef de projet",
    answerTitle: "Répondre et transmettre le projet",
    reassignTitle: "Transmettre le projet à quelqu'un d'autre",
    description:
      "Le chef de projet pourra l'accepter, le refuser ou demander une précision.",
    assignee: "Chef de projet",
    assigneePlaceholder: "Choisir un chef de projet",
    note: "Message",
    noteHint: "Contexte, réponse à une question…",
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
    subjectLabel: "Elle porte sur",
    responseHint: "Le message est envoyé à la direction.",
    // Said on the Travail page once the answer has left.
    sent: {
      refused:
        "Votre refus est parti à la direction. Le projet ne vous est plus transmis.",
      clarification_requested:
        "Votre question est partie à la direction. Le projet vous sera transmis à nouveau avec sa réponse : vous serez notifié.",
    },
    send: "Envoyer",
    sending: "Envoi…",
    cancel: "Annuler",
  },

  // Before accepting (PROJ-UX-02).
  summary: {
    title: "Ce que vous acceptez",
    known: (items: string) => `Transmis : ${items}.`,
    missing: (items: string) =>
      `Manque : ${items}. Le Cadrage vous le demandera.`,
    next: "En acceptant, vous devenez responsable du projet et le Cadrage s'ouvre : ce qui est transmis y sera proposé à confirmer, rien n'est à ressaisir. Une question avant ? « Demander une précision ».",
    date: "la date",
    budget: "le budget",
    titles: "les titres",
    artist: "l'artiste",
    context: "le contexte initial",
  },
  // What a request for clarification is about (PROJ-UX-02).
  subjects: {
    budget: "Le budget",
    timing: "Les dates",
    scope: "Le périmètre (titres, livrables)",
    team: "L'équipe",
    other: "Autre chose",
  },
  clarifications: {
    title: "Demandes de précision",
    asked: (name: string, date: string) => `${name}, le ${date}`,
    question: "Question",
    answer: "Réponse",
    answeredBy: (name: string, date: string) => `${name}, le ${date}`,
    statuses: {
      answered: "Répondue",
      waiting: "En attente de la direction",
      retransmitted: "Retransmis sans réponse écrite",
    },
    hidden: "Le message est réservé à la personne concernée et à la direction.",
    // Given to PO as data with the initial context, at the Cadrage's start.
    forPo: (subject: string, question: string, answer: string) =>
      `Précision demandée (${subject}) : ${question}\nRéponse de la direction : ${answer}`,
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
    toRetransmit: "Projets qui attendent votre réponse",
  },
} as const;
