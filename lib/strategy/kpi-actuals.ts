import "server-only";

import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { todayInParis } from "@/lib/insights/dates";
import type { KpiActual } from "@/lib/strategy/kpis";
import type { StrategyObjective } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

/**
 * The Deezer id of the project's artist: the main artist of its first
 * master, as the project's header names it, else the artist a content
 * project names. Null when none has a Deezer profile.
 */
async function projectArtistDeezerId(
  projectId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "artist:artists!projects_artist_same_org(deezer_id), links:project_masters!project_masters_project_same_org(position, master:masters!project_masters_master_same_org(credits:master_artists!master_artists_master_same_org(position, artist:artists!master_artists_artist_same_org(deezer_id))))",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!data) return null;
  const firstMaster = [...data.links].sort(byPosition)[0]?.master;
  const firstCredit = firstMaster
    ? [...firstMaster.credits].sort(byPosition)[0]
    : undefined;
  return firstCredit?.artist?.deezer_id ?? data.artist?.deezer_id ?? null;
}

/**
 * The real value of each KPI measured by a source (Deezer fans of the
 * project's artist), read by code once the release date is reached. Before
 * it: pending; without a reachable source: unavailable. Never a made-up
 * figure (CLAUDE.md, rule 6). Manual KPIs are left out.
 */
export async function loadKpiActuals(
  projectId: string,
  referenceDate: string | null,
  objectives: Pick<StrategyObjective, "id" | "source">[],
): Promise<Record<string, KpiActual>> {
  const measured = objectives.filter((o) => o.source === "deezer_fans");
  if (measured.length === 0) return {};
  const today = todayInParis();
  const released = referenceDate !== null && referenceDate <= today;

  let actual: KpiActual = { status: "pending" };
  if (released) {
    const deezerId = await projectArtistDeezerId(projectId);
    const profile = deezerId === null ? null : await getArtistProfile(deezerId);
    actual =
      profile && typeof profile.fans === "number"
        ? { status: "measured", value: profile.fans, on: today }
        : { status: "unavailable" };
  }
  return Object.fromEntries(measured.map((o) => [o.id, actual]));
}
