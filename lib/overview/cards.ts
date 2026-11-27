// The overview's cards of the workflows (proto « Projet complet », host.js
// `overview()`): status, « Étape n sur N · titre », progress, and who acts
// next. Read from the journeys (lib/journey/) when the workflow has one,
// else from its chevrons (lib/workflow-status/). Computed, never stored.
// Pure, client-safe.

import { RELEASE_PART, type ProjectJourneys } from "@/lib/journey/types";
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
      // Said after the workflow's name when its journey is not the page's
      // own: a title's Distribution held by the compilation it goes out
      // with (« avec la compilation », Maël 25/11/2026).
      scope?: string;
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
    const own = journeys.journeys.filter((j) => j.module === workflow);
    // A collective's Distribution, one journey per release (lot 15): the
    // card follows one release, named after the workflow (« Distribution ·
    // Néons »): the action's, else the first not done, else the first.
    const release =
      own.length > 1 && own.every((j) => j.part?.key.startsWith(RELEASE_PART))
        ? (own.find((j) => j.part?.key === action?.part) ??
          own.find((j) =>
            j.steps.some((s) => s.status !== "done" && s.status !== "obsolete"),
          ) ??
          own[0])
        : null;
    const next = action?.step.actor
      ? {
          mine: Boolean(mine),
          who: action.step.actor.name,
          todo: lower(action.step.actor.todo),
        }
      : null;
    const steps = (release ? [release] : own).flatMap((j) => j.steps);
    const base = {
      workflow,
      restricted: false as const,
      status: state.status,
      ...(release?.part ? { scope: release.part.label } : {}),
    };
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
