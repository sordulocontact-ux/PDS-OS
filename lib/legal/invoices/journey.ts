// The invoices in the Juridique's journey (J10, proto « Projet complet »
// invActors): once a paid contract is signed, the person's step says where
// its invoice stands; the person deposits it through their link, the
// direction confirms a new RIB then pays (« Payer la facture de Yanis
// Morel »). Pure, computed at each read from project_invoice_states, never
// stored. The invoice itself: lib/invoices/.

import { fr } from "@/lib/i18n/fr";
import type { Demarche } from "@/lib/legal/demarches/build";
import type { InvoiceStateRow } from "@/lib/invoices/states";

const t = fr.legalInvoices;

// The most urgent first.
const URGENCY = ["rib", "to_pay", "asked", "paid"] as const;

/** The person démarches with their contract invoice's state and who acts. */
export function withInvoices(
  demarches: Demarche[],
  states: InvoiceStateRow[],
  viewer: { name: string; canValidate: boolean },
  direction: string,
): Demarche[] {
  const contracts = states.filter((s) => s.origin === "contract");
  if (contracts.length === 0) return demarches;
  return demarches.map((d) => {
    if (d.kind !== "person" || !d.ref.startsWith("contact:")) return d;
    const contactId = d.ref.slice("contact:".length);
    const mine = contracts.filter((s) => s.contactId === contactId);
    if (mine.length === 0 || d.step.status !== "done") return d;
    const state =
      URGENCY.find((u) => mine.some((s) => s.state === u)) ?? "paid";
    const byDirection = {
      name: viewer.canValidate ? viewer.name : direction,
      viewer: viewer.canValidate,
      viaLink: false,
    };
    const actor =
      state === "rib"
        ? { ...byDirection, todo: t.todo.confirmRib(d.subject) }
        : state === "to_pay"
          ? { ...byDirection, todo: t.todo.pay(d.subject) }
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
