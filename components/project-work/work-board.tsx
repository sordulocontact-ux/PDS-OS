"use client";

import { useState } from "react";

import { PersonWorkCard } from "@/components/project-work/person-work-card";
import { CardGrid } from "@/components/ui/card-grid";
import { FilterChip } from "@/components/ui/filter-chip";
import { fr } from "@/lib/i18n/fr";
import type { WorkPerson } from "@/lib/project-work/queries";
import type { WorkItem } from "@/lib/project-work/workload";

const t = fr.projectWork.work;

/** One card per person, with a person filter once there are several. */
export function WorkBoard({
  people,
  items,
  names,
  projectId,
  mePersonId,
  initialPerson,
}: {
  people: WorkPerson[];
  items: WorkItem[];
  names: Record<string, string>;
  projectId: string;
  mePersonId: string | null;
  initialPerson: string | null;
}) {
  const [person, setPerson] = useState<string | null>(
    people.some((p) => p.personId === initialPerson) ? initialPerson : null,
  );
  const shown = person ? people.filter((p) => p.personId === person) : people;

  return (
    <div className="grid gap-4">
      {people.length > 1 && (
        <div
          role="group"
          aria-label={t.filterLabel}
          className="flex flex-wrap gap-2"
        >
          <FilterChip pressed={person === null} onClick={() => setPerson(null)}>
            {t.everyone}
          </FilterChip>
          {people.map((p) => (
            <FilterChip
              key={p.personId}
              pressed={person === p.personId}
              onClick={() => setPerson(p.personId)}
            >
              {p.name || t.unknownPerson}
            </FilterChip>
          ))}
        </div>
      )}
      <CardGrid className="items-start">
        {shown.map((p) => (
          <PersonWorkCard
            key={p.personId}
            person={p}
            items={items.filter((i) => i.personId === p.personId)}
            projectId={projectId}
            names={names}
            mePersonId={mePersonId}
          />
        ))}
      </CardGrid>
    </div>
  );
}
