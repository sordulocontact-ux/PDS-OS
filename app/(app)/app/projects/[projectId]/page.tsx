import { notFound } from "next/navigation";

import { DependencyRows } from "@/components/overview/dependency-rows";
import { FramingDeliverable } from "@/components/overview/framing-deliverable";
import { OverviewNow } from "@/components/overview/overview-now";
import { OverviewProgress } from "@/components/overview/overview-progress";
import { ProjectInfoButton } from "@/components/overview/project-info-button";
import { CreativeTeam } from "@/components/projects/creative-team";
import { HandoverFacts } from "@/components/projects/handover-facts";
import { ProjectCover } from "@/components/projects/project-cover";
import { ProjectCoverEdit } from "@/components/projects/project-cover-edit";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectTitles } from "@/components/projects/project-titles";
import { UnlaunchedOverview } from "@/components/projects/unlaunched-overview";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { BlockFact } from "@/components/ui/fact-block";
import { ViewLink } from "@/components/ui/view-link";
import { can, type Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { workflowCards } from "@/lib/overview/cards";
import { overviewDependencies } from "@/lib/overview/dependencies";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { planLaunchedAt } from "@/lib/plan/queries";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectCoverUrls } from "@/lib/projects/covers";
import { projectKindLabel } from "@/lib/projects/labels";
import { getProject, listAssignablePeople } from "@/lib/projects/queries";
import { loadProjectTitles } from "@/lib/projects/titles";
import type { ProjectDetail } from "@/lib/projects/types";
import { projectCollectiveHue } from "@/lib/ui/category-hues";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

/**
 * Where a project opens (retour d'Akili du 05/11/2026, proto « Vue
 * d'ensemble » validated by Sacha 10/11): its cover, name and « Artiste ·
 * Type », « Informations » as a quiet action; then two zones, one title
 * each — « Maintenant » (the viewer's first action, the Cadrage first) and
 * « Progression » (the Cadrage's steps before « Lancer le plan », the
 * workflows after); then the Cadrage's deliverable, or once launched what
 * one workflow hands another. No state pills, no rules between sections.
 * Everything read from the journeys and the workflows (docs/ARCHITECTURE.md
 * § 3 ter, § 8 ter), nothing stored. A project not accepted yet shows its
 * one gesture and what is transmitted (UnlaunchedOverview).
 */
export default async function ProjectOverviewPage({
  params,
}: PageProps<"/app/projects/[projectId]">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    getProject(projectId),
  ]);
  if (!project) notFound();

  if (project.stages.length === 0) {
    const canTransmit = can(access, "assign_projects");
    const canManage = canTransmit || canEditProject(access, project);
    const [creatives, candidates, people, covers, titles] = await Promise.all([
      listProjectCreatives(project.id),
      canManage && access.organizationId
        ? listCreativePeople(access.organizationId)
        : Promise.resolve([]),
      canTransmit && access.organizationId
        ? listAssignablePeople(access.organizationId)
        : Promise.resolve([]),
      projectCoverUrls([coverSource(project)], "full"),
      collectiveTitles(project, access),
    ]);
    return (
      <UnlaunchedOverview
        project={project}
        viewerPersonId={access.personId}
        canTransmit={canTransmit}
        people={people}
        creatives={creatives}
        subtitle={projectSubtitle(project)}
        status={collectiveStatus(project)}
        cover={
          <OverviewCover
            project={project}
            url={covers.get(project.id) ?? null}
            // Before acceptance, the direction (create_projects) changes it.
            organizationId={
              can(access, "create_projects") ? access.organizationId : null
            }
          />
        }
        creativeTeam={
          <CreativeTeam
            projectId={project.id}
            members={creatives}
            candidates={candidates}
            canManage={canManage}
          />
        }
        titles={titles}
      />
    );
  }

  const [all, flows, launchedAt, creatives, covers, titles] = await Promise.all(
    [
      loadShellJourneys(project.id),
      loadWorkflowStates(project.id),
      planLaunchedAt(project.id),
      listProjectCreatives(project.id),
      projectCoverUrls([coverSource(project)], "full"),
      collectiveTitles(project, access),
    ],
  );
  const framing =
    all.journeys.find((journey) => journey.module === "framing")?.steps ?? [];
  const brief = framing.find((step) => step.key === "brief");
  const deps =
    launchedAt && flows ? await overviewDependencies(project, flows, all) : [];
  // A launched project: only its owner writes (is_project_owner).
  const canEditCover = canEditProject(access, project);
  const t = fr.projectShell.overview;

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={project.id}
        title={project.title}
        subtitle={projectSubtitle(project)}
        status={collectiveStatus(project)}
        media={
          <OverviewCover
            project={project}
            url={covers.get(project.id) ?? null}
            organizationId={canEditCover ? access.organizationId : null}
          />
        }
        actions={
          <>
            <ProjectInfoButton>
              <div className="flex flex-col gap-5">
                {canEditCover && access.organizationId && (
                  <ProjectCoverEdit
                    organizationId={access.organizationId}
                    projectId={project.id}
                    hasCover={project.coverPath !== null}
                    variant="buttons"
                  />
                )}
                <HandoverFacts
                  project={project}
                  creatives={creatives}
                  head={
                    project.ownerName ? (
                      <BlockFact label={t.owner}>{project.ownerName}</BlockFact>
                    ) : undefined
                  }
                />
              </div>
            </ProjectInfoButton>
            {/* The whole project's closing (ticket « Suivi & bilan »), apart
                from the Marketing's: not in the proto, kept reachable here. */}
            {launchedAt && (
              <ViewLink
                href={routes.projectClosure(project.id)}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ButtonRoll>{fr.projectReview.stage}</ButtonRoll>
              </ViewLink>
            )}
          </>
        }
      />
      {/* Two zones, one title each (retour d'Akili du 05/11/2026, proto
          « Vue d'ensemble » validated 10/11): what the viewer does now,
          where the project stands. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <OverviewNow mine={all.mine} waiting={all.waiting} />
        {launchedAt && flows ? (
          <OverviewProgress
            workflows={workflowCards({
              projectId: project.id,
              workflows: flows.workflows,
              states: flows.states,
              journeys: all,
            })}
          />
        ) : (
          <OverviewProgress framing={framing} />
        )}
      </div>
      {titles}
      {launchedAt && flows ? (
        <DependencyRows deps={deps} />
      ) : (
        brief && <FramingDeliverable brief={brief} />
      )}
    </div>
  );
}

/** « Mona Lys · Single »: who and what, under the project's name. */
function projectSubtitle(project: ProjectDetail): string {
  return [
    project.artistName,
    projectKindLabel({
      type: project.type,
      musicFormat: project.musicFormat,
      contentFormatName: project.contentFormat?.name ?? null,
    }),
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The titles of a collective and their artists (docs/pds-mic-plan.md, lots
 * 2 and 3), the minimal list until the « Titres et artistes » view (lot 6);
 * nothing for any other project. Written by its owner once launched, by
 * whoever creates projects before (same rule as add_project_title and
 * add_title_participation, which enforce it).
 */
async function collectiveTitles(project: ProjectDetail, access: Access) {
  if (!project.collective) return null;
  const canManage =
    canEditProject(access, project) ||
    (project.stages.length === 0 && can(access, "create_projects"));
  const [titles, masters, artists] = await Promise.all([
    loadProjectTitles(project.id),
    canManage ? listMasterOptions() : Promise.resolve([]),
    canManage ? listArtistOptions() : Promise.resolve([]),
  ]);
  const inProject = new Set(titles.map((title) => title.master?.id));
  const masterOptions = Object.fromEntries(
    masters
      .filter((master) => !inProject.has(master.id))
      .map((master) => [
        master.id,
        master.artists ? `${master.title} · ${master.artists}` : master.title,
      ]),
  );
  return (
    <ProjectTitles
      projectId={project.id}
      titles={titles}
      canManage={canManage}
      masterOptions={masterOptions}
      artists={{
        options: Object.fromEntries(artists.map((a) => [a.id, a.name])),
        mainArtistId: project.artistId,
      }}
    />
  );
}

/** « Projet collectif » on the right of the project's name (lot 1 of
 * docs/pds-mic-plan.md); nothing for any other project. */
function collectiveStatus(project: ProjectDetail) {
  return project.collective
    ? { label: fr.shell.projectCollective, tone: projectCollectiveHue }
    : undefined;
}

/** What the cover is read from: its image, else its first title's. */
function coverSource(project: ProjectDetail) {
  return {
    id: project.id,
    coverPath: project.coverPath,
    firstMasterId: project.masters[0]?.id ?? null,
  };
}

/** The cover at the head, with its button for whoever may change it
 * (`organizationId` given: can_edit_project_cover). */
function OverviewCover({
  project,
  url,
  organizationId,
}: {
  project: ProjectDetail;
  url: string | null;
  organizationId: string | null;
}) {
  return (
    <ProjectCover title={project.title} url={url} className="group/cover">
      {organizationId && (
        <ProjectCoverEdit
          organizationId={organizationId}
          projectId={project.id}
          hasCover={project.coverPath !== null}
        />
      )}
    </ProjectCover>
  );
}
