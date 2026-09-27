import "server-only";

import {
  releaseStatusOf,
  type MasterReleaseStatus,
} from "@/lib/catalog/master-release";
import type { Credit } from "@/lib/catalog/types";
import { createClient } from "@/lib/supabase/server";

// What the title page reads around a title ("master" in the code): its other
// variants and the releases of the projects carrying it.

const normalizeTitle = (title: string) => title.trim().toLowerCase();

// Artists a variant must share: the main ones, or every credit if none.
function keyArtists(credits: Credit[]): Set<string> {
  const main = credits.filter((c) => c.role === "main");
  return new Set((main.length > 0 ? main : credits).map((c) => c.artistId));
}

/**
 * Other live titles of the same name (case and surrounding spaces ignored)
 * crediting one of the title's main artists: radio edit, instrumental,
 * remix… (docs/ARCHITECTURE.md § 2 sexies). Decided by code, whatever the
 * variant field says: it only names each one.
 */
export async function listMasterVariantIds(master: {
  id: string;
  title: string;
  credits: Credit[];
}): Promise<{ ids: string[]; error: boolean }> {
  const supabase = await createClient();
  const pattern = master.title.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from("masters")
    .select(
      "id, title, credits:master_artists!master_artists_master_same_org(artist_id)",
    )
    .ilike("title", `%${pattern}%`)
    .is("archived_at", null)
    .neq("id", master.id);
  if (error) {
    console.error("listMasterVariantIds:", error.message);
    return { ids: [], error: true };
  }
  const title = normalizeTitle(master.title);
  const artists = keyArtists(master.credits);
  return {
    ids: (data ?? [])
      .filter(
        (row) =>
          normalizeTitle(row.title) === title &&
          row.credits.some((c) => artists.has(c.artist_id)),
      )
      .map((row) => row.id),
    error: false,
  };
}

export type MasterDistributionRelease = {
  id: string;
  title: string;
  project: { id: string; title: string };
  upc: string | null;
  plannedReleaseDate: string | null;
  status: MasterReleaseStatus;
  links: { platform: string; url: string }[];
};

/**
 * Releases of the live projects carrying the master, among those the viewer
 * sees (RLS), next ones first. Read-only here: edited in the project.
 */
export async function listMasterDistribution(masterId: string): Promise<{
  releases: MasterDistributionRelease[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_masters")
    .select(
      "project:projects!project_masters_project_same_org(id, title, archived_at, releases:releases!releases_project_same_org(id, title, upc, planned_release_date, online_detected_at, links:release_links!release_links_release_same_org(platform, url)))",
    )
    .eq("master_id", masterId);
  if (error) {
    console.error("listMasterDistribution:", error.message);
    return { releases: [], error: true };
  }
  const releases = (data ?? []).flatMap((row) => {
    const project = row.project;
    if (!project || project.archived_at) return [];
    return project.releases.map((release): MasterDistributionRelease => ({
      id: release.id,
      title: release.title,
      project: { id: project.id, title: project.title },
      upc: release.upc,
      plannedReleaseDate: release.planned_release_date,
      status: releaseStatusOf({
        title: release.title,
        plannedReleaseDate: release.planned_release_date,
        onlineDetectedAt: release.online_detected_at,
      }),
      links: release.links.map(({ platform, url }) => ({ platform, url })),
    }));
  });
  // Dated first, latest date first; undated last.
  releases.sort((a, b) => {
    const x = a.plannedReleaseDate;
    const y = b.plannedReleaseDate;
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return y.localeCompare(x);
  });
  return { releases, error: false };
}
