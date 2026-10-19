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
 * Plan d'action: proposed, modified, launched. Once launched, each démarche
 * is a step of the journey: the plan keeps the contracts to provide for,
 * the démarches that appeared since, and the list of its démarches.
 */
export async function PlanStep({ projectId }: { projectId: string }) {
  const { plan, tracking, agreements, demarches } =
    await legalJourneyContext(projectId);
  const t = fr.legalJourney.plan;
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
          {agreements.rows.length > 0 && (
            <PageSection
              id="legal-contracts"
              title={fr.legalContracts.agreements.mappingTitle}
              card={false}
            >
              <MappingPanel
                projectId={projectId}
                rows={agreements.rows}
                approval={agreements.approval}
              />
            </PageSection>
          )}
          <LaunchedDemarches demarches={demarches} />
        </div>
      ) : (
        <PlanView projectId={projectId} plan={plan} />
      )}
    </LegalStepFrame>
  );
}
