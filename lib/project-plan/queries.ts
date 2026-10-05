import "server-only";

import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { personName } from "@/lib/projects/types";
import { referenceDate } from "@/lib/strategy/calendar";
import { createClient } from "@/lib/supabase/server";

export type LeverFamily =
  | "creation_content"
  | "promotion_distribution"
  | "experiences_activations"
  | "other";
export const LEVER_FAMILIES: readonly LeverFamily[] = [
  "creation_content",
  "promotion_distribution",
  "experiences_activations",
  "other",
];

export type LeverState = "selected" | "to_decide" | "rejected";

// Computed by code from the assignee and the due date, never stored.
export type DeliverableState = "overdue" | "to_staff" | "planned";

export type PlanDeliverable = {
  id: string;
  title: string;
  leverId: string;
  leverLabel: string;
  family: LeverFamily | null;
  assigneeName: string | null;
  dueDate: string | null;
  state: DeliverableState;
};

export type PlanLever = {
  id: string;
  label: string;
  family: LeverFamily;
  state: LeverState;
  needLabel: string | null;
  deliverables: PlanDeliverable[];
};

export type PlanTask = {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
};

export type PlanMilestone = {
  id: string;
  title: string;
  occursOn: string;
  kind: string;
};

export type PlanCall = {
  id: string;
  title: string;
  // Paris day of the call, for the planning; the time is formatted on screen.
  date: string;
  occurredAt: string;
};

export type ProjectPlan = {
  today: string;
  referenceDate: string | null;
  plannedReleaseDate: string | null;
  projectDueDate: string | null;
  levers: PlanLever[];
  deliverables: PlanDeliverable[];
  milestones: PlanMilestone[];
  tasks: PlanTask[];
  calls: PlanCall[];
};

const isFamily = (value: string): value is LeverFamily =>
  (LEVER_FAMILIES as readonly string[]).includes(value);
const leverStateOf = (value: string): LeverState =>
  value === "selected" || value === "rejected" ? value : "to_decide";

export function deliverableStateOf(
  assigneeId: string | null,
  dueDate: string | null,
  today: string,
): DeliverableState {
  if (dueDate && isOverdue(dueDate, today)) return "overdue";
  return assigneeId && dueDate ? "planned" : "to_staff";
}

/**
 * The strategy's committed plan of a project (levers, deliverables, dated
 * items), read with the user's session (RLS). Shared by Livrables,
 * Activations and Planning; every state and date is computed here.
 */
export async function loadProjectPlan(projectId: string): Promise<ProjectPlan> {
  const supabase = await createClient();
  const today = todayInParis();

  const [
    projectRes,
    leversRes,
    needsRes,
    deliverablesRes,
    milestonesRes,
    tasksRes,
    releaseRes,
    peopleRes,
    callsRes,
  ] = await Promise.all([
    supabase.from("projects").select("due_date").eq("id", projectId).single(),
    supabase
      .from("levers")
      .select("id, label, family, state, need_id")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .order("created_at"),
    supabase.from("needs").select("id, label").eq("project_id", projectId),
    supabase
      .from("strategy_deliverables")
      .select("id, title, lever_id, assignee_person_id, due_date")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("milestones")
      .select("id, title, occurs_on, kind")
      .eq("project_id", projectId)
      .order("occurs_on"),
    supabase
      .from("tasks")
      .select("id, title, due_date, status")
      .eq("project_id", projectId)
      .order("due_date"),
    supabase
      .from("releases")
      .select("planned_release_date")
      .eq("project_id", projectId)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("people").select("id, first_name, last_name"),
    supabase
      .from("calls")
      .select("id, title, occurred_at")
      .eq("project_id", projectId)
      .order("occurred_at"),
  ]);

  const names = new Map(
    (peopleRes.data ?? []).map((p) => [
      p.id,
      personName(p.first_name, p.last_name),
    ]),
  );
  const needs = new Map((needsRes.data ?? []).map((n) => [n.id, n.label]));
  const leverRows = leversRes.data ?? [];
  const leverById = new Map(leverRows.map((l) => [l.id, l]));

  const deliverables: PlanDeliverable[] = (deliverablesRes.data ?? []).map(
    (d) => {
      const lever = leverById.get(d.lever_id);
      return {
        id: d.id,
        title: d.title,
        leverId: d.lever_id,
        leverLabel: lever?.label ?? "—",
        family: lever && isFamily(lever.family) ? lever.family : null,
        assigneeName: d.assignee_person_id
          ? (names.get(d.assignee_person_id) ?? null)
          : null,
        dueDate: d.due_date,
        state: deliverableStateOf(d.assignee_person_id, d.due_date, today),
      };
    },
  );

  const stateOrder: Record<LeverState, number> = {
    selected: 0,
    to_decide: 1,
    rejected: 2,
  };
  const levers: PlanLever[] = leverRows
    .filter((l) => isFamily(l.family))
    .map((l) => ({
      id: l.id,
      label: l.label,
      family: l.family as LeverFamily,
      state: leverStateOf(l.state),
      needLabel: l.need_id ? (needs.get(l.need_id) ?? null) : null,
      deliverables: deliverables.filter((d) => d.leverId === l.id),
    }))
    // Selected first; the sort is stable, so creation order stays inside.
    .sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);

  const plannedReleaseDate = releaseRes.data?.planned_release_date ?? null;
  const projectDueDate = projectRes.data?.due_date ?? null;

  return {
    today,
    referenceDate: referenceDate(plannedReleaseDate, projectDueDate),
    plannedReleaseDate,
    projectDueDate,
    levers,
    deliverables,
    milestones: (milestonesRes.data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      kind: m.kind,
    })),
    tasks: (tasksRes.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.due_date,
      done: t.status === "done",
    })),
    calls: (callsRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      date: todayInParis(new Date(c.occurred_at)),
      occurredAt: c.occurred_at,
    })),
  };
}
