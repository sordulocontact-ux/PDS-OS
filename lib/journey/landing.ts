import { routes } from "@/lib/auth/redirects";
import { designLanding } from "@/lib/design/journey";
import { framingLanding } from "@/lib/framing/journey";
import { entryHref as legalEntryHref } from "@/lib/legal/demarches/where";
import { stepHref as productionStepHref } from "@/lib/production/journey/href";
import { landingStep as productionLanding } from "@/lib/production/journey/steps";
import { strategyLanding } from "@/lib/strategy/journey";
import { distributionStepHref } from "@/lib/ui/distribution-steps";
import type { JourneyStep } from "@/lib/ui/journey";
import { masterStepHref } from "@/lib/ui/master-steps";
import { reviewStepHref } from "@/lib/ui/review-steps";

import type { ModuleJourney } from "./types";

// Where each module opens (docs/VISION-UX.md § 4, « On arrive au bon
// endroit »), from its journey: the module's entry page redirects there, and
// the project's navigation links there directly (docs/ARCHITECTURE.md § 3
// bis, « Entrée d'un module ») — a redirect after the page started showed
// an empty page, then a second skeleton. Pure.

/** The step a Master, Distribution or Suivi & bilan opens on: the viewer's,
 * else the one in progress or waiting, else the last. */
export function entryStep(steps: JourneyStep[]): JourneyStep | undefined {
  return (
    steps.find((s) => s.actor?.viewer) ??
    steps.find((s) => s.status === "current" || s.status === "waiting") ??
    steps.at(-1)
  );
}

type MasterKey = Parameters<typeof masterStepHref>[1];
type ReviewKey = Parameters<typeof reviewStepHref>[1];
type DistributionKey = Parameters<typeof distributionStepHref>[1];

export const masterEntry = (projectId: string, steps: JourneyStep[]) =>
  masterStepHref(projectId, (entryStep(steps)?.key ?? "final") as MasterKey);

export const reviewEntry = (projectId: string, steps: JourneyStep[]) =>
  reviewStepHref(projectId, (entryStep(steps)?.key ?? "closure") as ReviewKey);

export const distributionEntry = (
  projectId: string,
  steps: JourneyStep[],
  // A collective's release (lot 15).
  releaseId: string | null = null,
) =>
  distributionStepHref(
    projectId,
    (entryStep(steps)?.key ?? "prep") as DistributionKey,
    releaseId,
  );

/** The Production's entry: the viewer's deliverable, else the first one in
 * Production (the Stratégie's order), on its landing step. */
export function productionEntry(
  projectId: string,
  journeys: ModuleJourney[],
): string | null {
  const parts = journeys.filter((j) => j.part?.key.startsWith("production:"));
  const open =
    parts.find((j) => j.steps.some((s) => s.actor?.viewer)) ?? parts[0];
  if (!open?.part) return null;
  const id = open.part.key.slice("production:".length);
  return productionStepHref(
    projectId,
    id,
    productionLanding(
      // The Production's own steps (lib/journey/production.ts), typed wider
      // in a ModuleJourney.
      open.steps as Parameters<typeof productionLanding>[0],
    ),
  );
}

/** The Activations' entry when the viewer acts on an open one; otherwise
 * the page decides with its filters (it reads more than the journey). */
function activationsEntry(projectId: string, steps: JourneyStep[]) {
  const mine = steps.find(
    (s) =>
      s.key !== "levers" &&
      s.actor?.viewer &&
      s.status !== "done" &&
      s.status !== "obsolete",
  );
  return mine
    ? routes.projectActivation(projectId, mine.key.split(":")[0])
    : null;
}

/** Where each entry of the project's navigation and each Marketing pill
 * opens, keyed like them; an entry left out keeps its own page, which
 * redirects (a module without a journey for this viewer yet). */
export function moduleEntries(
  projectId: string,
  journeys: ModuleJourney[],
): Record<string, string> {
  const stepsOf = (module: string, part?: string) =>
    journeys.find((j) => j.module === module && j.part?.key === part)?.steps;
  const entries: Record<string, string | null> = {};
  const framing = stepsOf("framing");
  if (framing)
    entries.framing = routes.projectFramingStep(
      projectId,
      framingLanding(framing),
    );
  const master = stepsOf("master");
  if (master?.length) entries.master = masterEntry(projectId, master);
  const legal = stepsOf("legal");
  if (legal) entries.legal = legalEntryHref(projectId, legal, {});
  const distribution = stepsOf("distribution");
  if (distribution?.length)
    entries.distribution = distributionEntry(projectId, distribution);
  const strategy = stepsOf("marketing", "strategy");
  if (strategy) {
    entries.strategy = routes.projectStrategyStep(
      projectId,
      strategyLanding(strategy),
    );
    // The Marketing's entry is its Stratégie.
    entries.marketing = entries.strategy;
  }
  const design = stepsOf("marketing", "design");
  if (design)
    entries.conception = routes.projectDesignStep(
      projectId,
      designLanding(design),
    );
  entries.production = productionEntry(projectId, journeys);
  const activations = stepsOf("marketing", "activations");
  if (activations)
    entries.activations = activationsEntry(projectId, activations);
  const review = stepsOf("marketing", "review");
  if (review?.length) entries.review = reviewEntry(projectId, review);
  return Object.fromEntries(
    Object.entries(entries).filter(
      (entry): entry is [string, string] => entry[1] !== null,
    ),
  );
}
