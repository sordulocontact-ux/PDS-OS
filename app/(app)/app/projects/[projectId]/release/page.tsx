import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
import { distributionEntry } from "@/lib/journey/landing";
import { isUuid } from "@/lib/release/uuid";

// /release opens the Distribution's step that awaits the viewer, else the
// one in progress (docs/VISION-UX.md § 4, « On arrive au bon endroit »).
export default async function ReleasePage({
  params,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const ctx = await distributionContext(projectId);
  redirect(distributionEntry(projectId, ctx?.steps ?? []));
}
