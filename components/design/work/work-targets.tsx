import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { ConceptionData } from "@/lib/design/conception";
import { DESIGN_TOPICS, DIRECTION_KEY } from "@/lib/design/intentions";
import type { IntentionsState } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import {
  conceptionDeliverableTone,
  intentionsStateTone,
} from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

type Target = {
  key: string;
  title: string;
  answered: number;
  proposals: number;
  toQualify: boolean;
};

/**
 * What can be worked on: the overall direction, then each deliverable, with
 * how many topics are answered and PO's proposals waiting (counted by
 * code). A column on large screens, a row that scrolls on its own below.
 */
export function WorkTargets({
  projectId,
  data,
  current,
  states,
}: {
  projectId: string;
  data: Pick<ConceptionData, "deliverables" | "intentions">;
  current: string;
  // Where each target's intentions stand (lib/design/consolidation.ts).
  states?: Record<string, IntentionsState>;
}) {
  const t = fr.conceptionWork.targets;
  const direction = data.intentions.filter((i) => i.target === "direction");
  const targets: Target[] = [
    {
      key: DIRECTION_KEY,
      title: t.direction,
      answered: direction.filter((i) => i.status === "confirmed").length,
      proposals: direction.filter((i) => i.status === "proposed").length,
      toQualify: false,
    },
    ...data.deliverables.map((d) => ({
      key: d.id,
      title: d.title,
      answered: d.answered,
      proposals: d.proposals,
      toQualify: d.status === "to_qualify",
    })),
  ];

  return (
    <nav aria-label={t.label} className="min-w-0">
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-0">
        {targets.map((target) => {
          const active = target.key === current;
          return (
            <li key={target.key} className="shrink-0 lg:shrink">
              <ViewLink
                href={routes.projectDesignWork(projectId, target.key)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-56 flex-col gap-1 rounded-2xl border border-border px-4 py-3 no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)] lg:w-auto lg:border-transparent",
                  active && "bg-[var(--control-bg-hover)]",
                )}
              >
                <span className="truncate text-body-md font-semibold text-foreground">
                  {target.title}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                  <span className="tabular-nums">
                    {t.answered(target.answered, DESIGN_TOPICS.length)}
                  </span>
                  {states?.[target.key] && (
                    <StatusBadge
                      tone={intentionsStateTone[states[target.key]!]}
                      size="sm"
                    >
                      {fr.conception.intentionsStates[states[target.key]!]}
                    </StatusBadge>
                  )}
                  {target.proposals > 0 && (
                    <StatusBadge tone="action" size="sm">
                      {t.proposals(target.proposals)}
                    </StatusBadge>
                  )}
                  {target.toQualify && (
                    <StatusBadge
                      tone={conceptionDeliverableTone.to_qualify}
                      size="sm"
                    >
                      {t.toQualify}
                    </StatusBadge>
                  )}
                </span>
              </ViewLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
