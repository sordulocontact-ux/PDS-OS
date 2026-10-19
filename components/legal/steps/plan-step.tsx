import { MappingPanel } from "@/components/legal/contracts/mapping-panel";
import { LaunchedDemarches } from "@/components/legal/demarches/launched-demarches";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { PlanView } from "@/components/legal/plan/plan-view";
import { AddedActions } from "@/components/legal/tracking/added-actions";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";

/**
 * Plan d'action (proto « Projet complet »): the contracts to provide for,
 * confirmed together before the launch, then the démarches to keep, give
 * and date; launched, each démarche is a step of the journey and the plan
 * keeps the contracts, the démarches that appeared since and their list.
 */
export async function PlanStep({ projectId }: { projectId: string }) {
  const { plan, tracking, agreements, demarches, clearances } =
    await legalJourneyContext(projectId);
  const t = fr.legalJourney.plan;
  const contracts = agreements.rows.length > 0 &&
    plan.state !== "needs_confirmation" && (
      <PageSection
        id="legal-contracts"
        title={fr.legalContracts.agreements.mappingTitle}
        card={false}
      >
        <MappingPanel
          projectId={projectId}
          rows={agreements.rows}
          approval={agreements.approval}
          organizationId={clearances.organizationId}
        />
      </PageSection>
    );
  return (
    <LegalStepFrame projectId={projectId} stepKey="plan">
      {plan.state === "launched" ? (
        <div className="flex flex-col gap-5">
          <ToneCallout tone="success">
            {t.launched(demarches.length)}
          </ToneCallout>
          {tracking.state === "tracking" && tracking.added > 0 && (
            <AddedActions projectId={projectId} count={tracking.added} />
          )}
          {contracts}
          <LaunchedDemarches demarches={demarches} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {contracts}
          <PlanView projectId={projectId} plan={plan} />
        </div>
      )}
    </LegalStepFrame>
  );
}
