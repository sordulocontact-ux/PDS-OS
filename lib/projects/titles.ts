import "server-only";

import { demoStatusOf } from "@/lib/catalog/demo-rules";
import {
  participationRoleOf,
  participationStatusOf,
  sortParticipations,
} from "@/lib/projects/participation-rules";
import {
  projectTitleStatusOf,
  sortProjectTitles,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { createClient } from "@/lib/supabase/server";

// The master through the project's link (project_titles_link): a title's
// master is always one the project links. Its credits, and the title's
// participations with their artist (lot 3); never the interlocutor
// (contact_id), which no screen of this list shows.
const TITLES_SELECT =
  "id, position, working_title, status, abandoned_at, abandon_reason, link:project_masters!project_titles_link(master:masters!project_masters_master_same_org(id, title, demo_status, credits:master_artists!master_artists_master_same_org(role, position, artist:artists!master_artists_artist_same_org(id, name)))), participations:title_participations!title_participations_title(id, role, status, created_at, artist:artists!title_participations_artist_same_org(id, name))";

/**
 * The titles of a collective project (docs/pds-mic-plan.md, lots 2 and 3),
 * read with the viewer's session (RLS: whoever sees the project), with
 * their artists' participations and, for a title whose master a simple
 * project shares, that project (project_title_shared_projects). Active and planned first, abandoned
 * after. Empty for any other project: it has none.
 */
export async function loadProjectTitles(
  projectId: string,
): Promise<ProjectTitle[]> {
  const supabase = await createClient();
  const [{ data, error }, shared] = await Promise.all([
    supabase
      .from("project_titles")
      .select(TITLES_SELECT)
      .eq("project_id", projectId)
      .order("position"),
    supabase.rpc("project_title_shared_projects", { p_project_id: projectId }),
  ]);
  // A failed read is not « no title »: thrown to the error page.
  if (error) throw new Error(`loadProjectTitles: ${error.message}`);
  // Nor « shared with nothing », which would hide the warning.
  if (shared.error)
    throw new Error(`loadProjectTitles shared: ${shared.error.message}`);
  const sharedWith = new Map<string, { names: string[]; hidden: number }>();
  for (const row of shared.data ?? []) {
    const entry = sharedWith.get(row.title_id) ?? { names: [], hidden: 0 };
    // The name only of a project the viewer sees (null otherwise).
    const name = row.other_project_title as string | null;
    if (name) entry.names.push(name);
    else entry.hidden += 1;
    sharedWith.set(row.title_id, entry);
  }
  return sortProjectTitles(
    data.map((row) => {
      const master = row.link?.master ?? null;
      return {
        id: row.id,
        position: row.position,
        workingTitle: row.working_title,
        status: projectTitleStatusOf(row.status),
        master: master
          ? {
              id: master.id,
              title: master.title,
              demoStatus: demoStatusOf(master.demo_status),
              credits: [...master.credits]
                .sort((a, b) => a.position - b.position)
                .flatMap((credit) =>
                  credit.artist
                    ? [
                        {
                          artist: credit.artist,
                          role: participationRoleOf(credit.role),
                        },
                      ]
                    : [],
                ),
            }
          : null,
        abandonedAt: row.abandoned_at,
        abandonReason: row.abandon_reason,
        participations: sortParticipations(
          row.participations.flatMap((p) =>
            p.artist
              ? [
                  {
                    id: p.id,
                    artist: p.artist,
                    role: participationRoleOf(p.role),
                    status: participationStatusOf(p.status),
                    createdAt: p.created_at,
                  },
                ]
              : [],
          ),
        ),
        sharedWith: sharedWith.get(row.id) ?? null,
      };
    }),
  );
}
