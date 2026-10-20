// A paid contract's invoice in the Juridique's journey (J10, proto « Projet
// complet », legal:invoice). The invoice itself: lib/i18n/fr/invoices.ts.

export const legalInvoices = {
  title: "Facture",
  // The journey (Maintenant, Travail).
  todo: {
    deposit: "Déposer la facture",
    pay: (name: string) => `Payer la facture de ${name}`,
    confirmRib: (name: string) => `Confirmer le nouveau RIB de ${name}`,
  },
  summary: {
    asked: "Contrat signé · facture attendue",
    rib: "Contrat signé · RIB à confirmer",
    to_pay: "Contrat signé · facture à payer",
    paid: "Contrat signé · facture payée",
  },
} as const;
