import { notFound } from "next/navigation";

import { TitlesBoard } from "@/components/projects/titles/titles-board";
import {
  TitlesHeader,
  TitlesViews,
} from "@/components/projects/titles/titles-head";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadTitleRecap } from "@/lib/projects/recap";
import { titleBoardChoices } from "@/lib/projects/title-board";
import { allInOrder } from "@/lib/utils/parallel";
import { withRelease } from "@/lib/distribution/scope";
import { loadTitleDeposits } from "@/lib/release/collective-releases";
import { releaseDistributionTone } from "@/lib/release/collective-rules";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

export const metadata = { title: fr.titleTracks.title };

/**
 * « Titres » of a launched collective project, « Par artiste » (until
 * 25/11/2026 its own entry, « Titres et artistes »; docs/pds-mic-plan.md,
 * lot 6), the team's recap since the retours d'Ibé du 18/11/2026 (lot 2,
 * loadTitleRecap): its titles (in progress, planned, abandoned), their
 * artists and where each one stands, computed by code. « Par titre »
 * (/tracks) is the other view of the same head (TitlesHeader). Never shown
 * for another project (404, no entry in its navigation). Only its owner
 * writes (the database decides again on each gesture): « Ajouter un
 * titre », « Changer l'artiste principal », and the rows' « ⋯ ».
 */
export default async function ProjectTitlesPage({
  params,
}: PageProps<"/app/projects/[projectId]/titles">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  // A launched project: only its owner writes (is_project_owner).
  const canManage = canEditProject(access, project);
  const [board, flows, deposits] = await Promise.all([
    loadTitleRecap(project, access),
    loadWorkflowStates(project.id),
    // Each title's release deposit (lot 15).
    loadTitleDeposits(project.id),
  ]);
  const { masterOptions, artists } = await titleBoardChoices(
    project,
    board.titles,
    canManage,
  );

  const workflows = flows?.workflows ?? [];

  return (
    <div className="flex flex-col gap-6">
      <TitlesHeader
        project={project}
        titles={board.titles}
        canManage={canManage}
        canOpenLegal={can(access, "manage_legal")}
        choices={{ masterOptions, artists }}
      />
      <TitlesViews projectId={project.id} current="artists">
        <TitlesBoard
          projectId={project.id}
          recap={board}
          canManage={canManage}
          artists={artists}
          masterOptions={masterOptions}
          links={{
            tracks: true,
            master: workflows.includes("master")
              ? routes.projectMaster(project.id)
              : null,
            distribution: workflows.includes("distribution")
              ? Object.fromEntries(
                  Object.entries(deposits).map(([titleId, d]) => {
                    const state = fr.collectiveReleases.distribution[
                      d.distribution.key
                    ](d.distribution.number);
                    return [
                      titleId,
                      {
                        href: withRelease(
                          routes.projectRelease(project.id),
                          d.releaseId,
                        ),
                        label: d.withCompilation
                          ? fr.projectTitles.board.distribution.withCompilation(
                              state,
                            )
                          : state,
                        tone: releaseDistributionTone[d.distribution.key],
                      },
                    ];
                  }),
                )
              : null,
          }}
        />
      </TitlesViews>
    </div>
  );
}
