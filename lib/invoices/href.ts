// Where an invoice is handled: the Master final for the engineer's, the
// person's step of the Juridique for a contract's. Client-safe.

import { routes } from "@/lib/auth/redirects";
import type { InvoiceOrigin } from "@/lib/invoices/types";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";

/** The anchor of one invoice's panel (InvoicePanel). */
export const invoiceAnchor = (invoiceId: string) => `facture-${invoiceId}`;

/** The invoice itself, never only its step (lot 5 of Ibé's feedback). */
export const invoiceHref = (
  projectId: string,
  invoice: { id?: string; origin: InvoiceOrigin; contactId: string },
) =>
  invoice.origin === "master"
    ? `${routes.projectMasterStep(projectId, "final")}${
        invoice.id ? `#${invoiceAnchor(invoice.id)}` : ""
      }`
    : legalDemarcheHref(projectId, "person", `contact:${invoice.contactId}`);
