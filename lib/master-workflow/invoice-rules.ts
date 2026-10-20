// The engineer's invoice (docs/projet-complet/master.md § 9): the rules the
// code computes, never PO (CLAUDE.md, rule 6). Client-safe and pure: the
// database checks the same again.

import { todayInParis } from "@/lib/insights/dates";

/** An invoice is paid within thirty days of its receipt (proto). */
export const INVOICE_TERM_DAYS = 30;

const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** « 1 100 € HT ». */
export const eurosHt = (cents: number) => `${euros.format(cents / 100)} € HT`;

/** « 1 100 », for a field pre-filled in euros. */
export const eurosValue = (cents: number) =>
  euros.format(cents / 100).replace(/\s/g, "");

/** « 1 100,50 » or « 1100.5 » → cents; null when it is not an amount. */
export function parseEuros(text: string): number | null {
  const clean = text.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents >= 1 ? cents : null;
}

/** The day the invoice is to be paid before: its receipt + 30 days, in
 * Paris (« À payer avant le Mer. 18/11/2026 »). */
export function invoiceDueOn(receivedAt: string): string {
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
