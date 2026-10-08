import "server-only";

import type { ProjectDetail } from "@/lib/projects/types";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Opens the Cadrage without a call and starts its stage (« Commencer le
 * cadrage », and PO's test data). Owner only: the database checks it. True
 * when the Cadrage is open.
 */
export async function openFraming(
  supabase: Supabase,
  project: ProjectDetail,
): Promise<boolean> {
  const { error } = await supabase.rpc("start_framing_without_call", {
    p_project_id: project.id,
  });
  if (error) {
    console.error("[framing] start_framing_without_call:", error.message);
    return false;
  }
  const stage = project.stages.find((s) => s.key === "framing");
  if (stage?.state === "not_started") {
    const started = await supabase.rpc("start_stage", { p_stage_id: stage.id });
    if (started.error)
      console.error("[framing] start_stage:", started.error.message);
  }
  return true;
}
