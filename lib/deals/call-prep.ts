// « Préparer un call » of a deal (BIZ 6): its agenda, written by the code
// from the deal — where it stands, then every term not yet confirmed, with
// what was said last. Client-safe.

import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { formatTermValue } from "@/lib/deals/term-format";
import { DEAL_TERMS, type DealTerm } from "@/lib/deals/terms";
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
    // A term with nothing said yet is the point alone: no « À définir »
    // under it, the call is there for that (Sacha 20/11/2026).
    ...termsToNegotiate(terms).map((term) => {
      const value = formatTermValue(term.format, term.value);
      return {
        topic: fr.deals.terms.labels[term.key] ?? term.key,
        minutes: 5,
        ...(value
          ? {
              questions: [t.lastSaid(fr.deals.terms.states[term.state], value)],
            }
          : {}),
      };
    }),
  ];
}

/** The agenda as the call's dialog shows it, one line a point:
 * « Avance · Contre-proposition : 15 000 € ». */
export function dealCallTopics(
  deal: Pick<Deal, "stage">,
  terms: DealTerm[],
): string[] {
  return dealCallAgenda(deal, terms).map((item) =>
    [item.topic, ...(item.questions ?? [])].join(" · "),
  );
}

/** A participation's deal does not exist yet: its terms all to define. */
export const blankDealTerms = (): DealTerm[] =>
  DEAL_TERMS.music.map((term) => ({
    key: term.key,
    format: term.format,
    value: null,
    state: "to_define",
    changedBy: null,
    changedAt: null,
  }));

/** The call's default title: « Call · Nadia · Titre 2 ». */
export const dealCallTitle = (name: string) => fr.dealCalls.prepare.title(name);
