import { notFound } from "next/navigation";

import { FramingEntry } from "@/components/framing/intel/framing-entry";
import { ProjectBoard } from "@/components/overview/project-board";
import { ProjectPlanSection } from "@/components/plan/project-plan-section";
import { AssignmentHistory } from "@/components/projects/assignment-history";
import { CreativeTeam } from "@/components/projects/creative-team";
import { ProjectAttention } from "@/components/projects/project-attention";
import { ProjectJourney } from "@/components/projects/project-journey";
import { UnlaunchedOverview } from "@/components/projects/unlaunched-overview";
import { FactList } from "@/components/ui/fact-list";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { assessFraming } from "@/lib/framing/assess";
import { callSheetData } from "@/lib/framing/call-sheet-data";
import { framingStarted, loadFramingKnowledge } from "@/lib/framing/knowledge";
import { isFramingOpen } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";
import { proposePlan } from "@/lib/plan/propose";
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
  const framingWorking =
    framingState === "not_started" || framingState === "in_progress";
  const framingValidated = framingState === "validated";
  // Everything else in one round trip, each query only when it is shown.
  const [creatives, creativeCandidates, people, framingOpen, knowledge, plan] =
    await Promise.all([
      listProjectCreatives(project.id),
      canManageCreatives && organizationId
        ? listCreativePeople(organizationId)
        : Promise.resolve([]),
      !launched && canTransmit && organizationId
        ? listAssignablePeople(organizationId)
        : Promise.resolve([]),
      // First thing to do once launched: a call, the framing starts from it.
      launched ? isFramingOpen(project.id) : Promise.resolve(false),
      // What PO found already known, for the entry of the Cadrage.
      launched && !framingValidated
        ? loadFramingKnowledge(project.id, access)
        : Promise.resolve(null),
      framingValidated ? loadLaunchedPlan(project.id) : Promise.resolve(null),
    ]);
  // Second round, only for what the first one says is shown: the plan to
  // propose (from the validated Cadrage), or the workflows once it runs
  // (shared with the layout's reading in this request).
  const [proposalKnowledge, flows] = await Promise.all([
    framingValidated && !plan
      ? loadFramingKnowledge(project.id, access)
      : Promise.resolve(null),
    plan ? loadWorkflowStates(project.id) : Promise.resolve(null),
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
      {knowledge && framingWorking && (
        <FramingEntry
          projectId={project.id}
          assessment={assessFraming(knowledge)}
          acceptedAt={knowledge.acceptedAt}
          ownerName={project.ownerName}
          started={framingOpen && framingStarted(knowledge)}
          canEdit={canEdit}
          callSheet={callSheetData(knowledge, assessFraming(knowledge))}
        />
      )}
      {framingState === "awaiting_validation" && (
        <ProjectAttention
          projectId={project.id}
          state="awaiting"
          validatorName={
            knowledge?.framing.pendingValidation?.validatorName ?? null
          }
          planLaunchedAt={null}
        />
      )}
      {framingValidated && plan && flows && (
        <ProjectBoard
          project={project}
          flows={flows}
          today={todayInParis()}
          canLaunch={canEdit}
        />
      )}
      {framingValidated && !plan && (
        <>
          <ProjectAttention
            projectId={project.id}
            state="validated"
            validatorName={null}
            planLaunchedAt={null}
          />
          <ProjectPlanSection
            projectId={project.id}
            canEdit={canEdit}
            launched={null}
            proposal={
              proposalKnowledge
                ? {
                    items: proposePlan(proposalKnowledge),
                    members: proposalKnowledge.framing.members,
                  }
                : null
            }
          />
        </>
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
