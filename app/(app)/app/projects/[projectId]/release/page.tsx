import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
import { distributionStepHref } from "@/lib/ui/distribution-steps";
import { isUuid } from "@/lib/release/uuid";

// /release opens the Distribution's step that awaits the viewer, else the
// one in progress (docs/VISION-UX.md § 4, « On arrive au bon endroit »).
export default async function ReleasePage({
  params,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const ctx = await distributionContext(projectId);
  const steps = ctx?.steps ?? [];
  const target =
    steps.find((s) => s.actor?.viewer) ??
    steps.find((s) => s.status === "current" || s.status === "waiting") ??
    steps.at(-1);
  redirect(
    distributionStepHref(projectId, target ? (target.key as never) : "prep"),
  );
}
