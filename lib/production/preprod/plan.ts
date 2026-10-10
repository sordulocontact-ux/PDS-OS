// Préproduction › Plan (ticket, parcours 7): the state of each action and of
// the plan, computed by code from what people recorded — never stored,
// never written by PO. Client-safe.
//   Brouillon   a draft still missing who or when;
//   À examiner  a draft with a pressenti and a date, ready to approve;
//   Approuvée   approved, no task in Travail yet;
//   En exécution its task runs in Travail;
//   Terminée    its task is done;
//   Bloquée     its task runs but an action it waits for is not finished.

import type { PlanAction } from "./types";

export const ACTION_STATES = [
  "draft",
  "to_review",
  "approved",
  "in_progress",
  "done",
  "blocked",
  "removed",
] as const;
export type ActionState = (typeof ACTION_STATES)[number];

export const PLAN_STATES = [
  "empty",
  "draft",
  "to_review",
  "approved",
  "in_progress",
  "done",
  "blocked",
] as const;
export type PlanState = (typeof PLAN_STATES)[number];

function ownState(a: PlanAction): Exclude<ActionState, "blocked"> {
  if (a.status === "removed") return "removed";
  if (a.status === "draft")
    return a.holder && a.dueDate ? "to_review" : "draft";
  if (!a.taskId) return "approved";
  return a.taskDone ? "done" : "in_progress";
}

/** Each action's state, by id. */
export function actionStates(actions: PlanAction[]): Map<string, ActionState> {
  const own = new Map(actions.map((a) => [a.id, ownState(a)]));
  return new Map(
    actions.map((a) => {
      const state = own.get(a.id)!;
      const waiting = a.dependsOn.some((id) => {
        const dep = own.get(id);
        return dep !== undefined && dep !== "done" && dep !== "removed";
      });
      return [a.id, state === "in_progress" && waiting ? "blocked" : state];
    }),
  );
}

/** The plan as a whole, from its live actions (removed ones left out). */
export function planState(
  actions: PlanAction[],
  states: Map<string, ActionState> = actionStates(actions),
): PlanState {
  const live = actions
    .map((a) => states.get(a.id)!)
    .filter((s) => s !== "removed");
  if (live.length === 0) return "empty";
  if (live.includes("blocked")) return "blocked";
  if (live.every((s) => s === "done")) return "done";
  if (live.some((s) => s === "in_progress" || s === "done"))
    return "in_progress";
  if (live.every((s) => s === "approved")) return "approved";
  if (live.includes("draft")) return "draft";
  return "to_review";
}

/** The actions an action may wait for: the plan's others, not removed. */
export function dependencyOptions(
  actions: PlanAction[],
  self: string | null,
): { id: string; title: string }[] {
  return actions
    .filter((a) => a.id !== self && a.status !== "removed")
    .map((a) => ({ id: a.id, title: a.title }));
}
