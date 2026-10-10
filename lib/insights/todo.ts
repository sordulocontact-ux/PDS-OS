import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { legalTaskInfo } from "@/lib/legal/tasks";
import { questionTaskHref } from "@/lib/master-workflow/question-types";
import { createClient } from "@/lib/supabase/server";

export type TodoTask = {
  id: string;
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

  const [tasksRes, validationsRes, fieldsRes, needsRes, teamRes, projectsRes] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, due_date, project_id, legal_plan_item_id, master_question_id",
        )
        .eq("assignee_person_id", me)
        .eq("status", "todo")
        .order("due_date"),
      supabase
        .from("validations")
        .select(
          "id, requested_at, project_stage_id, project_stages!inner(project_id, stage_definitions!inner(label))",
        )
        .eq("validator_person_id", me)
        .eq("state", "pending"),
      supabase
        .from("current_field_values")
        .select("project_id")
        .eq("status", "proposed"),
      supabase
        .from("needs")
        .select("project_id")
        .eq("review_status", "proposed"),
      supabase
        .from("project_team_members")
        .select("project_id")
        .eq("review_status", "proposed"),
      supabase.from("projects").select("id, title").is("archived_at", null),
    ]);

  const failed = [
    tasksRes,
    validationsRes,
    fieldsRes,
    needsRes,
    teamRes,
    projectsRes,
  ].find((res) => res.error);
  if (failed) console.error("loadMyTodo:", failed.error?.message);
  const titles = new Map((projectsRes.data ?? []).map((p) => [p.id, p.title]));
  const titleOf = (id: string) => titles.get(id) ?? "—";

  // What waits for another action is not to do yet: left out here, shown
  // « en attente » in the project's Travail.
  const legal = await legalTaskInfo(supabase, tasksRes.data ?? []);
  const tasks = (tasksRes.data ?? []).flatMap((t) => {
    const fromPlan = legal.get(t.id);
    if (fromPlan?.waitingOn) return [];
    return [
      {
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        overdue: t.due_date !== null && isOverdue(t.due_date, today),
        projectId: t.project_id,
        projectTitle: titleOf(t.project_id),
        href:
          fromPlan?.href ??
          (t.master_question_id
            ? questionTaskHref(t.project_id)
            : routes.projectFraming(t.project_id)),
      },
    ];
  });
  // Overdue first, then by due date (undated last).
  tasks.sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  );

  const validations = (validationsRes.data ?? []).map((v) => {
    const projectId = v.project_stages.project_id;
    return {
      id: v.id,
      projectId,
      projectTitle: titleOf(projectId),
      stageLabel: v.project_stages.stage_definitions.label,
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
    if (row.project_id)
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  const proposals = [...counts].map(([projectId, count]) => ({
    projectId,
    projectTitle: titleOf(projectId),
    count,
    href: routes.projectFraming(projectId),
  }));

  return { today, tasks, validations, proposals, error: Boolean(failed) };
}
