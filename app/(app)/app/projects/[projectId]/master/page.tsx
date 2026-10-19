import { redirect } from "next/navigation";

import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { masterStepHref } from "@/lib/ui/master-steps";

// The Master's entry (proto `master-v2.html`): it opens the step that waits
// for the person looking, else the one in progress, else the Master final.
// The old État du master and « Où en est la préparation » live in the
// Source step now.
export default async function ProjectMasterPage({
  params,
}: PageProps<"/app/projects/[projectId]/master">) {
  const { projectId } = await params;
  const { steps } = await masterJourneyContext(projectId);
  const entry =
    steps.find((s) => s.actor?.viewer) ??
    steps.find((s) => s.status === "current" || s.status === "waiting") ??
    steps[steps.length - 1];
  redirect(masterStepHref(projectId, entry.key));
}
