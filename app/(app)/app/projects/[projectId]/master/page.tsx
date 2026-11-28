import { redirect } from "next/navigation";

import { MasterTitlesPage } from "@/components/master-workflow/master-titles-page";
import { masterEntry } from "@/lib/journey/landing";
import {
  masterJourneyContext,
  masterTitleJourney,
} from "@/lib/master-workflow/journey-context";
import { carriedTitle } from "@/lib/projects/title-carry";
import { loadProjectTitles } from "@/lib/projects/titles";

// The Master's entry (proto `master-v2.html`): it opens the step that waits
// for the person looking, else the one in progress, else the Master final.
// The old État du master and « Où en est la préparation » live in the
// Source step now. A collective (Sacha, 28/11/2026): the list of its titles
// (MasterTitlesPage), never a title chosen by the code; a title named in
// the address (« Titres », the navigation from another workflow of the same
// title: lib/projects/title-carry-rules.ts), or its only title, opens on
// its own journey's step (Maël 23/11/2026, « 1 par son »).
export default async function ProjectMasterPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const { steps, project } = await masterJourneyContext(projectId);
  if (!project.collective) redirect(masterEntry(projectId, steps));
  const named = await carriedTitle(projectId, query);
  const live = (await loadProjectTitles(projectId)).filter(
    (title) => title.master && title.status !== "abandoned",
  );
  const masterId =
    named?.master?.id ?? (live.length === 1 ? live[0].master?.id : null);
  if (!masterId) return <MasterTitlesPage projectId={projectId} />;
  const entry = masterEntry(
    projectId,
    await masterTitleJourney(projectId, masterId),
  );
  redirect(`${entry}${entry.includes("?") ? "&" : "?"}titre=${masterId}`);
}
