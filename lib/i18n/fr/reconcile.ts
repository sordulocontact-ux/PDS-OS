/** Finance › Rapprochement: the bank's transactions (Qonto CSV or by hand)
 * and what a person reconciles them with (Ibé's ticket « Cockpit Finance »,
 * lot 6). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const reconcile = {
  title: "Rapprochement",
  tiles: {
    open: "À rattacher",
    openHint: (count: number) =>
      count === 0
        ? "Tout est rattaché"
        : plural(count, "opération", "opérations"),
    matched: "Rattaché ce mois",
    matchedHint: (count: number) => plural(count, "opération", "opérations"),
    suggested: "Propositions",
    suggestedHint: "à valider une à une",
    doubles: "Doublons possibles",
    doublesHint: "même jour, montant et libellé",
  },
  views: {
    label: "Opérations",
    open: "À rattacher",
    matched: "Rattachées",
    ignored: "Ignorées",
  },
  columns: {
    transaction: "Opération",
    suggestion: "Proposition",
    amount: "Montant",
    actions: "Actions",
    date: "Date",
    party: "Opération",
    match: "Rattachement",
    proof: "Justificatif",
    status: "Statut",
  },
  states: {
    partial: "Partielle",
    double: "Doublon possible",
    proposal: "Proposition",
    matched: "Rattachée",
    ignored: "Ignorée",
    open: "À rattacher",
  },
  proofAttached: "Justificatif joint",
  searchLabel: "Rechercher une opération",
  search: "Rechercher un libellé, une référence",
  noResult: (query: string) => `Aucune opération ne correspond à « ${query} ».`,
  total: {
    label: "Total des opérations listées",
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
  accept: "Rattacher",
  choose: "Rattacher à…",
  ignore: "Ignorer",
  restore: "Remettre à rattacher",
  undo: "Défaire le rattachement",
  undoTitle: "Défaire ce rattachement ?",
  undoBody:
    "L'encaissement ou le lien qu'il a créé est retiré. L'historique le garde.",
  undoing: "Retrait…",
  rowActions: (label: string) => `Actions pour « ${label} »`,
  receiptNote: (party: string | null) =>
    party ? `Rattaché à la banque · ${party}` : "Rattaché à la banque",
  import: "Importer un relevé",
  add: "Ajouter une opération",
  emptyTitle: "Aucune opération",
  emptyBody:
    "Importez l'export CSV de Qonto, ou ajoutez une opération : PDS OS propose ce qu'elle règle, vous validez.",
  emptyView: "Aucune opération ici.",
  loadError: "Les opérations n'ont pas pu être chargées.",
  importForm: {
    title: "Importer un relevé",
    description:
      "L'export CSV de Qonto (ou d'une autre banque) : date, montant, contrepartie, référence. Une opération déjà importée n'est pas reprise.",
    file: "Fichier .csv",
    hint: "Qonto › Transactions › Exporter, au format CSV.",
    preview: (count: number) =>
      plural(count, "opération lue", "opérations lues"),
    problems: (lines: string) => `Lignes illisibles : ${lines}.`,
    save: "Importer le relevé",
    saving: "Import…",
    empty: "Choisissez un fichier avec au moins une opération.",
  },
  manualForm: {
    title: "Ajouter une opération",
    description: "",
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
    title: "Rattacher l'opération",
    description: (label: string, amount: string) => `${label} · ${amount}`,
    target: "Ce qu'elle règle",
    targetPlaceholder: "Choisir une entrée ou une dépense",
    amount: "Montant rattaché",
    amountHint: (amount: string) => `Au plus ${amount}`,
    save: "Rattacher",
    saving: "Rattachement…",
    errors: {
      target: "Choisissez ce qu'elle règle.",
      amount: (max: string) => `Un montant d'au plus ${max}.`,
    },
  },
  ignoreForm: {
    title: "Ignorer l'opération",
    description:
      "Elle ne règle rien dans PDS OS : frais bancaires, virement entre comptes…",
    reason: "Raison",
    save: "Ignorer",
    saving: "Enregistrement…",
    error: "Donnez la raison.",
  },
  errors: {
    overAmount: "Ce rattachement dépasserait le montant de l'opération.",
    direction:
      "Une entrée d'argent règle une entrée, une sortie règle une dépense.",
    ignored: "Cette opération est ignorée : remettez-la à rattacher d'abord.",
    matched:
      "Cette opération est déjà rattachée : défaites d'abord ses rattachements.",
  },
  done: {
    imported: (count: number, skipped: number) =>
      skipped
        ? `${plural(count, "opération importée", "opérations importées")}, ${plural(skipped, "déjà présente", "déjà présentes")}`
        : plural(count, "opération importée", "opérations importées"),
    added: "Opération ajoutée",
    matched: "Opération rattachée",
    unmatched: "Rattachement défait",
    ignored: "Opération ignorée",
    restored: "Opération remise à rattacher",
  },
} as const;
