import { FormMessage } from "@/components/auth/form-message";
import { AddTaskForm } from "@/components/project-work/add-task-form";
import { WorkBoard } from "@/components/project-work/work-board";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { StatTiles } from "@/components/ui/stat-tiles";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadProjectWork } from "@/lib/project-work/queries";
import { countWork, WORK_STATUSES } from "@/lib/project-work/workload";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.projectWork.work.title} · ${fr.app.name}`,
};

// The work of everyone on the project (docs/ARCHITECTURE.md § 8): statuses
// and counts are computed by code (lib/project-work), never by PO.
export default async function ProjectWorkPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/work">) {
  const [{ projectId }, { person }] = await Promise.all([params, searchParams]);
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const work = await loadProjectWork(project, access);
  const counts = countWork(work.items);
  const t = fr.projectWork.work;

  return (
    <div className="grid gap-6">
      <ProjectPageHeader
        title={t.title}
        description={t.description}
        action={
          canEditProject(access, project) && (
            <AddTaskForm
              projectId={project.id}
              members={work.members}
              defaultAssignee={access.personId}
            />
          )
        }
      />

      {work.error && <FormMessage kind="error">{t.loadError}</FormMessage>}

      <StatTiles
        stats={WORK_STATUSES.map((status) => ({
          label: t.stats[status],
          value: String(counts[status]),
        }))}
      />

      <WorkBoard
        people={work.people}
        items={work.items}
        names={work.names}
        projectId={project.id}
        mePersonId={access.personId}
        initialPerson={typeof person === "string" ? person : null}
      />

      <ListCard
        title={t.toDecide}
        count={work.openPoints.length}
        empty={work.openPoints.length ? undefined : t.toDecideEmpty}
      >
        {work.openPoints.map((p) => (
          <CardRow
            key={p.id}
            href={routes.projectFraming(project.id)}
            main={p.question}
          />
        ))}
      </ListCard>
    </div>
  );
}
