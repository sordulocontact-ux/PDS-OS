import "server-only";

import { projectTitleLabel } from "@/lib/projects/title-rules";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The titles where an artist takes part in a collective (a participation
 * neither declined nor withdrawn, the rule of set_project_main_artist), in
 * their order, named as the project names them (« Titre 4 · sans nom »):
 * what the refusal « main_artist_is_guest » names (lot 5 of
 * docs/pds-mic-plan.md). Read under RLS; none read: the message says it in
 * general.
 */
export async function guestTitles(
  supabase: Supabase,
  projectId: string,
  artistId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("title_participations")
    .select(
      "title:project_titles!title_participations_title(position, working_title, link:project_masters!project_titles_link(master:masters!project_masters_master_same_org(title, title_is_provisional)))",
    )
    .eq("project_id", projectId)
    .eq("artist_id", artistId)
    .not("status", "in", "(declined,withdrawn)");
  if (error) {
    console.error("guestTitles:", error.message);
    return [];
  }
  return (data ?? [])
    .flatMap((row) => (row.title ? [row.title] : []))
    .sort((a, b) => a.position - b.position)
    .map((title) =>
      projectTitleLabel({
        position: title.position,
        workingTitle: title.working_title,
        // A provisional name is not the title's (lot 7).
        masterTitle: title.link?.master?.title_is_provisional
          ? null
          : (title.link?.master?.title ?? null),
      }),
    );
}
