"use client";

import { ChipMultiChoice } from "@/components/ui/chip-choice";

// Several members picked at once (a project's creative directors, a
// meeting's attendees): the team is small, so every candidate is a toggle
// chip. Submitted as one JSON field under `name` (their person ids).
export function PeoplePicker({
  name,
  label,
  note,
  hint,
  emptyLabel,
  candidates,
  defaultSelectedIds,
  error,
}: {
  name: string;
  label: string;
  // Shown after the label, muted ("facultatif").
  note?: string;
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
      note={note}
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
