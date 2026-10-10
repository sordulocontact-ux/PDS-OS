import "server-only";

import { createClient } from "@/lib/supabase/server";

export type FramingDefaults = {
  masterFinalDue: string | null;
};

/**
 * What the Cadrage intelligent confirmed for the Master's calendar
 * (docs/ARCHITECTURE.md § 6 and § 8 septies): the master final's date (an
 * imposed deadline). The Brief Mix/Master starts from it before its first
 * save. Who mixes and who masters is read with the État du master
 * (`readMasterRows`, `framingEngineers`), so both pages say the same.
 */
export async function loadFramingDefaults(
  projectId: string,
): Promise<FramingDefaults> {
  const supabase = await createClient();
  const deadline = await supabase
    .from("framing_deadlines")
    .select("due_date")
    .eq("project_id", projectId)
    .eq("kind", "master_final")
    .eq("review_status", "confirmed")
    .order("due_date")
    .limit(1)
    .maybeSingle();
  return { masterFinalDue: deadline.data?.due_date ?? null };
}
