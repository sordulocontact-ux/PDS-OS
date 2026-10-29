"use client";

import { ArtistsTable } from "@/components/catalog/artists-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { RecordRights } from "@/lib/archive/types";
import type { ArtistRow } from "@/lib/catalog/artist-progress";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Artists with an instant search on name and notes.
export function ArtistsList({
  artists,
  showRelation,
  rights,
  filters,
  empty,
}: {
  artists: ArtistRow[];
  showRelation: boolean;
  rights: RecordRights;
  // The page's filters, beside the search; what stands for no row at all.
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.catalog.artists.search;
  return (
    <SearchableList
      items={artists}
      searchText={(a) => [a.name, a.notes]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <ArtistsTable
          selectable
          artists={visible}
          showRelation={showRelation}
          rights={rights}
        />
      )}
    </SearchableList>
  );
}
