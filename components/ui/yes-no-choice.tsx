"use client";

import { ChoiceCards } from "@/components/ui/choice-cards";

export type YesNo = "yes" | "no" | "later";

/**
 * THE yes-or-no answer of a question (Sacha 09-10/11/2026): « Oui… » then
 * what to fill opens under it, « Non… » settles the question, and, when the
 * caller has one, « Je ne sais pas encore ». The choice is a list of rows
 * (`ChoiceCards variant="list"`), the caller renders what follows it.
 * Used by the Cadrage's dimensions (YesNoAnswer) and the Cadrage juridique
 * (QuestionCard).
 */
export function YesNoChoice({
  name,
  legend,
  labels,
  value,
  onChange,
  disabled,
}: {
  name: string;
  // Read by screen readers only: the question above says it.
  legend: string;
  labels: { yes: string; no: string; later?: string };
  value: YesNo | null;
  onChange: (value: YesNo) => void;
  disabled?: boolean;
}) {
  return (
    <ChoiceCards<YesNo>
      name={name}
      legend={legend}
      hideLegend
      variant="list"
      value={value}
      onChange={onChange}
      disabled={disabled}
      choices={[
        { value: "yes", label: labels.yes },
        { value: "no", label: labels.no },
        ...(labels.later
          ? [{ value: "later" as const, label: labels.later }]
          : []),
      ]}
    />
  );
}
