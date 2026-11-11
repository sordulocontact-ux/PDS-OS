// « Préparer un call » of a deal (BIZ 6): its agenda, written by the code
// from the deal — where it stands, then every term not yet confirmed, with
// what was said last. Client-safe.

import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { dealCalls, deals };

/** The points to negotiate: the terms not confirmed, in their order. */
export function termsToNegotiate(terms: DealTerm[]): DealTerm[] {
  return terms.filter((term) => term.state !== "confirmed");
}

/** The call's agenda: the context, then one point per term to negotiate. */
export function dealCallAgenda(
  deal: Pick<Deal, "stage">,
  terms: DealTerm[],
): AgendaItem[] {
  const t = fr.dealCalls.prepare;
  return [
    {
      topic: t.contextTopic,
      minutes: 5,
      questions: [t.contextStage(fr.deals.stages[deal.stage])],
    },
    ...termsToNegotiate(terms).map((term) => {
      const value = formatTermValue(term.format, term.value);
      return {
        topic: fr.deals.terms.labels[term.key] ?? term.key,
        minutes: 5,
        questions: [
          value
            ? t.lastSaid(fr.deals.terms.states[term.state], value)
            : t.toDefine,
        ],
      };
    }),
  ];
}

/** The call's default title: « Call · Nadia · Titre 2 ». */
export const dealCallTitle = (name: string) => fr.dealCalls.prepare.title(name);
