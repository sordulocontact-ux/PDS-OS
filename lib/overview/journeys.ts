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
import { planLaunchedAt } from "@/lib/plan/queries";
import { getProject } from "@/lib/projects/queries";

import { framingFallback } from "./framing-steps";

// `acting`: the journeys whose actions count; `journeys`: all of them.
function gather(
  acting: ModuleJourney[],
  journeys: ModuleJourney[] = acting,
): ProjectJourneys {
  const actions: ProjectAction[] = acting.flatMap((journey) =>
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
 * of its own (lib/overview/framing-steps.ts; once the zone Cadrage plugs
 * its journey into JOURNEY_LOADERS, this adds nothing), and before the plan
 * only the Cadrage's actions. Once per request.
 */
export const loadShellJourneys = cache(
  async (projectId: string): Promise<ProjectJourneys> => {
    const [access, project, all] = await Promise.all([
      requireApproved(),
      getProject(projectId),
      loadProjectJourneys(projectId),
    ]);
    if (!project || project.stages.length === 0) return all;
    const launched = await planLaunchedAt(projectId);
    const framing = all.journeys.some((j) => j.module === "framing")
      ? []
      : [await framingFallback(project, access)];
    // Before « Lancer le plan » only the Cadrage asks something of anyone
    // (proto « Projet complet », `myActions`): a workflow begun earlier keeps
    // its page, but its steps wait for the plan to be counted.
    const journeys = [...framing, ...all.journeys];
    return gather(
      launched ? journeys : journeys.filter((j) => j.module === "framing"),
      journeys,
    );
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
