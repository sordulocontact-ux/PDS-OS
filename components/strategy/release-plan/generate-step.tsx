import { StepSection } from "@/components/shell/journey/step-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";

const fr = { strategyReleasePlan, strategyPressKit };

/**
 * Step 7 (ticket § 11): PO generates the real visual document from the
 * validated strategy and the choices; steps not validated yet are said.
 */
export function GenerateStep({
  complete,
  children,
  kind = "release_plan",
}: {
  kind?: GeneratorKind;
  // Every choice step was validated.
  complete: boolean;
  // The « Générer » button, for the owner.
  children: React.ReactNode;
}) {
  const t =
    kind === "press_kit"
      ? fr.strategyPressKit.generate
      : fr.strategyReleasePlan.generate;
  return (
    <StepSection title={t.title} description={t.body}>
      <div className="flex flex-col items-start gap-4">
        {!complete && <ToneCallout tone="warning">{t.incomplete}</ToneCallout>}
        {children}
      </div>
    </StepSection>
  );
}
