/** Finance › Planning: the month's moves as a calendar (Sacha 15/11/2026,
 * after Midday). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financePlanning = {
  title: "Planning",
  grid: (month: string) => `Mouvements de ${month}`,
  list: (month: string) => `Jours de ${month} avec des mouvements`,
  totals: {
    label: "Total du mois",
    in: "Entrées",
    out: "Sorties",
  },
  // A day too full for its cell: the rest opens with the day.
  more: (count: number) => `+${count}`,
  // Where each move comes from.
  origins: {
    income: "Facture",
    spend: "Dépense",
    paid: "Dépenses payées",
    orchard: "Avance The Orchard",
    show: "Émission",
    pay_later: "Pay Later",
  },
  paidLabel: "Dépenses payées",
  installmentLabel: "Mensualité Pay Later",
  real: "Réel",
  forecast: "Prévu",
  late: "En retard",
  lateSince: (day: string) => `En retard, attendu le ${day}`,
  marks: {
    reserve: "Sous la réserve",
    low: "Point bas",
    low_under: "Point bas",
  },
  // A day as a screen reader says it, with its figures.
  day: ({
    name,
    count,
    lates,
    inAmount,
    outAmount,
    balance,
    marks,
  }: {
    name: string;
    count: number;
    lates: number;
    inAmount: string | null;
    outAmount: string | null;
    balance: string | null;
    marks: string[];
  }) =>
    [
      name,
      count === 0
        ? "aucun mouvement"
        : plural(count, "mouvement", "mouvements"),
      lates > 0 ? plural(lates, "en retard", "en retard") : null,
      inAmount && `entrées ${inAmount}`,
      outAmount && `sorties ${outAmount}`,
      balance && `solde ${balance}`,
      ...marks,
    ]
      .filter(Boolean)
      .join(", "),
  sheet: {
    eyebrow: (count: number) =>
      `Planning · ${plural(count, "mouvement", "mouvements")}`,
    before: "Solde avant",
    after: "Solde après",
    in: "Entrées",
    out: "Sorties",
    moves: "Mouvements",
    balanceAfter: (amount: string) => `Solde après : ${amount}`,
    open: (origin: string) => `Ouvrir · ${origin}`,
    unknown: "—",
  },
  noStatement:
    "Sans relevé du compte, le planning ne montre que ce qui est déjà entré ou sorti. Le solde se saisit dans Trésorerie.",
  beyond: (day: string) =>
    `La prévision s'arrête le ${day} : au-delà, rien n'est encore compté.`,
  empty: "Aucun mouvement ce mois-ci.",
};
