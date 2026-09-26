import { notFound } from "next/navigation";

import { AssignmentHistory } from "@/components/projects/assignment-history";
import { CreativeTeam } from "@/components/projects/creative-team";
import { StageStateBadge } from "@/components/projects/stage-state-badge";
import { UnlaunchedOverview } from "@/components/projects/unlaunched-overview";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject, listAssignablePeople } from "@/lib/projects/queries";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function ProjectOverviewPage({
  params,
}: PageProps<"/app/projects/[projectId]">) {
  const access = await requireApproved();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  // Creative team: the director or the project's owner manages it.
  const canManageCreatives =
    can(access, "assign_projects") || canEditProject(access, project);
  const [creatives, creativeCandidates] = await Promise.all([
    listProjectCreatives(project.id),
    canManageCreatives && access.organizationId
      ? listCreativePeople(access.organizationId)
      : Promise.resolve([]),
  ]);
  const creativeTeam = (
    <CreativeTeam
      projectId={project.id}
      members={creatives}
      candidates={creativeCandidates}
      canManage={canManageCreatives}
    />
  );

  if (project.stages.length === 0) {
    const canTransmit = can(access, "assign_projects");
    const people =
      canTransmit && access.organizationId
        ? await listAssignablePeople(access.organizationId)
        : [];
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
    [t.type, fr.shell.projectTypes[project.type]],
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
        <section aria-labelledby="stages-title" className="flex flex-col gap-3">
          <h2 id="stages-title" className="text-base font-medium">
            {t.stages}
          </h2>
          <ol className="divide-y divide-border rounded-xl border border-border">
            {project.stages.map((stage, index) => (
              <li
                key={stage.id}
                aria-current={
                  project.currentStage?.id === stage.id ? "step" : undefined
                }
                className="flex items-center justify-between gap-3 px-4 py-3 aria-[current=step]:bg-muted/50"
              >
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
              </li>
            ))}
          </ol>
        </section>
        {creativeTeam}
        <AssignmentHistory assignments={project.assignments} />
      </div>

      <section aria-labelledby="facts-title" className="flex flex-col gap-3">
        <h2 id="facts-title" className="text-base font-medium">
          {t.facts}
        </h2>
        <dl className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
