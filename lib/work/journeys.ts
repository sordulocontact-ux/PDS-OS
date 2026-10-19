import "server-only";

import { cache } from "react";

import type { ProjectAction } from "@/lib/journey/types";
import { loadShellActions } from "@/lib/overview/journeys";
import { listProjects } from "@/lib/projects/queries";
import { withQueryBatching } from "@/lib/supabase/batch";
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

/**
 * « Mes actions » across every project the viewer sees (docs/VISION-UX.md
 * § 3, « Une seule source »): each launched project's journeys, read by
 * loadShellActions (the very source of the project's Travail, Validations
 * and navigation counts), a few projects at a time. Shared by
 * the home, the global Travail and the main navigation's count; once per
 * request. A project that fails is left out and said (`error`), the others
 * still show.
 */
export const loadMyJourneyWork = cache(async (): Promise<MyJourneyWork> => {
  const { projects, error } = await listProjects();
  const launched = projects.filter((p) => p.status === "launched");
  const settled = await withQueryBatching(() =>
    settleWithLimit(launched, PROJECTS_AT_ONCE, (p) => loadShellActions(p.id)),
  );
  let failed = error;
  const works: ProjectWork[] = [];
  const byProject: Record<string, number> = {};
  settled.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error("loadMyJourneyWork:", launched[i].id, result.reason);
      failed = true;
      return;
    }
    byProject[launched[i].id] = result.value.mine.length;
    if (result.value.mine.length === 0) return;
    works.push({
      projectId: launched[i].id,
      projectTitle: launched[i].title,
      mine: result.value.mine,
      validations: result.value.validations,
    });
  });
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
    error: failed,
  };
});
