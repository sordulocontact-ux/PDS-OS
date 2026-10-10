import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type {
  DimensionStatus,
  StrategyDimension,
} from "@/lib/strategy/dimensions";
import { strategyDimensionTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * The pilotage of the Stratégie (ticket § 2): its eight dimensions in a
 * plain vertical list, each with its name, a summary and its state, all
 * written by code. A row opens the dimension in the work panel (?d=).
 */
export function StrategyPilotage({
  projectId,
  statuses,
  current,
}: {
  projectId: string;
  statuses: DimensionStatus[];
  // The dimension open in the panel, if any.
  current: StrategyDimension | null;
}) {
  const t = fr.strategyPilot;
  return (
    <nav aria-label={t.listLabel}>
      <ol className="flex flex-col gap-1">
        {statuses.map((d, index) => (
          <li key={d.key}>
            <ViewLink
              href={routes.projectStrategyDimension(projectId, d.key)}
              scroll={false}
              aria-current={current === d.key ? "true" : undefined}
              className={cn(
                "grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-2xl px-4 py-3.5 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)] sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center",
                current === d.key && "bg-[var(--control-bg-hover)]",
              )}
            >
              <span className="text-body-md font-medium text-muted-foreground tabular-nums">
                {t.number(index)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-md font-semibold text-foreground">
                  {t.dimensions[d.key]}
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  {d.summary}
                </span>
              </span>
              <span className="col-start-2 sm:col-start-auto">
                <StatusBadge tone={strategyDimensionTone[d.state]} size="sm">
                  {t.states[d.state]}
                </StatusBadge>
              </span>
            </ViewLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
