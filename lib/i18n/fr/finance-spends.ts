/** Finance › Dépenses: every spend of the label, « prévu, engagé, facturé
 * et payé » (Ibé's ticket « Cockpit Finance », maquette 4, lot 3). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeSpends = {
  title: "Dépenses",
  tiles: {
    planned: "Prévu",
    committed: "Engagé",
    invoiced: "Facturé à payer",
    paid: "Payé ce mois",
    count: (count: number) =>
      count === 0 ? "Aucune dépense" : plural(count, "dépense", "dépenses"),
  },
  views: {
    label: "Dépenses",
    toPay: "À payer",
    committed: "Engagées",
    planned: "Prévues",
    paid: "Payées",
    offBudget: "Hors budget",
    rebill: "À refacturer",
  },
  columns: {
    label: "Dépense",
    envelope: "Enveloppe",
    day: "Échéance",
    state: "État",
    amount: "Montant TTC",
    actions: "Actions",
  },
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
