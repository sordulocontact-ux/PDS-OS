import "server-only";

import { getProject } from "@/lib/projects/queries";

import { conceptionJourney } from "./conception";
import { framingJourneys } from "./framing";
import { legalJourneys } from "./legal";
import { productionJourneys } from "./production";
import type { JourneyModuleKey, ModuleJourney } from "./types";

// One loader per workflow (docs/ARCHITECTURE.md § 3 ter): each returns the
// project's journeys of that workflow as JourneyStep[], read with the
// viewer's session, and nothing when the viewer may not read it. The zones
// fill the empty ones as they move onto the common frame (Cadrage, Master,
// Distribution, Stratégie, Activations, Suivi & bilan).
type Loader = (projectId: string) => Promise<ModuleJourney[]>;

// Marketing: the Conception (lib/journey/conception.ts) and each
// deliverable's Production (lib/journey/production.ts). Stratégie,
// Activations and Suivi & bilan come with their zone.
const marketing: Loader = async (projectId) => {
  const [design, productions] = await Promise.all([
    conceptionJourney(projectId),
    productionJourneys(projectId),
  ]);
  return [...design, ...productions];
};

// Filled by their zone (C4: typed, empty until then).
const none: Loader = async () => [];

export const JOURNEY_LOADERS: Record<JourneyModuleKey, Loader> = {
  framing: framingJourneys,
  marketing,
  master: none,
  legal: legalJourneys,
  distribution: none,
};

/** Whether the project's workflows are launched at all (no journeys before). */
export async function isLaunched(projectId: string): Promise<boolean> {
  const project = await getProject(projectId);
  return Boolean(project && project.stages.length > 0);
}
