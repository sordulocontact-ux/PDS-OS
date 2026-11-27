import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ParticipationsModal } from "@/components/legal/participations/participations-modal";

import {
  TitlesHeader,
  TitlesViews,
} from "@/components/projects/titles/titles-head";
import { TracksList } from "@/components/projects/tracks/tracks-list";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { titleBoardChoices } from "@/lib/projects/title-board";
import { loadTitlesProgress } from "@/lib/projects/title-journeys";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { PARTICIPATIONS_PARAM } from "@/lib/ui/legal-steps";
import { allInOrder } from "@/lib/utils/parallel";
import type { WorkflowKey } from "@/lib/workflow-status/rules";

export const metadata = { title: fr.titleTracks.title };

/**
 * « Titres » of a launched collective, « Par titre » (Maël 25/11/2026: the
 * title as the way in, the trail's switcher a shortcut): each title with
 * its Master, Juridique and Distribution, as a project's « Progression »
 * says them; the row opens the title's page. « Par artiste » (/titles) is
 * the other view of the same head (TitlesHeader). Never shown for another
 * project (404, no entry in its navigation).
 */
export default async function ProjectTracksPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/tracks">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  // A launched project: only its owner writes (is_project_owner).
  const canManage = canEditProject(access, project);
  const rows = await loadTitlesProgress(project.id);
  const titles = rows.map((row) => row.title);
  const choices = await titleBoardChoices(project, titles, canManage);
  // The columns: the workflows of the project worked by title that the
  // viewer may open (every live title has the same).
  const workflows: WorkflowKey[] = (
    rows.find((row) => !row.abandoned)?.cards ?? []
  ).flatMap((card) => (card.restricted ? [] : [card.workflow]));
  return (
    <div className="flex flex-col gap-6">
      <TitlesHeader
        project={project}
        canManage={canManage}
        canOpenLegal={can(access, "manage_legal")}
        choices={choices}
        view="tracks"
      />
      {query[PARTICIPATIONS_PARAM] !== undefined &&
        can(access, "manage_legal") && (
          <Suspense fallback={null}>
            <ParticipationsModal project={project} access={access} />
          </Suspense>
        )}
      <TitlesViews projectId={project.id} current="tracks">
        <TracksList
          projectId={project.id}
          rows={rows}
          workflows={workflows}
          canManage={canManage}
        />
      </TitlesViews>
    </div>
  );
}
