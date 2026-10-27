// What PO filed from the strategy exchange, as meeting lines (one per line
// of « Les 8 dimensions » said in that exchange, under its dimension): the
// state is the Stratégie's — confirmed, corrected, set aside, or still to
// confirm (docs/ARCHITECTURE.md § 4 ter: the module settles the lines, the
// report does not). Client-safe, pure.

import type { MeetingLine } from "@/lib/calls/meeting/types";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import type { StrategyModel } from "@/lib/strategy/dimension-model";
import type { DimItem } from "@/lib/strategy/dimension-items";

const fr = { strategyDimensions };

const stateOf = (item: DimItem): MeetingLine["state"] => {
  const p = item.proposal;
  const by = p.decidedBy ?? "—";
  if (p.state === "proposed") return { kind: "pending" };
  if (p.state === "discarded") return { kind: "discarded", by };
  return p.original ? { kind: "corrected", by } : { kind: "confirmed", by };
};

/** The lines said in the exchange whose page is `callHref`. */
export function strategyMeetingLines(
  model: StrategyModel,
  callHref: string,
): MeetingLine[] {
  return model.dimensions.flatMap((d) => {
    return d.items
      .filter((item) => item.proposal.href === callHref)
      .map((item) => ({
        id: item.proposal.id,
        topic: fr.strategyDimensions.names[d.key],
        kind: null,
        who: null,
        due: null,
        text: item.proposal.original ?? item.proposal.text,
        became: item.proposal.original ? item.proposal.text : null,
        quote: item.proposal.quote ?? null,
        state: stateOf(item),
        // The budget stays internal (never in the participants' summary).
        internal: d.key === "budget",
      }));
  });
}
