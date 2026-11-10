import type { ChangeEvent, ReactNode } from "react";

import { RequiredMark } from "@/components/ui/required-mark";
import { cn } from "@/lib/utils";

export type Choice<V extends string> = {
  value: V;
  label: string;
  // The consequence of the choice; optional on a tile (then a short note).
  hint?: string;
  // List only: after the bold label, « · détail » (« Externe · Une société
  // de production est mandatée »), and a quiet tag (« proposée par PO »).
  detail?: string;
  tag?: string;
  // Tile only: shown above the label.
  icon?: ReactNode;
  // Card and list: on the right of the row (a player to listen first).
  aside?: ReactNode;
  disabled?: boolean;
};

/**
 * Radio choices with their consequence spelled out under each option, so the
 * decision is informed. Native radios: keyboard and screen readers for free.
 * Uncontrolled (defaultValue, for forms) or controlled (value + onChange).
 * `columns={2 | 3}`: side by side from the small breakpoint, for short choices.
 * The choice made shows in the selection colour (docs/DESIGN.md § 3 bis).
 * `variant="tile"`: a centred icon and label, the radio hidden (type of a
 * project). `variant="list"`: joined rows in one frame (proto `.opts`: « Qui
 * produit ? », how to organise the preproduction), the chosen row tinted.
 */
export function ChoiceCards<V extends string>({
  name,
  choices,
  legend,
  hideLegend,
  required = false,
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
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  hint?: string;
  disabled?: boolean;
  defaultValue?: V;
  // Controlled when given; null: nothing chosen yet.
  value?: V | null;
  onChange?: (value: V) => void;
  columns?: 1 | 2 | 3;
  variant?: "card" | "tile" | "list";
}) {
  const tile = variant === "tile";
  const list = variant === "list";
  const items = choices.map((choice) => (
    <label
      key={choice.value}
      className={cn(
        "flex cursor-pointer transition-colors has-checked:bg-[var(--selection-bg)] has-focus-visible:outline-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:opacity-60",
        list
          ? "border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0 hover:bg-[var(--surface-soft)] has-checked:hover:bg-[var(--selection-bg)] has-focus-visible:-outline-offset-2"
          : "rounded-lg border border-border has-checked:border-[var(--selection-border)] has-focus-visible:outline-offset-2 bg-card",
        tile
          ? "flex-col items-center justify-center gap-2 p-6 text-center"
          : list
            ? "flex-wrap items-center gap-3 sm:flex-nowrap"
            : "flex-wrap gap-3 p-3 sm:flex-nowrap",
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
        className={
          tile
            ? "sr-only"
            : list
              ? "size-[18px] shrink-0 accent-selection"
              : "mt-0.5 size-4 accent-selection"
        }
      />
      {list ? (
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="break-words">
            <b className="font-semibold">{choice.label}</b>
            {choice.tag && (
              <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {" "}
                · {choice.tag}
              </span>
            )}
            {choice.detail && <> · {choice.detail}</>}
          </span>
          {choice.hint && (
            <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
              {choice.hint}
            </span>
          )}
        </span>
      ) : tile ? (
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
        <>
          <span className="grid min-w-0 flex-1 content-start gap-0.5">
            <span className="text-sm font-medium break-words">
              {choice.label}
            </span>
            {choice.hint && (
              <span className="text-sm text-muted-foreground">
                {choice.hint}
              </span>
            )}
          </span>
          {choice.aside && (
            // Under the text on a phone, on the right from the small breakpoint.
            <span className="flex w-full shrink-0 items-center pl-7 sm:w-auto sm:self-center sm:pl-0">
              {choice.aside}
            </span>
          )}
        </>
      )}
    </label>
  ));
  return (
    <fieldset
      className={cn(
        "grid gap-2",
        tile && "gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
      )}
      disabled={disabled}
    >
      <legend
        className={
          hideLegend
            ? "sr-only"
            : list
              ? "mb-1.5 font-semibold"
              : "mb-1 text-sm font-medium"
        }
      >
        {legend}
        {required && <RequiredMark announce />}
      </legend>
      {hint && (
        <p className="col-span-full text-sm text-muted-foreground">{hint}</p>
      )}
      {list ? (
        <div className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card">
          {items}
        </div>
      ) : (
        items
      )}
    </fieldset>
  );
}
