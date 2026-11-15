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
    `${name} à ${percent} % de son enveloppe`,
  budgetOver: (name: string, over: string) =>
    `${name} dépasse son enveloppe de ${over}`,
  budgetSub: (engaged: string, envelope: string) =>
    `${engaged} engagés sur ${envelope}`,
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
  duplicateSpendSub: "Même enveloppe, libellé et montant à quelques jours",
  rebill: (label: string) =>
    `${label} : refacturable sans remboursement planifié`,
  rebillSub: (amount: string) => `${amount} à refacturer`,
  offBudget: (label: string) => `${label} : hors budget`,
  offBudgetSub: (amount: string) => `${amount} sur aucune enveloppe`,
  noProof: (count: number) =>
    plural(
      count,
      "dépense facturée sans justificatif",
      "dépenses facturées sans justificatif",
    ),
  noProofSub: "Facturées ou payées",
  toReconcile: (count: number) =>
    plural(count, "transaction à rapprocher", "transactions à rapprocher"),
  toReconcileSub: (day: string) => `La plus ancienne du ${day}`,
  shift: (label: string, to: string) => `Décaler ${label} au ${to}`,
  shiftSub: (gain: string) =>
    `Relèverait le point bas de ${gain}, au-dessus de la réserve`,
} as const;
