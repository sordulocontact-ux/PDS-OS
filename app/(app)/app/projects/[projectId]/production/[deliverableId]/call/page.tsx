import { StepPanel } from "@/components/shell/journey/step-panel";
import { ProductionCallPanel } from "@/components/production/prep/production-call-sheet";
import { PlanSection } from "@/components/production/preprod/plan-section";
import { TeamBriefsSection } from "@/components/production/preprod/team-briefs-section";
import { TechnicalCallSection } from "@/components/production/preprod/technical-call-section";
import { fr } from "@/lib/i18n/fr";
import { loadProductionCalls } from "@/lib/production/call-queries";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import {
  proposePlan,
  reschedulePlan,
} from "@/lib/production/preprod/plan-template";

export const metadata = { title: `Call · ${fr.app.name}` };

/**
 * The call of the journey: in external, the presentation to the company
 * (its own panel); in internal, the technical call prepared by PO. Then what
 * PO drew from its report, to confirm and assign, and the plan it feeds
 * (Ibé: « après un call technique, PO propose les actions… »).
 */
export default async function ProductionCallStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/call">) {
  const { projectId, deliverableId } = await params;
  const { step, steps } = await stepContext(projectId, deliverableId, "call");
  const p = await prepContext(projectId, deliverableId);
  const { data, sheet, preprod, o, today, due, common, people } = p;
  const external = sheet.organization.kind === "external";
  const calls = external ? await loadProductionCalls(projectId, sheet.id) : [];
  return (
    <StepPanel
      step={step}
      steps={steps}
      rootPrereq={fr.productionJourney.meta.fiche}
    >
      {external && (
        <ProductionCallPanel
          projectId={projectId}
          data={data}
          calls={calls}
          canOrganize={data.canOrganize}
        />
      )}
      <TechnicalCallSection
        projectId={projectId}
        input={{ data: { ...data, sheet }, preprod, logistics: o.logistics }}
        calls={preprod.calls}
        canOrganize={data.canOrganize}
        actions={preprod.actions}
        launcher={!external}
        listCalls={!external}
        {...people}
      />
      <PlanSection
        {...common}
        {...people}
        actions={preprod.actions}
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
          reschedule: reschedulePlan({ actions: preprod.actions, due, today }),
        }}
      />
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
    </StepPanel>
  );
}
