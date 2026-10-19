import { notFound } from "next/navigation";

import { BeforeWorkflows } from "@/components/overview/before-workflows";
import { DependencyRows } from "@/components/overview/dependency-rows";
import { WorkflowCards } from "@/components/overview/workflow-cards";
import { CreativeTeam } from "@/components/projects/creative-team";
import { ProjectHeader } from "@/components/projects/project-header";
import { UnlaunchedOverview } from "@/components/projects/unlaunched-overview";
import { NowCard } from "@/components/shell/journey/now-card";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { workflowCards } from "@/lib/overview/cards";
import { overviewDependencies } from "@/lib/overview/dependencies";
import { overviewHead } from "@/lib/overview/head";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { planLaunchedAt } from "@/lib/plan/queries";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectHeaderData } from "@/lib/projects/header";
import { getProject, listAssignablePeople } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

/**
 * Where a project opens (proto « Projet complet », host.js `overview()`):
 * its name and state, its facts, « Maintenant » (every action of the
 * viewer, the Cadrage first), then before « Lancer le plan » where the
 * Cadrage stands, after it the workflows and what one hands another.
 * Everything read from the journeys and the workflows (docs/ARCHITECTURE.md
 * § 3 ter, § 8 ter), nothing stored. A project not accepted yet keeps its
 * handover page.
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
    const [creatives, candidates, people] = await Promise.all([
      listProjectCreatives(project.id),
      canManage && access.organizationId
        ? listCreativePeople(access.organizationId)
        : Promise.resolve([]),
      canTransmit && access.organizationId
        ? listAssignablePeople(access.organizationId)
        : Promise.resolve([]),
    ]);
    return (
      <UnlaunchedOverview
        project={project}
        viewerPersonId={access.personId}
        canTransmit={canTransmit}
        people={people}
        creativeTeam={
          <CreativeTeam
            projectId={project.id}
            members={creatives}
            candidates={candidates}
            canManage={canManage}
          />
        }
      />
    );
  }

  const [all, flows, launchedAt, header] = await Promise.all([
    loadShellJourneys(project.id),
    loadWorkflowStates(project.id),
    planLaunchedAt(project.id),
    projectHeaderData(project.id),
  ]);
  if (!header) notFound();
  const head = overviewHead(project, header, flows, launchedAt);
  const framing =
    all.journeys.find((journey) => journey.module === "framing")?.steps ?? [];
  const deps =
    launchedAt && flows ? await overviewDependencies(project, flows, all) : [];

  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={project.id}
        title={project.title}
        status={head.status}
        facts={head.facts}
        actions={
          // The whole project's closing (ticket « Suivi & bilan »), apart
          // from the Marketing's: not in the proto, kept reachable here.
          launchedAt ? (
            <ViewLink
              href={routes.projectClosure(project.id)}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {fr.projectReview.stage}
            </ViewLink>
          ) : undefined
        }
      />
      <NowCard
        steps={[]}
        viewerName={null}
        variant="overview"
        elsewhere={all.mine.map((a) => ({ step: a.step, place: a.place }))}
      />
      {launchedAt && flows ? (
        <>
          <WorkflowCards
            cards={workflowCards({
              projectId: project.id,
              workflows: flows.workflows,
              states: flows.states,
              journeys: all,
            })}
          />
          <DependencyRows deps={deps} />
        </>
      ) : (
        <>
          {/* The Plan du projet is the Cadrage's fourth step (lot 2). */}
          <BeforeWorkflows projectId={project.id} steps={framing} />
        </>
      )}
    </div>
  );
}
