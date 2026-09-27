import { IconBox2 } from "nucleo-sharp-essential";

import { DeliverablesTable } from "@/components/project-plan/deliverables-table";
import { EditInStrategy } from "@/components/project-plan/edit-in-strategy";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { StatTiles } from "@/components/ui/stat-tiles";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadProjectPlan } from "@/lib/project-plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectPlan.deliverables;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

export default async function ProjectDeliverablesPage({
  params,
}: PageProps<"/app/projects/[projectId]/deliverables">) {
  const { projectId } = await params;
  const [access, project, { deliverables }] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadProjectPlan(projectId),
  ]);
  const count = (state: string) =>
    deliverables.filter((d) => d.state === state).length;

  return (
    <div className="grid gap-6">
      <ProjectPageHeader
        title={t.title}
        description={t.description}
        action={
          <EditInStrategy
            projectId={projectId}
            canEdit={canEditProject(access, project)}
          />
        }
      />
      {deliverables.length === 0 ? (
        <EmptyState icon={IconBox2} title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <>
          <StatTiles
            stats={[
              { label: t.stats.total, value: String(deliverables.length) },
              { label: t.stats.overdue, value: String(count("overdue")) },
              { label: t.stats.toStaff, value: String(count("to_staff")) },
              { label: t.stats.planned, value: String(count("planned")) },
            ]}
          />
          <DeliverablesTable deliverables={deliverables} />
        </>
      )}
    </div>
  );
}
