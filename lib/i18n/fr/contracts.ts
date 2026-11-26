/** Contracts: type, parties, owner, status, dates, files, validation, signature. */
export const contracts = {
  // « Déposer le contrat » (ContractDepositButton).
  deposit: {
    deposit: "Déposer le contrat",
    depositing: "Envoi…",
    deposited: "Contrat déposé",
  },
  title: "Contrats",
  description:
    "Chaque contrat avec ses parties, son responsable et ses versions, de la rédaction à la signature.",
  new: "Nouveau contrat",
  viewsLabel: "Filtrer les contrats",
  views: {
    all: "Tous",
    preparing: "En préparation",
    review: "À valider",
    signature: "À signer",
    signed: "Signés",
    terminated: "Résiliés",
  },
  types: {
    artist: "Contrat d'artiste",
    license: "Licence",
    distribution: "Distribution",
    publishing: "Édition",
    coproduction: "Coproduction",
    image_rights: "Droit à l'image",
    service: "Prestation",
    partnership: "Partenariat",
    other: "Autre",
  },
  states: {
    draft: "En préparation",
    in_review: "À valider",
    approved: "Validé, à signer",
    sent: "Envoyé pour signature",
    signed: "Signé",
    // Sent, and its signed copy is back: PDS signs, then it is « Signé »
    // (Sacha 23/11/2026: « Envoyé pour signature » once back was half true).
    returned: "Revenu signé",
    expired: "Expiré",
    terminated: "Résilié",
  },
  columns: {
    title: "Contrat",
    parties: "Parties",
    state: "État",
    due: "Échéance",
    owner: "Responsable",
  },
  due: "Échéance passée",
  search: {
    label: "Rechercher un contrat",
    placeholder: "Titre, partie, projet, artiste…",
    noResult: (query: string) => `Aucun contrat ne correspond à « ${query} ».`,
  },
  // Contracts and templates, one page (Sacha, 30/10/2026).
  tabs: {
    label: "Contrats ou modèles",
    contracts: "Contrats",
    templates: "Modèles",
  },
  filters: {
    stateLabel: "État",
    stateAll: "Tous les états",
    typeLabel: "Type",
    typeAll: "Tous les types",
    projectLabel: "Projet",
    projectAll: "Tous les projets",
    artistLabel: "Artiste",
    artistAll: "Tous les artistes",
    ownerLabel: "Responsable",
    ownerAll: "Tous les responsables",
  },
  filtersEmpty: "Aucun contrat ne correspond à ces filtres.",
  filtersEmptyBody: "Retirez un filtre pour élargir la liste.",
  emptyTitle: "Aucun contrat pour l'instant",
  emptyBody:
    "Créez un contrat, nommez ses parties depuis le Réseau et déposez ses versions : il sera validé par la direction puis signé.",
  emptyBodyReadOnly:
    "Les contrats que vous suivez, ou ceux de vos projets, apparaîtront ici.",
  emptyViewTitle: (view: string) => `Aucun contrat « ${view} »`,
  emptyViewBody: "Les autres contrats restent dans l'onglet « Tous ».",
  loadError: "Les contrats n'ont pas pu être chargés. Rechargez la page.",
  form: {
    // « Importer un contrat » of a deal: its document with the form.
    documentChosen: (name: string) => `Document choisi : ${name}`,
    documentMissing: "Choisissez le document du contrat.",
    createTitle: "Nouveau contrat",
    editTitle: "Modifier le contrat",
    editDescription: "Modifiable tant qu'il n'est ni en relecture ni résilié.",
    title: "Titre",
    titlePlaceholder: "Ex. Licence de synchronisation — clip de Nova",
    type: "Type",
    owner: "Responsable",
    ownerHint: "La personne qui suit le contrat jusqu'à sa signature.",
    project: "Projet",
    projectNone: "Aucun",
    artist: "Artiste",
    artistNone: "Aucun",
    dueOn: "Échéance",
    dueOnHint: "La date clé : signature attendue, renouvellement, délai.",
    startsOn: "Début",
    endsOn: "Fin",
    notes: "Notes",
    notesPlaceholder: "Conditions clés, points à négocier…",
    submitCreate: "Créer le contrat",
    submitEdit: "Enregistrer",
    pending: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    saved: "Contrat enregistré.",
  },
  // « Nouveau contrat » asks what is being made first (JUR-18), two ways,
  // both done in the modal (Sacha 26/11/2026).
  creation: {
    legend: "Nouveau contrat",
    import: "Déposer un contrat",
    generate: "Partir d'un modèle",
    drop: "Déposez le contrat",
    dropHint: "PDF ou Word : le formulaire se remplit d'après lui.",
    reading: "Lecture du contrat…",
    document: "Contrat",
    documentHint: "PDF ou Word",
    preview: (name: string) => `Contrat déposé : ${name}`,
    previewUnavailable: "Aperçu indisponible pour ce fichier.",
    imported: "Contrat enregistré avec son fichier.",
    project: "Projet",
    projectPlaceholder: "Choisir le projet",
    loading: "Chargement des contrats du projet…",
    loadFailed: "Les contrats de ce projet n'ont pas pu être chargés.",
    unavailable:
      "Ce projet n'est pas encore lancé : il n'a pas de contrats à prévoir.",
    unplanned:
      "Ses contrats se prévoient une fois son État des lieux confirmé, dans son Juridique.",
    openLegal: "Ouvrir le Juridique du projet",
    // « Partir d'un modèle »: the people who still need a contract.
    allCreated: "Tous les contrats de ce projet sont créés.",
    templateOf: (name: string) => `Modèle du contrat de ${name}`,
    chooseTemplateShort: "Choisir un modèle",
    chooseTemplate: "Choisissez un modèle.",
    create: "Créer le contrat",
    creating: "Création…",
    missingAfter: (name: string) =>
      `Il manque des informations pour le contrat de ${name} : complétez-les pour le créer.`,
  },
  // The side sheet of a contract, from the list (the Réseau's model,
  // docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis, Sacha 24/11/2026).
  sheet: {
    expand: "Ouvrir le contrat",
    document: "Voir le contrat",
    email: "E-mail",
    loading: "Chargement…",
    loadFailed: "Le détail de ce contrat n'a pas pu être chargé.",
    lines: {
      parties: "Parties",
      files: "Fichiers",
      invoices: "Factures",
    },
    signs: "Signe",
    linked: {
      title: "Fiches liées",
      project: "Projet",
      artist: "Artiste",
      deals: "Deals",
      origin: "Juridique",
    },
    invoices: "Factures",
    startsOn: "Début",
    endsOn: "Fin",
  },
  page: {
    // The contract's origin in the Juridique (JUR-17).
    legalOrigin: {
      agreement: (project: string) =>
        `Contrat préparé dans le Juridique du projet « ${project} ».`,
      clearance: (element: string) =>
        `Licence d'utilisation de « ${element} ».`,
      backToPlan: "Revenir au Suivi",
      backToClearance: "Revenir à l'autorisation",
    },
    back: "Tous les contrats",
    facts: "Informations",
    type: "Type",
    owner: "Responsable",
    project: "Projet",
    artist: "Artiste",
    dueOn: "Échéance",
    period: "Période",
    periodValue: (start: string | null, end: string | null) =>
      [start ? `du ${start}` : null, end ? `au ${end}` : null]
        .filter(Boolean)
        .join(" "),
    signedOn: "Signé le",
    notes: "Notes",
    none: "non renseigné",
    edit: "Modifier",
    filesTitle: "Fichiers",
    filesDescription:
      "Projets de contrat, exemplaire signé et sa preuve, annexes. Une nouvelle version garde les précédentes.",
    filesEmpty:
      "Glissez le projet de contrat ici, ou cliquez pour le choisir. Chaque nouvelle version gardera les précédentes.",
    filesEmptyReadOnly: "Les fichiers du contrat apparaîtront ici.",
  },
  parties: {
    title: "Parties",
    description:
      "Les personnes et structures du Réseau engagées par le contrat.",
    empty: "Aucune partie pour l'instant.",
    add: "Ajouter une partie",
    contact: "Contact du réseau",
    role: "Rôle dans le contrat",
    rolePlaceholder: "Ex. Producteur, Licencié, Prestataire",
    submit: "Ajouter",
    pending: "Ajout…",
    remove: (name: string) => `Retirer ${name} des parties`,
    signs: "signe",
    // Who the picker offers first, under each name.
    groups: {
      artist: "Artiste du contrat",
      credit: "Crédité sur le projet",
    },
    // The role suggested for the contact of the contract's artist.
    artistRole: "Artiste",
    // A party is a contact of the Réseau: a name alone cannot be bound.
    contactRequired:
      "Une partie est un contact du Réseau : choisissez-la, ou ajoutez-la au Réseau.",
    failed: "La partie n'a pas pu être enregistrée. Réessayez.",
  },
  // « Maintenant » of a contract (proto « Contrats », 29/10/2026): what it
  // asks of the viewer, or who it waits for, from its state.
  now: {
    label: "Maintenant",
    mine: "À vous",
    nothing: "Rien à faire pour vous",
    // Waiting for the party, with a gesture left (remind, drop the signed).
    awaiting: "En attente",
    toValidate: "À valider",
    direction: "la direction",
    titles: {
      deposit: "Déposer le contrat",
      decide: "Valider le contrat",
      submit: "Envoyer le contrat à valider",
      resubmit: "Reprendre le contrat et l'envoyer à valider à nouveau",
      send: "Envoyer le contrat pour signature",
      countersign: "Signer le contrat pour PDS",
      mark_signed: "Marquer le contrat comme signé",
    },
    waiting: (who: string, todo: string, viaLink: boolean) =>
      `En attente de ${who}${viaLink ? " (lien privé)" : ""} : ${todo}`,
    todos: {
      decide: "valider le contrat",
      submit: "envoyer le contrat à valider",
      send: "envoyer le contrat pour signature",
      signer: "signer et renvoyer le contrat",
      countersign: "signer le contrat pour PDS",
      mark_signed: "vérifier la signature et marquer le contrat comme signé",
    },
    greeting: (name: string | null) => (name ? `Bonjour ${name},` : "Bonjour,"),
    // The party who signs, when none is named yet.
    theParty: "la partie qui signe",
    signedTitle: (date: string) => `Signé le ${date}`,
    expiredTitle: (date: string) => `Expiré le ${date}`,
    terminatedTitle: "Résilié",
    facts: {
      then: "Ensuite",
      thenSend: (owner: string) => `Envoi pour signature par ${owner}`,
      thenSendYou: "Vous l'envoyez pour signature",
      validation: "Validation",
      sentTo: "Envoyé à",
      sentToValue: (name: string, email: string | null) =>
        `${name} · ${email ?? "adresse manquante"}`,
      noParty: "aucune partie : ajoutez-la dans « Parties »",
      // One line, as a mail app says it (Sacha 22/11/2026).
      sentLine: (date: string, by: string, how: string) =>
        `Envoyé le ${date}${by ? ` par ${by}` : ""}${how ? `, ${how}` : ""}.`,
      linkLine: (date: string, opened: string | null) =>
        `Mis sur son lien privé le ${date} · ${opened ? `ouvert le ${opened}` : "pas encore ouvert"}.`,
      // The ways of sending as said after « Envoyé le … par … ».
      hows: {
        "Envoyé depuis ma messagerie": "depuis sa messagerie",
        "Envoyé par PDS OS": "par e-mail depuis PDS OS",
        "Envoyé par un outil de signature": "par un outil de signature",
        "Remis en main propre": "remis en main propre",
      } as Record<string, string>,
    },
    // Validated by the business manager or the direction since 18/11/2026
    // (validate_contracts).
    submit: "Envoyer à valider",
    openPdf: "Ouvrir le PDF",
    // « Envoyer par e-mail » sent by PDS OS (emailContractForSignature).
    sendMail: {
      label: "PDS OS envoie l'e-mail, le contrat en pièce jointe",
      hint: "Depuis po@, à votre nom : l'e-mail et sa date font preuve.",
      button: "Envoyer",
      noFile: "Le PDF du contrat est introuvable : déposez-le d'abord.",
      failed: "L'e-mail n'est pas parti. Réessayez, ou envoyez-le autrement.",
      disabled:
        "PDS OS n'envoie pas d'e-mail ici : envoyez-le depuis votre messagerie.",
    },
    decide: {
      approve: "Valider",
      requestChanges: "Demander des modifications",
      comment: "Commentaire",
      commentHint: "Il revient en tête du contrat, chez le responsable.",
      commentPlaceholder: "Ce qui doit changer, et pourquoi",
      commentRequired: "Expliquez les modifications attendues.",
    },
    send: {
      button: "Envoyer pour signature",
      description:
        "Le contrat validé part à la partie qui signe. L'envoi et sa date font preuve : ils restent dans le journal.",
      legend: "Comment l'envoyer ?",
      byMail: "Envoyer par e-mail",
      byMailHint:
        "Préparé par PDS OS, envoyé depuis votre messagerie : l'e-mail et sa date font preuve.",
      otherwise: "Je l'ai remis autrement",
      backToMail: "Revenir à l'e-mail",
      otherwiseHint: "Main propre, outil de signature… avec sa date.",
      markSent: "Marquer comme envoyé",
      sent: "Contrat envoyé pour signature.",
      subject: (title: string) => `À signer : ${title}`,
      body: (
        greeting: string,
        title: string,
        link: string | null,
        me: string,
      ) =>
        `${greeting}\n\nVoici le contrat « ${title} », validé par PDS. ${
          link
            ? `Vous pouvez le relire et le signer depuis votre lien privé, sans compte :\n${link}`
            : "Vous le trouverez en pièce jointe : merci de nous le renvoyer signé."
        }\n\nBien à vous,\n${me} pour PDS`,
      // The attached file, before « .pdf »: « Licence — clip v2 ».
      fileName: (title: string, version: number) => `${title} v${version}`,
      pdf: "Télécharger le PDF",
      pdfPending: "Préparation du PDF…",
      pdfFailed: "Le PDF n'a pas pu être préparé.",
    },
    // The e-mail PDS OS sends itself on the person's private link.
    auto: {
      sendSubject: (title: string) => `« ${title} » : un contrat à signer`,
      sendBody: (title: string) =>
        `Le contrat « ${title} » est prêt. Vous pouvez le relire, le signer et nous le renvoyer depuis votre page, sans compte.`,
      remindSubject: (title: string) => `« ${title} » : le contrat vous attend`,
      remindBody: (title: string, due: string | null) =>
        `Petit rappel : le contrat « ${title} » attend votre signature${due ? `, attendu le ${due}` : ""}. Tout se fait depuis votre page.`,
      open: "Ouvrir le contrat :",
      byMailAuto: "PDS OS envoie l'e-mail avec son lien privé",
      byMailAutoHint:
        "Le contrat est sur sa page privée : il le relit, le signe et nous le renvoie. L'e-mail et sa date font preuve.",
      sendButton: "Envoyer le contrat",
      sendFailed:
        "Le contrat est marqué envoyé, mais l'e-mail n'est pas parti : copiez le lien de sa page et envoyez-le vous-même.",
      sendDone: "Contrat envoyé par e-mail",
      remindDone: "Rappel envoyé par e-mail",
      remindFailed:
        "Le rappel n'est pas parti : copiez le lien de sa page et envoyez-le vous-même.",
      remindDescription:
        "PDS OS envoie le rappel par e-mail, avec le lien de sa page.",
      remindSend: "Envoyer le rappel",
      noAddress: "Cette personne n'a pas d'adresse e-mail dans le Réseau.",
    },
    // The prepared e-mail, when PDS OS does not send it itself.
    mail: {
      to: "À",
      toSource: "Fiche Réseau",
      noAddress: "adresse manquante : ajoutez-la dans sa fiche Réseau",
      subject: "Objet",
      attachment: "Pièce jointe",
      message: "Message",
      link: "Lien privé",
      open: "Ouvrir dans ma messagerie",
      // The card's head when the person sends it from their own mail app.
      title: "L'e-mail à envoyer",
      line: "Préparé par PDS OS, envoyé depuis votre messagerie",
      copy: "Copier le message",
      copied: "Message copié",
      note: "PDS OS n'envoie pas encore l'e-mail lui-même : ouvrez-le dans votre messagerie ou copiez-le.",
      // PDS OS can send e-mails, but not this one (no private link or address).
      noteSmtp:
        "Cet e-mail ne peut pas partir tout seul ici : ouvrez-le dans votre messagerie ou copiez-le.",
    },
    remind: {
      button: "Relancer",
      title: (name: string) => `Relancer ${name}`,
      description: "Le rappel est prêt : il part de votre messagerie.",
      subject: (title: string) =>
        `Rappel : signer et renvoyer le contrat — ${title}`,
      body: (
        greeting: string,
        title: string,
        due: string | null,
        link: string | null,
        me: string,
      ) =>
        `${greeting}\n\nPetit rappel : signer et renvoyer le contrat « ${title} »${
          due ? `, attendu le ${due}` : ""
        }.${link ? ` Tout se fait depuis votre lien, sans compte :\n${link}` : ""}\n\nMerci !\n${me} pour PDS`,
    },
    copyLink: "Copier le lien",
    linkCopied: "Lien copié",
    countersign: {
      button: "Signer pour PDS",
      title: "Signer pour PDS ?",
      // One sentence: the gesture and what it concludes (Sacha 23/11/2026:
      // « trop de texte »); who signed is on the file's card below.
      body: "Signez ce PDF pour PDS avec votre outil habituel, puis déposez-le. Le contrat ne se modifie plus ensuite.",
      done: "Contrat signé pour PDS.",
    },
    // A contract back signed outside its link, or one already signed.
    signedBack: "Le contrat vous est déjà revenu signé ?",
    // Sent by e-mail: the signed copy comes back by e-mail, dropped here.
    depositSigned: "Déposer le contrat signé",
    sign: "Enregistrer la signature",
    // The signed copy came back: its day (SignDateForm).
    signOn: (day: string) => `Enregistrer la signature du ${day}`,
    otherDay: "Autre date",
    signedOnLabel: "Date de signature",
    signedOnMissing:
      "Indiquez le jour de la signature, aujourd'hui au plus tard.",
    terminate: "Résilier",
    confirmTerminateTitle: "Résilier ce contrat ?",
    confirmTerminateBody:
      "Il restera consultable, mais ne pourra plus être modifié.",
    cancel: "Annuler",
    close: "Fermer",
    done: {
      submit: "Contrat envoyé à valider.",
      approve: "Contrat validé.",
      request_changes: "Modifications demandées au responsable.",
      send: "Contrat marqué comme envoyé.",
      countersign: "Contrat signé pour PDS.",
      sign: "Signature enregistrée.",
      terminate: "Contrat résilié.",
    },
  },
  // The generated document in head of the page.
  document: {
    name: (title: string, version: number) => `${title} · v${version}`,
    draftLine: "Projet de contrat",
    signedLine: (name: string) => `Signé par ${name}, reçu par son lien privé`,
    toDecide: "à décider",
    // « Changé depuis la v1 : Part 50 % → 40 % (Lina Haddad, 30/10) ».
    changed: (version: number, what: string, by: string, day: string) =>
      `Changé depuis la v${version - 1} : ${what} (${by}, ${day})`,
  },
  errors: {
    invalid: "Vérifiez le titre, le type et les dates.",
    dates: "La fin ne peut pas précéder le début.",
    forbidden: "Vous ne pouvez pas modifier ce contrat.",
    owner: "Ce responsable ne peut pas suivre de contrat.",
    comment: "Expliquez les modifications attendues.",
    signedOn: "La date de signature doit être aujourd'hui ou avant.",
    status: "Le contrat a changé d'état entre-temps. Rechargez la page.",
    failed: "L'opération n'a pas abouti. Réessayez.",
  },
} as const;
