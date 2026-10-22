// The engineer's invoice in the Master's journey and history (proto
// `master-v2.html`, master:invoice). The invoice itself: lib/i18n/fr/invoices.ts.

const first = (name: string) => name.split(" ")[0] ?? name;

export const masterInvoice = {
  // The invoice at the head of the Master final (lot 5 of Ibé's feedback).
  lead: {
    more: "Le Master final et le budget",
  },
  // The budget lines of the Master final.
  budget: {
    title: "Budget",
    line: (stage: "mix" | "mastering", name: string) =>
      `${stage === "mix" ? "Mix" : "Mastering"} · ${name}`,
    invoiced: (n: string, at: string, due: string) =>
      `Facture n° ${n} reçue le ${at} · à payer avant le ${due}`,
    paid: (day: string) => `Facture payée le ${day}`,
    committed: "Engagé · facture attendue",
  },
  // The journey and the history.
  todo: {
    confirmRib: (name: string) => `Confirmer le nouveau RIB de ${first(name)}`,
    pay: (name: string, due: string) =>
      `Payer la facture de ${first(name)} avant le ${due}`,
  },
  summary: {
    toPay: "facture à payer",
    expected: "facture attendue",
    paid: "facture payée",
  },
  history: {
    requested: (name: string) => `Facture demandée à ${name} par PDS OS`,
    requestedCause: "Master final validé",
    received: (n: string, name: string, viaLink: boolean, amount: string) =>
      `Facture n° ${n} de ${name} ${viaLink ? "reçue par son lien" : "ajoutée"} : ${amount}`,
    receivedCause: "Facture demandée à la validation du master final",
    ribChanged: (name: string) =>
      `Nouveau RIB de ${name} reçu : à confirmer par la direction avant tout paiement`,
    ribCause: (n: string) => `Facture n° ${n}`,
    paid: (n: string, name: string, day: string, amount: string) =>
      `Facture n° ${n} de ${name} payée le ${day} : ${amount}`,
    paidCause: (at: string) => `Facture reçue le ${at}`,
  },
} as const;
