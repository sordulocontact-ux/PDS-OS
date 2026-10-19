/**
 * The common call form (components/calls/prep/), the same in every module:
 * Cadrage, Stratégie, Conception, Production, Master. Words of the proto
 * « Projet complet » (docs/protos/src/mk.js `prepGate`, `whoChips`,
 * `agendaRow`, `newPersonModal`).
 */
export const callPrep = {
  heading: { exchange: "Nouvel échange", call: "Nouveau call" },
  // Participants, as in Teams or Outlook: one field of chips.
  participants: "Participants",
  add: "Ajouter",
  addFirst: "Ajouter des participants",
  suggestions: "Personnes à inviter",
  team: "Équipe",
  external: "Externe",
  externalTag: "externe",
  remove: (name: string) => `Retirer ${name}`,
  inviteEmail: (email: string) => `Inviter ${email}`,
  inviteEmailDetail: "par e-mail, une fiche est créée dans le Réseau",
  inviteEmailOnly: "par e-mail",
  createContact: (name: string) => `Créer la fiche de « ${name} »`,
  createContactDetail: "dans le Réseau, puis l'inviter",
  // Who a member is, in the suggestions and the chip's tooltip.
  roles: { owner: "Responsable du projet", team: "Équipe du projet" },
  // How an external hears of the call.
  how: {
    app: "dans PDS OS",
    link: "invitation sur son lien privé",
    email: "invitation par e-mail",
  },
  tooltip: (detail: string, how: string) => `${detail} · ${how}`,
  externals: (list: string) => `Externes : ${list}.`,
  externalOf: (name: string, how: string) => `${name} (${how})`,
  tooFew: "Un échange réunit au moins deux personnes.",
  contactWithoutEmail: (name: string) =>
    `${name} n'a pas d'e-mail dans le Réseau : complétez sa fiche, ou tapez son adresse pour l'inviter.`,
  emailInvalid:
    "Tapez une adresse e-mail complète (nom@domaine.fr) pour inviter quelqu'un d'extérieur.",
  // When and how.
  date: "Date",
  dateMissing: "Choisissez le jour.",
  time: "Heure",
  timeMissing: "Indiquez l'heure.",
  format: "Format",
  formats: { video: "Visio", in_person: "Sur place" },
  link: "Lien de la visio",
  linkHint:
    "Collez le lien d'une visio (Meet, Zoom, Teams…) si vous en avez un ; sinon ajoutez-le plus tard sur la page du call.",
  linkGoogle:
    "Le lien Google Meet est créé à la confirmation et Google envoie l'invitation par e-mail.",
  linkInvalid: "Le lien de visio doit commencer par https://.",
  // Agenda.
  agenda: "Ordre du jour",
  agendaEmpty: "Aucun point pour l'instant : ajoutez ce qu'il faut aborder.",
  addPoint: "Ajouter un point",
  pointMissing: "Écrivez le point à ajouter.",
  pointLabel: (n: number) => `Point ${n} de l'ordre du jour`,
  move: (topic: string) => `Déplacer « ${topic} » (flèches haut et bas)`,
  dragHint: "Glisser pour déplacer",
  up: (topic: string) => `Monter « ${topic} »`,
  down: (topic: string) => `Descendre « ${topic} »`,
  edit: (topic: string) => `Modifier « ${topic} »`,
  removePoint: (topic: string) => `Retirer « ${topic} »`,
  save: "Enregistrer",
  cancel: "Annuler",
  moved: (topic: string, n: number) =>
    `« ${topic} » est maintenant le point ${n}.`,
  // « Préparer en détail »: durations and PO's questions, folded.
  detail: "Préparer en détail",
  hideDetail: "Masquer le détail",
  minutesLabel: (topic: string) => `Durée de « ${topic} », en minutes`,
  minutes: (n: number) => `${n} min`,
  total: (n: number) => `Environ ${n} min`,
  // Sent with the invitation.
  sent: "Envoyé avec l'invitation",
  goal: "Objectif",
  goalMissing: "Dites en une phrase à quoi sert l'échange.",
  editGoal: "Modifier",
  documents: "Documents",
  noDocuments: "Aucun document",
  // Buttons.
  review: "Voir le récapitulatif",
  startDirectly: "Commencer directement plutôt",
  missingCount: (n: number) =>
    n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
  // The summary, at the same place.
  recap: {
    heading: "Récapitulatif avant création",
    when: "Quand",
    whenValue: (when: string, format: string) => `${when} · ${format}`,
    participants: "Participants",
    agenda: "Ordre du jour",
    goal: "Objectif",
    invitations: "Les invitations partent à la confirmation.",
    invitationsExternal: (names: string, many: boolean) =>
      `Les invitations partent à la confirmation : ${names} ${many ? "sont externes" : "est externe"}.`,
    confirm: "Confirmer et inviter",
    confirming: "Création…",
    edit: "Modifier",
  },
  created: { exchange: "Échange créé", call: "Call créé" },
  failed: "L'échange n'a pas pu être créé. Réessayez.",
  forbidden: "Seul le responsable du projet prépare ses échanges.",
  locked: "Cette étape est fermée : l'échange ne peut plus être préparé ici.",
  // Once created, in the step.
  planned: {
    exchange: "Échange prévu",
    call: "Call prévu",
    when: (when: string, format: string | null) =>
      format ? `${when} · ${format}` : when,
    createdBy: (name: string, day: string) => `créé par ${name} le ${day}`,
    link: "Lien de la visio",
    participants: "Participants",
    agenda: "Ordre du jour",
    note: {
      exchange:
        "L'échange s'enregistre dans PDS OS. À la fin, PO propose ce qui a été dit, point par point, avec la phrase exacte.",
      call: "Le call s'enregistre dans PDS OS. À la fin, PO propose ce qui a été dit, point par point, avec la phrase exacte.",
    },
    open: "Ouvrir le call",
    waiting: (name: string, what: string) => `En attente de ${name} : ${what}`,
  },
  // What each module computes for its call (titles, facts, notes).
  kinds: {
    framing: {
      title: "Échange de cadrage",
      subjects: "Ce qui manque ou reste à confirmer, dimension par dimension",
    },
    strategy: {
      title: "Échange stratégique",
      documents: (artist: string | null) =>
        artist
          ? `Brief de cadrage validé · Fiche artiste de ${artist}`
          : "Brief de cadrage validé",
      subjects:
        "Les dimensions de la Stratégie encore ouvertes, une par point de l'ordre du jour",
    },
    design: {
      title: "Échange créatif",
      deliverables: "Livrables",
      documents: "Brief de sortie · Fiches Livrables",
    },
    production: {
      title: (deliverable: string) => `Call de production · ${deliverable}`,
      documents: (deliverable: string) =>
        `Fiche Livrable « ${deliverable} » · Brief créatif`,
      open: "Points ouverts",
      openSource: "Fiche Livrable › Points à préciser",
    },
    technical: {
      title: (deliverable: string) => `Call technique · ${deliverable}`,
    },
    master: {
      title: "Échange sur le Brief Mix/Master",
      goal: "Compléter le Brief Mix/Master avec l'ingénieur : ce qu'il ne dit pas encore.",
      note: "L'ordre du jour vient de ce que le Brief ne sait pas encore.",
    },
    subjects: "Sujets",
    none: "Aucun",
  },
  // The Réseau fiche created from the field.
  newPerson: "Nouvelle fiche dans le Réseau",
} as const;
