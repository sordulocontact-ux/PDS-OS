import { notFound } from "next/navigation";

import { ProjectBoard } from "@/components/overview/project-board";
import { AssignmentHistory } from "@/components/projects/assignment-history";
import { CreativeTeam } from "@/components/projects/creative-team";
import { ProjectAttention } from "@/components/projects/project-attention";
import { ProjectJourney } from "@/components/projects/project-journey";
import { UnlaunchedOverview } from "@/components/projects/unlaunched-overview";
import { FactList } from "@/components/ui/fact-list";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { loadLaunchedPlan } from "@/lib/plan/queries";
import { projectKindLabel } from "@/lib/projects/labels";
import { progressLabel } from "@/lib/projects/progress";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject, listAssignablePeople } from "@/lib/projects/queries";
import { DOUBLE_SIDEBAR, projectSections } from "@/lib/ui/project-sections";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Where a launched project opens. Until the Brief is validated: the Cadrage
 * and the stages. Then the Plan du projet to launch; once launched, the
 * overview of the ticket « Architecture globale »: the workflows side by
 * side, next actions, blockers, deadlines (ProjectBoard, read from the
 * workflows themselves; docs/ARCHITECTURE.md § 6 ter and § 8 ter).
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

  // Creative team: the director or the project's owner manages it.
  const canManageCreatives =
    can(access, "assign_projects") || canEditProject(access, project);
  const canTransmit = can(access, "assign_projects");
  const canEdit = canEditProject(access, project);
  const launched = project.stages.length > 0;
  const organizationId = access.organizationId;
  const framingState = project.stages.find((s) => s.key === "framing")?.state;
  const framingValidated = framingState === "validated";
  // Everything else in one round trip, each query only when it is shown.
  // The Cadrage's entry and the Plan du projet live in the Cadrage
  // (lot 2 « Projet complet »): the overview no longer shows them.
  const [creatives, creativeCandidates, people, plan, flows] =
    await Promise.all([
      listProjectCreatives(project.id),
      canManageCreatives && organizationId
        ? listCreativePeople(organizationId)
        : Promise.resolve([]),
      !launched && canTransmit && organizationId
        ? listAssignablePeople(organizationId)
        : Promise.resolve([]),
      framingValidated ? loadLaunchedPlan(project.id) : Promise.resolve(null),
      framingValidated ? loadWorkflowStates(project.id) : Promise.resolve(null),
    ]);

  const creativeTeam = (
    <CreativeTeam
      projectId={project.id}
      members={creatives}
      candidates={creativeCandidates}
      canManage={canManageCreatives}
    />
  );

  if (!launched) {
    return (
      <UnlaunchedOverview
        project={project}
        viewerPersonId={access.personId}
        canTransmit={canTransmit}
        people={people}
        creativeTeam={creativeTeam}
      />
    );
  }

  const t = fr.shell.project.overview;
  const facts: Array<[string, string]> = [
    [t.artist, project.artistName || t.notProvided],
    [
      t.type,
      projectKindLabel({
        type: project.type,
        musicFormat: project.musicFormat,
        contentFormatName: project.contentFormat?.name ?? null,
      }),
    ],
    [t.owner, project.ownerName ?? t.noOwner],
    [t.currentStage, progressLabel(project.currentStage)],
    [t.createdAt, dateFormatter.format(new Date(project.createdAt))],
  ];

  return (
    <div className="flex flex-col gap-10">
      {framingState === "awaiting_validation" && (
        <ProjectAttention
          projectId={project.id}
          state="awaiting"
          validatorName={null}
          planLaunchedAt={null}
        />
      )}
      {framingValidated && plan && flows && (
        <ProjectBoard
          project={project}
          flows={flows}
          today={todayInParis()}
          canLaunch={canEdit}
          plan={plan}
        />
      )}
      {framingValidated && !plan && (
        <ProjectAttention
          projectId={project.id}
          state="validated"
          validatorName={null}
          planLaunchedAt={null}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* The plan takes the stages' place once the Brief is validated. */}
          {!framingValidated && <ProjectJourney project={project} />}
          {creativeTeam}
          <AssignmentHistory assignments={project.assignments} />
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <section
            aria-labelledby="facts-title"
            className="flex flex-col gap-3"
          >
            <h2 id="facts-title" className="text-base font-medium">
              {t.facts}
            </h2>
            <FactList
              facts={facts.map(([label, value]) => ({ label, value }))}
            />
          </section>
          {/* The whole project's closing, apart from the Marketing closing
              (ticket « Suivi & bilan »). */}
          <ListCard title={fr.projectReview.title}>
            <CardRow
              href={routes.projectClosure(project.id)}
              main={fr.projectReview.stage}
              sub={
                project.stages.find((s) => s.key === "review")?.state ===
                "validated"
                  ? fr.projectReview.closed
                  : undefined
              }
            />
          </ListCard>
          {/* With tabs, the sections that have no tab are reached from here. */}
          {!DOUBLE_SIDEBAR && (
            <ListCard title={t.moreSections}>
              {projectSections(project.id, {
                legal: can(access, "manage_legal"),
              })
                .filter((section) => section.tabParent === "overview")
                .map((section) => (
                  <CardRow
                    key={section.key}
                    href={section.href}
                    main={section.label}
                  />
                ))}
            </ListCard>
          )}
        </div>
      </div>
    </div>
  );
}
