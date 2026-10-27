"use client";

import { MastersTable } from "@/components/catalog/masters-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { RecordRights } from "@/lib/archive/types";
import { variantText } from "@/lib/catalog/title-rules";
import type { MasterRow } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Titles list with an instant search on name, variant, artists and ISRC
// (separators ignored: "fr-xxx" finds "FRXXX…").
export function MastersList({
  masters,
  rights,
}: {
  masters: MasterRow[];
  rights?: RecordRights;
}) {
  const t = fr.catalog.masters.search;
  return (
    <SearchableList
      items={masters}
      searchText={(m) => [m.title, variantText(m), m.artists, m.isrc]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
    >
      {(visible) => (
        <MastersTable masters={visible} rights={rights} selectable />
      )}
    </SearchableList>
  );
}
