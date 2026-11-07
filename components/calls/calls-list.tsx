"use client";

import { CallsTable } from "@/components/calls/calls-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { CallDeleter } from "@/lib/calls/delete-rule";
import type { CallDoor } from "@/lib/calls/door";
import type { CallListItem } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

// The calls of a door with an instant search on their title (and their
// project, in Calls).
export function CallsList({
  calls,
  now,
  door,
  deleter,
  filters,
  empty,
}: {
  calls: CallListItem[];
  now: Date;
  door: CallDoor;
  deleter: CallDeleter;
  // The page's filters, beside the search; what stands for no row at all.
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.calls.all.search;
  return (
    <SearchableList
      items={calls}
      searchText={(c) =>
        door.kind === "calls"
          ? [c.title, c.projectTitle ?? fr.calls.all.internal]
          : [c.title]
      }
      label={t.label}
      placeholder={door.kind === "calls" ? t.placeholder : t.placeholderProject}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <CallsTable calls={visible} now={now} door={door} deleter={deleter} />
      )}
    </SearchableList>
  );
}
