"use client";

import { ChipMultiChoice } from "@/components/ui/chip-choice";

// Several members picked at once (a project's creative directors, a
// meeting's attendees): the team is small, so every candidate is a toggle
// chip. Submitted as one JSON field under `name` (their person ids).
export function PeoplePicker({
  name,
  label,
  required = false,
  hint,
  emptyLabel,
  candidates,
  defaultSelectedIds,
  error,
}: {
  name: string;
  label: string;
  // Shows the « * » after the label (docs/DESIGN.md § 4).
  required?: boolean;
  hint?: string;
  emptyLabel: string;
  candidates: { personId: string; name: string }[];
  defaultSelectedIds: string[];
  error?: string;
}) {
  return (
    <ChipMultiChoice
      name={name}
      legend={label}
      required={required}
      hint={hint}
      emptyLabel={emptyLabel}
      error={error}
      options={candidates.map((person) => ({
        value: person.personId,
        label: person.name,
      }))}
      defaultValue={defaultSelectedIds}
    />
  );
}
