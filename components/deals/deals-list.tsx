"use client";

import { DealsTable } from "@/components/deals/deals-table";
import { SearchableList } from "@/components/ui/searchable-list";
import { dealName } from "@/lib/deals/names";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

/** The deals with an instant search over the artist, the title, the
 * project, the stage and who negotiates; the page's filters on the line. */
export function DealsList({
  rows,
  today,
  filters,
  empty,
}: {
  rows: Deal[];
  today: string;
  filters: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.deals.search;
  return (
    <SearchableList
      items={rows}
      searchText={(d) => [
        dealName(d),
        d.projectTitle,
        d.artistName,
        fr.deals.stages[d.stage],
        d.assignee?.name,
        d.nextAction,
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => <DealsTable rows={visible} today={today} />}
    </SearchableList>
  );
}
