import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
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
  // A stage's validation (the direction), or a Strategy document's review
  // (whoever was named: the director, the project's creative directors).
  source: "stage" | "document";
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
    reviewsRes,
  ] = await Promise.all([
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
        "id, requested_at, project_stage_id, project_stages!inner(project_id, stage_definitions!inner(key, label))",
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
    supabase.from("projects").select("id, title").is("archived_at", null),
    supabase
      .from("strategy_document_reviews")
      .select(
        "id, strategy_documents!inner(id, kind, project_id, state, sent_at, validation_id)",
      )
      .eq("person_id", me)
      .eq("state", "pending")
      .eq("strategy_documents.state", "sent"),
  ]);

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

  const stageValidations: TodoValidation[] = (validationsRes.data ?? []).map(
    (v) => {
      const projectId = v.project_stages.project_id;
      const key = v.project_stages.stage_definitions.key;
      return {
        id: v.id,
        projectId,
        projectTitle: titleOf(projectId),
        stageLabel: v.project_stages.stage_definitions.label,
        requestedAt: v.requested_at,
        href:
          key === "launch_strategy"
            ? routes.projectStrategyBrief(projectId)
            : key === "framing"
              ? routes.projectFramingBrief(projectId)
              : routes.projectFraming(projectId),
        source: "stage",
      };
    },
  );
  // A Brief de sortie the director validates through its stage is listed
  // once, as the stage's validation.
  const stageIds = new Set(stageValidations.map((v) => v.id));
  const documentReviews: TodoValidation[] = (reviewsRes.data ?? []).flatMap(
    (r) => {
      const d = r.strategy_documents;
      if (d.validation_id && stageIds.has(d.validation_id)) return [];
      const kind = d.kind as keyof typeof fr.strategyDocs.kinds;
      return [
        {
          id: r.id,
          projectId: d.project_id,
          projectTitle: titleOf(d.project_id),
          stageLabel: fr.strategyDocs.kinds[kind] ?? d.kind,
          requestedAt: d.sent_at ?? "",
          href: routes.projectStrategyDocument(d.project_id, d.kind, d.id),
          source: "document",
        },
      ];
    },
  );
  const validations = [...stageValidations, ...documentReviews];

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

  return { today, tasks, validations, proposals };
}
