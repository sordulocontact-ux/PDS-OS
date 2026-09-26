import "server-only";

import type { Provenance } from "@/lib/framing/brief";
import { provenanceLookup } from "@/lib/framing/provenance";
import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

export type ExternalMember = {
  id: string;
  name: string;
  role: string | null;
  provenance: Provenance | null;
};

/**
 * People named in a call or added on the Cadrage, confirmed only (a PO
 * proposal is reviewed on the Cadrage first), with where each comes from.
 */
export async function loadExternalTeam(
  projectId: string,
  members: Member[],
): Promise<ExternalMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_team_members")
    .select(
      "id, display_name, role, source_type, source_report_item_id, source_quote, source_start_seconds, created_by",
    )
    .eq("project_id", projectId)
    .eq("review_status", "confirmed")
    .order("created_at");
  if (error) {
    console.error("loadExternalTeam:", error.message);
    return [];
  }
  const rows = data ?? [];
  const provenanceOf = await provenanceLookup(rows, members);
  return rows.map((row) => ({
    id: row.id,
    name: row.display_name,
    role: row.role,
    provenance: provenanceOf(row),
  }));
}
