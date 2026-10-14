// The points a quote is checked on (Ibé, 14/10: « vérifie le devis, les
// délais et la cohérence avec l'enveloppe »), prepared by code from the
// sheet's envelope and delivery date. The line producer ticks each one.
// Pure, client-safe.

import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";

const t = fr.productionQuotes.check;

export const QUOTE_CHECKS = ["amount", "delay", "scope"] as const;
export type QuoteCheckKey = (typeof QUOTE_CHECKS)[number];

export type QuoteCheck = {
  key: QuoteCheckKey;
  text: string;
  // Null: nothing for code to compare, the person checks it.
  ok: boolean | null;
};

export function quoteChecks(
  quote: { amountCents: number; deliveryOn: string | null },
  frame: { envelopeCents: number | null; deliveryDate: string | null },
): QuoteCheck[] {
  const amount = formatEuros(quote.amountCents);
  const env = frame.envelopeCents;
  return [
    {
      key: "amount",
      ok: env === null ? null : quote.amountCents <= env,
      text:
        env === null
          ? t.amountNoEnvelope(amount)
          : quote.amountCents <= env
            ? t.amountOk(
                amount,
                formatEuros(env),
                formatEuros(env - quote.amountCents),
              )
            : t.amountOver(
                amount,
                formatEuros(env),
                formatEuros(quote.amountCents - env),
              ),
    },
    {
      key: "delay",
      ok:
        quote.deliveryOn && frame.deliveryDate
          ? quote.deliveryOn <= frame.deliveryDate
          : null,
      text:
        quote.deliveryOn && frame.deliveryDate
          ? quote.deliveryOn <= frame.deliveryDate
            ? t.delayOk(
                formatDate(quote.deliveryOn),
                formatDate(frame.deliveryDate),
              )
            : t.delayLate(
                formatDate(quote.deliveryOn),
                formatDate(frame.deliveryDate),
              )
          : t.delayUnknown,
    },
    { key: "scope", ok: null, text: t.scope },
  ];
}
