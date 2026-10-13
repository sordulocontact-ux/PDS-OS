import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { ResponsiblePicker } from "@/components/design/people/responsible-picker";
import { ConsolidationPanel } from "@/components/design/work/consolidation-panel";
import { ImportBriefDialog } from "@/components/design/work/import-brief-dialog";
import { IntentionQuestions } from "@/components/design/work/intention-questions";
import { KnownFacts } from "@/components/design/work/known-facts";
import {
  TargetProposals,
  UnassignedProposals,
} from "@/components/design/work/proposals";
import { ReferenceDialog } from "@/components/design/work/reference-dialog";
import { ReferencesList } from "@/components/design/work/references-list";
import { TargetVersions } from "@/components/design/work/target-versions";
import {
  TargetBadges,
  WorkTargets,
} from "@/components/design/work/work-targets";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadConception } from "@/lib/design/conception";
import {
  consolidationPanelData,
  loadConsolidation,
} from "@/lib/design/consolidation";
import { directionImpacts } from "@/lib/design/direction-impacts";
import { loadDesignPeople } from "@/lib/design/people";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import {
  DESIGN_TOPICS,
  DIRECTION_KEY,
  isDesignTopic,
} from "@/lib/design/intentions";
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
 * then the four questions, answered like the Stratégie's (?q= unfolds
 * one); references and an existing
 * brief are added from inside the work.
 */
export default async function DesignWorkPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/design/work">) {
  const { projectId } = await params;
  const { d: asked, q: topic } = await searchParams;
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
  const [consolidation, people, sheets] = await Promise.all([
    loadConsolidation(projectId, data),
    loadDesignPeople(projectId, data.organizationId, access),
    typeof asked === "string" && asked !== DIRECTION_KEY
      ? []
      : loadSheetSummaries(projectId),
  ]);

  const t = fr.conceptionWork;
  const fallback =
    data.deliverables.find(
      (d) =>
        d.status === "confirmed" &&
        d.answered + d.inherited < DESIGN_TOPICS.length,
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
      <div className="flex min-w-0 flex-col gap-10">
        <header className="flex flex-col gap-3">
          <WorkTargets projectId={projectId} data={data} current={current} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
            <h2 className="text-display-sm font-semibold break-words">
              {title}
            </h2>
            <TargetBadges
              data={data}
              current={current}
              state={consolidation.states[current]}
            />
          </div>
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
          <IntentionQuestions
            projectId={projectId}
            deliverable={deliverable}
            confirmed={confirmed}
            inherited={Object.fromEntries(
              data.intentions
                .filter(
                  (i) => i.status === "confirmed" && i.target === "direction",
                )
                .map((i) => [i.topic, i.value]),
            )}
            current={isDesignTopic(topic) ? topic : null}
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
            {...(deliverable
              ? {}
              : {
                  impacts: directionImpacts(
                    data,
                    consolidation.confirmations[DIRECTION_KEY]?.snapshot.map(
                      (x) => x.intention_id,
                    ) ?? null,
                    sheets,
                  ),
                  history: consolidation.directionHistory.map((h) => ({
                    byName:
                      people.members.find((m) => m.personId === h.confirmedBy)
                        ?.name ?? "",
                    at: h.confirmedAt,
                  })),
                })}
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

        {/* MKT-C2-06: the release's direction is a decision, not a
            deliverable — no versions to deposit for it. */}
        {deliverable?.strategyDeliverableId && (
          <TargetVersions
            design={design}
            projectId={projectId}
            strategyDeliverableId={deliverable.strategyDeliverableId}
            title={title}
          />
        )}
      </div>
    </div>
  );
}
