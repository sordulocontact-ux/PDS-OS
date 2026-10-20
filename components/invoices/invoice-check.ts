import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { bicOk, ibanOk } from "@/lib/invoices/rules";
import { formatAmount, parseAmount } from "@/lib/utils/money";

// What an invoice form must hold before it leaves (proto `invsend`): the
// PDF, its number, its amount (and why it differs from what was agreed),
// the day it arrived when the team adds it, a RIB when PDS has none or when
// it changed. Client-safe; the database checks the same again.

const t = fr.invoices.fields;

export type InvoiceDraft = {
  file: File | null;
  number: string;
  amount: string;
  why: string;
  // The team only: the day it arrived (« Reçue le »).
  receivedOn: string | null;
  // The RIB fields are shown (none on file, or « Mon RIB a changé »).
  ribOpen: boolean;
  iban: string;
  bic: string;
  holder: string;
};

export type InvoiceErrors = Partial<
  Record<
    | "file"
    | "number"
    | "amount"
    | "why"
    | "receivedOn"
    | "iban"
    | "bic"
    | "holder",
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
  const amountCents = parseAmount(d.amount);
  if (amountCents === null) errors.amount = t.amountMissing;
  const mismatch =
    amountCents !== null &&
    expectedCents !== null &&
    amountCents !== expectedCents;
  if (mismatch && !d.why.trim())
    errors.why = t.mismatch(
      formatAmount(amountCents),
      formatAmount(expectedCents),
    );
  if (d.receivedOn !== null) {
    if (!d.receivedOn) errors.receivedOn = t.receivedOnMissing;
    else if (d.receivedOn > todayInParis())
      errors.receivedOn = t.receivedOnInvalid;
  }
  if (d.ribOpen) {
    if (!d.iban.trim()) errors.iban = t.ibanMissing;
    else if (!ibanOk(d.iban)) errors.iban = t.ibanInvalid;
    if (d.bic.trim() && !bicOk(d.bic)) errors.bic = t.bicInvalid;
    if (!d.holder.trim()) errors.holder = t.holderMissing;
  }
  return { errors, amountCents, mismatch };
}
