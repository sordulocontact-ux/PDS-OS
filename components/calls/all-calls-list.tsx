"use client";

import { AllCallsTable } from "@/components/calls/all-calls-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { CallListItem } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

// Every call with an instant search on its title and its project.
export function AllCallsList({
  calls,
  now,
}: {
  calls: CallListItem[];
  now: Date;
}) {
  const t = fr.calls.all.search;
  return (
    <SearchableList
      items={calls}
      searchText={(c) => [c.title, c.projectTitle ?? fr.calls.all.internal]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
    >
      {(visible) => <AllCallsTable calls={visible} now={now} />}
    </SearchableList>
  );
}
