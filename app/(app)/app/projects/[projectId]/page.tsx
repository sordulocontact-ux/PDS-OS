import Link from "next/link";
import { notFound } from "next/navigation";

import { FramingEntry } from "@/components/framing/intel/framing-entry";
import { ProjectAttention } from "@/components/projects/project-attention";
import { AssignmentHistory } from "@/components/projects/assignment-history";
import { CreativeTeam } from "@/components/projects/creative-team";
import { StageStateBadge } from "@/components/projects/stage-state-badge";
import { UnlaunchedOverview } from "@/components/projects/unlaunched-overview";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { assessFraming } from "@/lib/framing/assess";
import { callSheetData } from "@/lib/framing/call-sheet-data";
import { framingStarted, loadFramingKnowledge } from "@/lib/framing/knowledge";
import { isFramingOpen } from "@/lib/framing/queries";
import { loadLaunchedPlan } from "@/lib/plan/queries";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject, listAssignablePeople } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { FactList } from "@/components/ui/fact-list";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { DOUBLE_SIDEBAR, projectSections } from "@/lib/ui/project-sections";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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
  const launched = project.stages.length > 0;
  const organizationId = access.organizationId;
  // Everything else in one round trip, each query only when it is shown.
  const framingState = project.stages.find((s) => s.key === "framing")?.state;
  const framingWorking =
    framingState === "not_started" || framingState === "in_progress";
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
      launched && framingState !== "validated"
        ? loadFramingKnowledge(project.id, access)
        : Promise.resolve(null),
      framingState === "validated"
        ? loadLaunchedPlan(project.id)
        : Promise.resolve(null),
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
    [
      t.currentStage,
      project.currentStage?.label ?? fr.shell.projects.allValidated,
    ],
    [t.createdAt, dateFormatter.format(new Date(project.createdAt))],
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-8">
        {knowledge && framingWorking && (
          <FramingEntry
            projectId={project.id}
            assessment={assessFraming(knowledge)}
            acceptedAt={knowledge.acceptedAt}
            ownerName={project.ownerName}
            started={framingOpen && framingStarted(knowledge)}
            canEdit={canEditProject(access, project)}
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
            canEdit={canEditProject(access, project)}
          />
        )}
        {framingState === "validated" && (
          <ProjectAttention
            projectId={project.id}
            state="validated"
            validatorName={null}
            planLaunchedAt={plan?.launchedAt ?? null}
            canEdit={canEditProject(access, project)}
          />
        )}
        <section aria-labelledby="stages-title" className="flex flex-col gap-3">
          <h2 id="stages-title" className="text-base font-medium">
            {t.stages}
          </h2>
          <ol className="flex flex-col gap-1 rounded-xl border border-border p-1">
            {project.stages.map((stage, index) => {
              const href =
                stage.key === "framing"
                  ? routes.projectFraming(project.id)
                  : stage.key === "launch_strategy"
                    ? routes.projectStrategy(project.id)
                    : stage.key === "design"
                      ? routes.projectDesign(project.id)
                      : null;
              const content = (
                <>
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="w-4 shrink-0 text-sm text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {stage.label}
                      </span>
                      {stage.stateChangedAt && (
                        <span className="text-xs text-muted-foreground">
                          {t.changedAt}{" "}
                          {dateFormatter.format(new Date(stage.stateChangedAt))}
                        </span>
                      )}
                    </span>
                  </span>
                  <StageStateBadge state={stage.state} />
                </>
              );
              const current = project.currentStage?.id === stage.id;
              return (
                <li key={stage.id}>
                  {href ? (
                    <Link
                      href={href}
                      aria-current={current ? "step" : undefined}
                      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 no-underline hover:bg-muted/50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      aria-current={current ? "step" : undefined}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
        {creativeTeam}
        <AssignmentHistory assignments={project.assignments} />
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <section aria-labelledby="facts-title" className="flex flex-col gap-3">
          <h2 id="facts-title" className="text-base font-medium">
            {t.facts}
          </h2>
          <FactList facts={facts.map(([label, value]) => ({ label, value }))} />
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
  );
}
