import "server-only";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { PlanColumn, PlanWorkflow } from "@/lib/plan/propose";

export type LaunchedItem = {
  id: string;
  column: PlanColumn;
  workflow: PlanWorkflow | null;
  title: string;
  why: string | null;
  ownerName: string | null;
  launchedAt: string | null;
};

export type LaunchedPlan = {
  id: string;
  launchedAt: string;
  launchedByName: string | null;
  items: LaunchedItem[];
};

/** The plan of a project once launched, with its items in order. */
export async function loadLaunchedPlan(
  projectId: string,
): Promise<LaunchedPlan | null> {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("project_plans")
    .select(
      "id, launched_at, launcher:people!project_plans_launched_by_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .maybeSingle();
  if (!plan) return null;
  const { data: items } = await supabase
    .from("project_plan_items")
    .select(
      "id, column_key, workflow, title, why, launched_at, owner:people!project_plan_items_owner_person_id_fkey(first_name, last_name)",
    )
    .eq("plan_id", plan.id)
    .order("position");
  return {
    id: plan.id,
    launchedAt: plan.launched_at,
    launchedByName: plan.launcher
      ? personName(plan.launcher.first_name, plan.launcher.last_name)
      : null,
    items: (items ?? []).map((item) => ({
      id: item.id,
      column: item.column_key as PlanColumn,
      workflow: item.workflow as PlanWorkflow | null,
      title: item.title,
      why: item.why,
      ownerName: item.owner
        ? personName(item.owner.first_name, item.owner.last_name)
        : null,
      launchedAt: item.launched_at,
    })),
  };
}

/**
 * Whether a workflow may be worked on: launched from the plan, or begun
 * before the plan existed (workflow_is_launched, SQL).
 */
export async function isWorkflowLaunched(
  projectId: string,
  workflow: "strategy" | "master" | "legal",
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workflow_is_launched", {
    p_project_id: projectId,
    p_workflow: workflow,
  });
  if (error) console.error("isWorkflowLaunched:", error.message);
  return data === true;
}

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
  workflow: "strategy" | "master" | "legal",
): Promise<WorkflowGate | null> {
  const supabase = await createClient();
  const [launched, plan, item] = await Promise.all([
    isWorkflowLaunched(project.id, workflow),
    supabase
      .from("project_plans")
      .select("id")
      .eq("project_id", project.id)
      .maybeSingle(),
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
