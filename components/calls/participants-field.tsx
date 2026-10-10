"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { fr } from "@/lib/i18n/fr";

/**
 * Who takes part in a prepared exchange: names proposed by PO (a chip
 * removes one) and names typed by the person (a member or someone outside).
 */
export function ParticipantsField({
  id,
  people,
  onChange,
  hint,
}: {
  // Heading id, for aria-labelledby.
  id: string;
  people: string[];
  onChange: (people: string[]) => void;
  // Shown when the list is empty (when it is required).
  hint?: string;
}) {
  const t = fr.calls.prepare;
  const [draft, setDraft] = useState("");
  const add = () => {
    const name = draft.trim();
    if (name && !people.includes(name)) onChange([...people, name]);
    setDraft("");
  };
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-sm font-medium">
        {t.participants}
      </h3>
      {people.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {people.map((name) => (
            <FilterChip
              key={name}
              pressed
              aria-label={t.removeParticipant(name)}
              onClick={() => onChange(people.filter((x) => x !== name))}
            >
              {name}
            </FilterChip>
          ))}
        </div>
      ) : (
        hint && <p className="text-caption text-muted-foreground">{hint}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label={t.participantPlaceholder}
          value={draft}
          maxLength={120}
          placeholder={t.participantPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-9 min-w-0 flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          {t.addParticipant}
        </Button>
      </div>
    </section>
  );
}
