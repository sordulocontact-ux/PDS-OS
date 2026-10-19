import "server-only";

import { fr } from "@/lib/i18n/fr";
import { reviewJourneyContext } from "@/lib/marketing/review/context";
import { isWorkflowLaunched } from "@/lib/plan/queries";

import type { ModuleJourney } from "./types";

/**
 * Marketing › Suivi & bilan for the project's « Maintenant » (lib/journey/
 * sources.ts, inside the Marketing's loader): its three steps once the Plan
 * du projet launched it, nothing before (the module is locked until then).
 * The responsible prepares, submits, arbitrates and asks; the direction's
 * decisions are `kind: "validate"` (the project's Validations).
 */
export async function reviewJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  if (!(await isWorkflowLaunched(projectId, "review"))) return [];
  const { steps } = await reviewJourneyContext(projectId);
  return [
    {
      module: "marketing",
      label: fr.shell.project.sidebar.marketing,
      part: { key: "review", label: fr.shell.project.marketingSteps.review },
      steps,
    },
  ];
}
