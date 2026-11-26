import { notFound, redirect } from "next/navigation";

import { defaultCollectiveRelease } from "@/lib/distribution/default-release";
import { distributionContext } from "@/lib/distribution/journey-context";
import { getProject } from "@/lib/projects/queries";
import { distributionStepHref } from "@/lib/ui/distribution-steps";
import { isUuid } from "@/lib/release/uuid";
import { releaseParamOf } from "@/lib/distribution/scope";

// The former « Suivi » tab: its two steps now, the deposit until it is
// declared, then The Orchard's answer.
export default async function ReleaseTrackingPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release/tracking">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  // A collective's release (lot 15), its default one when none is named.
  const named = releaseParamOf(await searchParams);
  const project = named ? null : await getProject(projectId);
  const releaseId = project?.collective
    ? await defaultCollectiveRelease(projectId)
    : named;
  const ctx = await distributionContext(projectId, releaseId);
  const deposited = ctx?.cycle?.deposit != null;
  redirect(
    distributionStepHref(
      projectId,
      deposited ? "orchard" : "deposit",
      ctx?.releaseId,
    ),
  );
}
