import { MappingPanel } from "@/components/legal/contracts/mapping-panel";
import { TemplateRequestCard } from "@/components/legal/contracts/template-request-card";
import { LaunchedDemarches } from "@/components/legal/demarches/launched-demarches";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { PlanView } from "@/components/legal/plan/plan-view";
import { AddedActions } from "@/components/legal/tracking/added-actions";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { latestRequestOf } from "@/lib/legal/contracts/template-requests";
import { legalJourneyContext } from "@/lib/legal/journey-context";

/**
 * Plan d'action (proto « Projet complet »): the contracts to provide for,
 * confirmed together before the launch, then the démarches to keep, give
 * and date; launched, each démarche is a step of the journey and the plan
 * keeps the contracts, the démarches that appeared since and their list.
 */
export async function PlanStep({ projectId }: { projectId: string }) {
  const {
    plan,
    tracking,
    agreements,
    demarches,
    clearances,
    templateRequests,
    direction,
  } = await legalJourneyContext(projectId);
  const t = fr.legalJourney.plan;
  // The direction decides on the templates asked from this project here.
  const toDecide = clearances.canValidate
    ? templateRequests.filter((r) => r.status === "draft")
    : [];
  const requests = Object.fromEntries(
    [...latestRequestOf(templateRequests)].map(([key, r]) => [
      key,
      { name: r.name, pending: r.status === "draft", refusal: r.refusal },
    ]),
  );
  const decisions = toDecide.length > 0 && (
    <div className="flex flex-col gap-4">
      {toDecide.map((request) => (
        <TemplateRequestCard
          key={request.id}
          projectId={projectId}
          request={request}
        />
      ))}
    </div>
  );
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
          requests={requests}
          direction={direction ?? fr.legalDemarches.direction}
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
          {decisions}
          {tracking.state === "tracking" && tracking.added > 0 && (
            <AddedActions projectId={projectId} count={tracking.added} />
          )}
          {contracts}
          <LaunchedDemarches demarches={demarches} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {decisions}
          {contracts}
          <PlanView projectId={projectId} plan={plan} />
        </div>
      )}
    </LegalStepFrame>
  );
}
