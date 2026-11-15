/** Finance › Alertes (Ibé's ticket « Cockpit Finance », « Alertes utiles »,
 * lot 7). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeAlerts = {
  title: "Alertes",
  groups: {
    danger: "À traiter",
    warning: "À vérifier",
    info: "Pistes",
  },
  empty: "Aucune alerte : rien à traiter.",
  belowReserve: "Passage sous la réserve minimale",
  belowReserveSub: (day: string, amount: string) =>
    `Le ${day}, solde prévu ${amount}`,
  budget: (name: string, percent: number) =>
    `${name} à ${percent} % de son budget`,
  budgetOver: (name: string, over: string) => `${name} : dépassé de ${over}`,
  budgetSub: (engaged: string, budget: string) =>
    `${engaged} engagés sur ${budget}`,
  lateIncome: (label: string) => `${label} en retard`,
  lateIncomeSub: (days: number, amount: string) =>
    `${amount} attendus depuis ${plural(days, "jour", "jours")}`,
  toPay: (label: string) => `${label} à payer`,
  toPaySub: (day: string, amount: string, late: boolean) =>
    late ? `Échue le ${day} · ${amount}` : `Avant le ${day} · ${amount}`,
  duplicateInvoice: (label: string, count: number) =>
    `Facture potentiellement dupliquée : ${label} (${count} fois)`,
  duplicateInvoiceSub:
    "Même numéro, ou même client et montant à quelques jours",
  duplicateSpend: (label: string, count: number) =>
    `Dépense potentiellement dupliquée : ${label} (${count} fois)`,
  duplicateSpendSub: "Même budget, libellé et montant à quelques jours",
  rebill: (label: string) => `${label} : à refacturer, aucune entrée prévue`,
  rebillSub: (amount: string) => `${amount} à refacturer`,
  offBudget: (label: string) => `${label} n'est rattachée à aucun budget`,
  offBudgetSub: (amount: string) => `${amount} sans budget`,
  noProof: (count: number) =>
    plural(
      count,
      "dépense facturée sans justificatif",
      "dépenses facturées sans justificatif",
    ),
  toReconcile: (count: number) =>
    plural(count, "opération à rattacher", "opérations à rattacher"),
  toReconcileSub: (day: string) => `La plus ancienne du ${day}`,
  shift: (label: string, to: string) => `Décaler ${label} au ${to}`,
  shiftSub: (gain: string) =>
    `Relèverait le point bas de ${gain}, au-dessus de la réserve`,
} as const;
