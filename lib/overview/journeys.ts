import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import {
  loadProjectJourneys,
  readProjectJourneys,
} from "@/lib/journey/project";
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
        part: journey.part?.key,
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
    const [access, project, all, launched] = await Promise.all([
      requireApproved(),
      getProject(projectId),
      loadProjectJourneys(projectId),
      planLaunchedAt(projectId),
    ]);
    if (!project || project.stages.length === 0) return all;
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

/**
 * The viewer's actions in a project, for the views that read every project
 * at once (lib/work/journeys.ts): loadShellJourneys once the plan is
 * launched; before, only the Cadrage asks something of anyone, so only its
 * journey is read (the other workflows' loaders are skipped, not
 * discarded). The same `mine` and `validations` as loadShellJourneys.
 */
export const loadShellActions = cache(
  async (projectId: string): Promise<ProjectJourneys> => {
    const [access, project, launched] = await Promise.all([
      requireApproved(),
      getProject(projectId),
      planLaunchedAt(projectId),
    ]);
    if (launched || !project || project.stages.length === 0)
      return loadShellJourneys(projectId);
    const framing = await readProjectJourneys(projectId, ["framing"]);
    return gather(
      framing.journeys.length > 0
        ? framing.journeys
        : [await framingFallback(project, access)],
    );
  },
);

/** The viewer's actions per Marketing sub-module, keyed like its pills
 * (lib/ui/marketing-steps.ts): « design » is the Conception's, every
 * deliverable's « production:<id> » the Production's. */
export function countMarketingParts(
  all: ProjectJourneys,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const action of all.mine) {
    if (action.module !== "marketing" || !action.part) continue;
    const key =
      action.part === "design"
        ? "conception"
        : action.part.startsWith("production:")
          ? "production"
          : action.part;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** The viewer's actions per navigation entry (Cadrage, each workflow); their
 * total is the Travail's count (`all.mine.length`). */
export function countMine(all: ProjectJourneys): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const action of all.mine)
    counts[action.module] = (counts[action.module] ?? 0) + 1;
  return counts;
}
