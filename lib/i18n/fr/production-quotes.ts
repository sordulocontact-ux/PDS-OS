// Production › Devis (Ibé, 14/10): a quote deposited (by the company through
// its link, or in the app), checked point by point by the line producer,
// submitted to its validator, approved or refused with a reason.
export const productionQuotes = {
  title: "Devis",
  description:
    "Chaque devis est vérifié par le chargé de production, puis validé par la personne désignée à l'organisation.",
  empty: {
    external: (company: string) =>
      `En attente du devis de ${company}, sur son lien privé.`,
    internal: "Aucun devis pour l'instant.",
  },
  add: "Ajouter un devis",
  addTitle: "Ajouter un devis",
  addDescription:
    "Le devis d'un loueur, ou celui de la société reçu par e-mail. Il arrive « À vérifier ».",
  fields: {
    label: "Intitulé",
    labelHint: "Par exemple : Location caméra et lumière, Transpacam",
    amount: "Montant total HT",
    delivery: "Livraison ou fin de prestation proposée",
    url: "Lien du devis",
    urlHint: "Commence par https:// (Drive, PDF en ligne…)",
    note: "Note",
  },
  added: "Devis ajouté : à vérifier.",
  status: {
    deposited: "À vérifier",
    submitted: "À valider",
    approved: "Validé",
    rejected: "Refusé",
  },
  deposited: (who: string, date: string) => `Déposé par ${who} le ${date}`,
  byLink: "la société, sur son lien",
  amount: "Montant",
  delivery: "Livraison",
  steps: { deposited: "Déposé", checked: "Vérifié", approved: "Validé" },
  check: {
    title: "Vérification préparée par PO",
    note: "Calculée par le code depuis l'enveloppe et les dates de la fiche ; cochez chaque point vérifié.",
    amountOk: (amount: string, envelope: string, margin: string) =>
      `Montant ${amount} pour une enveloppe de ${envelope} : marge de ${margin}`,
    amountOver: (amount: string, envelope: string, over: string) =>
      `Montant ${amount} pour une enveloppe de ${envelope} : dépassement de ${over}`,
    amountNoEnvelope: (amount: string) =>
      `Montant ${amount} : aucune enveloppe fixée pour comparer`,
    delayOk: (on: string, due: string) =>
      `Livraison proposée le ${on}, attendue au plus tard le ${due}`,
    delayLate: (on: string, due: string) =>
      `Livraison proposée le ${on}, après la date attendue du ${due}`,
    delayUnknown: "Date de livraison à vérifier dans le devis",
    scope:
      "Le devis couvre tout ce que la Fiche Livrable attend (tournage, postproduction, exports)",
    verified: "Vérifié",
    noteLabel: "Note pour la validation",
    notePlaceholder: "Ce que la personne qui valide doit savoir pour décider",
    submit: (who: string) => `Soumettre à ${who}`,
    submitted: "Devis soumis à la validation.",
    incomplete: (n: number) =>
      n === 1
        ? "1 point reste à vérifier avant de soumettre."
        : `${n} points restent à vérifier avant de soumettre.`,
  },
  decide: {
    checkedBy: (who: string, date: string) => `Vérifié par ${who} le ${date}`,
    reason: "Motif, si vous refusez",
    reasonPlaceholder: "Ce qu'il faut corriger",
    reasonRequired: "Un refus dit pourquoi : écrivez le motif.",
    approve: "Valider le devis",
    reject: "Refuser",
    approved: "Devis validé.",
    rejected: "Devis refusé, avec le motif.",
    decidedBy: (verb: string, who: string, date: string) =>
      `${verb} par ${who} le ${date}`,
  },
  wait: {
    check: (who: string) => `En attente de ${who} : vérifier le devis.`,
    decide: (who: string) => `En attente de ${who} : valider le devis.`,
  },
  errors: {
    checks_incomplete: "Chaque point doit être vérifié avant de soumettre.",
    quote_validator_required:
      "Choisissez d'abord qui valide les devis, à l'étape Organisation.",
    reason_required: "Un refus dit pourquoi : écrivez le motif.",
    label: "Donnez un intitulé au devis.",
    amount: "Indiquez le montant HT.",
    url: "Le lien doit commencer par https://",
  },
} as const;
