import { fr } from "@/lib/i18n/fr";

// The SQL refusals of an invoice, in French. Client-safe.
export function invoiceError(message: string | undefined): string {
  const e = fr.legalInvoices.errors;
  if (!message) return e.failed;
  if (message.includes("invoice_link_closed")) return e.closed;
  if (message.includes("invoice_exists")) return e.exists;
  if (message.includes("invoice_gap_reason_required")) return e.gap;
  if (message.includes("upload_missing")) return e.upload;
  if (message.includes("forbidden")) return fr.auth.errors.forbidden;
  return e.failed;
}

/** The extension of a file name, as a slot accepts it. */
export const extOf = (name: string) =>
  /\.([a-z0-9]{1,10})$/i.exec(name)?.[1]?.toLowerCase() ?? "";
