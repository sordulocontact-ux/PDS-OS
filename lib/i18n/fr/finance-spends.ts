/** Finance › Dépenses: every spend of the label, « prévu, engagé, facturé
 * et payé » (Ibé's ticket « Cockpit Finance », maquette 4, lot 3). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeSpends = {
  title: "Dépenses",
  // One list, filtered (as the proto's page, Sacha 15/11/2026).
  search: "Rechercher",
  searchLabel: "Rechercher dans les dépenses",
  noResult: (query: string) => `Aucune dépense ne correspond à « ${query} ».`,
  filters: {
    envelope: "Budget",
    allEnvelopes: "Tous les budgets",
    status: "Statut",
    allStatuses: "Tous les statuts",
    statuses: {
      prevu: "Prévue",
      engage: "Engagée",
      facture: "Facturée",
      paye: "Payée",
      "a-refacturer": "À refacturer",
    },
  },
  proofView: {
    label: "Justificatif",
    all: "Toutes",
    missing: "Sans justificatif",
  },
  total: {
    label: "Total de la liste",
    count: (count: number) => plural(count, "dépense", "dépenses"),
    planned: "prévu",
    committed: "engagé",
    invoiced: "facturé",
    paid: "payé",
    // The stages are summed HT, the whole TTC.
    htSuffix: "HT",
    ttc: "TTC",
  },
  columns: {
    label: "Dépense",
    envelope: "Budget",
    post: "Poste",
    supplier: "Fournisseur",
    day: "Date",
    state: "Statut",
    proof: "Justificatif",
    amount: "TTC",
    actions: "Actions",
  },
  columnsMenu: "Colonnes",
  proofAttached: "Justificatif joint",
  proofMissing: "Manquant",
  // A planned or committed spend has no invoice yet: nothing is missing.
  proofLater: "Pas encore",
  ht: (amount: string) => `${amount} HT`,
  rebillable: "Refacturable",
  rowActions: (label: string) => `Actions pour « ${label} »`,
  edit: "Modifier",
  editInProject: "Modifier dans le projet",
  editInArtist: "Modifier dans le budget de l'artiste",
  planRebill: "Planifier le remboursement",
  editTitle: "Modifier la dépense",
  rebillTitle: "Planifier le remboursement",
  rebillDescription: (label: string) =>
    `L'entrée attendue qui rembourse « ${label} ».`,
  emptyTitle: "Aucune dépense",
  emptyBody:
    "Les dépenses des projets, des artistes, des autres budgets et hors budget.",
  emptyView: "Aucune dépense ici.",
  loadError: "Les dépenses n'ont pas pu être chargées.",
} as const;
