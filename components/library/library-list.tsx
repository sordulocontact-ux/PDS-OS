"use client";

import { LibraryTable } from "@/components/library/library-table";
import { SearchableList } from "@/components/ui/searchable-list";
import { fr } from "@/lib/i18n/fr";
import type { LibraryFile } from "@/lib/library/queries";

// The library with an instant search on the name, precision, category and
// what each file belongs to.
export function LibraryList({ files }: { files: LibraryFile[] }) {
  const t = fr.library.search;
  return (
    <SearchableList
      items={files}
      searchText={(f) => [
        f.fileName,
        f.description,
        f.categoryLabel,
        f.ownerLabel,
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
    >
      {(visible) => <LibraryTable files={visible} />}
    </SearchableList>
  );
}
