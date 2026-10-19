// The common frame of every private page (proto portal / portalPage, C13 A).

export const portal = {
  bar: (project: string, person: string | null) =>
    person ? `« ${project} » · ${person}` : `« ${project} »`,
  lock: "Lien privé · sans compte",
  headings: {
    todo: "Ce que PDS attend de vous",
    idle: "Rien à faire pour l'instant",
    invited: "Votre prochain rendez-vous avec PDS",
  },
  contact: "Votre contact chez PDS",
  states: { todo: "À vous", waiting: "En attente de PDS", done: "Fait" },
  waiting: "En attente de PDS",
  done: (n: number) => `Fait · ${n}`,
  due: (day: string) => `avant le ${day}`,
  see: "Voir",
  // The person's part, as the line above the title says it.
  roles: {
    mix: "Ingénieur du mix",
    mastering: "Ingénieur du mastering",
    form: "Intervenant",
    split: "Ayant droit",
    influence: "Créateur",
    provider: "Prestataire",
  },
  // The cards of each page and what they ask.
  form: {
    title: "Votre fiche de renseignements",
    action: "Remplir et envoyer la fiche",
  },
  split: {
    title: (title: string) => `La répartition de l'édition de « ${title} »`,
    action: "Confirmer ou contester la répartition",
  },
  influence: {
    title: "Votre accord de collaboration",
    action: "Donner votre accord ou demander une modification",
  },
  master: {
    title: {
      mix: "Votre dossier de mix",
      mastering: "Votre dossier de mastering",
    },
    acknowledge: "Confirmer la prise en charge du dossier",
    deliver: "Déposer votre version",
  },
  provider: {
    quote: "Déposer le devis",
    direction: "Envoyer votre proposition de réalisation",
    progress: "Cocher ce qui est fait",
    gear: "Envoyer votre liste matériel",
    post: "Votre postproduction",
  },
  closed: "Ce lien n'est plus valable",
  // The person's page by project (lot 11, /c).
  page: {
    title: "Votre page PDS",
    closed: {
      revoked:
        "Ce lien a été remplacé ou révoqué. Demandez le nouveau à votre contact chez PDS.",
      expired:
        "Ce lien a expiré. Demandez-en un nouveau à votre contact chez PDS.",
    },
  },
  // A call the person is invited to (proto portalCalls).
  call: {
    invited: "Invité",
    when: "Quand",
    whenValue: (day: string, hour: string) => `${day} à ${hour}`,
    where: "Où",
    visio: "visio",
    atPds: "Chez PDS",
    participants: "Participants",
    agenda: "Ordre du jour",
    invitedBy: (who: string | null, day: string) =>
      who
        ? `Invitation envoyée par ${who} ${day}.`
        : `Invitation envoyée ${day}.`,
    held: (title: string, day: string) => `${title} du ${day}`,
    summary: "Résumé de la réunion",
    summaryBy: (who: string | null, at: string, version: number) =>
      `Envoyé${who ? ` par ${who}` : ""} le ${at}${version > 1 ? ` · version ${version}` : ""}.`,
    pending:
      "PDS confirme les suites du call ; ce qui vous concerne apparaîtra ici.",
  },
  workflows: {
    framing: "Cadrage",
    master: "Master",
    legal: "Juridique",
    marketing: "Marketing",
    distribution: "Distribution",
  },
} as const;
