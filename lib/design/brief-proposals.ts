import "server-only";

import { createClient } from "@/lib/supabase/server";

// The creative proposal each deliverable retained (MKT-C2-10): its latest
// approved concept, and how many proposals its history holds — the Brief
// créatif states the one retained, the work page keeps the others.

export type RetainedProposal = {
  number: number;
  approvedOn: string | null;
  total: number;
};

/** By strategy_deliverables id. */
export async function loadRetainedProposals(
  projectId: string,
): Promise<Map<string, RetainedProposal>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_versions")
    .select("deliverable_id, number, status, reviewed_at")
    .eq("project_id", projectId)
    .not("deliverable_id", "is", null)
    .order("number", { ascending: false });
  const out = new Map<string, RetainedProposal>();
  for (const v of data ?? []) {
    const key = v.deliverable_id!;
    const total = (data ?? []).filter((x) => x.deliverable_id === key).length;
    if (v.status === "approved" && !out.has(key))
      out.set(key, {
        number: v.number,
        approvedOn: v.reviewed_at?.slice(0, 10) ?? null,
        total,
      });
  }
  return out;
}
