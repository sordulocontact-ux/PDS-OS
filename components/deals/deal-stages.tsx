import { FactRow, FactRows } from "@/components/ui/fact-row";
import type { Deal, DealEvent } from "@/lib/deals/types";
import { MOVABLE_DEAL_STAGES } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dealStageTone, stageTone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";

const fr = { deals };

/**
 * A deal's stages in their order (BIZ 4): done, in progress or to come,
 * with the day each was reached (its journal); abandoned, the stage it
 * stopped at stays current and the reason is under it.
 */
export function DealStages({
  deal,
  events,
}: {
  deal: Deal;
  events: DealEvent[];
}) {
  const t = fr.deals.page.stageStates;
  const stopped =
    deal.stage === "abandoned"
      ? (events.find((e) => e.kind === "abandoned")?.fromStage ?? "to_contact")
      : deal.stage;
  const at = MOVABLE_DEAL_STAGES.indexOf(
    stopped as (typeof MOVABLE_DEAL_STAGES)[number],
  );
  // The last day each stage was reached (events are the latest first).
  const reached = (stage: string) =>
    events.find((e) => e.toStage === stage)?.createdAt ?? null;
  return (
    <FactRows>
      {MOVABLE_DEAL_STAGES.map((stage, index) => {
        const state =
          index < at || (index === at && deal.stage === "signed")
            ? "done"
            : index === at
              ? "current"
              : "later";
        const day = state !== "later" ? reached(stage) : null;
        const stoppedHere = index === at && deal.stage === "abandoned";
        return (
          <FactRow
            key={stage}
            label={fr.deals.stages[stage]}
            value={
              stoppedHere
                ? (deal.abandonReason ?? undefined)
                : day
                  ? formatShortDay(day)
                  : undefined
            }
            state={{
              tone: stoppedHere
                ? dealStageTone.abandoned
                : state === "done"
                  ? stageTone.validated
                  : state === "current"
                    ? stageTone.in_progress
                    : stageTone.not_started,
              label: stoppedHere ? fr.deals.stages.abandoned : t[state],
            }}
          />
        );
      })}
    </FactRows>
  );
}
