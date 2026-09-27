import type { ChangeEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Choice<V extends string> = {
  value: V;
  label: string;
  // The consequence of the choice; optional on a tile (then a short note).
  hint?: string;
  // Tile only: shown above the label.
  icon?: ReactNode;
  disabled?: boolean;
};

/**
 * Radio choices with their consequence spelled out under each option, so the
 * decision is informed. Native radios: keyboard and screen readers for free.
 * Uncontrolled (defaultValue, for forms) or controlled (value + onChange).
 * `columns={3}`: side by side from the small breakpoint, for short choices.
 * `variant="tile"`: a centred icon and label, the radio hidden, the choice
 * made in the selection colour (type of a project).
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
  columns = 1,
  variant = "card",
}: {
  name: string;
  choices: Choice<V>[];
  legend: string;
  hideLegend?: boolean;
  hint?: string;
  disabled?: boolean;
  defaultValue?: V;
  // Controlled when given; null: nothing chosen yet.
  value?: V | null;
  onChange?: (value: V) => void;
  columns?: 1 | 3;
  variant?: "card" | "tile";
}) {
  const tile = variant === "tile";
  return (
    <fieldset
      className={cn(
        "grid gap-2",
        tile && "gap-3",
        columns === 3 && "sm:grid-cols-3",
      )}
      disabled={disabled}
    >
      <legend className={hideLegend ? "sr-only" : "mb-1 text-sm font-medium"}>
        {legend}
      </legend>
      {hint && (
        <p className="col-span-full text-sm text-muted-foreground">{hint}</p>
      )}
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={cn(
            "flex cursor-pointer rounded-lg border border-border transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60",
            tile
              ? "flex-col items-center justify-center gap-2 p-6 text-center has-checked:border-[var(--selection-border)] has-checked:bg-[var(--selection-bg)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground"
              : "gap-3 p-3 has-checked:border-ring has-checked:bg-muted",
          )}
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
            className={tile ? "sr-only" : "mt-0.5 size-4 accent-primary"}
          />
          {tile ? (
            <>
              {choice.icon}
              <span className="text-sm font-medium">{choice.label}</span>
              {choice.hint && (
                <span className="text-xs text-muted-foreground">
                  {choice.hint}
                </span>
              )}
            </>
          ) : (
            // Top-aligned: side by side, cards stretch to the tallest.
            <span className="grid content-start gap-0.5">
              <span className="text-sm font-medium">{choice.label}</span>
              {choice.hint && (
                <span className="text-sm text-muted-foreground">
                  {choice.hint}
                </span>
              )}
            </span>
          )}
        </label>
      ))}
    </fieldset>
  );
}
