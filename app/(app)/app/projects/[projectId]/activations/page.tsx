import { IconLayers } from "nucleo-sharp-essential";

import { ActivationHandoffsSection } from "@/components/production/delivery/activation-handoffs-section";
import { EditInStrategy } from "@/components/project-plan/edit-in-strategy";
import { LeverList } from "@/components/project-plan/lever-list";
import { ProjectPageActions } from "@/components/projects/project-page-actions";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatTiles } from "@/components/ui/stat-tiles";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { LEVER_FAMILIES, loadProjectPlan } from "@/lib/project-plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectPlan.activations;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// The launch set-up, family by family (docs/CONTEXTE-PROJET.md § 4): what
// is selected, still to decide or set aside. Written in the Strategy.
export default async function ProjectActivationsPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations">) {
  const { projectId } = await params;
  const [access, project, { levers, deliverables }] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadProjectPlan(projectId),
  ]);
  const count = (state: string) =>
    levers.filter((l) => l.state === state).length;

  return (
    <div className="grid gap-6">
      <ProjectPageActions>
        {
          <EditInStrategy
            projectId={projectId}
            canEdit={canEditProject(access, project)}
          />
        }
      </ProjectPageActions>
      <ActivationHandoffsSection projectId={projectId} access={access} />
      {levers.length === 0 ? (
        <EmptyState icon={IconLayers} title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <>
          <StatTiles
            stats={[
              { label: t.stats.selected, value: String(count("selected")) },
              { label: t.stats.toDecide, value: String(count("to_decide")) },
              { label: t.stats.rejected, value: String(count("rejected")) },
              {
                label: t.stats.deliverables,
                value: String(deliverables.length),
              },
            ]}
          />
          {LEVER_FAMILIES.map((family) => (
            <PageSection
              key={family}
              id={`family-${family}`}
              title={fr.framing.needs.families[family]}
            >
              <LeverList levers={levers.filter((l) => l.family === family)} />
            </PageSection>
          ))}
        </>
      )}
    </div>
  );
}
