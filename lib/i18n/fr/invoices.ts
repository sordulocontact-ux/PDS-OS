// Every invoice of an external person on a project, one system (20/10/2026):
// the engineer's at the Master final (proto `master-v2.html`, master:invoice),
// a paid contract's in the Juridique (proto « Projet complet », legal:invoice),
// « À payer » for the direction. Exact words of the protos.

const first = (name: string) => name.split(" ")[0] ?? name;

export const invoices = {
  // The invoices block of a record's side sheet (a contact, a contract).
  sheet: {
    toPay: (count: number, amount: string) => `${count} à payer · ${amount}`,
    allPaid: "Toutes payées",
    due: (day: string) => `Échéance le ${day}`,
    late: "En retard",
  },
  // Where an invoice stands (the team, the Juridique, « À payer »).
  states: {
    requested: "Facture attendue",
    rib: "RIB à confirmer",
    to_pay: "À payer",
    paid: "Payée",
  },
  // The person's private link (/m, /c): « Votre facture ».
  portal: {
    title: "Votre facture",
    titleOf: (what: string) => `Votre facture · ${what}`,
    master: "Master",
    todo: "Déposer votre facture",
    introMaster: (project: string) =>
      `Le master final de « ${project} » est validé : vous pouvez déposer votre facture.`,
    introContract:
      "Votre contrat est signé : vous pouvez déposer votre facture.",
    billTo: "Facturer à",
    legalName: "Raison sociale",
    address: "Adresse de facturation",
    siret: "SIRET",
    vat: "N° de TVA",
    expected: "Montant attendu",
    expectedSource: {
      master: "Le tarif engagé par PDS",
      contract: "Le montant de votre contrat",
    },
    rib: "Votre RIB",
    ribSource: "Votre fiche chez PDS : le virement part sur ce compte",
    ribChange: "Mon RIB a changé",
    newRib: "Votre nouveau RIB",
    send: "Envoyer ma facture",
    sent: "Facture envoyée",
    sentLine: (due: string, newRib: boolean) =>
      `Merci. Elle sera payée avant le ${due}${newRib ? " : votre nouveau RIB est vérifié par PDS avant le virement" : ""}.`,
    received: (n: string, at: string, amount: string, due: string) =>
      `Facture n° ${n} reçue le ${at} (${amount}) : elle sera payée avant le ${due}.`,
    ribPending:
      "Votre nouveau RIB est vérifié par PDS avant le virement : on peut vous appeler pour le confirmer.",
    paid: (n: string, day: string) =>
      `Facture n° ${n} payée le ${day} par virement. Merci !`,
  },
  // The fields of an invoice, on the link and for the team.
  fields: {
    pdf: "La facture (PDF)",
    pdfHint: "Glissez le PDF ici, ou choisissez-le",
    chosen: (name: string) => `${name} · choisie, pas encore envoyée`,
    notPdf: (name: string) =>
      `« ${name} » n'est pas un PDF : déposez la facture en PDF.`,
    pdfMissing: "Ajoutez la facture en PDF.",
    number: "Numéro de facture",
    numberPlaceholder: "KH-2026-118",
    numberMissing: "Indiquez le numéro de la facture.",
    amount: "Montant HT (€)",
    amountHint: "Pré-rempli avec le montant convenu : corrigez s'il diffère.",
    amountMissing: "Indiquez le montant HT.",
    mismatch: (amount: string, expected: string) =>
      `Le montant (${amount}) n'est pas celui convenu (${expected}). Expliquez l'écart pour l'envoyer quand même.`,
    why: "Explication de l'écart",
    whyPlaceholder: "Une heure de session en plus, demandée le 12/11.",
    receivedOn: "Reçue le",
    receivedOnMissing: "Indiquez quand elle est arrivée.",
    receivedOnInvalid: "Une facture ne peut pas arriver dans le futur.",
    iban: "IBAN",
    ibanPlaceholder: "FR76 3000 4000 1200 0000 1234 567",
    ibanMissing: "Indiquez l'IBAN du compte à payer.",
    ibanInvalid:
      "Cet IBAN n'a pas le bon format : deux lettres, deux chiffres, puis le numéro du compte.",
    bic: "BIC",
    bicPlaceholder: "BNPAFRPP",
    bicInvalid: "Ce BIC n'a pas le bon format : 8 ou 11 lettres et chiffres.",
    holder: "Titulaire du compte",
    holderMissing: "Indiquez le titulaire du compte.",
    ribNew:
      "Un nouveau RIB est vérifié par PDS, par téléphone, avant tout paiement.",
    ribFirstLink:
      "Gardé dans votre fiche chez PDS, visible seulement par la direction.",
    ribOf: (name: string) => `RIB de ${name}`,
    missingCount: (n: number) =>
      n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
  },
  // The e-mail asking for the invoice (lib/email/invoice-email.ts).
  requestEmail: {
    subject: (title: string) => `« ${title} » : votre facture`,
    body: "Votre travail est terminé : vous pouvez maintenant déposer votre facture sur votre page, avec votre RIB si ce n'est pas déjà fait.",
    open: "Déposer votre facture :",
    sent: (name: string) => `Facture demandée par e-mail à ${name}`,
    failed:
      "La facture est demandée, mais l'e-mail n'est pas parti : prévenez la personne, elle dépose sa facture sur son lien privé.",
  },
  // In the team's step (Master final, the person's step in the Juridique).
  team: {
    title: "Facture et paiement",
    titleDirection: "À payer",
    heading: "Facture",
    of: (name: string) => `Facture de ${name}`,
    expected: "Attendue",
    expectedSource: (agreed: string | null, day: string) =>
      `${agreed ? `${agreed} · ` : ""}demandée le ${day} sur son lien privé`,
    agreed: {
      master: (amount: string, parts: string) =>
        `Montant engagé : ${amount}${parts ? ` (${parts})` : ""}`,
      contract: (amount: string) => `Montant du contrat : ${amount}`,
    },
    noEmail: (name: string) =>
      `PDS OS n'envoie pas d'e-mail : prévenez ${first(name)} que sa facture se dépose sur son lien privé.`,
    // PDS OS e-mails the person itself (lib/email/invoice-email.ts).
    emailed: (name: string) =>
      `PDS OS prévient ${first(name)} par e-mail : sa facture se dépose sur sa page privée.`,
    other: "Ajouter une facture reçue autrement",
    otherHint: "Par e-mail, en main propre…",
    add: "Ajouter la facture",
    added: "Facture ajoutée",
    card: (n: string, name: string) => `Facture n° ${n} · ${name}`,
    cardMetaLink: (file: string, at: string) =>
      `${file} · reçue le ${at} par son lien`,
    cardMetaOther: (file: string, day: string, by: string | null) =>
      `${file} · reçue autrement le ${day}${by ? ` · ajoutée par ${by}` : ""}`,
    pdf: "Voir le PDF",
    amount: "Montant",
    conform: {
      master: (parts: string) =>
        `Conforme au tarif engagé${parts ? ` (${parts})` : ""}`,
      contract: "Celui du contrat",
    },
    gap: (
      basis: "master" | "contract",
      agreed: string,
      name: string,
      why: string | null,
    ) =>
      `${basis === "master" ? "Tarif engagé" : "Contrat"} : ${agreed}${why ? ` · explication de ${first(name)} : « ${why} »` : ""}`,
    noEngaged: "Aucun montant engagé au budget",
    states: {
      conform: "Conforme",
      gap: "Écart",
      toPay: "À payer",
      paid: "Payée",
      toConfirm: "À confirmer",
      verified: "Vérifié",
    },
    due: "Échéance",
    dueValue: (day: string) => `À payer avant le ${day}`,
    dueSource: "30 jours après réception",
    paidValue: (day: string) => `Payée le ${day}`,
    paidSource: (proof: string | null, by: string | null) =>
      ["Virement", proof ? `preuve : ${proof}` : null, by]
        .filter(Boolean)
        .join(" · "),
    proofLink: "Voir la preuve",
    rib: "RIB",
    ribTeamPending: "Modifié : à confirmer par la direction",
    ribTeamVerified: "Vérifié",
    ribTeamNone: "Aucun RIB",
    ribTeamSource: "Visible seulement par la direction",
    ribChanged: (by: string, at: string, before: string | null) =>
      `Modifié par ${by} le ${at}${before ? ` · avant : ${before}` : ""}`,
    ribConfirmed: (by: string, at: string) => `Confirmé par ${by} le ${at}`,
    ribFirst: "Fiche Réseau · donné avec sa première facture",
    fullIban: "Voir l'IBAN complet",
    confirmCallout: (name: string) =>
      `Avant de payer, appelez ${name} au numéro de sa fiche Réseau, pas à celui d'un e-mail, et vérifiez ce nouveau compte avec lui : c'est la fraude la plus courante.`,
    confirmTitle: "Le RIB a changé.",
    phoneChecked: (name: string) =>
      `J'ai vérifié ce RIB par téléphone avec ${name}`,
    phoneMissing: (name: string) =>
      `Cochez quand vous avez vérifié le RIB par téléphone avec ${name}.`,
    confirm: "Confirmer le nouveau RIB",
    confirmed: "Nouveau RIB confirmé",
    payTitle: "Marquer comme payée",
    payNote:
      "Faites le virement depuis la banque de PDS, puis dites quand, avec sa preuve.",
    paidOn: "Payée le",
    paidOnMissing: "Indiquez le jour du virement.",
    paidOnInvalid:
      "Le jour du virement ne peut pas être dans le futur, ni avant la réception de la facture.",
    proof: "Preuve du virement",
    proofHint: "Avis de virement ou capture de la banque",
    proofMissing:
      "Ajoutez la preuve du virement : un PDF ou une capture de la banque.",
    proofChosen: (name: string) => `${name} · choisie`,
    pay: "Marquer comme payée",
    paid: "Facture marquée comme payée",
    waitConfirm: (dg: string, name: string) =>
      `En attente de ${dg} : confirmer le nouveau RIB de ${first(name)}, puis payer. Le virement se fait depuis la banque de PDS.`,
    waitPay: (dg: string, name: string, due: string) =>
      `En attente de ${dg} : payer la facture de ${first(name)} avant le ${due}. Le virement se fait depuis la banque de PDS.`,
    // Who reads where it stands without reading it (the Juridique).
    stateOnly: {
      requested: (name: string) =>
        `En attente de ${name} (lien privé) : déposer sa facture.`,
      to_pay: (dg: string) =>
        `En attente de ${dg} : payer la facture. Le virement se fait depuis la banque de PDS.`,
      paid: (day: string) => `Payée le ${day}.`,
    },
    direction: "la direction",
    inHouse: "Ingénieur maison",
    inHouseValue: "Pas de facture : interne",
    inHouseSource: "Budget du projet",
  },
  // « À payer »: the direction's list, on the project's Budget.
  payList: {
    title: "À payer",
    count: (n: number) =>
      `${n} facture${n > 1 ? "s" : ""} · le virement se fait depuis la banque de PDS`,
    label: (n: string) => `Facture n° ${n}`,
    value: (name: string, amount: string) => `${name} · ${amount}`,
    source: (at: string, due: string, rib: boolean) =>
      `Reçue le ${at} · à payer avant le ${due} · ${rib ? "nouveau RIB à confirmer" : "RIB vérifié"}`,
    open: "Ouvrir",
    pay: "Voir et payer",
    confirm: "Confirmer le RIB, puis payer",
    late: "En retard",
  },
  // The organization's billing identity (/app/settings, administration).
  billing: {
    // Also the head of the contracts (Sacha 22/11/2026).
    title: "Coordonnées de PDS",
    description: "Sur les factures des prestataires et en tête des contrats.",
    legalName: "Raison sociale",
    address: "Adresse",
    siret: "SIRET",
    vat: "N° de TVA",
    phone: "Téléphone",
    email: "E-mail",
    emailInvalid: "Cette adresse e-mail n'est pas valide.",
    website: "Site web",
    save: "Enregistrer",
    saved: "Coordonnées enregistrées",
    legalNameMissing: "Indiquez la raison sociale.",
    addressMissing: "Indiquez l'adresse.",
    siretInvalid: "Le SIRET compte 14 chiffres.",
    failed: "Les coordonnées n'ont pas pu être enregistrées. Réessayez.",
  },
  // The database's refusals, as the page words them.
  errors: {
    invoice_not_requested: "La facture n'est pas encore demandée.",
    invoice_link_closed: "Ce lien n'est plus valable.",
    invoice_received: "Cette facture a déjà été reçue.",
    invalid_extension: "Déposez la facture en PDF.",
    invalid_file: "Déposez la facture en PDF.",
    upload_missing: "Le fichier n'a pas pu être envoyé. Réessayez.",
    too_many_deposits: "Trop d'envois en une heure : réessayez plus tard.",
    reason_required: "Expliquez l'écart avec le montant convenu.",
    rib_required: "Indiquez le RIB du compte à payer.",
    invalid_iban:
      "Cet IBAN n'a pas le bon format : deux lettres, deux chiffres, puis le numéro du compte.",
    invalid_bic: "Ce BIC n'a pas le bon format : 8 ou 11 lettres et chiffres.",
    holder_required: "Indiquez le titulaire du compte.",
    number_required: "Indiquez le numéro de la facture.",
    invalid_amount: "Indiquez le montant HT.",
    phone_check_required:
      "Cochez quand vous avez vérifié le RIB par téléphone.",
    rib_unverified:
      "Le RIB doit être confirmé avant de marquer la facture payée.",
    invalid_date:
      "Le jour ne peut pas être dans le futur, ni avant la réception de la facture.",
    invalid_transition: "Cette facture n'est plus à payer.",
    already_confirmed: "Ce RIB est déjà confirmé.",
    forbidden:
      "Seule la direction confirme un RIB et marque une facture payée ; le responsable du projet ajoute une facture reçue autrement.",
    failed: "L'action n'a pas abouti. Réessayez.",
  },
} as const;
