import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
import { distributionStepHref } from "@/lib/ui/distribution-steps";
import { isUuid } from "@/lib/release/uuid";

// The former « Suivi » tab: its two steps now, the deposit until it is
// declared, then The Orchard's answer.
export default async function ReleaseTrackingPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/tracking">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const ctx = await distributionContext(projectId);
  const deposited = ctx?.cycle?.deposit != null;
  redirect(distributionStepHref(projectId, deposited ? "orchard" : "deposit"));
}
