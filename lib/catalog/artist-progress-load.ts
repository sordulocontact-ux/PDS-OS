import "server-only";

import {
  artistProgressOf,
  progressOf,
  type ArtistProgress,
  type ProjectProgress,
} from "@/lib/catalog/artist-progress";
import { todayInParis } from "@/lib/insights/dates";
import { loadShellActions } from "@/lib/overview/journeys";
import { listProjects } from "@/lib/projects/queries";
import { withQueryBatching } from "@/lib/supabase/batch";
import { settleWithLimit } from "@/lib/utils/parallel";
import { loadLaunchedJourneys } from "@/lib/work/journeys";

// An artist has a handful of projects: read together, their requests
// batched (lib/supabase/batch.ts).
const PROJECTS_AT_ONCE = 10;

export type RosterProgress = {
  // Every launched project the viewer sees, by id.
  byProject: Map<string, ProjectProgress>;
  // A project could not be read: said, never shown as « nothing ».
  error: boolean;
};

/**
 * Where every launched project stands, for the artists list: the journeys
 * the home, Travail and the Calendrier already read (loadLaunchedJourneys,
 * once per request, each project's journeys kept until it changes), never
 * one read per artist.
 */
export async function loadRosterProgress(): Promise<RosterProgress> {
  const { projects, error } = await loadLaunchedJourneys();
  return {
    byProject: new Map(
      projects.map(({ project, journeys }) => [
        project.id,
        progressOf(project, journeys),
      ]),
    ),
    error,
  };
}

/** One artist's row of the list, from the roster's projects. */
export function rosterProgressOf(
  projectIds: string[],
  roster: RosterProgress,
): ArtistProgress {
  return artistProgressOf(
    projectIds.flatMap((id) => {
      const found = roster.byProject.get(id);
      return found ? [found] : [];
    }),
    todayInParis(),
  );
}

/**
 * Where one artist's launched projects stand (its overview): only its own
 * projects' journeys (loadShellActions, the same source as the list).
 */
export async function loadArtistProgress(
  projectIds: string[],
): Promise<ArtistProgress & { error: boolean }> {
  const { projects, error } = await listProjects({ ids: projectIds });
  const launched = projects.filter((p) => p.status === "launched");
  const settled = await withQueryBatching(() =>
    settleWithLimit(launched, PROJECTS_AT_ONCE, (p) => loadShellActions(p.id)),
  );
  let failed = error;
  const read: ProjectProgress[] = [];
  settled.forEach((result, i) => {
    const project = launched[i];
    if (result.status === "rejected") {
      console.error("loadArtistProgress:", project.id, result.reason);
      failed = true;
      return;
    }
    read.push(progressOf(project, result.value));
  });
  return { ...artistProgressOf(read, todayInParis()), error: failed };
}
