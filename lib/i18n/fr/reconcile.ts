/** Finance › Rapprochement: the bank's transactions (Qonto CSV or by hand)
 * and what a person reconciles them with (Ibé's ticket « Cockpit Finance »,
 * lot 6). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const reconcile = {
  title: "Rapprochement",
  tiles: {
    open: "À rapprocher",
    openHint: (count: number) =>
      count === 0
        ? "Tout est rapproché"
        : plural(count, "transaction", "transactions"),
    matched: "Rapproché ce mois",
    matchedHint: (count: number) =>
      plural(count, "transaction", "transactions"),
    suggested: "Propositions",
    suggestedHint: "à valider une à une",
    doubles: "Doublons possibles",
    doublesHint: "même jour, montant et tiers",
  },
  views: {
    label: "Transactions",
    open: "À rapprocher",
    matched: "Rapprochées",
    ignored: "Ignorées",
  },
  columns: {
    transaction: "Transaction",
    suggestion: "Proposition",
    amount: "Montant",
    actions: "Actions",
    date: "Date",
    party: "Tiers",
    match: "Rapprochement",
    proof: "Justificatif",
    status: "Statut",
  },
  states: {
    partial: "Partielle",
    double: "Doublon possible",
    proposal: "Proposition",
    matched: "Rapprochée",
    ignored: "Ignorée",
    open: "À rapprocher",
  },
  proofAttached: "Justificatif joint",
  searchLabel: "Rechercher une transaction",
  search: "Rechercher un tiers, une référence",
  noResult: (query: string) =>
    `Aucune transaction ne correspond à « ${query} ».`,
  total: {
    label: "Total des transactions listées",
    count: (count: number) => plural(count, "opération", "opérations"),
  },
  reasons: {
    amount: "même montant",
    date: "date proche",
    party: "même tiers",
    reference: "référence",
  },
  kinds: { income: "Entrée", spend: "Dépense" },
  suggestion: (label: string, amount: string) => `${label} · ${amount}`,
  noSuggestion: "Aucune proposition",
  left: (amount: string) => `reste ${amount}`,
  matchedWith: (label: string, amount: string) => `${label} · ${amount}`,
  accept: "Valider",
  choose: "Rapprocher…",
  ignore: "Ignorer",
  restore: "Remettre à rapprocher",
  undo: "Défaire",
  undoTitle: "Défaire ce rapprochement ?",
  undoBody:
    "L'encaissement ou le lien qu'il a créé est retiré. L'historique le garde.",
  undoing: "Retrait…",
  rowActions: (label: string) => `Actions pour « ${label} »`,
  receiptNote: (party: string | null) =>
    party ? `Rapproché avec la banque · ${party}` : "Rapproché avec la banque",
  import: "Importer un relevé",
  add: "Ajouter une transaction",
  emptyTitle: "Aucune transaction",
  emptyBody:
    "Importez l'export CSV de Qonto, ou ajoutez une transaction : PDS OS propose ce qu'elle règle, vous validez.",
  emptyView: "Aucune transaction ici.",
  loadError: "Les transactions n'ont pas pu être chargées.",
  importForm: {
    title: "Importer un relevé",
    description:
      "L'export CSV de Qonto (ou d'une autre banque) : date, montant, contrepartie, référence. Une transaction déjà importée n'est pas reprise.",
    file: "Fichier .csv",
    hint: "Qonto › Transactions › Exporter, au format CSV.",
    preview: (count: number) =>
      plural(count, "transaction lue", "transactions lues"),
    problems: (lines: string) => `Lignes illisibles : ${lines}.`,
    save: (count: number) =>
      `Importer ${plural(count, "transaction", "transactions")}`,
    saving: "Import…",
    empty: "Choisissez un fichier avec au moins une transaction.",
  },
  manualForm: {
    title: "Ajouter une transaction",
    description: "Un mouvement du compte, tel que la banque le montre.",
    direction: "Sens",
    in: "Entrée d'argent",
    out: "Sortie d'argent",
    amount: "Montant",
    bookedOn: "Date",
    counterparty: "Contrepartie",
    reference: "Référence",
    save: "Ajouter",
    saving: "Ajout…",
    errors: {
      amount: "Indiquez un montant en euros.",
      bookedOn: "Indiquez la date.",
      future: "La date n'est pas encore passée.",
    },
  },
  matchForm: {
    title: "Rapprocher la transaction",
    description: (label: string, amount: string) => `${label} · ${amount}`,
    target: "Ce qu'elle règle",
    targetPlaceholder: "Choisir une entrée ou une dépense",
    amount: "Montant rapproché",
    amountHint: (amount: string) => `Au plus ${amount}`,
    save: "Rapprocher",
    saving: "Rapprochement…",
    errors: {
      target: "Choisissez ce qu'elle règle.",
      amount: (max: string) => `Un montant d'au plus ${max}.`,
    },
  },
  ignoreForm: {
    title: "Ignorer la transaction",
    description:
      "Elle ne règle rien dans PDS OS : frais bancaires, virement entre comptes…",
    reason: "Raison",
    save: "Ignorer",
    saving: "Enregistrement…",
    error: "Donnez la raison.",
  },
  errors: {
    overAmount: "Ce rapprochement dépasserait le montant de la transaction.",
    direction:
      "Une entrée d'argent règle une entrée, une sortie règle une dépense.",
    ignored:
      "Cette transaction est ignorée : remettez-la à rapprocher d'abord.",
    matched:
      "Cette transaction est déjà rapprochée : défaites d'abord ses rapprochements.",
  },
  done: {
    imported: (count: number, skipped: number) =>
      skipped
        ? `${plural(count, "transaction importée", "transactions importées")}, ${plural(skipped, "déjà présente", "déjà présentes")}`
        : plural(count, "transaction importée", "transactions importées"),
    added: "Transaction ajoutée",
    matched: "Transaction rapprochée",
    unmatched: "Rapprochement défait",
    ignored: "Transaction ignorée",
    restored: "Transaction remise à rapprocher",
  },
} as const;
