import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { projectTitleLabel, titleGuestNames } from "@/lib/projects/title-rules";
import { createClient } from "@/lib/supabase/server";

export type LinkableProject = {
  id: string;
  title: string;
  format: string | null;
  // A collective takes the title as one of its titles (add_project_title),
  // a new one or one of those not in the Catalogue yet (lot 7).
  collective: boolean;
  // Its titles without a master, not abandoned: id → « Titre 2 · sans nom ».
  waitingTitles: Array<{ id: string; label: string }>;
};

/**
 * The projects a title can join from its page (retours Catalogue 16, 64):
 * musical, live, not launched yet (the title list of a launched project no
 * longer changes), not already carrying it, and not a single that already
 * has its title, for who creates projects. Projet collectif, lot 7: also
 * the collectives, launched or not, of any type, whose titles the viewer
 * writes (its owner once launched, who creates projects before). RLS keeps
 * the ones the viewer sees; link_master_to_project and add_project_title
 * check it all again.
 */
export async function listLinkableProjects(
  masterId: string,
  access: Access,
): Promise<LinkableProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, title, type, music_format, collective, owner_person_id, links:project_masters!project_masters_project_same_org(master_id), stages:project_stages(id), titles:project_titles!project_titles_project_same_org(id, position, working_title, master_id, status, participations:title_participations!title_participations_title(status, created_at, artist:artists!title_participations_artist_same_org(name)))",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listLinkableProjects:", error.message);
    return [];
  }
  const creates = can(access, "create_projects");
  return (data ?? [])
    .filter((p) => {
      if (p.links.some((l) => l.master_id === masterId)) return false;
      if (p.music_format === "single" && p.links.length > 0) return false;
      const launched = p.stages.length > 0;
      if (p.collective)
        return launched
          ? p.owner_person_id !== null && p.owner_person_id === access.personId
          : creates;
      return creates && p.type === "music_release" && !launched;
    })
    .map((p) => ({
      id: p.id,
      title: p.title,
      format: p.music_format,
      collective: p.collective,
      waitingTitles: p.collective
        ? [...p.titles]
            .filter((t) => t.master_id === null && t.status !== "abandoned")
            .sort((a, b) => a.position - b.position)
            .map((t) => ({
              id: t.id,
              label: projectTitleLabel({
                position: t.position,
                workingTitle: t.working_title,
                masterTitle: null,
                artists: titleGuestNames(
                  [...t.participations]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .flatMap((p) =>
                      p.artist ? [{ status: p.status, artist: p.artist }] : [],
                    ),
                ),
              }),
            }))
        : [],
    }));
}
