import "server-only";

import { createClient } from "@/lib/supabase/server";

/** A director proposed by the company on its link (proto directorBlock). */
export type DirectorProposal = {
  id: string;
  name: string;
  reelUrl: string;
  note: string | null;
  proposedAt: string;
  status: "proposed" | "retained" | "declined";
};

/** The proposals of a sheet, oldest first, read with the user's session. */
export async function loadDirectorProposals(
  sheetId: string,
): Promise<DirectorProposal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_director_proposals")
    .select("id, name, reel_url, note, proposed_at, status")
    .eq("sheet_id", sheetId)
    .order("proposed_at");
  if (error) console.error("loadDirectorProposals:", error.message);
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    reelUrl: d.reel_url,
    note: d.note,
    proposedAt: d.proposed_at,
    status:
      d.status === "retained" || d.status === "declined"
        ? d.status
        : "proposed",
  }));
}
