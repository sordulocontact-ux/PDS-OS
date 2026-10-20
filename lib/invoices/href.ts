// Where an invoice is handled: the Master final for the engineer's, the
// person's step of the Juridique for a contract's. Client-safe.

import { routes } from "@/lib/auth/redirects";
import type { InvoiceOrigin } from "@/lib/invoices/types";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";

export const invoiceHref = (
  projectId: string,
  invoice: { origin: InvoiceOrigin; contactId: string },
) =>
  invoice.origin === "master"
    ? routes.projectMasterStep(projectId, "final")
    : legalDemarcheHref(projectId, "person", `contact:${invoice.contactId}`);
