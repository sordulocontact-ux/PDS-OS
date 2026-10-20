// An invoice of an external person (one system, 20/10/2026): the rules the
// code computes, never PO (CLAUDE.md, rule 6). Client-safe and pure: the
// database checks the same again.

import { todayInParis } from "@/lib/insights/dates";

/** An invoice is paid within thirty days of its receipt (proto). */
export const INVOICE_TERM_DAYS = 30;

/** The day an invoice received then is to be paid before, in Paris
 * (« À payer avant le Mer. 18/11/2026 »). */
export function invoiceDueOn(receivedAt: string | Date = new Date()): string {
  const day = todayInParis(new Date(receivedAt));
  const [y, m, d] = day.split("-").map(Number);
  const due = new Date(Date.UTC(y, m - 1, d + INVOICE_TERM_DAYS, 12));
  return due.toISOString().slice(0, 10);
}

/** The IBAN as typed, without spaces, in capitals. */
export const normalizeIban = (iban: string) =>
  iban.replace(/\s/g, "").toUpperCase();

/** Well formed and its check digits right (ISO 13616, mod 97). */
export function ibanOk(iban: string): boolean {
  const v = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  const digits = (v.slice(4) + v.slice(0, 4)).replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let rest = 0;
  for (let i = 0; i < digits.length; i += 7)
    rest = Number(String(rest) + digits.slice(i, i + 7)) % 97;
  return rest === 1;
}

export const bicOk = (bic: string) =>
  /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
    bic.replace(/\s/g, "").toUpperCase(),
  );

/** « FR76 •••• •••• 4567 ». */
export const maskIban = (iban: string) =>
  `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;

/** The extension of a file name, as a slot accepts it. */
export const extOf = (name: string) =>
  /\.([a-z0-9]{1,10})$/i.exec(name)?.[1]?.toLowerCase() ?? "";
