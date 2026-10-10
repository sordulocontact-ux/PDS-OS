import type { ComponentType } from "react";
import {
  IconGlobePointer,
  IconLock,
  IconRocket,
  IconScale,
} from "nucleo-sharp-essential";
import type { IconProps } from "nucleo-sharp-essential";

import { IconArrowRight, IconDisc } from "@/components/icons";
import { LaunchWorkflowButton } from "@/components/overview/launch-workflow-button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusDot } from "@/components/ui/status-dot";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { workflowStepHref, workflowSteps } from "@/lib/ui/workflow-hrefs";
import { cn } from "@/lib/utils";
import type { WorkflowKey, WorkflowState } from "@/lib/workflow-status/rules";

const ICONS: Record<WorkflowKey, ComponentType<IconProps>> = {
  master: IconDisc,
  legal: IconScale,
  marketing: IconRocket,
  distribution: IconGlobePointer,
};

// The workflow the Plan du projet launches for each card (none: it follows
// another one).
const LAUNCHES: Partial<Record<WorkflowKey, "strategy" | "master" | "legal">> =
  { master: "master", legal: "legal", marketing: "strategy" };

const frame =
  "flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-background p-4";

/**
 * The workflows of the overview (ticket « Architecture globale » § 2,
 * maquette 01): a ring with the share of steps really done, the common
 * status, « n / N étapes », then the current step and why. The whole card
 * opens the workflow on its current step. A workflow the viewer may not
 * read shows its name only; one not launched offers « Lancer » to the owner.
 */
export function WorkflowCards({
  projectId,
  workflows,
  states,
  canLaunch,
}: {
  projectId: string;
  workflows: WorkflowKey[];
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  canLaunch: boolean;
}) {
  const t = fr.workflowStatus;
  return (
    <ul
      aria-label={t.board.workflowsLabel}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {workflows.map((workflow) => {
        const Icon = ICONS[workflow];
        const name = fr.shell.project.sidebar[workflow];
        const state = states[workflow];
        const head = (
          <div className="flex items-center gap-2">
            <Icon aria-hidden className="size-5 shrink-0" />
            <h3 className="min-w-0 flex-1 text-body-lg font-semibold">
              {name}
            </h3>
            {(!state || state === "restricted") && (
              <IconLock aria-hidden className="size-4 text-muted-foreground" />
            )}
          </div>
        );
        if (!state || state === "restricted")
          return (
            <li
              key={workflow}
              className={cn(frame, "bg-[var(--surface-soft)]")}
            >
              {head}
              <p className="text-caption text-muted-foreground">
                {t.restricted}. {t.restrictedBody}
              </p>
            </li>
          );

        const steps = workflowSteps(workflow);
        const done = steps.filter((step) => state.done.includes(step.key));
        const current = steps.find((step) => step.key === state.step);
        const launch = LAUNCHES[workflow];
        return (
          <li
            key={workflow}
            className={cn(
              frame,
              "relative transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)]",
            )}
          >
            {head}
            <div className="flex items-center gap-3">
              <ProgressRing
                value={done.length}
                max={steps.length}
                label={t.board.stepsDoneLabel(done.length, steps.length)}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <StatusDot
                  tone={workflowStatusTone[state.status]}
                  label={t.statuses[state.status]}
                  showLabel
                />
                <span className="text-caption text-muted-foreground tabular-nums">
                  {t.board.stepsDone(done.length, steps.length)}
                </span>
              </div>
              {/* Stretched over the card: the whole card opens the workflow
                  on its current step. */}
              <ViewLink
                href={workflowStepHref(projectId, workflow, state.step)}
                aria-label={t.board.open(name)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground no-underline after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-[color:var(--focus-ring)]"
              >
                <IconArrowRight aria-hidden className="size-4" />
              </ViewLink>
            </div>
            <div className="flex flex-col gap-0.5">
              {current && (
                <p className="text-body-md font-semibold">{current.label}</p>
              )}
              <p className="text-caption text-ink-800">{state.reason}</p>
              <p className="text-caption text-muted-foreground">
                {state.progress}
              </p>
            </div>
            {state.status === "not_started" && canLaunch && launch && (
              // Above the stretched link: its own control.
              <div className="relative z-10">
                <LaunchWorkflowButton projectId={projectId} workflow={launch} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
