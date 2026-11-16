import { ToneCallout } from "@/components/ui/tone-callout";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import type { Demarche } from "@/lib/legal/demarches/build";
import { StepSection } from "@/components/shell/journey/step-section";

const fr = { legalDemarches };

const t = fr.legalDemarches.proposed;

/**
 * A démarche the code proposes while the plan is not launched (proto
 * « Projet complet »): why it starts later, then what will come, gesture by
 * gesture, with who makes each one.
 */
export function ProposedDemarche({ demarche }: { demarche: Demarche }) {
  const gestures = t.gestures[demarche.kind] ?? [];
  const who = (by: string) =>
    by === "them" ? demarche.subject : (t.who[by] ?? t.owner);
  return (
    <div className="flex flex-col gap-3.5 modern:gap-4">
      <ToneCallout tone="info">{t.note}</ToneCallout>
      <StepSection title={t.comes}>
        <ol className="flex flex-col gap-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
          {gestures.map(([by, label], index) => (
            <li key={label} className="flex flex-wrap gap-x-2">
              <span className="font-medium">
                {index + 1}. {label}
              </span>
              <span className="text-[color:var(--text-secondary)]">
                {who(by)}
              </span>
            </li>
          ))}
        </ol>
      </StepSection>
    </div>
  );
}
