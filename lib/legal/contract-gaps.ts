import "server-only";

import { projectTitleLabel, titleGuestNames } from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { trackedCache } from "@/lib/projects/live-deps";
import { createClient } from "@/lib/supabase/server";
import type { WaiverScope } from "@/lib/projects/title-board-rules";

/** A confirmed participation not covered for a scope (lot 12): its artist
 * and its title's name in the project. */
export type ContractGap = {
  participationId: string;
  // Its title in the project (project_titles.id).
  titleId: string;
  artist: string;
  title: string;
  // The title has a name of its own (a working title or a named master):
  // else `title` only repeats its guests (« Titre de Jay (à nommer) »).
  named: boolean;
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
    if (!data?.length) return [];
    // A title still to be named is called by its guests (Ibé 18/11): the
    // title's, not only the gap's artist; one read for every title.
    // Unread titles: the labels fall back to their number, never a crash of
    // the page that shows the callout.
    const titles = await loadProjectTitles(projectId).catch((cause) => {
      console.error("loadContractGaps titles:", cause);
      return [];
    });
    const guests = new Map(
      titles.map((t) => [t.id, titleGuestNames(t.participations)]),
    );
    return data.map((row) => ({
      participationId: row.participation_id,
      titleId: row.title_id,
      artist: row.artist_name,
      named: Boolean(row.working_title || row.master_title),
      title: projectTitleLabel({
        position: row.title_position,
        workingTitle: row.working_title,
        masterTitle: row.master_title,
        artists: guests.get(row.title_id),
      }),
    }));
  },
);

/** « Nadia Benali (Titre 2 · Néons), Lou »: the title only when it has a
 * name (a title still to be named is its guests: nothing to add), each
 * entry once. */
export const gapNames = (gaps: ContractGap[]) =>
  [
    ...new Set(
      gaps.map((gap) =>
        gap.named ? `${gap.artist} (${gap.title})` : gap.artist,
      ),
    ),
  ].join(", ");
