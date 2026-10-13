/** Conception (ticket « Conception »): entry, deliverables, shared words. */
export const conception = {
  title: "Conception",
  // Trail of the work page: Marketing / Conception / this.
  workTitle: "Travail direct",

  entry: {
    title: "Conception",
    body: "Ce que chaque livrable doit raconter et à quoi il doit ressembler, à partir de la Stratégie validée.",
    readOnly:
      "Le chef de projet et l'équipe créative cadrent ici la direction et les intentions de chaque livrable.",
    facts: {
      project: "Projet",
      artist: "Artiste",
      release: "Sortie",
      strategy: "Stratégie",
      conception: "Conception",
      noRelease: "Date non fixée",
    },
    strategyStates: {
      not_started: "Pas commencée",
      in_progress: "En cours",
      awaiting_validation: "En validation",
      validated: "Validée",
    },
    sources: (n: number) =>
      n === 0
        ? "Aucun compte rendu de call pour l'instant."
        : n === 1
          ? "1 compte rendu de call peut servir de source."
          : `${n} comptes rendus de call peuvent servir de sources.`,
    start: "Commencer sans échange",
    starting: "Ouverture…",
    resume: "Reprendre le travail",
    started: "Travail commencé",
    locked: "Conception soumise ou validée : elle n'est plus modifiable.",
    proposals: (n: number) =>
      n === 1
        ? "PO a relevé 1 intention à confirmer."
        : `PO a relevé ${n} intentions à confirmer.`,
    reviewProposals: "Les relire",
  },

  deliverables: {
    title: "Conception par livrable",
    summary: (confirmed: number, toQualify: number) =>
      [
        confirmed === 1 ? "1 confirmé" : `${confirmed} confirmés`,
        toQualify === 1 ? "1 à qualifier" : `${toQualify} à qualifier`,
      ].join(" · "),
    confirmedTitle: "Engagés par la Stratégie",
    toQualifyTitle: "Besoins à qualifier",
    toQualifyHint: "Ajoutés en cours de route : ni validés ni planifiés.",
    empty: "Aucun livrable engagé dans la Stratégie.",
    emptyToQualify: "Aucun besoin ajouté.",
    lever: "Levier",
    due: "Échéance",
    noDue: "Sans échéance",
    assignee: "Responsable",
    noAssignee: "Sans responsable",
    milestone: "Sort sur",
    conceptionDue: "Conception à finir",
    provenance: "Provenance",
    note: "Note",
    intentions: "Intentions",
    answered: (n: number, total: number) => `${n} sur ${total} posées`,
    proposals: (n: number) =>
      n === 1 ? "1 proposition de PO" : `${n} propositions de PO`,
    sheet: (status: string) => `Fiche : ${status}`,
    openSheet: "Ouvrir la fiche",
    open: "Travailler ce livrable",
    remove: "Retirer",
    removeTitle: "Retirer ce besoin ?",
    removeBody:
      "Il n'était ni validé ni planifié. Ses intentions et références partent avec lui.",
    removeConfirm: "Retirer le besoin",
    removed: "Besoin retiré",
    removing: "Retrait…",
    cancel: "Annuler",
    close: "Fermer",
    actionsLabel: (title: string) => `Actions sur ${title}`,
  },

  statuses: {
    confirmed: "Confirmé",
    to_qualify: "À qualifier",
  },

  origins: {
    strategy: "Engagé par la Stratégie",
    manual: "Ajout manuel",
    strategy_decision: "Décision de Stratégie",
    call: "Décision de call",
  },
  originDetails: {
    strategy_decision: (lever: string) => `Levier retenu : ${lever}`,
    call: (title: string) => `Call : ${title}`,
  },

  add: {
    open: "Ajouter un livrable",
    title: "Ajouter un livrable",
    description:
      "Un besoin arrivé en dernière minute. Il reste à qualifier : il n'est ni validé ni planifié.",
    titleLabel: "Livrable",
    titlePlaceholder: "Ex. Teaser vertical 15 s",
    originLegend: "D'où vient-il ?",
    originHints: {
      manual: "Une idée ou une demande ajoutée à la main.",
      strategy_decision: "Un levier retenu dans la Stratégie, sans livrable.",
      call: "Une décision prise pendant un call du projet.",
    },
    leverLabel: "Levier retenu",
    leverPlaceholder: "Choisir un levier",
    noLever: "Aucun levier retenu dans la Stratégie.",
    callLabel: "Call",
    callPlaceholder: "Choisir un call",
    noCall: "Aucun call dans ce projet.",
    noteLabel: "Note",
    notePlaceholder: "Pourquoi ce livrable, ce qu'on en sait.",
    submit: "Ajouter à qualifier",
    submitting: "Ajout…",
    cancel: "Annuler",
    added: "Livrable ajouté, à qualifier",
    close: "Fermer",
  },

  // What a deliverable's intention covers (lib/design/intentions.ts).
  topics: {
    story: "Ce qu'il raconte",
    look: "À quoi il ressemble",
    tone: "Ton et émotion",
    musts: "Incontournables et interdits",
  },
  directionTopics: {
    story: "Ce que raconte l'ensemble",
    look: "Univers visuel commun",
    tone: "Ton et émotion",
    musts: "Incontournables et interdits",
  },
  direction: "Direction créative",
  directionHint: "Ce que tous les livrables partagent.",

  errors: {
    generic: "L'action n'a pas abouti. Réessayez.",
    forbidden: "Seul le chef de projet responsable peut faire cela.",
    notAllowed:
      "Seuls le chef de projet et l'équipe créative écrivent, pendant la conception.",
    strategyFirst:
      "La Stratégie doit être validée avant d'ouvrir la Conception.",
    locked:
      "La Conception est soumise ou validée : elle n'est plus modifiable.",
    invalid: "Vérifiez les champs du formulaire.",
    leverRequired: "Choisissez le levier retenu dont il vient.",
    callRequired: "Choisissez le call où il a été décidé.",
    proposalsPending:
      "Des propositions de PO attendent encore : confirmez-les ou écartez-les d'abord.",
    nothingToConfirm: "Aucune intention retenue à confirmer pour l'instant.",
    personNotMember: "Cette personne n'est pas membre de l'organisation.",
    personCannotSeeProject:
      "Cette personne ne peut pas travailler sur ce projet (ni équipe créative, ni accès à tous les projets).",
    validatorRequired: "Nommez au moins un validateur avant de soumettre.",
    responsibleRequired: "Désignez un responsable avant de soumettre.",
    alreadyPending: "Une version attend déjà une décision.",
    alreadyDecided: "Cette version a déjà été décidée.",
    notValidator: "Seuls les validateurs nommés décident.",
    reasonRequired: "Expliquez la décision dans un commentaire.",
    notValidated: "Aucune version validée à transférer.",
    alreadyTransferred: "Cette version est déjà transférée à Production.",
  },

  // Sub-navigation of the module (ConceptionTabs).
  tabsLabel: "Sections de la Conception",
  tabs: {
    home: "Accueil",
    work: "Intentions",
    references: "Références",
    direction: "Direction artistique",
    brief: "Brief créatif",
    sheets: "Fiches Livrables",
  },
  sheetTitle: "Fiche Livrable",

  // States computed by lib/design/states.ts.
  conceptionStates: {
    not_started: "Non commencée",
    in_progress: "En cours",
    to_arbitrate: "À arbitrer",
    partially_validated: "Partiellement validée",
    done: "Terminée",
  },
  intentionsStates: {
    draft: "Brouillon",
    to_confirm: "À confirmer",
    confirmed: "Confirmées",
    to_revise: "À réviser",
  },
  directionStates: {
    to_assign: "À attribuer",
    in_preparation: "En préparation",
    ready: "Prête à soumettre",
    pending: "En attente",
    approved: "Validée",
    changes_requested: "Modifications demandées",
    rejected: "Refusée",
  },
  sheetStatuses: {
    draft: "Brouillon",
    to_complete: "À compléter",
    ready: "Prête à soumettre",
    pending: "En attente de validation",
    ready_for_production: "Validée · Prête pour Production",
    transferred: "Transférée",
    rejected: "Refusée",
  },
  decisions: {
    approved: "Valider",
    changes_requested: "Demander des modifications",
    rejected: "Refuser",
  },
  decided: {
    approved: "Validé",
    changes_requested: "Modifications demandées",
    rejected: "Refusé",
  },
  validationModes: {
    global: "Globale",
    per_section: "Par section",
  },
  validationModeHints: {
    global: "Une seule décision pour toute la version soumise.",
    per_section:
      "Une décision par section (direction, chaque livrable, chaque élément d'une série).",
  },
};
