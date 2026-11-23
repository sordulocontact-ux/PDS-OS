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
} as const;
