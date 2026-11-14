import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { TitlesActions } from "@/components/projects/titles/titles-actions";
import { TitlesBoard } from "@/components/projects/titles/titles-board";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectArtists } from "@/lib/projects/participation-rules";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadTitleBoard, titleBoardChoices } from "@/lib/projects/title-board";
import { titleCounts } from "@/lib/projects/title-board-rules";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

export const metadata = { title: fr.projectTitles.title };

/**
 * « Titres et artistes » of a launched collective project
 * (docs/pds-mic-plan.md, lot 6): its titles (in progress, planned,
 * abandoned), their artists and where each one stands, computed by code.
 * Never shown for another project (404, no entry in its navigation). Facts:
 * the main artist, the titles by status, the artists of the project. Only
 * its owner writes (the database decides again on each gesture): « Ajouter
 * un titre », « Changer l'artiste principal », and the rows' « ⋯ ».
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
  const canOpenLegal = can(access, "manage_legal");
  const [board, flows] = await Promise.all([
    loadTitleBoard(project, access),
    loadWorkflowStates(project.id),
  ]);
  const { masterOptions, artists } = await titleBoardChoices(
    project,
    board.titles,
    canManage,
  );

  const t = fr.projectTitles.board.facts;
  const counts = titleCounts(board.titles);
  const facts: ModuleFact[] = [
    ...(project.artistName
      ? [{ key: "main", label: t.mainArtist, value: project.artistName }]
      : []),
    {
      key: "titles",
      label: t.titles,
      value: t.titleCounts(counts.active, counts.planned, counts.abandoned),
    },
    {
      key: "artists",
      label: t.artists,
      value: String(projectArtists(board.titles).length),
    },
  ];
  const workflows = flows?.workflows ?? [];

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        facts={facts}
        actions={
          canManage || canOpenLegal ? (
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <TitlesActions
                  projectId={project.id}
                  masterOptions={masterOptions}
                  artists={artists}
                />
              )}
              {/* Lots 11 and 12: each participation's contract, deal and
                  waivers, in the Juridique. */}
              {canOpenLegal && (
                <ViewLink
                  href={legalParticipationsHref(project.id)}
                  className={buttonVariants({ variant: "ghost" })}
                >
                  <ButtonRoll>{fr.legalParticipations.link}</ButtonRoll>
                </ViewLink>
              )}
            </div>
          ) : undefined
        }
      />
      <TitlesBoard
        projectId={project.id}
        titles={board.titles}
        dealReach={board.dealReach}
        canManage={canManage}
        artists={artists}
        masterOptions={masterOptions}
        links={{
          master: workflows.includes("master")
            ? routes.projectMaster(project.id)
            : null,
          distribution: workflows.includes("distribution")
            ? routes.projectRelease(project.id)
            : null,
        }}
      />
    </div>
  );
}
