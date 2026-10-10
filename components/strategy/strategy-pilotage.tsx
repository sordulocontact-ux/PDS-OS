import { IconChevronDown } from "nucleo-sharp-essential";

import { DimensionRegion } from "@/components/strategy/dimension-region";
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

// Answered by one form whose « Enregistrer » folds the dimension back
// (StrategyChoices); the others are lists, closed with « Terminé ».
const ANSWER_DIMENSIONS: StrategyDimension[] = [
  "positioning",
  "audiences",
  "narrative",
];

/**
 * The pilotage of the Stratégie (ticket § 2): its eight dimensions in a
 * vertical list, each with its name, a summary and its state, all written
 * by code. A row unfolds its dimension in place, chevron on the right, one
 * at a time; the URL names it (?d=) so a reload, the Brief or the Planning
 * find it open. Saving an answer folds it back (useCloseDimension).
 */
export function StrategyPilotage({
  projectId,
  statuses,
  current,
  children,
}: {
  projectId: string;
  statuses: DimensionStatus[];
  // The unfolded dimension, if any, and its work rendered by the server.
  current: StrategyDimension | null;
  children?: React.ReactNode;
}) {
  const t = fr.strategyPilot;
  const closeHref = routes.projectStrategy(projectId);
  return (
    <nav aria-label={t.listLabel}>
      <ol className="flex flex-col gap-2">
        {statuses.map((d, index) => {
          const open = current === d.key;
          const headerId = `dimension-${d.key}`;
          const regionId = `dimension-${d.key}-work`;
          return (
            <li
              key={d.key}
              className="rounded-2xl border border-border bg-background"
            >
              <ViewLink
                id={headerId}
                href={
                  open
                    ? closeHref
                    : routes.projectStrategyDimension(projectId, d.key)
                }
                scroll={false}
                aria-expanded={open}
                aria-controls={open ? regionId : undefined}
                className={cn(
                  "flex scroll-mt-6 items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]",
                  open && "rounded-b-none",
                )}
              >
                <span className="w-8 shrink-0 self-start text-body-md font-medium text-muted-foreground tabular-nums sm:self-center">
                  {t.number(index)}
                </span>
                {/* Name and summary, the state under them on a phone. */}
                <span className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex w-full min-w-0 flex-col gap-0.5 sm:flex-1">
                    <span className="text-body-md font-semibold text-foreground">
                      {t.dimensions[d.key]}
                    </span>
                    {!open && (
                      <span className="truncate text-caption text-muted-foreground">
                        {d.summary}
                      </span>
                    )}
                  </span>
                  <StatusBadge tone={strategyDimensionTone[d.state]} size="sm">
                    {t.states[d.state]}
                  </StatusBadge>
                </span>
                <IconChevronDown
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                />
              </ViewLink>
              {open && (
                <DimensionRegion
                  id={regionId}
                  headerId={headerId}
                  closeHref={closeHref}
                  description={t.purposes[d.key]}
                  withDone={!ANSWER_DIMENSIONS.includes(d.key)}
                >
                  {children}
                </DimensionRegion>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
