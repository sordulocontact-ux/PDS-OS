import { StatusBadge } from "@/components/ui/status-badge";
import { projectPlan } from "@/lib/i18n/fr/project-plan";
import { strategy } from "@/lib/i18n/fr/strategy";
import type { PlanLever } from "@/lib/project-plan/queries";
import { deliverableStateTone, leverTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { strategy, projectPlan };

/** Levers of one family: state, the Brief need it answers, its deliverables. */
export function LeverList({ levers }: { levers: PlanLever[] }) {
  const t = fr.projectPlan.activations;
  const states = fr.strategy.levers.states;

  if (levers.length === 0)
    return <p className="text-sm text-muted-foreground">{t.familyEmpty}</p>;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {levers.map((lever) => (
        <li
          key={lever.id}
          className={cn(
            "grid gap-2 px-4 py-3",
            lever.state === "rejected" && "text-muted-foreground",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid min-w-0 gap-0.5">
              <span className="text-sm font-medium break-words">
                {lever.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  lever.needLabel &&
                    fr.strategy.levers.fromNeed(lever.needLabel),
                  t.deliverableCount(lever.deliverables.length),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <StatusBadge tone={leverTone[lever.state]} size="sm">
              {states[lever.state]}
            </StatusBadge>
          </div>
          {lever.deliverables.length > 0 && (
            <ul className="grid gap-1 border-l border-border pl-3">
              {lever.deliverables.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate">{d.title}</span>
                  <StatusBadge tone={deliverableStateTone[d.state]} size="sm">
                    {fr.projectPlan.deliverables.states[d.state]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
