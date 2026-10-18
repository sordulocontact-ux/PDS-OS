import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { loadProjectJourneys } from "@/lib/journey/project";
import {
  type ModuleJourney,
  type ProjectAction,
  type ProjectJourneys,
  placeOf,
} from "@/lib/journey/types";
import { getProject } from "@/lib/projects/queries";

import { framingFallback } from "./framing-steps";

function gather(journeys: ModuleJourney[]): ProjectJourneys {
  const actions: ProjectAction[] = journeys.flatMap((journey) =>
    journey.steps
      .filter((step) => step.actor)
      .map((step) => ({
        module: journey.module,
        place: placeOf(journey),
        step,
      })),
  );
  const mine = actions.filter((a) => a.step.actor?.viewer);
  return {
    journeys,
    mine,
    waiting: actions.filter((a) => !a.step.actor?.viewer),
    validations: mine.filter((a) => a.step.actor?.kind === "validate"),
  };
}

/**
 * The project's journeys as the shell shows them (navigation counts, the
 * overview, Travail, Validations): loadProjectJourneys, with the Cadrage's
 * four steps read from its current states while the Cadrage has no loader
 * of its own (lib/overview/framing-steps.ts). Once the zone Cadrage plugs
 * its journey into JOURNEY_LOADERS, this adds nothing. Once per request.
 */
export const loadShellJourneys = cache(
  async (projectId: string): Promise<ProjectJourneys> => {
    const [access, project, all] = await Promise.all([
      requireApproved(),
      getProject(projectId),
      loadProjectJourneys(projectId),
    ]);
    if (!project || project.stages.length === 0) return all;
    if (all.journeys.some((journey) => journey.module === "framing"))
      return all;
    const framing = await framingFallback(project, access);
    return gather([framing, ...all.journeys]);
  },
);

/** The viewer's actions per navigation entry (Cadrage, each workflow); their
 * total is the Travail's count (`all.mine.length`). */
export function countMine(all: ProjectJourneys): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const action of all.mine)
    counts[action.module] = (counts[action.module] ?? 0) + 1;
  return counts;
}
