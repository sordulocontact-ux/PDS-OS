// A term's value in words (BIZ 3), for the page and the journal. Client-safe.

import {
  TERM_VALUES,
  type TermFormat,
  type TermValue,
} from "@/lib/deals/terms";
import { deals } from "@/lib/i18n/fr/deals";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { formatShare } from "@/lib/legal/splits/shares";
import { formatAmount } from "@/lib/utils/money";

const fr = { deals, legalSplits };

/** The stored value read back, or null when it does not fit its format
 * (a term whose format changed in the configuration: shown « À définir »). */
export function parseTermValue(
  format: TermFormat,
  raw: unknown,
): TermValue | null {
  if (raw === null || raw === undefined) return null;
  const parsed = TERM_VALUES[format].safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** « 25 % », « Avance de 2 000 € HT », « Oui · 12 mois »,
 * « Auteur·rice (paroles) 25 % · Compositeur·rice 25 % ». */
/** A term's value shown on its own (a card, a memo line): its first letter
 * upper-case, as PO reads it lower-case from a call (« licence », Sacha
 * 23/11/2026). A contract keeps formatTermValue, the value may fall mid
 * sentence there. */
export function displayTermValue(
  format: TermFormat,
  value: TermValue | null,
): string | null {
  const text = formatTermValue(format, value);
  return text ? text.charAt(0).toLocaleUpperCase("fr") + text.slice(1) : text;
}

export function formatTermValue(
  format: TermFormat,
  value: TermValue | null,
): string | null {
  if (!value) return null;
  const t = fr.deals.terms;
  switch (format) {
    case "text":
      return (value as TermValue<"text">).text;
    case "percent":
      return formatShare((value as TermValue<"percent">).units);
    case "money": {
      const v = value as TermValue<"money">;
      return t.money[v.mode](formatAmount(v.cents));
    }
    case "amount":
      return formatAmount((value as TermValue<"amount">).cents);
    case "yesno": {
      const v = value as TermValue<"yesno">;
      return [v.yes ? t.yes : t.no, v.detail].filter(Boolean).join(" · ");
    }
    case "split":
      return (value as TermValue<"split">).entries
        .map((e) => `${fr.legalSplits.roles[e.role]} ${formatShare(e.units)}`)
        .join(" · ");
  }
}
