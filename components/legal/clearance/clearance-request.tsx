import { StepSection } from "@/components/shell/journey/step-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { elementLine } from "@/lib/legal/clearance/element";
import { rightsOf } from "@/lib/legal/clearance/matrix";
import { rightState } from "@/lib/legal/clearance/right-states";
import type { Clearance } from "@/lib/legal/clearance/types";
import { rightStateTone } from "@/lib/ui/state-tones";

const fr = { legalClearance };

/** What is taken, its source line (the title it is in, else the Cadrage
 * juridique). Also the first line of « Demander l'autorisation ». */
export function ElementRow({ clearance }: { clearance: Clearance }) {
  const t = fr.legalClearance.request;
  return (
    <FactRow
      label={t.element}
      value={elementLine(clearance)}
      source={clearance.title ? t.inTitle(clearance.title) : t.fromIntake}
    />
  );
}

/**
 * « La demande » (recette Juridique V1, JUR-09 and JUR-10), in one block
 * (Sacha, 07/11/2026: « trop d'informations, on ne sait pas quoi lire »):
 * what is taken, then each right apart — its holder and where it stands,
 * conditions accepted never read as authorised.
 */
export function ClearanceRequest({ clearance }: { clearance: Clearance }) {
  const t = fr.legalClearance.request;
  const holdersOf = (right: string) =>
    clearance.holders
      .filter((h) => h.right === right)
      .map((h) => h.name)
      .join(", ");
  return (
    <StepSection title={t.title}>
      <FactRows>
        <ElementRow clearance={clearance} />
        {rightsOf(clearance.scope).map((right) => {
          const state = rightState(clearance, right);
          return (
            <FactRow
              key={right}
              label={t.rightLabel[right]}
              value={holdersOf(right) || null}
              missing
              missingLabel={t.noHolder}
              // Unknown holder: the red « À identifier » says it once.
              state={
                state === "to_identify"
                  ? null
                  : { tone: rightStateTone[state], label: t.states[state] }
              }
            />
          );
        })}
      </FactRows>
    </StepSection>
  );
}
