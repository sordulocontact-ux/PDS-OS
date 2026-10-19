import "server-only";

import { fr } from "@/lib/i18n/fr";
import { strategyStepData } from "@/lib/strategy/step-data";

import type { ModuleJourney } from "./types";

/**
 * The Stratégie's four steps (lib/strategy/journey.ts) for the project's
 * one « Maintenant »: the owner's actions, each validator's decision on the
 * Brief de sortie (`kind: "validate"`, listed in the project's
 * Validations). Locked until the plan is launched.
 */
export async function strategyJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const ctx = await strategyStepData(projectId);
  if (!ctx) return [];
  return [
    {
      module: "marketing",
      label: fr.shell.project.sidebar.marketing,
      part: {
        key: "strategy",
        label: fr.shell.project.marketingSteps.strategy,
      },
      steps: ctx.steps,
    },
  ];
}
