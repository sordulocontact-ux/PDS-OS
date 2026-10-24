import { StepSection } from "@/components/shell/journey/step-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import { rightsOf } from "@/lib/legal/clearance/matrix";
import { rightState } from "@/lib/legal/clearance/right-states";
import type { Clearance } from "@/lib/legal/clearance/types";
import { rightStateTone } from "@/lib/ui/state-tones";

/**
 * « La demande » then « Deux autorisations distinctes » (recette Juridique
 * V1, JUR-09): what is taken of which work, each right's holder, then each
 * right apart with where it stands — conditions accepted are not an
 * authorisation (JUR-10).
 */
export function ClearanceRequest({ clearance }: { clearance: Clearance }) {
  const t = fr.legalClearance.request;
  const rights = rightsOf(clearance.scope);
  const holdersOf = (right: string) =>
    clearance.holders
      .filter((h) => h.right === right)
      .map((h) => h.name)
      .join(", ");
  return (
    <>
      <StepSection title={t.title}>
        <FactRows>
          <FactRow
            label={t.element}
            value={clearance.element}
            source={clearance.usage ?? undefined}
          />
          <FactRow
            label={t.work}
            value={
              clearance.author
                ? `« ${clearance.work} » (${clearance.author})`
                : `« ${clearance.work} »`
            }
          />
          {rights.map((right) => (
            <FactRow
              key={right}
              label={t.holder(t.rightOf[right])}
              value={holdersOf(right) || null}
              missing
              missingLabel={t.noHolder}
            />
          ))}
        </FactRows>
      </StepSection>
      {rights.length > 0 && (
        <StepSection title={t.rightsTitle(rights.length)}>
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.rightsBody}
          </p>
          <FactRows>
            {rights.map((right) => {
              const state = rightState(clearance, right);
              return (
                <FactRow
                  key={right}
                  label={t.rightLabel[right]}
                  value={holdersOf(right) || t.noHolder}
                  state={{
                    tone: rightStateTone[state],
                    label: t.states[state],
                  }}
                />
              );
            })}
          </FactRows>
        </StepSection>
      )}
    </>
  );
}
