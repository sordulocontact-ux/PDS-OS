import "server-only";

import { demoStatusOf } from "@/lib/catalog/demo-rules";
import {
  projectTitleStatusOf,
  sortProjectTitles,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { createClient } from "@/lib/supabase/server";

// The master through the project's link (project_titles_link): a title's
// master is always one the project links.
const TITLES_SELECT =
  "id, position, working_title, status, abandoned_at, abandon_reason, link:project_masters!project_titles_link(master:masters!project_masters_master_same_org(id, title, demo_status))";

/**
 * The titles of a collective project (docs/pds-mic-plan.md, lot 2), read
 * with the viewer's session (RLS: whoever sees the project). Active and
 * planned first, abandoned after. Empty for any other project: it has none.
 */
export async function loadProjectTitles(
  projectId: string,
): Promise<ProjectTitle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_titles")
    .select(TITLES_SELECT)
    .eq("project_id", projectId)
    .order("position");
  // A failed read is not « no title »: thrown to the error page.
  if (error) throw new Error(`loadProjectTitles: ${error.message}`);
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
            }
          : null,
        abandonedAt: row.abandoned_at,
        abandonReason: row.abandon_reason,
      };
    }),
  );
}
