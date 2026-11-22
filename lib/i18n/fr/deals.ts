/** The Business module's deals (BIZ 2 to 4): stages, gestures, errors. */
export const deals = {
  // The Deals page (BIZ 4): one list, tabs and filters.
  title: "Deals",
  description:
    "Les négociations avec les artistes, les labels et les marques : qui négocie, où en est chaque deal, la prochaine action.",
  loadError: "Impossible de charger les deals. Rechargez la page.",
  emptyTitle: "Aucun deal pour l'instant",
  emptyBody:
    "Un deal s'ouvre pour un artiste, avec un label ou une marque ; il apparaît ici pour la personne qui le négocie, la direction et le responsable du projet.",
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
    placeholder: "Rechercher un artiste, un label, une marque, un projet",
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
    contract: "Contrat",
    followUpDue: (day: string) => `Relance due · ${day}`,
    followUpOn: (day: string) => `Relancer le ${day}`,
    on: (action: string, day: string) => `${action} · ${day}`,
  },
  kinds: {
    music: "Musique",
    label: "Label",
    brand_partnership: "Partenariat de marque",
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
    // The deal named in the title: two accords side by side on the home
    // differed by their tag only (UX test of 12/11/2026).
    decideOf: (name: string) => `Valider l'accord de principe de ${name}`,
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
    // « Noter un terme » in « Maintenant » (NoteTermButton).
    note: "Noter un terme",
    which: "Quel terme ?",
    // A term still to define, its empty slot (FactSlot).
    define: "Définir",
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
      // Label (ticket PDSBIZ, « Dossier Label / partenariat »).
      deal_nature: "Nature de l'accord",
      scope: "Périmètre",
      minimum_guarantee: "Minimum garanti",
      options: "Options",
      commitments: "Engagements",
      conditions: "Conditions et résiliation",
      // Brand (ticket PDSBIZ, « Dossier Influence »).
      campaign: "Campagne",
      deliverables: "Livrables",
      schedule: "Calendrier et validation",
      fee: "Fee",
      usage_rights: "Droits d'usage",
      paid_media: "Paid media et whitelisting",
      obligations: "Annulation et reporting",
    } as Record<string, string>,
    states: {
      // Seen from PDS Records (Sacha 22/11/2026): « Proposé par PDS » read
      // as « by PDS OS », « Contre-proposition » as an answer to a first
      // offer when the other side may speak first.
      pds_proposal: "Notre proposition",
      counter_proposal: "Leur proposition",
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
      "Pour un artiste, avec un label ou une marque : choisissez parmi ce qui existe, puis qui le négocie.",
    // The business manager's own deal (Ibé 12/11/2026).
    ownDescription:
      "Un deal que vous négociez, pour un artiste ou avec un label ou une marque. Un deal de projet ou de PDS MIC vous est confié par la direction ou le chef de projet.",
    kind: "Type de deal",
    // Who a label or brand deal is negotiated with (Ibé 18/11/2026).
    counterpart: { label: "Label", brand_partnership: "Marque" },
    for: "Pour",
    forParticipation: "Un artiste d'un projet collectif",
    forOther: "Un projet ou un artiste",
    participation: "Participation",
    participationPlaceholder: "Choisir un artiste d'un titre",
    participationSearch: "Rechercher un artiste, un titre",
    participationEmpty: "Aucune participation ne correspond.",
    // A collective's deal goes through its guest's participation
    // (20261112130101): the guest is invited on a title first.
    participationHint:
      "Un artiste invité d'un projet collectif. Absent de la liste : invitez-le d'abord sur un titre, depuis le projet.",
    project: "Projet",
    projectPlaceholder: "Choisir un projet",
    projectSearch: "Rechercher un projet",
    projectEmpty: "Aucun projet ne correspond.",
    artist: "Artiste",
    artistPlaceholder: "Choisir un artiste",
    artistSearch: "Rechercher un artiste",
    artistEmpty: "Aucun artiste ne correspond.",
    // The search of a participation, a project or an artist (SinglePicker).
    noResult: (query: string) => `Aucun résultat pour « ${query} ».`,
    allSelected: "Tout est déjà choisi.",
    remove: (label: string) => `Retirer ${label}`,
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
      artist: "Choisissez l'artiste.",
      counterpart: {
        label: "Choisissez le label.",
        brand_partnership: "Choisissez la marque.",
      },
    },
    missingCount: (count: number) =>
      count === 1 ? "1 champ manque." : `${count} champs manquent.`,
    // For whoever negotiates but may not open a deal (UX test of 12/11/2026).
    askTitle: "Ouvrir un deal",
    askBody: (who: string) =>
      `Un deal s'ouvre par la direction${who ? ` (${who})` : ""}, le responsable du projet ou le business manager, qui vous le confie. Demandez-leur : le deal apparaîtra ici.`,
    askClose: "Compris",
  },
  // A deal's page (BIZ 4).
  page: {
    back: "Deals",
    frieze: "Étapes du deal",
    stageReached: "atteinte",
    now: "Maintenant",
    toValidate: "À valider",
    advance: {
      call_planned: "Le call est prévu",
      negotiation: "Démarrer la négociation",
      agreement: "Proposer l'accord de principe",
      contracting: "Passer à la contractualisation",
      signed: "Marquer comme signé",
    } as Record<string, string>,
    // « Maintenant » of the project's owner on a music deal before its
    // accord (Ibé 18/11/2026): she calls the negotiation, never writes it.
    planCall: {
      title: (who: string | null) =>
        who ? `Caler le call avec ${who}` : "Caler le call de négociation",
    },
    waitDirection:
      "La direction est prévenue : elle valide l'accord de principe ou le renvoie en négociation.",
    // The terms the direction validates, recalled above its button (UX test
    // of 12/11/2026: never validate what one has not read).
    recap: "Termes confirmés",
    recapNone: "Aucun terme confirmé pour l'instant.",
    recapOthers: (count: number) =>
      count === 1
        ? "1 autre terme n'est pas confirmé."
        : `${count} autres termes ne sont pas confirmés.`,
    // An abandoned deal (UX test of 12/11/2026): final, and what to do.
    abandonedTitle: "Deal abandonné",
    abandonedBody: (reason: string | null) =>
      `${reason ? `« ${reason} » ` : ""}Un deal abandonné ne se rouvre pas : pour reprendre, la direction ouvre un nouveau deal.`,
    reopen: "Ouvrir un nouveau deal",
    decideWhy: (who: string) =>
      `${who} propose un accord de principe sur ces termes : validez-le, ou renvoyez-le en négociation avec un motif.`,
    someone: "Le business manager",
    approve: "Valider l'accord de principe",
    refuse: "Renvoyer en négociation",
    refuseReason: "Ce qui reste à négocier",
    otherStage: "Changer d'étape",
    otherStageTitle: "Changer d'étape",
    otherStageDescription:
      "Revenir à une étape, ou en passer une. L'accord de principe attend un terme confirmé, la contractualisation un accord validé, « Signé » un contrat signé.",
    stage: "Étape",
    note: "Pourquoi",
    stageSubmit: "Changer d'étape",
    abandon: "Abandonner",
    abandonTitle: "Abandonner ce deal",
    abandonDescription:
      "Le deal et son historique restent ; il ne change plus ensuite.",
    abandonReason: "Pourquoi ce deal s'arrête",
    abandonSubmit: "Abandonner le deal",
    // The deal's two views (Ibé 18/11/2026: « on ne sait pas si on doit
    // remplir ce qu'il y a en bas »): what to do now, and the file to read.
    tabs: { label: "Vues du deal", todo: "À faire", file: "Dossier" },
    // A signed deal: nothing left to do.
    signedNote: "Deal signé : son dossier reste consultable dans « Dossier ».",
    sections: {
      next: "Prochaine action",
      info: "Informations",
      history: "Historique",
    },
    next: {
      action: "Prochaine action",
      on: "Pour le",
      followUp: "Relancer le",
      followUpHint:
        "Si personne n'a répondu d'ici là : PDS OS vous rappelle de relancer.",
      call: "Prochain call",
      none: "Aucune",
      // The next action in one sentence (Sacha 20/11/2026: too many tables).
      noneAction: "Aucune prochaine action.",
      add: "Ajouter une prochaine action",
      followUpOn: (day: string) => `Relancer le ${day}`,
      edit: "Modifier",
      editTitle: "Prochaine action et relance",
      editDescription:
        "Ce que vous ferez ensuite, et quand relancer : PDS OS vous le rappelle le jour venu.",
      submit: "Enregistrer",
    },
    info: {
      kind: "Type",
      project: "Projet",
      title: "Titre",
      artist: "Artiste",
      counterpart: { label: "Label", brand_partnership: "Marque" } as Record<
        string,
        string
      >,
      participation: "Participation",
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
      memo: (agreement: boolean) =>
        agreement
          ? "Deal memo pris à l'accord de principe"
          : "Nouveau deal memo",
      memoValidated: "Deal memo validé",
      memoReceived: (n: string, from: string) =>
        `Deal memo n°${n} reçu par e-mail${from ? ` de ${from}` : ""}`,
      memoSubmitted: (n: string) => `Deal memo n°${n} montré à la direction`,
      memoChangesRequested: (n: string) =>
        `Modifications demandées au deal memo n°${n}`,
      memoSent: (n: string, to: string) =>
        to
          ? `Accord du deal memo n°${n} renvoyé à ${to}`
          : `Accord du deal memo n°${n} renvoyé autrement`,
      memoLoop: (added: boolean) =>
        added ? "Ajouté à la boucle" : "Retiré de la boucle",
      contractLinked: "Contrat lié",
      contractUnlinked: "Lien du contrat retiré",
      contractCheck: (label: string, different: boolean) =>
        `${label} : ${different ? "le contrat diffère" : "conforme au contrat"}`,
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
    memo: (n: number, validated: boolean) =>
      `Dernier deal memo : n°${n}, ${validated ? "validé" : "brouillon"}.`,
    calls: (calls: number, proposals: number) =>
      `${calls} call${calls > 1 ? "s" : ""}` +
      (proposals > 0
        ? `, ${proposals} proposition${proposals > 1 ? "s" : ""} de PO à vérifier sur la page du deal.`
        : "."),
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
    counterpartRequired: "Choisissez le label ou la marque du deal.",
    counterpartNotFound:
      "Ce label ou cette marque est introuvable dans le Réseau.",
    participationMusicOnly:
      "Une participation à un projet collectif se négocie en deal musical.",
    subjectRequired: "Choisissez un artiste, un projet ou une participation.",
    participationNotFound: "Cette participation est introuvable.",
    participationOtherProject:
      "Cette participation appartient à un autre projet.",
    participationOtherArtist:
      "Cette participation est celle d'un autre artiste.",
    useParticipation:
      "Cet artiste participe au projet : ouvrez le deal sur sa participation.",
    assigneeNotSelf:
      "Un deal que vous ouvrez vous est confié : la direction le confie ensuite à quelqu'un d'autre si besoin.",
    collectiveNeedsParticipation:
      "Un projet collectif se négocie par la participation de l'artiste : invitez-le d'abord sur un titre, depuis le projet.",
    participationNotInPlay:
      "Cette participation n'est plus en jeu (refusée, retirée ou titre abandonné).",
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
    negotiationNeedsCall:
      "La négociation commence après un call : attendez que le call prévu ait eu lieu.",
    agreementNeedsTerms:
      "Confirmez au moins un terme avant de proposer l'accord de principe.",
    contractNotSigned:
      "Le deal passe à « Signé » quand son contrat est signé : faites signer le contrat d'abord.",
    noAgreementPending: "Aucun accord de principe n'attend de décision.",
    reasonRequired: "Dites pourquoi.",
    nextActionUnchanged: "Rien n'a changé.",
    termUnchanged: "Ce terme n'a pas changé.",
    termValueRequired: "Donnez une valeur, ou choisissez « À définir ».",
    termUnknown: "Ce terme n'existe pas pour ce type de deal.",
    textTooLong: "Le texte est trop long.",
  },
} as const;
