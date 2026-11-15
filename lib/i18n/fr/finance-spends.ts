/** Finance › Dépenses: every spend of the label, « prévu, engagé, facturé
 * et payé » (Ibé's ticket « Cockpit Finance », maquette 4, lot 3). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeSpends = {
  title: "Dépenses",
  // One list, filtered (as the proto's page, Sacha 15/11/2026).
  search: "Rechercher une dépense, un fournisseur",
  searchLabel: "Rechercher dans les dépenses",
  noResult: (query: string) => `Aucune dépense ne correspond à « ${query} ».`,
  filters: {
    envelope: "Enveloppe",
    allEnvelopes: "Toutes les enveloppes",
    status: "Statut",
    allStatuses: "Tous les statuts",
    statuses: {
      prevu: "Prévu",
      engage: "Engagé",
      facture: "Facturé",
      paye: "Payé",
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
    ttc: "TTC",
  },
  columns: {
    label: "Dépense",
    envelope: "Enveloppe",
    post: "Poste",
    supplier: "Fournisseur",
    day: "Échéance",
    state: "Statut",
    proof: "Justificatif",
    amount: "TTC",
    actions: "Actions",
  },
  columnsMenu: "Colonnes",
  proofAttached: "Justificatif joint",
  proofMissing: "Manquant",
  ht: (amount: string) => `${amount} HT`,
  rebillable: "Refacturable",
  rowActions: (label: string) => `Actions pour « ${label} »`,
  edit: "Modifier",
  planRebill: "Planifier le remboursement",
  editTitle: "Modifier la dépense",
  editDescription: "Une dépense d'un centre de coût ou hors budget.",
  rebillTitle: "Planifier le remboursement",
  rebillDescription: (label: string) =>
    `La recette attendue qui rembourse « ${label} ».`,
  emptyTitle: "Aucune dépense",
  emptyBody:
    "Les dépenses des projets, des artistes, des centres de coût et hors budget.",
  emptyView: "Aucune dépense ici.",
  loadError: "Les dépenses n'ont pas pu être chargées.",
} as const;
