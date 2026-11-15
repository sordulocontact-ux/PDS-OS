/** Finance › the client invoices: their PDF, VAT, deal, owner, reminders
 * and credit notes (Ibé's ticket « Cockpit Finance », lot 2, 13/11/2026). */

export const clientInvoices = {
  fields: {
    vat: "TVA",
    vatRate: (bp: number) =>
      bp === 0 ? "Sans TVA" : `${String(bp / 100).replace(".", ",")} %`,
    vatUnknown: "Non précisée",
    ht: (amount: string) => `Soit ${amount} HT`,
    deal: "Deal",
    owner: "Responsable",
    ownerHint: "Celui qui suit l'encaissement et relance.",
    sentOn: "Envoyée le",
    file: "PDF de la facture",
    fileHint:
      "La facture émise par votre outil de facturation ou le comptable.",
    fileKept: (name: string) => `Facture : ${name}`,
    fileChosen: (name: string) => name,
    removeFile: "Retirer le PDF",
  },

  file: {
    type: "Un PDF, ou une image PNG ou JPEG.",
    size: "Le fichier dépasse 20 Mo.",
    failed: "Le fichier n'a pas pu être envoyé. Réessayez.",
  },

  actions: {
    markSent: "Marquer envoyée",
    remind: "Noter une relance",
    credit: "Émettre un avoir",
    openFile: "Ouvrir la facture",
  },

  // The follow-up of a late invoice (« Relances » of the ticket).
  followUp: {
    columns: {
      late: "Retard",
      owner: "Responsable",
      last: "Dernière relance",
      next: "Prochaine action",
    },
    days: (count: number) => (count <= 1 ? `${count} jour` : `${count} jours`),
    never: "Jamais relancée",
    lastOn: (day: string, channel: string) => `${day} · ${channel}`,
    nextOn: (action: string, day: string | null) =>
      day ? `${action} · ${day}` : action,
  },

  channels: {
    email: "E-mail",
    phone: "Appel",
    meeting: "Rendez-vous",
    letter: "Courrier",
    other: "Autre",
  },

  reminderForm: {
    title: "Noter une relance",
    description: (label: string) =>
      `La relance faite pour « ${label} », et la suite. Rien n'est envoyé au client d'ici.`,
    earlier: "Relances déjà faites",
    remove: "Retirer",
    removeTitle: "Retirer cette relance ?",
    removeBody: "L'historique la garde.",
    removing: "Retrait…",
    remindedOn: "Date de la relance",
    channel: "Comment",
    note: "Ce qui a été dit",
    nextTitle: "Prochaine action",
    nextAction: "Action",
    nextActionOn: "Pour le",
    save: "Enregistrer",
    saving: "Enregistrement…",
    errors: {
      remindedOn: "Indiquez la date de la relance.",
      future: "La date de la relance n'est pas encore passée.",
    },
  },

  creditForm: {
    title: "Émettre un avoir",
    description: (label: string, number: string) =>
      `Corrige la facture ${number} de « ${label} » pour une part non encaissée.`,
    earlier: "Avoirs déjà émis",
    number: "Numéro de l'avoir",
    issuedOn: "Date d'émission",
    amount: "Montant de l'avoir",
    remaining: (amount: string) =>
      `Au plus ${amount}, ce qui reste à encaisser.`,
    reason: "Motif",
    file: "PDF de l'avoir",
    fileHint: "L'avoir émis par votre outil de facturation ou le comptable.",
    save: "Émettre l'avoir",
    saving: "Enregistrement…",
    errors: {
      number: "Indiquez le numéro de l'avoir.",
      issuedOn: "Indiquez la date d'émission.",
      beforeInvoice: "L'avoir ne peut pas précéder la facture.",
      amount: "Indiquez un montant en euros.",
      over: (amount: string) => `Au plus ${amount}.`,
      reason: "Donnez le motif.",
    },
    line: (number: string, amount: string, day: string) =>
      `${number} · ${amount} · ${day}`,
  },

  done: {
    sent: "Facture marquée envoyée",
    reminder: "Relance enregistrée",
    reminderRemoved: "Relance retirée",
    credit: "Avoir enregistré",
  },
} as const;
