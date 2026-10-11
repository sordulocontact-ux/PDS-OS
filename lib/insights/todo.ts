import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { versionStatusOf } from "@/lib/design/rules";
import { legalTaskInfo } from "@/lib/legal/tasks";
import { taskHref } from "@/lib/project-work/task-href";
import { progressLabel } from "@/lib/projects/progress";
import { createClient } from "@/lib/supabase/server";

export type TodoTask = {
  id: string;
  // A deliverable assigned to the person is on their plate as any task
  // (UX test of 09/10/2026: « Mes tâches : aucune » next to 2 deliverables).
  kind: "task" | "deliverable";
  title: string;
  // Null only for a task of the Juridique's plan without a date.
  dueDate: string | null;
  overdue: boolean;
  projectId: string;
  projectTitle: string;
  href: string;
};
export type TodoValidation = {
  id: string;
  projectId: string;
  projectTitle: string;
  stageLabel: string;
  requestedAt: string;
  href: string;
};
export type TodoProposals = {
  projectId: string;
  projectTitle: string;
  count: number;
  href: string;
};
export type Todo = {
  today: string;
  tasks: TodoTask[];
  // Assigned deliverables still to design (no version, or changes asked).
  deliverables: TodoTask[];
  validations: TodoValidation[];
  proposals: TodoProposals[];
  // A query failed: the lists may be incomplete, never shown as « nothing ».
  error: boolean;
};

/**
 * What waits for the signed-in person, computed by code (overdue included).
 * Shared by the home cards and the assistant's `my_todo` function.
 */
export async function loadMyTodo(access: Access): Promise<Todo> {
  const supabase = await createClient();
  const today = todayInParis();
  const me = access.personId ?? "";

  const [
    tasksRes,
    validationsRes,
    fieldsRes,
    needsRes,
    teamRes,
    projectsRes,
    deliverablesRes,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, due_date, project_id, legal_plan_item_id, master_question_id, deliverable_id, activation_id",
      )
      .eq("assignee_person_id", me)
      .eq("status", "todo")
      .order("due_date"),
    supabase
      .from("validations")
      .select(
        "id, requested_at, project_stage_id, project_stages!inner(project_id, stage_definitions!inner(key))",
      )
      .eq("validator_person_id", me)
      .eq("state", "pending"),
    supabase
      .from("current_field_values")
      .select("project_id")
      .eq("status", "proposed"),
    supabase.from("needs").select("project_id").eq("review_status", "proposed"),
    supabase
      .from("project_team_members")
      .select("project_id")
      .eq("review_status", "proposed"),
    supabase
      .from("projects")
      .select("id, title, owner_person_id")
      .is("archived_at", null),
    supabase
      .from("strategy_deliverables")
      .select(
        "id, title, due_date, project_id, design_versions(number, status)",
      )
      .eq("assignee_person_id", me),
  ]);

  const failed = [
    tasksRes,
    validationsRes,
    fieldsRes,
    needsRes,
    teamRes,
    projectsRes,
    deliverablesRes,
  ].find((res) => res.error);
  if (failed) console.error("loadMyTodo:", failed.error?.message);
  const titles = new Map((projectsRes.data ?? []).map((p) => [p.id, p.title]));
  const titleOf = (id: string) => titles.get(id) ?? "—";
  // Only the owner writes in a launched project, so only they review PO's
  // proposals (UX test of 09/10/2026: a creative director saw them).
  const owned = new Set(
    (projectsRes.data ?? [])
      .filter((p) => p.owner_person_id === me)
      .map((p) => p.id),
  );

  // What waits for another action is not to do yet: left out here, shown
  // « en attente » in the project's Travail.
  const legal = await legalTaskInfo(supabase, tasksRes.data ?? []);
  const tasks = (tasksRes.data ?? []).flatMap((t) => {
    const fromPlan = legal.get(t.id);
    if (fromPlan?.waitingOn) return [];
    return [
      {
        id: t.id,
        kind: "task" as const,
        title: t.title,
        dueDate: t.due_date,
        overdue: t.due_date !== null && isOverdue(t.due_date, today),
        projectId: t.project_id,
        projectTitle: titleOf(t.project_id),
        href: taskHref(t, fromPlan?.href) ?? routes.projectWork(t.project_id),
      },
    ];
  });
  tasks.sort(byUrgency);

  // Done once its latest version is approved; waiting on the owner while
  // submitted. Left: nothing deposited yet, or changes asked.
  const deliverables = (deliverablesRes.data ?? []).flatMap((d) => {
    const latest = [...d.design_versions].sort(
      (a, b) => b.number - a.number,
    )[0];
    const state = latest ? versionStatusOf(latest.status) : null;
    if (state === "approved" || state === "submitted") return [];
    return [
      {
        id: d.id,
        kind: "deliverable" as const,
        title: d.title,
        dueDate: d.due_date,
        overdue: d.due_date !== null && isOverdue(d.due_date, today),
        projectId: d.project_id,
        projectTitle: titleOf(d.project_id),
        href: routes.projectDesignDeliverable(d.project_id, d.id),
      },
    ];
  });
  deliverables.sort(byUrgency);

  const validations = (validationsRes.data ?? []).map((v) => {
    const projectId = v.project_stages.project_id;
    return {
      id: v.id,
      projectId,
      projectTitle: titleOf(projectId),
      // In the words of the workflows (UX test of 09/10/2026).
      stageLabel: progressLabel({
        key: v.project_stages.stage_definitions.key,
        state: "in_progress",
      }),
      requestedAt: v.requested_at,
      href: routes.projectFraming(projectId),
    };
  });

  const counts = new Map<string, number>();
  for (const row of [
    ...(fieldsRes.data ?? []),
    ...(needsRes.data ?? []),
    ...(teamRes.data ?? []),
  ]) {
    if (row.project_id && owned.has(row.project_id))
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  const proposals = [...counts].map(([projectId, count]) => ({
    projectId,
    projectTitle: titleOf(projectId),
    count,
    href: routes.projectFraming(projectId),
  }));

  return {
    today,
    tasks,
    deliverables,
    validations,
    proposals,
    error: Boolean(failed),
  };
}

// Overdue first, then by due date (undated last).
export function byUrgency(a: TodoTask, b: TodoTask): number {
  return (
    Number(b.overdue) - Number(a.overdue) ||
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
  );
}

/** Tasks and deliverables together: everything on the person's plate. */
export function plateOf(todo: Todo): TodoTask[] {
  return [...todo.tasks, ...todo.deliverables].sort(byUrgency);
}
