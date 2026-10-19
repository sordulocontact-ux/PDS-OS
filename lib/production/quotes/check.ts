// What a quote is checked on (proto « Vérifier le devis Vn »): the amount
// against the envelope and the places' amount, computed by code; the
// delays and the posts, ticked by the line producer. Pure, client-safe.

import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.productionQuotes.check;

// The two points the line producer ticks; `amount` is computed.
export const QUOTE_CHECKS = ["amount", "delay", "scope"] as const;
export type QuoteCheckKey = (typeof QUOTE_CHECKS)[number];
export const TICKED_CHECKS = ["delay", "scope"] as const;

export type QuoteComputed = {
  ok: boolean | null;
  text: string;
  source: string;
};

export function quoteComputed(
  quote: { amountCents: number; locBudgetCents: number | null },
  frame: { envelopeCents: number | null; shootDays: number },
): QuoteComputed[] {
  const amount = formatEuros(quote.amountCents);
  const env = frame.envelopeCents;
  return [
    {
      ok: env === null ? null : quote.amountCents <= env,
      text:
        env === null
          ? t.amountNoEnvelope(amount)
          : quote.amountCents <= env
            ? t.amountOk(amount, formatEuros(env))
            : t.amountOver(amount, formatEuros(env)),
      source: t.computed,
    },
    quote.locBudgetCents === null
      ? { ok: null, text: t.locMissing, source: "" }
      : {
          ok: true,
          text: t.loc(formatEuros(quote.locBudgetCents), frame.shootDays),
          source: t.locSource,
        },
  ];
}
