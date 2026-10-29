"use client";

import { ArtistsTable } from "@/components/catalog/artists-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { RecordRights } from "@/lib/archive/types";
import type { ArtistListItem } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Artists with an instant search on name and notes.
export function ArtistsList({
  artists,
  showRelation,
  rights,
}: {
  artists: ArtistListItem[];
  showRelation: boolean;
  rights: RecordRights;
}) {
  const t = fr.catalog.artists.search;
  return (
    <SearchableList
      items={artists}
      searchText={(a) => [a.name, a.notes]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
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
