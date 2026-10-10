"use client";

import { FilterChip } from "@/components/ui/filter-chip";

export type TargetOption = { key: string; label: string };

/**
 * The targets a reference serves: the direction and any number of
 * deliverables, as pills. None chosen: the reference stays « à rattacher ».
 */
export function TargetPicker({
  legend,
  hint,
  options,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  hint?: string;
  options: TargetOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const chosen = new Set(value);
  const toggle = (key: string) =>
    onChange(
      chosen.has(key) ? value.filter((k) => k !== key) : [...value, key],
    );
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((option) => (
          <FilterChip
            key={option.key}
            pressed={chosen.has(option.key)}
            disabled={disabled}
            onClick={() => toggle(option.key)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}
