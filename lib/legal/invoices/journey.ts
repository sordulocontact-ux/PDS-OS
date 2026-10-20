// The invoices in the Juridique's journey (J10, proto « Projet complet »
// invActors): once a paid contract is signed, the person's step says where
// the invoice stands, the person deposits it through their link, the
// direction pays it (« Payer la facture de Yanis Morel »). Pure, computed
// at each read from legal_invoice_states, never stored.

import { fr } from "@/lib/i18n/fr";
import type { Demarche } from "@/lib/legal/demarches/build";
import type { InvoiceState } from "@/lib/legal/invoices/queries";

const t = fr.legalInvoices;

export type InvoiceStateRow = { contactId: string; state: InvoiceState };

/** The person démarches with their invoice's state and who acts on it. */
export function withInvoices(
  demarches: Demarche[],
  states: InvoiceStateRow[],
  viewer: { name: string; canValidate: boolean },
  direction: string,
): Demarche[] {
  if (states.length === 0) return demarches;
  return demarches.map((d) => {
    if (d.kind !== "person" || !d.ref.startsWith("contact:")) return d;
    const contactId = d.ref.slice("contact:".length);
    const mine = states.filter((s) => s.contactId === contactId);
    if (mine.length === 0 || d.step.status !== "done") return d;
    // The most urgent: to pay, then awaited, then paid.
    const state: InvoiceState = mine.some((s) => s.state === "to_pay")
      ? "to_pay"
      : mine.some((s) => s.state === "asked")
        ? "asked"
        : "paid";
    const actor =
      state === "to_pay"
        ? {
            name: viewer.canValidate ? viewer.name : direction,
            viewer: viewer.canValidate,
            viaLink: false,
            todo: t.todo.pay(d.subject),
          }
        : state === "asked"
          ? {
              name: d.subject,
              viewer: false,
              viaLink: true,
              todo: t.todo.deposit,
            }
          : null;
    return {
      ...d,
      step: { ...d.step, summary: t.summary[state], actor },
    };
  });
}
