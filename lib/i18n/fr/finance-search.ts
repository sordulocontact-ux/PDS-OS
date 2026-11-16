/** Finance's ⌘K search and alerts bell (docs/FINANCE-V2.md, lot 5). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeSearch = {
  // One text for the bar and for the window.
  open: "Rechercher un budget, une dépense, une entrée…",
  placeholder: "Rechercher un budget, une dépense, une entrée…",
  label: "Rechercher dans Finance",
  close: "Fermer la recherche",
  loading: "Chargement…",
  error: "La recherche n'a pas pu être chargée.",
  none: (query: string) => `Rien ne correspond à « ${query} ».`,
  groups: {
    section: "Pages",
    envelope: "Budgets",
    spend: "Dépenses",
    income: "Entrées",
    proof: "Justificatifs",
    transaction: "Opérations",
    action: "Actions",
  },
  addSpend: "Ajouter une dépense",
  addIncome: "Ajouter une entrée",
  keys: { move: "pour choisir", open: "pour ouvrir" },
  bell: (count: number) =>
    count ? `Alertes : ${plural(count, "alerte", "alertes")}` : "Alertes",
  spendDetail: (amount: string, envelope: string, day: string) =>
    [amount, envelope, day].join(" · "),
  incomeDetail: (amount: string, payer: string | null, number: string | null) =>
    [amount, payer, number].filter(Boolean).join(" · "),
  proofDetail: (
    amount: string | null,
    reference: string | null,
    file: string | null,
  ) => [amount, reference, file].filter(Boolean).join(" · "),
  transactionDetail: (amount: string, day: string) => `${amount} · ${day}`,
  offBudget: "Hors budget",
};
