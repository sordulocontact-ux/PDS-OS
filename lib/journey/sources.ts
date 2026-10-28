import "server-only";

import { getProject } from "@/lib/projects/queries";
import { byProjectVersion } from "@/lib/projects/version-cache";

import { activationsJourneys } from "./activations";
import { designJourneys } from "./design";
import { distributionJourneys } from "./distribution";
import { framingJourneys } from "./framing";
import { legalJourneys } from "./legal";
import { productionJourneys } from "./production";
import { masterJourneys } from "./master";
import { strategyJourneys } from "./strategy";
import { reviewJourneys } from "./review";
import type { JourneyModuleKey, ModuleJourney } from "./types";

// One loader per workflow (docs/ARCHITECTURE.md § 3 ter): each returns the
// project's journeys of that workflow as JourneyStep[], read with the
// viewer's session, and nothing when the viewer may not read it.
type Loader = (projectId: string) => Promise<ModuleJourney[]>;

// Each workflow's journeys kept on their own, with the tables they read
// (lib/projects/version-cache.ts): a write in one workflow computes that
// workflow again, and the others are served as they were.
const kept = (name: string, loader: Loader): Loader =>
  byProjectVersion(`journey-${name}`, loader);

// Marketing: the Stratégie (lib/journey/strategy.ts), the Conception
// (lib/journey/design.ts), each deliverable's Production
// (lib/journey/production.ts), the Activations (lib/journey/activations.ts)
// and the Suivi & bilan (lib/journey/review.ts).
const keptStrategy = kept("strategy", strategyJourneys);
const keptDesign = kept("design", designJourneys);
const keptProduction = kept("production", productionJourneys);
const keptActivations = kept("activations", activationsJourneys);
const keptReview = kept("review", reviewJourneys);

const marketing: Loader = async (projectId) => {
  const [strategy, design, productions, activations, review] =
    await Promise.all([
      keptStrategy(projectId),
      keptDesign(projectId),
      keptProduction(projectId),
      keptActivations(projectId),
      keptReview(projectId),
    ]);
  return [...strategy, ...design, ...productions, ...activations, ...review];
};

export const JOURNEY_LOADERS: Record<JourneyModuleKey, Loader> = {
  framing: kept("framing", framingJourneys),
  marketing,
  master: kept("master", masterJourneys),
  legal: kept("legal", legalJourneys),
  distribution: kept("distribution", distributionJourneys),
};

/** Whether the project's workflows are launched at all (no journeys before). */
export async function isLaunched(projectId: string): Promise<boolean> {
  const project = await getProject(projectId);
  return Boolean(project && project.stages.length > 0);
}
