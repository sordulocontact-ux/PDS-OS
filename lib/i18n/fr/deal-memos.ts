/** The deal memo and the contract of a deal (BIZ 7). */
export const dealMemos = {
  section: "Deal memo",
  none: "Aucun deal memo : il se crée à l'accord de principe, ou à la main.",
  // The circuit by e-mail (réunion avec Ibé du 18/11/2026).
  noneByEmail:
    "Aucun deal memo. Celui du label ou de la marque arrive par e-mail à l'adresse du deal : il se range ici.",
  address: {
    label: (address: string) => `Adresse du deal : ${address}`,
    copy: "Copier",
    copied: "Adresse copiée",
    aria: "Copier l'adresse e-mail du deal",
  },
  // The negotiation's gesture in « Maintenant » (DealMemoNow, Sacha
  // 22/11/2026): the deal memo is the accord de principe.
  now: {
    show: "Faire valider le deal memo par la direction",
    validate: "Valider le deal memo",
    validateButton: "Valider",
    write: "Rédiger le deal memo",
    waiting: (who: string) => `En attente du deal memo de ${who}`,
    correct: (who: string) => `Demander la correction à ${who}`,
    resend: (who: string) => `Renvoyer l'accord validé à ${who}`,
    rewrite: "Rédiger la nouvelle version du deal memo",
    waitingAgain: (who: string) =>
      `En attente de la nouvelle version du deal memo de ${who}`,
    copyAddress: "Copier l'adresse du deal",
  },
  toValidate: "À valider",
  receivedFrom: (from: string | null, day: string) =>
    from ? `Reçu de ${from}, le ${day}` : `Reçu le ${day}`,
  submittedBy: (who: string | null, day: string) =>
    who
      ? `Envoyé à valider par ${who}, le ${day}`
      : `Envoyé à valider le ${day}`,
  correctionTo: (to: string | null, day: string) =>
    to
      ? `Correction demandée à ${to}, le ${day}`
      : `Correction demandée le ${day}`,
  changesBy: (who: string | null, day: string, reason: string) =>
    `${who ?? "La direction"} demande des modifications (${day}) : « ${reason} »`,
  sentTo: (to: string | null, day: string) =>
    to
      ? `Renvoyé le ${day} à ${to}`
      : `Renvoyé le ${day}, autrement que par PDS OS`,
  openFile: "Ouvrir le PDF",
  openFileNamed: (name: string) => `Ouvrir ${name}`,
  file: "Pièce jointe",
  subject: "Objet",
  message: "Message",
  submit: "Envoyer à valider",
  submitted: "Deal memo envoyé à la direction pour validation",
  changes: {
    button: "Demander des modifications",
    title: "Demander des modifications",
    description:
      "Ce qui doit changer, par écrit : le business manager le reçoit, avec ce qui s'est dit en appel.",
    reason: "Ce qui doit changer",
    done: "Modifications demandées",
  },
  // « Demander la correction » (Sacha 22/11/2026): the direction's changes
  // sent to the label from PDS OS, the next version coming back to the deal.
  correction: {
    button: (who: string) => `Écrire à ${who}`,
    title: "Demander la correction",
    description:
      "Les modifications demandées par la direction partent au label depuis PDS OS ; sa nouvelle version revient dans ce deal.",
    subject: (deal: string, received: string | null) =>
      received ? `Re: ${received}` : `Deal memo · ${deal}`,
    message: (reason: string) =>
      `Bonjour,\n\nMerci pour le deal memo. Après relecture, nous souhaitons une modification :\n\n${reason}\n\nPouvez-vous nous renvoyer une version corrigée ?\n\nBien à vous,`,
    done: "Correction demandée",
  },
  send: {
    button: "Renvoyer l'accord validé",
    title: "Renvoyer l'accord validé",
    description:
      "Le deal memo validé part en pièce jointe ; les contacts dans la boucle le reçoivent en copie.",
    subject: (deal: string, received: string | null) =>
      received ? `Re: ${received}` : `Deal memo validé · ${deal}`,
    message:
      "Bonjour,\n\nNous vous confirmons notre accord sur le deal memo ci-joint. Nous revenons vers vous avec le contrat.\n\nBien à vous,",
    address: "Adresse du destinataire",
    addressPlaceholder: "adresse@label.com",
    addressMissing: "Écrivez l'adresse du destinataire.",
    fromEmail: "Expéditeur du deal memo",
    copies: (names: string) => `En copie : ${names}`,
    copiesProof: (names: string) => `copie à ${names}`,
    send: "Envoyer",
    sending: "Envoi…",
    sentOtherwise: "Envoyé autrement",
    markSent: "Marquer comme envoyé",
    openMail: "Ouvrir ma messagerie",
    done: "Accord renvoyé",
    failed: "L'e-mail n'est pas parti. Réessayez, ou envoyez-le autrement.",
    disabled: "PDS OS n'envoie pas d'e-mail ici : envoyez-le autrement.",
    noAttachment: "Le deal memo n'a pas pu être joint. Réessayez.",
    invalid: "Écrivez l'objet et le message.",
    missed: (names: string) =>
      `Accord renvoyé. Copie non envoyée à ${names} : adresse inconnue ou privée.`,
  },
  // What PO reads of the latest memo's circuit (lib/assistant/read/deals.ts).
  read: {
    received: "Ce deal memo est arrivé par e-mail du label ou de la marque.",
    submitted: "Il a été envoyé à la direction pour validation.",
    changes: (reason: string) =>
      `La direction demande des modifications : « ${reason} ».`,
    correction: "La correction a été demandée au label.",
    sent: "L'accord validé a été renvoyé.",
  },
  loop: {
    section: "Dans la boucle",
    empty: "Personne d'autre dans la boucle.",
    add: "Mettre dans la boucle",
    title: "Mettre dans la boucle",
    description:
      "Un contact reçoit en copie le deal memo renvoyé ; un membre de l'équipe est prévenu à chaque étape.",
    kind: "Qui",
    kinds: { contact: "Contact du Réseau", member: "Membre de l'équipe" },
    contact: "Contact",
    member: "Membre",
    memberPlaceholder: "Choisir un membre",
    noMember: "Aucun autre membre ne lit ce deal.",
    required: "Choisissez une personne.",
    submit: "Ajouter",
    added: "Ajouté à la boucle",
    remove: "Retirer",
    removed: "Retiré de la boucle",
    copyTo: (email: string) => `En copie : ${email}`,
    told: "Prévenu à chaque étape",
    noEmail: "Sans adresse lisible : pas de copie",
  },
  create: "Nouveau deal memo",
  created: "Deal memo créé",
  validate: "Valider le deal memo",
  validated: "Deal memo validé",
  name: (n: number) => `Deal memo n°${n}`,
  statuses: { draft: "Brouillon", validated: "Validé" },
  meta: (who: string | null, day: string) =>
    who ? `Créé par ${who}, le ${day}` : `Créé le ${day}`,
  validatedBy: (who: string | null, day: string) =>
    who ? `Validé par ${who}, le ${day}` : `Validé le ${day}`,
  noTerms: "Aucun terme écrit au moment du deal memo.",
  changed: "Les termes ont changé depuis ce deal memo.",
  older: "Versions précédentes",
  // The memo of PDS as a letter, in the form of the labels' (Wagram's memo
  // « Projet Dioo », given by Ibé; lib/deals/memo-pdf.ts).
  letter: {
    to: "A",
    from: "FROM",
    mail: "MAIL",
    date: "DATE",
    re: "RE",
    pds: "PDS Records",
    fromLine: (who: string) => `${who} - PDS Records`,
    draft: "DRAFT DOCUMENT - SUBJECT TO CONTRACT – NON CONTRACTUEL",
    hello: "Bonjour,",
    intro:
      "Veuillez trouver ci-dessous les points principaux d'un contrat que PDS Records pourrait vous proposer sur ce projet.",
  },
  pdf: {
    label: "Exporter en PDF",
    pending: "Export…",
    failed: "Le PDF n'a pas pu être créé. Réessayez.",
    file: (deal: string, n: number) => `Deal memo ${deal} n°${n}.pdf`,
  },
  contract: {
    section: "Contrat",
    none: "Aucun contrat lié à ce deal.",
    noneParticipation: "Aucun contrat lié à la participation.",
    fromParticipation: "Contrat de la participation",
    signedOn: (day: string) => `Signé le ${day}`,
    amount: "Montant saisi sur le contrat",
    open: (title: string) => `Ouvrir le contrat « ${title} »`,
    openShort: "Ouvrir",
    link: "Lier un contrat",
    change: "Changer",
    unlink: "Retirer le lien",
    linkTitle: "Contrat du deal",
    linkDescription:
      "Le contrat principal du deal, parmi ceux de son projet ou de son artiste. Les autres contrats de l'opération restent dans Contrats.",
    pick: "Contrat",
    pickPlaceholder: "Choisir un contrat",
    // « Créer le contrat » from the deal (DealContractCreate).
    create: "Créer le contrat",
    createTitle: "Créer le contrat du deal",
    createDescription:
      "Rempli depuis le deal ; il lui est lié dès sa création. Ses parties et ses fichiers s'ajoutent ensuite sur sa page.",
    created: "Contrat créé et lié au deal",
    // « Générer le contrat » (DealContractGenerate, 20261122140101).
    generate: "Générer le contrat",
    generateTitle: "Générer le contrat",
    generateDescription:
      "Un modèle validé de Contrats, rempli avec les termes du deal memo validé : vérifiez chaque valeur.",
    generated: "Contrat généré et lié au deal",
    template: "Modèle",
    noTemplate:
      "Aucun modèle validé dans Contrats : faites-en valider un, ou importez le contrat.",
    values: "Valeurs du contrat",
    missing: "Écrivez cette valeur.",
    import: "Importer un contrat",
    openPdf: "Ouvrir le PDF",
    // The contracting's gesture in « Maintenant » (DealContractNow).
    now: {
      create: "Créer le contrat",
      sign: "Faire signer le contrat",
      open: "Ouvrir le contrat",
      participation:
        "Le contrat de la participation est lancé par le chef de projet : il est prévenu de l'accord validé.",
    },
    title: (deal: string) => `Contrat · ${deal}`,
    submit: "Lier le contrat",
    linked: "Contrat lié",
    unlinked: "Lien retiré",
  },
  compare: {
    title: (n: number) => `Le contrat face au deal memo n°${n}`,
    needMemo: "Validez un deal memo pour le comparer au contrat.",
    needContract: "Liez un contrat pour le comparer au deal memo validé.",
    differs: (count: number) =>
      count === 1
        ? "1 terme que le contrat contredit."
        : `${count} termes que le contrat contredit.`,
    allConform: "Le contrat dit ce que dit le deal memo.",
    amountDiffers: (amount: string) => `Le contrat porte ${amount}`,
    amountMatches: "Le montant du contrat est le même",
    verdicts: {
      conform: "Conforme",
      different: "Différent",
      unchecked: "À vérifier",
    },
    conform: "Conforme",
    different: "Différent",
    noteTitle: (label: string) => `${label} : ce que dit le contrat`,
    note: "Ce que dit le contrat",
    noteRequired: "Dites ce que dit le contrat.",
    save: "Enregistrer",
    checkedBy: (who: string | null, day: string) =>
      who ? `${who}, ${day}` : day,
    saved: "Vérification enregistrée",
  },
  errors: {
    memo_not_found: "Ce deal memo est introuvable.",
    memo_validated: "Ce deal memo est déjà validé.",
    memo_not_latest: "Seul le dernier deal memo se valide.",
    memo_not_validated: "Comparez un deal memo validé.",
    participation_contract:
      "Le contrat de ce deal est celui de la participation, dans le Juridique.",
    contract_not_linkable:
      "Ce contrat n'appartient ni au projet ni à l'artiste du deal.",
    contract_unchanged: "Ce contrat est déjà lié.",
    no_contract: "Aucun contrat lié à ce deal.",
    check_unchanged: "Rien n'a changé.",
    invalid_verdict: "Choisissez « Conforme » ou « Différent ».",
    invalid_term: "Ce terme n'est pas dans le deal memo.",
    memo_submitted: "Ce deal memo est déjà envoyé à valider.",
    memo_changes_requested:
      "Des modifications sont déjà demandées : la version suivante arrivera par e-mail.",
    memo_sent: "Cet accord est déjà renvoyé.",
    memo_correction_sent: "La correction est déjà demandée au label.",
    memo_no_changes:
      "La direction n'a pas demandé de modification sur ce deal memo.",
    reason_required: "Dites ce qui doit changer.",
    loop_unchanged: "Cette personne est déjà dans la boucle.",
    loop_not_found: "Cette personne n'est plus dans la boucle.",
    invalid_loop: "Choisissez une personne.",
    member_cannot_read_deal: "Ce membre ne lit pas ce deal.",
    contact_not_found: "Ce contact est introuvable dans le Réseau.",
  } as Record<string, string>,
} as const;
