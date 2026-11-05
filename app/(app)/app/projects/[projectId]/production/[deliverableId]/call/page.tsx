import {
  CallStepHead,
  CallStepSummary,
} from "@/components/production/journey/call-step";
import { DirectorBlock } from "@/components/production/journey/director-block";
import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { PlanSection } from "@/components/production/preprod/plan-section";
import { TeamBriefsSection } from "@/components/production/preprod/team-briefs-section";
import { TechnicalCallSection } from "@/components/production/preprod/technical-call-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import {
  proposePlan,
  reschedulePlan,
} from "@/lib/production/preprod/plan-template";
import { isChecklistAction } from "@/lib/production/preprod/types";
import { createClient } from "@/lib/supabase/server";

/**
 * « Call de production » / « Préparation avec PO » / « Organisation
 * importée » (proto prepGate, BODY_MK.kickoff): the call prepared in the
 * step with the common form, then held and filed by PO point by point;
 * what PO proposes, to confirm, correct or set aside; the tasks it becomes
 * (who, when); the summary to the participants — the company reads it on
 * its link. In internal, the teams' briefs follow.
 */
export default async function ProductionCallStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/call">) {
  const { projectId, deliverableId } = await params;
  const { access, step, steps } = await stepContext(
    projectId,
    deliverableId,
    "call",
  );
  const p = await prepContext(projectId, deliverableId);
  const { data, sheet, preprod, o, today, due, common, people } = p;
  const external = sheet.organization.kind === "external";
  // In call mode, nothing to settle before the call is held (proto: the
  // form alone).
  const settling =
    sheet.mode !== "call" ||
    preprod.calls.some((c) => c.status === "ready") ||
    preprod.items.length > 0 ||
    preprod.actions.some((a) => !isChecklistAction(a));
  const { data: creatives } = await (
    await createClient()
  )
    .from("project_creatives")
    .select("person_id")
    .eq("project_id", projectId);
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(sheet.closedAt)}
    >
      <CallStepHead
        projectId={projectId}
        data={data}
        preprod={preprod}
        canOrganize={data.canOrganize}
        creatives={(creatives ?? []).map((c) => c.person_id)}
      />
      {settling && (
        <TechnicalCallSection
          projectId={projectId}
          input={{ data: { ...data, sheet }, preprod, logistics: o.logistics }}
          calls={preprod.calls}
          canOrganize={data.canOrganize}
          actions={preprod.actions}
          launcher={false}
          listCalls={false}
          heading={{
            title: fr.productionCall.step.items[sheet.mode],
            description: fr.productionCall.step.itemsDescription,
          }}
          {...people}
        />
      )}
      {settling && (
        <PlanSection
          {...common}
          {...people}
          actions={preprod.actions.filter((a) => !isChecklistAction(a))}
          states={o.actionStates}
          planState={o.planState}
          items={preprod.items}
          template={{
            deliverableId,
            missing: proposePlan({
              brief: sheet.brief,
              due,
              today,
              existing: new Set(
                preprod.actions.flatMap((a) =>
                  a.templateKey ? [a.templateKey] : [],
                ),
              ),
              hasDirector: sheet.director !== null,
            }).length,
            reschedule: reschedulePlan({
              actions: preprod.actions,
              due,
              today,
            }),
          }}
        />
      )}
      <CallStepSummary
        data={data}
        preprod={preprod}
        canOrganize={data.canOrganize}
        mePersonId={access.personId}
      />
      {external && preprod.calls.some((c) => c.status === "ready") && (
        <DirectorBlock projectId={projectId} data={data} />
      )}
      {!external && (
        <TeamBriefsSection
          {...common}
          deliverableId={deliverableId}
          briefs={o.briefs}
          rows={preprod.briefs}
          needs={data.needs}
          director={sheet.director}
        />
      )}
    </ProductionStepPanel>
  );
}
