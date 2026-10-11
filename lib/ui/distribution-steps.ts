import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The Distribution workflow (ticket « Distribution », docs/ARCHITECTURE.md
// § 8 octies): PDS OS prepares, checks and follows a MANUAL deposit at the
// distributor, it never sends anything. Five steps: Préparation (the sources
// and the release's identifiers, /release), Dossier (the delivery file, its
// parameters, checks and validation), Suivi (the declared deposit and the
// distributor's answers), Plateformes (links and verifications, detection,
// smartlink; was « En ligne ») and Clôture.
export const DISTRIBUTION_STEPS = [
  "prepare",
  "dossier",
  "tracking",
  "online",
  "closure",
] as const;

export type DistributionStep = (typeof DISTRIBUTION_STEPS)[number];

export const distributionPages = (projectId: string) => [
  routes.projectRelease(projectId),
];

export function distributionStepHref(
  projectId: string,
  step: DistributionStep,
): string {
  switch (step) {
    case "dossier":
      return routes.projectReleaseDossier(projectId);
    case "tracking":
      return routes.projectReleaseTracking(projectId);
    case "online":
      return routes.projectReleaseOnline(projectId);
    case "closure":
      return routes.projectReleaseClosure(projectId);
    default:
      return routes.projectRelease(projectId);
  }
}

export function distributionSteps(
  projectId: string,
  done: readonly string[] = [],
) {
  const t = fr.shell.project.distributionSteps;
  return DISTRIBUTION_STEPS.map((key) => ({
    key,
    label: t[key],
    href: distributionStepHref(projectId, key),
    built: true,
    done: done.includes(key),
  }));
}
