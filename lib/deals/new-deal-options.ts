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
  // Each project's artist, filled in when the project is chosen (Sacha
  // 23/11/2026).
  projectArtists: Record<string, string>;
  artists: Record<string, string>;
  negotiators: Record<string, string>;
  // The direction may open a deal on an artist alone; a project manager
  // opens one on a project he runs.
  artistAlone: boolean;
  // The business manager (open_deals, Ibé 12/11/2026): an artist's deal,
  // his own — no project, nobody else to give it to.
  own: boolean;
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
  const own =
    !director && !can(access, "pilot_projects") && can(access, "open_deals");
  if (!director && !can(access, "pilot_projects") && !own) return null;
  const me = access.personId;
  const supabase = await createClient();
  const [projectsRes, partsRes, artistsRes, negotiatorsRes] = await Promise.all(
    [
      supabase
        .from("projects")
        .select("id, title, owner_person_id, collective, artist_id")
        .is("archived_at", null)
        .order("title"),
      supabase
        .from("title_participations")
        .select(
          "id, project_id, status, artist:artists!title_participations_artist_same_org(name), title:project_titles!title_participations_title(position, working_title, master_id, status)",
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
    (p) =>
      projectTitle.has(p.project_id) &&
      !openParticipations.has(p.id) &&
      // A title abandoned takes its participations out of play (Maël).
      p.title?.status !== "abandoned",
  );
  const masterIds = parts.flatMap((p) =>
    p.title?.master_id ? [p.title.master_id] : [],
  );
  const solo = projects.filter((p) => !p.collective).map((p) => p.id);
  const [{ data: masters }, { data: projectMasters }] = await Promise.all([
    masterIds.length
      ? supabase.from("masters").select("id, title").in("id", masterIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    solo.length
      ? supabase
          .from("project_masters")
          .select("project_id, master_id, position")
          .in("project_id", solo)
          .order("position")
      : Promise.resolve({
          data: [] as { project_id: string; master_id: string }[],
        }),
  ]);
  const firstMaster = new Map<string, string>();
  for (const pm of projectMasters ?? [])
    if (!firstMaster.has(pm.project_id))
      firstMaster.set(pm.project_id, pm.master_id);
  const { data: masterArtists } = firstMaster.size
    ? await supabase
        .from("master_artists")
        .select("master_id, artist_id, position")
        .in("master_id", [...firstMaster.values()])
        .order("position")
    : { data: [] as { master_id: string; artist_id: string }[] };
  const masterArtist = new Map<string, string>();
  for (const ma of masterArtists ?? [])
    if (!masterArtist.has(ma.master_id))
      masterArtist.set(ma.master_id, ma.artist_id);
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

  const artistIds = new Set((artistsRes.data ?? []).map((a) => a.id));

  return {
    participations: Object.fromEntries(
      parts
        .map((p) => [p.id, label(p)] as const)
        .sort((a, b) => a[1].localeCompare(b[1], "fr")),
    ),
    // A collective's deals go through a participation (20261112130101):
    // never offered as « un projet ».
    projects: Object.fromEntries(
      projects.filter((p) => !p.collective).map((p) => [p.id, p.title]),
    ),
    // The project's artist as project_artist_id reads it: the first
    // artist of its first master, else projects.artist_id.
    projectArtists: Object.fromEntries(
      projects.flatMap((p) => {
        const master = firstMaster.get(p.id);
        const id = (master && masterArtist.get(master)) || p.artist_id;
        return id && artistIds.has(id) ? [[p.id, id] as const] : [];
      }),
    ),
    artists: Object.fromEntries(
      (artistsRes.data ?? []).map((a) => [a.id, a.name]),
    ),
    negotiators: Object.fromEntries(
      (negotiatorsRes.data ?? []).map((n) => [
        n.person_id,
        personName(n.first_name, n.last_name),
      ]),
    ),
    artistAlone: director || own,
    own,
  };
}
