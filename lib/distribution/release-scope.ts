import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import type {
  DistributionRelease,
  ScopedProject,
} from "@/lib/distribution/scope";
import {
  projectTitleLabel,
  titleGuestNames,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Projet collectif, lot 15 (docs/pds-mic-plan.md § 3 bis point 7): the
// release a collective's Distribution is about, and what it delivers — a
// title's release its title, the compilation its active titles, in the
// project's order. A simple project is returned as it is.

export type DistributionProject = ProjectDetail &
  ScopedProject & {
    // The release's titles (a collective): one for a title's release, the
    // active ones for the compilation. Empty for a simple project.
    distributionTitles: ProjectTitle[];
  };

/**
 * The project as the Distribution reads it. A collective needs its release
 * (null otherwise: the caller leads to « Sorties »); a release that is not
 * the project's is never read (null). Its masters become the release's
 * tracks, in the order of its titles.
 */
export const scopeDistribution = trackedCache(async function scope(
  project: ProjectDetail,
  releaseId: string | null,
): Promise<DistributionProject | null> {
  if (!project.collective)
    return { ...project, distributionRelease: null, distributionTitles: [] };
  if (!releaseId) return null;
  const supabase = await createClient();
  const [{ data: row }, titles] = await Promise.all([
    supabase
      .from("releases")
      .select("id, title, project_title_id, archived_at, planned_release_date")
      .eq("id", releaseId)
      .eq("project_id", project.id)
      .maybeSingle(),
    loadProjectTitles(project.id),
  ]);
  if (!row) return null;
  const own = row.project_title_id
    ? titles.filter((t) => t.id === row.project_title_id)
    : titles
        .filter((t) => t.status !== "abandoned")
        .sort((a, b) => a.position - b.position);
  const title = row.project_title_id ? own[0] : undefined;
  const release: DistributionRelease = {
    id: row.id,
    kind: row.project_title_id ? "title" : "compilation",
    titleId: row.project_title_id,
    label: title
      ? projectTitleLabel({
          position: title.position,
          workingTitle: title.workingTitle,
          masterTitle:
            title.master && !title.master.provisional
              ? title.master.title
              : null,
          artists: titleGuestNames(title.participations),
        })
      : row.title,
    date: row.planned_release_date,
    readOnly: row.archived_at
      ? "archived"
      : title?.status === "abandoned"
        ? "abandoned"
        : null,
  };
  const byId = new Map(project.masters.map((m) => [m.id, m]));
  const masters = own.flatMap((t) => {
    const master = t.master ? byId.get(t.master.id) : undefined;
    return master ? [master] : [];
  });
  return {
    ...project,
    masters,
    abandonedMasterIds: [],
    distributionRelease: release,
    distributionTitles: own,
  };
});

/** The project a Distribution action works on, read again with the viewer's
 * session (abandoned titles out, lot 9; its release, lot 15). */
export async function distributionProject(
  projectId: string,
  releaseId: string | null | undefined,
): Promise<DistributionProject | null> {
  const { getProject } = await import("@/lib/projects/queries");
  const { countedTitlesProject } =
    await import("@/lib/projects/counted-titles");
  const read = await getProject(projectId);
  if (!read || read.stages.length === 0) return null;
  return scopeDistribution(countedTitlesProject(read), releaseId ?? null);
}
