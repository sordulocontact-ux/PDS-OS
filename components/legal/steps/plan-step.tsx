import { PlanView } from "@/components/legal/plan/plan-view";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { legalStepHref } from "@/lib/ui/legal-steps";

/** Plan d'action: proposed, modified, launched; then followed in the Suivi. */
export async function PlanStep({ projectId }: { projectId: string }) {
  const { plan } = await legalJourneyContext(projectId);
  const t = fr.legalJourney.plan;
  return (
    <LegalStepFrame projectId={projectId} stepKey="plan">
      {plan.state === "launched" ? (
        <div className="flex flex-col items-start gap-4">
          <ToneCallout tone="success">
            {t.launched(plan.items.length)}
          </ToneCallout>
          <ViewLink
            href={legalStepHref(projectId, "tracking")}
            className={buttonVariants()}
          >
            {t.openTracking}
          </ViewLink>
        </div>
      ) : (
        <PlanView projectId={projectId} plan={plan} />
      )}
    </LegalStepFrame>
  );
}
