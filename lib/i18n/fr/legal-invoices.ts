// Invoices of the people paid by their contract (Juridique J10, proto
// « Projet complet », scenario legal:invoice). Exact words of the proto.

export const legalInvoices = {
  title: "Facture",
  states: {
    asked: "Facture attendue",
    to_pay: "À payer",
    paid: "Payée",
  },
  ht: (amount: string) => `${amount} HT`,
  // In the person's step.
  waitingPerson: (name: string, amount: string) =>
    `En attente de ${name} (lien privé) : déposer sa facture de ${amount} HT.`,
  waitingDirection: (direction: string) =>
    `En attente de ${direction} : payer la facture. Le virement se fait depuis la banque de PDS.`,
  paidShort: (day: string) => `Payée le ${day}`,
  invoice: "Facture",
  invoiceValue: (number: string, file: string) => `n° ${number} · ${file}`,
  byLink: (name: string, at: string) =>
    `Déposée par ${name} par son lien le ${at}`,
  byTeam: (who: string, day: string) =>
    `Reçue autrement, ajoutée par ${who} · reçue le ${day}`,
  pdf: "Voir le PDF",
  amount: "Montant HT",
  sameAmount: "Celui du contrat",
  gap: "Écart",
  gapSource: (contract: string, name: string, why: string) =>
    `Contrat : ${contract} HT · explication de ${name} : « ${why} »`,
  due: "Échéance",
  dueSource: "30 jours après réception",
  paid: (day: string, by: string, proof: string) =>
    `Payée le ${day} par ${by} · preuve : ${proof}.`,
  markPaid: "Marquer comme payée",
  markPaidBody:
    "Faites le virement depuis la banque de PDS, puis dites quand, avec sa preuve.",
  paidOn: "Payée le",
  proof: "Preuve du virement",
  paidDone: "Facture marquée comme payée",
  paidOnMissing: "Indiquez le jour du virement.",
  proofMissing: "Ajoutez la preuve du virement.",
  // « Ajouter une facture reçue autrement » (the direction).
  addOther: "Ajouter une facture reçue autrement",
  addFile: "La facture (PDF)",
  receivedOn: "Reçue le",
  add: "Ajouter la facture",
  added: "Facture ajoutée",
  cancel: "Annuler",
  number: "Numéro de facture",
  amountField: "Montant HT (€)",
  gapWhy: "Explication de l'écart",
  gapWhyPlaceholder:
    "Une heure de session en plus, demandée par Lina le 12/11.",
  errors: {
    file: "Ajoutez la facture en PDF.",
    number: "Indiquez le numéro de la facture.",
    amount: "Indiquez le montant HT.",
    gap: "Expliquez l'écart pour envoyer la facture quand même.",
    received: "Indiquez quand elle est arrivée.",
    upload: "Le fichier n'a pas pu être envoyé. Réessayez.",
    closed: "Ce lien n'est plus valable.",
    exists: "Une facture est déjà enregistrée pour ce contrat.",
    failed: "L'action n'a pas pu être faite. Réessayez.",
  },
  fileHint: "Glissez le fichier ici, ou cliquez pour le choisir (PDF).",
  fileChosen: (name: string) => `Fichier choisi : ${name}`,
  // The person's card on their page (/c/).
  portal: {
    title: "Votre facture",
    action: "Déposer votre facture",
    intro: "Votre contrat est signé : vous pouvez déposer votre facture.",
    billTo: "Facturer à",
    expected: "Montant attendu",
    expectedSource: "Le montant de votre contrat",
    file: "Votre facture (PDF)",
    gapCallout: (amount: string, contract: string) =>
      `Le montant (${amount} HT) n'est pas celui de votre contrat (${contract} HT). Expliquez l'écart pour l'envoyer quand même.`,
    send: "Envoyer ma facture",
    sent: "Facture envoyée",
    received: (number: string, day: string, amount: string, due: string) =>
      `Facture n° ${number} envoyée le ${day} · ${amount} HT. PDS la paie avant le ${due}.`,
    paid: (number: string, day: string) =>
      `Facture n° ${number} payée le ${day}. Merci.`,
  },
  // The journey (Maintenant, Travail).
  todo: {
    deposit: "Déposer la facture",
    pay: (name: string) => `Payer la facture de ${name}`,
  },
  summary: {
    asked: "Contrat signé · facture attendue",
    to_pay: "Contrat signé · facture à payer",
    paid: "Contrat signé · facture payée",
  },
} as const;
