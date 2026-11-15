import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
import { distributionEntry } from "@/lib/journey/landing";
import { isUuid } from "@/lib/release/uuid";
import { routes } from "@/lib/auth/redirects";
import { releaseParamOf } from "@/lib/distribution/scope";
import { getProject } from "@/lib/projects/queries";

// /release opens the Distribution's step that awaits the viewer, else the
// one in progress (docs/VISION-UX.md § 4, « On arrive au bon endroit »).
export default async function ReleasePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  // A collective's Distribution is a release's (lot 15): chosen in
  // « Sorties », never guessed.
  const releaseId = releaseParamOf(await searchParams);
  const project = await getProject(projectId);
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
