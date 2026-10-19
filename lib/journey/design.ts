import "server-only";

import { designJourneyContext } from "@/lib/design/journey-context";
import { fr } from "@/lib/i18n/fr";

import type { ModuleJourney } from "./types";

/**
 * The Conception's six steps (lib/design/journey.ts) for the project's one
 * « Maintenant », under the Marketing: the owner's designations and
 * transfers, the responsible créatif's work, the direction's decisions
 * (`kind: "validate"`, listed in the project's Validations). Nothing before
 * the Stratégie is validated: the Conception has nothing to receive yet.
 */
export async function designJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const ctx = await designJourneyContext(projectId);
  if (!ctx || ctx.steps[0].status === "blocked") return [];
  return [
    {
      module: "marketing",
      label: fr.shell.project.sidebar.marketing,
      part: { key: "design", label: fr.designJourney.module },
      steps: ctx.steps,
    },
  ];
}
