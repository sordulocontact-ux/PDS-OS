import { DayGroups } from "@/components/ui/day-groups";
import { Timestamp } from "@/components/ui/timestamp";
import { formatTermValue, parseTermValue } from "@/lib/deals/term-format";
import { DEAL_KINDS, type Deal, type DealEvent } from "@/lib/deals/types";
import { termOf } from "@/lib/deals/terms";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

/** One line of the journal, in words. */
function lineOf(event: DealEvent, deal: Deal): string {
  const t = fr.deals.page.history;
  const stage = (s: DealEvent["toStage"]) => (s ? fr.deals.stages[s] : "");
  switch (event.kind) {
    case "created":
      return t.created;
    case "assigned":
      return t.assigned(event.assignee);
    case "stage":
      return t.stage(stage(event.fromStage), stage(event.toStage));
    case "agreement_validated":
      return t.agreementValidated;
    case "agreement_refused":
      return t.agreementRefused;
    case "abandoned":
      return t.abandoned;
    case "next_action":
      return t.nextAction;
    case "memo":
      return t.memo(Boolean(event.detail.agreement));
    case "memo_validated":
      return t.memoValidated;
    case "contract_linked":
      return event.detail.contract ? t.contractLinked : t.contractUnlinked;
    case "contract_check": {
      const key = String(event.detail.key ?? "");
      return t.contractCheck(
        fr.deals.terms.labels[key] ?? key,
        event.detail.verdict === "different",
      );
    }
    case "term": {
      const key = String(event.detail.key ?? "");
      const term = (DEAL_KINDS as readonly string[]).includes(deal.kind)
        ? termOf(deal.kind, key)
        : null;
      const state = String(event.detail.state ?? "to_define");
      const value = term
        ? formatTermValue(
            term.format,
            parseTermValue(term.format, event.detail.value),
          )
        : null;
      const states = fr.deals.terms.states as Record<string, string>;
      return t.term(
        fr.deals.terms.labels[key] ?? key,
        [value, states[state]].filter(Boolean).join(" · "),
      );
    }
  }
}

/**
 * A deal's history (BIZ 4): every gesture of its journal by day, the
 * latest first — who, when, the stage left and reached, the reason of a
 * refusal or an abandon, each term's change.
 */
export function DealHistory({
  deal,
  events,
}: {
  deal: Deal;
  events: DealEvent[];
}) {
  const t = fr.deals.page.history;
  return (
    <DayGroups
      items={events.map((e) => ({ ...e, at: e.createdAt }))}
      idPrefix={`deal-${deal.id}`}
      keyOf={(e) => e.id}
    >
      {(e) => (
        <p className="flex min-w-0 flex-wrap gap-x-2 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
          <Timestamp
            iso={e.createdAt}
            hourOnly
            className="text-[color:var(--text-secondary)]"
          />
          <span className="min-w-0 break-words">{lineOf(e, deal)}</span>
          {e.actor && (
            <span className="text-[color:var(--text-secondary)]">
              {t.by(e.actor)}
            </span>
          )}
          {e.reason && (
            <span className="w-full break-words text-[color:var(--text-secondary)]">
              « {e.reason} »
            </span>
          )}
        </p>
      )}
    </DayGroups>
  );
}
