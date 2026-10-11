import "server-only";

import type { DependencyKind } from "@/lib/activations/model";
import { createClient } from "@/lib/supabase/server";

export type DependencyOptions = Record<
  DependencyKind,
  { id: string; label: string }[]
>;

/** What an activation may depend on in its project, as this session sees it
 * (a contract the viewer cannot read is not offered). */
export async function loadDependencyOptions(
  projectId: string,
): Promise<DependencyOptions> {
  const supabase = await createClient();
  const [deliverables, contracts, clearances, tasks] = await Promise.all([
    supabase
      .from("strategy_deliverables")
      .select("id, title")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("contracts")
      .select("id, title")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("legal_clearances")
      .select("id, work")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("status", "todo")
      .order("due_date"),
  ]);
  return {
    deliverable: (deliverables.data ?? []).map((d) => ({
      id: d.id,
      label: d.title,
    })),
    contract: (contracts.data ?? []).map((c) => ({ id: c.id, label: c.title })),
    clearance: (clearances.data ?? []).map((c) => ({
      id: c.id,
      label: c.work,
    })),
    task: (tasks.data ?? []).map((t) => ({ id: t.id, label: t.title })),
  };
}
