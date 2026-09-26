"use client";

import { useId, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { FilterChip } from "@/components/ui/filter-chip";
import type { CreativeMember } from "@/lib/projects/creatives";

// Several creative directors picked at once: the team is small, so every
// candidate is a toggle chip. Submitted as one JSON field under `name`.
export function CreativePicker({
  name,
  label,
  hint,
  emptyLabel,
  candidates,
  defaultSelectedIds,
  error,
}: {
  name: string;
  label: string;
  hint: string;
  emptyLabel: string;
  candidates: CreativeMember[];
  defaultSelectedIds: string[];
  error?: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState<string[]>(defaultSelectedIds);
  const toggle = (personId: string) =>
    setSelected((current) =>
      current.includes(personId)
        ? current.filter((value) => value !== personId)
        : [...current, personId],
    );

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? `${id}-error` : `${id}-hint`}
      className="flex flex-col gap-1.5"
    >
      <span id={`${id}-label`} className="text-sm leading-none font-medium">
        {label}
      </span>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {candidates.map((person) => (
            <FilterChip
              key={person.personId}
              pressed={selected.includes(person.personId)}
              onClick={() => toggle(person.personId)}
            >
              {person.name}
            </FilterChip>
          ))}
        </div>
      )}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
