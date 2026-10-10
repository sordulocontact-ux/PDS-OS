import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { ResponsiblePicker } from "@/components/design/people/responsible-picker";
import { ConsolidationPanel } from "@/components/design/work/consolidation-panel";
import { ImportBriefDialog } from "@/components/design/work/import-brief-dialog";
import { IntentionThread } from "@/components/design/work/intention-thread";
import { KnownFacts } from "@/components/design/work/known-facts";
import {
  TargetProposals,
  UnassignedProposals,
} from "@/components/design/work/proposals";
import { ReferenceDialog } from "@/components/design/work/reference-dialog";
import { ReferencesList } from "@/components/design/work/references-list";
import { TargetVersions } from "@/components/design/work/target-versions";
import { WorkTargets } from "@/components/design/work/work-targets";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadConception } from "@/lib/design/conception";
import {
  consolidationPanelData,
  loadConsolidation,
} from "@/lib/design/consolidation";
import { loadDesignPeople } from "@/lib/design/people";
import { DESIGN_TOPICS, DIRECTION_KEY } from "@/lib/design/intentions";
import { loadDesign } from "@/lib/design/queries";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionWork.title} · ${fr.app.name}`,
};

/**
 * The Conception's direct work (ticket « Conception », Chemin B): one target
 * at a time (?d= a deliverable, or the direction). PO shows what the
 * Stratégie and the Cadrage already say, its proposals read in a source,
 * then asks only the questions still open; references and an existing
 * brief are added from inside the work.
 */
export default async function DesignWorkPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/design/work">) {
  const { projectId } = await params;
  const asked = (await searchParams).d;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!isStageValidated(project.stages, "launch_strategy"))
    return (
      <DesignNeedsStrategy
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  const [data, design] = await Promise.all([
    loadConception(project, access),
    loadDesign(projectId, access),
  ]);
  if (!data || !design) notFound();
  if (!data.started) redirect(routes.projectDesign(projectId));
  const [consolidation, people] = await Promise.all([
    loadConsolidation(projectId, data),
    loadDesignPeople(projectId, data.organizationId, access),
  ]);

  const t = fr.conceptionWork;
  const fallback =
    data.deliverables.find(
      (d) => d.status === "confirmed" && d.answered < DESIGN_TOPICS.length,
    )?.id ?? DIRECTION_KEY;
  const deliverable =
    data.deliverables.find(
      (d) => d.id === (typeof asked === "string" ? asked : fallback),
    ) ?? null;
  const current = deliverable ? deliverable.id : DIRECTION_KEY;
  const deliverableId = deliverable?.id ?? null;
  const title = deliverable?.title ?? t.targets.direction;
  // The owner confirms and designates, while the Conception is in progress.
  const owner = data.isOwner && data.stage?.state === "in_progress";
  const confirmed = data.intentions.filter(
    (i) =>
      i.status === "confirmed" &&
      (deliverable
        ? i.target === "deliverable" && i.deliverableId === deliverable.id
        : i.target === "direction"),
  );

  return (
    <div className="flex flex-col gap-6 pt-6">
      <ConceptionTabs projectId={projectId} />
      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <WorkTargets
            projectId={projectId}
            data={data}
            current={current}
            states={consolidation.states}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-3">
            <h2 className="text-display-sm font-semibold break-words">
              {title}
            </h2>
            <p className="max-w-prose text-body-md text-muted-foreground">
              {data.canWrite ? t.intro : t.readOnly}
            </p>
            {data.canWrite && (
              <div className="flex flex-wrap gap-2">
                <ReferenceDialog
                  projectId={projectId}
                  deliverableId={deliverableId}
                />
                <ImportBriefDialog projectId={projectId} />
              </div>
            )}
          </header>

          <ResponsiblePicker
            projectId={projectId}
            scope="direction"
            sheetId={null}
            current={people.direction.responsible}
            members={people.members}
            suggestions={people.suggestions}
            canAssign={owner}
          />

          <UnassignedProposals data={data} projectId={projectId} />

          <div className="flex flex-col gap-5">
            <KnownFacts
              known={data.known}
              deliverable={deliverable}
              deliverableCount={data.deliverables.length}
            />
            <TargetProposals
              data={data}
              projectId={projectId}
              deliverableId={deliverableId}
            />
            <IntentionThread
              key={current}
              projectId={projectId}
              deliverableId={deliverableId}
              title={deliverable ? deliverable.title : null}
              confirmed={confirmed}
              canWrite={data.canWrite}
            />
            <ConsolidationPanel
              projectId={projectId}
              {...consolidationPanelData(
                data,
                consolidation,
                people.members,
                current,
              )}
              canConfirm={owner}
            />
          </div>

          <PageSection id="design-references" title={t.references.title}>
            <ReferencesList
              projectId={projectId}
              references={data.references.filter((r) =>
                r.links.some((l) => l.deliverableId === deliverableId),
              )}
              canWrite={data.canWrite}
            />
          </PageSection>

          {(!deliverable || deliverable.strategyDeliverableId) && (
            <TargetVersions
              design={design}
              projectId={projectId}
              strategyDeliverableId={deliverable?.strategyDeliverableId ?? null}
              title={title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
