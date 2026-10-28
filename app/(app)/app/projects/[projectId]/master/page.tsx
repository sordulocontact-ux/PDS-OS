import { redirect } from "next/navigation";

import { masterEntry } from "@/lib/journey/landing";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";

// The Master's entry (proto `master-v2.html`): it opens the step that waits
// for the person looking, else the one in progress, else the Master final.
// The old État du master and « Où en est la préparation » live in the
// Source step now.
export default async function ProjectMasterPage({
  params,
}: PageProps<"/app/projects/[projectId]/master">) {
  const { projectId } = await params;
  const { steps } = await masterJourneyContext(projectId);
  redirect(masterEntry(projectId, steps));
}
