import "server-only";

import { loadParticipationDealStates } from "@/lib/deals/participation-states";
import {
  masterLabels,
  needsOf,
  pendingGuests,
  type PendingGuest,
  type TitleContractNeeds,
} from "@/lib/legal/title-contracts-rules";
import { trackedCache } from "@/lib/projects/live-deps";
import { loadProjectTitles } from "@/lib/projects/titles";
import { createClient } from "@/lib/supabase/server";

// What the Juridique of a collective reads about its titles' contracts and
// the accords still awaited (retours d'Ibé du 18/11/2026, § 3.4 and 3.5),
// with the viewer's session (RLS): read once per render. The rules are in
// title-contracts-rules.ts.

/** The project's titles and their guests, read once per render (the
 * Juridique's layout, its contracts and its titles' names share it). */
export const legalProjectTitles = trackedCache((projectId: string) =>
  loadProjectTitles(projectId),
);

/** What the Juridique confirmed for each title of the project (by project
 * title id); a title with no line is not confirmed yet. Read with
 * manage_legal only (RLS): empty for anyone else. */
export const loadTitleContractNeeds = trackedCache(
  async (projectId: string): Promise<Map<string, TitleContractNeeds>> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("title_contract_needs")
      .select("project_title_id, kind, needed")
      .eq("project_id", projectId);
    if (error) console.error("loadTitleContractNeeds:", error.message);
    const rowsOf = new Map<string, Array<{ kind: string; needed: boolean }>>();
    for (const row of data ?? [])
      rowsOf.set(row.project_title_id, [
        ...(rowsOf.get(row.project_title_id) ?? []),
        { kind: row.kind, needed: row.needed },
      ]);
    return new Map([...rowsOf].map(([id, rows]) => [id, needsOf(rows)]));
  },
);

/**
 * A collective's pages of the Juridique name each title as the project does
 * (Titre 3 (à nommer), Titre de Jay (à nommer)), not by its master's
 * provisional name: the project with its masters renamed that way, for what
 * reads them (inventory, confirmation, splits, SACEM, borrowings, history).
 * Any other project, and a failed read of the titles: as it is.
 */
export async function withProjectTitleNames<
  P extends {
    id: string;
    collective: boolean;
    masters: Array<{ id: string; title: string }>;
  },
>(project: P): Promise<P> {
  if (!project.collective) return project;
  try {
    const labels = masterLabels(await legalProjectTitles(project.id));
    return {
      ...project,
      masters: project.masters.map((m) => ({
        ...m,
        title: labels.get(m.id) ?? m.title,
      })),
    };
  } catch (error) {
    console.error("withProjectTitleNames:", error);
    return project;
  }
}

export type AwaitingAgreements = {
  // The guest artists whose accord is awaited, with their titles.
  guests: PendingGuest[];
  // The Réseau person representing such an artist
  // (network_contacts.artist_id) → the labels of the titles awaited.
  titlesByContact: Record<string, string[]>;
};

const NONE: AwaitingAgreements = { guests: [], titlesByContact: {} };

/**
 * The guest artists of a collective whose accord is not validated yet
 * (participation neither declined nor withdrawn, on a title not abandoned,
 * its deal's accord not validated: the rule of artist_agreement_pending,
 * computed here under RLS, nothing of it returned by the database), and the
 * person who represents each in the Juridique. Ids and labels only: no
 * contact is read beyond its id and artist link. A failed read is logged,
 * the database refusing the drafting anyway.
 */
export const loadAwaitingAgreements = trackedCache(
  async (projectId: string): Promise<AwaitingAgreements> => {
    let titles;
    try {
      titles = await legalProjectTitles(projectId);
    } catch (error) {
      console.error("loadAwaitingAgreements titles:", error);
      return NONE;
    }
    const states = await loadParticipationDealStates(projectId);
    const guests = pendingGuests(
      titles,
      (id) => states.get(id)?.agreementValidated ?? false,
    );
    if (guests.length === 0) return NONE;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("network_contacts")
      .select("id, artist_id")
      .in(
        "artist_id",
        guests.map((guest) => guest.artistId),
      );
    if (error) console.error("loadAwaitingAgreements contacts:", error.message);
    const titlesByContact: Record<string, string[]> = {};
    for (const row of data ?? []) {
      const guest = guests.find((g) => g.artistId === row.artist_id);
      if (guest)
        titlesByContact[row.id] = guest.titles.map((title) => title.label);
    }
    return { guests, titlesByContact };
  },
);
