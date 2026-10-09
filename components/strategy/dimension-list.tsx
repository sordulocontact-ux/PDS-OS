import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { StrategyAssessment } from "@/lib/strategy/assess";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

/**
 * The pilot of the Strategy (ticket § 2): the eight dimensions in a plain
 * vertical list — name, one line, state. A click opens the dimension in the
 * work panel (?d=<dimension>).
 */
export function DimensionList({
  projectId,
  assessment,
}: {
  projectId: string;
  assessment: StrategyAssessment;
}) {
  const t = fr.strategyFlow;
  return (
    <ol aria-label={t.pilot.label} className="flex flex-col gap-2">
      {assessment.dimensions.map((d, index) => (
        <li key={d.dimension}>
          <ViewLink
            href={routes.projectStrategyDimension(projectId, d.dimension)}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-background px-5 py-4 transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-grey-300 sm:flex-nowrap"
          >
            <span className="w-8 shrink-0 text-body-md font-semibold text-muted-foreground tabular-nums">
              {t.dimensionNumber(index)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-md font-semibold text-foreground">
                {t.dimensions[d.dimension]}
              </span>
              <span className="truncate text-caption text-muted-foreground">
                {d.summary}
              </span>
            </span>
            <StatusBadge tone={strategyDimensionTone[d.state]} size="sm">
              {t.states[d.state]}
            </StatusBadge>
          </ViewLink>
        </li>
      ))}
    </ol>
  );
}
