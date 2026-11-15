import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { PlanColumn, PlanWorkflow } from "@/lib/plan/propose";

export type LaunchedItem = {
  id: string;
  column: PlanColumn;
  workflow: PlanWorkflow | null;
  title: string;
  why: string | null;
  ownerPersonId: string | null;
  ownerName: string | null;
  executorPersonId: string | null;
  executorName: string | null;
  dueDate: string | null;
  dependsOn: PlanWorkflow[];
  launchedAt: string | null;
  doneAt: string | null;
};

export type PlanEvent = {
  id: string;
  itemId: string | null;
  kind: string;
  detail: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
};

export type LaunchedPlan = {
  id: string;
  launchedAt: string;
  launchedByName: string | null;
  items: LaunchedItem[];
  events: PlanEvent[];
};

const nameOf = (
  person: { first_name: string; last_name: string | null } | null,
) => (person ? personName(person.first_name, person.last_name) : null);

/**
 * The project's plan row (one per project, null before « Lancer le plan »),
 * once per request: the navigation, the overview, the locks, the Cadrage
 * and the Distribution each asked for it (page loads audit,
 * docs/ARCHITECTURE.md § 3 bis). The launcher is a left-joined embed: a
 * person hidden by RLS reads as null, the plan row stays. Shared: callers
 * never change it.
 */
export const projectPlanRow = trackedCache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase
    .from("project_plans")
    .select(
      "id, launched_at, launcher:people!project_plans_launched_by_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .maybeSingle();
});

/** The plan of a project once launched, its steps in order and its history
 * (PROJ-UX-07), newest change first. */
export async function loadLaunchedPlan(
  projectId: string,
): Promise<LaunchedPlan | null> {
  const supabase = await createClient();
  const { data: plan } = await projectPlanRow(projectId);
  if (!plan) return null;
  const [{ data: items }, { data: events }] = await Promise.all([
    supabase
      .from("project_plan_items")
      .select(
        "id, column_key, workflow, title, why, launched_at, owner_person_id, executor_person_id, due_date, depends_on, done_at, owner:people!project_plan_items_owner_person_id_fkey(first_name, last_name), executor:people!project_plan_items_executor_person_id_fkey(first_name, last_name)",
      )
      .eq("plan_id", plan.id)
      .order("position"),
    supabase
      .from("project_plan_events")
      .select(
        "id, item_id, kind, detail, created_at, actor:people!project_plan_events_actor_person_id_fkey(first_name, last_name)",
      )
      .eq("plan_id", plan.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return {
    id: plan.id,
    launchedAt: plan.launched_at,
    launchedByName: nameOf(plan.launcher),
    items: (items ?? []).map((item) => ({
      id: item.id,
      column: item.column_key as PlanColumn,
      workflow: item.workflow as PlanWorkflow | null,
      title: item.title,
      why: item.why,
      ownerPersonId: item.owner_person_id,
      ownerName: nameOf(item.owner),
      executorPersonId: item.executor_person_id,
      executorName: nameOf(item.executor),
      dueDate: item.due_date,
      dependsOn: (item.depends_on ?? []) as PlanWorkflow[],
      launchedAt: item.launched_at,
      doneAt: item.done_at,
    })),
    events: (events ?? []).map((event) => ({
      id: event.id,
      itemId: event.item_id,
      kind: event.kind,
      detail:
        event.detail &&
        typeof event.detail === "object" &&
        !Array.isArray(event.detail)
          ? (event.detail as Record<string, unknown>)
          : {},
      actorName: nameOf(event.actor),
      createdAt: event.created_at,
    })),
  };
}

/**
 * When the project's plan was launched (« Lancer le plan »), null before:
 * the moment the four workflows start (proto « Projet complet »). Read once
 * per request: the navigation, the overview and the locks share it.
 */
export const planLaunchedAt = trackedCache(
  async (projectId: string): Promise<string | null> => {
    const { data, error } = await projectPlanRow(projectId);
    if (error) console.error("planLaunchedAt:", error.message);
    return data?.launched_at ?? null;
  },
);

/**
 * The workflows the project's plan holds (launched or waiting in Ensuite),
 * once per request: the navigation says why a workflow has not started
 * (left out of the plan, or waiting in it).
 */
export const planWorkflows = trackedCache(
  async (projectId: string): Promise<PlanWorkflow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_plan_items")
      .select("workflow")
      .eq("project_id", projectId)
      .not("workflow", "is", null);
    if (error) console.error("planWorkflows:", error.message);
    return (data ?? []).flatMap((row) =>
      row.workflow ? [row.workflow as PlanWorkflow] : [],
    );
  },
);

/**
 * The workflows that may be worked on: launched from the plan, or begun
 * before the plan existed (workflow_is_launched, SQL), all in one call and
 * once per request (page loads audit, docs/ARCHITECTURE.md § 3 bis).
 */
export const launchedWorkflows = trackedCache(
  async (projectId: string): Promise<ReadonlySet<string>> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("launched_workflows", {
      p_project_id: projectId,
    });
    if (error) console.error("launchedWorkflows:", error.message);
    return new Set(data ?? []);
  },
);

/** Whether a workflow may be worked on (see launchedWorkflows). */
export const isWorkflowLaunched = trackedCache(
  async (projectId: string, workflow: PlanWorkflow): Promise<boolean> =>
    (await launchedWorkflows(projectId)).has(workflow),
);

export type WorkflowGate = {
  framingValidated: boolean;
  // Placed in Ensuite by the launched plan: waiting for « Lancer maintenant ».
  waiting: boolean;
  // Left out of the launched plan: to add from it.
  absent: boolean;
};

/**
 * Null when the workflow may be worked on; otherwise what its lock says:
 * the Brief not validated yet, a plan that left it in Ensuite, or a plan
 * launched without it.
 */
export async function workflowGate(
  project: { id: string; stages: Array<{ key: string; state: string }> },
  workflow: PlanWorkflow,
): Promise<WorkflowGate | null> {
  const supabase = await createClient();
  const [launched, plan, item] = await Promise.all([
    isWorkflowLaunched(project.id, workflow),
    projectPlanRow(project.id),
    supabase
      .from("project_plan_items")
      .select("id")
      .eq("project_id", project.id)
      .eq("workflow", workflow)
      .maybeSingle(),
  ]);
  if (launched) return null;
  return {
    framingValidated: project.stages.some(
      (s) => s.key === "framing" && s.state === "validated",
    ),
    waiting: item.data !== null,
    absent: plan.data !== null && item.data === null,
  };
}

/**
 * Whether the Distribution still waits for « Lancer le plan » (proto
 * « Projet complet »): no plan launched and nothing recorded for the release
 * yet. A Distribution begun before the plan existed keeps going. A lock of
 * the journey, not of security: the tables' RLS is unchanged.
 */
export async function distributionLocked(projectId: string): Promise<boolean> {
  if (await planLaunchedAt(projectId)) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("releases")
    .select("id")
    .eq("project_id", projectId)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (error) console.error("distributionLocked:", error.message);
  return data === null;
}
