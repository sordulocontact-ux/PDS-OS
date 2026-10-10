// Emprunts à sécuriser (ticket Juridique 05): the clearance of an element taken
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
    title: "Emprunts",
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
  stages: {
    label: "Avancement de l'emprunt",
    ask: {
      title: "Demander",
      future: "Ce qui est repris, et à qui le demander.",
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
      future:
        "Leur réponse, puis la validation des conditions par la direction.",
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
    },
    sign: {
      title: "Signer",
      future: "Un contrat par droit concerné, signé, avec sa preuve.",
      contract: (right: string) => `Contrat · ${right}`,
      deposit:
        "Déposez ici le contrat signé et sa preuve : ils sont rangés dans le contrat.",
      signedSlot: "Contrat signé",
      evidenceSlot: "Preuve de signature",
      slotHint: "Glissez un fichier ou cliquez",
      evidenceHint: "E-mail de retour, certificat, accusé",
      uploading: "Envoi…",
      deposited: "Déposé",
      markSigned: "Marquer le contrat comme signé",
      contractState: (state: string) => `Contrat : ${state}`,
      openContract: "Ouvrir le contrat",
      secure: "Marquer comme sécurisé",
      securing: "Vérification…",
    },
    done: {
      cleared: "Sécurisé : le titre n'est plus bloqué par cet emprunt.",
      abandoned: "Élément abandonné : il ne bloque plus la sortie.",
    },
    summary: {
      ask: (scope: string, holders: string) =>
        holders ? `${scope} · ${holders}` : scope,
      negotiate: "Conditions validées par la direction",
      sign: "Signé, avec sa preuve",
    },
    journal: "Journal de l'emprunt",
    other: "Autre issue",
  },
  // The words of the panel's three moments, as in the prototype of
  // 07/10/2026 (lib/legal/clearance/flow-actions.ts).
  flow: {
    taken: (work: string) => `Ce qui est repris de « ${work} »`,
    scopes: {
      both: "L'œuvre et l'enregistrement",
      work: "L'œuvre",
      master: "L'enregistrement",
      none: "Rien à sécuriser",
    },
    proposed: {
      sample:
        "Proposé parce que c'est un sample : il reprend en général la mélodie et le son. Corrigez si besoin.",
      work: "Proposé parce que l'élément est réenregistré : seule l'œuvre est reprise. Corrigez si besoin.",
    },
    // Who holds the rights of the borrowed work, never of the project's
    // title (Sacha's question of 07/10/2026): almost always companies,
    // added once to the Réseau as structures and picked again.
    holderOf: {
      work: (work: string) => `Qui détient l'œuvre « ${work} » ?`,
      master: (work: string) =>
        `Qui détient l'enregistrement original de « ${work} » ?`,
    },
    holderWhere: {
      work: "Son éditeur musical : il figure sur la fiche de l'œuvre dans le répertoire en ligne de la SACEM. Écrivez à son service licences.",
      master:
        "Le label ou le producteur du son original : il figure sur la mention ℗ de la sortie (pochette, plateformes). Écrivez à son service licences.",
    },
    holderMissing: "Choisissez à qui vous avez demandé.",
    holdersFallback: "les ayants droit",
    removeHolder: (name: string) => `Retirer ${name}`,
    reasonLabel: "Pourquoi rien n'est à sécuriser ?",
    reasonPlaceholder: "Ex. composition du domaine public",
    reasonMissing: "Dites pourquoi rien n'est à sécuriser.",
    save: "Enregistrer",
    askHint:
      "Envoyez la demande par votre canal habituel. Contacter n'est pas être autorisé : rien n'avance avant leur réponse.",
    sent: "J'ai envoyé la demande",
    copyRequest: "Copier un modèle de demande",
    copied: "Modèle de demande copié",
    copiedDetail: "L'élément, l'œuvre et le titre sont déjà remplis.",
    requestTemplate: (element: string, work: string, title: string | null) =>
      `Bonjour,\n\nNous souhaitons utiliser ${element.toLowerCase()} de « ${work} »${
        title ? ` dans le titre « ${title} »` : ""
      }. Pourriez-vous nous indiquer à quelles conditions vous l'autoriseriez ?\n\nBien à vous,`,
    requestLog: (names: string) =>
      names
        ? `Demande d'autorisation envoyée à ${names}.`
        : "Demande d'autorisation envoyée aux ayants droit.",
    missingCount: (count: number) =>
      count === 1
        ? "Un ayant droit manque."
        : `${count} ayants droit manquent.`,
    askedTo: (names: string, date: string) =>
      `Demandé à ${names} le ${date}. Quand ils répondent, collez leur réponse : PO en tire les conditions.`,
    replyLabel: "Leur réponse",
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
    atDirection: "Chez la direction",
    atDirectionBody:
      "La direction valide les conditions. Rien à faire de votre côté : le contrat se prépare dès qu'elle a validé.",
    validate: "Valider les conditions",
    counter: "Demander une contre-proposition",
    validateNote:
      "Rien n'engage PDS avant votre validation. Valider prépare le contrat d'autorisation, prêt à envoyer.",
    refused: "Ils refusent",
    refusedBody:
      "Le titre ne peut pas sortir avec cet élément en l'état : reprendre la négociation, ou retirer l'élément.",
    resume: "Reprendre la négociation",
    contractTitle: (work: string) => `Autorisation d'emprunt · « ${work} »`,
    contractNotes:
      "Préparé à la validation des conditions de l'emprunt (Juridique, Emprunts).",
    contractCard: "Contrat d'autorisation",
    contractDetail: (terms: string) =>
      terms
        ? `Conditions validées : ${terms}`
        : "Conditions validées par la direction",
    openContract: "Ouvrir le contrat",
    sendHint: "Envoyez-le, puis dites comment : c'est la preuve d'envoi.",
    sendBy: [
      "Envoyé par e-mail",
      "Envoyé par un outil de signature",
      "Remis en main propre",
    ],
    sentHint:
      "Envoyé pour signature. Quand le signé revient, déposez-le avec sa preuve (l'e-mail de retour, le certificat de signature).",
    contractWaits:
      "Le contrat attend la validation de la direction avant de pouvoir partir.",
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
  },
} as const;
