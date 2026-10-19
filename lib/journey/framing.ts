import "server-only";

import { framingJourneyContext } from "@/lib/framing/journey-context";
import { fr } from "@/lib/i18n/fr";

import type { ModuleJourney } from "./types";

/**
 * The Cadrage's four steps (lib/framing/journey.ts) for the project's one
 * « Maintenant »: the owner's actions, the direction's decision on the
 * Brief (`kind: "validate"`, listed in the project's Validations).
 */
export async function framingJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const ctx = await framingJourneyContext(projectId);
  if (!ctx) return [];
  return [
    {
      module: "framing",
      label: fr.shell.project.sidebar.framing,
      steps: ctx.steps,
    },
  ];
}
