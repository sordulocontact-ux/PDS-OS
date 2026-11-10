// Production › Devis (Ibé, 14/10; proto « Projet complet » BODY.quote): a
// quote in versions — deposited (by the company through its link, or in
// the app), checked by the line producer, decided by the budget
// validation; « Demander une modification », the active reference, the
// revision asked after a validation.
export const productionQuotes = {
  title: "Devis",
  versions: "Versions du devis",
  earlier: (n: number) => `Versions précédentes (${n})`,
  empty: {
    external: (company: string) =>
      `En attente du devis de ${company}, sur son lien privé.`,
    internal: "Aucun devis pour l'instant.",
  },
  add: "Ajouter un devis",
  addTitle: "Ajouter un devis",
  addDescription:
    "Le devis d'un loueur, ou celui de la société reçu par e-mail. Il arrive « Déposé, à vérifier ».",
  fields: {
    label: "Intitulé",
    labelHint: "Par exemple : Location caméra et lumière, Transpacam",
    amount: "Montant total HT",
    loc: "Dont montant prévu pour les lieux",
    delivery: "Livraison ou fin de prestation proposée",
    url: "Lien du devis",
    urlHint: "Commence par https:// (Drive, PDF en ligne…)",
    note: "Note",
  },
  added: "Devis ajouté : à vérifier.",
  status: {
    deposited: "Déposé, à vérifier",
    submitted: "Vérifié, à valider",
    approved: "Validé",
    changes: "Révision demandée",
    rejected: "Refusé",
    replaced: "Remplacé",
  },
  line: (n: number, amount: string) => `V${n} · ${amount}`,
  loc: (amount: string) => `dont lieux ${amount}`,
  open: "Voir le devis",
  deposited: (who: string, at: string) => `Déposé par ${who} le ${at}`,
  decided: (verb: string, who: string, at: string) =>
    ` · ${verb} par ${who} le ${at}`,
  verbs: { approved: "validé", other: "décidé" },
  said: (who: string, text: string) => `${who} : « ${text} »`,
  byLink: "la société",
  check: {
    title: (n: number) => `Vérifier le devis V${n}`,
    computed: "calculé par le code",
    amountOk: (amount: string, envelope: string) =>
      `Montant ${amount} ≤ enveloppe ${envelope}`,
    amountOver: (amount: string, envelope: string) =>
      `Montant ${amount} > enveloppe ${envelope}`,
    amountNoEnvelope: (amount: string) =>
      `Montant ${amount} : aucune enveloppe fixée pour comparer`,
    loc: (amount: string, days: number) =>
      `Dont lieux : ${amount} pour ${days} jour${days > 1 ? "s" : ""} de tournage`,
    locSource: "le lieu retenu sera comparé à ce montant",
    locMissing: "Le devis ne dit pas le montant prévu pour les lieux",
    delay: (shoot: string | null, delivery: string | null) =>
      `Délais compatibles avec ${
        [
          shoot ? `le tournage du ${shoot}` : null,
          delivery ? `la livraison du ${delivery}` : null,
        ]
          .filter(Boolean)
          .join(" et ") || "les dates de la fiche"
      }`,
    scope:
      "Postes complets : réalisation, équipe, matériel, lieux, régie, postproduction",
    comment: "Commentaire",
    commentHint: "Obligatoire pour demander une modification",
    commentRequired: (company: string) =>
      `Dites ce qui doit changer : ${company} le lira.`,
    submit: (who: string) => `Soumettre à ${who}`,
    changes: "Demander une modification",
    incomplete:
      "Cochez ce que vous avez vérifié, ou demandez une modification.",
  },
  decide: {
    title: (n: number) => `Décider du devis V${n}`,
    checkedBy: (who: string) =>
      `Vérifié par ${who} : délais et postes cochés, montant dans l'enveloppe.`,
    comment: "Commentaire",
    commentHint: "Obligatoire pour une modification ou un refus",
    approve: (n: number) => `Valider le devis V${n}`,
    changes: "Demander une modification",
    reject: "Refuser",
  },
  active: (n: number, amount: string) => `Référence active : V${n} · ${amount}`,
  activeBy: (who: string, at: string) => `, validée par ${who} le ${at}.`,
  previous: " Les versions précédentes restent ci-dessous.",
  revision: {
    open: "Demander une révision du devis",
    note: (n: number) =>
      `La V${n} reste la référence jusqu'à la validation de la nouvelle version.`,
    reason: "Motif",
    reasonPlaceholder: "Ex. : régie supplémentaire après le changement de lieu",
    reasonRequired: "Dites pourquoi.",
    submit: (company: string) => `Demander à ${company}`,
    asked: (who: string, at: string) =>
      `Révision demandée par ${who} le ${at} : `,
  },
  // What a gesture did, for the result banner and its toast (rule 7).
  done: {
    submitted: (n: number) => `Devis V${n} soumis`,
    approved: (n: number) => `Devis V${n} validé`,
    rejected: (n: number) => `Devis V${n} refusé`,
    changes: (n: number) => `Révision demandée sur le devis V${n}`,
    revision: "Révision du devis demandée",
  },
  errors: {
    checks_incomplete: "Chaque point doit être vérifié avant de soumettre.",
    quote_validator_required:
      "Choisissez d'abord la validation budgétaire, dans « Qui fait quoi ».",
    reason_required: "Dites ce qui doit changer.",
    no_active_quote: "Aucun devis validé à réviser.",
    label: "Donnez un intitulé au devis.",
    amount: "Un montant en euros, par exemple 16 400.",
    loc: "Le montant prévu pour les lieux, par exemple 2 500 (0 si aucun lieu à louer).",
    locOver: "Ne peut pas dépasser le montant total du devis.",
    url: "Le lien doit commencer par https://",
  },
} as const;
