/** The Business module's deals (BIZ 2 to 4): stages, gestures, errors. */
export const deals = {
  // The Deals page (BIZ 4): one list, tabs and filters.
  title: "Deals",
  description:
    "Les négociations des artistes : qui négocie, où en est chaque deal, la prochaine action.",
  loadError: "Impossible de charger les deals. Rechargez la page.",
  emptyTitle: "Aucun deal pour l'instant",
  emptyBody:
    "Un deal s'ouvre pour un artiste d'un projet ; il apparaît ici pour la personne qui le négocie, la direction et le responsable du projet.",
  filtersEmpty: "Aucun deal avec ces filtres",
  filtersEmptyBody: "Retirez un filtre pour revoir les deals.",
  views: {
    label: "Vues des deals",
    open: "En cours",
    followUp: "À relancer",
    signed: "Signés",
    abandoned: "Abandonnés",
  },
  search: {
    label: "Rechercher un deal",
    placeholder: "Rechercher un artiste, un titre, un projet",
    noResult: (query: string) => `Aucun deal ne correspond à « ${query} ».`,
  },
  filters: {
    stage: "Étape",
    stageAll: "Toutes les étapes",
    assignee: "Négocié par",
    assigneeAll: "Tout le monde",
    project: "Projet",
    projectAll: "Tous les projets",
  },
  table: {
    deal: "Deal",
    stage: "Étape",
    next: "Prochaine action",
    assignee: "Négocié par",
    unassigned: "À affecter",
    followUpDue: (day: string) => `Relance due · ${day}`,
    followUpOn: (day: string) => `Relancer le ${day}`,
    on: (action: string, day: string) => `${action} · ${day}`,
  },
  kinds: {
    music: "Musique",
    brand_partnership: "Partenariat de marque",
    label: "Label",
  },
  stages: {
    to_contact: "À contacter",
    call_planned: "Call prévu",
    negotiation: "Négociation",
    agreement: "Accord de principe",
    contracting: "Contractualisation",
    signed: "Signé",
    abandoned: "Abandonné",
  },
  // A deal's name: « Nadia · Titre 2 », else its project or artist alone.
  name: {
    title: (position: number) => `Titre ${position}`,
    join: (a: string, b: string) => `${a} · ${b}`,
    fallback: "Deal sans nom",
  },
  // A deal's action in Travail and the home (BIZ 4).
  work: {
    decide: "Valider l'accord de principe",
    followUp: "Relancer",
    todo: {
      to_contact: "Prendre contact",
      call_planned: "Préparer le call",
      negotiation: "Négocier les termes",
      agreement: "Attendre la décision de la direction",
      contracting: "Faire avancer le contrat",
    } as Record<string, string>,
    place: (stage: string) => `Deal › ${stage}`,
    why: {
      deal: "Un deal qui vous est confié : sa prochaine action, sa relance ou son étape à faire avancer.",
      decide:
        "Le business manager propose un accord de principe : validez-le, ou renvoyez-le en négociation avec un motif.",
    },
  },
  agreement: {
    pending: "Accord de principe à valider",
    validated: "Accord de principe validé",
  },
  // The terms of lib/deals/terms.ts (BIZ 3): one label per key.
  terms: {
    title: "Termes négociés",
    labels: {
      songwriting_split: "Splits auteur-compositeur",
      master_split: "Part du master",
      royalties: "Royalties",
      advance: "Avance ou cachet",
      credits: "Crédits",
      territories: "Territoires",
      duration: "Durée",
      exclusivity: "Exclusivité",
      promo: "Promo",
    } as Record<string, string>,
    states: {
      pds_proposal: "Proposé par PDS",
      counter_proposal: "Contre-proposition",
      confirmed: "Confirmé",
      to_define: "À définir",
    },
    money: {
      advance: (amount: string) => `Avance de ${amount}`,
      fee: (amount: string) => `Cachet de ${amount}`,
    },
    moneyModes: { advance: "Avance", fee: "Cachet" },
    yes: "Oui",
    no: "Non",
    changed: (who: string, when: string) => `${who}, ${when}`,
    edit: "Modifier",
    editTitle: (label: string) => `Modifier : ${label}`,
    fields: {
      state: "État",
      value: "Valeur",
      text: "Ce qui est négocié",
      percent: "Part (%)",
      amount: "Montant HT (€)",
      mode: "Nature",
      yesno: "Exclusif",
      detail: "Précision",
      role: "Rôle",
      share: "Part (%)",
      addRole: "Ajouter un rôle",
      removeRole: "Retirer",
    },
    save: "Enregistrer le terme",
  },
  // « Nouveau deal » (BIZ 4): the direction and the project managers.
  create: {
    button: "Nouveau deal",
    title: "Nouveau deal",
    description:
      "Un deal musical pour un artiste : choisissez parmi ce qui existe, puis qui le négocie.",
    for: "Pour",
    forParticipation: "Un artiste d'un projet collectif",
    forOther: "Un projet ou un artiste",
    participation: "Participation",
    participationPlaceholder: "Choisir un artiste d'un titre",
    participationSearch: "Rechercher un artiste, un titre",
    participationEmpty: "Aucune participation ne correspond.",
    project: "Projet",
    projectPlaceholder: "Choisir un projet",
    projectSearch: "Rechercher un projet",
    projectEmpty: "Aucun projet ne correspond.",
    artist: "Artiste",
    artistPlaceholder: "Choisir un artiste",
    artistSearch: "Rechercher un artiste",
    artistEmpty: "Aucun artiste ne correspond.",
    assignee: "Négocié par",
    assigneeHint:
      "Un membre qui négocie ; laissez vide pour l'affecter plus tard.",
    nextAction: "Prochaine action",
    nextActionOn: "Pour le",
    submit: "Créer le deal",
    required: {
      participation: "Choisissez la participation.",
      project: "Choisissez le projet.",
      subject: "Choisissez un projet ou un artiste.",
    },
    missingCount: (count: number) =>
      count === 1 ? "1 champ manque." : `${count} champs manquent.`,
  },
  // A deal's page (BIZ 4).
  page: {
    back: "Deals",
    now: "Maintenant",
    toValidate: "À valider",
    advance: {
      call_planned: "Le call est prévu",
      negotiation: "Démarrer la négociation",
      agreement: "Proposer l'accord de principe",
      contracting: "Passer à la contractualisation",
      signed: "Marquer comme signé",
    } as Record<string, string>,
    why: {
      to_contact:
        "Premier contact avec l'artiste ou son entourage, pour caler un call.",
      call_planned:
        "Le call est calé : préparez-le, puis ouvrez la négociation.",
      negotiation:
        "Les termes se négocient : notez chaque proposition et contre-proposition.",
      agreement:
        "Les termes tiennent : la direction valide l'accord de principe avant le contrat.",
      contracting: "L'accord est validé : le contrat se prépare et se signe.",
    } as Record<string, string>,
    waitDirection: "En attente de la direction : valider l'accord de principe.",
    decideWhy: (who: string) =>
      `${who} propose un accord de principe sur ces termes : validez-le, ou renvoyez-le en négociation avec un motif.`,
    someone: "Le business manager",
    approve: "Valider l'accord de principe",
    refuse: "Renvoyer en négociation",
    refuseReason: "Ce qui reste à négocier",
    otherStage: "Changer d'étape",
    otherStageTitle: "Changer d'étape",
    otherStageDescription:
      "Revenir à une étape, ou en passer une. La contractualisation attend un accord validé.",
    stage: "Étape",
    note: "Pourquoi",
    stageSubmit: "Changer d'étape",
    abandon: "Abandonner",
    abandonTitle: "Abandonner ce deal",
    abandonDescription:
      "Le deal et son historique restent ; il ne change plus ensuite.",
    abandonReason: "Pourquoi ce deal s'arrête",
    abandonSubmit: "Abandonner le deal",
    sections: {
      next: "Prochaine action",
      stages: "Étapes",
      info: "Informations",
      history: "Historique",
    },
    next: {
      action: "Prochaine action",
      on: "Pour le",
      followUp: "Relancer le",
      none: "Aucune",
      edit: "Modifier",
      editTitle: "Prochaine action et relance",
      editDescription:
        "Ce que vous ferez ensuite, et quand relancer : PDS OS vous le rappelle le jour venu.",
      submit: "Enregistrer",
    },
    stageStates: { done: "Fait", current: "En cours", later: "À venir" },
    info: {
      kind: "Type",
      project: "Projet",
      title: "Titre",
      artist: "Artiste",
      participation: "Participation",
      contract: "Contrat",
      contractSigned: "Signé",
      contractOpen: "Pas encore signé",
      contractNone: "Aucun contrat lié à la participation",
      assignee: "Négocié par",
      unassigned: "À affecter",
      change: "Changer",
      assignTitle: "Confier ce deal",
      assignDescription:
        "À un membre qui négocie : il le verra dans ses deals.",
      assignSubmit: "Confier le deal",
    },
    participationStatuses: {
      proposed: "Proposée",
      invited: "Invitée",
      confirmed: "Confirmée",
      declined: "Refusée",
      withdrawn: "Retirée",
    } as Record<string, string>,
    history: {
      created: "Deal créé",
      assigned: (who: string | null) => (who ? `Confié à ${who}` : "Repris"),
      stage: (from: string, to: string) => `${from} → ${to}`,
      agreementValidated: "Accord de principe validé",
      agreementRefused: "Accord de principe renvoyé en négociation",
      abandoned: "Deal abandonné",
      nextAction: "Prochaine action mise à jour",
      term: (label: string, value: string) => `${label} : ${value}`,
      by: (who: string) => `par ${who}`,
    },
  },
  // PO's reading of the deals (BIZ 4, lib/assistant/read/deals.ts).
  po: {
    count: (n: number) =>
      n === 0
        ? "Aucun deal visible pour vous."
        : n === 1
          ? "1 deal visible pour vous."
          : `${n} deals visibles pour vous.`,
    line: (name: string, stage: string, who: string) =>
      `${name} : ${stage}, négocié par ${who}.`,
    unassigned: "personne pour l'instant",
    next: (action: string, day: string | null) =>
      day
        ? `Prochaine action : ${action} (${day}).`
        : `Prochaine action : ${action}.`,
    followUp: (day: string) => `Relance prévue le ${day}.`,
    abandoned: (reason: string) => `Abandonné : « ${reason} ».`,
    term: (label: string, value: string, state: string) =>
      `${label} : ${value} (${state}).`,
  },
  done: {
    created: "Deal créé",
    assigned: "Deal affecté",
    unassigned: "Deal repris",
    stage: (stage: string) => `Deal passé à l'étape « ${stage} »`,
    agreementValidated: "Accord de principe validé",
    agreementRefused: "Accord de principe renvoyé en négociation",
    abandoned: "Deal abandonné",
    nextAction: "Prochaine action enregistrée",
    term: "Terme enregistré",
  },
  errors: {
    generic: "L'enregistrement a échoué. Réessayez.",
    invalid: "Vérifiez les champs du formulaire.",
    forbidden: "Vous n'avez pas le droit de faire ce geste sur ce deal.",
    notFound: "Ce deal est introuvable.",
    closed: "Ce deal est clos : signé ou abandonné, il ne change plus.",
    kindUnavailable: "Seuls les deals musicaux se créent pour l'instant.",
    subjectRequired: "Choisissez un artiste, un projet ou une participation.",
    participationNotFound: "Cette participation est introuvable.",
    participationOtherProject:
      "Cette participation appartient à un autre projet.",
    participationOtherArtist:
      "Cette participation est celle d'un autre artiste.",
    projectNotFound: "Ce projet est introuvable.",
    artistNotFound: "Cet artiste est introuvable.",
    exists: "Un deal est déjà ouvert pour cette participation.",
    assigneeCannotNegotiate:
      "Un deal se confie à un membre qui négocie (business manager, business).",
    assigneeUnchanged: "Ce deal est déjà confié à cette personne.",
    stageUnchanged: "Le deal est déjà à cette étape.",
    agreementNotValidated:
      "La contractualisation attend un accord de principe validé par la direction.",
    notContracting: "Un deal est signé après la contractualisation.",
    noAgreementPending: "Aucun accord de principe n'attend de décision.",
    reasonRequired: "Dites pourquoi.",
    nextActionUnchanged: "Rien n'a changé.",
    termUnchanged: "Ce terme n'a pas changé.",
    termValueRequired: "Donnez une valeur, ou choisissez « À définir ».",
    termUnknown: "Ce terme n'existe pas pour ce type de deal.",
    textTooLong: "Le texte est trop long.",
  },
} as const;
