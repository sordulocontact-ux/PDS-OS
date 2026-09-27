"use client";

import { useId } from "react";

import { FieldError } from "@/components/auth/form-message";
import { FilterChip } from "@/components/ui/filter-chip";

export type ChipOption<V extends string> = { value: V; label: string };

/**
 * One choice among a few, as a row of FilterChip pills (format of a project,
 * priority): the active one in ink. Controlled by the parent, submitted under
 * `name` through a hidden input (empty when nothing is chosen).
 * `deselectable`: a second click on the active pill clears the choice.
 */
export function ChipChoice<V extends string>({
  name,
  legend,
  note,
  options,
  value,
  onChange,
  deselectable = false,
  hint,
  error,
}: {
  name: string;
  legend: string;
  // Shown after the legend, muted ("facultatif").
  note?: string;
  options: ChipOption<V>[];
  value: V | null;
  onChange: (value: V | null) => void;
  deselectable?: boolean;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={describedBy}
      className="flex flex-col gap-1.5"
    >
      <span id={`${id}-label`} className="text-sm leading-none font-medium">
        {legend}
        {note && (
          <span className="text-muted-foreground"> · {note}</span>
        )}
      </span>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <FilterChip
              key={option.value}
              pressed={active}
              onClick={() =>
                onChange(active && deselectable ? null : option.value)
              }
            >
              {option.label}
            </FilterChip>
          );
        })}
      </div>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
