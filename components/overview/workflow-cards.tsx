import type { ComponentType } from "react";
import { IconLock, IconRocket, IconScale } from "nucleo-sharp-essential";
import { IconGlobePointer } from "nucleo-sharp-essential";
import type { IconProps } from "nucleo-sharp-essential";

import { IconDisc } from "@/components/icons";
import { LaunchWorkflowButton } from "@/components/overview/launch-workflow-button";
import { StatusDot } from "@/components/ui/status-dot";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { legalPhase, type LegalStepKey } from "@/lib/ui/legal-steps";
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
  "flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background p-4";

/**
 * The four workflows of the overview (ticket « Architecture globale » § 2):
 * status, current step, why, progress in business units, the chevrons as a
 * thin bar. The whole card opens the workflow on its current step. A
 * workflow the viewer may not read shows its name only; one not launched
 * offers « Lancer » to the owner.
 */
export function WorkflowCards({
  projectId,
  workflows,
  states,
  legalDone,
  canLaunch,
  pilots = {},
}: {
  projectId: string;
  workflows: WorkflowKey[];
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  legalDone: LegalStepKey[];
  canLaunch: boolean;
  // Who pilots each launchable workflow in the plan (PROJ-UX-07).
  pilots?: Partial<Record<"strategy" | "master" | "legal", string | null>>;
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
        // The name links to the workflow; stretched, the whole card opens it.
        const head = (extra: React.ReactNode, href?: string) => (
          <div className="flex items-center gap-2">
            <Icon aria-hidden className="size-5 shrink-0" />
            <h3 className="min-w-0 flex-1 text-body-md font-semibold">
              {href ? (
                <ViewLink
                  href={href}
                  className="no-underline after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-[color:var(--focus-ring)]"
                >
                  {name}
                </ViewLink>
              ) : (
                name
              )}
            </h3>
            {extra}
          </div>
        );
        if (!state || state === "restricted")
          return (
            <li
              key={workflow}
              className={cn(frame, "bg-[var(--surface-soft)]")}
            >
              {head(
                <IconLock
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />,
              )}
              <p className="text-caption text-muted-foreground">
                {t.restricted}. {t.restrictedBody}
              </p>
            </li>
          );

        const steps = workflowSteps(workflow);
        const index = Math.max(
          0,
          steps.findIndex((step) => step.key === state.step),
        );
        const stepLabel =
          workflow === "legal"
            ? fr.shell.project.legalSteps[legalPhase(legalDone)]
            : steps[index]?.label;
        const launch = LAUNCHES[workflow];
        return (
          <li
            key={workflow}
            className={cn(
              frame,
              "relative transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)]",
            )}
          >
            {head(
              <StatusDot
                tone={workflowStatusTone[state.status]}
                label={t.statuses[state.status]}
                showLabel
                className="text-muted-foreground"
              />,
              workflowStepHref(projectId, workflow, state.step),
            )}
            <div aria-hidden className="flex gap-0.5">
              {steps.map((step) => (
                <span
                  key={step.key}
                  className={cn(
                    "h-1 flex-1 rounded-full bg-[var(--meter-track)]",
                    state.done.includes(step.key) && "bg-foreground",
                    !state.done.includes(step.key) &&
                      step.key === state.step &&
                      state.status !== "not_started" &&
                      "bg-[var(--po-grey-400)]",
                  )}
                />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-body-md font-semibold">
                {stepLabel}{" "}
                <span className="font-medium text-muted-foreground">
                  ·{" "}
                  {workflow === "legal"
                    ? t.board.dossierStep
                    : t.board.stepOf(index + 1, steps.length)}
                </span>
              </p>
              <p className="text-caption text-foreground">{state.reason}</p>
              <p className="text-caption text-muted-foreground">
                {state.progress}
              </p>
            </div>
            {state.status === "not_started" && canLaunch && launch && (
              // Above the stretched link: its own control.
              <div className="relative z-10">
                <LaunchWorkflowButton
                  projectId={projectId}
                  workflow={launch}
                  pilot={pilots[launch] ?? null}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
