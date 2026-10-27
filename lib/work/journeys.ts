import "server-only";

import { cache } from "react";

import {
  placeOf,
  type ProjectAction,
  type ProjectJourneys,
} from "@/lib/journey/types";
import { loadShellActions } from "@/lib/overview/journeys";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";
import { withQueryBatching } from "@/lib/supabase/batch";
import type { JourneyStep } from "@/lib/ui/journey";
import { settleWithLimit } from "@/lib/utils/parallel";

// Projects read at once. Their reads are batched (lib/supabase/batch.ts):
// the more projects run in step, the fewer requests leave.
const PROJECTS_AT_ONCE = 40;

/** The viewer's actions in one project, read from its journeys. */
export type ProjectWork = {
  projectId: string;
  projectTitle: string;
  mine: ProjectAction[];
  // The decisions among them (actor.kind « validate »).
  validations: ProjectAction[];
  // Each journey's steps by its place (« Marketing › Production › Pochette »),
  // to say what an action unlocks (nextOf).
  stepsByPlace: Record<string, JourneyStep[]>;
};

export type MyJourneyWork = {
  // Only the projects where something waits for the viewer.
  projects: ProjectWork[];
  // Every action, all projects together, and per project (zeros
  // included): the main navigation's count.
  count: number;
  byProject: Record<string, number>;
  validationCount: number;
  // A project (or the list) could not be read: never shown as « nothing ».
  error: boolean;
};

// Overdue-or-soonest first: the earliest due date among the actions,
// undated last; then the project's title.
const firstDue = (work: ProjectWork) =>
  work.mine.reduce<string>(
    (min, a) => (a.step.due && a.step.due < min ? a.step.due : min),
    "9999",
  );

/** Every launched project the viewer sees, with its journeys. */
export type LaunchedJourneys = {
  projects: Array<{ project: ProjectListItem; journeys: ProjectJourneys }>;
  // The list, or a project, could not be read: never shown as « nothing ».
  error: boolean;
};

/**
 * The journeys of every launched project the viewer sees, read by
 * loadShellActions (the very source of a project's Travail, Validations and
 * navigation counts), a few projects at a time. Shared by the Travail, the
 * home, the navigation's count and the Calendrier; once per request. A
 * project that fails is left out and said (`error`), the others still show.
 */
export const loadLaunchedJourneys = cache(
  async (): Promise<LaunchedJourneys> => {
    const { projects, error } = await listProjects();
    const launched = projects.filter((p) => p.status === "launched");
    const settled = await withQueryBatching(() =>
      settleWithLimit(launched, PROJECTS_AT_ONCE, (p) =>
        loadShellActions(p.id),
      ),
    );
    let failed = error;
    const read: LaunchedJourneys["projects"] = [];
    settled.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error("loadLaunchedJourneys:", launched[i].id, result.reason);
        failed = true;
        return;
      }
      read.push({ project: launched[i], journeys: result.value });
    });
    return { projects: read, error: failed };
  },
);

/**
 * « Mes actions » across every project the viewer sees (docs/VISION-UX.md
 * § 3, « Une seule source »), from loadLaunchedJourneys. Shared by the home,
 * the global Travail and the main navigation's count; once per request.
 */
export const loadMyJourneyWork = cache(async (): Promise<MyJourneyWork> => {
  const { projects, error } = await loadLaunchedJourneys();
  const works: ProjectWork[] = [];
  const byProject: Record<string, number> = {};
  for (const { project, journeys } of projects) {
    byProject[project.id] = journeys.mine.length;
    if (journeys.mine.length === 0) continue;
    works.push({
      projectId: project.id,
      projectTitle: project.title,
      mine: journeys.mine,
      validations: journeys.validations,
      stepsByPlace: Object.fromEntries(
        journeys.journeys.map((j) => [placeOf(j), j.steps]),
      ),
    });
  }
  works.sort(
    (a, b) =>
      firstDue(a).localeCompare(firstDue(b)) ||
      a.projectTitle.localeCompare(b.projectTitle, "fr"),
  );
  return {
    projects: works,
    count: works.reduce((n, w) => n + w.mine.length, 0),
    byProject,
    validationCount: works.reduce((n, w) => n + w.validations.length, 0),
    error,
  };
});
