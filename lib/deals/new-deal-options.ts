import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { deals } from "@/lib/i18n/fr/deals";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const t = deals.name;

/** What « Nouveau deal » chooses from, always among what exists (never a
 * name typed for a person): a participation of a collective, else a
 * project and/or an artist, and a member who negotiates. */
export type NewDealOptions = {
  participations: Record<string, string>;
  projects: Record<string, string>;
  artists: Record<string, string>;
  negotiators: Record<string, string>;
  // The direction may open a deal on an artist alone; a project manager
  // opens one on a project he runs.
  artistAlone: boolean;
};

/**
 * Read with the user's session (BIZ 4), for the direction and the project
 * managers: the participations still in play of the projects they may open
 * a deal on, without the ones that already have a live deal; the projects
 * not archived (all for the direction, their own for a project manager);
 * the artists; the negotiators (list_deal_negotiators). Null for anyone
 * else.
 */
export async function loadNewDealOptions(
  access: Access,
  openParticipations: Set<string>,
): Promise<NewDealOptions | null> {
  const director = can(access, "validate");
  if (!director && !can(access, "pilot_projects")) return null;
  const me = access.personId;
  const supabase = await createClient();
  const [projectsRes, partsRes, artistsRes, negotiatorsRes] = await Promise.all(
    [
      supabase
        .from("projects")
        .select("id, title, owner_person_id")
        .is("archived_at", null)
        .order("title"),
      supabase
        .from("title_participations")
        .select(
          "id, project_id, status, artist:artists!title_participations_artist_same_org(name), title:project_titles!title_participations_title(position, working_title, master_id)",
        )
        .in("status", ["proposed", "invited", "confirmed"]),
      supabase
        .from("artists")
        .select("id, name")
        .is("archived_at", null)
        .order("name"),
      supabase.rpc("list_deal_negotiators"),
    ],
  );
  const failed = [projectsRes, partsRes, artistsRes, negotiatorsRes].find(
    (r) => r.error,
  );
  if (failed) console.error("loadNewDealOptions:", failed.error?.message);

  const projects = (projectsRes.data ?? []).filter(
    (p) => director || (me !== null && p.owner_person_id === me),
  );
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));
  const parts = (partsRes.data ?? []).filter(
    (p) => projectTitle.has(p.project_id) && !openParticipations.has(p.id),
  );
  const masterIds = parts.flatMap((p) =>
    p.title?.master_id ? [p.title.master_id] : [],
  );
  const { data: masters } = masterIds.length
    ? await supabase.from("masters").select("id, title").in("id", masterIds)
    : { data: [] };
  const masterTitle = new Map((masters ?? []).map((m) => [m.id, m.title]));

  const label = (p: (typeof parts)[number]) => {
    const title =
      (p.title?.master_id && masterTitle.get(p.title.master_id)) ||
      p.title?.working_title ||
      (p.title ? t.title(p.title.position) : null);
    return [p.artist?.name, title, projectTitle.get(p.project_id)]
      .filter(Boolean)
      .join(" · ");
  };

  return {
    participations: Object.fromEntries(
      parts
        .map((p) => [p.id, label(p)] as const)
        .sort((a, b) => a[1].localeCompare(b[1], "fr")),
    ),
    projects: Object.fromEntries(projects.map((p) => [p.id, p.title])),
    artists: Object.fromEntries(
      (artistsRes.data ?? []).map((a) => [a.id, a.name]),
    ),
    negotiators: Object.fromEntries(
      (negotiatorsRes.data ?? []).map((n) => [
        n.person_id,
        personName(n.first_name, n.last_name),
      ]),
    ),
    artistAlone: director,
  };
}
