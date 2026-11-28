import "server-only";

import { requireApproved } from "@/lib/auth/dal";
import { distributionContext } from "@/lib/distribution/journey-context";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadCollectiveReleases } from "@/lib/release/collective-releases";
import type { JourneyStep } from "@/lib/ui/journey";

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

/**
 * The release a collective's Distribution step opens on when the address
 * names none (lot 15, Maël 23/11 and 26/11/2026): its only live release; with
 * several, the first (in the releases' order) where a step waits for the
 * viewer, else the first with a step not done, else the first — the others
 * are chosen on the page, in the trail. Null: none (the plan not launched,
 * or no title with a master yet).
 */
export async function defaultCollectiveRelease(
  projectId: string,
): Promise<string | null> {
  const [access, project] = await Promise.all([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const { releases } = await loadCollectiveReleases(project, access);
  const live = releases.filter((r) => !r.abandoned);
  if (live.length < 2) return live[0]?.id ?? null;
  const contexts = await Promise.all(
    live.map((r) => distributionContext(projectId, r.id)),
  );
  const pick = (test: (steps: JourneyStep[]) => boolean) =>
    live.find((_, i) => test(contexts[i]?.steps ?? []))?.id;
  return (
    pick((steps) => steps.some((s) => s.actor?.viewer)) ??
    pick((steps) => steps.some((s) => s.status !== "done")) ??
    live[0]?.id ??
    null
  );
}
