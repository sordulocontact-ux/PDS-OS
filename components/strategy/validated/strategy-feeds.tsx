import { StepSection } from "@/components/shell/journey/step-section";
import { InfoRow, Rows } from "@/components/ui/rows";
import { routes } from "@/lib/auth/redirects";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import type { BriefOut } from "@/lib/strategy/brief-out";
import { formatDay } from "@/lib/utils/day";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.final;

const detailOf = (count: string | null, detail: string) =>
  [count, detail].filter(Boolean).join(" · ");

// A lever is often written as a sentence: its final period would read
// « ….,  » in the list.
const bare = (s: string) => s.trim().replace(/[.;]+$/, "");

/**
 * « Ce que la Stratégie alimente » (proto st4, ticket § 10): the
 * Conception (the deliverables to conceive), the Activations (the levers
 * retained to prepare), the Planning (milestones and upstream deadlines) —
 * three equal consequences, none to start now; then the follow-up (§ 14).
 * A row that opens a page is the link itself (`InfoRow href`); the Planning
 * is said, not opened.
 */

export function StrategyFeeds({
  projectId,
  out,
  upstream,
  referenceDate,
}: {
  projectId: string;
  out: BriefOut;
  upstream: number;
  referenceDate: string | null;
}) {
  return (
    <StepSection title={t.feeds}>
      <Rows label={t.feeds}>
        <InfoRow
          title={t.design}
          detail={detailOf(
            t.designCount(out.deliverables.length),
            out.deliverables.map(bare).join(", ") || "—",
          )}
          href={routes.projectDesign(projectId)}
        />
        <InfoRow
          title={t.activations}
          detail={detailOf(
            t.activationsCount(out.levers.length),
            out.levers.map(bare).join(", ") || "—",
          )}
          href={routes.projectActivations(projectId)}
        />
        <InfoRow
          title={t.planning}
          detail={detailOf(
            t.planningCount(out.when.length, upstream),
            referenceDate ? t.planningFrom(formatDay(referenceDate)) : "—",
          )}
        />
        <InfoRow
          title={t.followUp}
          detail={t.followUpBody}
          href={routes.projectStrategyFollowUp(projectId)}
        />
      </Rows>
    </StepSection>
  );
}
