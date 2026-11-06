"use client";

import { useId, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { FilterChip } from "@/components/ui/filter-chip";
import { RequiredMark } from "@/components/ui/required-mark";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type ChipOption<V extends string> = { value: V; label: string };

/**
 * One choice among a few (type of a contact, format of a project,
 * priority), as a `SegmentedControl` (Sacha, 05/11/2026: no more pills for a
 * single choice). Controlled by the parent, submitted under `name` through a
 * hidden input (empty when nothing is chosen). `deselectable`: a second click
 * on the chosen segment clears the choice. `fill`: the whole width.
 */
export function ChipChoice<V extends string>({
  name,
  legend,
  required = false,
  options,
  value,
  onChange,
  deselectable = false,
  fill = false,
  hint,
  error,
}: {
  name: string;
  legend: string;
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  options: ChipOption<V>[];
  value: V | null;
  onChange: (value: V | null) => void;
  deselectable?: boolean;
  fill?: boolean;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm leading-none font-medium">
        {legend}
        {required && <RequiredMark announce />}
      </span>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="pt-1">
        <SegmentedControl
          aria-labelledby={`${id}-label`}
          aria-describedby={describedBy}
          options={options}
          value={value}
          onChange={onChange}
          deselectable={deselectable}
          fill={fill}
        />
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

/**
 * Several choices among a few, as toggle pills (roles of a contact, a
 * meeting's attendees): uncontrolled, submitted under `name` as one JSON
 * array through a hidden input. `emptyLabel` replaces the pills when there
 * is nothing to choose.
 */
export function ChipMultiChoice<V extends string>({
  name,
  legend,
  required = false,
  options,
  defaultValue,
  onChange,
  emptyLabel,
  hint,
  error,
  summary,
}: {
  name: string;
  legend: string;
  // What is chosen, said in words under the chips (a chip alone does not
  // say it is chosen, retour Catalogue 68).
  summary?: (labels: string[]) => string;
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  options: ChipOption<V>[];
  defaultValue: V[];
  onChange?: (value: V[]) => void;
  emptyLabel?: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState<V[]>(defaultValue);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const toggle = (value: V) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={describedBy}
      className="flex flex-col gap-1.5"
    >
      <span id={`${id}-label`} className="text-sm leading-none font-medium">
        {legend}
        {required && <RequiredMark announce />}
      </span>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      {options.length === 0 && emptyLabel ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {options.map((option) => (
            <FilterChip
              key={option.value}
              pressed={selected.includes(option.value)}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      )}
      {summary && options.length > 0 && (
        <p className="text-sm text-[color:var(--text-secondary)]" aria-live="polite">
          {summary(
            options
              .filter((option) => selected.includes(option.value))
              .map((option) => option.label),
          )}
        </p>
      )}
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
