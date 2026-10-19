import { fr } from "@/lib/i18n/fr";
import {
  bicOk,
  eurosHt,
  ibanOk,
  parseEuros,
} from "@/lib/master-workflow/invoice-rules";

// What an invoice form must hold before it leaves (proto `invsend`): the
// PDF, its number, its amount (and why it differs from the rate
// committed), a RIB when PDS has none or when it changed. Client-safe; the
// database checks the same again.

const t = fr.masterInvoice.fields;

export type InvoiceDraft = {
  file: File | null;
  number: string;
  amount: string;
  why: string;
  // The RIB fields are shown (none on file, or « Mon RIB a changé »).
  ribOpen: boolean;
  iban: string;
  bic: string;
  holder: string;
};

export type InvoiceErrors = Partial<
  Record<
    "file" | "number" | "amount" | "why" | "iban" | "bic" | "holder",
    string
  >
>;

export const isPdf = (file: File) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name);

export function checkInvoice(
  d: InvoiceDraft,
  expectedCents: number | null,
): { errors: InvoiceErrors; amountCents: number | null; mismatch: boolean } {
  const errors: InvoiceErrors = {};
  if (!d.file) errors.file = t.pdfMissing;
  else if (!isPdf(d.file)) errors.file = t.notPdf(d.file.name);
  if (!d.number.trim()) errors.number = t.numberMissing;
  const amountCents = parseEuros(d.amount);
  if (amountCents === null) errors.amount = t.amountMissing;
  const mismatch =
    amountCents !== null &&
    expectedCents !== null &&
    amountCents !== expectedCents;
  if (mismatch && !d.why.trim())
    errors.why = t.mismatch(eurosHt(amountCents), eurosHt(expectedCents));
  if (d.ribOpen) {
    if (!d.iban.trim()) errors.iban = t.ibanMissing;
    else if (!ibanOk(d.iban)) errors.iban = t.ibanInvalid;
    if (d.bic.trim() && !bicOk(d.bic)) errors.bic = t.bicInvalid;
    if (!d.holder.trim()) errors.holder = t.holderMissing;
  }
  return { errors, amountCents, mismatch };
}
