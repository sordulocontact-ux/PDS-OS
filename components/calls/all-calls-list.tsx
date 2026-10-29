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
  filters,
  empty,
}: {
  calls: CallListItem[];
  now: Date;
  // The page's filters, beside the search; what stands for no row at all.
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.calls.all.search;
  return (
    <SearchableList
      items={calls}
      searchText={(c) => [c.title, c.projectTitle ?? fr.calls.all.internal]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => <AllCallsTable calls={visible} now={now} />}
    </SearchableList>
  );
}
