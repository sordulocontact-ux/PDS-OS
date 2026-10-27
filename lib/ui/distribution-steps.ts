import { routes } from "@/lib/auth/redirects";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distributionJourney };

// The Distribution workflow (ticket « Distribution », proto « Projet
// complet », docs/ARCHITECTURE.md § 8 octies): PDS OS prepares, checks and
// follows a MANUAL deposit at the distributor, it never sends anything.
// Seven steps in four sections (lib/distribution/journey.ts), one page each
// under /release, plus two views reached from the foot of the journey
// (Anomalies, Historique). /release opens the step that awaits the viewer.
export const DISTRIBUTION_STEPS = [
  "prep",
  "params",
  "dossier",
  "deposit",
  "orchard",
  "platforms",
  "closure",
] as const;

export type DistributionStep = (typeof DISTRIBUTION_STEPS)[number];

export const isDistributionStep = (value: string): value is DistributionStep =>
  (DISTRIBUTION_STEPS as readonly string[]).includes(value);

// Each step's address (« online » kept: insights and the activity link it).
const SLUG: Record<DistributionStep, string> = {
  prep: "preparation",
  params: "params",
  dossier: "dossier",
  deposit: "deposit",
  orchard: "orchard",
  platforms: "online",
  closure: "closure",
};

export const DISTRIBUTION_VIEWS = ["anomalies", "history"] as const;
export type DistributionView = (typeof DISTRIBUTION_VIEWS)[number];

export const distributionPages = (projectId: string) => [
  routes.projectRelease(projectId),
];

export function distributionStepHref(
  projectId: string,
  step: DistributionStep,
): string {
  return routes.projectReleaseStep(projectId, SLUG[step]);
}

export function distributionViewHref(
  projectId: string,
  view: DistributionView,
): string {
  return routes.projectReleaseStep(projectId, view);
}

/** The steps as crumbs (the open one ends the trail). */
export function distributionSteps(
  projectId: string,
  done: readonly string[] = [],
) {
  const t = fr.distributionJourney.steps;
  return DISTRIBUTION_STEPS.map((key) => ({
    key,
    label: t[key].title,
    href: distributionStepHref(projectId, key),
    built: true,
    done: done.includes(key),
  }));
}
