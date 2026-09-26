import { ChoiceCards } from "@/components/calls/choice-cards";
import { CONSENTS, type Consent } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";

/** Consent choice, each option with its consequence (see ChoiceCards). */
export function ConsentOptions({
  name = "consent",
  defaultValue,
  disabled,
  legend,
  hideLegend,
  hint,
}: {
  name?: string;
  defaultValue: Consent;
  disabled?: boolean;
  legend: string;
  /** When a heading right above already says it. */
  hideLegend?: boolean;
  hint?: string;
}) {
  const t = fr.calls.consent;
  return (
    <ChoiceCards
      name={name}
      legend={legend}
      hideLegend={hideLegend}
      hint={hint}
      disabled={disabled}
      defaultValue={defaultValue}
      choices={CONSENTS.map((value) => ({
        value,
        label: t.label[value],
        hint: t.explain[value],
      }))}
    />
  );
}
