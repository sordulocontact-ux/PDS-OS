// The execution plan of a validated Brief de sortie (MKT-S1-16,
// docs/ARCHITECTURE.md § 6 bis, « Plan d'exécution »): what the code proposes
// to create once the strategy is validated, never created before the owner
// confirms it (apply_strategy_execution). An activation per retained lever
// that has none, a task « Livrer : … » per deliverable with its owner and
// due date; the Conception already holds every committed deliverable (its
// mirror), the Production reads them there. Pure, client-safe.

import { kindOfLever } from "@/lib/activations/kind-of-lever";
import type { ActivationKind } from "@/lib/activations/model";

export type ExecutionItem =
  | {
      key: string;
      kind: "activation";
      leverId: string;
      title: string;
      activationKind: ActivationKind;
    }
  | {
      key: string;
      kind: "task";
      deliverableId: string;
      leverId: string;
      title: string;
      assigneeId: string;
      dueDate: string;
    };

export type ExecutionInput = {
  levers: Array<{
    id: string;
    label: string;
    state: string;
    review_status: string;
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    lever_id: string;
    assignee_person_id: string | null;
    due_date: string | null;
  }>;
  // Activations already made from a lever, tasks already about a deliverable.
  activationLeverIds: string[];
  taskDeliverableIds: string[];
  // Sources already planned (strategy_execution_items.item_key).
  plannedKeys: string[];
};

export type ExecutionPlan = {
  // To create, once confirmed.
  items: ExecutionItem[];
  // Already in the execution: by this plan or by hand.
  existing: number;
  // Deliverables to plan first (no owner or no due date).
  unplanned: Array<{ id: string; title: string }>;
  // Committed deliverables the Conception already holds.
  inConception: number;
};

/** The keys apply_strategy_execution records, the same on both sides. */
export const activationKey = (leverId: string) => `activation:${leverId}`;
export const taskKey = (deliverableId: string) => `task:${deliverableId}`;

export function executionPlan(input: ExecutionInput): ExecutionPlan {
  const planned = new Set(input.plannedKeys);
  const withActivation = new Set(input.activationLeverIds);
  const withTask = new Set(input.taskDeliverableIds);
  const retained = input.levers.filter(
    (l) => l.state === "selected" && l.review_status === "confirmed",
  );
  const retainedIds = new Set(retained.map((l) => l.id));
  const deliverables = input.deliverables.filter((d) =>
    retainedIds.has(d.lever_id),
  );

  const items: ExecutionItem[] = [];
  let existing = 0;
  for (const lever of retained) {
    const key = activationKey(lever.id);
    if (planned.has(key) || withActivation.has(lever.id)) {
      existing++;
      continue;
    }
    items.push({
      key,
      kind: "activation",
      leverId: lever.id,
      title: lever.label,
      activationKind: kindOfLever(lever.label),
    });
  }
  const unplanned: ExecutionPlan["unplanned"] = [];
  for (const d of deliverables) {
    const key = taskKey(d.id);
    if (planned.has(key) || withTask.has(d.id)) {
      existing++;
      continue;
    }
    if (!d.assignee_person_id || !d.due_date) {
      unplanned.push({ id: d.id, title: d.title });
      continue;
    }
    items.push({
      key,
      kind: "task",
      deliverableId: d.id,
      leverId: d.lever_id,
      title: d.title,
      assigneeId: d.assignee_person_id,
      dueDate: d.due_date,
    });
  }
  return { items, existing, unplanned, inConception: deliverables.length };
}
