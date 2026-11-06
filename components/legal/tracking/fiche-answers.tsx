import type { ReactNode } from "react";

import { StepSection } from "@/components/shell/journey/step-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FormRow } from "@/lib/legal/forms/queries";

const fr = { legal, legalForms };

const factsOf = (values: Record<string, string>) =>
  Object.entries(values).map(([id, value]) => ({
    id,
    label: fr.legalForms.fields[id] ?? id,
    value: fr.legalForms.options[id]?.[value] ?? value,
  }));

/** What a person filled in their fiche, as fact rows with their source
 * (proto juridique-v3 `review`): who they are, then their contribution. */
export function FicheAnswers({
  row,
  aside,
  omit = [],
}: {
  row: FormRow;
  // Beside the title: where the fiche stands (« Reçue, à vérifier »).
  aside?: ReactNode;
  // Fields said elsewhere (a correction to check).
  omit?: string[];
}) {
  const p = fr.legal.panels.fiche;
  const submission = row.submission;
  if (!submission) return null;
  const facts = [
    ...factsOf(submission.person),
    ...factsOf(submission.contribution),
  ].filter((fact) => !omit.includes(fact.id));
  if (facts.length === 0) return null;
  return (
    <StepSection title={p.answers(row.name)} aside={aside}>
      <FactRows>
        {facts.map((fact) => (
          <FactRow
            key={fact.id}
            label={fact.label}
            value={fact.value}
            source={p.fromFiche(row.name)}
          />
        ))}
      </FactRows>
    </StepSection>
  );
}
