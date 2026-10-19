import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { stepContext } from "@/lib/production/journey/context";
import { notFound, redirect } from "next/navigation";

import { ClosureSection } from "@/components/production/delivery/closure-section";
import { DecisionsSection } from "@/components/production/delivery/decisions-section";
import { ExportChecklistSection } from "@/components/production/delivery/export-checklist-section";
import { HandoffSection } from "@/components/production/delivery/handoff-section";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadClosureFacts } from "@/lib/production/delivery/closure-queries";
import {
  checkSince,
  decisionsOf,
  summarize,
} from "@/lib/production/delivery/rules";
import { loadProductionSheet } from "@/lib/production/sheet";
import { deliveryFor } from "@/lib/production/tab-data";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionDelivery;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Production › one deliverable › Livraison (ticket « Workflow
 * Production complet », parcours 19 to 21): the three decisions before
 * « Livré », the technical check of the exports, the transmission to
 * Activations. Written by the owner while the « production » stage runs;
 * read by whoever sees the project.
 */
export default async function ProductionDeliveryPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/delivery">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();
  if (!data.sheet)
    redirect(routes.projectProductionSheet(projectId, deliverableId));

  const tab = await deliveryFor(projectId, deliverableId, access);
  if (!tab) notFound();
  const closure = await loadClosureFacts(
    projectId,
    data.sheet.id,
    deliverableId,
    tab.handoffs.map((h) => h.id),
  );
  const since = checkSince(tab.delivery);
  const summary = summarize(tab.lines, since);
  const decisions = decisionsOf({
    approvedAt: tab.delivery?.approvedAt ?? null,
    checkedAt: tab.delivery?.checkedAt ?? null,
    deliveredAt: tab.delivery?.deliveredAt ?? null,
    summary,
  });
  const status = data.sheet.closedAt
    ? null
    : data.stageState !== "in_progress"
      ? t.locked
      : !data.canOrganize
        ? t.readOnly
        : null;

  const { step: journeyStep, steps: journeySteps } = await stepContext(
    projectId,
    deliverableId,
    "delivery",
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={journeyStep}
      steps={journeySteps}
    >
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <DecisionsSection
        projectId={projectId}
        deliverable={data.deliverable}
        data={tab}
        decisions={decisions}
        canOrganize={data.canOrganize}
      />
      <ExportChecklistSection
        projectId={projectId}
        sheetId={data.sheet.id}
        fiche={data.heritage.fiche}
        lines={tab.lines}
        since={since}
        canOrganize={data.canOrganize}
      />
      <HandoffSection
        projectId={projectId}
        sheetId={data.sheet.id}
        data={tab}
        fiche={data.heritage.fiche}
        canOrganize={data.canOrganize}
        members={data.members}
        recipientId={closure.assigneePersonId}
      />
      <ClosureSection
        projectId={projectId}
        sheetId={data.sheet.id}
        title={data.deliverable.title}
        data={tab}
        summary={summary}
        facts={closure}
        closed={
          data.sheet.closedAt
            ? { at: data.sheet.closedAt, by: data.sheet.closedBy }
            : null
        }
        canOrganize={data.canOrganize}
      />
    </ProductionStepPanel>
  );
}
