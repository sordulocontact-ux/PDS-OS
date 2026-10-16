import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import { StepPanel } from "@/components/shell/journey/step-panel";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import type { LegalStepKey } from "@/lib/ui/legal-steps";
import { routes } from "@/lib/auth/redirects";

/**
 * The frame of a Juridique step (docs/VISION-UX.md § 4): « Maintenant » for
 * the person looking, the journey on the left, the open step on the right.
 * The Suivi of a plan not launched yet shows only what unlocks it; the other
 * steps handle their own waiting state.
 */
export async function LegalStepFrame({
  projectId,
  stepKey,
  children,
}: {
  projectId: string;
  stepKey: LegalStepKey;
  children: React.ReactNode;
}) {
  const { steps, viewerName } = await legalJourneyContext(projectId);
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
  const empty = step.status === "blocked" && stepKey === "tracking";
  return (
    <div className="flex flex-col gap-6 pt-6">
      <NowCard steps={steps} viewerName={viewerName} shownKey={stepKey} />
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <JourneySpine
          steps={steps}
          openKey={stepKey}
          footer={{
            href: routes.projectLegalStep(projectId, "history"),
            label: fr.legalHistory.link,
          }}
        />
        <StepPanel
          step={step}
          steps={steps}
          rootPrereq={fr.legalJourney.rootPrereq}
        >
          {empty ? null : children}
        </StepPanel>
      </div>
    </div>
  );
}
