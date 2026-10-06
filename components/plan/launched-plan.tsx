"use client";

import Link from "next/link";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { launchPlanWorkflow } from "@/lib/plan/actions";
import {
  LAUNCHABLE,
  PLAN_COLUMNS,
  type PlanWorkflow,
} from "@/lib/plan/propose";
import type { LaunchedItem } from "@/lib/plan/queries";
import { planWorkflowTone } from "@/lib/ui/state-tones";

/**
 * The plan once launched: the same four columns, each workflow with its
 * state (launched, waiting for its go, following its own stage) and a way
 * in; a workflow left in Ensuite starts with « Lancer maintenant ».
 */
export function LaunchedPlan({
  projectId,
  items,
  hrefs,
  editable,
}: {
  projectId: string;
  items: LaunchedItem[];
  hrefs: Record<PlanWorkflow, string>;
  editable: boolean;
}) {
  const t = fr.framingIntel.plan;
  const { pending, run } = useFramingAction();
  const stateOf = (item: LaunchedItem) =>
    !item.workflow
      ? null
      : !LAUNCHABLE.includes(item.workflow)
        ? "follows"
        : item.launchedAt
          ? "launched"
          : "waiting";

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PLAN_COLUMNS.map((column) => {
        const inColumn = items.filter((item) => item.column === column);
        return (
          <section
            key={column}
            aria-labelledby={`plan-${column}`}
            className="flex flex-col gap-3 rounded-3xl bg-[var(--surface-tint)] p-4"
          >
            <header className="flex flex-col gap-0.5">
              <h3 id={`plan-${column}`} className="text-body-md font-semibold">
                {t.columns[column]}
              </h3>
              <p className="text-caption text-muted-foreground">
                {t.columnHints[column]}
              </p>
            </header>
            {inColumn.length === 0 ? (
              <p className="text-caption text-muted-foreground">{t.empty}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {inColumn.map((item) => {
                  const state = stateOf(item);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-3"
                    >
                      <p className="text-body-md font-semibold break-words">
                        {item.title}
                      </p>
                      {item.why && (
                        <p className="text-caption text-muted-foreground">
                          {item.why}
                        </p>
                      )}
                      {item.workflow && (
                        <p className="text-caption">
                          {t.owner} : {item.ownerName ?? t.noOwner}
                        </p>
                      )}
                      {state && item.workflow && (
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={planWorkflowTone[state]} size="sm">
                            {t.states[state]}
                          </StatusBadge>
                          {state === "waiting" && editable ? (
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run(() =>
                                  launchPlanWorkflow(projectId, item.workflow!),
                                )
                              }
                            >
                              {t.launchNow}
                            </Button>
                          ) : state !== "waiting" ? (
                            <Link
                              href={hrefs[item.workflow]}
                              className={buttonVariants({
                                size: "sm",
                                variant: "outline",
                              })}
                            >
                              {t.open}
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
