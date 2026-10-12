import "server-only";

import { createClient } from "@/lib/supabase/server";

export type LinkableProject = {
  id: string;
  title: string;
  format: string | null;
};

/**
 * The projects a title can join from its page (retours Catalogue 16, 64):
 * musical, live, not launched yet (the title list of a launched project no
 * longer changes), not already carrying it, and not a single that already
 * has its title. RLS keeps the ones the viewer sees; link_master_to_project
 * checks it all again.
 */
export async function listLinkableProjects(
  masterId: string,
): Promise<LinkableProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, title, music_format, links:project_masters!project_masters_project_same_org(master_id), stages:project_stages(id)",
    )
    .eq("type", "music_release")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listLinkableProjects:", error.message);
    return [];
  }
  return (data ?? [])
    .filter(
      (p) =>
        p.stages.length === 0 &&
        !p.links.some((l) => l.master_id === masterId) &&
        !(p.music_format === "single" && p.links.length > 0),
    )
    .map((p) => ({ id: p.id, title: p.title, format: p.music_format }));
}
