// Autorisations d'utilisation d'une œuvre existante (ticket Juridique 05, JUR-09): the clearance of an element taken
// from an existing work, from the qualification of its usage to the proof.
export const legalClearance = {
  statuses: {
    to_investigate: "À instruire",
    rightsholders_identified: "Ayants droit identifiés",
    contacted: "Contactés",
    waiting_external: "En attente de réponse",
    negotiating: "En négociation",
    agreement_reached: "Accord trouvé",
    document_pending: "Document en cours",
    signed: "Signé",
    cleared: "Sécurisé",
    refused: "Refusé",
    abandoned: "Abandonné",
    action_required: "Action requise",
  } as Record<string, string>,
  // What to do now, by state (the ticket's « prochaine action »).
  next: {
    to_investigate:
      "Qualifier l'usage : ce qui est repris, et quels droits il touche.",
    rightsholders_identified:
      "Contacter les ayants droit et consigner l'envoi.",
    contacted: "Attendre leur réponse, ou relancer.",
    waiting_external: "Relancer, ou consigner leur réponse.",
    negotiating:
      "Consigner les conditions reçues et les faire valider par la direction.",
    agreement_reached: "Obtenir le contrat et le rattacher au droit concerné.",
    document_pending: "Faire signer le contrat.",
    signed:
      "Déposer le signé et sa preuve dans le contrat, puis lever le blocage.",
    cleared: "Rien : l'élément est sécurisé.",
    refused: "Retirer l'élément, le remplacer ou abandonner.",
    abandoned: "Rien : l'élément est abandonné.",
    action_required: "Traiter l'action demandée, puis reprendre.",
  } as Record<string, string>,
  scopes: {
    work: "L'œuvre (composition, paroles)",
    master: "L'enregistrement (master)",
    both: "L'œuvre et l'enregistrement",
    none: "Rien à sécuriser",
  },
  rights: { work: "Œuvre", master: "Enregistrement" } as Record<string, string>,
  roles: {
    publisher: "Éditeur",
    author: "Auteur·rice",
    composer: "Compositeur·rice",
    producer: "Producteur (phonographique)",
    label: "Label",
    other: "Autre",
  },
  kinds: { message: "Message", email: "E-mail", call: "Appel", note: "Note" },
  directions: { out: "Envoyé", in: "Reçu", internal: "Interne" },
  missing: {
    qualification: "Qualifier l'usage",
    scope_none: "Rien n'est à sécuriser : il ne reste qu'à lever le blocage",
    rightsholder: (right: string) => `Identifier les ayants droit (${right})`,
    contacted: "Consigner un premier envoi dans les Échanges",
    terms_validated: "Faire valider les conditions par la direction",
    contract: (right: string) => `Rattacher le contrat (${right})`,
    signed: (right: string) => `Faire signer le contrat (${right})`,
    evidence: (right: string) =>
      `Déposer le signé et sa preuve dans le contrat (${right})`,
  },
  page: {
    title: "Autorisations d'œuvres existantes",
    description:
      "Chaque élément repris d'une œuvre existante, de la qualification de l'usage à la preuve. Un contact trouvé ou un accord de principe ne suffit pas : l'élément n'est sécurisé qu'avec la preuve de chaque droit concerné.",
    empty: "Aucun élément à sécuriser dans ce projet.",
    open: "Ouvrir",
    blocks: "Bloque la sortie en l'état",
    blocksRelease: "bloque la sortie",
    responsible: (name: string) => `Suivi par ${name}`,
    noResponsible: "Responsable à désigner",
  },
  drawer: {
    tabs: {
      overview: "Vue d'ensemble",
      exchanges: "Échanges",
      documents: "Documents",
      history: "Historique",
    },
    close: "Fermer",
    next: "Prochaine action",
    qualification: "Usage",
    usage: "Ce qui est repris, exactement",
    scope: "Droits concernés",
    reason: "Pourquoi rien n'est à sécuriser",
    responsible: "Responsable",
    noResponsible: "À désigner",
    save: "Enregistrer",
    saving: "Enregistrement…",
    rightsholders: "Ayants droit",
    rightsholdersEmpty: "Aucun ayant droit identifié.",
    right: "Droit",
    role: "Rôle",
    add: "Ajouter",
    remove: (name: string) => `Retirer ${name}`,
    terms: "Conditions",
    termsEmpty: "Aucune condition reçue.",
    amount: "Montant",
    share: "Part",
    credits: "Crédits",
    territory: "Territoire",
    duration: "Durée",
    other: "Autres conditions",
    proposeTerms: "Enregistrer les conditions reçues",
    termsStatus: {
      proposed: "Proposées, à valider par la direction",
      validated: "Validées par la direction",
      rejected: "Refusées par la direction",
    } as Record<string, string>,
    validate: "Valider",
    reject: "Refuser",
    progress: "Avancement",
    moveTo: (label: string) => `Passer à « ${label} »`,
    resumeAt: (label: string) => `Reprendre à « ${label} »`,
    needs: "Pour passer à l'étape suivante :",
    exceptions: {
      refused: "Refus des ayants droit",
      abandoned: "Abandonner l'élément",
      action_required: "Action requise",
    } as Record<string, string>,
    exceptionNote: "Raison",
    confirmException: "Enregistrer",
  },
  holder: {
    person: "Ayant droit",
    inSplit: "Dans la répartition de l'édition du titre",
    missing:
      "Choisissez l'ayant droit dans le Réseau, ou gardez seulement son nom.",
  },
  exchanges: {
    title: (count: number) => `Échanges (${count})`,
    last: (at: string) => `Dernier le ${at}`,
    more: "Lire tout",
    less: "Réduire",
    empty: "Aucun échange pour l'instant.",
    kind: "Type",
    direction: "Sens",
    body: "Ce qui s'est passé",
    add: "Ajouter au journal",
    read: "Lire avec PO",
    reading: "Lecture…",
    proposalTitle: "Ce que PO propose",
    proposalEmpty:
      "PO n'a rien relevé de précis : l'échange peut être ajouté tel quel.",
    proposalNotice:
      "Rien n'est appliqué sans vous : chaque proposition s'applique d'un clic, l'échange est gardé dans le journal.",
    events: {
      new_contact: "Un nouveau contact",
      call_planned: "Un appel prévu",
      conditions_received: "Des conditions reçues",
      counter_proposal: "Une contre-proposition",
      contract_received: "Un contrat reçu",
      refusal: "Un refus",
      agreement: "Un accord de principe",
      other: "Un autre échange",
    } as Record<string, string>,
    suggestedStatus: (label: string) => `Passer à « ${label} »`,
    addRightsholder: (name: string) => `Ajouter ${name} aux ayants droit`,
    addTerms: "Enregistrer ces conditions (à valider par la direction)",
    applied: "Appliqué",
    providerError:
      "PO n'a pas pu lire l'échange. Ajoutez-le tel quel ou réessayez.",
  },
  documents: {
    none: "Aucun contrat rattaché.",
    choose: "Contrat du projet",
    link: "Rattacher",
    open: "Ouvrir le contrat",
    signed: "Contrat signé",
    evidence: "Preuve de signature",
    present: "déposé",
    absent: "manquant",
    noScope:
      "Qualifiez d'abord l'usage : il dit quels droits demandent un contrat.",
    nothing: "Rien à sécuriser : aucun contrat n'est demandé.",
  },
  history: { empty: "Aucun changement pour l'instant." },
  // The drawer in three moments (Sacha, 07/10/2026: « simplifie-la au max
  // et rends-la plus fluide »). The nine states of the ticket stay
  // underneath; each moment ends with one action.
  // JUR-09: what is asked, then each right apart, with its own state.
  request: {
    title: "La demande",
    element: "Ce qui est repris",
    work: "Œuvre existante",
    usage: "Usage",
    holder: (right: string) => `Ayant droit de ${right}`,
    noHolder: "À identifier",
    linked: (name: string) => `${name} est dans le Réseau`,
    rightsTitle: (n: number) =>
      n > 1 ? "Deux autorisations distinctes" : "L'autorisation",
    rightOf: { work: "l'œuvre", master: "l'enregistrement" } as Record<
      string,
      string
    >,
    rightLabel: {
      work: "Droits sur l'œuvre",
      master: "Droits sur l'enregistrement",
    } as Record<string, string>,
    states: {
      to_identify: "Ayant droit à identifier",
      to_ask: "Demande à envoyer",
      asked: "Demande envoyée · en attente",
      terms_proposed: "Conditions proposées",
      terms_accepted: "Conditions acceptées · pas encore autorisée",
      to_sign: "Licence à signer · pas encore autorisée",
      authorized: "Autorisée · licence signée",
      refused: "Refusée",
    },
  },
  stages: {
    ask: {
      title: "Demander",
      sent: "J'ai envoyé la demande",
      sending: "Enregistrement…",
      note: "Ce qui est parti",
      notePlaceholder:
        "Ex. demande envoyée par e-mail à l'éditeur et au producteur le 7 octobre",
      sentDefault: "Demande d'autorisation envoyée aux ayants droit.",
      hint: "Envoyez la demande par votre canal habituel, puis dites-le ici. Contacter n'est pas être autorisé : rien n'avance avant leur réponse.",
      qualifyFirst:
        "Enregistrez d'abord ce qui est repris : les ayants droit à contacter en dépendent.",
      none: "Rien à sécuriser : lever le blocage",
    },
    negotiate: {
      title: "Négocier",
      reply: "Leur réponse",
      replyHint:
        "Collez leur e-mail ou leur message : PO en tire les conditions et les ayants droit, rien n'est appliqué sans vous.",
      next: "Passer à la signature",
      waitsDirector:
        "Les conditions attendent la direction : elle les valide depuis ce panneau ou son Travail.",
      refused: "Refusé par les ayants droit",
      refusedBody:
        "Le titre ne peut pas sortir avec cet élément en l'état : retirer, remplacer, ou reprendre la négociation.",
      resume: "Reprendre la négociation",
      // « Décider de la suite » after a refusal (lot 9 J8, proto).
      decide: {
        title: "Décider de la suite",
        blocked:
          "Tant que rien n'est décidé, la sortie reste bloquée : l'autorisation est dans « À résoudre avant sortie ».",
        withdraw: "Retirer l'élément du titre",
        withdrawBody:
          "Le titre sort sans l'élément : la personne qui suit le Master est prévenue pour refaire le passage.",
        withdrawWhy: "Pourquoi",
        withdrawDone: "Élément retiré du titre",
        replace: "Le remplacer",
        replaceBody:
          "Une nouvelle demande part pour ce qui le remplace ; pour une version rejouée, seule l'œuvre est à autoriser.",
        replaceWhat: "Par quoi",
        replaceAction: "Remplacer et redemander",
        replaceDone: "Nouvelle demande créée",
      },
    },
    sign: {
      title: "Signer",
      contract: (right: string) => `Contrat · ${right}`,
      deposit:
        "Déposez ici le contrat signé et sa preuve : ils sont rangés dans le contrat.",
      signedSlot: "Contrat signé",
      evidenceSlot: "Preuve de signature",
      slotHint: "Glissez un fichier ou cliquez",
      evidenceHint: "E-mail de retour, certificat, accusé",
      uploading: "Envoi…",
      deposited: "Déposé",
      // The wrong file dropped: a new version, the old one kept in its
      // history (Sacha 23/11/2026).
      replace: (label: string) => `Remplacer : ${label}`,
      replaceShort: "Remplacer",
      replaced: "Fichier remplacé",
      markSigned: "Marquer le contrat comme signé",
      contractState: (state: string) => `Contrat : ${state}`,
      openContract: "Ouvrir le contrat",
      secure: "Marquer comme sécurisé",
      securing: "Vérification…",
    },
    done: {
      cleared:
        "Autorisée : le titre n'est plus bloqué par cette œuvre existante.",
      abandoned: "Élément abandonné : il ne bloque plus la sortie.",
    },
    other: "Autre issue",
  },
  // The words of the panel's three moments, as in the prototype of
  // 07/10/2026 (lib/legal/clearance/flow-actions.ts).
  flow: {
    taken: (work: string) => `Ce qui est repris de « ${work} »`,
    // The three numbered steps of « Demander » (Sacha, 07/11/2026: fewer
    // words, the number gives the order).
    stepScope: "Ce qui est repris",
    stepSend: "Envoyer la demande",
    proposedTag: "proposé",
    scopes: {
      both: "L'œuvre et l'enregistrement",
      work: "L'œuvre",
      master: "L'enregistrement",
      none: "Rien à sécuriser",
    },
    // Who holds the rights of the borrowed work, never of the project's
    // title (Sacha's question of 07/10/2026): almost always companies,
    // added once to the Réseau as structures and picked again.
    holderOf: {
      work: (work: string) => `Qui détient l'œuvre « ${work} » ?`,
      master: (work: string) =>
        `Qui détient l'enregistrement original de « ${work} » ?`,
    },
    // Under the picker: a gesture when there is one (the SACEM's online
    // repertoire names the work's publisher), a few words otherwise.
    holderWhere: {
      work: "Trouver son éditeur dans le répertoire de la SACEM",
      master: "Le label du son original : mention ℗ de la sortie.",
    },
    holderMissing: "Choisissez à qui vous avez demandé.",
    holdersFallback: "les ayants droit",
    removeHolder: (name: string) => `Retirer ${name}`,
    // « Autre issue » before asking: nothing to secure, with its reason.
    nothing: "Rien à sécuriser",
    nothingBody:
      "Le blocage est levé sans demande : dites pourquoi, la raison reste dans le journal.",
    nothingDone: "Rien à sécuriser : blocage levé",
    reasonLabel: "Pourquoi rien n'est à sécuriser ?",
    sent: "J'ai envoyé la demande",
    sentOtherwise: "Je l'ai envoyée autrement",
    send: "Envoyer la demande",
    ownMail: "À envoyer depuis votre messagerie, puis à déclarer ici",
    sendTo: (names: string) => `Envoyer à ${names}`,
    sending: "Envoi…",
    subject: (taken: string) => `Demande d'autorisation · ${taken}`,
    toPending: "L'ayant droit choisi ci-dessus",
    addressOf: (name: string) => `Adresse e-mail de ${name}`,
    addressMissing: "Écrivez son adresse e-mail.",
    addressPlaceholder: (name: string) => `Adresse e-mail de ${name}`,
    addressSaved: "Gardée dans sa fiche du Réseau à l'envoi",
    openMail: "Ouvrir dans ma messagerie",
    requestTemplate: (element: string, work: string, title: string | null) =>
      `Bonjour,\n\nNous souhaitons utiliser ${element.toLowerCase()} de « ${work} »${
        title ? ` dans le titre « ${title} »` : ""
      }. Pourriez-vous nous indiquer à quelles conditions vous l'autoriseriez ?\n\nBien à vous,`,
    // The journal keeps what left, word for word: the proof (JUR-10).
    emailLog: (
      names: string,
      subject: string,
      message: string,
      missed: string,
    ) =>
      [
        `Demande envoyée par e-mail par PDS OS à ${names}.`,
        ...(missed
          ? [`Non partie pour ${missed} : à leur écrire vous-même.`]
          : []),
        `Objet : ${subject}`,
        "",
        message,
      ].join("\n"),
    requestLog: (names: string) =>
      names
        ? `Demande d'autorisation envoyée à ${names}.`
        : "Demande d'autorisation envoyée aux ayants droit.",
    missingCount: (count: number) =>
      count === 1
        ? "Il manque une réponse ci-dessus."
        : `Il manque ${count} réponses ci-dessus.`,
    askedTo: (names: string, date: string) => `Demandé à ${names} le ${date}.`,
    replyLabel: "Leur réponse",
    // A reply filed from PO's mailbox (cron), put in « Leur réponse ».
    replyReceived: (from: string, at: string) =>
      `Reçue par e-mail de ${from}, le ${at}.`,
    replyEmpty: "(Message sans texte)",
    replyAttachments: (names: string) => `Pièces jointes : ${names}`,
    replyPlaceholder: "Collez leur e-mail ou leur message",
    replyMissing: "Collez leur réponse.",
    read: "Lire la réponse",
    reading: "Lecture…",
    understood: "Ce que PO a compris",
    termsRead: "Conditions de leur réponse, lues par PO et relues par l'équipe",
    verbatim:
      "Rien n'est gardé qui ne soit mot pour mot dans leur réponse. Corrigez si besoin.",
    refusal: "Un refus",
    notThat: "Ce n'est pas ça",
    toDirection: "Envoyer à la direction",
    recordRefusal: "Enregistrer le refus",
    amount: "Montant",
    amountInvalid: "Écrivez un montant en euros, par exemple 2 000.",
    share: "Part",
    credits: "Crédits",
    countered:
      "La direction a demandé une contre-proposition : collez leur nouvelle réponse.",
    // « En attente de Claire Morel : valider les conditions » (StepWaiting).
    atDirection: "valider les conditions",
    validate: "Valider les conditions",
    counter: "Demander une contre-proposition",
    validateNote:
      "Rien n'engage PDS avant votre validation. Valider prépare le contrat d'autorisation, prêt à envoyer.",
    refused: "Ils refusent",
    refusedBody:
      "Le titre ne peut pas sortir avec cet élément en l'état : reprendre la négociation, ou retirer l'élément.",
    resume: "Reprendre la négociation",
    contractTitle: (work: string) => `Licence d'utilisation · « ${work} »`,
    contractNotes:
      "Préparé à la validation des conditions de l'autorisation (Juridique, Autorisations).",
    contractCard: "Contrat d'autorisation",
    contractDetail: (terms: string) =>
      terms
        ? `Conditions validées : ${terms}`
        : "Conditions validées par la direction",
    openContract: "Ouvrir le contrat",
    // « Signer » sends the contract like the request (Sacha, 09/11/2026):
    // the same e-mail card, the contract joined.
    contractSubject: (work: string) =>
      `Contrat d'autorisation · « ${work} » · à signer`,
    contractTemplate: (work: string, terms: string) =>
      `Bonjour,\n\nComme convenu, vous trouverez ci-joint le contrat d'autorisation pour « ${work} »${
        terms ? ` (${terms})` : ""
      }. Pourriez-vous nous le retourner signé, en réponse à cet e-mail ?\n\nBien à vous,`,
    contractSendTo: (names: string) => `Envoyer le contrat à ${names}`,
    contractSentOtherwise: "Je l'ai envoyé autrement",
    contractOwnMail:
      "À envoyer depuis votre messagerie, contrat joint, puis à déclarer ici",
    contractSent: "J'ai envoyé le contrat",
    attachmentSee: "Voir",
    noDocument:
      "Déposez ici le contrat à envoyer : PDS OS le joindra à l'e-mail. Il n'en écrit jamais le texte.",
    draftSlot: "Contrat à envoyer",
    draftHint: "PDF ou Word · glissez un fichier ou cliquez",
    otherwiseHow: "Comment est-il parti ?",
    contractEmailLog: (
      names: string,
      subject: string,
      message: string,
      missed: string,
      files: string,
    ) =>
      [
        `Contrat envoyé par e-mail par PDS OS à ${names}, joint : ${files}.`,
        ...(missed
          ? [`Non parti pour ${missed} : à leur écrire vous-même.`]
          : []),
        `Objet : ${subject}`,
        "",
        message,
      ].join("\n"),
    sendBy: [
      "Envoyé par e-mail",
      "Envoyé par un outil de signature",
      "Remis en main propre",
    ],
    sentHint:
      "Envoyé pour signature. S'il revient signé en réponse à l'e-mail, PDS OS le range ici avec l'e-mail comme preuve ; sinon déposez-le avec sa preuve (l'e-mail de retour, le certificat de signature).",
    // The signed copy came back by e-mail, kept by PDS OS (cron).
    signedByEmail:
      "Revenu signé par e-mail : ouvrez-le pour vérifier qu'il est bien signé, puis marquez l'autorisation comme sécurisée.",
    receivedByEmail: "Reçu par e-mail",
    // Who acts next on the authorisation contract, by its state (the
    // owner submits and sends it, the direction validates it).
    toSubmit:
      "À vous : soumettez le contrat à la direction depuis sa page. Une fois validé, vous l'enverrez d'ici.",
    toDecide:
      "À vous : validez le contrat depuis sa page. Son responsable pourra ensuite l'envoyer.",
    awaitSubmit: "soumettre le contrat à la direction",
    awaitDecide: "valider le contrat",
    awaitSend: "envoyer le contrat pour signature",
    openToSubmit: "Ouvrir le contrat pour le soumettre",
    openToDecide: "Ouvrir le contrat pour le valider",
    responsible: "son responsable",
    secure: "Marquer comme sécurisé",
    filesMissing: (what: string) => `Il manque ${what}.`,
    signedMissing: "le contrat signé",
    evidenceMissing: "la preuve de signature",
    and: " et ",
    withdraw: "Retirer l'élément du titre",
    withdrawNote: "Élément retiré du titre.",
  },
  events: {
    "clearance.updated": "Étape changée",
    "clearance.qualified": "Usage qualifié",
    "clearance.rightsholder_added": "Ayant droit ajouté",
    "clearance.rightsholder_removed": "Ayant droit retiré",
    "clearance.communication": "Échange consigné",
    "clearance.conditions_received": "Conditions reçues",
    "clearance.conditions_validated": "Conditions validées",
    "clearance.conditions_rejected": "Conditions refusées",
    "clearance.contract_linked": "Contrat rattaché",
    "clearance.refused": "Refus enregistré",
    "clearance.signed": "Signé",
    "clearance.cleared": "Sécurisé",
  } as Record<string, string>,
  errors: {
    missing: (items: string) => `Il manque : ${items}.`,
    note: "Dites pourquoi.",
    reason: "Dites pourquoi rien n'est à sécuriser.",
    usage: "Décrivez l'usage exact.",
    termsNotAllowed: "Seule la direction valide des conditions.",
    closed: "Cet élément est clos.",
    contactInvalid:
      "Ce contact n'est plus dans le Réseau : choisissez-en un autre.",
    failed: "L'action n'a pas pu être faite. Réessayez.",
    emailFailed:
      "L'e-mail n'est pas parti, rien n'est enregistré. Réessayez, ou envoyez-le vous-même puis « Je l'ai envoyée autrement ».",
    contractEmailFailed:
      "L'e-mail n'est pas parti, rien n'est enregistré. Réessayez, ou envoyez le contrat vous-même puis « Je l'ai envoyé autrement ».",
    contractNoDocument:
      "Le contrat n'a pas encore de texte à joindre : mettez-le sur sa page, puis revenez l'envoyer.",
  },
} as const;
