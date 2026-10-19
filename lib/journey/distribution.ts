import "server-only";

import { distributionContext } from "@/lib/distribution/journey-context";
import { fr } from "@/lib/i18n/fr";

import type { ModuleJourney } from "./types";

/**
 * The Distribution's journey (lib/distribution/journey.ts) for the project's
 * « Maintenant », Travail and Validations: its seven steps once the plan is
 * launched, nothing before (the module waits for the plan).
 */
export async function distributionJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const ctx = await distributionContext(projectId);
  if (!ctx) return [];
  return [
    {
      module: "distribution",
      label: fr.shell.project.sidebar.distribution,
      steps: ctx.steps,
    },
  ];
}
