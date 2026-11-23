import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
import { distributionEntry } from "@/lib/journey/landing";
import { isUuid } from "@/lib/release/uuid";
import { routes } from "@/lib/auth/redirects";
import { releaseParamOf } from "@/lib/distribution/scope";
import { requireApproved } from "@/lib/auth/dal";
import { getProject, requireLaunchedProject } from "@/lib/projects/queries";
import { loadCollectiveReleases } from "@/lib/release/collective-releases";
import type { JourneyStep } from "@/lib/ui/journey";

// /release opens the Distribution's step that awaits the viewer, else the
// one in progress (docs/VISION-UX.md § 4, « On arrive au bon endroit »).
export default async function ReleasePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  // A collective's Distribution is a release's (lot 15): without one named,
  // the release that waits for the viewer (Maël 23/11/2026, « 1 par son »),
  // else « Sorties ».
  const named = releaseParamOf(await searchParams);
  const project = await getProject(projectId);
  const releaseId =
    project?.collective && !named ? await waitingRelease(projectId) : named;
  if (project?.collective && !releaseId)
    redirect(routes.projectReleases(projectId));
  const ctx = await distributionContext(
    projectId,
    project?.collective ? releaseId : null,
  );
  redirect(
    distributionEntry(projectId, ctx?.steps ?? [], ctx?.releaseId ?? null),
  );
}

/** A collective's release to open: the first (in the releases' order)
 * where a step waits for the viewer, else the first with a step not done,
 * else the first; null: none (the plan not launched). */
async function waitingRelease(projectId: string): Promise<string | null> {
  const [access, project] = await Promise.all([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const { releases } = await loadCollectiveReleases(project, access);
  const live = releases.filter((r) => !r.abandoned);
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
