import { redirect } from "next/navigation";

import { masterEntry } from "@/lib/journey/landing";
import {
  masterJourneyContext,
  masterTitleJourney,
} from "@/lib/master-workflow/journey-context";

// The Master's entry (proto `master-v2.html`): it opens the step that waits
// for the person looking, else the one in progress, else the Master final.
// The old État du master and « Où en est la préparation » live in the
// Source step now.
export default async function ProjectMasterPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master">) {
  const [{ projectId }, { titre }] = await Promise.all([params, searchParams]);
  // A collective's title, from « Titres et artistes » (lot 8), kept: its
  // own journey decides the step (Maël 23/11/2026, « 1 par son »).
  const title =
    typeof titre === "string" && /^[0-9a-f-]{36}$/.test(titre) ? titre : null;
  const { steps, project } = await masterJourneyContext(projectId);
  const entry = masterEntry(
    projectId,
    title && project.collective
      ? await masterTitleJourney(projectId, title)
      : steps,
  );
  redirect(
    title ? `${entry}${entry.includes("?") ? "&" : "?"}titre=${title}` : entry,
  );
}
