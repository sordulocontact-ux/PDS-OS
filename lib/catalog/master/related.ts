import "server-only";

import {
  releaseStatusOf,
  type MasterReleaseStatus,
} from "@/lib/catalog/master-release";
import { createClient } from "@/lib/supabase/server";

// What the title page reads around a title ("master" in the code): its other
// variants and the releases of the projects carrying it.

/**
 * The other titles of the family (retour Catalogue 08): the original and
 * every variant that names it (`source_master_id`), this title aside. The
 * link is explicit, written when the variant is created: never guessed
 * from a name.
 */
export async function listMasterVariantIds(master: {
  id: string;
  sourceMasterId: string | null;
}): Promise<{ ids: string[]; error: boolean }> {
  const supabase = await createClient();
  const root = master.sourceMasterId ?? master.id;
  const { data, error } = await supabase
    .from("masters")
    .select("id")
    .or(`id.eq.${root},source_master_id.eq.${root}`)
    .is("archived_at", null)
    .neq("id", master.id);
  if (error) {
    console.error("listMasterVariantIds:", error.message);
    return { ids: [], error: true };
  }
  return { ids: (data ?? []).map((row) => row.id), error: false };
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

export type MasterReleaseDates = {
  project: { id: string; title: string };
  // The project's target date (projects.due_date), the confirmed release
  // date (releases.planned_release_date), the day it was seen online.
  target: string | null;
  confirmed: string | null;
  effective: string | null;
};

/**
 * The three release dates of each live project carrying the title, kept
 * apart (retours Catalogue 55 et 66): a confirmed date never replaces the
 * target one. Read with the viewer's session (RLS).
 */
export async function listMasterReleaseDates(masterId: string): Promise<{
  dates: MasterReleaseDates[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_masters")
    .select(
      "project:projects!project_masters_project_same_org(id, title, due_date, archived_at, releases:releases!releases_project_same_org(planned_release_date, online_detected_at))",
    )
    .eq("master_id", masterId);
  if (error) {
    console.error("listMasterReleaseDates:", error.message);
    return { dates: [], error: true };
  }
  return {
    dates: (data ?? []).flatMap((row) => {
      const p = row.project;
      if (!p || p.archived_at) return [];
      const planned = p.releases
        .map((r) => r.planned_release_date)
        .filter((d): d is string => d !== null)
        .sort();
      const online = p.releases
        .map((r) => r.online_detected_at)
        .filter((d): d is string => d !== null)
        .sort();
      return [
        {
          project: { id: p.id, title: p.title },
          target: p.due_date,
          confirmed: planned[0] ?? null,
          effective: online[0] ?? null,
        },
      ];
    }),
    error: false,
  };
}
