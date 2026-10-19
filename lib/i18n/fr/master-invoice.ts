// The engineer's invoice, RIB and payment (proto `master-v2.html`,
// `master:final` and `master:invoice`; docs/projet-complet/master.md § 9).

const first = (name: string) => name.split(" ")[0] ?? name;

export const masterInvoice = {
  // The engineer's private link: « Votre facture ».
  link: {
    title: "Votre facture",
    todo: "Déposer votre facture",
    intro: (project: string) =>
      `Le master final de « ${project} » est validé : vous pouvez déposer votre facture.`,
    billTo: "Facturer à",
    legalName: "Raison sociale",
    address: "Adresse de facturation",
    siret: "SIRET",
    vat: "N° de TVA",
    expected: "Montant attendu",
    expectedSource: "Le tarif engagé par PDS",
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
    states: { todo: "À vous", follow: "Suivi", paid: "Payée" },
  },
  // The fields of an invoice, on the link and for the owner.
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
    amountHint: "Pré-rempli avec le tarif engagé : corrigez s'il diffère.",
    amountMissing: "Indiquez le montant HT.",
    mismatch: (amount: string, expected: string) =>
      `Le montant (${amount}) ne correspond pas au tarif engagé (${expected}). Expliquez la différence pour envoyer quand même.`,
    why: "Pourquoi le montant diffère",
    whyPlaceholder: "Une révision en plus sur le mix, accordée le 16/11.",
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
    ribFirstTeam:
      "Gardé dans sa fiche chez PDS, visible seulement par la direction, après sa vérification par téléphone.",
    ribOf: (name: string) => `RIB de ${name}`,
    missingCount: (n: number) =>
      n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
    errors: {
      invoice_not_requested: "La facture n'est pas encore demandée.",
      invoice_received: "Cette facture a déjà été reçue.",
      invalid_extension: "Déposez la facture en PDF.",
      invalid_file: "Déposez la facture en PDF.",
      too_many_deposits: "Trop d'envois en une heure : réessayez plus tard.",
      reason_required: "Expliquez pourquoi le montant diffère du tarif engagé.",
      rib_required: "Indiquez le RIB du compte à payer.",
      invalid_iban:
        "Cet IBAN n'a pas le bon format : deux lettres, deux chiffres, puis le numéro du compte.",
      invalid_bic:
        "Ce BIC n'a pas le bon format : 8 ou 11 lettres et chiffres.",
      holder_required: "Indiquez le titulaire du compte.",
      number_required: "Indiquez le numéro de la facture.",
      invalid_amount: "Indiquez le montant HT.",
      failed: "La facture n'a pas pu être envoyée. Réessayez.",
    },
  },
  // The Master final step, for the team.
  team: {
    title: "Facture et paiement",
    titleDirection: "À payer",
    of: (name: string) => `Facture de ${name}`,
    expected: "Attendue",
    expectedSource: (engaged: string | null, day: string) =>
      `${engaged ? `Montant engagé : ${engaged} · ` : ""}demandée le ${day} sur son lien privé`,
    noEmail: (name: string) =>
      `PDS OS n'envoie pas d'e-mail : prévenez ${first(name)} que sa facture se dépose sur son lien.`,
    other: "Ajouter une facture reçue autrement",
    otherHint: "Par e-mail, en main propre…",
    add: "Ajouter la facture",
    added: "Facture ajoutée",
    card: (n: string, name: string) => `Facture n° ${n} · ${name}`,
    cardMetaLink: (file: string, at: string) =>
      `${file} · reçue le ${at} par son lien`,
    cardMetaOther: (file: string, at: string, by: string | null) =>
      `${file} · reçue le ${at}${by ? ` · ajoutée par ${by}` : ""}`,
    pdf: "Voir le PDF",
    amount: "Montant",
    conform: (parts: string) => `Conforme au tarif engagé (${parts})`,
    gap: (engaged: string, why: string | null) =>
      `Tarif engagé : ${engaged}${why ? ` · « ${why} »` : ""}`,
    noEngaged: "Aucun tarif engagé au budget",
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
      `Avant de payer, appelez ${name} au numéro de sa fiche Réseau, pas à celui d'un e-mail, et vérifiez ce nouveau compte avec lui.`,
    confirmTitle: "Le RIB a changé.",
    phoneChecked: (name: string) =>
      `J'ai vérifié ce RIB par téléphone avec ${name}`,
    phoneMissing: (name: string) =>
      `Cochez quand vous avez vérifié le RIB par téléphone avec ${name}.`,
    confirm: "Confirmer le nouveau RIB",
    confirmed: "Nouveau RIB confirmé",
    payNote: "Faites le virement depuis la banque de PDS, puis notez-le ici.",
    paidOn: "Virement fait le",
    paidOnMissing: "Indiquez la date du virement.",
    paidOnInvalid:
      "La date du virement ne peut pas être dans le futur, ni avant la réception de la facture.",
    proof: "Preuve du virement",
    proofHint: "Avis de virement ou capture de la banque",
    proofMissing:
      "Ajoutez la preuve du virement : un PDF ou une capture de la banque.",
    proofChosen: (name: string) => `${name} · choisie`,
    pay: "Marquer comme payée",
    paid: "Facture marquée payée",
    waitConfirm: (dg: string, name: string) =>
      `En attente de ${dg} : confirmer le nouveau RIB de ${first(name)}.`,
    waitPay: (dg: string, name: string, due: string) =>
      `En attente de ${dg} : payer la facture de ${first(name)} avant le ${due}.`,
    direction: "la direction",
    inHouse: "Ingénieur maison",
    inHouseValue: "Pas de facture : interne",
    inHouseSource: "Budget du projet",
    errors: {
      forbidden:
        "Seule la direction confirme un RIB et marque une facture payée.",
      phone_check_required:
        "Cochez quand vous avez vérifié le RIB par téléphone.",
      rib_unverified:
        "Le RIB doit être confirmé avant de marquer la facture payée.",
      invalid_date:
        "La date du virement ne peut pas être dans le futur, ni avant la réception de la facture.",
      invalid_transition: "Cette facture n'est plus à payer.",
      already_confirmed: "Ce RIB est déjà confirmé.",
      failed: "L'action n'a pas abouti. Réessayez.",
    },
  },
  // The budget lines of the Master final.
  budget: {
    title: "Budget",
    line: (stage: "mix" | "mastering", name: string) =>
      `${stage === "mix" ? "Mix" : "Mastering"} · ${name}`,
    invoiced: (n: string, at: string, due: string) =>
      `Facture n° ${n} reçue le ${at} · à payer avant le ${due}`,
    paid: (day: string) => `Facture payée le ${day}`,
    committed: "Engagé · facture attendue",
  },
  // The organization's billing identity (/app/settings, administration).
  billing: {
    title: "Facturation de PDS",
    description:
      "Ce que les ingénieurs et prestataires mettent sur leurs factures : ils le lisent sur leur lien privé.",
    legalName: "Raison sociale",
    address: "Adresse de facturation",
    siret: "SIRET",
    vat: "N° de TVA",
    save: "Enregistrer",
    saved: "Facturation enregistrée",
    legalNameMissing: "Indiquez la raison sociale.",
    addressMissing: "Indiquez l'adresse de facturation.",
    siretInvalid: "Le SIRET compte 14 chiffres.",
    failed: "La facturation n'a pas pu être enregistrée. Réessayez.",
  },
  // The journey and the history.
  todo: {
    confirmRib: (name: string) => `Confirmer le nouveau RIB de ${first(name)}`,
    pay: (name: string, due: string) =>
      `Payer la facture de ${first(name)} avant le ${due}`,
    sendInvoice: "Déposer votre facture",
  },
  summary: {
    toPay: "facture à payer",
    expected: "facture attendue",
    paid: "facture payée",
  },
  history: {
    requested: (name: string) => `Facture demandée à ${name} par PDS OS`,
    requestedCause: "Master final validé",
    received: (n: string, name: string, viaLink: boolean, amount: string) =>
      `Facture n° ${n} de ${name} ${viaLink ? "reçue par son lien" : "ajoutée"} : ${amount}`,
    receivedCause: "Facture demandée à la validation du master final",
    ribChanged: (name: string) =>
      `Nouveau RIB de ${name} reçu : à confirmer par la direction avant tout paiement`,
    ribCause: (n: string) => `Facture n° ${n}`,
    paid: (n: string, name: string, day: string, amount: string) =>
      `Facture n° ${n} de ${name} payée le ${day} : ${amount}`,
    paidCause: (at: string) => `Facture reçue le ${at}`,
  },
} as const;
