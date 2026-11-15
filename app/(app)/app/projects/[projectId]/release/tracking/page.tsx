import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
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
  // A collective's release (lot 15).
  const releaseId = releaseParamOf(await searchParams);
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
