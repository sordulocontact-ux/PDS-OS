import "server-only";

import { distributionContext } from "@/lib/distribution/journey-context";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { applicableWorkflows } from "@/lib/workflow-status/rules";

import type { ModuleJourney } from "./types";

/**
 * The Distribution's journey (lib/distribution/journey.ts) for the project's
 * « Maintenant », Travail and Validations: its seven steps once the plan is
 * launched, nothing before (the module waits for the plan), nothing for a
 * project without Distribution (a content project, recette 19/10).
 */
export async function distributionJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  const read = await getProject(projectId);
  // A collective's abandoned titles leave the counts (lot 9).
  const project = read ? countedTitlesProject(read) : null;
  if (
    !project ||
    !applicableWorkflows({
      type: project.type,
      masterCount: project.masters.length,
    }).includes("distribution")
  )
    return [];
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
