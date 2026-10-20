// Amounts of PDS OS (decision of 20/10/2026, docs/CONTEXTE-PROJET.md): every
// amount the label agrees, invoices or pays is excl. tax, so every amount on
// screen says it — « 1 100 € HT » (proto « Projet complet »). The one
// formatter of the app: never an Intl.NumberFormat of its own elsewhere for
// money. Client-safe.

const NBSP = " ";

const number = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

/** « 1 100 € HT »; `{ ht: false }`: « 1 100 € », inside a sentence that
 * already said it (« mix 800 € · mastering 300 € »). */
export function formatAmount(
  cents: number,
  { ht = true }: { ht?: boolean } = {},
): string {
  return `${number(cents)}${NBSP}€${ht ? `${NBSP}HT` : ""}`;
}

/** « 1100,5 », an amount put back into a field, without its unit. */
export const amountInput = (cents: number): string =>
  number(cents).replace(/\s/g, "");

/** Cents from what a person typed (« 1 100,50 », « 1100.5 €  HT »); null
 * when it is not a plain amount. */
export function parseAmount(text: string): number | null {
  const clean = text
    .trim()
    .replace(/HT$/i, "")
    .replace(/[\s  €]/g, "")
    .replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents >= 1 ? cents : null;
}
