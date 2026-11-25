import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { TracksList } from "@/components/projects/tracks/tracks-list";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { titleCounts } from "@/lib/projects/title-board-rules";
import { loadTitlesProgress } from "@/lib/projects/title-journeys";
import { requireLaunchedProject } from "@/lib/projects/queries";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { allInOrder } from "@/lib/utils/parallel";
import type { WorkflowKey } from "@/lib/workflow-status/rules";

export const metadata = { title: fr.titleTracks.title };

/**
 * « Titres » of a launched collective (Maël 25/11/2026: the title as the
 * way in, the trail's switcher a shortcut): each title with its Master,
 * Juridique and Distribution, as a project's « Progression » says them;
 * the row opens the title's page. Never shown for another project (404, no
 * entry in its navigation). The titles are added and edited in « Titres et
 * artistes ».
 */
export default async function ProjectTracksPage({
  params,
}: PageProps<"/app/projects/[projectId]/tracks">) {
  const { projectId } = await params;
  const [, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  const rows = await loadTitlesProgress(project.id);
  // The columns: the workflows of the project worked by title that the
  // viewer may open (every live title has the same).
  const workflows: WorkflowKey[] = (
    rows.find((row) => !row.abandoned)?.cards ?? []
  ).flatMap((card) => (card.restricted ? [] : [card.workflow]));
  const t = fr.projectTitles.board.facts;
  const counts = titleCounts(rows.map((row) => row.title));
  const facts: ModuleFact[] = [
    {
      key: "titles",
      label: t.titles,
      value: t.titleCounts(counts.active, counts.planned, counts.abandoned),
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader projectId={projectId} facts={facts} />
      <TracksList projectId={projectId} rows={rows} workflows={workflows} />
    </div>
  );
}
