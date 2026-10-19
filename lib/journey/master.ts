import "server-only";

import { fr } from "@/lib/i18n/fr";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { isWorkflowLaunched } from "@/lib/plan/queries";

import type { ModuleJourney } from "./types";

/**
 * The Master's journey for the project's « Maintenant » (lib/journey/
 * sources.ts): its five steps once the Plan du projet launched it, nothing
 * before (the module is locked until then).
 */
export async function masterJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  if (!(await isWorkflowLaunched(projectId, "master"))) return [];
  const { steps } = await masterJourneyContext(projectId);
  return [{ module: "master", label: fr.shell.project.sidebar.master, steps }];
}
