/** Finance's ⌘K search and alerts bell (docs/FINANCE-V2.md, lot 5). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeSearch = {
  open: "Rechercher",
  placeholder: "Une page, un budget, une dépense, une facture…",
  label: "Rechercher dans Finance",
  close: "Fermer la recherche",
  loading: "Chargement…",
  error: "La recherche n'a pas pu être chargée.",
  none: (query: string) => `Rien ne correspond à « ${query} ».`,
  groups: {
    section: "Pages",
    envelope: "Budgets",
    spend: "Dépenses",
    income: "Factures",
  },
  keys: { move: "pour choisir", open: "pour ouvrir" },
  bell: (count: number) =>
    count ? `Alertes : ${plural(count, "alerte", "alertes")}` : "Alertes",
  spendDetail: (amount: string, envelope: string, day: string) =>
    [amount, envelope, day].join(" · "),
  incomeDetail: (amount: string, payer: string | null, number: string | null) =>
    [amount, payer, number].filter(Boolean).join(" · "),
  offBudget: "Hors budget",
};
