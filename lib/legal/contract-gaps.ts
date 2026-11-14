import "server-only";

import { projectTitleLabel } from "@/lib/projects/title-rules";
import { trackedCache } from "@/lib/projects/live-deps";
import { createClient } from "@/lib/supabase/server";
import type { WaiverScope } from "@/lib/projects/title-board-rules";

/** A confirmed participation not covered for a scope (lot 12): its artist
 * and its title's name in the project. */
export type ContractGap = {
  participationId: string;
  artist: string;
  title: string;
};

/**
 * What blocks a collective's shoot or release (list_contract_gaps, the
 * locks' own rule): the confirmed participations of the titles concerned
 * (a deliverable's targets, else every title not abandoned) with neither
 * their contract signed nor an open waiver of the scope. Empty for any
 * other project. Names only, never a contact.
 */
export const loadContractGaps = trackedCache(
  async (
    projectId: string,
    scope: WaiverScope,
    deliverableId: string | null = null,
  ): Promise<ContractGap[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_contract_gaps", {
      p_project_id: projectId,
      p_scope: scope,
      ...(deliverableId ? { p_strategy_deliverable_id: deliverableId } : {}),
    });
    if (error) {
      console.error("loadContractGaps:", error.message);
      return [];
    }
    return (data ?? []).map((row) => ({
      participationId: row.participation_id,
      artist: row.artist_name,
      title: projectTitleLabel({
        position: row.title_position,
        workingTitle: row.working_title,
        masterTitle: row.master_title,
      }),
    }));
  },
);

/** « Nadia Benali (Titre 2 · Néons), Lou (Titre 3 · sans nom) ». */
export const gapNames = (gaps: ContractGap[]) =>
  gaps.map((gap) => `${gap.artist} (${gap.title})`).join(", ");
