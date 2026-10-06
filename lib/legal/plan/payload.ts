import type { PlanItem } from "@/lib/legal/plan/proposal";

// What launch_legal_plan and add_legal_plan_items store for an action,
// built on the server from the proposal: only the person's choices come
// from the browser.

export type PlanChoiceInput = {
  responsibleId: string | null;
  dueOn: string | null;
};

export function planItemPayload(
  item: PlanItem,
  keys: Set<string>,
  choice: PlanChoiceInput | undefined,
) {
  // An action left out of the plan no longer holds the others back.
  const dependsOn = item.dependsOn.filter((key) => keys.has(key));
  const freed = item.status === "blocked" && dependsOn.length === 0;
  return {
    key: item.key,
    kind: item.kind,
    master_id: item.masterId,
    label: item.label,
    detail: item.detail,
    why: item.why,
    subject: item.subject,
    credit_ids: item.creditIds,
    status: freed ? "action_now" : item.status,
    depends_on: dependsOn,
    responsible_person_id: choice?.responsibleId ?? null,
    due_on: choice?.dueOn ?? null,
  };
}
