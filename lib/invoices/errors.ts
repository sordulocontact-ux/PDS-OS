import { invoices } from "@/lib/i18n/fr/invoices";

const fr = { invoices };

// The database's refusals of an invoice, in French. Client-safe.
const words: Record<string, string> = fr.invoices.errors;

export function invoiceError(
  message: string | undefined,
  code?: string,
): string {
  if (code === "42501") return words.forbidden;
  const key = Object.keys(words).find((c) => message?.includes(c));
  return key ? words[key] : words.failed;
}
