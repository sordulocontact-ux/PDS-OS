import "server-only";

import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadCollectiveReleases } from "@/lib/release/collective-releases";

/**
 * The Distribution's entry of a collective (Sacha, 28/11/2026: never a
 * release chosen by the code): its only live release; null with several or
 * none, the entry then opening « Sorties », the list of its releases.
 */
export async function onlyCollectiveRelease(
  projectId: string,
): Promise<string | null> {
  const [access, project] = await Promise.all([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const { releases } = await loadCollectiveReleases(project, access);
  const live = releases.filter((r) => !r.abandoned);
  return live.length === 1 ? live[0].id : null;
}
