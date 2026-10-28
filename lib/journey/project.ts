import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { byProjectVersion } from "@/lib/projects/version-cache";
import { allInOrder } from "@/lib/utils/parallel";

import { isLaunched, JOURNEY_LOADERS } from "./sources";
import {
  JOURNEY_MODULES,
  type JourneyModuleKey,
  type ModuleJourney,
  type ProjectAction,
  type ProjectJourneys,
  placeOf,
} from "./types";

/**
 * The project's journeys, read now (no per-request cache): for a Server
 * Action that compares before and after a write (lib/journey/outcome.ts).
 * `modules`: only these workflows, to keep that comparison light.
 */
export async function readProjectJourneys(
  projectId: string,
  modules: readonly JourneyModuleKey[] = JOURNEY_MODULES,
): Promise<ProjectJourneys> {
  if (!(await isLaunched(projectId)))
    return { journeys: [], mine: [], waiting: [], validations: [] };
  const loaded = await allInOrder(
    modules.map((module) => JOURNEY_LOADERS[module](projectId)),
  );
  const journeys: ModuleJourney[] = loaded.flat();
  const actions: ProjectAction[] = journeys.flatMap((journey) =>
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
 * The one source of « who does what now » in a project (docs/VISION-UX.md
 * § 3, « Une seule source »): every workflow's journey, read once per
 * request and in one round trip, then the viewer's actions (Cadrage first),
 * what others are expected to do and the viewer's decisions. NowCard, the
 * overview, Travail, Validations and the navigation's counts read it; none
 * computes its own list.
 */
export const loadProjectJourneys = trackedCache(
  byProjectVersion("journeys", (projectId: string) =>
    readProjectJourneys(projectId),
  ),
);

/** The viewer's actions outside the given steps (« À vous, ailleurs »). */
export function elsewhereOf(
  all: ProjectJourneys,
  here: ReadonlyArray<{ href: string }>,
): ProjectAction[] {
  const hrefs = new Set(here.map((s) => s.href));
  return all.mine.filter((a) => !hrefs.has(a.step.href));
}
