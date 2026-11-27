import "server-only";

import { requireApproved } from "@/lib/auth/dal";
import { distributionContext } from "@/lib/distribution/journey-context";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { loadCollectiveReleases } from "@/lib/release/collective-releases";
import { applicableWorkflows } from "@/lib/workflow-status/rules";

import { RELEASE_PART, type ModuleJourney } from "./types";

/**
 * The Distribution's journey (lib/distribution/journey.ts) for the project's
 * « Maintenant », Travail and Validations: its seven steps once the plan is
 * launched, nothing before (the module waits for the plan), nothing for a
 * project without Distribution (a content project, recette 19/10). A
 * collective's Distribution is held release by release (lot 15): one
 * journey per live release (part « release:<id> »), so its « À vous » are
 * counted in the navigation and the overview (Maël 26/11/2026).
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
      collective: project.collective,
    }).includes("distribution")
  )
    return [];
  if (project.collective) {
    const access = await requireApproved();
    const { releases } = await loadCollectiveReleases(project, access);
    const contexts = await Promise.all(
      releases
        .filter((r) => !r.abandoned)
        .map((r) => distributionContext(projectId, r.id)),
    );
    return contexts.flatMap((ctx) =>
      ctx?.release
        ? [
            {
              module: "distribution" as const,
              label: fr.shell.project.sidebar.distribution,
              part: {
                key: `${RELEASE_PART}${ctx.release.id}`,
                label: ctx.release.label,
              },
              steps: ctx.steps,
            },
          ]
        : [],
    );
  }
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
