import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { stepContext } from "@/lib/production/journey/context";
import { notFound, redirect } from "next/navigation";

import { ClosureSection } from "@/components/production/delivery/closure-section";
import { DecisionsSection } from "@/components/production/delivery/decisions-section";
import { ExportChecklistSection } from "@/components/production/delivery/export-checklist-section";
import { HandoffSection } from "@/components/production/delivery/handoff-section";
import { LightDeliveryStep } from "@/components/production/light/light-steps";
import { DeliverForm } from "@/components/production/delivery/deliver-form";
import { recipientOptions } from "@/lib/production/delivery/recipients";
import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { loadLightFacts } from "@/lib/production/light/queries";
import { trackOf } from "@/lib/production/track";
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
  // A cover or teasers drawn from the clip: the light journey's Livraison.
  const ctx = await stepContext(projectId, deliverableId, "delivery");
  const light = ctx.data.sheet;
  if (
    light &&
    trackOf(ctx.data.deliverable.title, light.derivedFromSheetId) !== "shoot"
  ) {
    const [facts, closure, creativeId] = await Promise.all([
      loadLightFacts(light.id, deliverableId, light.derivedFromSheetId),
      loadClosureFacts(projectId, light.id, deliverableId, []),
      firstCreative(projectId),
    ]);
    const assignee = ctx.data.members.find(
      (m) => m.personId === (closure.assigneePersonId ?? creativeId),
    );
    return (
      <ProductionStepPanel
        projectId={projectId}
        deliverableId={deliverableId}
        step={ctx.step}
        steps={ctx.steps}
      >
        <LightDeliveryStep
          projectId={projectId}
          data={ctx.data}
          facts={facts}
          viewerId={ctx.access.personId}
          activations={
            assignee ? { id: assignee.personId, name: assignee.name } : null
          }
        />
      </ProductionStepPanel>
    );
  }
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
  const recipientsFacts = await loadLightFacts(
    data.sheet.id,
    deliverableId,
    data.sheet.derivedFromSheetId,
  );
  const r = fr.productionLight.recipients;
  const creativeId = await firstCreative(projectId);
  // Activations: whom the deliverable is entrusted to, else the project's
  // creative side (proto: « Nadia Benali · Activations »).
  const assignee = data.members.find(
    (m) => m.personId === (closure.assigneePersonId ?? creativeId),
  );
  const deliveredTo = recipientsFacts.recipients.find(
    (x) => x.purpose === "activations" && x.personId,
  );
  const owner =
    data.ownerPersonId && data.ownerName
      ? { id: data.ownerPersonId, name: data.ownerName }
      : null;
  const creativeExt = data.sheet.creativeExt;
  const deliver =
    data.ownerPersonId === access.personId &&
    data.stageState === "in_progress" &&
    !data.sheet.closedAt ? (
      <DeliverForm
        projectId={projectId}
        sheetId={data.sheet.id}
        viewerId={access.personId}
        handOff={false}
        formats={[]}
        options={recipientOptions({
          distribution: owner,
          activations: assignee
            ? { id: assignee.personId, name: assignee.name }
            : null,
          validation: creativeExt?.kind === "contact" ? creativeExt : null,
          members: data.members.map((m) => ({ id: m.personId, name: m.name })),
          labels: {
            distribution: r.purposes.distribution,
            activations: r.purposes.activations,
            validation: r.purposes.validation,
          },
        })}
      />
    ) : undefined;
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
        deliver={deliver}
        recipients={recipientsFacts.recipients.map((x) =>
          x.purpose ? `${x.name} · ${r.purposes[x.purpose]}` : x.name,
        )}
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
        recipientId={
          deliveredTo?.personId ?? closure.assigneePersonId ?? creativeId
        }
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

/** The project's first creative director, who follows the Activations
 * when nobody else was named. */
async function firstCreative(projectId: string): Promise<string | null> {
  const { data } = await (
    await createClient()
  )
    .from("project_creatives")
    .select("person_id")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();
  return data?.person_id ?? null;
}
