// The overview's cards of the workflows (proto « Projet complet », host.js
// `overview()`): status, « Étape n sur N · titre », progress, and who acts
// next. Read from the journeys (lib/journey/) when the workflow has one,
// else from its chevrons (lib/workflow-status/). Computed, never stored.
// Pure, client-safe.

import type { ProjectJourneys } from "@/lib/journey/types";
import { actionHref, OPEN_STATUSES } from "@/lib/ui/journey";
import { workflowStepHref, workflowSteps } from "@/lib/ui/workflow-hrefs";
import type {
  CommonStatus,
  WorkflowKey,
  WorkflowState,
} from "@/lib/workflow-status/rules";

export type WorkflowCard =
  | { workflow: WorkflowKey; restricted: true }
  | {
      workflow: WorkflowKey;
      restricted: false;
      status: CommonStatus;
      href: string;
      // « Étape n sur N · titre »
      index: number;
      total: number;
      stepTitle: string;
      done: number;
      // The viewer's first action here, else whom it waits for.
      next: { mine: boolean; who: string; todo: string } | null;
    };

// « Confirmer la source » → « confirmer la source » after « À vous · ».
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function workflowCards({
  projectId,
  workflows,
  states,
  journeys,
}: {
  projectId: string;
  workflows: WorkflowKey[];
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  journeys: ProjectJourneys;
}): WorkflowCard[] {
  return workflows.map((workflow): WorkflowCard => {
    const state = states[workflow];
    if (!state || state === "restricted") return { workflow, restricted: true };
    const mine = journeys.mine.find((a) => a.module === workflow);
    const other = journeys.waiting.find((a) => a.module === workflow);
    const action = mine ?? other;
    const next = action?.step.actor
      ? {
          mine: Boolean(mine),
          who: action.step.actor.name,
          todo: lower(action.step.actor.todo),
        }
      : null;
    const steps = journeys.journeys
      .filter((j) => j.module === workflow)
      .flatMap((j) => j.steps);
    const base = { workflow, restricted: false as const, status: state.status };
    if (steps.length > 0) {
      const done = steps.filter((s) => s.status === "done").length;
      const current =
        steps.find((s) => OPEN_STATUSES.includes(s.status)) ??
        steps.find((s) => s.status !== "done" && s.status !== "obsolete");
      const index = current ? steps.indexOf(current) : steps.length - 1;
      return {
        ...base,
        href:
          (action && actionHref(action.step)) ?? current?.href ?? steps[0].href,
        index: index + 1,
        total: steps.length,
        stepTitle: (current ?? steps[steps.length - 1]).title,
        done,
        next,
      };
    }
    // No journey yet (Master, Distribution until their zone): the chevrons.
    const chevrons = workflowSteps(workflow);
    const at = Math.max(
      0,
      chevrons.findIndex((c) => c.key === state.step),
    );
    return {
      ...base,
      href:
        (action && actionHref(action.step)) ??
        workflowStepHref(projectId, workflow, state.step),
      index: at + 1,
      total: chevrons.length,
      stepTitle: chevrons[at]?.label ?? "",
      done: state.done.length,
      next,
    };
  });
}
