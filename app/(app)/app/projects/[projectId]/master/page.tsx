import { redirect } from "next/navigation";

import { masterEntry } from "@/lib/journey/landing";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";

// The Master's entry (proto `master-v2.html`): it opens the step that waits
// for the person looking, else the one in progress, else the Master final.
// The old État du master and « Où en est la préparation » live in the
// Source step now.
export default async function ProjectMasterPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master">) {
  const [{ projectId }, { titre }] = await Promise.all([params, searchParams]);
  const { steps } = await masterJourneyContext(projectId);
  const entry = masterEntry(projectId, steps);
  // A collective's title, from « Titres et artistes » (lot 8), kept.
  redirect(
    typeof titre === "string" && /^[0-9a-f-]{36}$/.test(titre)
      ? `${entry}${entry.includes("?") ? "&" : "?"}titre=${titre}`
      : entry,
  );
}
