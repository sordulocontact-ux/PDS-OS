import type { ChangeEvent } from "react";

export type Choice<V extends string> = {
  value: V;
  label: string;
  hint: string;
  disabled?: boolean;
};

/**
 * Radio choices with their consequence spelled out under each option, so the
 * decision is informed. Native radios: keyboard and screen readers for free.
 * Uncontrolled (defaultValue, for forms) or controlled (value + onChange).
 */
export function ChoiceCards<V extends string>({
  name,
  choices,
  legend,
  hideLegend,
  hint,
  disabled,
  defaultValue,
  value,
  onChange,
}: {
  name: string;
  choices: Choice<V>[];
  legend: string;
  hideLegend?: boolean;
  hint?: string;
  disabled?: boolean;
  defaultValue?: V;
  value?: V;
  onChange?: (value: V) => void;
}) {
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className={hideLegend ? "sr-only" : "mb-1 text-sm font-medium"}>
        {legend}
      </legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 transition-colors has-checked:border-ring has-checked:bg-muted has-disabled:cursor-not-allowed has-disabled:opacity-60"
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            disabled={choice.disabled}
            {...(value !== undefined
              ? {
                  checked: value === choice.value,
                  onChange: (e: ChangeEvent<HTMLInputElement>) =>
                    e.target.checked && onChange?.(choice.value),
                }
              : { defaultChecked: choice.value === defaultValue })}
            className="mt-0.5 size-4 accent-primary"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{choice.label}</span>
            <span className="text-sm text-muted-foreground">{choice.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
